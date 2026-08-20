// src/utils/fileUrl.js
// NEW (Aug 10 2026) — resolves a Laravel public-disk storage path (e.g.
// "design-refs/xxxxx.jpg", as stored in orders.client_design_ref_file)
// into a real, loadable absolute URL.
//
// WHY THIS CAN'T JUST BE A RELATIVE PATH:
//   vite.config.js only proxies /api/* to the backend — /storage/* is not
//   proxied. A relative <img src="/storage/..."> would resolve against
//   Vite's own dev server (localhost:5173), which has no /storage route,
//   and 404. This always needs the real backend origin.
//
// DEV vs PRODUCTION:
//   Dev:        axios has no baseURL set (relies on the /api proxy only),
//               so we fall back to the same origin vite.config.js's proxy
//               target uses — http://vfrb-capstone.test (Laragon).
//   Production: VITE_API_URL is baked in at build time (see App.jsx) and
//               already points at the real backend origin — reuse it,
//               stripping any trailing /api if someone set it that way.
//
// REQUIRES: php artisan storage:link must have been run on the backend
// (creates public/storage -> storage/app/public). Without it, the backend
// itself returns 404 for any file under this URL regardless of what the
// frontend constructs — this helper can't fix a missing symlink, only the
// URL-shape half of the problem.

const DEV_BACKEND_ORIGIN = 'http://vfrb-capstone.test';

export function getStorageUrl(path) {
  if (!path) return null;
  const clean = String(path).replace(/^\/+/, ''); // strip any leading slash

  const apiUrl = import.meta.env.VITE_API_URL;
  const origin = apiUrl
    ? apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
    : DEV_BACKEND_ORIGIN;

  return `${origin}/storage/${clean}`;
}

// True for common image extensions — used to decide thumbnail vs. plain
// download link. Falls back to "not an image" (safe default) for
// anything unrecognized, including PDFs.
export function isImageFile(path) {
  if (!path) return false;
  return /\.(jpe?g|png|gif|webp)$/i.test(String(path));
}
