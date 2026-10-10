# Meshy GLB staging audit (2026-10-10)

Scope: the 39 Meshy GLBs in `asset-staging/mesh-3d/` (git-ignored, originals untouched), compared with `public/garments2d/source/*.png` and `public/gallery/*.webp`.

Evidence:
- **STATIC**: `python tools/glb-intake/inspect_glb.py`, which reads the node, mesh, material, UV and texture counts, plus the bounds and SHA-1.
- **RENDER**: `tools/glb-harness/raw.html` in headless Chrome (SwiftShader WebGL). It renders each file at 0°, 45°, 90° and 180°, and the Pants, Shorts and Skirt candidates also at 30° and 270°, with one flat tint.
- **BROWSER**: the live Design Studio, with the network stubbed so no orders are written. It covers 3D, colour and pattern, Save and Reload, and the 3D previews in the Order Wizard and Order Detail.

Live per-garment status is generated in `ASSET-REGISTRY.md`; this file records the audit and the choices.

## Structure (STATIC, all files)
- Every file has one node (`mesh_node`) and one mesh. None has UVs or textures.
- 38 files have 0 materials. `dress-shift-geometric.glb` has 1 material without a texture.
- All files are normalised by Meshy to a longest axis of about 1.9 units, with the front facing +z.

What the structure allows:
- No UV artwork and no material swaps.
- No separate collar, cuff, pocket or button parts.
- 3D customisation is limited to the shader zone mask (geometry thresholds) and procedural patterns in model space, the same method the studio already uses for its other Meshy models.
- Text and logo decals are wired only for tops whose 2D overlay frame was calibrated. Lower garments have them off.

Two problems found in the files:
- **Duplicate:** `dress-sheath-denim-blue.glb` and `blazer-pinstripe-navy.glb` are byte-identical (SHA-1 `38fb945a77d5`). The render shows a pinstripe blazer with trousers, not a dress, so the denim sheath dress model is missing or mislabelled.
- **Too heavy for the web:** `dress-shift-geometric.glb` is 67.9 MB with 2.8 M triangles. It was not rendered and is not usable at runtime.

## Selected runtime mappings
| Canonical garment | 2D source | Gallery image | Runtime GLB | Status | Known limitations |
| --- | --- | --- | --- | --- | --- |
| Pants | vector `pants-trousers` | `/gallery/pants.webp` (Dress Slacks) | `/models/vfrb-staged/pants.glb` (= staging `pants.glb`, identical SHA-1) | approximate-3d | One body colour (waistband, loops and pockets are modelled shapes, not parts). No text or logo in 3D. Straight-leg cut only. |
| Shorts | vector `shorts-standard` | `/gallery/shorts.webp` (School Shorts) | `/models/vfrb-staged/shorts.glb` (copy of staging `shorts.glb`, identical SHA-1) | approximate-3d | One body colour. No text or logo in 3D. Pleated school-shorts cut. Fine wrinkles are baked into the geometry. |
| Skirt | vector `skirt-pencil` | `/gallery/corporate-skirt.webp` | `/models/processed/skirt-pencil.glb` (unchanged) | approximate-3d | Low-poly. Staging `corporate-skirt.glb` was rejected (see below). |
| Scrub Top (F/M) | photo bases `scrub-top-*-short` | `scrub-set-*-vneck` | `/models/garments/scrub-top-*-short.glb` (unchanged, top component of staging `scrub-set-*-vneck.glb`) | approximate-3d | See `ASSET-REGISTRY.md` |
| Mandarin Collar / Short | `mandarin-tunic-housekeeping` | `scrub-set-housekeeping` | `/models/garments/mandarin-tunic-housekeeping.glb` (unchanged) | approximate-3d | See `ASSET-REGISTRY.md` |
| Round Neck / Short | `round-neck-fuchsia-short` | `blouse-roundneck-fuchsia` | `/models/garments/round-neck-fuchsia-short.glb` (unchanged) | approximate-3d | See `ASSET-REGISTRY.md` |
| Button-Down / Long (F) | `button-down-bir-long` | `bir-blouse-trousers-blue` | `/models/garments/button-down-bir-long.glb` (unchanged) | approximate-3d | See `ASSET-REGISTRY.md` |
| Button-Down / Long (unisex) | vector `Button-Down` Long | `/gallery/shirt-utility-beige-long.webp` | `/models/vfrb-staged/shirt-utility-beige-long.glb` (copy of staging, identical SHA-1) | approximate-3d | Zones body, sleeve and collar (geometry thresholds, BROWSER-checked front, side and back). The chest flap pockets are shapes, so pocket stays 2D only. Front collar points take the body colour. Wrinkles and a banded hem are baked in. |

**Pants decision** (RENDER, 5 angles each; all of these are at least two-legged trousers):
- **Selected: staging `pants.glb`** (also staged as `public/models/vfrb-staged/pants.glb`). It is garment-only and has a clean waistband with belt loops, a fly, slant pockets, a front crease and finished hems. Its proportions (w/h 0.46) match the Dress Slacks photo (0.45).
- **Superseded: `public/models/processed/pants-trousers.glb`.** It is a cut from a fused figure, with a ragged waist, a hand-stub hole at the hip, a female cut and baked scan folds. The file is kept but no longer rendered.

