// Admin/Manager dashboard — composed to wireframe boards 1–4: KPI row, Orders Overview chart,
// Production Status donut, Recent Orders table, Quick Actions. All figures come from /api/admin/dashboard.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import { TTL } from '../../utils/cache';
import { useCachedResource } from '../../hooks/useCachedResource';
import { NavIcon } from '../../components/ui/icons';
import { navColor } from '../../utils/navColors';
import { PageHeader, StatGrid, PillTabs, Panel, StatusPill, SkeletonRows, EmptyBlock, ErrorBlock } from '../../components/admin/AdminUI';

const T = 'var(--teal)', T2 = 'var(--teal-2)';
const STAGE_ORDER = ['pending', 'confirmed', 'pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing', 'completed'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDate = (d, o = { month: 'short', day: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-PH', o) : '—');
const peso = (n) => `₱${Number(n).toLocaleString('en-PH')}`;
const ageLabel = (ms) => (!ms || ms === Infinity ? null : ms < 10_000 ? 'just now' : ms < 60_000 ? `${Math.round(ms / 1000)}s ago` : `${Math.round(ms / 60_000)}m ago`);

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2 }}
      role="status" style={{ position: 'fixed', bottom: 28, right: 24, zIndex: 500, padding: '12px 18px', borderRadius: 12, background: type === 'error' ? '#450a0a' : '#022c22', border: `1px solid ${type === 'error' ? 'var(--danger)' : 'var(--success)'}`, color: '#fff', fontSize: 13, fontWeight: 700, maxWidth: 340, boxShadow: '0 8px 28px rgba(0,0,0,.3)' }}>
      {msg}
    </motion.div>
  );
}

const ListRow = ({ title, sub, right, rightColor, onClick }) => (
  <div onClick={onClick} className="adm-dash-row">
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0', textTransform: 'capitalize' }}>{sub}</p>}
    </div>
    <p style={{ fontSize: 11, fontWeight: 700, color: rightColor ?? 'var(--text-faint)', margin: 0, flexShrink: 0 }}>{right}</p>
  </div>
);

