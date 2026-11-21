// Ready-made layouts: original compositions of ordinary shape and text layers, placed by garment zone (fractions of the zone's box, so they
// fit any template that draws the zone). Every part lands as its own editable layer. A layout is offered only when its zone exists on the
// current garment and face AND the whole composition fits on the cloth (layoutFit); there is no cuff zone in any VFRB template, so no cuff layout.
import { inPoly, snapInside, boxesOverlap } from './zoneMap';
import type { Pt, Zone, ZoneSet, Box } from './zoneMap';

export const CATEGORIES = ['Left chest', 'Center chest', 'Full front', 'Back', 'Sleeve', 'Collar', 'Hem', 'Monogram', 'Badge', 'Woven bands', 'Floral', 'Geometric'] as const;
export type Category = (typeof CATEGORIES)[number];

// fx/fy: centre as a fraction of the zone box (fy of the zone height, or of its width when the layout has uw, so round motifs stay round).
// w: width as a fraction of the zone width (a text item's w is its font size). h: optional explicit height, same unit as fy.
export interface LayoutItem { kind: 'shape' | 'text'; shape?: string; text?: string; fx: number; fy: number; w: number; h?: number; angle?: number; color: string; name: string; font?: string }
export interface Layout { id: string; name: string; note: string; cat: Category; zone: string; face: 'front' | 'back' | 'any'; uw?: boolean; items: LayoutItem[] }
export interface Placed extends LayoutItem { x: number; y: number; width: number; height?: number; drawH: number; size: number }
export interface LayoutView { vb: [number, number, number, number]; poly: string; items: Placed[]; k: number }
export type OfferedLayout = Layout & { view: LayoutView };

const INK = '#1B2A4A', GOLD = '#C9A227', WHITE = '#FFFFFF', RED = '#B3262E', SAGE = '#4F7C5F';
const S = (shape: string, fx: number, fy: number, w: number, color: string, name: string, extra: Partial<LayoutItem> = {}): LayoutItem => ({ kind: 'shape', shape, fx, fy, w, color, name, ...extra });
const T = (text: string, fx: number, fy: number, w: number, color: string, name: string, font: string): LayoutItem => ({ kind: 'text', text, fx, fy, w, color, name, font });
const r2 = (n: number) => Math.round(n * 1000) / 1000;
// n petals of an ellipse flower around (cx, cy): long axis points outward.
const petals = (cx: number, cy: number, r: number, w: number, n: number, color: string): LayoutItem[] =>
  Array.from({ length: n }, (_, i) => { const a = -90 + (360 / n) * i, t = (a * Math.PI) / 180; return S('ellipse', r2(cx + r * Math.cos(t)), r2(cy + r * Math.sin(t)), w, color, 'Petal', { angle: a }); });
const row = (n: number, x0: number, dx: number, make: (i: number, fx: number) => LayoutItem): LayoutItem[] => Array.from({ length: n }, (_, i) => make(i, r2(x0 + dx * i)));

