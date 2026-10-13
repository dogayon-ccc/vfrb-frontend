// Snapping and smart guides for moving design elements on the 2D canvas. Pure functions, in canvas logical units (the same
// coordinates Fabric objects, getBoundingRect() and the rulers use; the on-screen zoom is a CSS scale on the wrapper).
// Guides are never canvas objects: the hook draws them on Fabric's interaction layer (contextTop), which is not part of
// saved JSON, PNG/PDF exports or previews.

export const SNAP_THRESHOLD = 6; // logical px at 100% (the default when no on-screen scale is known)
export const SNAP_SCREEN_PX = 6; // the pull distance as the user sees it, at any zoom

// Threshold in logical px for an on-screen scale (zoom x fit), so snapping feels the same at 40% on a phone and 270% on a desktop.
export const snapThreshold = (scale = 1) => Math.min(12, Math.max(2, SNAP_SCREEN_PX / (scale > 0 ? scale : 1)));

// Candidate lines an element can snap to: the canvas centre, the garment's centre (and its edges unless garmentEdges is false),
// other visible design elements' edges and centres, ruler guides, and (only while the grid is shown) every line of the garment-
// relative grid spec { x0, y0, sx, sy, pct } (canvasGuides.gridSpec: origin at the garment's top-left, the rulers' unit).
export function snapTargets({ width, height, garment, garmentEdges = true, others = [], grid = null, guides = [] }) {
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
  for (const g of guides) (g.axis === 'v' ? v : h).push({ at: g.at, kind: 'guide' });
  if (grid?.sx > 0 && grid?.sy > 0) {
    for (let x = grid.x0 - Math.floor(grid.x0 / grid.sx) * grid.sx; x <= width; x += grid.sx) v.push({ at: x, kind: 'grid' });
    for (let y = grid.y0 - Math.floor(grid.y0 / grid.sy) * grid.sy; y <= height; y += grid.sy) h.push({ at: y, kind: 'grid' });
    // The 50% centre is a grid line at every size, on both axes (the stage grid draws it on both).
    v.push({ at: grid.x0 + (50 / grid.pct) * grid.sx, kind: 'grid' });
    h.push({ at: grid.y0 + (50 / grid.pct) * grid.sy, kind: 'grid' });
  }
  return { v, h };
}

// Nearest line within the threshold for any of the box's three edges (start, centre, end). Object, garment and canvas lines
// win over grid lines at equal distance, so content alignment beats grid alignment.
const RANK = { object: 0, guide: 1, garment: 2, canvas: 3, grid: 4 };
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

// ── Panning ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

// How far the artboard may be panned from centre: only along an axis where it overflows the viewport, by the overflow plus a
// margin, so every edge can be brought into view and the artboard can never be lost.
export const PAN_MARGIN = 48;
export function panLimits({ w, h, scale, viewW, viewH, margin = PAN_MARGIN }) {
  const over = (size, view) => { const o = (size * scale - view) / 2; return o > 0 ? o + margin : 0; };
  return { x: over(w, viewW), y: over(h, viewH) };
}
export const clampPan = (p, lim) => ({ x: Math.max(-lim.x, Math.min(lim.x, p.x)) || 0, y: Math.max(-lim.y, Math.min(lim.y, p.y)) || 0 });
