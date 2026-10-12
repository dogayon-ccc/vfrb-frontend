# Admin page matrix

Read-only audit of the 25 files in `src/pages/admin`, made on 2026-10-12. The frontend was at HEAD `04847e1` plus the Part A change; the backend was at `76454c2`.

## How to read it

**Evidence labels**

- **CODE**: read from source (`src/App.jsx` routes, page source, `routes/api.php`, and controllers).
- **RUNTIME**: rendered in a browser. For admin pages this means a headless browser that answered every `/api` call with the real payloads, dumped read-only from the live DB. A local fake manager identity satisfied the UI guard only, no backend call was made, and every write was refused locally. It was not the live manager session.
- **UNVERIFIED**: not checked.

**Gates**

- **S+M**: route group `role:staff,manager`. **MGR**: `role:manager`.
- `jobfn:x`: `JobFunctionMiddleware`, where staff need the production or inventory job function.
- UI gates: `RequireManager` / `RequireArea` in `src/App.jsx`. Every page also sits behind `RequireAuth role="admin"` (manager or staff).

**Columns**

- **States**: L = loading skeleton, E = empty message, X = error message, R = retry button.
- **Order link**: whether an order id on the page opens `/admin/orders/:id` (the order identity link).

All 25 pages are registered as lazy routes under `/admin/*` in `src/App.jsx` (lines 52–90 and 246–287). No admin page file is unrouted.

## Matrix

| Page (file, lines) | Route, UI gate | API endpoints, API gate | Main tables | States | Order link | Dead code | Evidence |
|---|---|---|---|---|---|---|---|
| Dashboard.jsx (271) | `/admin/dashboard`, manager only via `DashboardHome` | GET dashboard (S+M); orders?status=pending (S+M); rfq (S+M); delivery (S+M); ai/analytics-summary (MGR) | orders, sales_transactions, materials, delivery_tracking, purchase_orders | L E X R | Yes | none | CODE |
| StaffDashboard.jsx (191) | `/admin/dashboard`, staff via `DashboardHome` | GET dashboard/staff (S+M) | as above, scoped to job function | L E; error is a toast only, no in-page block | Yes | none | CODE |
| Orders.jsx (306) | `/admin/orders`, admin | GET orders (S+M); PATCH orders/{id}/confirm (MGR; button shown only to managers) | orders ⨝ users | L E X R | Yes, row click to `/admin/orders/:id` (no `<a href>`) | none | RUNTIME (order 17 row: "#17 Oct 12 M1 Slice Test Direct Scrub Top 100 pcs · Navy Blue Pending") |
| OrderDetail.jsx (413) | `/admin/orders/:id`, admin | GET orders/{id} (S+M); GET orders/{id}/production (S+M); PATCH orders/{id} (S+M route, manager check in `adminUpdate` line 585); GET invoice-pdf (MGR) | orders, users, measurements, material_recommendations, sales_transactions, order_production_tracking | L E X | Header shows `Order #id`; links to production and messages for the same id | none | RUNTIME at 1366/768/375 for orders 17 and 16 |
| ProductionList.jsx (173) | `/admin/production`, `RequireArea production` | GET orders?status=production (S+M) | orders | L E X R | To `/admin/production/:id` (by design), not order detail | none | CODE |
| ProductionTracking.jsx (239) | `/admin/production/:orderId`, `RequireArea production` | GET orders/{id}, production, output-logs (S+M, jobfn:production for logs); POST advance and PATCH confirm (MGR; manager-only buttons) | order_production_tracking, daily_output_logs, orders | L E X R | Yes | none | CODE |
| DailyOutputLog.jsx (439) | `/admin/output-log`, `RequireArea production` | GET orders, output-logs, summary (jobfn:production); POST output-logs (jobfn:production) | daily_output_logs, order_production_tracking | L E X | Yes | none | CODE |
| QCChecklist.jsx (254) | `/admin/qc`, `RequireArea production` | GET orders?status=qc (S+M); GET/POST orders/{id}/qc (jobfn:production) | qc_checklists, orders | L E X R | Yes | none | CODE |
| ProductionIncidents.jsx (292) | `/admin/production-incidents`, `RequireArea production` | GET/POST production-incidents; PATCH acknowledge/resolve (jobfn:production) | production_incidents | L E X | Shows `Order #id`, no link; id typed by hand (validated `nullable\|exists:orders`) | none | CODE |
| Inventory.jsx (279) | `/admin/inventory`, `RequireArea inventory` | GET inventory, inventory/logs (S+M, no jobfn); POST stock-in/out (jobfn:inventory) | materials, inventory_logs | L E X R | n/a | none | CODE |
| Materials.jsx (208) | `/admin/materials`, `RequireArea inventory` | GET/POST/PUT materials (jobfn:inventory) | materials | L E X | n/a | none | CODE |
| PhysicalCount.jsx (529) | `/admin/physical-count`, `RequireArea inventory` | GET counts, summary, sheet; POST counts (jobfn:inventory); PATCH reconcile (MGR) | physical_count_logs, materials, inventory_logs | L E X | n/a | `SK` const unused | CODE |
| PurchaseOrders.jsx (840) | `/admin/procurement`, `RequireArea inventory` | rfq, purchase-orders, suppliers, materials (S+M, no jobfn); convert-po and confirm-color (MGR) | rfq_requests, rfq_responses, purchase_orders, purchase_order_items, suppliers | L E X R | n/a | `SK` const unused | CODE |
| Suppliers.jsx (142) | `/admin/suppliers`, `RequireManager` | GET suppliers (S+M); POST/PUT (MGR) | suppliers (master data only, no portal) | L E X R | n/a | none | CODE |
| DeliveryTracking.jsx (354) | `/admin/delivery`, admin | GET delivery; PATCH status/delivered; POST transactions (S+M) | delivery_tracking, sales_transactions | L E X R | Shows `Order #id`, no link | `SK` const unused | CODE |
| SalesTransactions.jsx (352) | `/admin/transactions`, admin | GET orders, orders/{id}, transactions; POST transactions (S+M) | sales_transactions, orders | L E X | Yes | none | CODE |
| Invoice.jsx (404) | `/admin/invoice`, `RequireManager` | GET orders/{id} (S+M); invoice-pdf (MGR) | orders (via `buildOrderDetail`) | L X; empty means "Enter an order ID" | Yes; id typed by hand | none | CODE |
| Messages.jsx (213) | `/admin/messages`, admin | GET/POST messages (S+M); GET orders/{id} | order_messages, notifications | L E X R | Yes (`?order=` deep link) | none | CODE |
| CustomersMaster.jsx (202) | `/admin/customers`, admin | GET customers (S+M) | users, orders | L E X R | n/a | none | CODE |
| Reports.jsx (299) | `/admin/reports`, `RequireManager` | GET reports, reports/sales; POST automation/run-digest (MGR) | orders, sales_transactions, materials | L E X R | Lists affected order ids, no link | none | CODE |
| Feedback.jsx (108) | `/admin/feedback`, `RequireManager` | GET/PATCH feedback (MGR) | feedback | L E X | n/a | none | CODE |
| ActivityLog.jsx (175) | `/admin/activity-log`, `RequireManager` | GET activity-log, action-types (MGR) | read-only union of 10 operational tables | L E X | n/a | none | CODE |
| UserManagement.jsx (371) | `/admin/users`, `RequireManager` | users CRUD and toggle (MGR) | users, roles, model_has_roles | L E X R | n/a | `TTL` import and `SK` const unused | CODE |
| ShowcaseModerationQueue.jsx (103) | `/admin/designs/showcase-queue`, `RequireManager` | showcase-queue, approve, reject (MGR) | designs, design_showcase_audits | L E X | n/a | none | CODE |
| Settings.jsx (182) | `/admin/settings`, admin; company edit is gated in-page | GET company (S+M); PATCH company and logo (MGR); GET/PATCH `/api/settings/notifications` (auth only) | company_settings, notification_preferences | L E X R | n/a | none | CODE |

