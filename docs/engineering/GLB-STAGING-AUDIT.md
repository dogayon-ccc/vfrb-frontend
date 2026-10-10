# Meshy GLB staging audit (2026-10-10)

Scope: the 39 Meshy GLBs in `asset-staging/mesh-3d/` (git-ignored, originals untouched), compared with `public/garments2d/source/*.png` and `public/gallery/*.webp`.

Evidence:
- **STATIC**: `python tools/glb-intake/inspect_glb.py`, which reads the node, mesh, material, UV and texture counts, plus the bounds and SHA-1.
- **RENDER**: `tools/glb-harness/raw.html` in headless Chrome (SwiftShader WebGL). It renders each file at 0°, 45°, 90° and 180°, and the Pants, Shorts and Skirt candidates also at 30° and 270°, with one flat tint.
- **BROWSER**: the live Design Studio, with the network stubbed so no orders are written. It covers 3D, colour and pattern, Save and Reload, and the 3D previews in the Order Wizard and Order Detail.

Live per-garment status is generated in `ASSET-REGISTRY.md`; this file records the audit and the choices.

## Exhaustive staging inventory (2026-10-10): 42 of 42 files

Every `.glb` under `asset-staging/mesh-3d/` (recursive) was enumerated and recorded with its size, SHA-256 and GLTF structure (`inventory.py`). Each file was rendered at 0°, 45°, 90° and 180° in the GLB harness and compared with its gallery or reference photo.
- All files are a single node and mesh with no UVs and no textures; only `dress-shift-geometric` has one material.
- In the **Runtime copy** column, `+` means the copy is byte-identical. "Derived" means the runtime garment is a cut or component of the source, made by the `tools/glb-extract` or `tools/glb-intake` scripts.

