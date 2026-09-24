// src/pages/client/Orders.jsx
// Order list — color swatch bar, mini pipeline, illustrated empty state,
// caching, search, tab filters. Zero schema changes.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate }                         from 'react-router-dom';
import { motion, AnimatePresence }             from 'framer-motion';
import axios                                   from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import EmptyState from '../../components/EmptyState';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;
const SK   = {
  borderRadius: 6,
  background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize: '400px',
  animation: 'sk 1.4s infinite',
};

// Icon names match Dashboard.jsx's S config — same status set, same NavIcon convention.
const S = {
  pending:     { color:'#f59e0b', bg:'#fef3c7', label:'Pending',     icon:'pending',     seq:0  },
  confirmed:   { color:'#3b82f6', bg:'#dbeafe', label:'Confirmed',   icon:'success',     seq:1  },
  pattern:     { color:'#8b5cf6', bg:'#ede9fe', label:'Pattern',     icon:'pattern',     seq:2  },
  segregation: { color:'#a78bfa', bg:'#f5f3ff', label:'Segregation', icon:'segregation', seq:3  },
  cutting:     { color:'#6366f1', bg:'#e0e7ff', label:'Cutting',     icon:'cutting',     seq:4  },
  sewing:      { color:'#06b6d4', bg:'#cffafe', label:'Sewing',      icon:'garmentType', seq:5  },
  qc:          { color:'#f97316', bg:'#ffedd5', label:'QC',          icon:'qc',          seq:6  },
  pressing:    { color:'#ec4899', bg:'#fce7f3', label:'Pressing',    icon:'pressing',    seq:7  },
  packing:     { color:'#f472b6', bg:'#fdf2f8', label:'Packing',     icon:'package',     seq:8  },
  completed:   { color:'#22c55e', bg:'#dcfce7', label:'Completed',   icon:'success',     seq:9  },
  cancelled:   { color:'#ef4444', bg:'#fee2e2', label:'Cancelled',   icon:'error',       seq:-1 },
};

const PROD_STAGES = [
  'confirmed','pattern','segregation','cutting',
  'sewing','qc','pressing','packing',
];
const IN_PROD = new Set([
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
]);
const ALL_TABS = [
  'all','pending','confirmed','pattern','segregation',
  'cutting','sewing','qc','pressing','packing','completed','cancelled',
];

function parseStudioColors(order) {
  try {
    const raw = order.studio_config;
    if (!raw) return null;
    const cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const c   = cfg?.colors;
    if (!c) return null;
    return {
      body:    c.body    || null,
      collar:  c.collar  || null,
      sleeve:  c.sleeve  || null,
      pocket:  c.pocket  || null,
    };
  } catch { return null; }
}

// Four-zone strip: body/collar/sleeve/pocket, falls back to order.color.
function SwatchBar({ order }) {
  const colors = parseStudioColors(order);

  if (colors) {
    const stops = [
      colors.body   && { color: colors.body,   flex: 5 },
      colors.collar && { color: colors.collar, flex: 2 },
      colors.sleeve && { color: colors.sleeve, flex: 2 },
      colors.pocket && { color: colors.pocket, flex: 1 },
    ].filter(Boolean);

    if (stops.length > 0) {
      return (
        <div style={{ display: 'flex', height: 7, borderRadius: '13px 13px 0 0', overflow: 'hidden', flexShrink: 0 }}>
          {stops.map((s, i) => (
            <div key={i} style={{ flex: s.flex, background: s.color, transition: 'flex .3s ease' }}/>
          ))}
        </div>
      );
    }
  }

  const hex = order.color ?? T;
  return (
    <div style={{
      height: 7, borderRadius: '13px 13px 0 0',
      background: /^#[0-9a-f]{3,6}$/i.test(hex) ? hex : T,
      flexShrink: 0,
    }}/>
  );
}

