# Inventory QR verification aid — feasibility & gap (Account 4, Sept 30 2026)

Requested flow: RAW MATERIAL → QR identifier → staff scans → system identifies material → recorded stock shown →
staff enters physical count → variance shown. Verification/input aid ONLY (no auto-reconcile, no auto-adjust).

## What already exists (verified in repo/schema)
- Stable identifier: `materials.material_id` (bigint PK). Also `material_name`, `category`, `unit`, `quantity_in_stock`, `reorder_threshold`.
- Count storage: `physical_count_logs` (`system_qty`, `physical_qty`, generated `variance` / `variance_pct`, `counted_by`, `count_date`, `reconciled*`, `stock_adjusted`).
- API: `GET/POST /api/admin/physical-counts`, `GET /physical-counts/sheet` (all under `jobfn:inventory`); reconcile is a separate manager-approved step.
- UI: `PhysicalCount.jsx` already lets staff pick a material, enter a physical qty and previews the variance.

## What does NOT exist (the gap)
1. No QR/barcode/SKU column on `materials`. (`scanned_via_qr` exists only on the output-log table for `order_id`.)
2. No QR **decoder** (camera) or QR **generator** dependency in `package.json`; no label-printing screen.
3. No agreed payload format for a material QR.

## Smallest viable design (NOT implemented — needs Account 2 + owner sign-off)
- Payload: `vfrb:mat:<material_id>` — no schema change; resolve via the existing authenticated materials/physical-count sheet data.
  Caveat: ids are sequential; safe only because resolving requires a staff session, and the payload holds no stock data.
- Frontend: add one camera-scan button in `PhysicalCount.jsx` that only PRE-SELECTS the material in the existing form
  (recorded qty then appears via the existing preview). Needs a decoder dependency (e.g. `html5-qrcode`) — lazy-loaded.
- Labels: a print sheet generating one QR per material (generator dependency) — optional, can be phase 2.
- Must NOT touch reconcile / stock adjustment logic.

## Decision needed
Approve payload format + the two dependencies, or keep manual material selection (current, works today).
