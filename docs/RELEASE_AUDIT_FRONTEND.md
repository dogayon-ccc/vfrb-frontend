# Release audit: frontend (cleanup/repo-hygiene vs main)

Date: 2026-10-31. Repo: `C:\Users\Dave\Desktop\threejs`. Read-only audit; this file is the only thing written.
Labels: CODE-VERIFIED (read in git or source), BUILD-VERIFIED (real run on this date), UNVERIFIED.

## 1. Baseline

| Item | Value | Evidence |
|---|---|---|
| Current branch | `cleanup/repo-hygiene` | CODE-VERIFIED `git branch --show-current` |
| HEAD | `4d8b158` | CODE-VERIFIED |
| main tip (last deploy) | `e248c9e`, matches the brief | CODE-VERIFIED `git rev-parse main` |
| Commits ahead / behind | 7 ahead, 0 behind | CODE-VERIFIED `git rev-list --count` |
| Fast-forward | Yes, main is an ancestor of HEAD | CODE-VERIFIED `git merge-base --is-ancestor` |
| Local branches | main, cleanup/repo-hygiene, polish/oct29-ui, polish/studio-v3, wip/oct21-overhaul | CODE-VERIFIED `git branch -a` |
| Remote branches | origin/main, origin/polish/oct29-ui | CODE-VERIFIED |
| Backend pair | `vfrb-capstone` on `wip/oct21-overhaul` (`c9c6428`), 6 commits ahead of its main `699c644` | CODE-VERIFIED |

Uncommitted state from before this audit (not made by it):

- Staged deletions: `public/icons.svg`, `public/vite.svg`, `src/assets/{ai,download,file,logo-tshirt,stylish-tshirt,swatch}.png`, `src/index.css`, `src/components/ui/SpoolGlyph.jsx`, `src/components/ui/Ticket.jsx`, `design-studio/{DragGhost.jsx,SpecSheet.jsx,dragPlace.js,garmentMaterials.js,useDragPlace.js}`.
- Unstaged edits: `docs/engineering/HANDOFF.md`, `docs/engineering/PUBLIC_SITE_ARCHITECTURE.md`, `design-studio/dsShared.js`, `design-studio/useGarmentCanvas.js`, `tools/logic-checks.mjs`.
- Untracked reference photos in the repo root: `barong shirt long sleeve.webp`, `barong shirt short sleeve.png`, `mandarin collar.jpg`, `men's slacks.jpg`, `pantsuit trousers.jpg`, `round neck long sleeve.webp`.

The success criterion "git status shows only the new report" cannot hold, because the tree was already dirty. The build and checks in section 8 ran against this working tree, uncommitted changes included.

## 2. History (`git log main..HEAD --no-merges`), grouped by theme

| Theme | Commits | What changed |
|---|---|---|
| Roles and access | e83b8ed | Owner shares the manager dashboard; OwnerGate removed; `isAdmin` added (`src/App.jsx`, `src/utils/jobAccess.js`) |
| Login and request access | e83b8ed, e4714a5 | `/register` redirects to `/login`; new `RequestAccess.jsx`; 44px forgot-password link |
| Customer shell | d283940 | Navy customer pages, complete-outfit label |
| Studio | ed8625c, e83b8ed, d283940 | Code-built 3D removed; 2D Build your own; pieces rail, picker badges, tool rail, 3D label and retry fixes |
| Order wizard | e83b8ed | Wizard split into `WizardSteps.jsx`, `OrderSummary.jsx`, `orderForm.js` |
| Order detail | d283940 | Retry fixes (commit subject) |
| Admin shell | e83b8ed | One nav config, `src/layouts/adminNav.js` |
| Design language | e83b8ed | Design language v2, `src/styles/tokens-v2.css`, self-hosted fonts |
| PWA and mobile | 2074ec7, e4714a5 | Update prompt, safe-area insets, 44px footer links |
| Uploads | e83b8ed | `src/utils/uploadRules.js` |
| Tests | f26dcb5 | `tools/logic-checks.mjs` updated |
| Docs and tooling | f26dcb5, 4d8b158 | flat-from-glb tool, design docs, unused assets removed |

All rows are CODE-VERIFIED against commit subjects and `--name-status`. Which file landed in which commit is approximate.

## 3. Files

Totals: 228 files changed, +9,829 / −8,552 lines. 67 added, 22 deleted, 139 modified, 0 renamed with `-M`. CODE-VERIFIED.