| # | Source GLB | MB | Triangles | SHA-256 (12) | Runtime copy | Contents (render-checked) | Disposition | Catalog mapping / use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `bir-blouse-trousers-blue.glb` | 2.00 | 111,084 | `2ab9177878e1` | `/models/reference/bir-blouse-trousers-blue.glb` | Blouse + trousers fused (worn photo); blouse cut above y 0.134 | 1 Integrate (derived garment cut) + 2 set preview | Button-Down / Long / female via `/models/garments/button-down-bir-long.glb` (derived cut); full set as gallery reference |
| 2 | `blazer-blouse-blue.glb` | 5.53 | 307,068 | `ac6567024b2f` | `/models/vfrb-staged/blazer-blouse-blue.glb` | Notch-collar button-front short-sleeve blouse, garment-only | 1 Integrate (garment model) | Blouse / Short / female |
| 3 | `blazer-collarless-tan.glb` | 5.88 | 326,558 | `3a611e646e2b` | `/models/vfrb-staged/collarless-blazer-long.glb` | Collarless one-button long-sleeve blazer; photo inner top and skirt waistband fused under the hem | 1 Integrate (garment model) | Collarless Blazer / Long / female |
| 4 | `blazer-double-breasted-gray.glb` | 1.95 | 108,226 | `2f89a3ffe095` | `/models/reference/blazer-double-breasted-gray.glb` | Double-breasted jacket + trousers fused | 2 Reference / set preview | Gallery set preview only |
| 5 | `blazer-open-front-black.glb` | 7.15 | 397,564 | `de480834e209` | `/models/reference/blazer-open-front-black.glb` | Notch-lapel open-front long-sleeve blazer, garment-only, no closure | 2 Reference / set preview | Gallery reference (no catalog slot: differs from the 3-button Blazer / Long it would replace) |
| 6 | `blazer-pinstripe-navy.glb` | 1.60 | 88,922 | `8f29996f6739` | `/models/reference/blazer-pinstripe-navy.glb` | Pinstripe 3/4-sleeve jacket + trousers fused | 2 Reference / set preview | Gallery set preview only |
| 7 | `blazer-pinstripe-royal.glb` | 5.19 | 288,260 | `ff557ee893ab` | `/models/vfrb-staged/collarless-blazer-short.glb` | Collarless one-button short-sleeve blazer, garment-only | 1 Integrate (garment model) | Collarless Blazer / Short / female |
| 8 | `blazer-tweed-herringbone.glb` | 6.67 | 370,384 | `2c89d52839a3` | `/models/vfrb-staged/blazer-tweed-herringbone.glb` | Notch-lapel 3-button long-sleeve blazer with flap pockets | 1 Integrate (garment model) | Blazer / Long / female |
| 9 | `blazer-white-notch.glb` | 6.15 | 341,726 | `347b82ded617` | `/models/vfrb-staged/blazer-white-notch.glb` | Notch-lapel 2-button 3/4-sleeve blazer | 1 Integrate (garment model) | Blazer / 3/4 / female |
| 10 | `blouse-asymmetric-blue.glb` | 1.49 | 82,946 | `0dd4114afb37` | `/models/reference/blouse-asymmetric-blue.glb` | Asymmetric-collar short-sleeve blouse, garment-only | 2 Reference / set preview | Gallery reference (no asymmetric-collar family) |
| 11 | `blouse-mandarin-yellow.glb` | 4.20 | 233,300 | `a8bb6ac1ea86` | `/models/reference/blouse-mandarin-yellow.glb` | Mandarin-V collar short-sleeve blouse, garment-only | 2 Reference / set preview | Gallery reference (Mandarin / Short / female is the housekeeping tunic photo base) |
| 12 | `blouse-pleated-bib-white.glb` | 2.88 | 160,216 | `bb8ebc6bd7cd` | `/models/reference/blouse-pleated-bib-white.glb` | Pleated-bib round-collar school blouse from a hanger photo; paper-thin from the side | 2 Reference / set preview | Gallery reference only (flattened: not usable as an editable 3D garment) |
| 13 | `blouse-roundneck-fuchsia.glb` | 1.26 | 69,904 | `565a50991a1a` | `/models/reference/blouse-roundneck-fuchsia.glb` | Round-neck short-sleeve blouse + trousers fused; blouse cut above y 0.17 | 1 Integrate (derived garment cut) + 2 set preview | Round Neck / Short / female via `/models/garments/round-neck-fuchsia-short.glb` (derived cut); full set as gallery reference |
| 14 | `blouse-roundneck-mustard.glb` | 1.51 | 84,054 | `9055e7317e39` | `/models/reference/blouse-roundneck-mustard.glb` | Round-neck blouse + trousers fused | 2 Reference / set preview | Gallery set preview (Round Neck / Short already has its model) |
| 15 | `blouse-scarf-cream.glb` | 2.61 | 144,812 | `c28ea5c1c6fb` | `/models/reference/blouse-scarf-cream.glb` | Short-sleeve blouse with neck scarf, garment-only | 2 Reference / set preview | Gallery reference (no scarf-blouse family) |
| 16 | `blouse-tunic-roundneck-blue.glb` | 4.33 | 240,458 | `574010e5396c` | `/models/reference/blouse-tunic-roundneck-blue.glb` | Collarless round-neck belted short-sleeve tunic, garment-only | 2 Reference / set preview | Gallery reference (different cut from the Round Neck / Short photo base; the photo opens the T-Shirt template in 2D) |
| 17 | `business-suit-fullset-women-pinstripe-pants.glb` | 1.07 | 59,574 | `12346f654b73` | `/models/reference/set-pinstripe-pants.glb` | Pinstripe jacket + trousers fused | 2 Reference / set preview | Gallery set preview (set-pinstripe-pants) |
| 18 | `business-suit-fullset-women-pinstripe-skirt.glb` | 2.51 | 139,620 | `366db1774b72` | `/models/reference/set-pinstripe-skirt.glb` | Pinstripe jacket + skirt fused | 2 Reference / set preview | Gallery set preview (set-pinstripe-skirt) |
| 19 | `corporate-skirt.glb` | 3.29 | 182,558 | `09f723e47fb8` | — | Front is a pencil skirt, back and sides are modelled as two legs (shorts) | 4 Reject | None: a skirt that turns into shorts when rotated would mislead |
| 20 | `dress-bir-green-yellow-collar.glb` | 1.52 | 84,634 | `984fb1623e6b` | `/models/vfrb-staged/dress-bir-green-yellow-collar.glb` | Collared button-front short-sleeve shirt-dress | 1 Integrate (garment model) | Dress / Short / female |
| 21 | `dress-butter-belted.glb` | 1.48 | 82,220 | `80093c84b08b` | `/models/reference/dress-butter-belted.glb` | Round-neck belted short-sleeve sheath dress | 2 Reference / set preview | Gallery reference (Dress family is the collared shirt-dress) |
| 22 | `dress-sheath-denim-blue.glb` | 1.60 | 88,922 | `8f29996f6739` | `/models/reference/blazer-pinstripe-navy.glb` | Byte-identical to blazer-pinstripe-navy.glb (a jacket + trousers set, not a dress) | 3 Duplicate | None: mislabelled copy; the denim sheath dress model does not exist |
| 23 | `dress-shift-geometric.glb` | 67.87 | 2,827,846 | `55c85b4afee8` | — | Short-sleeve shift dress; the geometric print is embossed into the surface; 67.9 MB, 2.8 M triangles | 4 Reject | None: too heavy for the web and the print relief shows under any colour |
| 24 | `dress-tunic-maternity-navy.glb` | 1.69 | 93,830 | `8c00caf3202b` | `/models/reference/dress-tunic-maternity-navy.glb` | Collared short-sleeve tunic dress | 2 Reference / set preview | Gallery reference (Dress / Short already uses the BIR shirt-dress) |
| 25 | `jack-shirt-two-tone.glb` | 3.32 | 184,492 | `5e6a73d3f14d` | `/models/reference/jack-shirt-two-tone.glb` | Short-sleeve shirt with two flap chest pockets, garment-only | 2 Reference / set preview | Gallery reference (Button-Down / Short already uses the work shirt; two-tone panels are not parts) |
| 26 | `lab-coat.glb` | 2.34 | 130,064 | `1302aee479dc` | `/models/vfrb-staged/lab-coat-long.glb` | Knee-length notch-lapel lab coat, chest and two lower patch pockets | 1 Integrate (garment model) | Lab Coat / Long / unisex |
| 27 | `lab-coverall.glb` | 2.17 | 120,688 | `941b057b45cc` | `/models/vfrb-staged/lab-coverall-garment.glb` | One-piece full-length coverall, point collar, flap chest pockets | 1 Integrate (garment model) | Lab Coverall / Long / unisex |
| 28 | `missing-sleeve-variants.glb` | 3.57 | 198,170 | `3853e81852e8` | `/models/vfrb-staged/scrub-top-women-three-quarter.glb` | V-neck scrub top, chest pocket, ribbed 3/4 cuffs | 1 Integrate (garment model) | Scrub Top / 3/4 / female |
| 29 | `pants.glb` | 2.01 | 111,900 | `1afc9042e5e1` | `/models/vfrb-staged/pants.glb` | Straight-leg trousers with waistband, loops, fly and pockets | 1 Integrate (garment model) | Pants |
| 30 | `pantsuit-notch-short-gray.glb` | 1.59 | 88,438 | `d78eb6b457c8` | `/models/reference/pantsuit-notch-short-gray.glb` | Short-sleeve notch jacket + trousers fused | 2 Reference / set preview | Gallery set preview only |
| 31 | `peplum-set-navy.glb` | 1.20 | 66,798 | `d168196d3ed2` | `/models/reference/peplum-set-navy.glb` | Peplum top + pencil skirt fused | 2 Reference / set preview | Gallery set preview only |
| 32 | `polo-barong-brown.glb` | 1.94 | 107,952 | `59d47f0b4814` | `/models/reference/polo-barong-brown.glb` | Polo-barong top + slacks fused | 2 Reference / set preview | Gallery set preview only (no barong family) |
| 33 | `polo-red-claremont.glb` | 3.32 | 184,582 | `4a5eeff3fa65` | `/models/vfrb-staged/polo-shirt-unisex-short.glb` | Straight-cut short-sleeve polo, two-button placket | 1 Integrate (garment model) | Polo Shirt / Short / unisex |
| 34 | `school-skirt.glb` | 5.56 | 308,976 | `10dc77994eaf` | `/models/vfrb-staged/school-skirt.glb` | Knife-pleated mini skirt with waistband | 1 Integrate (garment model) | Pleated Skirt |
| 35 | `scrub-set-housekeeping.glb` | 2.46 | 136,800 | `47c66592035c` | `/models/reference/scrub-set-housekeeping.glb` | Mandarin-band tunic + trousers (separate components) | 1 Integrate (derived garment cut) + 2 set preview | Mandarin Collar / Short / female via `/models/garments/mandarin-tunic-housekeeping.glb` (component 0); full set as gallery reference |
| 36 | `scrub-set-men-vneck.glb` | 2.93 | 162,790 | `4508835d36b4` | `/models/reference/scrub-set-men-vneck.glb` | Men's V-neck scrub top + trousers (separate components) | 1 Integrate (derived garment cut) + 2 set preview | Scrub Top / Short / male via `/models/garments/scrub-top-men-short.glb` (top component); full set as gallery reference |
| 37 | `scrub-set-women-vneck.glb` | 3.03 | 168,192 | `35acbb5ab9a8` | `/models/reference/scrub-set-women-vneck.glb` | Women's V-neck scrub top + trousers (separate components) | 1 Integrate (derived garment cut) + 2 set preview | Scrub Top / Short / female via `/models/garments/scrub-top-women-short.glb` (top component); full set as gallery reference |
| 38 | `shirt-mandarin-polkadot.glb` | 1.99 | 110,354 | `a59248f850fa` | `/models/vfrb-staged/shirt-mandarin-long-male.glb` | Men's band-collar long-sleeve shirt with chest pocket | 1 Integrate (garment model) | Mandarin Collar / Long / male |
| 39 | `shirt-two-tone-gpc.glb` | 1.46 | 81,262 | `d9ef796d8e75` | `/models/reference/shirt-two-tone-gpc.glb` | Two-tone short-sleeve shirt + trousers fused | 2 Reference / set preview | Gallery set preview (Button-Down / Short already has the work shirt) |
| 40 | `shirt-utility-beige-long.glb` | 1.80 | 100,064 | `02db777998f6` | `/models/vfrb-staged/shirt-utility-beige-long.glb` | Long-sleeve utility work shirt, two flap pockets, banded hem | 1 Integrate (garment model) | Button-Down / Long / unisex |
| 41 | `shorts.glb` | 2.52 | 139,998 | `aaf7b63afcf0` | `/models/vfrb-staged/shorts.glb` | Pleated school shorts with button waistband | 1 Integrate (garment model) | Shorts |
| 42 | `women-pinstripe-vest-blouse.glb` | 1.52 | 84,600 | `f07a0d75fb95` | — | Vest over short-sleeve blouse with the mannequin torso and hips fused in | 4 Reject | None: mannequin geometry cannot be presented as a garment, editable or reference |

