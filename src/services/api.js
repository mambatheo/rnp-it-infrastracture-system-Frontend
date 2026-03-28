const BASE = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000') + '/api/v1';

// Token refresh interval: refresh 2 minutes before expiry (access token is 15 min)
const TOKEN_REFRESH_INTERVAL_MS = 13 * 60 * 1000; // 13 minutes

let _refreshing = null; // prevent concurrent refresh races

const REPORT_DOWNLOAD_JOBS_STORAGE_KEY = 'itinfra_report_download_jobs_v1';

function getClientSessionId() {
  const existing = sessionStorage.getItem('itinfra_report_download_client_session_id');
  if (existing) return existing;
  const id = `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  sessionStorage.setItem('itinfra_report_download_client_session_id', id);
  return id;
}

function readReportJobs() {
  try {
    const raw = localStorage.getItem(REPORT_DOWNLOAD_JOBS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeReportJobs(jobsObj) {
  try {
    localStorage.setItem(REPORT_DOWNLOAD_JOBS_STORAGE_KEY, JSON.stringify(jobsObj));
  } catch {
    // Ignore storage write failures (quota / disabled storage)
  }
}

function saveReportJob(job) {
  const jobs = readReportJobs();
  jobs[job.task_id] = job;
  writeReportJobs(jobs);
}

function deleteReportJob(task_id) {
  const jobs = readReportJobs();
  if (jobs[task_id]) delete jobs[task_id];
  writeReportJobs(jobs);
}

/**
 * Refresh access token using the refresh token.
 * Returns true if successful, false otherwise.
 * Exported so it can be used by the proactive refresh hook.
 */
export async function refreshTokens() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE}/accounts/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token',  data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    return true;
  } catch { return false; }
}

/**
 * Get the token refresh interval in milliseconds.
 * Exported for use by the proactive refresh hook.
 */
export function getTokenRefreshInterval() {
  return TOKEN_REFRESH_INTERVAL_MS;
}

async function request(method, path, body, _retry = false) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_retry) {
    if (!_refreshing) _refreshing = refreshTokens().finally(() => { _refreshing = null; });
    const ok = await _refreshing;
    if (ok) return request(method, path, body, true);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.replace('/login');
    return;
  }

  if (res.status === 401 && _retry) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.replace('/login');
    return;
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

async function fetchWithAuthRetry(url, options = {}, _retry = false) {
  const token = localStorage.getItem('access_token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !_retry) {
    if (!_refreshing) _refreshing = refreshTokens().finally(() => { _refreshing = null; });
    const ok = await _refreshing;
    if (ok) return fetchWithAuthRetry(url, options, true);
  }

  return res;
}

const get    = (path, params) => request('GET',    path + (params ? '?' + new URLSearchParams(params) : ''));
const post   = (path, body)   => request('POST',   path, body);
const put    = (path, body)   => request('PUT',    path, body);
const patch  = (path, body)   => request('PATCH',  path, body);
const del    = (path)         => request('DELETE', path);

/**
 * Authenticated fetch for paths under BASE (JSON bodies or FormData).
 * Use _skipContentType: true for multipart uploads so the browser sets the boundary.
 */
async function apiFetch(path, options = {}, _retry = false) {
  const { _skipContentType, ...opts } = options;
  const token = localStorage.getItem('access_token');
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!_skipContentType && opts.body && typeof opts.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401 && !_retry) {
    if (!_refreshing) _refreshing = refreshTokens().finally(() => { _refreshing = null; });
    const ok = await _refreshing;
    if (ok) return apiFetch(path, options, true);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.replace('/login');
    return;
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}


// ─── Async report download (Celery polling) ───────────────────────────────────
// 1. Calls the report URL → backend enqueues task, returns { task_id, download_token }
// 2. Polls every 2 s with ?task_id=<id>[&dl_token=...] until HTTP 200 (file ready)
// 3. Streams the blob and triggers a browser download
// onProgress(progress) is called with integer 0–100 when backend exposes it.
async function downloadReport(path, filename, onProgress) {
  const headers = { 'Content-Type': 'application/json' };
  const fullUrl = `${BASE}${path}`;

  // Step 1 — enqueue
  const enqueueRes = await fetchWithAuthRetry(fullUrl, { headers });
  if (!enqueueRes.ok) {
    throw new Error(`Failed to start report (HTTP ${enqueueRes.status}).`);
  }
  const { task_id, download_token } = await enqueueRes.json();
  if (!task_id) throw new Error('No task_id returned from server.');

  // Persist job so we can resume after reload even if access token expires.
  // dl_token allows polling/download without JWT.
  saveReportJob({
    task_id,
    dl_token: download_token,
    path,
    filename,
    created_at: Date.now(),
    client_session_id: getClientSessionId(),
  });

  // Step 2 — poll
  const sep     = path.includes('?') ? '&' : '?';
  const pollUrl = download_token
    ? `${fullUrl}${sep}task_id=${task_id}&dl_token=${encodeURIComponent(download_token)}`
    : `${fullUrl}${sep}task_id=${task_id}`;

  while (true) {
    await new Promise((r) => setTimeout(r, 2000));

    // If dl_token is present, the backend will allow download without JWT auth.
    const pollRes = download_token
      ? await fetch(pollUrl, { headers })
      : await fetchWithAuthRetry(pollUrl, { headers });

    if (pollRes.status === 202) {
      try {
        const body = await pollRes.json();
        if (typeof body.progress === 'number' && typeof onProgress === 'function') {
          onProgress(body.progress);
        }
      } catch (_) {
        // ignore malformed JSON while task is pending
      }
      continue; // still processing
    }

    if (pollRes.ok) {
      // Step 3 — trigger download
      const blob      = await pollRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a         = document.createElement('a');
      a.href          = objectUrl;
      a.download      = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      deleteReportJob(task_id);
      return; // done
    }

    // FAILURE
    let detail = `Report generation failed (HTTP ${pollRes.status}).`;
    try {
      const body = await pollRes.json();
      if (body.detail) detail = body.detail;
    } catch (_) {}
    throw new Error(detail);
  }
}

async function resumeSingleReportJob(job) {
  if (!job || !job.task_id || !job.dl_token || !job.path || !job.filename) return;

  const fullUrl = `${BASE}${job.path}`;
  const sep     = job.path.includes('?') ? '&' : '?';
  const pollUrl = `${fullUrl}${sep}task_id=${job.task_id}&dl_token=${encodeURIComponent(job.dl_token)}`;

  // Poll without JWT; dl_token is enough.
  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, { method: 'GET' });

    if (pollRes.status === 202) continue;

    if (pollRes.ok) {
      const blob      = await pollRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a         = document.createElement('a');
      a.href          = objectUrl;
      a.download      = job.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      deleteReportJob(job.task_id);
      return;
    }

    // Failure: stop trying and keep the job removed so it doesn't block future reports.
    // If you prefer retry-on-failure, we can implement that too.
    deleteReportJob(job.task_id);
    return;
  }
}

/**
 * Resume report downloads after a page reload.
 * Only resumes jobs created by a previous session (sessionStorage id differs).
 */
export async function resumeReportDownloads() {
  const jobs = readReportJobs();
  const clientSessionId = getClientSessionId();

  const pending = Object.values(jobs).filter((job) => {
    if (!job || !job.task_id) return false;
    if (!job.dl_token) return false;
    // Skip jobs that were started in the current React session (they should already be handled).
    if (job.client_session_id === clientSessionId) return false;
    return true;
  });

  if (!pending.length) return;

  // Fire-and-forget resume polls (do not block the UI).
  pending.forEach((job) => {
    resumeSingleReportJob(job).catch(() => {
      // If a resume fails, drop the job so we don't get stuck forever.
      deleteReportJob(job.task_id);
    });
  });
}

const date = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');


// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (data) => post('/accounts/auth/login/', data),
  logout: ()     => post('/accounts/auth/logout/'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:           (p)     => get('/accounts/users/', p),
  retrieve:       (id)    => get(`/accounts/users/${id}/`),
  create:         (data)  => post('/accounts/users/', data),
  update:         (id, d) => patch(`/accounts/users/${id}/`, d),
  activate:       (id)    => post(`/accounts/users/${id}/activate/`),
  deactivate:     (id)    => post(`/accounts/users/${id}/deactivate/`),
  resetPw:        (id, d) => post(`/accounts/users/${id}/reset_password/`, d),
  me:             ()      => get('/accounts/users/me/'),
  delete:         (id)    => del(`/accounts/users/${id}/`),
  changePassword: (data)  => post('/accounts/users/change_password/', data),
};

// ─── Equipment Categories ─────────────────────────────────────────────────────
export const categoriesApi = {
  list:   (p)     => get('/equipment/equipment-categories/', p),
  create: (data)  => post('/equipment/equipment-categories/', data),
  update: (id, d) => put(`/equipment/equipment-categories/${id}/`, d),
  delete: (id)    => del(`/equipment/equipment-categories/${id}/`),
};

// ─── Equipment Statuses ───────────────────────────────────────────────────────
export const statusesApi = {
  list:   (p)     => get('/equipment/equipment-statuses/', p),
  create: (data)  => post('/equipment/equipment-statuses/', data),
  update: (id, d) => put(`/equipment/equipment-statuses/${id}/`, d),
  delete: (id)    => del(`/equipment/equipment-statuses/${id}/`),
};

// ─── Brands ───────────────────────────────────────────────────────────────────
export const brandsApi = {
  list:   (p)     => get('/equipment/brands/', p),
  create: (data)  => post('/equipment/brands/', data),
  update: (id, d) => put(`/equipment/brands/${id}/`, d),
  delete: (id)    => del(`/equipment/brands/${id}/`),
};

// ─── Region Offices (HQs) ────────────────────────────────────────────────────
export const regionOfficesApi = {
  list:   (p)     => get('/equipment/region-offices/', p),
  create: (data)  => post('/equipment/region-offices/', data),
  update: (id, d) => put(`/equipment/region-offices/${id}/`, d),
  delete: (id)    => del(`/equipment/region-offices/${id}/`),
};

// ─── Regions ──────────────────────────────────────────────────────────────────
export const regionsApi = {
  list:   (p)     => get('/equipment/regions/', p),
  create: (data)  => post('/equipment/regions/', data),
  update: (id, d) => put(`/equipment/regions/${id}/`, d),
  delete: (id)    => del(`/equipment/regions/${id}/`),
};

// ─── DPU Offices (HQs) ───────────────────────────────────────────────────────
export const dpuOfficesApi = {
  list:   (p)     => get('/equipment/dpu-offices/', p),
  create: (data)  => post('/equipment/dpu-offices/', data),
  update: (id, d) => put(`/equipment/dpu-offices/${id}/`, d),
  delete: (id)    => del(`/equipment/dpu-offices/${id}/`),
};

// ─── DPUs ─────────────────────────────────────────────────────────────────────
export const dpusApi = {
  list:   (p)     => get('/equipment/dpus/', p),
  create: (data)  => post('/equipment/dpus/', data),
  update: (id, d) => put(`/equipment/dpus/${id}/`, d),
  delete: (id)    => del(`/equipment/dpus/${id}/`),
};

// ─── Stations ─────────────────────────────────────────────────────────────────
export const stationsApi = {
  list:   (p)     => get('/equipment/stations/', p),
  create: (data)  => post('/equipment/stations/', data),
  update: (id, d) => put(`/equipment/stations/${id}/`, d),
  delete: (id)    => del(`/equipment/stations/${id}/`),
};

// ─── Units ────────────────────────────────────────────────────────────────────
export const unitsApi = {
  list:   (p)     => get('/equipment/units/', p),
  create: (data)  => post('/equipment/units/', data),
  update: (id, d) => put(`/equipment/units/${id}/`, d),
  delete: (id)    => del(`/equipment/units/${id}/`),
};

// ─── Directorates ─────────────────────────────────────────────────────────────
export const directoratesApi = {
  list:   (p)     => get('/equipment/directorates/', p),
  create: (data)  => post('/equipment/directorates/', data),
  update: (id, d) => put(`/equipment/directorates/${id}/`, d),
  delete: (id)    => del(`/equipment/directorates/${id}/`),
};

// ─── Departments ──────────────────────────────────────────────────────────────
export const departmentsApi = {
  list:   (p)     => get('/equipment/departments/', p),
  create: (data)  => post('/equipment/departments/', data),
  update: (id, d) => put(`/equipment/departments/${id}/`, d),
  delete: (id)    => del(`/equipment/departments/${id}/`),
};

// ─── Offices ──────────────────────────────────────────────────────────────────
export const officesApi = {
  list:   (p)     => get('/equipment/offices/', p),
  create: (data)  => post('/equipment/offices/', data),
  update: (id, d) => put(`/equipment/offices/${id}/`, d),
  delete: (id)    => del(`/equipment/offices/${id}/`),
};

// ─── Equipment ────────────────────────────────────────────────────────────────
export const equipmentApi = {
  list:     (p)     => get('/equipment/equipment/', p),
  retrieve: (id)    => get(`/equipment/equipment/${id}/`),
  create:   (data)  => post('/equipment/equipment/', data),
  update:   (id, d) => put(`/equipment/equipment/${id}/`, d),
  patch:    (id, d) => patch(`/equipment/equipment/${id}/`, d),
  delete:   (id)    => del(`/equipment/equipment/${id}/`),
};

// ─── Stock ────────────────────────────────────────────────────────────────────
export const stockApi = {
  list:     (p)     => get('/equipment/stock/', p),
  retrieve: (id)    => get(`/equipment/stock/${id}/`),
  create:   (data)  => post('/equipment/stock/', data),
  update:   (id, d) => put(`/equipment/stock/${id}/`, d),
  delete:   (id)    => del(`/equipment/stock/${id}/`),
};

// ─── Deployments ──────────────────────────────────────────────────────────────
export const deploymentsApi = {
  list:     (p)     => get('/equipment/deployments/', p),
  retrieve: (id)    => get(`/equipment/deployments/${id}/`),
  create:   (data)  => post('/equipment/deployments/', data),
  update:   (id, d) => put(`/equipment/deployments/${id}/`, d),
  patch:    (id, d) => patch(`/equipment/deployments/${id}/`, d),
  delete:   (id)    => del(`/equipment/deployments/${id}/`),
};

// ─── Lendings ─────────────────────────────────────────────────────────────────
export const lendingsApi = {
  list:     (p)     => get('/equipment/lendings/', p),
  retrieve: (id)    => get(`/equipment/lendings/${id}/`),
  create:   (data)  => post('/equipment/lendings/', data),
  update:   (id, d) => put(`/equipment/lendings/${id}/`, d),
  patch:    (id, d) => patch(`/equipment/lendings/${id}/`, d),
  delete:   (id)    => del(`/equipment/lendings/${id}/`),
};

// ─── Maintenance ──────────────────────────────────────────────────────────────
export const maintenanceApi = {
  requests: {
    list:         (p)      => get('/maintenance/requests/', p),
    myRequests:   (p)      => get('/maintenance/requests/my_requests/', p),
    pending:      ()       => get('/maintenance/requests/pending/'),
    create:       (data)   => post('/maintenance/requests/', data),
    update:       (id, d)  => patch(`/maintenance/requests/${id}/`, d),
    updateStatus: (id, d)  => post(`/maintenance/requests/${id}/update_status/`, d),
    delete:       (id)     => del(`/maintenance/requests/${id}/`),
  },
  notifications: {
    list:        (p)  => get('/maintenance/notifications/', p),
    markRead:    (id) => post(`/maintenance/notifications/${id}/mark_read/`),
    markAllRead: ()   => post('/maintenance/notifications/mark_all_read/'),
    unreadCount: ()   => get('/maintenance/notifications/unread_count/'),
  },
};

// ─── Convenience re-exports ───────────────────────────────────────────────────
export const settingsApi = {
  brands:       brandsApi,
  regions:      regionsApi,
  dpus:         dpusApi,
  stations:     stationsApi,
  units:        unitsApi,
  categories:   categoriesApi,
  statuses:     statusesApi,
  directorates: directoratesApi,
  departments:  departmentsApi,
  offices:      officesApi,
};

// ─── Reports ──────────────────────────────────────────────────────────────────
// All download methods now use the Celery async polling pattern via
// downloadReport(). Each method returns a Promise — awaiting it keeps the
// spinner alive until the file actually arrives in the browser.
export const reportsApi = {

  // Aggregated counts — single call that populates the entire Reports page
  counts: () => get('/equipment/reports/counts/'),

  // ── Equipment ──────────────────────────────────────────────────────────────
  excelAll:    (onProgress)     => downloadReport(
    '/equipment/reports/excel/',
    `equipment_report_${date()}.xlsx`,
    onProgress,
  ),
  pdfAll:      (onProgress)     => downloadReport(
    '/equipment/reports/pdf/',
    `equipment_report_${date()}.pdf`,
    onProgress,
  ),
  excelByType: (type, onProgress) => downloadReport(
    `/equipment/reports/excel/${encodeURIComponent(type)}/`,
    `${type.replace(/ /g, '_').toLowerCase()}_${date()}.xlsx`,
    onProgress,
  ),
  pdfByType:   (type, onProgress) => downloadReport(
    `/equipment/reports/pdf/${encodeURIComponent(type)}/`,
    `${type.replace(/ /g, '_').toLowerCase()}_${date()}.pdf`,
    onProgress,
  ),

  // ── Stock ──────────────────────────────────────────────────────────────────
  stockExcelAll:    (onProgress)     => downloadReport(
    '/equipment/reports/stock/excel/',
    `stock_report_${date()}.xlsx`,
    onProgress,
  ),
  stockPdfAll:      (onProgress)     => downloadReport(
    '/equipment/reports/stock/pdf/',
    `stock_report_${date()}.pdf`,
    onProgress,
  ),
  stockExcelByType: (type, onProgress) => downloadReport(
    `/equipment/reports/stock/excel/${encodeURIComponent(type)}/`,
    `stock_${type.replace(/ /g, '_').toLowerCase()}_${date()}.xlsx`,
    onProgress,
  ),
  stockPdfByType:   (type, onProgress) => downloadReport(
    `/equipment/reports/stock/pdf/${encodeURIComponent(type)}/`,
    `stock_${type.replace(/ /g, '_').toLowerCase()}_${date()}.pdf`,
    onProgress,
  ),

  // ── Units ──────────────────────────────────────────────────────────────────
  unitExcelAll:  (onProgress)          => downloadReport(
    '/equipment/reports/unit/excel/',
    `units_all_${date()}.xlsx`,
    onProgress,
  ),
  unitPdfAll:    (onProgress)          => downloadReport(
    '/equipment/reports/unit/pdf/',
    `units_all_${date()}.pdf`,
    onProgress,
  ),
  unitExcelById: (id, name, onProgress)  => downloadReport(
    `/equipment/reports/unit/excel/${id}/`,
    `unit_${(name || 'report').replace(/ /g, '_').toLowerCase()}_${date()}.xlsx`,
    onProgress,
  ),
  unitPdfById:   (id, name, onProgress)  => downloadReport(
    `/equipment/reports/unit/pdf/${id}/`,
    `unit_${(name || 'report').replace(/ /g, '_').toLowerCase()}_${date()}.pdf`,
    onProgress,
  ),

  // ── Regions ────────────────────────────────────────────────────────────────
  regionExcelAll:  (onProgress)         => downloadReport(
    '/equipment/reports/region/excel/',
    `regions_all_${date()}.xlsx`,
    onProgress,
  ),
  regionPdfAll:    (onProgress)         => downloadReport(
    '/equipment/reports/region/pdf/',
    `regions_all_${date()}.pdf`,
    onProgress,
  ),
  regionExcelById: (id, name, onProgress) => downloadReport(
    `/equipment/reports/region/excel/${id}/`,
    `region_${(name || 'report').replace(/ /g, '_').toLowerCase()}_${date()}.xlsx`,
    onProgress,
  ),
  regionPdfById:   (id, name, onProgress) => downloadReport(
    `/equipment/reports/region/pdf/${id}/`,
    `region_${(name || 'report').replace(/ /g, '_').toLowerCase()}_${date()}.pdf`,
    onProgress,
  ),

  // ── DPUs ───────────────────────────────────────────────────────────────────
  dpuExcelAll:  (onProgress)         => downloadReport(
    '/equipment/reports/dpu/excel/',
    `dpus_all_${date()}.xlsx`,
    onProgress,
  ),
  dpuPdfAll:    (onProgress)         => downloadReport(
    '/equipment/reports/dpu/pdf/',
    `dpus_all_${date()}.pdf`,
    onProgress,
  ),
  dpuExcelById: (id, name, onProgress) => downloadReport(
    `/equipment/reports/dpu/excel/${id}/`,
    `dpu_${(name || 'report').replace(/ /g, '_').toLowerCase()}_${date()}.xlsx`,
    onProgress,
  ),
  dpuPdfById:   (id, name, onProgress) => downloadReport(
    `/equipment/reports/dpu/pdf/${id}/`,
    `dpu_${(name || 'report').replace(/ /g, '_').toLowerCase()}_${date()}.pdf`,
    onProgress,
  ),
};


// Add these to your existing services/api.js

// ── Slideshow API ──────────────────────────────────────────────────────────────

/** Public — no auth token needed. Called by AuthPage. */
export const slideshowPublicApi = {
  list: () =>
    fetch(`${BASE}/slideshow/public/`)
      .then(r => r.json()),
};

/** Admin — requires Bearer token. Called by SlideshowAdmin page. */
export const slideshowApi = {
  list: () => apiFetch('/slideshow/'),

  upload: (formData) =>
    apiFetch('/slideshow/', {
      method: 'POST',
      body: formData,
      _skipContentType: true,
    }),

  update: (id, data) =>
    apiFetch(`/slideshow/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id) =>
    apiFetch(`/slideshow/${id}/`, { method: 'DELETE' }),
};

// ── NOTE ───────────────────────────────────────────────────────────────────────
// If your apiFetch helper always sets Content-Type: application/json,
// you'll need to handle the upload separately. Here's a standalone helper:

export async function uploadSlideshowImage(file, caption = '', order = 0) {
  const fd = new FormData();
  fd.append('image',   file);
  fd.append('caption', caption);
  fd.append('order',   order);

  const res = await fetch(
    `${BASE}/slideshow/`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      body: fd,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw err;
  }
  return res.json();
}