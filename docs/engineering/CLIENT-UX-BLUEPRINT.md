# VFRB Client Experience Blueprint

Status: reference for all client-portal work from 2026-10-11 onward. Blueprint only; no application code, schema, route or API was changed to write it.

Every future client slice should name the section of this document it implements and meet that section's acceptance criteria. The goal is one consistent experience instead of separate visual fixes:
- the catalog helps customers choose;
- the Studio helps them design;
- the account keeps their preferences and drafts;
- the order carries the same design through to Order Detail without surprises.

Marking used throughout:
- **Exists**: verified in the repository (file and component named).
- **Proposed (frontend)**: new UI using existing data and endpoints only.
- **Proposed (backend)**: needs a new endpoint, column or table in `C:\laragon\www\vfrb-capstone`. Nothing like it exists today.

Product patterns are adapted, not copied:
- Canva-style template discovery and reusable brand assets;
- Tailornova-style garment-first flow and honest previews;
- Adobe-style contextual panels and precise canvas;
- catalog search, facets and previews.

VFRB's own job is different from all of them: an organisation ordering one uniform design in bulk, with sizes, delivery and production tracking.

---

## 1. Current client routes and pages (verified)

Routes are defined in `src/App.jsx`. Customer routes sit at the root with no prefix, behind `RequireAuth role="customer"`, which also redirects unverified email to `/verify-email`.

| Route | Component (file) | Shell | Purpose today |
|---|---|---|---|
| `/` | `Landing` (`pages/Landing.jsx`) or redirect | Site | Signed-in customer goes to `/dashboard`; staff go to `/admin/dashboard` |
| `/login` | `pages/auth/Login.jsx` | Auth | Email/password + Google (`/auth/google/complete` → `GoogleComplete.jsx`) |
| `/register` | `pages/auth/Register.jsx` | Auth | Name, username, email, organisation type (5 types), organisation name, TIN (optional), contact number, password ×2, terms |
| `/verify-email` | `pages/auth/VerifyEmail.jsx` | Auth | Required before any customer route |
| `/forgot-password`, `/reset-password` | `pages/auth/*` | Auth | Recovery |
| `/dashboard` | `pages/client/Dashboard.jsx` | `CustomerLayout` | Hero + Start/Continue design, KPIs or "how ordering works", latest draft, active orders, recent designs, notifications |
| `/my-designs` | `pages/client/MyDesigns.jsx` | `CustomerLayout` | Tabs `all / draft / ordered / inspo`: the one account draft, designs archived from past orders, starter templates |
| `/orders` | `pages/client/Orders.jsx` | `CustomerLayout` | Table (desktop) / cards (mobile), search + status group |
| `/orders/:id` | `pages/client/OrderDetail.jsx` | `CustomerLayout` | Tabs Overview / Progress / Materials / Messages; design rendered by `components/DesignPreview.jsx` from `studio_config` |
| `/order/create` | `pages/client/OrderWizard.jsx` | `CustomerLayout` | 4 steps: Design Summary → Quantity & Sizes → Delivery & Notes → Review; then `MaterialsReveal.jsx` |
| `/ai-materials` | `pages/client/AIMaterials.jsx` | `CustomerLayout` | Material recommendation per order (no nav entry; reached from the order flow) |
| `/messages` | `pages/client/Messages.jsx` | `CustomerLayout` | Order threads with staff |
| `/settings?tab=` | `pages/client/AccountSettings.jsx` + `settings/*` | `CustomerLayout` | profile, shipping, notifications, fabrics, billing, password, help, feedback (`/billing`, `/help`, `/profile` redirect here) |
| `/design-studio` | `pages/client/DesignStudio.jsx` + `design-studio/*` | Full screen (no layout) | Garment editor (Fabric 2D, three.js 3D) |
| `/gallery` and other site pages | `pages/Gallery.jsx` etc. | Site | Public marketing pages. Not the Studio design gallery |

### Shell and navigation (`src/layouts/CustomerLayout.jsx`)
- **Desktop sidebar (`NAV`):** Dashboard, My Designs, My Orders, Messages, Settings.
- **Mobile bottom nav (`MOB_NAV`):** Home, Designs, Orders, Chat, plus a More drawer.
- **Top bar:** message bell and account link.
- **Studio button:** a floating button on mobile, shown only on `/my-designs` and `/orders` (`FAB_ROUTES`).
- **Accent colour** (`utils/accentColor.js`): a per-customer preset stored in localStorage only. The file says there is no backend column for it.

