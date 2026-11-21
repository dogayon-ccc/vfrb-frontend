// Zone-aware garment switch. Overlays are free-floating Fabric objects; on a garment change each one is mapped by the garment zone it sits in
// (body, collar, sleeveL, sleeveR, pocket), never by raw artboard share. An object whose zone the new garment does not draw is parked, hidden
// but still saved, as Unmapped Artwork, and returns exactly when its home garment comes back. Nothing is ever deleted here.
// Zones are the template's own approximate pixel artboards: no physical scale is implied.
export type Pt = [number, number];
export interface Box { l: number; t: number; w: number; h: number }
// avoid: closure hardware drawn on the zone (placket band, buttons) that ready-made layouts must keep clear of. Only the body carries it.
export interface Zone { key: string; poly: Pt[]; box: Box; avoid?: Box[] }
export type ZoneSet = Record<string, Zone>;
export interface Place { left: number; top: number; scaleX: number; scaleY: number }
export interface Origin { key: string; face: string; zone: string | null; pos: Place; visible: boolean; applied: Place; ab: { w: number; h: number } }
export interface Ab { w: number; h: number; key: string; face?: string }
export type Resolve = (key: string, face: string) => ZoneSet | null;

// Hit priority: small zones first, because the body's box covers the collar, pocket and most of the sleeves.
export const ZONE_KEYS = ['pocket', 'collar', 'sleeveL', 'sleeveR', 'body'] as const;
export const ZONE_LABEL: Record<string, string> = { body: 'Body', collar: 'Collar', sleeveL: 'Left sleeve', sleeveR: 'Right sleeve', pocket: 'Pocket' };

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
// Flatten an SVG path (M L H V Q C Z, absolute or relative) to a polygon; curves are sampled, other commands contribute their end point.
export function flattenPath(d: string): Pt[] {
  const pts: Pt[] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  const push = (a: number, b: number) => { pts.push([a, b]); x = a; y = b; };
  for (const m of String(d ?? '').matchAll(/([a-z])([^a-z]*)/gi)) {
    const c = m[1], rel = c === c.toLowerCase(), n = (m[2].match(NUM) ?? []).map(Number), K = c.toUpperCase();
    if (K === 'Z') { push(sx, sy); continue; }
    const step = K === 'M' || K === 'L' ? 2 : K === 'H' || K === 'V' ? 1 : K === 'Q' ? 4 : K === 'C' ? 6 : K === 'A' ? 7 : 2;
    for (let i = 0; i + step <= n.length; i += step) {
      const bx = rel ? x : 0, by = rel ? y : 0;
      if (K === 'M') { push(n[i] + bx, n[i + 1] + by); if (i === 0) { sx = x; sy = y; } }
      else if (K === 'L') push(n[i] + bx, n[i + 1] + by);
      else if (K === 'H') push(n[i] + bx, y);
      else if (K === 'V') push(x, n[i] + by);
      else if (K === 'Q') { const [x0, y0] = [x, y], cx = n[i] + bx, cy = n[i + 1] + by, ex = n[i + 2] + bx, ey = n[i + 3] + by;
        for (let s = 1; s <= 8; s++) { const u = s / 8, v = 1 - u; pts.push([v * v * x0 + 2 * v * u * cx + u * u * ex, v * v * y0 + 2 * v * u * cy + u * u * ey]); } x = ex; y = ey; }
      else if (K === 'C') { const [x0, y0] = [x, y], c1 = [n[i] + bx, n[i + 1] + by], c2 = [n[i + 2] + bx, n[i + 3] + by], ex = n[i + 4] + bx, ey = n[i + 5] + by;
        for (let s = 1; s <= 8; s++) { const u = s / 8, v = 1 - u; pts.push([v ** 3 * x0 + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * ex, v ** 3 * y0 + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * ey]); } x = ex; y = ey; }
      else push(n[i + step - 2] + bx, n[i + step - 1] + by);
    }
  }
  return pts;
}

const boxOf = (poly: Pt[]) => {
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), l = Math.min(...xs), t = Math.min(...ys);
  return { l, t, w: Math.max(...xs) - l, h: Math.max(...ys) - t };
};

// The zones a template really draws: only keys with a path. A garment with no sleeve path has no sleeve zone.
export function zonesOf(paths: any): ZoneSet {
  const out: ZoneSet = {};
  for (const key of ZONE_KEYS) {
    const d = paths?.[key];
    if (typeof d !== 'string' || !d) continue;
    const poly = flattenPath(d);
    if (poly.length < 3) continue;
    const box = boxOf(poly);
    if (box.w > 0 && box.h > 0) out[key] = { key, poly, box };
  }
  if (out.body) { const avoid = closureBoxes(paths?.details, out.body.box); if (avoid.length) out.body.avoid = avoid; }
  return out;
}

