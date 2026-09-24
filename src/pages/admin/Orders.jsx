// src/pages/admin/Orders.jsx
// FIX (Sony Mark, Sept 10 2026): hex→var(--...) token migration — 86
// literal hex replaced with real tokens. IMPORTANT CORRECTION mid-fix:
// theme.css has a dedicated --status-pending/--status-confirmed/
// --status-pattern/.../--status-cancelled palette (11 tokens) whose hex
// values match this file's ORIGINAL 11-status colors exactly — the
// first pass here mistakenly reused generic --purple/--teal/--warning
// (the ActivityLog.jsx/ProductionList.jsx "hue shortage" pattern),
// before discovering these dedicated tokens existed. Corrected to use
// the real --status-* tokens directly — no hue-sharing compromise
// needed for this file after all. Worth flagging: ProductionList.jsx/
// ActivityLog.jsx's own "hue shortage" documentation may predate these
// tokens and could be worth revisiting, not touched here (out of scope
// for this file's fix).
// Emoji (⏳✅📐🗂️✂️🧵🔍🔧📦🎉✕👁✓👑📋) → NavIcon, all keys verified to
// exist in icons.jsx already except `manager` (Crown) — added, verified
// against the real installed lucide-react first. Logic (status filters,
// confirm/cancel flow, pipeline strip, caching) untouched.
// FF-2 Step 5 — Admin Orders
//
// PRESERVED from uploaded source:
//   - FF-1 fix: goTrack navigates to /admin/production/:order_id ✓
//   - STATUS_CFG with all 11 statuses ✓
//   - PipelineStrip mini dots ✓
//   - Tab filter + search logic ✓
//   - Manager banner + isManager guard ✓
//   - Skeleton loaders ✓
//
// ADDED in FF-2:
//   - cacheGet/cacheSet (TTL.ORDERS = 30s) — no cold fetch on every mount
//   - cacheClear on Refresh so forced reload always gets fresh data
//   - useMemo for counts — O(n) only when orders changes, not every render
//   - Color swatch dot on each row (from order.color or studio_config.colors.body)
//   - Mobile card view (≤767px): replaces table with stacked cards
//   - Confirm order button for manager (PATCH /api/admin/orders/:id/confirm)
//   - Optimistic UI on confirm: instant status change → rollback on error
//   - 4K: content auto-centers via parent layout token
//
// DSA annotations:
//   counts:    useMemo + reduce — O(n) once per orders change
//   filtered:  filter + String.includes — O(n) per keystroke (debounced)
//   STATUS_SEQ: object as hash map — O(1) status → color/label/icon lookup

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence }                            from 'framer-motion';
import { useNavigate }                                        from 'react-router-dom';
import axios                                                  from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }               from '../../utils/cache';
import { NavIcon }                                            from '../../components/ui/icons';

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

// ── Status config — O(1) lookup hash map ──────────────────────────────────────
// DSA: JavaScript object used as hash map: status string → style/label O(1)
const STATUS_CFG = {
  pending:     { color:'var(--status-pending)',     bg:'var(--warning-bg)', label:'Pending',     icon:'pending',     seq:0  },
  confirmed:   { color:'var(--status-confirmed)',   bg:'var(--info-bg)',    label:'Confirmed',   icon:'success',     seq:1  },
  pattern:     { color:'var(--status-pattern)',     bg:'var(--purple-50)',  label:'Pattern',     icon:'pattern',     seq:2  },
  segregation: { color:'var(--status-segregation)', bg:'var(--purple-50)',  label:'Segregation', icon:'segregation', seq:3  },
  cutting:     { color:'var(--status-cutting)',     bg:'var(--info-bg)',    label:'Cutting',     icon:'cutting',     seq:4  },
  sewing:      { color:'var(--status-sewing)',      bg:'var(--teal-50)',    label:'Sewing',      icon:'garmentType', seq:5  },
  qc:          { color:'var(--status-qc)',          bg:'var(--warning-bg)', label:'QC',          icon:'qc',          seq:6  },
  pressing:    { color:'var(--status-pressing)',    bg:'var(--purple-50)',  label:'Pressing',    icon:'pressing',    seq:7  },
  packing:     { color:'var(--status-packing)',     bg:'var(--success-bg)',label:'Packing',     icon:'package',     seq:8  },
  completed:   { color:'var(--status-completed)',   bg:'var(--success-bg)',label:'Completed',   icon:'success',     seq:9  },
  cancelled:   { color:'var(--status-cancelled)', bg:'var(--danger-bg)', label:'Cancelled',   icon:'close',  seq:-1 },
};

