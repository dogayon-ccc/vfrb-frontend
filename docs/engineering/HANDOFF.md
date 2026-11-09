# VFRB handoff, Sat 2026-10-31

Read this first in every new session. Do not re-audit finished work. Update the "State" and "Open" sections at the end of each session.

## Repos and branches
- Frontend `C:\Users\Dave\Desktop\threejs`
  - `polish/oct29-ui` (tip e83b8ed): committed and pushed. Deployable fallback.
  - `polish/studio-v3`: current work (Studio shell v3, dark chrome and light cutting mat, 4 tabs, fabric note card). Uncommitted.
  - `polish/m17a-admin-shell` (tip 564602b, from `cleanup/repo-hygiene` 4d8b158): admin shell pass, committed, not pushed. `cleanup/repo-hygiene` still has staged deletions not in any commit.
  - `main` = `origin/main` e248c9e: production, untouched.
- Backend `C:\laragon\www\vfrb-capstone`
  - `wip/oct21-overhaul` (tip c9c6428, 5 commits above c6a3f8c): committed; `origin` is at c56a695, so `edeabda` and `c9c6428` are NOT pushed. Release audit and system recap (`docs/RELEASE_AUDIT_BACKEND.md`, `docs/SYSTEM_RECAP.md`) staged, not committed.
  - `main` = `origin/main` 699c644: production, untouched.
- Both branches fast-forward onto `main`. Rollback tags: `backup-main-2026-10-29` (create if missing: `git tag backup-main-2026-10-29 origin/main`).

## Live Supabase (already changed, safe for old and new code)
- All 8 `wip/oct21-overhaul` migrations Ran (`migrate:status`, 2026-10-31): customer_contacts (batch 45), client-material ledger (46), 3D snapshot column (47), RLS (48), `users.assigned_stage` (49), `orders.delivery_method` (50), hot-path indexes (51), tracking updated_at index (52). None pending; the deploy needs no migrations.
- Claude Code is denied live `php artisan`; run live migrations yourself with `!` and `--path`, one file at a time.
- Fabric ownership set: ids 61-68 = `vfrb`, ids 55-60 (Airstretch) = `client`.
- Production `main` code ignores the new columns and the ownership field.

## Verified
- Backend: 223 tests pass on vfrb_test (MySQL). Production is PostgreSQL, so Postgres-specific behaviour is UNVERIFIED until the live click-through.
- Frontend: `npm run build` passes (main chunk 116.38 kB). Logic checks 517/517 (2026-11-02).
- Admin shell (2026-10-31, 564602b): navy collapsible sidebar (icon-only state in `vfrb_admin_rail`, tooltips, kraft active bar, logo spin), navy menu bar (breadcrumb, page search, Quick add, bell, role chip), mobile <768 off-canvas drawer replacing the bottom bar and More sheet, 200 ms page transition, `PageLoader` (150 ms delay, one 0.7 s cycle). Activity Log in NAV (Manager + Owner). Quick add links to the page that holds each action (no "new order" route exists). Runtime-checked at 1440/1024/768/390 for manager, owner, station with a stubbed API only. Logo spin reset after the animation is unverified.
- Manager real-session walkthrough (2026-11-02, demo-manager on vfrb_demo, page scripts in 1366/375 iframes; screenshots BLOCKED, window minimised): 22 sidebar pages with no API/JS errors and no page overflow; collapse 252 -> 76px, tooltips, active bar, "/" search, Quick add, bell, account menu, drawer focus trap/Esc all pass. Report `docs/qa/REPORT-manager-2026-11-02.md`. Six S-size P2s fixed (uncommitted): notifications link to their order, dated "Earlier" rows, drawer scroll lock (`:has()`), 44px crumbs, order links and Activity Log filters. Logo spin, visual transitions, touch and Safari UNVERIFIED.
- Owner read-only (2026-11-02, qa-owner on vfrb_demo, :5180 -> :8000): 29 admin write endpoints return 403 (empty bodies, fake ids; DELETE users has no route, 405); reads 200. UI at 1440: no write controls on the 9 Owner pages or order detail (filters only, no Quick add, "Owner · read-only" chip); production, suppliers, users, purchase-orders show access denied. 390 checked in a 390x844 frame (window would not resize): same result, no overflow, drawer lists Owner pages only; touch UNVERIFIED.
- F5 final polish (2026-11-02, 336f8a5..9c28bf3): all six dialogs (Studio tour/how-to/shortcuts, InspoGallery, ShowcaseGallery, GuidesMenu, customer More sheet) trap Tab, close on Esc and return focus to the opener (on phones, More > View/Tour/How-to return to the More tab), runtime-checked at 1440 and in a 390 frame. AIMaterials errors use the customer toast, not `alert()` (no forced failure tested). Recent colours stored as `ds_recent_colours:<user_id>` and cleared on sign-out. StageTowers3D/GarmentPreview3D deleted. Contrast audit: no normal-size teal/red-on-navy text; only fix was `.vs-find` hover -> `--vs-teal-deep`. Touch and Safari UNVERIFIED.
- Browser walkthrough on vfrb_demo (manager, station, customer): done. Login throttle and request access verified there.
- Sign-in flag: `VITE_GOOGLE_LOGIN=false` (in `.env.local` only) hides "Continue with Google"; any other value or unset shows it. Local `.env` has no Google keys; `.env.vercel` does.
- Demo stack: backend `php -S` :8000 with `DB_DATABASE=vfrb_demo` overrides, Vite :5180 with `VITE_PROXY_TARGET`. Never use :5173 (points at live).