function AttentionPanel({ title, color, items, loading, empty, render, footer, onFooter }) {
  return (
    <Panel flush title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{title}{!loading && items.length > 0 && <span className="adm-chip" style={{ background: color, color: '#fff' }}>{items.length}</span>}</span>}
      action={!loading && items.length > 0 && <button className="adm-link-btn" onClick={onFooter}>{footer} →</button>}>
      {loading ? <SkeletonRows rows={2} h={32} /> : items.length === 0 ? <EmptyBlock>{empty}</EmptyBlock> : items.map(render)}
    </Panel>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
  const isManager = user.role === 'manager';
  const [toast, setToast] = useState(null);
  const [chartTab, setChartTab] = useState('orders');

  const [data, loading, loadDashboard, dataAge] = useCachedResource('dashboard_stats', () => axios.get('/api/admin/dashboard').then((r) => r.data), TTL.DASHBOARD, { onError: () => setToast({ msg: 'Failed to load dashboard data.', type: 'error' }) });
  const [pendingRaw, poLoading] = useCachedResource('dashboard_pending_orders', () => axios.get('/api/admin/orders?status=pending&per_page=5').then((r) => r.data?.data ?? []), TTL.ORDERS);
  const [rfqRaw, rfqLoading] = useCachedResource('dashboard_pending_rfqs', () => axios.get('/api/admin/rfq?status=sent&per_page=5').then((r) => r.data?.data ?? []), TTL.SUPPLIERS);
  const [delivRaw, delivLoading] = useCachedResource('dashboard_upcoming_deliveries', () => axios.get('/api/admin/delivery?per_page=20').then((r) => (r.data?.data ?? []).filter((d) => !['delivered', 'returned'].includes(d.delivery_status)).slice(0, 5)), TTL.ORDERS);

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoad] = useState(false);
  const fetchAI = useCallback(async () => {
    if (!isManager) return;
    setAiLoad(true);
    try { setAiText((await axios.get('/api/admin/ai/analytics-summary')).data?.insight ?? ''); }
    catch { setToast({ msg: 'AI summary unavailable.', type: 'error' }); }
    finally { setAiLoad(false); }
  }, [isManager]);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') loadDashboard(); };
    const id = setInterval(tick, TTL.DASHBOARD);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [loadDashboard]);

  const o = data?.orders ?? {};
  const low = data?.inventory?.low_stock_materials ?? [];
  const delayed = data?.production?.delayed_orders ?? [];
  const delayDays = data?.production?.delayed_threshold_days ?? 3;
  const recent = data?.recent_orders ?? [];
  const stageDist = data?.production?.stage_dist ?? [];
  const stageTotal = stageDist.reduce((a, x) => a + Number(x.count), 0);
  const stageData = [...stageDist].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)).map((x) => ({ name: cap(x.stage), value: Number(x.count), color: `var(--status-${x.stage})` }));
  const chartData = chartTab === 'orders' ? (data?.order_trends ?? []).map((r) => ({ m: r.month, v: r.orders })) : (data?.monthly_sales ?? []).map((r) => ({ m: r.month, v: r.total }));
  const mix = Object.entries(recent.reduce((a, r) => ({ ...a, [r.garment_type ?? 'Other']: (a[r.garment_type ?? 'Other'] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const age = ageLabel(dataAge);

  const kpis = [
    { label: 'Total Orders', value: o.total ?? 0, chip: o.new_this_week != null ? `+${o.new_this_week} this week` : null, chipTone: 'up', onClick: () => nav('/admin/orders') },
    { label: 'In Production', value: o.in_production ?? 0, sub: `${o.confirmed ?? 0} confirmed · ${o.pending ?? 0} pending`, onClick: () => nav('/admin/production') },
    { label: 'Completed', value: o.completed ?? 0, onClick: () => nav('/admin/orders') },
    { label: 'Low Stock', value: data?.inventory?.low_stock_count ?? 0, chip: (data?.inventory?.low_stock_count ?? 0) > 0 ? 'Reorder' : null, chipTone: 'down', color: (data?.inventory?.low_stock_count ?? 0) > 0 ? 'var(--danger)' : undefined, onClick: () => nav('/admin/inventory') },
  ];
  const snapshot = [
    { label: 'Revenue (Month)', value: peso(data?.revenue?.month ?? 0) },
    { label: 'Stock Health', value: `${data?.stock_health_pct ?? 0}%` },
    { label: 'In Transit', value: data?.production?.delivering ?? 0, onClick: () => nav('/admin/delivery') },
    { label: 'Pending Count', value: data?.unreconciled_counts ?? 0, sub: 'Physical count', onClick: () => nav('/admin/physical-count') },
  ];
  const quick = [
    { icon: 'orders', l: 'View Orders', path: '/admin/orders' }, { icon: 'inventory', l: 'Inventory', path: '/admin/inventory' },
    { icon: 'production', l: 'Production', path: '/admin/production' }, { icon: 'procurement', l: 'Purchase Orders', path: '/admin/procurement' },
    { icon: 'physicalCount', l: 'Physical Count', path: '/admin/physical-count' },
    ...(isManager ? [{ icon: 'reports', l: 'Reports', path: '/admin/reports' }, { icon: 'users', l: 'Users', path: '/admin/users' }] : []),
  ];

  const attention = [
    { title: 'Orders Needing Action', color: T, items: pendingRaw ?? [], loading: poLoading, empty: 'No pending orders — all caught up', footer: 'All pending', onFooter: () => nav('/admin/orders?status=pending'),
      render: (x) => <ListRow key={x.order_id} onClick={() => nav(`/admin/orders/${x.order_id}`)} title={`#${x.order_id} · ${x.garment_type ?? '—'}`} sub={x.customer_name} right={fmtDate(x.created_at)} /> },
    { title: 'Materials Running Low', color: 'var(--danger)', items: low, loading, empty: 'No materials below reorder threshold', footer: 'Inventory', onFooter: () => nav('/admin/inventory'),
      render: (m) => <ListRow key={m.material_id} onClick={() => nav('/admin/inventory')} title={m.material_name} right={`${m.quantity_in_stock} ${m.unit}`} rightColor="var(--danger)" /> },
    { title: 'Production Delays', color: 'var(--warning)', items: delayed, loading, empty: `No stages stalled ${delayDays}+ days`, footer: 'Production', onFooter: () => nav('/admin/production'),
      render: (x) => <ListRow key={x.order_id} onClick={() => nav(`/admin/orders/${x.order_id}`)} title={`Order #${x.order_id} — ${x.customer_name}`} sub={`${x.stage} · ${x.qty_completed}/${x.qty_target} pcs`} right={`${x.days_stalled}d stalled`} rightColor="var(--warning)" /> },
    { title: 'RFQs Awaiting Response', color: T, items: rfqRaw ?? [], loading: rfqLoading, empty: 'No RFQs waiting on a supplier', footer: 'Procurement', onFooter: () => nav('/admin/procurement'),
      render: (r) => <ListRow key={r.rfq_id} onClick={() => nav('/admin/procurement')} title={r.material_name} sub={`${r.qty_needed} ${r.unit}`} right={r.needed_by_date ? fmtDate(r.needed_by_date) : 'No deadline'} /> },
    { title: 'Upcoming Deliveries', color: T, items: delivRaw ?? [], loading: delivLoading, empty: 'No deliveries in progress', footer: 'Delivery', onFooter: () => nav('/admin/delivery'),
      render: (d) => <ListRow key={d.tracking_id} onClick={() => nav('/admin/delivery')} title={`${d.customer_name ?? '—'} · ${d.garment_type ?? '—'}`} sub={d.delivery_status?.replace('_', ' ')} right={fmtDate(d.estimated_delivery_date)} /> },
  ];

  return (
    <>
      <style>{`
        @keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .adm-dash-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start;margin-bottom:16px}
        .adm-dash-col{display:flex;flex-direction:column;gap:16px;min-width:0}
        .adm-dash-row{padding:10px 18px;border-bottom:1px solid var(--bg-surface);display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;transition:background .12s}
        .adm-dash-row:hover{background:var(--bg)}.adm-dash-row:last-child{border-bottom:none}
        .adm-attn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
        .adm-quick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .adm-quick button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;min-height:76px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);font-size:11px;font-weight:700;color:var(--ink);cursor:pointer;transition:transform .12s,box-shadow .15s}
        .adm-quick button:hover{box-shadow:var(--shadow-md);transform:translateY(-2px)}.adm-quick button:active{transform:scale(.96)}
        .adm-recent-cards{display:none}
        @media(max-width:1023px){.adm-dash-grid{grid-template-columns:1fr}}
        @media(max-width:767px){.adm-recent-table{display:none}.adm-recent-cards{display:block}.adm-attn-grid{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){.adm-quick button{transition:none}}
      `}</style>

      <PageHeader title={isManager ? 'Manager Dashboard' : 'Staff Dashboard'}
        sub={`${greet}, ${user.name?.split(' ')[0] ?? 'Admin'} · ${new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${age ? ` · Updated ${age}` : ''}`}>
        <button className="adm-btn" onClick={() => loadDashboard(true)} disabled={loading} aria-label="Refresh"><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
        {isManager && <button className="adm-btn" onClick={fetchAI} disabled={aiLoading}>{aiLoading ? 'Analyzing…' : 'AI Summary'}</button>}
        <button className="adm-btn primary" onClick={() => nav('/admin/orders')}>View Orders →</button>
      </PageHeader>

      {!loading && !data && <div style={{ marginBottom: 16 }}><ErrorBlock msg="Dashboard data is unavailable." onRetry={() => loadDashboard(true)} /></div>}

      <StatGrid items={kpis} loading={loading} />

      <div className="adm-dash-grid">
        <div className="adm-dash-col">
          <Panel title="Orders Overview" action={<PillTabs tabs={[{ key: 'orders', label: 'Orders' }, { key: 'revenue', label: 'Revenue' }]} value={chartTab} onChange={setChartTab} />} style={{ overflow: 'visible' }}>
            {loading ? <div className="adm-sk" style={{ height: 220 }} /> : chartData.length < 2 ? <EmptyBlock>Not enough history yet to draw a trend.</EmptyBlock> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ left: -12, right: 6, top: 6 }}>
                  <defs><linearGradient id="admTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#028090" stopOpacity={0.28} /><stop offset="100%" stopColor="#028090" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (chartTab === 'revenue' && v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v) => (chartTab === 'revenue' ? peso(v) : v)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="v" stroke="#028090" strokeWidth={2.5} fill="url(#admTrend)" dot={{ r: 3, fill: '#028090' }} isAnimationActive={!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel flush title="Recent Orders" action={<button className="adm-link-btn" onClick={() => nav('/admin/orders')}>View all →</button>}>
            {loading ? <SkeletonRows /> : recent.length === 0 ? <EmptyBlock>No orders yet.</EmptyBlock> : (
              <>
                <div className="adm-recent-table" style={{ overflowX: 'auto' }}>
                  <table className="adm-table">
                    <thead><tr>{['Order', 'Customer', 'Garment', 'Qty', 'Status', 'Date'].map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>{recent.map((r) => (
                      <tr key={r.order_id} onClick={() => nav(`/admin/orders/${r.order_id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 700 }}>#{r.order_id}</td>
                        <td>{r.organization_name || r.customer_name}</td>
                        <td>{r.garment_type ?? '—'}</td>
                        <td>{r.quantity_ordered ?? '—'}</td>
                        <td><StatusPill status={r.status} /></td>
                        <td style={{ color: 'var(--text-subtle)' }}>{fmtDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
                <div className="adm-recent-cards">{recent.map((r) => (
                  <ListRow key={r.order_id} onClick={() => nav(`/admin/orders/${r.order_id}`)} title={`#${r.order_id} · ${r.garment_type ?? '—'}`} sub={r.organization_name || r.customer_name} right={<StatusPill status={r.status} />} />))}
                </div>
              </>
            )}
          </Panel>
        </div>

        <div className="adm-dash-col">
          <Panel title="Production Status">
            {loading ? <div className="adm-sk" style={{ height: 180 }} /> : stageTotal === 0 ? <EmptyBlock>No orders in production stages.</EmptyBlock> : (
              <>
                <div style={{ position: 'relative', height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={stageData} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none" isAnimationActive={!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}>
                      {stageData.map((s) => <Cell key={s.name} fill={s.color} />)}</Pie></PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{stageTotal}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>in production</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 10 }}>
                  {stageData.map((s) => <span key={s.name} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.name} <b style={{ marginLeft: 'auto', color: 'var(--ink)' }}>{s.value}</b></span>)}
                </div>
                {(data?.production?.delayed_count ?? 0) > 0 && <p style={{ fontSize: 11, color: 'var(--warning-text)', margin: '12px 0 0' }}>{data.production.delayed_count} stalled {delayDays}+ days</p>}
              </>
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="adm-quick">{quick.map((q) => { const { fg, bg } = navColor(q.path); return (
              <button key={q.path} onClick={() => nav(q.path)}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><NavIcon name={q.icon} size={17} color={fg} /></span>{q.l}
              </button>); })}</div>
          </Panel>

          <Panel title="Recent Order Mix" action={<span className="adm-chip">last {recent.length}</span>}>
            {loading ? <div className="adm-sk" style={{ height: 90 }} /> : mix.length === 0 ? <EmptyBlock>No orders yet.</EmptyBlock> : mix.map(([name, n]) => (
              <div key={name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span style={{ color: 'var(--ink)', fontWeight: 600 }}>{name}</span><span style={{ color: 'var(--text-subtle)' }}>{Math.round((n / recent.length) * 100)}%</span></div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-surface)' }}><div style={{ height: '100%', width: `${(n / recent.length) * 100}%`, borderRadius: 99, background: `linear-gradient(90deg,${T},${T2})`, transition: 'width .3s' }} /></div>
              </div>))}
          </Panel>
        </div>
      </div>

      <h2 className="adm-panel-title" style={{ margin: '4px 0 12px' }}>Needs Your Attention</h2>
      <div className="adm-attn-grid" style={{ marginBottom: 16 }}>{attention.map((a) => <AttentionPanel key={a.title} {...a} />)}</div>

      <StatGrid items={snapshot} loading={loading} />

      {isManager && (aiText || aiLoading) && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          style={{ background: 'var(--purple-50)', border: '1px solid var(--purple-100)', borderLeft: '4px solid var(--purple)', borderRadius: 14, padding: '16px 20px', marginBottom: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--purple)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.08em' }}>Gemini AI Insight · Manager only</p>
          {aiLoading ? <SkeletonRows rows={3} h={10} /> : <p style={{ fontSize: 13, color: '#4c1d95', lineHeight: 1.8, margin: 0 }}>{aiText}</p>}
        </motion.div>
      )}
      <AnimatePresence>{toast && <Toast key="toast" msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}</AnimatePresence>
    </>
  );
}
