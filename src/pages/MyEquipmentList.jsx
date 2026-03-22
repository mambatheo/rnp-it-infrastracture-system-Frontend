import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { deploymentsApi } from '../services/api';

/** Fetch ALL pages from a paginated API endpoint, 200 records per page */
async function fetchAllPages(apiFn, params = {}) {
  let page = 1;
  let allResults = [];
  while (true) {
    const data = await apiFn({ ...params, page, page_size: 200 });
    const results = data?.results || [];
    allResults = [...allResults, ...results];
    if (!data?.next || results.length === 0) break;
    page += 1;
  }
  return allResults;
}


/* ── colour palette per type (same as parent page) ── */
const TYPE_META = {
  'Desktop':          { color: '#3b82f6', bg: '#eff6ff' },
  'Laptop':           { color: '#8b5cf6', bg: '#f5f3ff' },
  'Server':           { color: '#0891b2', bg: '#ecfeff' },
  'TV Screen':        { color: '#0d9488', bg: '#f0fdfa' },
  'Projector':        { color: '#7c3aed', bg: '#faf5ff' },
  'Decoder':          { color: '#1d4ed8', bg: '#eff6ff' },
  'Printer':          { color: '#ca8a04', bg: '#fefce8' },
  'Network Device':   { color: '#16a34a', bg: '#f0fdf4' },
  'Telephone':        { color: '#059669', bg: '#ecfdf5' },
  'External Storage': { color: '#dc2626', bg: '#fef2f2' },
  'Peripheral':       { color: '#9333ea', bg: '#fdf4ff' },
  'UPS':              { color: '#ea580c', bg: '#fff7ed' },
};
const DEFAULT_META = { color: '#64748b', bg: '#f8fafc' };
const getMeta = t => TYPE_META[t] || DEFAULT_META;

/* ── small badge ── */
const Badge = ({ children, color = '#64748b', bg = '#f1f5f9' }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 999,
    fontSize: 11, fontWeight: 600,
    color, background: bg,
  }}>{children}</span>
);

/* ── Full-detail card for one deployment ── */
function DeploymentCard({ dep }) {
  const rows = [
    { label: 'Serial No.',    value: dep.equipment_serial },
    { label: 'Office',        value: dep.issued_to_office_name },
    { label: 'Unit',          value: dep.issued_to_unit_name },
    { label: 'Deployed Date', value: dep.issued_date },
    { label: 'Purpose',       value: dep.purpose },
    { label: 'Notes',         value: dep.notes },
  ].filter(r => r.value);

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      transition: 'box-shadow 0.18s, transform 0.18s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top stripe */}
      <div style={{
        height: 4,
        background: getMeta(dep.equipment_type).color,
      }} />

      <div style={{ padding: '16px 18px 18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
              {dep.equipment_name || dep.equipment_type || 'Device'}
            </p>
            {dep.equipment_type && (
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                {dep.equipment_type}
              </p>
            )}
          </div>
          <Badge color="#16a34a" bg="#dcfce7">Active</Badge>
        </div>

        {/* Detail grid */}
        {rows.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px 16px',
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
          }}>
            {rows.map(({ label, value }) => (
              <div key={label}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#374151', wordBreak: 'break-word' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function MyEquipmentList() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const typeParam               = searchParams.get('type') || '';   // pre-selected type

  const [all, setAll]           = useState([]);   // all active deployments
  const [loading, setLoading]   = useState(false);

  // filters / search state
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState(typeParam);
  const [officeFilter, setOfficeFilter] = useState('');
  const [unitFilter, setUnitFilter]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetchAllPages(deploymentsApi.list, { status: 'Active' })
      .then(results => setAll(results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);


  /* ── Derived option lists ── */
  const allTypes   = useMemo(() => [...new Set(all.map(d => d.equipment_type).filter(Boolean))].sort(), [all]);
  const allOffices = useMemo(() => [...new Set(all.map(d => d.issued_to_office_name).filter(Boolean))].sort(), [all]);
  const allUnits   = useMemo(() => [...new Set(all.map(d => d.issued_to_unit_name).filter(Boolean))].sort(), [all]);

  /* ── Filtered results ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return all.filter(dep => {
      if (typeFilter   && dep.equipment_type          !== typeFilter)   return false;
      if (officeFilter && dep.issued_to_office_name   !== officeFilter) return false;
      if (unitFilter   && dep.issued_to_unit_name     !== unitFilter)   return false;
      if (q) {
        const hay = [
          dep.equipment_name, dep.equipment_type,
          dep.equipment_serial, dep.issued_to_office_name,
          dep.issued_to_unit_name, dep.purpose,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, search, typeFilter, officeFilter, unitFilter]);

  const activeTypeMeta = getMeta(typeFilter || 'Desktop');
  const hasFilter = search || typeFilter || officeFilter || unitFilter;

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Back + Title ── */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => navigate('/my-equipment')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 13, fontWeight: 600,
              padding: '0 0 8px', marginBottom: 8,
            }}
          >
            ← Back to My Equipment
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
                {typeFilter ? typeFilter : 'All Equipment'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
                Equipment currently deployed to you
              </p>
            </div>

            {/* Total count pill */}
            {!loading && (
              <span style={{
                padding: '8px 18px', borderRadius: 999,
                background: activeTypeMeta.bg,
                color: activeTypeMeta.color,
                fontSize: 14, fontWeight: 700,
                border: `1px solid ${activeTypeMeta.color}33`,
              }}>
                {filtered.length} unit{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── Search + Filters ── */}
        <div style={{
          background: '#fff', borderRadius: 14,
          border: '1px solid #e2e8f0',
          padding: '16px 20px', marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {/* Search */}
            <div style={{ position: 'relative', gridColumn: 'span 2' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', fontSize: 16, pointerEvents: 'none',
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, serial, office, purpose…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 36px',
                  borderRadius: 8, border: '1.5px solid #e2e8f0',
                  fontSize: 13, color: '#1e293b', outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{
                padding: '9px 12px', borderRadius: 8,
                border: '1.5px solid #e2e8f0', fontSize: 13,
                color: typeFilter ? '#1e293b' : '#94a3b8',
                background: '#fff', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">All Types</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Office filter */}
            <select
              value={officeFilter}
              onChange={e => setOfficeFilter(e.target.value)}
              style={{
                padding: '9px 12px', borderRadius: 8,
                border: '1.5px solid #e2e8f0', fontSize: 13,
                color: officeFilter ? '#1e293b' : '#94a3b8',
                background: '#fff', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">All Offices</option>
              {allOffices.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            {/* Unit filter */}
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              style={{
                padding: '9px 12px', borderRadius: 8,
                border: '1.5px solid #e2e8f0', fontSize: 13,
                color: unitFilter ? '#1e293b' : '#94a3b8',
                background: '#fff', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">All Units</option>
              {allUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Clear filters */}
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setTypeFilter(''); setOfficeFilter(''); setUnitFilter(''); }}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: '1.5px solid #fca5a5',
                  background: '#fef2f2', color: '#dc2626',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{
                height: 160, borderRadius: 14,
                background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                backgroundSize: '400% 100%',
                animation: 'shimmer 1.4s infinite',
              }} />
            ))}
            <style>{`
              @keyframes shimmer {
                0%   { background-position: 100% 0; }
                100% { background-position: -100% 0; }
              }
            `}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '64px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#475569' }}>
              No results found
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {filtered.map(dep => (
              <DeploymentCard key={dep.id} dep={dep} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