## Findings

1. **`AdminOrderController` does not exist** (CODE). There is no such file in `app/Http/Controllers` and no route references it. Admin orders are served by `OrderController@adminIndex/adminShow/adminUpdate` and `ProductionController@confirm/advance`. Nothing to remove.
2. **Staff see a PDF button they cannot use** (CODE). In OrderDetail, staff see "Order Summary (PDF)", but `GET orders/{id}/invoice-pdf` is MGR, so a staff click gets a 403 toast. The fix would be to hide the button for staff. Not changed in this run, because the brief scoped Part A edits to the design panel.
3. **Staff see Track Production without the production area** (CODE). OrderDetail shows Track Production and the QC link to any admin user. A staff account without the production job function lands on `AccessDenied`. The QC link is already area-gated; Track Production is not.
4. **UI and API gates differ for procurement and inventory reads** (CODE). `rfq`, `purchase-orders` and `inventory` GETs are S+M with no `jobfn:inventory`, while the UI gates the pages with `RequireArea inventory`. The UI is stricter; nothing leaks.
5. **Dead code** (CODE): unused `SK` style const in DeliveryTracking, PhysicalCount, PurchaseOrders and UserManagement, plus an unused `TTL` import in UserManagement. Harmless and not removed in this read-only audit.
6. **Order identity**: DeliveryTracking, ProductionIncidents and Reports show order ids without a link to `/admin/orders/:id`. ProductionList links to production tracking by design.
7. **Part A gap, fixed**: OrderDetail hid the customer's reference photo whenever a Studio design existed, and never showed the order notes, the gallery photo the design started from, the template, or the zone colours. All are now shown read-only (see the Part A report).

## Staff-role checks

Every "staff" statement above is CODE-verified from route gates only, as the user instructed. Staff runtime checks are pending until the user signs in as staff.
