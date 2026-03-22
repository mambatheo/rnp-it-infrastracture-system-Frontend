import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { reportsApi } from '../services/api';

const ACCENT = '#003366';

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function DlBtn({ label, icon, onClick, loading, color = ACCENT }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: color, color }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = color;
          e.currentTarget.style.color      = '#fff';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '';
        e.currentTarget.style.color      = color;
      }}
    >
      {loading
        ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {loading ? 'Generating…' : label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT CARD
// ─────────────────────────────────────────────────────────────────────────────
function ReportCard({ label, count, total, color, onExcel, onPdf, setGlobalError }) {
  const [busy, setBusy] = useState({ excel: false, pdf: false });

  const dl = useCallback(async (format) => {
    setBusy((b) => ({ ...b, [format]: true }));
    try {
      if (format === 'excel') await onExcel();
      else                    await onPdf();
    } catch (err) {
      console.error(err);
      setGlobalError?.(err.message || 'Download failed.');
    } finally {
      setBusy((b) => ({ ...b, [format]: false }));
    }
  }, [onExcel, onPdf, setGlobalError]);

  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-tight">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{count ?? '…'}</p>
        </div>
        <span className="text-xs font-medium text-slate-400 mt-1">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <DlBtn icon="📊" label="Excel" onClick={() => dl('excel')} loading={busy.excel} color={color} />
        <DlBtn icon="📄" label="PDF"   onClick={() => dl('pdf')}   loading={busy.pdf}   color={color} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  title, subtitle, accent, totalLabel, totalValue,
  onExcel, onPdf, gridLabel, setGlobalError, children,
}) {
  const [allBusy, setAllBusy] = useState({ excel: false, pdf: false });

  const dlAll = useCallback(async (format) => {
    setAllBusy((b) => ({ ...b, [format]: true }));
    try {
      if (format === 'excel') await onExcel();
      else                    await onPdf();
    } catch (err) {
      console.error(err);
      setGlobalError?.(err.message || 'Download failed.');
    } finally {
      setAllBusy((b) => ({ ...b, [format]: false }));
    }
  }, [onExcel, onPdf, setGlobalError]);

  return (
    <div className="mb-10">
      <div
        className="rounded-2xl p-5 mb-5 flex items-center justify-between flex-wrap gap-4"
        style={{ background: accent }}
      >
        <div className="text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{subtitle}</p>
          <p className="text-3xl font-bold mt-0.5">{totalValue ?? '…'}</p>
          <p className="text-sm opacity-70 mt-0.5">{totalLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white text-xs opacity-70 font-medium">Full {title} Report:</span>
          <button
            onClick={() => dlAll('excel')}
            disabled={allBusy.excel}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {allBusy.excel
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '📊'}
            {allBusy.excel ? 'Generating…' : 'Excel'}
          </button>
          <button
            onClick={() => dlAll('pdf')}
            disabled={allBusy.pdf}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {allBusy.pdf
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '📄'}
            {allBusy.pdf ? 'Generating…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {gridLabel ?? 'Per Equipment Type'}
        </h2>
        <p className="text-xs text-slate-400">Click Excel / PDF on a card to export individually</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [dlError,    setDlError]    = useState(null);

  useEffect(() => {
    reportsApi.counts()
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setFetchError('Failed to load report data.'); setLoading(false); });
  }, []);

  const {
    totals           = {},
    equipment_counts = {},
    stock_counts     = {},
    unit_counts      = {},
    region_counts    = {},
    dpu_counts       = {},
  } = data ?? {};

  const eqTypeKeys    = Object.keys(equipment_counts).sort();
  const stockTypeKeys = Object.keys(stock_counts).sort();

  const eqTotal    = Object.values(equipment_counts).reduce((s, v) => s + (v || 0), 0);
  const stockTotal = Object.values(stock_counts).reduce((s, v)     => s + (v || 0), 0);

  const unitEntries   = Object.entries(unit_counts).sort((a, b)   => a[1].name.localeCompare(b[1].name));
  const regionEntries = Object.entries(region_counts).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const dpuEntries    = Object.entries(dpu_counts).sort((a, b)    => a[1].name.localeCompare(b[1].name));

  const unitTotal   = unitEntries.reduce((s, [, v])   => s + v.count, 0);
  const regionTotal = regionEntries.reduce((s, [, v]) => s + v.count, 0);
  const dpuTotal    = dpuEntries.reduce((s, [, v])    => s + v.count, 0);

  const emptyMsg = (label) => (
    <p className="text-slate-400 text-sm col-span-3 py-4 text-center">
      No {label} with equipment found.
    </p>
  );

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Get a report on any equipment type from any Unit, Region or DPU
          </p>
        </div>

        {/* Download error banner */}
        {dlError && (
          <div className="mb-6 flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <span>⚠️ {dlError}</span>
            <button
              onClick={() => setDlError(null)}
              className="ml-4 font-bold text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid place-items-center py-24">
            <div className="w-10 h-10 border-4 border-[#003366] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="p-6 text-center text-red-500">{fetchError}</div>
        ) : (
          <>
            {/* ── EQUIPMENT ─────────────────────────────────────────────── */}
            <Section
              title="Equipment" subtitle="Total IT Equipment" accent={ACCENT}
              totalValue={totals.equipment}
              totalLabel={`Active deployments: ${totals.active_deployments ?? '…'}`}
              setGlobalError={setDlError}
              onExcel={() => reportsApi.excelAll()}
              onPdf={()   => reportsApi.pdfAll()}
            >
              {eqTypeKeys.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 py-4 text-center">No equipment type data found.</p>
                : eqTypeKeys.map((key) => (
                    <ReportCard key={key} label={key} color={ACCENT}
                      count={equipment_counts[key] ?? 0} total={eqTotal}
                      setGlobalError={setDlError}
                      onExcel={() => reportsApi.excelByType(key)}
                      onPdf={()   => reportsApi.pdfByType(key)}
                    />
                  ))
              }
            </Section>

            {/* ── STOCK ─────────────────────────────────────────────────── */}
            <Section
              title="Stock" subtitle="Devices Currently in Stock" accent={ACCENT}
              totalValue={totals.stock}
              totalLabel="Devices held in stock across all types"
              setGlobalError={setDlError}
              onExcel={() => reportsApi.stockExcelAll()}
              onPdf={()   => reportsApi.stockPdfAll()}
            >
              {stockTypeKeys.length === 0
                ? <p className="text-slate-400 text-sm col-span-3 py-4 text-center">No stock data found.</p>
                : stockTypeKeys.map((key) => (
                    <ReportCard key={key} label={key} color={ACCENT}
                      count={stock_counts[key] ?? 0} total={stockTotal}
                      setGlobalError={setDlError}
                      onExcel={() => reportsApi.stockExcelByType(key)}
                      onPdf={()   => reportsApi.stockPdfByType(key)}
                    />
                  ))
              }
            </Section>

            {/* ── UNITS ─────────────────────────────────────────────────── */}
            <Section
              title="Unit" subtitle="Equipment by Organisational Unit" accent={ACCENT}
              totalValue={unitTotal}
              totalLabel={`Across ${unitEntries.length} unit${unitEntries.length !== 1 ? 's' : ''}`}
              setGlobalError={setDlError}
              onExcel={() => reportsApi.unitExcelAll()}
              onPdf={()   => reportsApi.unitPdfAll()}
              gridLabel="Per Organisational Unit"
            >
              {unitEntries.length === 0 ? emptyMsg('units') : unitEntries.map(([id, { name, count }]) => (
                <ReportCard key={id} label={name} color={ACCENT}
                  count={count} total={unitTotal}
                  setGlobalError={setDlError}
                  onExcel={() => reportsApi.unitExcelById(id, name)}
                  onPdf={()   => reportsApi.unitPdfById(id, name)}
                />
              ))}
            </Section>

            {/* ── REGIONS ───────────────────────────────────────────────── */}
            <Section
              title="Region" subtitle="Organised by Region" accent={ACCENT}
              totalValue={regionTotal}
              totalLabel={`Across ${regionEntries.length} region${regionEntries.length !== 1 ? 's' : ''}`}
              setGlobalError={setDlError}
              onExcel={() => reportsApi.regionExcelAll()}
              onPdf={()   => reportsApi.regionPdfAll()}
              gridLabel="Per Organisational Region"
            >
              {regionEntries.length === 0 ? emptyMsg('regions') : regionEntries.map(([id, { name, count }]) => (
                <ReportCard key={id} label={name} color={ACCENT}
                  count={count} total={regionTotal}
                  setGlobalError={setDlError}
                  onExcel={() => reportsApi.regionExcelById(id, name)}
                  onPdf={()   => reportsApi.regionPdfById(id, name)}
                />
              ))}
            </Section>

            {/* ── DPUs ──────────────────────────────────────────────────── */}
            <Section
              title="DPU" subtitle="Equipment in DPU HQRs and Stations" accent={ACCENT}
              totalValue={dpuTotal}
              totalLabel={`Across ${dpuEntries.length} DPU${dpuEntries.length !== 1 ? 's' : ''}`}
              setGlobalError={setDlError}
              onExcel={() => reportsApi.dpuExcelAll()}
              onPdf={()   => reportsApi.dpuPdfAll()}
              gridLabel="Per DPU"
            >
              {dpuEntries.length === 0 ? emptyMsg('DPUs') : dpuEntries.map(([id, { name, count }]) => (
                <ReportCard key={id} label={name} color={ACCENT}
                  count={count} total={dpuTotal}
                  setGlobalError={setDlError}
                  onExcel={() => reportsApi.dpuExcelById(id, name)}
                  onPdf={()   => reportsApi.dpuPdfById(id, name)}
                />
              ))}
            </Section>
          </>
        )}
      </div>
    </Layout>
  );
}