// Placket and buttons from the template's own detail strokes: every button, plus any tall narrow line shape near the centre line
// (the placket outline). Padded a little so artwork never touches the stitching. Nothing is invented: no detail, no keep-out.
const PAD = 3;
export function closureBoxes(details: any, body: Box): Box[] {
  if (!Array.isArray(details)) return [];
  const out: Box[] = [];
  for (const d of details) {
    if (!d || typeof d.d !== 'string' || (d.kind !== 'button' && d.kind !== 'line')) continue;
    const poly = flattenPath(d.d); if (poly.length < 2) continue;
    const b = boxOf(poly), cx = b.l + b.w / 2;
    const placket = d.kind === 'line' && b.h > 0 && b.h >= Math.max(b.w, 1) * 2.5 && b.w <= body.w * 0.2 && cx > body.l + body.w * 0.35 && cx < body.l + body.w * 0.65;
    if (d.kind === 'button' || placket) out.push({ l: b.l - PAD, t: b.t - PAD, w: b.w + PAD * 2, h: b.h + PAD * 2 });
  }
  return out;
}
export const boxesOverlap = (a: Box, b: Box) => a.l < b.l + b.w && b.l < a.l + a.w && a.t < b.t + b.h && b.t < a.t + a.h;

export function inPoly(poly: Pt[], [px, py]: Pt): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const inBox = (b: Zone['box'], [x, y]: Pt) => x >= b.l && x <= b.l + b.w && y >= b.t && y <= b.t + b.h;

export function zoneAtPoint(zones: ZoneSet, p: Pt): string | null {
  for (const k of ZONE_KEYS) if (zones[k] && inPoly(zones[k].poly, p)) return k;
  return null;
}

const pos = (o: any): Place => ({ left: o.left ?? 0, top: o.top ?? 0, scaleX: o.scaleX ?? 1, scaleY: o.scaleY ?? 1 });
const same = (a: Place, b: Place) => Math.abs(a.left - b.left) < 1e-6 && Math.abs(a.top - b.top) < 1e-6 && Math.abs(a.scaleX - b.scaleX) < 1e-9 && Math.abs(a.scaleY - b.scaleY) < 1e-9;

// The object's visual centre from its anchor (left/top at originX/originY) and scaled size. Rotation is ignored: only used to pick a zone.
export function centerOf(o: any): Pt {
  const w = (o.width ?? 0) * (o.scaleX ?? 1), h = (o.height ?? 0) * (o.scaleY ?? 1);
  const x = o.left ?? 0, y = o.top ?? 0;
  return [o.originX === 'center' ? x : o.originX === 'right' ? x - w / 2 : x + w / 2, o.originY === 'center' ? y : o.originY === 'bottom' ? y - h / 2 : y + h / 2];
}

// Zone an object sits in. A stored __zone wins while the centre is still inside that zone's box, so a hop to another garment and back
// cannot lose it at the polygon edge; a customer who dragged it elsewhere is detected afresh.
function zoneFor(o: any, zones: ZoneSet): string | null {
  const c = centerOf(o), z = o.__zone;
  if (typeof z === 'string' && zones[z] && inBox(zones[z].box, c)) return z;
  return zoneAtPoint(zones, c);
}

