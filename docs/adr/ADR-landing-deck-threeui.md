# ADR: Home deck navigation and ThreeUI backdrop

**Status:** Accepted, 2026-11-14 · **Scope:** public Home page only

## Context
Home needs a presentation feel (slides, dots, arrows, a 3D backdrop). The hero and the template carousel already render real VFRB `.glb` garments; that stays the centrepiece.

## Decision
1. **Deck = navigation, not a scroll-jacked deck.** `DeckNav` adds right-edge dots, a bottom bar and PageUp/PageDown/Left/Right keys over normal sections. Up/Down arrows are left alone so reading and forms are not broken. Sections stay crawlable and work without JS.
2. **ThreeUI as backdrop only.** `@designcodeio/threeui` (MIT, pinned 1.2.0) `WovenCloth` ("atelier") runs behind the hero, tinted teal via hue/saturation props. It is imported by subpath and lazy-loaded; gated to >=960px, no reduced-motion, no Save-Data. Never in front of the garment.
3. **No full ThreeUI template transplant.** ThreeUI templates are self-contained sandboxed iframes with their own three.js; they cannot share the VFRB `.glb` scene, so cloning one wholesale would replace the real garments with an unrelated demo.

## Consequences
- Each ThreeUI component's iframe loads three@0.160 from cdn.jsdelivr.net at runtime: a third-party request. The Privacy Policy line about the map should be reviewed for it (owner: adviser / Ma'am Fe).
- `WovenCloth` chunk is ~51 kB gzip, fetched only on wide screens.
- Offline PWA mode shows the plain teal hero (backdrop silently absent).

## Alternatives rejected
- Full-page `100vh` snap deck with wheel hijack: breaks long sections (FabricStage is a sticky 3D scroll), a11y and SEO.
- Self-hosting the iframe source to remove the CDN call: viable follow-up via `srcDoc` rewrite.
