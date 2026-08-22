// src/pages/customer/AIMaterials.jsx
// AI Raw Material Recommendation — Layer 1 (Gemini Flash via GeminiService.php)
//
// FIXES vs zip source:
//   1. CDN font removed — system font stack
//   2. Field keys fixed to match actual DB columns from vfrb_db.sql:
//      r.material.material_name → r.material_name  (direct column)
//      r.estimated_qty          → r.estimated_range (string from Gemini)
//      r.material.unit          → r.unit
//   3. Gemini narrative card shows ai_note per material (the explanation Gemini writes)
//   4. Full motion: whileHover, whileTap, stagger animations, card entrance
//   5. Accepting shows confetti burst on the accept button
//   6. Material category icons + color coding
//   7. "How AI works" explainer panel so panel understands the AI layer
//   8. 3-step status flow: No rec → Generating → Ready → Accepted
//
// API calls (verified against api.php):
//   GET  /api/customer/orders                             — order selector
//   GET  /api/customer/orders/{id}                        — order detail + recs
//   POST /api/customer/ai/recommend-materials             — { order_id }
//   POST /api/customer/orders/{id}/accept-materials       — { notes }

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }                              from 'react-router-dom';
import { motion, AnimatePresence }                  from 'framer-motion';
import axios                                        from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }      from '../../utils/cache';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const SK = {
  borderRadius:8, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize:'400px', animation:'sk 1.4s infinite',
};

// Category config — colors, icons per material category from Gemini
const CAT = {
  Fabric:       { icon:'🧶', color:'#3b82f6', bg:'#dbeafe' },
  Thread:       { icon:'🪡', color:'#8b5cf6', bg:'#ede9fe' },
  Elastic:      { icon:'〰️',  color:'#f97316', bg:'#ffedd5' },
  Accessories:  { icon:'🔩', color:'#64748b', bg:'#f1f5f9' },
  Trims:        { icon:'✂️', color:'#06b6d4', bg:'#cffafe' },
  Lining:       { icon:'📄', color:'#f59e0b', bg:'#fef3c7' },
  Other:        { icon:'📦', color:'#94a3b8', bg:'#f8fafc' },
};

const STATUS_C = {
  pending:     { color:'#f59e0b', label:'Pending',     icon:'⏳' },
  confirmed:   { color:'#3b82f6', label:'Confirmed',   icon:'✅' },
  pattern:     { color:'#8b5cf6', label:'Pattern',     icon:'📐' },
  segregation: { color:'#a78bfa', label:'Sorting',     icon:'🗂️' },
  cutting:     { color:'#6366f1', label:'Cutting',     icon:'✂️' },
  sewing:      { color:'#06b6d4', label:'Sewing',      icon:'🧵' },
  qc:          { color:'#f97316', label:'QC',          icon:'🔍' },
  pressing:    { color:'#ec4899', label:'Pressing',    icon:'🔧' },
  packing:     { color:'#f472b6', label:'Packing',     icon:'📦' },
  completed:   { color:'#22c55e', label:'Completed',   icon:'🎉' },
  cancelled:   { color:'#ef4444', label:'Cancelled',   icon:'✕'  },
};

// ── Confetti burst on accept ─────────────────────────────────────────────────
function ConfettiBurst() {
  const particles = Array.from({ length:20 }, (_, i) => ({
    id:i, color:[T,T2,'#22c55e','#f59e0b','#3b82f6','#ec4899'][i%6],
    x: (Math.random()-0.5)*200, y: -(60+Math.random()*100),
    rotate: Math.random()*360, delay: Math.random()*0.3,
  }));
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'visible', zIndex:10 }}>
      {particles.map(p=>(
        <motion.div key={p.id}
          initial={{ opacity:1, x:0, y:0, rotate:0, scale:1 }}
          animate={{ opacity:0, x:p.x, y:p.y, rotate:p.rotate, scale:0 }}
          transition={{ duration:.9, delay:p.delay, ease:'easeOut' }}
          style={{ position:'absolute', top:'50%', left:'50%',
            width:8, height:8, borderRadius:p.id%3===0?'50%':2,
            background:p.color, marginLeft:-4, marginTop:-4 }}/>
      ))}
    </div>
  );
}

