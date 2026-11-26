import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import UvBakedGarmentMesh, { type UvBakedGarmentMeshProps } from './UvBakedGarmentMesh';
import GarmentMeshErrorBoundary from './GarmentMeshErrorBoundary';
import { LIGHT_PRESETS } from './lightRig';
import type { PanelSide } from './pilotPanels';

const CALM = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const DPR: [number, number] = window.matchMedia('(pointer: coarse)').matches ? [1, 1.5] : [1, 2];

// Turns the garment to the side whose panel is being edited (eases in ~0.3 s; reduced motion jumps).
function Turn({ side, children }: { side: PanelSide; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    const target = side === 'back' ? Math.PI : 0;
    g.rotation.y = CALM ? target : THREE.MathUtils.damp(g.rotation.y, target, 9, dt);
  });
  return <group ref={ref}>{children}</group>;
}

export interface PilotViewport3DProps extends UvBakedGarmentMeshProps { side: PanelSide; errorLabel: string }

export default function PilotViewport3D({ side, errorLabel, ...mesh }: PilotViewport3DProps) {
  const L = LIGHT_PRESETS.studio;
  return (
    <GarmentMeshErrorBoundary fallback={<div className="ps-3d-error" role="alert">{errorLabel}</div>}>
      <Canvas dpr={DPR} camera={{ position: [0, 0.1, 2.9], fov: 34 }} gl={{ antialias: true, alpha: true, toneMapping: THREE.LinearToneMapping }} style={{ width: '100%', height: '100%', background: 'transparent' }}>
        <hemisphereLight intensity={L.fill} />
        <directionalLight position={L.keyPos as [number, number, number]} intensity={L.key} />
        <directionalLight position={L.rimPos as [number, number, number]} intensity={L.rim} />
        <Suspense fallback={null}>
          <Turn side={side}><UvBakedGarmentMesh {...mesh} /></Turn>
        </Suspense>
        <ContactShadows position={[0, -0.58, 0]} opacity={0.35} scale={3} blur={2.4} far={1.2} frames={1} />
        <OrbitControls enablePan={false} minDistance={1.5} maxDistance={4.5} minPolarAngle={0.5} maxPolarAngle={2.3} />
      </Canvas>
    </GarmentMeshErrorBoundary>
  );
}
