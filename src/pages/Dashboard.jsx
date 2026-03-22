import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { reportsApi, deploymentsApi, usersApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../config/permissions';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, total, color = '#003580', sub }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-semibold text-slate-700 leading-tight">{label}</p>
        {total > 0 && <span className="text-xs text-slate-400 font-medium">{pct}%</span>}
      </div>
      <p className="text-2xl font-bold text-slate-800 mb-2">{value ?? '…'}</p>
      {total > 0 && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ─── Overview big card ────────────────────────────────────────────────────────
function BigCard({ icon, label, value, color = 'blue', sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value ?? '…'}</p>
        {sub && <p className="text-slate-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, total, totalLabel, accent = '#003580', children }) {
  return (
    <div className="mb-8">
      <div className="rounded-2xl p-5 mb-5 flex items-center justify-between flex-wrap gap-4"
        style={{ background: accent }}>
        <div className="text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-0.5">{total ?? '…'}</p>
          {totalLabel && <p className="text-sm opacity-70 mt-0.5">{totalLabel}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { role, user } = useAuth();
  const [data,    setData]    = useState(null);   // from reportsApi.counts()
  const [extra,   setExtra]   = useState({});     // users, active deployments
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== ROLES.ADMIN && role !== ROLES.IT_STAFF) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      // Single aggregated call — same source as Reports page
      const [counts, activeDeps, usersData] = await Promise.all([
        reportsApi.counts().catch(() => null),
        deploymentsApi.list({ page_size: 1, status: 'Active' }).catch(() => null),
        role === ROLES.ADMIN ? usersApi.list({ page_size: 1 }).catch(() => null) : Promise.resolve(null),
      ]);
      setData(counts);
      setExtra({
        activeDeployments: activeDeps?.count ?? 0,
        users:             usersData?.count  ?? 0,
      });
      setLoading(false);
    };
    load();
  }, [role]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totals       = data?.totals            ?? {};
  const eqCounts     = data?.equipment_counts  ?? {};
  const stockCounts  = data?.stock_counts      ?? {};
  const unitCounts   = data?.unit_counts       ?? {};
  const regionCounts = data?.region_counts     ?? {};
  const dpuCounts    = data?.dpu_counts        ?? {};

  const eqTypeKeys    = Object.keys(eqCounts).sort();
  const stockTypeKeys = Object.keys(stockCounts).sort();
  const eqTotal       = Object.values(eqCounts).reduce((s, v) => s + (v || 0), 0);
  const stockTotal    = Object.values(stockCounts).reduce((s, v) => s + (v || 0), 0);

  const unitEntries   = Object.entries(unitCounts).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const regionEntries = Object.entries(regionCounts).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const dpuEntries    = Object.entries(dpuCounts).sort((a, b) => a[1].name.localeCompare(b[1].name));

  const unitTotal   = unitEntries.reduce((s, [, v]) => s + v.count, 0);
  const regionTotal = regionEntries.reduce((s, [, v]) => s + v.count, 0);
  const dpuTotal    = dpuEntries.reduce((s, [, v]) => s + v.count, 0);

  const ACCENT = '#003580';

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.first_name || 'there'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">
            {role?.replace('_', ' ') || 'User'} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {loading ? (
          <div className="grid place-items-center py-24">
            <div className="w-10 h-10 border-4 border-[#003580] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : role === ROLES.ADMIN || role === ROLES.IT_STAFF ? (
          <div className="space-y-8">

            {/* ── Overview ── */}
            <div>
              <h2 className="text-base font-semibold text-slate-700 mb-3">Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {role === ROLES.ADMIN && (
                  <BigCard icon="👥" label="Total Users"        value={extra.users}            color="purple" />
                )}
                <BigCard icon="📦" label="All Equipment"        value={totals.equipment}       color="blue" />
                <BigCard icon="🏪" label="In Stock"             value={totals.stock}           color="green" />
                <BigCard icon="🚚" label="Active Deployments"   value={extra.activeDeployments} color="orange" />
                <BigCard icon="⚠️" label="Unassigned"           value={totals.unassigned}      color="red"
                  sub="Not in stock or deployed" />
              </div>
            </div>

            {/* ── Equipment by Type ── */}
            <Section title="Equipment by Type" accent={ACCENT}
              total={eqTotal}
              totalLabel={`Across ${eqTypeKeys.length} category${eqTypeKeys.length !== 1 ? 'ies' : 'y'}`}>
              {eqTypeKeys.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 text-center py-4">No data.</p>
                : eqTypeKeys.map(key => (
                    <StatCard key={key} label={key}
                      value={eqCounts[key] ?? 0} total={eqTotal} color={ACCENT} />
                  ))
              }
            </Section>

            {/* ── Stock by Type ── */}
            <Section title="Stock by Type" accent="#1a6b3a"
              total={stockTotal}
              totalLabel={`Across ${stockTypeKeys.length} category${stockTypeKeys.length !== 1 ? 'ies' : 'y'}`}>
              {stockTypeKeys.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 text-center py-4">No stock data.</p>
                : stockTypeKeys.map(key => (
                    <StatCard key={key} label={key}
                      value={stockCounts[key] ?? 0} total={stockTotal} color="#1a6b3a" />
                  ))
              }
            </Section>

            {/* ── By Region ── */}
            <Section title="Organised by Region" accent={ACCENT}
              total={regionTotal}
              totalLabel={`Across ${regionEntries.length} region${regionEntries.length !== 1 ? 's' : ''}`}>
              {regionEntries.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 text-center py-4">No regions with equipment.</p>
                : regionEntries.map(([id, { name, count }]) => (
                    <StatCard key={id} label={name}
                      value={count} total={regionTotal} color={ACCENT} />
                  ))
              }
            </Section>

            {/* ── By DPU ── */}
            <Section title="Equipment in DPU HQRs and Stations" accent={ACCENT}
              total={dpuTotal}
              totalLabel={`Across ${dpuEntries.length} DPU${dpuEntries.length !== 1 ? 's' : ''}`}>
              {dpuEntries.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 text-center py-4">No DPUs with equipment.</p>
                : dpuEntries.map(([id, { name, count }]) => (
                    <StatCard key={id} label={name}
                      value={count} total={dpuTotal} color={ACCENT} />
                  ))
              }
            </Section>

            {/* ── By Unit ── */}
            <Section title="Equipment by Organisational Unit" accent={ACCENT}
              total={unitTotal}
              totalLabel={`Across ${unitEntries.length} unit${unitEntries.length !== 1 ? 's' : ''}`}>
              {unitEntries.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 text-center py-4">No units with equipment.</p>
                : unitEntries.map(([id, { name, count }]) => (
                    count > 0 && (
                      <StatCard key={id} label={name}
                        value={count} total={unitTotal} color={ACCENT} />
                    )
                  ))
              }
            </Section>

            {/* ── Maintenance (placeholder) ── */}
            <div>
              <h2 className="text-base font-semibold text-slate-700 mb-3">Maintenance</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <BigCard icon="🔧" label="Total Requests"   value="—" color="orange" />
                <BigCard icon="⏳" label="Pending Requests" value="—" color="red" sub="Needs attention" />
              </div>
            </div>

          </div>
        ) : role === ROLES.TECHNICIAN ? (
          <div className="bg-slate-50 rounded-xl p-12 text-center text-slate-400">
            🔧 Maintenance module coming soon
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-12 text-center text-slate-400">
            🔧 Maintenance module coming soon
          </div>
        )}
      </div>
    </Layout>
  );
}
