// Named placement spots on the baked garment's flat panels, derived from the authored panel outlines (never from measurements).
// A spot exists only when the panels it needs are drawn on that side. Canvas px, origin top-left, x mirrored like the bake canvas.
import { bboxOf, frameSize, type Frame, type PanelSide, type SvgPanel } from './pilotPanels.ts';

export type PanelSpotId = 'chest' | 'chest-wearer-left' | 'chest-wearer-right' | 'lower-front' | 'upper-back' | 'back-centre' | 'lower-back' | 'sleeve-wearer-left' | 'sleeve-wearer-right';
export interface PanelSpot { id: PanelSpotId; label: string; cx: number; cy: number; maxW: number; maxH: number }

interface Box { x0: number; x1: number; y0: number; y1: number }

// SVG (manifest units) to panel canvas px: x is mirrored, y runs down from the frame's top.
function toCanvas(b: Frame, f: Frame, canvasW: number): Box {
  const k = canvasW / frameSize(f).w;
  return { x0: (f.x1 - b.x1) * k, x1: (f.x1 - b.x0) * k, y0: (b.y0 - f.y0) * k, y1: (b.y1 - f.y0) * k };
}

const mid = (a: number, b: number) => (a + b) / 2;

// Spots for one side. Wearer-left shows on the viewer's right of the front panel and on the viewer's left of the back panel.
export function panelSpots(panels: readonly SvgPanel[], side: PanelSide, frame: Frame, canvasW: number): PanelSpot[] {
  const on = new Map<string, Box>();
  for (const p of panels) {
    if (p.side !== side) continue;
    const b = bboxOf(p.d);
    if (b) { const c = toCanvas(b, frame, canvasW), prev = on.get(p.part); on.set(p.part, prev ? { x0: Math.min(prev.x0, c.x0), x1: Math.max(prev.x1, c.x1), y0: Math.min(prev.y0, c.y0), y1: Math.max(prev.y1, c.y1) } : c); }
  }
  const body = on.get('body');
  if (!body) return [];
  const bw = body.x1 - body.x0, bh = body.y1 - body.y0, cx = mid(body.x0, body.x1), at = (fy: number) => body.y0 + bh * fy;
  const out: PanelSpot[] = [];
  if (side === 'front') {
    const viewerRight = cx + bw * 0.22, viewerLeft = cx - bw * 0.22;
    out.push({ id: 'chest', label: 'Chest', cx, cy: at(0.3), maxW: bw * 0.36, maxH: bh * 0.22 });
    out.push({ id: 'chest-wearer-left', label: 'Left chest', cx: viewerRight, cy: at(0.24), maxW: bw * 0.16, maxH: bh * 0.12 });
    out.push({ id: 'chest-wearer-right', label: 'Right chest', cx: viewerLeft, cy: at(0.24), maxW: bw * 0.16, maxH: bh * 0.12 });
    out.push({ id: 'lower-front', label: 'Lower front', cx, cy: at(0.82), maxW: bw * 0.4, maxH: bh * 0.14 });
  } else {
    out.push({ id: 'upper-back', label: 'Upper back', cx, cy: at(0.14), maxW: bw * 0.3, maxH: bh * 0.1 });
    out.push({ id: 'back-centre', label: 'Back', cx, cy: at(0.4), maxW: bw * 0.6, maxH: bh * 0.38 });
    out.push({ id: 'lower-back', label: 'Lower back', cx, cy: at(0.82), maxW: bw * 0.4, maxH: bh * 0.14 });
  }
  for (const [part, id, label] of [['sleeve_l', 'sleeve-wearer-left', 'Left sleeve'], ['sleeve_r', 'sleeve-wearer-right', 'Right sleeve']] as const) {
    const s = on.get(part);
    if (s) out.push({ id, label, cx: mid(s.x0, s.x1), cy: mid(s.y0, s.y1), maxW: (s.x1 - s.x0) * 0.6, maxH: (s.y1 - s.y0) * 0.5 });
  }
  return out;
}

// Scale that fits an artwork of w x h into the spot: never enlarged.
export const spotScale = (w: number, h: number, s: PanelSpot) => Math.min(1, s.maxW / Math.max(w, 1), s.maxH / Math.max(h, 1));
