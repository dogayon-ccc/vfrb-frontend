// 2D fabric realism: decorative layers over the colour zones of a vector template. Each layer is `__garmentBase` without a
// `__zoneKey`, so it is cleared on redraw, never takes clicks or hover, and never reaches history or the saved design JSON.
// The colour stays the zones' own fill (the source of truth); these layers only light it.
//  - drop shadow under the garment, so it sits on the stage instead of floating
//  - woven grain: a fine noise tile multiplied over every zone (patterns included)
//  - vector templates: soft inner-edge shading toward the outline, the body and sleeves rolling round (ROLL), plus a light diagonal sheen
//  - derived templates (traced from a reference model): the model's own lighting (folds, seams, buttons) multiplied over the fill
//  - template details (detailRealism): seams sit in a soft groove with a raised topstitch, folds blur out, buttons catch a
//    highlight, show their thread holes and cast a small shadow; hems and cuffs get a twin-needle row (twinStitch), folds a light ridge.
//    The pocket, collar and sleeves cast a soft shadow onto the body (castShadows). No blur on the many seam lines, so phones stay fast.
//  Woven patterns carry their own thread shading in the tile (wovenPatterns.js).
//  Lighting layers are tagged __light: canvasLayers.printThrough lays the same light over logos and text so they read as printed.

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

// Twin-needle hem: a second stitch row `gap` px inside each hem or cuff run of a seam path (one M then one L or Q), toward the
// garment's centre. Runs in the top fifth (shoulder seams), steep runs (side seams, plackets) and short ticks are skipped.
// Fabric path commands in, SVG path data out; null when no run qualifies.
export function twinStitch(cmds, { w, h }, gap = 2.4) {
  const r = v => Math.round(v * 100) / 100, out = [];
  for (let i = 0; i < (cmds?.length ?? 0); i++) {
    const m = cmds[i], s = cmds[i + 1];
    if (m[0] !== 'M' || !s || (s[0] !== 'L' && s[0] !== 'Q') || (cmds[i + 2] && cmds[i + 2][0] !== 'M')) continue;
    const [x0, y0] = m.slice(1), [x1, y1] = s.slice(-2), dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 8 || Math.abs(dx) < 0.5 * Math.abs(dy) || (y0 + y1) / 2 < 0.2 * h) continue;
    let nx = -dy / len, ny = dx / len;
    if (nx * (w / 2 - (x0 + x1) / 2) + ny * (h / 2 - (y0 + y1) / 2) < 0) { nx = -nx; ny = -ny; }
    const p = (x, y) => `${r(x + nx * gap)} ${r(y + ny * gap)}`;
    out.push(`M ${p(x0, y0)} ${s[0] === 'Q' ? `Q ${p(s[1], s[2])} ` : 'L '}${p(x1, y1)}`);
  }
  return out.length ? out.join(' ') : null;
}

// Cloth turning round the body: darker at both sides, a soft highlight left of centre (light from the top left, as the sheen).
export const ROLL = [[0, 'rgba(15,23,42,.10)'], [0.3, 'rgba(255,255,255,.08)'], [0.55, 'rgba(255,255,255,0)'], [0.85, 'rgba(15,23,42,.05)'], [1, 'rgba(15,23,42,.12)']];
const ROLL_ZONES = ['body', 'sleeve'];

