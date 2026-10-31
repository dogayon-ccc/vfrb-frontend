# Change report: origin/main → cleanup/repo-hygiene (frontend)

Generated 2026-10-31 from git refs only (no fetch). Repo: threejs (frontend). No `artisan` → backend sections skipped.

## 1. Baseline and branch state

| Item | Value |
|---|---|
| Current branch | `cleanup/repo-hygiene` |
| HEAD | `4d8b158` |
| origin/main | `e248c9e` (expected e248c9e) |
| merge-base | `e248c9e` |
| Ahead / behind origin/main | 7 / 0 |
| Tags | backup-main-2026-10-29 |
| Local branches | cleanup/repo-hygiene,main,polish/oct29-ui,polish/studio-v3,wip/oct21-overhaul |
| Remote branches | origin,origin/main,origin/polish/oct29-ui |

Branches `polish/oct29-ui`, `polish/studio-v3`, `wip/oct21-overhaul` exist locally; this report covers HEAD only. Commits on them not reachable from HEAD:

- `polish/oct29-ui`: 0 commits not in HEAD, 4 HEAD commits not in it
- `polish/studio-v3`: 0 commits not in HEAD, 1 HEAD commits not in it
- `wip/oct21-overhaul`: 0 commits not in HEAD, 6 HEAD commits not in it

Working tree (`git status --short`, before this report was written):

```
 M docs/engineering/HANDOFF.md
 M docs/engineering/PUBLIC_SITE_ARCHITECTURE.md
D  public/icons.svg
D  public/vite.svg
D  src/assets/ai.png
D  src/assets/download.png
D  src/assets/file.png
D  src/assets/logo-tshirt.png
D  src/assets/stylish-tshirt.png
D  src/assets/swatch.png
D  src/components/ui/SpoolGlyph.jsx
D  src/components/ui/Ticket.jsx
D  src/index.css
D  src/pages/client/design-studio/DragGhost.jsx
D  src/pages/client/design-studio/SpecSheet.jsx
D  src/pages/client/design-studio/dragPlace.js
 M src/pages/client/design-studio/dsShared.js
D  src/pages/client/design-studio/garmentMaterials.js
D  src/pages/client/design-studio/useDragPlace.js
 M src/pages/client/design-studio/useGarmentCanvas.js
 M tools/logic-checks.mjs
?? "barong shirt long sleeve.webp"
?? "barong shirt short sleeve.png"
?? docs/RELEASE_AUDIT_FRONTEND.md
?? "mandarin collar.jpg"
?? "men's slacks.jpg"
?? "pantsuit trousers.jpg"
?? "round neck long sleeve.webp"
```

## 2. Commit history

| # | sha | date | author | subject | mapped prompt |
|---|---|---|---|---|---|
| 1 | `ed8625c` | 2026-10-22 | ogayondavelaurence-pixel | wip: remove code-built 3D, keep Build your own as 2D~ | unmapped |
| 2 | `f26dcb5` | 2026-10-29 | ogayondavelaurence-pixel | chore: ignore tools/out, add flat-from-glb tool and design docs; update logic checks | unmapped |
| 3 | `e83b8ed` | 2026-10-29 | ogayondavelaurence-pixel | feat(ui): design language v2, studio pieces rail and picker badges, order wizard split, request access page | unmapped |
| 4 | `2074ec7` | 2026-10-30 | ogayondavelaurence-pixel | fix(mobile): 44px footer links, safe-area insets on public header | unmapped |
| 5 | `d283940` | 2026-10-30 | ogayondavelaurence-pixel | feat(studio,customer): tool rail, complete-outfit label, navy customer pages, 3D label and retry fixes | unmapped |
| 6 | `e4714a5` | 2026-10-30 | ogayondavelaurence-pixel | feat(pwa): prompt before updating, keep the Studio safe, 44px forgot-password link, ignore root GLBs | unmapped |
| 7 | `4d8b158` | 2026-10-31 | ogayondavelaurence-pixel | chore: remove unused assets and dead components | unmapped |

Narrative (from commit messages only):

