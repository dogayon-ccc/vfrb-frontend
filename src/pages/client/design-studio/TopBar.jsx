import { motion, useReducedMotion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, hexToRgb } from './dsShared';

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
  saved, draftSaved, saveDesign, orderThis,
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="ds-bar">

      {/* ── Brand / document ─────────────────────────────────────────── */}
      <button onClick={()=>nav('/dashboard')}
        style={{ padding:'5px 11px',borderRadius:8,cursor:'pointer',
          border:'1px solid rgba(15,23,42,.12)',background:'transparent',
          color:'rgba(15,23,42,.6)',fontSize:12,flexShrink:0 }}>
        ← Back
      </button>

      <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
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
      <motion.span
        animate={{ background:`rgba(${hexToRgb(cfg.colors.body??T)},.18)` }}
        transition={{ duration:.4 }}
        style={{ fontSize:10,padding:'2px 10px',borderRadius:99,
          color:T2,fontWeight:700,border:`1px solid rgba(2,195,154,.22)`,
          flexShrink:0 }}>
        <NavIcon name={catData.icon} size={11} color={T2} style={{ marginRight:3, verticalAlign:'-1.5px' }}/>
        {cfg.category}
      </motion.span>

      <div style={{ flex:1 }}/>

      {/* ── Editing ───────────────────────────────────────────────────── */}
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

      {/* ── View ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex',borderRadius:9,overflow:'hidden',
        border:'1px solid rgba(15,23,42,.12)',flexShrink:0 }}>
        {['2d','3d'].map(m=>(
          <button key={m} onClick={()=>{
              if(m==='3d') setHas3DLoaded(true);
              setViewMode(m);
            }}
            title={m==='3d' ? 'Quick spatial preview — for exact colors and placement, use 2D' : undefined}
            style={{ padding:'6px 13px',border:'none',fontSize:11,fontWeight:700,
              cursor:'pointer',
              background:viewMode===m?T:'transparent',
              color:viewMode===m?'#fff':'rgba(15,23,42,.4)',
              transition:'background .14s' }}>
            {m.toUpperCase()}
          </button>
        ))}
      </div>

      <Divider/>

      {/* ── Utilities (secondary, de-emphasized) ─────────────────────── */}
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

      <Divider/>

      {/* ── Persistence ───────────────────────────────────────────────── */}
      <button onClick={saveDesign}
        style={{ padding:'6px 12px',borderRadius:8,cursor:'pointer',
          border:`1px solid ${saved?T2:'rgba(15,23,42,.12)'}`,
          background: saved?'rgba(2,195,154,.12)':'transparent',
          color: saved?T2:'rgba(15,23,42,.5)',fontSize:11,fontWeight:700,
          flexShrink:0,transition:'all .2s',
          display:'flex', alignItems:'center', gap:5 }}>
        {draftSaved
          ? <><NavIcon name="cloudSaved" size={12}/> Saved</>
          : saved
            ? <><NavIcon name="success" size={12}/> Local</>
            : <><NavIcon name="save" size={12}/> Save</>}
      </button>

      {/* ── Primary action ────────────────────────────────────────────── */}
      {/* FIX: was color:'#000' on the teal gradient — DESIGN-SYSTEM.md's own
          audit flags black-on-teal-gradient as a 4.49:1 contrast fail and
          says the fix elsewhere was white text; this button never got that
          fix (TopBar.jsx was only "lightly edited" per that same doc). */}
      <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
        onClick={orderThis}
        style={{ padding:'8px 18px',borderRadius:9,border:'none',
          background:`linear-gradient(135deg,${T},${T2})`,
          color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',
          boxShadow:`0 4px 16px rgba(2,195,154,.3)`,flexShrink:0 }}>
        Order This →
      </motion.button>
    </div>
  );
}