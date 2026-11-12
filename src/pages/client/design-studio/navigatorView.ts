// Navigator geometry, pure so logic-checks can pin it. `view` is CanvasViewport's measure(): canvas (0, 0) sits at (ox, oy) in the
// pane, drawn at `s` screen px per canvas px, in a pane of pw x ph. `size` is the canvas in canvas px.

const clamp01 = v => Math.min(1, Math.max(0, v));

// The part of the canvas the stage shows, as fractions of the canvas (0..1 each way).
export function visibleFrac(view, size) {
  if (!view || !(view.s > 0) || !(size?.w > 0) || !(size?.h > 0)) return null;
  const x0 = clamp01(-view.ox / view.s / size.w), y0 = clamp01(-view.oy / view.s / size.h);
  const x1 = clamp01((view.pw - view.ox) / view.s / size.w), y1 = clamp01((view.ph - view.oy) / view.s / size.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// The pan that puts canvas fraction (fx, fy) at the centre of the stage (before CanvasViewport clamps it to its limits).
export const panToFrac = (fx, fy, size, s) => ({ x: size.w * s * (0.5 - clamp01(fx)), y: size.h * s * (0.5 - clamp01(fy)) });
