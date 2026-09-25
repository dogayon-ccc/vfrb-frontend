import { useGLTF } from '@react-three/drei';

// GLTF-loading side effects on top of the pure capability data (garmentCapabilities.js). Kept as
// a separate file so non-3D pages that read capability data through dsShared.js never pull
// Three.js into their bundle — see the comment at the top of garmentCapabilities.js.
export { SCANNED_GARMENTS, UNSUPPORTED_3D_MODELS, get3DCapabilities } from './garmentCapabilities';

import { SCANNED_GARMENTS } from './garmentCapabilities';

SCANNED_GARMENTS.filter(g => g.preload).forEach(g => Object.values(g.models).forEach(useGLTF.preload));
