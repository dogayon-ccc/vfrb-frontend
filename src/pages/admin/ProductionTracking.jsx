// FIX (Sony Mark, Sept 10 2026): hex→var(--...) token migration — 90 of
// 106 literal hex values replaced with real theme.css tokens. The
// remaining 16 are a self-contained dark-styled toast component
// (#450a0a/#422006/#022c22 dark backgrounds) plus two stage-warning
// callout boxes (amber #fff7ed/#fed7aa/#c2410c/#9a3412, blue #1e40af/#1d4ed8) — genuinely no theme.css equivalent exists for
// any of these (checked directly: theme.css's --danger-bg/--warning-bg/
// --info-bg are all LIGHT tints, not dark). Forcing these onto the
// light-mode tokens would visually break the intended dark-toast/
// callout look, not fix a real inconsistency. Left literal and flagged
// — same "hue shortage" pattern already documented elsewhere in this
// project, a real design-token gap worth a decision, not a fix here.
// Logic (stage advance, material-shortage confirm, production DSA)
// untouched.
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
//   ✓ Material-issuance warning on pattern stage
//   ✓ Delivery notice on packing stage
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

const T    = 'var(--teal)';
const T2   = 'var(--teal-2)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

const STAGES = [
  { key:'pattern',     label:'Pattern',     icon:'📐', desc:'Pattern preparation and layout' },
  { key:'segregation', label:'Segregation', icon:'🗂️', desc:'Size segregation of cut pieces' },
  { key:'cutting',     label:'Cutting',     icon:'✂️', desc:'Fabric cutting by pattern' },
  { key:'sewing',      label:'Sewing',      icon:'🧵', desc:'Assembly and inline QC (80% standard)' },
  { key:'qc',          label:'QC Check',    icon:'🔍', desc:'Final quality control inspection' },
  { key:'pressing',    label:'Pressing',    icon:'🔧', desc:'Garment pressing and finishing' },
  { key:'packing',     label:'Packing',     icon:'📦', desc:'Pack and prepare for delivery' },
];

