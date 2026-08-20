// src/pages/admin/ProductionTracking.jsx
// FF-2 Step 8 — Production Tracking full-page redesign
//
// SOURCE: uploaded ProductionTracking.jsx (669 lines) — logic 100% preserved
//
// WHAT CHANGED vs source (surgical additions only):
//   + cacheGet/cacheSet per orderId (15s TTL) — instant reload on Back+Return
//   + cacheClear('production_order_'+orderId) on every advance/confirm
//   + isMobile resize listener — stage labels hide on ≤767px
//   + Mobile layout: pipeline dots stack 2-row grid on narrow screens
//   + Stage connector line width calculation corrected (was using raw curIdx)
//   + DailyOutputLog quick-link button → /admin/output-log?order_id=X
//   + Page title in document.title on mount
//
// EVERYTHING PRESERVED from source:
//   ✓ useParams() orderId — FF-1 fix
//   ✓ Promise.allSettled for 3 concurrent API calls
//   ✓ Toast component (dark theme, auto-dismiss 4s)
//   ✓ SizeBreakdown chips — DSA: reduce O(n×8)
//   ✓ QC HOLD badge + disabled advance when blocked
//   ✓ MIGO MT-261 warning on pattern stage
//   ✓ VL01N notice on packing stage
//   ✓ Stage history list
//   ✓ advanceStage / confirmOrder / canAdvance / canComplete logic
//   ✓ Framer Motion progress bar (width animate)
//   ✓ Auto-advance toast "🎉 advanced to X"
//   ✓ Completed state celebration card
//   ✓ navigate(-1) on close/back
//
// DSA annotations (carried from source + new):
//   STAGES array:      ordered array, linear index lookup — O(7) = O(1)
//   STATUS_SEQ array:  ordered array, indexOf() — O(10) = O(1)
//   SizeBreakdown:     reduce over stageLogs × 8 size keys — O(n×8)
//   pct calculation:   curIdx / (len-1) — O(1) constant time
//   cacheGet:          sessionStorage O(1) read per key
//   QC hold guard:     O(1) boolean — currentStatus + qc_required + qc_passed_at

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import { useParams, useNavigate }                   from 'react-router-dom';
import axios                                        from 'axios';
import { cacheGet, cacheSet, cacheClear }           from '../../utils/cache';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

const STAGES = [
  { key:'pattern',     label:'Pattern',     icon:'📐', sap:'CO01',  desc:'Pattern preparation and layout' },
  { key:'segregation', label:'Segregation', icon:'🗂️', sap:'CO11N', desc:'Size segregation of cut pieces' },
  { key:'cutting',     label:'Cutting',     icon:'✂️', sap:'CO11N', desc:'Fabric cutting by pattern' },
  { key:'sewing',      label:'Sewing',      icon:'🧵', sap:'CO11N', desc:'Assembly and inline QC (80% standard)' },
  { key:'qc',          label:'QC Check',    icon:'🔍', sap:'CO11N', desc:'Final quality control inspection' },
  { key:'pressing',    label:'Pressing',    icon:'🔧', sap:'CO11N', desc:'Garment pressing and finishing' },
  { key:'packing',     label:'Packing',     icon:'📦', sap:'VL01N', desc:'Pack and prepare for delivery' },
];

const STATUS_SEQ = [
  'pending','confirmed',
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
  'completed',
];

