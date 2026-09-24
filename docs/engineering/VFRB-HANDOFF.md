# VFRB Handoff

## ACCOUNT 3 (3D / GLB) — SESSION 1 — branch `agent/account3-3d-glb`

> SUPERSEDED IN PART: every `lab-coverall.glb` finding below describes the OLD garment-only file (git `f181b4e`). The file on `main` is now a different Meshy asset (hooded human figure, no UVs/materials). See SESSION 2.

If another account already created this file on a different branch, MERGE this section; do not overwrite.

### ACCOUNT 3 OBJECTIVE
Find why 2D zone customisation (collar / sleeve / patterns) does not reach the real GLB, and implement the 2D -> 3D mapping only where the real GLB assets support it. No fake 3D.

### WHAT WAS VERIFIED
Legend: CODE = read in source. STATIC = parsed from the GLB files / scripts. BUILD = `npm run build`. BROWSER(harness) = headless Chrome + WebGL rendering the repo's own `DesignStudio3D` through `tools/glb-harness`. UNTESTED = not run.

| Item | Level |
|---|---|
| GLB node / mesh / material / UV / texture structure (4 files) | STATIC |
| `collar` node of lab-coverall is an interior waist band (y 0.18-0.24), not the neck collar | STATIC + BROWSER(harness): baseline render showed no green when collar = green |
| `body` UV islands = cut panels (coverall 22, male tee 5, female tee 43) | STATIC |
| 3D code never read `cfg.patterns` / `cfg.patternParams`; scanned parts only used per-node `colorKey` | CODE |
| Text / shape overlays reach 3D as Decals from Fabric `toObject` JSON (mechanism unchanged) | CODE + BROWSER(harness) |
| Coverall: body / sleeve / neck collar / pocket colours on the real mesh | BROWSER(harness) |
| Coverall: H-stripes on sleeves only | BROWSER(harness) |
| T-shirt male + female: sleeve colour, neck-rib colour, V-stripes on sleeve | BROWSER(harness) |
| Text + rectangle decal still render on coverall after the change | BROWSER(harness) |
| Production build (`npm run build`), before and after the change | BUILD (exit 0) |
| package-lock.json / package.json unchanged | STATIC (`git diff` = 0 lines) |
| Full Design Studio flow 2D -> 3D -> save -> reload -> 3D | **UNTESTED / INCOMPLETE** (see BROWSER STATUS) |
| Image logo -> decal | UNTESTED (same Decal path as text, not run separately) |
| Front/Back face toggle in 3D | UNTESTED |
| ESLint | UNTESTED (`@eslint/js` missing from devDependencies; config cannot load) |
| Deployment | UNTESTED |

### GLB ASSET FINDINGS
All under `public/models/`. Embedded textures are 2x2 placeholder PNGs; base colour factor 0.4 grey.

| File | Meshes | Materials | UV |
|---|---|---|---|
| lab-coverall.glb | `collar` (145 v), `body` (10195 v, coat + separate trousers), `buttons`, `stitching` | 1 shared (body/collar/buttons); stitching has none | yes on collar/body/buttons, none on stitching |
| t-shirt-male.glb | `body` (25812 v, non-indexed triangle soup) | 1 | yes |
| t-shirt-female.glb | `body` (5107 v) | 1 | yes |
| school-set-female.glb | blouse, collar, tie, buttons, skirt | 0 | **none** |

- lab-coverall `collar` node: horizontal band at waist height inside the coat. Previously the manifest bound it to the 2D collar colour, so 2D collar changes recoloured an invisible mesh.
- Real neck collar and both sleeves are NOT separate meshes; they are UV islands inside `body` (one shared material). Region-level colour therefore needs a region mask; solid colour and patterns are both done through a generated UV texture.
- Islands used (island centroid in model units):
  - coverall: sleeve L/R |x| 0.36 (+ cuffs |x| 0.54); neck band y 0.73 (155 v); chest pocket + 2 lower pockets (z > 0.06, small islands); rest = body (front, back, trousers, hems).
  - tees: sleeve islands |x| >= 0.13, y > 0.05; neck rib islands y > 0.19, |x| < 0.1 (male: 1 island, female: 2).