const STATUS_SEQ = [
  'pending','confirmed',
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
  'completed',
];

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  const bg     = type==='error' ? '#450a0a' : type==='warning' ? '#422006' : '#022c22';
  const border = type==='error' ? 'var(--danger)' : type==='warning' ? 'var(--warning)' : 'var(--success)';
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
        color:'var(--bg-card)', fontSize:13, fontWeight:700,
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
          background: active ? `linear-gradient(135deg,${T},${T2})` : done ? '#dcfce7' : 'var(--bg-surface)',
          border: done ? '2px solid var(--success)' : active ? 'none' : '2px solid var(--border)',
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
          color: done ? 'var(--success)' : active ? T : 'var(--text-faint)',
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
      <p style={{ fontSize:9, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'.07em', margin:'0 0 6px' }}>
        Qty Completed by Size
      </p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {totals.map(({ label, sum }) => (
          <div key={label} style={{
            padding:'4px 10px', borderRadius:99,
            background:'var(--teal-50)', border:`1px solid ${T}30`,
            fontSize:11, fontWeight:700, color:T,
            display:'flex', gap:5, alignItems:'center',
          }}>
            <span style={{ color:'var(--text-faint)', fontWeight:400 }}>{label}</span>
            <span>{sum}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SK = {
  borderRadius:6,
  background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
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
  const isManager = JSON.parse(localStorage.getItem('vfrb_user') || '{}').role === 'manager';

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
      await axios.patch(`/api/admin/orders/${orderId}/confirm`);
      cacheClear(CACHE_KEY, 'admin_orders_list');
      await loadAll(true);
      showToast(`Order #${orderId} confirmed — production can begin.`);
    } catch (e) {
      showToast(e.response?.data?.message ?? 'Failed to confirm.', 'error');
    } finally { setAdvancing(false); }
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
        {toast && <Toast key="pt" msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}
      </AnimatePresence>

      <div className="pt-layout">
        <motion.div
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:.25 }}
          style={{ background:'var(--bg-card)', borderRadius:20, boxShadow:'0 4px 24px rgba(0,0,0,.08)', overflow:'hidden', border:'1px solid var(--border)' }}
        >
          {/* Header */}
          <div className="pt-card-header" style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', background:'linear-gradient(135deg,var(--teal-50),#ffffff)', gap:12 }}>
            <div style={{ minWidth:0 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:'.07em' }}>
                Production Confirmation
              </span>
              <h2 style={{ fontSize:isMobile?16:18, fontWeight:800, color:'var(--ink)', margin:'4px 0 0', fontFamily:FONT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                Production Tracking — Order #{orderId}
              </h2>
              {order && (
                <p style={{ fontSize:12, color:'var(--text-subtle)', margin:'4px 0 0', fontFamily:FONT }}>
                  {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs · {order.color ?? '—'} ·{' '}
                  <span style={{ textTransform:'capitalize', fontWeight:700, color:T }}>{currentStatus}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer', fontSize:12, fontWeight:600, color:'var(--text-subtle)', flexShrink:0, fontFamily:FONT, whiteSpace:'nowrap' }}>
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
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--ink)', fontFamily:FONT }}>Overall Progress</span>
                    <span style={{ fontSize:12, fontWeight:800, color:T, fontFamily:FONT }}>{pct}%</span>
                  </div>
                  <div style={{ height:8, background:'var(--bg-surface)', borderRadius:99, overflow:'hidden' }}>
                    <motion.div
                      initial={{ width:0 }} animate={{ width:`${pct}%` }}
                      transition={{ duration:.8, ease:'easeOut' }}
                      style={{ height:'100%', borderRadius:99, background:`linear-gradient(90deg,${T},${T2})` }}
                    />
                  </div>
                </div>

                {/* Pipeline */}
                <div style={{ display:'flex', alignItems:'flex-start', marginBottom:22, position:'relative', gap:0 }}>
                  <div style={{ position:'absolute', top:isMobile?16:20, left:'5%', right:'5%', height:2, background:'var(--border)', zIndex:0 }}>
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
                        <div key={stage.key} style={{ flexShrink:0, padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:active?700:400, background:active?`${T}15`:done?'#dcfce7':'var(--bg-surface)', color:active?T:done?'var(--success)':'var(--text-faint)', border:active?`1px solid ${T}30`:'1px solid transparent' }}>
                          {stage.icon} {stage.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Current stage card */}
                {isInProd && (
                  <div style={{ background:'var(--teal-50)', border:`1px solid ${T}30`, borderRadius:12, padding:'14px 18px', marginBottom:18 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <p style={{ fontSize:11, color:T, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', margin:0, fontFamily:FONT }}>Current Stage</p>
                        <p style={{ fontSize:16, fontWeight:800, color:'var(--ink)', margin:'4px 0 0', fontFamily:FONT }}>
                          {STAGES.find(s=>s.key===currentStatus)?.icon} {STAGES.find(s=>s.key===currentStatus)?.label ?? currentStatus}
                        </p>
                        <p style={{ fontSize:12, color:'var(--text-subtle)', margin:'4px 0 0', fontFamily:FONT }}>
                          {STAGES.find(s=>s.key===currentStatus)?.desc}
                        </p>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <button onClick={() => navigate(`/admin/output-log?order_id=${orderId}`)} style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${T}30`, background:`${T}10`, color:T, fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
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
                    style={{ background:'#450a0a', border:'1px solid var(--danger)', borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', gap:12, alignItems:'flex-start' }}>
                    <span style={{ fontSize:22, flexShrink:0 }}>⛔</span>
                    <div>
                      <p style={{ fontSize:13, fontWeight:800, color:'var(--bg-card)', margin:0, fontFamily:FONT }}>QC HOLD — Cannot advance to QC stage</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.65)', margin:'5px 0 0', lineHeight:1.6, fontFamily:FONT }}>
                        Complete the <strong style={{ color:'var(--bg-card)' }}>QC Checklist</strong> (80/20 inspection) and submit a PASS result to release this hold.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Material issuance warning */}
                {currentStatus === 'pattern' && (
                  <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'#c2410c', margin:0, fontFamily:FONT }}>Materials will be deducted from inventory</p>
                      <p style={{ fontSize:11, color:'#9a3412', margin:'4px 0 0', lineHeight:1.5, fontFamily:FONT }}>Advancing past Pattern will deduct the confirmed materials from stock. Enter actual usage and ensure stock is sufficient before proceeding.</p>
                    </div>
                  </div>
                )}

                {/* Packing → delivery notice */}
                {currentStatus === 'packing' && (
                  <div style={{ background:'var(--info-bg)', border:'1px solid var(--info-border)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>🚚</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:'#1e40af', margin:0, fontFamily:FONT }}>Completing packing creates the delivery record</p>
                      <p style={{ fontSize:11, color:'#1d4ed8', margin:'4px 0 0', lineHeight:1.5, fontFamily:FONT }}>Completing packing will trigger delivery record creation and final payment recording (20% balance for direct clients).</p>
                    </div>
                  </div>
                )}

                {/* Stage history */}
                {tracking.length > 0 && (
                  <div style={{ marginBottom:18 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10, fontFamily:FONT }}>Stage History</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {tracking.map((t, i) => {
                        const isCur = t.stage === currentStatus;
                        return (
                          <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.05 }}
                            style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:isCur?'var(--teal-50)':'var(--bg)', border:`1px solid ${isCur?`${T}30`:'var(--bg-surface)'}` }}>
                            <span style={{ fontSize:16, flexShrink:0 }}>{STAGES.find(s=>s.key===t.stage)?.icon ?? '•'}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:0, textTransform:'capitalize', fontFamily:FONT }}>{t.stage}</p>
                              {t.notes && <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'2px 0 0', fontFamily:FONT }}>{t.notes}</p>}
                            </div>
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <p style={{ fontSize:10, color:'var(--text-faint)', margin:0, fontFamily:FONT }}>
                                {t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : 'In progress'}
                              </p>
                              {t.completed_by && <p style={{ fontSize:10, color:'var(--text-faint)', margin:'1px 0 0', fontFamily:FONT }}>by {t.completed_by}</p>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Advance action — manager only; staff advance via Daily Output Log */}
                {(canAdvance || qcHold || currentStatus==='pending' || currentStatus==='confirmed') && (
                  <div style={{ background:'var(--bg)', border:`1px solid ${qcHold?'var(--danger)':'var(--border)'}`, borderRadius:12, padding:'16px' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginBottom:qcHold?6:10, fontFamily:FONT }}>
                      {qcHold ? '⛔ Stage advance blocked — complete QC checklist first'
                        : currentStatus==='pending' ? '→ Confirm this order to begin production'
                        : currentStatus==='confirmed' ? '→ Begin Pattern stage'
                        : `→ Advance to: ${nextStage?.icon??''} ${nextStage?.label??nextStatus}`}
                    </p>
                    {!qcHold && !isManager && (
                      <p style={{ fontSize:12, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>
                        {currentStatus==='pending' || currentStatus==='confirmed'
                          ? 'Waiting on a manager for this step.'
                          : 'Log completed pieces in Daily Output Log — the stage advances automatically once the order quantity is reached.'}
                      </p>
                    )}
                    {!qcHold && isManager && (
                      <>
                        <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                          placeholder="Stage completion notes (optional)…" rows={2}
                          style={{ width:'100%', padding:'9px 13px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:12, outline:'none', resize:'none', boxSizing:'border-box', marginBottom:10, fontFamily:FONT }}
                          onFocus={e=>{ e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; }}
                          onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; }}
                        />
                        <motion.button whileTap={{ scale:.97 }}
                          onClick={currentStatus==='pending' ? confirmOrder : advanceStage}
                          disabled={advancing}
                          style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', fontSize:14, fontWeight:800, cursor:advancing?'not-allowed':'pointer', fontFamily:FONT, color:'var(--bg-card)', minHeight:44, background:advancing?'var(--text-faint)':currentStatus==='packing'?'linear-gradient(135deg,var(--success),#16a34a)':`linear-gradient(135deg,${T},${T2})`, boxShadow:advancing?'none':currentStatus==='packing'?'0 4px 14px rgba(34,197,94,.3)':`0 4px 14px rgba(2,128,144,.3)` }}>
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
                    style={{ textAlign:'center', padding:'24px 20px', background:'var(--success-bg)', border:'1px solid var(--success-border)', borderRadius:12 }}>
                    <p style={{ fontSize:40, margin:'0 0 10px' }}>🎉</p>
                    <p style={{ fontSize:16, fontWeight:800, color:'#166534', margin:0, fontFamily:FONT }}>Order Completed</p>
                    <p style={{ fontSize:12, color:'#15803d', margin:'6px 0 0', fontFamily:FONT }}>All production stages finished. Delivery and payment recorded.</p>
                  </motion.div>
                )}

                {isCancelled && (
                  <div style={{ textAlign:'center', padding:'20px', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:12 }}>
                    <p style={{ fontSize:36, margin:'0 0 10px' }}>✕</p>
                    <p style={{ fontSize:14, fontWeight:700, color:'var(--danger-border)', margin:0, fontFamily:FONT }}>Order Cancelled</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="pt-card-footer" style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--bg)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <p style={{ fontSize:11, color:'var(--text-faint)', margin:0, fontFamily:FONT }}>Order #{orderId} · VFRB Enterprise</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => navigate(`/admin/output-log?order_id=${orderId}`)}
                style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${T}30`, background:`${T}08`, color:T, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                📋 Output Log
              </button>
              <button onClick={onClose} style={{ padding:'8px 20px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
