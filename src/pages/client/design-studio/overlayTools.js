// Overlay editing helpers kept out of useGarmentCanvas.js: curved text, the shape factory, z-order and touch handles, plus
// reviveOverlays(), the one step every load path runs (reload, undo/redo, 3D decals) so saved text gets its web font and arc back.
import { ensureFonts, loadFont } from './studioFonts';

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
  star: 'Star', polygon: 'Hexagon', line: 'Line', arrow: 'Arrow' };
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
