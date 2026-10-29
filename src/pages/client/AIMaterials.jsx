// src/pages/client/AIMaterials.jsx — AI raw-material recommendation (Layer 1, Gemini Flash).
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }                              from 'react-router-dom';
import { motion, AnimatePresence }                  from 'framer-motion';
import { NavIcon }                                  from '../../components/ui/icons';
import axios                                        from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }      from '../../utils/cache';
import { asList }                                   from '../../utils/asList';
import { materialColour }                           from '../../utils/materialColour';
import { garmentLabel } from '../../utils/designName';

const T    = 'var(--teal)';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const SK = {
  borderRadius:8, background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--bg-surface-2) 50%,var(--bg-surface) 75%)',
  backgroundSize:'400px', animation:'sk 1.4s infinite',
};

// Category config, colors/icons per material category — shared with MaterialsReveal.jsx.
export const CAT = {
  Fabric:       { icon:'materials', color:'#3b82f6', bg:'#dbeafe' },
  Thread:       { icon:'materials', color:'#8b5cf6', bg:'#ede9fe' },
  Elastic:      { icon:'materials', color:'#f97316', bg:'#ffedd5' },
  Accessories:  { icon:'package',   color:'var(--text-subtle)', bg:'#f1f5f9' },
  Trim:         { icon:'materials', color:'#06b6d4', bg:'#cffafe' },
  Label:        { icon:'package',   color:'#0d9488', bg:'#ccfbf1' },
  Trims:        { icon:'materials', color:'#06b6d4', bg:'#cffafe' },
  Lining:       { icon:'materials', color:'#f59e0b', bg:'#fef3c7' },
  Other:        { icon:'package',   color:'var(--text-faint)', bg:'var(--bg-surface)' },
};

