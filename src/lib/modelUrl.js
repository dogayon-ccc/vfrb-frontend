const BASE = (import.meta.env.VITE_MODEL_BASE_URL || '').replace(/\/$/, '');

if (!BASE) console.error('VITE_MODEL_BASE_URL is not set: GLB models will 404. Set it in .env.local (restart Vite) or in Vercel env vars (redeploy).');

// '/models/vfrb-staged/pants.glb' -> Cloudinary URL; non-GLB paths pass through
export function modelUrl(path) {
  if (!BASE || typeof path !== 'string') return path;
  if (!path.startsWith('/models/') || !path.toLowerCase().endsWith('.glb')) return path;
  return BASE + decodeURI(path.slice('/models'.length)).replace(/ /g, '-');
}
