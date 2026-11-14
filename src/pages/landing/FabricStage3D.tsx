// 3D half of FabricStage (lazy). Camera dolly and turn are pure functions of scroll progress; colours are driven by the chosen colourway.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import ScannedGarmentMesh from '../client/design-studio/ScannedGarmentMesh';
import { scannedEntryFor } from '../client/design-studio/garmentCapabilities';
import { LIGHT, KEY_POS, RIM_POS } from '../client/design-studio/lightRig';
import { weaveAll } from './fabricMaterial';
import type { Way } from './FabricStage';

const ENTRY = scannedEntryFor('Scrub Top', 'Short', 'unisex');
const HEIGHT = 1.7;
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Scroll progress 0..1 -> camera distance, camera height, garment turn. Chapters: 0-.3 hero shot, .3-.5 dolly in, .5-.65 hold, .65-1 pull back and turn.
function pose(p: number) {
  const inT = ss(0.3, 0.5, p), outT = ss(0.65, 0.95, p), turn = ss(0.66, 1, p);
  const z = mix(mix(3.6, 1.75, inT), 3.3, outT);
  const y = mix(mix(0.18, 0.42, inT), 0.14, outT);
  const rot = mix(-0.55, 0.1, ss(0, 0.3, p)) + mix(0, 0.2, inT) + turn * Math.PI * 2;
  return { z, y, rot };
}

function Model({ way, progress, onReady }: { way: Way; progress: { current: number }; onReady: () => void }) {
  const holder = useRef<THREE.Group>(null), spin = useRef<THREE.Group>(null);
  const cur = useRef({ z: 3.6, y: 0.18, rot: -0.55 }), frames = useRef(0);
  const [fit, setFit] = useState<{ s: number; c: THREE.Vector3 } | null>(null);
  const colors = useMemo(() => ({ body: way.body, sleeve: way.body, collar: way.collar, pocket: way.pocket }), [way]);

  useEffect(() => { frames.current = 0; }, [way]);
  useEffect(() => {
    if (!holder.current) return;
    const box = new THREE.Box3().setFromObject(holder.current), size = box.getSize(new THREE.Vector3());
    if (size.y > 0) { setFit({ s: HEIGHT / size.y, c: box.getCenter(new THREE.Vector3()) }); onReady(); }
  }, [onReady]);

  useFrame(({ camera, pointer }, dt) => {
    if (frames.current < 90) { frames.current++; weaveAll(holder.current); }
    const t = pose(progress.current), k = 1 - Math.exp(-dt * 6);
    const c = cur.current;
    c.z += (t.z - c.z) * k; c.y += (t.y - c.y) * k; c.rot += (t.rot - c.rot) * k;
    camera.position.set(0, c.y, c.z); camera.lookAt(0, c.y * 0.55, 0);
    if (spin.current) { spin.current.rotation.y = c.rot + pointer.x * 0.12; spin.current.rotation.x = -pointer.y * 0.05; }
  });

  return (
    <group ref={spin}>
      <group scale={fit?.s ?? 1} position={fit ? [-fit.c.x * fit.s, -fit.c.y * fit.s, -fit.c.z * fit.s] : [0, 0, 0]} visible={!!fit}>
        <group ref={holder}>
          <ScannedGarmentMesh manifest={ENTRY} colors={colors} fit="unisex" garment="Scrub Top" sleeve="Short" />
        </group>
      </group>
    </group>
  );
}

export default function FabricStage3D({ progress, way, active, onError }: { progress: { current: number }; way: Way; active: boolean; onError: () => void }) {
  const gl = useRef<THREE.WebGLRenderer | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!ENTRY) onError(); }, [onError]);
  useEffect(() => () => {
    try { const g = gl.current; if (g && !g.getContext().isContextLost()) { g.dispose(); g.forceContextLoss(); } } catch { /* already lost */ }
  }, []);
  if (!ENTRY) return null;
  return (
    <Canvas frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0.18, 3.6], fov: 30, near: 0.05, far: 30 }}
      dpr={[1, Math.min(2, window.devicePixelRatio || 1)]} style={{ opacity: ready ? 1 : 0, transition: 'opacity 600ms' }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={s => { gl.current = s.gl; s.gl.domElement.addEventListener('webglcontextlost', onError); }}>
      <hemisphereLight args={['#cfe6ef', '#0a1220', LIGHT.fill * 1.1]} />
      <directionalLight position={KEY_POS as [number, number, number]} intensity={LIGHT.key * 1.2} />
      <directionalLight position={RIM_POS as [number, number, number]} intensity={LIGHT.rim * 1.6} color="#7fe6cf" />
      <directionalLight position={[3.2, 1.2, -3]} intensity={0.9} color="#ff8a7a" />
      <Suspense fallback={null}><Model way={way} progress={progress} onReady={() => setReady(true)} /></Suspense>
      <ContactShadows position={[0, -HEIGHT / 2 - 0.02, 0]} opacity={0.5} scale={4} blur={2.8} far={1.6} frames={1} />
    </Canvas>
  );
}