// ── Accept confirmation modal ─────────────────────────────────────────────────
function AcceptModal({ order, recs, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/customer/orders/${order.order_id}/accept-materials`, { notes });
      cacheClear('orders_list','customer_dashboard');
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)',
          backdropFilter:'blur(6px)', zIndex:200, display:'flex',
          alignItems:'center', justifyContent:'center', padding:16 }}>
        <motion.div initial={{ opacity:0, scale:.94, y:16 }}
          animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:.94 }}
          style={{ background:'#fff', borderRadius:20, width:'min(480px,100%)',
            overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.22)' }}>

          {/* Header */}
          <div style={{ padding:'20px 24px', background:'#f0fdfa',
            borderBottom:'1px solid #99f6e4' }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#0f172a',
              margin:0, fontFamily:FONT }}>
              ✅ Confirm Material Acceptance
            </h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0', fontFamily:FONT }}>
              Order #{order.order_id} · {order.garment_type} · {order.quantity_ordered} pcs
            </p>
          </div>

          {/* Materials list */}
          <div style={{ padding:'20px 24px' }}>
            <div style={{ background:'#f8fafc', borderRadius:12, padding:14,
              marginBottom:16, border:'1px solid #e2e8f0' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#64748b',
                textTransform:'uppercase', letterSpacing:'.07em',
                marginBottom:10, fontFamily:FONT }}>
                Materials you are accepting
              </p>
              {recs.map((r, i) => {
                const cat = CAT[r.category] ?? CAT.Other;
                return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', padding:'7px 0',
                    borderBottom: i<recs.length-1?'1px solid #f1f5f9':'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16 }}>{cat.icon}</span>
                      <div>
                        <p style={{ fontSize:12, fontWeight:600, color:'#0f172a',
                          margin:0, fontFamily:FONT }}>
                          {r.material_name}
                        </p>
                        <p style={{ fontSize:10, color:'#64748b', margin:0, fontFamily:FONT }}>
                          {r.category}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:T, fontFamily:FONT }}>
                      {r.estimated_range}
                    </span>
                  </div>
                );
              })}
            </div>

            <label style={{ display:'block', fontSize:11, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b',
              marginBottom:7, fontFamily:FONT }}>
              Notes for Staff (optional)
            </label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="e.g. Please use cotton blend, prefer navy blue thread…"
              style={{ width:'100%', padding:'10px 14px', borderRadius:10,
                border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a',
                fontSize:13, outline:'none', resize:'none',
                fontFamily:FONT, boxSizing:'border-box' }}
              onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`;}}
              onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none';}}/>
            {err && <p style={{ color:'#ef4444', fontSize:12, marginTop:8, fontFamily:FONT }}>⚠️ {err}</p>}
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 24px', borderTop:'1px solid #e2e8f0',
            display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={onClose}
              style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #e2e8f0',
                background:'#fff', color:'#0f172a', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:FONT }}>
              Cancel
            </motion.button>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={submit} disabled={busy}
              style={{ padding:'9px 24px', borderRadius:10, border:'none',
                background:busy?'#94a3b8':'linear-gradient(135deg,#22c55e,#16a34a)',
                color:'#fff', fontSize:13, fontWeight:700,
                cursor:busy?'not-allowed':'pointer', fontFamily:FONT,
                boxShadow:busy?'none':'0 4px 14px rgba(34,197,94,.3)' }}>
              {busy ? '⏳ Confirming…' : '✓ Accept & Notify Staff'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Choose your own materials modal ─────────────────────────────────────────
// NEW — customer bypasses the AI entirely and picks materials themselves
// from the real catalog. Same deterministic engine computes quantities on
// the backend; VFRB gets notified exactly like an AI acceptance.
function SelfPickModal({ order, onClose, onDone }) {
  const [catalog, setCatalog] = useState([]);
  const [picked,  setPicked]  = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [notes,   setNotes]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    axios.get('/api/customer/materials-catalog')
      .then(r => setCatalog(r.data?.materials ?? []))
      .catch(() => setErr('Could not load the materials catalog.'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setPicked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (picked.size === 0) { setErr('Pick at least one material.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/customer/orders/${order.order_id}/select-materials`, {
        material_ids: Array.from(picked), notes,
      });
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed. Try again.'); }
    finally { setBusy(false); }
  };

  // Group by category for a scannable checklist
  const byCategory = catalog.reduce((acc, m) => {
    const cat = m.category || 'Other';
    (acc[cat] ??= []).push(m);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)',
          backdropFilter:'blur(6px)', zIndex:200, display:'flex',
          alignItems:'center', justifyContent:'center', padding:16 }}>
        <motion.div initial={{ opacity:0, scale:.94, y:16 }}
          animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:.94 }}
          style={{ background:'#fff', borderRadius:20, width:'min(520px,100%)',
            maxHeight:'85vh', display:'flex', flexDirection:'column',
            overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.22)' }}>

          <div style={{ padding:'20px 24px', background:'#f0fdfa', borderBottom:'1px solid #99f6e4', flexShrink:0 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:0, fontFamily:FONT }}>
              🧵 Choose Your Own Materials
            </h3>
            <p style={{ fontSize:12, color:'#64748b', margin:'4px 0 0', fontFamily:FONT }}>
              Order #{order.order_id} — skip the AI recommendation and pick from VFRB's catalog yourself
            </p>
          </div>

          <div style={{ padding:'18px 24px', overflowY:'auto', flex:1 }}>
            {loading ? (
              <div style={{ ...SK, height:120, borderRadius:12 }}/>
            ) : (
              Object.entries(byCategory).map(([cat, mats]) => {
                const cfg = CAT[cat] ?? CAT.Other;
                return (
                  <div key={cat} style={{ marginBottom:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:cfg.color,
                      textTransform:'uppercase', letterSpacing:'.07em',
                      marginBottom:8, fontFamily:FONT }}>
                      {cfg.icon} {cat}
                    </p>
                    {mats.map(m => (
                      <label key={m.material_id} style={{ display:'flex', alignItems:'center',
                        gap:10, padding:'8px 10px', borderRadius:9, cursor:'pointer',
                        background: picked.has(m.material_id) ? `${cfg.color}12` : 'transparent' }}>
                        <input type="checkbox" checked={picked.has(m.material_id)}
                          onChange={()=>toggle(m.material_id)} style={{ width:16, height:16, accentColor:T }}/>
                        <span style={{ fontSize:13, color:'#0f172a', fontFamily:FONT }}>{m.material_name}</span>
                        <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto', fontFamily:FONT }}>{m.unit}</span>
                      </label>
                    ))}
                  </div>
                );
              })
            )}

            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Optional note for VFRB staff about your selection…" rows={2}
              style={{ width:'100%', marginTop:6, padding:'10px 12px', borderRadius:10,
                border:'1px solid #e2e8f0', fontSize:12, fontFamily:FONT, resize:'none', boxSizing:'border-box' }}/>

            {err && <p style={{ color:'#ef4444', fontSize:12, marginTop:8 }}>⚠️ {err}</p>}
          </div>

          <div style={{ padding:'16px 24px', borderTop:'1px solid #e2e8f0',
            display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc', flexShrink:0 }}>
            <button onClick={onClose} style={{ padding:'10px 18px', borderRadius:10,
              border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a',
              fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
            <button onClick={submit} disabled={busy || loading}
              style={{ padding:'10px 22px', borderRadius:10, border:'none',
                background: busy ? '#94a3b8' : `linear-gradient(135deg,${T},${T2})`,
                color:'#fff', fontSize:12, fontWeight:700,
                cursor: busy ? 'not-allowed' : 'pointer', fontFamily:FONT }}>
              {busy ? '⏳…' : `Send Selection (${picked.size})`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


function RecCard({ rec, index }) {
  const cat = CAT[rec.category] ?? CAT.Other;
  return (
    <motion.div
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: index * 0.06, duration:.25 }}
      whileHover={{ y:-2, boxShadow:'0 8px 22px rgba(0,0,0,.09)' }}
      style={{ background:'#fff', border:'1px solid #e2e8f0',
        borderRadius:14, padding:'18px 20px',
        boxShadow:'0 1px 3px rgba(0,0,0,.05)',
        borderLeft:`4px solid ${cat.color}` }}>

      {/* Top row */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
            background:cat.bg, display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:18 }}>
            {cat.icon}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#0f172a',
              margin:0, fontFamily:FONT }}>
              {rec.material_name}
            </p>
            <span style={{ display:'inline-block', marginTop:2, padding:'2px 8px',
              borderRadius:99, fontSize:9, fontWeight:700,
              background:cat.bg, color:cat.color, fontFamily:FONT }}>
              {cat.icon} {rec.category}
            </span>
          </div>
        </div>

        {/* Quantity range */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <p style={{ fontSize:13, fontWeight:800, color:T,
            margin:0, fontFamily:FONT }}>
            {rec.estimated_range}
          </p>
          {rec.total_estimated_range && (
            <p style={{ fontSize:10, color:'#64748b', margin:'2px 0 0', fontFamily:FONT }}>
              {rec.total_estimated_range}
            </p>
          )}
        </div>
      </div>

      {/* AI explanation (the ai_note Gemini writes) */}
      {rec.ai_note && (
        <div style={{ padding:'10px 12px', borderRadius:10,
          background:'#f8fafc', border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
            <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>🤖</span>
            <p style={{ fontSize:12, color:'#475569', lineHeight:1.65,
              margin:0, fontFamily:FONT }}>
              {rec.ai_note}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIMaterials() {
  const nav = useNavigate();

  const [orders,      setOrders]      = useState([]);
  const [selId,       setSelId]       = useState(null);
  const [order,       setOrder]       = useState(null);
  const [recs,        setRecs]        = useState([]);
  const [generating,  setGenerating]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showAccept,  setShowAccept]  = useState(false);
  const [accepted,    setAccepted]    = useState(false);
  const [showConf,    setShowConf]    = useState(false);
  const [showPicker,  setShowPicker]  = useState(false); // manual "choose my own materials" modal

  // Load all customer orders for the selector
  useEffect(() => {
    axios.get('/api/customer/orders')
      .then(r => {
        const all = r.data?.data ?? r.data ?? [];
        const active = all.filter(o => o.status !== 'cancelled');
        setOrders(active);
        if (active.length > 0) setSelId(active[0].order_id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load order detail + existing recommendations when selection changes
  useEffect(() => {
    if (!selId) return;
    setLoadingRecs(true);
    axios.get(`/api/customer/orders/${selId}`)
      .then(r => {
        const o    = r.data?.order ?? r.data;
        const recArr = r.data?.recommendations ?? [];
        setOrder(o);
        setRecs(recArr);
        setAccepted(o?.ai_recommendation_status === 'accepted');
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, [selId]);

  // Generate new AI recommendation
  const generate = async () => {
    if (!selId) return;
    setGenerating(true);
    try {
      const { data } = await axios.post('/api/customer/ai/recommend-materials', { order_id: selId });
      // Reload order to get fresh recs + updated ai_recommendation_status
      const refresh  = await axios.get(`/api/customer/orders/${selId}`);
      const o        = refresh.data?.order ?? refresh.data;
      const recArr   = refresh.data?.recommendations ?? data.recommendations ?? [];
      setOrder(o);
      setRecs(recArr);
      setAccepted(o?.ai_recommendation_status === 'accepted');
    } catch(e) {
      alert(e.response?.data?.message ?? 'AI unavailable. Check your GEMINI_API_KEY in .env');
    } finally {
      setGenerating(false);
    }
  };

  const onAccepted = () => {
    setShowAccept(false);
    setAccepted(true);
    setShowConf(true);
    cacheClear('orders_list','customer_dashboard');
    setTimeout(() => setShowConf(false), 3500);
  };

  // NEW — after the customer submits their own material picks instead of
  // accepting the AI's, reload the order to show what they selected.
  const onSelfSelected = async () => {
    setShowPicker(false);
    setAccepted(true);
    setShowConf(true);
    cacheClear('orders_list','customer_dashboard');
    const refresh = await axios.get(`/api/customer/orders/${selId}`).catch(()=>null);
    if (refresh) {
      setOrder(refresh.data?.order ?? refresh.data);
      setRecs(refresh.data?.recommendations ?? []);
    }
    setTimeout(() => setShowConf(false), 3500);
  };

  const selectedOrder = orders.find(o => o.order_id === selId);
  const sc = STATUS_C[selectedOrder?.status] ?? STATUS_C.pending;
  const hasRecs = recs.length > 0;

  return (
    <>
      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {showAccept && order && (
        <AcceptModal order={order} recs={recs}
          onClose={() => setShowAccept(false)} onDone={onAccepted}/>
      )}

      {showPicker && order && (
        <SelfPickModal order={order}
          onClose={() => setShowPicker(false)} onDone={onSelfSelected}/>
      )}

      <div style={{ fontFamily:FONT, color:'#0f172a' }}>

        {/* Page header */}
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a',
            margin:'0 0 4px', fontFamily:FONT }}>
            🤖 AI Material Recommendation
          </h1>
          <p style={{ color:'#64748b', fontSize:13, margin:0, fontFamily:FONT }}>
            Powered by Gemini Flash — VFRB material standards + your order specs
          </p>
        </div>

        {/* How AI works — panel understands this is Layer 1 */}
        <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
          style={{ padding:'14px 18px', borderRadius:14,
            background:'linear-gradient(135deg,rgba(2,128,144,.07),rgba(2,195,154,.05))',
            border:'1px solid rgba(2,195,154,.2)', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9, flexShrink:0,
              background:`linear-gradient(135deg,${T},${T2})`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              🤖
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'#0f172a',
                margin:'0 0 4px', fontFamily:FONT }}>
                How AI Recommendation Works
              </p>
              <p style={{ fontSize:12, color:'#475569', lineHeight:1.65,
                margin:0, fontFamily:FONT }}>
                Gemini Flash analyzes your garment type, quantity, color, and specifications
                to recommend the types of raw materials your order will need.
                Exact quantities are determined by VFRB's production team — the AI provides
                general guidance on material categories and descriptions.
                When you accept, VFRB staff are notified to prepare your materials.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Order selector */}
        {loading ? (
          <div style={{ ...SK, height:48, borderRadius:12, marginBottom:20 }}/>
        ) : orders.length === 0 ? (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0',
            borderRadius:16, padding:'48px 24px', textAlign:'center',
            boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize:48, marginBottom:14, opacity:.3 }}>🤖</div>
            <h3 style={{ fontSize:16, fontWeight:700, color:'#0f172a',
              marginBottom:8, fontFamily:FONT }}>
              No orders yet
            </h3>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20, fontFamily:FONT }}>
              Place an order first to get AI material recommendations.
            </p>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={() => nav('/customer/order/create')}
              style={{ padding:'11px 24px', borderRadius:12, border:'none',
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:FONT, boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>
              🎨 Start a New Order →
            </motion.button>
          </div>
        ) : (
          <>
            {/* Order picker */}
            <div style={{ display:'flex', gap:12, alignItems:'center',
              marginBottom:20, flexWrap:'wrap' }}>
              <select value={selId ?? ''} onChange={e => setSelId(Number(e.target.value))}
                style={{ flex:1, minWidth:200, padding:'11px 14px', borderRadius:11,
                  border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a',
                  fontSize:13, outline:'none', fontFamily:FONT, cursor:'pointer' }}
                onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`;}}
                onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none';}}>
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    Order #{o.order_id} — {o.garment_type ?? 'Custom'} · {o.quantity_ordered} pcs ({o.status})
                  </option>
                ))}
              </select>

              {/* Status pill */}
              {selectedOrder && (
                <span style={{ padding:'6px 14px', borderRadius:99,
                  fontSize:11, fontWeight:700,
                  background:`${sc.color}18`, color:sc.color,
                  border:`1px solid ${sc.color}30`, flexShrink:0, fontFamily:FONT }}>
                  {sc.icon} {sc.label}
                </span>
              )}
            </div>

            {/* Generate button */}
            <div style={{ marginBottom:20 }}>
              <motion.button
                whileHover={{ scale: generating ? 1 : 1.01,
                  // FIX: 'none' isn't animatable to/from an actual box-shadow
                  // value (that's the console warning) — using a zero-alpha
                  // shadow of the same shape lets Framer Motion interpolate
                  // normally instead of just snapping.
                  boxShadow: generating ? '0 8px 24px rgba(2,128,144,0)' : `0 8px 24px rgba(2,128,144,.35)` }}
                whileTap={{ scale: generating ? 1 : .97 }}
                onClick={generate} disabled={generating}
                style={{ width:'100%', padding:'14px', borderRadius:13, border:'none',
                  background: generating
                    ? 'rgba(2,128,144,.15)'
                    : `linear-gradient(135deg,${T},${T2})`,
                  color: generating ? T : '#fff',
                  fontSize:14, fontWeight:700, cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily:FONT, position:'relative', overflow:'hidden',
                  transition:'all .2s',
                  boxShadow: generating ? 'none' : `0 4px 16px rgba(2,128,144,.3)` }}>
                {generating ? (
                  <span style={{ display:'flex', alignItems:'center',
                    justifyContent:'center', gap:10 }}>
                    <motion.span
                      animate={{ rotate:360 }} transition={{ duration:.8, repeat:Infinity, ease:'linear' }}
                      style={{ display:'inline-block', fontSize:16 }}>⚙️</motion.span>
                    Gemini is analyzing your order…
                  </span>
                ) : (
                  hasRecs
                    ? '🔄 Regenerate AI Recommendation'
                    : '🤖 Get AI Material Recommendation'
                )}
              </motion.button>
              <p style={{ fontSize:11, color:'#94a3b8', textAlign:'center',
                marginTop:6, fontFamily:FONT }}>
                Powered by Google Gemini Flash · Results cached per order
              </p>
              <p style={{ fontSize:12, textAlign:'center', marginTop:10, fontFamily:FONT }}>
                <button type="button" onClick={()=>setShowPicker(true)}
                  style={{ background:'none', border:'none', color:T, fontWeight:700,
                    fontSize:12, cursor:'pointer', textDecoration:'underline', fontFamily:FONT }}>
                  Or choose your own materials instead →
                </button>
              </p>
            </div>

            {/* Recommendations */}
            {loadingRecs ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0',
                    borderRadius:14, padding:'18px 20px' }}>
                    <div style={{ display:'flex', gap:10, marginBottom:12 }}>
                      <div style={{ ...SK, width:38, height:38, borderRadius:10, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ ...SK, height:14, width:'55%', marginBottom:8 }}/>
                        <div style={{ ...SK, height:10, width:'30%' }}/>
                      </div>
                    </div>
                    <div style={{ ...SK, height:36, borderRadius:10 }}/>
                  </div>
                ))}
              </div>
            ) : hasRecs ? (
              <>
                {/* Accepted banner */}
                <AnimatePresence>
                  {(accepted || showConf) && (
                    <motion.div
                      initial={{ opacity:0, scale:.97, y:-8 }}
                      animate={{ opacity:1, scale:1, y:0 }}
                      exit={{ opacity:0, scale:.97 }}
                      style={{ padding:'16px 20px', borderRadius:14,
                        background:'linear-gradient(135deg,rgba(34,197,94,.1),rgba(2,195,154,.08))',
                        border:'1px solid rgba(34,197,94,.3)', marginBottom:20,
                        display:'flex', alignItems:'center', gap:14,
                        position:'relative', overflow:'hidden' }}>
                      {showConf && <ConfettiBurst/>}
                      <div style={{ width:36, height:36, borderRadius:10,
                        background:'rgba(34,197,94,.15)', display:'flex',
                        alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        ✅
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:800, color:'#166534',
                          margin:0, fontFamily:FONT }}>
                          Materials Accepted — VFRB Staff Notified
                        </p>
                        <p style={{ fontSize:11, color:'#15803d', margin:'3px 0 0', fontFamily:FONT }}>
                          Staff will prepare these materials for your production order.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rec cards */}
                <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
                  {recs.map((r, i) => (
                    <RecCard key={r.rec_id ?? i} rec={r} index={i}/>
                  ))}
                </div>

                {/* Accept CTA */}
                {!accepted && (
                  <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                    style={{ padding:'22px', borderRadius:16,
                      background:`linear-gradient(135deg,rgba(2,128,144,.06),rgba(2,195,154,.08))`,
                      border:'1px solid rgba(2,195,154,.25)', textAlign:'center' }}>
                    <p style={{ fontSize:15, fontWeight:700, color:'#0f172a',
                      marginBottom:6, fontFamily:FONT }}>
                      Happy with these recommendations?
                    </p>
                    <p style={{ fontSize:12, color:'#64748b', marginBottom:18,
                      maxWidth:400, margin:'0 auto 18px', lineHeight:1.6, fontFamily:FONT }}>
                      Accepting notifies VFRB production staff to prepare exactly
                      these materials for your order. You can add a note.
                    </p>
                    <motion.button
                      whileHover={{ scale:1.02, boxShadow:'0 8px 24px rgba(34,197,94,.35)' }}
                      whileTap={{ scale:.97 }}
                      onClick={() => setShowAccept(true)}
                      style={{ padding:'13px 36px', borderRadius:12, border:'none',
                        background:'linear-gradient(135deg,#22c55e,#16a34a)',
                        color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer',
                        fontFamily:FONT, boxShadow:'0 6px 20px rgba(34,197,94,.3)' }}>
                      ✓ Accept & Notify Staff
                    </motion.button>
                  </motion.div>
                )}
              </>
            ) : !generating && (
              <motion.div initial={{ opacity:0, scale:.98 }} animate={{ opacity:1, scale:1 }}
                style={{ background:'#fff', border:'1px dashed #e2e8f0',
                  borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:14, opacity:.3 }}>🤖</div>
                <h3 style={{ fontSize:15, fontWeight:700, color:'#0f172a',
                  marginBottom:8, fontFamily:FONT }}>
                  No recommendations yet
                </h3>
                <p style={{ fontSize:13, color:'#64748b', fontFamily:FONT }}>
                  Click "Get AI Material Recommendation" to analyze your order.
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </>
  );
}
