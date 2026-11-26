# VFRB asset authoring toolkit — Scrub Top Pilot 01

The Blender-authored GLB is the authoritative garment. The 2D panels are derived from the finished GLB, never drawn separately.
Nothing here generates garment geometry: the source mesh is imported, cleaned, split by faces you assign, UV'd and exported.

## Source asset (read this first)
| File | Verdict |
|---|---|
| `garments/scrub-top-men-short.glb` | Default master. Single closed mesh, 94,990 tris, Draco, no UVs, no materials, glTF-Transform output. **Provenance and licence not recorded in the supplied files** (`approved_for_catalog: false`). |
| `authored/scrub-top-vneck-short.glb` | Generator tag is `trimesh`: procedural Python geometry. Not a valid master. Used only as a test fixture for the validator. |

I could not prove from the supplied files that `garments/scrub-top-men-short.glb` is your converted 2D-to-3D garment. If it is not, change `master_source.path` and `sha256` in `config/scrub_top_pilot_01.json`. `prepare` refuses any file whose SHA-256 differs.

## Workflow
1. `.\run_authoring.ps1 -Stage test` (needs Python + numpy; no Blender)
2. `.\run_authoring.ps1 -Stage prepare -ModelsRoot $Models -Out $Out`
   Imports, hashes, cleans (weld at 1e-5 model units, drop loose, triangulate), creates six region slots, saves `blend\scrub_top_pilot01_prepared.blend`, renders front/back/wearer-left/wearer-right/top with a **red marker on wearer-left (+X)** and a blue marker on wearer-right.
3. Manual authoring in Blender (this is deliberately not scripted):
   - Edit Mode, face select, select a region's faces (`L` linked, `C` circle, `Ctrl+click` paths), Material tab, choose the slot (`region_sleeve_l` etc.), **Assign**. Unassigned faces stay `body`.
   - Optional geometry refinement (collar, shoulders, defects) happens here, before assigning. Keep it triangulated or re-triangulate (`Ctrl+T`).
   - Save the .blend (same path).
   Paths on this machine: `$Models = C:\Users\Dave\vfrb-work\models-draco`, `$Out = C:\Users\Dave\vfrb-work\pilot01`.
4. Review the renders, then `.\run_authoring.ps1 -Stage build -Out $Out -ConfirmRegions -ConfirmHandedness`
   Splits by slot, rejects thin regions and wrong-side sleeves, authors UVs, one material per part, saves `scrub_top_pilot01_authored.blend`.
5. `.\run_authoring.ps1 -Stage export -Out $Out` exports `glb\scrub-top-pilot01.glb`, then runs independent validation and the 2D derivation.
6. `.\run_authoring.ps1 -Stage verify -Out $Out` reimports the GLB into a clean scene and renders region colours and a UV checker.

## Output tree
```
pilot01/
  blend/   scrub_top_pilot01_prepared.blend, scrub_top_pilot01_authored.blend
  glb/     scrub-top-pilot01.glb
  renders/ prepared_*, authored_*, verify_regions_*, verify_checker_*
  panels2d/ panels_front.svg, panels_back.svg, mapping_manifest.json
  manifests/ prepare_report.json, authoring_report.json, validation_report.json
```

## Conventions
- Blender: Z up, garment front faces -Y, **wearer-left = +X**. glTF export: Y up, front +Z, wearer-left +X.
- Node names = part names (`body, sleeve_l, sleeve_r, neck_band, chest_pocket, lower_pockets`); material name = part name; node extras carry `vfrb_part`, `vfrb_source_sha256`, `vfrb_mapping_version`.
- UVs: one shared atlas, one global scale, so texel density is identical on every part by construction. Body is split into front and back islands (back mirrored so text reads correctly). Sleeves and neck band use a cylindrical wrap with the seam under the arm / at centre back. Pockets use planar front projection.

