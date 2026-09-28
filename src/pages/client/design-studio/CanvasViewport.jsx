import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, DARK, ZONE_LABEL, SHAPE_TYPE_LABEL, zonesFor } from './dsShared';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';
import GarmentSilhouette from './GarmentSilhouette';

const Scene3D = lazy(() => import('../DesignStudio3D'));

// The sketch has a fixed pixel size; scale it down (never up) to fit the pane.
function useFit(paneRef, wrapRef) {
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
      const reserveY = wide ? 130 : 24;
      const maxFit = wide ? 1.5 : 1;
      setFit(Math.max(0.3, Math.min(maxFit, (pane.clientWidth - 48) / wrap.offsetWidth, (pane.clientHeight - reserveY) / wrap.offsetHeight)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paneRef, wrapRef]);
  return fit;
}

class ThreeEB extends Component {
  constructor(p) { super(p); this.state = { err: false, key: 0, fails: 0 }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.setState(s => ({ fails: s.fails + 1 })); }
  retry = () => this.setState(s => ({ err: false, key: s.key + 1 }));
  render() {
    if (this.state.err) return (
      <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',background:DARK,gap:12 }}>
        <NavIcon name="warning" size={32} color="rgba(15,23,42,.4)"/>
        <p style={{ color:'rgba(15,23,42,.5)',fontSize:12,textAlign:'center',
          padding:'0 24px',lineHeight:1.6 }}>
          WebGL unavailable or context lost.<br/>If this keeps happening, reload the page (the browser blocks new WebGL contexts after repeated losses) or use 2D mode.
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
  cfg, canvasWrapRef, canvasEl, aiPulse, face, switchFace, initFailed,
  selObj, deleteSelected, duplicateSelected, viewMode, has3DLoaded, onLogoFile, zoom, setZoom, snapshot, overlays,
  onChooseGarment,
}) {
  const paneRef = useRef(null);
  const fit = useFit(paneRef, canvasWrapRef);

  // Brief cross-fade on the canvas wrapper when the visible face changes. The
  // <canvas> element itself must never remount (Fabric owns it, see switchFace
  // in DesignStudio.jsx) — so this is a plain opacity dip on the existing wrapper,
  // not a keyed/unmounting transition. Purely cosmetic; loadCanvasJSON's own
  // 80ms swap already happened by the time this settles back to opaque.
  const [faceFading, setFaceFading] = useState(false);
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
    <div className="ds-cv"
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
      <div ref={paneRef} className="ds-pane" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          visibility: (viewMode==='2d' || !has3DLoaded) ? 'visible' : 'hidden',
          pointerEvents: (viewMode==='2d' || !has3DLoaded) ? 'auto' : 'none',
          zIndex: (viewMode==='2d' || !has3DLoaded) ? 1 : 0,
        }}>
        <div className="ds-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(0.6, +(z-0.15).toFixed(2)))}>−</button>
          <button type="button" aria-label="Reset zoom" onClick={()=>setZoom(1)}>{Math.round(zoom*fit*100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.8, +(z+0.15).toFixed(2)))}>+</button>
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
              {/* Bug fix: INIT_CFG starts cfg.garment at null (blank canvas
                  by design) and getGarmentPaths(null) returns EMPTY_PATHS,
                  so Fabric correctly draws nothing here — but nothing told
                  the customer that was intentional vs. a broken/loading
                  canvas. Non-interactive (pointerEvents:none) so it never
                  blocks a future canvas drop target. */}
              <AnimatePresence>
                {!cfg.garment && (
                  <motion.div
                    initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                    transition={{ duration:.25, ease:'easeOut' }}
                    style={{
                      position:'absolute', inset:0, display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:12, textAlign:'center',
                      padding:24,
                    }}>
                    <motion.div
                      animate={{ y:[0,-5,0] }}
                      transition={{ duration:2.6, repeat:Infinity, ease:'easeInOut' }}
                      style={{
                        width:64, height:64, borderRadius:20, display:'flex',
                        alignItems:'center', justifyContent:'center',
                        background:`linear-gradient(135deg, ${T}14, ${T2}14)`,
                        border:`1px dashed rgba(15,23,42,.18)`,
                      }}>
                      <NavIcon name="garmentType" size={28} color="rgba(15,23,42,.32)"/>
                    </motion.div>
                    <p style={{ color:'rgba(15,23,42,.5)', fontSize:12.5, lineHeight:1.6, margin:0, maxWidth:230 }}>
                      Nothing to design yet — pick a garment to bring this canvas to life.
                    </p>
                    {onChooseGarment && (
                      <motion.button
                        type="button" onClick={onChooseGarment}
                        whileHover={{ scale:1.03 }} whileTap={{ scale:.96 }}
                        style={{
                          marginTop:2, padding:'9px 18px', borderRadius:10, border:'none',
                          background:`linear-gradient(135deg,${T},${T2})`, color:'#fff',
                          fontSize:12.5, fontWeight:700, cursor:'pointer',
                          boxShadow:'0 4px 14px rgba(2,195,154,.28)',
                        }}>
                        Choose a garment →
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="ds-face" role="group" aria-label="Garment side">
          {['front','back'].map(v=>(
            <button key={v} type="button" aria-pressed={face===v} onClick={()=>switchFace(v)}
              className={cfg.garment ? 'ds-face-thumb' : undefined} style={{ textTransform:'capitalize' }}>
              {cfg.garment && (
                <GarmentSilhouette garment={cfg.garment} sleeve={cfg.sleeve} colors={cfg.colors} face={v} width={30} height={36}/>
              )}
              <span>{v}</span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selObj && (
            <motion.div className="ds-selbar" initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                <NavIcon name={selObj.__logo ? 'image' : selObj.__shape ? 'shapes' : selObj.__draw ? 'draw' : 'edit'} size={12}/>
                {/* FIX: was hardcoded selObj.__logo ? 'Logo' : 'Text' — every
                    Rectangle/Circle/Drawing selection showed "Text, drag to
                    move" once Shapes/Draw were added, since this label
                    predates both. Mirrors the same kind derivation the
                    layers getter in useGarmentCanvas.js already uses. */}
                {selObj.__logo ? 'Logo'
                  : selObj.__shape ? (SHAPE_TYPE_LABEL[selObj.type] ?? 'Shape')
                  : selObj.__draw ? 'Drawing' : 'Text'}, drag to move
              </span>
              <button type="button" onClick={duplicateSelected} title="Duplicate">Duplicate</button>
              <button type="button" onClick={deleteSelected}>Delete</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {has3DLoaded && (
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
              <Scene3D cfg={cfg} overlayDataUrl={snapshot} overlays={overlays}/>
            </Suspense>
          </ThreeEB>
          {!cfg.garment && (
            <p style={{ position:'absolute', top:'46%', left:0, right:0, textAlign:'center', margin:0,
              color:'rgba(15,23,42,.45)', fontSize:12, lineHeight:1.6, pointerEvents:'none' }}>
              Pick a garment from the <strong>Type</strong> tab to see it in 3D.
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
            const sleeveGap = status && status !== 'none' && cfg.sleeve && !fam.sleeves3D.includes(cfg.sleeve);
            const label = sleeveGap ? `3D shows ${fam.sleeves3D.join(' / ').toLowerCase()} sleeves — ${cfg.sleeve.toLowerCase()} is 2D only`
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

      <div style={{ position:'absolute',top:14,right:14,zIndex:2,
        display:'flex',gap:5,flexDirection:'column' }}>
        {zonesFor(cfg.garment, cfg.sleeve).map(z=>(
          <div key={z} title={`${ZONE_LABEL[z]}: ${cfg.colors[z]}`}
            style={{ display:'flex',alignItems:'center',gap:5 }}>
            <div style={{ width:14,height:14,borderRadius:'50%',
              background:cfg.colors[z]??T,
              border:'2px solid rgba(255,255,255,.18)',
              boxShadow:'0 2px 5px rgba(0,0,0,.4)' }}/>
          </div>
        ))}
      </div>
    </div>
  );
}