- `ed8625c` WIP: removes code-built 3D; "Build your own" stays 2D.
- `f26dcb5` Tooling: ignores tools/out, adds flat-from-glb tool and design docs, updates logic checks.
- `e83b8ed` UI: design language v2, Studio pieces rail and picker badges, order wizard split, request-access page.
- `2074ec7` Mobile: 44px footer links, safe-area insets on public header.
- `d283940` Studio/customer: tool rail, complete-outfit label, navy customer pages, 3D label and retry fixes.
- `e4714a5` PWA: prompt before updating, Studio safety, 44px forgot-password link, root GLBs ignored.
- `4d8b158` Cleanup: removes unused assets and dead components.

Per-commit size (`git show --shortstat`):

| sha | files / insertions / deletions |
|---|---|
| `ed8625c` | 129 files changed, 4772 insertions(+), 4654 deletions(-) |
| `f26dcb5` | 9 files changed, 580 insertions(+), 50 deletions(-) |
| `e83b8ed` | 140 files changed, 4639 insertions(+), 3539 deletions(-) |
| `2074ec7` | 2 files changed, 5 insertions(+), 5 deletions(-) |
| `d283940` | 27 files changed, 419 insertions(+), 414 deletions(-) |
| `e4714a5` | 7 files changed, 33 insertions(+), 18 deletions(-) |
| `4d8b158` | 13 files changed, 491 deletions(-) |

## 3. File delta (`git diff origin/main..HEAD`)

| Added | Modified | Deleted | Renamed | shortstat |
|---|---|---|---|---|
| 67 | 139 | 22 | 0 | 228 files changed, 9829 insertions(+), 8552 deletions(-) |

### Added files

- `docs/3D_INTAKE.md`
- `docs/CATALOG_STATUS.md`
- `docs/DESIGN_LANGUAGE.md`
- `docs/FLATS.md`
- `docs/FONTS.md`
- `docs/UX_REDESIGN.md`
- `docs/engineering/HANDOFF.md`
- `docs/engineering/STUDIO-INTERACTION-BRIEF.md`
- `public/fonts/bricolage-grotesque-latin-600.woff2`
- `public/fonts/bricolage-grotesque-latin-700.woff2`
- `public/fonts/source-sans-3-latin-400.woff2`
- `public/fonts/source-sans-3-latin-500.woff2`
- `public/fonts/source-sans-3-latin-700.woff2`
- `src/assets/flats/scrub-top-vneck-short/back.svg`
- `src/assets/flats/scrub-top-vneck-short/front.svg`
- `src/assets/flats/scrub-top-vneck-three-quarter/back.svg`
- `src/assets/flats/scrub-top-vneck-three-quarter/front.svg`
- `src/components/SizeChartTable.jsx`
- `src/components/UpdatePrompt.jsx`
- `src/components/admin/ClientMaterialsPanel.jsx`
- `src/components/site/LegalPage.jsx`
- `src/components/ui/ActionMenu.jsx`
- `src/components/ui/Drawer.jsx`
- `src/components/ui/Meter.jsx`
- `src/components/ui/NavBadge.jsx`
- `src/components/ui/Skeleton.jsx`
- `src/components/ui/SpoolGlyph.jsx`
- `src/components/ui/StitchDivider.jsx`
- `src/components/ui/SwatchTile.jsx`
- `src/components/ui/ThreadPull.jsx`
- `src/components/ui/Ticket.jsx`
- `src/dev/layouts/Dashboards.jsx`
- `src/dev/layouts/DevLayouts.jsx`
- `src/dev/layouts/OptionGuided.jsx`
- `src/dev/layouts/OptionWorkspace.jsx`
- `src/dev/layouts/devLayouts.css`
- `src/dev/layouts/mock.js`
- `src/dev/layouts/parts.jsx`
- `src/hooks/useKeyboardInset.js`
- `src/hooks/useListKeys.js`
- `src/hooks/useObjectUrl.js`
- `src/hooks/useUnreadMessages.js`
- `src/layouts/adminNav.js`
- `src/pages/auth/RequestAccess.jsx`
- `src/pages/client/design-studio/GarmentCarousel.jsx`
- `src/pages/client/design-studio/PiecesRail.jsx`
- `src/pages/client/design-studio/SizeProportions.jsx`
- `src/pages/client/design-studio/ToolRail.jsx`
- `src/pages/client/design-studio/editHistory.js`
- `src/pages/client/design-studio/flatPaths.js`
- `src/pages/client/design-studio/railTools.js`
- `src/pages/client/design-studio/saveStatus.js`
- `src/pages/client/order-wizard/OrderSummary.jsx`
- `src/pages/client/order-wizard/WizardSteps.jsx`
- `src/pages/client/order-wizard/orderForm.js`
- `src/styles/tokens-v2.css`
- `src/utils/adminResources.js`
- `src/utils/designActions.js`
- `src/utils/materialColour.js`
- `src/utils/requestOnce.js`
- `src/utils/studioIntent.js`
- `src/utils/uploadRules.js`
- `tools/flat-from-glb.html`
- `tools/flat-from-glb.mjs`
- `tools/glb-extract/served-sha256.json`
- `tools/modelFiles.mjs`
- `tools/served-glbs.mjs`

