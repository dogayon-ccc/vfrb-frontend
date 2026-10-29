# VFRB design language: Pattern Room

The site looks like a cutting room: chalk paper, a cutting mat, dark ink, one red thread and kraft tape. Raw values are defined in `src/main.css` and `src/styles/tokens-v2.css`. New code uses the `--pr-*` aliases, which point at existing tokens, so nothing was renamed. Dark mode is opt-in via `html[data-theme=dark]` and the aliases follow it.

## Tokens (`--pr-*`)
| Group | Tokens | Source |
|---|---|---|
| Paper | `paper`, `paper-inset` | `--color-chalk`, `--color-mat` |
| Ink | `ink`, `ink-muted`, `ink-meta` | `--color-ink`, `-ink-2`, `-ink-3` |
| Accent | `thread-red`, `thread-red-ink` | at most one active stitch per view; use `-ink` for red text |
| Stitch | `stitch`, `stitch-active` | 1px dashed rule |
| Swatch | `swatch-size` 32px, `swatch-radius`, `swatch-ring`, `swatch-selected` | `SwatchTile` |
| Tape | `tape-bg`, `tape-ink` | kraft with ink, always `--color-on-kraft` |
| Elevation | `elev-0`…`elev-3` | `--shadow-0..3` (flat, card, raised, modal) |
| Motion | `dur-fast` 150ms, `dur-slow` 300ms, `ease` | 0ms under reduced motion |

Exception: the customer shell keeps `--cx-dur-2: 200ms` in `customer.css`. It is left as is, so new work should not copy it.

## Primitives (`src/components/ui`, exported from `index.js`)
- `StitchDivider`: `active`, `vertical` and `label` (a caption centred between two seams).
- `PageHeader`: `eyebrow` (an uppercase line above the title) and `stitched` (a stitch rule below the header). Both are optional.
- `SwatchTile`: a fabric or colour swatch with a 44px target, built from the `--pr-swatch-*` tokens.
- `StatTile` and `StatGrid`, `Skeleton`, `EmptyState`, `DataTable`: reuse these. Don't fork them.
- Not built yet (no page needs them): `SwatchChip`, `TapeInput`, `StatChip`.

## Contrast (WCAG 2.1; AA is 4.5 for body text, 3.0 for large text)
| Pair | Light | Dark |
|---|---|---|
| ink / chalk · mat | 14.76 · 12.40 | 15.69 · 13.64 |
| ink-muted / chalk · mat | 8.29 · 6.96 | 10.03 · 8.72 |
| ink-meta / chalk · mat | 5.87 · 4.93 | 7.64 · 6.64 |
| white / teal-fill | 4.67 | 4.67 |
| teal-ink / chalk · mat | 6.73 · 5.65 | 9.42 · 8.19 |
| thread-red / chalk · mat | 4.98 · **4.19** | 6.90 · 6.00 |
| thread-red-ink / chalk · mat | 6.30 · 5.29 | 6.90 · 6.00 |
| on-kraft / kraft | 6.87 | 5.12 |

**4.19** (red on mat): don't use it for body text. Use `thread-red-ink` instead (no current use). Light ink on dark kraft is 2.67, so tape text always uses `--pr-tape-ink`.
