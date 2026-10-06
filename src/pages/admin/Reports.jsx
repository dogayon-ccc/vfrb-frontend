import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import axios                            from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import { PageHeader, StatGrid, PillTabs, Panel, Banner, ErrorBlock, SkeletonRows, Meter } from '../../components/admin/AdminUI';

function downloadCSV(rows, filename) {
  const csv = rows
    .map(row =>
      row.map(cell => {
        const s = String(cell ?? '').replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s}"`
          : s;
      }).join(',')
    ).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCSV(data, tab) {
  if (!data) return null;
  if (tab === 'overview') {
    return [
      ['VFRB Enterprise — Sales Report', '', '', ''],
      ['Generated', new Date().toLocaleString('en-PH'), '', ''],
      ['', '', '', ''],
      ['KPI', 'Value', '', ''],
      ['Total Revenue', `₱${Number(data.total_revenue ?? 0).toFixed(2)}`, '', ''],
      ['Total Orders',     data.total_orders ?? 0, '', ''],
      ['Completed Orders', data.completed_orders ?? 0, '', ''],
      ['Avg Order Value', `₱${Number(data.avg_order_value ?? 0).toFixed(2)}`, '', ''],
      ['', '', '', ''],
      ['Month', 'Orders', 'Pieces', 'Completed'],
      ...(data.order_trends ?? []).map(t => [t.month, t.orders, t.pieces, t.completed]),
    ];
  }
  if (tab === 'prescriptive') {
    return [
      ['VFRB Enterprise — MRP Prescriptive Alerts', '', '', '', ''],
      ['Generated', new Date().toLocaleString('en-PH'), '', '', ''],
      ['', '', '', '', ''],
      ['Severity', 'Material', 'In Stock', 'Reorder Threshold', 'Recommended Order', 'Action'],
      ...(data.prescriptive_alerts ?? []).map(a => [
        a.severity ?? '',
        a.material ?? a.material_name ?? '',
        `${a.in_stock ?? a.current_stock ?? 0} ${a.unit ?? ''}`,
        `${a.demanded_qty ?? a.total_required ?? 0} ${a.unit ?? ''}`,
        `${a.recommend_order_qty ?? a.recommended_order ?? 0} ${a.unit ?? ''}`,
        a.action ?? '',
      ]),
    ];
  }
  return null;
}

