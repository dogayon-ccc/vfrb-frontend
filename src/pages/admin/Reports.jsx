import { useState, useEffect, useCallback } from 'react';
import axios                            from 'axios';
import { ChartCard, ChartLegend, TrendChart, BarsChart, DonutChart, useChartTheme, describeSeries, fmtPeso, fmtPesoShort, fmtCount } from '../../components/admin/charts/VfrbCharts';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import { isOwner } from '../../utils/jobAccess';
import { PageHeader, StatGrid, PillTabs, Panel, Banner, ErrorBlock, SkeletonRows, Meter, OrderLink, useLivePoll, LiveStamp } from '../../components/admin/AdminUI';

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

function buildCSV(data, tab, sales) {
  if (tab === 'sales') {
    if (!sales) return null;
    const t = sales.totals ?? {};
    return [
      ['VFRB Enterprise — Sales Summary', '', '', '', ''],
      ['Generated', new Date().toLocaleString('en-PH'), '', '', ''],
      ['', '', '', '', ''],
      ['KPI', 'Value', '', '', ''],
      ['Collected', Number(t.total_collected ?? 0).toFixed(2), '', '', ''],
      ['Billed', Number(t.total_billed ?? 0).toFixed(2), '', '', ''],
      ['Outstanding', Number(t.total_outstanding ?? 0).toFixed(2), '', '', ''],
      ['Transactions', t.total_txns ?? 0, '', '', ''],
      ['', '', '', '', ''],
      ['Month', 'Collected', 'Billed', 'Outstanding', 'Transactions'],
      ...(sales.monthly_trends ?? []).map((m) => [m.month, Number(m.collected ?? 0).toFixed(2), Number(m.billed ?? 0).toFixed(2), Number(m.outstanding ?? 0).toFixed(2), m.transaction_count ?? 0]),
      ['', '', '', '', ''],
      ['Payment method', 'Transactions', 'Collected', '', ''],
      ...(t.by_method ?? []).map((m) => [String(m.payment_method ?? '—').replace(/_/g, ' '), m.count ?? 0, Number(m.total ?? 0).toFixed(2), '', '']),
    ];
  }
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

const peso = (v) => `₱${Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const STAGE_LABEL = { pending: 'Pending', confirmed: 'Confirmed', pattern: 'Pattern', segregation: 'Segregation', cutting: 'Cutting', sewing: 'Sewing', qc: 'QC', pressing: 'Pressing', packing: 'Packing', for_delivery: 'For delivery', completed: 'Completed', cancelled: 'Cancelled' };
const sum = (rows, k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
const titleCase = (s) => String(s ?? '—').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Overview tab: order volume, pieces, mix and the live pipeline, all straight from /api/admin/reports.
function OverviewCharts({ loading, trends, types, pipeline }) {
  const t = useChartTheme();
  const noTrend = !trends.some((r) => r.orders > 0);
  const placed = sum(trends, 'orders'), done = sum(trends, 'completed');
  const pipeRows = pipeline.map(([k, v]) => ({ stage: STAGE_LABEL[k] ?? titleCase(k), key: k, orders: v.count, pieces: v.total_pieces }));
  return (
    <div className="vc-grid">
      <ChartCard className="vc-wide" title="Orders, last 6 months" subtitle="Placed vs completed, by month placed" loading={loading} height={260}
        empty={noTrend && 'No orders in the last 6 months.'} figure={fmtCount(placed)} figureNote="orders placed"
        legend={<ChartLegend items={[{ key: 'o', label: 'Placed', color: t.series[0] }, { key: 'c', label: 'Completed', value: fmtCount(done), color: t.series[1] }]} />}
        table={{ head: ['Month', 'Placed', 'Completed', 'Pieces'], rows: trends.map((r) => [r.month, fmtCount(r.orders), fmtCount(r.completed), fmtCount(r.pieces)]) }}>
        <TrendChart rows={trends} height={260} series={[{ key: 'orders', name: 'Placed' }, { key: 'completed', name: 'Completed' }]}
          label={`Orders placed per month: ${describeSeries(trends, 'month', 'orders')}. Completed: ${describeSeries(trends, 'month', 'completed')}.`} />
      </ChartCard>
      <ChartCard className="vc-narrow" title="Order mix" subtitle="Orders by type, excluding cancelled" loading={loading} height={220}
        empty={!types.length && 'No orders yet.'}
        table={{ head: ['Type', 'Orders', 'Pieces'], rows: types.map((r) => [titleCase(r.order_type), fmtCount(r.count), fmtCount(r.total_pieces)]) }}>
        <DonutChart items={types.map((r) => ({ key: r.order_type, label: titleCase(r.order_type), value: r.count }))} totalLabel="orders"
          label={`Orders by type: ${types.map((r) => `${titleCase(r.order_type)} ${r.count}`).join(', ')}.`} />
      </ChartCard>
      <ChartCard className="vc-wide" title="Pieces ordered" subtitle="Garment pieces in orders placed each month" loading={loading} height={220}
        empty={!trends.some((r) => r.pieces > 0) && 'No pieces ordered in the last 6 months.'} figure={fmtCount(sum(trends, 'pieces'))} figureNote="pieces in 6 months">
        <BarsChart rows={trends} height={220} series={[{ key: 'pieces', name: 'Pieces', color: t.series[2] }]}
          label={`Pieces ordered per month: ${describeSeries(trends, 'month', 'pieces')}.`} />
      </ChartCard>
      <ChartCard className="vc-narrow" title="Pipeline right now" subtitle="Orders at each status" loading={loading} height={Math.max(160, pipeRows.length * 30)}
        empty={!pipeRows.length && 'No orders yet.'}
        table={{ head: ['Status', 'Orders', 'Pieces'], rows: pipeRows.map((r) => [r.stage, fmtCount(r.orders), fmtCount(r.pieces)]) }}>
        <BarsChart rows={pipeRows} x="stage" layout="horizontal" height={Math.max(160, pipeRows.length * 30)} categoryWidth={92}
          series={[{ key: 'orders', name: 'Orders', cellColors: (r, th) => (r.key === 'cancelled' ? th.status.out : r.key === 'completed' ? th.status.ok : undefined) }]}
          label={`Orders per status: ${pipeRows.map((r) => `${r.stage} ${r.orders}`).join(', ')}.`} />
      </ChartCard>
    </div>
  );
}

// Sales tab: money collected and owed, payment mix and transaction volume from /api/admin/reports/sales.
function SalesCharts({ loading, monthly, totals }) {
  const t = useChartTheme();
  const methods = totals?.by_method ?? [];
  const collected = sum(monthly, 'collected'), owed = sum(monthly, 'outstanding');
  const noMoney = !monthly.some((r) => r.collected > 0 || r.outstanding > 0);
  return (
    <div className="vc-grid">
      <ChartCard className="vc-wide" title="Collected and outstanding" subtitle="By payment month, last 6 months" loading={loading} height={260}
        empty={noMoney && 'No payments recorded in the last 6 months.'} figure={fmtPeso(collected)} figureNote="collected in 6 months"
        legend={<ChartLegend items={[{ key: 'c', label: 'Collected', color: t.series[0] }, { key: 'o', label: 'Outstanding', color: t.series[1], value: fmtPesoShort(owed) }]} />}
        table={{ head: ['Month', 'Collected', 'Outstanding', 'Billed'], rows: monthly.map((r) => [r.month, fmtPeso(r.collected), fmtPeso(r.outstanding), fmtPeso(r.billed)]) }}>
        <TrendChart rows={monthly} height={260} format={fmtPeso} yFormat={fmtPesoShort}
          series={[{ key: 'collected', name: 'Collected' }, { key: 'outstanding', name: 'Outstanding' }]}
          label={`Collected per month: ${describeSeries(monthly, 'month', 'collected', fmtPeso)}. Outstanding: ${describeSeries(monthly, 'month', 'outstanding', fmtPeso)}.`} />
      </ChartCard>
      <ChartCard className="vc-narrow" title="Payment methods" subtitle="Share of amount collected, all time" loading={loading} height={220}
        empty={!methods.some((m) => Number(m.total) > 0) && 'No payments recorded yet.'}
        table={{ head: ['Method', 'Transactions', 'Collected'], rows: methods.map((m) => [titleCase(m.payment_method), fmtCount(m.count), fmtPeso(m.total)]) }}>
        <DonutChart items={methods.map((m) => ({ key: m.payment_method ?? 'none', label: titleCase(m.payment_method), value: m.total }))}
          format={fmtPesoShort} totalLabel="collected"
          label={`Collected by payment method: ${methods.map((m) => `${titleCase(m.payment_method)} ${fmtPeso(m.total)}`).join(', ')}.`} />
      </ChartCard>
      <ChartCard className="vc-wide" title="Transactions per month" subtitle="Payments recorded, by payment month" loading={loading} height={220}
        empty={!monthly.some((r) => r.transaction_count > 0) && 'No transactions in the last 6 months.'}
        figure={fmtCount(sum(monthly, 'transaction_count'))} figureNote="transactions in 6 months">
        <BarsChart rows={monthly} height={220} series={[{ key: 'transaction_count', name: 'Transactions', color: t.series[2] }]}
          label={`Transactions per month: ${describeSeries(monthly, 'month', 'transaction_count')}.`} />
      </ChartCard>
      <ChartCard className="vc-narrow" title="Billing status" subtitle="Everything billed, all time" loading={loading} height={220}
        empty={!(Number(totals?.total_billed) > 0) && 'Nothing billed yet.'}>
        <DonutChart format={fmtPesoShort} totalLabel="billed" totalFormat={() => fmtPesoShort(totals?.total_billed)}
          items={[{ key: 'collected', label: 'Collected', value: totals?.total_collected, color: t.series[0] }, { key: 'outstanding', label: 'Outstanding', value: totals?.total_outstanding, color: t.series[1] }]}
          label={`Billed ${fmtPeso(totals?.total_billed)}: collected ${fmtPeso(totals?.total_collected)}, outstanding ${fmtPeso(totals?.total_outstanding)}.`} />
      </ChartCard>
    </div>
  );
}

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
          <b style={{ color: 'var(--ink)' }}>{affected.length} order{affected.length !== 1 ? 's' : ''} at risk:</b>{' '}
          {affected.slice(0, 5).map((id, i) => <span key={id}>{i ? ', ' : ''}<OrderLink id={id}/></span>)}{affected.length > 5 ? ` and ${affected.length - 5} more` : ''}
        </div>
      )}
    </div>
  );
}

// One phrase per key of the backend run summary (VfrbDailyDigest::SUMMARY_KEYS); each count is new items sent by this run.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const DIGEST_PARTS = {
  low_stock_digest:     n => `low-stock digest sent (${plural(n, 'material')})`,
  rfqs_auto_created:    n => `${plural(n, 'RFQ')} auto-created for review`,
  deadline_reminders:   n => plural(n, 'deadline reminder'),
  overdue_flags:        n => plural(n, 'overdue flag'),
  client_supply_orders: n => `client-materials alert (${plural(n, 'order')})`,
  client_returns_due:   n => `client-return reminder (${plural(n, 'order')})`,
  weekly_count_due:     n => `weekly count reminder (${plural(n, 'material')})`,
};

// Run Now response or error → the banner shown under the header.
function digestResult(res, err) {
  if (err) {
    const status = err.response?.status;
    const body = !err.response ? "Can't reach the server. Check your connection and try again."
      : status === 403 ? "Your account can't run automation."
      : status === 429 ? 'Too many runs in a short time. Wait a minute and try again.'
      : status < 500 && err.response.data?.message ? err.response.data.message
      : 'Something went wrong on the server. Try again; if it keeps failing, check the backend logs.';
    return { tone: 'error', title: 'Automation run failed', body, retry: status !== 403 };
  }
  if (res?.skipped) {
    return { tone: 'info', title: 'Automation is already running',
      body: 'A scheduled run or another manager is running it now. Its alerts go out when it finishes; nothing is sent twice.', retry: true };
  }
  const sent = Object.entries(DIGEST_PARTS).filter(([k]) => res?.summary?.[k] > 0).map(([k, fmt]) => fmt(res.summary[k]));
  if (res?.summary && !sent.length) {
    return { tone: 'info', title: 'Nothing new to send', body: "Today's alerts already went out, or nothing needs attention right now." };
  }
  const list = sent.join(' · ');
  return { tone: 'success', title: 'Automation run complete', body: list ? list.charAt(0).toUpperCase() + list.slice(1) + '.' : null };
}

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [sales, setSales] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [tab, setTab] = useState('overview');
  const [runningDigest, setRunningDigest] = useState(false);
  const [digest, setDigest] = useState(null); // banner from the last Run Now; stays until dismissed or the next run

  const load = useCallback((force = false) => {
    if (!force) {
      const c = cacheGet('admin_reports');
      if (c) { setData(c.data); setSales(c.sales); setFetching(false); return Promise.resolve(); }
    }
    setFetching(true); setLoadErr(false);
    return Promise.allSettled([axios.get('/api/admin/reports'), axios.get('/api/admin/reports/sales')]).then(([r, s]) => {
      if (r.status !== 'fulfilled') { setLoadErr(true); return; }
      const d = r.value.data; const sl = s.status === 'fulfilled' ? s.value.data : null;
      setData(d); setSales(sl);
      cacheSet('admin_reports', { data: d, sales: sl }, TTL.REPORTS);
    }).finally(() => setFetching(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  // Skeletons only before the first payload; refreshes keep the previous charts on screen.
  const loading = fetching && !data;
  const live = useLivePoll(() => load(true), data);

  const runDigest = useCallback(async () => {
    setRunningDigest(true); setDigest(null);
    try {
      const r = await axios.post('/api/admin/automation/run-digest');
      setDigest(digestResult(r.data));
      if (!r.data?.skipped) {
        cacheClear('admin_reports', 'dashboard_stats', 'notifications');
        load(true);
      }
    } catch (e) { setDigest(digestResult(null, e)); }
    finally { setRunningDigest(false); }
  }, [load]);

  const alerts = data?.prescriptive_alerts ?? [];
  const trends = data?.order_trends ?? [];
  const monthly = sales?.monthly_trends ?? [];
  const totals = sales?.totals;
  const inv = data?.inventory_summary;
  const types = data?.order_type_breakdown ?? [];
  const pipeline = Object.entries(data?.pipeline_snapshot ?? {}).filter(([, v]) => v.count > 0);
  const critical = alerts.filter((a) => a.severity === 'critical').length;

  const csvTab = tab === 'alerts' ? 'prescriptive' : tab;
  const exportCsv = () => {
    const rows = buildCSV(data, csvTab, sales);
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
          <button className="adm-btn" onClick={exportCsv} disabled={loading || !buildCSV(data, csvTab, sales)}><NavIcon name="download" size={14} color="currentColor" /> Export CSV</button>
          <button className="adm-btn adm-hide-t" onClick={() => window.print()}><NavIcon name="print" size={14} color="currentColor" /> Print</button>
          <LiveStamp at={live.at} busy={live.busy} onRefresh={live.run} />
          {!isOwner() && <button className="adm-btn primary" onClick={runDigest} disabled={runningDigest} aria-busy={runningDigest}
            title="Send today's automated alerts now: low-stock digest, auto RFQs, deadline and overdue reminders, client-material and weekly count reminders. Safe to repeat: nothing is sent twice.">
            <NavIcon name={runningDigest ? 'loading' : 'ai'} size={14} color="currentColor" /> {runningDigest ? 'Running…' : 'Run automation'}
          </button>}
        </PageHeader>
        {digest && (
          <Banner tone={digest.tone} title={digest.title}>
            {digest.body}
            {/* Under the text, not in the action slot, so the message keeps its width on phones. */}
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {digest.retry && <button className="adm-btn" onClick={runDigest} disabled={runningDigest}>Try again</button>}
              <button className="adm-btn" onClick={() => setDigest(null)} aria-label="Dismiss automation message">Dismiss</button>
            </span>
          </Banner>
        )}
        {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load reports." onRetry={() => load(true)} /></div>}
        <PillTabs value={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === 'overview' && (
        <div className="adm-stack adm-tabpanel" role="tabpanel">
          <StatGrid loading={loading} items={[
            { label: 'Total revenue', value: peso(data?.total_revenue), color: 'var(--success-text)' },
            { label: 'Total orders', value: data?.total_orders ?? 0 },
            { label: 'Completed orders', value: data?.completed_orders ?? 0, color: 'var(--color-teal-ink)' },
            { label: 'Avg order value', value: peso(data?.avg_order_value) },
            ...(inv ? [{ label: 'Low-stock materials', value: `${inv.low} / ${inv.total}`, color: inv.low ? 'var(--warning-text)' : undefined, sub: `Stock value ${peso(inv.total_value)}` }] : []),
          ]} />
          <OverviewCharts loading={loading} trends={trends} types={types} pipeline={pipeline} />
        </div>
      )}

      {tab === 'sales' && (
        <div className="adm-stack adm-tabpanel" role="tabpanel">
          {!loading && !sales && <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={() => load(true)}>Retry</button>}>Sales summary could not be loaded.</Banner>}
          <StatGrid loading={loading} items={[
            { label: 'Collected', value: peso(totals?.total_collected), color: 'var(--success-text)' },
            { label: 'Billed', value: peso(totals?.total_billed) },
            { label: 'Outstanding', value: peso(totals?.total_outstanding), color: totals?.total_outstanding > 0 ? 'var(--warning-text)' : undefined },
            { label: 'Transactions', value: totals?.total_txns ?? 0 },
          ]} />
          <SalesCharts loading={loading} monthly={monthly} totals={totals} />
        </div>
      )}

      {tab === 'alerts' && (
        <div className="adm-stack adm-tabpanel" role="tabpanel">
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
