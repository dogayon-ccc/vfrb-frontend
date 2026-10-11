// Snapping and smart guides for moving design elements on the 2D canvas. Pure functions, in canvas logical units (the same
// coordinates Fabric objects, getBoundingRect() and the rulers use; the on-screen zoom is a CSS scale on the wrapper).
// Guides are never canvas objects: the hook draws them on Fabric's interaction layer (contextTop), which is not part of
// saved JSON, PNG/PDF exports or previews.

export const SNAP_THRESHOLD = 6; // logical px at 100% (the default when no on-screen scale is known)
export const SNAP_SCREEN_PX = 6; // the pull distance as the user sees it, at any zoom
export const GRID_SIZES = [10, 20, 40];

// Threshold in logical px for an on-screen scale (zoom x fit), so snapping feels the same at 40% on a phone and 270% on a desktop.
export const snapThreshold = (scale = 1) => Math.min(12, Math.max(2, SNAP_SCREEN_PX / (scale > 0 ? scale : 1)));

// Candidate lines an element can snap to: the canvas centre, the garment's centre (and its edges unless garmentEdges is false),
// other visible design elements' edges and centres, and (only while the grid is shown) every grid line.
export function snapTargets({ width, height, garment, garmentEdges = true, others = [], gridSize = 0 }) {
  const v = [{ at: width / 2, kind: 'canvas' }], h = [{ at: height / 2, kind: 'canvas' }];
  if (garment) {
    v.push({ at: garment.left + garment.width / 2, kind: 'garment' });
    h.push({ at: garment.top + garment.height / 2, kind: 'garment' });
    if (garmentEdges) {
      v.push({ at: garment.left, kind: 'garment' }, { at: garment.left + garment.width, kind: 'garment' });
      h.push({ at: garment.top, kind: 'garment' }, { at: garment.top + garment.height, kind: 'garment' });
    }
  }
  for (const o of others) {
    v.push({ at: o.left, kind: 'object' }, { at: o.left + o.width / 2, kind: 'object' }, { at: o.left + o.width, kind: 'object' });
    h.push({ at: o.top, kind: 'object' }, { at: o.top + o.height / 2, kind: 'object' }, { at: o.top + o.height, kind: 'object' });
  }
  if (gridSize > 0) {
    for (let x = gridSize; x < width; x += gridSize) v.push({ at: x, kind: 'grid' });
    for (let y = gridSize; y < height; y += gridSize) h.push({ at: y, kind: 'grid' });
  }
  return { v, h };
}

// Nearest line within the threshold for any of the box's three edges (start, centre, end). Object, garment and canvas lines
// win over grid lines at equal distance, so content alignment beats grid alignment.
const RANK = { object: 0, garment: 1, canvas: 2, grid: 3 };
function best(edges, lines, threshold) {
  let hit = null;
  for (const e of edges) for (const l of lines) {
    const d = l.at - e, ad = Math.abs(d);
    if (ad > threshold) continue;
    if (!hit || ad < hit.ad - 1e-6 || (Math.abs(ad - hit.ad) < 1e-6 && RANK[l.kind] < RANK[hit.kind])) hit = { d, ad, at: l.at, kind: l.kind };
  }
  return hit;
}

// Offset that snaps `box` ({left, top, width, height}) plus the guide lines to draw. Guides span the canvas.
export function computeSnap(box, targets, threshold = SNAP_THRESHOLD) {
  const x = best([box.left, box.left + box.width / 2, box.left + box.width], targets.v, threshold);
  const y = best([box.top, box.top + box.height / 2, box.top + box.height], targets.h, threshold);
  return {
    dx: x ? x.d : 0, dy: y ? y.d : 0,
    guides: [...(x ? [{ axis: 'v', at: x.at, kind: x.kind }] : []), ...(y ? [{ axis: 'h', at: y.at, kind: y.kind }] : [])],
  };
}

// Sides of the box that move when resizing from a Fabric control (tl, tr, bl, br, ml, mr, mt, mb); the opposite sides stay anchored.
const EDGES = { tl: ['left', 'top'], tr: ['right', 'top'], bl: ['left', 'bottom'], br: ['right', 'bottom'], ml: ['left', null], mr: ['right', null], mt: [null, 'top'], mb: [null, 'bottom'] };
export function movingEdges(corner) {
  const [x, y] = EDGES[corner] ?? [null, null];
  return { x, y };
}