Totals: 1 Integrate (derived garment cut) + 2 set preview: 5 · 1 Integrate (garment model): 15 · 2 Reference / set preview: 18 · 4 Reject: 3 · 3 Duplicate: 1 · total 42


### Viewer connection status (browser-verified 2026-10-10)
Each of the 23 gallery photos with a 3D reference was opened in the real Studio gallery (local, headless Chrome) and checked the same way:
1. Its "View in 3D" or "View the set in 3D" action was pressed.
2. Exactly one GLB request was made, for its own `/models/reference/<photo id>.glb`.
3. A WebGL canvas rendered, and the recognisable outfit matched the photo (screenshots reviewed).
4. The caption read "not editable", plus "one fused model" for sets.

**Results:**
- 23 of 23 pass. Every file in `/models/reference/` is connected (no orphans), and no gallery item loads another photo's model.
- `logic-checks` pins the exact map.

**Status by kind:**
- **Editable single-garment models** (Studio and orders): see `ASSET-REGISTRY.md` → 3D garments.
- **Working read-only full-set previews (14):**
  - scrub-set-women-vneck, scrub-set-men-vneck, scrub-set-housekeeping
  - set-pinstripe-pants, set-pinstripe-skirt (the business-suit files)
  - bir-blouse-trousers-blue, pantsuit-notch-short-gray, polo-barong-brown, blazer-double-breasted-gray, blazer-pinstripe-navy
  - blouse-roundneck-fuchsia, blouse-roundneck-mustard, shirt-two-tone-gpc, peplum-set-navy

  Five of them also open an editable garment that was cut from the same source: the three scrub sets, BIR and fuchsia. That editable model is the cut in `/models/garments/`, never the fused file.