- school-set-female has no UV and no materials: per-node solid colour is possible, patterns are UNSUPPORTED BY CURRENT ASSET (no UVs). It is not wired in the manifest (unchanged from before).
- `stitching` has no UV and stays a fixed colour.

### CURRENT 2D -> 3D ARCHITECTURE (after this change)
Design Studio state `cfg` (`colors`, `patterns`, `patternParams`, `fit`, `garment`) is the single source of truth.
- Zone colour / pattern: `cfg` -> `DesignStudio3D` -> `ScannedGarmentMesh` -> `regionTexture.buildRegionTexture` paints each UV island of the part with its zone colour or pattern into a canvas texture (`map`, flipY=false, sRGB) -> `MeshPhysicalMaterial` on the real GLB geometry.
- Text / shapes / drawings / logos: Fabric `toObject` JSON (`overlays`) -> `overlayDecals.renderDecals` -> `Decal` on the `decals:true` part. UNCHANGED.
- Pattern tiles replicate the 2D PATTERNS tile geometry and width/spacing (hstripes, vstripes, diagonal, checker, polka, geometric). Each island gets a least-squares affine UV -> model(x, y) fit, so pattern direction follows model axes as in the 2D front view (horizontal stripes stay horizontal on arms).
- Primitive (non-scanned) garments are untouched.

### IMPLEMENTED
1. Region masks from real UV islands (`regionTexture.js`, `regionOf` rules in manifest).
2. Zone colour for body / sleeve / collar / pocket on coverall; sleeve / collar on both tee fits.
3. Pattern mapping for the 6 tiled patterns above.
4. Coverall `collar` node now follows body colour (it is an interior band).
5. Persistence gap: draft restore now also restores `patternParams` and `fit` (they were saved but not restored).
6. r150 workaround: one uv transform per material, so grain normal map is tiled inside a canvas when a zone `map` is present.

### FILES CHANGED
- `src/pages/client/design-studio/regionTexture.js` (NEW) — UV island detection (UV-welded union-find), per-island affine fit, generated zone texture.
- `src/pages/client/design-studio/garmentMeshManifest.js` — `coverallRegion` / `teeRegion` rules; `regionOf` on body parts; coverall `collar` node -> `colorKey: 'body'`.
- `src/pages/client/design-studio/ScannedGarmentMesh.jsx` — `useRegionTexture`, `map` support in `partMaterial`, tiled grain normal map, `patterns` / `patternParams` props.
- `src/pages/client/DesignStudio3D.jsx` — passes `cfg.patterns`, `cfg.patternParams` to `ScannedGarmentMesh` (1 line).
- `src/pages/client/DesignStudio.jsx` — draft restore adds `patternParams` and `fit` (2 lines).
- `tools/glb-harness/index.html`, `tools/glb-harness/main.jsx` (NEW, dev-only) — renders `DesignStudio3D` with an injected `cfg` (`window.__set(cfg, overlays)`); served by `npx vite` at `/tools/glb-harness/index.html`. Safe to delete or to leave out of the merge.
- `docs/engineering/VFRB-HANDOFF.md` (NEW) — this file.
- package.json / package-lock.json: NOT changed.

### BUILD STATUS
`npm run build`: exit 0 before and after the change (only the existing >800 kB chunk warning). `dist/` is gitignored. Lint not run (see above).

### BROWSER STATUS
Environment: headless Chromium (`@sparticuz/chromium`) with SwiftShader WebGL2, no GPU, no Laravel backend.
- HARNESS (BROWSER VERIFIED, renderer only): coverall, male tee, female tee with distinct zone colours; coverall sleeve H-stripes; text + rect decals. No console errors in those runs. Screenshots were inspected manually; no automated pixel assertions.
- FULL STUDIO (`/design-studio`, auth and `/api/*` mocked, config seeded through `sessionStorage.studio_config`): the page loaded, the onboarding overlay blocked the 2D view, the 3D toggle click was accepted, and one 3D screenshot was written but not reviewed. The tab then crashed (`Target closed`) during repeated 2D <-> 3D toggling. Cause unknown: could be the software-GL test environment or a real problem (two WebGL/canvas contexts, 2048^2 texture rebuilds). **Full 2D -> 3D -> save -> reload -> 3D and repeated 2D/3D switching are NOT verified.**

