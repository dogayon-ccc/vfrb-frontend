// Overlay editing helpers kept out of useGarmentCanvas.js: curved text, the shape factory, z-order and touch handles, plus
// reviveOverlays(), the one step every load path runs (reload, undo/redo, 3D decals) so saved text gets its web font and arc back.
import { ensureFonts, loadFont } from './studioFonts';
import { pocketGeometry, pocketLabel, stitchFor } from './pocketTools';
import { sketchInk } from './sketchLine';

const fab = () => import('fabric').then(m => m.fabric ?? m.default ?? m);

// ── Curved text ───────────────────────────────────────────────────────────
// __curve: -100..100 (saved with the overlay). Positive arches up like a rainbow, negative bends down like a smile; 100 wraps
// the text round 315° of a circle. The arc is exactly as long as the straight text, so letter spacing and size are kept.
export const clampCurve = c => (Number.isFinite(c) ? Math.max(-100, Math.min(100, Math.round(c))) : 0);

export function arcPathD(width, curve) {
  const c = clampCurve(curve);
  if (Math.abs(c) < 2 || !(width > 0)) return null;
  const theta = (Math.abs(c) / 100) * 1.75 * Math.PI, r = width / theta, up = c > 0;
  const mid = up ? -Math.PI / 2 : Math.PI / 2, cy = up ? r : -r;
  const a0 = up ? mid - theta / 2 : mid + theta / 2, a1 = up ? mid + theta / 2 : mid - theta / 2;
  const p = a => `${(r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(a0)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${theta > Math.PI ? 1 : 0} ${up ? 1 : 0} ${p(a1)}`;
}

// Re-measures a text (after its font loaded or its text, size or spacing changed) and rebuilds its arc around the same centre.
// Curved text is edited from the panel, not by typing on the canvas: Fabric's in-place editing does not follow a path.
export async function relayoutText(t) {
  if (typeof t?.text !== 'string') return;
  const fabric = await fab();
  const centre = t.getCenterPoint();
  fabric.cache?.clearFontCache?.(t.fontFamily);
  t.path = undefined;
  t.initDimensions();
  const d = arcPathD(t.width, t.__curve);
  if (d) t.set({ path: new fabric.Path(d, { visible: false, fill: '', stroke: '' }), pathAlign: 'center', pathSide: 'left', pathStartOffset: 0 });
  t.set({ editable: !d });
  t.initDimensions();
  t.setPositionByOrigin(centre, 'center', 'center');
  t.setCoords();
}

// Props that change a text's measured width, so a curved text needs its arc rebuilt.
const LAYOUT = ['text', 'fontFamily', 'fontSize', 'fontWeight', 'charSpacing', '__curve', 'lineHeight'];
export const changesLayout = props => LAYOUT.some(k => k in props);

// Live text edits from the inspector: loads a newly chosen web font first, then re-lays the text out.
export async function restyleText(t, props) {
  if ('fontFamily' in props || 'fontWeight' in props) await loadFont(t.fontFamily, t.fontWeight);
  await relayoutText(t);
}

// Enlivened overlays -> fonts loaded, text re-measured, arcs rebuilt. Returns the same objects.
export async function reviveOverlays(objs) {
  const texts = (objs ?? []).filter(o => typeof o?.text === 'string');
  if (!texts.length) return objs;
  await ensureFonts(texts);
  for (const t of texts) await relayoutText(t);
  return objs;
}

// ── Shapes ────────────────────────────────────────────────────────────────
// __shapeKind tells polygons apart (star, polygon, arrow all have Fabric type 'polygon') and rect from rounded rect.
export const SHAPE_KIND_LABEL = { rect: 'Rectangle', roundrect: 'Rounded rectangle', circle: 'Circle', ellipse: 'Ellipse', triangle: 'Triangle',
  star: 'Star', polygon: 'Hexagon', line: 'Line', arrow: 'Arrow', heart: 'Heart', badge: 'Badge', bubble: 'Speech bubble', ribbon: 'Ribbon' };
