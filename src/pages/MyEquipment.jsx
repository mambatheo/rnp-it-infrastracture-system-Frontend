import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { deploymentsApi, usersApi } from '../services/api';

const TYPE_META = {
  'Desktop':          { icon: '🖥️', color: '#3b82f6', bg: '#eff6ff' },
  'Laptop':           { icon: '💻', color: '#8b5cf6', bg: '#f5f3ff' },
  'Server':           { icon: '🗄️', color: '#0891b2', bg: '#ecfeff' },
  'TV Screen':        { icon: '📺', color: '#0d9488', bg: '#f0fdfa' },
  'Projector':        { icon: '📽️', color: '#7c3aed', bg: '#faf5ff' },
  'Decoder':          { icon: '📡', color: '#1d4ed8', bg: '#eff6ff' },
  'Printer':          { icon: '🖨️', color: '#ca8a04', bg: '#fefce8' },
  'Network Switch':   { icon: '🌐', color: '#16a34a', bg: '#f0fdf4' },
  'Router':           { icon: '🌐', color: '#15803d', bg: '#f0fdf4' },
  'Firewall':         { icon: '🛡️', color: '#b91c1c', bg: '#fef2f2' },
  'IP Phone':         { icon: '📞', color: '#059669', bg: '#ecfdf5' },
  'Smartphone':       { icon: '📱', color: '#0369a1', bg: '#f0f9ff' },
  'Tablet':           { icon: '📟', color: '#7c3aed', bg: '#faf5ff' },
  'External HDD':     { icon: '💾', color: '#dc2626', bg: '#fef2f2' },
  'Flash Drive':      { icon: '💾', color: '#b45309', bg: '#fefce8' },
  'Mouse':            { icon: '🖱️', color: '#9333ea', bg: '#fdf4ff' },
  'Keyboard':         { icon: '⌨️', color: '#6d28d9', bg: '#f5f3ff' },
  'Monitor':          { icon: '🖥️', color: '#0284c7', bg: '#f0f9ff' },
  'UPS':              { icon: '🔋', color: '#ea580c', bg: '#fff7ed' },
};

const DEFAULT_META = { icon: '🔧', color: '#64748b', bg: '#f8fafc' };
function getMeta(type) { return TYPE_META[type] || DEFAULT_META; }

/** Fetch ALL pages from a paginated API endpoint */
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

/* ── Card per equipment type ── */
function TypeCard({ type, items }) {
  const navigate = useNavigate();
  const meta = getMeta(type);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
    >
      {/* Coloured top stripe */}
      <div style={{ height: 4, background: meta.color }} />

      {/* Card body */}
      <div style={{ padding: '20px 20px 18px', background: meta.bg }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#1e293b' }}>
          {type}
        </p>

        {/* Count */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: meta.color, lineHeight: 1 }}>
            {items.length}
          </span>
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            {items.length === 1 ? 'unit' : 'units'} assigned
          </span>
        </div>

        {/* View all button */}
        <button
          onClick={() => navigate(`/my-equipment/list?type=${encodeURIComponent(type)}`)}
          style={{
            marginTop: 16, width: '100%',
            padding: '9px 0', borderRadius: 8,
            border: `1.5px solid ${meta.color}`,
            background: 'transparent', color: meta.color,
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.18s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = meta.color; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = meta.color; }}
        >
          View all →
        </button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function MyEquipment() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');

  useEffect(() => {
    setLoading(true);

    // Fetch current user info for the location label
    usersApi.me()
      .then(me => {
        // Show the most specific location available
        const label =
          me?.office_name       ||
          me?.dpu_name          ||
          me?.unit_name         ||
          me?.region_name       ||
          '';
        setLocationLabel(label);
      })
      .catch(() => {});

    // Fetch ALL active deployments for this user's location (backend already scopes by role)
    fetchAllPages(deploymentsApi.list, { status: 'Active' })
      .then(results => setDeployments(results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group deployments by equipment_type (serializer returns the category name string)
  const grouped = deployments.reduce((acc, dep) => {
    const key = dep.equipment_type || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(dep);
    return acc;
  }, {});

  // Sort types: known types first (in TYPE_META order), then others alphabetically
  const orderedTypes = [
    ...Object.keys(TYPE_META).filter(t => grouped[t]),
    ...Object.keys(grouped).filter(t => !TYPE_META[t]).sort(),
  ];

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1e293b' }}>
            My Equipment
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>
            Equipment currently deployed to
            {locationLabel ? (
              <strong style={{ color: '#475569' }}> {locationLabel}</strong>
            ) : ' your location'}
          </p>
        </div>

        {loading ? (
          /* Loading skeleton */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 160, borderRadius: 16,
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
        ) : orderedTypes.length === 0 ? (
          /* Empty state */
          <div style={{
            background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            padding: '64px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔧</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#475569' }}>
              No equipment assigned
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Contact IT staff if you believe equipment should be assigned to you.
            </p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 20, flexWrap: 'wrap',
            }}>
              <span style={{
                padding: '6px 14px', borderRadius: 999,
                background: '#f1f5f9', fontSize: 13, fontWeight: 600, color: '#475569',
              }}>
                {deployments.length} total unit{deployments.length !== 1 ? 's' : ''}
              </span>
              <span style={{
                padding: '6px 14px', borderRadius: 999,
                background: '#f1f5f9', fontSize: 13, fontWeight: 600, color: '#475569',
              }}>
                {orderedTypes.length} equipment type{orderedTypes.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Type cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              alignItems: 'start',
            }}>
              {orderedTypes.map(type => (
                <TypeCard key={type} type={type} items={grouped[type]} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
