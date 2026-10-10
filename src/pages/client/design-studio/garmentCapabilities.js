// src/pages/client/design-studio/garmentCapabilities.js
//
// Pure 3D-capability DATA: which real GLBs exist, what regions/patterns/text/logo/fit each real
// asset actually supports, and what's deliberately not wired. No Three.js / @react-three/drei
// import here on purpose — dsShared.js (imported by ~20 files, including non-3D pages like
// OrderWizard.jsx) reads get3DCapabilities() from THIS file, not from garmentMeshManifest.js,
// so pages that never open the 3D view never pull GLTFLoader/Three.js into their bundle. The
// renderer-facing GLTF loading (useGLTF, preload) lives in garmentMeshManifest.js, which
// re-exports everything from here unchanged so ScannedGarmentMesh.jsx / DesignStudio3D.jsx don't
// need to know this split exists.

// Zone of each UV island (cut panel) of the t-shirt GLBs, measured from the files (island centroid in model units; x = left/right, y = up).
// t-shirts: sleeves |x| >= 0.13, neck rib y > 0.19 with |x| < 0.1.
const teeRegion = ({ c: [x, y] }) => {
  if (Math.abs(x) > 0.12 && y > 0.05) return 'sleeve';
  if (y > 0.19 && Math.abs(x) < 0.1) return 'collar';
  return 'body';
};

// Collar stand and fall: above y 0.78 AND within 0.22 of the neck axis (`f` = regionShader.neckFrame of the model). The old flat
// y > 0.78 cut also caught the shoulder slope (|x| up to 0.31 at y 0.80), painting a collar-coloured cap over both shoulders.
// Measured on both polo scans and the work shirt from top-down vertex projections: the collar ring sits at r 0.14..0.20.
const nearNeck = (x, y, z, f) => y > 0.78 && Math.hypot(x - (f?.xc ?? 0), z - (f?.zc ?? -0.12)) < 0.22;

// Polo GLBs are single fused Meshy meshes (no UVs, no materials, no panels), so zones come from geometry only (approximate).
// Measured on both polo files: torso half-width 0.44 below the armpit (y < 0.1; the hem flares to 0.5 so sleeves also need y > 0.05), sleeves extend to |x| 0.75.
const poloZone = (x, y, z, f) => (Math.abs(x) > 0.46 && y > 0.05 ? 'sleeve' : nearNeck(x, y, z, f) ? 'collar' : 'body');

// Work shirt: processed from the fused Meshy scan "Work_Uniform_Shirt with pocket on chest.glb" (source untouched) by
// tools/glb-extract/build_processed.py into processed/work-shirt-short-sleeve.glb: bare arm tubes removed with plane clips (straight sleeve
// hem / side edge) and the shirt mirrored x -> -x so the scanned chest pocket sits on the viewer's left, the same side as the 2D Button-Down
// pocket. Model faces +z (neckline dips at +z). No UVs/materials, so zones are geometry thresholds (approximate), measured on the
// processed file: collar = nearNeck (above), chest pocket x -0.48..-0.17 / y 0.20..0.42 on the FRONT face only (z > 0 — without
// the z test the pocket colour also painted the back of the shirt), sleeves |x| > 0.5 above the hem y 0.02.
const workShirtZone = (x, y, z, f) => {
  if (nearNeck(x, y, z, f)) return 'collar';
  if (z > 0 && x > -0.48 && x < -0.17 && y > 0.2 && y < 0.42) return 'pocket';
  if (Math.abs(x) > 0.5 && y > 0.02) return 'sleeve';
  return 'body';
};

// Single-zone lower-body garments (the catalog gives Pants/Shorts/Skirt only the 'body' zone).
const bodyOnly = () => 'body';

import { GLB_SLOTS, slotLive } from './glbSlots';

const ALL_PATTERNS = ['hstripes', 'vstripes', 'diagonal', 'checker', 'polka', 'geometric'];

