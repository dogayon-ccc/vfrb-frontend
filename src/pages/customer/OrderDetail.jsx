// src/pages/customer/OrderDetail.jsx
// FF-2 Step 9 — Customer Order Detail
//
// SCHEMA (locked — never deviate):
//   orders.order_id, status, garment_type, quantity_ordered, color,
//   collar_type, sleeve_type, pocket_type, studio_config JSON,
//   ai_recommendation_status ENUM(not_requested|generating|ready|accepted|rejected|failed),
//   target_delivery_date, po_reference, qc_required, qc_passed_at
//   delivery_tracking.delivery_status (NOT .status)
//   order_messages.body (NOT .message), message_id, sender_id
//   material_recommendations.estimated_range, customer_accepted
//
// FEATURES:
//   7-stage animated pipeline (horizontal desktop, vertical mobile)
//   Framer Motion width-animate progress bar
//   AI recommendation card (accept/reject — optimistic UI)
//   Delivery tracking section (delivery_status column)
//   Message thread preview (last 3 msgs) + "Open chat" link
//   Order spec grid (garment_type, color, collar, sleeve, pocket, qty)
//   Caching: cacheGet('order_detail_'+id) 30s TTL
//   cacheClear on AI accept/reject
//
// DSA annotations:
//   STATUS_SEQ indexOf:     O(10) = O(1) for fixed-size enum array
//   Stage pipeline render:  O(7) = O(1) for fixed STAGES array
//   parseStudioColors:      O(1) — single JSON.parse + property access
//   AI accept optimistic:   O(1) — single object spread
//   delivery_status map:    O(1) hash map lookup

import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { cacheGet, cacheSet, cacheClear }    from '../../utils/cache';
import { getStorageUrl, isImageFile }        from '../../utils/fileUrl';

const GarmentPreview3D = lazy(() => import('../../components/GarmentPreview3D'));

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

// ── 7-stage production sequence ───────────────────────────────────────────────
// DSA: ordered array — O(7) linear scan with fixed upper bound = O(1)
const STAGES = [
  { key:'pattern',     label:'Pattern',     icon:'📐' },
  { key:'segregation', label:'Segregation', icon:'🗂️' },
  { key:'cutting',     label:'Cutting',     icon:'✂️' },
  { key:'sewing',      label:'Sewing',      icon:'🧵' },
  { key:'qc',          label:'QC',          icon:'🔍' },
  { key:'pressing',    label:'Pressing',    icon:'🔧' },
  { key:'packing',     label:'Packing',     icon:'📦' },
];

// DSA: ordered array — O(10) indexOf, fixed bound = O(1)
const STATUS_SEQ = [
  'pending','confirmed',
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
  'completed',
];

// DSA: object as hash map — O(1) status → style config
const S = {
  pending:     { color:'#f59e0b', bg:'#fef3c7', label:'Pending',     icon:'⏳' },
  confirmed:   { color:'#3b82f6', bg:'#dbeafe', label:'Confirmed',   icon:'✅' },
  pattern:     { color:'#8b5cf6', bg:'#ede9fe', label:'Pattern',     icon:'📐' },
  segregation: { color:'#a78bfa', bg:'#f5f3ff', label:'Segregation', icon:'🗂️' },
  cutting:     { color:'#6366f1', bg:'#e0e7ff', label:'Cutting',     icon:'✂️' },
  sewing:      { color:'#06b6d4', bg:'#cffafe', label:'Sewing',      icon:'🧵' },
  qc:          { color:'#f97316', bg:'#ffedd5', label:'QC',          icon:'🔍' },
  pressing:    { color:'#ec4899', bg:'#fce7f3', label:'Pressing',    icon:'🔧' },
  packing:     { color:'#f472b6', bg:'#fdf2f8', label:'Packing',     icon:'📦' },
  completed:   { color:'#22c55e', bg:'#dcfce7', label:'Completed',   icon:'🎉' },
  cancelled:   { color:'#ef4444', bg:'#fee2e2', label:'Cancelled',   icon:'✕'  },
};

// DSA: hash map for delivery status display — O(1) lookup
const DELIVERY_CFG = {
  preparing:  { label:'Preparing',  color:'#f59e0b', icon:'📦' },
  dispatched: { label:'Dispatched', color:'#3b82f6', icon:'🚀' },
  in_transit: { label:'In Transit', color:'#8b5cf6', icon:'🚚' },
  delivered:  { label:'Delivered',  color:'#22c55e', icon:'✅' },
  returned:   { label:'Returned',   color:'#ef4444', icon:'↩️' },
};