### Deleted files

- `docs/engineering/ADR-custom-3d.md`
- `docs/engineering/VFRB-HANDOFF.md`
- `src/assets/auth-notions.png`
- `src/assets/dm-serif-display-latin-400.woff2`
- `src/assets/hero.png`
- `src/assets/react.svg`
- `src/assets/vite.svg`
- `src/components/Footer.jsx`
- `src/components/InlineColorPicker.jsx`
- `src/components/MarketingNav.jsx`
- `src/components/admin/statusTone.js`
- `src/pages/admin/StaffDashboard.jsx`
- `src/pages/auth/Register.jsx`
- `src/pages/client/design-studio/BottomHints.jsx`
- `src/pages/client/design-studio/OnboardingOverlay.jsx`
- `src/pages/client/design-studio/PieceSelector.jsx`
- `src/pages/client/design-studio/StudioDock.jsx`
- `src/pages/client/design-studio/customMesh3D.js`
- `src/utils/navColors.js`
- `tools/WORN-PHOTOS.md`
- `tools/build_garment_models.py`
- `tools/build_school_set_glb.py`

### Top 40 modified files by lines changed (`--numstat`)

| file | + | - | total |
|---|---|---|---|
| `src/pages/client/OrderWizard.jsx` | 147 | 1492 | 1639 |
| `src/pages/client/OrderDetail.jsx` | 352 | 855 | 1207 |
| `src/pages/client/design-studio/DesignStudioStyles.jsx` | 471 | 369 | 840 |
| `tools/logic-checks.mjs` | 346 | 190 | 536 |
| `src/styles/customer.css` | 414 | 117 | 531 |
| `src/layouts/AdminLayout.jsx` | 262 | 265 | 527 |
| `src/pages/admin/Inventory.jsx` | 240 | 166 | 406 |
| `src/pages/admin/Dashboard.jsx` | 150 | 242 | 392 |
| `src/pages/admin/Orders.jsx` | 108 | 213 | 321 |
| `src/pages/client/DesignStudio.jsx` | 171 | 149 | 320 |
| `src/pages/client/Dashboard.jsx` | 114 | 162 | 276 |
| `src/pages/client/design-studio/ToolDrawer.jsx` | 141 | 130 | 271 |
| `src/pages/admin/UserManagement.jsx` | 165 | 81 | 246 |
| `src/pages/client/design-studio/useGarmentCanvas.js` | 170 | 54 | 224 |
| `src/pages/admin/Settings.jsx` | 108 | 79 | 187 |
| `src/pages/admin/OrderDetail.jsx` | 117 | 66 | 183 |
| `src/pages/Landing.jsx` | 49 | 129 | 178 |
| `src/pages/admin/Materials.jsx` | 109 | 53 | 162 |
| `src/pages/client/design-studio/CanvasViewport.jsx` | 76 | 77 | 153 |
| `src/styles/theme.css` | 139 | 10 | 149 |
| `src/pages/admin/ProductionList.jsx` | 43 | 89 | 132 |
| `src/pages/client/AIMaterials.jsx` | 90 | 40 | 130 |
| `src/pages/client/MyDesigns.jsx` | 65 | 62 | 127 |
| `src/pages/client/AccountSettings.jsx` | 40 | 80 | 120 |
| `src/pages/admin/ProductionTracking.jsx` | 63 | 56 | 119 |
| `src/pages/client/Orders.jsx` | 41 | 71 | 112 |
| `src/pages/client/design-studio/garmentPaths.js` | 63 | 45 | 108 |
| `src/pages/client/design-studio/TopBar.jsx` | 82 | 19 | 101 |
| `src/styles/admin.css` | 75 | 19 | 94 |
| `src/pages/client/design-studio/LogoAssets.jsx` | 57 | 30 | 87 |
| `src/pages/admin/DeliveryTracking.jsx` | 59 | 24 | 83 |
| `src/pages/admin/Invoice.jsx` | 28 | 52 | 80 |
| `src/components/customer/kit.jsx` | 35 | 43 | 78 |
| `src/components/AppearanceField.jsx` | 51 | 25 | 76 |
| `src/pages/client/Messages.jsx` | 54 | 20 | 74 |
| `src/pages/FAQ.jsx` | 12 | 60 | 72 |
| `src/pages/client/design-studio/ScannedGarmentMesh.jsx` | 27 | 45 | 72 |
| `src/pages/admin/CustomersMaster.jsx` | 67 | 3 | 70 |
| `src/pages/PrivacyPolicy.jsx` | 14 | 52 | 66 |
| `src/layouts/CustomerLayout.jsx` | 31 | 33 | 64 |

