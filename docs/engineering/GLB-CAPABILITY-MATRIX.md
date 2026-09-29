# GLB Capability Matrix

Account 3 (3D / GLB). Inventory of `public/models/` on `main` @ `107e7a1`. Regenerate the structural rows with `python3 tools/inspect_glb_capabilities.py` (needs numpy + Pillow).

Evidence labels: **STATIC** = parsed from the GLB file or rendered raw with no app code (`tools/glb-harness/raw.html`). **CODE** = read in the repository source. **BROWSER (harness)** = headless Chromium + SwiftShader WebGL2 rendering the repo's own `DesignStudio3D` through `tools/glb-harness` (NOT the production Studio page). **UNTESTED** = not run. Gender/fit claims below are filename plus visual impression only; nothing in the files proves gender.

## 1. Structure (STATIC)

| Model | Bytes | Size x/y/z (model units) | Generator | Meshes (node -> mesh) | Verts | Indexed | Materials | Textures | UV | UV islands (cut panels) |
|---|---|---|---|---|---|---|---|---|---|---|
| `t-shirt-male.glb` | 982,496 | 0.55 x 0.61 x 0.27 | trimesh | 1: `body` -> `body` | 25,812 | yes | 1 (unnamed) | 2x2 png | yes | 5 |
| `t-shirt-female.glb` | 265,420 | 0.44 x 0.53 x 0.25 | trimesh | 1: `body` -> `body` | 5,107 | yes | 1 (unnamed) | 2x2 png | yes | 43 |
| `Polo Shirt male.glb` | 1,808,224 | 1.49 x 1.90 x 0.81 | meshy-scene | 1: `mesh_node` -> `mesh` | 50,208 | yes | 0 | none | NO | n/a |
| `female polo shirt.glb` | 2,469,336 | 1.53 x 1.89 x 0.77 | meshy-scene | 1: `mesh_node` -> `mesh` | 68,567 | yes | 0 | none | NO | n/a |
| `lab-coverall.glb` | 2,251,936 | 0.77 x 1.90 x 0.51 | meshy-scene | 1: `mesh_node` -> `mesh` | 62,516 | yes | 0 | none | NO | n/a |
| `Blue_Blouse_and_Gray Pants.glb` | 1,533,640 | 0.55 x 1.90 x 0.36 | meshy-scene | 1: `mesh_node` -> `mesh` | 42,574 | yes | 0 | none | NO | n/a |
| `Blue_Linen_Shift_Dress.glb` | 989,680 | 0.60 x 1.90 x 0.36 | meshy-scene | 1: `mesh_node` -> `mesh` | 27,468 | yes | 0 | none | NO | n/a |
| `Blue_Service_Uniform.glb` | 1,297,828 | 0.68 x 1.90 x 0.37 | meshy-scene | 1: `mesh_node` -> `mesh` | 36,025 | yes | 0 | none | NO | n/a |
| `Navy_Blue_Peplum_Dress.glb` | 996,624 | 0.55 x 1.89 x 0.36 | meshy-scene | 1: `mesh_node` -> `mesh` | 27,653 | yes | 0 | none | NO | n/a |
| `Navy_Textured_Short.glb` | 1,451,920 | 0.74 x 1.90 x 0.45 | meshy-scene | 1: `mesh_node` -> `mesh` | 40,304 | yes | 0 | none | NO | n/a |
| `Pink_Professional_Uni.glb` | 1,311,684 | 0.57 x 1.90 x 0.35 | meshy-scene | 1: `mesh_node` -> `mesh` | 36,410 | yes | 0 | none | NO | n/a |

All files: 1 scene, no skins, no animations, no extensions. Meshy exports (`meshy-scene`) carry `POSITION` only: no normals, UVs, colours or materials (normals must be computed at load). The t-shirt files (trimesh) carry `POSITION`, `NORMAL`, `TEXCOORD_0`, one unnamed material (base colour 0.4 grey) and a 2x2 placeholder texture.

## 2. What each model is, and how it is wired