// Path shapes in a 24-unit box: the panel draws them as glyphs, the canvas scales them up.
export const SHAPE_PATHS = {
  heart: 'M12 21C12 21 3 15 3 8.8C3 5.6 5.5 3.5 8.2 3.5C10 3.5 11.3 4.5 12 5.8C12.7 4.5 14 3.5 15.8 3.5C18.5 3.5 21 5.6 21 8.8C21 15 12 21 12 21Z',
  badge: 'M12 2L20 5V11C20 16.5 16.4 20.4 12 22C7.6 20.4 4 16.5 4 11V5Z',
  bubble: 'M4 4H20Q22 4 22 6V15Q22 17 20 17H10L5 21V17H4Q2 17 2 15V6Q2 4 4 4Z',
  ribbon: 'M1 8H6V6H18V8H23L20 12L23 16H18V18H6V16H1L4 12Z',
};
const TYPE_LABEL = { rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle', ellipse: 'Ellipse', line: 'Line', polygon: 'Star' };
export const shapeLabel = o => SHAPE_KIND_LABEL[o?.__shapeKind] ?? TYPE_LABEL[o?.type] ?? 'Shape';

const ring = (n, r, inner = null, start = -Math.PI / 2) => Array.from({ length: inner ? n * 2 : n }, (_, i) => {
  const rr = inner && i % 2 ? inner : r, a = start + (i * Math.PI * 2) / (inner ? n * 2 : n);
  return { x: r + rr * Math.cos(a), y: r + rr * Math.sin(a) };
});
const ARROW = [[0, 14], [56, 14], [56, 0], [84, 24], [56, 48], [56, 34], [0, 34]].map(([x, y]) => ({ x, y }));

// common: position, colour, tags. Stroke stays the same width when the shape is resized (strokeUniform).
export function makeShape(fabric, kind, common, color) {
  const c = { ...common, strokeUniform: true, __shapeKind: kind, __layerName: SHAPE_KIND_LABEL[kind] ?? 'Shape' };
  if (SHAPE_PATHS[kind]) return new fabric.Path(SHAPE_PATHS[kind], { ...c, scaleX: 2.8, scaleY: 2.8 });
  switch (kind) {
    case 'circle':    return new fabric.Circle({ ...c, radius: 32 });
    case 'ellipse':   return new fabric.Ellipse({ ...c, rx: 38, ry: 24 });
    case 'triangle':  return new fabric.Triangle({ ...c, width: 64, height: 56 });
    case 'line':      return new fabric.Line([0, 0, 84, 0], { ...c, fill: undefined, stroke: color, strokeWidth: 4, strokeLineCap: 'round' });
    case 'star':      return new fabric.Polygon(ring(5, 32, 13), c);
    case 'polygon':   return new fabric.Polygon(ring(6, 32, null, 0), c);
    case 'arrow':     return new fabric.Polygon(ARROW, { ...c, strokeLineJoin: 'round' });
    case 'roundrect': return new fabric.Rect({ ...c, width: 72, height: 56, rx: 12, ry: 12 });
    default:          return new fabric.Rect({ ...c, width: 64, height: 64 });
  }
}

// Two-colour linear fill in the element's own box (percentage units), so it follows resize, flip and rotation.
export const gradientSpec = (from, to, dir = 'v') => ({ type: 'linear', gradientUnits: 'percentage',
  coords: dir === 'h' ? { x1: 0, y1: 0, x2: 1, y2: 0 } : { x1: 0, y1: 0, x2: 0, y2: 1 },
  colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }] });
export const readGradient = fill => (fill?.colorStops?.length >= 2
  ? { from: fill.colorStops[0].color, to: fill.colorStops[fill.colorStops.length - 1].color, dir: fill.coords?.x2 > 0 ? 'h' : 'v' } : null);

// Image adjustments as Fabric filters: saved in the design JSON and re-applied on load. b and c run -100..100.
export const readAdjust = o => {
  const f = o?.filters ?? [], get = t => f.find(x => x?.type === t);
  return { b: Math.round((get('Brightness')?.brightness ?? 0) * 100), c: Math.round((get('Contrast')?.contrast ?? 0) * 100), grey: !!get('Grayscale') };
};
export function adjustFilters(fabric, { b = 0, c = 0, grey = false }) {
  const F = fabric.filters;
  return [b && new F.Brightness({ brightness: b / 100 }), c && new F.Contrast({ contrast: c / 100 }), grey && new F.Grayscale()].filter(Boolean);
}

