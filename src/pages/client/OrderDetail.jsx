// src/pages/client/OrderDetail.jsx
// Customer Order Detail — 7-stage pipeline, AI material recommendation
// (accept/reject), delivery tracking, message preview.
//
// SCHEMA (locked — never deviate):
//   orders.order_id, status, garment_type, quantity_ordered, color,
//   collar_type, sleeve_type, pocket_type, studio_config JSON,
//   ai_recommendation_status ENUM(not_requested|generating|ready|accepted|rejected|failed),
//   target_delivery_date, po_reference, qc_required, qc_passed_at
//   delivery_tracking.delivery_status (NOT .status)
//   order_messages.body (NOT .message), message_id, sender_id
//   material_recommendations.customer_accepted (estimated_range is
//     staff/inventory-only — this file never receives it)
// Caching: cacheGet('order_detail_'+id) 30s TTL, cleared on AI accept/reject.

import { useState, useEffect, useCallback } from 'react';
import DesignPreview from '../../components/DesignPreview';
import { useParams, useNavigate }            from 'react-router-dom';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { cacheGet, cacheSet, cacheClear }    from '../../utils/cache';
import { getStorageUrl, isImageFile }        from '../../utils/fileUrl';
import { NavIcon }                           from '../../components/ui/icons';
import { OrderThumb, Stepper, StatusPill, LIFECYCLE, lifecycleIndex, orderTitle, fmtDate } from '../../components/customer/kit';


const T    = 'var(--teal)';
const T2   = '#02C39A';
const PAYMENT_LABEL = { full:'Full payment', full_payment:'Full payment', down:'Down payment', down_payment:'Down payment', net_30:'Net 30 days', net_60:'Net 60 days', not_specified:'Confirmed by VFRB' };
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

// ── 7-stage production sequence ───────────────────────────────────────────────
const STAGES = [
  { key:'pattern',     label:'Pattern',     icon:'pattern'     },
  { key:'segregation', label:'Segregation', icon:'segregation' },
  { key:'cutting',     label:'Cutting',     icon:'cutting'     },
  { key:'sewing',      label:'Sewing',      icon:'garmentType' },
  { key:'qc',          label:'QC',          icon:'qc'          },
  { key:'pressing',    label:'Pressing',    icon:'pressing'    },
  { key:'packing',     label:'Packing',     icon:'package'     },
];

const STATUS_SEQ = [
  'pending','confirmed',
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
  'completed',
];

// Icon names match Dashboard.jsx/Orders.jsx's S config — same convention across pages.
const S = {
  pending:     { color:'#f59e0b', bg:'#fef3c7', label:'Pending',     icon:'pending'     },
  confirmed:   { color:'#3b82f6', bg:'#dbeafe', label:'Confirmed',   icon:'success'     },
  pattern:     { color:'#8b5cf6', bg:'#ede9fe', label:'Pattern',     icon:'pattern'     },
  segregation: { color:'#a78bfa', bg:'#f5f3ff', label:'Segregation', icon:'segregation' },
  cutting:     { color:'#6366f1', bg:'#e0e7ff', label:'Cutting',     icon:'cutting'     },
  sewing:      { color:'#06b6d4', bg:'#cffafe', label:'Sewing',      icon:'garmentType' },
  qc:          { color:'#f97316', bg:'#ffedd5', label:'QC',          icon:'qc'          },
  pressing:    { color:'#ec4899', bg:'#fce7f3', label:'Pressing',    icon:'pressing'    },
  packing:     { color:'#f472b6', bg:'#fdf2f8', label:'Packing',     icon:'package'     },
  completed:   { color:'#15803d', bg:'#dcfce7', label:'Completed',   icon:'success'     },
  cancelled:   { color:'#ef4444', bg:'#fee2e2', label:'Cancelled',   icon:'error'       },
};

const DELIVERY_CFG = {
  preparing:  { label:'Preparing',  color:'#f59e0b', icon:'package'  },
  dispatched: { label:'Dispatched', color:'#3b82f6', icon:'delivery' },
  in_transit: { label:'In Transit', color:'#8b5cf6', icon:'delivery' },
  delivered:  { label:'Delivered',  color:'#15803d', icon:'success'  },
  returned:   { label:'Returned',   color:'#ef4444', icon:'undo'     },
};

// Skeleton style
const SK = {
  borderRadius: 6,
  background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize: '400px',
  animation: 'sk 1.4s infinite',
};

