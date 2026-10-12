import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Moon, Sun, Maximize } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';
import { get3DCapabilities } from './garmentCapabilities';
import { ENTRIES as GALLERY } from './designGallery';
import { hasWebGL } from './webglSupport';
import { hasBackView, assetFor } from './garmentAssets';
import { isDerived } from './derivedFamilies';
import { photoMaxScale } from './studioView';
import { panLimits, clampPan } from './snapGuides';
import { readGuidePrefs } from './canvasGuides';
import { StageGrid, PinnedRulers, GuideLine, RULER_H, RULER_W } from './StageRulers';
import FloatingToolbar from './FloatingToolbar';
import GuidesMenu from './GuidesMenu';

// Guides are remembered per viewer in this browser; on a phone they start off (the screen is small and touch is coarse).
const readGuides = () => {
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
  try { return readGuidePrefs(JSON.parse(localStorage.getItem('ds_guides') || 'null'), phone); } catch { return readGuidePrefs(null, phone); }
};
const ZOOM_MIN = 0.6, ZOOM_MAX = 1.8;
const clampZoom = z => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(3)));

const Scene3D = lazy(() => import('../DesignStudio3D'));

// Fit the artboard so the garment fills ~65% of the fit area between the stage lanes (width permitting), centred. The artboard holds the garment
// with a margin, so GARMENT_SHARE converts garment height to artboard height; MAX_FIT keeps the raster canvas crisp.
const STAGE_FILL = 0.65, GARMENT_SHARE = 0.9, MAX_FIT = 2;
function useFit(paneRef, wrapRef) {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const pane = paneRef.current, wrap = wrapRef.current;
    if (!pane || !wrap) return undefined;
    const measure = () => {
      if (!wrap.offsetWidth || !wrap.offsetHeight) return;
      const gutter = window.innerWidth >= 1024 ? 96 : 24;
      const byH = (pane.clientHeight * STAGE_FILL / GARMENT_SHARE) / wrap.offsetHeight;
      setFit(Math.max(0.3, Math.min(MAX_FIT, (pane.clientWidth - gutter) / wrap.offsetWidth, byH)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pane);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [paneRef, wrapRef]);
  return fit;
}

// Screen anchor of the selected object inside the pane, tracked every frame while selected (moves, scales and zooms included).
function useSelectionAnchor(selObj, canvasEl, paneRef) {
  const [at, setAt] = useState(null);
  useEffect(() => {
    if (!selObj) { setAt(null); return undefined; }
    let raf = 0, last = '';
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const c = canvasEl.current, pane = paneRef.current;
      if (!c || !pane || !selObj.canvas || !c.offsetWidth) return;
      const act = selObj.canvas.getActiveObject() ?? selObj, n = selObj.canvas.getActiveObjects().length || 1; // a multi-selection anchors on its whole box
      const r = act.getBoundingRect(), cr = c.getBoundingClientRect(), pr = pane.getBoundingClientRect(), k = cr.width / c.offsetWidth;
      const next = { x: Math.round(cr.left - pr.left + (r.left + r.width / 2) * k), top: Math.round(cr.top - pr.top + r.top * k),
        bottom: Math.round(cr.top - pr.top + (r.top + r.height) * k), w: Math.round(pr.width), h: Math.round(pr.height), k: +k.toFixed(3), n };
      const key = `${next.x},${next.top},${next.bottom},${next.w},${next.h},${next.k},${n}`;
      if (key !== last) { last = key; setAt(next); }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [selObj, canvasEl, paneRef]);
  return at;
}

class ThreeEB extends Component {
  constructor(p) { super(p); this.state = { err: false, key: 0, fails: 0 }; }
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e) { this.setState(s => ({ fails: s.fails + 1, load: /dynamically imported|Loading chunk|Importing a module/i.test(String(e?.message)) })); }
  retry = () => this.setState(s => ({ err: false, key: s.key + 1 }));
  render() {
    if (this.state.err) return (
      <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',gap:12 }}>
        <NavIcon name="warning" size={32} color="var(--cx-stage-ink-2)"/>
        <p style={{ color:'var(--cx-stage-ink-2)',fontSize:12,textAlign:'center',
          padding:'0 24px',lineHeight:1.6 }}>
          {this.state.load ? '3D view could not load.' : 'WebGL unavailable or context lost.'}<br/>{this.state.load ? 'Check your connection and retry, or keep designing in 2D.' : 'If this keeps happening, reload the page or use 2D mode.'}
        </p>
        <button onClick={() => (this.state.fails >= 2 ? window.location.reload() : this.retry())}
          className="ds-btn ds-btn--primary">
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
  selObj, deleteSelected, duplicateSelected, alignSelected, arrangeSelected, garmentRect = null, viewMode, has3DLoaded, onLogoFile, zoom, setZoom, snapshot, overlays,
  blank = null, setViewMode, pieceBar = null, setCompanion = null, showSet = false, setShowSet = null, setSnapOptions = null,
}) {
  const paneRef = useRef(null);
  const [webglOk, setWebglOk] = useState(hasWebGL);
  const show3D = has3DLoaded && webglOk;
  const on3DLost = () => { setWebglOk(false); setViewMode?.('2d'); };
  const fit = useFit(paneRef, canvasWrapRef);
  const at = useSelectionAnchor(selObj, canvasEl, paneRef);
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
  // A raster photo base is never shown above its native resolution: fit x zoom is capped so the photo is at most 1:1 on screen.
  const photo = cfg.garment ? assetFor(cfg.garment, cfg.sleeve, face, cfg.fit) : null;
  const cap = photoMaxScale(photo, canvasSize);
  const base = Math.min(fit, cap); // the fitted size, never above the photo's native resolution; zoom scales from here
  const scale = Math.min(zoom * base, cap); // canvas logical px -> screen px
  const atCap = zoom * base >= cap - 1e-6;
  useEffect(() => { setZoom(1); }, [cfg.garment, cfg.sleeve, cfg.fit, setZoom]); // a new garment starts at the fitted size
  // Guides (Grid, size, Snap, Rulers, Centre line, Smart guides): per-viewer convenience, remembered in this browser.
  const [guides, setGuides] = useState(readGuides);
  useEffect(() => {
    setSnapOptions?.({ snap: guides.snap, gridPct: guides.size, showGrid: guides.grid, centre: guides.centre, smart: guides.smart, scale });
    try { localStorage.setItem('ds_guides', JSON.stringify(guides)); } catch { /* storage blocked */ }
  }, [guides, scale, setSnapOptions]);
  const [dark, setDark] = useState(false);

  // ── Pan + pinned rulers ──
  // The wrapper is flex-centred in the pane's content box and transformed by translate(pan) scale(scale) about its centre, so
  // canvas (0, 0) lands at content centre + pan - size * scale / 2. Computed, not measured, so rulers never lag the canvas.
  const show2D = viewMode === '2d' || !show3D;
  const rulersOn = guides.rulers && !!cfg.garment && show2D && !initFailed && !!garmentRect;
  // Ruler guides: pulled out of a ruler, kept for this session only (never saved); they snap while the rulers are shown.
  const [rulerGuides, setRulerGuides] = useState([]);
  useEffect(() => { setSnapOptions?.({ rulerGuides: rulersOn ? rulerGuides : [] }); }, [rulersOn, rulerGuides, setSnapOptions]);
  const fitRef = useRef(null);
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
  // Pinch on touch zooms (two fingers anywhere on the stage); the pan limits are re-applied by measure() at the new scale.
  const fingers = useRef(new Map()), pinch = useRef(null), zoomNow = useRef(zoom);
  zoomNow.current = zoom;
  const dist = () => { const [a, b] = [...fingers.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const onPaneDownCapture = (e) => {
    if (e.pointerType === 'touch' && cfg.garment && show2D) {
      fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.current.size === 2) { pinch.current = { d: dist(), z: zoomNow.current }; e.stopPropagation(); e.preventDefault(); return; }
    }
    if (!canPan) return;
    if (e.button === 1 || (e.button === 0 && e.target === paneRef.current)) startPan(e); // stopPropagation keeps Fabric out of it
  };
  const onPaneMoveCapture = (e) => {
    if (!fingers.current.has(e.pointerId)) return;
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && fingers.current.size === 2) { e.stopPropagation(); setZoom(clampZoom(pinch.current.z * dist() / (pinch.current.d || 1))); }
  };
  const onPaneUpCapture = (e) => { fingers.current.delete(e.pointerId); if (fingers.current.size < 2) pinch.current = null; };
  // Fit: back to the fitted size, centred (Ctrl+0 or the zoom readout).
  const fitView = useCallback(() => { setZoom(1); applyPan({ x: 0, y: 0 }); }, [setZoom, applyPan]);
  useEffect(() => {
    if (!cfg.garment || !show2D) return undefined;
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) { e.preventDefault(); fitView(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [cfg.garment, show2D, fitView]);

  // Cross-fade on the artboard when the face or the garment changes. The <canvas> itself never remounts (Fabric owns it),
  // so this is an opacity dip on the existing wrapper (CSS, --cx-dur-2) while the new face or garment draws.
  const [faceFading, setFaceFading] = useState(false);
  const backOk = hasBackView(cfg.garment, cfg.sleeve, cfg.fit);
  useEffect(() => { if (!backOk && face === 'back') switchFace('front'); }, [backOk, face, switchFace]);
  const firstFace = useRef(true);
  useEffect(() => {
    if (firstFace.current) { firstFace.current = false; return undefined; }
    setFaceFading(true);
    const t = setTimeout(() => setFaceFading(false), 200);
    return () => clearTimeout(t);
  }, [face, cfg.garment, cfg.sleeve, cfg.fit]);

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onLogoFile(f);
  };

  const stageBtn = (
    <button type="button" className="ds-stage-btn" aria-pressed={dark} aria-label={dark ? 'Light stage' : 'Dark stage'}
      title={dark ? 'Light stage' : 'Dark stage'} onClick={() => setDark(d => !d)}>
      {dark ? <Sun size={17} aria-hidden="true"/> : <Moon size={17} aria-hidden="true"/>}
    </button>
  );

  const gridOn = guides.grid && !!cfg.garment && show2D && !!view && !!garmentRect;
  const stageOff = { dx: rulersOn ? RULER_W : 0, dy: rulersOn ? RULER_H : 0 };

  // 3D honesty notes, said in the top lane (never over the model).
  const notes3D = viewMode === '3d' ? [
    !webglOk && { id: 'nogl', text: '3D preview is not available on this device. Showing the 2D design.' },
    ...(show3D && cfg.garment ? (() => {
      const status = familyFor(cfg.garment)?.status3D;
      const info = status && status !== 'supported' ? STATUS_3D_LABEL[status] : null;
      const approx = GALLERY.find(d => d.id === cfg.inspirationId)?.familyApprox3D;
      const label = status === 'none' ? null : approx ? `3D shows the generic ${cfg.garment} model, not the photo` : info?.label;
      const c3 = get3DCapabilities(cfg.garment, cfg.fit, cfg.sleeve);
      return [label && { id: 'approx', text: label, warn: true }, overlays?.length > 0 && c3.supported && !(c3.logo && c3.text) && { id: 'decals', text: 'Logos and text are 2D only on this model' }];
    })() : []),
  ].filter(Boolean) : [];

  return (
    <div className="ds-cv" data-stage={dark ? 'dark' : undefined} data-rulers={rulersOn ? '1' : undefined} data-first={!cfg.garment ? '1' : undefined}
      onDragOver={e=>e.preventDefault()}
      onDrop={onDrop}>

      {/* Lane contract: chips, the set bar, guides and 3D notes sit in the top lane and stage controls in the bottom lane; the garment
          is fitted into the area between them, so nothing on the stage overlays it (only the selection toolbar, inside that area). */}
      {cfg.garment && (
        <div className="ds-lane ds-lane-top" data-notes={notes3D.length ? '1' : undefined}>
          {show2D && !initFailed && <GuidesMenu guides={guides} setGuides={setGuides}/>}
          {show2D && canPan && (
            <button type="button" className="ds-pan-btn" aria-pressed={hand} aria-label="Pan" title="Pan the zoomed design (or scroll, hold Space and drag, or drag the empty stage)" onClick={() => setHand(v => !v)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/></svg>
            </button>
          )}
          {/* The garment's name, once, on the stage (2D and 3D) */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={cfg.garment} className="ds-ctx-chip" aria-live="polite"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:.2 }}>
              <strong>{cfg.garment}</strong>{!photo && (isDerived(cfg.garment)
                ? <span className="ds-sketch" title="Outline and shading traced from the 3D model of a VFRB reference photo; pending VFRB confirmation">Derived</span>
                : <span className="ds-sketch" title="A flat VFRB template drawing; no photo base exists for this garment, sleeve and fit">Sketch</span>)}
            </motion.div>
          </AnimatePresence>
          {pieceBar && <div className="ds-set-wrap">{pieceBar}</div>}
          {/* Uniform set: both pieces have their own 3D model, so the pair can be previewed together (each keeps its own garment and colours). */}
          {setCompanion && viewMode === '3d' && show3D && (
            <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="3D preview scope">
              <button type="button" role="radio" aria-checked={!showSet} onClick={() => setShowSet(false)}>This piece</button>
              <button type="button" role="radio" aria-checked={showSet} onClick={() => setShowSet(true)}>Whole set</button>
            </div>
          )}
          {notes3D.map(n => <div key={n.id} role="status" className="ds-stage-note" data-tone={n.warn ? 'warn' : undefined}>{n.text}</div>)}
        </div>
      )}

      <div ref={fitRef} className="ds-stage-fit">
        {/* Both panes stay mounted and only toggle visibility, so Fabric and WebGL keep their state; show2D also covers
            viewMode==='3d' before the 3D pane exists, so the workspace is never blank. Rulers are pinned outside the scaled wrapper. */}
        {gridOn && <StageGrid view={view} g={garmentRect} pct={guides.size} {...stageOff} w={view.pw + stageOff.dx} h={view.ph + stageOff.dy}/>}
        {rulersOn && view && <PinnedRulers view={view} g={garmentRect} fitRef={fitRef} onGuide={gd => setRulerGuides(l => [...l.filter(x => !(x.axis === gd.axis && x.pct === gd.pct)), gd])}/>}
        {rulersOn && view && rulerGuides.map(gd => <GuideLine key={gd.axis + gd.pct} guide={gd} view={view} g={garmentRect} onRemove={() => setRulerGuides(l => l.filter(x => x !== gd))}/>)}
        <div ref={paneRef} className="ds-pane" data-pan={canPan ? '1' : undefined} data-sel={selObj ? '1' : undefined} data-garment={cfg.garment && show2D ? '1' : undefined}
          onPointerDownCapture={onPaneDownCapture} onPointerMoveCapture={onPaneMoveCapture} onPointerUpCapture={onPaneUpCapture} onPointerCancelCapture={onPaneUpCapture}
          onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            visibility: show2D ? 'visible' : 'hidden',
            pointerEvents: show2D ? 'auto' : 'none',
            zIndex: show2D ? 1 : 0,
          }}>
          {/* Pan tool / Space held: a layer over the artboard takes the drag so Fabric never starts a selection or a move. */}
          {canPan && (hand || space) && (
            <div className="ds-pan-layer" aria-hidden="true" onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}/>
          )}
          {/* No transform transition: rulers are computed from the same zoom and pan, so an animated canvas would drift from them. */}
          <div ref={canvasWrapRef} className="ds-artboard" data-fading={faceFading ? '1' : undefined} data-empty={!cfg.garment ? '1' : undefined} style={{
              position:'relative', transform:`translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            }}>
            {initFailed ? (
              // A failed 2D init (e.g. a stale cached 'fabric' chunk) is never silent: say so and offer a reload.
              <div style={{ width:320,height:320,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:12,textAlign:'center',padding:24 }}>
                <NavIcon name="warning" size={32} color="var(--cx-stage-ink-2)"/>
                <p style={{ color:'var(--cx-stage-ink-2)',fontSize:12,lineHeight:1.6 }}>
                  The design canvas failed to load.<br/>This is usually a stale cached
                  version — reloading the page fixes it.
                </p>
                <button type="button" onClick={()=>window.location.reload()} className="ds-btn ds-btn--primary">Reload</button>
              </div>
            ) : (
              <>
                <canvas ref={canvasEl} style={{ display:'block' }}/>
                {aiPulse && <div className="ai-pulse"/>}
                {cfg.garment && <div className="ds-stage-floor" aria-hidden="true"/>}
              </>
            )}
          </div>

          {/* First run: the gallery takes the stage. It lives outside the zoom-scaled wrapper so its text stays readable. */}
          {!cfg.garment && !initFailed && blank}

          <AnimatePresence>
            {selObj && at && show2D && <FloatingToolbar key="ftb" selObj={selObj} at={at} duplicateSelected={duplicateSelected} deleteSelected={deleteSelected}
              alignSelected={alignSelected} arrangeSelected={arrangeSelected}/>}
          </AnimatePresence>
        </div>

        {show3D && (
          <div className="ds-pane" style={{
              visibility: viewMode==='3d' ? 'visible' : 'hidden',
              pointerEvents: viewMode==='3d' ? 'auto' : 'none',
              zIndex: viewMode==='3d' ? 1 : 0,
            }}>
            <ThreeEB>
              <Suspense fallback={
                <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10 }}>
                  <span className="ds-spin" style={{ width:32, height:32, borderWidth:3 }} aria-hidden="true"/>
                  <p style={{ color:'var(--cx-stage-ink-2)',fontSize:12 }}>Loading 3D engine…</p>
                </div>
              }>
                <Scene3D cfg={cfg} overlayDataUrl={snapshot} overlays={overlays} onContextLost={on3DLost}
                  companion={showSet ? setCompanion?.cfg ?? null : null} companionRole={setCompanion?.role ?? null}/>
              </Suspense>
            </ThreeEB>
            {!cfg.garment && (
              <p className="ds-stage-text" style={{ position:'absolute', top:'46%', left:0, right:0, textAlign:'center', pointerEvents:'none' }}>
                Pick a garment to see it in 3D.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom lane: zoom and Front/Back (2D) or the rotate hint (3D), plus the stage light; none while the first-run picker is up */}
      {cfg.garment && (
        <div className="ds-lane ds-lane-bottom">
          {!show2D && <p className="ds-stage-hint"><NavIcon name="cursor" size={11}/> Drag to rotate, pinch or scroll to zoom</p>}
          <div className="ds-bottombar" role="group" aria-label="Stage controls">
            {show2D && (<>
              <div className="ds-zoom" role="group" aria-label="Zoom">
                <button type="button" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(ZOOM_MIN, +(z-0.15).toFixed(2)))}><Minus size={16} aria-hidden="true"/></button>
                <output className="ds-zoom-val" aria-label="Zoom level" title={photo ? 'Zoom level (a photo base never goes above its full resolution)' : 'Zoom level'}>{Math.round(scale*100)}%</output>
                <button type="button" aria-label="Fit" title="Fit to the stage (Ctrl+0)" onClick={fitView}><Maximize size={15} aria-hidden="true"/></button>
                <button type="button" aria-label="Zoom in" disabled={atCap} title={atCap ? 'Full photo resolution: zooming further would blur it' : undefined} onClick={()=>setZoom(z=>Math.min(ZOOM_MAX, +(z+0.15).toFixed(2)))}><Plus size={16} aria-hidden="true"/></button>
              </div>
              <div className="ds-face" role="group" aria-label="Garment side">
                {['front','back'].map(v=>(
                  <button key={v} type="button" aria-pressed={face===v} onClick={()=>switchFace(v)}
                    disabled={v === 'back' && !backOk} title={v === 'back' && !backOk ? 'No back photo for this garment yet' : undefined}>
                    {face === v && <motion.span layoutId="ds-face-pill" className="ds-face-pill" aria-hidden="true" transition={{ duration:.2, ease:[.22, 1, .36, 1] }}/>}
                    <span>{v === 'front' ? 'Front' : 'Back'}</span>
                  </button>
                ))}
              </div>
            </>)}
            {stageBtn}
          </div>
        </div>
      )}
    </div>
  );
}
