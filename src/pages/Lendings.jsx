import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { lendingsApi, equipmentApi, usersApi, categoriesApi } from '../services/api';

// ─── Equipment Combobox ───────────────────────────────────────────────────────
function EqCombobox({ allEquipment, typeFilter, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
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
      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#003580]/30">
        <span className="pl-3 text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          className="flex-1 px-2 py-2.5 text-sm outline-none bg-white"
          placeholder={display || 'Search by name, serial or marking code…'}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        />
        {value && (
          <button type="button" onClick={clear}
            className="px-3 text-slate-400 hover:text-red-500 text-lg leading-none">✕</button>
        )}
      </div>
      {value && !open && (
        <p className="mt-1 text-xs text-[#003580] font-medium truncate px-1">✔ {display}</p>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">No equipment found.</li>
          ) : filtered.map(e => (
            <li key={e.id}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-[#003580]/5 flex items-center justify-between gap-2"
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

// ─── Shared primitives ────────────────────────────────────────────────────────
const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]/30';

const STATUS_COLORS = {
  Active:   'bg-emerald-100 text-emerald-700',
  Returned: 'bg-slate-100 text-slate-600',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
      ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {msg}
    </div>
  );
}

const F = ({ label, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

// Fields that come back from the server but must NOT be sent in create/update payloads
const READONLY_FIELDS = [
  'equipment_name', 'equipment_serial', 'equipment_type', 'equipment_brand', 'equipment_marking_code',
  'issued_by_name', 'return_confirmed_by_name', 'created_at', 'updated_at',
];

const CONDITIONS = ['New', 'Good', 'Fair', 'Poor', 'Damaged', 'Under Repair'];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Lendings() {
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page,  setPage]        = useState(1);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(null); // 'form' | null
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({});
  const [submitting, setSub]    = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast]       = useState({ msg: '', type: 'success' });

  // Equipment type pre-filter inside the form
  const [eqTypeFilter, setEqTypeFilter] = useState('');

  // Table-level search & filter
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatus, setTableStatus] = useState('');
  const [tableType,   setTableType]   = useState('');

  // Reference data
  const [allEquipment, setAllEquipment] = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [users,        setUsers]        = useState([]);

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
    usersApi.list(p).then(d => setUsers(d.results || [])).catch(() => {});
  }, []);

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
    setForm({ status: 'Active', issued_date: new Date().toISOString().split('T')[0] });
    setSelected(null);
    setEqTypeFilter('');
    setModal('form');
  };

  const openEdit = item => {
    setForm({ ...item });
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
      return updated;
    });
  };

  const handleSubmit = async () => {
    setSub(true);
    try {
      const payload = { ...form };
      READONLY_FIELDS.forEach(k => delete payload[k]);
      // Nullify empty FK / optional fields
      ['equipment', 'issued_by', 'return_confirmed_by'].forEach(k => {
        if (payload[k] === '' || payload[k] === undefined) payload[k] = null;
      });
      ['returned_date', 'condition_on_return', 'return_comments', 'returned_by'].forEach(k => {
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
        const fieldMsgs = Object.entries(err)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
          .join(' | ');
        msg = fieldMsgs || JSON.stringify(err);
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
            className="inline-flex items-center gap-2 bg-[#003580] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#002060] transition-colors">
            <span className="text-lg leading-none">+</span> New Lending
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003580]/30"
            placeholder="Search borrower name, serial…"
            value={tableSearch}
            onChange={e => { setTableSearch(e.target.value); setPage(1); }}
          />
          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003580]/25 text-slate-700"
            value={tableStatus}
            onChange={e => setTableStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Returned">Returned</option>
          </select>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003580]/25 text-slate-700"
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
                  {['Equipment', 'Type', 'Borrower', 'Purpose', 'Issued Date', 'Returned Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No lending records found.</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.equipment_name || '—'}</p>
                      <p className="text-xs text-slate-400 font-mono">{item.equipment_serial || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.equipment_type || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{item.borrower_name || '—'}</p>
                      {item.phone_number && <p className="text-xs text-slate-400">{item.phone_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{item.purpose || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.issued_date || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{item.returned_date || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setDeleteId(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 text-xs transition-colors">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">Page {page} of {totalPages} · {total} records</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal === 'form' && (
        <Modal title={selected ? 'Edit Lending Record' : 'New Lending'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Status */}
            <F label="Status *">
              <select className={inputCls} name="status" value={form.status || ''} onChange={handleChange}>
                <option value="">— Select —</option>
                <option value="Active">Active</option>
                <option value="Returned">Returned</option>
              </select>
            </F>

            {/* Equipment type pre-filter */}
            <F label="Equipment Type (filter)">
              <select className={inputCls} value={eqTypeFilter}
                onChange={e => { setEqTypeFilter(e.target.value); setForm(f => ({ ...f, equipment: null })); }}>
                <option value="">— All Types —</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </F>

            {/* Equipment combobox */}
            <div className="col-span-2">
              <F label="Equipment *">
                <EqCombobox
                  allEquipment={allEquipment}
                  typeFilter={eqTypeFilter}
                  value={form.equipment || ''}
                  onChange={id => setForm(f => ({ ...f, equipment: id || null }))}
                />
              </F>
            </div>

            {/* ── Borrower info ── */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 border-t pt-3">Borrower Information</p>
            </div>

            <F label="Borrower Name">
              <input className={inputCls} name="borrower_name" value={form.borrower_name || ''}
                onChange={handleChange} placeholder="Full name of borrower" />
            </F>
            <F label="Phone Number">
              <input className={inputCls} name="phone_number" value={form.phone_number || ''}
                onChange={handleChange} placeholder="e.g. +250 78 000 0000" />
            </F>
            <div className="col-span-2">
              <F label="Purpose">
                <input className={inputCls} name="purpose" value={form.purpose || ''}
                  onChange={handleChange} placeholder="Reason for borrowing" />
              </F>
            </div>

            {/* ── Staff ── */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 border-t pt-3">IT Staff</p>
            </div>

            <F label="Issued By">
              <select className={inputCls} name="issued_by" value={form.issued_by || ''} onChange={handleChange}>
                <option value="">— Select Staff —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>)}
              </select>
            </F>

            {/* ── Dates ── */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 border-t pt-3">Dates</p>
            </div>

            <F label="Issued Date *">
              <input className={inputCls} type="date" name="issued_date"
                value={form.issued_date || ''} onChange={handleChange} />
            </F>
            <F label={form.status === 'Returned' ? '🔴 Returned Date *' : 'Returned Date'}>
              <input
                className={`${inputCls} ${form.status === 'Returned' && !form.returned_date ? 'border-red-400 ring-2 ring-red-200' : ''}`}
                type="date" name="returned_date"
                value={form.returned_date || ''} onChange={handleChange} />
            </F>

            {/* ── Return details ── */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 border-t pt-3">Return Details</p>
            </div>

            <F label="Returned By (Name)">
              <input className={inputCls} name="returned_by" value={form.returned_by || ''}
                onChange={handleChange} placeholder="Name of person returning" />
            </F>
            <F label="Condition on Return">
              <select className={inputCls} name="condition_on_return" value={form.condition_on_return || ''} onChange={handleChange}>
                <option value="">— None —</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>

            <F label="Return Confirmed By">
              <select className={inputCls} name="return_confirmed_by" value={form.return_confirmed_by || ''} onChange={handleChange}>
                <option value="">— None —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </F>

            <div className="col-span-2">
              <F label="Return Comments">
                <textarea className={inputCls + ' resize-none'} name="return_comments" rows={3}
                  value={form.return_comments || ''} onChange={handleChange}
                  placeholder="Any notes about the return condition…" />
              </F>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-2 rounded-lg bg-[#003580] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#002060] transition-colors">
              {submitting ? 'Saving…' : selected ? 'Update' : 'Create'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)}>
          <p className="text-slate-600 mb-6">Are you sure you want to delete this lending record? This action cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </Layout>
  );
}