// Scanned garments. Both scans face +z (the camera). `decals` marks the part that carries logos and text.
// `capabilities` is the 3D contract for the catalog/UI (what THIS real model + renderer can show); it is not a UI list.
const SCANNED_BASE = [
  {
    id: 't-shirt',
    match: /^t.?shirt$/i,
    // no preload: eager-fetching the tee GLBs (~1.2 MB) cost every Polo/other 3D session; useGLTF loads on demand.
    models: { male: '/models/t-shirt-male.glb', female: '/models/t-shirt-female.glb' },
    torso: { male: 0.19, female: 0.16 },
    transform: { rotation: [0, 0, 0], scale: 1.7, position: [0, -0.05, 0] },
    parts: [{ node: 'body', colorKey: 'body', decals: true, regionOf: teeRegion }],
    capabilities: {
      regionMethod: 'uv-islands', regionAccuracy: 'exact (cut panels)',
      zones: ['body', 'sleeve', 'collar'], patterns: { zones: ['body', 'sleeve', 'collar'], ids: ALL_PATTERNS },
      sleeves: ['Short'], // the only sleeve length the GLB(s) actually have; other 2D styles are not shown in 3D
      text: true, logo: true, frontBack: true, fit: ['male', 'female'],
    },
  },
  {
    id: 'polo-shirt',
    match: /polo/i,
    models: { male: encodeURI('/models/Polo Shirt male.glb'), female: encodeURI('/models/female polo shirt.glb') },
    torso: { male: 0.44, female: 0.44 },
    transform: { rotation: [0, 0, 0], scale: 0.54, position: [0, -0.05, 0] },
    parts: [{ node: 'mesh_node', decals: true, zoneOf: poloZone }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (geometry thresholds, no cut panels in the GLB)',
      zones: ['body', 'sleeve', 'collar'], patterns: { zones: ['body', 'sleeve', 'collar'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: ['Short'], // the only sleeve length the GLB(s) actually have; other 2D styles are not shown in 3D
      text: true, logo: true, frontBack: true, fit: ['male', 'female'],
    },
  },
  {
    // Closest existing catalog family: Button-Down (Corporate; has 2D; its catalog zones already include 'pocket').
    // Unisex source, single model entry. Raw height matches the polo scan, so the polo scale (0.54) is reused.
    id: 'work-shirt',
    match: /button-down/i,
    models: { unisex: '/models/processed/work-shirt-short-sleeve-capped.glb' },
    torso: { unisex: 0.45 },
    transform: { rotation: [0, 0, 0], scale: 0.54, position: [0, -0.05, 0] },
    parts: [{ node: 'mesh_node', decals: true, zoneOf: workShirtZone }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (geometry thresholds, no cut panels in the GLB)',
      zones: ['body', 'sleeve', 'collar', 'pocket'], patterns: { zones: ['body', 'sleeve', 'collar'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: ['Short'], // the only sleeve length the GLB(s) actually have; other 2D styles are not shown in 3D
      text: true, logo: true, frontBack: true, fit: ['unisex'],
      // Live renderer check: continuous front/three-quarter garment, with small scan-cut irregularities still visible at the side/hem.
      limitations: ['short sleeve only', 'small scan-cut irregularities remain at the side and hem', 'front collar leaf points sit below the collar zone and take the body colour', 'no arbitrary fabric-texture upload'],
    },
  },
  // Lower-body garments processed from fused Meshy figures (sources untouched; see tools/glb-extract/ and GLB-CAPABILITY-MATRIX.md §9).
  // The catalog gives these families no fit/style and only a 'body' zone, so: unisex single model, colour + pattern only, no overlays
  // (decals off: the overlay frame is body-shaped and unverified for lower garments). Scale is chosen so the longest side is ~1.05 units,
  // like the shirts; position centres the piece at the same height. Framing in the live camera is UNVERIFIED (no browser available).
  // Pants and Shorts: garment-only Meshy models generated from the gallery product photos `pants` and `shorts` (staged copies of
  // asset-staging/mesh-3d/{pants,shorts}.glb, byte-identical). Chosen over processed/pants-trousers.glb and processed/shorts-textured.glb
  // (cuts of fused figures: ragged waist, hand-stub notch) after front/side/back renders of all candidates. Centred at the origin,
  // front faces +z; scale gives the trousers the old ~0.97-unit height and keeps each model's own proportions (they match the photos).
  // `sourcePhoto` = the gallery photo the model was generated from, so that photo can say it has a real 3D model.
  {
    id: 'pants', match: /^pants$/i, sourcePhoto: 'pants',
    models: { unisex: '/models/vfrb-staged/pants.glb' }, torso: { unisex: 0.40 },
    transform: { rotation: [0, 0, 0], scale: 0.509, position: [0, -0.05, 0] },
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
      zones: ['body'], patterns: { zones: ['body'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: [],
      text: false, logo: false, frontBack: false, fit: ['unisex'],
      limitations: ['one body colour: waistband, belt loops, pockets and the button are modelled shapes, not separately colourable parts', 'no text or logos in 3D (overlay placement is unverified on trousers)', 'straight-leg cut only (the model of the Dress Slacks photo)', 'no arbitrary fabric-texture upload'],
    },
  },
  {
    id: 'shorts', match: /^shorts$/i, sourcePhoto: 'shorts',
    models: { unisex: '/models/vfrb-staged/shorts.glb' }, torso: { unisex: 0.61 },
    transform: { rotation: [0, 0, 0], scale: 0.42, position: [0, -0.05, 0] },
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
      zones: ['body'], patterns: { zones: ['body'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: [],
      text: false, logo: false, frontBack: false, fit: ['unisex'],
      limitations: ['one body colour: waistband, button, pleats and pockets are modelled shapes, not separately colourable parts', 'no text or logos in 3D', 'pleated school-shorts cut only (the model of the School Shorts photo); fine fabric wrinkles are baked into the geometry', 'no arbitrary fabric-texture upload'],
    },
  },
  {
    id: 'skirt', match: /^skirt$/i,
    models: { unisex: '/models/processed/skirt-pencil.glb' }, torso: { unisex: 0.183 },
    transform: { rotation: [0, 0, 0], scale: 2.85, position: [0, 0.734, 0] },
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, no cut panels in the GLB)',
      zones: ['body'], patterns: { zones: ['body'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: [],
      text: false, logo: false, frontBack: false, fit: ['unisex'],
      limitations: ['low-poly (1.3k vertices) pencil skirt', 'waist and hem are straight clips of the scan (no waistband detail)'],
    },
  },
];

// Scrub Top: Meshy scrub-set scans split by mesh connectivity into top and trousers (tools/glb-intake/glbtools.py); only the top is served.
// Fused mesh, no UVs or materials: the 3D contract is the 2D photo base's contract, one body colour. Models come from the exact photo-base slots in glbSlots.js.
const SCRUB_TOP_SLOTS = [['female', 'scrub-top-women-short'], ['male', 'scrub-top-men-short']].filter(([, id]) => slotLive(GLB_SLOTS[id]));
const SCRUB_TOP = SCRUB_TOP_SLOTS.length ? [{
  id: 'scrub-top',
  match: /^scrub top$/i,
  models: Object.fromEntries(SCRUB_TOP_SLOTS.map(([fit, id]) => [fit, GLB_SLOTS[id].file])),
  torso: { female: 0.33, male: 0.38 },
  transform: { rotation: [0, 0, 0], scale: 0.72, position: [0, 0, 0] },
  parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
  capabilities: {
    regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
    zones: ['body'], patterns: { zones: [], ids: [] },
    sleeves: ['Short'],
    text: false, logo: false, frontBack: false, fit: SCRUB_TOP_SLOTS.map(([fit]) => fit),
    limitations: ['one body colour only: the fused scan has no separate collar, sleeve or trim parts', 'no text, logos or patterns in 3D (the 2D photo base has none either)', 'short sleeve only', 'fused scan surface: fine seams and wrinkles are baked into the geometry'],
  },
}] : [];

// Mandarin Collar / Short: the housekeeping scrub suit scan split like the scrub tops (component 0 = tunic, trousers dropped). Exact slot of the 'mandarin-tunic-housekeeping' photo base only;
// `exactSleeve` stops the Long-sleeve BIR blouse base (a different template with no GLB) from ever showing this model.
const MANDARIN_TUNIC = slotLive(GLB_SLOTS['mandarin-tunic-housekeeping']) ? [{
  id: 'mandarin-tunic',
  match: /^mandarin collar$/i,
  exactSleeve: true,
  models: { female: GLB_SLOTS['mandarin-tunic-housekeeping'].file },
  torso: { female: 0.3 },
  transform: { rotation: [0, 0, 0], scale: 0.8, position: [0, 0, 0] },
  parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
  capabilities: {
    regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
    zones: ['body'], patterns: { zones: [], ids: [] },
    sleeves: ['Short'],
    text: false, logo: false, frontBack: false, fit: ['female'],
    limitations: ['one body colour only: the fused scan has no separate collar band, cuff or button parts, so the 2D trim colour is not shown in 3D', 'no text, logos or patterns in 3D', 'short sleeve only (the long-sleeve BIR blouse base has no 3D model)', 'fused scan surface: fine seams and wrinkles are baked into the geometry'],
  },
}] : [];

// Round Neck / Short: the fuchsia blouse-and-trousers scan is one connected mesh, so it is a spatial cut (plane clip at the blouse hem, tools/glb-extract/cutlib.py), not a component split.
// Exact slot of the 'round-neck-fuchsia-short' photo base only; Long has no base and no model.
const ROUND_NECK = slotLive(GLB_SLOTS['round-neck-fuchsia-short']) ? [{
  id: 'round-neck-fuchsia',
  match: /^round neck$/i,
  exactSleeve: true,
  models: { female: GLB_SLOTS['round-neck-fuchsia-short'].file },
  torso: { female: 0.25 },
  transform: { rotation: [0, 0, 0], scale: 1.28, position: [0, 0, 0] },
  parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
  capabilities: {
    regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
    zones: ['body'], patterns: { zones: [], ids: [] },
    sleeves: ['Short'],
    text: false, logo: false, frontBack: false, fit: ['female'],
    limitations: ['one body colour only: the fused scan has no separate collar, sleeve or trim parts', 'no text, logos or patterns in 3D (the 2D photo base has none either)', 'short sleeve only (no long-sleeve base exists)', 'trousers were cut off at the blouse hem; a small waist tab and the scan\'s fine wrinkles are baked into the geometry'],
  },
}] : [];

// Button-Down / Long: the BIR blue blouse. One connected blouse-and-trousers scan, so a spatial cut at the hem (centroid cut + plane slice at y = 0.134, tools/glb-extract/cutlib.py), not a component split.
// Separate template of the Button-Down family, selected by Fit = Female + Long: the vector Button-Down template (unisex) is untouched and stays the default. Its photo base is cut from the same worn-model photo as the GLB. `exactSleeve` + fit ['female'] keep it from ever applying to the unisex work shirt.
const BIR_BLOUSE = slotLive(GLB_SLOTS['button-down-bir-long']) ? [{
  id: 'button-down-bir-blouse',
  match: /^button-down$/i,
  exactSleeve: true,
  models: { female: GLB_SLOTS['button-down-bir-long'].file },
  torso: { female: 0.2 },
  transform: { rotation: [0, 0, 0], scale: 1.2, position: [0, 0, 0] },
  parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
  capabilities: {
    regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
    zones: ['body'], patterns: { zones: [], ids: [] },
    sleeves: ['Long'],
    text: false, logo: false, frontBack: false, fit: ['female'],
    limitations: ['one body colour only: the fused scan has no separate collar, cuff or button parts', 'no text, logos or patterns in 3D (the 2D photo base has none either)', 'long sleeve only (the short-sleeve work shirt is a different model)', 'trousers were cut off at the blouse hem; a thin strip of trouser top can remain under the hem, and the scan\'s fine wrinkles are baked into the geometry'],
  },
}] : [];

// Button-Down / Long (unisex): garment-only Meshy model of the gallery photo `shirt-utility-beige-long` (staged copy of asset-staging/mesh-3d,
// byte-identical). Fused mesh, no UVs; zones are geometry thresholds measured on the file: the long sleeves hang beside the torso
// (torso half-width ~0.37, open gap at |x| 0.34..0.42 from y -0.2 to -0.7), so sleeve = |x| > 0.40 below the shoulder line y 0.62;
// collar = nearNeck. Its two chest flap pockets are modelled shapes, so the 2D pocket colour is not shown in 3D (pocket stays 2D only).
// exactSleeve + fit ['unisex'] keep it off Short (work shirt) and off the female BIR blouse.
const utilityZone = (x, y, z, f) => (nearNeck(x, y, z, f) ? 'collar' : Math.abs(x) > 0.4 && y < 0.62 ? 'sleeve' : 'body');
const UTILITY_LONG = [{
  id: 'button-down-utility-long',
  match: /^button-down$/i,
  exactSleeve: true,
  sourcePhoto: 'shirt-utility-beige-long',
  models: { unisex: '/models/vfrb-staged/shirt-utility-beige-long.glb' },
  torso: { unisex: 0.37 },
  transform: { rotation: [0, 0, 0], scale: 0.54, position: [0, -0.05, 0] },
  parts: [{ node: 'mesh_node', decals: true, zoneOf: utilityZone }],
  capabilities: {
    regionMethod: 'vertex-mask', regionAccuracy: 'approximate (geometry thresholds, no cut panels in the GLB)',
    zones: ['body', 'sleeve', 'collar'], patterns: { zones: ['body', 'sleeve', 'collar'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
    sleeves: ['Long'],
    text: true, logo: true, frontBack: true, fit: ['unisex'],
    limitations: ['long sleeve only (Short uses the work-shirt model)', 'two chest flap pockets are modelled shapes: the 2D pocket colour is not shown in 3D', 'heavy fabric wrinkles and a banded hem are baked into the geometry', 'sleeve/body boundary is a geometry threshold where the sleeves touch the torso', 'front collar points sit below the collar zone and take the body colour'],
  },
}];

// Corporate and school families added with their own vector templates (garmentPaths.js) because a garment-only Meshy model of a
// gallery photo of that exact garment exists. Staged copies of asset-staging/mesh-3d (byte-identical). All are fused single meshes
// with no UVs, materials or separate parts, centred at the origin and facing +z (checked in 0/45/135/180 renders): one body colour
// plus procedural patterns; collar, sleeve and pocket colours stay 2D only. exactSleeve entries keep each model on its own sleeve.
const bodyCaps = (sleeves, extra = []) => ({
  regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, fused mesh with no cut panels in the GLB)',
  zones: ['body'], patterns: { zones: ['body'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
  sleeves, text: false, logo: false, frontBack: false, fit: ['female'],
  limitations: ['one body colour: lapels, collar, sleeves, buttons and pockets are modelled shapes, not separately colourable parts', 'no text or logos in 3D', ...extra, 'no arbitrary fabric-texture upload'],
});
const TOP_T = { rotation: [0, 0, 0], scale: 0.54, position: [0, -0.05, 0] };
const CORPORATE_MODELS = [
  { id: 'blazer-long', match: /^blazer$/i, exactSleeve: true, sourcePhoto: 'blazer-tweed-herringbone',
    models: { female: '/models/vfrb-staged/blazer-tweed-herringbone.glb' }, torso: { female: 0.45 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: bodyCaps(['Long'], ['notch-lapel, three-button cut with flap pockets (the model of the tweed blazer photo); the tweed weave is not modelled']) },
  { id: 'blazer-three-quarter', match: /^blazer$/i, exactSleeve: true, sourcePhoto: 'blazer-white-notch',
    models: { female: '/models/vfrb-staged/blazer-white-notch.glb' }, torso: { female: 0.45 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: bodyCaps(['3/4'], ['notch-lapel, two-button cut (the model of the white notch blazer photo)']) },
  { id: 'blouse-notch-short', match: /^blouse$/i, exactSleeve: true, sourcePhoto: 'blazer-blouse-blue',
    models: { female: '/models/vfrb-staged/blazer-blouse-blue.glb' }, torso: { female: 0.42 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: bodyCaps(['Short'], ['notch-collar, button-front short-sleeve cut (the model of the notch-collar blouse photo)']) },
  { id: 'dress-collared-short', match: /^dress$/i, exactSleeve: true, sourcePhoto: 'dress-bir-green-yellow-collar',
    models: { female: '/models/vfrb-staged/dress-bir-green-yellow-collar.glb' }, torso: { female: 0.36 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: bodyCaps(['Short'], ['collared, button-front short-sleeve sheath (the model of the BIR shirt-dress photo); the contrast collar is not a separate part']) },
  { id: 'pleated-skirt', match: /^pleated skirt$/i, sourcePhoto: 'school-skirt',
    models: { unisex: '/models/vfrb-staged/school-skirt.glb' }, torso: { unisex: 0.56 }, transform: { rotation: [0, 0, 0], scale: 0.53, position: [0, -0.05, 0] },
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: { ...bodyCaps([], ['knife-pleated mini skirt (the model of the pleated school skirt photo)']), fit: ['unisex'] } },
];

// Medical models generated by the owner in Meshy (2026-10-10) from reference photos in the repo root (lab coat.jpg, lab coverall.jpg,
// missing sleeve variants.jpg); staged byte-identical in asset-staging/mesh-3d as lab-coat.glb, lab-coverall.glb, missing-sleeve-variants.glb.
// Garment-only (checked in 0/45/90/180 renders: no head, hands, mannequin or hanger), one fused mesh, no UVs/materials: one body colour
// plus patterns; pockets, lapels, cuffs and buttons are modelled shapes. The legacy /models/lab-coverall.glb (hooded human figure) stays
// in UNSUPPORTED_3D_MODELS and is never rendered.
const MEDICAL_MODELS = [
  { id: 'lab-coat-long', match: /^lab coat$/i, exactSleeve: true,
    models: { unisex: '/models/vfrb-staged/lab-coat-long.glb' }, torso: { unisex: 0.42 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: { ...bodyCaps(['Long'], ['knee-length, notch-lapel, button-front cut with one chest and two lower patch pockets']), fit: ['unisex'], pocket2D: true } },
  { id: 'lab-coverall', match: /^lab coverall$/i, exactSleeve: true,
    models: { unisex: '/models/vfrb-staged/lab-coverall-garment.glb' }, torso: { unisex: 0.3 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: { ...bodyCaps(['Long'], ['one-piece full-length coverall (point collar, two flap chest pockets, waist seam); never part of a top + bottom set']), fit: ['unisex'], pocket2D: true } },
  { id: 'scrub-top-women-three-quarter', match: /^scrub top$/i, exactSleeve: true,
    models: { female: '/models/vfrb-staged/scrub-top-women-three-quarter.glb' }, torso: { female: 0.36 }, transform: TOP_T,
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: bodyCaps(['3/4'], ['V-neck scrub top with chest pocket, ribbed 3/4 cuffs and side slits (women\'s cut)']) },
];

export const SCANNED_GARMENTS = [...SCANNED_BASE, ...SCRUB_TOP, ...MANDARIN_TUNIC, ...ROUND_NECK, ...BIR_BLOUSE, ...UTILITY_LONG, ...CORPORATE_MODELS, ...MEDICAL_MODELS];

// The 3D entry generated from a gallery photo (`sourcePhoto`), if any.
export const modelFromPhoto = id => SCANNED_GARMENTS.find(x => x.sourcePhoto === id) ?? null;

// The one scanned entry a (garment, sleeve, fit) resolves to. An `exactSleeve` entry is a specific photo template: it wins only for a sleeve AND a fit it really has
// (an explicit fit must be listed, so Button-Down unisex never lands on the women's BIR blouse). The family's general entry applies otherwise.
// Studio 3D, the catalog and the capability contract all read this, so they cannot disagree.
// Fit match for exact-sleeve models: no fit asked, or the model has that fit, or the model is unisex (serves male and female alike).
// Exact-fit models are tried before unisex ones (see scannedEntryFor), so a female-only model still wins for a female selection.
const fitExact = (x, f) => !f || !x.exactSleeve || x.capabilities.fit.includes(f);
const fitOk = (x, f) => fitExact(x, f) || x.capabilities.fit.includes('unisex');
// A model serves a sleeve only if it has that sleeve; garments without sleeve styles (bottoms) accept any.
const sleeveOk = (x, s) => !s || !(x.capabilities.sleeves?.length) || x.capabilities.sleeves.includes(s);
// The one model-routing rule (Studio 3D, capability labels, Order Wizard and Order Detail previews all call this).
// With a sleeve, the model must really have that sleeve (exact-sleeve photo-base models first, then the family model);
// otherwise null, and the selection is 2D only. A short-sleeve scan is never shown for a long or 3/4 sleeve design.
// Without a sleeve (family-level lookups) the family model, or an exact-sleeve model of that fit, is returned.
export function scannedEntryFor(garment, sleeve, fit) {
  const name = String(garment ?? '').toLowerCase(), f = String(fit ?? '').toLowerCase();
  const cands = SCANNED_GARMENTS.filter(x => x.match.test(name));
  const exactSleeve = fit => sleeve && cands.find(x => x.exactSleeve && x.capabilities.sleeves.includes(sleeve) && fit(x, f));
  return exactSleeve(fitExact) || exactSleeve(fitOk)
    || cands.find(x => !x.exactSleeve && sleeveOk(x, sleeve))
    || (!sleeve && (cands.find(x => x.exactSleeve && fitExact(x, f)) || cands.find(x => x.exactSleeve && fitOk(x, f)))) || null;
}
// True when this exact selection (garment + sleeve + fit) has a real 3D model.
export const has3DModel = (garment, sleeve, fit) => !!scannedEntryFor(garment, sleeve, fit);
// Sleeve styles that really have a 3D model for this garment at this fit (union over the entries that apply). The single source for every "sleeve is 2D only" label.
export function sleeves3DFor(garment, fit) {
  const name = String(garment ?? '').toLowerCase(), f = String(fit ?? '').toLowerCase();
  return [...new Set(SCANNED_GARMENTS.filter(x => x.match.test(name) && fitOk(x, f)).flatMap(x => x.capabilities.sleeves ?? []))];
}
// Every fit any scanned entry of the family offers, in entry order (general model first). Button-Down: unisex (work shirt) then female (BIR blouse).
export function fitsFor(garment) {
  const name = String(garment ?? '').toLowerCase();
  return [...new Set(SCANNED_GARMENTS.filter(x => x.match.test(name)).flatMap(x => x.capabilities.fit ?? []))];
}

// Real GLBs present in public/models that are NOT wired: each is a full human figure fused with its clothes in one mesh with no
// materials, UVs or vertex groups, so a garment colour would also colour skin, hair and shoes. See docs/engineering/GLB-CAPABILITY-MATRIX.md.
export const UNSUPPORTED_3D_MODELS = [
  { file: 'lab-coverall.glb', appearsToBe: 'hooded coverall on a human figure', reason: 'fused human figure, single mesh, no materials/UVs' },
  { file: 'Blue_Blouse_and_Gray Pants.glb', appearsToBe: 'blouse + pants on a human figure', reason: 'fused human figure, single mesh, no materials/UVs; no 2D definition' },
  { file: 'Blue_Linen_Shift_Dress.glb', appearsToBe: 'shift dress on a human figure', reason: 'fused human figure, single mesh, no materials/UVs; no 2D definition' },
  { file: 'Blue_Service_Uniform.glb', appearsToBe: 'short-sleeve shirt + trousers on a human figure', reason: 'fused human figure, single mesh, no materials/UVs; no 2D definition' },
  { file: 'Navy_Blue_Peplum_Dress.glb', appearsToBe: 'peplum top + skirt on a human figure', reason: 'fused human figure, single mesh, no materials/UVs; no 2D definition' },
  { file: 'Navy_Textured_Short.glb', appearsToBe: 'short-sleeve shirt + shorts on a human figure', reason: 'fused human figure, single mesh, no materials/UVs' },
  { file: 'Pink_Professional_Uni.glb', appearsToBe: 'blouse + trousers on a human figure', reason: 'fused human figure, single mesh, no materials/UVs; no 2D definition' },
  // Added to public/models this session, present on disk but never previously entered here — the
  // capability data was silently out of date with what's actually shipped in the bundle. Verdicts
  // are STATIC evidence (pygltflib: mesh/material/UV structure + per-height-slice x-extent scan for
  // a leg-bifurcation gap), not BROWSER-rendered — see GLB-CAPABILITY-MATRIX.md §7 for the method
  // and full per-slice data.
  { file: 'Female dress uniform.glb', appearsToBe: 'dress uniform on a human figure', reason: 'fused human figure (leg-bifurcation confirmed), single mesh, no materials/UVs; no 2D definition' },
  { file: 'Female full set corporate uniform and trousers.glb', appearsToBe: 'blazer + trousers on a human figure', reason: 'fused human figure (leg-bifurcation confirmed), single mesh, no materials/UVs; no 2D definition' },
  { file: 'Female teacher uniform (upper and pants).glb', appearsToBe: 'blouse + pants on a human figure', reason: 'fused human figure (leg-bifurcation confirmed), single mesh, no materials/UVs; no 2D definition' },
  { file: 'Female_Cream_Dress_with_Bow.glb', appearsToBe: 'dress on a human figure', reason: 'fused human figure (leg-bifurcation confirmed), single mesh, no materials/UVs; no 2D definition' },
  { file: 'Full set uniform female blazers plus slacks.glb', appearsToBe: 'blazer + slacks on a human figure', reason: 'fused human figure (leg-bifurcation confirmed), single mesh, no materials/UVs; no 2D definition' },
  { file: 'Male Full set uniform polo shirt and pants.glb', appearsToBe: 'polo + pants on a human figure', reason: 'fused human figure (leg-bifurcation confirmed), single mesh, no materials/UVs; no 2D definition' },
];

// Present in public/models, not a fused figure by either static or visual/rendered evidence, but
// not yet promoted to SCANNED_GARMENTS: same reasons as any entry that moves out of this list once
// verified. Currently empty — Work_Uniform_Shirt with pocket on chest.glb was the only entry and
// has been promoted to SCANNED_GARMENTS this session (garment-only confirmed by a real shaded
// raster render, not just static mesh stats — see GLB-CAPABILITY-MATRIX.md §9). Kept as an export
// (rather than deleted) so a future candidate has a place to land without inventing a new list.
export const PENDING_3D_MODELS = [];

// Patterns a scanned entry really paints: only its listed zones and ids; everything else stays solid in 3D while the 2D design keeps it.
export function patternsFor3D(entry, patterns, { photoBase = false } = {}) {
  if (photoBase) return Object.fromEntries(Object.keys(patterns ?? {}).map(z => [z, 'solid']));
  const { zones = [], ids = [] } = entry?.capabilities?.patterns ?? {};
  return Object.fromEntries(Object.entries(patterns ?? {}).map(([z, id]) => [z, zones.includes(z) && ids.includes(id) ? id : 'solid']));
}

// Contract for Account 1's data-driven catalog: what the real 3D preview can do for a garment name (+ fit).
export function get3DCapabilities(garment, fit, sleeve) {
  const name = garment ?? ''; // cfg.garment is `null` for a blank/new design, not `undefined` — a default param alone doesn't catch that.
  const g = scannedEntryFor(name, sleeve, fit);
  if (!g) return { supported: false, model: null, reason: 'no real GLB for this garment; the preview is a generic primitive shape' };
  const key = String(fit ?? '').toLowerCase();
  const fits = g.capabilities.fit;
  return { supported: true, model: g.models[key] ?? Object.values(g.models)[0], fitApplied: fits.includes(key) ? key : fits[0], customFabricTextures: false, ...g.capabilities };
}

