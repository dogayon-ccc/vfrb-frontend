# VFRB design system

Direction (Nov 17 2026): one green VFRB identity across public, auth, client and admin. ROG-inspired technical polish, Canva-like simplicity for clients, dense ERP clarity for admin. This supersedes the "never gamer" line in `DESIGN.md`.

## Authoritative files (load order in `src/main.tsx`)
| Layer | File | Owns |
|---|---|---|
| Foundation | `main.css` `@theme` | Tailwind tokens: surfaces, ink, semantic status, type, space, radius, shadow, motion |
| Brand | `styles/vfrb-tokens.css` | `--vf-*`: mint, teal, navy, paper, line, cut-corner clips. The only place raw brand hex lives |
| Legacy maps | `theme.css`, `tokens-v2.css`, `customer.css` (`--cx-*`) | Old names mapped onto the foundation. Do not add values here |
| Shell | `styles/vfrb-shell.css` | Signed-in chrome (admin sidebar and bar, client bar and rail) on the `--vf-chrome` teal frame, matching the public pages. Light workbench stays light |
| Skin | `rog-app.css` | Cut-corner, mint edges and display type for `.cm-shell` and `.adm-in`. Loads last. Uses `--vf-*` only |
| Public | `landing*.css`, `rog-site.css`, `rog-chrome.css`, `rog-auth.css` | Public pages and auth. Still hold local `--rg-cut` values and literal polygons |

## Rules
- New colour, clip or font: add a `--vf-*` token, then use it. No raw hex in skin files.
- `--rg-*` names stay as aliases of `--vf-*` so public CSS keeps working.
- Cut corners: use `--vf-clip-{10,12,16,18,28}`.

## Known debt (not yet migrated)
- Remaining one-off polygons in `rog-site.css`, `rog-chrome.css`, `rog-auth.css` (asymmetric or variable-size cuts): leave unless a page needs them.
- `.ui-stat` and other tiles keep a 14px round corner; the cut-corner skin only matches `.adm-in .ui-card`. Fix with the Dashboard batch.
- Client page titles (`My Designs`) are light-weight sans while section titles are heavy italic: unify in the page-header component.
- `customer.css` has 10 raw hex values; `theme.css` has 182 custom properties, many duplicating `main.css`.
- `rog-app.css` has no dark-theme values; `data-theme=dark` is handled only by `tokens-v2.css`.
- Specificity: skin rules rely on `.cm-shell` / `.adm-in` prefixes and repeats to beat later files.

## Verify
```bash
npx vite build
npx tsc --noEmit | grep -c "error TS"   # baseline 633, must not rise
grep -c "#[0-9a-fA-F]\{6\}" src/styles/rog-app.css   # expect 0
```
