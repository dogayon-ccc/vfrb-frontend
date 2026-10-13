// Pure helpers for the Studio's guides, rulers, placement targets, alignment and eraser. No Fabric, no DOM: logic-checks.mjs tests them.
// Units are canvas logical px unless a name says otherwise. Rulers speak only in % of the garment: VFRB sizing is never shown.
import { placementsFor } from './dsShared';

// ── One coordinate system: garment-relative. Origin = the garment's top-left; x in % of its width, y in % of its height. ──
// Grid, rulers, ruler guides, snapping and every readout use it, so grid lines land exactly on ruler ticks.

// ── Guide preferences (per viewer, remembered in this browser) ──
export const GUIDE_KEYS = ['grid', 'snap', 'rulers', 'centre', 'smart'];
export const GRID_PCTS = [5, 10, 20]; // grid cell in % of the garment: Fine, Medium, Coarse
export const GRID_LABEL = { 5: 'Fine · 5%', 10: 'Medium · 10%', 20: 'Coarse · 20%' };
// Visual guides start off (a clean garment); snapping and, on desktop, smart guides help without drawing anything until a drag.
export const guideDefaults = (phone = false) => ({ v: 2, grid: false, size: 10, snap: true, rulers: false, centre: false, smart: !phone });
// Stored prefs win; older shapes carry over: { grid, snap, size } (grid meant grid + rulers) and px sizes 10/20/40 (now 5/10/20 %).
export function readGuidePrefs(stored, phone = false) {
  const d = guideDefaults(phone);
  if (!stored || typeof stored !== 'object') return d;
  const g = { ...d, ...stored, v: 2 };
  if (!('rulers' in stored) && 'grid' in stored) g.rulers = !!stored.grid;
  if (stored.v !== 2 && 'size' in stored) g.size = { 10: 5, 20: 10, 40: 20 }[stored.size] ?? d.size;
  for (const k of GUIDE_KEYS) g[k] = !!g[k];
  if (!GRID_PCTS.includes(g.size)) g.size = d.size;
  return g;
}

// ── Grid ──
// Opacity factor for grid lines `spacingPx` apart on screen: full from 12 px, gone below 6 px (the grid fades at low zoom). Never
// drawing lines closer than 6 px matches the rulers' finest ticks, so a visible grid line always has a tick.
export const gridFade = spacingPx => Math.max(0, Math.min(1, (spacingPx - 6) / 6));
export const GRID_MAJOR_PCT = 50; // major lines at 0, 50, 100 (and -50, 150 …): the ruler labels these at every zoom
export const GRID_ALPHA = { minor: 0.1, major: 0.18 };
// Grid in canvas px: origin at the garment's top-left, cell = pct of the garment's width (x) and height (y).
export const gridSpec = (g, pct) => (g?.width > 0 && g?.height > 0 && pct > 0 ? { x0: g.left, y0: g.top, sx: (g.width * pct) / 100, sy: (g.height * pct) / 100, pct } : null);
// Grid lines along one axis across [from, to] (any units): value in %, position, and whether it is a major line (a multiple of
// GRID_MAJOR_PCT, so a major line always has a labelled ruler tick); the 50% centre line is a grid line at every size.
export function gridLines(origin, cell, pct, from, to) {
  if (!(cell > 0)) return [];
  const out = [];
  for (let k = Math.ceil((from - origin) / cell - 1e-9); origin + k * cell <= to + 1e-9; k++) out.push({ v: k * pct, at: origin + k * cell, major: (k * pct) % GRID_MAJOR_PCT === 0 });
  const half = origin + (50 / pct) * cell;
  if (half >= from && half <= to && !out.some(l => Math.abs(l.v - 50) < 1e-9)) out.push({ v: 50, at: half, major: true });
  return out.sort((a, b) => a.at - b.at);
}

