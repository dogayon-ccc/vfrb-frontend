# ADR: Domain, DNS, and database backup and restore

**Status:** Proposed (the domain purchase and the Supabase plan are the owner's decision)
**Date:** 2026-11-09
**Deciders:** VFRB owner, Dave (developer), capstone adviser

## Context
Production runs on Vercel subdomains: frontend `vfrb-frontend.vercel.app`, API `vfrb-capstone.vercel.app`. The database is Supabase PostgreSQL. Today the backup step is "Supabase snapshot before each deploy" (SYSTEM_DESIGN.md). It is manual, and no restore has ever been drilled. After handover, one person maintains the system. A customer-facing business needs a stable address it owns. Two other needs: auth tokens could move to httpOnly cookies if the SPA and API share a parent domain (SYSTEM_DESIGN.md), and there must be a tested way back from a bad migration or a deleted row.

## Decision
1. Domain: the owner registers one domain in VFRB's name (for example a `.com` or `.ph`). The app is `app.<domain>` (frontend) and the API is `api.<domain>`, both added as Vercel custom domains. The vercel.app addresses keep working as fallbacks.
2. DNS: keep DNS at the registrar, or move it to a free DNS host, with only the records Vercel asks for (CNAME for subdomains, A/ALIAS for the apex). Registrar login, 2FA and auto-renew are recorded in the owner's password manager, never in the repo.
3. Backup: a logical `pg_dump` (custom format) before every deploy and once a week, stored outside Supabase. Supabase's own backups are a second layer, depending on the plan (UNVERIFIED: check the project's plan).
4. Restore: a drill into a separate, empty Supabase project each month and after any schema change, timed and logged (`scripts/backup-db.md`).

## Options considered

### A: Owned domain on Vercel + pg_dump with a restore drill (chosen)
| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Domain about USD 10-15 a year; dumps free |
| Recovery | Tested, timed restore |
| Team familiarity | High |

**Pros:** stable branded address; cookie auth possible later; a backup that has actually been restored. **Cons:** yearly renewal to track; dumps are manual unless scheduled.

### B: Stay on vercel.app + Supabase backups only
**Pros:** zero cost and setup. **Cons:** the address is not VFRB's, and backup coverage depends on the plan and was never restored. Rejected for production after the defense.

### C: Paid Supabase plan with point-in-time recovery
**Pros:** minute-level recovery. **Cons:** monthly cost for a low-write shop. Revisit if order volume grows.

## Trade-off analysis
The real risk today is not losing an hour of data. It is a backup that has never been restored. A, plus a monthly drill, closes that gap at near-zero cost. C buys finer recovery the shop does not need yet.

## Consequences
- After switching domains: update `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS` and `GOOGLE_REDIRECT_URI` (plus the redirect registered in Google Cloud) on the backend. That is a backend env change for Dave to make, and is not in this release.
- DEPLOY_CHECKLIST's "Supabase backup taken" step becomes "pg_dump taken and size recorded" (`scripts/backup-db.md`).
- The restore drill record (date, dump size, minutes to restore, row-count check) lives in the deploy checklist.

## Action items
1. [ ] Owner: choose and register the domain; turn on 2FA and auto-renew.
2. [ ] Dave: add the custom domains in Vercel, then update the backend env (separate change).
3. [ ] Dave: run the first restore drill and record the time.