export const LAYOUTS: Layout[] = [
  { id: 'left-chest-emblem', name: 'Left chest emblem', note: 'Badge with initials, wearer’s left', cat: 'Left chest', zone: 'body', face: 'front', items: [
    S('badge', 0.7, 0.2, 0.2, INK, 'Emblem'), T('VFRB', 0.7, 0.2, 0.07, WHITE, 'Initials', 'Montserrat')] },
  { id: 'left-chest-seal', name: 'Left chest seal', note: 'Double ring with initials', cat: 'Left chest', zone: 'body', face: 'front', items: [
    S('circle', 0.7, 0.2, 0.17, GOLD, 'Outer ring'), S('circle', 0.7, 0.2, 0.14, INK, 'Disc'), T('AB', 0.7, 0.2, 0.055, WHITE, 'Initials', 'Montserrat')] },
  { id: 'left-chest-star', name: 'Left chest star', note: 'Gold star over a small title', cat: 'Left chest', zone: 'body', face: 'front', items: [
    S('star', 0.7, 0.19, 0.15, GOLD, 'Star'), T('TEAM', 0.7, 0.275, 0.045, INK, 'Title', 'Oswald')] },
  { id: 'center-chest-wordmark', name: 'Center chest wordmark', note: 'Name over a rule', cat: 'Center chest', zone: 'body', face: 'front', items: [
    T('YOUR NAME', 0.5, 0.3, 0.1, INK, 'Wordmark', 'Oswald'), S('line', 0.5, 0.37, 0.5, GOLD, 'Rule')] },
  { id: 'center-chest-stacked', name: 'Stacked title', note: 'Small line over a large name', cat: 'Center chest', zone: 'body', face: 'front', items: [
    T('SCHOOL', 0.5, 0.27, 0.07, INK, 'Top line', 'Oswald'), T('NAME', 0.5, 0.34, 0.12, INK, 'Name', 'Bebas Neue'), S('rect', 0.5, 0.405, 0.45, GOLD, 'Rule', { h: 0.008 })] },
  { id: 'center-chest-ribbon', name: 'Ribbon banner', note: 'Title on a ribbon', cat: 'Center chest', zone: 'body', face: 'front', items: [
    S('ribbon', 0.5, 0.3, 0.55, INK, 'Ribbon'), T('YOUR TEAM', 0.5, 0.3, 0.06, WHITE, 'Title', 'Montserrat')] },
  { id: 'full-front-crest', name: 'Full front crest', note: 'Large star crest with a title', cat: 'Full front', zone: 'body', face: 'front', items: [
    S('star', 0.5, 0.38, 0.5, GOLD, 'Crest'), T('TEAM', 0.5, 0.62, 0.12, INK, 'Title', 'Bebas Neue')] },
  { id: 'full-front-hex', name: 'Hexagon crest', note: 'Hexagon, star and title', cat: 'Full front', zone: 'body', face: 'front', items: [
    S('polygon', 0.5, 0.4, 0.6, INK, 'Hexagon'), S('star', 0.5, 0.4, 0.3, GOLD, 'Star'), T('ACADEMY', 0.5, 0.66, 0.09, INK, 'Title', 'Oswald')] },
  { id: 'back-name-number', name: 'Back name and number', note: 'Name above a big number', cat: 'Back', zone: 'body', face: 'back', items: [
    T('SURNAME', 0.5, 0.2, 0.09, INK, 'Surname', 'Oswald'), T('07', 0.5, 0.42, 0.3, INK, 'Number', 'Bebas Neue')] },
  { id: 'back-yoke-title', name: 'Back title', note: 'Short title across the upper back', cat: 'Back', zone: 'body', face: 'back', items: [
    T('SCHOOL · YEAR', 0.5, 0.16, 0.1, INK, 'Title', 'Montserrat')] },
  { id: 'back-crest-name', name: 'Back crest and name', note: 'Shield with star over a surname', cat: 'Back', zone: 'body', face: 'back', items: [
    S('badge', 0.5, 0.3, 0.4, INK, 'Shield'), S('star', 0.5, 0.28, 0.16, GOLD, 'Star'), T('SURNAME', 0.5, 0.56, 0.08, INK, 'Surname', 'Oswald')] },
  { id: 'sleeve-badge', name: 'Sleeve badge', note: 'Round badge on the sleeve', cat: 'Sleeve', zone: 'sleeveL', face: 'front', items: [
    S('circle', 0.5, 0.55, 0.4, RED, 'Sleeve badge')] },
  { id: 'sleeve-band', name: 'Sleeve band', note: 'Two bands near the hem', cat: 'Sleeve', zone: 'sleeveL', face: 'front', items: [
    S('rect', 0.5, 0.7, 0.8, INK, 'Band', { h: 0.08 }), S('rect', 0.5, 0.82, 0.8, GOLD, 'Thin band', { h: 0.04 })] },
  { id: 'sleeve-stars', name: 'Sleeve stars', note: 'Three stars in a row', cat: 'Sleeve', zone: 'sleeveL', face: 'front', items: row(3, 0.3, 0.2, (i, fx) => S('star', fx, 0.62, 0.15, GOLD, `Star ${i + 1}`)) },
  { id: 'collar-trim', name: 'Collar trim', note: 'Contrast stripe on the collar', cat: 'Collar', zone: 'collar', face: 'any', items: [
    S('rect', 0.5, 0.5, 0.8, GOLD, 'Collar trim', { h: 0.12 })] },
  { id: 'collar-double', name: 'Collar double stripe', note: 'Two thin stripes', cat: 'Collar', zone: 'collar', face: 'any', items: [
    S('rect', 0.5, 0.36, 0.8, INK, 'Upper stripe', { h: 0.07 }), S('rect', 0.5, 0.6, 0.8, GOLD, 'Lower stripe', { h: 0.07 })] },
  { id: 'hem-band', name: 'Hem decoration', note: 'Band and dots above the hem', cat: 'Hem', zone: 'body', face: 'any', items: [
    S('rect', 0.5, 0.92, 0.9, INK, 'Hem band', { h: 0.025 }), ...row(3, 0.25, 0.25, (_, fx) => S('circle', fx, 0.86, 0.03, GOLD, 'Dot'))] },
  { id: 'hem-triple', name: 'Triple hem stripe', note: 'Three stripes above the hem', cat: 'Hem', zone: 'body', face: 'any', items: [
    S('rect', 0.5, 0.86, 0.9, INK, 'Stripe 1', { h: 0.02 }), S('rect', 0.5, 0.9, 0.9, GOLD, 'Stripe 2', { h: 0.02 }), S('rect', 0.5, 0.94, 0.9, INK, 'Stripe 3', { h: 0.02 })] },
  { id: 'monogram', name: 'Monogram', note: 'Initials in a ring', cat: 'Monogram', zone: 'body', face: 'front', items: [
    S('circle', 0.5, 0.35, 0.28, INK, 'Ring'), T('AB', 0.5, 0.35, 0.1, WHITE, 'Initials', 'Montserrat')] },
  { id: 'monogram-shield', name: 'Shield monogram', note: 'Initials on a shield', cat: 'Monogram', zone: 'body', face: 'front', items: [
    S('badge', 0.5, 0.34, 0.3, INK, 'Shield'), T('AB', 0.5, 0.35, 0.1, GOLD, 'Initials', 'Oswald')] },
  { id: 'badge-heart', name: 'Heart badge', note: 'Solid heart', cat: 'Badge', zone: 'body', face: 'front', items: [
    S('heart', 0.5, 0.32, 0.3, RED, 'Heart')] },
  { id: 'badge-seal', name: 'Ribbon seal', note: 'Star seal over a ribbon', cat: 'Badge', zone: 'body', face: 'front', uw: true, items: [
    S('ribbon', 0.5, 0.5, 0.34, RED, 'Ribbon'), S('circle', 0.5, 0.4, 0.28, GOLD, 'Seal rim'), S('circle', 0.5, 0.4, 0.22, INK, 'Seal'), S('star', 0.5, 0.4, 0.12, GOLD, 'Seal star')] },
  { id: 'band-diamonds', name: 'Diamond band', note: 'Woven-style row of diamonds', cat: 'Woven bands', zone: 'body', face: 'any', items: [
    S('rect', 0.5, 0.55, 0.9, INK, 'Band', { h: 0.1 }), S('rect', 0.5, 0.5, 0.9, GOLD, 'Edge top', { h: 0.008 }), S('rect', 0.5, 0.6, 0.9, GOLD, 'Edge bottom', { h: 0.008 }),
    ...row(5, 0.2, 0.15, (_, fx) => S('rect', fx, 0.55, 0.06, GOLD, 'Diamond', { angle: 45 }))] },
  { id: 'band-chevrons', name: 'Chevron band', note: 'Alternating triangles', cat: 'Woven bands', zone: 'body', face: 'any', items: [
    S('rect', 0.5, 0.5, 0.9, GOLD, 'Edge top', { h: 0.008 }), S('rect', 0.5, 0.6, 0.9, GOLD, 'Edge bottom', { h: 0.008 }),
    ...row(6, 0.14, 0.144, (i, fx) => S('triangle', fx, 0.55, 0.1, i % 2 ? GOLD : INK, 'Chevron', { angle: i % 2 ? 180 : 0 }))] },
  { id: 'band-checks', name: 'Check band', note: 'Two rows of squares', cat: 'Woven bands', zone: 'body', face: 'any', uw: true, items: [
    ...row(6, 0.14, 0.144, (i, fx) => S('rect', fx, 0.8, 0.07, i % 2 ? GOLD : INK, 'Check')), ...row(6, 0.14, 0.144, (i, fx) => S('rect', fx, 0.8 + 0.07, 0.07, i % 2 ? INK : GOLD, 'Check'))] },
  { id: 'floral-bloom', name: 'Bloom', note: 'Five-petal flower with leaves', cat: 'Floral', zone: 'body', face: 'front', uw: true, items: [
    S('ellipse', 0.36, 0.78, 0.17, SAGE, 'Leaf', { angle: -35 }), S('ellipse', 0.64, 0.78, 0.17, SAGE, 'Leaf', { angle: 35 }),
    ...petals(0.5, 0.55, 0.1, 0.2, 5, RED), S('circle', 0.5, 0.55, 0.08, GOLD, 'Centre')] },
  { id: 'floral-sprig', name: 'Sprig', note: 'Stem, leaves and a bud', cat: 'Floral', zone: 'body', face: 'front', uw: true, items: [
    S('line', 0.5, 0.58, 0.4, SAGE, 'Stem', { angle: 90 }),
    ...[0.48, 0.58, 0.68].flatMap((y, i) => [S('ellipse', 0.4, y, 0.13 - i * 0.01, SAGE, 'Leaf', { angle: -30 }), S('ellipse', 0.6, y + 0.04, 0.13 - i * 0.01, SAGE, 'Leaf', { angle: 30 })]),
    S('circle', 0.5, 0.36, 0.08, RED, 'Bud')] },
  { id: 'geo-concentric', name: 'Concentric circles', note: 'Four rings in two colours', cat: 'Geometric', zone: 'body', face: 'front', uw: true, items: [
    S('circle', 0.5, 0.5, 0.42, INK, 'Ring 1'), S('circle', 0.5, 0.5, 0.31, GOLD, 'Ring 2'), S('circle', 0.5, 0.5, 0.2, INK, 'Ring 3'), S('circle', 0.5, 0.5, 0.09, GOLD, 'Core')] },
  { id: 'geo-hex-star', name: 'Hexagon star', note: 'Star inside a hexagon', cat: 'Geometric', zone: 'body', face: 'front', uw: true, items: [
    S('polygon', 0.5, 0.5, 0.42, INK, 'Hexagon'), S('star', 0.5, 0.5, 0.3, GOLD, 'Star'), S('circle', 0.5, 0.5, 0.08, INK, 'Core')] },
  { id: 'geo-diagonals', name: 'Diagonal stripes', note: 'Three slanted bars', cat: 'Geometric', zone: 'body', face: 'front', uw: true, items: [
    S('rect', 0.5, 0.45, 0.6, INK, 'Bar 1', { h: 0.06, angle: -30 }), S('rect', 0.5, 0.55, 0.6, GOLD, 'Bar 2', { h: 0.06, angle: -30 }), S('rect', 0.5, 0.65, 0.6, INK, 'Bar 3', { h: 0.06, angle: -30 })] },
];