| Model | Garment type (STATIC, visual) | Fit / gender evidence | Current 2D definition (CODE) | Current 3D manifest (CODE) | Separate garment regions in the file |
|---|---|---|---|---|---|
| `t-shirt-male.glb` | T-shirt, crew neck (garment only) | filename "male" + boxy crew neck (visual) | `T-Shirt` (fit toggle) | `t-shirt` entry, `models.male` | Yes, as UV islands inside one mesh: front, back, 2 sleeves, neck rib (5 islands). Not separate meshes or materials. |
| `t-shirt-female.glb` | T-shirt, V-neck, fitted (garment only) | filename "female" + fitted V-neck shape (visual) | `T-Shirt` (fit toggle exists: FIT_GARMENTS) | `t-shirt` entry, `models.female` | Yes, as UV islands inside one mesh: front, back, sleeves + sleeve hems, neck rib, hems (43 islands). |
| `Polo Shirt male.glb` | Polo shirt (garment only: collar, placket, short sleeves) | filename "male"; no other evidence | `Polo Shirt`, `School Polo` | `polo-shirt` entry, `models.male` | No. One fused mesh, no panels. Sleeves/collar are only recognisable from geometry. |
| `female polo shirt.glb` | Polo shirt (garment only) | filename "female"; visually slightly more fitted (weak evidence) | `Polo Shirt`, `School Polo` | `polo-shirt` entry, `models.female` | No. Same as the male polo. |
| `lab-coverall.glb` | Hooded coverall on a full human figure (face, hand visible) | none (single figure) | `Lab Coverall` exists | NO entry (the old entry was removed: its nodes no longer exist in this file) | No. Garment and human body are fused in one mesh. |
| `Blue_Blouse_and_Gray Pants.glb` | Blouse + pants on a full human figure | filename only; figure looks female (visual, not proven) | none | Blue Blouse and Gray Pants (no 2D garment) | No. Garment, skin, hair and shoes are fused in one mesh. |
| `Blue_Linen_Shift_Dress.glb` | Shift dress on a full human figure | filename only; figure looks female (visual) | none (no dress in the 14 2D garments) | not wired | No. Garment, skin, hair and shoes are fused in one mesh. |
| `Blue_Service_Uniform.glb` | Short-sleeve shirt + trousers on a full human figure | filename only; figure looks male (visual) | none | not wired | No. Garment, skin, hair and shoes are fused in one mesh. |
| `Navy_Blue_Peplum_Dress.glb` | Peplum top + skirt on a full human figure | filename only; figure looks female (visual) | none | not wired | No. Garment, skin, hair and shoes are fused in one mesh. |
| `Navy_Textured_Short.glb` | Short-sleeve shirt + shorts on a full human figure | filename only ("Short" is ambiguous: sleeve or shorts); figure looks male (visual) | partial: `Shorts` / short-sleeve tops exist, but the model is a full outfit on a person | not wired | No. Garment, skin, hair and shoes are fused in one mesh. |
| `Pink_Professional_Uni.glb` | Blouse + trousers on a full human figure | filename only; figure looks female (visual) | none | not wired | No. Garment, skin, hair and shoes are fused in one mesh. |

## 3. Real 3D support (what the model structure AND the current renderer actually do)

A UI control existing is not evidence. `Y` = works on this model. `Y~` = works but approximate. `N` = UNSUPPORTED BY CURRENT ASSET (or not wired). Level in brackets.

| Feature | t-shirt male / female | polo male / female | lab-coverall and the 6 human-figure Meshy files |
|---|---|---|---|
| Solid whole-garment colour | Y [BROWSER harness] | Y [BROWSER harness] | N: colouring the mesh would colour the human (skin, hair, shoes). Not wired. |
| BODY colour (region) | Y exact, UV island [BROWSER harness] | Y~ geometry threshold [BROWSER harness] | N |
| SLEEVE colour | Y exact (islands |x|>=0.13, y>0.05) [BROWSER harness] | Y~ (|x|>0.46 and y>0.05) [BROWSER harness] | N |
| COLLAR colour | Y exact (neck-rib islands) [BROWSER harness]. Studio UI still hides the T-Shirt collar swatch (`zonesFor`). | Y~ (y>0.78) [BROWSER harness] | N |
| POCKET colour | N: the tee GLBs have no pocket panel | N: the polo GLBs have no pocket geometry identified | N |
| TIPPING colour | N: no tipping geometry in any wired file; 2D tipping is a stroke, not mapped | N | N |
| PATTERNS (hstripes, vstripes, diagonal, checker, polka) | Y, painted per UV island, region-clipped [BROWSER harness: hstripes/vstripes]. `geometric` is drawn too [UNTESTED] | Y~, object-space shader projected along Z (sides stretch for checker/polka/vstripes), region-clipped [BROWSER harness: all five]. `geometric` has no shader tile and paints solid | N |
| TEXT (decal) | Y [CODE: same Decal path]. [UNTESTED on tees in this session] | Y [BROWSER harness] | N (not wired) |
| Shapes (decal) | Y [CODE] | Y [BROWSER harness] | N |
| LOGO (image decal) | Y [CODE]. [UNTESTED] | Y [CODE]. [UNTESTED] | N |
| FRONT / BACK | 3D shows both sides: overlays `front` and `back` are both projected, from the +z and -z rays [CODE]. Not tied to the 2D face toggle. [UNTESTED in browser] | Same [CODE]. [UNTESTED in browser] | N |
| MALE / FEMALE fit | Y: `models.male` / `models.female`; Studio has a Fit toggle for `T-Shirt` only | Model files exist for both, but `FIT_GARMENTS = ['T-Shirt']` so the Studio never sets `cfg.fit` for polos and always gets the male model unless a saved `cfg.fit` says otherwise (Account 1 dependency) | N |

