# tools/glb-extract

Offline Python tools that turn read-only source GLBs into garment-only pieces for the Studio. They never edit, replace or delete a
source GLB or photo; new files go to `public/models/vfrb-derived/` (derived pieces) or the paths named in each script.

## Python packages (tooling only)

These are installed for the tools only (`pip install --user`), never in `package.json` or the app build:

| Package | Version | Used by | Why |
|---|---|---|---|
| numpy | 2.5.3 | all | arrays |
| trimesh | 5.1.0 | all | GLB read/write |
| fast-simplification | **0.2.0** (pinned) | `derive_template.py` | quadric edge-collapse decimation of pieces over 50k triangles |

`pip install --user "fast-simplification==0.2.0"`. scipy, networkx and Pillow are not installed: `meshkit.py` implements connected
components, plane clipping, depth rendering, silhouettes, outline tracing and PNG writing in numpy.

## derive_template.py

```
python tools/glb-extract/derive_template.py singles|sets|all [reference ids...]
```

Derives editable pieces from the 23 reference models in `public/models/reference/`:

1. Removes non-garment parts by evidence. Two pinstripe suits carry a fused mannequin neck: the faces inside the measured neck cylinder above the collar are removed. Floating fragments under 0.05% of the faces are dropped.
2. Splits sets at `REF_SPLIT` (`referenceColour.js`). Flat-lay sets are split by connected component; worn sets get a plane clip at the top's hem, and any sleeve cuffs that hang past the hem go back to the top.
3. Recentres each piece and scales it to height 1.9 (the convention of the staged Meshy models). Welds seams and decimates to 50k triangles or fewer, behind three gates:
   - front-silhouette IoU of at least 0.98;
   - IoU of at least 0.97 in each of the five views;
   - the neckline or waist opening may not close.

   If a gate fails, the piece keeps its original triangle count and the failure is recorded.
4. Traces the front (and back, where it differs) orthographic silhouette into a closed 2D body path, and renders 1.5x shade maps from the model's depth.
5. Writes `derived-manifest.json` (evidence per reference and piece, plus source hashes) and the generated `src/pages/client/design-studio/derivedTemplates.generated.js`. It aborts if any source GLB hash changed during the run.

Names, categories and set roles of the derived families live in `src/pages/client/design-studio/derivedFamilies.js` (one table).
`baseline-before-derived.json` records how every pre-existing family and gallery photo resolved at HEAD 57bbc2f. `tools/logic-checks.mjs` compares the current code against it.
