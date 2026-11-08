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
- [ ] Tag `defense-2026-11`; update HANDOFF "Deploy status"; delete merged branches last.

## Rollback triggers (decide now)
- Any role cannot sign in, CORS errors, 5xx on order create or draft save, previews 404, AI shows quantity/price/stock, cron 401/500.
- Rollback: Vercel Instant Rollback, backend then frontend; DB restore only if a migration damaged data (single-file `migrate:rollback --path`).
