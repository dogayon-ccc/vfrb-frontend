# ADR: One Laravel API monolith on Vercel serverless with Supabase Postgres

**Status:** Accepted (records the system as built)
**Date:** 2026-11-08
**Deciders:** Dave (developer), capstone adviser, VFRB owner

## Context
VFRB is one uniform shop with a single maintainer and a capstone deadline. Load is tiny (single-digit requests per second). It needs role-safe order, production, billing and delivery data, a browser Design Studio, and two daily background jobs. Budget is near zero.

## Decision
Keep one Laravel 12 API on Vercel serverless PHP, Supabase Postgres as the only database, a React SPA on Vercel, Cloudinary for assets, and Vercel Cron calling `GET /api/cron/run` for scheduled jobs.

## Options considered

### A: Monolith on Vercel + Supabase (chosen)
| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Free/hobby tiers |
| Scalability | Far above VFRB's load |
| Team familiarity | High (Laravel, React) |

**Pros:** one codebase and transaction boundary; preview deploys; instant rollback; managed Postgres with RLS.
**Cons:** cold starts; no long-running workers; cron only daily and within the hour; body size limits per function.

### B: Laravel on a VPS (Forge/DigitalOcean) with queue worker and `schedule:run`
| Dimension | Assessment |
|---|---|
| Complexity | Medium (OS patching, TLS, backups) |
| Cost | About USD 6-12 a month |
| Scalability | Enough |
| Team familiarity | Medium |

**Pros:** exact-minute scheduling, queues, no cold starts.
**Cons:** server upkeep falls on one person after handover.

### C: Split services (Node Studio service + Laravel core)
**Pros:** independent scaling. **Cons:** two deploys, cross-service auth, no benefit at this load. Rejected.

## Trade-off analysis
The VPS buys precise scheduling and queues, which VFRB does not need yet: digests are daily and tolerate a 59-minute window, and mail/AI calls are rare. Upkeep matters more than those features for a shop without IT staff, so A wins. C adds cost with no matching benefit.

## Consequences
- Easier: deploys, rollbacks, handover, cost.
- Harder: anything long-running (bulk exports, big PDF batches) must fit one request.
- Revisit: move to B if VFRB needs queues, sub-daily jobs, or cold starts hurt staff at the start of a shift.

## Action items
1. [ ] Run the backend suite on Postgres before the live click-through.
2. [ ] Confirm `display_errors` Off and APP_DEBUG false on Vercel (runbook §5).
3. [ ] Smoke the cron endpoint after the production deploy (runbook §9).