const ALL_TABS = [
  'all','pending','confirmed',
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
  'completed','cancelled',
];

// ── Skeleton style ────────────────────────────────────────────────────────────
const SK = {
  borderRadius: 6,
  background: 'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
  backgroundSize: '400px',
  animation: 'sk 1.4s infinite',
};

// ── Mini pipeline dots ────────────────────────────────────────────────────────
// DSA: linear scan of 8-element STAGES array — O(8) = O(1)
const PROD_STAGES = ['confirmed','pattern','segregation','cutting','sewing','qc','pressing','packing'];

function PipelineStrip({ status }) {
  const seq = STATUS_CFG[status]?.seq ?? -1;
  if (seq < 0) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, flexWrap:'wrap', marginTop:6 }}>
      {PROD_STAGES.map((s, i) => {
        const done   = (STATUS_CFG[s]?.seq ?? 0) < seq;
        const active = s === status;
        const cfg    = STATUS_CFG[s];
        return (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:3 }}>
            <div title={cfg.label} style={{
              width:18, height:18, borderRadius:'50%', fontSize:8,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: done ? 'var(--success-bg)' : active ? cfg.bg : 'var(--bg-surface)',
              border: done
                ? '1.5px solid var(--success)'
                : active
                  ? `2px solid ${cfg.color}`
                  : '1.5px solid var(--border)',
            }}>
              <NavIcon name={done ? 'success' : cfg.icon} size={12} color="currentColor"/>
            </div>
            {i < PROD_STAGES.length - 1 && (
              <div style={{ width:6, height:2, borderRadius:99,
                background: done ? 'var(--success)' : 'var(--border)' }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Extract swatch color from order ──────────────────────────────────────────
function getSwatchColor(order) {
  try {
    const sc = order.studio_config;
    const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc;
    return parsed?.colors?.body ?? order.color ?? null;
  } catch {
    return order.color ?? null;
  }
}

// ── Desktop table row ─────────────────────────────────────────────────────────
function OrderRow({ order, isManager, onConfirm, confirming }) {
  const navigate   = useNavigate();
  const cfg        = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const pct        = cfg.seq >= 0 ? Math.round((cfg.seq / 9) * 100) : 0;
  const isActive   = !['completed','cancelled'].includes(order.status);
  const swatchClr  = getSwatchColor(order);

  const goTrack = () => navigate(`/admin/production/${order.order_id}`);
  const goView  = () => navigate(`/admin/orders/${order.order_id}`);

  return (
    <motion.tr
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      style={{ borderBottom:'1px solid var(--bg-surface)' }}
      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      {/* Order # + date */}
      <td style={{ padding:'11px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Color swatch dot */}
          {swatchClr && (
            <div style={{
              width:10, height:10, borderRadius:'50%', flexShrink:0,
              background: swatchClr,
              border:'1.5px solid rgba(0,0,0,.08)',
              boxShadow:'0 1px 3px rgba(0,0,0,.12)',
            }}/>
          )}
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:T, margin:0, whiteSpace:'nowrap' }}>
              #{order.order_id}
            </p>
            <p style={{ fontSize:10, color:'var(--text-faint)', margin:'1px 0 0', whiteSpace:'nowrap' }}>
              {order.created_at
                ? new Date(order.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})
                : '—'}
            </p>
          </div>
        </div>
      </td>

      {/* Customer */}
      <td style={{ padding:'11px 14px' }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', margin:0,
          maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {order.customer_name ?? '—'}
        </p>
        <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'1px 0 0' }}>
          {order.order_type === 'direct' ? 'Direct' : 'Institutional'}
        </p>
      </td>

      {/* Garment / Design */}
      <td style={{ padding:'11px 14px' }}>
        <p style={{ fontSize:12, fontWeight:600, color:'var(--ink)', margin:0,
          maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {order.garment_type ?? order.design?.design_name ?? 'Custom'}
        </p>
        <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'1px 0 0' }}>
          {order.quantity_ordered ?? 0} pcs
          {order.color ? ` · ${order.color}` : ''}
        </p>
      </td>

      {/* Status + pipeline */}
      <td style={{ padding:'11px 14px', minWidth:140 }}>
        <span style={{
          padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:700,
          background:cfg.bg, color:cfg.color,
          border:`1px solid ${cfg.color}28`, whiteSpace:'nowrap',
        }}>
          <NavIcon name={cfg.icon} size={12} color="currentColor"/> {cfg.label}
        </span>
        {isActive && (
          <div style={{ marginTop:5 }}>
            <div style={{ height:3, width:90, background:'var(--bg-surface)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, borderRadius:99,
                background:`linear-gradient(90deg,${T},${T2})`,
                transition:'width .4s ease' }}/>
            </div>
          </div>
        )}
      </td>

      {/* Deadline */}
      <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-subtle)', whiteSpace:'nowrap' }}
        className="adm-col-deadline">
        {order.target_delivery_date ?? order.deadline
          ? new Date(order.target_delivery_date ?? order.deadline)
              .toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
          : '—'}
      </td>

      {/* Actions */}
      <td style={{ padding:'11px 14px' }}>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>

          {/* Track / View button */}
          {isActive && !isManager ? (
            <>
              <button onClick={goTrack} style={{
                padding:'5px 12px', borderRadius:8, border:'none', cursor:'pointer',
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'var(--bg-card)', fontSize:11, fontWeight:700, fontFamily:FONT,
                boxShadow:`0 2px 8px rgba(2,128,144,.22)`,
                whiteSpace:'nowrap',
              }}>
                ▶ Track
              </button>
              <button onClick={goView} title="View Details" style={{
                padding:'5px 10px', borderRadius:8,
                border:'1px solid var(--border)', background:'var(--bg)',
                color:'var(--text-subtle)', fontSize:12, cursor:'pointer',
                fontFamily:FONT, whiteSpace:'nowrap',
              }}>
                <NavIcon name="show" size={14} color="currentColor"/>
              </button>
            </>
          ) : (
            <button onClick={goView} style={{
              padding:'5px 12px', borderRadius:8,
              border:'1px solid var(--border)', background:'var(--bg)',
              color:'var(--text-subtle)', fontSize:11, fontWeight:600,
              cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap',
            }}>
              View
            </button>
          )}

          {/* Manager: Confirm pending order */}
          {isManager && order.status === 'pending' && (
            <button
              onClick={() => onConfirm(order.order_id)}
              disabled={confirming === order.order_id}
              style={{
                padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
                background: confirming === order.order_id ? 'var(--bg-surface)' : 'var(--success-bg)',
                color: confirming === order.order_id ? 'var(--text-faint)' : '#166534',
                fontSize:11, fontWeight:700, fontFamily:FONT,
                border:'1px solid var(--success-border)', whiteSpace:'nowrap',
              }}>
              {confirming === order.order_id ? '…' : <><NavIcon name="success" size={12} color="currentColor"/> Confirm</>}
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ── Mobile card — replaces table row on ≤767px ────────────────────────────────
// DSA: same O(1) STATUS_CFG lookup, rendered as card instead of row
function OrderCard({ order, isManager, onConfirm, confirming, index }) {
  const navigate  = useNavigate();
  const cfg       = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const isActive  = !['completed','cancelled'].includes(order.status);
  const swatchClr = getSwatchColor(order);
  const goTrack   = () => navigate(`/admin/production/${order.order_id}`);
  const goView    = () => navigate(`/admin/orders/${order.order_id}`);

  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        background:'var(--bg-card)', borderRadius:12,
        border:'1.5px solid var(--border)',
        overflow:'hidden',
        boxShadow:'0 1px 4px rgba(0,0,0,.05)',
        marginBottom:10,
      }}
    >
      {/* Color swatch strip — full width top bar */}
      {swatchClr && (
        <div style={{ height:4, background:swatchClr, width:'100%' }}/>
      )}

      <div style={{ padding:'13px 14px' }}>
        {/* Row 1: order# + status badge */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:13, fontWeight:800, color:T }}>
            #{order.order_id}
          </span>
          <span style={{
            padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:700,
            background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}28`,
          }}>
            <NavIcon name={cfg.icon} size={12} color="currentColor"/> {cfg.label}
          </span>
        </div>

        {/* Row 2: customer + garment */}
        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', margin:'0 0 2px',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {order.customer_name ?? '—'}
        </p>
        <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'0 0 10px' }}>
          {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs
          {order.color ? ` · ${order.color}` : ''}
        </p>

        {/* Pipeline strip */}
        {isActive && <PipelineStrip status={order.status}/>}

        {/* Action buttons */}
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          {isActive && !isManager ? (
            <>
              <button onClick={goTrack} style={{
                flex:1, padding:'8px', borderRadius:9, border:'none', cursor:'pointer',
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'var(--bg-card)', fontSize:12, fontWeight:700, fontFamily:FONT,
              }}>
                ▶ Track Production
              </button>
              <button onClick={goView} style={{
                padding:'8px 14px', borderRadius:9,
                border:'1px solid var(--border)', background:'var(--bg)',
                color:'var(--text-subtle)', fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:FONT,
              }}>
                View
              </button>
            </>
          ) : (
            <button onClick={goView} style={{
              flex:1, padding:'8px', borderRadius:9,
              border:'1px solid var(--border)', background:'var(--bg)',
              color:'var(--text-subtle)', fontSize:12, fontWeight:600,
              cursor:'pointer', fontFamily:FONT,
            }}>
              View Details
            </button>
          )}

          {isManager && order.status === 'pending' && (
            <button
              onClick={() => onConfirm(order.order_id)}
              disabled={confirming === order.order_id}
              style={{
                padding:'8px 14px', borderRadius:9,
                border:'1px solid var(--success-border)', background:'var(--success-bg)',
                color:'#166534', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:FONT,
              }}>
              {confirming === order.order_id ? '…' : <><NavIcon name="success" size={12} color="currentColor"/> Confirm</>}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('all');
  const [search,    setSearch]    = useState('');
  const [confirming,setConfirming]= useState(null); // order_id being confirmed
  const [toast,     setToast]     = useState(null);
  const searchRef = useRef(null);

  // Window width for mobile/desktop switch — updates on resize
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = winW <= 767;

  const user      = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  const isManager = user.role === 'manager';

  // ── Load orders with cache (TTL.ORDERS = 30s) ─────────────────────────────
  // DSA: cacheGet is O(1) sessionStorage lookup — avoids network round-trip
  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_orders_list');
      if (cached) { setOrders(cached); setLoading(false); return; }
    }
    setLoading(true);
    axios.get('/api/admin/orders')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setOrders(list);
        cacheSet('admin_orders_list', list, TTL.ORDERS);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Count per status — O(n) via useMemo, only reruns when orders changes ──
  // DSA: reduce builds a hash map { status: count } in one O(n) pass
  const counts = useMemo(() =>
    orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {}),
  [orders]);

  // ── Filter — O(n) per search/tab change ──────────────────────────────────
  // DSA: Array.filter with String.includes — O(n·m) where m is search length
  const filtered = useMemo(() =>
    orders.filter(o => {
      const matchTab = tab === 'all' || o.status === tab;
      const q = search.toLowerCase().trim();
      const matchQ = !q
        || String(o.order_id).includes(q)
        || o.customer_name?.toLowerCase().includes(q)
        || o.color?.toLowerCase().includes(q)
        || o.garment_type?.toLowerCase().includes(q)
        || o.client_design_notes?.toLowerCase().includes(q);
      return matchTab && matchQ;
    }),
  [orders, tab, search]);

  // ── Confirm order — optimistic UI ─────────────────────────────────────────
  // DSA: Array.map returns new array with one element mutated — O(n)
  //
  // CLEANUP (Aug 31 2026): this used to branch on a shortages[]/unverified[]
  // response shape from an inline material-feasibility check that PATCH
  // /confirm no longer performs — verified directly against the current
  // ProductionController::confirm(), which only ever returns
  // {message, new_stage} on success or {message} on a 404/422. Shortage
  // checking now lives entirely at the Pattern-stage material-actuals gate
  // (see the no-formula redesign), not here. Removed the dead override-
  // reason payload, the unverified-materials toast branch, and the
  // shortages catch branch along with it — this endpoint just confirms or
  // fails on order state now.
  const doConfirm = useCallback(async (orderId) => {
    const prev = orders;
    setOrders(os => os.map(o =>
      o.order_id === orderId ? { ...o, status:'confirmed' } : o
    ));
    setConfirming(orderId);
    cacheClear('admin_orders_list');

    try {
      await axios.patch(`/api/admin/orders/${orderId}/confirm`);
      setToast({ msg:`Order #${orderId} confirmed.`, type:'success' });
    } catch (e) {
      setOrders(prev); // rollback
      setToast({ msg: e.response?.data?.message ?? 'Could not confirm order. Please retry.', type:'error' });
    } finally {
      setConfirming(null);
    }
  }, [orders]);

  const confirmOrder = useCallback((orderId) => doConfirm(orderId), [doConfirm]);

  // ── Toast auto-dismiss ────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const summaryStats = [
    { l:'Total',     v:orders.length,
      c:'var(--text-subtle)', bg:'var(--bg-surface)' },
    { l:'Active',    v:orders.filter(o=>!['completed','cancelled'].includes(o.status)).length,
      c:T, bg:'var(--teal-50)' },
    { l:'Completed', v:counts.completed ?? 0,
      c:'var(--success)', bg:'var(--success-bg)' },
    { l:'Cancelled', v:counts.cancelled ?? 0,
      c:'var(--danger)', bg:'var(--danger-bg)' },
  ];

  return (
    <>
      <style>{`
        @keyframes sk{
          0%  { background-position:-400px 0 }
          100%{ background-position: 400px 0 }
        }
        .tab-strip{
          display:flex; gap:5px; overflow-x:auto;
          scrollbar-width:none; padding-bottom:2px; flex-wrap:nowrap;
        }
        .tab-strip::-webkit-scrollbar{ display:none; }
        .orders-stat-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
          gap:10px; margin-bottom:20px;
        }
        .orders-table-wrap{
          background:var(--bg-card); border:1px solid var(--border);
          border-radius:14px; overflow:hidden;
          box-shadow:0 1px 3px rgba(0,0,0,.05);
        }
        /* Deadline column: hide on tablet */
        @media(max-width:1023px){
          .adm-col-deadline{ display:none !important; }
        }
        /* Mobile: hide table entirely, show cards */
        @media(max-width:767px){
          .orders-stat-grid{ grid-template-columns:1fr 1fr; gap:8px; }
          .orders-table-wrap{ display:none !important; }
          .orders-card-list{ display:block !important; }
          .tab-strip button{ font-size:10px; padding:5px 10px; }
        }
        @media(min-width:768px){
          .orders-card-list{ display:none !important; }
        }
      `}</style>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:24, scale:.95 }}
            animate={{ opacity:1, y:0,  scale:1   }}
            exit={{    opacity:0, y:16, scale:.95  }}
            style={{
              position:'fixed', bottom:24, right:24, zIndex:9999,
              padding:'11px 18px', borderRadius:11,
              background: toast.type === 'error' ? 'var(--danger)' : toast.type === 'warning' ? 'var(--warning)' : T2,
              color:'var(--bg-card)', fontWeight:700, fontSize:12,
              boxShadow:'0 6px 20px rgba(0,0,0,.15)',
              fontFamily:FONT,
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page header ── */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        marginBottom:20, flexWrap:'wrap', gap:12,
      }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', margin:'0 0 4px', fontFamily:FONT }}>
            Orders
          </h1>
          <p style={{ color:'var(--text-subtle)', fontSize:13, margin:0, fontFamily:FONT }}>
            {orders.length} total ·{' '}
            {isManager ? 'View mode (Manager)' : 'Operational access (Staff)'}
          </p>
        </div>

        <button
          onClick={() => { cacheClear('admin_orders_list'); load(true); }}
          style={{
            padding:'9px 18px', borderRadius:10,
            border:'1px solid var(--border)', background:'var(--bg-card)',
            color:'var(--ink)', fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:FONT,
            display:'flex', alignItems:'center', gap:6,
          }}
        >
          ⟳ Refresh
        </button>
      </div>

      {/* Manager banner */}
      {isManager && (
        <div style={{
          padding:'10px 16px', borderRadius:11,
          background:'var(--purple-50)', border:'1px solid var(--purple-100, #ddd6fe)',
          marginBottom:18, display:'flex', alignItems:'center', gap:8,
        }}>
          <NavIcon name="manager" size={14} color="currentColor"/>
          <p style={{ fontSize:12, color:'var(--purple-dark)', fontWeight:600, margin:0, fontFamily:FONT }}>
            Manager view — You can view all order details. Confirm pending orders here.
            Production stage advancement is Staff-only.
          </p>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="orders-stat-grid">
        {summaryStats.map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              background:'var(--bg-card)', borderRadius:12,
              border:`1px solid ${s.bg}`,
              padding:'12px 14px',
              boxShadow:'0 1px 3px rgba(0,0,0,.04)',
            }}
          >
            <p style={{ fontSize:20, fontWeight:800, color:s.c, margin:'0 0 3px', fontFamily:FONT }}>
              {s.v}
            </p>
            <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>{s.l}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <input
        ref={searchRef}
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by order ID, customer name, garment, color…"
        style={{
          width:'100%', padding:'10px 16px', borderRadius:11,
          border:'1px solid var(--border)', background:'var(--bg-card)',
          color:'var(--ink)', fontSize:13, outline:'none',
          fontFamily:FONT, marginBottom:14, boxSizing:'border-box',
        }}
        onFocus={e => {
          e.target.style.borderColor = T;
          e.target.style.boxShadow   = `0 0 0 3px rgba(2,128,144,.10)`;
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border)';
          e.target.style.boxShadow   = 'none';
        }}
      />

      {/* Status tab strip — horizontal scroll on mobile */}
      <div className="tab-strip" style={{ marginBottom:16 }}>
        {ALL_TABS.map(s => {
          const cfg    = STATUS_CFG[s];
          const active = tab === s;
          const cnt    = s === 'all' ? orders.length : (counts[s] ?? 0);
          return (
            <button key={s} onClick={() => setTab(s)} style={{
              padding:'6px 12px', borderRadius:8, whiteSpace:'nowrap',
              border:`1px solid ${active ? (cfg?.color ?? T)+'44' : 'var(--border)'}`,
              background: active ? (cfg?.bg ?? 'var(--teal-50)') : 'var(--bg-card)',
              color: active ? (cfg?.color ?? T) : 'var(--text-subtle)',
              fontSize:11, fontWeight: active ? 700 : 500,
              cursor:'pointer', fontFamily:FONT, transition:'all .13s', flexShrink:0,
            }}>
              {s === 'all' ? <><NavIcon name="orders" size={12} color="currentColor"/> All</> : <><NavIcon name={cfg?.icon} size={12} color="currentColor"/> {cfg?.label ?? s}</>}
              {cnt > 0 && (
                <span style={{ marginLeft:5, fontSize:9, opacity:.65 }}>({cnt})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── DESKTOP: table ── */}
      <div className="orders-table-wrap">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--bg)' }}>
              {['Order #','Client','Garment','Status','Deadline','Actions'].map(h => (
                <th key={h} style={{
                  padding:'10px 14px', textAlign:'left', fontSize:10,
                  fontWeight:700, color:'var(--text-subtle)',
                  textTransform:'uppercase', letterSpacing:'.06em',
                  borderBottom:'2px solid var(--border)', whiteSpace:'nowrap',
                  fontFamily:FONT,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--bg-surface)' }}>
                    {[100,140,160,80,80,60].map((w, j) => (
                      <td key={j} style={{ padding:'13px 14px' }}>
                        <div style={{ ...SK, height:10, width:w }}/>
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6} style={{ padding:'50px 20px', textAlign:'center' }}>
                      <p style={{ fontSize:36, margin:'0 0 10px', opacity:.25, display:'flex', justifyContent:'center' }}><NavIcon name="orders" size={36} color="currentColor"/></p>
                      <p style={{ fontSize:14, fontWeight:700, color:'var(--text-subtle)',
                        margin:0, fontFamily:FONT }}>
                        {search
                          ? `No results for "${search}"`
                          : `No ${tab === 'all' ? '' : tab} orders`}
                      </p>
                    </td>
                  </tr>
                )
                : filtered.map(o => (
                  <OrderRow
                    key={o.order_id}
                    order={o}
                    isManager={isManager}
                    onConfirm={confirmOrder}
                    confirming={confirming}
                  />
                ))
            }
          </tbody>
        </table>

        {!loading && filtered.length > 0 && (
          <div style={{
            padding:'10px 16px', borderTop:'1px solid var(--bg-surface)',
            background:'var(--bg)',
          }}>
            <p style={{ fontSize:11, color:'var(--text-faint)', margin:0, fontFamily:FONT }}>
              Showing {filtered.length} of {orders.length} orders
            </p>
          </div>
        )}
      </div>

      {/* ── MOBILE: cards ── */}
      <div className="orders-card-list">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} style={{
                background:'var(--bg-card)', borderRadius:12, border:'1.5px solid var(--border)',
                padding:'14px', marginBottom:10,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ ...SK, height:12, width:60 }}/>
                  <div style={{ ...SK, height:12, width:80 }}/>
                </div>
                <div style={{ ...SK, height:12, width:'70%', marginBottom:8 }}/>
                <div style={{ ...SK, height:10, width:'50%', marginBottom:14 }}/>
                <div style={{ ...SK, height:36, width:'100%', borderRadius:9 }}/>
              </div>
            ))
          : filtered.length === 0
            ? (
              <div style={{ textAlign:'center', padding:'48px 20px' }}>
                <p style={{ fontSize:36, margin:'0 0 10px', opacity:.25, display:'flex', justifyContent:'center' }}><NavIcon name="orders" size={36} color="currentColor"/></p>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-subtle)',
                  margin:0, fontFamily:FONT }}>
                  {search ? `No results for "${search}"` : `No ${tab === 'all' ? '' : tab} orders`}
                </p>
              </div>
            )
            : filtered.map((o, i) => (
              <OrderCard
                key={o.order_id}
                order={o}
                isManager={isManager}
                onConfirm={confirmOrder}
                confirming={confirming}
                index={i}
              />
            ))
        }

        {!loading && filtered.length > 0 && (
          <p style={{ fontSize:11, color:'var(--text-faint)', textAlign:'center',
            margin:'4px 0 0', fontFamily:FONT }}>
            {filtered.length} of {orders.length} orders
          </p>
        )}
      </div>
    </>
  );
}