- **Working read-only single-garment references (9):** blouse-mandarin-yellow, blouse-pleated-bib-white, blouse-scarf-cream, blouse-asymmetric-blue, blouse-tunic-roundneck-blue, blazer-open-front-black, dress-tunic-maternity-navy, jack-shirt-two-tone, dress-butter-belted.
- **Reference files with no viewer connection:** none.
- **Full-set sources with no viewer, on purpose:**
  - `women-pinstripe-vest-blouse` (gallery `set-vest-blouse`): the mannequin torso and hips are fused in.
  - `blazer-blouse-blue-short` (worn photo): its model is the blouse alone, so it would not be the photographed set.
- **Genuine duplicate:** `dress-sheath-denim-blue` = `blazer-pinstripe-navy`.
- **Rejected:** `corporate-skirt` (shorts at the back), `dress-shift-geometric` (67.9 MB, embossed print), `women-pinstripe-vest-blouse` (mannequin).

### Keep-or-delete evidence (after this audit)
`asset-staging/mesh-3d/` is git-ignored, so it lives only on the owner's machine. `public/models/**` is tracked: 50 runtime GLBs are committed, and the 3 references added by this audit are new files waiting for the commit.

Re-enumerating after integration found 42 staged files.
- **36 already had a byte-identical copy tracked in git** in `public/models/` (`vfrb-staged/` or `reference/`), checked by SHA-256 against `git ls-files`. This includes the five sources of the derived cuts in `public/models/reference/`.
- **3 got a new byte-identical copy in this audit** (`blazer-open-front-black`, `blouse-mandarin-yellow`, `blouse-tunic-roundneck-blue` → `public/models/reference/`). These copies are added by the commit that adds this note.
- After that commit, 39 of the 42 are tracked.
- **`dress-sheath-denim-blue.glb`** duplicates `blazer-pinstripe-navy.glb`.
- **Exist only in staging:** `corporate-skirt.glb`, `dress-shift-geometric.glb` and `women-pinstripe-vest-blouse.glb`. All three are rejected for the renderer, but they are original generations that cannot be recreated without spending Meshy credits.