// ── Parse studio colors — O(1) ────────────────────────────────────────────────
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
        {done ? '✓' : <NavIcon name={stage.icon} size={isMobile ? 14 : 18} color={active ? '#fff' : '#94a3b8'}/>}

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
          color: done ? '#15803d' : active ? T : '#5f6f83',
          margin:0, fontFamily:FONT,
          whiteSpace: isMobile ? 'nowrap' : 'normal',
        }}>
          {stage.label}
        </p>
        {active && isMobile && (
          <p style={{ fontSize:10, color:T, margin:'2px 0 0', fontFamily:FONT }}>
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
  const [dlBusy,   setDlBusy]   = useState(false);

  // Responsive — CSS-driven (.od-h1, .od-pipeline-h/v), no resize listener needed.
  const CACHE_KEY = `order_detail_${orderId}`;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetches into a Blob first rather than pointing <a download> straight at
  // the URL — the preview lives on Cloudinary once that disk is configured,
  // and a cross-origin href makes the browser navigate instead of download.
  const downloadDesign = useCallback(async (url, filename) => {
    if (!url) return;
    setDlBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      showToast('Could not download the design. Try opening it in a new tab.', 'error');
    } finally {
      setDlBusy(false);
    }
  }, []);

  // ── Load: 4 concurrent requests via Promise.allSettled ────────────────────
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

  const specs = [
    { label:'Garment Type', value: order?.garment_type ?? '—'              },
    { label:'Color',        value: order?.color ?? '—'                      },
    { label:'Quantity',     value: order?.quantity_ordered
        ? `${order.quantity_ordered} pcs` : '—'                            },
    { label:'Collar',       value: order?.collar_type ?? '—'                },
    { label:'Sleeve',       value: order?.sleeve_type ?? '—'                },
    { label:'Pocket',       value: order?.pocket_type ?? '—'                },
    { label:'Order Type',   value: order?.order_type ?? '—'                 },
    { label:'Payment',      value: PAYMENT_LABEL[order?.payment_terms] ?? '—' },
    { label:'PO Reference', value: order?.po_reference ?? 'N/A'             },
    { label:'Delivery',     value: order?.target_delivery_date
        ? new Date(order.target_delivery_date).toLocaleDateString('en-PH',{
            year:'numeric', month:'long', day:'numeric',
          })
        : '—'
    },
  ];

  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg,  setAiMsg]  = useState('');
  const retryAI = useCallback(async () => {
    setAiBusy(true); setAiMsg('');
    try {
      await axios.post('/api/customer/ai/recommend-materials', { order_id: Number(orderId) }, { timeout: 120_000 });
      await load(true);
    } catch (e) {
      setAiMsg(e.response?.data?.message ?? 'The recommendation is unavailable right now. You can choose materials yourself.');
    } finally { setAiBusy(false); }
  }, [orderId, load]);

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
      <div className="cx-page" style={{ maxWidth:860 }}>
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
      <button onClick={() => nav('/orders')} style={{
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

        .od-toast { bottom:calc(var(--taskbar-h,64px) + 14px + env(safe-area-inset-bottom,0px)); }
        @media (min-width:768px) { .od-toast { bottom:24px; } }
        .od-wrap { max-width:1120px; margin:0 auto; padding-bottom:40px; }
        .od-head { display:flex; flex-direction:column; gap:14px; margin-bottom:16px; align-items:flex-start; width:100%; }
        .od-title { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; width:100%; }
        .od-title h1 { font-size:clamp(20px,3vw,26px); font-weight:800; margin:0 0 4px; color:var(--ink); }
        .od-title p { font-size:13px; color:var(--text-subtle); margin:0; text-transform:capitalize; }
        .od-cols { display:grid; grid-template-columns:minmax(0,1fr); gap:0 16px; align-items:start; }
        .od-main, .od-side { min-width:0; }
        @media (min-width:1024px) { .od-cols { grid-template-columns:minmax(0,1.55fr) minmax(320px,1fr); } }

        .od-spec-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }

        /* Mobile-first: vertical pipeline is the default, horizontal takes over on tablet+. */
        .od-pipeline-h { display:none; }
        .od-pipeline-v { display:flex; flex-direction:column; }

        .od-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px;
          box-shadow:var(--shadow-xs); margin-bottom:14px; overflow:hidden; }
        .od-card-body { padding:14px 16px; }
        .od-hero { margin-bottom:16px; }
        .od-hero .od-card-body { padding:16px; }

        .od-section-title { font-size:11px; font-weight:800; text-transform:uppercase;
          letter-spacing:.07em; color:#5f6f83; margin:0 0 14px; }

        @media (min-width:640px) {
          .od-spec-grid { grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); }
        }
        @media (min-width:768px) {
          .od-card { border-radius:16px; }
          .od-card-body { padding:18px 20px; }
          .od-pipeline-h { display:flex; }
          .od-pipeline-v { display:none; }
        }
      `}</style>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className="od-toast"
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0  }}
            exit={{    opacity:0, y:10  }}
            style={{
              position:'fixed', left:16, right:16, maxWidth:340,
              margin:'0 auto', zIndex:9999,
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

      <div className="od-wrap">

        <div className="od-head">
          <button className="cx-btn cx-btn-s" style={{ minHeight:40 }} onClick={() => nav('/orders')}>
            <NavIcon name="back" size={16}/> My Orders
          </button>
          <div className="od-title">
            <div style={{ minWidth:0 }}>
              <h1>Order #{orderId}</h1>
              <p>{[order.garment_type ?? 'Custom Order', order.quantity_ordered && `${order.quantity_ordered} pcs`, order.color].filter(Boolean).join(' · ')}</p>
            </div>
            <StatusPill status={status}/>
          </div>
        </div>
        {/* ── Lifecycle summary (customer-facing 5 steps derived from real status) ── */}
        {status !== 'cancelled' && (
          <div className="od-card">
            <div className="od-card-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <OrderThumb order={order} size={64}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p title={orderTitle(order)} style={{ margin:0, fontSize:15, fontWeight:800, color:'var(--ink)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflowWrap:'anywhere' }}>{orderTitle(order)}</p>
                  <p style={{ margin:'3px 0 0', fontSize:12, color:'var(--text-subtle)' }}>
                    {order.quantity_ordered ?? 0} pcs{order.target_delivery_date ? ` · Due ${fmtDate(order.target_delivery_date)}` : ''}
                  </p>
                </div>
                <button className="cx-btn cx-btn-s" style={{ minHeight:40 }} onClick={() => nav(`/messages?order=${orderId}`)}>Messages</button>
              </div>
              <Stepper steps={LIFECYCLE} current={lifecycleIndex(status)}/>
            </div>
          </div>
        )}

        {(order.studio_config || order.design_preview_url || (order.client_design_ref_file && isImageFile(order.client_design_ref_file))) && (
          <section className="od-card od-hero" aria-label="Design preview">
            <div className="od-card-body">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:12 }}>
                <p className="od-section-title" style={{ fontFamily:FONT, margin:0 }}>Your Design</p>
                {order.design_preview_url && (
                  <button className="cx-btn cx-btn-s" style={{ minHeight:40 }} disabled={dlBusy} aria-busy={dlBusy}
                    onClick={() => downloadDesign(order.design_preview_url, `VFRB-ORD-${order.order_id}-design.png`)}>
                    <NavIcon name="download" size={13}/>{dlBusy ? 'Preparing…' : 'Download PNG'}
                  </button>
                )}
              </div>
              <DesignPreview cfg={order.studio_config} height={340}
                previewUrl={order.design_preview_url ?? null}
                referenceImageUrl={!order.studio_config ? getStorageUrl(order.client_design_ref_file) : null}/>
              <p style={{ fontSize:12, color:'var(--text-subtle)', fontFamily:FONT, margin:'10px 0 0' }}>
                {order.design_preview_url
                  ? 'This is the artwork submitted with your order. VFRB staff work from this file, so check it matches what you expect before production starts.'
                  : 'Preview built from your submitted design.'}
              </p>
            </div>
          </section>
        )}

        <div className="od-cols"><div className="od-main">
        {order.client_design_notes && (
          <div className="od-card"><div className="od-card-body">
            <p className="od-section-title" style={{ fontFamily:FONT }}>Design Notes</p>
            <p style={{ fontSize:13, color:'var(--ink)', margin:0, lineHeight:1.6, fontFamily:FONT, whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{order.client_design_notes}</p>
          </div></div>
        )}
        {/* ── Order specs grid ──────────────────────────────────────────── */}
        <div className="od-card">
          <div className="od-card-body">
            <p className="od-section-title" style={{ fontFamily:FONT }}>
              Order Specifications
            </p>
            <div className="od-spec-grid">
              {specs.filter(s => s.value && s.value !== '—').map(spec => (
                <div key={spec.label} style={{
                  background:'var(--bg-surface)', borderRadius:10,
                  padding:'10px 12px', border:'1px solid var(--bg-surface)',
                }}>
                  <p style={{
                    fontSize:9, fontWeight:700, color:'var(--text-faint)',
                    textTransform:'uppercase', letterSpacing:'.07em',
                    margin:'0 0 4px', fontFamily:FONT,
                  }}>
                    {spec.label}
                  </p>
                  <p style={{
                    fontSize:13, fontWeight:600, color:'var(--ink)',
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

        <div className="od-card"><div className="od-card-body" style={{ paddingBottom:0 }}>
        {/* ── Overall progress bar ──────────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{
            display:'flex', justifyContent:'space-between', marginBottom:7,
          }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--ink)', fontFamily:FONT }}>
              Production Progress
            </span>
            <span style={{ fontSize:12, fontWeight:800, color:T, fontFamily:FONT }}>
              {pct}%
            </span>
          </div>
          <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
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
              height:2, background:'var(--border)', zIndex:0,
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
              borderTop:'1px solid var(--bg-surface)', padding:'10px 20px',
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
              width:2, background:'var(--border)', zIndex:0,
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


        {/* Requires the backend's storage symlink (php artisan storage:link) to resolve. */}
        {order.client_design_ref_file && (
          <div className="od-card">
            <div className="od-card-body">
              <p className="od-section-title" style={{ fontFamily:FONT }}>
                Reference File
              </p>
              {isImageFile(order.client_design_ref_file) ? (
                <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'block', borderRadius:10, overflow:'hidden',
                    border:'1px solid var(--border)', maxWidth:280, textDecoration:'none' }}>
                  <img src={getStorageUrl(order.client_design_ref_file)} alt="Client reference"
                    style={{ width:'100%', display:'block' }}
                    onError={e => { e.target.style.display='none'; }}/>
                </a>
              ) : (
                <a href={getStorageUrl(order.client_design_ref_file)} target="_blank" rel="noopener noreferrer"
                  style={{ display:'inline-flex', alignItems:'center', gap:8,
                    padding:'10px 16px', borderRadius:10, background:'#f0fdfa',
                    border:'1px solid #99f6e4', color:'var(--teal)', fontSize:13,
                    fontWeight:700, fontFamily:FONT, textDecoration:'none' }}>
                  <NavIcon name="attachment" size={13} color="var(--teal)"/> View Reference PDF
                </a>
              )}
            </div>
          </div>
        )}

        </div><div className="od-side">
        {/* ── AI Recommendation card ────────────────────────────────────── */}
        {order && !['ready','accepted','rejected'].includes(order.ai_recommendation_status) && !['completed','cancelled'].includes(order.status) && (
          <div className="od-card"><div className="od-card-body">
            <p className="od-section-title" style={{ fontFamily:FONT }}>Material recommendation</p>
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6, margin:'0 0 12px', fontFamily:FONT }}>
              {order.ai_recommendation_status === 'generating'
                ? 'Your recommendation is being prepared. Check again in a moment.'
                : order.ai_recommendation_status === 'failed'
                ? 'The recommendation could not be generated. Try again, or choose the material types yourself.'
                : 'No material types have been recommended for this order yet.'}
            </p>
            {aiMsg && <p role="alert" style={{ fontSize:13, color:'#b91c1c', margin:'0 0 12px', fontFamily:FONT }}>{aiMsg}</p>}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="cx-btn cx-btn-p" style={{ minHeight:44 }} disabled={aiBusy} aria-busy={aiBusy}
                onClick={order.ai_recommendation_status === 'generating' ? () => load(true) : retryAI}>
                {aiBusy ? 'Working…' : order.ai_recommendation_status === 'generating' ? 'Check again' : 'Get recommendation'}
              </button>
              <button className="cx-btn cx-btn-s" style={{ minHeight:44 }} onClick={() => nav('/ai-materials')}>Choose materials myself</button>
            </div>
          </div></div>
        )}

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
                  background:'var(--teal-dark)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14,
                }}>
                  <NavIcon name="ai" size={14} color="#fff"/>
                </div>
                <div style={{ flex:1 }}>
                  <p className="od-section-title" style={{ margin:'0 0 2px', fontFamily:FONT }}>
                    AI Material Recommendation
                  </p>
                  <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>
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
                <div style={{ padding:'10px 12px', borderRadius:9, background:'var(--bg-surface)',
                  border:'1px solid var(--border)', marginBottom:14, display:'flex',
                  alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <span style={{ fontSize:11, color:'var(--text-subtle)', fontFamily:FONT }}>
                    VFRB staff has been notified. Want to pick materials yourself instead?
                  </span>
                  <button onClick={() => nav('/ai-materials')}
                    style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)',
                      background:'#fff', color:'var(--ink)', fontSize:11, fontWeight:700,
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
                          display:'flex', alignItems:'center', padding:'8px 12px',
                          background:'var(--bg-surface)', borderRadius:9,
                          border:'1px solid var(--bg-surface)',
                        }}>
                          <span style={{
                            fontSize:12, fontWeight:600, color:'var(--ink)',
                            textTransform:'capitalize', fontFamily:FONT,
                          }}>
                            {mat}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Narrative notes */}
              {aiRec.notes && (
                <p style={{
                  fontSize:12, color:'var(--text-subtle)', lineHeight:1.7,
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
                      background: aiAction ? 'var(--text-faint)'
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
                const dcfg = ds ? (DELIVERY_CFG[ds] ?? { label:ds, color:'#64748b', icon:'package' }) : { label:'Not scheduled yet', color:'#64748b', icon:'package' };
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
                        <NavIcon name={dcfg.icon} size={11} color={dcfg.color}/> {dcfg.label}
                      </span>
                    </div>

                    {![delivery.delivery_method, delivery.courier_name, delivery.tracking_number, delivery.delivery_address, delivery.estimated_delivery_date].some(Boolean) && (
                      <p style={{ margin:0, fontSize:12, color:'var(--text-subtle)', fontFamily:FONT }}>
                        VFRB staff haven't added delivery details yet.
                      </p>
                    )}
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
                          padding:'7px 10px', background:'var(--bg-surface)',
                          borderRadius:8, border:'1px solid var(--bg-surface)',
                        }}>
                          <span style={{
                            fontSize:11, fontWeight:700, color:'var(--text-faint)',
                            minWidth:90, flexShrink:0, fontFamily:FONT,
                          }}>
                            {row.l}
                          </span>
                          <span style={{ fontSize:12, color:'var(--ink)', fontFamily:FONT }}>
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
                onClick={() => nav(`/messages?order=${orderId}`)}
                style={{
                  padding:'5px 12px', borderRadius:8,
                  border:'1px solid rgba(2,128,144,.2)', background:'rgba(2,128,144,.04)',
                  color:T, fontSize:11, fontWeight:700,
                  cursor:'pointer', fontFamily:FONT,
                }}
              >
                Open Chat →
              </button>
            </div>

            {messages.length === 0 ? (
              <p style={{
                fontSize:12, color:'var(--text-faint)', textAlign:'center',
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
                        background: isMe ? 'rgba(2,128,144,.09)' : 'var(--bg-surface)',
                        border:`1px solid ${isMe ? 'rgba(2,128,144,.16)' : 'var(--border)'}`,
                      }}>
                        {/* body column — order_messages schema */}
                        <p style={{
                          fontSize:12, color:'var(--ink)', margin:0,
                          lineHeight:1.5, fontFamily:FONT,
                        }}>
                          {msg.body}
                        </p>
                        <p style={{
                          fontSize:9, color:'var(--text-faint)',
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
                    fontSize:11, color:'var(--text-faint)', textAlign:'center',
                    margin:0, fontFamily:FONT,
                  }}>
                    +{messages.length - 3} more →
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        </div></div>
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
          <button onClick={() => nav(`/messages?order=${orderId}`)} style={{
            flex:1, padding:'12px', borderRadius:12, minHeight:44,
            border:'1px solid rgba(2,128,144,.2)', background:'rgba(2,128,144,.04)',
            color:T, fontSize:13, fontWeight:700,
            cursor:'pointer', fontFamily:FONT,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            <NavIcon name="chat" size={14} color={T}/>Message Staff
          </button>
          <button onClick={() => nav('/orders')} style={{
            flex:1, padding:'12px', borderRadius:12, minHeight:44,
            border:'1px solid var(--border)', background:'var(--bg-surface)',
            color:'var(--text-subtle)', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:FONT,
          }}>
            ← All Orders
          </button>
        </div>

      </div>
    </>
  );
}
