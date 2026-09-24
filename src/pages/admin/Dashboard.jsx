// src/pages/admin/Dashboard.jsx — mobile-first reshape (Sept 15 2026)
// Reshaped against the canonical Figma admin reference: gradient hero
// with real stat pills, collapsible "Needs Attention" sections, icon-grid
// quick actions, tap feedback everywhere. Data layer moved onto the shared
// useCachedResource hook (stale-while-revalidate — cache shows instantly,
// background refresh keeps it fresh) and an offline mutation queue so
// notification actions survive a dropped connection.
// hex→var(--...) token migration (Sept 20): 50 of 61 literals had an exact
// theme.css match, swapped. Remaining 11 (dark-toast backgrounds, a few
// manager-purple badge shades) have no token equivalent — left literal,
// same documented-exception pattern as QCChecklist.jsx/Suppliers.jsx.
import { useState, useEffect, useCallback } from 'react';
import { useNavigate }                               from 'react-router-dom';
import { motion, AnimatePresence }                   from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line,
} from 'recharts';
import axios from 'axios';
import { TTL }                          from '../../utils/cache';
import { useCachedResource }            from '../../hooks/useCachedResource';
import { NavIcon } from '../../components/ui/icons';
import { navColor } from '../../utils/navColors';

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';
const SK_STYLE = {
  borderRadius: 6,
  background:   'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
  backgroundSize: '400px',
  animation:    'sk 1.4s infinite',
};
const CARD = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)' };
const ROW  = { padding: '9px 14px', borderBottom: '1px solid var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer' };
const STATUS_COLORS = {
  pending: 'var(--status-pending)', confirmed: 'var(--status-confirmed)', pattern: 'var(--status-pattern)',
  cutting: 'var(--status-cutting)', sewing: 'var(--status-sewing)', qc: 'var(--status-qc)',
  pressing: 'var(--status-pressing)', packing: 'var(--status-packing)', completed: 'var(--status-completed)',
  cancelled: 'var(--status-cancelled)', segregation: 'var(--status-segregation)',
};

const ageLabel = (ms) => {
  if (!ms || ms === Infinity) return null;
  if (ms < 10_000) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  return `${Math.round(ms / 60_000)}m ago`;
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type === 'error' ? '#450a0a' : type === 'info' ? '#0c2d48' : '#022c22';
  const bdr = type === 'error' ? 'var(--danger)' : type === 'info' ? '#38bdf8' : 'var(--success)';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      style={{
        position: 'fixed', bottom: 28, right: 24, zIndex: 500,
        padding: '12px 18px', borderRadius: 12,
        background: bg, border: `1px solid ${bdr}`,
        color: '#fff', fontSize: 13, fontWeight: 700,
        maxWidth: 340, boxShadow: '0 8px 28px rgba(0,0,0,.3)',
        display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.4,
      }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {type === 'error' ? '⚠️' : type === 'info' ? '↻' : '✓'}
      </span>
      {msg}
    </motion.div>
  );
}

