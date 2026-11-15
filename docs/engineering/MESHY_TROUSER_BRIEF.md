# Meshy trouser brief

Goal: one garment-only, full-length straight uniform trouser GLB that the Studio can colour by zone.
Status: UNVERIFIED. No Meshy output exists yet; nothing here is wired into the app.

## What to give Meshy (image to 3D, 6 lite)
Use one clean front photo per attempt. A front flat-lay on a plain white background works best (a straight, creased, flat-front trouser with a separate waistband).
- Garment only: no model, no legs inside, no hangers, no shadows on the floor.
- Straight or gently tapered legs, hem at the ankle, both legs fully visible with a gap between them.
- Neutral dark grey or black, so seams read but colour does not bake in.
- Square image, at least 1024 px, garment centred with a margin on all sides.
- Do not use the flared or cropped images: Meshy keeps the silhouette.

Settings: Image to 3D, quality high, symmetry on, PBR off (colour only), target polycount 30k then decimate in Blender. Make 2 or 3 attempts and keep the one with open legs and a flat waist.

## Reject on sight
- Legs fused into one block, or a closed hem.
- A human body, or fabric draped over a mannequin.
- Hem above the ankle, or a flared hem.
- Baked-in folds that look like holes.

## After Meshy
1. `blender --background --python tools/blender/trouser_cleanup.py -- in.glb out.glb`
2. `node tools/check-glb-urls.mjs` after uploading, then expect parts >= 4, h/w about 2.0 to 2.4, tris under 60000.
3. Only then map it in `garmentCapabilities.ts` as Approx. 3D. Record source and licence in `ASSET-REGISTRY.md`.