### Per top-level directory (all statuses)

| dir | A | M | D | + | - |
|---|---|---|---|---|---|
| `(root)` | 0 | 2 | 0 | 7 | 15 |
| `docs` | 8 | 1 | 2 | 318 | 377 |
| `public` | 5 | 0 | 0 | 0 | 0 |
| `src` | 49 | 134 | 17 | 8446 | 7812 |
| `tools` | 5 | 2 | 3 | 1058 | 348 |

## 4. Uncommitted work (UNCOMMITTED)

### UNCOMMITTED: working tree vs HEAD (`git diff HEAD`)

| Added | Modified | Deleted | Renamed | shortstat |
|---|---|---|---|---|
| 0 | 5 | 16 | 0 | 21 files changed, 10 insertions(+), 439 deletions(-) |

### UNCOMMITTED: staged (`git diff --cached`)

| Added | Modified | Deleted | Renamed | shortstat |
|---|---|---|---|---|
| 0 | 0 | 16 | 0 | 16 files changed, 431 deletions(-) |

### UNCOMMITTED: untracked (names only, not staged)

- `barong shirt long sleeve.webp`
- `barong shirt short sleeve.png`
- `docs/RELEASE_AUDIT_FRONTEND.md`
- `mandarin collar.jpg`
- `men's slacks.jpg`
- `pantsuit trousers.jpg`
- `round neck long sleeve.webp`

## 5. Dependencies and config

| file | status in origin/main..HEAD |
|---|---|
| `package.json` | unchanged |
| `package-lock.json` | unchanged |
| `vite.config.js` | +2 / -13 |
| `vercel.json` | unchanged |

Dependencies added/removed/version-changed: 0 changed lines in package.json.

`vite.config.js` changed lines:

```diff
-      registerType: "autoUpdate",
+      registerType: "prompt",
-        // Aug 30 2026 hardening — verified live Railway bug: a browser
-        // tab's old service worker (or its precached index.html) can keep
-        // serving a stale asset manifest after a redeploy, so a
-        // lazy-loaded route requests a chunk hash that no longer exists
-        // on the server → MIME error, page crash (see
-        // PageErrorBoundary.jsx's chunk-load fix, added same session,
-        // which is the other half of this). skipWaiting + clientsClaim
-        // make a new service worker take over immediately instead of
-        // waiting for every open tab to close first; cleanupOutdatedCaches
-        // drops any precache entries from a prior build the moment the
-        // new one activates.
-        skipWaiting: true,
+        // New worker waits for the user's Refresh (UpdatePrompt), so the old precache keeps serving its own chunks.
```

Env variable names referenced at HEAD (src/, vite.config.js):

- `DEV`
- `VITE_API_URL`
- `VITE_MODEL_BASE_URL`

## 6. Frontend changes

### src/ by area (two path levels)