// ── KPI card — Figma reference: label + value + trend chip + real sparkline.
// Distinct from the operational-stats tiles below; this is the "KPI Overview"
// block, fed by kpi_daily_snapshots (real history, not invented).
function SparkKPICard({ label, value, history, color, live, loading }) {
  const pts = (history ?? []).map((v, i) => ({ i, v }));
  const gradId = `spark-${label.replace(/[^a-z0-9]/gi, '')}`;
  const first = pts[0]?.v, last = pts[pts.length - 1]?.v;
  const hasEnoughHistory = pts.length >= 2 && first;
  const change = hasEnoughHistory ? Math.round(((last - first) / first) * 100) : null;
  const up = change > 0, flat = change === 0;
  const chipBg = change === null ? 'var(--bg-surface)' : flat ? 'var(--bg-surface)' : up ? 'var(--success-bg)' : 'var(--danger-bg)';
  const chipFg = change === null ? 'var(--text-faint)' : flat ? 'var(--text-subtle)' : up ? '#15803d' : '#dc2626';
  return (
    <div style={{ ...CARD, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600 }}>{label}</span>
        {live && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T2, animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: T }}>Live</span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        {loading ? <div style={{ ...SK_STYLE, height: 22, width: '55%' }} /> : <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>{value}</span>}
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: chipBg, color: chipFg, whiteSpace: 'nowrap' }}>
          {change === null ? 'New' : `${flat ? '→' : up ? '↑' : '↓'} ${Math.abs(change)}%`}
        </span>
      </div>
      <div style={{ marginTop: 2, height: 36 }}>
        {hasEnoughHistory ? (
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={pts}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <p style={{ fontSize: 9, color: 'var(--text-disabled)', margin: 0 }}>Building history — check back tomorrow</p>
          </div>
        )}
      </div>
      <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>vs 30 days ago</span>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, path, loading, onClick }) {
  const { fg, bg } = navColor(path);
  return (
    <motion.button
      whileHover={onClick ? { y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      onClick={onClick}
      style={{ ...CARD, textAlign: 'left', padding: '18px 16px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      }}>
        <NavIcon name={icon} size={17} color={fg} />
      </div>
      {loading
        ? <div style={{ ...SK_STYLE, height: 28, width: '55%', marginBottom: 6 }} />
        : <p className="adm-kpi-val" style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>{value}</p>}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '3px 0 0' }}>{sub}</p>}
    </motion.button>
  );
}

// ── Attention section — collapsible, mobile-first (native details/summary,
// styled to match the canonical Figma admin reference). One component
// covers all 5 "needs attention" blocks; only renderItem varies per block.
function AttentionSection({ title, color, items, loading, emptyLabel, renderItem, onFooter, footerLabel }) {
  return (
    <details className="adm-attn" style={{ ...CARD, overflow: 'hidden' }} open>
      <summary className="adm-attn-summary">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          {title}
          {!loading && items.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: color, borderRadius: 99, padding: '2px 8px' }}>
              {items.length}
            </span>
          )}
        </span>
        <span className="adm-attn-chev" style={{ color: 'var(--text-faint)', fontSize: 13 }}>▾</span>
      </summary>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2].map((i) => <div key={i} style={{ ...SK_STYLE, height: 36 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '20px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>{emptyLabel}</p>
          </div>
        ) : items.map(renderItem)}
      </div>
      {!loading && items.length > 0 && (
        <button onClick={onFooter} className="adm-tap"
          style={{ width: '100%', padding: 10, border: 'none', borderTop: '1px solid var(--border)', background: 'transparent', color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          {footerLabel} →
        </button>
      )}
    </details>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const nav  = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
  const isManager = user.role === 'manager';

  const [toast, setToast] = useState(null);

  // ── Data — one hook call per resource instead of a bespoke loader each ──────
  const [data,     loading,   loadDashboard, dataAge] = useCachedResource('dashboard_stats', () => axios.get('/api/admin/dashboard').then((r) => r.data), TTL.DASHBOARD, { onError: () => setToast({ msg: 'Failed to load dashboard data.', type: 'error' }) });
  const [pendingOrdersRaw, poLoading, loadPendingOrders] = useCachedResource('dashboard_pending_orders', () => axios.get('/api/admin/orders?status=pending&per_page=5').then((r) => r.data?.data ?? []), TTL.ORDERS);
  const [rfqsRaw,  rfqLoading, loadRfqs]               = useCachedResource('dashboard_pending_rfqs', () => axios.get('/api/admin/rfq?status=sent&per_page=5').then((r) => r.data?.data ?? []), TTL.SUPPLIERS);
  const [deliveriesRaw, delivLoading, loadDeliveries]  = useCachedResource('dashboard_upcoming_deliveries', () => axios.get('/api/admin/delivery?per_page=20').then((r) => (r.data?.data ?? []).filter((d) => !['delivered', 'returned'].includes(d.delivery_status)).slice(0, 5)), TTL.ORDERS);

  const pendingOrders  = pendingOrdersRaw ?? [];
  const rfqsPending    = rfqsRaw ?? [];
  const deliveries     = deliveriesRaw ?? [];

  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoad] = useState(false);
  const fetchAI = useCallback(async () => {
    if (!isManager) return;
    setAiLoad(true);
    try {
      const { data: res } = await axios.get('/api/admin/ai/analytics-summary');
      setAiText(res?.insight ?? '');
    } catch {
      setToast({ msg: 'AI summary unavailable.', type: 'error' });
    } finally {
      setAiLoad(false);
    }
  }, [isManager]);

  // ── Auto-refresh every TTL.DASHBOARD while the tab is visible ───────────────
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') loadDashboard(); };
    const id = setInterval(tick, TTL.DASHBOARD);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [loadDashboard]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const s = {
    total_orders:        data?.orders?.total          ?? 0,
    active_orders:       data?.orders?.in_production  ?? 0,
    monthly_revenue:     data?.revenue?.month         ?? 0,
    low_stock_count:     data?.inventory?.low_stock_count ?? 0,
    stock_health_pct:    data?.stock_health_pct        ?? 0,
    pending_deliveries:  data?.production?.delivering ?? 0,
    unreconciled_counts: data?.unreconciled_counts    ?? 0,
  };
  const kpiHistory = data?.kpi_history ?? [];
  const monthly = data?.monthly_sales ?? [];
  const recent  = data?.recent_orders ?? [];
  const low     = data?.inventory?.low_stock_materials ?? [];
  const delayed = data?.production?.delayed_orders ?? [];
  const delayedThresholdDays = data?.production?.delayed_threshold_days ?? 3;

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const ageLbl = ageLabel(dataAge);

  const stageDist = data?.production?.stage_dist ?? [];
  const STAGE_ORDER = ['pending', 'confirmed', 'pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing', 'completed'];
  const countByStage = Object.fromEntries(stageDist.map((x) => [x.stage, x.count]));
  const stageData = STAGE_ORDER.filter((x) => (countByStage[x] ?? 0) > 0).map((x) => ({
    stage: x.charAt(0).toUpperCase() + x.slice(1), count: countByStage[x] ?? 0, color: STATUS_COLORS[x] ?? T,
  }));
  const trends = data?.order_trends ?? [];

  const QUICK_ACTIONS = [
    { icon: 'orders',       l: 'View Orders',      path: '/admin/orders' },
    { icon: 'inventory',    l: 'Inventory',         path: '/admin/inventory' },
    { icon: 'production',   l: 'Production',        path: '/admin/production' },
    { icon: 'procurement',  l: 'Purchase Orders',   path: '/admin/procurement' },
    { icon: 'physicalCount',l: 'Physical Count',    path: '/admin/physical-count' },
    ...(isManager ? [
      { icon: 'reports', l: 'Reports & Alerts', path: '/admin/reports' },
      { icon: 'users',   l: 'User Management',  path: '/admin/users' },
    ] : []),
  ];

  const ATTENTION_SECTIONS = [
    {
      title: 'Orders Needing Action', color: T, items: pendingOrders, loading: poLoading,
      emptyLabel: 'No pending orders — all caught up', footerLabel: 'View All Pending Orders',
      onFooter: () => nav('/admin/orders?status=pending'),
      renderItem: (o) => (
        <div key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)} style={ROW}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{o.order_id} · {o.garment_type ?? '—'}</p>
            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0' }}>{o.customer_name ?? '—'}</p>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: 0, flexShrink: 0 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}</p>
        </div>
      ),
    },
    {
      title: 'Materials Running Low', color: 'var(--danger)', items: low, loading,
      emptyLabel: 'No materials below reorder threshold', footerLabel: 'Manage Inventory',
      onFooter: () => nav('/admin/inventory'),
      renderItem: (m) => (
        <div key={m.material_id} onClick={() => nav('/admin/inventory')} style={ROW}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.material_name}</p>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--danger)', margin: 0, flexShrink: 0 }}>{m.quantity_in_stock} {m.unit}</p>
        </div>
      ),
    },
    {
      title: 'Production Delays', color: 'var(--warning)', items: delayed, loading,
      emptyLabel: `No stages stalled ${delayedThresholdDays}+ days`, footerLabel: 'View Production',
      onFooter: () => nav('/admin/production'),
      renderItem: (o) => (
        <div key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)} style={ROW}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Order #{o.order_id} — {o.customer_name}</p>
            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0', textTransform: 'capitalize' }}>{o.stage} · {o.qty_completed}/{o.qty_target} pcs</p>
          </div>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--warning)', margin: 0, flexShrink: 0 }}>{o.days_stalled}d stalled</p>
        </div>
      ),
    },
    {
      title: 'RFQs Awaiting Response', color: T, items: rfqsPending, loading: rfqLoading,
      emptyLabel: 'No RFQs waiting on a supplier', footerLabel: 'View Procurement',
      onFooter: () => nav('/admin/procurement'),
      renderItem: (r) => (
        <div key={r.rfq_id} onClick={() => nav('/admin/procurement')} style={ROW}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.material_name}</p>
            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0' }}>{r.qty_needed} {r.unit}</p>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: 0, flexShrink: 0 }}>{r.needed_by_date ? new Date(r.needed_by_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'No deadline'}</p>
        </div>
      ),
    },
    {
      title: 'Upcoming Deliveries', color: T, items: deliveries, loading: delivLoading,
      emptyLabel: 'No deliveries in progress', footerLabel: 'View Delivery Tracking',
      onFooter: () => nav('/admin/delivery'),
      renderItem: (d) => (
        <div key={d.tracking_id} onClick={() => nav('/admin/delivery')} style={ROW}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.customer_name ?? '—'} · {d.garment_type ?? '—'}</p>
            <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 0', textTransform: 'capitalize' }}>{d.delivery_status?.replace('_', ' ')}</p>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-faint)', margin: 0, flexShrink: 0 }}>{d.estimated_delivery_date ? new Date(d.estimated_delivery_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}</p>
        </div>
      ),
    },
  ];

  const SPARK_KPIS = [
    { key: 'revenue',       label: 'Revenue (Month)', value: `₱${Number(s.monthly_revenue).toLocaleString('en-PH')}`, color: T,        live: true },
    { key: 'orders_total',  label: 'Total Orders',    value: s.total_orders,                                          color: T2,       live: true },
    { key: 'in_production', label: 'In Production',   value: s.active_orders,                                         color: 'var(--purple)', live: false },
    { key: 'stock_health_pct', label: 'Stock Health', value: `${s.stock_health_pct}%`,                                 color: '#d97706', live: true },
  ];

  const KPIS = [
    { icon: 'materials',   label: 'Low Stock',       value: s.low_stock_count, sub: 'Needs reorder', path: '/admin/inventory' },
    { icon: 'delivery',    label: 'In Transit',      value: s.pending_deliveries, sub: 'Dispatched', path: '/admin/delivery' },
    { icon: 'physicalCount', label: 'Pending Count', value: s.unreconciled_counts, sub: 'Physical count', path: '/admin/physical-count' },
  ];


  return (
    <>
      <style>{`
        @keyframes sk { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes countUp { from { opacity:0; transform:translateY(6px) scale(.92);} to { opacity:1; transform:translateY(0) scale(1);} }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }
        * { box-sizing: border-box; }
        .adm-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:22px; }
        @media (max-width:767px) { .adm-kpi-grid { grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; } }
        @media (min-width:2560px) { .adm-kpi-grid { grid-template-columns:repeat(6,1fr); } }
        .adm-attn-list { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
        .adm-attn-summary { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; cursor:pointer; list-style:none; user-select:none; }
        .adm-attn-summary::-webkit-details-marker { display:none; }
        .adm-attn:active .adm-attn-summary, .adm-attn-summary:active { background:var(--bg); }
        .adm-attn[open] .adm-attn-chev { transform:rotate(180deg); display:inline-block; transition:transform .15s; }
        .adm-main-grid { display:grid; grid-template-columns:1fr 320px; gap:18px; align-items:start; }
        @media (max-width:1023px) { .adm-main-grid { grid-template-columns:1fr; } }
        .adm-kpi-val { animation:countUp .45s cubic-bezier(.34,1.56,.64,1) both; }
        .adm-dash-hero { background:linear-gradient(135deg,var(--teal-dark),var(--teal),var(--teal-2)); border-radius:16px; padding:22px 26px; margin-bottom:16px; box-shadow:0 6px 24px rgba(2,128,144,.25); position:relative; overflow:hidden; }
        @media (max-width:767px) { .adm-dash-hero { padding:16px 18px; border-radius:12px; } }
        .adm-hero-stats { margin-top:16px; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .adm-hero-stat { background:rgba(255,255,255,.15); border-radius:12px; padding:10px; text-align:center; backdrop-filter:blur(4px); }
        .adm-quick-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
        .adm-spark-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-bottom:22px; }
        @media (min-width:1024px) { .adm-spark-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
        .adm-tap:active { transform:scale(.96); }
        .adm-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      `}</style>

      {/* ── Hero ── */}
      <div className="adm-dash-hero">
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, position: 'relative' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginBottom: 3 }}>{greet}, {user.name?.split(' ')[0] ?? 'Admin'} 👋</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{isManager ? 'Manager Dashboard' : 'Staff Dashboard'}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: 0 }}>
                VFRB Enterprise · {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {ageLbl && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.7)' }} title="Auto-refreshes while this tab is active">
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T2, animation: 'pulse 2s ease-in-out infinite' }} />
                  Updated {ageLbl}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => nav('/admin/orders')} className="adm-tap"
              style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              View Orders →
            </motion.button>

            {isManager && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={fetchAI} disabled={aiLoading} className="adm-tap"
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.15)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {aiLoading ? '⏳ Analyzing…' : '🤖 AI Summary'}
              </motion.button>
            )}

            <motion.button whileTap={{ scale: 0.9 }} onClick={() => loadDashboard(true)} disabled={loading} title="Force refresh" className="adm-tap"
              style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.75)', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex' }}>
              <NavIcon name="refresh" size={14} color="rgba(255,255,255,.75)" />
            </motion.button>
          </div>
        </div>

        {/* Real-data stat pills — mirrors the canonical mobile reference's 3-stat row */}
        <div className="adm-hero-stats">
          {[{ label: 'Active Orders', value: s.total_orders }, { label: 'In Production', value: s.active_orders }, { label: 'Low Stock', value: s.low_stock_count }].map((stat) => (
            <div key={stat.label} className="adm-hero-stat">
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{loading ? '—' : stat.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 12px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>KPI Overview</h2>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T2, animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T }}>Live</span>
        </span>
      </div>
      <div className="adm-spark-grid">
        {SPARK_KPIS.map((k) => <SparkKPICard key={k.key} label={k.label} value={k.value} color={k.color} live={k.live} loading={loading} history={kpiHistory.map((h) => h[k.key])} />)}
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', margin: '0 0 12px' }}>Needs Your Attention</h2>
      <div className="adm-attn-list">
        {ATTENTION_SECTIONS.map((sec) => <AttentionSection key={sec.title} {...sec} />)}
      </div>

      {isManager && (aiText || aiLoading) && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderLeft: '4px solid var(--purple)', borderRadius: 14, padding: '16px 20px', marginBottom: 22, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,var(--purple),var(--status-segregation))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 8px rgba(124,58,237,.25)' }}>✦</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--purple)', margin: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>Gemini AI Insight</p>
              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 99, background: 'rgba(124,58,237,.1)', color: 'var(--purple)', fontWeight: 700, border: '1px solid rgba(124,58,237,.2)' }}>Manager Only</span>
            </div>
            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[72, 88, 55].map((w, i) => <div key={i} style={{ ...SK_STYLE, height: 10, width: `${w}%`, background: 'linear-gradient(90deg,var(--purple-100) 25%,#ddd6fe 50%,var(--purple-100) 75%)' }} />)}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#4c1d95', lineHeight: 1.85, margin: 0, fontStyle: 'italic' }}>"{aiText}"</p>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {toast && <Toast key="toast" msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
}
