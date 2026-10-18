const BASE = (import.meta.env.VITE_MODEL_BASE_URL || '').replace(/\/$/, '');

// Turns '/models/vfrb-staged/pants.glb' into the Cloudinary URL.
// If VITE_MODEL_BASE_URL isn't set, it returns the original local path.
export function modelUrl(path) {
  if (!BASE || typeof path !== 'string') return path;
  if (!path.startsWith('/models/') || !path.toLowerCase().endsWith('.glb')) return path;
  const clean = decodeURI(path.slice('/models'.length)).replace(/ /g, '-');
  return BASE + clean;
}