Counts by area (files touched):

| Area | Files | Area | Files |
|---|---|---|---|
| src/pages/client (excluding Studio) | 21 | src/assets | 9 |
| design-studio (`src/pages/client/design-studio`) | 54 | src/dev | 7 |
| src/components | 40 | src/pages/auth | 5 |
| src/pages/admin | 21 | public | 5 |
| src/utils | 13 | src/hooks | 4 |
| src/styles | 11 | src/layouts | 3 |
| docs | 11 | public site pages (Landing, FAQ, About and others) | 9 |
| tools | 10 | root (App.jsx, main.jsx, main.css, vite.config.js, .gitignore) | 5 |

**Added (67)**
- Docs: `3D_INTAKE`, `CATALOG_STATUS`, `DESIGN_LANGUAGE`, `FLATS`, `FONTS`, `UX_REDESIGN`, `engineering/HANDOFF`, `engineering/STUDIO-INTERACTION-BRIEF`. Design and intake notes.
- Fonts: `public/fonts/` Bricolage Grotesque 600/700 and Source Sans 3 400/500/700 (self-hosted woff2).
- Flats: `src/assets/flats/scrub-top-vneck-{short,three-quarter}/{front,back}.svg`. Scrub Top flats traced from the GLB (M3).
- Components: `SizeChartTable` (size chart), `UpdatePrompt` (PWA refresh prompt), `admin/ClientMaterialsPanel` (customer-supplied fabric per order), `site/LegalPage` (shared legal layout).
- UI kit: `ActionMenu`, `Drawer`, `Meter`, `NavBadge`, `Skeleton`, `StitchDivider`, `SwatchTile`, `ThreadPull`, plus `SpoolGlyph` and `Ticket`, which are staged for deletion.
- Dev only: `src/dev/layouts/*` (7 files), layout mock-ups at `/dev/layouts`, behind `import.meta.env.DEV`.
- Hooks: `useKeyboardInset` (mobile keyboard), `useListKeys` (list keyboard navigation), `useObjectUrl` (blob URL lifetime), `useUnreadMessages` (unread badge polling).
- `src/layouts/adminNav.js`: the single admin nav config.
- `src/pages/auth/RequestAccess.jsx`: replaces self-registration.
- Studio: `GarmentCarousel`, `PiecesRail`, `SizeProportions`, `ToolRail`, `editHistory` (undo/redo), `flatPaths` (parametric flats), `railTools`, `saveStatus` (save-state label).
- Order wizard: `OrderSummary`, `WizardSteps`, `orderForm`.
- `src/styles/tokens-v2.css`: design tokens v2.
- Utils: `adminResources`, `designActions`, `materialColour`, `requestOnce` (de-duplicates requests), `studioIntent`, `uploadRules`.
- Tools: `flat-from-glb.{html,mjs}`, `glb-extract/served-sha256.json`, `modelFiles.mjs`, `served-glbs.mjs`. GLB-to-flat pipeline and model checksums.

**Deleted (22)**
- Docs: `engineering/ADR-custom-3d.md`, `engineering/VFRB-HANDOFF.md` (replaced by HANDOFF.md).
- Assets: `auth-notions.png`, `dm-serif-display-latin-400.woff2`, `hero.png`, `react.svg`, `vite.svg`.
- Components: `Footer`, `InlineColorPicker`, `MarketingNav`, `admin/statusTone.js`, `utils/navColors.js`.
- Pages: `admin/StaffDashboard.jsx` (station users get the admin dashboard), `auth/Register.jsx` (registration closed).
- Studio: `BottomHints`, `OnboardingOverlay`, `PieceSelector`, `StudioDock`, `customMesh3D.js` (code-built 3D removed, S1).
- Tools: `WORN-PHOTOS.md`, `build_garment_models.py`, `build_school_set_glb.py`.

Dangling imports: I searched `src`, `index.html` and `vite.config.js` for the base name of every deleted file, staged deletions included. The only hit was "Footer" in `site/SitePage.jsx`, and that imports `./SiteFooter`, not the deleted file. No stale imports remain. CODE-VERIFIED, and the build passes (section 8).

## 4. Routes and pages (`src/App.jsx` diff)

