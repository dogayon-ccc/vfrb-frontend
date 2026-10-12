# Survey evidence matrix (draft)

This maps each item of the *Approved Survey Questionnaire (August 12, 2026)* to the feature that answers it, where the feature lives, what was observed live, the item's status and any gap. The questionnaire itself is not changed; its defects are listed at the end.

**Status labels**

- **RUNTIME-VERIFIED**: seen working in a browser or the live DB on 2026-10-12.
- **CODE-VERIFIED**: read in source, not yet exercised live.
- **UNVERIFIED**: needs the validator session (`VALIDATOR-RUNBOOK.md`).
- **GAP**: a known defect or missing piece that could lower the rating.

**The live observation used throughout**

On 2026-10-12, test customer M1 (user 37) submitted exactly one order, #17, built from the gallery photo "Scrub Suit, V-Neck (Women)":
- Studio text "VFRB TEST" plus an attached reference photo.
- 100 pcs (S 50 / M 50), PO `VALIDATION-TEST-2026-10-12`, notes "VALIDATION TEST 2026-10-12 - do not produce".

Rows written:

| Table | Rows |
|---|---|
| `orders` | #17 |
| `measurements` | 13 (S 50), 14 (M 50) |
| `notifications` | 57 (manager 1), 58 (manager 3), both type `order` |
| `material_recommendations` | 25–28 (AI status `ready`) |
| `order_drafts` | 92, updated |

Both the customer Order Detail and the admin Order Detail render every one of these values. The admin side was checked with the real payload in a stubbed browser, not the live manager session.

## 1. Manual Recording Error Reduction: Recording Accuracy (RA)

| # | Item | Feature, file or route | Live observation | Status | Gap |
|---|---|---|---|---|---|
| RA1 | Accurately records sales orders without errors | Order Wizard (`src/pages/client/OrderWizard.jsx` `validate()`: qty ≥ 100, sizes must sum to qty) → `POST /api/customer/orders` (`OrderController@customerStore`, server-side size-sum 422) | Order #17 stored exactly as entered (qty, sizes, PO, notes, colours, template) | RUNTIME-VERIFIED | none |
| RA2 | Reduces mistakes in raw-material inventory transactions | Inventory stock in/out (`InventoryController@adjustStock`): locked transaction, qty > 0, every movement logged to `inventory_logs` | not exercised (no inventory writes allowed this run) | CODE-VERIFIED | **GAP:** a stock-out larger than stock is clamped to 0 while the log keeps the full requested qty (`InventoryController.php` lines 320 and 330), so the log and the stock stop reconciling. Fix proposal: reject with 422 when qty > stock. Backend change; needs approval. |
| RA3 | Minimizes duplicate entries | 10-second submit lock per customer (`OrderController.php:224`); one delivery per order (409, `DeliveryController.php:102`); unique material code, username and email | submit clicked once; 1 order row created | CODE-VERIFIED (RUNTIME for the single order) | Output logs and physical counts have no same-day duplicate guard (CODE); confirm with Ma'am Fe whether two logs per day are legitimate |
| RA4 | Accurately stores production info and updates | `order_production_tracking`, `daily_output_logs` (`exists:orders`), QC checklist, `ProductionController@advance` (manager) | not exercised (admin read-only this run) | CODE-VERIFIED | none known |
| RA5 | Improves overall accuracy of records | combination of RA1–RA4 plus the activity log (`/admin/activity-log`) | — | UNVERIFIED | depends on the RA2 fix |

## 2. Documentation Completeness (DC), first table

