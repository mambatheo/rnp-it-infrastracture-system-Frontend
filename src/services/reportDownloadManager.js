/**
 * reportDownloadManager.js
 *
 * A navigation-independent singleton that manages Celery-backed report
 * downloads. Downloads started here survive React navigation (component
 * unmounts) because the polling loop runs entirely outside React state.
 *
 * Usage:
 *   reportDownloadManager.start(key, apiFn, label)
 *     → apiFn is called once; it must return a Promise that resolves when
 *       the file has been downloaded (i.e. the downloadReport() promise).
 *
 * Listeners (e.g. a global toast component) subscribe via:
 *   reportDownloadManager.subscribe(fn)  /  .unsubscribe(fn)
 * and receive the current queue on every change.
 */

const ACTIVE   = 'active';
const DONE     = 'done';
const FAILED   = 'failed';

class ReportDownloadManager {
  constructor() {
    /** @type {Map<string, {key, label, status, error, progress?: number}>} */
    this._queue     = new Map();
    this._listeners = new Set();
  }

  // ── subscribe / notify ────────────────────────────────────────────────────

  subscribe(fn)   { this._listeners.add(fn); }
  unsubscribe(fn) { this._listeners.delete(fn); }

  _notify() {
    const snapshot = Array.from(this._queue.values());
    this._listeners.forEach((fn) => fn(snapshot));
  }

  // ── public API ────────────────────────────────────────────────────────────

  /**
   * @param {string}   key    Unique key for this download (e.g. 'excel:Desktop')
   * @param {Function} apiFn  Zero-arg function returning the download Promise
   * @param {string}   label  Human-readable label shown in the toast
   */
  start(key, apiFn, label) {
    // Prevent duplicate parallel downloads of the same report
    if (this._queue.has(key) && this._queue.get(key).status === ACTIVE) {
      return;
    }

    this._queue.set(key, { key, label, status: ACTIVE, error: null, progress: 0 });
    this._notify();

    apiFn()
      .then(() => {
        if (!this._queue.has(key)) return;
        const prev = this._queue.get(key) || { key, label };
        this._queue.set(key, { ...prev, status: DONE, error: null, progress: 100 });
        this._notify();
        // Auto-remove after 4 s so the toast disappears
        setTimeout(() => {
          this._queue.delete(key);
          this._notify();
        }, 4000);
      })
      .catch((err) => {
        if (!this._queue.has(key)) return;
        const prev = this._queue.get(key) || { key, label };
        this._queue.set(key, {
          ...prev,
          status: FAILED,
          error: err?.message || String(err) || 'Download failed.',
        });
        this._notify();
        // Auto-remove failed toasts after 8 s
        setTimeout(() => {
          this._queue.delete(key);
          this._notify();
        }, 8000);
      });
  }

  /** Returns true if any download is currently active */
  isActive(key) {
    return this._queue.has(key) && this._queue.get(key).status === ACTIVE;
  }

  /** Get current progress (0–100) for given key, or null */
  getProgress(key) {
    const item = this._queue.get(key);
    if (!item || typeof item.progress !== 'number') return null;
    return item.progress;
  }

  /** Update progress (0–100) for an active download */
  setProgress(key, progress) {
    if (!this._queue.has(key)) return;
    const clamped = Math.max(0, Math.min(100, progress | 0));
    const prev = this._queue.get(key);
    if (prev.progress === clamped) return;
    this._queue.set(key, { ...prev, progress: clamped });
    this._notify();
  }

  dismiss(key) {
    this._queue.delete(key);
    this._notify();
  }
}

// Singleton — one instance for the entire app lifetime
const reportDownloadManager = new ReportDownloadManager();
export default reportDownloadManager;