// h/w of each factory shape at its natural aspect (overlayTools.makeShape); only used to size the fit test and the preview.
const ASPECT: Record<string, number> = { ellipse: 0.63, triangle: 0.875, star: 0.95, arrow: 0.57, heart: 0.97, badge: 1.25, bubble: 0.85, ribbon: 0.545, roundrect: 0.78 };
const LINE_PX = 4, TEXT_W = 0.6, TEXT_H = 1.2, MIN_K = 0.5;

// Axis-aligned bounds of a rotated item's probe points.
export const aabb = (pts: Pt[]): Box => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), l = Math.min(...xs), t = Math.min(...ys); return { l, t, w: Math.max(...xs) - l, h: Math.max(...ys) - t }; };
const unitH = (l: Layout, b: Zone['box']) => (l.uw ? b.w : b.h);
function extent(it: LayoutItem, l: Layout, b: Zone['box']) {
  if (it.kind === 'text') { const fs = Math.max(8, it.w * b.w); return { w: Math.max(1, it.text?.length ?? 1) * TEXT_W * fs, h: TEXT_H * fs, fs }; }
  const w = it.w * b.w;
  return { w, h: it.h != null ? it.h * unitH(l, b) : it.shape === 'line' ? LINE_PX : w * (ASPECT[it.shape ?? ''] ?? 1), fs: 0 };
}
// Corners and edge midpoints of a rotated rectangle: every one must be on the cloth.
export function probe(cx: number, cy: number, w: number, h: number, deg: number): Pt[] {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), pts: Pt[] = [];
  for (const [u, v] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) pts.push([cx + (u * w * c - v * h * s) / 2, cy + (u * w * s + v * h * c) / 2]);
  return pts;
}