| # | Item | Feature, file or route | Live observation | Status | Gap |
|---|---|---|---|---|---|
| DC1 | All required sales-order info is recorded | `orders` + `measurements` + `studio_config` + reference and preview files; admin `OrderDetail` shows all of them | every field of #17 present in the DB and on both detail pages; before today's fix, admin hid the reference photo and order notes | RUNTIME-VERIFIED (after the Part A fix) | none |
| DC2 | Inventory records complete and updated | `materials` (code, unit, threshold, cost) + `inventory_logs` (who, type, qty, reason, date) | — | CODE-VERIFIED | RA2 clamp makes logs incomplete for over-draws |
| DC3 | Captures all necessary production details | 7 stages matching Ma'am Fe's flow (pattern → segregation → cutting → sewing → QC → pressing → packing), per-size output logs, QC, incidents | — | CODE-VERIFIED | none |
| DC4 | Automatically records transaction details without omission | timestamps and `recorded_by` on logs; notifications on order submit; payments in `sales_transactions` | order submit auto-created 2 notifications and 4 AI material rows | RUNTIME-VERIFIED (order path) | none. As of Part D, the managers' in-app alert is also emailed (Mailtrap sandbox, so no real inbox yet) |
| DC5 | Reports are complete and comprehensive | `/admin/reports` (`AdminReportController@index/salesSummary`), invoice and order PDF | — | CODE-VERIFIED | `top_materials` is always empty (removed for lack of numeric quantities, controller header comment); state this in the defence |

## 3. System Performance Evaluation: Recording Speed (RS)

| # | Item | Feature | Live observation | Status | Gap |
|---|---|---|---|---|---|
| RS1 | Recording orders faster than manual | Studio → Order Wizard (starts at step 2 with a saved design) | scripted run: Save → Review → Submit completed in one pass; human timing not yet taken | UNVERIFIED (stopwatch in the runbook) | no manual baseline exists (the transcript gives none) |
| RS2 | Retrieving sales and inventory records is faster | Orders list search and filters, Inventory search, Order Detail | API on this dev setup: 5 concurrent customer calls finished in 1.6–8.3 s (curl, Laragon → Supabase pooler) | UNVERIFIED | dev latency is high; measure on the deployed build |
| RS3 | (duplicate of RS2, see defects) | same as RS2 | — | UNVERIFIED | the questionnaire defect |
| RS4 | Preparing operational reports faster | `/admin/reports`, invoice PDF | — | UNVERIFIED | none |
| RS5 | Overall transaction processing faster | end-to-end order → confirm → production → delivery → payment | — | UNVERIFIED | none |

## 4. Documentation Completeness, comparative table (labelled "Documentation Completeness"; should be "Comparative Completeness", see defects)

| # | Item | Feature | Status | Gap |
|---|---|---|---|---|
| CC1 | More complete sales documentation than manual | as DC1, compared with the PO notebook | UNVERIFIED (validator judges against their own logbook) | none |
| CC2 | More complete inventory records | as DC2 | UNVERIFIED | RA2 |
| CC3 | More complete production records | as DC3; replaces the out-putter's handwritten per-size tally | UNVERIFIED | none |
| CC4 | System reports contain all necessary info | as DC5 | UNVERIFIED | `top_materials` empty |
| CC5 | Improves completeness of documentation overall | all of the above | UNVERIFIED | none |

## 5. ISO/IEC 25010 (25 items)

