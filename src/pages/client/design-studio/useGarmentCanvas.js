// Fabric.js canvas hook for Design Studio. Extracted from DesignStudio.jsx.
import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { T2, LOGO_PRESETS, PATTERNS } from './dsShared';
import { getGarmentPaths } from './garmentPaths';
import { detailedPaths } from './garmentDetails';
import { addFabricShading } from './fabricShading';
import { assetFor, tintedCanvas } from './garmentAssets';
import { snapTargets, computeSnap, snapThreshold, computeResizeSnap, movingEdges, snapAngle } from './snapGuides';
import { placementTargets, readoutPct, alignDeltas, distributeDeltas, gridSpec, guideLines } from './canvasGuides';
import { installStageLayers, drawPlacementGhosts, applyErase, garmentBox, plainObject } from './canvasLayers';
import { reviveOverlays, restyleText, changesLayout, makeShape, shapeLabel, moveInStack, installTouchHandles, makePocket, recolorPocket } from './overlayTools';
import { pocketSpot, mirroredX, pocketLabel } from './pocketTools';
import { pieceOf } from './garmentCatalog';
import { wovenFill } from './wovenPatterns';
import { loadFont, webFontFor, defaultWeight } from './studioFonts';
import { sketchInk } from './sketchLine';
import { emptyHistory, entry, pushStep, stepHistory, canStep, switchSide, lookOf, sameLook, syncLook, lookToApply } from './editHistory';

// Template lines (garmentPaths `details`). Untagged ones are decorative: no __zoneKey, never clicked or hovered. A tagged part (pocket,
// buttons, closure) is tappable as zone 'detail:<part>' and carries the customer's colour as `style` (garmentDetails.js).
const DETAIL_STYLE = {
  seam:   { fill: '', stroke: 'rgba(0,0,0,.32)', strokeWidth: 1, strokeDashArray: [3, 2.5] },
  line:   { fill: '', stroke: 'rgba(0,0,0,.24)', strokeWidth: 1.2 },
  fold:   { fill: '', stroke: 'rgba(0,0,0,.10)', strokeWidth: 2 },
  shade:  { fill: 'rgba(0,0,0,.32)', stroke: null, strokeWidth: 0 },
  button: { fill: 'rgba(255,255,255,.9)', stroke: 'rgba(0,0,0,.35)', strokeWidth: 0.8 },
};

// Zones are drawn first at indices 0..n-1 (body at 0). Under-details go just above the body (below collar, sleeves and
// pocket); over-details go above every zone. Returns the index after the last garment object.
// Seams and lines take the sketch-line ink for the body colour (sketchLine.js), so they show even when every zone is one colour.
function insertDetails(fabric, canvas, details = [], zoneCount, bodyFill) {
  const under = details.filter(d => !d.over), over = details.filter(d => d.over);
  const make = d => new fabric.Path(d.d, { ...DETAIL_STYLE[d.kind], ...((d.kind === 'seam' || d.kind === 'line') && { stroke: sketchInk(bodyFill) }), ...d.style, selectable: false, evented: !!d.part, objectCaching: false, __garmentBase: true, __detailKind: d.kind, __detailPart: d.part,
    ...(d.part && { __zoneKey: `detail:${d.part}`, perPixelTargetFind: false }) });
  under.forEach((d, i) => canvas.insertAt(1 + i, make(d)));
  const start = zoneCount + under.length;
  over.forEach((d, i) => canvas.insertAt(start + i, make(d)));
  return start + over.length;
}

// Topmost zone actually painted under the pointer. containsPoint alone tests the bounding box, so the body (whose box
// covers the collar, pocket and most of the sleeves) used to win every click and hover.
function zoneAt(canvas, e) {
  const scene = canvas.getScenePoint?.(e) ?? canvas.getPointer(e);
  const vp = canvas.getViewportPoint?.(e) ?? scene;
  return canvas.getObjects().filter(o => o.__garmentBase && o.__zoneKey).reverse()
    .find(o => o.containsPoint(scene) && !canvas.isTargetTransparent(o, vp.x, vp.y));
}

const OVERLAY_PROPS = ['__logo','__artwork','__text','__draw','__shape','__layerId','__layerName','__locked','__erase','__curve','__shapeKind','__clip','__pocket','__pocketPanels','__pocketColor','lockMovementX','lockMovementY','lockRotation','lockScalingX','lockScalingY','hasControls'];
// The customer's overlays as saved JSON, in canvas coordinates (plainObject decomposes active-selection members). One serialiser
// for history, saves and exports.
const overlayJSON = canvas => canvas.getObjects()
  .filter(o => !o.__garmentBase && !o.__hoverGlow)
  .filter(o => typeof o.toObject === 'function')
  .map(o => plainObject(o, OVERLAY_PROPS));

