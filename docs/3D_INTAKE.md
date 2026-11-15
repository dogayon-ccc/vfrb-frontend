# 3D intake checklist

A garment gets a 3D view only after its GLB passes every item below. Until then it stays 2D and is labelled 2D. Registry truth lives in `glbSlots.js` and `garmentCapabilities.js`; regenerate `docs/engineering/ASSET-REGISTRY.md` with `node tools/asset-audit.mjs --write` after changing them.

## Checklist

- [ ] **Exact match**: the model is this garment (same cut, sleeve and fit), not a family stand-in. A different-looking garment goes in `NO_FAMILY_3D`.
- [ ] **Named parts**: every colour zone the 2D editor offers (body, sleeve, collar, pocket) is its own named node, listed in the entry's `parts` with `colorKey` and `zoneOf`. A fused mesh gets one body colour only and says so in `limitations`.
- [ ] **Decals land**: a part with `decals: true` places logos and text on the front and back in the right place and never shows through the far side (render check, both sides). Decals are projected (`DecalGeometry`, `ScannedGarmentMesh.placeDecals`), so they do not need UVs. Expect clipping where a hanging sleeve meets the side seam.
- [ ] **UVs only where read**: a part with `regionOf` (colour/pattern per UV island) needs `TEXCOORD_0` with islands that match the garment panels. Fused `zoneOf` parts and decals do not. Run intake with `--capabilities` to assess only what the entry claims (`colour`, `decals`, `uv-regions`, `components`); without it the full gate (UVs required) applies.
- [ ] **Size**: GLB under 3 MB (Draco/meshopt allowed) and under 20,000 triangles per part.
- [ ] **Licence**: the source and licence are recorded (`license`, slot `source`). No paid generation without approval.
- [ ] **Hosting**: uploaded under `/models/...` on Cloudinary (`VITE_MODEL_BASE_URL`) and loads through `modelUrl()`. Source files in `public/models/` and `asset-staging/` are never replaced.
- [ ] **Colour check**: each 2D colour change shows in 3D on the matching part, in both lighting presets.
- [ ] **Phone test**: opened on a real phone (or 390px emulation with a coarse pointer). It loads, rotates and pinch-zooms without a long freeze, and there is no sideways scroll.
- [ ] **2D fallback**: with WebGL off, or after a lost context, the view drops to 2D with a notice. A failed GLB load never shows a different garment.
- [ ] **Honest label**: shows "3D (approx.)" until a `verification: { method, date }` record exists. Loading is not verification.
- [ ] **Checks pass**: `node tools/logic-checks.mjs` and `npm run build`.

## Garments still without 3D (2026-10-22)

From `has3DModel` over every catalog family, sleeve and fit:

| Garment | Missing |
|---|---|
| Round Neck | Long sleeve, women's |
| Mandarin Collar | Short sleeve, men's; Long sleeve, women's |
| Scrub Top | 3/4 sleeve, men's |

Also 2D only:
- **`blouse-tunic-roundneck-blue`**: the family model exists but is a different garment, so it is withheld (`NO_FAMILY_3D`).
- **6 reference-only gallery photos**: no editor. 2 have a read-only 3D viewer.
- **Gated or derived models** (`GATED_3D`): kept off by decision.

See the "3D coverage by kind" section of `ASSET-REGISTRY.md` for the current counts.

## Decal projection limits and how to test them

`ScannedGarmentMesh.placeDecals` casts a ray along Z from the 2D overlay position, then drops a `<Decal>` (a 0.22-deep projection box centred 0.03 inside the hit, so folds stay in and the far shell stays out). Consequences:

- **Depth test is explicit** (`depthTest` on the `<Decal>`): drei defaults it off, which made a front logo show through the back and the reverse. Do not remove it.
- **Side seams clip.** Anything the box does not reach is not drawn. On the tee pilot the front surface falls from z 0.30 at the chest to 0.14 at x -0.43 and 0.03 at the arm (y 0.2), so a decal centred near the seam is truncated where the surface curves more than ~0.14 away from the hit. Keep logos inside the torso, and do not widen the box or add a wrap without a render of both sides.
- **Z-fighting**: none seen at distance 3.8 or 9 (visible-side pixels identical to the unfixed render), so no extra `polygonOffsetUnits` is used.

Test: `node tools/logic-checks.mjs` (static check that the `<Decal>` keeps `depthTest`). Browser: render the model with only a front decal, then only a back decal, from yaw 0 and 180. The decal must be visible on its own side and absent (0 pixels) on the other, with the same size and position as before.