const CHART_GRID = '#f1f5f9';
const CHART_TICK = '#94a3b8';
const CHART_BAR = '#028090';
const CHART_BAR2 = '#02C39A';
const CHART_WARN = '#f59e0b';
const peso = (v) => `₱${Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const tip = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, boxShadow: 'var(--shadow-md)' };
const STAGE_LABEL = { pending: 'Pending', confirmed: 'Confirmed', pattern: 'Pattern', segregation: 'Segregation', cutting: 'Cutting', sewing: 'Sewing', qc: 'QC', pressing: 'Pressing', packing: 'Packing', completed: 'Completed', cancelled: 'Cancelled' };

const ChartPanel = ({ title, sub, empty, children, style }) => (
  <Panel title={title} style={style}>
    {sub && <p className="adm-sub" style={{ marginTop: -6, marginBottom: 12 }}>{sub}</p>}
    {empty ? <div className="adm-empty" style={{ padding: '28px 0' }}>{empty}</div> : children}
  </Panel>
);

function AlertCard({ a }) {
  const critical = a.severity === 'critical';
  const stock = a.in_stock ?? a.current_stock ?? 0;
  const need = a.demanded_qty ?? a.total_required ?? 0;
  const rec = a.recommend_order_qty ?? a.recommended_order ?? Math.ceil((a.deficit ?? 0) * 1.2);
  const affected = a.affected_orders ?? a.affected_order_ids ?? [];
  const isDeadline = a.type === 'deadline';
  return (
    <div className="adm-mcard accent" style={{ '--acc': critical ? 'var(--danger)' : 'var(--warning)', marginBottom: 0 }}>
      <div className="adm-mrow" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{isDeadline ? 'Approaching deadlines' : (a.material ?? a.material_name ?? 'Unknown material')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{isDeadline ? 'Orders due within 7 days' : `Unit: ${a.unit ?? '—'} · Category: ${a.category ?? '—'}`}</div>
        </div>
        <span className="adm-pill" style={{ background: critical ? 'var(--danger-bg)' : 'var(--warning-bg)', color: critical ? 'var(--danger-text)' : 'var(--warning-text)' }}>{critical ? 'Critical' : 'Warning'}</span>
      </div>
      {a.message && <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '10px 0 0' }}>{a.message}</p>}
      {!isDeadline && (
        <>
          <div className="rpt-trio">
            {[['In stock', `${stock} ${a.unit ?? ''}`, 'var(--danger)'], ['Reorder threshold', `${need} ${a.unit ?? ''}`, 'var(--warning-text)'], ['Suggested order', `${rec} ${a.unit ?? ''}`, 'var(--teal)']].map(([l, v, c]) => (
              <div key={l}><b style={{ color: c }}>{v}</b><span>{l}</span></div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-subtle)', marginBottom: 5 }}>
            <span>Stock vs threshold</span><b style={{ color: 'var(--danger-text)' }}>Deficit: {a.deficit ?? Math.max(0, need - stock)} {a.unit}</b>
          </div>
          <Meter pct={need ? (stock / need) * 100 : 0} tone="low" />
        </>
      )}
      {a.action && <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', margin: '10px 0 0' }}>{a.action}</p>}
      {affected.length > 0 && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 9, background: 'var(--bg)', fontSize: 11, color: 'var(--text-subtle)' }}>
          <b style={{ color: 'var(--ink)' }}>{affected.length} order{affected.length !== 1 ? 's' : ''} at risk:</b> #{affected.slice(0, 5).join(', #')}{affected.length > 5 ? ` and ${affected.length - 5} more` : ''}
        </div>
      )}
    </div>
  );
}

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [tab, setTab] = useState('overview');
  const [runningDigest, setRunningDigest] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');

  const load = useCallback((force = false) => {
    if (!force) {
      const c = cacheGet('admin_reports');
      if (c) { setData(c.data); setSales(c.sales); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    Promise.allSettled([axios.get('/api/admin/reports'), axios.get('/api/admin/reports/sales')]).then(([r, s]) => {
      if (r.status !== 'fulfilled') { setLoadErr(true); return; }
      const d = r.value.data; const sl = s.status === 'fulfilled' ? s.value.data : null;
      setData(d); setSales(sl);
      cacheSet('admin_reports', { data: d, sales: sl }, TTL.REPORTS);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const runDigest = useCallback(async () => {
    setRunningDigest(true); setDigestMsg('');
    try {
      const r = await axios.post('/api/admin/automation/run-digest');
      setDigestMsg(r.data?.message ?? 'Done.');
      cacheClear('admin_reports', 'dashboard_stats', 'notifications');
      load(true);
    } catch { setDigestMsg('Automation run failed. Check backend logs.'); }
    finally { setRunningDigest(false); setTimeout(() => setDigestMsg(''), 6000); }
  }, [load]);

  const alerts = data?.prescriptive_alerts ?? [];
  const trends = data?.order_trends ?? [];
  const monthly = sales?.monthly_trends ?? [];
  const totals = sales?.totals;
  const inv = data?.inventory_summary;
  const types = data?.order_type_breakdown ?? [];
  const pipeline = Object.entries(data?.pipeline_snapshot ?? {}).filter(([, v]) => v.count > 0);
  const maxPipe = Math.max(1, ...pipeline.map(([, v]) => v.count));
  const critical = alerts.filter((a) => a.severity === 'critical').length;

  const csvTab = tab === 'alerts' ? 'prescriptive' : tab;
  const exportCsv = () => {
    const rows = buildCSV(data, csvTab);
    if (rows) downloadCSV(rows, `vfrb_${csvTab}_${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'sales', label: 'Sales' },
    { key: 'alerts', label: 'Alerts', count: alerts.length || null },
  ];

  return (
    <div className="rpt-printable">
      <div className="rpt-noprint">
        <PageHeader title="Reports" sub="Sales analytics · Orders & production · Stock and deadline alerts">
          <button className="adm-btn" onClick={exportCsv} disabled={loading || !data || !buildCSV(data, csvTab)}><NavIcon name="download" size={14} color="currentColor" /> Export CSV</button>
          <button className="adm-btn adm-hide-t" onClick={() => window.print()}><NavIcon name="print" size={14} color="currentColor" /> Print</button>
          <button className="adm-btn" onClick={() => { cacheClear('admin_reports'); load(true); }}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
          <button className="adm-btn primary" onClick={runDigest} disabled={runningDigest}
            title="Run the automated low-stock digest, auto-suggested RFQs, and deadline reminders now">
            <NavIcon name={runningDigest ? 'loading' : 'ai'} size={14} color="currentColor" /> {runningDigest ? 'Running…' : 'Run automation'}
          </button>
        </PageHeader>
        {digestMsg && <Banner tone="info" icon="info">{digestMsg}</Banner>}
        {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load reports." onRetry={() => load(true)} /></div>}
        <PillTabs value={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === 'overview' && (
        <div className="adm-stack">
          <StatGrid loading={loading} items={[
            { label: 'Total revenue', value: peso(data?.total_revenue), color: 'var(--success-text)' },
            { label: 'Total orders', value: data?.total_orders ?? 0 },
            { label: 'Completed orders', value: data?.completed_orders ?? 0, color: 'var(--teal)' },
            { label: 'Avg order value', value: peso(data?.avg_order_value) },
            ...(inv ? [{ label: 'Low-stock materials', value: `${inv.low} / ${inv.total}`, color: inv.low ? 'var(--warning-text)' : undefined, sub: `Stock value ${peso(inv.total_value)}` }] : []),
          ]} />
          <div className="rpt-two">
            <ChartPanel title="Orders — last 6 months" sub="Orders placed vs completed, by month" empty={!loading && trends.length === 0 && 'No orders in the last 6 months.'}>
              {loading ? <SkeletonRows rows={1} h={220} /> : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={trends} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(2,128,144,0.06)' }} contentStyle={tip} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="orders" name="Orders" fill={CHART_BAR} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill={CHART_BAR2} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
            <ChartPanel title="Pipeline snapshot" sub="Orders per status right now" empty={!loading && pipeline.length === 0 && 'No orders yet.'}>
              {loading ? <SkeletonRows rows={4} h={22} /> : (
                <div className="rpt-bars">
                  {pipeline.map(([k, v]) => (
                    <div key={k}>
                      <div className="rpt-bar-h"><span>{STAGE_LABEL[k] ?? k}</span><b>{v.count} <i>· {v.total_pieces} pcs</i></b></div>
                      <Meter pct={(v.count / maxPipe) * 100} tone={k === 'cancelled' ? 'low' : k === 'completed' ? 'ok' : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </ChartPanel>
          </div>
          {types.length > 0 && (
            <Panel title="Order type breakdown (excl. cancelled)" flush>
              <div className="adm-tbl-scroll"><table className="adm-table">
                <thead><tr><th>Type</th><th style={{ textAlign: 'right' }}>Orders</th><th style={{ textAlign: 'right' }}>Pieces</th></tr></thead>
                <tbody>{types.map((t) => <tr key={t.order_type}><td style={{ textTransform: 'capitalize' }}>{t.order_type}</td><td style={{ textAlign: 'right' }}>{t.count}</td><td style={{ textAlign: 'right' }}>{Number(t.total_pieces ?? 0).toLocaleString()}</td></tr>)}</tbody>
              </table></div>
            </Panel>
          )}
        </div>
      )}

      {tab === 'sales' && (
        <div className="adm-stack">
          {!loading && !sales && <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={() => load(true)}>Retry</button>}>Sales summary could not be loaded.</Banner>}
          <StatGrid loading={loading} items={[
            { label: 'Collected', value: peso(totals?.total_collected), color: 'var(--success-text)' },
            { label: 'Billed', value: peso(totals?.total_billed) },
            { label: 'Outstanding', value: peso(totals?.total_outstanding), color: totals?.total_outstanding > 0 ? 'var(--warning-text)' : undefined },
            { label: 'Transactions', value: totals?.total_txns ?? 0 },
          ]} />
          <ChartPanel title="Monthly sales — last 6 months" sub="Collected vs outstanding balance, by payment month" empty={!loading && sales && monthly.length === 0 && 'No payments recorded in the last 6 months.'}>
            {loading ? <SkeletonRows rows={1} h={230} /> : monthly.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ top: 4, right: 0, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={{ fill: 'rgba(2,128,144,0.06)' }} formatter={(v, n) => [peso(v), n]} contentStyle={tip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="collected" name="Collected" fill={CHART_BAR} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="outstanding" name="Outstanding" fill={CHART_WARN} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
          {(totals?.by_method?.length ?? 0) > 0 && (
            <Panel title="By payment method" flush>
              <div className="adm-tbl-scroll"><table className="adm-table">
                <thead><tr><th>Method</th><th style={{ textAlign: 'right' }}>Transactions</th><th style={{ textAlign: 'right' }}>Collected</th></tr></thead>
                <tbody>{totals.by_method.map((m) => <tr key={m.payment_method ?? 'none'}><td style={{ textTransform: 'capitalize' }}>{String(m.payment_method ?? '—').replace(/_/g, ' ')}</td><td style={{ textAlign: 'right' }}>{m.count}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{peso(m.total)}</td></tr>)}</tbody>
              </table></div>
            </Panel>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="adm-stack">
          <Banner tone="info" icon="ai">
            Alerts come from inventory and order data: materials at or below their reorder threshold (critical when stock is zero), and orders due within 7 days that are still in progress. Suggested order = 2× the reorder threshold.
          </Banner>
          {loading ? <SkeletonRows rows={3} h={130} /> : alerts.length === 0 ? (
            <Panel><div className="adm-empty"><NavIcon name="success" size={34} color="var(--success)" /><div style={{ marginTop: 8, fontWeight: 800, color: 'var(--success-text)' }}>All clear</div>No materials are at or below their reorder threshold and no orders are approaching their deadline.</div></Panel>
          ) : (
            <>
              <Banner tone="warn" icon="warning">{alerts.length} alert{alerts.length !== 1 ? 's' : ''}{critical ? ` · ${critical} critical` : ''} — review before production is blocked.</Banner>
              <div className="rpt-alerts adm-stagger">{alerts.map((a, i) => <div key={i} style={{ '--i': Math.min(i, 8) }}><AlertCard a={a} /></div>)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
