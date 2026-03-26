import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { lendingsApi, equipmentApi, categoriesApi } from '../services/api';
import { regionsApi, dpusApi, stationsApi, unitsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth'; // ← adjust if your file is elsewhere

// ─── Equipment Combobox ────────────────────────────────────────────────────────
function EqCombobox({ allEquipment, typeFilter, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  const selected = allEquipment.find(e => e.id === value);
  const display  = selected
    ? `${selected.name || selected.equipment_type_name} — ${selected.serial_number || selected.marking_code || ''}`
    : '';

  const base     = typeFilter ? allEquipment.filter(e => e.equipment_type_name === typeFilter) : allEquipment;
  const filtered = query.trim() === ''
    ? base
    : base.filter(e => {
        const q = query.toLowerCase();
        return (e.serial_number       || '').toLowerCase().includes(q)
            || (e.marking_code        || '').toLowerCase().includes(q)
            || (e.name                || '').toLowerCase().includes(q)
            || (e.equipment_type_name || '').toLowerCase().includes(q);
      });

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = item => { onChange(item.id); setQuery(''); setOpen(false); };
  const clear  = ()   => { onChange('');      setQuery(''); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-400 bg-white transition-all">
        <span className="pl-3 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent"
          placeholder={display || 'Search by name, serial or marking code…'}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        />
        {value && (
          <button type="button" onClick={clear}
            className="px-3 text-slate-400 hover:text-red-500 text-lg leading-none transition-colors">✕</button>
        )}
      </div>
      {value && !open && (
        <p className="mt-1 text-xs text-blue-600 font-medium truncate px-1">✔ {display}</p>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">No equipment found.</li>
          ) : filtered.map(e => (
            <li key={e.id}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0"
              onMouseDown={() => select(e)}>
              <span className="font-medium text-slate-700">{e.name || e.equipment_type_name}</span>
              <span className="text-xs text-slate-400 font-mono shrink-0">
                {[e.serial_number, e.marking_code].filter(Boolean).join(' / ')}
                {e.equipment_type_name && ` · ${e.equipment_type_name}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Primitives ────────────────────────────────────────────────────────────────
const inputCls  = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white transition-all';
const selectCls = inputCls;

const STATUS_COLORS = {
  Active:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Returned: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function SectionDivider({ label, icon }) {
  return (
    <div className="col-span-2 flex items-center gap-3 pt-2 pb-1">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function F({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, size = 'lg' }) {
  const maxW = size === 'xl' ? 'max-w-3xl' : 'max-w-2xl';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[94vh] flex flex-col`}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium text-white transition-all
      ${type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      <span>{type === 'error' ? '✗' : '✓'}</span>
      {msg}
    </div>
  );
}

// Fields from server that must NOT be in payloads
const READONLY_FIELDS = [
  'equipment_name', 'equipment_serial', 'equipment_type', 'equipment_brand',
  'equipment_marking_code', 'issued_by_name', 'return_confirmed_by_name',
  'created_at', 'updated_at',
];

const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged', 'Under Repair'];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Lendings() {
  const { user: currentUser } = useAuth();

  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page,  setPage]        = useState(1);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({});
  const [submitting, setSub]    = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });

  // Equipment type pre-filter
  const [eqTypeFilter, setEqTypeFilter] = useState('');

  // Table filters
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatus, setTableStatus] = useState('');
  const [tableType,   setTableType]   = useState('');

  // Reference data
  const [allEquipment, setAllEquipment] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [regions,      setRegions]      = useState([]);
  const [dpus,         setDpus]         = useState([]);
  const [stations,     setStations]     = useState([]);
  const [units,        setUnits]        = useState([]);

  // Cascading FK filters
  const [filteredDpus,     setFilteredDpus]     = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);

  const pageSize = 15;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type }), 3500);
  };

  // Load reference data once
  useEffect(() => {
    const p = { page_size: 500 };
    equipmentApi.list(p).then(d => setAllEquipment(d.results || [])).catch(() => {});
    categoriesApi.list(p).then(d => setCategories(d.results || [])).catch(() => {});
    regionsApi.list(p).then(d => setRegions(d.results || [])).catch(() => {});
    dpusApi.list(p).then(d => setDpus(d.results || [])).catch(() => {});
    stationsApi.list(p).then(d => setStations(d.results || [])).catch(() => {});
    unitsApi.list(p).then(d => setUnits(d.results || [])).catch(() => {});
  }, []);

  // Cascade: filter DPUs by region
  useEffect(() => {
    setFilteredDpus(
      form.region ? dpus.filter(d => d.region === form.region || d.region_id === form.region) : dpus
    );
  }, [form.region, dpus]);

  // Cascade: filter Stations by DPU
  useEffect(() => {
    setFilteredStations(
      form.dpu ? stations.filter(s => s.dpu === form.dpu || s.dpu_id === form.dpu) : stations
    );
  }, [form.dpu, stations]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (tableSearch) params.search = tableSearch;
      if (tableStatus) params.status = tableStatus;
      if (tableType)   params['equipment__equipment_type__name'] = tableType;
      const d = await lendingsApi.list(params);
      setItems(d.results || []);
      setTotal(d.count  || 0);
    } catch { showToast('Failed to load lendings', 'error'); }
    finally  { setLoading(false); }
  }, [page, tableSearch, tableStatus, tableType]);

  useEffect(() => { setPage(1); }, [tableSearch, tableStatus, tableType]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    setForm({
      status: 'Active',
      issued_date: new Date().toISOString().split('T')[0],
      issued_by: currentUser?.id || null,
      return_confirmed_by: currentUser?.id || null,
    });
    setSelected(null);
    setEqTypeFilter('');
    setModal('form');
  };

  const openEdit = item => {
    setForm({
      ...item,
      return_confirmed_by: item.return_confirmed_by || currentUser?.id || null,
    });
    setSelected(item);
    setEqTypeFilter(item.equipment_type || '');
    setModal('form');
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value || null };
      if (name === 'status' && value === 'Returned' && !f.returned_date) {
        updated.returned_date = new Date().toISOString().split('T')[0];
      }
      if (name === 'region') { updated.dpu = null; updated.station = null; }
      if (name === 'dpu')    { updated.station = null; }
      return updated;
    });
  };

  const handleSubmit = async () => {
    setSub(true);
    try {
      const payload = { ...form };
      READONLY_FIELDS.forEach(k => delete payload[k]);
      ['equipment', 'issued_by', 'return_confirmed_by', 'region', 'dpu', 'station', 'unit'].forEach(k => {
        if (payload[k] === '' || payload[k] === undefined) payload[k] = null;
      });
      ['returned_date', 'condition_on_return', 'return_comments', 'returned_by', 'phone_number', 'purpose'].forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });

      if (selected) {
        await lendingsApi.update(selected.id, payload);
        showToast('Lending record updated');
      } else {
        await lendingsApi.create(payload);
        showToast('Lending record created');
      }
      setModal(null);
      fetchItems();
    } catch (err) {
      let msg = 'Failed to save';
      if (err && typeof err === 'object') {
        msg = Object.entries(err)
          .map(([f, m]) => `${f}: ${Array.isArray(m) ? m[0] : m}`)
          .join(' | ') || JSON.stringify(err);
      }
      showToast(msg, 'error');
    } finally { setSub(false); }
  };

  const handleDelete = async () => {
    try {
      await lendingsApi.delete(deleteId);
      showToast('Lending record deleted');
      setDeleteId(null);
      fetchItems();
    } catch { showToast('Failed to delete', 'error'); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Lendings</h1>
            <p className="text-slate-500 text-sm mt-0.5">{total} total lending records</p>
          </div>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 bg-[#003580] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#002060] transition-colors shadow-sm">
            <span className="text-lg leading-none">+</span> New Lending
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white transition-all"
            placeholder="Search borrower, serial, purpose…"
            value={tableSearch}
            onChange={e => { setTableSearch(e.target.value); setPage(1); }}
          />
          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-700 transition-all"
            value={tableStatus}
            onChange={e => setTableStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Returned">Returned</option>
          </select>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-700 transition-all"
            value={tableType}
            onChange={e => setTableType(e.target.value)}
          >
            <option value="">All Types</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[
                    'Equipment', 'Type', 'Borrower', 'Phone',
                    'Unit', 'Region', 'DPU', 'Station',
                    'Purpose', 'Issued', 'Returned',
                    'Condition', 'Status', 'Actions'
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="text-center py-14 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      <span className="text-xs">Loading records…</span>
                    </div>
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-14 text-slate-400 text-sm">
                    No lending records found.
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">

                    {/* Equipment */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <p className="font-semibold text-slate-800 text-xs">{item.equipment_name || '—'}</p>
                      {item.equipment_serial && <p className="text-xs text-slate-400 font-mono">{item.equipment_serial}</p>}
                      {item.equipment_marking_code && <p className="text-xs text-slate-400 font-mono">{item.equipment_marking_code}</p>}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.equipment_type
                        ? <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 text-xs font-medium">{item.equipment_type}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>

                    {/* Borrower */}
                    <td className="px-4 py-3 min-w-[120px]">
                      <p className="text-slate-700 font-medium text-xs">{item.borrower_name || '—'}</p>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.phone_number || '—'}</td>

                    {/* Unit */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.unit || '—'}</td>

                    {/* Region */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.region || '—'}</td>

                    {/* DPU */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.dpu || '—'}</td>

                    {/* Station */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.station || '—'}</td>

                    {/* Purpose */}
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px]">
                      <p className="truncate" title={item.purpose}>{item.purpose || '—'}</p>
                    </td>

                    {/* Issued Date */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.issued_date || '—'}</td>

                    {/* Returned Date */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.returned_date || '—'}</td>

                    {/* Condition on Return */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {item.condition_on_return
                        ? <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 text-xs">{item.condition_on_return}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(item)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setDeleteId(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">Page {page} of {totalPages} · {total} records</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">← Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal === 'form' && (
        <Modal
          title={selected ? 'Edit Lending Record' : 'New Lending'}
          subtitle={selected ? `Editing record for ${selected.borrower_name || ''}` : 'Record a temporary equipment loan'}
          onClose={() => setModal(null)}
          size="xl"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* ── Core Details ── */}
            <SectionDivider label="Core Details"/>

            <F label="Status" required>
              <select className={selectCls} name="status" value={form.status || ''} onChange={handleChange}>
                <option value="">— Select —</option>
                <option value="Active">Active</option>
                <option value="Returned">Returned</option>
              </select>
            </F>

            <F label="Equipment Type (filter)">
              <select className={selectCls} value={eqTypeFilter}
                onChange={e => { setEqTypeFilter(e.target.value); setForm(f => ({ ...f, equipment: null })); }}>
                <option value="">— All Types —</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </F>

            <div className="col-span-2">
              <F label="Equipment" required>
                <EqCombobox
                  allEquipment={allEquipment}
                  typeFilter={eqTypeFilter}
                  value={form.equipment || ''}
                  onChange={id => setForm(f => ({ ...f, equipment: id || null }))}
                />
              </F>
            </div>

            {/* ── Borrower Info ── */}
            <SectionDivider label="Borrower Information" icon="👤" />

            <F label="Borrower Name" required>
              <input className={inputCls} name="borrower_name" value={form.borrower_name || ''}
                onChange={handleChange} placeholder="Full name of borrower" />
            </F>

            <F label="Phone Number" required hint="e.g. +250 78 000 0000">
              <input className={inputCls} name="phone_number" value={form.phone_number || ''}
                onChange={handleChange} placeholder="+250 78 000 0000" />
            </F>

            <div className="col-span-2">
              <F label="Purpose" required>
                <input className={inputCls} name="purpose" value={form.purpose || ''}
                  onChange={handleChange} placeholder="Reason for borrowing the equipment" />
              </F>
            </div>

            {/* ── Special Unit ── */}
            <SectionDivider label="Special Unit"/>

            <div className="col-span-2">
              <F label="Unit" hint="Select if borrower belongs to a Special Unit (IPO, CID, etc.)">
                <select className={selectCls} name="unit" value={form.unit || ''} onChange={handleChange}>
                  <option value=""> None</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </F>
            </div>

            {/* ── Territorial Units ── */}
            <SectionDivider label="Territorial Units"/>

            <F label="Region" hint="Borrower's region office">
              <select className={selectCls} name="region" value={form.region || ''} onChange={handleChange}>
                <option value=""> None</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </F>

            <F label="DPU" hint="Filtered by selected region">
              <select className={selectCls} name="dpu" value={form.dpu || ''} onChange={handleChange}>
                <option value=""> None</option>
                {filteredDpus.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </F>

            <F label="Station" hint="Filtered by selected DPU">
              <select className={selectCls} name="station" value={form.station || ''} onChange={handleChange}>
                <option value=""> None</option>
                {filteredStations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </F>

            {/* ── Dates ── */}
            <SectionDivider label="Dates"  />

            <F label="Issued Date" required>
              <input className={inputCls} type="date" name="issued_date"
                value={form.issued_date || ''} onChange={handleChange} />
            </F>

            <F label={form.status === 'Returned' ? 'Returned Date *' : 'Returned Date'}>
              <input
                className={`${inputCls} ${form.status === 'Returned' && !form.returned_date ? 'border-red-400 ring-2 ring-red-200' : ''}`}
                type="date" name="returned_date"
                value={form.returned_date || ''} onChange={handleChange} />
              {form.status === 'Returned' && !form.returned_date && (
                <p className="text-xs text-red-500 mt-0.5">Required when status is Returned</p>
              )}
            </F>

            {/* ── Return Details ── */}
            <SectionDivider label="Return Details"  />

            <F label="Returned By" hint="Person physically returning the item">
              <input className={inputCls} name="returned_by" value={form.returned_by || ''}
                onChange={handleChange} placeholder="Name of person returning" />
            </F>

            <F label="Condition on Return">
              <select className={selectCls} name="condition_on_return" value={form.condition_on_return || ''} onChange={handleChange}>
                <option value=""> None</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>

            <div className="col-span-2">
              <F label="Return Comments">
                <textarea className={inputCls + ' resize-none'} name="return_comments" rows={3}
                  value={form.return_comments || ''} onChange={handleChange}
                  placeholder="Notes about the equipment condition on return…" />
              </F>
            </div>

          </div>

          <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
            <button onClick={() => setModal(null)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-[#003580] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[#002060] transition-colors shadow-sm">
              {submitting ? 'Saving…' : selected ? 'Update Lending' : 'Create Lending'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)}>
          <p className="text-slate-600 mb-6 text-sm">Are you sure you want to delete this lending record? This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteId(null)}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleDelete}
              className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
          </div>
        </Modal>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </Layout>
  );
}