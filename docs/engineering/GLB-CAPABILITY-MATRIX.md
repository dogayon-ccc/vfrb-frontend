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