| area | A | M | D | + | - |
|---|---|---|---|---|---|
| `src/App.jsx` | 0 | 1 | 0 | 20 | 30 |
| `src/assets` | 0 | 0 | 5 | 0 | 2 |
| `src/assets/flats` | 4 | 0 | 0 | 28 | 0 |
| `src/components` | 2 | 5 | 3 | 171 | 342 |
| `src/components/admin` | 1 | 3 | 1 | 217 | 42 |
| `src/components/customer` | 0 | 1 | 0 | 35 | 43 |
| `src/components/site` | 1 | 4 | 0 | 104 | 8 |
| `src/components/ui` | 10 | 9 | 0 | 345 | 65 |
| `src/dev/layouts` | 7 | 0 | 0 | 923 | 0 |
| `src/hooks` | 4 | 0 | 0 | 113 | 0 |
| `src/layouts` | 1 | 2 | 0 | 340 | 298 |
| `src/main.css` | 0 | 1 | 0 | 18 | 5 |
| `src/main.jsx` | 0 | 1 | 0 | 2 | 0 |
| `src/pages` | 0 | 9 | 0 | 97 | 306 |
| `src/pages/admin` | 0 | 20 | 1 | 1370 | 1425 |
| `src/pages/auth` | 1 | 3 | 1 | 130 | 224 |
| `src/pages/client` | 11 | 59 | 5 | 3515 | 4756 |
| `src/styles` | 1 | 10 | 0 | 819 | 214 |
| `src/utils` | 6 | 6 | 1 | 199 | 52 |

### API client endpoint strings in changed lines (`api|axios|http|client`.get/post/put/patch/delete)

**Added lines:**

- `/api/admin/customer-contacts` (1)
- `/api/admin/dashboard` (1)
- `/api/admin/delivery/${delivery.tracking_id}/status` (2)
- `/api/admin/inventory/client-stock` (1)
- `/api/admin/inventory/export` (1)
- `/api/admin/inventory/stock-${type}` (1)
- `/api/admin/materials` (1)
- `/api/admin/materials/${item.material_id}` (1)
- `/api/admin/materials/${matId}/adjust` (1)
- `/api/admin/orders` (2)
- `/api/admin/orders/${order.order_id}/${kind}` (1)
- `/api/admin/orders/${order.order_id}/client-materials` (1)
- `/api/admin/orders/${orderId}` (1)
- `/api/admin/orders/${orderId}/client-materials` (1)
- `/api/admin/orders/production-summaries` (1)
- `/api/admin/orders?status=pending&per_page=5` (1)
- `/api/admin/output-logs` (1)
- `/api/admin/physical-counts` (1)
- `/api/admin/users` (2)
- `/api/admin/users/${user.user_id}` (1)
- `/api/customer/billing-profiles/${p.billing_id}` (1)
- `/api/customer/designs/${d.id}/copy` (1)
- `/api/customer/designs/${own}` (1)
- `/api/customer/messages?per_page=100` (1)
- `/api/customer/orders` (1)
- `/api/customer/orders/${orderId}` (1)
- `/api/customer/upload-rules` (1)

**Removed lines:**

- `/api/${scope}/orders/${orderId}/billing` (1)
- `/api/admin/ai/analytics-summary` (1)
- `/api/admin/dashboard` (1)
- `/api/admin/dashboard/staff` (1)
- `/api/admin/delivery?per_page=20` (1)
- `/api/admin/inventory/export` (1)
- `/api/admin/inventory/stock-${type}` (1)
- `/api/admin/materials` (1)
- `/api/admin/materials/${item.material_id}` (1)
- `/api/admin/orders` (2)
- `/api/admin/orders/${order.order_id}/invoice-pdf` (1)
- `/api/admin/orders/${orderId}` (1)
- `/api/admin/orders/${orderId}/production` (1)
- `/api/admin/orders/production-summaries` (2)
- `/api/admin/orders?status=pending&per_page=5` (1)
- `/api/admin/output-logs?order_id=${orderId}` (1)
- `/api/admin/rfq?status=sent&per_page=5` (1)
- `/api/admin/users` (2)
- `/api/admin/users/${user.user_id}` (1)
- `/api/customer/billing-profiles/${p.billing_id}` (1)
- `/api/customer/delivery/${orderId}` (1)
- `/api/customer/messages/${orderId}?per_page=3` (1)
- `/api/customer/orders` (1)
- `/api/customer/orders/${orderId}` (1)
- `/api/customer/orders/${orderId}/ai-recommendation` (1)
- `/api/customer/orders?per_page=100` (1)
- `/api/customer/profile` (1)
- `/api/register` (1)

