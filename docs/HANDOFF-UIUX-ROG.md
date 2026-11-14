# VFRB UI/UX handoff: ROG pass (branch `landing-consistency`)

Continue the UI/UX redesign on `landing-consistency` of `dogayon-ccc/vfrb-frontend`. Run `git fetch && git checkout landing-consistency && git pull` first. Source of truth: the repo, then `VFRB_PROGRESS.md`, then `VFRB_ENGINEERING_CONSTITUTION.md`. Inspect the minimum, implement, test, verify, commit. Do not re-audit finished work.

Load before editing UI: `frontend-design`, `design`, `antislop-ui`, `antislop-code`, `antislop-layoutmobile`. Comments: one line, only for a non-obvious why.

## Design direction: ASUS ROG adapted to VFRB
Language only, no assets or branding.
- Chamfered corners (clip-path, 8-18px). No pills, no rounded cards.
- Heavy italic uppercase sans (`--rg-sans`). No serif display font anywhere. This supersedes ADR-2 (DM Serif Display), which lives in the project docs, not this repo: treat it as superseded.
- Slanted mint markers, HUD corner brackets, thin mint edge lines.
- Dark ink surfaces, mint accents: teal #028090, mint #02c39a / #4fe0bc, void #041117.
- A clipped element loses its outline at the cut corners: outlined buttons draw the two diagonal strokes explicitly (`rog-site.css`, `rog-auth.css`). Small icon buttons (password eye) must NOT get this treatment.
- Motion 120-300ms, one 700ms route wipe (`RouteVeil`, `docs/ADR-route-veil.md`), off under reduced motion.

## Do next 0: findings from screenshot review (UNVERIFIED until viewed in a browser)
Fixed in CSS on this branch (BUILD-VERIFIED only, needs a visual check at 390 and 1440):
- Serif left in auth group legends and sent/done headings, and in landing bento tiles ("14 photos from our floor", "Made in-house").
- Terms/Privacy `.vs-pagehead` bottom corners rounded: now a cut corner.
- Password eye showed stray diagonal strokes: chamfer rules excluded for `.au-eye`.

Still open:
1. Phone menu button (burger/X) has almost no contrast (menu open and closed). Fix icon stroke colour.
2. ~7px cream strip on the left edge on phones (landing, menu, footer). Probable horizontal overflow: find the element wider than the viewport. Constitution forbids horizontal overflow.
3. Slide-dock pause button overlaps and hides marquee text ("Bulk orde...") on phones.
4. Landing hero h1 is clipped under the header at 390 (may be scroll position only: check).
5. About contact card `.vs-card` is still rounded.
6. `WebGL: INVALID_OPERATION: loseContext: context already lost`: check `vite preview` (prod). If dev-only (StrictMode double mount), ignore. If prod, `grep forceContextLoss src/` for a double dispose.

Content to confirm with the owner (do not change without confirmation):
- "Every order is made by the VFRB team in Bayanan" (Inside VFRB). The interview says a Batangas facility (79 staff, 120 machines) also produces. Ask whether it should read "Bayanan and Batangas".
- "VFRB replies with a proposal and a delivery date for you to accept" (landing How it works). The constitution forbids promising a quote/negotiation flow not in the DB and routes. Verify the backend supports it; if not, change the copy.
- "VFRB MANILA" watermark on gallery photos and hero: confirm it is VFRB's own mark.
- Public nav has no "Our Team" page anymore (Group 60 page removed); "VFRB Family" is the page. Do not recreate it.

## Do next (priority order)
1. Do next 0 items above.
2. Review unviewed pages at 1440 and 390: Privacy, Forgot, Guide/FAQ after the chamfer change.
3. Customer shell (Dashboard, My Designs, Orders, Order Detail, Messages, Profile): premium, visual, low-friction, must NOT look like admin. Chamfered cards, mint active state. Customer CSS still uses `--cx-serif` / `--font-display` (DM Serif) in `customer.css`, `customer-shell.css`, `refresh.css`, `admin.css`: replace with the ROG sans through the shared token (item 5).
4. Admin shell: dense, operational. Dense table skin, mint active row, sticky filters.
5. One shared token file for ROG values (cut size, mint, ink, display font) used by public, auth, customer, admin. Point `--font-display` at the sans so the serif disappears in one place.
6. Optional, build only after approval: hero HUD readout on the 3D scrub top; game-style category picker reusing the Medical GLB; customer order-progress strip over the 7 stations (Pattern, Segregation, Cutting, Sewing, QC, Pressing, Packing) with partial progress.

## Rules
- Bulk uniform orders only; customers need accounts; no supplier portal; customer and admin separate. AI = raw-material recommendation only. No sports category.
- Landing 3D must be a real `.glb`. Never fake 3D.
- Edit only `src/`, `tests/`, `docs/`. No dependency, backend, database or CI changes. No force-push.
- Stop and ask before: deleting files, adding dependencies, changing routes, touching `design-studio` code, anything affecting the API/DB contract.
- Evidence labels only: CODE-/RUNTIME-/BUILD-/DEPLOYMENT-VERIFIED, UNVERIFIED, BLOCKED. Never "should work".

## Verify before each commit
`npm run build`; `npx tsc --noEmit | grep -c "error TS"` (baseline 634, must not rise); `npm run check:glb` (BLOCKED without `VITE_MODEL_BASE_URL`); Playwright e2e on `vite preview` port 4173 (46 green, axe passes); screenshots at 1440x900 and 390x844 for each page touched. Small commits, push to `landing-consistency`, `Co-Authored-By` trailer.

## Output
Print "✅ [step]" after each step. End with a deltas-only report, an evidence label per claim, commit hashes, anything BLOCKED.
