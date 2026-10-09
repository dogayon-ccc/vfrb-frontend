# VFRB frontend — working rules

Stack: React + Vite SPA (Vercel), Laravel 12 API in `C:\laragon\www\vfrb-capstone` (Vercel, Sanctum auth), PostgreSQL on Supabase. Supabase is the database only, not the auth provider.

## Design Studio asset truth
- Source of truth: `src/pages/client/design-studio/garmentAssets.js` (2D photo bases, vector template ids), `glbSlots.js` (GLB slots + state), `garmentCapabilities.js` (3D entries, limitations), `designGallery.js` (gallery photos, tier, exact open target).
- Status labels: `reference-only`, `editable-2d`, `approximate-3d`, `verified-3d` (needs a verification record; none exist yet).
- `docs/engineering/ASSET-REGISTRY.md` is generated (`node tools/asset-audit.mjs --write`); edit the registries, not the doc.
- Never map a photo onto a different garment (e.g. pleated skirt onto the pencil Skirt); leave it reference-only.
- Do not replace, regenerate or delete GLB/2D source assets. PNG masters in `public/garments2d/source/` are authoritative.

## Design identity
- `templateId` = the exact template (photo base or vector id). `inspirationId` = the gallery photo a design was opened from; dropped when the garment changes. Both ride Save → Reload → Order Wizard → order `studio_config`.

## Checks (run before finishing studio work)
- `node tools/logic-checks.mjs` (includes the asset audit) and `npx vite build`.

## Git and secrets
- Protect staged, unstaged, untracked and stashed work; no reset/clean/destructive checkout. Commit or push only when asked.
- Never commit `.env*`, database dumps (e.g. `vfrb_db (1).sql`) or credentials. Server secrets live in Vercel env, never in frontend code.
