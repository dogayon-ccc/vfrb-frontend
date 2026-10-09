import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T2, DARK, SHAPE_TYPE_LABEL } from './dsShared';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';
import { sleeves3DFor, get3DCapabilities } from './garmentCapabilities';
import GarmentSilhouette from './GarmentSilhouette';
import { hasWebGL } from './webglSupport';
import { hasBackView } from './garmentAssets';

const Scene3D = lazy(() => import('../DesignStudio3D'));

// The sketch has a fixed pixel size; scale it down (never up) to fit the pane.
function useFit(paneRef, wrapRef, selbarOn) {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const pane = paneRef.current, wrap = wrapRef.current;
    if (!pane || !wrap) return undefined;
    // Scales DOWN to fit small panes and now UP (to 1.5x) on large ones, so on a
    // desktop the garment is the dominant object like in the wireframes instead of a
    // 320px sketch floating in a huge pane. Bottom reserve keeps it clear of the
    // Front/Back cards; the cap keeps the raster canvas from getting soft.
    const measure = () => {
      const wide = pane.clientWidth >= 700;
      const narrow = window.innerWidth < 768;
      const reserveY = (narrow ? 84 : wide ? 200 : 96) + (narrow && selbarOn ? 56 : 0);
      const gutter = window.innerWidth >= 768 ? 152 : 48;
      const maxFit = wide ? 1.5 : 1;
      setFit(Math.max(0.3, Math.min(maxFit, (pane.clientWidth - gutter) / wrap.offsetWidth, (pane.clientHeight - reserveY) / wrap.offsetHeight)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paneRef, wrapRef, selbarOn]);
  return fit;
}

class ThreeEB extends Component {
  constructor(p) { super(p); this.state = { err: false, key: 0, fails: 0 }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e) { this.setState(s => ({ fails: s.fails + 1, load: /dynamically imported|Loading chunk|Importing a module/i.test(String(e?.message)) })); }
  retry = () => this.setState(s => ({ err: false, key: s.key + 1 }));
  render() {
    if (this.state.err) return (
      <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',background:DARK,gap:12 }}>
        <NavIcon name="warning" size={32} color="rgba(15,23,42,.4)"/>
        <p style={{ color:'rgba(15,23,42,.5)',fontSize:12,textAlign:'center',
          padding:'0 24px',lineHeight:1.6 }}>
          {this.state.load ? '3D view could not load.' : 'WebGL unavailable or context lost.'}<br/>{this.state.load ? 'Check your connection and retry, or keep designing in 2D.' : 'If this keeps happening, reload the page or use 2D mode.'}
        </p>
        <button onClick={() => (this.state.fails >= 2 ? window.location.reload() : this.retry())}
          style={{ padding:'8px 20px',borderRadius:9,border:'none',background:T2,
            color:'#000',fontSize:12,fontWeight:700,cursor:'pointer' }}>
          {this.state.fails >= 2 ? 'Reload page' : 'Retry 3D'}
        </button>
      </div>
    );
    return <div key={this.state.key} style={{ width:'100%',height:'100%' }}>
      {this.props.children}
    </div>;
  }
}

export default function CanvasViewport({
  cfg, setCfg, canvasWrapRef, canvasEl, aiPulse, face, switchFace, initFailed,
  selObj, deleteSelected, duplicateSelected, viewMode, has3DLoaded, onLogoFile, zoom, setZoom, snapshot, overlays,
  onChooseGarment, pickerOpen, setViewMode,
}) {
  const paneRef = useRef(null);
  const [webglOk, setWebglOk] = useState(hasWebGL);
  const show3D = has3DLoaded && webglOk;
  const on3DLost = () => { setWebglOk(false); setViewMode?.('2d'); };
  const fit = useFit(paneRef, canvasWrapRef, !!selObj);
  const [dark, setDark] = useState(false);

  // Brief cross-fade on the canvas wrapper when the visible face changes. The
  // <canvas> element itself must never remount (Fabric owns it, see switchFace
  // in DesignStudio.jsx) — so this is a plain opacity dip on the existing wrapper,
  // not a keyed/unmounting transition. Purely cosmetic; loadCanvasJSON's own
  // 80ms swap already happened by the time this settles back to opaque.
  const [faceFading, setFaceFading] = useState(false);
  const backOk = hasBackView(cfg.garment, cfg.sleeve, cfg.fit);
  useEffect(() => { if (!backOk && face === 'back') switchFace('front'); }, [backOk, face, switchFace]);
  const firstFace = useRef(true);
  useEffect(() => {
    if (firstFace.current) { firstFace.current = false; return undefined; }
    setFaceFading(true);
    const t = setTimeout(() => setFaceFading(false), 130);
    return () => clearTimeout(t);
  }, [face]);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onLogoFile(f);
  };

  return (
    <div className="ds-cv" data-stage={dark ? 'dark' : undefined}
      style={{ background: [`radial-gradient(ellipse at 50% 42%, ${cfg.colors.body}18, transparent 62%)`, 'var(--bg-surface)'].join(',') }}
      onDragOver={e=>e.preventDefault()}
      onDrop={onDrop}>

      {/* Both panes stay mounted and only toggle visibility, so Fabric and WebGL keep their state.
          FIX (reported bug): show2D also covers viewMode==='3d' while has3DLoaded is still false —
          previously that combination hid this pane (viewMode!=='2d') while the 3D pane below doesn't
          exist yet either (mounted only once has3DLoaded is true), so BOTH panes could be invisible
          at once — a totally blank workspace with no error, matching the reported symptom exactly.
          Whatever set viewMode to '3d' without has3DLoaded (stale cached JS, a future new call site,
          restored state), this guard makes that combination fall back to showing 2D instead of nothing. */}
      <div ref={paneRef} className="ds-pane" data-selbar={selObj ? '1' : undefined} style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          visibility: (viewMode==='2d' || !show3D) ? 'visible' : 'hidden',
          pointerEvents: (viewMode==='2d' || !show3D) ? 'auto' : 'none',
          zIndex: (viewMode==='2d' || !show3D) ? 1 : 0,
        }}>
        <AnimatePresence mode="wait" initial={false}>
          {cfg.garment && (
            <motion.div key={`${cfg.garment}-${face}`} className="ds-ctx-chip" aria-live="polite"
              initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration:.18 }}>
              <strong>{cfg.garment}</strong><span>{face === 'front' ? 'Front view' : 'Back view'}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="ds-stage-ctl">
        <div className="ds-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(0.6, +(z-0.15).toFixed(2)))}>−</button>
          <button type="button" aria-label="Reset zoom" onClick={()=>setZoom(1)}>{Math.round(zoom*fit*100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.8, +(z+0.15).toFixed(2)))}>+</button>
        </div>
        <button type="button" className="ds-stage-btn" aria-pressed={dark} aria-label={dark ? 'Light stage' : 'Dark stage'}
          title={dark ? 'Light stage' : 'Dark stage'} onClick={() => setDark(d => !d)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {dark ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>}
          </svg>
        </button>
        </div>

        <div ref={canvasWrapRef} style={{
            position:'relative', transform:`scale(${zoom*fit})`,
            opacity: faceFading ? 0.35 : 1,
            transition:'transform .15s ease, opacity .15s ease',
          }}>
          {initFailed ? (
            // FIX (reported blank-canvas bug): the 2D init effect could fail
            // silently — e.g. the dynamically-imported 'fabric' chunk 404'ing
            // after a fresh deploy while a stale service-worker cache is
            // still active — and only logged to console, with the canvas
            // left permanently blank and no user-facing signal at all. This
            // mirrors the 3D pane's existing ThreeEB retry UI so a real
            // failure is never silent again.
            <div style={{ width:320,height:320,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:12,textAlign:'center',padding:24 }}>
              <NavIcon name="warning" size={32} color="rgba(15,23,42,.4)"/>
              <p style={{ color:'rgba(15,23,42,.55)',fontSize:12,lineHeight:1.6 }}>
                The design canvas failed to load.<br/>This is usually a stale cached
                version — reloading the page fixes it.
              </p>
              <button onClick={()=>window.location.reload()}
                style={{ padding:'8px 20px',borderRadius:9,border:'none',background:T2,
                  color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer' }}>
                Reload
              </button>
            </div>
          ) : (
            <>
              <canvas ref={canvasEl} style={{ display:'block', filter:'drop-shadow(0 18px 34px rgba(0,0,0,.55))' }}/>
              {aiPulse && <div className="ai-pulse"/>}
              {cfg.garment && <div className="ds-stage-floor" aria-hidden="true"/>}
            </>
          )}
        </div>

        {/* Blank-by-design start state. Lives outside the zoom-scaled wrapper so its text stays readable at any zoom. */}
        {!cfg.garment && !initFailed && (
          <div className="ds-blank">
            <span className="ds-blank-icon" aria-hidden="true"><NavIcon name="garmentType" size={28} color="rgba(15,23,42,.4)"/></span>
            <p className="ds-blank-title">Start with a garment</p>
            <p className="ds-blank-sub">Pick a VFRB uniform and it appears here, ready for colors, text and logos.</p>
            {onChooseGarment && !pickerOpen && <button type="button" className="ds-blank-cta" onClick={onChooseGarment}>Choose a garment</button>}
          </div>
        )}

        <div className="ds-face" role="group" aria-label="Garment side">
          {['front','back'].map(v=>(
            <button key={v} type="button" aria-pressed={face===v} onClick={()=>switchFace(v)}
              disabled={v === 'back' && !backOk} title={v === 'back' && !backOk ? 'No back photo for this garment yet' : undefined}
              className={cfg.garment ? 'ds-face-thumb' : undefined} style={{ textTransform:'capitalize' }}>
              {cfg.garment && face === v && (
                <motion.span layoutId="ds-face-pill" className="ds-face-pill" aria-hidden="true"
                  transition={{ type:'spring', stiffness:520, damping:38 }}/>
              )}
              {cfg.garment && (
                <GarmentSilhouette garment={cfg.garment} sleeve={cfg.sleeve} fit={cfg.fit} colors={cfg.colors} face={v} width={30} height={36}/>
              )}
              <span>{v}</span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selObj && (
            <motion.div className="ds-selbar" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <span className="ds-selbar-label">
                <NavIcon name={selObj.__logo ? 'image' : selObj.__shape ? 'shapes' : selObj.__draw ? 'draw' : 'edit'} size={12}/>
                {/* FIX: was hardcoded selObj.__logo ? 'Logo' : 'Text' — every
                    Rectangle/Circle/Drawing selection showed "Text, drag to
                    move" once Shapes/Draw were added, since this label
                    predates both. Mirrors the same kind derivation the
                    layers getter in useGarmentCanvas.js already uses. */}
                {selObj.__artwork ? 'Artwork' : selObj.__logo ? 'Logo'
                  : selObj.__shape ? (SHAPE_TYPE_LABEL[selObj.type] ?? 'Shape')
                  : selObj.__draw ? 'Drawing' : 'Text'}, drag to move
              </span>
              <button type="button" onClick={duplicateSelected} title="Duplicate">Duplicate</button>
              <button type="button" onClick={deleteSelected}>Delete</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {viewMode==='3d' && !webglOk && (
        <div role="status" style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:3, maxWidth:'calc(100% - 28px)',
          padding:'6px 12px', borderRadius:99, background:'rgba(15,23,42,.82)', color:'#fff', fontSize:11, fontWeight:700, textAlign:'center' }}>
          3D preview is not available on this device. Showing the 2D design.
        </div>
      )}

      {show3D && (
        <div className="ds-pane" style={{
            visibility: viewMode==='3d' ? 'visible' : 'hidden',
            pointerEvents: viewMode==='3d' ? 'auto' : 'none',
            zIndex: viewMode==='3d' ? 1 : 0,
          }}>
          <ThreeEB>
            <Suspense fallback={
              <div style={{ width:'100%',height:'100%',display:'flex',
                flexDirection:'column',alignItems:'center',
                justifyContent:'center',gap:10 }}>
                <div style={{ width:32,height:32,
                  border:`3px solid rgba(2,195,154,.25)`,
                  borderTopColor:T2,borderRadius:'50%',
                  animation:'dspin .7s linear infinite' }}/>
                <p style={{ color:'rgba(15,23,42,.45)',fontSize:12 }}>
                  Loading 3D engine…
                </p>
              </div>
            }>
              <Scene3D cfg={cfg} overlayDataUrl={snapshot} overlays={overlays} onContextLost={on3DLost}/>
            </Suspense>
          </ThreeEB>
          {!cfg.garment && (
            <p style={{ position:'absolute', top:'46%', left:0, right:0, textAlign:'center', margin:0,
              color:'rgba(15,23,42,.45)', fontSize:12, lineHeight:1.6, pointerEvents:'none' }}>
              Pick a garment from the <strong>Garment</strong> tab to see it in 3D.
            </p>
          )}
          {/* Honesty label — a garment with no real scanned GLB (status3D:'none') renders a
              generic parametric shape (see DesignStudio3D.jsx's ShirtMesh/PantsMesh/etc.), and
              even a scanned GLB with 'partial' regions (Polo/School Polo — no UV panels in the
              file, colour zones are geometry-threshold approximations, see garmentCapabilities.js)
              is not an exact rendering. Constitution: "never fake unsupported 3D... keep
              capability labeling honest" — this was previously only shown at garment-selection
              time (TypePanel's STATUS_3D_LABEL badge) and silently dropped once inside the 3D
              pane itself. */}
          {cfg.garment && (() => {
            const fam = familyFor(cfg.garment);
            const status = fam?.status3D;
            const info = status && status !== 'supported' ? STATUS_3D_LABEL[status] : null;
            // The 3D scans have one sleeve length; say so instead of silently showing a different sleeve than the 2D design.
            const sleeveGap = status && status !== 'none' && fam.styles.length > 0 && cfg.sleeve && !sleeves3DFor(fam.id, cfg.fit).includes(cfg.sleeve);
            const label = sleeveGap ? `3D shows ${sleeves3DFor(fam.id, cfg.fit).join(' / ').toLowerCase()} sleeves — ${cfg.sleeve.toLowerCase()} is 2D only`
              : status === 'none' ? 'Generic preview — exact shape not modeled' : info?.label;
            return label && (info || sleeveGap) ? (
              <div style={{ position:'absolute', top:14, left:14, zIndex:2, maxWidth:'calc(100% - 28px)',
                padding:'4px 10px', borderRadius:99,
                background: status === 'none' ? 'rgba(0,0,0,.58)' : 'rgba(217,119,6,.88)',
                border:'1px solid rgba(255,255,255,.14)',
                color:'#fff', fontSize:10, fontWeight:700, letterSpacing:.2,
                pointerEvents:'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {label}
              </div>
            ) : null;
          })()}
          {cfg.garment && overlays?.length > 0 && (() => {
            const cap = get3DCapabilities(cfg.garment, cfg.fit, cfg.sleeve);
            return cap.supported && !(cap.logo && cap.text) ? (
              <div style={{ position:'absolute', top:44, left:14, zIndex:2, padding:'4px 10px', borderRadius:99, background:'rgba(0,0,0,.58)',
                border:'1px solid rgba(255,255,255,.14)', color:'#fff', fontSize:10, fontWeight:700, pointerEvents:'none' }}>
                Logos and text are 2D only on this model
              </div>
            ) : null;
          })()}
          <div style={{ position:'absolute',bottom:18,left:'50%',
            transform:'translateX(-50%)',padding:'4px 16px',borderRadius:99,
            background:'rgba(0,0,0,.58)',border:'1px solid rgba(255,255,255,.1)',
            color:'rgba(255,255,255,.35)',fontSize:10,pointerEvents:'none',
            whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
            <NavIcon name="cursor" size={11} color="rgba(255,255,255,.35)"/>
            Drag to rotate · Pinch or scroll to zoom
          </div>
        </div>
      )}
    </div>
  );
}
