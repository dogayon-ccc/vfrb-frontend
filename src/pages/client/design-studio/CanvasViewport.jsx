import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T2, DARK, SHAPE_TYPE_LABEL } from './dsShared';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';
import { get3DCapabilities } from './garmentCapabilities';
import { ENTRIES as GALLERY } from './designGallery';
import GarmentSilhouette from './GarmentSilhouette';
import { hasWebGL } from './webglSupport';
import { hasBackView } from './garmentAssets';
import { rulerSteps, GRID_SIZES, pinnedTicks, panLimits, clampPan } from './snapGuides';

const GUIDES_DEFAULT = { grid: false, snap: true, size: 20 };
const readGuides = () => {
  try { const g = { ...GUIDES_DEFAULT, ...JSON.parse(localStorage.getItem('ds_guides') || '{}') }; return GRID_SIZES.includes(g.size) ? g : { ...g, size: GUIDES_DEFAULT.size }; }
  catch { return { ...GUIDES_DEFAULT }; }
};
const RULER_PX = 16; // ruler band thickness on screen (also how far the pane shifts so no control sits on a ruler)
const ZOOM_MIN = 0.6, ZOOM_MAX = 1.8;
const clampZoom = z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(3)));

// Grid: canvas logical px inside the zoom-scaled wrapper, so it is aligned with the artboard by construction. Strokes are
// divided by the on-screen scale to stay one screen px. A DOM overlay, never a canvas object: not saved, exported or undoable.
function Grid({ w, h, size, scale }) {
  const k = 1 / scale;
  const lines = n => Array.from({ length: Math.floor((n - 1e-6) / size) }, (_, i) => (i + 1) * size);
  const majorLine = at => at % (size * 5) === 0 || undefined;
  return (
    <svg className="ds-grid" aria-hidden="true" width={w} height={h}>
      {lines(w).map(x => <line key={'x' + x} x1={x} y1={0} x2={x} y2={h} strokeWidth={k} data-major={majorLine(x)}/>)}
      {lines(h).map(y => <line key={'y' + y} x1={0} y1={y} x2={w} y2={y} strokeWidth={k} data-major={majorLine(y)}/>)}
    </svg>
  );
}

