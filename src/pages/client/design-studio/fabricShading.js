// 2D fabric realism: decorative layers over the colour zones of a vector template. Each layer is `__garmentBase` without a
// `__zoneKey`, so it is cleared on redraw, never takes clicks or hover, and never reaches history or the saved design JSON.
// The colour stays the zones' own fill (the source of truth); these layers only light it.
//  - drop shadow under the garment, so it sits on the stage instead of floating
//  - woven grain: a fine noise tile multiplied over every zone (patterns included)
//  - vector templates: soft inner-edge shading toward the outline, plus a light diagonal sheen
//  - derived templates (traced from a reference model): the model's own lighting (folds, seams, buttons) multiplied over the fill
//  - template details (detailRealism): seams sit in a soft groove with a raised topstitch, folds blur out, buttons catch a
//    highlight and cast a small shadow, the pocket casts a shadow onto the body. No blur on the many seam lines, so phones stay fast.
//  Woven patterns carry their own thread shading in the tile (wovenPatterns.js).

let grainTile = null;
// 96px tile of soft two-scale noise around white: multiply darkens by at most ~7%, so colours stay true.
function grain() {
  if (grainTile || typeof document === 'undefined') return grainTile;
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d'), img = x.createImageData(96, 96);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const coarse = Array.from({ length: 13 * 13 }, rnd);
  for (let y = 0; y < 96; y++) for (let i = 0; i < 96; i++) {
    const cv = coarse[(Math.floor(y / 8) % 12) * 13 + (Math.floor(i / 8) % 12)];
    const weave = ((i + y) % 2) * 0.35 + ((i % 3 === 0) || (y % 3 === 0) ? 0.25 : 0);
    const v = 255 - Math.round(rnd() * 9 + cv * 6 + weave * 5);
    const k = (y * 96 + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return (grainTile = c);
}

const deco = { selectable: false, evented: false, objectCaching: false, __garmentBase: true };

// Detail lines are tagged by useGarmentCanvas insertDetails (__detailKind, __detailPart). New layers go directly under or over
// the detail they belong to, so the template's own stacking (under-collar vs over-everything) is kept.
function detailRealism(fabric, canvas) {
  const at = o => canvas.getObjects().indexOf(o);
  const pathOf = (o, extra) => new fabric.Path(o.path, { ...deco, objectCaching: true, ...extra });
  for (const o of canvas.getObjects().filter(x => x.__detailKind)) {
    const k = o.__detailKind;
    if (k === 'seam' || k === 'line') {
      // Groove: a wide, faint stroke under the seam line. Topstitch: the dashed thread lifts with a 1px light edge.
      canvas.insertAt(at(o), pathOf(o, { fill: '', stroke: 'rgba(15,23,42,.07)', strokeWidth: k === 'seam' ? 4 : 3, strokeLineCap: 'round' }));
      if (k === 'seam') o.set({ shadow: new fabric.Shadow({ color: 'rgba(255,255,255,.5)', blur: 0, offsetX: 0, offsetY: 0.8 }) });
    } else if (k === 'fold') {
      canvas.insertAt(at(o), pathOf(o, { fill: '', stroke: 'rgba(15,23,42,.05)', strokeWidth: 7, strokeLineCap: 'round' }));
    } else if (k === 'button') {
      o.set({ shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.35)', blur: 2, offsetX: 0, offsetY: 1 }) });
      canvas.insertAt(at(o) + 1, pathOf(o, { stroke: null, fill: new fabric.Gradient({ type: 'radial', gradientUnits: 'percentage',
        coords: { x1: 0.36, y1: 0.3, r1: 0, x2: 0.36, y2: 0.3, r2: 0.62 },
        colorStops: [{ offset: 0, color: 'rgba(255,255,255,.75)' }, { offset: 1, color: 'rgba(255,255,255,0)' }] }) }));
    } else if (/pocket/i.test(o.__detailPart ?? '')) {
      o.set({ shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.22)', blur: 0, offsetX: 0, offsetY: 1 }) });
    }
  }
  // Pocket zone: a soft shadow cast outside its edge only (an inverted clip), so the pocket's own colour or pattern is untouched.
  const pocket = canvas.getObjects().find(x => x.__zoneKey === 'pocket');
  if (pocket) canvas.insertAt(at(pocket), new fabric.Path(pocket.path, { ...deco, objectCaching: true, fill: '#000000', stroke: null,
    shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.3)', blur: 5, offsetX: 0, offsetY: 2 }),
    clipPath: new fabric.Path(pocket.path, { absolutePositioned: true, inverted: true }) }));
}

// Inserts the layers around the `zones` already drawn ([{ obj, d }], bottom-most first). `current()` is false once a newer redraw
// started, so a late-loading shade image never lands on the wrong garment. The caller renders.
export function addFabricShading(fabric, canvas, paths, face, zones, current) {
  if (!paths.body || !zones.length) return;
  const at = o => canvas.getObjects().indexOf(o);
  const Img = fabric.FabricImage ?? fabric.Image;
  // Drop shadow: an opaque body-shaped copy under everything (a canvas shadow scales with fill alpha); the zones cover it exactly.
  canvas.insertAt(0, new fabric.Path(paths.body, { ...deco, fill: '#ffffff', stroke: null,
    shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.22)', blur: 22, offsetX: 0, offsetY: 8 }) }));
  const tile = grain();
  // Grain over each zone (sleeves and collar are separate paths), directly above that zone.
  if (tile) for (const z of zones) {
    canvas.insertAt(at(z.obj) + 1, new fabric.Path(z.d, { ...deco, fill: new fabric.Pattern({ source: tile, repeat: 'repeat' }), stroke: null, opacity: 0.85, globalCompositeOperation: 'multiply' }));
  }
  detailRealism(fabric, canvas);
  const top = Math.max(...zones.map(z => at(z.obj))) + 2; // above the last zone and its grain, below detail lines and the customer's design
  const shadeUrl = paths.shade?.[face];
  if (shadeUrl) {
    Img.fromURL(shadeUrl, { crossOrigin: 'anonymous' }).then(img => {
      if (!current()) return;
      img.set({ ...deco, left: 0, top: 0, scaleX: paths.w / img.width, scaleY: paths.h / img.height, globalCompositeOperation: 'multiply' });
      canvas.insertAt(Math.min(top, canvas.getObjects().length), img);
      canvas.requestRenderAll();
    }).catch(() => {}); // no shade map: the flat fill and grain still read as cloth
    return;
  }
  // Vector templates: one rule for every zone (body, sleeves, collar, pocket), each clipped to itself and stacked just above its own
  // fill and grain: soft darkening toward its outline (cloth turning away), sized to the zone so a thin collar is not swallowed, and
  // one diagonal sheen across the whole garment, so the light falls the same way on every part.
  for (const z of zones) {
    const edge = new fabric.Path(z.d, { ...deco, fill: 'transparent', stroke: 'rgba(15,23,42,.16)', clipPath: new fabric.Path(z.d, { absolutePositioned: true }) });
    const w = Math.min(16, Math.min(edge.width, edge.height) * 0.3);
    edge.set({ strokeWidth: w, shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.28)', blur: w * 0.875 }) });
    const sheen = new fabric.Path(z.d, { ...deco, stroke: null });
    sheen.set('fill', new fabric.Gradient({
      type: 'linear', coords: { x1: -sheen.left, y1: -sheen.top, x2: paths.w - sheen.left, y2: paths.h - sheen.top },
      colorStops: [{ offset: 0, color: 'rgba(255,255,255,.18)' }, { offset: 0.45, color: 'rgba(255,255,255,0)' }, { offset: 0.72, color: 'rgba(0,0,0,0)' }, { offset: 1, color: 'rgba(0,0,0,.12)' }],
    }));
    const above = at(z.obj) + (tile ? 2 : 1);
    canvas.insertAt(above, edge);
    canvas.insertAt(above + 1, sheen);
  }
}
