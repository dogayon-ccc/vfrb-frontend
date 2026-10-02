# ADR: Client-attached PNG → 3D / .glb

Status: Proposed, 2026-10-02. Owner lane: Account 1 (client portal); renderer lane: Account 3.

## Decision
Do not build PNG-to-3D (image-to-3D / Meshy-class) conversion for the Oct 5 validation or Oct 6 demo.

## Why
- VFRB_ENGINEERING_CONSTITUTION: GLBs must be garment-only, UV-mapped, region-editable, tested in the real renderer, with license recorded. A generated mesh from one flat PNG meets none of these.
- "Never fake unsupported 3D" and "never color a fused figure and call it a configurator".
- Image-to-3D is on the Account 1 do-not-touch list; it needs a paid third-party API key and server-side calls, which means backend changes.
- Production needs flat pattern/measurement truth, which a generated mesh cannot provide.

## What the client can do instead (already in the Studio)
- Attach a PNG as a Logo/graphic layer (bgRemove, layers, opacity) on the 2D garment.
- See that artwork on garments with a verified GLB through the existing 2D-canvas texture overlay.
- Garments without a verified GLB stay 2D-only and say so.

## Revisit when
A garment has an approved GLB with named regions; then a decal-placement pass (not mesh generation) is the next step.