// Lays the whole composition out on the zone. It starts at the layout's nominal centre (snapped onto the cloth) and shrinks about it, down to
// MIN_K. When that shrinks it a lot (a collar ring, a slanted sleeve), nearby anchor points on the cloth are tried too and the least
// drift + shrink wins. Every item's rotated bounds must lie on the cloth; otherwise the layout is refused, not placed.
const GRID = 14, KEEP_K = 0.75, DRIFT = 0.5, DRIFT_COST = 0.6;
export function layoutFit(layout: Layout, zones: ZoneSet, snap: (z: Zone, c: Pt) => Pt = snapInside): { k: number; items: Placed[] } | null {
  const z = zones[layout.zone];
  if (!z) return null;
  const b = z.box, uh = unitH(layout, b);
  const base = layout.items.map(it => ({ it, e: extent(it, layout, b), cx: b.l + it.fx * b.w, cy: b.t + it.fy * uh }));
  const rects = base.flatMap(p => probe(p.cx, p.cy, p.e.w, p.e.h, p.it.angle ?? 0));
  const o: Pt = [(Math.min(...rects.map(p => p[0])) + Math.max(...rects.map(p => p[0]))) / 2, (Math.min(...rects.map(p => p[1])) + Math.max(...rects.map(p => p[1]))) / 2];
  const at = (a: Pt, k: number): Placed[] | null => {
    const items: Placed[] = base.map(({ it, e, cx, cy }) => ({ ...it, x: a[0] + k * (cx - o[0]), y: a[1] + k * (cy - o[1]), width: e.w * k, height: it.h != null ? it.h * uh * k : undefined, drawH: e.h * k, size: it.kind === 'text' ? Math.max(8, Math.round(e.fs * k)) : 0 }));
    return items.every(p => fits(p)) ? items : null;
  };
  // Every item's whole rotated bounds must be on the cloth AND clear of the placket and buttons (never just its centre point).
  const fits = (p: Placed) => { const pts = probe(p.x, p.y, p.width, p.drawH, p.angle ?? 0); return pts.every(pt => inPoly(z.poly, pt)) && !(z.avoid?.length && z.avoid.some(a => boxesOverlap(a, aabb(pts)))); };
  const ks: number[] = []; for (let k = 1; k >= MIN_K - 1e-9; k = Math.round((k - 0.05) * 100) / 100) ks.push(k);
  const a0 = snap(z, o);
  let best: { k: number; items: Placed[]; cost: number } | null = null;
  for (const k of ks) { const items = at(a0, k); if (items) { best = { k, items, cost: 1 - k }; break; } }
  if (best && best.k >= KEEP_K) return { k: best.k, items: best.items };
  const D = Math.max(b.w, b.h) * DRIFT, near: Pt[] = [];
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) { const p: Pt = [b.l + (b.w * (i + 0.5)) / GRID, b.t + (b.h * (j + 0.5)) / GRID], d = Math.hypot(p[0] - a0[0], p[1] - a0[1]); if (d <= D && inPoly(z.poly, p)) near.push(p); }
  near.sort((p, q) => Math.hypot(p[0] - a0[0], p[1] - a0[1]) - Math.hypot(q[0] - a0[0], q[1] - a0[1]));
  for (const k of ks) for (const p of near) {
    const cost = 1 - k + (DRIFT_COST * Math.hypot(p[0] - a0[0], p[1] - a0[1])) / D;
    if (best && cost >= best.cost) break;
    const items = at(p, k);
    if (items) { best = { k, items, cost }; break; }
  }
  return best ? { k: best.k, items: best.items } : null;
}