| # | Item | Evidence | Status | Gap |
|---|---|---|---|---|
| FS1 | Provides all functions for orders, inventory, production | 25 routed admin pages (`ADMIN-PAGE-MATRIX.md`) plus the customer portal | CODE-VERIFIED | none |
| FS2 | Accurately performs intended functions | as RA1 and DC1 | RUNTIME-VERIFIED (order path) | RA2 |
| FS3 | Raw-material recommendation supports operations | `POST /api/customer/ai/recommend-materials` → `material_recommendations`; admin table shows stock per recommendation | #17 got 4 recommendations (fabric, thread, interfacing, logo patch) | RUNTIME-VERIFIED | quantities are ranges, never shown to customers (locked rule) |
| FS4 | Accurate reports for management | `/admin/reports` | CODE-VERIFIED | DC5 |
| FS5 | Supports business processes | stage flow matches the transcript | CODE-VERIFIED | none |
| IC1 | Easy to learn | — | UNVERIFIED | none |
| IC2 | Clear, user-friendly interface | responsive admin; no horizontal overflow at 375/768/1366 on OrderDetail | RUNTIME-VERIFIED (one page) | none |
| IC3 | Simple, efficient navigation | sidebar plus mobile bottom bar; order id links across pages | CODE-VERIFIED | 3 pages show order ids without a link (matrix finding 6) |
| IC4 | Easy task completion | — | UNVERIFIED | staff see a PDF button that returns 403 (matrix finding 2) |
| IC5 | Understandable feedback and notifications | toasts, empty and error states on all pages; in-app notifications | CODE-VERIFIED | email now covers new order, status, message, QC and low stock (Part D); real delivery needs a production mail provider |
| PE1 | Responds quickly | measured dev latency 1.6–8.3 s for 5 concurrent API calls | RUNTIME (dev only) | **GAP:** slow on dev; measure on production |
| PE2 | Transactions complete in acceptable time | order submit 201 within one scripted step | RUNTIME-VERIFIED (dev) | as PE1 |
| PE3 | Reports generated promptly | — | UNVERIFIED | none |
| PE4 | Good performance in regular use | lazy routes, GET dedupe, 30 s caches | CODE-VERIFIED | none |
| PE5 | Efficient resource use | lazy 3D, chunks excluded from precache | CODE-VERIFIED | none |
| RE1 | Operates without unexpected failures | build passes; 295/295 logic checks | BUILD-VERIFIED | none |
| RE2 | Maintains data accuracy | transactions and row locks on stock and order submit | CODE-VERIFIED | RA2 |
| RE3 | Recovers from errors without data loss | order submit in one DB transaction; drafts autosave | CODE-VERIFIED | none |
| RE4 | Available when needed | hosted backend and database | UNVERIFIED | none |
| RE5 | Reliable in continuous use | — | UNVERIFIED | none |
| SE1 | Requires authentication | Sanctum tokens; login throttle 10/min; email verification for customers | CODE-VERIFIED | none |
| SE2 | Protects sensitive information | customer routes scoped to own orders; 5xx bodies scrubbed (`session.js` `LEAK`) | CODE-VERIFIED | none |
| SE3 | Permissions by role | `role:staff,manager` / `role:manager` / `jobfn:*` plus UI guards (matrix) | CODE-VERIFIED (staff runtime pending) | none |
| SE4 | Safeguards stored data | hosted Postgres; Cloudinary for files | CODE-VERIFIED | none |
| SE5 | Protects accounts and credentials | hashed passwords, throttled reset, verification | CODE-VERIFIED | none |

## Questionnaire defects (reported only; the instrument is not edited)

1. **Recording Speed items 2 and 3 are duplicates.** "Retrieving sales and inventory records is faster than the previous manual process" and "…faster using the system than the previous manual process" measure the same thing. Suggested: split them into sales retrieval and inventory retrieval, or replace one with production-record retrieval.
2. **The second table is mislabelled "Documentation Completeness".** It sits under *System Performance Evaluation* and every item compares the system with the manual process. Suggested label: "Documentation Completeness (Compared with the Manual Process)".
3. **Objectives numbering.** The specific objectives are bullets with no numbers, but the fourth uses sub-numbers 4.1–4.5, so "4" is implied and never shown. Number them 1–4.
4. **The ISO edition does not match the characteristic name.** Objective 4 cites ISO/IEC 25010:2011, whose characteristic is *Usability*. *Interaction capability* is the name in the 2023 revision (ISO/IEC 25010:2023). Either cite 2023 or rename the section *Usability*.
5. Minor: the Designation line has a stray bracket (`[  ]] Other`). Comparative item 4 mixes "contain all necessary … than" (grammar). The scale has no neutral point (4-point scale; acceptable, but state it in the methodology).
