# 3D intake checklist

A garment gets a 3D view only after its GLB passes every item below. Until then it stays 2D and is labelled 2D. Registry truth lives in `glbSlots.js` and `garmentCapabilities.js`; regenerate `docs/engineering/ASSET-REGISTRY.md` with `node tools/asset-audit.mjs --write` after changing them.

## Checklist

- [ ] **Exact match**: the model is this garment (same cut, sleeve and fit), not a family stand-in. A different-looking garment goes in `NO_FAMILY_3D`.
- [ ] **Named parts**: every colour zone the 2D editor offers (body, sleeve, collar, pocket) is its own named node, listed in the entry's `parts` with `colorKey` and `zoneOf`. A fused mesh gets one body colour only and says so in `limitations`.
- [ ] **UVs on decal parts**: a part with `decals: true` has UVs, and logos and text land on the front and back in the right place.
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