**Recommendation:** archive those three files outside the repo (for example to cloud storage) before deleting the folder. After that, the folder holds nothing that is not already tracked byte-identically in `public/models/`.

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

## Mandarin Collar / Long / male (2026-10-10)
`shirt-mandarin-polkadot.glb` is a men's long-sleeve shirt with a stand-up band (mandarin) collar, button front and chest pocket. This corrects an earlier note that it had a point collar; close renders show the band collar.
- **Runtime:** copied byte-identical to `/models/vfrb-staged/shirt-mandarin-long-male.glb`.
- **Wiring:** Mandarin Collar / Long / **male**, on the vector Mandarin template (`mandarin-shirt-long-male`). The gallery photo `shirt-mandarin-polkadot` now opens it, and its read-only reference copy was removed.
- **Fits:** Mandarin Collar now offers female and male.
- **Female Long:** still the BIR blouse photo base with no model, because the BIR blouse has gathered shoulders and no pocket.
- **Short male:** vector template, 2D only.

**Round Neck / Long:** none of the 39 staging files, nor any runtime model, is a long-sleeve round-neck top. The round-neck models (fuchsia, mustard, tunic blue) are all short-sleeve. Round Neck / Long stays 2D only until a garment-only model is generated from a photo of that garment.

## Batch of remaining suitable models (2026-10-10)
Each model was rendered at 0°, 45°, 90° and 180° next to its gallery photo, then copied byte-identical to `/models/vfrb-staged/`.

