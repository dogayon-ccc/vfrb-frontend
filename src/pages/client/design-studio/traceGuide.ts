// Tracing guide: an uploaded reference shown under (or, while tracing, over) the garment, locked and see-through. It is a DOM image on the
// stage, never a Fabric object, so it cannot reach the design JSON, history, exports, thumbnails or the order. It is kept for this browser
// tab only (sessionStorage), so a reload keeps it while the customer works, and nothing about it is ever sent anywhere.
export const TRACE_KEY = 'ds_trace';
export const TRACE_LIMITS = { opacity: [10, 90], scale: [25, 300], x: [-60, 60], y: [-60, 60] };
const clamp = (v, [lo, hi], d) => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : d; };

// A safe guide or null: an image data URL only (PNG, JPEG or WEBP, as the upload guard produces), numbers clamped.
export function normalizeTrace(t) {
  if (!t || typeof t !== 'object' || typeof t.src !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(t.src)) return null;
  return {
    src: t.src, name: typeof t.name === 'string' ? t.name.slice(0, 120) : 'reference',
    opacity: clamp(t.opacity, TRACE_LIMITS.opacity, 45), scale: clamp(t.scale, TRACE_LIMITS.scale, 100),
    x: clamp(t.x, TRACE_LIMITS.x, 0), y: clamp(t.y, TRACE_LIMITS.y, 0),
    hidden: t.hidden === true, over: t.over === true,
  };
}
export function readTrace() {
  try { return normalizeTrace(JSON.parse(sessionStorage.getItem(TRACE_KEY) || 'null')); } catch { return null; }
}
export function writeTrace(t) {
  try { if (t) sessionStorage.setItem(TRACE_KEY, JSON.stringify(t)); else sessionStorage.removeItem(TRACE_KEY); } catch { /* quota or blocked: the guide still shows this session */ }
}
// Box of the guide inside the artboard (canvas logical px): fitted to the artboard, then scaled and offset by % of its size.
export function traceBox(t, w, h, natural) {
  const nw = natural?.w || w, nh = natural?.h || h, fit = Math.min(w / nw, h / nh) * (t.scale / 100);
  const bw = nw * fit, bh = nh * fit;
  return { left: (w - bw) / 2 + (t.x / 100) * w, top: (h - bh) / 2 + (t.y / 100) * h, width: bw, height: bh };
}
