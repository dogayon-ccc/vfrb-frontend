// "Place at" quick placement: named spots on the drawn garment, from the template's own zones (never physical measurements).
// A spot is offered only when the template draws the zone it needs, and a spot the closure hardware would cover is reported as blocked.
import { snapInside, centerOf, boxesOverlap, inPoly, type Box, type Pt, type ZoneSet } from './zoneMap.ts';

export type SpotId = 'chest' | 'left-chest' | 'front-bottom' | 'back' | 'back-neck' | 'right-sleeve' | 'left-sleeve';
export interface Spot { id: SpotId; label: string; face: 'front' | 'back'; zone: string; cx: number; cy: number; maxW: number; maxH: number }
export interface SpotState extends Spot { ok: boolean; reason?: string }

// Spots in the order they are shown. fx/fy are shares of the zone's box; cap* limit the artwork to a share of that box.
const DEFS: Array<{ id: SpotId; label: string; face: 'front' | 'back'; zone: string; fx: number; fy: number; capW: number; capH: number }> = [
  { id: 'chest', label: 'Chest', face: 'front', zone: 'body', fx: 0.5, fy: 0.3, capW: 0.42, capH: 0.3 },
  { id: 'left-chest', label: 'Left chest', face: 'front', zone: 'body', fx: 0.68, fy: 0.2, capW: 0.18, capH: 0.14 },
  { id: 'front-bottom', label: 'Front bottom', face: 'front', zone: 'body', fx: 0.5, fy: 0.78, capW: 0.42, capH: 0.2 },
  { id: 'back', label: 'Back', face: 'back', zone: 'body', fx: 0.5, fy: 0.38, capW: 0.6, capH: 0.45 },
  { id: 'back-neck', label: 'Back neck', face: 'back', zone: 'body', fx: 0.5, fy: 0.09, capW: 0.24, capH: 0.1 },
  { id: 'right-sleeve', label: 'Right sleeve', face: 'front', zone: 'sleeveR', fx: 0.5, fy: 0.5, capW: 0.7, capH: 0.4 },
  { id: 'left-sleeve', label: 'Left sleeve', face: 'front', zone: 'sleeveL', fx: 0.5, fy: 0.5, capW: 0.7, capH: 0.4 },
];

// Spots for one face of one garment. Sleeves exist on both faces when the template draws them; the rest follow their own face.
export function spotsFor(zones: ZoneSet | null, face: string): Spot[] {
  if (!zones) return [];
  const out: Spot[] = [];
  for (const d of DEFS) {
    const isSleeve = d.zone !== 'body';
    if (!isSleeve && d.face !== face) continue;
    const z = zones[d.zone]; if (!z) continue;
    const b = z.box, [cx, cy] = snapInside(z, [b.l + b.w * d.fx, b.t + b.h * d.fy]);
    out.push({ id: d.id, label: d.label, face: face === 'back' ? 'back' : 'front', zone: d.zone, cx, cy, maxW: b.w * d.capW, maxH: b.h * d.capH });
  }
  return out;
}

// Size the artwork would have at a spot: never enlarged, shrunk to the spot's cap.
export function fitScale(w: number, h: number, s: Spot) { return Math.min(1, s.maxW / Math.max(w, 1), s.maxH / Math.max(h, 1)); }

// The artwork's box at a spot (unrotated), and whether the closure keep-out or the cloth edge spoils it.
export function checkSpot(zones: ZoneSet, s: Spot, w: number, h: number): SpotState {
  const k = fitScale(w, h, s), bw = w * k, bh = h * k;
  const box: Box = { l: s.cx - bw / 2, t: s.cy - bh / 2, w: bw, h: bh };
  const z = zones[s.zone];
  const avoid = z?.avoid ?? [];
  if (avoid.some(a => boxesOverlap(a, box))) return { ...s, ok: false, reason: 'The placket and buttons are in the way. Pick another spot or move it by hand.' };
  const corners: Pt[] = [[box.l, box.t], [box.l + bw, box.t], [box.l, box.t + bh], [box.l + bw, box.t + bh]];
  if (z && !corners.every(c => inPoly(z.poly, c))) return { ...s, ok: false, reason: 'It would hang off the cloth here. Make it smaller first.' };
  return { ...s, ok: true };
}

// Fabric patch that puts an object (any origin) centred on the spot at its fitted size. Same shape as zoneMap.placeInZone.
export function placeAtPatch(o: any, s: Spot) {
  const w = (o.width ?? 1) * (o.scaleX ?? 1), h = (o.height ?? 1) * (o.scaleY ?? 1), k = fitScale(w, h, s), nw = w * k, nh = h * k;
  const left = o.originX === 'center' ? s.cx : o.originX === 'right' ? s.cx + nw / 2 : s.cx - nw / 2;
  const top = o.originY === 'center' ? s.cy : o.originY === 'bottom' ? s.cy + nh / 2 : s.cy - nh / 2;
  return { left, top, scaleX: (o.scaleX ?? 1) * k, scaleY: (o.scaleY ?? 1) * k, __zone: s.zone, __unmapped: false, __origin: null };
}

export const spotCentre = (o: any): Pt => centerOf(o);