| Route | Change | Who can open it | Evidence |
|---|---|---|---|
| `/register` | CHANGED: now `Navigate` to `/login`; `Register.jsx` removed | Anyone (redirect) | CODE-VERIFIED |
| `/dev/layouts` | ADDED, dev builds only | Anyone, `import.meta.env.DEV` only | CODE-VERIFIED |
| `/admin/reports`, `/admin/activity-log`, `/admin/audit-logs`, `/admin/invoice` | CHANGED: the `owner` flag is replaced by `RequireManager`, which allows `isAdmin` (role manager) or `isOwner` with `ownerCanOpen(path)` | Manager; owner on `OWNER_PAGES` | CODE-VERIFIED `App.jsx:154-157`, `jobAccess.js:10-14` |
| `/admin` (dashboard) | CHANGED: everyone gets `AdminDashboard`; `StaffDashboard` removed | Manager, owner, staff (station) | CODE-VERIFIED |
| Admin wrapper | REMOVED: the `<OwnerGate>` layout route. Owner page limits now come only from `RequireManager` and the nav | n/a | CODE-VERIFIED |
| Request access | No new route in `App.jsx`. `RequestAccess.jsx` is reached from `Login.jsx` | Guests | CODE-VERIFIED (grep) |

- Role model in `src/utils/jobAccess.js`: `OWNER_PAGES` (9 keys), `STATION_PAGES` (dashboard, orders, production, output-log, qc, inventory, messages, settings), `STATION_SETTINGS = ['password']`, `isStation`: role is `staff`. Seven `STAGES`: pattern, segregation, cutting, sewing, QC, pressing, packing.
- `src/layouts/adminNav.js` is the single nav source (21 entries in 5 groups). It holds no roles: `navFor(allowed)` filters it through `canOpen` in `jobAccess.js`, so each role sees only the pages it can open. CODE-VERIFIED.

## 5. API usage

Endpoints called in added lines of `src` that the frontend did not call on main. Each was checked against `vfrb-capstone/routes/api.php` on its main and on its HEAD. CODE-VERIFIED by grep; route method and middleware not checked.

| Endpoint | Backend main | Backend HEAD | Needs backend deploy first |
|---|---|---|---|
| `POST /api/request-access` | no | yes | **YES** |
| `GET /api/customer/upload-rules` | no | yes | **YES** |
| `GET /api/customer/messages/unread-count` | no | yes | **YES** |
| `GET /api/admin/messages/unread-count` | no | yes | **YES** |
| `GET /api/admin/customer-contacts` | no | yes | **YES** |
| `GET /api/admin/inventory/client-stock` | no | yes | **YES** |
| `/api/admin/orders/{id}/client-materials` | no | yes | **YES** |
| `/api/customer/orders/{id}/spec-sheet` | no | yes | **YES** |
| `/api/admin/materials/{id}/adjust` | yes | yes | no |
| `/api/customer/designs/{id}/copy` | yes | yes | no |
| `/api/admin/delivery/{tracking}/status`, `/api/customer/delivery/{id}` | yes | yes | no |
| `/api/admin/output-logs`, `/api/admin/physical-counts` | yes | yes | no (endpoint strings moved) |
| `/api/customer/orders/{id}/ai-recommendation`, `/billing` | yes | yes | no |
| `/api/admin/orders/{id}/{kind}` | dynamic | n/a | UNVERIFIED (depends on `kind`) |

## 6. Config and dependencies

- `package.json` and `package-lock.json`: **no change**. No package added, removed or bumped. CODE-VERIFIED (`git diff --stat` is empty).
- `vite.config.js`: PWA `registerType` changes from `autoUpdate` to `prompt`, and `skipWaiting: true` is removed. A new service worker now waits for the Refresh button in `UpdatePrompt.jsx`; `clientsClaim` and `cleanupOutdatedCaches` stay. CODE-VERIFIED.
- `import.meta.env` reads: `VITE_API_URL` (4), `VITE_MODEL_BASE_URL` (2), `DEV` (2). No new variable beyond `DEV`, which gates `/dev/layouts`. CODE-VERIFIED.
- Fonts: self-hosted in `public/fonts/` (5 woff2). DM Serif Display was dropped from `src/assets`. CODE-VERIFIED.
- Models: `public/models/vfrb-derived/`. The root GLBs are git-ignored (e4714a5). `tools/glb-extract/served-sha256.json` pins the GLBs that are served. CODE-VERIFIED.
- Flats: 4 SVGs under `src/assets/flats/`. CODE-VERIFIED.
- Deploy target and live URL: not in the scope of this diff. UNVERIFIED.

## 7. UI changes by area

