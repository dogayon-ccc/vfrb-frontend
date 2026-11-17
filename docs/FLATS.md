# Garment flats

## Tiers
- **Tier 1, GLB flat**: SVG traced from an authored GLB (`tools/flat-from-glb.mjs` → `src/assets/flats/`, loaded by `flatPaths.js`). Today: Scrub Top Short and 3/4. Each face is fitted to the `top()` body box.
- **Tier 2, generator**: drawn by `top()`, `trousers()` or `skirt()` in `garmentPaths.js`, either from `GENERATED` (fixed options) or `PARAM_FAMILIES` (`customGarment.js`, customer sliders). Examples: Polo, Lab Coat, Round Neck, Barong, Men's Slacks, Pantsuit Trousers, Jogger Scrub Pants.
- **Tier 3, derived**: one outline traced from a reference model (`derivedFamilies.js`), e.g. Mandarin Blouse. It has no generator, so it keeps its drawn shape at every size.

## Zone mapping
- Colour zones are always `body`, `collar`, `sleeveL`, `sleeveR`, `pocket`. Everything else is a `details` line; a detail with a `part` can be hidden or recoloured (`garmentDetails.js`).
- Tier 1: GLB part ids map onto those keys (`AUTHORED_TOP_PARTS`); lower pockets stay a detail on the body colour. Logic check: SVG part names = 3D parts.
- Tier 2: the zone keys must equal the generator's at every size and fit (logic check "zone parity").

## Size and fit rule
- `getGarmentPaths(garment, sleeve, face, sizing)` takes `sizing = { size, fit }`. Without it (every caller today) the template is drawn as before.
- `sizeRatios()` reads `PH_SIZE_CHART` as ratios to size M, the size every template is drawn at. Size M redraws exactly the same, so saved designs keep their shapes, zones and colours.
- Tops: body length, shoulder, chest and sleeve length. Trousers: rise, inseam, waist and hip. Skirts: length, waist and hip. The canvas widens with the chest or hip and the drawing stays centred.
- Fit `female` narrows the shoulders by 4% and shapes the waist, but only on an unshaped top; Blouse and Dress keep their own cut.
- Proportions only: no cm value is drawn or shown to anyone.

## Pants (GLB flat)
- `node tools/flat-from-glb.mjs` also traces `authored/pants-straight.glb` (Draco, decoded with the decoder in `node_modules/three`, no CDN) into `src/assets/flats/pants-straight/{front,back}.svg`: one path per mesh part, every island kept, plus `silhouette`, the outer shape rendered without the fly and pockets so welts never poke past the legs. Trace logic is `tools/flatTrace.mjs`.
- `flatPaths.ts` `buildTrousers` warps that flat onto the sized `trousers()` template: GLB top, band, widest row, crotch and hem land on the template's waist, band, hip, crotch and hem rows; waist, hip and hem widths follow the size chart; the body box (control points included) equals the template's, so `bodyBounds` and saved overlays do not move.
- The GLB fly and pocket islands replace the template's `closure`, `sidePockets` and `backPockets` lines (same part ids, so show/hide still works). Belt loops, crease, button, hem stitch and the waist seam are the sized template's own: the GLB has no geometry for them.
- Only the catalog name `Pants` uses it. Pantsuit Trousers, Creased Trousers, Men's Slacks, Shorts, Jogger and Custom Bottom keep their templates.

## 3D label
- `label3D(cfg)` in `garmentCatalog.js` is built from `has3DFor`: "3D (approx.)" when a model exists, otherwise "3D not available". No model is verified yet.

## Adding a garment
1. Check `FAMILY_BY_NAME`, `PARAM_FAMILIES` and `DERIVED_FAMILIES` first: never a duplicate family.
2. A fixed shape goes into `GENERATED`; a shape with customer choices goes into `PARAM_FAMILIES`. Add its sleeves to `SLEEVE_OPTS` and its category in `garmentCatalog.js`.
3. 3D only through `garmentCapabilities.js` with a real GLB. The label then follows on its own.
4. Add the garment to the program list in `tools/logic-checks.mjs`, then run it and `npm run build`.
