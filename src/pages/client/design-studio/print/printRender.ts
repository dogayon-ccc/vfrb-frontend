// Renders ONE saved overlay (image, text, shape or drawing) alone onto a transparent canvas at an exact pixel width, un-rotated and
// cropped to its own bounds: that file is what goes to the print shop. Browser only (Fabric + canvas).
import { reviveOverlays } from '../overlayTools';

const MAX_SIDE = 16000; // browsers refuse larger canvases

const bytesOf = (dataUrl: string) => Uint8Array.from(atob(dataUrl.split(',')[1]), ch => ch.charCodeAt(0));

export async function renderPrintPng(json: any, widthPx: number): Promise<{ bytes: Uint8Array; w: number; h: number } | null> {
  const mod: any = await import('fabric');
  const fabric = mod.fabric ?? mod.default ?? mod;
  const [o] = await reviveOverlays(await fabric.util.enlivenObjects([{ ...json, angle: 0, visible: true, globalCompositeOperation: 'source-over' }]));
  if (!o) return null;
  o.set({ originX: 'left', originY: 'top', left: 0, top: 0 }); o.setCoords();
  let r = o.getBoundingRect();
  if (!(r.width > 0) || !(r.height > 0)) return null;
  const f = widthPx / r.width;
  o.set({ scaleX: (o.scaleX ?? 1) * f, scaleY: (o.scaleY ?? 1) * f }); o.setCoords();
  r = o.getBoundingRect();
  o.set({ left: o.left - r.left, top: o.top - r.top }); o.setCoords();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (w > MAX_SIDE || h > MAX_SIDE) return null;
  const el = document.createElement('canvas');
  const canvas = new fabric.StaticCanvas(el, { width: w, height: h, renderOnAddRemove: false, enableRetinaScaling: false });
  canvas.add(o); canvas.renderAll();
  const url = canvas.toDataURL({ format: 'png', multiplier: 1 });
  canvas.dispose?.();
  return { bytes: bytesOf(url), w, h };
}
