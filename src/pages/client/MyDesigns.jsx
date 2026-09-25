// src/pages/client/MyDesigns.jsx — customer-facing browsing surface for the customer's
// design work, addressing the gap where "Continue editing" / "order this design again"
// only existed inside the Studio's Inspiration tab (InspoGallery.jsx), not as a page a
// customer could navigate to. Backed by the same two endpoints the Studio already uses:
//   GET /api/customer/drafts/latest — the one in-progress design (one row per user; there
//     is no multi-draft list in this schema, so this page shows at most one "current" card)
//   GET /api/customer/designs       — starter templates (source_order_id null, surfaced in
//     the Studio's own Inspiration tab, not repeated here) + this customer's own designs
//     that were archived when an order completed (is_archived true) — browsable, not
//     re-editable in place, but usable as the base for a new design via "Order again".
// No new backend endpoint, table, or field is used — this page is a read surface over
// data the Studio already writes.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import EmptyState from '../../components/EmptyState';
import { NavIcon } from '../../components/ui/icons';
import { MiniPreview } from './design-studio/InspoGallery';

const T    = 'var(--teal)';
const T2   = 'var(--teal-2)';
const TEAL_HEX = '#028090'; // same brand teal as --teal, but a literal hex: `${T}30` (T='var(--teal)') is invalid CSS and drops the border silently, a pre-existing pattern also present in Dashboard.jsx's own btn() helper.
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;
const CARD = { background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0' };

function reltime(ts) {
  if (!ts) return '';
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

function CurrentDesignCard({ draft, onContinue, onOrder }) {
  const cfg = draft.studio_config ?? {};
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      style={{ ...CARD, padding:16, display:'flex', gap:14, alignItems:'center' }}>
      <div style={{ width:64, height:78, borderRadius:10, background:'#f8fafc', border:'1px solid #e2e8f0',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
        {draft.preview_dataurl
          ? <img src={draft.preview_dataurl} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
          : <MiniPreview garment={cfg.garment} colors={cfg.colors ?? {}}/>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10, fontWeight:800, color:T, textTransform:'uppercase', letterSpacing:'.06em', margin:'0 0 3px', fontFamily:FONT }}>
          Continue where you left off
        </p>
        <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:'0 0 3px', fontFamily:FONT }}>
          {draft.label || cfg.garment || 'Untitled design'}
        </h3>
        <p style={{ fontSize:11.5, color:'#64748b', margin:0, fontFamily:FONT }}>
          {cfg.category ?? 'Design'} · updated {reltime(draft.updated_at)}
        </p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
        <button onClick={onContinue} style={{ padding:'9px 16px', borderRadius:10, border:'none', cursor:'pointer',
          background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontWeight:700, fontSize:12, fontFamily:FONT, whiteSpace:'nowrap' }}>
          Continue editing
        </button>
        <button onClick={onOrder} style={{ padding:'8px 16px', borderRadius:10, border:`1.5px solid ${TEAL_HEX}30`, cursor:'pointer',
          background:'#fff', color:T, fontWeight:700, fontSize:11.5, fontFamily:FONT }}>
          Order this design
        </button>
      </div>
    </motion.div>
  );
}

function PastDesignCard({ design, onOrderAgain, i }) {
  const cfg = design.config ?? {};
  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: Math.min(i, 6) * 0.04 }}
      style={{ ...CARD, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ width:'100%', aspectRatio:'4/3', borderRadius:10, background:'#f8fafc', border:'1px solid #f1f5f9',
        display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {design.photo_path
          ? <img src={design.photo_path} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
          : <MiniPreview garment={design.garment} colors={cfg.colors ?? {}}/>}
      </div>
      <div>
        <h4 style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:'0 0 2px', fontFamily:FONT,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {design.label || design.garment || 'Design'}
        </h4>
        <p style={{ fontSize:11, color:'#94a3b8', margin:0, fontFamily:FONT }}>
          {[design.category, design.sleeve].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20, background:'#f0fdfa', color:'#0f766e' }}>Ordered before</span>
      </div>
      <button onClick={() => onOrderAgain(design)} disabled={!cfg.garment}
        style={{ padding:'8px 12px', borderRadius:9, border:`1.5px solid ${TEAL_HEX}30`, cursor: cfg.garment ? 'pointer' : 'not-allowed',
          opacity: cfg.garment ? 1 : .5, background:'#fff', color:T, fontWeight:700, fontSize:11.5, fontFamily:FONT }}>
        Order again
      </button>
    </motion.div>
  );
}

export default function MyDesigns() {
  const nav = useNavigate();
  const [draft, setDraft]   = useState(null);
  const [past,  setPast]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      axios.get('/api/customer/drafts/latest'),
      axios.get('/api/customer/designs'),
    ]).then(([d, p]) => {
      if (!alive) return;
      if (d.status === 'fulfilled' && d.value.data?.draft?.studio_config?.garment) setDraft(d.value.data.draft);
      if (p.status === 'fulfilled') setPast(p.value.data.filter(x => x.is_archived && x.config?.garment));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const openStudioBlank = () => { sessionStorage.removeItem('studio_config'); nav('/design-studio'); };
  const continueDraft   = () => { sessionStorage.removeItem('studio_config'); nav('/design-studio'); }; // Studio's own draft-restore offer picks this up
  const orderDraft      = () => { sessionStorage.setItem('studio_config', JSON.stringify(draft.studio_config)); nav('/order/create'); };
  const orderAgain      = (design) => { sessionStorage.setItem('studio_config', JSON.stringify(design.config)); nav('/design-studio'); };

  const nothingYet = !loading && !draft && past.length === 0;

  return (
    <div style={{ maxWidth:1040, margin:'0 auto', padding:'4px 2px 40px', fontFamily:FONT }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0f172a', margin:'0 0 2px' }}>My Designs</h1>
          <p style={{ fontSize:12.5, color:'#64748b', margin:0 }}>Your work in progress and past designs.</p>
        </div>
        <button onClick={openStudioBlank} style={{ padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer',
          background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontWeight:700, fontSize:12.5,
          display:'inline-flex', alignItems:'center', gap:7, boxShadow:`0 3px 12px ${T}35` }}>
          <NavIcon name="designStudio" size={15}/> New design
        </button>
      </div>

      {loading && (
        <div style={{ ...CARD, padding:16, height:96, background:'linear-gradient(90deg,#f8fafc 25%,#f1f5f9 50%,#f8fafc 75%)',
          backgroundSize:'400px', animation:'sk 1.4s infinite' }}/>
      )}

      {!loading && draft && (
        <div style={{ marginBottom:24 }}>
          <CurrentDesignCard draft={draft} onContinue={continueDraft} onOrder={orderDraft}/>
        </div>
      )}

      {!loading && nothingYet && (
        <EmptyState illustration="order" headline="No designs yet"
          sub="Open the Design Studio to create your first custom uniform."
          cta={{ label:'Open Design Studio', onClick: openStudioBlank }}/>
      )}

      {!loading && past.length > 0 && (
        <>
          <h2 style={{ fontSize:13, fontWeight:800, color:'#334155', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 12px' }}>
            Past designs
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
            {past.map((d, i) => <PastDesignCard key={d.id} design={d} onOrderAgain={orderAgain} i={i}/>)}
          </div>
        </>
      )}

      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}
