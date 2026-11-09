# Deploy checklist: VFRB Nov release (2026-11-09)

**Deployer:** Dave. Claude Code has no live `artisan` and does not push.
**Procedure detail:** `vfrb-capstone/docs/DEPLOY_RUNBOOK.md` (env, smoke, rollback, cron). This file is the tick list only.

## Where things stand (git, checked 2026-11-09)
- Frontend `origin/main` = `release/nov9` tip `61831f5`. Today's slices B (guide casing), C (print-through), D (production line) are **uncommitted**.
- Backend `origin/main` = `4d8e8bc`; `fix/customer-stock-note` adds `cbed33d` (customer never sees stock), **not pushed**.
- Whether the live sites serve these commits: UNVERIFIED (production URLs not in the repo; check Vercel's Production deployment).
- Tags: `backup-main-2026-10-29`, `pre-nov-deploy`.

## Pre-deploy
- [x] Frontend `npm run build` passes (BUILD-VERIFIED 2026-11-09).
- [x] Frontend logic checks 549/549 (BUILD-VERIFIED).
- [x] Backend tests on `vfrb_test` (MySQL): 314/314 pass (2026-11-09, after AutomationGapsTest dates moved to `BusinessDay::now()`; was failing 00:00-08:00 Manila).
- [ ] Backend tests on PostgreSQL: not run (no local Postgres). Biggest remaining correctness gap; the live click-through covers it.
- [ ] Commit the frontend slices (suggested messages in the session report); stage by name.
- [ ] Push `cbed33d` and merge it to backend `main`.
- [ ] Plain `php artisan` reads local `vfrb_demo` (backend `.env`, checked 2026-11-09), not live; check live in the Supabase SQL editor: `select migration, batch from migrations where migration >= '2026_10_12' order by migration;`
- [x] Live migration status (you, 2026-11-09: 2026_11_03 Ran): `2026_11_03_000001_make_users_email_nullable` must be **Ran**. Code already on `main` (786cf65, optional staff email) depends on it. If pending: run it alone with `--path`.
- [ ] `2026_11_02_000001_enable_rls_on_remaining_tables`: optional, your call (runbook §2).
- [ ] Never run `2026_10_12_000001_remove_estimate_columns_and_usage_rates.php` locally; live already has it (batch 38).
- [ ] Supabase backup taken; note current Vercel production deployment IDs (backend, frontend).
- [ ] Vercel env: `APP_DEBUG=false`, `APP_ENV=production`, `CRON_SECRET` set; re-enter "Needs Attention" vars with the SAME value as Sensitive; never change `APP_KEY`.

## Deploy (backend first, then frontend)
- [ ] Backend: push `main`, wait for Ready.
- [ ] Frontend: push `main` (the repo only builds `main`), wait for Ready.
- [ ] If you test a Preview: Preview shares the live DB, so clicks write real rows; turn Vercel Authentication off only for that window.

## Deployed 2026-11-09
- Backend https://vfrb-capstone.vercel.app at `7b6e45e`; frontend https://vfrb-frontend.vercel.app at `610b358` (that commit holds print-through under the backend test message; code correct, history not rewritten).
- Full smoke PASS 2026-11-09: customer, manager, station (email-less), owner and cron, reported by Dave; tag `defense-2026-11` (backend `7b6e45e`, frontend `610b358`).
- Read-only smoke PASS (RUNTIME-VERIFIED): `/api/version` commit + DB connected; JSON 404; 401 without token (user, admin write, cron); CORS echoes only the frontend origin; live bundle contains the production line and print-through.

## Smoke (runbook §8, use a test customer and note IDs)
- [ ] Sign in as customer, manager, station, owner.
- [ ] Owner write -> 403; station write on another stage -> 403.
- [ ] Customer: Studio save, reload, restore; preview image loads; order submitted and seen by manager.
- [ ] Customer AI materials: types only, no quantity, price or stock wording (cbed33d).
- [ ] Staff account without email can sign in (needs the 2026_11_03 migration).
- [ ] `GET /api/does-not-exist` -> 404 JSON, no HTML or stack trace.
- [ ] Landing at 390 and 1440: hero, production line sews on scroll, no sideways scroll.
- [ ] Cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://<api>/api/cron/run` -> 200 with `ran`; a second call adds nothing.

## Post-deploy
- [ ] Watch Vercel function logs for 5xx for the first hour and once daily for a week.
- [ ] Next morning 07:00-07:59 Manila: digest notifications arrived once.
- [x] Tag `defense-2026-11` (verified on both remotes 2026-11-09); HANDOFF updated. [ ] Delete merged branches last.

## Rollback triggers (decide now)
- Any role cannot sign in, CORS errors, 5xx on order create or draft save, previews 404, AI shows quantity/price/stock, cron 401/500.
- Rollback: Vercel Instant Rollback, backend then frontend; DB restore only if a migration damaged data (single-file `migrate:rollback --path`).

---

# Follow-up release: Studio speed + motion layer (frontend only, prepared 2026-11-09)

**Scope:** frontend only. No backend change, no migration, no env change. Backend stays `7b6e45e`.
**Status:** LIVE 2026-11-09. Frontend `6cfda96` (perf `4c7c561` + ui `6cfda96`), pushed to `main`, served within ~30 s. Backend unchanged `7b6e45e`.

## Decide first
- [x] Shipped before the defense (Dave's call). Ship before or after the defense? `defense-2026-11` (frontend `610b358`) is the tested, tagged build. Pushing `main` deploys to production immediately. If the defense is close, keep this on a branch (`feat/motion-layer`) and merge after.

## Pre-deploy
- [x] `npm run build` passes; logic checks 553/553 (BUILD-VERIFIED 2026-11-09).
- [x] Colour change: per-photo tint work cached; prod build shows no main-thread block > 50 ms on 5 new colours (was 58-188 ms). Tint output pixel-identical (max 1 level rounding) on all 6 photo bases (RUNTIME-VERIFIED, desktop Chrome).
- [x] Landing motion, page transitions, overlays: RUNTIME-VERIFIED in Chrome at 1440 and 390. Reduced motion: verified by in-page simulation only.
- [x] Layout sweep 390 + 1440: 15 public, 8 customer, 26 admin pages, no sideways overflow; admin order controls raised to 44 px.
- [ ] UNVERIFIED: real Windows "Animation effects off", Safari, Firefox, real phone/touch. Do one phone pass on the Preview (below).
- [x] Committed, staging by name:
  - `git add src/pages/client/design-studio/garmentAssets.js src/pages/client/design-studio/GarmentSilhouette.jsx`
    `git commit -m "perf(studio): cache per-photo tint work; thumbnails draw the shared canvas"`
  - `git add src/styles/motion.css src/styles/motion-app.css src/styles/landing.css src/styles/transitions.css src/pages/Landing.jsx src/pages/landing/CategoryCards.jsx src/components/site/SitePage.jsx src/components/ViewLink.jsx src/main.jsx src/pages/admin/OrderDetail.jsx tools/logic-checks.mjs`
    `git commit -m "feat(ui): scroll-driven landing motion, spring overlays, directional page transitions; 44px admin order controls"`
  - (`landing.css` carries the one canvas rule the perf commit needs; committing it in the second commit is fine as long as both ship together.)
- [x] `git status` clean.

## Deploy
- [ ] Push a branch first, open the Vercel **Preview**, check it (Preview shares the live DB: look, don't save).
- [x] Pushed `main` (`610b358..6cfda96`); new build live. [ ] Note the previous production deployment ID for rollback. Note the previous production deployment ID for rollback.

## Smoke (production, read-only, ~5 min)
- [x] Live bundle contains every change (scroll timelines, reduced-motion guard, spring, @starting-style, marquee/facts/progress, directional transitions, admin drawer override, Studio tint cache): DEPLOYMENT-VERIFIED by asset grep.
- [x] (DEPLOYMENT-VERIFIED) Landing signed out at 1440: headline animates in, red progress thread under header, marquee moves, facts read 26 / 7 / 100 / 5 when fully in view, cards tilt in, production line sews.
- [~] Landing at 390 in a desktop-Chrome frame: DEPLOYMENT-VERIFIED (pattern hero, no 3D, no overflow, real numbers). Real phone: UNVERIFIED.
- [x] (DEPLOYMENT-VERIFIED About -> What We Do: forward slide, title morph, no errors) Header nav About -> Home: slide forward / back, title morphs, no flash of blank page.
- [ ] Customer: Studio colour change feels instant on a photo garment; Pieces rail and My Designs thumbnails show the right colour.
- [~] Toast springs in and settles (DEPLOYMENT-VERIFIED). [ ] "..." menu, Studio "?" dialog and tour card on live need a customer sign-in. Customer: a toast and a "..." menu animate in; Studio "?" dialog and tour card pop in centred.
- [ ] Manager: Customers drawer slides in; order page dropdown and "View Submitted Design" are full height.
- [ ] Phone with Reduce Motion on (iPhone: Accessibility > Motion): landing is static, numbers readable, no page slides.
- [x] `/api/version` unchanged (`7b6e45e`, DB connected): DEPLOYMENT-VERIFIED.

## Rollback
- Trigger: blank or stuck landing, numbers shown wrong, overlays not appearing, Studio colours wrong, any console error on load.
- Action: Vercel Instant Rollback of the frontend to the previous deployment (the `defense-2026-11` build). No backend or DB step.