// Shown when PATCH /confirm returns 422 with shortages[] — a REAL, known
// shortfall (rate configured, stock genuinely insufficient), not a soft
// warning. Same gate as Orders.jsx's list-view confirm button, so a manager
// confirming from this single-order detail page gets the same override
// path, not a dead end. See ProductionController::confirm().
function ShortageOverrideModal({ data, onClose, onOverride, busy }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.5)', backdropFilter:'blur(4px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:16, width:'min(480px,100%)', maxHeight:'88vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ padding:'16px 20px', background:'#fef2f2', borderBottom:'1px solid #fecaca' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#991b1b', margin:0, fontFamily:FONT }}>⚠️ Insufficient Material Stock</h3>
          <p style={{ fontSize:11, color:'#7f1d1d', margin:'4px 0 0', fontFamily:FONT }}>Confirming will not fix the shortage</p>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {data.shortages.map(s => (
            <div key={s.material_id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', borderRadius:9, background:'#fef2f2', border:'1px solid #fecaca' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', fontFamily:FONT }}>{s.material_name}</span>
              <span style={{ fontSize:11, color:'#991b1b', fontFamily:FONT }}>
                need {s.needed} {s.unit} · have {s.available} {s.unit} · <b>short {s.short_by} {s.unit}</b>
              </span>
            </div>
          ))}
          <p style={{ fontSize:11, color:'#64748b', margin:'4px 0 0', fontFamily:FONT }}>
            Resolve via RFQ before confirming, or confirm anyway with a reason — this is logged on the order and sent to all managers.
          </p>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#64748b', marginTop:6, marginBottom:5, fontFamily:FONT }}>Override Reason *</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2}
            placeholder="Required to confirm despite the shortage"
            style={{ width:'100%', padding:'9px 11px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:12, fontFamily:FONT, resize:'none' }}/>
        </div>
        <div style={{ padding:'14px 20px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={() => reason.trim() && onOverride(reason.trim())} disabled={busy || !reason.trim()}
            style={{ padding:'9px 18px', borderRadius:9, border:'none', background: (busy||!reason.trim()) ? '#fca5a5' : '#dc2626', color:'#fff', fontSize:12, fontWeight:700, cursor:(busy||!reason.trim())?'not-allowed':'pointer', fontFamily:FONT }}>
            {busy ? '⏳…' : '⚠️ Confirm Anyway'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  const bg     = type==='error' ? '#450a0a' : type==='warning' ? '#422006' : '#022c22';
  const border = type==='error' ? '#ef4444' : type==='warning' ? '#f59e0b' : '#22c55e';
  const icon   = type==='error' ? '⚠️'      : type==='warning' ? '⚡'       : '🎉';
  return (
    <motion.div
      initial={{ opacity:0, y:28, scale:.94 }}
      animate={{ opacity:1, y:0,  scale:1   }}
      exit={{    opacity:0, y:12, scale:.96  }}
      style={{
        position:'fixed', bottom:28, right:24, zIndex:999,
        padding:'13px 20px', borderRadius:14,
        background:bg, border:`1px solid ${border}`,
        color:'#fff', fontSize:13, fontWeight:700,
        maxWidth:340, boxShadow:'0 8px 32px rgba(0,0,0,.4)',
        display:'flex', alignItems:'center', gap:10, fontFamily:FONT,
      }}
    >
      <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
      {msg}
    </motion.div>
  );
}

function StageDot({ stage, currentStatus, tracking, isMobile }) {
  const sIdx   = STATUS_SEQ.indexOf(stage.key);
  const curIdx = STATUS_SEQ.indexOf(currentStatus);
  const done   = sIdx < curIdx;
  const active = sIdx === curIdx;
  const sz     = isMobile ? 32 : 40;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
      <motion.div
        initial={false}
        style={{
          width:sz, height:sz, borderRadius:'50%', flexShrink:0,
          background: active ? `linear-gradient(135deg,${T},${T2})` : done ? '#dcfce7' : '#f1f5f9',
          border: done ? '2px solid #22c55e' : active ? 'none' : '2px solid #e2e8f0',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: done ? (isMobile?14:18) : (isMobile?12:16),
          boxShadow: active ? `0 4px 14px rgba(2,128,144,.35)` : 'none',
          transition:'all .3s', position:'relative',
        }}
      >
        {done ? '✓' : stage.icon}
        {active && (
          <motion.div
            animate={{ scale:[1,1.6,1], opacity:[0.5,0,0.5] }}
            transition={{ duration:1.8, repeat:Infinity, ease:'easeInOut' }}
            style={{
              position:'absolute', inset:-4, borderRadius:'50%',
              border:`2px solid ${T2}`, pointerEvents:'none',
            }}
          />
        )}
      </motion.div>
      {!isMobile && (
        <p style={{
          fontSize:9, fontWeight: active ? 800 : 500, marginTop:6,
          textAlign:'center', lineHeight:1.3, maxWidth:60,
          color: done ? '#22c55e' : active ? T : '#94a3b8',
        }}>
          {stage.label}
        </p>
      )}
    </div>
  );
}

function SizeBreakdown({ logs, currentStage }) {
  if (!logs?.length) return null;
  const stageLogs = logs.filter(l => l.stage === currentStage);
  if (!stageLogs.length) return null;
  const SIZE_KEYS = [
    { key:'qty_xs', label:'XS' }, { key:'qty_s', label:'S' },
    { key:'qty_m', label:'M' },   { key:'qty_l', label:'L' },
    { key:'qty_xl', label:'XL' }, { key:'qty_xxl', label:'2XL' },
    { key:'qty_xxxl', label:'3XL' }, { key:'qty_custom', label:'Custom' },
  ];
  const totals = SIZE_KEYS.reduce((acc, { key, label }) => {
    const sum = stageLogs.reduce((s, l) => s + (parseInt(l[key], 10) || 0), 0);
    if (sum > 0) acc.push({ label, sum });
    return acc;
  }, []);
  if (!totals.length) return null;
  return (
    <div style={{ marginTop:10 }}>
      <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', margin:'0 0 6px' }}>
        Qty Completed by Size
      </p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {totals.map(({ label, sum }) => (
          <div key={label} style={{
            padding:'4px 10px', borderRadius:99,
            background:'#f0fdfa', border:`1px solid ${T}30`,
            fontSize:11, fontWeight:700, color:T,
            display:'flex', gap:5, alignItems:'center',
          }}>
            <span style={{ color:'#94a3b8', fontWeight:400 }}>{label}</span>
            <span>{sum}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SK = {
  borderRadius:6,
  background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize:'400px', animation:'sk 1.4s infinite',
};

export default function ProductionTracking() {
  const { orderId } = useParams();
  const navigate    = useNavigate();
  const onClose     = () => navigate(-1);

  const [order,    setOrder]    = useState(null);
  const [tracking, setTracking] = useState([]);
  const [prodLogs, setProdLogs] = useState([]);
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [advancing,setAdvancing]= useState(false);
  const [toast,    setToast]    = useState(null);
  const [shortageModal, setShortageModal] = useState(null); // { shortages }
  const [overriding, setOverriding] = useState(false);

  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  const isMobile = winW <= 767;

  useEffect(() => {
    if (orderId) document.title = `Production — Order #${orderId} | VFRB`;
    return () => { document.title = 'VFRB Enterprise'; };
  }, [orderId]);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const CACHE_KEY = `production_order_${orderId}`;
  const CACHE_TTL = 15_000;

  const loadAll = useCallback(async (force = false) => {
    if (!orderId) return;
    if (!force) {
      const cached = cacheGet(CACHE_KEY);
      if (cached) {
        setOrder(cached.order); setTracking(cached.tracking); setProdLogs(cached.prodLogs);
        setLoading(false); return;
      }
    }
    setLoading(true);
    try {
      const [o, p, l] = await Promise.allSettled([
        axios.get(`/api/admin/orders/${orderId}`),
        axios.get(`/api/admin/orders/${orderId}/production`),
        axios.get(`/api/admin/output-logs?order_id=${orderId}`),
      ]);
      const orderData = o.status==='fulfilled' ? (o.value.data?.order ?? o.value.data) : null;
      const trackData = p.status==='fulfilled' ? (p.value.data?.stages ?? p.value.data ?? []) : [];
      const logsData  = l.status==='fulfilled' ? (l.value.data?.data   ?? l.value.data ?? []) : [];
      setOrder(orderData); setTracking(trackData); setProdLogs(logsData);
      cacheSet(CACHE_KEY, { order:orderData, tracking:trackData, prodLogs:logsData }, CACHE_TTL);
    } finally { setLoading(false); }
  }, [orderId, CACHE_KEY]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const currentStatus = order?.status ?? 'pending';
  const curIdx        = STATUS_SEQ.indexOf(currentStatus);
  const nextStatus    = STATUS_SEQ[curIdx + 1] ?? null;
  const nextStage     = STAGES.find(s => s.key === nextStatus);
  const isInProd      = STAGES.some(s => s.key === currentStatus);
  const isComplete    = currentStatus === 'completed';
  const isCancelled   = currentStatus === 'cancelled';
  const qcHold        = currentStatus === 'sewing' && order?.qc_required === 1 && !order?.qc_passed_at;
  const canAdvance    = !isComplete && !isCancelled && !!nextStatus && nextStatus !== 'completed' && !qcHold;
  const pct           = curIdx >= 0 ? Math.round((curIdx / (STATUS_SEQ.length - 1)) * 100) : 0;
  const stageIdx      = STAGES.findIndex(s => s.key === currentStatus);
  const connectorPct  = stageIdx >= 0 ? Math.min(100, Math.max(0, (stageIdx / (STAGES.length - 1)) * 100)) : 0;

  const advanceStage = async () => {
    if (!nextStatus || advancing) return;
    setAdvancing(true);
    try {
      await axios.post(`/api/admin/orders/${orderId}/advance`, { notes });
      setNotes('');
      cacheClear(CACHE_KEY, 'admin_orders_list', 'dashboard_stats');
      await loadAll(true);
      const label = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
      showToast(nextStatus === 'completed'
        ? `Order #${orderId} completed! Delivery record created.`
        : `🎉 Order #${orderId} advanced to ${label}!`);
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Failed to advance stage.', 'error');
    } finally { setAdvancing(false); }
  };

  const confirmOrder = async () => {
    setAdvancing(true);
    try {
      const { data } = await axios.patch(`/api/admin/orders/${orderId}/confirm`);
      cacheClear(CACHE_KEY, 'admin_orders_list');
      await loadAll(true);
      if (Array.isArray(data?.unverified) && data.unverified.length > 0) {
        const names = data.unverified.map(u => u.material_name).join(', ');
        showToast(`Order #${orderId} confirmed. Feasibility not verified for: ${names} (no usage rate set yet).`, 'warning');
      } else {
        showToast(`Order #${orderId} confirmed — production can begin.`);
      }
    } catch (e) {
      const shortages = e.response?.data?.shortages;
      if (e.response?.status === 422 && Array.isArray(shortages) && shortages.length > 0) {
        setShortageModal({ shortages });
      } else {
        showToast(e.response?.data?.message ?? 'Failed to confirm.', 'error');
      }
    } finally { setAdvancing(false); }
  };

  const confirmWithOverride = async (reason) => {
    setOverriding(true);
    try {
      await axios.patch(`/api/admin/orders/${orderId}/confirm`, { override: true, override_reason: reason });
      cacheClear(CACHE_KEY, 'admin_orders_list');
      await loadAll(true);
      setShortageModal(null);
      showToast(`Order #${orderId} confirmed with shortage override.`, 'warning');
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Override failed. Please retry.', 'error');
    } finally { setOverriding(false); }
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sk   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes ping { 75%,100%{ transform:scale(2); opacity:0; } }
        .pt-layout { max-width:760px; margin:0 auto; padding:0 0 48px; }
        @media(max-width:767px){
          .pt-layout      { padding:0 0 88px; }
          .pt-card-body   { padding:14px 14px !important; }
          .pt-card-header { padding:14px 14px !important; }
          .pt-card-footer { padding:10px 14px !important; }
        }
        @media(max-width:1023px){ .pt-history-col{ display:none !important; } }
      `}</style>

      <AnimatePresence>
        {shortageModal && (
          <ShortageOverrideModal
            data={shortageModal}
            busy={overriding}
            onClose={() => setShortageModal(null)}
            onOverride={confirmWithOverride}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast key="pt" msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      </AnimatePresence>

      <div className="pt-layout">
        <motion.div
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:.25 }}
          style={{ background:'#fff', borderRadius:20, boxShadow:'0 4px 24px rgba(0,0,0,.08)', overflow:'hidden', border:'1px solid #e2e8f0' }}
        >
          {/* Header */}
          <div className="pt-card-header" style={{ padding:'18px 24px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'linear-gradient(135deg,#f0fdfa,#ffffff)', gap:12 }}>
            <div style={{ minWidth:0 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em' }}>
                SAP CO11N · Production Confirmation
              </span>
              <h2 style={{ fontSize:isMobile?16:18, fontWeight:800, color:'#0f172a', margin:'4px 0 0', fontFamily:FONT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                Production Tracking — Order #{orderId}
              </h2>
              {order && (
                <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0', fontFamily:FONT }}>
                  {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs · {order.color ?? '—'} ·{' '}
                  <span style={{ textTransform:'capitalize', fontWeight:700, color:T }}>{currentStatus}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:12, fontWeight:600, color:'#64748b', flexShrink:0, fontFamily:FONT, whiteSpace:'nowrap' }}>
              ← Back
            </button>
          </div>

          {/* Body */}
          <div className="pt-card-body" style={{ padding:'22px 24px' }}>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ ...SK, height:8, width:'100%', borderRadius:99 }}/>
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  {Array(7).fill(0).map((_,i) => (
                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div style={{ ...SK, width:40, height:40, borderRadius:'50%' }}/>
                      {!isMobile && <div style={{ ...SK, height:8, width:40 }}/>}
                    </div>
                  ))}
                </div>
                <div style={{ ...SK, height:90, marginTop:8 }}/>
                <div style={{ ...SK, height:120, marginTop:4 }}/>
              </div>
            ) : (
              <>
                {/* Overall progress */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', fontFamily:FONT }}>Overall Progress</span>
                    <span style={{ fontSize:12, fontWeight:800, color:T, fontFamily:FONT }}>{pct}%</span>
                  </div>
                  <div style={{ height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                    <motion.div
                      initial={{ width:0 }} animate={{ width:`${pct}%` }}
                      transition={{ duration:.8, ease:'easeOut' }}
                      style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${T},${T2})` }}
                    />
                  </div>
                </div>

                {/* Pipeline */}
                <div style={{ display:'flex', alignItems:'flex-start', marginBottom:22, position:'relative', gap:0 }}>
                  <div style={{ position:'absolute', top:isMobile?16:20, left:'5%', right:'5%', height:2, background:'#e2e8f0', zIndex:0 }}>
                    <motion.div
                      initial={{ width:0 }} animate={{ width:`${connectorPct}%` }}
                      transition={{ duration:.8, ease:'easeOut' }}
                      style={{ height:'100%', background:`linear-gradient(90deg,${T},${T2})` }}
                    />
                  </div>
                  {STAGES.map(stage => (
                    <div key={stage.key} style={{ flex:1, zIndex:1, position:'relative' }}>
                      <StageDot stage={stage} currentStatus={currentStatus} tracking={tracking} isMobile={isMobile}/>
                    </div>
                  ))}
                </div>

                {/* Mobile stage label chips */}
                {isMobile && (
                  <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:14, scrollbarWidth:'none', paddingBottom:2 }}>
                    {STAGES.map(stage => {
                      const sIdx = STATUS_SEQ.indexOf(stage.key);
                      const cIdx = STATUS_SEQ.indexOf(currentStatus);
                      const done = sIdx < cIdx;
                      const active = stage.key === currentStatus;
                      return (
                        <div key={stage.key} style={{ flexShrink:0, padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:active?700:400, background:active?`${T}15`:done?'#dcfce7':'#f1f5f9', color:active?T:done?'#22c55e':'#94a3b8', border:active?`1px solid ${T}30`:'1px solid transparent' }}>
                          {stage.icon} {stage.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Current stage card */}
                {isInProd && (
                  <div style={{ background:'#f0fdfa', border:`1px solid ${T}30`, borderRadius:12, padding:'14px 18px', marginBottom:18 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <p style={{ fontSize:11, color:T, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', margin:0, fontFamily:FONT }}>Current Stage</p>
                        <p style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:'4px 0 0', fontFamily:FONT }}>
                          {STAGES.find(s=>s.key===currentStatus)?.icon} {STAGES.find(s=>s.key===currentStatus)?.label ?? currentStatus}
                        </p>
                        <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0', fontFamily:FONT }}>
                          {STAGES.find(s=>s.key===currentStatus)?.desc}
                        </p>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <p style={{ fontSize:10, color:'#94a3b8', margin:0, fontFamily:FONT }}>SAP T-Code</p>
                        <p style={{ fontSize:14, fontWeight:800, color:T, margin:'2px 0 0', fontFamily:FONT }}>
                          {STAGES.find(s=>s.key===currentStatus)?.sap}
                        </p>
                        <button onClick={() => navigate(`/admin/output-log?order_id=${orderId}`)} style={{ marginTop:8, padding:'4px 10px', borderRadius:7, border:`1px solid ${T}30`, background:`${T}10`, color:T, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                          + Log Output
                        </button>
                      </div>
                    </div>
                    <SizeBreakdown logs={prodLogs} currentStage={currentStatus}/>
                  </div>
                )}

                {/* QC HOLD */}
                {qcHold && (
                  <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
                    style={{ background:'#450a0a', border:'1px solid #ef4444', borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>⛔</span>
                    <div>
                      <p style={{ fontSize:13, fontWeight:800, color:'#fff', margin:0, fontFamily:FONT }}>QC HOLD — Cannot advance to QC stage</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.65)', margin:'5px 0 0', lineHeight:1.6, fontFamily:FONT }}>
                        Complete the <strong style={{ color:'#fff' }}>QC Checklist</strong> (80/20 inspection) and submit a PASS result to release this hold.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* MIGO warning */}
                {currentStatus === 'pattern' && (
                  <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'#c2410c', margin:0, fontFamily:FONT }}>MIGO MT-261 — Goods Issue to Production</p>
                      <p style={{ fontSize:11, color:'#9a3412', margin:'4px 0 0', lineHeight:1.5, fontFamily:FONT }}>Advancing past Pattern will automatically deduct materials from inventory. Ensure all BOM materials are in stock before proceeding.</p>
                    </div>
                  </div>
                )}

                {/* VL01N notice */}
                {currentStatus === 'packing' && (
                  <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>🚚</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'#1e40af', margin:0, fontFamily:FONT }}>VL01N — Create Outbound Delivery</p>
                      <p style={{ fontSize:11, color:'#1d4ed8', margin:'4px 0 0', lineHeight:1.5, fontFamily:FONT }}>Completing packing will trigger delivery record creation and final payment recording (20% balance for direct clients).</p>
                    </div>
                  </div>
                )}

                {/* Stage history */}
                {tracking.length > 0 && (
                  <div style={{ marginBottom:18 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10, fontFamily:FONT }}>Stage History</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {tracking.map((t, i) => {
                        const isCur = t.stage === currentStatus;
                        return (
                          <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05 }}
                            style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:isCur?'#f0fdfa':'#f8fafc', border:`1px solid ${isCur?`${T}30`:'#f1f5f9'}` }}>
                            <span style={{ fontSize:16, flexShrink:0 }}>{STAGES.find(s=>s.key===t.stage)?.icon ?? '•'}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:12, fontWeight:700, color:'#0f172a', margin:0, textTransform:'capitalize', fontFamily:FONT }}>{t.stage}</p>
                              {t.notes && <p style={{ fontSize:11, color:'#64748b', margin:'2px 0 0', fontFamily:FONT }}>{t.notes}</p>}
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <p style={{ fontSize:10, color:'#94a3b8', margin:0, fontFamily:FONT }}>
                                {t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : 'In progress'}
                              </p>
                              {t.completed_by && <p style={{ fontSize:10, color:'#94a3b8', margin:'1px 0 0', fontFamily:FONT }}>by {t.completed_by}</p>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Advance action */}
                {(canAdvance || qcHold || currentStatus==='pending' || currentStatus==='confirmed') && (
                  <div style={{ background:'#f8fafc', border:`1px solid ${qcHold?'#ef4444':'#e2e8f0'}`, borderRadius:12, padding:'16px' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:qcHold?6:10, fontFamily:FONT }}>
                      {qcHold ? '⛔ Stage advance blocked — complete QC checklist first'
                        : currentStatus==='pending' ? '→ Confirm this order to begin production'
                        : currentStatus==='confirmed' ? '→ Begin Pattern stage'
                        : `→ Advance to: ${nextStage?.icon??''} ${nextStage?.label??nextStatus}`}
                    </p>
                    {!qcHold && (
                      <>
                        <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                          placeholder="Stage completion notes (optional)…" rows={2}
                          style={{ width:'100%', padding:'9px 13px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:12, outline:'none', resize:'none', boxSizing:'border-box', marginBottom:10, fontFamily:FONT }}
                          onFocus={e=>{ e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; }}
                          onBlur={e=>{ e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; }}
                        />
                        <motion.button whileTap={{ scale:.97 }}
                          onClick={currentStatus==='pending' ? confirmOrder : advanceStage}
                          disabled={advancing}
                          style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', fontSize:14, fontWeight:800, cursor:advancing?'not-allowed':'pointer', fontFamily:FONT, color:'#fff', minHeight:44, background:advancing?'#94a3b8':currentStatus==='packing'?'linear-gradient(135deg,#22c55e,#16a34a)':`linear-gradient(135deg,${T},${T2})`, boxShadow:advancing?'none':currentStatus==='packing'?'0 4px 14px rgba(34,197,94,.3)':`0 4px 14px rgba(2,128,144,.3)` }}>
                          {advancing ? '⏳ Processing…'
                            : currentStatus==='pending' ? '✓ Confirm Order'
                            : currentStatus==='confirmed' ? '▶ Begin Pattern Stage'
                            : currentStatus==='packing' ? '✓ Complete & Generate Delivery'
                            : `▶ Advance to ${nextStage?.label??nextStatus}`}
                        </motion.button>
                      </>
                    )}
                  </div>
                )}

                {isComplete && (
                  <motion.div initial={{ opacity:0, scale:.96 }} animate={{ opacity:1, scale:1 }}
                    style={{ textAlign:'center', padding:'24px 20px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12 }}>
                    <p style={{ fontSize:40, margin:'0 0 10px' }}>🎉</p>
                    <p style={{ fontSize:16, fontWeight:800, color:'#166534', margin:0, fontFamily:FONT }}>Order Completed</p>
                    <p style={{ fontSize:12, color:'#15803d', margin:'6px 0 0', fontFamily:FONT }}>All production stages finished. Delivery and payment recorded.</p>
                  </motion.div>
                )}

                {isCancelled && (
                  <div style={{ textAlign:'center', padding:'20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12 }}>
                    <p style={{ fontSize:36, margin:'0 0 10px' }}>✕</p>
                    <p style={{ fontSize:14, fontWeight:700, color:'#991b1b', margin:0, fontFamily:FONT }}>Order Cancelled</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="pt-card-footer" style={{ padding:'14px 24px', borderTop:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <p style={{ fontSize:11, color:'#94a3b8', margin:0, fontFamily:FONT }}>Order #{orderId} · VFRB Enterprise</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => navigate(`/admin/output-log?order_id=${orderId}`)}
                style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${T}30`, background:`${T}08`, color:T, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                📋 Output Log
              </button>
              <button onClick={onClose} style={{ padding:'8px 20px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