**Shorts decision:**
- **Selected: staging `shorts.glb`.** It matches the School Shorts photo: button waistband, pleats and pockets, w/h 0.92 against 0.91 in the photo.
- **Superseded: `processed/shorts-textured.glb`,** which has a torn waist and a hand notch. It is kept but not rendered.

**Skirt decision:**
- **Rejected: staging `corporate-skirt.glb`.** Its front matches the pencil-skirt photo, but the back and sides are modelled as two legs, so it is shorts from behind. A skirt model that turns into shorts when rotated would mislead.
- `processed/skirt-pencil.glb` stays.

**Gallery effect:** the `pants` and `shorts` photos now show "2D + 3D (approx.)", because their family's model was generated from that exact photo (`sourcePhoto` in `garmentCapabilities.js`). `corporate-skirt` stays "Editable 2D".

## Studio families added for existing models (2026-10-10)
Each new family has its own vector 2D template in `garmentPaths.js` and an entry in `garmentCatalog.js`, `OrderWizard.jsx` (GARMENT_SPECS) and the gallery `BASES`. Its 3D is the garment-only model of the gallery photo of that exact cut, copied byte-identical to `/models/vfrb-staged/`. All of them are one body colour plus patterns; collar, sleeve and pocket colours stay 2D only. BROWSER evidence: each loads its own GLB in the Studio 3D workspace.

| Family (category) | Fit · sleeve | Runtime GLB | Gallery photo |
| --- | --- | --- | --- |
| Blazer (Corporate) | female · Long | `blazer-tweed-herringbone.glb` | blazer-tweed-herringbone |
| Blazer (Corporate) | female · 3/4 | `blazer-white-notch.glb` | blazer-white-notch |
| Blouse (Corporate, Hospitality) | female · Short | `blazer-blouse-blue.glb` | blazer-blouse-blue |
| Dress (Corporate, Hospitality) | female · Short | `dress-bir-green-yellow-collar.glb` | dress-bir-green-yellow-collar |
| Pleated Skirt (School) | — | `school-skirt.glb` | school-skirt |

- Blazer, Blouse and Pleated Skirt join uniform sets (top, top, bottom). Dress does not.
- `dress-bir-green-yellow-collar` lost its read-only reference copy, because the editable model replaces it. 22 references remain.
- `shirt-mandarin-polkadot` was not used for Mandarin Collar / Long: its collar is a point collar.

**Uniform set 3D:** when both pieces of a set have their own model, the Studio 3D pane offers "This piece / Whole set". "Whole set" renders the two pieces' own GLBs with their own colours (`SetStack` in `DesignStudio3D.jsx`), stacked from their measured bounding boxes. A fused set model is never used for an editable set.

## Medical models generated by the owner (2026-10-10)
The owner generated these in Meshy 6 from the reference photos in the repo root (`lab coat.jpg`, `lab coverall.jpg`, `missing sleeve variants.jpg`) and placed them in `asset-staging/mesh-3d/`. They were copied byte-identical to `/models/vfrb-staged/`.
- **STATIC:** one mesh each, no UVs, materials or textures.
- **RENDER:** checked at 0°, 45°, 90° and 180°, compared with the photos. None has a head, hands, a mannequin or a hanger.

| Catalog | Fit · sleeve | Runtime GLB | Notes |
| --- | --- | --- | --- |
| Lab Coat | unisex · Long | `lab-coat-long.glb` (from `lab-coat.glb`) | Knee-length, notch lapel, chest pocket and 2 lower patch pockets |
| Lab Coverall | unisex · Long | `lab-coverall-garment.glb` (from `lab-coverall.glb`) | One-piece and full-length. Stays out of uniform sets. The legacy `/models/lab-coverall.glb` (hooded figure) is kept and never rendered. |
| Scrub Top | female · 3/4 | `scrub-top-women-three-quarter.glb` (from `missing-sleeve-variants.glb`) | Exact-sleeve. Female and male Short keep their photo-base models. Male 3/4 has no model (2D only). |

- All three are `approximate-3d`, with one body colour plus patterns.
- Lab Coat and Lab Coverall keep their 2D pocket colour, tagged "2D only" (`pocket2D`).
- Both are unisex and serve male, female, unisex and no-fit selections.

## Model routing (one rule)
`scannedEntryFor(garment, sleeve, fit)` in `garmentCapabilities.js` routes every 3D view: the Studio, capability labels, and the Order Wizard and Order Detail previews (`has3DModel`).
- A selection gets 3D only from a model that has that exact sleeve: exact-sleeve photo-base models first, then the family model.
- A model with no sleeve styles (bottoms) accepts any sleeve.
- Otherwise the selection is 2D only. The 3D button is disabled with a reason, and previews say "No 3D model … Showing 2D".
- The renderer draws nothing rather than a generic primitive or a different garment.

This stopped Scrub Top / 3/4, Mandarin Collar / Long and Round Neck / Long from showing a short-sleeve scan or a generic primitive shirt. (Scrub Top / 3/4 female now has its own model, see below.)

