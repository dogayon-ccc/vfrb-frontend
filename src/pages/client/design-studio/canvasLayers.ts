// Fabric-side drawing for the Studio's guides: the grid and the centre and chest lines over the garment, placement ghosts while a
// logo or text moves, and the eraser cut. Grid and guides are painted on the live canvas only (never in an export or thumbnail,
// which render to their own canvas); ghosts go on the interaction layer. None of them is a canvas object, so none is saved.
import { samplePath, erasable, touches, gridSpec, gridLines, gridFade, GRID_ALPHA, fixedGuides } from './canvasGuides';

// Colour tokens read from the page (customer tokens are scoped to the Studio root), as rgba with an alpha.
const token = (el, name, fallback) => (el && getComputedStyle(el).getPropertyValue(name).trim()) || fallback;
function rgba(color, a) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) { const n = parseInt(hex[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  const m = color.match(/[\d.]+/g);
  return m && m.length >= 3 ? `rgba(${m[0]},${m[1]},${m[2]},${a})` : `rgba(27,36,40,${a})`;
}

// A base object's box in canvas px; a photo uses its opaque pixels (__content), not its transparent border.
export function baseRect(o) {
  const r = o.getBoundingRect(), k = o.__content;
  if (!k || !(k.w > 0) || !(k.h > 0)) return r;
  const sx = r.width / k.w, sy = r.height / k.h;
  return { left: r.left + k.l * sx, top: r.top + k.t * sy, width: (k.r - k.l + 1) * sx, height: (k.b - k.t + 1) * sy };
}

// Union of the garment's own colour zones (canvas px), or null before the base has drawn. Only the zones count (body, collar, sleeves,
// pocket, or a photo base): the drop shadow, edge shading and seams are decoration drawn past the cloth, and counting them put the rulers'
// 0 and 100 % and the centre line on the shadow instead of the garment.
export const isGarmentZone = o => !!o.__garmentBase && o.visible !== false && typeof o.__zoneKey === 'string' && !o.__zoneKey.startsWith('detail:');
export function garmentBox(c) {
  const rs = c.getObjects().filter(isGarmentZone).map(baseRect);
  if (!rs.length) return null;
  const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top));
  return { left: l, top: t, width: Math.max(...rs.map(r => r.left + r.width)) - l, height: Math.max(...rs.map(r => r.top + r.height)) - t };
}

// One screen px in canvas units through the Fabric zoom and the wrapper's CSS scale.
const screenPx = (c, scale) => 1 / ((c.viewportTransform?.[0] || 1) * (scale || 1));

// Grid over the garment box only, one screen px wide; 'difference' keeps it readable on light and dark cloth alike.
function drawGrid(ctx, c, o) {
  const g = garmentBox(c), spec = gridSpec(g, o.gridPct);
  if (!spec) return;
  const px = screenPx(c, o.scale), fade = gridFade(Math.min(spec.sx, spec.sy) / px);
  const keep = l => fade > 0 || l.v % 50 === 0; // faded out: only the 0/50/100 lines stay (each always has a ruler tick)
  const xs = gridLines(spec.x0, spec.sx, spec.pct, g.left, g.left + g.width).filter(keep);
  const ys = gridLines(spec.y0, spec.sy, spec.pct, g.top, g.top + g.height).filter(keep);
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.lineWidth = px;
  for (const [lines, v] of [[xs, true], [ys, false]]) for (const l of lines) {
    ctx.strokeStyle = `rgba(255,255,255,${(l.major ? GRID_ALPHA.major * 2 * Math.max(fade, 0.6) : GRID_ALPHA.minor * 2.5 * fade).toFixed(3)})`;
    ctx.beginPath();
    if (v) { ctx.moveTo(l.at, g.top); ctx.lineTo(l.at, g.top + g.height); } else { ctx.moveTo(g.left, l.at); ctx.lineTo(g.left + g.width, l.at); }
    ctx.stroke();
  }
  ctx.restore();
}

