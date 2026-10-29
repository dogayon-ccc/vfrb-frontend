# Studio and dashboard layout options

Prototypes: `/dev/layouts` (dev server only, mock data, `src/dev/layouts/`). Use "Open full size" or `?full=a-studio|b-studio|a-dash|b-dash` to test at a real 390 or 1440 width. The page has toggles for set vs single piece, the Studio states and the dashboard scenarios.

Both options keep the existing `--cx-*` colour tokens, the serif headings, the 2D/3D toggle and the "3D (approx.)" label. They also keep the lock rule: an ordered design is read-only, and the customer can Duplicate to edit or Reorder. Customers see only high-level order status: no prices, formulas or stage names.

## Shared rules

- **Review & order** sits in the top bar on every screen and is always visible ("Review" on phones). If the design is locked, it changes to **Reorder** (plus **Duplicate to edit** on desktop). If no garment is chosen, it is disabled.
- **Canvas:** the garment fills the stage. On a set, both pieces sit side by side and the active piece is outlined. Tapping a piece selects it.
- **Floating bar:** 4 text buttons (Zoom out, Zoom in, Fit, Back view), well under the 5-control limit. Hints sit below the stage, never in the bar. "3D (approx.)" is a badge in the stage corner, separate from the controls.
- **Phones:** the canvas takes the top ~46% and the controls sit below it in the page flow. Nothing overlays the garment, so the bottom sheet is gone.
- **Every control has a text label.** No icon-only tabs and no hidden sixth tab.
- **Dashboard first action:** exactly one hero card, picked by `pickFirstAction`: action needed > latest active order status > continue draft > start a new design. Recent designs always begins with a "Start a new design" card.

## Option A: Guided

**Layout**
- Desktop 1440: top bar (Dashboard, design name + save state, 2D/3D, Review & order). Below it a 4-step stepper: Garment > Colours > Logo & text > Review. Then a large canvas on the left and a 400px step panel on the right, with Back / Next fixed at the panel foot.
- Mobile 390: top bar, then the stepper (Garment, Colours, Logo, Review), then the canvas with the 2D/3D toggle and a hint under it. The step panel scrolls below that, with a fixed Back / Next row at the bottom.
- Dashboard: one column. Greeting, the first-action hero, Your orders (only if there are any), then Recent designs as a 4-up grid on desktop and a list on mobile.

**Set vs single piece**
- Step 1 asks "Top + bottom set" or "Single piece" and shows a garment choice for each piece.
- Colours on a set defaults to **Whole set**: one Main colour and one Accent colour applied to every piece, so the scheme matches. Switching to Top or Bottom edits that piece's own zones.
- Single piece hides the piece switch. Review lists one row per piece.

**States**
- Empty (no garment chosen): the body asks "What are you ordering?" with Set / Single buttons, and Review & order is disabled.
- Loading: a skeleton garment and line with "Loading your design…" (`role=status`).
- Error: "We couldn't load this design", with Try again and Back to dashboard. The top bar stays so Back always works.
- Locked: a note at the top of the panel, every input disabled, and Reorder plus Duplicate to edit in the top bar.

**What I would remove**
- The top piece pill (`PieceSelector` in `.ds-set-wrap`). Piece and set choice moves into step 1, and the colour target into step 2.
- The icon-only section tabs and the "More" sheet.
- The bottom sheet's peek/half/full snaps (`ToolDrawer` grabber).
- `StudioDock` as the place where ordering happens.
- Draw, AI and Layers as top-level entries. Layers becomes a list in Review; Draw becomes an "Advanced" link inside Logo & text, if it's kept at all.
- Hints mixed into the 3D control cluster.

## Option B: Workspace

**Layout**
- Desktop 1440: the same top bar. Below it, a 232px Pieces rail on the left (a thumbnail card per piece, "Match colours across set", Add a matching bottom / Make it a single piece). The canvas sits in the centre. On the right, a 400px panel with 5 labelled tabs: Garment, Colours, Details, Logo & text, Layers. An "Editing: …" line shows what the panel is changing. Review & order opens a Review view in the same panel.
- Mobile 390: top bar, then a labelled piece switch ("Top · Polo shirt | Bottom · Trousers"), then the canvas with 2D/3D and a hint. Below that, the 5 labelled tabs and the tab panel, which scrolls.
- Dashboard: two columns on desktop. The main column holds the first-action hero and Recent designs; a 380px side column holds Your orders, which fills the empty space beside Recent designs. On mobile it stacks: hero, orders, designs.

**Set vs single piece**
- The rail (or the mobile piece switch) sets the active piece. "Match colours across set" is on by default; while it's on, the Colours tab edits the Whole set scheme. Turn it off to colour each piece separately.
- Garment, Details and Logo apply to the active piece.
- Single piece shows one rail card plus "Add a matching bottom"; the mobile piece switch is hidden.

**States**
- Empty, loading, error and locked behave as in Option A. In the empty state, choosing Set or Single goes straight into the workspace.
- Empty Layers tab: "Nothing added yet. Add a logo or text from the Logo & text tab."

**What I would remove**
- The top piece pill. The rail takes over piece switching and set settings.
- The icon-only right tabs and the hidden Layers sixth tab, replaced by 5 labelled tabs.
- Pattern as a separate tab (fold it into Colours as "Pattern" under each zone).
- Draw and AI from the main tool set (keep them behind a Details > Advanced link if they are needed).
- The bottom sheet and its snap states.
- `StudioDock` as the order location.

## Dashboard empty, loading and error states (both options)

- New customer: the hero says "Design your first uniform" and leads to Start a new design. Recent designs shows only the new-design card. Orders shows "No orders yet…" (Option B) or is hidden (Option A).
- Loading: skeleton blocks with "Loading your dashboard…".
- Error: "We couldn't load your dashboard", with Try again and Start a new design.

## Recommendation

Option A suits first-time customers and keeps phones simple. Option B is faster for repeat bulk buyers who already know their scheme and go straight to Colours or Logo. Both share the same top bar, stage and state rules, so a hybrid is cheap: B's layout with A's stepper shown only for a new design.