// Skeleton style
const SK = {
  borderRadius: 6,
  background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize: '400px',
  animation: 'sk 1.4s infinite',
};

// ── Parse studio colors — O(1) ────────────────────────────────────────────────
function parseStudioColors(order) {
  try {
    const raw = order?.studio_config;
    if (!raw) return null;
    const cfg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return cfg?.colors ?? null;
  } catch { return null; }
}

// ── Swatch bar ────────────────────────────────────────────────────────────────
function SwatchBar({ order, height = 6 }) {
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
        <div style={{ display:'flex', height, overflow:'hidden' }}>
          {stops.map((s, i) => (
            <div key={i} style={{ flex:s.flex, background:s.color }}/>
          ))}
        </div>
      );
    }
  }
  const hex = order?.color ?? T;
  return (
    <div style={{
      height,
      background: /^#[0-9a-f]{3,6}$/i.test(hex) ? hex : T,
    }}/>
  );
}

// ── Stage dot for the pipeline ────────────────────────────────────────────────
function StageDot({ stage, currentStatus, isMobile }) {
  const sIdx   = STATUS_SEQ.indexOf(stage.key);
  const curIdx = STATUS_SEQ.indexOf(currentStatus);
  const done   = sIdx <  curIdx;
  const active = stage.key === currentStatus;
  const sz     = isMobile ? 34 : 44;

  return (
    <div style={{
      display:'flex',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems:'center',
      gap: isMobile ? 10 : 6,
      flex: isMobile ? 'none' : 1,
    }}>
      <motion.div
        initial={false}
        animate={{
          boxShadow: active ? `0 0 0 4px rgba(2,128,144,.18)` : 'none',
        }}
        style={{
          width:sz, height:sz, borderRadius:'50%', flexShrink:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: isMobile ? 14 : 18,
          background: done   ? '#dcfce7'
                    : active ? `linear-gradient(135deg,${T},${T2})`
                    :           '#f1f5f9',
          border: done   ? '2px solid #22c55e'
                : active ? 'none'
                :           '2px solid #e2e8f0',
          color: done ? '#22c55e' : active ? '#fff' : '#94a3b8',
          position:'relative',
          transition:'all .3s',
        }}
      >
        {done ? '✓' : stage.icon}

        {/* Active pulse ring */}
        {active && (
          <motion.div
            animate={{ scale:[1,1.55,1], opacity:[0.4,0,0.4] }}
            transition={{ duration:1.8, repeat:Infinity }}
            style={{
              position:'absolute', inset:-4, borderRadius:'50%',
              border:`2px solid ${T2}`, pointerEvents:'none',
            }}
          />
        )}
      </motion.div>

      {/* Label */}
      <div style={{ textAlign: isMobile ? 'left' : 'center', minWidth:0 }}>
        <p style={{
          fontSize: isMobile ? 12 : 9,
          fontWeight: active ? 800 : done ? 600 : 400,
          color: done ? '#22c55e' : active ? T : '#94a3b8',
          margin:0, fontFamily:FONT,
          whiteSpace: isMobile ? 'nowrap' : 'normal',
        }}>
          {stage.label}
        </p>
        {active && isMobile && (
          <p style={{ fontSize:10, color:T2, margin:'2px 0 0', fontFamily:FONT }}>
            In progress
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CustomerOrderDetail() {
  const { id }  = useParams();
  const nav     = useNavigate();
  const orderId = id;

  const [order,    setOrder]    = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiRec,    setAiRec]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [aiAction, setAiAction] = useState(null);
  const [toast,    setToast]    = useState(null);

  // Responsive — updates on resize
  const [winW, setWinW] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = winW <= 767;

  const CACHE_KEY = `order_detail_${orderId}`;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load: 4 concurrent requests via Promise.allSettled ────────────────────
  // DSA: parallel execution — O(max(t1,t2,t3,t4)) not O(t1+t2+t3+t4)
  const load = useCallback(async (force = false) => {
    if (!orderId) return;
    if (!force) {
      const cached = cacheGet(CACHE_KEY);
      if (cached) {
        setOrder(cached.order);
        setDelivery(cached.delivery);
        setMessages(cached.messages);
        setAiRec(cached.aiRec);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const [o, d, m, a] = await Promise.allSettled([
        axios.get(`/api/customer/orders/${orderId}`),
        axios.get(`/api/customer/delivery/${orderId}`),
        axios.get(`/api/customer/messages/${orderId}?per_page=3`),
        axios.get(`/api/customer/orders/${orderId}/ai-recommendation`),
      ]);
      const orderData = o.status === 'fulfilled' ? (o.value.data?.order   ?? o.value.data)   : null;
      const delivData = d.status === 'fulfilled' ? (d.value.data?.delivery ?? d.value.data)  : null;
      const msgsData  = m.status === 'fulfilled' ? (m.value.data?.messages ?? m.value.data?.data ?? m.value.data ?? []) : [];
      const aiData    = a.status === 'fulfilled' ? (a.value.data?.recommendation ?? a.value.data) : null;

      setOrder(orderData);
      setDelivery(delivData);
      setMessages(Array.isArray(msgsData) ? msgsData : []);
      setAiRec(aiData);
      cacheSet(CACHE_KEY, {
        order: orderData, delivery: delivData,
        messages: msgsData, aiRec: aiData,
      }, 30_000);
    } finally {
      setLoading(false);
    }
  }, [orderId, CACHE_KEY]);

  useEffect(() => { load(); }, [load]);

  // ── Derived state — all O(1) ───────────────────────────────────────────────
  const status    = order?.status ?? 'pending';
  const curIdx    = STATUS_SEQ.indexOf(status);            // O(10) = O(1)
  const stageIdx  = STAGES.findIndex(s => s.key === status); // O(7) = O(1)
  const pct       = curIdx >= 0
    ? Math.round((curIdx / (STATUS_SEQ.length - 1)) * 100)
    : 0;
  const isInProd  = STAGES.some(s => s.key === status);

  // Pipeline connector fill — only STAGES portion
  const connPct = stageIdx >= 0
    ? Math.round((stageIdx / (STAGES.length - 1)) * 100)
    : 0;

  // Spec rows for the info grid
  const specs = [
    { label:'Garment Type', value: order?.garment_type ?? '—'              },
    { label:'Color',        value: order?.color ?? '—'                      },
    { label:'Quantity',     value: order?.quantity_ordered
        ? `${order.quantity_ordered} pcs` : '—'                            },
    { label:'Collar',       value: order?.collar_type ?? '—'                },
    { label:'Sleeve',       value: order?.sleeve_type ?? '—'                },
    { label:'Pocket',       value: order?.pocket_type ?? '—'                },
    { label:'Order Type',   value: order?.order_type ?? '—'                 },
    { label:'Payment',      value: order?.payment_terms ?? '—'              },
    { label:'PO Reference', value: order?.po_reference ?? 'N/A'             },
    { label:'Delivery',     value: order?.target_delivery_date
        ? new Date(order.target_delivery_date).toLocaleDateString('en-PH',{
            year:'numeric', month:'long', day:'numeric',
          })
        : '—'
    },
  ];

  // ── AI recommendation — optimistic UI — O(1) ─────────────────────────────
  const handleAI = useCallback(async (action) => {
    if (!aiRec || !orderId) return;
    const prev = aiRec;
    setAiAction(action);
    setAiRec(r => ({ ...r, customer_accepted: action === 'accept' ? 1 : 0 }));
    setOrder(o => ({
      ...o,
      ai_recommendation_status: action === 'accept' ? 'accepted' : 'rejected',
    }));
    cacheClear(CACHE_KEY, 'orders_list');
    try {
      if (action === 'accept') {
        await axios.post(`/api/customer/orders/${orderId}/accept-materials`);
        showToast('AI recommendation accepted! Staff have been notified.');
      } else {
        await axios.post(`/api/customer/orders/${orderId}/reject-materials`);
        showToast('Recommendation declined.', 'info');
      }
    } catch (e) {
      setAiRec(prev);
      setOrder(o => ({
        ...o,
        ai_recommendation_status: prev.customer_accepted === 1 ? 'accepted' : 'ready',
      }));
      showToast(e.response?.data?.message ?? 'Action failed. Please retry.', 'error');
    } finally {
      setAiAction(null);
    }
  }, [aiRec, CACHE_KEY]);

  // Current user id (to identify own messages)
  const meId = (() => {
    try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').user_id; }
    catch { return null; }
  })();

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      <div style={{ maxWidth:780, margin:'0 auto' }}>
        <div style={{ ...SK, height:22, width:'50%', marginBottom:10 }}/>
        <div style={{ ...SK, height:10, width:'35%', marginBottom:24 }}/>
        <div style={{ ...SK, height:7, marginBottom:20 }}/>
        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {Array(7).fill(0).map((_,i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <div style={{ ...SK, width:44, height:44, borderRadius:'50%' }}/>
              <div style={{ ...SK, height:8, width:40 }}/>
            </div>
          ))}
        </div>
        {[120,90,80].map((h,i) => (
          <div key={i} style={{ ...SK, height:h, marginBottom:14, borderRadius:14 }}/>
        ))}
      </div>
    </>
  );

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!order) return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <p style={{ fontSize:36, margin:'0 0 12px', opacity:.2 }}>🔍</p>
      <p style={{ fontSize:15, fontWeight:700, color:'#475569', fontFamily:FONT }}>
        Order not found
      </p>
      <button onClick={() => nav('/customer/orders')} style={{
        marginTop:16, padding:'10px 22px', borderRadius:10, border:'none',
        background:T, color:'#fff', fontSize:13, fontWeight:700,
        cursor:'pointer', fontFamily:FONT,
      }}>
        ← Back to Orders
      </button>
    </div>
  );

  const cfg = S[status] ?? S.pending;

  return (
    <>
      <style>{`
        @keyframes sk  { 0%   { background-position:-400px 0 } 100%{ background-position:400px 0 } }
        @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:.3 } }

        .od-spec-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px,1fr));
          gap: 10px;
        }
        @media (max-width:540px) {
          .od-spec-grid { grid-template-columns: 1fr 1fr; }
        }

        /* Desktop: horizontal pipeline, hide vertical */
        .od-pipeline-h { display: flex; }
        .od-pipeline-v { display: none; }
        @media (max-width:640px) {
          .od-pipeline-h { display: none; }
          .od-pipeline-v { display: flex; flex-direction: column; }
        }

        .od-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,.05);
          margin-bottom: 14px;
          overflow: hidden;
        }
        .od-card-body { padding: 18px 20px; }
        @media (max-width:767px) {
          .od-card-body { padding: 14px 16px; }
          .od-card { border-radius: 12px; }
        }

        .od-section-title {
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: .07em;
          color: #94a3b8; margin: 0 0 14px;
        }
      `}</style>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0  }}
            exit={{    opacity:0, y:10  }}
            style={{
              position:'fixed', bottom:24, right:24, zIndex:9999,
              padding:'11px 18px', borderRadius:11, fontFamily:FONT,
              background: toast.type === 'error' ? '#ef4444'
                        : toast.type === 'info'  ? '#3b82f6'
                        :                           T2,
              color:'#fff', fontWeight:700, fontSize:12,
              boxShadow:'0 6px 20px rgba(0,0,0,.15)',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth:780, margin:'0 auto' }}>

        {/* ── Back + header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <button onClick={() => nav('/customer/orders')} style={{
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'6px 12px', borderRadius:8,
            border:'1px solid #e2e8f0', background:'#f8fafc',
            color:'#64748b', fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:FONT, marginBottom:14,
          }}>
            ← My Orders
          </button>

          <div style={{
            display:'flex', justifyContent:'space-between',
            alignItems:'flex-start', gap:12, flexWrap:'wrap',
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? 20 : 24,
                fontWeight:800, color:'#0f172a',
                margin:'0 0 6px', fontFamily:FONT,
              }}>
                Order #{orderId}
              </h1>
              <p style={{ fontSize:13, color:'#64748b', margin:0, fontFamily:FONT }}>
                {order.garment_type ?? 'Custom Order'}
                {order.quantity_ordered ? ` · ${order.quantity_ordered} pcs` : ''}
                {order.color ? ` · ${order.color}` : ''}
              </p>
            </div>
            {/* Status badge */}
            <span style={{
              padding:'6px 14px', borderRadius:99, fontSize:11, fontWeight:700,
              background:cfg.bg, color:cfg.color,
              border:`1px solid ${cfg.color}30`, whiteSpace:'nowrap', flexShrink:0,
            }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
        </div>

        {/* ── Swatch bar ────────────────────────────────────────────────── */}
        <div style={{ borderRadius:12, overflow:'hidden', marginBottom:14 }}>
          <SwatchBar order={order} height={8}/>
        </div>

        {/* ── Overall progress bar ──────────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{
            display:'flex', justifyContent:'space-between', marginBottom:7,
          }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', fontFamily:FONT }}>
              Production Progress
            </span>
            <span style={{ fontSize:12, fontWeight:800, color:T, fontFamily:FONT }}>
              {pct}%
            </span>
          </div>
          <div style={{ height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${pct}%` }}
              transition={{ duration:.9, ease:'easeOut' }}
              style={{
                height:'100%', borderRadius:99,
                background:`linear-gradient(90deg,${T},${T2})`,
              }}
            />
          </div>
        </div>

        {/* ── DESKTOP: horizontal 7-stage pipeline ──────────────────────── */}
        <div className="od-card">
          <div className="od-card-body od-pipeline-h" style={{
            gap:0, position:'relative', alignItems:'flex-start',
          }}>
            {/* Connector line */}
            <div style={{
              position:'absolute', top:22, left:'5%', right:'5%',
              height:2, background:'#e2e8f0', zIndex:0,
            }}>
              <motion.div
                initial={{ width:0 }}
                animate={{ width:`${connPct}%` }}
                transition={{ duration:.9, ease:'easeOut' }}
                style={{
                  height:'100%',
                  background:`linear-gradient(90deg,${T},${T2})`,
                }}
              />
            </div>
            {STAGES.map(stage => (
              <div key={stage.key} style={{ flex:1, zIndex:1, position:'relative' }}>
                <StageDot stage={stage} currentStatus={status} isMobile={false}/>
              </div>
            ))}
          </div>

          {/* Active stage strip */}
          {isInProd && (
            <div style={{
              borderTop:'1px solid #f1f5f9', padding:'10px 20px',
              background:'#f0fdfa',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <div style={{
                width:8, height:8, borderRadius:'50%',
                background:T2, flexShrink:0,
                animation:'pulse 1.6s ease-in-out infinite',
              }}/>
              <p style={{ fontSize:12, fontWeight:600, color:T, margin:0, fontFamily:FONT }}>
                Currently: <strong>
                  {STAGES.find(s => s.key === status)?.label ?? status}
                </strong> — Your order is in active production.
              </p>
            </div>
          )}
        </div>

        {/* ── MOBILE: vertical pipeline ─────────────────────────────────── */}
        <div className="od-card">
          <div className="od-card-body od-pipeline-v" style={{
            gap:0, position:'relative',
          }}>
            {/* Vertical connector */}
            <div style={{
              position:'absolute', top:'5%', bottom:'5%', left:17,
              width:2, background:'#e2e8f0', zIndex:0,
            }}>
              <motion.div
                initial={{ height:0 }}
                animate={{ height:`${connPct}%` }}
                transition={{ duration:.9, ease:'easeOut' }}
                style={{
                  width:'100%',
                  background:`linear-gradient(180deg,${T},${T2})`,
                }}
              />
            </div>
            {STAGES.map((stage, i) => (
              <div key={stage.key}
                style={{
                  zIndex:1, position:'relative',
                  paddingBottom: i < STAGES.length - 1 ? 18 : 0,
                }}>
                <StageDot stage={stage} currentStatus={status} isMobile/>
              </div>
            ))}
          </div>
        </div>

        {/* ── Order specs grid ──────────────────────────────────────────── */}
        <div className="od-card">
          <div className="od-card-body">
            <p className="od-section-title" style={{ fontFamily:FONT }}>
              Order Specifications
            </p>
            <div className="od-spec-grid">
              {specs.filter(s => s.value && s.value !== '—').map(spec => (
                <div key={spec.label} style={{
                  background:'#f8fafc', borderRadius:10,
                  padding:'10px 12px', border:'1px solid #f1f5f9',
                }}>
                  <p style={{
                    fontSize:9, fontWeight:700, color:'#94a3b8',
                    textTransform:'uppercase', letterSpacing:'.07em',
                    margin:'0 0 4px', fontFamily:FONT,
                  }}>
                    {spec.label}
                  </p>
                  <p style={{
                    fontSize:13, fontWeight:600, color:'#0f172a',
                    margin:0, fontFamily:FONT, textTransform:'capitalize',
                  }}>
                    {spec.label === 'Color' && /^#[0-9a-f]{3,6}$/i.test(spec.value) ? (
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{
                          width:14, height:14, borderRadius:3, flexShrink:0,
                          background:spec.value, border:'1px solid rgba(0,0,0,.1)',
                        }}/>
                        {spec.value}
                      </span>
                    ) : spec.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3D design preview — NEW (Aug 10 2026) ────────────────────────
             Was never rendered anywhere on this page before, for ANY
             order — Design Studio or reference-photo. Now shows the real
             studio_config when it exists, or falls back to the saved
             reference image as a texture on the body mesh (same synthetic-
             cfg pattern as OrderWizard's review step) when it doesn't. */}
        {(order.studio_config || (order.client_design_ref_file && isImageFile(order.client_design_ref_file))) && (
          <div className="od-card">
            <div className="od-card-body">
              <p className="od-section-title" style={{ fontFamily:FONT }}>
                Design Preview
              </p>
              <Suspense fallback={
                <div style={{ height:220, background:'#f8fafc', borderRadius:10,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <p style={{ color:'#94a3b8', fontSize:12, fontFamily:FONT }}>
                    Loading preview…
                  </p>
                </div>
              }>
                <GarmentPreview3D
                  cfg={order.studio_config ?? { garmentType: order.garment_type }}
                  height={220} autoRotate={true} showLabel={true}
                  referenceImageUrl={
                    !order.studio_config ? getStorageUrl(order.client_design_ref_file) : null
                  }
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* ── Reference file — NEW (Aug 10 2026) ──────────────────────────
             The upload itself was fixed this session (was silently
             discarded due to a field-name mismatch between the frontend
             and OrderController::customerStore). This is the other half —
             actually showing it once it's saved. Requires the backend's
             storage symlink (php artisan storage:link) to be set up, or
             this image/link will 404 even though the file really is
             sitting in storage/app/public/design-refs/. */}
        {order.client_design_ref_file && (
          <div className="od-card">
            <div className="od-card-body">
              <p className="od-section-title" style={{ fontFamily:FONT }}>
                Reference File
              </p>
              {isImageFile(order.client_design_ref_file) ? (
                <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', borderRadius:10, overflow:'hidden',
                    border:'1px solid #e2e8f0', maxWidth:280, textDecoration:'none' }}>
                  <img src={getStorageUrl(order.client_design_ref_file)} alt="Customer reference"
                    style={{ width:'100%', display:'block' }}
                    onError={e => { e.target.style.display='none'; }}/>
                </a>
              ) : (
                <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:8,
                    padding:'10px 16px', borderRadius:10, background:'#f0fdfa',
                    border:'1px solid #99f6e4', color:'var(--teal)', fontSize:13,
                    fontWeight:700, fontFamily:FONT, textDecoration:'none' }}>
                  📄 View Reference PDF
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── AI Recommendation card ────────────────────────────────────── */}
        {aiRec && ['ready','accepted','rejected'].includes(order.ai_recommendation_status) && (
          <motion.div
            initial={{ opacity:0, y:10 }}
            animate={{ opacity:1, y:0 }}
            className="od-card"
          >
            <div className="od-card-body">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,#7c3aed,#a78bfa)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14,
                }}>
                  🤖
                </div>
                <div style={{ flex:1 }}>
                  <p className="od-section-title" style={{ margin:'0 0 2px', fontFamily:FONT }}>
                    AI Material Recommendation
                  </p>
                  <p style={{ fontSize:11, color:'#64748b', margin:0, fontFamily:FONT }}>
                    Based on VFRB production standards
                  </p>
                </div>
                {order.ai_recommendation_status === 'accepted' && (
                  <span style={{
                    padding:'3px 10px', borderRadius:99, fontSize:10,
                    fontWeight:700, flexShrink:0,
                    background:'#dcfce7', color:'#16a34a',
                  }}>
                    ✓ Accepted
                  </span>
                )}
                {order.ai_recommendation_status === 'rejected' && (
                  <span style={{
                    padding:'3px 10px', borderRadius:99, fontSize:10,
                    fontWeight:700, flexShrink:0,
                    background:'#fee2e2', color:'#dc2626',
                  }}>
                    Declined
                  </span>
                )}
              </div>

              {order.ai_recommendation_status === 'rejected' && (
                <div style={{ padding:'10px 12px', borderRadius:9, background:'#f8fafc',
                  border:'1px solid #e2e8f0', marginBottom:14, display:'flex',
                  alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <span style={{ fontSize:11, color:'#64748b', fontFamily:FONT }}>
                    VFRB staff has been notified. Want to pick materials yourself instead?
                  </span>
                  <button onClick={() => nav('/customer/ai-materials')}
                    style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #e2e8f0',
                      background:'#fff', color:'#0f172a', fontSize:11, fontWeight:700,
                      cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap', flexShrink:0 }}>
                    ✋ Choose Myself
                  </button>
                </div>
              )}

              {/* Materials breakdown */}
              {aiRec.materials_json && (() => {
                try {
                  const mats = typeof aiRec.materials_json === 'string'
                    ? JSON.parse(aiRec.materials_json)
                    : aiRec.materials_json;
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                      {Object.entries(mats).map(([mat, info]) => (
                        <div key={mat} style={{
                          display:'flex', justifyContent:'space-between',
                          alignItems:'center', padding:'8px 12px',
                          background:'#f8fafc', borderRadius:9,
                          border:'1px solid #f1f5f9',
                        }}>
                          <span style={{
                            fontSize:12, fontWeight:600, color:'#0f172a',
                            textTransform:'capitalize', fontFamily:FONT,
                          }}>
                            {mat}
                          </span>
                          <span style={{ fontSize:11, fontWeight:700, color:T, fontFamily:FONT }}>
                            {typeof info === 'object'
                              ? (info.estimated_range ?? info.range ?? '—')
                              : info}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Total range — estimated_range column */}
              {aiRec.total_estimated_range && (
                <div style={{
                  padding:'10px 14px', background:`${T}10`,
                  border:`1px solid ${T}20`, borderRadius:9, marginBottom:14,
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <span style={{ fontSize:12, fontWeight:700, color:T, fontFamily:FONT }}>
                    Total Estimate
                  </span>
                  <span style={{ fontSize:13, fontWeight:800, color:T, fontFamily:FONT }}>
                    {aiRec.total_estimated_range}
                  </span>
                </div>
              )}

              {/* Narrative notes */}
              {aiRec.notes && (
                <p style={{
                  fontSize:12, color:'#64748b', lineHeight:1.7,
                  margin:'0 0 14px', fontFamily:FONT,
                }}>
                  {aiRec.notes}
                </p>
              )}

              {/* Accept / Reject — only when status is 'ready' */}
              {order.ai_recommendation_status === 'ready' && (
                <div style={{ display:'flex', gap:8 }}>
                  <motion.button
                    whileTap={{ scale:.97 }}
                    onClick={() => handleAI('accept')}
                    disabled={!!aiAction}
                    style={{
                      flex:1, padding:'10px', borderRadius:10, border:'none',
                      background: aiAction ? '#94a3b8'
                        : `linear-gradient(135deg,${T},${T2})`,
                      color:'#fff', fontSize:12, fontWeight:700,
                      cursor: aiAction ? 'not-allowed' : 'pointer',
                      fontFamily:FONT, minHeight:44,
                    }}
                  >
                    {aiAction === 'accept' ? '…' : '✓ Accept Recommendation'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale:.97 }}
                    onClick={() => handleAI('reject')}
                    disabled={!!aiAction}
                    style={{
                      flex:1, padding:'10px', borderRadius:10,
                      border:'1px solid #fecaca', background:'#fff',
                      color:'#dc2626', fontSize:12, fontWeight:700,
                      cursor: aiAction ? 'not-allowed' : 'pointer',
                      fontFamily:FONT, minHeight:44,
                    }}
                  >
                    {aiAction === 'reject' ? '…' : 'Decline'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Delivery tracking ─────────────────────────────────────────── */}
        {delivery && (
          <div className="od-card">
            <div className="od-card-body">
              <p className="od-section-title" style={{ fontFamily:FONT }}>
                Delivery Tracking
              </p>
              {(() => {
                // delivery_status column — NOT .status (locked schema rule)
                const ds   = delivery.delivery_status;
                const dcfg = DELIVERY_CFG[ds] ?? { label:ds, color:'#64748b', icon:'📦' };
                return (
                  <div>
                    <div style={{
                      display:'flex', justifyContent:'space-between',
                      alignItems:'center', marginBottom:12,
                    }}>
                      <span style={{
                        padding:'4px 12px', borderRadius:99,
                        fontSize:11, fontWeight:700,
                        background:`${dcfg.color}15`, color:dcfg.color,
                        border:`1px solid ${dcfg.color}25`,
                      }}>
                        {dcfg.icon} {dcfg.label}
                      </span>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[
                        { l:'Method',        v: delivery.delivery_method      },
                        { l:'Courier',       v: delivery.courier_name         },
                        { l:'Tracking #',    v: delivery.tracking_number      },
                        { l:'Address',       v: delivery.delivery_address     },
                        { l:'Est. Delivery', v: delivery.estimated_delivery_date
                            ? new Date(delivery.estimated_delivery_date)
                                .toLocaleDateString('en-PH',{
                                  year:'numeric', month:'long', day:'numeric',
                                })
                            : null
                        },
                      ].filter(r => r.v).map(row => (
                        <div key={row.l} style={{
                          display:'flex', gap:10,
                          padding:'7px 10px', background:'#f8fafc',
                          borderRadius:8, border:'1px solid #f1f5f9',
                        }}>
                          <span style={{
                            fontSize:11, fontWeight:700, color:'#94a3b8',
                            minWidth:90, flexShrink:0, fontFamily:FONT,
                          }}>
                            {row.l}
                          </span>
                          <span style={{ fontSize:12, color:'#0f172a', fontFamily:FONT }}>
                            {row.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Messages preview ──────────────────────────────────────────── */}
        <div className="od-card">
          <div className="od-card-body">
            <div style={{
              display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:14,
            }}>
              <p className="od-section-title" style={{ margin:0, fontFamily:FONT }}>
                Messages
              </p>
              <button
                onClick={() => nav('/customer/messages')}
                style={{
                  padding:'5px 12px', borderRadius:8,
                  border:`1px solid ${T}30`, background:`${T}08`,
                  color:T, fontSize:11, fontWeight:700,
                  cursor:'pointer', fontFamily:FONT,
                }}
              >
                Open Chat →
              </button>
            </div>

            {messages.length === 0 ? (
              <p style={{
                fontSize:12, color:'#94a3b8', textAlign:'center',
                padding:'12px 0', fontFamily:FONT,
              }}>
                No messages yet — chat with VFRB staff
              </p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {messages.slice(0, 3).map(msg => {
                  const isMe = msg.sender_id === meId;
                  return (
                    <div key={msg.message_id} style={{
                      display:'flex',
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth:'72%', padding:'8px 12px',
                        borderRadius: isMe
                          ? '12px 2px 12px 12px'
                          : '2px 12px 12px 12px',
                        background: isMe ? `${T}15` : '#f1f5f9',
                        border:`1px solid ${isMe ? `${T}25` : '#e2e8f0'}`,
                      }}>
                        {/* body column — order_messages schema */}
                        <p style={{
                          fontSize:12, color:'#0f172a', margin:0,
                          lineHeight:1.5, fontFamily:FONT,
                        }}>
                          {msg.body}
                        </p>
                        <p style={{
                          fontSize:9, color:'#94a3b8',
                          margin:'4px 0 0', textAlign:'right', fontFamily:FONT,
                        }}>
                          {msg.created_at
                            ? new Date(msg.created_at).toLocaleTimeString('en-PH',{
                                hour:'2-digit', minute:'2-digit',
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length > 3 && (
                  <p style={{
                    fontSize:11, color:'#94a3b8', textAlign:'center',
                    margin:0, fontFamily:FONT,
                  }}>
                    +{messages.length - 3} more →
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Completed / Cancelled banners ─────────────────────────────── */}
        {status === 'completed' && (
          <motion.div
            initial={{ opacity:0, scale:.97 }}
            animate={{ opacity:1, scale:1 }}
            style={{
              padding:'20px', borderRadius:16, textAlign:'center',
              background:'#f0fdf4', border:'1px solid #bbf7d0', marginBottom:14,
            }}
          >
            <p style={{ fontSize:32, margin:'0 0 8px' }}>🎉</p>
            <p style={{ fontSize:15, fontWeight:800, color:'#166534', margin:0, fontFamily:FONT }}>
              Order Completed!
            </p>
            <p style={{ fontSize:12, color:'#15803d', margin:'6px 0 0', fontFamily:FONT }}>
              Your order is ready. Final 20% payment is due on delivery.
            </p>
          </motion.div>
        )}

        {status === 'cancelled' && (
          <div style={{
            padding:'16px', borderRadius:14, textAlign:'center',
            background:'#fef2f2', border:'1px solid #fecaca', marginBottom:14,
          }}>
            <p style={{ fontSize:28, margin:'0 0 8px' }}>✕</p>
            <p style={{ fontSize:14, fontWeight:700, color:'#991b1b', margin:0, fontFamily:FONT }}>
              Order Cancelled
            </p>
          </div>
        )}

        {/* ── Bottom action row ─────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:6 }}>
          <button onClick={() => nav('/customer/messages')} style={{
            flex:1, padding:'12px', borderRadius:12, minHeight:44,
            border:`1px solid ${T}30`, background:`${T}08`,
            color:T, fontSize:13, fontWeight:700,
            cursor:'pointer', fontFamily:FONT,
          }}>
            💬 Message Staff
          </button>
          <button onClick={() => nav('/customer/orders')} style={{
            flex:1, padding:'12px', borderRadius:12, minHeight:44,
            border:'1px solid #e2e8f0', background:'#f8fafc',
            color:'#64748b', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:FONT,
          }}>
            ← All Orders
          </button>
        </div>

      </div>
    </>
  );
}
