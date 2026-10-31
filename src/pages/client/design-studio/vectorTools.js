// Pen and Line tool geometry. Pure, so logic-checks can pin the path data. Points are canvas scene coordinates.
// An anchor is { x, y, hx, hy }: (hx, hy) is its outgoing curve handle; the incoming handle mirrors it (a smooth point).

const r = n => Math.round(n * 100) / 100;
const curved = a => a.hx !== 0 || a.hy !== 0;

function segment(a, b) {
  if (!curved(a) && !curved(b)) return `L ${r(b.x)} ${r(b.y)}`;
  return `C ${r(a.x + a.hx)} ${r(a.y + a.hy)} ${r(b.x - b.hx)} ${r(b.y - b.hy)} ${r(b.x)} ${r(b.y)}`;
}

// SVG path data for the anchors; a closed path returns to the first anchor along its handles.
export function pathData(anchors, closed = false) {
  if (anchors.length < 2) return '';
  const [first] = anchors;
  const parts = [`M ${r(first.x)} ${r(first.y)}`];
  for (let i = 1; i < anchors.length; i++) parts.push(segment(anchors[i - 1], anchors[i]));
  if (closed) parts.push(segment(anchors[anchors.length - 1], first), 'Z');
  return parts.join(' ');
}

// Shift: the end point snaps to the nearest 45° step from the start, keeping the drag length.
export function constrain45(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy);
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: from.x + Math.cos(a) * len, y: from.y + Math.sin(a) * len };
}

// A press within `tol` of the first anchor closes the path (3+ anchors make an area).
export const closesAt = (anchors, p, tol) => anchors.length >= 3 && Math.hypot(p.x - anchors[0].x, p.y - anchors[0].y) <= tol;

// The two presses of a double-click add anchors on the same spot; they are dropped before the path is kept.
export function trimDoubleClick(anchors, tol = 2) {
  const out = [...anchors];
  while (out.length > 1) {
    const a = out[out.length - 1], b = out[out.length - 2];
    if (Math.hypot(a.x - b.x, a.y - b.y) > tol) break;
    out.pop();
  }
  return out;
}
