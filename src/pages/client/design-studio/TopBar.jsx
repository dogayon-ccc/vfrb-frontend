import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, hexToRgb } from './dsShared';
import { familyFor } from './garmentCatalog';

// Vertical hairline between command groups — the previous TopBar had 12
// same-weight controls in one flat row with a single flex:1 spacer, so
// nothing signaled which buttons were related. This is the only new
// visual primitive this pass introduces; every button below is unchanged
// functionality, just grouped.
function Divider() {
  return <div style={{ width: 1, alignSelf: 'stretch', margin: '0 2px', background: 'rgba(15,23,42,.08)', flexShrink: 0 }}/>;
}

export default function TopBar({
  nav, cfg, setCfg, catData, undo, redo, canUndo, canRedo,
  viewMode, setViewMode, setHas3DLoaded,
  selObj, deleteSelected, showInspo, setShowInspo, showShowcase, setShowShowcase,
  saved, saving, saveErr, draftSaved, saveDesign, orderThis, ordering,
}) {

  const no3D = familyFor(cfg.garment)?.status3D === 'none';  const reduceMotion = useReducedMotion();
  // Mobile "More" overflow — the bar has ~13 controls at desktop width; below 768px
  // (DesignStudioStyles.jsx's own breakpoint) most of them get hidden via CSS
  // (.ds-bar-brand/.ds-bar-cat/.ds-bar-secondary — see that file) and folded into
  // this single button instead, so nothing gets silently clipped by the bar's
  // fixed 52px height + no-wrap layout. Only exists at the narrow breakpoint;
  // harmless (and inert) at desktop widths where the CSS never shows the trigger.
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [moreOpen]);

  return (
    <div className="ds-bar">

      {/* ── Brand / document ─────────────────────────────────────────── */}
      <button onClick={()=>nav('/dashboard')} title="Back to dashboard"
        style={{ padding:'5px 11px',borderRadius:8,cursor:'pointer',
          border:'1px solid rgba(15,23,42,.12)',background:'transparent',
          color:'rgba(15,23,42,.6)',fontSize:12,flexShrink:0 }}>
        <span className="ds-bar-back-label">← Back</span>
        <span className="ds-bar-back-icon" aria-hidden="true">←</span>
      </button>

      <div className="ds-bar-brand" style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
        <motion.div
          animate={reduceMotion ? { opacity: 1 } : { opacity:[1,.4,1] }}
          transition={reduceMotion ? { duration: 0 } : { duration:1.6, repeat:Infinity, ease:'easeInOut' }}
          style={{ width:6,height:6,borderRadius:'50%',background:T2 }}/>
        <span style={{ fontSize:14,fontWeight:800 }}>Design Studio</span>
      </div>

      {/* Design Name — feeds cfg.name, carried into studio_config on every save */}
      <input
        className="ds-bar-name"
        value={cfg.name ?? ''}
        onChange={e => setCfg(p => ({ ...p, name: e.target.value.slice(0, 80) }))}
        placeholder="Untitled Design"
        title="Design name"
        maxLength={80}
        style={{
          width:150, padding:'5px 9px', borderRadius:8, fontSize:12, fontWeight:600,
          border:'1px solid rgba(15,23,42,.12)', background:'transparent',
          color:'rgba(15,23,42,.75)', outline:'none', flexShrink:0,
        }}/>

      {/* Category badge — color matches body zone */}
      <motion.span className="ds-bar-cat"
        animate={{ background:`rgba(${hexToRgb(cfg.colors.body??T)},.18)` }}
        transition={{ duration:.4 }}
        style={{ display:'inline-flex',alignItems:'center',gap:5,whiteSpace:'nowrap',lineHeight:1.2,fontSize:11,padding:'4px 11px',borderRadius:99,
          color:T2,fontWeight:700,border:`1px solid rgba(2,195,154,.22)`,
          flexShrink:0 }}>
        <NavIcon name={catData.icon} size={12} color={T2} style={{ display:'block', flexShrink:0 }}/>
        {cfg.category}
      </motion.span>

      <div style={{ flex:1 }}/>

      {/* ── Secondary command cluster ── collapses into the "More" trigger below 768px */}
      <div className="ds-bar-secondary" style={{ display:'flex', alignItems:'center', gap:3 }}>
        {/* ── Editing ─────────────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:3, flexShrink:0 }}>
          <motion.button
            whileTap={{ scale:.9 }}
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              width:32, height:32, borderRadius:8, border:'none', cursor: canUndo ? 'pointer' : 'default',
              background:'rgba(15,23,42,.06)', color: canUndo ? 'rgba(15,23,42,.75)' : 'rgba(15,23,42,.2)',
              fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
            }}>↺</motion.button>
          <motion.button
            whileTap={{ scale:.9 }}
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            style={{
              width:32, height:32, borderRadius:8, border:'none', cursor: canRedo ? 'pointer' : 'default',
              background:'rgba(15,23,42,.06)', color: canRedo ? 'rgba(15,23,42,.75)' : 'rgba(15,23,42,.2)',
              fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
            }}>↻</motion.button>
        </div>

        <Divider/>

        {/* ── View ────────────────────────────────────────────────────── */}
        <div style={{ display:'flex',borderRadius:9,overflow:'hidden',
          border:'1px solid rgba(15,23,42,.12)',flexShrink:0 }}>
          {['2d','3d'].map(m=>(
            <button key={m} disabled={m==='3d' && no3D} onClick={()=>{
                if(m==='3d') setHas3DLoaded(true);
                setViewMode(m);
              }}
              title={m==='3d' ? (no3D ? 'No verified 3D model for this garment — 2D is the exact preview' : 'Quick spatial preview — for exact colors and placement, use 2D') : undefined}
              style={{ padding:'6px 14px',border:'none',fontSize:12,fontWeight:700,
                cursor:(m==='3d' && no3D)?'not-allowed':'pointer', opacity:(m==='3d' && no3D)?.4:1,
                background:viewMode===m?T:'transparent',
                color:viewMode===m?'#fff':'rgba(15,23,42,.4)',
                transition:'background .14s' }}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <Divider/>

        {/* ── Utilities (secondary, de-emphasized) ───────────────────── */}
        <button
          onClick={() => setShowInspo(p => !p)}
          title="Design Inspirations"
          style={{
            padding:'6px 12px', borderRadius:8, cursor:'pointer',
            border:`1px solid ${showInspo ? T2 : 'rgba(15,23,42,.12)'}`,
            background: showInspo ? 'rgba(2,195,154,.12)' : 'transparent',
            color: showInspo ? T2 : 'rgba(15,23,42,.5)',
            fontSize:11, fontWeight:700, flexShrink:0, transition:'all .2s',
            display:'flex', alignItems:'center', gap:5,
          }}>
          <NavIcon name="ai" size={12}/> Inspo
        </button>

        <button
          onClick={() => setShowShowcase(p => !p)}
          title="Showcase"
          style={{
            padding:'6px 12px', borderRadius:8, cursor:'pointer',
            border:`1px solid ${showShowcase ? T2 : 'rgba(15,23,42,.12)'}`,
            background: showShowcase ? 'rgba(2,195,154,.12)' : 'transparent',
            color: showShowcase ? T2 : 'rgba(15,23,42,.5)',
            fontSize:11, fontWeight:700, flexShrink:0, transition:'all .2s',
            display:'flex', alignItems:'center', gap:5,
          }}>
          <NavIcon name="ai" size={12}/> Showcase
        </button>
      </div>

      {/* ── Mobile-only overflow trigger ── everything in .ds-bar-secondary above,
          plus brand/category, folds in here below 768px so it's one tap away
          instead of silently clipped by the bar's fixed height / no-wrap layout. */}
      <div className="ds-bar-more" ref={moreRef} style={{ position:'relative', display:'none', flexShrink:0 }}>
        <button type="button" onClick={() => setMoreOpen(o => !o)}
          aria-expanded={moreOpen} aria-label="More studio controls"
          style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(15,23,42,.12)',
            background: moreOpen ? 'rgba(15,23,42,.08)' : 'transparent',
            color:'rgba(15,23,42,.65)', fontSize:16, fontWeight:900, lineHeight:1,
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          ⋯
        </button>
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity:0, y:-6, scale:.98 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-6, scale:.98 }}
              transition={{ duration:.14 }}
              style={{
                position:'absolute', top:'calc(100% + 8px)', right:0, zIndex:60,
                width:200, padding:8, borderRadius:12, background:'#fff',
                border:'1px solid rgba(15,23,42,.1)', boxShadow:'0 10px 28px rgba(15,23,42,.18)',
                display:'flex', flexDirection:'column', gap:4,
              }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 4px 6px' }}>
                <span style={{ fontSize:11, fontWeight:800, color:'rgba(15,23,42,.85)' }}>{cfg.category}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={undo} disabled={!canUndo} title="Undo"
                    style={{ width:26, height:26, border:'none', borderRadius:6, background:'rgba(15,23,42,.06)',
                      color: canUndo ? 'rgba(15,23,42,.75)' : 'rgba(15,23,42,.2)', fontSize:13 }}>↺</button>
                  <button onClick={redo} disabled={!canRedo} title="Redo"
                    style={{ width:26, height:26, border:'none', borderRadius:6, background:'rgba(15,23,42,.06)',
                      color: canRedo ? 'rgba(15,23,42,.75)' : 'rgba(15,23,42,.2)', fontSize:13 }}>↻</button>
                </div>
              </div>
              <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid rgba(15,23,42,.12)' }}>
                {['2d','3d'].map(m=>(
                  <button key={m} disabled={m==='3d' && no3D} onClick={()=>{ if(m==='3d') setHas3DLoaded(true); setViewMode(m); }}
                    style={{ flex:1, padding:'7px 0', border:'none', fontSize:11, fontWeight:700, cursor:'pointer',
                      background:viewMode===m?T:'transparent', color:viewMode===m?'#fff':'rgba(15,23,42,.4)' }}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowInspo(p => !p); setMoreOpen(false); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 6px', border:'none',
                  borderRadius:6, background: showInspo ? 'rgba(2,195,154,.12)' : 'transparent',
                  color: showInspo ? T2 : 'rgba(15,23,42,.7)', fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'left' }}>
                <NavIcon name="ai" size={13}/> Inspo
              </button>
              <button onClick={() => { setShowShowcase(p => !p); setMoreOpen(false); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 6px', border:'none',
                  borderRadius:6, background: showShowcase ? 'rgba(2,195,154,.12)' : 'transparent',
                  color: showShowcase ? T2 : 'rgba(15,23,42,.7)', fontSize:12, fontWeight:700, cursor:'pointer', textAlign:'left' }}>
                <NavIcon name="ai" size={13}/> Showcase
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Persistence ───────────────────────────────────────────────── */}
      <button className="ds-bar-save" onClick={saveDesign} disabled={!cfg.garment || saving} aria-busy={!!saving} aria-label="Save design"
        style={{ padding:'6px 12px',borderRadius:8,cursor:'pointer',
          border:`1px solid ${saved?T2:'rgba(15,23,42,.12)'}`,
          background: saved?'rgba(2,195,154,.12)':'transparent',
          color: saved?T2:'rgba(15,23,42,.5)',fontSize:11,fontWeight:700,
          flexShrink:0,transition:'all .2s',
          display:'flex', alignItems:'center', gap:5 }}>
        {saving
          ? <><span className="ds-spin"/> <span className="ds-bar-save-label">Saving</span></>
          : saveErr
            ? <><NavIcon name="warning" size={12}/> <span className="ds-bar-save-label">Retry</span></>
          : draftSaved
          ? <><NavIcon name="cloudSaved" size={12}/> <span className="ds-bar-save-label">Saved</span></>
          : saved
            ? <><NavIcon name="success" size={12}/> <span className="ds-bar-save-label">Local</span></>
            : <><NavIcon name="save" size={12}/> <span className="ds-bar-save-label">Save</span></>}
      </button>

      {/* ── Primary action ────────────────────────────────────────────── */}
      {/* FIX: was color:'#000' on the teal gradient — DESIGN-SYSTEM.md's own
          audit flags black-on-teal-gradient as a 4.49:1 contrast fail and
          says the fix elsewhere was white text; this button never got that
          fix (TopBar.jsx was only "lightly edited" per that same doc). */}
      <motion.button className="ds-act-order" whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
        onClick={orderThis} disabled={!cfg.garment || ordering}
        aria-busy={!!ordering}
        title={cfg.garment ? undefined : 'Pick a garment first'}
        style={{ padding:'8px 18px',borderRadius:9,border:'none',opacity:cfg.garment?(ordering?.85:1):.45,
          background:`linear-gradient(135deg,${T},${T2})`,
          color:'#fff',fontSize:13,fontWeight:800,cursor:ordering?'progress':'pointer',
          boxShadow:`0 4px 16px rgba(2,195,154,.3)`,flexShrink:0, whiteSpace:'nowrap' }}>
        {ordering ? (
          <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
            <span aria-hidden="true" style={{ width:12, height:12, borderRadius:'50%',
              border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff',
              animation: reduceMotion ? 'none' : 'dspin .7s linear infinite', display:'inline-block' }}/>
            <span className="ds-act-order-full">Preparing…</span>
            <span className="ds-act-order-short">…</span>
          </span>
        ) : (<>
          <span className="ds-act-order-full">Order This →</span>
          <span className="ds-act-order-short">Order →</span>
        </>)}
      </motion.button>
    </div>
  );
}