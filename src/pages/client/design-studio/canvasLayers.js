// Fabric-side drawing for the Studio's guides: the garment centre line, placement ghosts while a logo or text moves, and the eraser
// cut. The centre line is painted on the live canvas only (never in an export, which renders to its own canvas); ghosts go on the
// interaction layer. None of them is a canvas object. The grid is the stage's SVG behind the canvas, never drawn on the garment.
import { samplePath, erasable, touches } from './canvasGuides';

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

// Union of the garment base objects' boxes (canvas px), or null before the base has drawn.
export function garmentBox(c) {
  const rs = c.getObjects().filter(o => o.__garmentBase && o.visible !== false).map(baseRect);
  if (!rs.length) return null;
  const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top));
  return { left: l, top: t, width: Math.max(...rs.map(r => r.left + r.width)) - l, height: Math.max(...rs.map(r => r.top + r.height)) - t };
}

// One screen px in canvas units through the Fabric zoom and the wrapper's CSS scale.
const screenPx = (c, scale) => 1 / ((c.viewportTransform?.[0] || 1) * (scale || 1));

// Dashed vertical line through the garment's centre, the full height of the artboard.
function drawCentre(ctx, c, o) {
  const g = garmentBox(c);
  if (!g) return;
  const px = screenPx(c, o.scale), x = g.left + g.width / 2;
  ctx.save();
  ctx.lineWidth = Math.max(px, 1);
  ctx.setLineDash([6 * px, 4 * px]);
  ctx.strokeStyle = rgba(token(c.lowerCanvasEl, '--cx-thread-ink', '#02606c'), 0.85);
  ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.getHeight()); ctx.stroke();
  ctx.restore();
}

// Paints the design, then the centre line (when on) on the live canvas; exports and previews render without it. The grid is never
// painted over the garment: it is the stage's SVG grid behind the canvas, so the cloth always reads clean.
export function installStageLayers(c, opts) {
  const render = c._renderObjects.bind(c);
  c._renderObjects = (ctx, objects) => {
    render(ctx, objects);
    if (ctx === c.contextContainer && opts.current.centre) drawCentre(ctx, c, opts.current);
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
