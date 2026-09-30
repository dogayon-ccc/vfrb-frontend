# ADR: photo-driven design catalog with filters (Proposed)

## Context
The 2D garment list (14 hand-drawn silhouettes) and the 3D assets do not describe the same garments, and 14 of the 20 scans were fused human
figures. The client's real garments exist as photos (20 so far, mostly women's corporate/hospitality). Owner request: browse real designs, filter by
sleeve / piece / category / gender, and open one as an editable design.

## Decision
1. Catalog entry = a real design (`designGallery.js`): category, gender, piece (upper / lower / set / dress), sleeve, collar, source, `glb`, `status`.
2. Browse UI = the existing Inspo / Showcase modals with four filter rows (chips reuse `.ds-chip`). Chips with 0 results are disabled
   (`facetCounts`), so choosing Long only ever shows long-sleeve designs.
3. Opening a design loads its GLB if `glb` is set. Otherwise it opens the 2D editor with the nearest silhouette and a "photo reference, 3D not
   available yet" badge. No 3D is faked.
4. `SLEEVE_OPTS` in `garmentCatalog.js` stays the rule for the 2D editor; gallery `sleeve` values must be members of it or the entry gets no 2D fallback.
5. Categories follow the constitution: School, Corporate, Medical, Hospitality, Industrial, Dress. No Sports.

## Constraints found in the photos (why "click -> GLB" cannot be automatic)
- Conversion happens offline (Meshy / Tripo credits), one garment at a time, then the asset must pass the garment-only checks. It is not done on click.
- Photos are 433x577 or smaller. Image-to-3D wants roughly 1024 px+. Re-shoot or export larger originals before spending credits.
- 11 photos are on a black mannequin and 4 are on a hanger; both tend to be modelled into the result. 3 flat-lay scrub photos are the best candidates.
- Patterns (pinstripe, polka dot, scarf print) get baked into the mesh texture; recolouring a baked texture destroys the pattern. Plain-colour garments are the best editable candidates.
- Sets are one image: split into separate upper and lower assets, or model the set as one asset and accept one colour zone list.
- No standalone pants or skirt photos yet, only inside sets. Only 3 of 20 photos are men's; no school-specific garment is confirmed.

## Convert first (suggested)
scrub-set-women-vneck, scrub-set-men-vneck, scrub-set-housekeeping (flat-lay, plain, core product), then blouse-tunic-roundneck-blue,
blouse-asymmetric-blue, shirt-utility-beige-long.

## Consequences
Easier: real products, honest filters, one place to add a design. Harder: every new design needs a photo + metadata + (later) a validated GLB.
Revisit: once 3+ designs have GLBs, retire the hand-drawn silhouettes that no design uses.
