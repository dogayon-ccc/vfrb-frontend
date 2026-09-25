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

const ALL_PATTERNS = ['hstripes', 'vstripes', 'diagonal', 'checker', 'polka', 'geometric'];

// Scanned garments. Both scans face +z (the camera). `decals` marks the part that carries logos and text.
// `capabilities` is the 3D contract for the catalog/UI (what THIS real model + renderer can show); it is not a UI list.
export const SCANNED_GARMENTS = [
  {
    id: 't-shirt',
    match: /^t.?shirt$/i,
    preload: true,
    models: { male: '/models/t-shirt-male.glb', female: '/models/t-shirt-female.glb' },
    torso: { male: 0.19, female: 0.16 },
    transform: { rotation: [0, 0, 0], scale: 1.7, position: [0, -0.05, 0] },
    parts: [{ node: 'body', colorKey: 'body', decals: true, regionOf: teeRegion }],
    capabilities: {
      regionMethod: 'uv-islands', regionAccuracy: 'exact (cut panels)',
      zones: ['body', 'sleeve', 'collar'], patterns: { zones: ['body', 'sleeve', 'collar'], ids: ALL_PATTERNS },
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
      text: true, logo: true, frontBack: true, fit: ['male', 'female'],
    },
  },
];

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
];

// Contract for Account 1's data-driven catalog: what the real 3D preview can do for a garment name (+ fit).
export function get3DCapabilities(garment, fit) {
  const name = garment ?? ''; // cfg.garment is `null` for a blank/new design, not `undefined` — a default param alone doesn't catch that.
  const g = SCANNED_GARMENTS.find(x => x.match.test(name.toLowerCase()));
  if (!g) return { supported: false, model: null, reason: 'no real GLB for this garment; the preview is a generic primitive shape' };
  const key = String(fit ?? '').toLowerCase();
  const fits = g.capabilities.fit;
  return { supported: true, model: g.models[key] ?? Object.values(g.models)[0], fitApplied: fits.includes(key) ? key : fits[0], ...g.capabilities };
}