// Rulers pinned to the top and left edges of the viewport, in screen px. `view` says where canvas (0, 0) lands in the pane and
// at what scale, so each tick sits over the canvas value it labels whatever the zoom or pan; only the artboard span is marked.
function PinnedRulers({ view, w, h }) {
  const { ox, oy, s, pw, ph } = view;
  const { step, major } = rulerSteps(s);
  const xs = pinnedTicks(ox, s, pw, w, step, major), ys = pinnedTicks(oy, s, ph, h, step, major);
  const span = (o, ext, len) => [Math.max(0, o), Math.min(len, o + ext * s)];
  const [x0, x1] = span(ox, w, pw), [y0, y1] = span(oy, h, ph);
  const px = a => a; // exact position; crispEdges (CSS) snaps the 1px line to the device pixel grid
  return (
    <>
      <div className="ds-ruler-corner" aria-hidden="true"/>
      <svg className="ds-ruler ds-ruler-x" aria-hidden="true" width={pw} height={RULER_PX}>
        {x1 > x0 && <rect className="ds-ruler-art" x={x0} y={0} width={x1 - x0} height={RULER_PX}/>}
        {xs.map(t => <g key={t.v}>
          <line x1={px(t.at)} y1={t.major ? 5 : 10} x2={px(t.at)} y2={RULER_PX}/>
          {t.major && <text x={t.at + 2} y={9} fontSize={9.5}>{t.v}</text>}
        </g>)}
      </svg>
      <svg className="ds-ruler ds-ruler-y" aria-hidden="true" width={RULER_PX} height={ph}>
        {y1 > y0 && <rect className="ds-ruler-art" x={0} y={y0} width={RULER_PX} height={y1 - y0}/>}
        {ys.map(t => <g key={t.v}>
          <line x1={t.major ? 5 : 10} y1={px(t.at)} x2={RULER_PX} y2={px(t.at)}/>
          {t.major && <text x={10} y={t.at + 2} fontSize={9.5} transform={`rotate(-90 10 ${t.at + 2})`} textAnchor="end">{t.v}</text>}
        </g>)}
      </svg>
    </>
  );
}

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
  onChooseGarment, pickerOpen, setViewMode, pieceBar = null, setCompanion = null, showSet = false, setShowSet = null, setSnapOptions = null,
}) {
  const paneRef = useRef(null);
  const [webglOk, setWebglOk] = useState(hasWebGL);
  const show3D = has3DLoaded && webglOk;
  const on3DLost = () => { setWebglOk(false); setViewMode?.('2d'); };
  const fit = useFit(paneRef, canvasWrapRef, !!selObj);
  const scale = zoom * fit; // canvas logical px -> screen px
  // Grid + rulers and snapping toggles (per-viewer convenience, remembered in this browser).
  const [guides, setGuides] = useState(readGuides);
  useEffect(() => {
    setSnapOptions?.({ snap: guides.snap, gridSize: guides.grid ? guides.size : 0, scale });
    try { localStorage.setItem('ds_guides', JSON.stringify(guides)); } catch { /* storage blocked */ }
  }, [guides, scale, setSnapOptions]);
  // The artboard's real logical size, read from the Fabric canvas (photo bases and templates differ), not assumed.
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = canvasEl.current;
    if (!el) return undefined;
    const m = () => setCanvasSize(s => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasEl, initFailed]);
  const [dark, setDark] = useState(false);

  // ── Pan + pinned rulers ──
  // The wrapper is flex-centred in the pane's content box and transformed by translate(pan) scale(scale) about its centre, so
  // canvas (0, 0) lands at content centre + pan - size * scale / 2. Computed, not measured, so rulers never lag the canvas.
  const show2D = viewMode === '2d' || !show3D;
  const rulersOn = guides.grid && !!cfg.garment && show2D && !initFailed;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const limits = useRef({ x: 0, y: 0 });
  const prevScale = useRef(scale);
  const [view, setView] = useState(null);
  const applyPan = useCallback(p => { panRef.current = p; setPan(p); }, []);
  const measure = useCallback(() => {
    const pane = paneRef.current;
    if (!pane || !canvasSize.w) return;
    const cs = getComputedStyle(pane), padL = parseFloat(cs.paddingLeft) || 0, padT = parseFloat(cs.paddingTop) || 0;
    const viewW = pane.clientWidth - padL - (parseFloat(cs.paddingRight) || 0), viewH = pane.clientHeight - padT - (parseFloat(cs.paddingBottom) || 0);
    limits.current = panLimits({ w: canvasSize.w, h: canvasSize.h, scale, viewW, viewH });
    // Zooming keeps the point at the viewport centre where it was, then the pan is clamped to the new limits.
    const k = prevScale.current > 0 ? scale / prevScale.current : 1;
    prevScale.current = scale;
    const p = clampPan({ x: panRef.current.x * k, y: panRef.current.y * k }, limits.current);
    if (p.x !== panRef.current.x || p.y !== panRef.current.y) applyPan(p);
    const next = { ox: padL + viewW / 2 + p.x - canvasSize.w * scale / 2, oy: padT + viewH / 2 + p.y - canvasSize.h * scale / 2, s: scale,
      pw: pane.clientWidth, ph: pane.clientHeight, canPan: limits.current.x > 0 || limits.current.y > 0 };
    setView(v => (v && Object.keys(next).every(key => v[key] === next[key]) ? v : next));
  }, [canvasSize, scale, applyPan]);
  useLayoutEffect(() => { measure(); }, [measure, pan, rulersOn, selObj]);
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(pane);
    return () => ro.disconnect();
  }, [measure]);
  const canPan = !!view?.canPan && show2D;

  // Scroll / trackpad pans; Ctrl+wheel (and trackpad pinch, which arrives as Ctrl+wheel) zooms.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return undefined;
    const onWheel = (e) => {
      if (!cfg.garment) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? pane.clientHeight : 1;
      if (e.ctrlKey) { e.preventDefault(); setZoom(z => clampZoom(z * Math.exp(-e.deltaY * unit * 0.002))); return; }
      const sideways = e.shiftKey && !e.deltaX;
      const p = clampPan({ x: panRef.current.x - (sideways ? e.deltaY : e.deltaX) * unit, y: panRef.current.y - (sideways ? 0 : e.deltaY) * unit }, limits.current);
      if (p.x === panRef.current.x && p.y === panRef.current.y) return; // nothing to scroll: leave the event alone
      e.preventDefault();
      applyPan(p);
    };
    pane.addEventListener('wheel', onWheel, { passive: false });
    return () => pane.removeEventListener('wheel', onWheel);
  }, [cfg.garment, setZoom, applyPan]);

  // Drag to pan: the empty stage, the middle button anywhere, or anywhere while the Pan tool or Space is held.
  const [hand, setHand] = useState(false);
  const [space, setSpace] = useState(false);
  useEffect(() => { if (!canPan) setHand(false); }, [canPan]);
  useEffect(() => {
    if (!canPan) return undefined;
    const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(a.tagName) || a.isContentEditable); };
    const down = (e) => { if (e.code === 'Space' && !e.repeat && !typing()) { e.preventDefault(); setSpace(true); } };
    const up = (e) => { if (e.code === 'Space') setSpace(false); };
    const blur = () => setSpace(false);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); setSpace(false); };
  }, [canPan]);
  const drag = useRef(null);
  const startPan = (e) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, p: panRef.current };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault(); e.stopPropagation();
  };
  const movePan = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    applyPan(clampPan({ x: d.p.x + e.clientX - d.x, y: d.p.y + e.clientY - d.y }, limits.current));
  };
  const endPan = (e) => { if (drag.current?.id === e.pointerId) drag.current = null; };
  const onPaneDownCapture = (e) => {
    if (!canPan) return;
    if (e.button === 1 || (e.button === 0 && e.target === paneRef.current)) startPan(e); // stopPropagation keeps Fabric out of it
  };

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
    <div className="ds-cv" data-stage={dark ? 'dark' : undefined} data-rulers={rulersOn ? '1' : undefined}
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
      {/* Rulers pinned to the viewport edges (outside the scaled wrapper); the pane shifts by RULER_PX so no control covers them. */}
      {rulersOn && view && <PinnedRulers view={view} w={canvasSize.w} h={canvasSize.h}/>}
      <div ref={paneRef} className="ds-pane" data-selbar={selObj ? '1' : undefined} data-pan={canPan ? '1' : undefined}
        onPointerDownCapture={onPaneDownCapture} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} style={{
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
        {pieceBar && <div className="ds-set-wrap">{pieceBar}</div>}
        <div className="ds-stage-ctl">
        <div className="ds-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(ZOOM_MIN, +(z-0.15).toFixed(2)))}>−</button>
          <button type="button" aria-label="Reset zoom" onClick={()=>setZoom(1)}>{Math.round(zoom*fit*100)}%</button>
          <button type="button" aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(ZOOM_MAX, +(z+0.15).toFixed(2)))}>+</button>
        </div>
        {cfg.garment && viewMode !== '3d' && (
          <div className="ds-guides" role="group" aria-label="Guides">
            <button type="button" aria-pressed={guides.grid} aria-label="Grid and rulers" title="Show grid and rulers (canvas units)" onClick={() => setGuides(g => ({ ...g, grid: !g.grid }))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
              <span>Grid</span>
            </button>
            {guides.grid && (
              <select aria-label="Grid spacing (canvas px)" title="Grid spacing, in canvas px" value={guides.size}
                onChange={e => setGuides(g => ({ ...g, size: Number(e.target.value) }))}>
                {GRID_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {canPan && (
              <button type="button" aria-pressed={hand} aria-label="Pan" title="Pan the zoomed design (or scroll, hold Space and drag, or drag the empty stage)" onClick={() => setHand(v => !v)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/></svg>
                <span>Pan</span>
              </button>
            )}
            <button type="button" aria-pressed={guides.snap} aria-label="Snap" title="Snap to the garment, other elements and the grid while dragging" onClick={() => setGuides(g => ({ ...g, snap: !g.snap }))}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 3v7a6 6 0 0 0 12 0V3M6 7h4M14 7h4"/></svg>
              <span>Snap</span>
            </button>
          </div>
        )}
        <button type="button" className="ds-stage-btn" aria-pressed={dark} aria-label={dark ? 'Light stage' : 'Dark stage'}
          title={dark ? 'Light stage' : 'Dark stage'} onClick={() => setDark(d => !d)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {dark ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>}
          </svg>
        </button>
        </div>

        {/* Pan tool / Space held: a layer over the artboard takes the drag so Fabric never starts a selection or a move. */}
        {canPan && (hand || space) && (
          <div className="ds-pan-layer" aria-hidden="true" onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}/>
        )}
        {/* No transform transition: rulers are computed from the same zoom and pan, so an animated canvas would drift from them. */}
        <div ref={canvasWrapRef} style={{
            position:'relative', transform:`translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            opacity: faceFading ? 0.35 : 1,
            transition:'opacity .15s ease',
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
              {guides.grid && cfg.garment && canvasSize.w > 0 && <Grid w={canvasSize.w} h={canvasSize.h} size={guides.size} scale={scale}/>}
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
              <Scene3D cfg={cfg} overlayDataUrl={snapshot} overlays={overlays} onContextLost={on3DLost}
                companion={showSet ? setCompanion?.cfg ?? null : null} companionRole={setCompanion?.role ?? null}/>
            </Suspense>
          </ThreeEB>
          {/* Uniform set: both pieces have their own 3D model, so the pair can be previewed together (each keeps its own garment and colours). */}
          {setCompanion && viewMode === '3d' && (
            <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="3D preview scope" style={{ position:'absolute', top:14, right:14, zIndex:3 }}>
              <button type="button" role="radio" aria-checked={!showSet} onClick={() => setShowSet(false)}>This piece</button>
              <button type="button" role="radio" aria-checked={showSet} onClick={() => setShowSet(true)}>Whole set</button>
            </div>
          )}
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
            // A selection without its own model never reaches 3D (scannedEntryFor + has3DModel), so only the approximate label remains.
            // Opened from a gallery photo whose 3D is only the family model: say so in the 3D pane, not just on the gallery card.
            const approx = GALLERY.find(d => d.id === cfg.inspirationId)?.familyApprox3D;
            const label = status === 'none' ? null : approx ? `3D shows the generic ${cfg.garment} model, not the photo` : info?.label;
            return label ? (
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