// Where `from` (its anchor and size) lands when the zone box `a` becomes `b`: relative position kept, size by the smaller ratio, never stretched.
// The point of the zone nearest `c` that is really on the cloth: a zone's box can hold gaps (the space between trouser legs, a collar's neck opening).
export function snapInside(zone: Zone, c: Pt): Pt {
  if (inPoly(zone.poly, c)) return c;
  const { l, t, w, h } = zone.box; let best: Pt = [l + w / 2, t + h / 2], bd = Infinity;
  for (let i = 0; i <= 32; i++) for (let j = 0; j <= 32; j++) {
    const p: Pt = [l + (w * i) / 32, t + (h * j) / 32];
    if (!inPoly(zone.poly, p)) continue;
    const d = Math.hypot(p[0] - c[0], p[1] - c[1]); if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function carry(o: any, from: Place, a: Zone, bz: Zone): Place {
  const b = bz.box, c = centerOf({ ...o, ...from }), k = Math.min(b.w / a.box.w, b.h / a.box.h);
  const nc = snapInside(bz, [b.l + ((c[0] - a.box.l) / a.box.w) * b.w, b.t + ((c[1] - a.box.t) / a.box.h) * b.h]);
  return { left: nc[0] + (from.left - c[0]) * k, top: nc[1] + (from.top - c[1]) * k, scaleX: from.scaleX * k, scaleY: from.scaleY * k };
}

export interface Patch extends Partial<Place> { visible?: boolean; __zone?: string | null; __unmapped?: boolean; __origin?: Origin | null; __ab?: Ab }
export type Outcome = 'kept' | 'mapped' | 'parked' | 'restored' | 'free';

// Core rule for one overlay (plain JSON or live Fabric object). `src` is the artboard the object was last placed on (its __ab stamp, or the
// live canvas's previous artboard). Returns the props to set and what happened; never throws for missing geometry (then it falls back to
// the share-of-artboard remap through `legacy`, so legacy designs and unknown garments keep loading as they did).
export function mapOne(o: any, src: Ab, dst: Ab, resolve: Resolve, legacy: (p: Place, from: Ab, to: Ab) => Place): { patch: Patch; outcome: Outcome } {
  const stamp = { w: dst.w, h: dst.h, key: dst.key, face: dst.face ?? 'front' };
  const dstZ = resolve(dst.key, stamp.face);
  const home: Origin | undefined = o.__origin;
  const untouched = !!home && same(pos(o), home.applied);
  // Untouched since the last mapping: always map from the HOME placement, so any chain of switches comes back exact.
  if (home && untouched) {
    const hc = { ...o, ...home.pos };
    if (home.key === dst.key && (home.face ?? 'front') === stamp.face) return { patch: { ...home.pos, visible: home.visible, __zone: home.zone, __unmapped: false, __origin: null, __ab: stamp }, outcome: 'restored' };
    const srcZ = resolve(home.key, home.face ?? 'front');
    const z = home.zone;
    if (srcZ && dstZ && z && srcZ[z] && dstZ[z]) {
      const p = carry(hc, home.pos, srcZ[z], dstZ[z]);
      return { patch: { ...p, visible: home.visible, __zone: z, __unmapped: false, __origin: { ...home, applied: p }, __ab: stamp }, outcome: 'mapped' };
    }
    if ((srcZ && dstZ && z) || o.__unmapped) return { patch: { __unmapped: true, visible: false, __ab: stamp }, outcome: 'parked' };
    // home zone unknown (free artwork): share-of-artboard from the home artboard
    const p = legacy(home.pos, { w: home.ab.w, h: home.ab.h, key: home.key }, dst);
    return { patch: { ...p, visible: home.visible, __origin: { ...home, applied: p }, __ab: stamp }, outcome: 'free' };
  }
  const srcZ = resolve(src.key, src.face ?? 'front');
  const here = pos(o), visible = o.visible !== false, face = src.face ?? 'front', sab = { w: src.w, h: src.h };
  const homeOf = (zone: string | null, applied: Place): Origin => ({ key: src.key, face, zone, pos: here, visible, applied, ab: sab });
  if (!srcZ || !dstZ) { const p = legacy(here, src, dst); return { patch: { ...p, __origin: homeOf(null, p), __ab: stamp }, outcome: 'free' }; }
  const z = zoneFor(o, srcZ);
  if (!z) { const p = legacy(here, src, dst); return { patch: { ...p, __zone: null, __origin: homeOf(null, p), __ab: stamp }, outcome: 'free' }; }
  if (!dstZ[z]) return { patch: { __zone: z, __unmapped: true, visible: false, __origin: homeOf(z, here), __ab: stamp }, outcome: 'parked' };
  const p = carry(o, here, srcZ[z], dstZ[z]);
  return { patch: { ...p, __zone: z, __unmapped: false, __origin: homeOf(z, p), __ab: stamp }, outcome: 'mapped' };
}

// Reassign parked artwork onto a zone of the current garment, centred and shrunk (never enlarged) to fit inside it. Home stays recorded.
export function placeInZone(o: any, zone: Zone): Patch {
  const w = (o.width ?? 1) * (o.scaleX ?? 1), h = (o.height ?? 1) * (o.scaleY ?? 1);
  const k = Math.min(1, (zone.box.w * 0.6) / Math.max(w, 1), (zone.box.h * 0.6) / Math.max(h, 1));
  const [cx, cy] = snapInside(zone, [zone.box.l + zone.box.w / 2, zone.box.t + zone.box.h / 2]), nw = w * k, nh = h * k;
  const left = o.originX === 'center' ? cx : o.originX === 'right' ? cx + nw / 2 : cx - nw / 2;
  const top = o.originY === 'center' ? cy : o.originY === 'bottom' ? cy + nh / 2 : cy - nh / 2;
  const p = { left, top, scaleX: (o.scaleX ?? 1) * k, scaleY: (o.scaleY ?? 1) * k };
  // The customer chose this placement: it becomes the object's own, so later switches carry it by zone instead of snapping it back home.
  return { ...p, visible: o.__origin?.visible ?? true, __zone: zone.key, __unmapped: false, __origin: null };
}
