import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TTL } from '../../utils/cache';
import { fetchResource } from '../../utils/adminResources';
import { useCachedResource } from '../../hooks/useCachedResource';
import { NavIcon } from '../../components/ui/icons';
import { isAdmin, isOwner, ownerCanOpen } from '../../utils/jobAccess';
import { PageHeader, AttentionStrip, Card, DataTable, EmptyState, Meter, StatusChip } from '../../components/ui';
import { StatGrid, ErrorBlock, useLivePoll, LiveStamp } from '../../components/admin/AdminUI';

const STAGES = [
  ['pattern', 'Pattern', 'pattern'], ['segregation', 'Segregation', 'segregation'], ['cutting', 'Cutting', 'cutting'],
  ['sewing', 'Sewing', 'garmentType'], ['qc', 'QC', 'qc'], ['pressing', 'Pressing', 'pressing'], ['packing', 'Packing', 'package'],
];
const STAGE_LABEL = Object.fromEntries(STAGES.map(([k, l]) => [k, l]));
const localDay = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—');
const peso = (n) => `₱${Number(n).toLocaleString('en-PH')}`;
const OUTPUT_PAGE = 500;

// Small alert list: a card holding a dense table, or an empty line when nothing is waiting.
// head: column labels; num: labels of right-aligned numeric columns.
function AlertList({ title, count, more, loading, failed, empty, head, num = [], children, isEmpty }) {
  return (
    <Card padding="none" title={<>{title} <span className="adm-chip">{loading ? '…' : count}</span></>} action={more}>
      <DataTable label={title} dense loading={loading} rows={3} isEmpty={failed || isEmpty}
        empty={<EmptyState compact>{failed ? "Couldn't load this list." : empty}</EmptyState>}>
        <thead><tr>{head.map((h) => <th key={h} className={num.includes(h) ? 'num' : undefined}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </DataTable>
    </Card>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
  const isManager = isAdmin(user) || isOwner(user); // both may read revenue
  // The read-only Owner gets plain tiles where a link would land on Access denied.
  const go = (path) => (!isOwner(user) || ownerCanOpen(path) ? () => nav(path) : undefined);
  const day = localDay();

  const [data, dataLoading, loadDashboard] = useCachedResource('dashboard_stats', () => fetchResource('dashboard'), TTL.DASHBOARD);
  const [pendingRaw, pFetching, loadPending] = useCachedResource('dashboard_pending_orders', () => axios.get('/api/admin/orders?status=pending&per_page=5').then((r) => r.data?.data ?? []), TTL.ORDERS);
  const [outRaw, outFetching, loadOut] = useCachedResource(`dashboard_output_${day}`, () => axios.get('/api/admin/output-logs', { params: { date: day, per_page: OUTPUT_PAGE } }).then((r) => ({ rows: r.data?.data ?? [], total: r.data?.total ?? 0 })), TTL.ORDERS);

  // Skeletons only before the first payload; refreshes keep the previous data on screen.
  const loading = dataLoading && !data;
  const pLoading = pFetching && !pendingRaw;
  const outLoading = outFetching && !outRaw;
  const live = useLivePoll(() => Promise.all([loadDashboard(), loadPending(), loadOut()]), data);

  const o = data?.orders ?? {};
  const prod = data?.production ?? {};
  const low = data?.inventory?.low_stock_materials ?? [];
  const lowCount = data?.inventory?.low_stock_count ?? 0;
  const delayed = prod.delayed_orders ?? [];
  const delayDays = prod.delayed_threshold_days ?? 3;
  const outputToday = prod.output_today ?? 0;

  const stageCount = useMemo(() => Object.fromEntries((prod.stage_dist ?? []).map((x) => [x.stage, Number(x.count) || 0])), [prod.stage_dist]);
  const outByStage = useMemo(() => (outRaw?.rows ?? []).reduce((a, l) => ({ ...a, [l.stage]: (a[l.stage] ?? 0) + (Number(l.total_output) || 0) }), {}), [outRaw]);
  const outMax = Math.max(1, ...Object.values(outByStage));
  const outPartial = outRaw && outRaw.total > outRaw.rows.length;

  const attention = [
    { key: 'review', label: 'orders awaiting review', count: o.pending ?? 0, to: '/admin/orders?status=pending' },
    { key: 'low', label: 'materials at or below reorder', count: lowCount, to: '/admin/inventory?filter=reorder' },
    { key: 'late', label: `stages stalled ${delayDays}+ days`, count: prod.delayed_count ?? 0, onClick: () => document.getElementById('dash-late')?.focus() },
  ];
  const kpis = [
    { label: 'In production', value: o.in_production ?? 0, sub: `${o.confirmed ?? 0} confirmed, not started`, onClick: go('/admin/production') },
    { label: 'QC hold', value: prod.qc_blocked ?? 0, color: prod.qc_blocked ? 'var(--danger-text)' : undefined, onClick: go('/admin/qc') },
    { label: 'Awaiting delivery', value: prod.delivering ?? 0, onClick: go('/admin/delivery') },
    { label: 'Counts to reconcile', value: data?.unreconciled_counts ?? 0, onClick: go('/admin/physical-count') },
    isManager && { label: 'Revenue (month)', value: peso(data?.revenue?.month ?? 0) },
  ].filter(Boolean);

  const openOrder = (id) => nav(`/admin/orders/${id}`);
  const rowKeys = (fn) => ({ tabIndex: 0, onClick: fn, onKeyDown: (e) => { if (e.key === 'Enter') fn(); } });

  return (
    <>
      <style>{`
        .dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start;margin-bottom:16px}
        .dash-board .adm-pipe-step small{font-size:12px;font-weight:600;color:var(--text-faint);letter-spacing:0;text-transform:none}
        .dash-board .adm-pipe-step.on small{color:var(--on-teal)}
        .dash-board .adm-pipe-step[aria-disabled]{cursor:default}
        .dash-out{display:grid;grid-template-columns:84px minmax(0,1fr) 52px;align-items:center;gap:10px;font-size:13px;padding:5px 0}
        .dash-out b{text-align:right;font-variant-numeric:tabular-nums}
      `}</style>

      <PageHeader title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        actions={<>
          <LiveStamp at={live.at} busy={live.busy} onRefresh={live.run} />
          <Link className="adm-btn primary" to="/admin/orders">Orders <NavIcon name="chevronRight" size={14} color="currentColor" /></Link>
        </>} />

      {!loading && !data && <div style={{ marginBottom: 16 }}><ErrorBlock msg="Dashboard data is unavailable." onRetry={live.run} /></div>}

      {!loading && data && <AttentionStrip items={attention} clearTitle="Nothing waiting" clearNote="No orders to review, no low stock, no stalled stages." />}

      <Card title="Production floor" subtitle="Orders at each stage · pieces logged today" padding="sm" className="dash-board" style={{ margin: '16px 0' }}>
        <div className="adm-pipe" aria-label="Orders per production stage">
          {STAGES.map(([k, label, icon], i) => {
            const body = <>
              <NavIcon name={icon} size={16} color="currentColor" />
              <b>{loading ? '–' : stageCount[k] ?? 0}</b>
              <span>{label}</span>
              <small>{outLoading ? '…' : `+${outByStage[k] ?? 0} pcs`}</small>
            </>;
            const cls = `adm-pipe-step${stageCount[k] ? '' : ' empty'}`;
            if (!go('/admin/production')) return <div key={k} className={cls} style={{ '--i': i, cursor: 'default', transform: 'none' }} aria-label={`${label}: ${stageCount[k] ?? 0} orders, ${outByStage[k] ?? 0} pieces today`}>{body}</div>;
            return <Link key={k} to={`/admin/production?stage=${k}`} className={cls} style={{ '--i': i, textDecoration: 'none' }} aria-label={`${label}: ${stageCount[k] ?? 0} orders, ${outByStage[k] ?? 0} pieces today`}>{body}</Link>;
          })}
        </div>
      </Card>

      <StatGrid items={kpis} loading={loading} />

      <div className="dash-grid">
        <Card title="Today's output" subtitle={`${outputToday.toLocaleString()} pieces logged`}
          action={go('/admin/output-log') ? <Link className="adm-link-btn" to="/admin/output-log">Output log →</Link> : null}>
          {outLoading ? <div className="adm-sk" style={{ height: 150 }} />
            : !outRaw ? <EmptyState compact>Per-stage breakdown unavailable. Total: {outputToday} pcs.</EmptyState>
            : outRaw.rows.length === 0 ? <EmptyState compact>Nothing logged yet today.</EmptyState>
            : <>
              {STAGES.map(([k, label]) => (
                <div key={k} className="dash-out">
                  <span>{label}</span>
                  <Meter pct={((outByStage[k] ?? 0) / outMax) * 100} label={`${label} output today`} />
                  <b>{outByStage[k] ?? 0}</b>
                </div>
              ))}
              {outPartial && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>Bars cover the latest {outRaw.rows.length} of {outRaw.total} entries.</p>}
            </>}
        </Card>

        <AlertList title="Awaiting review" count={o.pending ?? 0} loading={pLoading} failed={pendingRaw == null} isEmpty={!pendingRaw?.length}
          empty="No pending orders." head={['Order', 'Customer', 'Pcs', 'Placed']} num={['Pcs']}
          more={(o.pending ?? 0) > 0 ? <Link className="adm-link-btn" to="/admin/orders?status=pending">View all →</Link> : null}>
          {(pendingRaw ?? []).map((x) => (
            <tr key={x.order_id} {...rowKeys(() => openOrder(x.order_id))}>
              <td style={{ fontWeight: 800, color: 'var(--teal)' }}>#{x.order_id}</td>
              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.customer_name ?? '—'}</td>
              <td className="num">{x.quantity_ordered ?? 0}</td>
              <td style={{ color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{fmtDate(x.created_at)}</td>
            </tr>
          ))}
        </AlertList>

        <AlertList title="Low stock" count={lowCount} loading={loading} failed={!data} isEmpty={!low.length}
          empty="No materials at or below reorder." head={['Material', 'On hand', 'vs reorder']} num={['On hand']}
          more={lowCount > 0 ? <Link className="adm-link-btn" to="/admin/inventory?filter=reorder">Inventory →</Link> : null}>
          {low.map((m) => {
            const reorder = Number(m.reorder_threshold) || 0;
            const qty = Number(m.quantity_in_stock) || 0;
            return (
              <tr key={m.material_id} {...rowKeys(() => nav('/admin/inventory?filter=reorder'))}>
                <td style={{ fontWeight: 700 }}>{m.material_name}</td>
                <td className="num" style={{ color: 'var(--danger-text)', fontWeight: 700 }}>{qty} {m.unit}</td>
                <td style={{ minWidth: 90 }}><Meter pct={reorder > 0 ? (qty / reorder) * 100 : 0} tone="low" label={`${m.material_name}: ${qty} of ${reorder} ${m.unit} reorder point`} /></td>
              </tr>
            );
          })}
        </AlertList>

        <div id="dash-late" tabIndex={-1} style={{ outline: 'none' }}>
          <AlertList title={`Stalled ${delayDays}+ days`} count={prod.delayed_count ?? 0} loading={loading} failed={!data} isEmpty={!delayed.length}
            empty={`No stage has gone ${delayDays}+ days without output.`} head={['Order', 'Stage', 'Done', 'Idle']} num={['Done', 'Idle']}>
            {delayed.map((x) => (
              <tr key={x.order_id} {...rowKeys(go(`/admin/production/${x.order_id}`) ?? (() => openOrder(x.order_id)))}>
                <td><span style={{ fontWeight: 800, color: 'var(--teal)' }}>#{x.order_id}</span> <span style={{ color: 'var(--text-subtle)' }}>{x.customer_name}</span></td>
                <td><StatusChip status={x.stage} label={STAGE_LABEL[x.stage] ?? x.stage} size={12} /></td>
                <td className="num">{x.qty_completed}/{x.qty_target}</td>
                <td className="num" style={{ color: 'var(--warning-text)', fontWeight: 700 }}>{x.days_stalled}d</td>
              </tr>
            ))}
          </AlertList>
        </div>
      </div>
    </>
  );
}