## 4. Status per model

| Model | Status | Blocker / dependency |
|---|---|---|
| `t-shirt-male.glb` | SUPPORTED (exact regions via UV islands) | none for 3D. Pocket/tipping not in the asset. |
| `t-shirt-female.glb` | SUPPORTED (exact regions via UV islands) | same |
| `Polo Shirt male.glb` | SUPPORTED, APPROXIMATE regions (geometry thresholds; no panels in the file) | Region seams are straight approximations. Exact seams need a panel-split or material-split re-export. Studio must expose a fit toggle for polos. |
| `female polo shirt.glb` | SUPPORTED, APPROXIMATE regions | same; thresholds measured on both files but the female shirt was only checked visually |
| `lab-coverall.glb` | UNSUPPORTED BY CURRENT ASSET (regression fixed: the manifest no longer points at nodes that do not exist; 3D shows the generic primitive fallback) | Needs a garment-only export with separate regions. The previous garment-only file is in git history (`git show f181b4e:public/models/lab-coverall.glb`); not restored here. |
| `Blue_Blouse_and_Gray Pants.glb` | UNSUPPORTED BY CURRENT ASSET | Fused human figure; also no 2D definition (Account 1 catalog) |
| `Blue_Linen_Shift_Dress.glb` | UNSUPPORTED BY CURRENT ASSET | same; no dress in the 2D garments |
| `Blue_Service_Uniform.glb` | UNSUPPORTED BY CURRENT ASSET | same |
| `Navy_Blue_Peplum_Dress.glb` | UNSUPPORTED BY CURRENT ASSET | same |
| `Navy_Textured_Short.glb` | UNSUPPORTED BY CURRENT ASSET | same |
| `Pink_Professional_Uni.glb` | UNSUPPORTED BY CURRENT ASSET | same |

Why the human-figure files are not wired: painting them whole would recolour the person, and painting only the clothes needs a garment/skin split (separate meshes, materials, or vertex groups) that the files do not contain. A height/radius heuristic to guess the clothes was deliberately not written: it would look like support without being support.

## 5. The 3D contract (exported from `garmentMeshManifest.js`)

```
GARMENT DEFINITION (2D name) -> SCANNED_GARMENTS[].match
  -> models {male, female}
  -> capabilities { regionMethod, regionAccuracy, zones, patterns{zones, ids}, text, logo, frontBack, fit }
get3DCapabilities(garment, fit) -> { supported, model, fitApplied, ...capabilities }   // supported:false for anything without a real GLB
UNSUPPORTED_3D_MODELS -> [{ file, appearsToBe, reason }]
```
The manifest holds no catalog. Account 1 reads `get3DCapabilities` for UI decisions.

## 6. Renderer facts (CODE unless noted)

- Default appearance: any zone without a colour renders white (`DEFAULT_GARMENT_COLOR`, `regionTexture.js`). Saved colours are never overridden. The Studio's own starting colours (navy/gold in `INIT_CFG`, `dsShared.js`) are outside the 3D lane; they are what a new design actually starts with.
- Generated UV texture (tees): `CanvasTexture`, flipY=false, sRGB, anisotropy 8, mipmaps on, 2048 px (1024 on coarse pointers, about 22 MB with mips), rebuilt 120 ms after the last change, disposed on replacement. One shared tiled grain normal map per size.
- Shader path (polos): one material per part, colours/patterns are uniforms, no texture, no recompile on edit. No normal map (no UVs).
- three.js unchanged (r150 behaviour: one uv transform per material, which is why the grain is tiled inside a canvas).
- The Canvas stays mounted while the 2D view is active; it now stops rendering while `visibility:hidden`.


## 7. Session addendum — 7 candidate GLBs, now present in `public/models` (added upstream, not by this session)

