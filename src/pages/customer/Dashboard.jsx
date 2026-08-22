// src/pages/customer/Dashboard.jsx
// VFRB Enterprise — Customer Dashboard v1.0
// Built from scratch — file was empty (0 bytes) in the zip.
//
// Feel: Nike By You + PUBG character screen — not a boring table.
// - Hero greeting with live time-of-day
// - KPI stat strip: total orders, in-production, completed, unread messages
// - Active orders: animated stage pipeline + color swatch + progress bar
// - Recent orders: compact list with status pill
// - Empty states: illustrated, with CTA to Design Studio
// - Design Studio CTA card: dark teal gradient, glowing border
// - Skeleton loaders on every section
// - Cache: TTL.DASHBOARD (2 min) for stats, TTL.ORDERS (30s) for orders
// - Optimistic: notification unread count decrements instantly
//
// DB columns used (from vfrb_db.sql):
//   orders: order_id, status, garment_type, color, quantity_ordered,
//           collar_type, sleeve_type, created_at, studio_config
//   notifications: notif_id, user_id, message, is_read, date_sent

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useLocation }             from 'react-router-dom';
import { motion, AnimatePresence }                   from 'framer-motion';
import axios                                         from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }       from '../../utils/cache';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

// ── Stage config (matches orders.status enum) ─────────────────────────────────
const S = {
  pending:     { color:'#f59e0b', bg:'#fef3c7', label:'Pending',     icon:'⏳', seq:0  },
  confirmed:   { color:'#3b82f6', bg:'#dbeafe', label:'Confirmed',   icon:'✅', seq:1  },
  pattern:     { color:'#8b5cf6', bg:'#ede9fe', label:'Pattern',     icon:'📐', seq:2  },
  segregation: { color:'#a78bfa', bg:'#f5f3ff', label:'Segregation', icon:'🗂️', seq:3  },
  cutting:     { color:'#6366f1', bg:'#e0e7ff', label:'Cutting',     icon:'✂️', seq:4  },
  sewing:      { color:'#06b6d4', bg:'#cffafe', label:'Sewing',      icon:'🧵', seq:5  },
  qc:          { color:'#f97316', bg:'#ffedd5', label:'QC',          icon:'🔍', seq:6  },
  pressing:    { color:'#ec4899', bg:'#fce7f3', label:'Pressing',    icon:'🔧', seq:7  },
  packing:     { color:'#f472b6', bg:'#fdf2f8', label:'Packing',     icon:'📦', seq:8  },
  completed:   { color:'#22c55e', bg:'#dcfce7', label:'Completed',   icon:'🎉', seq:9  },
  cancelled:   { color:'#ef4444', bg:'#fee2e2', label:'Cancelled',   icon:'✕',  seq:-1 },
};

const PROD_STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];

// ── Skeleton ─────────────────────────────────────────────────────────────────
const SK_ANIM = `@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`;
const SK = {
  borderRadius:8, height:16,
  background:'linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)',
  backgroundSize:'400px', animation:'sk 1.4s infinite',
};