## Deploy status (2026-11-09): LIVE. Backend `7b6e45e`, frontend `610b358`, tag `defense-2026-11`; full smoke PASS (DEPLOY_CHECKLIST.md). Second release: live = `defense-2026-11b` (frontend `6cfda96`) + backend `7b6e45e`. Post-deploy: watch logs a week, check the 07:00 Manila digest, delete merged branches last.
- Vercel backend preview (branch alias `vfrb-capstone-git-wip-oct21-overhaul-dsogayon-8611.vercel.app`) is Ready, but Vercel Authentication protects Preview, so the API answers `302` to `vercel.com/sso-api` and the frontend preview login fails CORS.
- Frontend preview was deployed by CLI (`vfrb-frontend-pjjzwyhby...`); the repo `ignoreCommand` builds only `main`.
- Preview shares live DB variables, so preview clicks write real rows.
- Plan: finish work, test locally on vfrb_demo, then a SHORT window with Preview protection off for the final live click-through (turn it back on right after).
- Production checklist: `display_errors` must be Off in production, so a PHP warning can never corrupt a response (with it On, a startup warning turns a 422 into a 200).
- Production order: Supabase backup, backend ff-merge to main and push, wait Ready, frontend ff-merge and push, verify, tag `defense-2026-11`, delete branches last.
- Vercel "Needs Attention" env vars (not marked Sensitive): after deploy, re-enter the SAME value with Sensitive on. Never replace `APP_KEY`. Change `DB_PASSWORD` only together with Supabase.

## release/nov9c (2026-11-09, LIVE, tag `defense-2026-11d`)
- LIVE: `main` fast-forwarded `7a2eab8..5caedf3` and pushed 2026-11-09; Vercel deployment `23nK8BoH2cYxZ2g1DDjpzyfpKEGw` completed; live Studio chunk contains the fix (DEPLOYMENT-VERIFIED by bundle content only; production smoke still open). Backend unchanged `7b6e45e`. Rollback: previous production deployment (nov9b, `defense-2026-11c`) or revert `5caedf3`.
- Fix `5caedf3`: `renderOtherPiece` swaps `cfg` to the other piece while `uset.active` stays, so the pieces rail showed both pieces as the trousers; the rail and Garment sheet now hold the active piece's cfg (`railHold`) during that render. Stage, DesignState and payload unchanged.
- Customer shell (Slice C): audited at 390 and 1440, no change needed (no overflow, 44px targets, shared `ui-head`, sticky bottom nav). 768 tablet layout and visible focus UNVERIFIED.
- Demo lifecycle on vfrb_demo: orders #213/#214 (Scrub set) taken to Completed (manager stages, demo-station Sewing, QC checklist passed without override, set delivered together). Leftover: Ana's "Scrub Top" draft.