// Absolute canvas placement for each item. Sizes are fractions of the zone width, so nothing is invented in mm.
export const layoutPlacement = (layout: Layout, zones: ZoneSet, snap: (z: Zone, c: Pt) => Pt = snapInside): Placed[] => layoutFit(layout, zones, snap)?.items ?? [];

const mirrored = (l: Layout): Layout => ({ ...l, id: `${l.id}-right`, name: `${l.name} (right)`, zone: 'sleeveR',
  items: l.items.map(it => ({ ...it, fx: r2(1 - it.fx), angle: it.angle ? -it.angle : it.angle })) });

const cache = new WeakMap<ZoneSet, Map<string, OfferedLayout[]>>();
// What can be offered here: zone present, face matches, and the whole composition fits. The right sleeve gets a mirrored copy of each left-sleeve layout.
export function layoutsFor(zones: ZoneSet | null, face: string): OfferedLayout[] {
  if (!zones) return [];
  let byFace = cache.get(zones);
  if (!byFace) cache.set(zones, byFace = new Map());
  const hit = byFace.get(face);
  if (hit) return hit;
  const pool = LAYOUTS.flatMap(l => l.zone === 'sleeveL' && zones.sleeveR ? [l, mirrored(l)] : [l]);
  const out: OfferedLayout[] = [];
  for (const l of pool) {
    if (!zones[l.zone] || !(l.face === 'any' || l.face === face)) continue;
    const fit = layoutFit(l, zones);
    if (!fit) continue;
    const bx = zones[l.zone].box, pad = Math.max(bx.w, bx.h) * 0.04;
    out.push({ ...l, view: { vb: [bx.l - pad, bx.t - pad, bx.w + pad * 2, bx.h + pad * 2], poly: zones[l.zone].poly.map(p => `${p[0]},${p[1]}`).join(' '), items: fit.items, k: fit.k } });
  }
  byFace.set(face, out);
  return out;
}

export const matchesLayout = (l: Layout, q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = `${l.name} ${l.note} ${l.cat} ${l.items.map(i => `${i.shape ?? ''} ${i.text ?? ''}`).join(' ')}`.toLowerCase();
  return s.split(/\s+/).every(w => hay.includes(w));
};