// ── Relative time ─────────────────────────────────────────────────────────────
function reltime(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60)  return 'just now';
  if (diff < 3600)return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function greeting(name) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name.split(' ')[0]} 👋`;
}

// ── Mini pipeline strip ───────────────────────────────────────────────────────
function MiniPipeline({ status }) {
  if (!PROD_STAGES.includes(status) && status !== 'completed') return null;
  const curSeq = S[status]?.seq ?? 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, marginTop:6, flexWrap:'wrap' }}>
      {PROD_STAGES.map((st) => {
        const stSeq  = S[st]?.seq ?? 0;
        const done   = stSeq < curSeq || status === 'completed';
        const active = st === status;
        const c      = S[st];
        return (
          <div key={st} style={{ display:'flex', alignItems:'center', gap:2 }}>
            <div title={c.label} style={{
              width:20, height:20, borderRadius:'50%', fontSize:8,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: active ? c.color : done ? T2 : '#e2e8f0',
              color: active || done ? '#fff' : '#94a3b8',
              fontWeight:700, position:'relative',
              boxShadow: active ? `0 0 0 3px ${c.color}30` : 'none',
              transition:'all .2s',
            }}>
              {done ? '✓' : c.icon}
              {active && (
                <span style={{
                  position:'absolute', width:26, height:26, borderRadius:'50%',
                  border:`2px solid ${c.color}`, opacity:.4,
                  animation:'ping 1.4s cubic-bezier(0,0,.2,1) infinite',
                  top:-3, left:-3,
                }}/>
              )}
            </div>
            {PROD_STAGES.indexOf(st) < PROD_STAGES.length - 1 && (
              <div style={{ width:10, height:2, borderRadius:2, background: done ? T2 : '#e2e8f0', transition:'background .2s' }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Active Order Card ─────────────────────────────────────────────────────────
function ActiveOrderCard({ order, index }) {
  const nav = useNavigate();
  const cfg  = order.studio_config ?? {};
  const clr  = cfg.colors?.body ?? order.color ?? '#028090';
  const sc   = S[order.status] ?? S.pending;
  const pct  = order.qty_completed && order.quantity_ordered
    ? Math.min(100, Math.round((order.qty_completed / order.quantity_ordered) * 100))
    : Math.round((sc.seq / 9) * 100);

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y:-2, boxShadow:'0 8px 28px rgba(2,128,144,0.12)' }}
      onClick={() => nav(`/customer/orders/${order.order_id}`)}
      style={{
        background:'#fff', borderRadius:14, padding:'18px 20px',
        border:'1.5px solid #e2e8f0', cursor:'pointer', transition:'all .2s',
        position:'relative', overflow:'hidden',
      }}
    >
      {/* Left accent color strip */}
      <div style={{
        position:'absolute', left:0, top:0, bottom:0, width:4,
        background: sc.color, borderRadius:'14px 0 0 14px',
      }}/>

      <div style={{ display:'flex', alignItems:'flex-start', gap:12, paddingLeft:8 }}>

        {/* Color swatch */}
        <div style={{
          width:44, height:44, borderRadius:10, flexShrink:0,
          background: clr,
          border:'2px solid rgba(0,0,0,.06)',
          boxShadow:'0 2px 8px rgba(0,0,0,.08)',
        }}/>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:2 }}>
            <span style={{
              fontSize:13, fontWeight:700, color:'#0f172a',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {order.garment_type ?? 'Garment'} #{order.order_id}
            </span>
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
              background: sc.bg, color: sc.color,
            }}>
              {sc.icon} {sc.label}
            </span>
          </div>

          <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>
            {order.quantity_ordered} pcs
            {order.collar_type ? ` · ${order.collar_type}` : ''}
            {order.sleeve_type  ? ` · ${order.sleeve_type} sleeve` : ''}
          </div>

          {/* Stage pipeline dots */}
          <MiniPipeline status={order.status}/>

          {/* Progress bar */}
          {pct > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>Production</span>
                <span style={{ fontSize:10, color: T, fontWeight:700 }}>{pct}%</span>
              </div>
              <div style={{ height:5, borderRadius:10, background:'#f1f5f9', overflow:'hidden' }}>
                <motion.div
                  initial={{ width:0 }}
                  animate={{ width:`${pct}%` }}
                  transition={{ duration:.8, ease:'easeOut', delay: index * 0.07 + 0.2 }}
                  style={{ height:'100%', borderRadius:10,
                    background: pct === 100 ? T2 : `linear-gradient(90deg,${T},${T2})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Arrow */}
        <span style={{ color:'#cbd5e1', fontSize:16, alignSelf:'center', marginLeft:4 }}>›</span>
      </div>
    </motion.div>
  );
}