function StatusPill({ status }) {
  const cfg   = S[status] ?? S.pending;
  const pulse = IN_PROD.has(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`,
      whiteSpace: 'nowrap', flexShrink: 0,
      fontFamily: FONT,
    }}>
      {pulse && (
        <motion.span
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }}
        />
      )}
      <NavIcon name={cfg.icon} size={11} color={cfg.color}/> {cfg.label}
    </span>
  );
}

function MiniPipeline({ status }) {
  if (!PROD_STAGES.includes(status) && status !== 'completed') return null;
  const curSeq = S[status]?.seq ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', marginTop: 8 }}>
      {PROD_STAGES.map((st, i) => {
        const stSeq  = S[st]?.seq ?? 0;
        const done   = stSeq < curSeq;
        const active = st === status;
        const c      = S[st];
        return (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <div title={c.label} style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#dcfce7' : active ? c.bg : '#f8fafc',
              border: done   ? '1.5px solid #22c55e'
                    : active ? `2px solid ${c.color}` : '1.5px solid #e2e8f0',
              boxShadow: active ? `0 1px 4px ${c.color}40` : 'none',
            }}>
              {done ? (
                <span style={{ color: '#22c55e', fontSize: 8, fontWeight: 900 }}>✓</span>
              ) : (
                <span style={{ opacity: active ? 1 : 0.45, display:'flex' }}><NavIcon name={c.icon} size={10} color={c.color}/></span>
              )}
            </div>
            {i < PROD_STAGES.length - 1 && (
              <div style={{
                width: 8, height: 2, borderRadius: 99,
                background: done ? `linear-gradient(90deg,#22c55e,${T2})` : '#e2e8f0',
                flexShrink: 0,
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order, onClick }) {
  const cfg  = S[order.status] ?? S.pending;
  const done = order.status === 'completed';
  const cancelled = order.status === 'cancelled';

  const pct = (() => {
    const qty  = Number(order.quantity_ordered ?? 0);
    const comp = Number(order.qty_completed    ?? 0);
    if (qty > 0 && order.qty_completed !== undefined) {
      return Math.min(100, Math.round((comp / qty) * 100));
    }
    return cfg.seq >= 0 ? Math.round((cfg.seq / 9) * 100) : 0;
  })();

  const title =
    order.design?.design_name ??
    order.garment_type ??
    order.client_design_notes?.slice(0, 38) ??
    'Custom Order';

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      aria-label={`View order ${title}, status ${cfg.label}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.06)' }}
      whileTap={{ scale: .99 }}
      onClick={onClick}
      className="ord-card"
      style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        overflow: 'hidden', transition: 'box-shadow .17s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <SwatchBar order={order}/>

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', margin: 0, fontFamily: FONT }}>
              Order #{order.order_id}
            </p>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FONT }}>
              {title}
            </p>
          </div>
          <StatusPill status={order.status}/>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {order.garment_type && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontFamily: FONT, border: '1px solid #e2e8f0', display:'inline-flex', alignItems:'center', gap:4 }}>
              <NavIcon name="garmentType" size={10} color="#475569"/> {order.garment_type}
            </span>
          )}
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#64748b', fontFamily: FONT, border: '1px solid #e2e8f0' }}>
            {order.quantity_ordered ?? 0} pcs
          </span>
          {order.target_delivery_date && (
            <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#f1f5f9', color: '#64748b', fontFamily: FONT, border: '1px solid #e2e8f0' }}>
              Due {new Date(order.target_delivery_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {!done && !cancelled && <MiniPipeline status={order.status}/>}

        {!done && !cancelled && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: FONT }}>
                {order.qty_completed !== undefined
                  ? `${order.qty_completed ?? 0} / ${order.quantity_ordered ?? 0} pcs`
                  : 'Production progress'}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, fontFamily: FONT }}>{pct}%</span>
            </div>
            <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .65, ease: 'easeOut' }}
                style={{ height: '100%', background: pct === 100 ? `linear-gradient(90deg,${T},${T2})` : cfg.color, borderRadius: 99 }}
              />
            </div>
          </div>
        )}

        {done && (
          <div style={{ marginTop: 10, padding: '7px 12px', borderRadius: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎉</span>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', margin: 0, fontFamily: FONT }}>Order completed!</p>
          </div>
        )}

        {cancelled && (
          <div style={{ marginTop: 10, padding: '7px 12px', borderRadius: 9, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>✕</span>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', margin: 0, fontFamily: FONT }}>Order cancelled</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 9, borderTop: '1px solid #f8fafc' }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: FONT }}>
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T, fontFamily: FONT }}>View details →</span>
        </div>
      </div>
    </motion.div>
  );
}

function orderEmptyCopy(search, tab) {
  const isBlank  = tab === 'all' && !search;
  const headline = search        ? `No results for "${search}"`
                 : tab !== 'all' ? `No ${S[tab]?.label ?? tab} orders`
                 :                 "You haven't placed an order yet";
  const sub = isBlank
    ? 'Design your uniform and place your first order — it takes 2 minutes.'
    : 'Try a different filter or clear your search.';
  return { isBlank, headline, sub };
}

export default function CustomerOrders() {
  const nav = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('all');
  const [search,  setSearch]  = useState('');

  const load = useCallback((force = false) => {
    if (force) cacheClear('orders_list');
    const cached = cacheGet('orders_list');
    if (cached) { setOrders(cached); setLoading(false); return; }

    setLoading(true);
    axios.get('/api/customer/orders')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setOrders(list);
        cacheSet('orders_list', list, TTL?.ORDERS ?? 30_000);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() =>
    orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {}),
  [orders]);

  const filtered = useMemo(() =>
    orders.filter(o => {
      const mt = tab === 'all' || o.status === tab;
      const q  = search.toLowerCase().trim();
      const mq = !q
        || String(o.order_id).includes(q)
        || o.design?.design_name?.toLowerCase().includes(q)
        || o.garment_type?.toLowerCase().includes(q)
        || o.color?.toLowerCase().includes(q)
        || o.client_design_notes?.toLowerCase().includes(q);
      return mt && mq;
    }),
  [orders, tab, search]);

  const visibleTabs = ALL_TABS.filter(s => s === 'all' || (counts[s] ?? 0) > 0);

  return (
    <>
      <style>{`
        @keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .tab-sc{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
        .tab-sc::-webkit-scrollbar{display:none;}
        .ord-card:focus-visible{outline:2.5px solid ${T};outline-offset:2px;}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
          clip:rect(0,0,0,0);white-space:nowrap;border:0;}
        @media (prefers-reduced-motion: reduce){
          .ord-card, .ord-card *{animation-duration:.01ms!important;transition-duration:.01ms!important;}
        }

        .co-head{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin-bottom:20px;}
        .co-head-btn{width:100%;justify-content:center;}

        .ord-grid{display:grid;grid-template-columns:1fr;gap:12px;}
        .co-empty{padding:40px 18px 32px;}

        @media(min-width:640px){
          .co-head{flex-direction:row;justify-content:space-between;align-items:flex-start;}
          .co-head-btn{width:auto;}
          .ord-grid{grid-template-columns:repeat(2,1fr);gap:14px;}
          .co-empty{padding:52px 24px 44px;}
        }
        @media(min-width:1024px){ .ord-grid{grid-template-columns:repeat(3,1fr);} }
        @media(min-width:1440px){ .ord-grid{grid-template-columns:repeat(4,1fr);gap:18px;} }
      `}</style>

      <div className="co-head">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontFamily: FONT }}>My Orders</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontFamily: FONT }}>
            {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''} total` : 'No orders yet'}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }}
          onClick={() => nav('/order/create')}
          className="co-head-btn"
          style={{
            padding: '10px 22px', borderRadius: 11, border: 'none',
            background: `linear-gradient(135deg,${T},${T2})`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT,
            boxShadow: `0 4px 14px rgba(2,128,144,.3)`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <NavIcon name="add" size={14} color="#fff"/> New Order
        </motion.button>
      </div>

      <label htmlFor="order-search" className="sr-only">Search orders</label>
      <input
        id="order-search"
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by order ID, color, garment type…"
        style={{
          width: '100%', padding: '10px 16px', borderRadius: 11,
          border: '1px solid #e2e8f0', background: '#fff',
          color: '#0f172a', fontSize: 13, outline: 'none',
          fontFamily: FONT, marginBottom: 14, boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px rgba(2,128,144,.1)`; }}
        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
      />

      <div className="tab-sc" role="group" aria-label="Filter orders by status" style={{ marginBottom: 18 }}>
        {visibleTabs.map(s => {
          const cfg = S[s];
          const act = tab === s;
          const cnt = s === 'all' ? orders.length : (counts[s] ?? 0);
          return (
            <button key={s} onClick={() => setTab(s)} aria-pressed={act}
              style={{
                padding: '7px 13px', borderRadius: 9, whiteSpace: 'nowrap',
                border: `1px solid ${act ? (cfg?.color ?? T) + '40' : '#e2e8f0'}`,
                background: act ? (cfg?.bg ?? '#f0fdfa') : '#fff',
                color: act ? (cfg?.color ?? T) : '#64748b',
                fontSize: 11, fontWeight: act ? 700 : 500,
                cursor: 'pointer', fontFamily: FONT, transition: 'all .14s',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {s === 'all' ? 'All' : <><NavIcon name={cfg?.icon ?? 'orders'} size={11} color={act ? (cfg?.color ?? T) : '#64748b'}/> {cfg?.label ?? s}</>}
              {cnt > 0 && <span style={{ marginLeft: 5, fontSize: 9, opacity: .7 }}>({cnt})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="ord-grid">
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ ...SK, height: 7, borderRadius: 0 }}/>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ ...SK, height: 10, width: '35%', marginBottom: 8 }}/>
                <div style={{ ...SK, height: 15, width: '65%', marginBottom: 14 }}/>
                <div style={{ ...SK, height: 8,  width: '80%', marginBottom: 10 }}/>
                <div style={{ ...SK, height: 4 }}/>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        (() => { const ec = orderEmptyCopy(search, tab); return (
          <EmptyState illustration="order" headline={ec.headline} sub={ec.sub}
            cta={ec.isBlank ? { label:'🎨 Start Designing →', onClick:() => nav('/order/create') } : null}/>
        ); })()
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="ord-grid">
            {filtered.map(o => (
              <motion.div key={o.order_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: .18 }}>
                <OrderCard order={o} onClick={() => nav(`/orders/${o.order_id}`)}/>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </>
  );
}
