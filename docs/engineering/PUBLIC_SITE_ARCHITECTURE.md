# Public Site: System Design and Decisions (Account 5)

Scope: public-facing frontend only (Landing, About, What We Do, Inside VFRB, Gallery, VFRB Family, Group 60, header, footer). Backend, database, Design Studio, GLB and admin are out of scope.

## 1. Requirements
**Functional**
- One guided reading path: Landing, About, What We Do, Inside VFRB, Gallery, VFRB Family, Group 60, then back to the start.
- Photography-led pages using only the real VFRB photos in `src/assets/brand`.
- Computerized embroidery presented as digitizing, hooping, stitching; used for corporate branding, apparel and fashion, personalization.
- Gallery with filters and a keyboard-accessible viewer.

**Non-functional**
- Offline-safe: no CDN fonts, scripts or images (verified: zero external requests).
- Responsive at 390 / 820 / 1366 px, zero horizontal overflow.
- Motion 120-320 ms, reduced-motion respected, WCAG AA text contrast, 44 px targets.
- Each page is its own lazy chunk (2-6 kB gzipped each).
- No invented business claims; every fact has one home.

**Constraints:** 4-student team, existing React 18 + Vite + Tailwind v4 app, `MarketingNav` / `Footer` still imported by FAQ, Guide, Privacy, Terms.

## 2. High-level design
```
App.jsx routes (lazy)
  /  /about  /what-we-do  /inside-vfrb  /gallery  /our-team  /group-60
        |
   SitePage  (title, scroll reset, hash scroll, page-enter, <main id="main">)
     |- SiteHeader  (opaque sticky, skip link, mobile sheet with focus trap)
     |- page sections  (Banner, Head, Reveal, Photo, Btn, TextLink)
     |- Journey  (next-page band + progress rail)
     '- SiteFooter
        ^
content.js  <- single source of facts (SERVE, PRODUCTS, EMBROIDERY, PHASES, PEOPLE, JOURNEY, ORDER_STEPS)
config.js   <- NAV, CONTACT
photos.js   <- photo registry (src, w, h, alt) + GALLERY
site.css    <- all public styling, scoped under .vs
```
Legacy `MarketingNav.jsx` and `Footer.jsx` are one-line re-exports so FAQ, Guide, Privacy and Terms share the same chrome.

## 3. Deep dive
- **Content consistency:** pages import lists from `content.js` instead of retyping them. `PHASES` uses the stage names in the public FAQ and Guide. `ORDER_STEPS` mirrors the Guide; change both together.
- **Header:** opaque background (no bleed-through), shadow after 8 px scroll, sheet opens below it.
- **Spacing:** one rhythm variable `--vs-pad`; alternating plain / tint / dark sections; `vs-sec--flush` removes doubled padding between same-tone sections.
- **Images:** `Photo` has explicit width/height (no layout shift), lazy loading, shimmer while loading, "Photo unavailable" fallback, hover zoom 300 ms.
- **Motion:** CSS-only entrance (hero, page enter, reveal on scroll via IntersectionObserver). All disabled under `prefers-reduced-motion`.
- **Accessibility:** skip link, `aria-current`, filter buttons with `aria-pressed`, dialogs (photo viewer, CV) with Esc, focus trap and focus return.
- **Group 60:** separate from VFRB Enterprise; CV data unchanged; phone and address still excluded.

## 4. Scale and reliability
Static assets only. Total brand photos about 2.3 MB, lazy-loaded per page. Failure mode is a missing image, handled by the fallback tile. Revisit if photos exceed ~40 (add `srcset` and thumbnails) or if content needs non-developer editing (move `content.js` to a CMS or JSON file).

## 5. Trade-offs
| Choice | Benefit | Cost |
|---|---|---|
| Plain CSS file scoped to `.vs` | Hover, media queries and reduced-motion in one place | A second styling system next to Tailwind |
| CSS animation, no Framer Motion on public pages | Smaller chunks, works with reduced-motion by default | No spring physics |
| Next-page journey band | Clear reading path, fewer dead-end pages | Every page ends on the same pattern |

---

# ADR-1: Self-hosted display serif for headings
**Status:** Accepted | **Deciders:** Dave, capstone team
**Context:** Headings looked generic; the app is offline-first and `main.css` forbids CDN fonts.
**Decision:** Vendor DM Serif Display (latin, regular, SIL OFL) as `src/assets/fonts/dm-serif-display-latin-400.woff2` with `font-display: swap`.
| Option | Complexity | Offline | Team familiarity |
|---|---|---|---|
| A. Google Fonts CDN | Low | Fails | High |
| B. npm `@fontsource` package | Low | Works | Medium, but needs `npm install` on every clone (this broke a build once) |
| C. **Vendored woff2** | Low | Works | High |
**Consequences:** +25 kB once, no dependency drift. Revisit if italics or other weights are needed.

# ADR-2: Single content module for public facts
**Status:** Accepted
**Context:** The same lists (who we serve, what we make, stages, order steps) were typed in several pages and had drifted.
**Decision:** Put them in `components/site/content.js`; pages import them.
| Option | Pros | Cons |
|---|---|---|
| A. Inline per page | Quick | Drift, contradictions |
| B. **Shared JS module** | One edit fixes every page, reviewable in git | Still needs a developer to edit |
| C. CMS / JSON API | Non-developers can edit | Backend work, out of scope |
**Consequences:** Guide and FAQ are still separate files; keep stage names and order steps in sync by hand.

# ADR-3: Guided journey navigation
**Status:** Accepted
**Context:** Inner pages ended with mixed, repetitive CTAs.
**Decision:** Every page ends with one `Journey` band (next page, order button, progress rail) in the order Landing, About, What We Do, Inside VFRB, Gallery, VFRB Family, Group 60.
**Consequences:** Adding a page means adding one entry to `JOURNEY`. Group 60 links back to the start.