// ── KPI Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, accent, loading, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ delay }}
      style={{
        background:'#fff', borderRadius:12, padding:'16px 18px',
        border:`1.5px solid ${accent}22`,
        boxShadow:`0 2px 8px ${accent}10`,
        display:'flex', alignItems:'center', gap:12,
      }}
    >
      <div style={{
        width:40, height:40, borderRadius:10, flexShrink:0,
        background:`${accent}14`, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:18,
      }}>
        {icon}
      </div>
      <div>
        {loading
          ? <div style={{ ...SK, width:40, height:22, marginBottom:4 }}/>
          : <p style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0, lineHeight:1,
                animation:'countUp .5s cubic-bezier(.34,1.56,.64,1) both' }}>{value}</p>
        }
        <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0', fontWeight:500 }}>{label}</p>
      </div>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyOrders({ nav }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:.97 }} animate={{ opacity:1, scale:1 }}
      style={{
        textAlign:'center', padding:'48px 24px',
        background:'#fff', borderRadius:16, border:'1.5px dashed #e2e8f0',
      }}
    >
      <div style={{ fontSize:52, marginBottom:12, opacity:.35 }}>✂️</div>
      <h3 style={{ fontSize:16, fontWeight:700, color:'#1a2332', marginBottom:8 }}>
        No active orders yet
      </h3>
      <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:20, maxWidth:280, margin:'0 auto 20px' }}>
        Design your first garment in the Design Studio — AI will suggest the materials you need.
      </p>
      <motion.button
        whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
        onClick={() => nav('/customer/design-studio')}
        style={{
          padding:'11px 24px', borderRadius:12, border:'none', cursor:'pointer',
          background:`linear-gradient(135deg,${T},${T2})`,
          color:'#fff', fontWeight:700, fontSize:13,
          boxShadow:`0 4px 16px ${T}30`,
        }}
      >
        🎨 Open Design Studio →
      </motion.button>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// ── Confetti burst (reused from OrderWizard — same component) ────────────────
const CONF_COLORS = ['#028090','#02C39A','#fbbf24','#f472b6','#60a5fa','#34d399'];
function ConfettiBurst() {
  const particles = Array.from({ length: 32 }, (_, i) => ({
    color: CONF_COLORS[i % CONF_COLORS.length],
    x: Math.random() * 100,
    xDrift: (Math.random() - 0.5) * 280,
    rot: Math.random() * 720,
    delay: Math.random() * 0.5,
    dur: 1.6 + Math.random() * 0.9,
    size: 6 + Math.random() * 8,
    shape: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
  }));
  return (
    <>
      <style>{`
        @keyframes cfetti2 {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity:1; }
          100% { transform: translateY(75vh) translateX(var(--cx2)) rotate(var(--cr2)); opacity:0; }
        }
      `}</style>
      <div style={{ position:'fixed', inset:0, zIndex:9999, pointerEvents:'none', overflow:'hidden' }}>
        {particles.map((p, i) => (
          <div key={i} style={{
            position:'absolute', top:'-10px', left:`${p.x}%`,
            width:p.size, height:p.size, borderRadius:p.shape,
            background:p.color,
            '--cx2':`${p.xDrift}px`, '--cr2':`${p.rot}deg`,
            animation:`cfetti2 ${p.dur}s ease-in ${p.delay}s forwards`,
            opacity:0,
          }}/>
        ))}
      </div>
    </>
  );
}