These come from file names, commit subjects and spot greps. I did not run the app, so all of this is CODE-VERIFIED for presence only; behaviour is UNVERIFIED.

- **Tokens and fonts:** `tokens-v2.css` adds design tokens on `:root` (line 10), with a reduced-motion override at line 66. Bricolage Grotesque for display, Source Sans 3 for text. Documented in `docs/DESIGN_LANGUAGE.md` and `docs/FONTS.md`.
- **Login and request access:** self-registration is closed with the comment "VFRB creates customer accounts" (`App.jsx`). `RequestAccess.jsx` posts to `/api/request-access`. 44px forgot-password tap target.
- **Customer pages:** navy customer shell, `customer/kit.jsx`, `DesignThumb` used in Dashboard and MyDesigns. The order wizard is split into steps (`WizardSteps.jsx`), with a pickup option in `orderForm.js`. Upload types come from `uploadRules.js` and the server `upload-rules`. Order detail adds a spec sheet, billing, and AI recommendation.
- **Admin shell:** one nav config (`adminNav.js`), `ActionMenu`, `Drawer`, `NavBadge` for unread messages. Delivery and pickup in `DeliveryTracking.jsx`. Station UI through `STATION_PAGES` and `assigned_stage`, used in 9 files including `AdminLayout.jsx` and `DailyOutputLog.jsx`. `ClientMaterialsPanel` handles customer-supplied fabric.
- **Studio:** `ToolRail` with V H I G B E T U shortcuts (logic check PASS); flats from GLB; parametric `flatPaths.js`; `PiecesRail` and `GarmentCarousel`; `SizeProportions` size row; `editHistory` for undo; `saveStatus` labels; explode logic in `CanvasViewport.jsx` and `garmentCapabilities.js`. Code-built 3D (`customMesh3D.js`) is gone.
- **Copy rules:** "VFRB team" appears in 15 files (for example `AuthShell.jsx`). Sentence case is visible in diffs ("Go Home →" became "Go home"). I did not run a full sweep for stage names or prices in customer copy. UNVERIFIED.

## 8. Verification (BUILD-VERIFIED, re-run 2026-10-31 on the working tree; built in 4.12s)

**`npm run build`: PASS** (exit 0, `dist/sw.js` generated). Warnings:
- `new URL("./", import.meta.url)` is resolved at runtime.
- Some chunks are larger than 800 kB before gzip.

Largest JS chunks (gzip):

| Chunk | gzip kB |
|---|---|
| three | 232.95 |
| bg-remove | 194.67 |
| charts | 108.39 |
| fabric | 96.75 |
| DesignStudio | 89.37 |
| react-vendor | 65.35 |

**`node tools/logic-checks.mjs`: 461/473 passed, 12 failed** (exit 1). `tools/logic-checks.mjs` itself has uncommitted edits.

| Failing check | Stale or real | Reason |
|---|---|---|
| owner routing: every admin route sits behind OwnerGate | STALE | OwnerGate was removed on purpose (e83b8ed); `RequireManager` now gates owners |
| owner shell: nav lists only owner pages, no bell or polling | Needs decision | Owner may now poll unread counts. Unknown whether the API allows it |
| owner dashboard: no revenue or totals | **REAL risk** | Owner now gets the full `AdminDashboard` (`App.jsx` comment: "Manager and Owner share the full admin dashboard") |
| owner write controls hidden | **REAL risk** | Tied to the shared dashboard; the backend is the only guard left |
| User Management roles: Admin, Staff, Owner list | UNVERIFIED | Not inspected |
| admin password change: PUT /api/admin/profile/password | Likely STALE | The frontend call exists (`admin/Settings.jsx:34`); the check probably asserts the old file layout |
| admin order update: manager-only fields and note routing | UNVERIFIED | Not inspected |
| admin OrderDetail: Order Summary (PDF) manager-only | UNVERIFIED | Not inspected |
| QC: Daily Output Log checklist inline, Pressing blocked | UNVERIFIED | `DailyOutputLog.jsx` changed for stations |
| My Designs and Home thumbnails only through DesignThumb | UNVERIFIED | `DesignThumb` is used in both pages; the check is probably stale after the kit move |
| compact DesignThumb is aria-hidden in tiles | UNVERIFIED | Possible real a11y regression |
| customer tokens only on customer roots, never `:root` | Likely STALE, by design | `tokens-v2.css` defines global tokens on `:root` |

## 9. Prompt mapping