## release/nov9b (2026-11-09, LIVE, tag `defense-2026-11c`)
- LIVE: `main` fast-forwarded to `835b3dc` and pushed 2026-11-09; new bundle served within ~40 s (DEPLOYMENT-VERIFIED by bundle content only; production smoke still open). Backend unchanged `7b6e45e`. Rollback: Vercel Instant Rollback to `vfrb-frontend-1xgd9ht4v` (`defense-2026-11b`).
- Branch `release/nov9b` from `main` (`c9c11cc`). Lifecycle on vfrb_demo passed (set with a logo on each piece: save, My Designs, restore, Wizard, submit #211/#212, Order Detail); test orders #211/#212 cancelled by demo-manager. Slices: 1 set thumbnails at one real scale (`134630a`), 2 one 3D capability source and badge (`6603bb6`), 3 motion caps, marquee pause, live regions, iOS overflow fallback (`b8d460a`), 4 Studio focus tooltips, ruler span highlight, ruler corner (`0328d86`), 5 docs (`91da663`), set-card follow-up (`835b3dc`).
- 3D wording now lives only in `CAP3D` (glbSlots.js) and `Capability3D.jsx`: "3D preview available" / "3D preview (approximate)" / "2D design only: 3D coming". Table and policy: `3D_CAPABILITY.md`, `ADR-3d-capability-policy.md`.
- Pants is not inconsistent: the Meshy trousers file is gated and the VFRB-authored `pants-straight.glb` serves Pants.
- Saved preview PNGs in set cards are not rescaled (framing differs per export); only silhouettes use `pieceFits`.
- Backups and domain: `ADR-domain-dns-backup.md` (Proposed), runbook `scripts/backup-db.md`. Restore drill not run yet.
- UNVERIFIED: real NVDA, touch, Safari, older iOS (the overflow fallback is CSS-only), the Studio tool rail at 390.

## Decisions made
- No customer self-registration; Request access creates a contact only.
- Station role = Administrator (Station) with `assigned_stage`; server enforces it.
- Vector flats only in the editor; 3D shown honestly (0 verified models; "3D preview (approximate)" or "2D design only: 3D coming", one source `CAP3D`).
- Photo-to-3D generation (Meshy/Tripo style) is OUT of scope: AI is raw-material recommendation only; discuss with adviser if ever wanted.
- Reference uploads and logo uploads built; "start from a photo" not built.
- Retry-After on login 429 skipped (needs two backend changes for little value).
- "Since 2000" is true (manuscript: established 2000, Bayanan, Muntinlupa).

## Open
1. 7 Tripo GLBs compressed to `asset-staging/tripo-optimized/` (102 MB -> 2.6 MB; meshopt + 1024 webp; barongs simplified, error cap 0.1%; render-compared to originals). Gallery thumbs staged in `.../gallery/`. BLOCKED: Tripo licence plan unrecorded, and the reference photos look like third-party retail shots (barong short shows a brand label). After licence clearance and Dave's Cloudinary upload: add ids to `REF_3D_ALL` + gallery entries (read-only "3D (approx.)"), then test.
   Tripo models uploaded to models-draco/tripo, unregistered, blocked on licence + gallery thumbnails (peplum has none).
   Before ANY Tripo model is used, record both: (a) the Tripo plan and terms the models were generated under; (b) that the source photos are VFRB's own. Only Dave can clear this; never register a model without it.
2. Studio shell v3: browser check at 390 and 768 DONE 2026-11-08 (editor + picker, no overflow, all buttons >=44px; RUNTIME-VERIFIED in frames, touch UNVERIFIED). Grid/rulers/guides/snap/nudge spec re-verified 2026-11-08 (toggles, Shift+G/R, nudge clamp, save JSON + thumbnail clean, restore); centre/chest guides got a chalk casing so they show on red garments. Slice C 2026-11-09: print-through (logos/text take the cloth light: vector light layers tagged __light, photo light map in garmentAssets, canvasLayers.printThrough; export too, saved JSON unchanged); runtime-checked on a photo base and a vector polo (2026-11-09: white text 224-248, no pure 255; pass 0.4 ms median, 1.2 ms max per redraw, light-map rebuild about 2 ms on a colour change, zoom is CSS so no rebuild; desktop only, phone CPU UNVERIFIED). Slice D 2026-11-09: landing "Seven stations, one thread" band (ProductionLine.jsx, PHASES-driven, scroll-sewn red thread, reduced motion = fully sewn), runtime-checked 1440 and 390 frame; touch/Safari UNVERIFIED. Customer pages premium pass done (navy band, mat, stitched thread). "Complete outfit" label done (Studio rail, wizard, Order Detail). Admin pass after.
   Studio tool rail done (V H I G B E T U, Z / Alt+Z, Esc; eyedropper + paint bucket share the brush colour; railTools.js). 2D slices (C) pen + polygon/line and (D) upload crop/blur/saturation/blend modes are built and verified on the demo stack, as are the twin-needle seams, fabric shading and button realism. Customer pages polish and Studio how-to guides done (2026-11-02, uncommitted: 9 guides in studioTutorials.js, How to in Pieces column / More / shortcuts / Settings > Help; skeletons hidden 150 ms then 0.7 s shimmer; route entrance 200 ms; 2D/3D 200 ms crossfade). Next: richer 2D fabric texture, seams and folds (2D only, no 3D claims). Admin shell pass done (see Verified). Manager walkthrough done (see Verified). Customers table at 1366/1280: no sideways scroll (RUNTIME-VERIFIED 2026-11-08, already fixed in admin.css).
3. My Designs gap FIXED frontend-only (2026-11-02, uncommitted): My Designs also reads GET /api/customer/orders (already returns studio_config) and lists each live order's design as "In an order" (View order, Reorder) until completion archives it. No backend change. Customers now load on a light customer skeleton, not the admin shell.
   Demo stack: backend APP_URL makes storage links `http://localhost/storage/...` (preview images 404 on :5180; frontend now falls back to the template render).
   Unverified: unverified-customer note live, Output Log with rows, set-order wizard, Postgres behaviour, live AI recommendation with fabric.
4. Manuscript: roles (Station with stage), request access, pickup and returns, auto production start, overdue flags, flats from model (no exact 2D/3D claim), uploads; re-screenshot after UI freeze; fix "verified 3D" wording.

## Working rules for token efficiency
- One task per session; `/clear` between tasks; start with the preamble plus "read docs/engineering/HANDOFF.md".
- Audit in 10 lines, then stop for "go". Reports max 15 lines.
- Run tests and builds yourself where possible; ask Claude Code only for edits.
- Never commit or push from Claude Code; stage by name, check `git diff --cached --stat`.
