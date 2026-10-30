# VFRB handoff, Fri 2026-10-30

Read this first in every new session. Do not re-audit finished work. Update the "State" and "Open" sections at the end of each session.

## Repos and branches
- Frontend `C:\Users\Dave\Desktop\threejs`
  - `polish/oct29-ui` (tip e83b8ed): committed and pushed. Deployable fallback.
  - `polish/studio-v3`: current work (Studio shell v3, dark chrome and light cutting mat, 4 tabs, fabric note card). Uncommitted.
  - `main` = `origin/main` e248c9e: production, untouched.
- Backend `C:\laragon\www\vfrb-capstone`
  - `wip/oct21-overhaul` (tip c56a695, 3 commits above c6a3f8c): committed and pushed.
  - `main` = `origin/main` 699c644: production, untouched.
- Both branches fast-forward onto `main`. Rollback tags: `backup-main-2026-10-29` (create if missing: `git tag backup-main-2026-10-29 origin/main`).

## Live Supabase (already changed, safe for old and new code)
- Migrations recorded: client-material ledger (batch 46), RLS (48), `users.assigned_stage` (49), `orders.delivery_method` (50).
- Fabric ownership set: ids 61-68 = `vfrb`, ids 55-60 (Airstretch) = `client`.
- Production `main` code ignores the new columns and the ownership field.

## Verified
- Backend: 223 tests pass on vfrb_test (MySQL). Production is PostgreSQL, so Postgres-specific behaviour is UNVERIFIED until the live click-through.
- Frontend: `npm run build` passes. Logic checks 456/470, 14 old failures (stale checks: owner pages and routing, QC form, admin roles, My Designs thumbs, customer tokens scope, Order Detail retry).
- Browser walkthrough on vfrb_demo (manager, station, customer): done. Login throttle and request access verified there.
- Demo stack: backend `php -S` :8000 with `DB_DATABASE=vfrb_demo` overrides, Vite :5180 with `VITE_PROXY_TARGET`. Never use :5173 (points at live).

## Deploy status: NOT deployed
- Vercel backend preview (branch alias `vfrb-capstone-git-wip-oct21-overhaul-dsogayon-8611.vercel.app`) is Ready, but Vercel Authentication protects Preview, so the API answers `302` to `vercel.com/sso-api` and the frontend preview login fails CORS.
- Frontend preview was deployed by CLI (`vfrb-frontend-pjjzwyhby...`); the repo `ignoreCommand` builds only `main`.
- Preview shares live DB variables, so preview clicks write real rows.
- Plan: finish work, test locally on vfrb_demo, then a SHORT window with Preview protection off for the final live click-through (turn it back on right after).
- Production order: Supabase backup, backend ff-merge to main and push, wait Ready, frontend ff-merge and push, verify, tag `defense-2026-11`, delete branches last.
- Vercel "Needs Attention" env vars (not marked Sensitive): after deploy, re-enter the SAME value with Sensitive on. Never replace `APP_KEY`. Change `DB_PASSWORD` only together with Supabase.

## Decisions made
- No customer self-registration; Request access creates a contact only.
- Station role = Administrator (Station) with `assigned_stage`; server enforces it.
- Vector flats only in the editor; 3D shown honestly (0 verified models; "3D (approx.)" or "not available").
- Photo-to-3D generation (Meshy/Tripo style) is OUT of scope: AI is raw-material recommendation only; discuss with adviser if ever wanted.
- Reference uploads and logo uploads built; "start from a photo" not built.
- Retry-After on login 429 skipped (needs two backend changes for little value).
- "Since 2000" is true (manuscript: established 2000, Bayanan, Muntinlupa).

## Open
1. 7 Tripo GLBs compressed to `asset-staging/tripo-optimized/` (102 MB -> 2.6 MB; meshopt + 1024 webp; barongs simplified, error cap 0.1%; render-compared to originals). Gallery thumbs staged in `.../gallery/`. BLOCKED: Tripo licence plan unrecorded, and the reference photos look like third-party retail shots (barong short shows a brand label). After licence clearance and Dave's Cloudinary upload: add ids to `REF_3D_ALL` + gallery entries (read-only "3D (approx.)"), then test.
2. Studio shell v3: browser check at 390 and 768 pending. Customer pages premium pass done (navy band, mat, stitched thread). "Complete outfit" label done (Studio rail, wizard, Order Detail). Admin pass after.
   Studio tool rail done (V H I G B E T U, Z / Alt+Z, Esc; eyedropper + paint bucket share the brush colour; railTools.js). Next 2D slices: (C) Pen + polygon/line, (D) upload crop/blur/saturation/blend. Logic checks 461/473: 12 remaining are admin/owner, deferred to the admin pass.
3. Unverified: unverified-customer note live, Output Log with rows, set-order wizard, Postgres behaviour, live AI recommendation with fabric.
4. Manuscript: roles (Station with stage), request access, pickup and returns, auto production start, overdue flags, flats from model (no exact 2D/3D claim), uploads; re-screenshot after UI freeze; fix "verified 3D" wording.

## Working rules for token efficiency
- One task per session; `/clear` between tasks; start with the preamble plus "read docs/engineering/HANDOFF.md".
- Audit in 10 lines, then stop for "go". Reports max 15 lines.
- Run tests and builds yourself where possible; ask Claude Code only for edits.
- Never commit or push from Claude Code; stage by name, check `git diff --cached --stat`.
