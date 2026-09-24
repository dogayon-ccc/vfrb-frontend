# VFRB Handoff

## ACCOUNT 3 (3D / GLB) — branch `agent/account3-3d-glb`

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