// Crop an image to a shape: a clipPath centred on the element, saved with it. __clip names the shape for the panel.
export const CLIP_KINDS = [['none', 'None'], ['circle', 'Circle'], ['rounded', 'Rounded'], ['heart', 'Heart']];
export function clipFor(fabric, kind, w, h) {
  const s = Math.min(w, h), at = { originX: 'center', originY: 'center', left: 0, top: 0 };
  if (kind === 'circle') return new fabric.Circle({ ...at, radius: s / 2 });
  if (kind === 'rounded') return new fabric.Rect({ ...at, width: w, height: h, rx: s / 6, ry: s / 6 });
  if (kind === 'heart') return new fabric.Path(SHAPE_PATHS.heart, { ...at, scaleX: s / 18, scaleY: s / 18 });
  return undefined;
}

// ── Pockets ───────────────────────────────────────────────────────────────
// A pocket is one group: its panels (filled in the pocket colour) first, then stitch and edge lines. __pocketPanels says how many children
// are panels, so a recolour finds them after a save and reload (children keep no custom tags through Fabric's serialisation).
// The panel outline and edge lines take the sketch-line ink for the pocket colour (sketchLine.js): an automatic contrast edge, so a
// pocket in the body colour still reads as a pocket.
export function makePocket(fabric, kind, common, color) {
  const g = pocketGeometry(kind), stitch = stitchFor(color), edge = sketchInk(color);
  const panels = g.panels.map(d => new fabric.Path(d, { fill: color, stroke: edge, strokeWidth: 1.4, strokeUniform: true, objectCaching: false }));
  const stitches = g.stitches.map(d => new fabric.Path(d, { fill: '', stroke: stitch, strokeWidth: 1, strokeDashArray: [3, 2.2], strokeUniform: true, objectCaching: false }));
  const lines = g.lines.map(d => new fabric.Path(d, { fill: '', stroke: edge, strokeWidth: 1.1, strokeUniform: true, objectCaching: false }));
  return new fabric.Group([...panels, ...stitches, ...lines], { ...common, __pocket: kind, __pocketPanels: panels.length, __pocketColor: color, __layerName: pocketLabel(kind) });
}
// New colour for a pocket's panels; its stitching follows for contrast. Returns false for anything that is not a pocket.
export function recolorPocket(o, color) {
  if (!o?.__pocket || typeof o.getObjects !== 'function') return false;
  const kids = o.getObjects(), n = o.__pocketPanels ?? 1, stitch = stitchFor(color);
  const edge = sketchInk(color);
  kids.forEach((k, i) => { if (i < n) k.set({ fill: color, stroke: edge }); else k.set('stroke', k.strokeDashArray?.length ? stitch : edge); });
  o.__pocketColor = color;
  o.set('dirty', true);
  return true;
}

// ── Layer order and handles ───────────────────────────────────────────────
// Moves one overlay among the overlays only: the garment base and its decorative layers always stay below.
export function moveInStack(canvas, obj, where) {
  const all = canvas.getObjects(), overlays = all.filter(o => !o.__garmentBase && !o.__hoverGlow);
  const i = overlays.indexOf(obj);
  if (i < 0) return false;
  const j = { front: overlays.length - 1, back: 0, forward: Math.min(overlays.length - 1, i + 1), backward: Math.max(0, i - 1) }[where];
  if (j === undefined || j === i) return false;
  canvas.moveObjectTo(obj, all.indexOf(overlays[j]));
  return true;
}

// 44px touch targets for the resize and rotate handles (WCAG 2.5.5); the mouse keeps Fabric's compact handles.
let handlesSet = false;
export function installTouchHandles(fabric) {
  if (handlesSet) return;
  handlesSet = true;
  const d = fabric.InteractiveFabricObject?.ownDefaults ?? fabric.FabricObject?.ownDefaults;
  if (d) Object.assign(d, { touchCornerSize: 44 });
}
