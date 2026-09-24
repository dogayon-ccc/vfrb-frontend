import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { removeLogoBackground } from '../../../lib/bgRemove';
import { T, T2, DARK, ZONE_LABEL, zonesFor } from './dsShared';

const Scene3D = lazy(() => import('../DesignStudio3D'));

// The sketch has a fixed pixel size; scale it down (never up) to fit the pane.
function useFit(paneRef, wrapRef) {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const pane = paneRef.current, wrap = wrapRef.current;
    if (!pane || !wrap) return undefined;
    const measure = () => setFit(Math.max(0.3, Math.min(1, (pane.clientWidth - 24) / wrap.offsetWidth, (pane.clientHeight - 24) / wrap.offsetHeight)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paneRef, wrapRef]);
  return fit;
}

class ThreeEB extends Component {
  constructor(p) { super(p); this.state = { err: false, key: 0 }; }
  static getDerivedStateFromError() { return { err: true }; }
  retry = () => this.setState(s => ({ err: false, key: s.key + 1 }));
  render() {
    if (this.state.err) return (
      <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',background:DARK,gap:12 }}>
        <NavIcon name="warning" size={32} color="rgba(15,23,42,.4)"/>
        <p style={{ color:'rgba(15,23,42,.5)',fontSize:12,textAlign:'center',
          padding:'0 24px',lineHeight:1.6 }}>
          WebGL unavailable or context lost.<br/>Try refreshing or use 2D mode.
        </p>
        <button onClick={this.retry}
          style={{ padding:'8px 20px',borderRadius:9,border:'none',background:T2,
            color:'#000',fontSize:12,fontWeight:700,cursor:'pointer' }}>
          Retry 3D
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
  selObj, deleteSelected, duplicateSelected, viewMode, has3DLoaded, addLogo, zoom, setZoom, snapshot, overlays,
}) {
  const paneRef = useRef(null);
  const fit = useFit(paneRef, canvasWrapRef);

  const onDrop = async (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    // Same auto-transparency pass as LogoPanel's own upload — this is the
    // canvas' own drag-drop entry point, a second, separate path into
    // addLogo() that would otherwise skip it (pre-existing, out of scope:
    // it also skips LogoPanel's type/size validation — flagging, not fixing).
    const toAdd = f.type === 'image/svg+xml' ? f : await removeLogoBackground(f);
    const r = new FileReader();
    r.onload = ev => addLogo(ev.target.result, 'left_chest');
    r.readAsDataURL(toAdd);
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

        <div ref={canvasWrapRef} style={{ position:'relative', transform:`scale(${zoom*fit})`, transition:'transform .15s ease' }}>
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
              {!cfg.garment && (
                <div style={{
                  position:'absolute', inset:0, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap:10, textAlign:'center',
                  padding:24, pointerEvents:'none',
                }}>
                  <NavIcon name="garmentType" size={30} color="rgba(15,23,42,.28)"/>
                  <p style={{ color:'rgba(15,23,42,.45)', fontSize:12, lineHeight:1.6, margin:0, maxWidth:220 }}>
                    Pick a garment from the <strong>Type</strong> tab to start designing.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="ds-face" role="group" aria-label="Garment side">
          {['front','back'].map(v=>(
            <button key={v} type="button" aria-pressed={face===v} onClick={()=>switchFace(v)}
              style={{ textTransform:'capitalize' }}>{v}</button>
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
                  : selObj.__shape ? (selObj.type === 'circle' ? 'Circle' : 'Rectangle')
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