Status is based on file presence and grep (CODE-VERIFIED for presence; behaviour UNVERIFIED).

| ID | What it asked | Files that show it | Status |
|---|---|---|---|
| M1-F | Station UI | `jobAccess.js` STATION_*, `AdminLayout.jsx`, `DailyOutputLog.jsx` | PARTIAL (QC check fails) |
| M2/M11 | Request access and login | `RequestAccess.jsx`, `Login.jsx`, `/register` redirect | DONE |
| M3 | Flats from GLB (Scrub Tops) | `tools/flat-from-glb.*`, `assets/flats/scrub-top-*` | DONE (2 variants) |
| M4 | Vector-only canvas | `flatPaths.js`, `useGarmentCanvas.js` | PARTIAL, UNVERIFIED |
| M5 | Parametric flats, 8 garments | `flatPaths.js`; zone-parity check covers 10 Tier 2 garments | DONE per check |
| M6 | Studio UX v2 | `ToolRail`, `PiecesRail`, `railTools`, `saveStatus`, `editHistory` | DONE |
| M7 | Order wizard and order detail | `order-wizard/*`, `OrderDetail.jsx` | DONE (spec-sheet needs backend) |
| M8 | Uploads (reference, logo) | `uploadRules.js`; content-sniff check PASS | DONE |
| M10/L4 | Design language and tokens | `tokens-v2.css`, `DESIGN_LANGUAGE.md`, fonts | DONE (token-scope check fails) |
| M12/L5 | Admin shell and polish | `adminNav.js`, `ui/*` | PARTIAL (owner checks fail) |
| M13/L3 | Customer shell, dashboard, orders, settings | `customer/kit.jsx`, `Dashboard.jsx`, `ProfileSection.jsx` | PARTIAL (DesignThumb checks) |
| M16 | Performance and mobile | `useKeyboardInset`, 44px targets, safe-area insets | PARTIAL (chunks over 800 kB) |
| L1 | Studio layout v2 | `src/dev/layouts/*`, Studio rails | PARTIAL |
| L2 | Order detail and material cards | `ClientMaterialsPanel`, `materialColour.js`, `SwatchTile` | DONE, UNVERIFIED in the UI |
| S1 | Remove 3D set | `customMesh3D.js` and `build_*_glb.py` deleted (ed8625c) | DONE |
| S2 | Single piece first | `PiecesRail.jsx` | UNVERIFIED |
| S3 | Shell | Customer and admin shells | PARTIAL |
| S4 | AI assistant card | `AIMaterials.jsx`, `OrderDetail.jsx` ai-recommendation | UNVERIFIED (card not confirmed) |
| S5 | GLB intake (7 Tripo files) | `docs/3D_INTAKE.md`, root GLBs ignored | NOT STARTED (blocked on licence) |
| S6 | Catalog audit | `docs/CATALOG_STATUS.md` | DONE (doc) |
| S8 | Landing v2 | `Landing.jsx` (+49/−129) | PARTIAL, UNVERIFIED |
| S9 | Customer polish | d283940 | PARTIAL |
| F-3D | Explode view for authored Scrub Tops | `CanvasViewport.jsx`, `garmentCapabilities.js` | PARTIAL, UNVERIFIED |

## 10. Risks and open items

1. **Backend first.** 8 new endpoints exist only on backend `wip/oct21-overhaul` (section 5). If the frontend deploys alone, request access, upload rules, unread badges, client materials and spec sheet break.
2. **Owner access widened.** OwnerGate is gone and the owner gets the full dashboard. Four owner logic checks fail, and the owner may now see revenue and totals. Confirm the backend owner read-only middleware refuses the writes, or restore the limits.
3. **Dirty tree.** 17 staged deletions, 5 unstaged edits (including the test file) and 6 untracked root photos. The section 8 results describe the working tree, not `4d8b158`. Commit or discard before release.
4. **PWA switched to prompt.** Without `skipWaiting`, users on the old service worker keep serving the old app until they press Refresh. Check that `UpdatePrompt` shows up on the live site after the deploy.
5. **Bundle weight.** `three` (233 kB gzip) and `bg-remove` (195 kB gzip) are over the 800 kB raw warning. Fine on desktop, slow on mobile 3G (M16).

Other open items:
- 8 failing checks still need a stale or real ruling (section 8).
- S5 is blocked on the model licence.
- The live URL and the deploy config (Railway or Vercel) were not checked.
