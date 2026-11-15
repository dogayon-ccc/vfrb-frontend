# ADR: Customer shell, ROG skin on paper

Status: Accepted (2026-11-15). Deciders: Dave (product owner), Account 2 (UI/UX).

## Context
The customer portal must feel like a premium design tool, not like the admin dashboard. Admin uses a navy sidebar and dense tables. Customer pages were plain cards, a pill rail and three competing accents (red, mint, teal). `customer-shell.css`, the Studio styles and page chunks load after `main.tsx`, so shared overrides lost on equal specificity.

## Decision
1. Surface: customers keep the paper background. Admin stays navy. This is the main customer/admin difference.
2. One action colour (teal `#028090`). Mint `#02c39a` marks state only: active nav icon, focus ring, scan bar.
3. Cut corners (clip-path chamfer, 12 to 28px) on hero, tiles, cards and rail links. Active nav is an ink block (`#16213f`), not a pill.
4. Desktop navigation is a 76px icon rail that opens to 232px over the page on hover or focus-within (content never reflows). Mobile keeps the bottom dock. Labels stay in the DOM for screen readers.
5. Home order: hero, order overview tiles (status counts link to the filtered list), featured order beside the other orders, then big visual design tiles (draft first). One create entry: the hero button.
6. Token ownership: all ROG tokens and overrides live in `src/styles/rog-app.css`. Rules that must beat late-loaded CSS carry `html[data-cx] .cm-shell` or `.ds` in the selector. No `!important`.

## Options considered
- A. Dark customer shell like admin: rejected, removes the admin/customer difference.
- B. Keep pill rail and cards, only recolour: rejected, does not change the feel.
- C. Chamfer plus paper plus hover rail (chosen): CSS-only, no new dependencies, reversible by removing the rog-app.css sections.

## Consequences
- Easier: one place to restyle both portals; more page width for content.
- Harder: `clip-path` removes outlines and box-shadow, so borders are redrawn with inset shadow; focus rings must stay inside the clipped box.
- Touch tablets open the rail on tap focus; a tap on a link still navigates.
- Revisit: the Studio chrome (navy bar, rail) is Account 1's and still dark; align it only with Account 1's approval.

## Action items
- [ ] Re-render Orders, My Designs, Order Detail, Messages, Profile under the new rail width.
- [ ] Add a Playwright check for rail width 76 idle and 232 on hover.
- [ ] Studio garment picker redesign (category first, full-set pairing), with Account 1.
