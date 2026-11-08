# VFRB system design (as built, 2026-11-08)

Design-level view. Detail lives elsewhere; do not duplicate it here:
roles and workflow `vfrb-capstone/docs/SYSTEM_RECAP.md`, deploy and rollback `vfrb-capstone/docs/DEPLOY_RUNBOOK.md`, API `vfrb-capstone/docs/API.md`, decision record `ADR-serverless-monolith.md`.

## 1. Requirements

**Functional**
- Customers (accounts created by VFRB, no self-registration) design bulk uniforms in the Studio and place orders; the Studio is the single source of garment config.
- Manager proposes a date, records the 80% down payment, runs seven production stages, delivery or pickup, invoices and receipts.
- Station admins log output for their own stage only; Owner reads, never writes.
- AI: raw-material TYPE recommendation, and schema-validated Studio edits. Nothing else.

**Non-functional**
- Load: one garment shop. Tens of customers, a handful of staff, low hundreds of orders a year. Requests per second stay in single digits.
- Must work on a phone in the shop and on the customer's phone (390 px, 44 px targets, no sideways scroll).
- Money and stage data must never leak across roles (server-enforced).
- Near-zero hosting cost; one developer maintains it.

**Constraints**
- Capstone timeline, one maintainer, existing Laravel + React skills, Supabase and Vercel free/hobby tiers.

## 2. High-level design

```
 Customer / Staff browser (React 18 SPA, Vite, PWA prompt)
   |  Studio: Fabric 6 (2D editor), Three/R3F (lazy, verified GLBs only)
   |  HTTPS + Sanctum bearer token (7-day expiry)
   v
 Vercel serverless PHP  --->  Laravel 12 API (one monolith)
   |  middleware: role, owner.readonly, station scope, throttles
   |  services: orders, production, delivery, billing, ledger, AI
   |---------------> Supabase Postgres (RLS on sensitive tables)
   |---------------> Cloudinary (GLBs, images)
   |---------------> Gemini (material types, design-edit JSON)
   |---------------> Mail (reset links, notifications)
   ^
 Vercel Cron, daily 23:00 UTC = 07:00 Manila -> GET /api/cron/run (CRON_SECRET)
   runs daily digest (overdue flags, low stock, auto RFQ) + KPI snapshot
```

## 3. Key data flows

1. **Design to order:** Studio saves a draft (canonical DesignState JSON + preview PNG, ~200 KB) -> wizard adds sizes, date, delivery method -> order row carries `studio_config`; the wizard never re-asks garment config.
2. **Order to production:** proposal -> customer accepts -> down payment -> `startProduction` automatically -> 7 stage rows. The cutting gate checks the client-material ledger.
3. **Production to cash:** packing -> delivery `preparing -> in_transit -> delivered` -> invoice auto-issued on delivery -> receipt when marked paid.
4. **Background:** the daily cron flags overdue orders/invoices once (deduped), sends low-stock digests and drafts RFQs.

## 4. Deep-dive decisions

| Area | Choice | Why | Cost of the choice |
|---|---|---|---|
| Service shape | One Laravel monolith | One maintainer; transactions across orders, stock, billing | Every deploy ships everything |
| Auth | Sanctum bearer tokens | SPA on a different origin; simple | Token in localStorage; mitigated by 7-day expiry |
| Authorization | Server middleware; UI mirrors it | UI checks are cosmetic | Two lists to keep in sync (`jobAccess.js`) |
| Data | Postgres, 3NF, additive migrations | Rollback by single `--path` file | Tests run on MySQL; Postgres differences UNVERIFIED until live click-through |
| Customer payload | Whitelist, money fields stripped | Customer sees status only | New fields are hidden by default (safe) |
| Scheduling | HTTP cron + dedupe + cache lock | Vercel runs no `schedule:run` | Hobby cron fires within the hour, no retries |
| 3D | Only verified GLBs, lazy chunk | Honest labels; keeps entry chunk small | Most garments are 2D only |
| AI | Enum-validated outputs | No quantities, prices or free text reach users | Less "magic"; by design |

## 5. Reliability and failure handling

- Errors: one JSON `{message}` shape; 5xx text fixed unless debug.
- Idempotency: digest and KPI jobs dedupe; a second cron call adds nothing; a run in progress returns 409.
- Studio: autosave plus a restorable draft; storage access wrapped so the Studio works without localStorage.
- Cold starts: serverless PHP adds latency on the first request after idle. At this load that is the main latency source, not the DB.
- Backups: Supabase snapshot before each deploy; Vercel Instant Rollback for code (runbook §8).

## 6. Monitoring (minimum before going live)

- Vercel function logs (stderr) for 5xx; check daily for the first week.
- Cron: `ran` list in the 07:xx response; a missing digest notification is the alert.
- Supabase dashboard: connections (pooler 6543) and storage size.
- No paging system; acceptable for a single-shop tool. Revisit if VFRB depends on it for same-day work.

## 7. What to revisit as it grows

1. Run backend tests on Postgres, not MySQL (largest correctness gap).
2. Move tokens to httpOnly cookies if the SPA and API share a parent domain.
3. Queue (Laravel queue on a worker) if mail or AI calls slow requests; today they are synchronous.
4. Paid cron tier or an external scheduler if the digest must land at an exact minute.
5. More verified GLBs only after licence and photo ownership are recorded (HANDOFF Open 1).
6. Split nothing into services until a second team or a clear scaling bottleneck exists.

## 8. Does it help VFRB?

Automated today: production start after down payment, stage gating, overdue flags, low-stock digest and RFQ drafts, invoice on delivery, role scoping, customer status tracking.
Still manual by design: proposals and promised dates, payments, QC judgement, quantities and yardage (AI never computes them), delivery hand-off.
