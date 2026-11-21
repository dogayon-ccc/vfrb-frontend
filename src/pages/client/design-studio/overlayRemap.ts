// Garment switch: each garment has its own artboard size, so overlays keep their share of the artboard, not their pixels.
// Position scales per axis (x by w, y by h); size scales by the smaller ratio so artwork never stretches. Rotation is untouched.
export interface Size { w: number; h: number }
export interface Box { left?: number; top?: number; scaleX?: number; scaleY?: number }

export function remapBox(b: Box, from: Size, to: Size): Required<Box> {
  const rx = to.w / from.w, ry = to.h / from.h, k = Math.min(rx, ry);
  return { left: (b.left ?? 0) * rx, top: (b.top ?? 0) * ry, scaleX: (b.scaleX ?? 1) * k, scaleY: (b.scaleY ?? 1) * k };
}

import { mapOne, type Resolve, type Place } from './zoneMap.ts';

export const sameSize = (a: Size | null, b: Size) => !!a && a.w === b.w && a.h === b.h;

// Share-of-artboard remap: the rule for artwork outside every zone, for legacy designs and for garments whose zones cannot be resolved.
const share = (p: Place, from: Size, to: Size): Place => (from.w > 0 && from.h > 0 && to.w > 0 && to.h > 0 ? remapBox(p, from, to) : p);

// Saved overlays carry the artboard they were drawn on (__ab: size, garment key, face). front/back share a key so they never remap; no __ab =
// legacy, loaded as-is. With a zone resolver the overlay follows its garment zone (see zoneMap.ts); without one it keeps its share of the artboard.
export interface Artboard extends Size { key: string; face?: string }
export const stampArtboard = (plain: any, ab: Artboard | null) => (ab ? { ...plain, __ab: { w: ab.w, h: ab.h, key: ab.key, face: ab.face ?? 'front' } } : plain);

export function remapPlain(list: any[], to: Artboard | null, resolve?: Resolve): any[] {
  if (!to || !Array.isArray(list)) return list;
  return list.map((o) => {
    const from = o?.__ab;
    if (!from || from.key === to.key || !(from.w > 0 && from.h > 0)) return o;
    if (!resolve) {
      if (sameSize(from, to)) return { ...o, __ab: { w: to.w, h: to.h, key: to.key, face: to.face ?? 'front' } };
      return { ...o, ...remapBox(o, from, to), __ab: { w: to.w, h: to.h, key: to.key, face: to.face ?? 'front' } };
    }
    return { ...o, ...mapOne(o, from, to, resolve, share).patch };
  });
}

// Live Fabric objects: everything that is not garment base or hover glow follows the new garment. Returns how many were moved or parked.
export function remapOverlays(canvas: any, from: Artboard, to: Artboard, resolve?: Resolve): number {
  if (!resolve && (!(from.w > 0 && from.h > 0 && to.w > 0 && to.h > 0) || sameSize(from, to))) return 0;
  let n = 0;
  for (const o of canvas.getObjects()) {
    if (o.__garmentBase || o.__hoverGlow) continue;
    if (!resolve) { o.set(remapBox(o, from, to)); o.setCoords(); n++; continue; }
    const { patch } = mapOne(o, from, to, resolve, share);
    if (patch.__unmapped && canvas.getActiveObject?.() === o) canvas.discardActiveObject?.();
    o.set(patch); o.setCoords(); n++;
  }
  if (n) canvas.requestRenderAll?.();
  return n;
}