// Composites front+back PNGs side by side; falls back to one side if the other fails to load.
const FRONT_BACK_GAP = 36;
export function compositeFrontBack(frontUrl, backUrl) {
  return new Promise((resolve) => {
    if (!frontUrl && !backUrl) { resolve(null); return; }
    if (!frontUrl || !backUrl) { resolve(frontUrl ?? backUrl); return; }
    const imgF = new Image();
    const imgB = new Image();
    let loaded = 0;
    let failed = false;
    const finish = () => {
      if (failed) { resolve(frontUrl); return; }
      const w = imgF.naturalWidth + FRONT_BACK_GAP + imgB.naturalWidth;
      const h = Math.max(imgF.naturalHeight, imgB.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgF, 0, (h - imgF.naturalHeight) / 2);
      ctx.drawImage(imgB, imgF.naturalWidth + FRONT_BACK_GAP, (h - imgB.naturalHeight) / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    const onLoad = () => { if (++loaded === 2) finish(); };
    const onError = () => { failed = true; if (++loaded === 2) finish(); };
    imgF.onload = onLoad; imgF.onerror = onError;
    imgB.onload = onLoad; imgB.onerror = onError;
    imgF.src = frontUrl; imgB.src = backUrl;
  });
}

// customKey: the build-your-own shape (cfg.custom) as a string, so a slider change redraws the base like a garment change does.
export function useGarmentCanvas(canvasRef, garment, sleeve, face, colors, patterns, patternParams, onSelect, onZoneClick, fit, details, customKey = '', onRestoreLook = null) {
  const fc = useRef(null);
  // Called with (overlay JSON, garment canvas size) after the customer adds a logo or text; the uniform set's "Apply to: Both" mirrors it.
  const onAdded = useRef(null);
  const hoverEl = useRef(null);
  const fabricReady = useRef(false);
  const disposePending = useRef(null); // in-flight dispose() Promise, guards StrictMode double-mount

  // Starts at an empty baseline so the first action can be undone; a design load restarts it (resetHistory), a side switch parks it.
  const history = useRef(emptyHistory());
  const parkedHistory = useRef({}); // the other side's history while it is not on the canvas
  // The garment's look rides in every entry, so colour and pattern changes undo with the overlays.
  const liveLook = useRef(null);
  liveLook.current = lookOf({ garment, sleeve, fit, customKey, colors, patterns, patternParams, details });
  const restoreLook = useRef(onRestoreLook);
  const awaitLook = useRef(null); // a look undo/redo applied that has not rendered yet
  restoreLook.current = onRestoreLook;
  const historyLock = useRef(false);
  const [editTick, setHistoryTick] = useState(0); // refs don't trigger re-render; this forces one (and tells autosave an edit happened)

  const [, setLayersTick] = useState(0);
  const bumpLayers = useCallback(() => setLayersTick(t => t + 1), []);
  const [initFailed, setInitFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const redrawToken = useRef(0);
  // Overlay loads (reload, face switch, undo/redo) finish asynchronously (enliven, then web fonts); only the newest may land.
  const overlayLoad = useRef(0);
  // Latest props for exportFace, which polls across a face switch.
  const latest = useRef({ garment, sleeve, face, fit });
  latest.current = { garment, sleeve, face, fit };
  // The garment's box in canvas px, published after each base draw (the rulers measure 0-100 % of it).
  const [garmentRect, setGarmentRect] = useState(null);
  const publishGarment = useCallback((c) => {
    const g = c ? garmentBox(c) : null;
    setGarmentRect(p => (p && g && ['left', 'top', 'width', 'height'].every(k => Math.abs(p[k] - g[k]) < 0.5) ? p : g));
  }, []);
  const eraser = useRef(false); // Draw tool in eraser mode: a stroke cuts the customer's drawings and art, never the garment
  // Snapping options (set by the Studio's grid/snap toggles) and the guides of the current drag. Guides are drawn on Fabric's
  // interaction layer only, never added as objects, so they cannot be saved, exported or put in history.
  const snapOpts = useRef({ snap: true, gridPct: 10, rulerGuides: [], scale: 1, showGrid: false, centre: false, smart: true }); // scale: on-screen px per canvas px (zoom x fit)
  const dragGuides = useRef({ targets: null, guides: [], readout: null, ghosts: null });
  // Colour-only copies: placed items can't be picked, moved or edited; garment zones still take clicks.
  const frozen = useRef(false);
  const freezeObj = useCallback((o) => {
    if (!frozen.current || !o || o.__garmentBase || o.__hoverGlow || o.__frozenFrom) return;
    o.__frozenFrom = { selectable: o.selectable, evented: o.evented };
    o.set({ selectable: false, evented: false });
  }, []);

  // Init once on mount. useLayoutEffect (not useEffect) so cleanup runs
  // before React's own DOM removal — avoids a removeChild race with
  // Fabric's async dispose() under StrictMode's mount/unmount/mount.
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import('fabric').then(async (mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (disposePending.current) { try { await disposePending.current; } catch {} }
      if (cancelled || !canvasRef.current) return;
      const paths = getGarmentPaths(garment, sleeve, face);

      installTouchHandles(fabric);
      fc.current = new fabric.Canvas(canvasRef.current, {
        width: paths.w, height: paths.h,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: !frozen.current,
      });
      fabricReady.current = true;
      setReady(true);
      installStageLayers(fc.current, snapOpts); // grid between garment and design, centre line on top; live canvas only

      const drawInitialGarment = () => {
        const c = fc.current;
        if (!c) return;
        const initPaths = detailedPaths(garment, sleeve, face, details);
        if (assetFor(garment, sleeve, face, fit)) { c.setWidth(initPaths.w); c.setHeight(initPaths.h); return; }
        let zi = 0;
        const zones = [];
        const draw = (d, fill, zoneKey) => {
          if (!d) return;
          // FIX (Sept 10 2026): pocket previously used the exact same
          // subtle structural-seam outline as body/collar/sleeve — at
          // 0.14 opacity it read as an unexplained floating color block
          // rather than a garment feature. A visible dashed stroke reads
          // as topstitching, the way a real pocket is actually finished.
          const isPocket = zoneKey === 'pocket';
          const zone = new fabric.Path(d, {
            fill,
            stroke: zoneKey === 'body' ? 'rgba(0,0,0,.14)' : sketchInk(fill),
            strokeWidth: isPocket ? 1.5 : 1.5,
            strokeDashArray: isPocket ? [3, 2] : undefined,
            selectable:false, evented:true, __garmentBase:true, __zoneKey:zoneKey,
          });
          c.insertAt(zi++, zone);
          zones.push({ obj: zone, d });
        };
        draw(initPaths.body,    colors.body,                     'body');
        draw(initPaths.collar,  colors.collar,                   'collar');
        draw(initPaths.sleeveL, colors.sleeve ?? colors.body,    'sleeve');
        draw(initPaths.sleeveR, colors.sleeve ?? colors.body,    'sleeve');
        draw(initPaths.pocket,  colors.pocket  ?? colors.collar, 'pocket');
        insertDetails(fabric, c, initPaths.details, zi, colors.body);
        addFabricShading(fabric, c, initPaths, face, zones, () => fc.current === c && redrawToken.current === 0);
        c.setWidth(initPaths.w);
        c.setHeight(initPaths.h);
        c.renderAll();
        publishGarment(c);
      };
      drawInitialGarment();

      // Re-render after 200ms in case the container was zero-sized on first draw
      setTimeout(() => {
        if (fc.current) {
          fc.current.setWidth(fc.current.getWidth() || 620);
          fc.current.setHeight(fc.current.getHeight() || 680);
          fc.current.renderAll();
        }
      }, 250);

      fc.current.on('mouse:move', (opt) => {
        // No zone highlight while an element is being moved or resized: it would compete with the snap guides.
        const hit = fc.current._currentTransform ? null : zoneAt(fc.current, opt.e);
        if (hoverEl.current) { fc.current.remove(hoverEl.current); hoverEl.current = null; }
        if (hit) {
          const bounds = hit.getBoundingRect();
          const rect = new fabric.Rect({
            left: bounds.left - 2, top: bounds.top - 2,
            width: bounds.width + 4, height: bounds.height + 4,
            fill: 'transparent', stroke: T2, strokeWidth: 2, strokeDashArray: [6, 4],
            selectable: false, evented: false, __hoverGlow: true,
          });
          hoverEl.current = rect;
          fc.current.add(rect);
          fc.current.renderAll();
        }
      });

      fc.current.on('mouse:out', () => {
        if (hoverEl.current) { fc.current.remove(hoverEl.current); hoverEl.current = null; fc.current.renderAll(); }
      });

      // Only a real tap on a zone opens the colour picker: released on the same zone having barely moved (not a drag, a resize
      // handle or the first finger of a pinch, which on a phone used to open the colour sheet under the second finger).
      let tap = null;
      fc.current.on('mouse:down', (opt) => {
        tap = opt.target && !opt.target.__zoneKey ? null : { p: fc.current.getViewportPoint(opt.e), zone: zoneAt(fc.current, opt.e)?.__zoneKey };
      });
      fc.current.on('mouse:up', (opt) => {
        const t = tap; tap = null;
        if (!t?.zone) return;
        const p = fc.current.getViewportPoint(opt.e);
        if (Math.hypot(p.x - t.p.x, p.y - t.p.y) <= 6 && zoneAt(fc.current, opt.e)?.__zoneKey === t.zone) onZoneClick(t.zone);
      });

      // Snapping, smart guides and a live readout while a design element is moved or resized. Targets are collected once per gesture.
      // Everything is drawn on Fabric's interaction layer (contextTop): never an object, so never saved, exported or undoable.
      const isOverlay = o => o && !o.__garmentBase && !o.__hoverGlow && o.visible !== false;
      // Snap lines: the garment centre (and canvas centre) always; with smart guides also the garment edges and other elements'
      // edges and centres; grid lines only while the grid is shown.
      const targetsFor = (c, obj) => {
        const smart = snapOpts.current.smart;
        const moving = new Set(obj.getObjects ? [obj, ...obj.getObjects()] : [obj]);
        const others = smart ? c.getObjects().filter(o => isOverlay(o) && !moving.has(o)).map(o => o.getBoundingRect()) : [];
        const g = garmentBox(c); // grid and ruler guides are garment-relative (origin at its top-left)
        return snapTargets({ width: c.getWidth(), height: c.getHeight(), garment: g, garmentEdges: smart, others, grid: snapOpts.current.showGrid ? gridSpec(g, snapOpts.current.gridPct) : null, guides: guideLines(g, snapOpts.current.rulerGuides) });
      };
      const threshold = () => snapThreshold(snapOpts.current.scale);
      // Fabric moves left/top during a drag without refreshing the cached corner coords that getBoundingRect() reads, so they are
      // refreshed first; otherwise the snap measures where the drag started and draws guides for alignments that no longer exist.
      const applySnap = (obj, targets) => {
        obj.setCoords();
        const { dx, dy, guides } = computeSnap(obj.getBoundingRect(), targets, threshold());
        if (dx || dy) { obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy }); obj.setCoords(); }
        return guides;
      };
      // Resize: pull only the moving sides to a line, keeping the opposite side anchored the way Fabric does. Axis-aligned elements
      // only (a rotated box's sides are not its bounding box), and never after a flip (the anchor has switched sides).
      const applyResizeSnap = (obj, tr, targets) => {
        const { x, y } = movingEdges(tr.corner);
        const anchoredX = !x || tr.originX === (x === 'left' ? 'right' : 'left'), anchoredY = !y || tr.originY === (y === 'top' ? 'bottom' : 'top');
        if ((obj.angle ?? 0) % 360 !== 0 || !anchoredX || !anchoredY || obj.scaleX <= 0 || obj.scaleY <= 0) return [];
        const o0 = tr.original ?? {};
        const uniform = !!(x && y) && Math.abs(obj.scaleX / obj.scaleY - (o0.scaleX ?? 1) / (o0.scaleY ?? 1)) < 1e-6;
        let guides = [];
        for (let pass = 0; pass < 2; pass++) { // the second pass removes stroke rounding, so a guide only shows for a real alignment
          obj.setCoords(); // Fabric does not refresh the cached coords while scaling either
          const r = computeResizeSnap(obj.getBoundingRect(), tr.corner, targets, threshold(), uniform);
          guides = r.guides;
          if (r.rx === 1 && r.ry === 1) break;
          const anchor = obj.translateToOriginPoint(obj.getRelativeCenterPoint(), tr.originX, tr.originY);
          obj.set({ scaleX: obj.scaleX * r.rx, scaleY: obj.scaleY * r.ry });
          obj.setPositionByOrigin(anchor, tr.originX, tr.originY);
          obj.setCoords();
        }
        return guides;
      };
      const track = (obj, action, guides) => { dragGuides.current.guides = guides; dragGuides.current.readout = { obj, action }; };
      fc.current.on('object:moving', (e) => {
        const c = fc.current, obj = e.target;
        if (!c || !isOverlay(obj)) return;
        // A logo or text being moved shows the garment's placement presets for this face as ghosts.
        if ((obj.__logo && !obj.__artwork) || obj.__text) {
          const L = latest.current;
          dragGuides.current.ghosts ??= placementTargets(L.garment, L.sleeve, L.fit, L.face, c.getWidth(), c.getHeight());
        }
        if (!snapOpts.current.snap) return track(obj, 'move', []);
        dragGuides.current.targets ??= targetsFor(c, obj);
        track(obj, 'move', applySnap(obj, dragGuides.current.targets));
      });
      fc.current.on('object:scaling', (e) => {
        const c = fc.current, obj = e.target, tr = e.transform;
        if (!c || !isOverlay(obj)) return;
        if (!snapOpts.current.snap || !tr) return track(obj, 'scale', []);
        dragGuides.current.targets ??= targetsFor(c, obj);
        track(obj, 'scale', applyResizeSnap(obj, tr, dragGuides.current.targets));
      });
      fc.current.on('object:rotating', (e) => {
        const obj = e.target;
        if (!fc.current || !isOverlay(obj)) return;
        if (snapOpts.current.snap) { const n = snapAngle(obj.angle ?? 0); if (n !== obj.angle) { obj.rotate(n); obj.setCoords(); } }
        track(obj, 'rotate', []);
      });
      fc.current.on('after:render', () => {
        const c = fc.current, g = dragGuides.current.guides, ro = dragGuides.current.readout, gh = dragGuides.current.ghosts;
        if (!c || (!g.length && !ro && !gh?.length) || c.isDrawingMode || !c.contextTop) return;
        const ctx = c.contextTop, vt = c.viewportTransform, r = c.getRetinaScaling?.() ?? 1;
        c.clearContext(ctx);
        ctx.save();
        ctx.setTransform(r * vt[0], 0, 0, r * vt[3], r * vt[4], r * vt[5]);
        const px = 1 / (vt[0] * (snapOpts.current.scale || 1)); // one screen px through the wrapper's CSS zoom
        if (gh?.length && ro) drawPlacementGhosts(ctx, c, gh, ro.obj, snapOpts.current.scale);
        // At least one backing-store px: the canvas bitmap is at canvas resolution, so a thinner line antialiases to a faint smear.
        ctx.lineWidth = Math.max(px, 1 / (r * vt[0]));
        for (const l of g) {
          ctx.strokeStyle = l.kind === 'grid' ? 'rgba(2,128,144,.55)' : '#e11d74';
          ctx.setLineDash(l.kind === 'grid' ? [3 * px, 3 * px] : []);
          ctx.beginPath();
          if (l.axis === 'v') { ctx.moveTo(l.at, 0); ctx.lineTo(l.at, c.getHeight()); } else { ctx.moveTo(0, l.at); ctx.lineTo(c.getWidth(), l.at); }
          ctx.stroke();
        }
        if (ro && garmentBox(c)) { // readout pill under the element (above it near the canvas bottom), constant on-screen size
          const b = ro.obj.getBoundingRect(), text = readoutPct(ro.obj, garmentBox(c)); // X Y W H % of the garment (+ rotation), never units
          ctx.setLineDash([]);
          ctx.font = `600 ${11 * px}px ui-sans-serif, system-ui, sans-serif`;
          const w = ctx.measureText(text).width + 12 * px, h = 18 * px;
          const x = Math.min(Math.max(b.left + b.width / 2 - w / 2, 2 * px), c.getWidth() - w - 2 * px);
          const below = b.top + b.height + 8 * px, y = below + h > c.getHeight() ? Math.max(2 * px, b.top - 8 * px - h) : below;
          ctx.fillStyle = 'rgba(15,23,42,.86)';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4 * px); else ctx.rect(x, y, w, h);
          ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
          ctx.fillText(text, x + w / 2, y + h / 2);
        }
        ctx.restore();
      });
      const endDrag = () => {
        const c = fc.current;
        const had = dragGuides.current.guides.length || dragGuides.current.readout || dragGuides.current.ghosts;
        dragGuides.current = { targets: null, guides: [], readout: null, ghosts: null };
        if (c && had && c.contextTop) { c.clearContext(c.contextTop); c.requestRenderAll(); }
      };
      fc.current.on('mouse:up', endDrag);
      fc.current.on('mouse:down', endDrag); // a new press never inherits a previous gesture's guides, ghosts or readout
      // A drag, resize or rotate on the canvas is one undoable step (programmatic moves push their own history).
      fc.current.on('object:modified', (e) => {
        const c = fc.current, obj = e.target, action = e.action ?? e.transform?.action;
        // The release can re-apply the raw pointer position after the last snapped move, so a drag is snapped once more here.
        if (c && isOverlay(obj) && snapOpts.current.snap && action === 'drag') {
          applySnap(obj, dragGuides.current.targets ?? targetsFor(c, obj));
          c.requestRenderAll();
        }
        endDrag();
        if (isOverlay(obj)) { pushHistory(); bumpLayers(); }
      });

      fc.current.on('selection:created', e => onSelect(e.selected?.[0] ?? null));
      fc.current.on('selection:updated', e => onSelect(e.selected?.[0] ?? null));
      fc.current.on('selection:cleared',  () => onSelect(null));
      fc.current.on('object:added', e => freezeObj(e.target));

      // Freeform stroke → tag + track as a layer, same as addLogo/addText below
      fc.current.on('path:created', (e) => {
        const path = e.path;
        if (!path) return;
        if (eraser.current) { // the eraser stroke is never kept: it cuts what it touched, as one undo step
          const c = fc.current;
          c.remove(path);
          const n = applyErase(fabric, c, path, (c.freeDrawingBrush?.width ?? 10) / 2);
          c.renderAll();
          if (n) { pushHistory(); bumpLayers(); }
          return;
        }
        path.set({ __draw: true, __layerId: crypto.randomUUID(), __layerName: 'Drawing', selectable: true });
        fc.current.renderAll();
        pushHistory();
        bumpLayers();
        const L = latest.current; // a set's "Apply to: Both" copies the stroke onto the other piece too
        onAdded.current?.(plainObject(path, OVERLAY_PROPS), getGarmentPaths(L.garment, L.sleeve));
      });
    }).catch(err => { console.error('[DesignStudio] fabric load error:', err); if (!cancelled) setInitFailed(true); });

    return () => {
      cancelled = true;
      if (fc.current) {
        const canvas = fc.current;
        fc.current = null;
        fabricReady.current = false;
        try {
          const result = canvas.dispose();
          if (result && typeof result.then === 'function') {
            disposePending.current = result.catch(() => {}).finally(() => { disposePending.current = null; });
          } else {
            disposePending.current = null;
          }
        } catch { disposePending.current = null; }
      } else {
        fabricReady.current = false;
      }
    };
  }, []);

  // Redraw garment when garment/sleeve/colors/patterns change (first frame drawn above)
  useEffect(() => {
    const canvas = fc.current;
    if (!canvas || !fabricReady.current) return;

    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const paths = detailedPaths(garment, sleeve, face, details);
      canvas.getObjects().filter(o => o.__garmentBase || o.__hoverGlow).forEach(o => canvas.remove(o));

      // Photo base: one recoloured cut-out in the body zone, same canvas size as the vector template so logo/text placement is unchanged.
      const asset = assetFor(garment, sleeve, face, fit);
      if (asset) {
        const token = ++redrawToken.current;
        canvas.setWidth(paths.w); canvas.setHeight(paths.h);
        tintedCanvas(asset, { body: colors.body, collar: colors.collar }).then((src) => {
          if (token !== redrawToken.current || fc.current !== canvas) return;
          const scale = Math.min(paths.w / asset.w, paths.h / asset.h);
          canvas.getObjects().filter(o => o.__garmentBase).forEach(o => canvas.remove(o));
          canvas.insertAt(0, new fabric.Image(src, {
            left: (paths.w - asset.w * scale) / 2, top: (paths.h - asset.h * scale) / 2, scaleX: scale, scaleY: scale,
            selectable: false, evented: true, objectCaching: false, __garmentBase: true, __zoneKey: 'body', __content: src.__content ?? null,
          }));
          canvas.renderAll();
          publishGarment(canvas);
        }).catch(() => {});
        return;
      }
      const vectorToken = ++redrawToken.current;

      let zi = 0;
      const zones = [];
      const makeZone = (d, fill, zoneKey) => {
        if (!d) return;
        const patDef = PATTERNS.find(p => p.id === (patterns?.[zoneKey] ?? 'solid'));
        const zonePath = new fabric.Path(d, {
          fill,
          stroke: zoneKey === 'body' ? 'rgba(0,0,0,.14)' : sketchInk(fill),
          strokeWidth: 1.5,
          strokeDashArray: zoneKey === 'pocket' ? [3, 2] : undefined,
          selectable:false, evented:true, __garmentBase:true, __zoneKey:zoneKey,
        });
        canvas.insertAt(zi++, zonePath);
        zones.push({ obj: zonePath, d });
        if (patDef?.woven) {
          const woven = wovenFill(fabric, patDef.id, fill, patternParams?.[zoneKey]);
          if (woven) zonePath.set('fill', woven);
        } else if (patDef?.svg) {
          const zoneParams = patternParams?.[zoneKey] ?? patDef.defaultParams;
          const svgStr = patDef.svg(fill, zoneParams?.width, zoneParams?.spacing);
          const blob = new Blob([svgStr], { type:'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          fabric.Image.fromURL(url).then((img) => {
            // BUG FIX: this used to look the object up with
            // canvas.getObjects().find(o => o.__zoneKey === zoneKey) — but the
            // left and right sleeve share zoneKey 'sleeve', so find() always
            // returned the LEFT one and the right sleeve never got its pattern
            // (visible in 2D: one striped sleeve, one solid). Bind to the exact
            // Path created above instead; skip if a redraw already removed it.
            if (canvas.getObjects().includes(zonePath)) {
              zonePath.set('fill', new fabric.Pattern({ source: img.getElement(), repeat:'repeat' }));
              canvas.renderAll();
            }
            URL.revokeObjectURL(url);
          }).catch(() => { URL.revokeObjectURL(url); });
        }
      };

      makeZone(paths.body,    colors.body,                    'body');
      makeZone(paths.collar,  colors.collar,                  'collar');
      makeZone(paths.sleeveL, colors.sleeve ?? colors.body,   'sleeve');
      makeZone(paths.sleeveR, colors.sleeve ?? colors.body,   'sleeve');
      makeZone(paths.pocket,  colors.pocket ?? colors.collar, 'pocket');
      const baseEnd = insertDetails(fabric, canvas, paths.details, zi, colors.body);

      // Tipping: contrast trim traced along the collar edge (real garment
      // term — a colored stripe at the collar/cuff seam, standard on most
      // polos). Stroke-only re-trace of the same collar path, no fill —
      // reads as a colored edge line at this flat-vector illustration
      // fidelity. Off by default (colors.tipping is null until the
      // customer picks one in ColorsPanel's Tipping zone); never has a
      // __zoneKey, so it's decorative-only like the sheen layer below.
      if (paths.collar && colors.tipping) {
        canvas.insertAt(baseEnd, new fabric.Path(paths.collar, {
          fill: 'transparent',
          stroke: colors.tipping,
          strokeWidth: 4,
          selectable: false, evented: false, __garmentBase: true,
        }));
      }

      // Fabric realism (drop shadow, woven grain, edge shading or the derived model's own lighting): fabricShading.js.
      addFabricShading(fabric, canvas, paths, face, zones, () => fc.current === canvas && redrawToken.current === vectorToken);

      canvas.setWidth(paths.w);
      canvas.setHeight(paths.h);
      canvas.renderAll();
      publishGarment(canvas);
    }).catch(() => {});
  }, [garment, sleeve, face, colors, patterns, patternParams, fit, details, customKey, ready, publishGarment]);

  // History helpers — declared before addLogo/addText/deleteSelected, which depend on pushHistory
  const pushHistory = useCallback(() => {
    if (historyLock.current) return;
    const canvas = fc.current;
    if (!canvas) return;
    const snapshot = overlayJSON(canvas);
    // A colour change still waiting on its debounce becomes its own step first, so it never merges into this one.
    const h = history.current.stack.length ? syncLook(history.current, liveLook.current) : history.current;
    history.current = pushStep(h, entry(snapshot, liveLook.current));
    setHistoryTick(t => t + 1);
  }, []);

  // Colour, pattern and detail changes: one undo step per burst (a slider drag is one step, not one per frame).
  const flushLook = useCallback(() => {
    if (historyLock.current) return;
    if (awaitLook.current && !sameLook(awaitLook.current, liveLook.current)) return; // a quick second Ctrl+Z must not record the old colours
    awaitLook.current = null;
    const next = syncLook(history.current, liveLook.current);
    if (next !== history.current) { history.current = next; setHistoryTick(t => t + 1); }
  }, []);
  const lookSig = JSON.stringify(liveLook.current);
  useEffect(() => {
    awaitLook.current = null; // rendered: the live look is now whatever was applied
    const t = setTimeout(flushLook, 400);
    return () => clearTimeout(t);
  }, [lookSig, flushLook]);

  // The loaded overlays become the new baseline: undo never steps back into the previous design, and neither side keeps an old history.
  const resetHistory = useCallback(() => {
    history.current = { stack: [], idx: -1 };
    parkedHistory.current = {};
    pushHistory();
  }, [pushHistory]);

  const restoreSnapshot = useCallback((target, next) => {
    history.current = next;
    setHistoryTick(t => t + 1);
    const look = lookToApply(target, liveLook.current);
    if (look && restoreLook.current) { awaitLook.current = look; restoreLook.current(look); }
    const canvas = fc.current;
    const snapshot = target?.o ?? [];
    if (!canvas) return;
    // A colour-only step leaves the overlays alone (no rebuild, no flicker, the selection stays).
    if (JSON.stringify(overlayJSON(canvas)) === JSON.stringify(snapshot)) return;
    historyLock.current = true;
    // Undo/redo rebuilds every overlay; keep the same element selected (by layer id) so editing continues.
    const activeId = canvas.getActiveObject()?.__layerId ?? null;
    canvas.getObjects().filter(o => !o.__garmentBase && !o.__hoverGlow).forEach(o => canvas.remove(o));
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (!snapshot || snapshot.length === 0) { canvas.renderAll(); historyLock.current = false; bumpLayers(); return; }
      const token = ++overlayLoad.current;
      Promise.resolve(fabric.util.enlivenObjects(snapshot)).then(reviveOverlays)
        .then(enlivened => {
          if (token !== overlayLoad.current) { historyLock.current = false; return; }
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          const again = activeId && (enlivened ?? []).find(o => o.__layerId === activeId);
          if (again) canvas.setActiveObject(again);
          canvas.renderAll();
          historyLock.current = false;
          bumpLayers();
        })
        .catch(() => { historyLock.current = false; });
    }).catch(() => { historyLock.current = false; });
  }, [bumpLayers]);

  const step = useCallback((dir) => {
    flushLook(); // a colour picked a moment ago is undone first, not skipped
    const s = stepHistory(history.current, dir);
    if (s) restoreSnapshot(s.snapshot, s.history);
  }, [restoreSnapshot, flushLook]);
  const undo = useCallback(() => step(-1), [step]);
  const redo = useCallback(() => step(1), [step]);

  const canUndo = canStep(history.current, -1);
  const canRedo = canStep(history.current, 1);

  // pos: optional {x,y} in canvas-logical space, supplied when the logo was
  // dragged onto the canvas from the panel (see dragPlace.js) instead of
  // placed at a fixed preset — dragging always wins over the preset dropdown
  // since it's the position the customer actually chose.
  const addLogo = useCallback((dataUrl, presetId = 'left_chest', pos = null, opts = null) => {
    const canvas = fc.current;
    if (!canvas) return;
    const paths = getGarmentPaths(garment, sleeve);
    const preset = LOGO_PRESETS.find(p => p.id === presetId) ?? LOGO_PRESETS[0];
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then((img) => {
        const art = !!opts?.artwork; // personal artwork: a larger, centred image layer, never garment geometry
        const centred = !!pos || art;
        img.scaleToWidth(art ? Math.round(paths.w * 0.4) : 72);
        img.set({
          left: pos ? pos.x : art ? paths.w / 2 : paths.w * preset.x,
          top:  pos ? pos.y : art ? paths.h * 0.42 : paths.h * preset.y,
          originX: centred ? 'center' : 'left', originY: centred ? 'center' : 'top',
          __logo: true, __artwork: art, __layerId: crypto.randomUUID(), __layerName: art ? 'Artwork' : 'Logo',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        pushHistory();
        bumpLayers();
        onAdded.current?.(plainObject(img, OVERLAY_PROPS), paths);
      }).catch(() => {});
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  // pos: optional {x,y} in canvas-logical space from a drag-drop; falls
  // back to the original fixed placement (upper-third, centered) when the
  // text was placed via the keyboard-accessible path instead (see
  // useDragPlace.js's placeByKeyboard, which passes the canvas center).
  const addText = useCallback((text, color, fontCss, sizePx, pos = null) => {
    const canvas = fc.current;
    if (!canvas) return;
    const paths = getGarmentPaths(garment, sleeve);
    const web = webFontFor(fontCss), weight = web ? defaultWeight(web) : 'bold';
    Promise.all([import('fabric'), loadFont(fontCss, weight)]).then(([mod]) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const t = new fabric.IText(text, {
        left: pos ? pos.x : paths.w / 2, top: pos ? pos.y : paths.h * 0.4,
        originX: 'center', originY: 'center', fontSize: sizePx ?? 18,
        fontFamily: fontCss ?? 'Arial Black, sans-serif',
        fill: color, fontWeight: weight, paintFirst: 'stroke', strokeLineJoin: 'round', __text: true,
        __layerId: crypto.randomUUID(),
        __layerName: text.length > 20 ? text.slice(0, 20) + '…' : text,
      });
      canvas.add(t);
      canvas.setActiveObject(t);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
      onAdded.current?.(plainObject(t, OVERLAY_PROPS), paths);
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  // pos: optional {x,y} in canvas-logical space from a drag-drop; falls
  // back to dead-center when placed via the keyboard-accessible path.
  const addShape = useCallback((kind, color = T2, pos = null) => {
    const canvas = fc.current;
    if (!canvas) return;
    const paths = getGarmentPaths(garment, sleeve);
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const common = {
        left: pos ? pos.x : paths.w / 2, top: pos ? pos.y : paths.h / 2,
        originX: 'center', originY: 'center',
        fill: color, stroke: 'rgba(0,0,0,.25)', strokeWidth: 1,
        __shape: true, __layerId: crypto.randomUUID(),
      };
      const shape = makeShape(fabric, kind, common, color); // overlayTools.js
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
      onAdded.current?.(plainObject(shape, OVERLAY_PROPS), paths);
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  // Add pocket: a real layer (panels + stitching) in the pocket colour, at the preset's spot or where it was dropped. One undo step.
  const addPocket = useCallback((kind, color, pos = null) => {
    const canvas = fc.current;
    if (!canvas) return;
    const paths = getGarmentPaths(garment, sleeve), at = pos ?? pocketSpot(kind, paths, pieceOf(garment));
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const pocket = makePocket(fabric, kind, { left: at.x, top: at.y, originX: 'center', originY: 'center', __layerId: crypto.randomUUID() }, color);
      canvas.add(pocket);
      canvas.setActiveObject(pocket);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
      onAdded.current?.(plainObject(pocket, OVERLAY_PROPS), paths);
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  // Recolour the selected pocket (panels in the colour, stitching for contrast). One undo step when committed.
  const setPocketColor = useCallback((color, commit = true) => {
    const canvas = fc.current, obj = canvas?.getActiveObject();
    if (!obj || obj.__locked || !recolorPocket(obj, color)) return;
    canvas.renderAll();
    if (commit) pushHistory();
    bumpLayers();
  }, [pushHistory, bumpLayers]);

  // Mirror: a copy of the selected element on the other side of the garment's centre line, flipped. One undo step.
  const mirrorSelected = useCallback(() => {
    const canvas = fc.current, obj = canvas?.getActiveObject();
    if (!canvas || !obj || obj.__garmentBase || obj.__hoverGlow || obj.type === 'activeselection') return;
    const g = garmentBox(canvas), cx = g ? g.left + g.width / 2 : canvas.getWidth() / 2;
    obj.clone(OVERLAY_PROPS).then(c => reviveOverlays([c])).then(([copy]) => {
      const p = obj.getCenterPoint();
      copy.set({ flipX: !obj.flipX, __layerId: crypto.randomUUID(), __layerName: obj.__layerName ? `${obj.__layerName} (mirrored)` : undefined });
      copy.setPositionByOrigin({ x: mirroredX(p.x, cx), y: p.y }, 'center', 'center');
      copy.setCoords();
      canvas.add(copy);
      canvas.setActiveObject(copy);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }).catch(() => {});
  }, [pushHistory, bumpLayers]);

  // Live-edits the selected object's own properties (fill, opacity) —
  // used by ShapesPanel's inspector. Refuses garment-base/hover objects,
  // same guard deleteSelected uses below.
  const updateSelected = useCallback((props, commit = true) => {
    const canvas = fc.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.__garmentBase || obj.__hoverGlow) return;
    if (obj.__locked && !('__locked' in props)) return;
    obj.set(props);
    if (typeof props.text === 'string') obj.__layerName = props.text.slice(0, 20) + (props.text.length > 20 ? '…' : '');
    if (typeof obj.text === 'string' && changesLayout(props)) {
      restyleText(obj, props).then(() => { canvas.renderAll(); if (commit) pushHistory(); bumpLayers(); }).catch(() => {});
      return;
    }
    canvas.renderAll();
    if (commit) pushHistory();
    bumpLayers();
  }, [pushHistory, bumpLayers]);

  // Stacking order among the customer's elements: front | forward | backward | back. One undo step.
  const arrangeLayer = useCallback((where) => {
    const canvas = fc.current, obj = canvas?.getActiveObject();
    if (!obj || obj.__garmentBase || obj.type === 'activeselection' || !moveInStack(canvas, obj, where)) return;
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [pushHistory, bumpLayers]);

  const deleteSelected = useCallback(() => {
    const canvas = fc.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj?.type === 'activeselection') { // several selected: remove each unlocked member, one undo step
      const gone = canvas.getActiveObjects().filter(o => !o.__garmentBase && !o.__locked);
      canvas.discardActiveObject();
      gone.forEach(o => canvas.remove(o));
      canvas.renderAll();
      if (gone.length) { pushHistory(); bumpLayers(); }
      return;
    }
    if (obj && !obj.__garmentBase && !obj.__hoverGlow && !obj.__locked) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }
  }, [pushHistory, bumpLayers]);

  // Duplicates the selected object — real Fabric clone(), not a fake copy.
  // Keeps the same __shape/__logo/__text/__draw tag (so LayersPanel and the
  // RightInfoPanel inspector treat it identically to the original) but gets
  // a fresh __layerId and a small position offset so it's visibly a copy,
  // not stacked exactly on top of the original.
  const duplicateSelected = useCallback(() => {
    const canvas = fc.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.__garmentBase || obj.__hoverGlow) return;
    obj.clone(OVERLAY_PROPS).then(c => reviveOverlays([c])).then(([copy]) => {
      copy.set({
        left: (obj.left ?? 0) + 16,
        top: (obj.top ?? 0) + 16,
        __layerId: crypto.randomUUID(),
        __layerName: obj.__layerName ? `${obj.__layerName} copy` : undefined,
      });
      canvas.add(copy);
      canvas.setActiveObject(copy);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }).catch(() => {});
  }, [pushHistory, bumpLayers]);

  // Moves the selected unlocked element so its bounding box lines up with the garment (union of the
  // base zones), or with the canvas when no garment is drawn. where: left | hcenter | right | top | vcenter | bottom.
  const alignSelected = useCallback((where) => {
    const canvas = fc.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.__garmentBase || obj.__hoverGlow || obj.__locked) return;
    const bases = canvas.getObjects().filter(o => o.__garmentBase && o.visible !== false);
    const rects = bases.map(o => o.getBoundingRect());
    const area = rects.length
      ? (() => { const l = Math.min(...rects.map(r => r.left)), t = Math.min(...rects.map(r => r.top));
          return { left: l, top: t, width: Math.max(...rects.map(r => r.left + r.width)) - l, height: Math.max(...rects.map(r => r.top + r.height)) - t }; })()
      : { left: 0, top: 0, width: canvas.getWidth(), height: canvas.getHeight() };
    const box = obj.getBoundingRect();
    const dx = { left: area.left - box.left, right: area.left + area.width - box.left - box.width, hcenter: area.left + (area.width - box.width) / 2 - box.left }[where] ?? 0;
    const dy = { top: area.top - box.top, bottom: area.top + area.height - box.top - box.height, vcenter: area.top + (area.height - box.height) / 2 - box.top }[where] ?? 0;
    if (!dx && !dy) return;
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
    obj.setCoords();
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [pushHistory, bumpLayers]);

  // Several selected elements: align to the selection's bounds, or distribute 3+ with equal gaps. The selection is dissolved so
  // each member is moved in canvas px, then re-made; one undo step.
  const arrangeSelected = useCallback((kind, where) => {
    const canvas = fc.current;
    if (!canvas || canvas.getActiveObject()?.type !== 'activeselection') return;
    const objs = canvas.getActiveObjects().filter(o => !o.__garmentBase && !o.__locked);
    if (objs.length < (kind === 'distribute' ? 3 : 2)) return;
    canvas.discardActiveObject();
    const boxes = objs.map(o => { o.setCoords(); return o.getBoundingRect(); });
    const ds = kind === 'distribute' ? distributeDeltas(boxes, where) : alignDeltas(boxes, where);
    objs.forEach((o, i) => { o.set({ left: (o.left ?? 0) + ds[i].dx, top: (o.top ?? 0) + ds[i].dy }); o.setCoords(); });
    pushHistory();
    bumpLayers();
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
      canvas.renderAll();
    }).catch(() => {});
  }, [pushHistory, bumpLayers]);

  // Keyboard nudge for the selected unlocked element (not while its text is being edited).
  const nudgeSelected = useCallback((dx, dy) => {
    const canvas = fc.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.__garmentBase || obj.__hoverGlow || obj.__locked || obj.isEditing) return;
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
    obj.setCoords();
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [pushHistory, bumpLayers]);

  // Renders one face for export at a fixed output height once that face has finished drawing: the canvas is on
  // `targetFace`, sized for it, every garment image has loaded and the object list is stable. Hover glow and the
  // selection box are never part of the file. Returns a transparent PNG data URL, or null if the face never settles.
  const exportFace = useCallback(async (targetFace, outHeight = 1600) => {
    const sig = c => c.getObjects().map(o => (o.__garmentBase ? 'g' : o.__hoverGlow ? 'h' : 'o') + (o._element && !o._element.complete ? '!' : '')).join('');
    let prev = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 50));
      const c = fc.current;
      if (!c || latest.current.face !== targetFace) continue;
      const { w, h } = getGarmentPaths(latest.current.garment, latest.current.sleeve, targetFace);
      const now = sig(c);
      if (c.getWidth() === w && c.getHeight() === h && now.includes('g') && !now.includes('!') && now === prev) break;
      prev = now;
    }
    const canvas = fc.current;
    if (!canvas || latest.current.face !== targetFace) return null;
    const active = canvas.getActiveObject();
    const glow = canvas.getObjects().filter(o => o.__hoverGlow);
    if (active) canvas.discardActiveObject();
    glow.forEach(o => { o.visible = false; });
    canvas.renderAll();
    const url = canvas.toDataURL({ format: 'png', multiplier: outHeight / canvas.getHeight() });
    glow.forEach(o => { o.visible = true; });
    if (active && canvas.getObjects().includes(active)) canvas.setActiveObject(active);
    canvas.renderAll();
    return url;
  }, []);

  // Toggles Fabric's PencilBrush. Caller must setDrawMode(false) on tab-exit
  // to restore normal selection.
  const setDrawMode = useCallback((enabled, size = 4, color = '#02C39A', erase = false) => {
    const canvas = fc.current;
    if (!canvas) return;
    eraser.current = enabled && erase;
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (enabled) {
        if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.width = erase ? Math.max(size * 3, 12) : size;
        canvas.freeDrawingBrush.color = erase ? 'rgba(27,36,40,.28)' : color; // the eraser stroke shows as a soft trail while drawn
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.isDrawingMode = true;
      } else {
        canvas.isDrawingMode = false;
        canvas.selection = !frozen.current;
      }
      canvas.renderAll();
    }).catch(() => {});
  }, []);

  const setBrushStyle = useCallback((size, color) => {
    const canvas = fc.current;
    if (!canvas?.freeDrawingBrush) return;
    if (size  != null) canvas.freeDrawingBrush.width = size;
    if (color != null) canvas.freeDrawingBrush.color = color;
  }, []);

  const exportOverlays = useCallback(() => (fc.current ? overlayJSON(fc.current) : []), []);

  // opaqueBg: hex color to temporarily paint behind the export, or null to
  // keep transparent (Download Image button). The 2D canvas is always
  // transparent for editing; a transparent PNG reused as a Three.js
  // texture on a solid mesh renders every gap as black (no alpha
  // blending on MeshStandardMaterial), so the 3D refresh passes the
  // current body color here instead of leaving it to the mesh material.
  const exportPNG = useCallback((opaqueBg = null) => {
    const canvas = fc.current;
    if (!canvas) return null;
    // The zone hover outline is a canvas object; like exportFace, keep it out of the image (an autosave can fire mid-hover).
    const glow = canvas.getObjects().filter(o => o.__hoverGlow && o.visible !== false);
    glow.forEach(o => { o.visible = false; });
    try {
      if (opaqueBg) {
        const prevBg = canvas.backgroundColor;
        canvas.backgroundColor = opaqueBg;
        canvas.renderAll();
        const url = canvas.toDataURL({ format:'png', multiplier:2 });
        canvas.backgroundColor = prevBg;
        return url;
      }
      return canvas.toDataURL({ format:'png', multiplier:2 });
    } finally {
      glow.forEach(o => { o.visible = true; });
      if (opaqueBg) canvas.renderAll();
    }
  }, []);

  const getCanvasJSON = useCallback(() => {
    const canvas = fc.current;
    if (!canvas) return [];
    return overlayJSON(canvas);
  }, []);

  // keepHistory: the export's temporary face swap, which must not cost the customer their undo history.
  // side { from, to }: the customer switching garment sides; each side resumes its own history.
  const loadCanvasJSON = useCallback((objects, { keepHistory = false, side = null } = {}) => {
    const canvas = fc.current;
    if (!canvas || !Array.isArray(objects)) return;
    if (side) {
      const s = switchSide(parkedHistory.current, side.from, history.current, side.to, entry(objects, liveLook.current));
      parkedHistory.current = s.parked;
      history.current = syncLook(s.history, liveLook.current); // colours changed on the other side are one step here too
      setHistoryTick(t => t + 1);
      keepHistory = true;
    }
    const token = ++overlayLoad.current;
    const clear = () => canvas.getObjects().filter(o => !o.__garmentBase && !o.__hoverGlow).forEach(o => canvas.remove(o));
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (token !== overlayLoad.current) return;
      clear();
      if (objects.length === 0) { canvas.renderAll(); if (!keepHistory) resetHistory(); bumpLayers(); return; }
      Promise.resolve(fabric.util.enlivenObjects(objects)).then(reviveOverlays)
        .then(enlivened => {
          if (token !== overlayLoad.current) return;
          clear();
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          canvas.renderAll();
          if (!keepHistory) resetHistory();
          bumpLayers();
        })
        .catch(() => {});
    }).catch(() => {});
  }, [bumpLayers, resetHistory]);

  // Forces a resize+redraw after e.g. an onboarding overlay closes and reveals the canvas
  // Re-paint after e.g. the onboarding overlay closes. Does NOT touch
  // canvas.setWidth/setHeight — that used to blow the canvas up to the
  // full .ds-cv container size (thousands of px) instead of the garment's
  // own w/h, which are already set correctly by the redraw effect above
  // regardless of whether an overlay was covering the canvas. Real bug:
  // confirmed from screenshots — dismissing onboarding left a tiny
  // garment stranded in the corner of a hugely oversized blank canvas.
  const resizeCanvas = useCallback(() => {
    fc.current?.renderAll();
  }, []);

  const findLayer = useCallback((id) =>
    fc.current?.getObjects().find(o => o.__layerId === id) ?? null
  , []);

  const layers = (fc.current?.getObjects() ?? [])
    .filter(o => !o.__garmentBase && !o.__hoverGlow)
    .filter(o => typeof o.toObject === 'function')
    .map(o => {
      if (!o.__layerId) o.__layerId = crypto.randomUUID(); // lazy-assign for legacy objects
      const kind = o.__pocket ? 'pocket' : o.__shape ? 'shape' : o.__draw ? 'drawing' : o.__artwork ? 'artwork' : (o.__logo ? 'logo' : 'text');
      return {
        id: o.__layerId, type: kind,
        name: o.__layerName || (kind === 'pocket' ? pocketLabel(o.__pocket) : kind === 'drawing' ? 'Drawing' : kind === 'artwork' ? 'Artwork' : kind === 'logo' ? 'Logo'
          : kind === 'shape' ? shapeLabel(o) : 'Text'),
        visible: o.visible !== false,
        locked: !!o.__locked,
        opacity: o.opacity ?? 1,
      };
    })
    .reverse(); // canvas array is back→front; panel shows front-most first

  const selectLayer = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
  }, [findLayer]);

  const toggleLayerVisibility = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    obj.set('visible', !(obj.visible !== false));
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  const renameLayer = useCallback((id, name) => {
    const obj = findLayer(id);
    if (!obj) return;
    obj.__layerName = name;
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  const deleteLayer = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    if (obj.__locked) return;
    if (canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.remove(obj);
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  // orderedIds is front-to-back; base zone objects always occupy the lowest
  // canvas indices, so overlay targets are offset by however many exist.
  const reorderLayers = useCallback((orderedIds) => {
    const canvas = fc.current;
    if (!canvas) return;
    const baseCount = canvas.getObjects().filter(o => o.__garmentBase).length;
    [...orderedIds].reverse().forEach((id, i) => {
      const obj = findLayer(id);
      if (obj) canvas.moveObjectTo(obj, baseCount + i);
    });
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  const toggleLayerLock = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    const lock = !obj.__locked;
    obj.__locked = lock;
    obj.set({ lockMovementX: lock, lockMovementY: lock, lockRotation: lock, lockScalingX: lock, lockScalingY: lock, hasControls: !lock });
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  const toggleSelectedLock = useCallback(() => {
    const obj = fc.current?.getActiveObject();
    if (obj?.__layerId) toggleLayerLock(obj.__layerId);
  }, [toggleLayerLock]);

  const setLayerOpacity = useCallback((id, value, commit = true) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    obj.set('opacity', Math.min(1, Math.max(0.1, value)));
    canvas.renderAll();
    bumpLayers();
    if (commit) pushHistory();
  }, [findLayer, pushHistory, bumpLayers]);

  // A tap on the empty stage (outside the artboard) ends the selection, like a tap on the empty canvas.
  const setOverlaysFrozen = useCallback((on) => {
    frozen.current = on;
    const c = fc.current;
    if (!c) return;
    c.selection = !on;
    c.discardActiveObject();
    c.getObjects().forEach(o => { if (on) freezeObj(o); else if (o.__frozenFrom) { o.set(o.__frozenFrom); delete o.__frozenFrom; } });
    c.requestRenderAll();
  }, [freezeObj]);

  const clearSelection = useCallback(() => {
    const c = fc.current;
    if (!c?.getActiveObject()) return;
    c.discardActiveObject();
    c.requestRenderAll();
  }, []);

  const setSnapOptions = useCallback((o) => { snapOpts.current = { ...snapOpts.current, ...o }; fc.current?.requestRenderAll(); }, []);

  // AI design edits: the same preset anchors addLogo uses, on this garment's real paths; null for an unknown preset.
  // g/s: the garment a just-switched design is moving to (the AI start path), before this hook sees it.
  const presetPos = useCallback((presetId, g = garment, s = sleeve) => {
    const p = LOGO_PRESETS.find(x => x.id === presetId);
    if (!p) return null;
    const paths = getGarmentPaths(g, s);
    return { x: paths.w * p.x, y: paths.h * p.y };
  }, [garment, sleeve]);

  // Text layers on the visible face, as { id, text } for the AI request.
  const textItems = useCallback(() => (fc.current?.getObjects() ?? [])
    .filter(o => o.__text && o.__layerId).map(o => ({ id: o.__layerId, text: String(o.text ?? '') })), []);

  // Changes one text layer's content or moves it to a preset; false when the layer or preset is gone.
  const editText = useCallback((id, { text, presetId } = {}) => {
    const obj = findLayer(id);
    const pos = presetId ? presetPos(presetId) : null;
    if (!obj?.__text || (presetId && !pos)) return false;
    if (text != null) obj.set({ text, __layerName: text.length > 20 ? text.slice(0, 20) + '…' : text });
    if (pos) obj.set({ left: pos.x, top: pos.y, originX: 'center', originY: 'center' });
    obj.setCoords();
    fc.current.renderAll();
    pushHistory();
    bumpLayers();
    return true;
  }, [findLayer, presetPos, pushHistory, bumpLayers]);

  return {
    onAdded, addLogo, addText, addShape, addPocket, setPocketColor, mirrorSelected, updateSelected, arrangeLayer, deleteSelected, duplicateSelected, alignSelected, arrangeSelected, nudgeSelected, exportOverlays, exportPNG, exportFace, getCanvasJSON, loadCanvasJSON,
    pushHistory, undo, redo, canUndo, canRedo, editTick, resizeCanvas,
    layers, selectLayer, toggleLayerVisibility, toggleLayerLock, toggleSelectedLock, setLayerOpacity, renameLayer, deleteLayer, reorderLayers,
    setDrawMode, setBrushStyle, initFailed,
    setSnapOptions, garmentRect, clearSelection, setOverlaysFrozen,
    presetPos, textItems, editText,
  };
}
