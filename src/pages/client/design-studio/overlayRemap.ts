// Garment switch: each garment has its own artboard size, so overlays keep their share of the artboard, not their pixels.
// Position scales per axis (x by w, y by h); size scales by the smaller ratio so artwork never stretches. Rotation is untouched.
export interface Size { w: number; h: number }
export interface Box { left?: number; top?: number; scaleX?: number; scaleY?: number }

export function remapBox(b: Box, from: Size, to: Size): Required<Box> {
  const rx = to.w / from.w, ry = to.h / from.h, k = Math.min(rx, ry);
  return { left: (b.left ?? 0) * rx, top: (b.top ?? 0) * ry, scaleX: (b.scaleX ?? 1) * k, scaleY: (b.scaleY ?? 1) * k };
}

export const sameSize = (a: Size | null, b: Size) => !!a && a.w === b.w && a.h === b.h;

// Live Fabric objects: everything that is not garment base or hover glow moves with the new artboard.
export function remapOverlays(canvas: any, from: Size, to: Size): number {
  if (!(from.w > 0 && from.h > 0 && to.w > 0 && to.h > 0) || sameSize(from, to)) return 0;
  let n = 0;
  for (const o of canvas.getObjects()) {
    if (o.__garmentBase || o.__hoverGlow) continue;
    o.set(remapBox(o, from, to)); o.setCoords(); n++;
  }
  if (n) canvas.requestRenderAll?.();
  return n;
}