### DEPLOYMENT STATUS
UNTESTED. Nothing pushed by this session beyond the branch creation Dave did.

### REMAINING LIMITATIONS
- Pattern colours are a design choice: 2D replaces the zone fill with a 35%-opacity tile, which is pale on screen. 3D uses ground = zone colour mixed 65% toward white, ink = zone colour. Change `GROUND_MIX` in `regionTexture.js` to alter it.
- Not mapped: `gradient` pattern (2D handles it specially), `tipping`, and per-side (L/R) sleeve colours (2D has one `sleeve` key).
- All 3 pocket pieces on the coverall follow the pocket colour (2D draws one pocket).
- Pattern direction is an affine approximation per cut panel; stripes on curved tube surfaces (sleeves) are slightly skewed and tile phase is anchored to model origin.
- Tee collar: 3D supports it, but `zonesFor` (dsShared.js) still hides the T-Shirt collar swatch because OrderWizard reads it through `garmentRequirements`. Left alone deliberately.
- Logos remain decals; they are not painted into region textures.
- school-set-female is not wired (no UVs, no materials).
- Texture rebuilds (2048^2, 1024^2 on coarse pointer) on every colour/pattern change; no extra debounce added. Slider dragging for stripe width may be heavy on weak devices (UNTESTED on a phone).
- Region rules are tuned to the current three GLBs; a re-exported model needs new `regionOf` thresholds.

### BLOCKERS
None for merging. Human verification in a real GPU browser is required before calling the workflow done.

### DO-NOT-REDO
- Do not re-map the coverall `collar` node to the 2D collar colour: it is an interior band.
- Do not re-inspect the GLB structure: findings above are measured.
- Do not set `normalMap.repeat` while a zone `map` is present (r150 uses one uv transform).
- Do not treat harness results as proof of the full Studio flow.

### NEXT ACTION
1. Apply the patch on `agent/account3-3d-glb`, run `npm install` (repo `npm ci` failed in the sandbox: lockfile out of sync with `package.json`, not investigated) and `npm run build`.
2. In a real browser: Lab Coverall -> change body / collar / sleeve / pocket colours -> set sleeve H-stripes -> 3D. Repeat with T-Shirt male + female. Add text and a logo. Save, reload, open 3D. Toggle 2D <-> 3D repeatedly and watch for context loss or the crash seen in the headless run.
3. Decide the pattern ground/ink look (`GROUND_MIX`).
4. Open a PR to `main` only after step 2 passes.

---

## ACCOUNT 3 — SESSION 2 (worked directly on `main` @ `107e7a1`)

### OBJECTIVE
Inventory every GLB now in `public/models/`, publish a capability matrix, integrate only models the real assets can support, fix regressions found on `main`, verify neutral defaults, and check WebGL resilience. Details: `docs/engineering/GLB-CAPABILITY-MATRIX.md`.

### MODEL INVENTORY
11 GLBs. 2 t-shirts (trimesh, UVs), 2 polos (Meshy, garment only), and 7 Meshy files that are full human figures (`lab-coverall` and 6 others). `school-set-female.glb` no longer exists on main.

### MODEL CAPABILITY FINDINGS (STATIC)
- t-shirt male/female: real UV islands (5 / 43) -> exact body/sleeve/collar regions. (unchanged, still supported)
- Polo male/female: single fused mesh, POSITION only (no normals, UVs, materials). Garment only, so zones can be derived from geometry, approximately.
- `lab-coverall.glb` (NEW asset): hooded human figure, one mesh, no materials/UVs. UNSUPPORTED BY CURRENT ASSET.
- Blue_Blouse_and_Gray Pants, Blue_Linen_Shift_Dress, Blue_Service_Uniform, Navy_Blue_Peplum_Dress, Navy_Textured_Short, Pink_Professional_Uni: full human figures fused with clothes, no materials/UVs/vertex groups. UNSUPPORTED BY CURRENT ASSET. Not wired. Most also have no 2D definition.

### REGRESSIONS FOUND ON MAIN (both fixed in this session)
1. Lab Coverall rendered NOTHING in 3D (0 non-background pixels, no error): the manifest referenced nodes `body/collar/buttons/stitching` that do not exist in the new file. The coverall manifest entry was removed, so the existing generic primitive fallback shows. That fallback is not a real garment mesh.
2. `DesignStudio3D.jsx` no longer passed `cfg.patterns` / `cfg.patternParams` to `ScannedGarmentMesh` (lost in a consolidation commit), so patterns never reached the real GLBs. Restored. Verified present in the final diff.

