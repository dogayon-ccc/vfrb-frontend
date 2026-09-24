// Fabric.js canvas hook for Design Studio. Extracted from DesignStudio.jsx.
import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { T2, LOGO_PRESETS, PATTERNS, SHAPE_TYPE_LABEL } from './dsShared';
import { getGarmentPaths } from './garmentPaths';

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

export function useGarmentCanvas(canvasRef, garment, sleeve, face, colors, patterns, patternParams, onSelect, onZoneClick) {
  const fc = useRef(null);
  const hoverEl = useRef(null);
  const fabricReady = useRef(false);
  const disposePending = useRef(null); // in-flight dispose() Promise, guards StrictMode double-mount

  const historyStack = useRef([]);
  const historyIdx = useRef(-1);
  const historyLock = useRef(false);
  const [, setHistoryTick] = useState(0); // refs don't trigger re-render; this forces one

  const [, setLayersTick] = useState(0);
  const bumpLayers = useCallback(() => setLayersTick(t => t + 1), []);
  const [initFailed, setInitFailed] = useState(false);

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

      fc.current = new fabric.Canvas(canvasRef.current, {
        width: paths.w, height: paths.h,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: true,
      });
      fabricReady.current = true;

      const drawInitialGarment = () => {
        const c = fc.current;
        if (!c) return;
        const initPaths = getGarmentPaths(garment, sleeve, face);
        const draw = (d, fill, zoneKey, idx) => {
          if (!d) return;
          // FIX (Sept 10 2026): pocket previously used the exact same
          // subtle structural-seam outline as body/collar/sleeve — at
          // 0.14 opacity it read as an unexplained floating color block
          // rather than a garment feature. A visible dashed stroke reads
          // as topstitching, the way a real pocket is actually finished.
          const isPocket = zoneKey === 'pocket';
          c.insertAt(idx, new fabric.Path(d, {
            fill,
            stroke: isPocket ? 'rgba(0,0,0,.38)' : 'rgba(0,0,0,.14)',
            strokeWidth: isPocket ? 1.5 : 1.5,
            strokeDashArray: isPocket ? [3, 2] : undefined,
            selectable:false, evented:true, __garmentBase:true, __zoneKey:zoneKey,
          }));
        };
        draw(initPaths.body,    colors.body,                     'body',    0);
        draw(initPaths.collar,  colors.collar,                   'collar',  1);
        draw(initPaths.sleeveL, colors.sleeve ?? colors.body,    'sleeve',  2);
        draw(initPaths.sleeveR, colors.sleeve ?? colors.body,    'sleeve',  3);
        draw(initPaths.pocket,  colors.pocket  ?? colors.collar, 'pocket',  4);
        c.setWidth(initPaths.w);
        c.setHeight(initPaths.h);
        c.renderAll();
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
        const ptr = fc.current.getPointer(opt.e);
        const hit = fc.current.getObjects()
          .filter(o => o.__garmentBase && o.__zoneKey)
          .find(o => o.containsPoint(ptr));
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

      // Only a real zone click (not a drag/resize handle) opens the color picker
      fc.current.on('mouse:down', (opt) => {
        if (opt.target && !opt.target.__zoneKey) return;
        const ptr = fc.current.getPointer(opt.e);
        const hit = fc.current.getObjects()
          .filter(o => o.__garmentBase && o.__zoneKey)
          .find(o => o.containsPoint(ptr));
        if (hit?.__zoneKey) onZoneClick(hit.__zoneKey);
      });

      fc.current.on('selection:created', e => onSelect(e.selected?.[0] ?? null));
      fc.current.on('selection:updated', e => onSelect(e.selected?.[0] ?? null));
      fc.current.on('selection:cleared',  () => onSelect(null));

      // Freeform stroke → tag + track as a layer, same as addLogo/addText below
      fc.current.on('path:created', (e) => {
        const path = e.path;
        if (!path) return;
        path.set({ __draw: true, __layerId: crypto.randomUUID(), __layerName: 'Drawing', selectable: true });
        fc.current.renderAll();
        pushHistory();
        bumpLayers();
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
      const paths = getGarmentPaths(garment, sleeve, face);
      canvas.getObjects().filter(o => o.__garmentBase || o.__hoverGlow).forEach(o => canvas.remove(o));

      const makeZone = (d, fill, zoneKey, idx) => {
        if (!d) return;
        const patDef = PATTERNS.find(p => p.id === (patterns?.[zoneKey] ?? 'solid'));
        let fabricFill = fill;
        if (patDef?.svg) {
          const zoneParams = patternParams?.[zoneKey] ?? patDef.defaultParams;
          const svgStr = patDef.svg(fill, zoneParams?.width, zoneParams?.spacing);
          const blob = new Blob([svgStr], { type:'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          fabric.Image.fromURL(url).then((img) => {
            if (!canvas) return;
            const pat = new fabric.Pattern({ source: img.getElement(), repeat:'repeat' });
            const obj = canvas.getObjects().find(o => o.__zoneKey === zoneKey);
            if (obj) { obj.set('fill', pat); canvas.renderAll(); }
            URL.revokeObjectURL(url);
          }).catch(() => { URL.revokeObjectURL(url); });
        }
        canvas.insertAt(idx, new fabric.Path(d, {
          fill: fabricFill,
          stroke: zoneKey === 'pocket' ? 'rgba(0,0,0,.38)' : 'rgba(0,0,0,.14)',
          strokeWidth: 1.5,
          strokeDashArray: zoneKey === 'pocket' ? [3, 2] : undefined,
          selectable:false, evented:true, __garmentBase:true, __zoneKey:zoneKey,
        }));
      };

      makeZone(paths.body,    colors.body,                    'body',    0);
      makeZone(paths.collar,  colors.collar,                  'collar',  1);
      makeZone(paths.sleeveL, colors.sleeve ?? colors.body,   'sleeve',  2);
      makeZone(paths.sleeveR, colors.sleeve ?? colors.body,   'sleeve',  3);
      makeZone(paths.pocket,  colors.pocket ?? colors.collar, 'pocket',  4);

      // Tipping: contrast trim traced along the collar edge (real garment
      // term — a colored stripe at the collar/cuff seam, standard on most
      // polos). Stroke-only re-trace of the same collar path, no fill —
      // reads as a colored edge line at this flat-vector illustration
      // fidelity. Off by default (colors.tipping is null until the
      // customer picks one in ColorsPanel's Tipping zone); never has a
      // __zoneKey, so it's decorative-only like the sheen layer below.
      if (paths.collar && colors.tipping) {
        canvas.insertAt(5, new fabric.Path(paths.collar, {
          fill: 'transparent',
          stroke: colors.tipping,
          strokeWidth: 4,
          selectable: false, evented: false, __garmentBase: true,
        }));
      }

      // FIX (Sept 10 2026): purely decorative fabric-sheen overlay, added
      // on top of every zone — a flat solid fill reads as plastic/paper,
      // not cloth. A soft diagonal light-to-dark gradient traced over the
      // same body silhouette gives the garment a woven, dimensional feel
      // without needing real texture images. Deliberately has NO
      // __zoneKey (only __garmentBase, so it's still cleared on redraw
      // at line ~156) — every hit-test/click handler in this file filters
      // on __zoneKey being truthy, so this layer can never intercept a
      // zone click or steal a hover highlight, by construction.
      if (paths.body) {
        import('fabric').then((mod) => {
          const fabric2 = mod.fabric ?? mod.default ?? mod;
          const sheen = new fabric2.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: paths.w, y2: paths.h },
            colorStops: [
              { offset: 0,    color: 'rgba(255,255,255,.16)' },
              { offset: 0.45, color: 'rgba(255,255,255,0)' },
              { offset: 0.7,  color: 'rgba(0,0,0,0)' },
              { offset: 1,    color: 'rgba(0,0,0,.14)' },
            ],
          });
          canvas.insertAt(5, new fabric2.Path(paths.body, {
            fill: sheen, stroke: null,
            selectable: false, evented: false, __garmentBase: true,
          }));
          canvas.renderAll();
        });
      }

      canvas.setWidth(paths.w);
      canvas.setHeight(paths.h);
      canvas.renderAll();
    }).catch(() => {});
  }, [garment, sleeve, face, colors, patterns, patternParams]);

  // History helpers — declared before addLogo/addText/deleteSelected, which depend on pushHistory
  const pushHistory = useCallback(() => {
    if (historyLock.current) return;
    const canvas = fc.current;
    if (!canvas) return;
    const snapshot = canvas.getObjects()
      .filter(o => !o.__garmentBase && !o.__hoverGlow)
      .filter(o => typeof o.toObject === 'function')
      .map(o => o.toObject(['__logo','__text','__draw','__shape','__layerId','__layerName']));
    historyStack.current = historyStack.current.slice(0, historyIdx.current + 1);
    historyStack.current.push(snapshot);
    if (historyStack.current.length > 40) historyStack.current.shift();
    historyIdx.current = historyStack.current.length - 1;
    setHistoryTick(t => t + 1);
  }, []);

  const restoreSnapshot = useCallback((snapshot, setIdx) => {
    setIdx();
    setHistoryTick(t => t + 1);
    historyLock.current = true;
    const canvas = fc.current;
    if (!canvas) { historyLock.current = false; return; }
    canvas.getObjects().filter(o => !o.__garmentBase && !o.__hoverGlow).forEach(o => canvas.remove(o));
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (!snapshot || snapshot.length === 0) { canvas.renderAll(); historyLock.current = false; bumpLayers(); return; }
      Promise.resolve(fabric.util.enlivenObjects(snapshot))
        .then(enlivened => {
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          canvas.renderAll();
          historyLock.current = false;
          bumpLayers();
        })
        .catch(() => { historyLock.current = false; });
    }).catch(() => { historyLock.current = false; });
  }, [bumpLayers]);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    restoreSnapshot(historyStack.current[historyIdx.current - 1], () => { historyIdx.current -= 1; });
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyIdx.current >= historyStack.current.length - 1) return;
    restoreSnapshot(historyStack.current[historyIdx.current + 1], () => { historyIdx.current += 1; });
  }, [restoreSnapshot]);

  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < historyStack.current.length - 1;

  // pos: optional {x,y} in canvas-logical space, supplied when the logo was
  // dragged onto the canvas from the panel (see dragPlace.js) instead of
  // placed at a fixed preset — dragging always wins over the preset dropdown
  // since it's the position the customer actually chose.
  const addLogo = useCallback((dataUrl, presetId = 'left_chest', pos = null) => {
    const canvas = fc.current;
    if (!canvas) return;
    const paths = getGarmentPaths(garment, sleeve);
    const preset = LOGO_PRESETS.find(p => p.id === presetId) ?? LOGO_PRESETS[0];
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then((img) => {
        img.scaleToWidth(72);
        img.set({
          left: pos ? pos.x : paths.w * preset.x,
          top:  pos ? pos.y : paths.h * preset.y,
          originX: pos ? 'center' : 'left', originY: pos ? 'center' : 'top',
          __logo: true, __layerId: crypto.randomUUID(), __layerName: 'Logo',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        pushHistory();
        bumpLayers();
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
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const t = new fabric.IText(text, {
        left: pos ? pos.x : paths.w / 2, top: pos ? pos.y : paths.h * 0.4,
        originX: 'center', originY: 'center', fontSize: sizePx ?? 18,
        fontFamily: fontCss ?? 'Arial Black, sans-serif',
        fill: color, fontWeight: 'bold', __text: true,
        __layerId: crypto.randomUUID(),
        __layerName: text.length > 20 ? text.slice(0, 20) + '…' : text,
      });
      canvas.add(t);
      canvas.setActiveObject(t);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  // Star has no native Fabric class — built as a Polygon from computed
  // spike points, the standard way to draw a star shape on a canvas.
  // Everything else below is a stock Fabric.js 6.x constructor (Triangle,
  // Ellipse, Line all ship with the version already in this project's
  // package.json — no new dependency).
  const starPoints = (spikes = 5, outerR = 32, innerR = 13) => {
    const pts = [];
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = i * step - Math.PI / 2;
      pts.push({ x: outerR + r * Math.cos(a), y: outerR + r * Math.sin(a) });
    }
    return pts;
  };

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
      const names = { rect:'Rectangle', circle:'Circle', triangle:'Triangle', ellipse:'Ellipse', line:'Line', star:'Star' };
      let shape;
      switch (kind) {
        case 'circle':   shape = new fabric.Circle({ ...common, radius: 32 }); break;
        case 'triangle': shape = new fabric.Triangle({ ...common, width: 64, height: 56 }); break;
        case 'ellipse':  shape = new fabric.Ellipse({ ...common, rx: 38, ry: 24 }); break;
        case 'line':     shape = new fabric.Line([0, 0, 84, 0], { ...common, fill: undefined, stroke: color, strokeWidth: 4 }); break;
        case 'star':     shape = new fabric.Polygon(starPoints(5, 32, 13), { ...common }); break;
        default:         shape = new fabric.Rect({ ...common, width: 64, height: 64 });
      }
      shape.set('__layerName', names[kind] ?? 'Shape');
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  // Live-edits the selected object's own properties (fill, opacity) —
  // used by ShapesPanel's inspector. Refuses garment-base/hover objects,
  // same guard deleteSelected uses below.
  const updateSelected = useCallback((props) => {
    const canvas = fc.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.__garmentBase || obj.__hoverGlow) return;
    obj.set(props);
    canvas.renderAll();
    pushHistory();
  }, [pushHistory]);

  const deleteSelected = useCallback(() => {
    const canvas = fc.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && !obj.__garmentBase && !obj.__hoverGlow) {
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
    obj.clone().then((copy) => {
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

  // Toggles Fabric's PencilBrush. Caller must setDrawMode(false) on tab-exit
  // to restore normal selection.
  const setDrawMode = useCallback((enabled, size = 4, color = '#02C39A') => {
    const canvas = fc.current;
    if (!canvas) return;
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (enabled) {
        if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.width = size;
        canvas.freeDrawingBrush.color = color;
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.isDrawingMode = true;
      } else {
        canvas.isDrawingMode = false;
        canvas.selection = true;
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

  const exportOverlays = useCallback(() =>
    fc.current?.getObjects()
      .filter(o => !o.__garmentBase && !o.__hoverGlow)
      .filter(o => typeof o.toObject === 'function')
      .map(o => o.toObject(['__logo','__text','__draw','__shape','__layerId','__layerName'])) ?? []
  , []);

  // opaqueBg: hex color to temporarily paint behind the export, or null to
  // keep transparent (Download Image button). The 2D canvas is always
  // transparent for editing; a transparent PNG reused as a Three.js
  // texture on a solid mesh renders every gap as black (no alpha
  // blending on MeshStandardMaterial), so the 3D refresh passes the
  // current body color here instead of leaving it to the mesh material.
  const exportPNG = useCallback((opaqueBg = null) => {
    const canvas = fc.current;
    if (!canvas) return null;
    if (opaqueBg) {
      const prevBg = canvas.backgroundColor;
      canvas.backgroundColor = opaqueBg;
      canvas.renderAll();
      const url = canvas.toDataURL({ format:'png', multiplier:2 });
      canvas.backgroundColor = prevBg;
      canvas.renderAll();
      return url;
    }
    return canvas.toDataURL({ format:'png', multiplier:2 });
  }, []);

  const getCanvasJSON = useCallback(() => {
    const canvas = fc.current;
    if (!canvas) return [];
    return canvas.getObjects()
      .filter(o => !o.__garmentBase && !o.__hoverGlow)
      .filter(o => typeof o.toObject === 'function')
      .map(o => o.toObject(['__logo','__text','__draw','__shape','__layerId','__layerName']));
  }, []);

  const loadCanvasJSON = useCallback((objects) => {
    const canvas = fc.current;
    if (!canvas || !Array.isArray(objects)) return;
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      canvas.getObjects().filter(o => !o.__garmentBase && !o.__hoverGlow).forEach(o => canvas.remove(o));
      if (objects.length === 0) { canvas.renderAll(); bumpLayers(); return; }
      Promise.resolve(fabric.util.enlivenObjects(objects))
        .then(enlivened => {
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          canvas.renderAll();
          bumpLayers();
        })
        .catch(() => {});
    }).catch(() => {});
  }, [bumpLayers]);

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
      // Shape sub-kind now comes straight off Fabric's own `.type` (set by
      // whichever constructor addShape() used) via SHAPE_TYPE_LABEL, so
      // Triangle/Ellipse/Line/Star show their real name instead of being
      // collapsed into "rect" the way this used to binary-check circle-vs-not.
      const kind = o.__shape ? 'shape' : o.__draw ? 'drawing' : (o.__logo ? 'logo' : 'text');
      return {
        id: o.__layerId, type: kind,
        name: o.__layerName || (kind === 'drawing' ? 'Drawing' : kind === 'logo' ? 'Logo'
          : kind === 'shape' ? (SHAPE_TYPE_LABEL[o.type] ?? 'Shape') : 'Text'),
        visible: o.visible !== false,
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

  return {
    addLogo, addText, addShape, updateSelected, deleteSelected, duplicateSelected, exportOverlays, exportPNG, getCanvasJSON, loadCanvasJSON,
    pushHistory, undo, redo, canUndo, canRedo, resizeCanvas,
    layers, selectLayer, toggleLayerVisibility, renameLayer, deleteLayer, reorderLayers,
    setDrawMode, setBrushStyle, initFailed,
  };
}