const STATUS_C = {
  pending:     { color:'#f59e0b', label:'Pending',     icon:'pending'     },
  confirmed:   { color:'#3b82f6', label:'Confirmed',   icon:'success'     },
  pattern:     { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  segregation: { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  cutting:     { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  sewing:      { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  qc:          { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  pressing:    { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  packing:     { color:'var(--info-text)', label:'Confirmed', icon:'success' },
  completed:   { color:'#22c55e', label:'Completed',   icon:'success'     },
  cancelled:   { color:'#ef4444', label:'Cancelled',   icon:'error'       },
};

// Confetti burst on accept — shared with MaterialsReveal.jsx.
export function ConfettiBurst() {
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

// Accept confirmation modal — shared with MaterialsReveal.jsx.
export function AcceptModal({ order, recs, onClose, onDone }) {
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
          style={{ background:'var(--bg-card)', borderRadius:20, width:'min(480px,100%)',
            maxHeight:'85vh', display:'flex', flexDirection:'column',
            overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.22)' }}>

          {/* Header */}
          <div style={{ padding:'20px 24px', background:'var(--teal-50)',
            borderBottom:'1px solid #99f6e4', flexShrink:0 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'var(--ink)',
              margin:0, fontFamily:FONT }}>
              <NavIcon name="success" size={16} color="var(--ink)" style={{ verticalAlign:"-3px", marginRight:6 }}/>Confirm Material Acceptance
            </h3>
            <p style={{ fontSize:13, color:'var(--text-subtle)', margin:'4px 0 0', fontFamily:FONT }}>
              Order #{order.order_id} · {garmentLabel(order.garment_type)} · {order.quantity_ordered} pcs
            </p>
          </div>

          {/* Materials list */}
          <div style={{ padding:'20px 24px', overflowY:'auto', flex:1 }}>
            <div style={{ background:'var(--bg-surface)', borderRadius:12, padding:14,
              marginBottom:16, border:'1px solid var(--border)' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-subtle)',
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
                      <span style={{ display:'flex' }}><NavIcon name={cat.icon} size={16} color={cat.color}/></span>
                      <div>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)',
                          margin:0, fontFamily:FONT }}>
                          {r.material_name}
                        </p>
                        <p style={{ fontSize:13, color:'var(--text-subtle)', margin:0, fontFamily:FONT }}>
                          {r.category}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <label style={{ display:'block', fontSize:13, fontWeight:700,
 color:'var(--text-subtle)',
              marginBottom:7, fontFamily:FONT }}>
              Notes for the VFRB team (optional)
            </label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="e.g. Please use cotton blend, prefer navy blue thread…"
              style={{ width:'100%', padding:'10px 14px', borderRadius:10,
                border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)',
                fontSize:13, outline:'none', resize:'none',
                fontFamily:FONT, boxSizing:'border-box' }}
              onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`;}}
              onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none';}}/>
            {err && <p style={{ color:'#ef4444', fontSize:13, marginTop:8, fontFamily:FONT, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={12} color="#ef4444"/> {err}</p>}
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)',
            display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg-surface)', flexShrink:0 }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={onClose}
              style={{ padding:'9px 18px', borderRadius:10, border:'1px solid var(--border)',
                background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:600,
                cursor:'pointer', fontFamily:FONT }}>
              Cancel
            </motion.button>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={submit} disabled={busy}
              style={{ padding:'9px 24px', borderRadius:10, border:'none',
                background:busy?'var(--text-faint)':'linear-gradient(135deg,#22c55e,#16a34a)',
                color:'#fff', fontSize:13, fontWeight:700,
                cursor:busy?'not-allowed':'pointer', fontFamily:FONT,
                boxShadow:busy?'none':'0 4px 14px rgba(34,197,94,.3)' }}>
              {busy ? 'Confirming…' : 'Accept & Notify VFRB Team'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Lets the customer skip AI and pick materials from the real catalog directly.
export function SelfPickModal({ order, onClose, onDone }) {
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
          style={{ background:'var(--bg-card)', borderRadius:20, width:'min(520px,100%)',
            maxHeight:'85vh', display:'flex', flexDirection:'column',
            overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.22)' }}>

          <div style={{ padding:'20px 24px', background:'var(--teal-50)', borderBottom:'1px solid #99f6e4', flexShrink:0 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'var(--ink)', margin:0, fontFamily:FONT }}>
              <NavIcon name="materials" size={16} color="var(--ink)" style={{ verticalAlign:"-3px", marginRight:6 }}/>Choose Your Own Materials
            </h3>
            <p style={{ fontSize:13, color:'var(--text-subtle)', margin:'4px 0 0', fontFamily:FONT }}>
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
                    <p style={{ fontSize:13, fontWeight:700, color:cfg.color,
                      marginBottom:8, fontFamily:FONT }}>
                      <NavIcon name={cfg.icon} size={11} color={cfg.color}/> {cat}
                    </p>
                    {mats.map(m => (
                      <label key={m.material_id} style={{ display:'flex', alignItems:'center',
                        gap:10, padding:'8px 10px', borderRadius:9, cursor:'pointer',
                        background: picked.has(m.material_id) ? `${cfg.color}12` : 'transparent' }}>
                        <input type="checkbox" checked={picked.has(m.material_id)}
                          onChange={()=>toggle(m.material_id)} style={{ width:16, height:16, accentColor:T }}/>
                        <span style={{ fontSize:13, color:'var(--ink)', fontFamily:FONT }}>{m.material_name}</span>
                      </label>
                    ))}
                  </div>
                );
              })
            )}

            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Optional note for the VFRB team about your selection…" rows={2}
              style={{ width:'100%', marginTop:6, padding:'10px 12px', borderRadius:10,
                border:'1px solid var(--border)', fontSize:13, fontFamily:FONT, resize:'none', boxSizing:'border-box' }}/>

            {err && <p style={{ color:'#ef4444', fontSize:13, marginTop:8, display:'flex', alignItems:'center', gap:5 }}><NavIcon name="warning" size={12} color="#ef4444"/> {err}</p>}
          </div>

          <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)',
            display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg-surface)', flexShrink:0 }}>
            <button onClick={onClose} style={{ padding:'10px 18px', borderRadius:10,
              border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)',
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
            <button onClick={submit} disabled={busy || loading}
              style={{ padding:'10px 22px', borderRadius:10, border:'none',
                background: busy ? 'var(--text-faint)' : `linear-gradient(135deg,${T},${T2})`,
                color:'#fff', fontSize:13, fontWeight:700,
                cursor: busy ? 'not-allowed' : 'pointer', fontFamily:FONT }}>
              {busy ? '⏳…' : `Send Selection (${picked.size})`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


// Catalog facts the server reads from the materials table (never from the AI): code, stock and colour fit. No quantity or price.
// Merges the catalog facts (GET /orders/{id}/ai-recommendation, keyed by material name) into the order's recommendation rows.
export async function withCatalogFacts(orderId, recArr) {
  if (!recArr?.length) return recArr ?? [];
  try {
    const { data } = await axios.get(`/api/customer/orders/${orderId}/ai-recommendation`);
    const facts = data?.recommendation?.materials_json ?? {};
    return recArr.map(r => {
      const f = facts[r.material_name];
      return f ? { ...r, material_code: f.material_code ?? null, in_stock: f.in_stock ?? null, colour_match: f.colour_match ?? null, image_url: f.image_url ?? null, description: f.description ?? null } : r;
    });
  } catch { return recArr; }
}

// Only our Cloudinary account or the app's own /storage uploads; seeded /material-images/ are third-party stock.
const OWN_CLOUD = (import.meta.env.VITE_MODEL_BASE_URL || '').match(/^https:\/\/res\.cloudinary\.com\/[^/]+\//)?.[0];
const isOwnImage = (url) => {
  if (!url) return false;
  if (OWN_CLOUD && url.startsWith(OWN_CLOUD)) return true;
  try { const u = new URL(url, window.location.origin); return u.pathname.startsWith('/storage/'); } catch { return false; }
};
// Display-only: drops internal codes like "(MAT-FAB-014)".
export const stripCodes = (s) => s?.replace(/\s*\(?\bMAT-[A-Z]{3}-\d{3}\b\)?/g, '').trim();

const TILE_H = 128;
const typeChip = { position:'absolute', left:10, bottom:10, padding:'3px 9px', borderRadius:99, fontSize:13, fontWeight:700,
  background:'rgb(255 255 255 / .92)', color:'#1f2937', fontFamily:FONT };
const weave = (hex) => `repeating-linear-gradient(0deg, rgb(255 255 255 / .09) 0 2px, transparent 2px 4px),
  repeating-linear-gradient(90deg, rgb(0 0 0 / .11) 0 2px, transparent 2px 4px), ${hex}`;

// Fabric as a woven colour swatch; a name without a colour word gets the neutral paper tile.
function SwatchTile({ hex, label }) {
  return (
    <div aria-hidden="true" style={{ position:'relative', height:TILE_H, background: weave(hex ?? 'var(--bg-surface-2, #e5e7eb)') }}>
      <span style={typeChip}>{label}</span>
    </div>
  );
}

// Thread as a spool wound in the thread colour.
function SpoolGlyph({ hex, label }) {
  const c = hex ?? '#9ca3af';
  return (
    <div aria-hidden="true" style={{ position:'relative', height:TILE_H, display:'grid', placeItems:'center', background:'var(--bg-surface)' }}>
      <svg width="64" height="88" viewBox="0 0 64 88">
        <rect x="6" y="4" width="52" height="10" rx="3" fill="#c9a77c"/>
        <rect x="6" y="74" width="52" height="10" rx="3" fill="#c9a77c"/>
        <rect x="12" y="14" width="40" height="60" fill={c}/>
        {[22, 30, 38, 46, 54, 62].map(y => <line key={y} x1="12" x2="52" y1={y} y2={y + 2} stroke="rgb(0 0 0 / .16)" strokeWidth="1.5"/>)}
        <path d="M52 40 C60 44 58 56 62 62" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span style={typeChip}>{label}</span>
    </div>
  );
}

// SCOPE-001: swatch, name, type and one catalog description line only — never a quantity, estimate, price or internal code.
export function RecCard({ rec }) {
  const cat = CAT[rec.category] ?? CAT.Other;
  const name = stripCodes(rec.material_name);
  const desc = stripCodes(rec.description)?.replace(/\s+/g, ' ');
  const label = rec.category || 'Material';
  const kind = /thread/i.test(rec.category ?? '') ? 'spool' : /fabric|lining/i.test(rec.category ?? '') ? 'swatch' : null;
  return (
    <div className="vfrb-card flush overflow-hidden">
      {isOwnImage(rec.image_url) ? (
        <img src={rec.image_url} alt={name} loading="lazy" className="block w-full object-cover" style={{ height:TILE_H }}/>
      ) : kind === 'swatch' ? <SwatchTile hex={materialColour(rec.material_name)} label={label}/>
        : kind === 'spool' ? <SpoolGlyph hex={materialColour(rec.material_name)} label={label}/>
        : (
        <div className="w-full flex items-center justify-center" style={{ position:'relative', height:TILE_H, background:cat.bg }} aria-hidden="true">
          <NavIcon name={cat.icon} size={32} color={cat.color}/>
          <span style={typeChip}>{label}</span>
        </div>
      )}
      <div style={{ padding:'var(--sp-4)' }}>
        <p style={{ fontSize:17, fontWeight:800, color:'var(--ink)', margin:0, fontFamily:FONT, overflowWrap:'anywhere' }}>
          {name}
        </p>
        {/* Catalog colour fit from the server: a neighbouring colour family, offered but not exact. */}
        {rec.colour_match === 'near' && (
          <span title="Close to your colour, not an exact match" style={{ display:'inline-block', marginTop:6, padding:'2px 8px', borderRadius:99, fontSize:13, fontWeight:700,
            background:'var(--warning-bg, #fef3c7)', color:'var(--warning-text, #92400e)', fontFamily:FONT }}>
            Near match
          </span>
        )}
        {desc && (
          <p title={desc} style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5, margin:'6px 0 0', fontFamily:FONT,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {desc}
          </p>
        )}
      </div>
    </div>
  );
}

// Shown once above any list of RecCards.
export const AI_OPTIONAL_LINE = 'Suggested by AI. Optional.';

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIMaterials() {
  const nav = useNavigate();

  const [orders,      setOrders]      = useState([]);
  const [selId,       setSelId]       = useState(null);
  const [order,       setOrder]       = useState(null);
  const [recs,        setRecs]        = useState([]);
  const [source,      setSource]      = useState(null); // 'ai' | 'cache' | 'catalog_default' from the last generation
  const [generating,  setGenerating]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [ordersError,  setOrdersError]  = useState(false);
  const [recsError,    setRecsError]    = useState(false);
  const [showAccept,  setShowAccept]  = useState(false);
  const [accepted,    setAccepted]    = useState(false);
  const [showConf,    setShowConf]    = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);

  // Load all customer orders for the selector
  const loadOrders = useCallback(() => {
    setLoading(true); setOrdersError(false);
    axios.get('/api/customer/orders')
      .then(r => {
        const all = asList(r.data);
        const active = all.filter(o => o.status !== 'cancelled');
        setOrders(active);
        setSelId(prev => prev ?? active[0]?.order_id ?? null);
      })
      .catch(() => setOrdersError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Load order detail + existing recommendations when selection changes
  const loadDetail = useCallback(() => {
    if (!selId) return;
    setLoadingRecs(true); setRecsError(false);
    axios.get(`/api/customer/orders/${selId}`)
      .then(r => {
        const o    = r.data?.order ?? r.data;
        const recArr = r.data?.recommendations ?? [];
        setOrder(o);
        setRecs(recArr);
        setAccepted(o?.ai_recommendation_status === 'accepted');
        withCatalogFacts(selId, recArr).then(setRecs);
      })
      .catch(() => setRecsError(true))
      .finally(() => setLoadingRecs(false));
  }, [selId]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

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
      // The fresh rows carry the catalog facts the recommend call returned (code, stock, colour fit, image, description).
      const facts = Object.fromEntries((data?.materials ?? []).map(m => [m.material_id, m]));
      setRecs(recArr.map(r => { const f = facts[r.material_id]; return f ? { ...r, material_code: f.material_code, in_stock: f.in_stock, colour_match: f.colour_match, image_url: f.image_url ?? null, description: f.description ?? null } : r; }));
      setSource(data?.source ?? null);
      setAccepted(o?.ai_recommendation_status === 'accepted');
    } catch(e) {
      alert(e.response?.data?.message ?? 'AI recommendations are unavailable right now. Please try again shortly.');
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

      <div className="cx-page" style={{ fontFamily:FONT }}>

        {/* Page header */}
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:'clamp(22px,3vw,30px)', fontWeight:800, color:'var(--ink)',
            margin:'0 0 4px', fontFamily:FONT }}>
            <NavIcon name="ai" size={20} color="var(--ink)" style={{ verticalAlign:"-4px", marginRight:6 }}/>AI Material Recommendation
          </h1>
          <p style={{ color:'var(--text-subtle)', fontSize:13, margin:0, fontFamily:FONT }}>
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
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <NavIcon name="ai" size={18} color="#fff"/>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)',
                margin:'0 0 4px', fontFamily:FONT }}>
                How AI Recommendation Works
              </p>
              <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.65,
                margin:0, fontFamily:FONT }}>
                Gemini Flash reads your garment type, fit, colors, and design details
                to recommend the types of raw materials your order will need.
                Exact quantities are determined by VFRB's production team — the AI provides
                general guidance on material categories and descriptions.
                When you accept, the VFRB team is notified to prepare your materials.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Order selector */}
        {loading ? (
          <div style={{ ...SK, height:48, borderRadius:12, marginBottom:20 }}/>
        ) : ordersError ? (
          <div role="alert" style={{ background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:14,
            padding:'20px 24px', textAlign:'center', fontFamily:FONT }}>
            <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--danger-text)' }}>Couldn't load your orders. Check your connection and try again.</p>
            <button onClick={loadOrders} style={{ minHeight:44, padding:'0 20px', borderRadius:12, border:'1px solid var(--danger-border)',
              background:'var(--bg-card)', color:'var(--danger-text)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>Retry</button>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:16, padding:'48px 24px', textAlign:'center',
            boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14, opacity:.3 }}><NavIcon name="ai" size={40}/></div>
            <h3 style={{ fontSize:16, fontWeight:700, color:'var(--ink)',
              marginBottom:8, fontFamily:FONT }}>
              No orders yet
            </h3>
            <p style={{ fontSize:13, color:'var(--text-subtle)', marginBottom:20, fontFamily:FONT }}>
              Place an order first to get AI material recommendations.
            </p>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={() => nav('/order/create')}
              style={{ padding:'11px 24px', borderRadius:12, border:'none',
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:FONT, boxShadow:`0 4px 14px rgba(2,128,144,.3)` }}>
              <NavIcon name="designStudio" size={14} color="#fff" style={{ verticalAlign:"-2px", marginRight:6 }}/>Start a new order
            </motion.button>
          </div>
        ) : (
          <>
            {/* Order picker */}
            <div style={{ display:'flex', gap:12, alignItems:'center',
              marginBottom:20, flexWrap:'wrap' }}>
              <select value={selId ?? ''} onChange={e => setSelId(Number(e.target.value))}
                style={{ flex:1, minWidth:200, minHeight:44, padding:'11px 14px', borderRadius:11,
                  border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)',
                  fontSize:13, outline:'none', fontFamily:FONT, cursor:'pointer' }}
                onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`;}}
                onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none';}}>
                {orders.map(o => (
                  <option key={o.order_id} value={o.order_id}>
                    Order #{o.order_id} — {o.garment_type ?? 'Custom'} · {o.quantity_ordered} pcs ({o.status})
                  </option>
                ))}
              </select>

              {/* Status pill */}
              {selectedOrder && (
                <span style={{ padding:'6px 14px', borderRadius:99,
                  fontSize:13, fontWeight:700,
                  background:`${sc.color}18`, color:sc.color,
                  border:`1px solid ${sc.color}30`, flexShrink:0, fontFamily:FONT }}>
                  <NavIcon name={sc.icon} size={11} color={sc.color}/> {sc.label}
                </span>
              )}
            </div>

            {/* Generate button */}
            <div style={{ marginBottom:20 }}>
              <motion.button
                whileHover={{ scale: generating ? 1 : 1.01,
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
                      style={{ display:'inline-flex' }}><NavIcon name="loading" size={16} color="currentColor"/></motion.span>
                    Gemini is analyzing your order…
                  </span>
                ) : (
                  hasRecs
                    ? 'Regenerate AI Recommendation'
                    : 'Get AI Material Recommendation'
                )}
              </motion.button>
              <p style={{ fontSize:13, color:'var(--text-faint)', textAlign:'center',
                marginTop:6, fontFamily:FONT }}>
                Powered by Google Gemini Flash · Results cached per order
              </p>
              <p style={{ fontSize:13, textAlign:'center', marginTop:10, fontFamily:FONT }}>
                <button type="button" onClick={()=>setShowPicker(true)}
                  style={{ display:'inline-flex', alignItems:'center', minHeight:44, padding:'0 12px', background:'none', border:'none', color:T, fontWeight:700,
                    fontSize:13, cursor:'pointer', textDecoration:'underline', fontFamily:FONT }}>
                  Or choose your own materials instead
                </button>
              </p>
            </div>

            {/* Recommendations */}
            {loadingRecs ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
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
            ) : recsError ? (
              <div role="alert" style={{ background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:14,
            padding:'20px 24px', textAlign:'center', fontFamily:FONT }}>
            <p style={{ margin:'0 0 12px', fontSize:13, color:'var(--danger-text)' }}>Couldn't load recommendations for this order.</p>
            <button onClick={loadDetail} style={{ minHeight:44, padding:'0 20px', borderRadius:12, border:'1px solid var(--danger-border)',
              background:'var(--bg-card)', color:'var(--danger-text)', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>Retry</button>
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
                        alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <NavIcon name="success" size={18} color="#22c55e"/>
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:800, color:'var(--success-text)',
                          margin:0, fontFamily:FONT }}>
                          Materials Accepted — VFRB Team Notified
                        </p>
                        <p style={{ fontSize:13, color:'var(--success-text)', margin:'3px 0 0', fontFamily:FONT }}>
                          The VFRB team will prepare these materials for your production order.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {source === 'catalog_default' && (
                  <p role="status" style={{ fontSize:13, color:'var(--warning-text)', background:'var(--warning-bg)', borderRadius:10, padding:'8px 12px', margin:'0 0 12px', fontFamily:FONT }}>
                    AI suggestions are unavailable right now, so these are VFRB's standard approved materials for this design. Our team will confirm them.
                  </p>
                )}

                {/* Rec cards */}
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-muted)', margin:'0 0 10px', fontFamily:FONT }}>{AI_OPTIONAL_LINE}</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(100%,300px),1fr))', gap:14, marginBottom:20 }}>
                  {recs.map((r, i) => (
                    <RecCard key={r.rec_id ?? i} rec={r}/>
                  ))}
                </div>

                {/* Accept CTA */}
                {!accepted && (
                  <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                    style={{ padding:'22px', borderRadius:16,
                      background:`linear-gradient(135deg,rgba(2,128,144,.06),rgba(2,195,154,.08))`,
                      border:'1px solid rgba(2,195,154,.25)', textAlign:'center' }}>
                    <p style={{ fontSize:15, fontWeight:700, color:'var(--ink)',
                      marginBottom:6, fontFamily:FONT }}>
                      Happy with these recommendations?
                    </p>
                    <p style={{ fontSize:13, color:'var(--text-subtle)', marginBottom:18,
                      maxWidth:400, margin:'0 auto 18px', lineHeight:1.6, fontFamily:FONT }}>
                      Accepting notifies the VFRB team to prepare exactly
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
                      Accept & Notify VFRB Team
                    </motion.button>
                  </motion.div>
                )}
              </>
            ) : !generating && (
              <motion.div initial={{ opacity:0, scale:.98 }} animate={{ opacity:1, scale:1 }}
                style={{ background:'var(--bg-card)', border:'1px dashed var(--border)',
                  borderRadius:16, padding:'48px 24px', textAlign:'center' }}>
                <div style={{ display:"flex", justifyContent:"center", marginBottom:14, opacity:.3 }}><NavIcon name="ai" size={40}/></div>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--ink)',
                  marginBottom:8, fontFamily:FONT }}>
                  No recommendations yet
                </h3>
                <p style={{ fontSize:13, color:'var(--text-subtle)', fontFamily:FONT }}>
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
