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

## Catalog garments with no usable 3D source
- **Lab Coat:** no staging file is a lab coat. `blazer-white-notch` is a hip-length fitted blazer, so mapping it would show a different garment.
- **Lab Coverall:** `public/models/lab-coverall.glb` is a fused figure with a hood and mitten hands.
- **Mandarin Collar / Long, Round Neck / Long:** no matching long-sleeve model.

All four stay 2D only, with the 3D button disabled and labelled. Each needs a garment-only model generated from a photo of that exact garment.

## Not promoted (reference-only unless noted)
| Staging file | RENDER verdict | Why not wired |
| --- | --- | --- |
| school-skirt | Clean pleated skirt, garment-only | The Skirt family is a pencil skirt and there is no pleated 2D template. A pleated photo is never mapped onto the pencil Skirt. |
| polo-red-claremont | Garment-only polo | Polo Shirt already has male and female models. Candidate replacement, not reviewed against the 2D zones. |
| jack-shirt-two-tone | Garment-only short-sleeve shirt with two flap pockets | Button-Down / Short already uses the work-shirt model. Two-tone panels are not separate parts. |
| shirt-mandarin-polkadot | Garment-only long-sleeve mandarin shirt | Mandarin Collar / Long is the BIR band-collar photo base, a different garment. |
| blouse-mandarin-yellow, blouse-asymmetric-blue, blouse-scarf-cream, blouse-pleated-bib-white, blouse-tunic-roundneck-blue, blouse-roundneck-mustard | Garment-only blouses (mustard is a blouse+trousers set) | No matching 2D family or photo base (the tunic photo opens the T-Shirt vector). |
| blazer-* (8 files), women-pinstripe-vest-blouse | Garment-only jackets and sets | No blazer or vest family in the catalog. |
| dress-* (4 rendered), peplum-set-navy | Dresses and a skirt set | No dress family. dress-sheath-denim-blue is a mislabelled duplicate of blazer-pinstripe-navy. |
| pantsuit-notch-short-gray, business-suit-fullset-women-pinstripe-pants/-skirt, polo-barong-brown, shirt-two-tone-gpc | Top+bottom sets fused into one mesh | No component split. They would need a spatial cut like the BIR blouse. No family target except Pants, which now has a clean model. |
| dress-shift-geometric | Not rendered (67.9 MB, 2.8 M triangles) | Too heavy for the web, and no dress family. |

`verified-3d` is used for none of these. The labelling contract needs a `verification: { method, date }` record signed off by the owner on a real device. The Pants and Shorts models passed the static check and the RENDER and BROWSER reviews above, so they are the first candidates for that record.