| Catalog | Fit · sleeve | Runtime GLB (staging source) | Notes |
| --- | --- | --- | --- |
| Polo Shirt | unisex · Short | `polo-shirt-unisex-short.glb` (`polo-red-claremont`) | Male and female keep their own scans; the gallery red polo opens Polo / unisex. The logo is not modelled. |
| Collarless Blazer (new family, Corporate) | female · Long | `collarless-blazer-long.glb` (`blazer-collarless-tan`) | The photo's inner top and skirt waistband are fused under the hem. |
| Collarless Blazer | female · Short | `collarless-blazer-short.glb` (`blazer-pinstripe-royal`) | The pinstripe is not modelled. |

- **Gallery sleeves corrected from the photos:** tan blazer Long (was 3/4), royal blazer Short (was 3/4).
- **Read-only reference copies removed:** `polo-red-claremont`, because it now has an editable model.
- **Resolver precedence fixed:**
  1. Exact-sleeve model with the exact fit.
  2. Family model with that fit.
  3. Unisex exact-sleeve model.
  4. Any exact-sleeve model (no fit asked).
  5. Any family model.

  Without step 2, the unisex polo would have replaced the male scan. Every earlier routing case resolves exactly as before.

**Checked and excluded in this batch:**
- `blouse-pleated-bib-white`: generated from a hanger photo; paper-thin from the side (flattened).
- `jack-shirt-two-tone`: Button-Down / Short already has the work shirt (same cut family; two-tone panels are not parts).
- `blouse-mandarin-yellow`: Mandarin / Short female is the tunic photo base.
- `blouse-asymmetric-blue`, `blouse-scarf-cream`: no matching family (asymmetric / scarf collars).
- `blouse-tunic-roundneck-blue`, `blouse-roundneck-mustard`: short-sleeve round-neck; Round Neck / Short already has its model; mustard is a fused set.
- `blazer-open-front-black`: open-front, no closure; differs from both blazer families.
- `dress-butter-belted`, `dress-tunic-maternity-navy`: different cuts from the Dress family.
- Fused sets (`polo-barong-brown`, `shirt-two-tone-gpc`, `pantsuit-notch-short-gray`, the `business-suit-*` files, `peplum-set-navy`, `bir-blouse-trousers-blue`, `blazer-double-breasted-gray`, `blazer-pinstripe-navy`): gallery set-level previews only.

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
23 photos carry `ref3D` (`designGallery.js`), the garment-only model generated from that photo, copied to `/models/reference/<photo id>.glb`. Gallery preview → "View in 3D" or "View the set in 3D" renders it with one neutral colour, orbit only. The caption says it is not editable, and that a fused set's pieces cannot be coloured separately.
- **Sets (11):** bir-blouse-trousers-blue, blazer-double-breasted-gray, blazer-pinstripe-navy, blouse-roundneck-fuchsia, blouse-roundneck-mustard, pantsuit-notch-short-gray, peplum-set-navy, polo-barong-brown, shirt-two-tone-gpc, set-pinstripe-pants and set-pinstripe-skirt (the business-suit-fullset files).
- **Scrub sets (3):** scrub-set-women-vneck, scrub-set-men-vneck and scrub-set-housekeeping. These show the full set; their editable pieces keep their own top models.
- **Solo garments and dresses (9):** blouse-asymmetric-blue, blouse-pleated-bib-white, blouse-scarf-cream, dress-butter-belted, dress-tunic-maternity-navy, jack-shirt-two-tone, blazer-open-front-black, blouse-mandarin-yellow and blouse-tunic-roundneck-blue (the last three added 2026-10-10; the old 3.5 MB preview budget was lifted for them).