### Router (`src/App.jsx`) route lines changed

```diff
-          <Route path="/register"        element={<GuestOnly><AuthGate><CustomerRegister/></AuthGate></GuestOnly>}/>
+          <Route path="/register"        element={<Navigate to="/login" replace/>}/>
-            <Route path="reports"   element={<RequireManager owner><AdminReports/></RequireManager>}/>
+            <Route path="reports"   element={<RequireManager><AdminReports/></RequireManager>}/>
-            <Route path="activity-log" element={<RequireManager owner><AdminActivityLog/></RequireManager>}/>
-            <Route path="audit-logs" element={<RequireManager owner><AdminAuditLog/></RequireManager>}/>
-            <Route path="invoice"   element={<RequireManager owner><AdminInvoice/></RequireManager>}/>
+            <Route path="activity-log" element={<RequireManager><AdminActivityLog/></RequireManager>}/>
+            <Route path="audit-logs" element={<RequireManager><AdminAuditLog/></RequireManager>}/>
+            <Route path="invoice"   element={<RequireManager><AdminInvoice/></RequireManager>}/>
+          {DevLayouts && <Route path="/dev/layouts" element={<Suspense fallback={null}><DevLayouts/></Suspense>}/>}
```

### Deleted files by commit (reason = commit subject) and size

| commit | subject | files | bytes (`git cat-file -s` at parent) |
|---|---|---|---|
| `ed8625c` | wip: remove code-built 3D, keep Build your own as 2D~ | 6 | 65964 |
| `e83b8ed` | feat(ui): design language v2, studio pieces rail and picker badges, order wizard split, request access page | 2 | 6577 |
| `d283940` | feat(studio,customer): tool rail, complete-outfit label, navy customer pages, 3D label and retry fixes | 1 | 41131 |
| `4d8b158` | chore: remove unused assets and dead components | 13 | 324442 |
| | **net deleted vs origin/main** | 22 | 438227 |

### `tools/logic-checks.mjs` (not run)

- numstat: +346 / -190
- check calls (lines matching `^\s*t(`) at `e248c9e`: 386
- check calls (lines matching `^\s*t(`) at `4d8b158`: 422

## 7. Workflow changes

Frontend only; no constants/enums for production stages, statuses, returns or pickup appear in this repo's diff as evidence of backend business rules. Changed lines mentioning status/stage keywords:

| sign | lines matching `status|stage|assigned_stage|overdue|pickup|return` in src diff |
|---|---|
| + | 857 |
| - | 586 |

## 8. Tests

Test/spec files in diff: 0 . Tests were not run (UNVERIFIED).

## 9. Cross-repo contract

Run in the other repo, then compare (backend report not present in this working directory).

## 10. Prompt/milestone mapping

| prompt | commits | files |
|---|---|---|

Unmapped commits: `ed8625c` `f26dcb5` `e83b8ed` `2074ec7` `d283940` `e4714a5` `4d8b158` 

No commit message names M1–M16 or Account 1–5; any link to those prompts is UNVERIFIED.

## 11. UNVERIFIED register

| item | check that would prove it |
|---|---|
| origin/main is current with GitHub (no fetch run) | `git fetch` then `git rev-parse origin/main` |
| Vercel deployment matches e248c9e | Vercel dashboard / `vercel ls` |
| Build passes at HEAD | `npm run build` |
| logic checks pass | `node tools/logic-checks.mjs` |
| Runtime behaviour of each commit ("fixes", 44px targets, PWA prompt, 3D retry) | QA walkthrough in running app |
| Commit ↔ M1–M16 / Account 1–5 links | prompt text (not in repo) vs commit diffs |
| Backend contract / live Supabase migration state | backend report + `php artisan migrate:status` on live (read-only) |
| Unmerged branches' content shipped or not | `git log HEAD..<branch>` review |
