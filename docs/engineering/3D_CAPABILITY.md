# 3D capability (garment picker)

Status as of 2026-11-09, branch `release/nov9b`. Generated from the registry code (`garmentCatalog.js`, `garmentCapabilities.js`) with Vite SSR; it is not hand-typed.

## One source, one wording

- Routing: `scannedEntryFor(garment, sleeve, fit)` in `garmentCapabilities.js` decides whether a model renders. `has3DFor` wraps it, and `cap3D` in `garmentCatalog.js` turns that into `verified | approx | none`.
- Wording: `CAP3D` in `glbSlots.js` is the only place the text lives. The garment cards, the Studio 2D/3D chip, the phone stage badge, the picker chips and the order preview tab all read it.
- Component: `Capability3D.jsx` is the one badge (icon plus visible text).

| Capability | Label shown | When |
|---|---|---|
| verified | 3D preview available | model with a `verification: { method, date }` record (none today) |
| approx | 3D preview (approximate) | any registered model without a verification record |
| none | 2D design only: 3D coming | no garment-only model for this garment, sleeve and fit |

Pants: the Meshy trousers file is gated off (`GATED_3D.pants`). Pants is served by the VFRB-authored `authored/pants-straight.glb`, so "3D preview (approximate)" is correct and there is no inconsistency.

## Garment table (one row per family, family-level lookup)

Sleeve- and fit-specific results can differ (for example, Polo Long has no model). The Studio label always uses the exact selection.

| Garment | Categories | 2D base | 3D label | Verified | Model / reason | Model source |
|---|---|---|---|---|---|---|
| Polo Shirt | School Uniform, Corporate, Hospitality / Service, Industrial / Work | vector template | 3D preview (approximate) | no | Polo Shirt male.glb | Meshy |
| Round Neck | School Uniform | vector template | 3D preview (approximate) | no | round-neck-fuchsia-short.glb | Meshy |
| Pants | School Uniform, Corporate, Medical / Scrubs, Hospitality / Service, Industrial / Work | vector template | 3D preview (approximate) | no | pants-straight.glb | VFRB-authored |
| Shorts | School Uniform, Industrial / Work | vector template | 3D preview (approximate) | no | shorts.glb | Meshy |
| Skirt | School Uniform, Corporate, Hospitality / Service | vector template | 3D preview (approximate) | no | skirt-pencil-lofted.glb | VFRB-authored |
| Pleated Skirt | School Uniform | vector template | 3D preview (approximate) | no | school-skirt.glb | Meshy |
| Button-Down | Corporate, Hospitality / Service, Industrial / Work | vector template | 3D preview (approximate) | no | work-shirt-short-sleeve-capped.glb | Meshy |
| Blouse | Corporate, Hospitality / Service | vector template | 3D preview (approximate) | no | blazer-blouse-blue.glb | Meshy |
| Blazer | Corporate | vector template | 3D preview (approximate) | no | blazer-tweed-herringbone.glb | Meshy |
| Collarless Blazer | Corporate | vector template | 3D preview (approximate) | no | collarless-blazer-long.glb | Meshy |
| Mandarin Collar | Corporate, Hospitality / Service | vector template | 3D preview (approximate) | no | mandarin-tunic-housekeeping.glb | Meshy |
| T-Shirt | Corporate, Industrial / Work | vector template | 3D preview (approximate) | no | t-shirt-male.glb | Meshy |
| Dress | Corporate, Hospitality / Service | vector template | 3D preview (approximate) | no | dress-bir-green-yellow-collar.glb | Meshy |
| Pantsuit Trousers | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Men's Slacks | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Creased Trousers | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Midi Pencil Skirt | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Short-Sleeve Notch Jacket | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Peplum Top | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Barong Shirt | Corporate | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Open-Front Blazer | Corporate | vector template (derived) | 3D preview (approximate) | no | blazer-open-front-black.glb | Meshy (derived) |
| Asymmetric Collar Blouse | Corporate | vector template (derived) | 3D preview (approximate) | no | blouse-asymmetric-blue.glb | Meshy (derived) |
| Belted Tunic Blouse | Corporate | vector template (derived) | 3D preview (approximate) | no | blouse-tunic-roundneck-blue.glb | Meshy (derived) |
| Belted Shift Dress | Corporate | vector template (derived) | 3D preview (approximate) | no | dress-butter-belted.glb | Meshy (derived) |
| Maternity Tunic Dress | Corporate | vector template (derived) | 3D preview (approximate) | no | dress-tunic-maternity-navy.glb | Meshy (derived) |
| Scrub Top | Medical / Scrubs | vector template | 3D preview (approximate) | no | scrub-top-women-short.glb | Meshy |
| Jogger Scrub Pants | Medical / Scrubs | vector template | 3D preview (approximate) | no | pants-jogger.glb | VFRB-authored |
| Lab Coat | Medical / Scrubs | vector template | 3D preview (approximate) | no | lab-coat-long.glb | Meshy |
| Lab Coverall | Medical / Scrubs, Industrial / Work | vector template | 3D preview (approximate) | no | lab-coverall-garment.glb | Meshy |
| Mandarin Blouse | Hospitality / Service | vector template | 2D design only: 3D coming | no | no garment-only GLB | - |
| Jack Shirt | Industrial / Work | vector template (derived) | 3D preview (approximate) | no | jack-shirt-two-tone.glb | Meshy (derived) |

Totals: 31 families. 0 verified, 23 approximate (3 VFRB-authored, 14 Meshy, 6 Meshy-derived), 8 "2D design only".

## Policy

1. Garment-only GLB: no human figure, skin, hair or shoes fused into the mesh. Fused figures stay in `UNSUPPORTED_3D_MODELS` and are never routed.
2. Colour mapping: either UVs with named parts, or a recorded region or zone mapping measured on the file. Geometry-threshold zones are approximate and labelled that way.
3. Licence and provenance recorded on the entry (`license`, `source`, source photo) before it is routed.
4. "3D preview available" needs a `verification: { method, date }` record from the GLB intake gate. Without one, a model is "3D preview (approximate)" at best.
5. No new model is registered without (3). No fake 3D: a garment without a model stays 2D and says so.

## Owner confirmation (to fill in)

> **TO FILL IN (Dave):** Meshy plan and terms that cover these generations (plan name, date, and whether commercial use is allowed): ________
>
> **TO FILL IN (Dave):** Confirmation that every source photo used for a Meshy generation is VFRB's own photo, or is licensed for this use: ________