Each was matched photo-to-model on front renders, plus 0°/45°/135°/180° close renders for the hanger, mannequin and set cases. None has a head, hands, a mannequin or a hanger fused in.

Not given a reference:
- dress-sheath-denim-blue: its file duplicates blazer-pinstripe-navy.
- blazer-blouse-blue-short: the model is the blouse alone, not the worn set.
- set-vest-blouse: mannequin hips fused in.
- corporate-skirt: the back is modelled as shorts.
- Files over 3.5 MB (budget for read-only previews), which need an optimised copy first: blazer-collarless-tan, blazer-pinstripe-royal, blazer-tweed-herringbone, blazer-white-notch, blazer-open-front-black, blazer-blouse-blue, blouse-mandarin-yellow, blouse-tunic-roundneck-blue, school-skirt.
- dress-shift-geometric: 67.9 MB.

## Catalog garments with no usable 3D source
- **Round Neck / Long, Mandarin Collar / Long (female, BIR blouse), Mandarin Collar / Short (male), Scrub Top / 3/4 (male):** no matching model.

These stay 2D only, with the 3D button disabled and labelled. Each needs a garment-only model generated from a photo of that exact garment.

## Not promoted (reference-only unless noted)
| Staging file | RENDER verdict | Why not wired |
| --- | --- | --- |
| school-skirt | Clean pleated skirt, garment-only | **Now wired** as the new Pleated Skirt family (never mapped onto the pencil Skirt). |
| polo-red-claremont | Garment-only polo | **Now wired** as Polo Shirt / Short / unisex. |
| jack-shirt-two-tone | Garment-only short-sleeve shirt with two flap pockets | Button-Down / Short already uses the work-shirt model. Two-tone panels are not separate parts. |
| shirt-mandarin-polkadot | Garment-only long-sleeve band-collar shirt | **Now wired** as Mandarin Collar / Long / male (see above). |
| blouse-mandarin-yellow, blouse-asymmetric-blue, blouse-scarf-cream, blouse-pleated-bib-white, blouse-tunic-roundneck-blue, blouse-roundneck-mustard | Garment-only blouses (mustard is a blouse+trousers set) | Each has a different collar (mandarin-V, asymmetric, scarf, pleated bib, round) from the notch-collar Blouse template. The tunic photo opens the T-Shirt vector. Gallery references only. |
| blazer-* (other 6 files), women-pinstripe-vest-blouse | Garment-only jackets and sets | The Blazer family uses tweed (Long) and white-notch (3/4). Collarless, open-front and peplum cuts differ from its notch-lapel template; double-breasted and pinstripe-navy are fused jacket+trouser sets. No vest family. |
| dress-* (other 3), peplum-set-navy | Dresses and a skirt set | The Dress family uses the collared BIR shirt-dress. The belted round-neck and the maternity tunic dress are different cuts. dress-sheath-denim-blue is a mislabelled duplicate of blazer-pinstripe-navy. |
| pantsuit-notch-short-gray, business-suit-fullset-women-pinstripe-pants/-skirt, polo-barong-brown, shirt-two-tone-gpc | Top+bottom sets fused into one mesh | No component split. They would need a spatial cut like the BIR blouse. No family target except Pants, which now has a clean model. |
| dress-shift-geometric | Not rendered (67.9 MB, 2.8 M triangles) | Too heavy for the web, and no dress family. |

`verified-3d` is used for none of these. The labelling contract needs a `verification: { method, date }` record signed off by the owner on a real device. The Pants and Shorts models passed the static check and the RENDER and BROWSER reviews above, so they are the first candidates for that record.