export default function CustomerDashboard() {
  const nav      = useNavigate();
  const location = useLocation();
  const user     = JSON.parse(localStorage.getItem('vfrb_user') || '{}');

  const [stats,        setStats]        = useState(null);
  const [orders,       setOrders]       = useState([]);
  const [notifs,       setNotifs]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [ordLoading,   setOrdLoading]   = useState(true);
  const [toast,        setToast]        = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevNotifs     = useRef([]);

  // ── Confetti on first order placed ────────────────────────────────────────
  // OrderWizard navigates here with { state: { justCreated: true } }
  useEffect(() => {
    if (location.state?.justCreated) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3200);
      window.history.replaceState({}, '', location.pathname);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line

  // ── Toast auto-dismiss ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Load dashboard stats ──────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    const cached = cacheGet('customer_dashboard');
    if (cached) { setStats(cached); setLoading(false); return; }
    try {
      const { data } = await axios.get('/api/customer/dashboard');
      setStats(data);
      cacheSet('customer_dashboard', data, TTL.DASHBOARD);
    } catch {
      // silently degrade — KPI cards show —
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load active orders ─────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    const cached = cacheGet('customer_orders_active');
    if (cached) { setOrders(cached); setOrdLoading(false); return; }
    try {
      const { data } = await axios.get('/api/customer/orders?status=active&per_page=8');
      const list = data.data ?? data ?? [];
      setOrders(list);
      cacheSet('customer_orders_active', list, TTL.ORDERS);
    } catch {
      setOrders([]);
    } finally {
      setOrdLoading(false);
    }
  }, []);

  // ── Load notifications ─────────────────────────────────────────────────────
  const loadNotifs = useCallback(async () => {
    const cached = cacheGet('customer_notifs');
    if (cached) { setNotifs(cached); return; }
    try {
      const { data } = await axios.get('/api/customer/notifications?per_page=5');
      const list = data.data ?? data ?? [];
      setNotifs(list);
      cacheSet('customer_notifs', list, TTL.NOTIFICATIONS);
    } catch {
      setNotifs([]);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadOrders();
    loadNotifs();
  }, [loadStats, loadOrders, loadNotifs]);

  // ── Optimistic mark notification read ─────────────────────────────────────
  const markRead = useCallback(async (notifId) => {
    prevNotifs.current = notifs;
    setNotifs(prev => prev.map(n =>
      (n.notif_id ?? n.id) === notifId ? { ...n, is_read: 1 } : n
    ));
    try {
      await axios.patch(`/api/customer/notifications/${notifId}/read`);
      cacheClear('customer_notifs');
    } catch {
      setNotifs(prevNotifs.current);
      setToast({ msg:'Could not mark as read.', type:'error' });
    }
  }, [notifs]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalOrders    = stats?.total_orders     ?? orders.length;
  const inProduction   = stats?.in_production    ?? orders.filter(o => !['pending','completed','cancelled'].includes(o.status)).length;
  const completedCount = stats?.completed_orders ?? 0;
  const unreadCount    = notifs.filter(n => !n.is_read).length;

  const activeOrders  = orders.filter(o => !['completed','cancelled'].includes(o.status));
  const recentOrders  = orders.filter(o => ['completed','cancelled'].includes(o.status)).slice(0,3);

  return (
    <div style={{ fontFamily:FONT, color:'#0f172a', paddingBottom:32 }}>
      <style>{`
        ${SK_ANIM}
        @keyframes ping    { 75%,100%{ transform:scale(2.2); opacity:0 } }
        @keyframes fadeUp  { from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:translateY(0) } }
        @keyframes countUp { from{ opacity:0; transform:translateY(6px) scale(.92) } to{ opacity:1; transform:translateY(0) scale(1) } }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 6px 24px rgba(2,128,144,.28), 0 0 0 0 rgba(2,195,154,0) }
          50%     { box-shadow: 0 8px 32px rgba(2,128,144,.38), 0 0 20px 4px rgba(2,195,154,.15) }
        }
        @keyframes logoFloat {
          0%,100% { transform:rotate(-8deg) scale(1) }
          50%     { transform:rotate(-8deg) scale(1.04) }
        }

        /* Responsive: mobile stats 2-col, orders 1-col */
        @media (max-width: 767px) {
          .dash-stat-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .dash-hero      { padding: 18px 18px !important; }
          .dash-hero h1   { font-size: 18px !important; }
          .dash-cta-row   { grid-template-columns: 1fr !important; }
        }
        /* Tablet: 2-col stats, 2-col CTA */
        @media (min-width: 768px) and (max-width: 1023px) {
          .dash-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        /* 4K */
        @media (min-width: 2560px) {
          .dash-stat-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>

      {/* Confetti burst when redirected from a new order */}
      {showConfetti && <ConfettiBurst/>}

      {/* Order placed success banner */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity:0, y:-16, scale:.95 }}
            animate={{ opacity:1, y:0,   scale:1   }}
            exit={{   opacity:0, y:-12              }}
            style={{
              margin:'0 0 18px', padding:'16px 22px',
              borderRadius:14, display:'flex', alignItems:'center', gap:14,
              background:'linear-gradient(135deg,var(--teal),var(--teal-2))',
              boxShadow:'0 6px 24px rgba(2,128,144,.3)',
            }}
          >
            <span style={{ fontSize:28 }}>🎉</span>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:'#fff', margin:0 }}>
                Order placed successfully!
              </p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,.8)', margin:'2px 0 0' }}>
                VFRB staff will review and confirm your order shortly.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:24, scale:.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:16, scale:.95 }}
            style={{
              position:'fixed', bottom:24, right:24, zIndex:9999,
              padding:'12px 20px', borderRadius:12,
              background: toast.type === 'error' ? '#ef4444' : T2,
              color:'#fff', fontWeight:600, fontSize:13,
              boxShadow:'0 6px 24px rgba(0,0,0,.15)',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero greeting ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        className="dash-hero"
        style={{
          background:`linear-gradient(135deg, ${T}0a 0%, ${T2}07 100%)`,
          border:`1px solid ${T}18`,
          borderRadius:16, padding:'24px 26px', marginBottom:24,
          position:'relative', overflow:'hidden',
        }}
      >
        {/* Ambient glow orb */}
        <div style={{
          position:'absolute', top:-30, right:-30, width:180, height:180,
          borderRadius:'50%',
          background:`radial-gradient(circle,${T2}1a,transparent 70%)`,
          pointerEvents:'none',
        }}/>
        {/* VFRB logo watermark — subtle brand presence */}
        <div style={{
          position:'absolute', bottom:-12, right:16, width:80, height:80,
          backgroundImage:'url(/src/assets/company-logo.jpg)',
          backgroundSize:'cover', backgroundPosition:'center',
          borderRadius:'50%', opacity:.05,
          animation:'logoFloat 4s ease-in-out infinite',
          pointerEvents:'none',
        }}/>
        <h1 style={{ fontSize:'clamp(18px,2.5vw,24px)', fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>
          {greeting(user.name ?? 'Customer')}
        </h1>
        <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
          Welcome back to VFRB Enterprise — here's your production overview.
        </p>
        <div style={{ marginTop:16, display:'flex', gap:10, flexWrap:'wrap' }}>
          <motion.button
            whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={() => nav('/customer/design-studio')}
            style={{
              padding:'9px 18px', borderRadius:10, border:'none', cursor:'pointer',
              background:`linear-gradient(135deg,${T},${T2})`,
              color:'#fff', fontWeight:700, fontSize:12,
              boxShadow:`0 3px 12px ${T}30`,
            }}
          >
            🎨 Design Studio
          </motion.button>
          <motion.button
            whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={() => nav('/customer/order/create')}
            style={{
              padding:'9px 18px', borderRadius:10,
              border:`1.5px solid ${T}30`, cursor:'pointer',
              background:'#fff', color:T, fontWeight:700, fontSize:12,
            }}
          >
            ✏️ New Order
          </motion.button>
        </div>
      </motion.div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="dash-stat-grid" style={{
        display:'grid',
        gridTemplateColumns:'repeat(4,1fr)',
        gap:12, marginBottom:24,
      }}>
        <StatCard icon="📋" value={totalOrders}    label="Total Orders"    accent="#028090" loading={loading} delay={0.05}/>
        <StatCard icon="⚙️" value={inProduction}   label="In Production"  accent="#6366f1" loading={loading} delay={0.10}/>
        <StatCard icon="✅" value={completedCount} label="Completed"       accent="#22c55e" loading={loading} delay={0.15}/>
        <StatCard icon="🔔" value={unreadCount}    label="Notifications"   accent="#f59e0b" loading={false}  delay={0.20}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:24 }}>

        {/* ── Active Orders ──────────────────────────────────────────────── */}
        <section>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>
              Active Orders
              {activeOrders.length > 0 && (
                <span style={{
                  marginLeft:8, fontSize:11, fontWeight:700, padding:'2px 8px',
                  borderRadius:20, background:`${T}15`, color:T,
                }}>
                  {activeOrders.length}
                </span>
              )}
            </h2>
            <Link to="/customer/orders" style={{ fontSize:12, color:T, fontWeight:600, textDecoration:'none' }}>
              View all →
            </Link>
          </div>

          {ordLoading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2].map(i => (
                <div key={i} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1.5px solid #e2e8f0' }}>
                  <div style={{ display:'flex', gap:12 }}>
                    <div style={{ ...SK, width:44, height:44, borderRadius:10, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ ...SK, width:'60%', height:14, marginBottom:8 }}/>
                      <div style={{ ...SK, width:'40%', height:11 }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <EmptyOrders nav={nav}/>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {activeOrders.slice(0,5).map((order, i) => (
                <ActiveOrderCard key={order.order_id} order={order} index={i}/>
              ))}
            </div>
          )}
        </section>

        {/* ── Design Studio CTA + Notifications row ─────────────────────── */}
        <div className="dash-cta-row" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>

          {/* Design Studio CTA */}
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.25 }}
            whileHover={{ scale:1.01 }}
            onClick={() => nav('/customer/design-studio')}
            style={{
              background:`linear-gradient(135deg,${T} 0%,${T2} 100%)`,
              borderRadius:16, padding:'24px 22px', cursor:'pointer',
              animation:'glowPulse 2.8s ease-in-out infinite',
              position:'relative', overflow:'hidden',
            }}
          >
            <div style={{
              position:'absolute', top:-20, right:-20, width:120, height:120,
              borderRadius:'50%', background:'rgba(255,255,255,.08)', pointerEvents:'none',
            }}/>
            <p style={{ fontSize:28, margin:'0 0 8px' }}>🎨</p>
            <h3 style={{ fontSize:15, fontWeight:800, color:'#fff', margin:'0 0 6px' }}>
              Design Studio
            </h3>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.75)', margin:'0 0 14px', lineHeight:1.5 }}>
              Customize your garment with AI-assisted color zones, logo placement, and 3D preview.
            </p>
            <span style={{
              fontSize:12, fontWeight:700, color:'#fff',
              background:'rgba(255,255,255,.2)', padding:'5px 12px', borderRadius:20,
            }}>
              Open Studio →
            </span>
          </motion.div>

          {/* Notifications panel */}
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
            style={{
              background:'#fff', borderRadius:16, padding:'20px 20px',
              border:'1.5px solid #e2e8f0',
            }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h3 style={{ fontSize:14, fontWeight:800, color:'#0f172a', margin:0 }}>
                Notifications
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft:7, fontSize:10, fontWeight:800, padding:'1px 6px',
                    borderRadius:20, background:'#ef4444', color:'#fff',
                  }}>{unreadCount}</span>
                )}
              </h3>
              <Link to="/customer/messages" style={{ fontSize:11, color:T, fontWeight:600, textDecoration:'none' }}>
                Messages →
              </Link>
            </div>

            {notifs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:12 }}>
                <div style={{ fontSize:28, marginBottom:6, opacity:.4 }}>🔔</div>
                No notifications yet
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {notifs.slice(0,4).map((n, i) => {
                  const nId = n.notif_id ?? n.id;
                  return (
                    <motion.div
                      key={nId}
                      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => !n.is_read && markRead(nId)}
                      style={{
                        padding:'10px 0', cursor: n.is_read ? 'default' : 'pointer',
                        borderBottom: i < notifs.slice(0,4).length - 1 ? '1px solid #f1f5f9' : 'none',
                        display:'flex', gap:10, alignItems:'flex-start',
                      }}
                    >
                      <div style={{
                        width:7, height:7, borderRadius:'50%', marginTop:4, flexShrink:0,
                        background: n.is_read ? '#e2e8f0' : T2,
                        boxShadow: n.is_read ? 'none' : `0 0 0 3px ${T2}30`,
                      }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{
                          fontSize:12, color: n.is_read ? '#64748b' : '#0f172a',
                          fontWeight: n.is_read ? 400 : 600, margin:'0 0 2px',
                          lineHeight:1.4,
                          overflow:'hidden', display:'-webkit-box',
                          WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                        }}>
                          {n.message}
                        </p>
                        <p style={{ fontSize:10, color:'#94a3b8', margin:0 }}>
                          {reltime(n.date_sent)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Recently completed ────────────────────────────────────────── */}
        {recentOrders.length > 0 && (
          <section>
            <h2 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 14px' }}>
              Recently Completed
            </h2>
            <div style={{
              background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0',
              overflow:'hidden',
            }}>
              {recentOrders.map((order, i) => {
                const sc  = S[order.status] ?? S.completed;
                const cfg = order.studio_config ?? {};
                const clr = cfg.colors?.body ?? order.color ?? '#028090';
                return (
                  <motion.div
                    key={order.order_id}
                    initial={{ opacity:0 }} animate={{ opacity:1 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => nav(`/customer/orders/${order.order_id}`)}
                    style={{
                      display:'flex', alignItems:'center', gap:14, padding:'14px 18px',
                      borderBottom: i < recentOrders.length - 1 ? '1px solid #f8fafc' : 'none',
                      cursor:'pointer', transition:'background .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width:32, height:32, borderRadius:8, background:clr, flexShrink:0,
                      border:'1.5px solid rgba(0,0,0,.06)',
                    }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:'0 0 1px',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {order.garment_type ?? 'Order'} #{order.order_id}
                      </p>
                      <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>
                        {order.quantity_ordered} pcs · {reltime(order.updated_at)}
                      </p>
                    </div>
                    <span style={{
                      fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20,
                      background: sc.bg, color: sc.color, whiteSpace:'nowrap',
                    }}>
                      {sc.icon} {sc.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}