// Snap for a resize: only the moving sides are pulled to a line. Returns the size ratio per axis (multiply the scale by it)
// and the guides for the sides that actually land on a line. A proportional resize (uniform) uses one ratio for both axes,
// taken from the closer snap, and only that side gets a guide.
export function computeResizeSnap(box, corner, targets, threshold = SNAP_THRESHOLD, uniform = false) {
  const { x, y } = movingEdges(corner);
  const hx = x && box.width > 0 ? best([x === 'left' ? box.left : box.left + box.width], targets.v, threshold) : null;
  const hy = y && box.height > 0 ? best([y === 'top' ? box.top : box.top + box.height], targets.h, threshold) : null;
  let rx = hx ? (box.width + (x === 'left' ? -hx.d : hx.d)) / box.width : 1;
  let ry = hy ? (box.height + (y === 'top' ? -hy.d : hy.d)) / box.height : 1;
  let gx = hx, gy = hy;
  if (uniform) {
    if (hx && (!hy || hx.ad <= hy.ad)) { ry = rx; gy = null; } else if (hy) { rx = ry; gx = null; }
  }
  if (!(rx > 0.05) || !(ry > 0.05)) return { rx: 1, ry: 1, guides: [] }; // never collapse or flip an element
  return { rx, ry, guides: [...(gx ? [{ axis: 'v', at: gx.at, kind: gx.kind }] : []), ...(gy ? [{ axis: 'h', at: gy.at, kind: gy.kind }] : [])] };
}

// Live readout while transforming, in the same numbers the inspector shows (X/Y = the element's left/top, size = width x height).
export const readoutText = (o, action) => action === 'scale'
  ? `${Math.round((o.width ?? 0) * Math.abs(o.scaleX ?? 1))} × ${Math.round((o.height ?? 0) * Math.abs(o.scaleY ?? 1))}`
  : `X ${Math.round(o.left ?? 0)}  Y ${Math.round(o.top ?? 0)}`;

// Ruler ticks for a length in logical px: a minor tick every `step`, a labelled major tick every `major`.
export function rulerTicks(length, step = 10, major = 50) {
  const out = [];
  for (let p = 0; p <= length + 1e-6; p += step) out.push({ at: p, major: Math.round(p) % major === 0 });
  return out;
}

// Tick spacing for an on-screen scale: minor ticks at least 6 screen px apart, labels at least 44 screen px apart, both on
// round canvas values, so the rulers stay readable at every zoom and screen width.
const STEPS = [2, 5, 10, 20, 25, 50, 100, 200];
export function rulerSteps(scale = 1) {
  const s = scale > 0 ? scale : 1;
  const step = STEPS.find(x => x * s >= 6) ?? STEPS[STEPS.length - 1];
  const major = [10, 20, 50, 100, 200, 500, 1000].find(x => x % step === 0 && x * s >= 44) ?? step * 10;
  return { step, major };
}

// ── Pinned rulers and panning ─────────────────────────────────────────────────────────────────────────────────────────────
// The artboard is drawn at screen position origin + v * scale for canvas value v (origin = where canvas 0 lands on the ruler).

// Ticks for a ruler pinned to the viewport edge: only the part of the artboard [0, extent] that is visible on a ruler of
// `length` screen px. Values are whole multiples of `step`, so labels never duplicate or drift with rounding, and they continue
// from the artboard's real coordinates when its origin is scrolled out of view (never restart at 0, never negative).
export function pinnedTicks(origin, scale, length, extent, step, major) {
  if (!(scale > 0) || !(step > 0)) return [];
  const from = Math.max(0, Math.ceil(-origin / scale / step - 1e-9));
  const to = Math.min(Math.floor(extent / step + 1e-9), Math.floor((length - origin) / scale / step + 1e-9));
  const out = [];
  for (let k = from; k <= to; k++) { const v = k * step; out.push({ v, at: origin + v * scale, major: v % major === 0 }); }
  return out;
}

// How far the artboard may be panned from centre: only along an axis where it overflows the viewport, by the overflow plus a
// margin, so every edge can be brought into view and the artboard can never be lost.
export const PAN_MARGIN = 48;
export function panLimits({ w, h, scale, viewW, viewH, margin = PAN_MARGIN }) {
  const over = (size, view) => { const o = (size * scale - view) / 2; return o > 0 ? o + margin : 0; };
  return { x: over(w, viewW), y: over(h, viewH) };
}
export const clampPan = (p, lim) => ({ x: Math.max(-lim.x, Math.min(lim.x, p.x)) || 0, y: Math.max(-lim.y, Math.min(lim.y, p.y)) || 0 });
