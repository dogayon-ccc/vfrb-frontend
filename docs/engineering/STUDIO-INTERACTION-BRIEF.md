# Studio interaction brief (item 2, 2026-10-30)

Input for Studio shell v3. This brief takes interaction patterns only. It copies no layouts, assets, icons, names or visual identity. Source behaviour comes from general product knowledge and was not re-checked against current releases.

## Patterns worth taking

| # | Pattern | Seen in | VFRB adaptation | Lands in |
|---|---|---|---|---|
| 1 | **Contextual properties panel**: the right panel shows settings for the current selection and falls back to the document (garment) settings when nothing is selected | Figma, Webflow | No selection: garment zones and colours. Text or logo: font, size, colour, align. Pocket: pocket colour. One panel, never a second floating inspector | `RightInfoPanel.jsx` (`SelectionInspector`) |
| 2 | **Floating context bar near the selection** with 3–5 frequent actions; everything else stays in the panel | Canva, Photoshop (contextual task bar) | Keep duplicate, delete, arrange and align. Place it above the selection and flip below near the top edge. Hide it while dragging | `FloatingToolbar.jsx` |
| 3 | **Layers list mirrors canvas order**: drag to reorder, eye/lock toggles, rename inline, click selects on canvas and the reverse | Figma, Photoshop | Already built. Add two-way highlight on hover and a selected row that scrolls into view. Garment zones are not layers | `LayersPanel.jsx`, `canvasLayers.js` |
| 4 | **Left rail = objects/pages, right = properties** | Figma, Webflow (navigator) | Pieces rail lists top and bottom; the active piece is outlined on canvas. The rail never edits properties | `PiecesRail.jsx` |
| 5 | **Neutral chrome, content-coloured stage**: dark UI frame so the work keeps true colour | Photoshop, Figma dark | Dark chrome; light "cutting mat" stage so fabric colours read true. Keep chrome and stage tokens apart in `--pr-*` | `DesignStudioStyles.jsx` |
| 6 | **Zoom model**: Ctrl/Cmd + wheel and pinch zoom to the cursor; space-drag or two-finger pan; Fit and 100% as buttons; zoom % readout | Figma, Photoshop | Already partly in place. Zoom anchors on the pointer, not the centre. Readout lives on the interaction layer, never in exports | `CanvasViewport.jsx`, `StageRulers.jsx` |
| 7 | **Snapping with visible guides and distance readouts** that disappear on release | Figma, Canva | Snap to garment centre line and zone edges. Alt disables snapping. Guides stay off history and thumbnails | `snapGuides.js`, `canvasGuides.js` |
| 8 | **Suggestion card that never auto-applies**: one card, shows why, "Apply" and "Dismiss", and Apply is a single undo step | Canva (suggestions) | Material suggestion card: fabric name, reason in plain words, Apply / Dismiss. No prices or formulas. Raw-material recommendation only | new small card in the panel. The existing recommendation is order-scoped (`/orders/{id}/ai-recommendation`), so the Studio has no source before an order exists (see open choice 3) |
| 9 | **Visual browsing grid with a detail view**: masonry of images, open one to see related items and a single primary action | Pinterest | Inspiration gallery: open a photo and show its honest tier label ("Reference only", "Editable 2D", "3D preview") before the action button | `InspoGallery.jsx`, `designGallery.js` |
| 10 | **3D viewer controls**: drag to orbit, scroll/pinch zoom, reset-view button, lighting preset switch, auto-rotate off by default, a persistent label that says what the model is | meshy.ai viewer | Orbit, zoom, Reset, two lighting presets. Badge "3D (approx.)" or "3D preview, not editable". Unverified garments show "3D not available for this garment" with the 2D view; no placeholder mesh | `DesignStudio3D.jsx`, `ReferenceModel3D.jsx` |
| 11 | **Adaptive layout by breakpoint, not by device**: panels become stacked sections or a tabbed area below the canvas on narrow widths | flutter.dev (adaptive/responsive guidance) | Under 768px: canvas on top, labelled tabs below in page flow, no overlay sheet (matches `UX_REDESIGN.md`) | `ToolDrawer.jsx`, `TopBar.jsx` |
| 12 | **Undo-first editing**: every change is reversible, undo/redo always visible, destructive actions without confirm dialogs | Figma, Canva | Keep undo/redo in the top bar. Delete needs no dialog because undo restores it | `editHistory.js`, `TopBar.jsx` |
| 13 | **Saved state in the header**: "Saved", "Saving…", "Saved on this device only" | Figma, Canva, Webflow | Always tell an account save apart from a browser-only save | `saveStatus.js`, `TopBar.jsx` |
| 14 | **Keyboard shortcuts with discoverable hints**: shortcut shown in tooltip and menu, `?` opens a list | Figma, Photoshop | Del, Ctrl+Z/Y, Ctrl+D, arrows to nudge (Shift = 10px), `?` for the list. Every action also has a visible button | `useGarmentCanvas.js` |

## Patterns to avoid

- Icon-only toolbars without labels (Photoshop's tool column). Customers are not daily users, so every control gets a text label.
- Infinite canvas and free page sizes (Figma, Webflow). The garment is the page, so the stage stays fixed.
- Auto-applied AI or "magic" edits (Canva). They break undo and the AI scope rule.
- Paywalled or "Pro" upsell markers on tools.
- Auto-rotating 3D on load. It costs battery on phones and ignores reduced motion.
- Hover-only actions. Touch has no hover, so every action needs a 44px tap target.

## Accessibility carry-overs

- Panel tabs are `role=tablist` with arrow-key movement. The canvas selection is announced through a live region ("Text selected: VFRB").
- Floating bar and panel controls are reachable by Tab in canvas order.
- Reduced motion: no panel slide or 3D auto-rotate, and the snap guides do not animate.

## Open choices for item 3

1. Panel tabs: keep the five labelled tabs from Option B or switch to a pure contextual panel (pattern 1) with only "Garment" and "Add" tabs. Recommendation: a contextual panel with Garment and Add tabs, because fewer tabs means less hunting.
2. Suggestion card placement: top of the Garment tab (recommended) or a dismissible strip under the stage.
3. Suggestion card data: the AI recommendation only exists after an order is placed. Options are a static card that says suggestions come after ordering (no backend change, recommended for v3), or a new pre-order endpoint (backend work, separate approval).