### Inside the Studio (`src/pages/client/design-studio/`)
- **Top bar (`TopBar.jsx`):** back, design name (`cfg.name`), undo/redo, 2D/3D switch, Design Inspirations, Showcase, Save (states Save / Saving / Saved / Local / Retry), Order.
- **Tool rail and drawer (`ToolDrawer.jsx`, `TOOLS` in `dsShared.js`):**
  - Primary tools: Garment, Colors, Text, Logo.
  - Other tools: Pattern, Layers, Draw, AI, Summary, Selected.
- **Canvas (`CanvasViewport.jsx`, `useGarmentCanvas.js`, `snapGuides.js`):**
  - zoom and pan;
  - pinned rulers, grid (10/20/40), snapping, smart guides and the resize readout;
  - front/back switch;
  - the uniform-set pill.
- **Inspector (`RightInfoPanel.jsx`):** `SelectionInspector` when an item is selected, `SummaryContent` otherwise. `AIDesignChat` is docked here.
- **Layers:** `LayersPanel.jsx`.
- **Gallery:** `InspoGallery.jsx` (`DesignBrowser`, `PhotoCard`, `TierBadge`, `MiniPreview`) over the `designGallery.js` registry. `ShowcaseGallery.jsx` holds community designs approved by staff.
- **Dock (`StudioDock.jsx`):** save, order and export (PNG/PDF).
- **First-visit tour:** `OnboardingOverlay.jsx`, 4 steps, remembered in localStorage `studio_visited`.

### Customer API actually used (Laravel `routes/api.php`, `auth:sanctum` + `role:customer`)
- **Dashboard and orders:** `GET /customer/dashboard`; `GET|POST /customer/orders` (multipart with `studio_config`); `GET /customer/orders/{id}`.
- **Drafts:** `GET /customer/drafts/latest`, `POST /customer/drafts`, `DELETE /customer/drafts/latest`.
  - There is **one row per user** (`updateOrInsert` on `user_id`), so each save overwrites the last.
- **Designs:** `GET /customer/designs` returns starter templates plus designs auto-archived from this customer's orders. `PUT|DELETE /customer/designs/{id}` works on archived designs only.
- **Showcase:** `GET /customer/designs/showcase`, `POST /customer/designs/{id}/submit-showcase`.
- **Account records:** `GET|PUT /customer/profile`, `PUT /customer/profile/password`. Shipping addresses, billing profiles, fabric preferences, notification preferences and `/settings/notifications` support full create/read/update/delete.
  - The backend notes these are **not yet used by the Order Wizard**.
- **Messages and notifications:** messages, notifications, notification summary, `delivery/{orderId}`.
- **AI:** `POST /ai/describe-design` (public, rate-limited), `POST /customer/ai/recommend-materials`, plus accept/select materials.

---

## 2. Proposed information architecture and navigation

Principle: four places with one vocabulary. Each object keeps the same name everywhere.

| Place | Holds | Vocabulary (use exactly) |
|---|---|---|
| **Home** | What needs attention: the draft to continue, orders in progress, messages | "Continue design", "Track order" |
| **Catalog** | Garments and designs to start from | "Catalog", "Start from this", "Reference only" |
| **My Designs** | Drafts, ordered designs, starter designs | "Draft", "Ordered", "Starter design" |
| **Orders** | Orders, their status, messages and materials | "Order", stage names from `--status-*` |

There are currently three different things called "inspiration": the Studio gallery photos, the `/designs` starter templates (My Designs "inspo" tab) and the community showcase. Proposed names:
- **Catalog** for the `designGallery.js` entries;
- **Starter designs** for the server templates;
- **Community** for the showcase.

Proposed navigation (Proposed (frontend); only `/catalog` is a new route):
- **Desktop sidebar:** Home, Catalog, My Designs, Orders, Messages, then Settings at the bottom with the account.
- **Persistent primary action** in the sidebar header and mobile top bar: **New design** (opens the Studio). It replaces the route-limited FAB.
- **Mobile bottom nav:** Home, Catalog, Designs, Orders, More.
  - Messages moves to the top-bar bell, which already exists (`cm-tb-bell`), plus More.
  - Every target keeps a hit area of at least 44 px.
- **Studio:** stays full screen. Its back button returns to the page the customer came from (Home, Catalog or My Designs) rather than always `/dashboard`.
- **Post-registration preferences:** `/welcome` (Proposed; see §5). Reachable later from Settings → Preferences.

---

## 3. Customer journey