// ── Rulers: % of the garment along the full stage edge (negative before the garment, beyond 100 after it) ──
const MINORS = [1, 5, 10, 25, 50];
const LABELS = [10, 25, 50, 100];
// Label every 10% when it fits (>= minLabelPx apart), otherwise 25/50/100, so 0, 50 and 100 are always labelled; minor ticks >= 6 px
// apart, dividing the label step and (from 5% up) every grid size, so each visible grid line lands on a tick.
export function relSteps(extentPx, minLabelPx = 36) {
  const per = extentPx / 100;
  const major = LABELS.find(m => m * per >= minLabelPx) ?? 100;
  const step = MINORS.find(s => major % s === 0 && s * per >= 6) ?? major;
  return { step, major };
}
// Ticks for a ruler `length` screen px long; screen = origin + canvas * scale; the garment spans [gStart, gStart + gSize] canvas px.
// Every whole multiple of the step that is on the ruler is marked, before 0 and after 100 too; 0, 50 and 100 are key ticks.
export function relativeTicks(origin, scale, length, gStart, gSize, minLabelPx = 36) {
  if (!(scale > 0) || !(gSize > 0)) return [];
  const { step, major } = relSteps(gSize * scale, minLabelPx);
  const g0 = origin + gStart * scale, per = (gSize * scale) / 100;
  const out = [];
  for (let k = Math.ceil(-g0 / per / step - 1e-9); g0 + k * step * per <= length + 1e-9; k++) {
    const v = k * step;
    out.push({ v, at: g0 + v * per, major: v % major === 0, key: v === 0 || v === 50 || v === 100 });
  }
  return out;
}
// Screen position <-> garment % along one axis (for the pointer marker and ruler guides).
export const toPct = (screen, origin, scale, gStart, gSize) => ((screen - origin - gStart * scale) / (gSize * scale)) * 100;
export const fromPct = (pct, origin, scale, gStart, gSize) => origin + (gStart + (pct / 100) * gSize) * scale;
// A ruler guide snaps to whole percent, and to the 50% centre within 1.5%.
export const snapGuidePct = v => (Math.abs(v - 50) <= 1.5 ? 50 : Math.round(v));
// Ruler guides (in %) as snap lines in canvas px.
export const guideLines = (g, guides = []) => (g?.width > 0 ? guides.map(x => ({ axis: x.axis, at: x.axis === 'v' ? g.left + (x.pct / 100) * g.width : g.top + (x.pct / 100) * g.height })) : []);

// ── Metrics: X, Y (top-left of the bounds), W, H in % of the garment, rotation in degrees; a multi-selection is its group bounds ──
export function metricsPct(o, g) {
  if (!o || !(g?.width > 0) || !(g?.height > 0)) return null;
  const b = o.getBoundingRect(), multi = o.type === 'activeselection';
  const n = multi ? (o.getObjects?.().length ?? 0) : 1;
  const w = multi ? b.width : Math.abs((o.width ?? 0) * (o.scaleX ?? 1)), h = multi ? b.height : Math.abs((o.height ?? 0) * (o.scaleY ?? 1));
  const r1 = v => Math.round(v * 10) / 10;
  return { x: r1(((b.left - g.left) / g.width) * 100), y: r1(((b.top - g.top) / g.height) * 100), w: r1((w / g.width) * 100), h: r1((h / g.height) * 100),
    r: multi ? 0 : Math.round(((o.angle ?? 0) % 360 + 360) % 360), n };
}
// Live readout while moving or resizing: X, Y, W, H (and rotation when turned), never canvas px or real units.
export function readoutPct(o, garment) {
  const m = metricsPct(o, garment);
  if (!m) return '';
  const f = v => `${Math.round(v)}%`;
  return `${m.n > 1 ? `${m.n} elements · ` : ''}X ${f(m.x)}  Y ${f(m.y)}  W ${f(m.w)}  H ${f(m.h)}${m.r ? `  ${m.r}°` : ''}`;
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