Fit rule:
- An exact-sleeve model serves a selection when it has the selected fit, or when it is unisex.
- Exact-fit models are tried first. For example, Button-Down / Long / female still gets the BIR blouse, while male and unisex get the utility shirt.
- A unisex model never unlocks a sleeve it lacks.

## Gallery 3D references (read-only)
22 photos carry `ref3D` (`designGallery.js`), the garment-only model generated from that photo, copied to `/models/reference/<photo id>.glb`. Gallery preview → "View in 3D" or "View the set in 3D" renders it with one neutral colour, orbit only. The caption says it is not editable, and that a fused set's pieces cannot be coloured separately.
- **Sets (11):** bir-blouse-trousers-blue, blazer-double-breasted-gray, blazer-pinstripe-navy, blouse-roundneck-fuchsia, blouse-roundneck-mustard, pantsuit-notch-short-gray, peplum-set-navy, polo-barong-brown, shirt-two-tone-gpc, set-pinstripe-pants and set-pinstripe-skirt (the business-suit-fullset files).
- **Scrub sets (3):** scrub-set-women-vneck, scrub-set-men-vneck and scrub-set-housekeeping. These show the full set; their editable pieces keep their own top models.
- **Solo garments and dresses (8):** blouse-asymmetric-blue, blouse-pleated-bib-white, blouse-scarf-cream, dress-butter-belted, dress-tunic-maternity-navy, jack-shirt-two-tone, polo-red-claremont and shirt-mandarin-polkadot.

Each was matched photo-to-model on front renders, plus 0°/45°/135°/180° close renders for the hanger, mannequin and set cases. None has a head, hands, a mannequin or a hanger fused in.

Not given a reference:
- dress-sheath-denim-blue: its file duplicates blazer-pinstripe-navy.
- blazer-blouse-blue-short: the model is the blouse alone, not the worn set.
- set-vest-blouse: mannequin hips fused in.
- corporate-skirt: the back is modelled as shorts.
- Files over 3.5 MB (budget for read-only previews), which need an optimised copy first: blazer-collarless-tan, blazer-pinstripe-royal, blazer-tweed-herringbone, blazer-white-notch, blazer-open-front-black, blazer-blouse-blue, blouse-mandarin-yellow, blouse-tunic-roundneck-blue, school-skirt.
- dress-shift-geometric: 67.9 MB.

## Catalog garments with no usable 3D source
- **Mandarin Collar / Long, Round Neck / Long, Scrub Top / 3/4 (male):** no matching model.

These stay 2D only, with the 3D button disabled and labelled. Each needs a garment-only model generated from a photo of that exact garment.

## Not promoted (reference-only unless noted)
| Staging file | RENDER verdict | Why not wired |
| --- | --- | --- |
| school-skirt | Clean pleated skirt, garment-only | **Now wired** as the new Pleated Skirt family (never mapped onto the pencil Skirt). |
| polo-red-claremont | Garment-only polo | Polo Shirt already has male and female models. Candidate replacement, not reviewed against the 2D zones. |
| jack-shirt-two-tone | Garment-only short-sleeve shirt with two flap pockets | Button-Down / Short already uses the work-shirt model. Two-tone panels are not separate parts. |
| shirt-mandarin-polkadot | Garment-only long-sleeve mandarin shirt | Mandarin Collar / Long is the BIR band-collar photo base, a different garment. |
| blouse-mandarin-yellow, blouse-asymmetric-blue, blouse-scarf-cream, blouse-pleated-bib-white, blouse-tunic-roundneck-blue, blouse-roundneck-mustard | Garment-only blouses (mustard is a blouse+trousers set) | Each has a different collar (mandarin-V, asymmetric, scarf, pleated bib, round) from the notch-collar Blouse template. The tunic photo opens the T-Shirt vector. Gallery references only. |
| blazer-* (other 6 files), women-pinstripe-vest-blouse | Garment-only jackets and sets | The Blazer family uses tweed (Long) and white-notch (3/4). Collarless, open-front and peplum cuts differ from its notch-lapel template; double-breasted and pinstripe-navy are fused jacket+trouser sets. No vest family. |
| dress-* (other 3), peplum-set-navy | Dresses and a skirt set | The Dress family uses the collared BIR shirt-dress. The belted round-neck and the maternity tunic dress are different cuts. dress-sheath-denim-blue is a mislabelled duplicate of blazer-pinstripe-navy. |
| pantsuit-notch-short-gray, business-suit-fullset-women-pinstripe-pants/-skirt, polo-barong-brown, shirt-two-tone-gpc | Top+bottom sets fused into one mesh | No component split. They would need a spatial cut like the BIR blouse. No family target except Pants, which now has a clean model. |
| dress-shift-geometric | Not rendered (67.9 MB, 2.8 M triangles) | Too heavy for the web, and no dress family. |

`verified-3d` is used for none of these. The labelling contract needs a `verification: { method, date }` record signed off by the owner on a real device. The Pants and Shorts models passed the static check and the RENDER and BROWSER reviews above, so they are the first candidates for that record.