| # | Step | Today (exists) | Target | Continuity rule |
|---|---|---|---|---|
| 1 | Register | `Register.jsx` | Same fields, grouped into "You" and "Your organisation"; inline validation kept | `client_type` drives catalog defaults later |
| 2 | Verify email | `VerifyEmail.jsx` | Unchanged | Guard stays in `RequireAuth` |
| 3 | Preferences | None | `/welcome`: 3 short optional steps, each with **Skip**; never blocks | Saved to the account (see §5); skipped steps appear later as one quiet dashboard prompt |
| 4 | Home | `Dashboard.jsx` | One "next step" card driven by real state; the draft card shows the saved preview | Draft card thumbnail = saved `preview_dataurl` (same image as My Designs) |
| 5 | Catalog | Only inside the Studio (`InspoGallery`) | `/catalog` page using the same `designGallery.js` data and `DesignBrowser` UI | Opening an entry passes `templateId` / `inspirationId` exactly as `openTarget` does today |
| 6 | Studio | `DesignStudio.jsx` | Workspace per §6 | `cfg` is the only source of truth; capability labels from registries |
| 7 | Save / reopen | One account draft plus a browser copy | Today: honest "Saved to your account" vs "Saved in this browser only". Later: a list of named drafts (backend proposed) | Draft label = design name; preview kept on autosave (see §11 G1, G2) |
| 8 | Order | `OrderWizard.jsx` via sessionStorage handoff | Same 4 steps; saved address and billing pickers; the set queue for uniform sets | `studio_config` (with `templateId`, `inspirationId`, `uniformSet`) submitted unchanged |
| 9 | Order detail | `OrderDetail.jsx` + `DesignPreview` | Same design render as the Studio export; the order's design reopens as a new draft ("Order again") | Ordered design archived (exists) and visible in My Designs → Ordered |

---

## 4. Page-by-page UX specification

All pages share:
- the shell from §2;
- one page title (h1) with an optional single-sentence subtitle;
- one primary action at most per view;
- clear empty, loading (skeletons exist in `components/PageSkeletons`), error (`settings/LoadError.jsx` pattern) and offline states.

### 4.1 Register / Login (`Register.jsx`, `Login.jsx`)
- **Primary action:** Create account / Sign in. **Secondary:** Google sign-in, switch between login and register, password recovery.
- **Desktop:** two columns, with the form on the left and a real VFRB uniform photo on the right.
- **Mobile:** single column with no photo; the form starts above the fold.
- **Keep:**
  - visible labels;
  - the password-strength meter;
  - organisation-type tiles as a labelled group;
  - TIN marked optional.
- **Change:** group fields under two headings. Show password rules before the first error, not only after it.

### 4.2 Welcome preferences (`/welcome`, Proposed)
- **Steps:**
  1. What you order (categories and garments);
  2. Your brand (colours and logo);
  3. Delivery and billing defaults.
- Each step has **Continue** and **Skip for now**, and progress is shown as "Step x of 3".
- **Finish:** goes to Home. Skipping everything also goes to Home.
- **Mobile:** one question per screen, sticky bottom actions.

### 4.3 Home (`Dashboard.jsx`)
- **Primary action:** the single next step:
  - continue the draft;
  - start a design;
  - track the order in production;
  - reply to staff.
- **Secondary:** New design, Browse catalog.
- **Content order:**
  1. Next-step card.
  2. Draft card with the saved preview and edited time.
  3. Active orders with the stage stepper (exists).
  4. Recent designs.
  5. Notifications.
- The KPI tiles show only when the customer has orders (current behaviour, kept).
- **Remove dead code:** the "Your design is waiting" branch in the next-step block can never render (§11 G6).
- **Mobile:** single column with the draft card first. The hero image shrinks to a band, not a full block.

### 4.4 Catalog (`/catalog`, Proposed (frontend))
- **Data:** `ENTRIES`, `filterDesigns`, `facetCounts`, `TIER_LABEL` and `openTarget` from `designGallery.js`. No new data.
- **UI:** reuse `DesignBrowser` / `PhotoCard` / `TierBadge`, moved to a shared module. Do not build a second gallery.
- **Facets:** category, piece, sleeve, gender, capability (tier). Search over title and facts.
- **Defaults:** pre-filter by `client_type` / saved interests, with a visible "Showing school uniforms · Show all" control.
- **Card:** the photo, garment facts and one capability badge (see §9).
- **Primary action by capability:**
  - editable: **Start from this** / "Open <family> template";
  - reference: **View reference** (no edit promise).
- **Preview sheet:**
  - large photo;
  - capability note (the `TIER_LABEL` note text);
  - "View in 3D" only where `ref3D` exists and WebGL is supported;
  - the matching editable template if one exists.
- **Mobile:** 2-column grid, facets in a bottom sheet (`components/ui/BottomSheet.jsx` exists), sticky result count.

### 4.5 Studio (`/design-studio`): see §6.

### 4.6 My Designs (`MyDesigns.jsx`)
- **Primary action:** New design. **Per-card actions:**
  - draft: Continue, Order;
  - ordered: Order again (opens the Studio with that config as a new draft), Rename, Delete (archived designs only, as the API allows);
  - starter design: Start from this.
