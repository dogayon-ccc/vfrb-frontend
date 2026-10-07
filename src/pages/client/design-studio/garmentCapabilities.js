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

// Polo GLBs are single fused Meshy meshes (no UVs, no materials, no panels), so zones come from geometry only (approximate).
// Measured on both polo files: torso half-width 0.44 below the armpit (y < 0.1; the hem flares to 0.5 so sleeves also need y > 0.05), sleeves extend to |x| 0.75, collar band y > 0.78.
const poloZone = (x, y) => (Math.abs(x) > 0.46 && y > 0.05 ? 'sleeve' : y > 0.78 ? 'collar' : 'body');

// Work shirt: processed from the fused Meshy scan "Work_Uniform_Shirt with pocket on chest.glb" (source untouched) by
// tools/glb-extract/build_processed.py into processed/work-shirt-short-sleeve.glb: bare arm tubes removed with plane clips (straight sleeve
// hem / side edge) and the shirt mirrored x -> -x so the scanned chest pocket sits on the viewer's left, the same side as the 2D Button-Down
// pocket. Model faces +z (neckline dips at +z). No UVs/materials, so zones are geometry thresholds (approximate), measured on the
// processed file: collar stand y > 0.78 with |x| < 0.32, chest pocket x -0.48..-0.17 / y 0.20..0.42 on the FRONT face only (z > 0 — without
// the z test the pocket colour also painted the back of the shirt), sleeves |x| > 0.5 above the hem y 0.02.
const workShirtZone = (x, y, z) => {
  if (y > 0.78 && Math.abs(x) < 0.32) return 'collar';
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
    models: { unisex: '/models/processed/work-shirt-short-sleeve.glb' },
    torso: { unisex: 0.45 },
    transform: { rotation: [0, 0, 0], scale: 0.54, position: [0, -0.05, 0] },
    parts: [{ node: 'mesh_node', decals: true, zoneOf: workShirtZone }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (geometry thresholds, no cut panels in the GLB)',
      zones: ['body', 'sleeve', 'collar', 'pocket'], patterns: { zones: ['body', 'sleeve', 'collar'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: ['Short'], // the only sleeve length the GLB(s) actually have; other 2D styles are not shown in 3D
      text: true, logo: true, frontBack: true, fit: ['unisex'],
      // Render-verified front/back (offline raster, zone overlay); the side seam under each arm is open (hidden behind the arm in the scan) and short sleeves only (the 2D "Long" style has no 3D counterpart).
      limitations: ['open side seams under the arms', 'short sleeve only', 'front collar leaf points sit below the collar zone and take the body colour'],
    },
  },
  // Lower-body garments processed from fused Meshy figures (sources untouched; see tools/glb-extract/ and GLB-CAPABILITY-MATRIX.md §9).
  // The catalog gives these families no fit/style and only a 'body' zone, so: unisex single model, colour + pattern only, no overlays
  // (decals off: the overlay frame is body-shaped and unverified for lower garments). Scale is chosen so the longest side is ~1.05 units,
  // like the shirts; position centres the piece at the same height. Framing in the live camera is UNVERIFIED (no browser available).
  {
    id: 'pants', match: /^pants$/i,
    models: { unisex: '/models/processed/pants-trousers.glb' }, torso: { unisex: 0.19 },
    transform: { rotation: [0, 0, 0], scale: 1.35, position: [0, 0.52, 0] },
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, no cut panels in the GLB)',
      zones: ['body'], patterns: { zones: ['body'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: [],
      text: false, logo: false, frontBack: false, fit: ['unisex'],
      limitations: ['female-cut trousers scan', 'small hand-stub remnant at the left hip', 'waist and hem are straight clips of the scan (open, no waistband or hem detail)'],
    },
  },
  {
    id: 'shorts', match: /^shorts$/i,
    models: { unisex: '/models/processed/shorts-textured.glb' }, torso: { unisex: 0.215 },
    transform: { rotation: [0, 0, 0], scale: 2.45, position: [0, 0.715, 0] },
    parts: [{ node: 'mesh_node', decals: false, zoneOf: bodyOnly }],
    capabilities: {
      regionMethod: 'vertex-mask', regionAccuracy: 'approximate (single body zone, no cut panels in the GLB)',
      zones: ['body'], patterns: { zones: ['body'], ids: ALL_PATTERNS.filter(p => p !== 'geometric') },
      sleeves: [],
      text: false, logo: false, frontBack: false, fit: ['unisex'],
      limitations: ['open notch at the hip side (hand fused to the scan)', 'waist and hem are straight clips of the scan (no waistband detail)'],
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

export const SCANNED_GARMENTS = [...SCANNED_BASE, ...SCRUB_TOP];

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

// Contract for Account 1's data-driven catalog: what the real 3D preview can do for a garment name (+ fit).
export function get3DCapabilities(garment, fit) {
  const name = garment ?? ''; // cfg.garment is `null` for a blank/new design, not `undefined` — a default param alone doesn't catch that.
  const g = SCANNED_GARMENTS.find(x => x.match.test(name.toLowerCase()));
  if (!g) return { supported: false, model: null, reason: 'no real GLB for this garment; the preview is a generic primitive shape' };
  const key = String(fit ?? '').toLowerCase();
  const fits = g.capabilities.fit;
  return { supported: true, model: g.models[key] ?? Object.values(g.models)[0], fitApplied: fits.includes(key) ? key : fits[0], ...g.capabilities };
}