A prior session's evidence here was written while these 7 files were still staged outside
`public/models`; that is no longer true — they are committed in the repo's current HEAD
(`6b22103`) alongside `garmentCatalog.js`/`garmentCapabilities.js`. This session re-ran the
structural + leg-bifurcation checks independently (pygltflib: mesh/material/UV parse, per-5%-
height-slice x-extent + centre-gap scan across the full y-range) and got the same verdicts as the
prior pass. Evidence remains **STATIC only** — no BROWSER-harness render was performed this
session either (no headless-GPU/WebGL environment available); `garmentCapabilities.js` was updated
to add the 6 confirmed-rejected files to `UNSUPPORTED_3D_MODELS` and the 7th to a new
`PENDING_3D_MODELS` export, so the capability data now matches what's actually shipped in
`public/models` instead of omitting these 7 files entirely.

| File | Verts | Bbox y-range | Materials/UVs/Joints | Leg bifurcation? | Verdict |
|---|---|---|---|---|---|
| `Female teacher uniform (upper and pants).glb` | 28,380 | [-0.95, 0.95] | 0 / no / no | Yes (visible separate legs + head + hands in silhouette) | **FUSED HUMAN FIGURE — fails garment-only requirement** |
| `Female_Cream_Dress_with_Bow.glb` | 32,440 | [-0.95, 0.95] | 0 / no / no | Yes | **FUSED HUMAN FIGURE** |
| `Female dress uniform.glb` | 35,138 | [-0.95, 0.94] | 0 / no / no | Yes | **FUSED HUMAN FIGURE** |
| `Full set uniform female blazers plus slacks.glb` | 33,659 | [-0.95, 0.95] | 0 / no / no | Yes | **FUSED HUMAN FIGURE** |
| `Female full set corporate uniform and trousers.glb` | 36,650 | [-0.95, 0.95] | 0 / no / no | Yes | **FUSED HUMAN FIGURE** |
| `Male Full set uniform polo shirt and pants.glb` | 37,808 | [-0.95, 0.95] | 0 / no / no | Yes | **FUSED HUMAN FIGURE** |
| `Work_Uniform_Shirt with pocket on chest.glb` | 57,521 | [-0.95, 0.95] | 0 / no / no | **No** (single continuous cross-section, no leg split; silhouette shows a shirt shape only — collar, sleeves, chest pocket, no head/limbs) | **NOT fused-human by this test — but NOT verified.** No UVs/materials (same approximate-zone-only ceiling as the polo files); vertical scale is non-physical (fills the full [-0.95,0.95] range same as the human figures — confirmed this session to be a Meshy normalization artifact, not evidence of a full body: the already-SUPPORTED `Polo Shirt male.glb` has the identical 1.897-unit height, so raw bbox height doesn't distinguish body-scale from garment-scale for these exports); never rendered in the browser harness; no `SCANNED_GARMENTS` entry exists. Now tracked in `garmentCapabilities.js`'s `PENDING_3D_MODELS` (not silently absent). Onboarding it would need the same scale-calibration + `poloZone`-style geometry-threshold work the polo entries already went through, plus an actual browser/WebGL render, before it could be called supported.

**Filename note:** the working instruction for this file used an underscore
(`Work_Uniform_Shirt_with_pocket_on_chest.glb`); the file actually committed to the repo has a
space (`Work_Uniform_Shirt with pocket on chest.glb`, matching the style of `Polo Shirt male.glb`
and `female polo shirt.glb`). Any future onboarding work must reference the real on-disk name.

All six rejected files match the same signature as the already-documented `Blue_Service_Uniform.glb`
etc. in §1–4 above: single `mesh_node`, 0 materials, 0 UVs, `[-0.95, 0.95]` y-range, and — the
distinguishing test — a genuine leg/torso split starting around y ≈ -0.5 to -0.8 (visually and via
the x-gap-at-center check), which the polo/work-shirt files do not have at any height. Recolouring
any of the six would recolour skin, hair, and the lower garment together, same failure mode as the
existing rejected batch.

## 8. Session addendum — honest 3D-capability label added to the live 3D pane

`CanvasViewport.jsx`'s 3D pane previously gave no in-pane signal that a garment was rendering as a
generic parametric fallback (`status3D:'none'`, e.g. Scrub Top, Lab Coat, Button-Down, Mandarin
Collar — 10 of the 13 real families) or an approximate real-GLB region mapping
(`status3D:'partial'`, Polo Shirt/School Polo). The only existing signal was `TypePanel`'s
`STATUS_3D_LABEL` badge, shown once at garment-selection time and gone as soon as the customer
opened the 3D tab — exactly the "customer sees an apparently exact 3D preview that isn't one" gap
the constitution's 3D section warns against. Added a small pill label inside the 3D pane itself
(reads `familyFor(cfg.garment).status3D` from the same `garmentCatalog.js` the rest of the Studio
already trusts, no new data source) that persists for the whole time a `none`/`partial` garment is
being viewed in 3D. `supported` garments (T-Shirt) show nothing, unchanged.

## 9. Session addendum — processed (garment-only) GLBs, catalog restructure, WebGL context loss

Evidence labels: CODE = read/ran the repo code; BUILD = `npm run build` passed; RENDER = shaded raster renders of the actual exported GLB
(tools/glb-extract/raster.py, a numpy z-buffer rasterizer — NOT Three.js); BROWSER = real Three.js in a real browser (NOT performed this session:
no browser/GPU could be installed — Chromium download is blocked by the sandbox network).

**Correction to §7.** `Work_Uniform_Shirt with pocket on chest.glb` is NOT garment-only as shipped: below the short sleeves it still has bare arm
tubes. It was promoted prematurely. The source is untouched; the wired asset is now `processed/work-shirt-short-sleeve.glb`, with the arms cut off.

Connected-component analysis of all 14 fused figures: every one is a single connected component (garment and body share topology), so they cannot
be split by component. Extraction is therefore a spatial cut (`tools/glb-extract/`, reproducible with `python tools/glb-extract/build_processed.py`,
which regenerates all four assets byte-identically).

| Processed asset | Source (untouched) | Family wired | RENDER evidence | Known defects |
|---|---|---|---|---|
| `processed/work-shirt-short-sleeve.glb` | Work_Uniform_Shirt with pocket on chest | Button-Down (partial) | front / back offline raster with zone overlay (Account 3, session 4): collar, placket, chest pocket, short sleeves, no head/hands/arms; arms removed by plane clips (straight sleeve hem + side edge); mirrored x so the pocket is on the viewer's left like the 2D Button-Down | open side seams under the arms (hidden behind the arm in the scan); short sleeve only; front collar leaf points sit below the collar zone (body colour) |
| `processed/pants-trousers.glb` | Female full set corporate uniform and trousers | Pants (partial) | front + 45°: trousers only | small hand stub at one hip; ragged waist/hem; female cut |
| `processed/shorts-textured.glb` | Navy_Textured_Short | Shorts (partial) | 4 angles: shorts only | notch at hip side where a hand was fused; waist is a cut |
| `processed/skirt-pencil.glb` | Navy_Blue_Peplum_Dress | Skirt (partial) | front + 45°: skirt only | 1.4k vertices; ragged waist/hem |

All four have one mesh (`mesh_node`), positions + normals, no UVs/materials → zones are geometry thresholds (approximate, same method as polo).
Lower garments have a single `body` zone and decals disabled. Their transform (scale/position) is computed from the exported bounds; **camera framing is UNVERIFIED in the live scene.**

**Not extracted (attempted or assessed, not promoted):** Blue_Service_Uniform shirt was cut (RENDER-checked, still shows bare upper arms) and has no catalog family;
its trousers keep hand stubs (hands are inside the pockets, no gap to cut). Pink_Professional_Uni, Male full set, blazer+slacks, teacher uniform,
Blue_Blouse_and_Gray Pants, the four dresses and lab-coverall were inspected (RENDER contact sheets) but not processed — dresses have no 2D family; lab-coverall
is a closed watertight suit with hood and mitten hands and no clean cut plane. They stay in `UNSUPPORTED_3D_MODELS`.

**Sleeves.** Every wired shirt scan (t-shirt m/f, polo m/f, work shirt) is SHORT-sleeve only. `garmentCapabilities` now records `sleeves`, `garmentCatalog`
exposes `sleeves3D` and `defaultStyle` (was `styles[0]`, which made Polo default to "Sleeveless"), the Sleeve chips mark styles the 3D lacks with "· 2D",
and the 3D pane shows a notice when the chosen sleeve is 2D only. 2D still offers Long/3/4 — those are real 2D paths, not 3D.

**Catalog.** Categories: School, Corporate, Medical / Scrubs, Hospitality / Service, Industrial / Work, built only from existing families with real 2D paths.
No Dress category: there is no dress 2D definition and none was invented.

**WebGL "caused context loss and was blocked".** Not reproducible here (no browser). Likely contributors, all addressed: dev hot-reload remounting the Canvas
(each remount force-loses a context → Chrome blocks the tab) — `import.meta.hot.decline()` on DesignStudio3D and GarmentPreview3D; ContactShadows re-rendering a
depth pass every frame — now 2 frames, keyed per garment; `powerPreference:'high-performance'` removed; context-lost/restored handlers added; the error UI now offers a page reload after repeated failures. UNVERIFIED in a browser.