- **Thumbnails** (the roadmap item):
  - every card shows the same render as Order Detail;
  - priority: saved preview image (draft `preview_dataurl` or the order's `design_preview_url`), else the shared `DesignPreview` renderer, else `MiniPreview` as the last resort;
  - one 4:5 aspect ratio and one background for all cards.
- Each card shows design name, garment, sleeve, edited or ordered date, and a capability badge.
- **Mobile:** 2-column cards; the tabs become a horizontally scrollable chip row (exists as `Chips`).

### 4.7 Order Wizard (`OrderWizard.jsx`)
- **Primary action:** "Next: <step>" / Submit order (exists). **Secondary:** Back, Edit in Studio, Clear design.
- **Step 1 (Design Summary):** the design render matches the Studio export (`studio_preview`). For uniform sets, show "Part x of y".
- **Step 2:** quantity and sizes.
- **Step 3:** delivery date, PO reference and notes. **Add (Proposed (frontend))** pickers for a saved shipping address and billing profile, using the existing endpoints. Whether the order request accepts their ids must be confirmed in `OrderController::customerStore` first. If it doesn't, sending them is Proposed (backend).
- **Step 4:** review, then `MaterialsReveal`.
- **Mobile:**
  - one step per screen;
  - the order summary collapses into a "Summary" bottom sheet;
  - sticky Back / Next bar clear of the safe area.

### 4.8 Orders and Order Detail (`Orders.jsx`, `OrderDetail.jsx`)
- **Orders:**
  - search and status group (exists);
  - each row shows design thumbnail, order number, garment, quantity, stage and last update;
  - **primary action:** open the order.
- **Order Detail:**
  - tabs Overview / Progress / Materials / Messages (exist);
  - the design render uses the same `DesignPreview` and capability language as the Studio;
  - "Order again" is added to Overview (frontend: stash `studio_config` and open the Studio);
  - messages stay one tap away.
- **Mobile:** the tabs become a sticky segmented control; the design render sits at full width above the tabs.

### 4.9 Settings (`AccountSettings.jsx`)
- **Keep:** the existing sections.
- **Add:** a **Preferences** section that edits the §5 data, and move the portal accent here, labelled honestly as "This device only" until a backend column exists.
- **Mobile:** a list of sections that opens one at a time (current pattern).

### 4.10 Messages (`Messages.jsx`)
- Threads are per order (exists). The thread header links back to the order and shows the design thumbnail.

---

## 5. Onboarding fields and account-persisted preferences

| Field | Step | Required? | Stored today | Proposal |
|---|---|---|---|---|
| Name, username, email, password | Register | Required | `users` via `POST /register` | Unchanged |
| Organisation type (`client_type`) | Register | Required | `users` | Drives catalog defaults |
| Organisation name | Register | Required | `users` | Unchanged |
| TIN / business registration | Register | **Optional** | `users` | Unchanged |
| Contact number | Register | Required | `users` | Unchanged |
| Garment interests (categories / pieces) | Welcome 1 | **Optional, skippable** | Nowhere | Proposed (backend): `customer_preferences.interests` (JSON) |
| Typical order size (range) | Welcome 1 | **Optional, skippable** | Nowhere | Proposed (backend) |
| Brand colours (up to 4 hex) | Welcome 2 | **Optional, skippable** | Nowhere | Proposed (backend). Studio Colors panel shows them as "Your brand" swatches |
| Brand logo | Welcome 2 | **Optional, skippable** | Per design only (`useLogoUpload.js`) | Proposed (backend): account file storage. Studio Logo tool shows "Your logo" first |
| Preferred fabrics | Welcome 3 | **Optional, skippable** | Exists: `/customer/fabric-preferences` | Reuse the endpoint |
| Default shipping address | Welcome 3 | **Optional, skippable** | Exists: `/customer/shipping-addresses` | Reuse; preselected in the Wizard |
| Billing profile | Welcome 3 | **Optional, skippable** | Exists: `/customer/billing-profiles` | Reuse; preselected in the Wizard |
| Notifications | Settings | Optional | Exists: `/settings/notifications`, `/customer/notification-preferences` | Unchanged |
| Portal accent colour | Settings | Optional | localStorage only (`accentColor.js`) | Label "This device only"; moving it to the account is Proposed (backend) |
| Studio guides (grid, snap, spacing) | Studio | n/a | localStorage `ds_guides` | Stays per device: a workspace preference, not an account record |

Rules:
- Every Welcome step can be skipped and changed later in Settings → Preferences.
- Nothing in Welcome is needed to design or order.
- Preferences only pre-fill and pre-filter. They never change a capability label or open a different garment.

---

## 6. Studio workspace specification

This is an evolution of the existing components, not a parallel editor. `cfg`, `useGarmentCanvas` and the Fabric/three.js stack stay.

### 6.1 Top bar (`TopBar.jsx`)
- **Left:** back to origin; design name (inline edit, also used as the saved draft label, see G2).
- **Centre:** undo/redo; 2D / 3D segmented switch, with 3D disabled and its reason in a tooltip when there is no model (exists).
- **Right:** save status with Save, then **Order** as the single primary button.
- **Catalog button:** opens the shared catalog as a drawer.
- **Save status vocabulary:**

| State | Label | Meaning |
|---|---|---|
| idle | Save | Unsaved changes |
| saving | Saving | Request in flight |
| account | Saved | Stored on the account (`POST /customer/drafts` succeeded) |
| local | Saved in this browser | Account save failed; browser copy only |
| error | Retry | Nothing stored |

  Autosave uses the same status line ("Autosaved 2 min ago") and never reports a browser-only copy as an account save.
- **Mobile:** back, name (truncated), Save, Order. Undo/redo, 2D/3D, Catalog and Showcase sit in the overflow menu (exists as `More studio controls`).

### 6.2 Tool rail (`ToolDrawer.jsx`, `TOOLS`)
- **Order by task:** Garment, Colors, Pattern, Text, Logo, Draw, then a divider, then Layers, AI, Summary.
- "Selected" is not a rail tool: selecting an item opens the inspector.
- **Desktop:** a 56 px icon rail with labels under the icons, opening a 300 px drawer.
- **Mobile:** a bottom tool bar with the four primary tools plus More; the drawer becomes a bottom sheet with a half or full snap.
- Each tool's hint (exists in `TOOLS`) is the drawer subtitle.

### 6.3 Canvas (`CanvasViewport.jsx`)
- **Keep, as built and verified:**
  - zoom 0.6–1.8 with fit;
  - pan (wheel, Space+drag, middle or background drag, touch Pan tool);
  - pinned rulers;
  - grid at 10/20/40;
  - snapping with smart guides and the size readout;
  - front/back switch;
  - the uniform-set pill.
- **Controls:**
  - zoom: top-left;
  - guides: bottom-left at 768 px and up;
  - stage theme: bottom-right.
- Guides, rulers, grid and readout stay on the interaction layer. They never reach export, history, saved JSON or thumbnails.

### 6.4 Contextual inspector (`RightInfoPanel.jsx`)
- **With a selection:** `SelectionInspector` with position/size, type or colour, alignment, lock, duplicate and delete.
- **Planned (roadmap):** with several items selected, align (left, centre, right, top, middle, bottom) and distribute (horizontal, vertical).
- **With nothing selected:** `SummaryContent` (garment, colours, layers, capability note, export).
- **Desktop:** a fixed 300 px column. **Below 1280 px:** an overlay panel. **Mobile:** a bottom sheet that does not cover the selected item.

### 6.5 Layers (`LayersPanel.jsx`)
- **Rows:** name (renameable), type icon, visibility, lock.
- **Planned (roadmap):** a "2D only" marker on layers that will not appear on the 3D model, and on everything when the current garment has no 3D. Hovering the marker explains why in the same words as the 3D switch tooltip.

### 6.6 2D and 3D states
| Garment state | 2D | 3D switch | Note shown |
|---|---|---|---|
| Editable 2D, no model | Editable | Disabled with reason | "2D is the exact preview" |
| Approximate 3D (approx slot) | Editable | Enabled | "3D colour zones are approximate" |
| Family model shows a different garment (`NO_FAMILY_3D`) | Editable | Disabled | "No 3D model matches the garment in this design's photo" |
| Reference photo with photo-matched 3D (`ref3D`) | Not editable | Catalog "View in 3D" only, neutral colour | "Shape preview only" |
| Verified 3D | Editable | Enabled | None yet; needs a verification record |

### 6.7 Saves, reopen and handoff
- **Manual save:** sessionStorage copy, then an account draft with a preview image (exists).
- **Autosave:** must send the same preview and label as a manual save, or skip the preview field without erasing the stored one (G1).
- **Order:** export front/back → `stashStudioConfig` → `/order/create`. The account draft is kept until the order is submitted (G3).
- **Reopen sources:** draft, archived design, starter design, catalog entry. All go through the sessionStorage `studio_config` handoff (`utils/studioHandoff.js`).

---

## 7. Design-system proposal

Constraints from `src/styles/theme.css`:
- no font CDN (self-hosted only);
- colours are defined there first;
- the teal brand is locked to the VFRB seal;
- dark mode is the Studio stage only.

The proposal consolidates what exists. It does not add a second system.

### 7.1 Direction
The subject is cut, sewn and ordered cloth, so the visual language borrows from the cutting room:
- swatch tickets;
- tailor's measurements;
- spec sheets.

Spend the boldness in one place: the **swatch-ticket card**. A design or catalog card is the garment image on a calm ground, with a short ticket strip below holding name, garment facts and the capability badge, separated by a stitched (dashed) rule. The same card appears in Catalog, My Designs, Home, Orders and the Wizard summary, so a customer recognises *their* design everywhere. Everything else stays quiet: no gradient washes, no decorative motion and no identical shadows on every box.

### 7.2 Colour (existing tokens, roles clarified)
| Name | Hex / token | Role |
|---|---|---|
| Seal teal | `#027a8b` `--teal` | Primary actions, focus ring, active nav |
| Deep teal | `#016070` `--teal-dark` | Hover/pressed, text on teal tints |
| Thread green | `#02C39A` `--teal-2` | Small accents only (progress, stitched rule). Never text on white |
| Ink | `#0f172a` `--ink` | Headings and body |
| Cutting table | `#f8fafc` `--bg` | Page ground |
| Chalk line | `#e2e8f0` `--border` | Dividers and card edges |

- **Status:** keep `--status-*` for production stages and `--success/--warning/--danger/--info` for feedback.
- **Capability badges** map to existing semantic tokens:
  - reference = muted;
  - editable 2D = info;
  - approximate 3D = warning;
  - verified 3D = success.
- The customer accent (`accentColor.js`) only changes `--teal` / `--teal-dark` inside the portal shell. It never changes status or capability colours.

### 7.3 Typography
- **UI:** keep the system sans stack (`--font`); it is fast and works offline.
- **Display:** `DM Serif Display` (self-hosted, `styles/fonts.css`) only for the page h1 and the Home greeting. Never for controls, numbers or labels.
- **Scale** (1.25 ratio; replaces 10–13 px body sizes in the portal):

| Use | Size |
|---|---|
| Captions | 12 |
| Dense UI and Studio panels | 14 |
| Body | 16 |
| h3 | 20 |
| h2 | 25 |
| h1 | 31 |

- Nothing below 12 px, except ruler labels at 9.5 px, which are graphics.
- **Numbers** (quantities, sizes, prices, ruler readouts) use tabular numerals.
- **Sentence case everywhere.** Retire the uppercase tracked eyebrows used across Dashboard, Order Detail and the inspector (`od-section-title`, "Next step", "Continue where you left off"); a heading is enough.
- Keep line length under 75 characters.

### 7.4 Spacing, surfaces and radius
- **Spacing:** 4 px base, steps 4 / 8 / 12 / 16 / 24 / 32 / 48. Page gutter 16 px on phones, 24 px on tablets, 32 px on desktop.
- **Radius follows hierarchy** (existing `--r-*`):
  - 6 for controls;
  - 10 for cards;
  - 14 for sheets and dialogs;
  - full for chips and the avatar.
- **Surfaces:** ground (`--bg`), card (`--bg-card` with a border and no shadow), raised (sheets and popovers, `--shadow-lg`). Shadow means "floating above", not "is a card".

### 7.5 States and interaction
- Every interactive element has hover, `:focus-visible` (a 2 px teal ring, existing `--border-focus`), active, disabled (with a reason when it is not obvious) and loading (`aria-busy`).
- Errors say what happened and what to do, in the interface's voice. Empty states always offer the next action.
- **Motion:**
  - respond to the customer's action (sheet open, save confirmed, step change) in 150–200 ms;
  - no entrance animations on every section;
  - respect `prefers-reduced-motion` (already wired through `MotionConfig reducedMotion="user"` and the CSS media queries).
- **Touch:** targets of at least 44 px on `pointer:coarse` (the Studio already does this).
- **Keyboard:**
  - all tools, tabs and catalog facets are reachable;
  - Studio shortcuts are documented in the Summary panel.

### 7.6 Responsive behaviour
| Width | Portal | Studio |
|---|---|---|
| < 768 | Bottom nav, single column, sheets | Bottom tool bar, sheets, overflow menu |
| 768–1279 | Collapsible sidebar, 2 columns | Rail + drawer; inspector as overlay |
| ≥ 1280 | Fixed sidebar, up to 3 columns, max content width 1200 | Rail + drawer + fixed inspector |

Test widths: 375, 414, 768, 1024, 1366. No horizontal page scroll at any of them.

### 7.7 Shared components
Adopt these across client pages instead of the inline styles that dominate today (Register labels, Dashboard cards, Order Detail):
- `components/ui/` exists: `Button`, `Card`, `Field`, `Badge`, `BottomSheet`, `ConfirmDialog`, `IconBox`, `icons`.
- New shared pieces, built from existing parts:
  - `CapabilityBadge`, from `TierBadge` + `TIER_LABEL`;
  - `DesignCard`, the swatch ticket, from the MyDesigns `DesignCard` and Catalog `PhotoCard`;
  - `DesignThumb`, implementing the §4.6 thumbnail priority.

---

## 8. Prioritised implementation roadmap

Each slice is bounded. Each runs `node tools/logic-checks.mjs` and the production build, plus browser checks at the §7.6 widths with screenshots inspected, and ends with an honest report. Nothing is committed without permission.

| P | Slice | Depends on | Affected components | Acceptance criteria | Tests |
|---|---|---|---|---|---|
| 0 | **Draft continuity fixes** (G1–G3) | none | `DesignStudio.jsx`, `OrderWizard.jsx` | Autosave never erases the stored preview; the draft label is the design name when one is set; opening the Wizard no longer deletes the account draft (it is deleted after a successful submit); a browser-only save is never reported as an account save | logic check for the label rule; browser test: name a design, autosave, then the My Designs card shows the name and the preview; Order, then back without submitting, then the draft still exists |
| 1 | Design tokens and shared components (§7) | none | `theme.css`, `components/ui/*`, `customer.css` | Type scale and spacing tokens exist; `CapabilityBadge`, `DesignCard` and `DesignThumb` exist with no page using them yet beyond one pilot | build; SSR render of the components in logic-checks; contrast check of badge colours |
| 2 | **My Designs thumbnail consistency** (roadmap) | 0, 1 | `MyDesigns.jsx`, `Dashboard.jsx`, `DesignPreview.jsx` | Draft, ordered and starter cards use `DesignThumb`; the same design looks identical on Home, My Designs and Order Detail; one aspect ratio | screenshot comparison for one design across the three pages at 375 and 1366 |
| 3 | **Multi-element align / distribute** (roadmap) | none | `useGarmentCanvas.js`, `RightInfoPanel.jsx`, `snapGuides.js` (pure maths) | With two or more items selected: 6 aligns, 2 distributes; one undo step; nothing changes in export except the moved items | logic checks for the distribute maths; browser test for multi-select, align, undo and save |
| 4 | **Clearer 2D-only layer indicators** (roadmap) | none | `LayersPanel.jsx`, `garmentCapabilities.js` (read-only use) | Marker appears exactly when the layer or garment has no 3D representation; wording matches the 3D switch | logic check against `has3DFor`; browser check on one approximate-3D and one 2D-only garment |
| 5 | Catalog page `/catalog` | 1 | `App.jsx` (route), `CustomerLayout.jsx` (nav), `InspoGallery.jsx` (extract `DesignBrowser`), `designGallery.js` (read only) | Same entries, counts and capability labels as the Studio drawer; opening an entry yields the same `templateId`/`inspirationId` as from the Studio; reference entries never offer editing | logic check that both surfaces read one module; E2E: catalog, open, save, reopen, Wizard |
| 6 | Navigation and shell (§2) | 5 | `CustomerLayout.jsx` | New design action everywhere; mobile nav per §2; Studio back returns to origin | browser nav test at all widths; keyboard tab order |
| 7 | Home redesign (§4.3) | 1, 2 | `Dashboard.jsx` | One next-step card from real state; dead branch removed; draft card with saved preview | browser screenshots for new, draft, in-production and pending states |
| 8 | Wizard saved address and billing pickers | confirm what `customerStore` accepts | `OrderWizard.jsx` | Saved defaults preselected and editable; the order submits as before when none exist | E2E with a stubbed order POST, with and without saved records |
| 9 | Welcome preferences (§4.2, §5) | **backend proposal approved** | new `/welcome`, `AccountSettings.jsx`, Studio Colors and Logo | Every step skippable; preferences pre-filter the catalog and add "Your brand" swatches; nothing blocks ordering | API tests in Laravel; browser test with skip-all and with full completion |
| 10 | Named draft library | **backend proposal approved** | `DesignStudio.jsx`, `MyDesigns.jsx`, drafts API | Several named drafts; reopen any; delete with confirmation; the latest-draft behaviour still works | migration, API and E2E tests |

Proposed (backend), needing approval before slices 9–10:
- a `customer_preferences` record (interests, order-size range, brand colours, brand logo file, portal accent);
- a multi-row draft store keyed by draft id, replacing the single `updateOrInsert` row, or alongside it.

---

## 9. Honest treatment of GLB types and reference entries

Counts are taken from `designGallery.js` on 2026-10-11 (Vite SSR load). Re-derive them in each slice; never hard-code them in UI copy.

| Gallery count | |
|---|---|
| Entries | 40 |
| Tier `2d-3d-approx` | 17 |
| Tier `editable-2d` | 2 |
| Tier `reference` | 21 |
| Tier `2d-3d` (verified) | 0 |
| Photo-matched 3D references (`ref3D`) | 23, of which 14 are sets |
| Family-approximate 3D | 1 |
| 3D turned off by `NO_FAMILY_3D` | 1 |

The asset audit passes:
- 96 assets referenced;
- 0 missing;
- 4 unreferenced files, each explained.

| Type | UI treatment everywhere (Catalog, Studio, My Designs, Order Detail) |
|---|---|
| Reference photo | Badge "Reference photo". Action "View reference". No edit or 3D promise. If an editable family template exists, offer it separately as "Open <family> template", with the note that it is not an exact copy |
| Editable 2D | Badge "Editable 2D". The 3D switch is disabled with its reason |
| Approximate 3D | Badge "2D + 3D (approx.)". In 3D, a persistent note that colour zones are approximate |
| Photo-matched 3D reference | "View in 3D" in the catalog preview only. Neutral colour, labelled "Shape preview". Never editable |
| Fused set | Shown as one preview, labelled as a set. Never split into editable pieces. Uniform-set ordering uses the Studio's top/bottom pieces, not the fused mesh |
| Verified 3D | Not shown. None exist until a verification record is added to `glbSlots.js` |

Badges and notes come only from the registries (`TIER_LABEL`, `has3DFor`, `NO_FAMILY_3D`, `glbSlots.js`), never from page-level copy.

---

## 10. Deferred: AI recommendations

What exists:
- `AIPanel.jsx` and `AIDesignChat` (docked in `RightInfoPanel`), calling the public `POST /ai/describe-design`;
- the post-order material recommendation (`MaterialsReveal.jsx`, `AIMaterials.jsx`, `/customer/ai/recommend-materials`).

These stay as they are.

**Deferred:** catalog and design recommendations based on preferences and order history. This is out of scope until slices 5 and 9 ship.

Boundaries for when it is picked up:
- Recommend only real `designGallery.js` entries and starter designs, with their real capability badges.
- No generated garments, GLBs or photos.
- No paid generation without explicit approval.
- Show why something was suggested ("Because you order school uniforms").
- Allow dismissing suggestions and turning them off in Preferences.
- Never auto-apply changes to a design. A suggestion opens the Studio like any catalog entry, and the customer stays in control.
- No customer data leaves VFRB's API beyond what the existing AI endpoints already send. Any new provider is Proposed (backend) and goes through privacy review.

---

## 11. Gaps found during inspection

| ID | Gap | Evidence | Impact |
|---|---|---|---|
| G1 | The 30 s autosave posts no `preview_dataurl`; the backend writes the field as given, so the stored preview becomes null | `DesignStudio.jsx` autosave effect vs `OrderDraftController::store` (`updateOrInsert`) | The draft thumbnail disappears from Home and My Designs after any edit following a manual save |
| G2 | The draft label is always `"<garment> — <category>"`; the design name the customer types (`cfg.name`) is ignored for the label | `saveDesign` and autosave in `DesignStudio.jsx`; `TopBar.jsx` name input | My Designs and Home show a generic title instead of the customer's name |
| G3 | "Order" deletes the account draft before the Wizard is submitted (`orderThis` calls `DELETE /drafts/latest`) | `DesignStudio.jsx` `orderThis` | Leaving the Wizard loses the account draft; only the sessionStorage copy remains |
| G4 | One draft per account | `OrderDraftController` `updateOrInsert(['user_id'])` | Starting a second design overwrites the first. Needs the backend (slice 10) |
| G5 | Saved shipping addresses, billing profiles and fabric preferences are not used by the Wizard | `routes/api.php` comment; no address calls in `OrderWizard.jsx` | Customers re-enter details per order |
| G6 | Dead branch: the "Your design is waiting" next step sits inside `!draft` and can never render | `Dashboard.jsx` next-step block | Cleanup only |
| G7 | Three different "inspiration" concepts with overlapping names | `TopBar` "Design Inspirations", MyDesigns `inspo` tab (server templates), Showcase | Vocabulary confusion; resolved by §2 |
| G8 | No catalog outside the Studio | Routes in `App.jsx` | Customers cannot browse before entering the editor |
| G9 | The portal accent preference is device-only | `accentColor.js` header | Differs per device; label honestly until the backend exists |
| G10 | Heavy inline styles and uppercase eyebrows across client pages | `Register.jsx`, `Dashboard.jsx`, `OrderDetail.jsx` | Inconsistent type and spacing; addressed by slice 1 then page slices |
| G11 | `theme.css` header comment says `#028090` while `--teal` is `#027a8b` | `theme.css` | Documentation drift only |

None of these were fixed in this pass; each maps to a slice in §8.
