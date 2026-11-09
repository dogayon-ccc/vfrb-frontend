# UI/UX checklist (2026-11-09)

Audit ran on `feat/mobile-polish` (on `feat/studio-touch` on `main` `3c419e6`); F1-F5 fixed on `fix/a11y-nov9` (from `origin/main` `3c419e6`). Demo stack only (Vite :5180 -> php :8000, vfrb_demo).

> Touch and PWA items below (pull to refresh, sheet flicks, install card, offline strip, status bar, Studio touch) live on `feat/studio-touch` / `feat/mobile-polish`, **unmerged until tested on a real Android phone and iPhone**. They are not in `main`.
Status labels follow CLAUDE.md. `[x]` passed, `[ ]` open (fix or untested).

## How it was tested
- `npm run build` passes; `node tools/logic-checks.mjs` 561/561.
- Automated page audit in same-origin frames, animations switched off before measuring (mid-animation readings gave false 41-42 px targets earlier). Per page: tab title, exactly one h1, horizontal overflow, controls under 44 px, buttons/links without a name, images without alt, fields without a label, duplicate ids.
- Roles: signed out, customer (Ana, demo), Administrator (Manager) (demo-manager). Widths: 1440 and 390 (public, customer), 1366 and 390 (admin).
- Console errors read per tab; the only errors seen came from a browser extension's message channel, not the app.

## Results by area

### Public site (13 pages x 2 widths) RUNTIME-VERIFIED
- [x] Home, About, What We Do, Inside VFRB, Gallery, VFRB Family, Customer Guide, FAQ, Group 60, Privacy, Terms, Sign in, 404: own tab title, one h1, no overflow, all targets >= 44 px, no unnamed controls, no missing alt or labels (26/26).
- [x] Sign in: empty submit shows "Enter your username or email." / "Enter your password."; a wrong password shows "Invalid username/email or password." and stays on /login.
- [x] Landing kicker "On the VFRB floor" in sentence case; "See more of our work" is 44 px.

### Customer portal (12 pages x 2 widths) RUNTIME-VERIFIED
- [x] Dashboard, My Designs, My Orders, Order detail, Place an order, AI Materials, Messages, Settings (profile, billing, feedback, help), Design Studio: one h1, no overflow, targets >= 44 px (22/24 clean).
- [x] **F1 fixed** AI Materials order picker labelled `aria-label="Order"`. RUNTIME-VERIFIED 390 and 1440.
- [x] **F3 fixed** Studio tab title is "New design · Design Studio | VFRB Enterprise". RUNTIME-VERIFIED 390 and 1440.
- [x] **F4 fixed** A failed Next moves focus to the first problem (Design step: the upload button; Delivery step: the Fabric select, `aria-invalid`); its message is the existing `role="alert"`; a submit error takes focus. RUNTIME-VERIFIED 390 and 1440.
- [x] Pull to refresh (Dashboard, Orders, My Designs): winds, arms at 64 px, refetches, settles; short pull and pull while scrolled down do nothing (simulated touch).
- [x] More sheet drags from its handle, springs back on a small drag, closes on a flick; notifications close on an upward swipe (touch only) (simulated pointer).
- [x] Install card (simulated browser offer): prompts, hides, remembered 30 days. Offline strip appears and clears. Status bar colour follows the header inside the portal and returns to navy outside.
- [x] Studio touch (feat/studio-touch): two-finger scale/rotate, long-press menu, two-finger-tap undo, native context menu blocked for fingers only (simulated).

### Admin, Manager (23 pages x 2 widths) RUNTIME-VERIFIED
- [x] Dashboard, Orders, Order detail, Customers, Production list and tracking, Output Log, QC, Delivery, Messages, Inventory, Materials, Physical Count, Procurement, Suppliers, Sales & Pay, Invoice, Reports, Feedback, Showcase, Audit Log, Settings: one h1, no overflow, targets >= 44 px, own tab title (44/46 clean).
- [x] **F2 fixed** Activity Log filters labelled "Action type", "From date", "To date". RUNTIME-VERIFIED 390 and 1440.
- [x] Tab titles after sign-out/sign-in, hard reload and a fresh-tab deep link (earlier pass, abc790f).

### Accessibility basics
- [x] Visible focus on buttons (3 px solid outline) RUNTIME-VERIFIED on Sign in.
- [x] **F5 fixed** Sign-in fields show a 2px solid #028090 outline (4.5:1 on the white card), offset 2px, on real focus. RUNTIME-VERIFIED 1440 and 390 (screenshots).
- [x] Reduced motion: pull dial spin, sheet spring-back and haptics are off under `prefers-reduced-motion` CODE-VERIFIED.

## Fixes F1-F5 (done on fix/a11y-nov9)
| # | Where | Fix | Size |
|---|---|---|---|
| F1 | `AIMaterials.jsx` order select | add `aria-label="Order"` | 1 line |
| F2 | Activity Log filters | add labels (visible or `aria-label`) | ~3 lines |
| F3 | `DesignStudio.jsx` title | end with "| VFRB Enterprise" | 1 line |
| F4 | Order wizard "Next" | focus the first invalid field | ~5 lines |
| F5 | `AuthShell.jsx` focus ring | stronger glow (e.g. 3 px at 35 %) | 1 line |

## UNVERIFIED (needs a person or a device)
- [ ] Real Android phone: touch gestures, haptics, real install prompt, installed app (launch screen, shortcuts, orientation).
- [ ] iPhone/iPad Safari: touch, Add to Home Screen, status bar with `default` style, long-press callout.
- [ ] 768 px tablet layout, NVDA screen reader, Safari desktop.
- [ ] Administrator (Station) and Owner roles in this pass (Station scope was verified earlier on vfrb_demo).
- [ ] Live deployment of `feat/studio-touch` and `feat/mobile-polish` (not merged or pushed).

## Lifecycle (fix/a11y-nov9) RUNTIME-VERIFIED
- [x] Two-piece set as Ana: Scrub set in Royal Blue, Save (account), My Designs > Continue my draft (both pieces restored), Review & order, Sizes 100 each, Delivery, Submit 2 orders -> #217 Scrub Top + #218 Jogger Scrub Pants; Order Detail shows "Uniform set · 2 linked orders". #217/#218 cancelled by demo-manager with a QA note.
