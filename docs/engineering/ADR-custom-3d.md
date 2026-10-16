# ADR: 3D for "Build your own" garments

- Status: Accepted (2026-10-16)
- Scope: Custom Top, Custom Bottom, Custom Skirt (`customGarment.js`), and the Button-Down point collar.

## Context

A build-your-own garment is a `CustomSpec` (`cfg.custom`): neckline, sleeve, length, fit and hem for a top; style, length, rise, cuffs
and drawstring for a bottom; length for a skirt. The 2D sketch is generated from that spec (`garmentPaths.js` `top()` / `trousers()` /
`skirt()` via `topOptions()` etc.). Until now 3D was off for these garments: no model exists for a shape the customer invents.
The goal is 3D for every build-your-own choice, labelled honestly, with no new dependency and no paid generation.

## Options

| | A. Runtime parametric meshes from the CustomSpec | B. Baked GLB variants | C. Extruded 2D silhouette |
|---|---|---|---|
| Matches every spec | Yes: same numbers as the 2D generator | Only the baked grid (5 necklines x 4 sleeves x length x fit ... thousands) | Outline yes, depth no |
| Asset weight | None (geometry built in the browser) | Large; every new option re-bakes | None |
| Named parts (zones, pockets toggles) | Yes, by construction | Yes | One slab; collar/sleeve are not separable |
| Looks like a garment | Approximate tubes and bands | Best | Reads as a cut-out board |
| Cost to change | Edit one pure module | Re-run a bake pipeline | Small |

## Decision

**A. Runtime parametric meshes.** `design-studio/customMesh3D.js` is a pure function `spec -> named parts` (body, sleeves, collar band,
pockets, waistband, legs, cuffs, drawstring, hem) as `BufferGeometry` with normals and UVs, each part capped at 20,000 triangles. It reads
the same option builders as the 2D sketch, so length, fit, neckline, sleeve, hem, jogger options and skirt length agree in 2D and 3D.
`DesignStudio3D` renders it through the existing zone-mask material (zone colours, patterns, sheen) as `CustomGarmentMesh`.

## Consequences

- Label is always **3D (approx.)**: shape and drape are simple lofts, not a scan or a pattern-made garment. Never "verified".
- Rebuilds are throttled to 120 ms, memoised by spec, and old geometry is disposed (no GPU leak while dragging a slider).
- Details toggles hide pocket parts in 3D as in 2D. Pocket layers added with the Add pocket tool stay 2D only.
- Logos and text are projected onto the body part as decals, as on the authored models.
- The same generator serves the Button-Down Short (point collar, separate collar part in the collar colour), replacing the capped
  work-shirt scan as the family model. Button-Down Long keeps its photo-matched models (utility shirt, BIR blouse).
- Set view: custom pieces are measured with their own spec (`setScale.js` `realLength(garment, sleeve, custom)`), so the top/bottom
  ratio holds in 2D and 3D.
- Rejected B because the combinations explode and add megabytes; rejected C because it cannot separate zones and looks flat.
