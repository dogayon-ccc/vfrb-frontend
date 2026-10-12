# Validator runbook (draft)

A 25-minute guided session per role, run before the validator answers the questionnaire. Each step names the questionnaire items it gives evidence for (codes as in `SURVEY-EVIDENCE-MATRIX.md`).

## Before the session (Dave, 10 min)

1. **Accounts**: one manager account (Owner/Manager validator) and one staff account with job function `general` (Staff validator). Do not share passwords in writing; sign the validator in yourself.
2. **Demo data that already exists in the live DB** (checked 2026-10-12):

   | Data | Details |
   |---|---|
   | Order **#17** | M1 Slice Test, Scrub Top, 100 pcs (S 50 / M 50), PO `VALIDATION-TEST-2026-10-12`, status *pending*, notes "do not produce". It has a Studio design, a reference photo and 4 AI material recommendations. |
   | Order **#16** | pending; part 2 of a uniform set with #15 |
   | Materials | e.g. Cotton-Poly Blend Fabric (Navy) 400 yd, Polyester Thread 12 kg, Interfacing / Lining 180 yd, Logo Patch 150 pcs |

   Decide before the session whether #17 may be confirmed and advanced during the demo. If not, the manager script uses #16, or a fresh order the validator places as a customer.
3. **Manual baseline**: ask the validator to bring one recent PO page from the logbook and the out-putter's tally sheet. These are timed in the stopwatch table, not described from memory (the interview gives no timings).
4. Open the deployed site, not `localhost`. Dev-server latency (1.6–8.3 s per call) is not representative.

## Owner / Manager script (25 min)

| Min | Do | Expected result | Items |
|---|---|---|---|
| 0–2 | Sign in; open **Dashboard** | KPI cards, pending orders, deliveries; no error banners | IC1, IC2, PE1 |
| 2–6 | **Orders** → open **#17** | Header "Order #17 · Pending · Scrub Top · 100 pcs · Navy Blue · PO VALIDATION-TEST-2026-10-12". The Submitted Design panel shows: the 2D design with "VFRB TEST"; Design origin (gallery photo *Scrub Suit, V-Neck (Women)*, template `scrub-top-women-short`); zone colours; the customer reference photo; and "Order notes: VALIDATION TEST…". Size Breakdown shows S 50 / M 50. | RA1, DC1, FS2, CC1 |
| 6–8 | Scroll to **Material Recommendations** | 4 rows with stock on hand per material | FS3 |
| 8–12 | **Review & Confirm** on the agreed demo order: set a negotiated date, then Confirm | Status becomes Confirmed; the customer gets an in-app notification and, from this panel, an email (`OrderStatusNotification`). The Orders-list **Confirm** button now sends the same email. Real inboxes receive mail only when the configured mail host is not a sandbox. Settings shows "Not yet active" until then. | RA4, DC4, IC5 |
| 12–15 | **Production** → the order → advance one stage | Stage row updates with a timestamp; the activity log records it | RA4, DC3 |
| 15–18 | **Inventory** → stock-out 1 unit of thread (reason "demo") | Stock decreases by 1; the log row shows who, when and why | RA2, DC2 |
| 18–21 | **Reports** and **Invoice** (enter the order id → PDF) | Sales and inventory summaries; the PDF downloads | DC5, FS4, PE3, RS4 |
| 21–23 | **Users**, **Settings** | Manager-only pages open; company settings are editable | SE3 |
| 23–25 | Stopwatch tasks M1–M3 (below) | Times recorded | RS1–RS5 |

## Staff script (25 min)

| Min | Do | Expected result | Items |
|---|---|---|---|
| 0–2 | Sign in as staff; open **Dashboard** | The staff dashboard (not the manager one) | SE3, IC1 |
| 2–5 | **Orders** → **#17** | Same order view. **No** Review & Confirm panel and no Confirm button (manager only). | SE3, DC1 |
| 5–9 | **Output Log** → record today's output for an in-production order, by size | Entry saved; the summary updates | RA4, DC3, RS1 |
| 9–12 | **QC Checklist** for an order at QC | Checklist saved | DC3 |
| 12–15 | **Physical Count** → count 1 material | Variance shown; reconcile is **not** offered (manager only) | RA2, SE3 |
| 15–17 | Try `/admin/users` and `/admin/reports` in the address bar | "Access denied" page, no data | SE2, SE3 |
| 17–20 | **Messages** → reply on an order thread | The message appears; the customer gets a notification | IC5, DC4 |
| 20–25 | Stopwatch tasks S1–S3 (below) | Times recorded | RS1–RS5 |

> Known issue to mention if a staff validator clicks it: "Order Summary (PDF)" on Order Detail returns "Could not generate the PDF" for staff (the endpoint is manager-only). It is listed in `ADMIN-PAGE-MATRIX.md`.

## Stopwatch table (manual vs system)

Time each task twice: once the way it is done today (logbook, PO page, calculator) and once in the system. Start when the validator begins; stop when the record is complete and checked.

| # | Task | Role | Manual (mm:ss) | System (mm:ss) | Fields missing (manual / system) | Notes |
|---|---|---|---|---|---|---|
| M1 | Record a new 100-pc order with an S/M/L breakdown and PO no. | Manager | | | / | |
| M2 | Find order #17's sizes, PO and status | Manager | | | / | |
| M3 | Prepare this week's sales summary | Manager | | | / | |
| S1 | Record one day's output for one order, per size | Staff | | | / | |
| S2 | Find the current stock of one fabric and its last movement | Staff | | | / | |
| S3 | Record a stock-out of one material with a reason | Staff | | | / | |

Ratings stay the validator's own. The table only gives them a concrete basis for the Recording Speed and comparative Completeness items.