// Dashed centre line (full artboard height) and chest line (garment width) in thread red.
function drawGuides(ctx, c, o) {
  const g = garmentBox(c);
  if (!g) return;
  const px = screenPx(c, o.scale);
  const red = token(c.lowerCanvasEl, '--color-thread-red', '#C4313B');
  ctx.save();
  for (const l of fixedGuides(g)) {
    ctx.beginPath();
    if (l.axis === 'v') { ctx.moveTo(l.at, 0); ctx.lineTo(l.at, c.getHeight()); } else { ctx.moveTo(g.left, l.at); ctx.lineTo(g.left + g.width, l.at); }
    // Chalk casing under the red dash so the guide reads on red and dark garments too.
    ctx.setLineDash([]); ctx.lineWidth = 3 * px; ctx.strokeStyle = 'rgba(244,245,242,.7)'; ctx.stroke();
    ctx.setLineDash([6 * px, 4 * px]); ctx.lineWidth = Math.max(1.5 * px, 1); ctx.strokeStyle = rgba(red, 0.9); ctx.stroke();
  }
  ctx.restore();
}

// Paints the design, then (when on) the grid and the guides over it, on the live canvas only; exports and previews render without them.
// Print-through: logos, text and drawings take the cloth's light (weave, folds, edge shading), so they read as printed, not pasted.
// Runs for the live canvas and exports alike; only pixels under the design change, and nothing is saved.
const isInk = o => !o.__garmentBase && !o.__hoverGlow && o.visible !== false;
const offscreen = (box, k, w, h) => { const el = box[k] ?? (box[k] = document.createElement('canvas')); if (el.width !== w || el.height !== h) { el.width = w; el.height = h; } return el; };
export function printThrough(ctx, objects, cache) {
  const inks = objects.filter(isInk);
  if (!inks.length || typeof document === 'undefined') return;
  const lights = objects.filter(o => o.__light || (o.__garmentBase && o.getElement?.()?.__light));
  if (!lights.length) return;
  const w = ctx.canvas.width, h = ctx.canvas.height, t = ctx.getTransform();
  const key = [w, h, t.a, t.d, t.e, t.f].join();
  const light = offscreen(cache, 'light', w, h);
  if (cache.key !== key || cache.lights?.length !== lights.length || lights.some((o, i) => cache.lights[i] !== o)) {
    const lx = light.getContext('2d');
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1;
    lx.fillStyle = '#fff'; lx.fillRect(0, 0, w, h);
    lx.setTransform(t);
    for (const o of lights) {
      const map = o.__light ? null : o.getElement().__light;
      if (!map) { o.render(lx); continue; }
      lx.save(); lx.transform(...o.calcTransformMatrix()); lx.globalCompositeOperation = 'multiply';
      lx.drawImage(map, -o.width / 2, -o.height / 2, o.width, o.height); lx.restore();
    }
    cache.key = key; cache.lights = lights;
  }
  const mask = offscreen(cache, 'mask', w, h), mx = mask.getContext('2d');
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.clearRect(0, 0, w, h);
  mx.setTransform(t);
  for (const o of inks) o.render(mx);
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-in'; mx.globalAlpha = 1;
  mx.drawImage(light, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.85;
  ctx.drawImage(mask, 0, 0); ctx.restore();
}

export function installStageLayers(c, opts) {
  const render = c._renderObjects.bind(c), live = {}, exp = {};
  c._renderObjects = (ctx, objects) => {
    render(ctx, objects);
    try { printThrough(ctx, objects, ctx === c.contextContainer ? live : exp); } catch { /* a failed light pass leaves the flat design */ }
    if (ctx !== c.contextContainer) return;
    if (opts.current.showGrid) drawGrid(ctx, c, opts.current);
    if (opts.current.guides) drawGuides(ctx, c, opts.current);
  };
}

// Ghost boxes for the garment's placement presets (interaction layer, already in canvas units); the one under the element is filled.
export function drawPlacementGhosts(ctx, c, targets, obj, scale) {
  if (!targets.length) return;
  const px = screenPx(c, scale), b = obj.getBoundingRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const thread = token(c.lowerCanvasEl, '--cx-thread-ink', '#02606c'), card = token(c.lowerCanvasEl, '--cx-card', '#fffdf8');
  ctx.save();
  ctx.lineWidth = 1.5 * px;
  ctx.setLineDash([5 * px, 4 * px]);
  ctx.font = `700 ${11 * px}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  for (const t of targets) {
    const over = cx >= t.left && cx <= t.left + t.width && cy >= t.top && cy <= t.top + t.height;
    ctx.fillStyle = rgba(thread, over ? 0.16 : 0.05);
    ctx.strokeStyle = rgba(thread, over ? 0.95 : 0.6);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(t.left, t.top, t.width, t.height, 6 * px); else ctx.rect(t.left, t.top, t.width, t.height);
    ctx.fill(); ctx.stroke();
    // Label on a card-coloured pill so it reads on dark and light cloth alike.
    const tw = ctx.measureText(t.label).width, lh = 15 * px, ly = t.top - 3 * px;
    ctx.setLineDash([]);
    ctx.fillStyle = rgba(card, 0.94);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(t.left - 3 * px, ly - lh, tw + 6 * px, lh, 4 * px); else ctx.rect(t.left - 3 * px, ly - lh, tw + 6 * px, lh);
    ctx.fill();
    ctx.setLineDash([5 * px, 4 * px]);
    ctx.fillStyle = rgba(thread, 1);
    ctx.fillText(t.label, t.left, ly - 2 * px);
  }
  ctx.restore();
}

// Eraser: the stroke cuts holes in the customer's drawings and uploaded art it touches (an inverted clip of dots in each layer's own
// space, so the hole moves and scales with the layer). Text, shapes, locked layers and the garment are never touched. Returns the
// number of layers changed; the caller pushes one undo step.
export function applyErase(fabric, c, path, radius) {
  const pts = samplePath(path.path, Math.max(1, radius / 2));
  const sb = path.getBoundingRect();
  const hit = c.getObjects().filter(o => erasable(o) && touches(sb, o.getBoundingRect(), radius));
  for (const o of hit) {
    const inv = fabric.util.invertTransform(o.calcTransformMatrix());
    const k = Math.max(Math.abs(o.scaleX || 1), 1e-3);
    const dots = pts.map(([x, y]) => { const p = fabric.util.transformPoint(new fabric.Point(x, y), inv); return [+p.x.toFixed(2), +p.y.toFixed(2), +(radius / k).toFixed(2)]; });
    o.__erase = [...(o.__erase ?? []), ...dots];
    setEraseClip(fabric, o);
  }
  return hit.length;
}
// Rebuild a layer's inverted clip from its stored dots (also after undo or reload, where the clip is restored with the layer).
export function setEraseClip(fabric, o) {
  if (!o.__erase?.length) { o.clipPath = undefined; return; }
  const circles = o.__erase.map(([x, y, r]) => new fabric.Circle({ left: x, top: y, radius: r, originX: 'center', originY: 'center', fill: '#000', strokeWidth: 0 }));
  o.clipPath = new fabric.Group(circles, { inverted: true });
  o.dirty = true;
}

// A layer as saved JSON in canvas coordinates. Members of a multi-selection hold coordinates relative to that selection, so their
// absolute transform is decomposed (same maths as Fabric's qrDecompose) and written back; otherwise a save, autosave or undo
// step taken while several elements are selected would store them in the wrong place.
export function plainObject(o, props) {
  if (o.group?.type !== 'activeselection') return o.toObject(props);
  const m = o.calcTransformMatrix(), den = m[0] ** 2 + m[1] ** 2, sx = Math.sqrt(den);
  const abs = { angle: (Math.atan2(m[1], m[0]) * 180) / Math.PI, scaleX: sx, scaleY: (m[0] * m[3] - m[2] * m[1]) / sx, skewX: (Math.atan2(m[0] * m[2] + m[1] * m[3], den) * 180) / Math.PI, skewY: 0 };
  const keep = { angle: o.angle, scaleX: o.scaleX, scaleY: o.scaleY, skewX: o.skewX, skewY: o.skewY };
  Object.assign(o, abs);
  const pos = o.translateToGivenOrigin({ x: m[4], y: m[5] }, 'center', 'center', o.originX, o.originY);
  const out = { ...o.toObject(props), ...abs, left: pos.x, top: pos.y };
  Object.assign(o, keep);
  return out;
}