## 2D derivation and mapping
`panels2d/mapping_manifest.json` (schema in `schemas/`) holds master id, source and processed hashes, and for every part a front and back panel: outline loops, a per-corner panel mesh (`mesh.xy` to `mesh.uv`, the authoritative 2D to UV map), an affine fit only when exact, projected-area ratio and grazing-face percentage as distortion metrics.
Front/back grouping is **position-based**: a triangle is on the front side if its centroid lies on the +front side of the part's own depth mid-plane. Normal sign is NOT used to group sides, because on a thick closed shell the inner wall of the back faces +front.
A panel's **outline triangles** are those on that side AND facing the viewer. They are **not a partition**: inner-wall and grazing/odd-side triangles are in no outline, yet they share the same UV projection (twin walls), so artwork covers both. Validation checks outline triangles <= part triangles, not equality.
Each region declares its expected views in `config` (`views`; scrub top: body, sleeves, neck band = front+back, pockets = front). Validation reports missing, duplicate and unexpected `(part, view)` panels and requires every panel to have a usable outline loop (>=3 finite points, area >= `limits.min_outline_area_ratio` of its bbox, default 0.01 - a sanity floor, not a quality guarantee).
These are print/design panels, **not sewing patterns**: no seam allowances, dimensions or flattening validation.

## Validation (independent of Blender; reads the exported GLB itself)
Not Draco, no embedded textures, parts and materials exact, triangle count equals the cleaned source, source hash in node extras, sleeve handedness, UVs present and inside 0..1, no texel covered by more than 2 UV layers (outer+inner wall = 2 is expected) in more than 0.5 % of texels, density spread under 1.05x, no atlas texel shared between parts, 2D manifest hash matches GLB, expected panels present/unique, usable outlines, outline triangles <= part triangles.

## Units
All dimensions (`*_mu`, bbox, atlas size, texel density) are **uncalibrated model units**. No millimetre/metre scale, print width or sewing dimension is implied. Relative UV density and 2D-to-3D correspondence are valid; physical scale needs a documented calibration first.

## Panel quality measurement
`mathcore.shell_contamination(mask, inner_wall)` needs ground truth (which triangles are inner wall). The test suite enforces `MAX_PANEL_CONTAMINATION = 0.01` only on an idealised synthetic closed double-wall tube. For the real scrub top the pipeline does not yet measure contamination; an offline ray-test proxy on the whole unsegmented mesh gave about 4 % (front) and 9 % (back), which is evidence, not a guarantee, and will change with your region split.

## Known limitations
- Blender stages `prepare` has run on the author's Blender 5.2.2; `build`, `export`, `verify` and the v2 changes to them have NOT been run against the real garment (verify() now fails loudly with pass_=false). Expect small API differences on first run (the exporter call already drops options this Blender does not know and reports them).
- Source is ONE watertight, connected thick-cloth shell (outer wall + inner wall joined at the hem, cuffs and neck rim; Euler number -4; no UVs). The openings are real, but the cloth has thickness, so each side has two walls. I did not fabricate or remove any wall. 95k tris is heavy for mobile; decimation is off (`clean.decimate_ratio`) because it would move region boundaries.
- Region boundaries are your manual selection; the toolkit cannot judge whether a boundary is a real seam.
- Sleeve end caps and neck-band poles distort in cylindrical UVs; see `stretch_p05/p95` in `authoring_report.json`.
- Grazing faces (side seams, underarm) get little 2D area; art there is squeezed. Reported per panel.
- The existing procedural `authored/` models place `sleeve_l` on -X, which contradicts the +X wearer-left convention here. Confirm which convention your frontend assumes before wiring.
- Front-end integration (Three.js loader, Fabric.js zone mapping) is not touched.

## Extending to pants and skirts
Add a config like `scrub_top_pilot_01.json` with its own regions and `uv_strategy` per region (`planar_front_back`, `planar_front`, `cylinder`; axis/seam accept `up,down,front,back,left,right,pca` or a vector). No code change is needed for left/right legs (`cylinder`, `axis: up`).
