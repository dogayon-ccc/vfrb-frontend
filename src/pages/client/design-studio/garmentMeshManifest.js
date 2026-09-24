import { useGLTF } from '@react-three/drei';

// Scanned garments. Both scans face +z (the camera). `decals` marks the part that carries logos and text.
export const SCANNED_GARMENTS = [
  {
    match: /^t.?shirt$/i,
    models: { male: '/models/t-shirt-male.glb', female: '/models/t-shirt-female.glb' },
    torso: { male: 0.19, female: 0.16 },
    transform: { rotation: [0, 0, 0], scale: 1.7, position: [0, -0.05, 0] },
    parts: [{ node: 'body', colorKey: 'body', decals: true }],
  },
  {
    match: /coverall|boiler.?suit/i,
    models: { default: '/models/lab-coverall.glb' },
    torso: { default: 0.2 },
    transform: { rotation: [0, 0, 0], scale: 1.3, position: [0, -0.02, 0] },
    parts: [
      { node: 'body', colorKey: 'body', decals: true },
      { node: 'collar', colorKey: 'collar' },
      { node: 'buttons', fixedColor: '#1a1a1a', plain: true, roughness: 0.35, metalness: 0.4 },
      { node: 'stitching', fixedColor: '#d9d3c4', plain: true, roughness: 0.9 },
    ],
  },
];

SCANNED_GARMENTS.forEach(g => Object.values(g.models).forEach(useGLTF.preload));