### IMPLEMENTED
- `regionShader.js` (new): for GLBs without UVs. Per-vertex one-hot zone mask (body/sleeve/collar/pocket) from geometry thresholds + a patched `MeshPhysicalMaterial` (onBeforeCompile). Colours and the 5 tile patterns (hstripes, vstripes, diagonal, checker, polka) are uniforms evaluated in model x/y (2D sketch px = model / `pxToModel`), region-clipped. `geometric` paints solid on this path.
- Manifest: `polo-shirt` entry (`/polo/i`, so `Polo Shirt` and `School Polo`), coverall entry removed, `capabilities` contract, `get3DCapabilities(garment, fit)`, `UNSUPPORTED_3D_MODELS`. Only tees are preloaded now (polos are 1.8-2.5 MB each).
- Default appearance: 3D-side arbitrary teal fallback `#028090` replaced by `DEFAULT_GARMENT_COLOR = '#FFFFFF'` (also the primitive fallbacks). Saved colours are untouched.
- Perf/hardening: Canvas stops rendering while `visibility:hidden` (`PauseWhenHidden`); 120 ms debounce before rebuilding the 2048 px zone texture; old materials are disposed; `zoneFills` shared by both paths; null-safe pattern parsing.
- Review catch fixed before packaging: an inline comment had swallowed `normalScale` and `side: DoubleSide` in `partMaterial`; restored and re-rendered.
- `tools/inspect_glb_capabilities.py` (static inspector) and `tools/glb-harness/raw.{html,js}` (raw GLB viewer). Dev-only.

### 3D CONTRACT
GARMENT (2D name) -> `SCANNED_GARMENTS[].match` -> `models{male,female}` -> `capabilities{regionMethod, regionAccuracy, zones, patterns, text, logo, frontBack, fit}`. Renderer reads `cfg.garment, cfg.fit, cfg.colors, cfg.patterns, cfg.patternParams, cfg.sleeve` and `overlays` (front/back). `cfg.name` is not used by 3D. Verified that every one of these reaches `ScannedGarmentMesh`.

### FILES CHANGED
- `src/pages/client/DesignStudio3D.jsx` — patterns pass-through, white defaults, `PauseWhenHidden`.
- `src/pages/client/design-studio/ScannedGarmentMesh.jsx` — zone material hook, debounce, disposal, no-UV material.
- `src/pages/client/design-studio/garmentMeshManifest.js` — polo entry, contract, coverall removed.
- `src/pages/client/design-studio/regionTexture.js` — `DEFAULT_GARMENT_COLOR`, shared `zoneFills`.
- `src/pages/client/design-studio/regionShader.js` — NEW.
- `tools/inspect_glb_capabilities.py`, `tools/glb-harness/raw.html`, `tools/glb-harness/raw.js` — NEW, dev-only.
- `docs/engineering/GLB-CAPABILITY-MATRIX.md` — NEW. `docs/engineering/VFRB-HANDOFF.md` — this section.
- Not touched (deliberately): DesignStudio.jsx, dsShared.js, TypePanel, ToolDrawer, AssetsPanel, CanvasViewport, any backend. package.json / package-lock.json unchanged.

### BUILD STATUS
BUILD VERIFIED: `npm run build` exit 0 on the final source (rebuilt after the last edit). Only the existing >800 kB chunk warning. ESLint UNTESTED (`@eslint/js` missing from devDependencies).

