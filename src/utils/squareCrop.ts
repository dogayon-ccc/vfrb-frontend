// Square crop maths for the profile photo: the image covers a square stage, zoom >= 1 scales it up, pan is clamped so no gap shows.

// Displayed image size at a zoom, scaled so its short side fills the stage.
export function coverSize(w, h, stage, zoom = 1) {
  const s = (stage / Math.min(w, h)) * zoom;
  return { w: w * s, h: h * s, scale: s };
}

// Keeps the image covering the stage: offsets are the image's top-left relative to the stage, so they range from (stage - size) to 0.
export function clampPan(x, y, w, h, stage, zoom) {
  const d = coverSize(w, h, stage, zoom);
  return { x: Math.min(0, Math.max(stage - d.w, x)), y: Math.min(0, Math.max(stage - d.h, y)) };
}

// Centred offset for a zoom (used on load and when zoom changes around the centre).
export function centerPan(w, h, stage, zoom) {
  const d = coverSize(w, h, stage, zoom);
  return { x: (stage - d.w) / 2, y: (stage - d.h) / 2 };
}

// Re-anchors pan so the stage centre stays on the same image point when zoom changes.
export function zoomAround(pan, w, h, stage, from, to) {
  const a = coverSize(w, h, stage, from).scale, b = coverSize(w, h, stage, to).scale;
  const cx = (stage / 2 - pan.x) / a, cy = (stage / 2 - pan.y) / a;
  return clampPan(stage / 2 - cx * b, stage / 2 - cy * b, w, h, stage, to);
}

// Source rectangle (natural pixels) of the visible square, for drawImage.
export function cropRect(pan, w, h, stage, zoom) {
  const { scale } = coverSize(w, h, stage, zoom);
  const size = Math.min(stage / scale, w, h);
  return { sx: Math.max(0, Math.min(w - size, -pan.x / scale)), sy: Math.max(0, Math.min(h - size, -pan.y / scale)), size };
}
