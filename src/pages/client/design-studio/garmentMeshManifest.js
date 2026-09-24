import { useGLTF } from '@react-three/drei';

// Zone of each UV island (cut panel), measured from the real GLBs (island centroid in model units, x = left/right, y = up, z = front).
// lab-coverall body: sleeves |x| 0.36 + cuffs 0.54; neck band y 0.73; chest/lower pocket pieces z > 0.06. t-shirts: sleeves |x| >= 0.13, neck rib y > 0.19 with |x| < 0.1.
const coverallRegion = ({ n, c: [x, y, z] }) => {
  if (Math.abs(x) > 0.3) return 'sleeve';
  if (y > 0.68) return 'collar';
  if (n < 100 && z > 0.06 && y > 0.05 && y < 0.6 && Math.abs(x) < 0.2) return 'pocket';
  return 'body';
};
const teeRegion = ({ c: [x, y] }) => {
  if (Math.abs(x) > 0.12 && y > 0.05) return 'sleeve';
  if (y > 0.19 && Math.abs(x) < 0.1) return 'collar';
  return 'body';
};

// Scanned garments. Both scans face +z (the camera). `decals` marks the part that carries logos and text.
export const SCANNED_GARMENTS = [
  {
    match: /^t.?shirt$/i,
    models: { male: '/models/t-shirt-male.glb', female: '/models/t-shirt-female.glb' },
    torso: { male: 0.19, female: 0.16 },
    transform: { rotation: [0, 0, 0], scale: 1.7, position: [0, -0.05, 0] },
    parts: [{ node: 'body', colorKey: 'body', decals: true, regionOf: teeRegion }],
  },
  {
    match: /coverall|boiler.?suit/i,
    models: { default: '/models/lab-coverall.glb' },
    torso: { default: 0.2 },
    transform: { rotation: [0, 0, 0], scale: 1.3, position: [0, -0.02, 0] },
    parts: [
      { node: 'body', colorKey: 'body', decals: true, regionOf: coverallRegion },
      // The GLB's `collar` node is an interior waist band (y 0.18-0.24) hidden inside the coat, not the neck collar; it follows the body colour.
      { node: 'collar', colorKey: 'body' },
      { node: 'buttons', fixedColor: '#1a1a1a', plain: true, roughness: 0.35, metalness: 0.4 },
      { node: 'stitching', fixedColor: '#d9d3c4', plain: true, roughness: 0.9 },
    ],
  },
];

SCANNED_GARMENTS.forEach(g => Object.values(g.models).forEach(useGLTF.preload));