### BROWSER STATUS
Environment: headless Chromium, SwiftShader software WebGL2, 1 CPU core, no GPU, no backend.
- BROWSER (harness only; renders `DesignStudio3D`, NOT the production Studio page): polo male/female region colours, sleeve/body patterns (all 5 shader tiles), collar solid, white default with empty colours, hem leak fixed, colour parity with the tee texture path (`(222,60,60)` vs `(214,51,53)` for the same hex), tee unchanged, text + rectangle decals on the polo, coverall no longer blank (generic fallback).
- Resilience (harness): missing model (404) and invalid model -> `GarmentMeshErrorBoundary` shows the generic shirt, no crash (React/R3F still log the error). WebGL context lost then restored -> renders again. 30 rapid garment/colour switches: JS heap stable (11 -> 10 MB), no context loss. GPU memory NOT measured.
- Production Studio (`/design-studio`, auth and `/api/*` mocked): loads with a seeded config and the first 3D toggle renders, but repeated 2D<->3D toggling was slow (about 20 s per 3D click on the 1-core sandbox) and the browser then disconnected (`Target closed`) after about 4 toggles, both with and without chromium's `--single-process` / `--in-process-gpu` flags. No page-crash event, JS heap 18-20 MB. **Cause NOT determined.** Software GL on one core is the leading suspect but is unproven; whether `PauseWhenHidden` helps or hurts is unmeasured.
- **The full production flow 2D -> 3D -> save -> reload -> 3D is NOT verified.** A reload with a seeded `sessionStorage.studio_config` was attempted but not reached in the toggle run.

### PERFORMANCE STATUS
CODE-reviewed only, plus the heap number above. Zone texture 2048 px (1024 on coarse pointers) about 22 MB with mips, rebuilt 120 ms after the last change for tees; polos rebuild nothing. The DPR cap is `[1,2]` desktop / `[1,1.5]` coarse (existing). Rebuild time and GPU memory UNTESTED.

### LIMITATIONS
- Polo regions are geometry thresholds, not panels: the sleeve seam is a straight vertical cut at |x| 0.46 (y > 0.05); collar is y > 0.78. Female polo thresholds were checked visually only.
- Polo patterns are projected along Z: checker/polka/vstripes stretch on the sides. No anti-aliasing on tile edges (shimmer at distance).
- No pocket or tipping support on any wired model (no such geometry). `geometric` pattern is solid on polos.
- Pattern colours are still the Session 1 design choice (ink = zone colour, ground = zone colour mixed 65% white; `GROUND_MIX`).
- Studio dependency (Account 1 / dsShared, not changed here): `FIT_GARMENTS = ['T-Shirt']`, so polos get the male model only; `zonesFor` hides the T-Shirt collar swatch; `INIT_CFG` default colours are navy/gold, not white; **`DesignStudio.jsx` draft restore does NOT restore `patternParams` or `fit`** (verified absent on `main`: the Session 1 two-line fix was overwritten by a consolidation commit). Effect: after reloading a saved DRAFT, custom stripe width/spacing and the T-Shirt fit are lost, so 3D shows default stripe params and the male tee. The sessionStorage path is unaffected (it restores the whole `cfg`). Not changed here (Account 1's file). Exact fix, next to `patterns: sc.patterns ?? p.patterns,`: add `patternParams: sc.patternParams ?? p.patternParams,` and `fit: sc.fit ?? p.fit,`.
- Lab Coverall, the dress/peplum/service/blouse+pants/short/pink models have no real 3D support.

### BLOCKERS
Verification on a real GPU browser. Garment-only, region-separated re-exports for any model to be supported beyond t-shirts and polos.

### DO-NOT-REDO
- Do not re-inspect the GLB structure (matrix is measured; rerun `tools/inspect_glb_capabilities.py` if files change).
- Do not colour human-figure GLBs as whole meshes or add height/radius clothes heuristics.
- Do not restore the old `lab-coverall.glb` or its `coverallRegion` rules unless the asset owner decides to; `git show f181b4e:public/models/lab-coverall.glb` recovers it.
- Do not set `normalMap.repeat` together with a zone `map` (three r150 shares one uv transform).
- Do not treat harness results as proof of the production Studio flow.

### NEXT ACTION
1. Apply the patch, `npm install`, `npm run build`.
2. On a machine with a GPU: production Studio, Polo Shirt and T-Shirt, colour every zone, pattern, text, logo (image), front/back, 2D<->3D x10, save, reload, 3D. Watch for the toggle stall/disconnect seen in the sandbox.
3. Account 1: consume `get3DCapabilities`; add a fit toggle for polos if wanted; decide the default colours; do not offer 3D region controls for garments where `supported` is false.
4. Asset owner: supply garment-only, region-separated GLBs (or panel-split exports) for coverall and any other garment.

