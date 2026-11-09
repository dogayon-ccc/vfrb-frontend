# ADR: One 3D capability source with honest labels

**Status:** Accepted (records the system as built on `release/nov9b`)
**Date:** 2026-11-09
**Deciders:** Dave (developer), capstone adviser, VFRB owner

## Context
The Studio offers 31 garment families. 23 have a registered GLB: 3 are VFRB-authored procedural models, 14 come from Meshy image-to-3D generations, and 6 are Meshy-derived. None has a recorded verification. Before this release, the 3D wording lived in several places ("3D (approx.)", "3D not available", "2D + 3D (approx.)", "2D only"). A card, the Studio view chip and an order preview could word the same garment differently. A panel needs one rule it can check. Full table: `3D_CAPABILITY.md`.

## Decision
Routing comes from one source and the label from one source:
- `scannedEntryFor` decides whether a model renders, and `cap3D` returns `verified | approx | none`.
- `CAP3D` holds the only wording: "3D preview available", "3D preview (approximate)", "2D design only: 3D coming".
- `Capability3D.jsx` is the only badge component.
- A model counts as verified only with a `verification: { method, date }` record from the GLB intake gate.
- No model is registered without a garment-only mesh, a UV or region mapping, and a recorded licence and source.

## Options considered

### A: One source and honest labels for every registered model (chosen)
| Dimension | Assessment |
|---|---|
| Complexity | Low (a constant and a component) |
| Honesty | Every unverified model says "approximate" |
| Demo impact | Nothing live is hidden |

**Pros:** cards, toggle and previews cannot disagree; a logic check enforces the wording. **Cons:** "approximate" appears on most garments until models are verified.

### B: Hide every unverified model ("2D design only" everywhere)
**Pros:** strictest reading of "no fake 3D". **Cons:** removes a working, labelled preview from 23 families on defense day. Rejected.

### C: Keep per-screen wording
**Pros:** no change. **Cons:** labels drift; a panel finds contradictions. Rejected.

## Trade-off analysis
A keeps the useful approximate preview and makes its status impossible to misread. B is more conservative, but it treats a labelled approximation as if it were a false claim. The real risk is provenance, not rendering, and the licence gate covers that.

## Consequences
- Promoting a model to "3D preview available" needs a verification record; nothing else changes the label.
- Meshy-generated models stay "approximate" until the owner records the Meshy plan and terms and confirms photo ownership (`3D_CAPABILITY.md`, owner section).
- New Meshy or Tripo files are not registered by code changes alone. They pass the GLB intake (garment-only, under 20k triangles per mesh, UVs or a measured zone map) and the licence record first.

## Action items
1. [ ] Dave: fill in the Meshy plan and terms, and the photo ownership line, in `3D_CAPABILITY.md`.
2. [ ] Add verification records only after a render comparison against the 2D template.
