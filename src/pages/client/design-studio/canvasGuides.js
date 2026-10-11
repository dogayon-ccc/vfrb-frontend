// Pure helpers for the Studio's guides, rulers, placement targets, alignment and eraser. No Fabric, no DOM: logic-checks.mjs tests them.
// Units are canvas logical px unless a name says otherwise. Rulers speak only in % of the garment: VFRB sizing is never shown.
import { placementsFor } from './dsShared';
import { GRID_SIZES } from './snapGuides';

// ── Guide preferences (per viewer, remembered in this browser) ──
export const GUIDE_KEYS = ['grid', 'snap', 'rulers', 'centre', 'smart'];
export const guideDefaults = (phone = false) => ({ grid: false, size: 20, snap: true, rulers: false, centre: !phone, smart: !phone });
// Stored prefs win; the older { grid, snap, size } shape (grid meant grid + rulers) is carried over.
export function readGuidePrefs(stored, phone = false) {
  const d = guideDefaults(phone);
  if (!stored || typeof stored !== 'object') return d;
  const g = { ...d, ...stored };
  if (!('rulers' in stored) && 'grid' in stored) g.rulers = !!stored.grid;
  for (const k of GUIDE_KEYS) g[k] = !!g[k];
  if (!GRID_SIZES.includes(g.size)) g.size = d.size;
  return g;
}

// ── Grid ──
// Opacity factor for grid lines `spacingPx` apart on screen: full from 12 px, gone below 4 px (the grid fades at low zoom).
export const gridFade = spacingPx => Math.max(0, Math.min(1, (spacingPx - 4) / 8));
export const GRID_MAJOR_EVERY = 5;
export const GRID_ALPHA = { minor: 0.1, major: 0.18 };

// ── Relative rulers: 0-100 % of the garment box ──
const REL_STEPS = [1, 2, 5, 10, 25, 50];
const REL_MAJORS = [5, 10, 25, 50, 100];
// Steps for a garment `extentPx` screen px long: minor ticks >= 6 px apart, labels >= `minLabelPx` apart.
export function relSteps(extentPx, minLabelPx = 40) {
  const per = extentPx / 100;
  const step = REL_STEPS.find(s => s * per >= 6) ?? 50;
  const major = REL_MAJORS.find(m => m % step === 0 && m * per >= minLabelPx) ?? 100;
  return { step, major };
}
// Ticks for a ruler `length` screen px long whose canvas 0 lands at `origin` with `scale` screen px per canvas px; the garment spans
// [gStart, gStart + gSize] canvas px. Only 0..100 % is marked; labels are whole percentages.
export function relativeTicks(origin, scale, length, gStart, gSize, minLabelPx = 40) {
  if (!(scale > 0) || !(gSize > 0)) return [];
  const { step, major } = relSteps(gSize * scale, minLabelPx);
  const out = [];
  for (let v = 0; v <= 100; v += step) {
    const at = origin + (gStart + (v / 100) * gSize) * scale;
    if (at >= -0.5 && at <= length + 0.5) out.push({ v, at, major: v % major === 0 });
  }
  return out;
}
// Live readout while moving or resizing, in % of the garment (never canvas px, never real units).
export function readoutPct(box, garment, action) {
  if (!garment?.width || !garment?.height) return '';
  const p = (v, n) => Math.round((v / n) * 100);
  return action === 'scale' ? `${p(box.width, garment.width)}% × ${p(box.height, garment.height)}%`
    : `X ${p(box.left + box.width / 2 - garment.left, garment.width)}%  Y ${p(box.top + box.height / 2 - garment.top, garment.height)}%`;
}

// ── Placement targets: the garment's existing logo presets for the face shown ──
const LOGO_W = 72; // the width addLogo gives a preset logo
export function placementTargets(garment, sleeve, fit, face, w, h) {
  if (!garment || !(w > 0) || !(h > 0)) return [];
  const back = face === 'back';
  return placementsFor(garment, sleeve, fit).filter(p => (p.id === 'back_center' ? back : !back || p.id.endsWith('_arm')))
    .map(p => ({ id: p.id, label: p.label, left: w * p.x, top: h * p.y, width: LOGO_W, height: LOGO_W }));
}

// ── Alignment and distribution ──
const box = b => ({ l: b.left, t: b.top, r: b.left + b.width, b: b.top + b.height, cx: b.left + b.width / 2, cy: b.top + b.height / 2 });
// Offsets that align every box to the selection's bounds. where: left | hcenter | right | top | vcenter | bottom.
export function alignDeltas(boxes, where) {
  if (boxes.length < 2) return boxes.map(() => ({ dx: 0, dy: 0 }));
  const bs = boxes.map(box);
  const L = Math.min(...bs.map(b => b.l)), R = Math.max(...bs.map(b => b.r)), T = Math.min(...bs.map(b => b.t)), B = Math.max(...bs.map(b => b.b));
  return bs.map(b => ({
    dx: where === 'left' ? L - b.l : where === 'right' ? R - b.r : where === 'hcenter' ? (L + R) / 2 - b.cx : 0,
    dy: where === 'top' ? T - b.t : where === 'bottom' ? B - b.b : where === 'vcenter' ? (T + B) / 2 - b.cy : 0,
  }));
}
// Equal gaps between 3+ boxes along an axis ('h' or 'v'); the first and last box stay where they are.
export function distributeDeltas(boxes, axis) {
  const out = boxes.map(() => ({ dx: 0, dy: 0 }));
  if (boxes.length < 3) return out;
  const [pos, size, d] = axis === 'h' ? ['left', 'width', 'dx'] : ['top', 'height', 'dy'];
  const order = boxes.map((b, i) => i).sort((a, b) => boxes[a][pos] - boxes[b][pos]);
  const first = boxes[order[0]], last = boxes[order[order.length - 1]];
  const total = order.reduce((s, i) => s + boxes[i][size], 0);
  const gap = (last[pos] + last[size] - first[pos] - total) / (order.length - 1);
  let at = first[pos];
  for (const i of order) { out[i][d] = at - boxes[i][pos]; at += boxes[i][size] + gap; }
  return out;
}

// ── Eraser ──
// Points along a Fabric path (M/L/Q/C commands, canvas px), sampled at most `step` apart, so dots of radius >= step/2 leave no gaps.
export function samplePath(cmds, step = 2) {
  const pts = [];
  let px = null, py = null;
  const push = (x, y) => {
    if (px === null) { pts.push([x, y]); px = x; py = y; return; }
    const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / step));
    for (let i = 1; i <= n; i++) pts.push([px + ((x - px) * i) / n, py + ((y - py) * i) / n]);
    px = x; py = y;
  };
  for (const c of cmds ?? []) {
    const k = c[0];
    if (k === 'M' || k === 'L') push(c[1], c[2]);
    else if (k === 'Q') push(c[3], c[4]);
    else if (k === 'C') push(c[5], c[6]);
  }
  return pts;
}
// Customer layers the eraser may cut: free drawings and uploaded art only, never text, shapes, locked or hidden layers, or the garment.
export const erasable = o => !!o && !o.__garmentBase && !o.__hoverGlow && !o.__locked && o.visible !== false && (!!o.__draw || !!o.__logo || !!o.__artwork);
// Does a stroke's box (canvas px, grown by the brush radius) touch a layer's box?
export const touches = (a, b, pad = 0) => a.left - pad < b.left + b.width && b.left < a.left + a.width + pad && a.top - pad < b.top + b.height && b.top < a.top + a.height + pad;