// Detail lines are tagged by useGarmentCanvas insertDetails (__detailKind, __detailPart). New layers go directly under or over
// the detail they belong to, so the template's own stacking (under-collar vs over-everything) is kept.
function detailRealism(fabric, canvas, box) {
  const at = o => canvas.getObjects().indexOf(o);
  const pathOf = (o, extra) => new fabric.Path(o.path, { ...deco, objectCaching: true, ...extra });
  for (const o of canvas.getObjects().filter(x => x.__detailKind)) {
    const k = o.__detailKind;
    if (k === 'seam' || k === 'line') {
      // Groove: a wide, faint stroke under the seam line. Topstitch: the dashed thread lifts with a 1px light edge.
      canvas.insertAt(at(o), pathOf(o, { fill: '', stroke: 'rgba(15,23,42,.07)', strokeWidth: k === 'seam' ? 4 : 3, strokeLineCap: 'round' }));
      if (k === 'seam') o.set({ shadow: new fabric.Shadow({ color: 'rgba(255,255,255,.5)', blur: 0, offsetX: 0, offsetY: 0.8 }) });
      const twin = k === 'seam' && !o.__detailPart && twinStitch(o.path, box);
      if (twin) canvas.insertAt(at(o) + 1, new fabric.Path(twin, { ...deco, fill: '', stroke: o.stroke, strokeWidth: o.strokeWidth, strokeDashArray: o.strokeDashArray, opacity: 0.85,
        shadow: new fabric.Shadow({ color: 'rgba(255,255,255,.5)', blur: 0, offsetX: 0, offsetY: 0.8 }) }));
    } else if (k === 'fold') {
      canvas.insertAt(at(o), pathOf(o, { fill: '', stroke: 'rgba(15,23,42,.05)', strokeWidth: 7, strokeLineCap: 'round' }));
      // Ridge: the lit side of the crease, a hairline just up and left of the fold line.
      canvas.insertAt(at(o) + 1, pathOf(o, { fill: '', stroke: 'rgba(255,255,255,.22)', strokeWidth: 1.2, strokeLineCap: 'round', left: o.left - 1, top: o.top - 0.6 }));
    } else if (k === 'button') {
      o.set({ shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.35)', blur: 2, offsetX: 0, offsetY: 1 }) });
      canvas.insertAt(at(o) + 1, pathOf(o, { stroke: null, fill: new fabric.Gradient({ type: 'radial', gradientUnits: 'percentage',
        coords: { x1: 0.36, y1: 0.3, r1: 0, x2: 0.36, y2: 0.3, r2: 0.62 },
        colorStops: [{ offset: 0, color: 'rgba(255,255,255,.75)' }, { offset: 1, color: 'rgba(255,255,255,0)' }] }) }));
      // Thread holes: four on a full-size button, two on a small one.
      const c = o.getCenterPoint(), rr = Math.min(o.width, o.height) / 2, q = rr * 0.3;
      const holes = rr >= 2.4 ? [[-q, -q], [q, -q], [-q, q], [q, q]] : rr >= 1.6 ? [[-q, 0], [q, 0]] : [];
      holes.forEach(([dx, dy]) => canvas.insertAt(at(o) + 2, new fabric.Circle({ ...deco, radius: Math.max(0.4, rr * 0.16), left: c.x + dx, top: c.y + dy,
        originX: 'center', originY: 'center', fill: 'rgba(15,23,42,.45)', stroke: null })));
    } else if (/pocket/i.test(o.__detailPart ?? '')) {
      o.set({ shadow: new fabric.Shadow({ color: 'rgba(15,23,42,.22)', blur: 0, offsetX: 0, offsetY: 1 }) });
    }
  }
}

// Raised parts cast a soft shadow onto the cloth under them: an opaque copy of the part directly beneath it, in the part's own
// colour so its edge leaves no dark fringe. [alpha, blur, offsetY]; collar and sleeves only on vector templates (a shade map has its own).
const CAST = { pocket: [0.3, 5, 2], collar: [0.26, 7, 2], sleeve: [0.16, 9, 1] };
function castShadows(fabric, canvas, zones, keys) {
  for (const z of zones.filter(x => keys.includes(x.obj.__zoneKey))) {
    const [a, blur, offsetY] = CAST[z.obj.__zoneKey];
    canvas.insertAt(canvas.getObjects().indexOf(z.obj), new fabric.Path(z.d, { ...deco, objectCaching: true, stroke: null,
      fill: typeof z.obj.fill === 'string' ? z.obj.fill : '#ffffff',
      shadow: new fabric.Shadow({ color: `rgba(15,23,42,${a})`, blur, offsetX: 0, offsetY }) }));
  }
}

// Soft darkening toward a zone's outline, as an image: the area outside the zone casts a blurred shadow into it through a clip, so
// only the falloff shows (a clipped stroke left a flat grey band on light colours). Sized to the zone so a thin collar is not swallowed.
function innerShade(Img, shape, d) {
  const w = Math.min(16, Math.min(shape.width, shape.height) * 0.3), pad = Math.ceil(w * 2), S = 2;
  const x0 = shape.pathOffset.x - shape.width / 2 - pad, y0 = shape.pathOffset.y - shape.height / 2 - pad;
  const el = document.createElement('canvas');
  el.width = Math.ceil((shape.width + 2 * pad) * S); el.height = Math.ceil((shape.height + 2 * pad) * S);
  const ctx = el.getContext('2d'), zone = new Path2D(d), frame = new Path2D();
  ctx.scale(S, S); ctx.translate(-x0, -y0);
  ctx.clip(zone);
  frame.rect(x0, y0, el.width / S, el.height / S); frame.addPath(zone);
  ctx.shadowColor = 'rgba(15,23,42,.34)'; ctx.shadowBlur = w * 1.5 * S; // shadowBlur is in device px, unaffected by scale()
  ctx.fillStyle = '#000';
  ctx.fill(frame, 'evenodd');
  return new Img(el, { ...deco, __light: true, left: x0, top: y0, originX: 'left', originY: 'top', scaleX: 1 / S, scaleY: 1 / S });
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
    canvas.insertAt(at(z.obj) + 1, new fabric.Path(z.d, { ...deco, fill: new fabric.Pattern({ source: tile, repeat: 'repeat' }), stroke: null, opacity: 0.85, globalCompositeOperation: 'multiply', __light: true }));
  }
  detailRealism(fabric, canvas, { w: paths.w, h: paths.h });
  const shadeUrl = paths.shade?.[face];
  castShadows(fabric, canvas, zones, shadeUrl ? ['pocket'] : Object.keys(CAST));
  const top = Math.max(...zones.map(z => at(z.obj))) + 2; // above the last zone and its grain, below detail lines and the customer's design
  if (shadeUrl) {
    Img.fromURL(shadeUrl, { crossOrigin: 'anonymous' }).then(img => {
      if (!current()) return;
      img.set({ ...deco, __light: true, left: 0, top: 0, scaleX: paths.w / img.width, scaleY: paths.h / img.height, globalCompositeOperation: 'multiply' });
      canvas.insertAt(Math.min(top, canvas.getObjects().length), img);
      canvas.requestRenderAll();
    }).catch(() => {}); // no shade map: the flat fill and grain still read as cloth
    return;
  }
  // Vector templates: one rule for every zone (body, sleeves, collar, pocket), each clipped to itself and stacked just above its own
  // fill and grain: soft darkening toward its outline (cloth turning away), sized to the zone so a thin collar is not swallowed, and
  // one diagonal sheen across the whole garment, so the light falls the same way on every part.
  for (const z of zones) {
    const edge = innerShade(Img, new fabric.Path(z.d), z.d);
    const sheen = new fabric.Path(z.d, { ...deco, stroke: null, __light: true });
    sheen.set('fill', new fabric.Gradient({
      type: 'linear', coords: { x1: -sheen.left, y1: -sheen.top, x2: paths.w - sheen.left, y2: paths.h - sheen.top },
      colorStops: [{ offset: 0, color: 'rgba(255,255,255,.18)' }, { offset: 0.45, color: 'rgba(255,255,255,0)' }, { offset: 0.72, color: 'rgba(0,0,0,0)' }, { offset: 1, color: 'rgba(0,0,0,.12)' }],
    }));
    const above = at(z.obj) + (tile ? 2 : 1), rolls = ROLL_ZONES.includes(z.obj.__zoneKey);
    canvas.insertAt(above, edge);
    if (rolls) {
      const roll = new fabric.Path(z.d, { ...deco, stroke: null, __light: true });
      roll.set('fill', new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: roll.width, y2: 0 }, colorStops: ROLL.map(([offset, color]) => ({ offset, color })) }));
      canvas.insertAt(above + 1, roll);
    }
    canvas.insertAt(above + (rolls ? 2 : 1), sheen);
  }
}
