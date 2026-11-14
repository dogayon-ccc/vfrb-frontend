// 3D half of the slide show (lazy). All garments sit on one x axis; the rig eases to the current slide and reports its speed for the motion blur.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import ScannedGarmentMesh from '../client/design-studio/ScannedGarmentMesh';
import { LIGHT, KEY_POS, RIM_POS } from '../client/design-studio/lightRig';
import { weaveAll } from './fabricMaterial';
import type { Slide } from './FabricStage';

const HEIGHT = 1.7, GAP = 3.4;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type Cur = { current: number };

function Slot({ slide, i, cur, onReady }: { slide: Slide; i: number; cur: Cur; onReady: () => void }) {
  const move = useRef<THREE.Group>(null), holder = useRef<THREE.Group>(null), frames = useRef(0);
  const [fit, setFit] = useState<{ s: number; c: THREE.Vector3 } | null>(null);

  useEffect(() => {
    if (!holder.current) return;
    const box = new THREE.Box3().setFromObject(holder.current), size = box.getSize(new THREE.Vector3());
    if (size.y > 0) { setFit({ s: HEIGHT / size.y, c: box.getCenter(new THREE.Vector3()) }); onReady(); }
  }, [onReady]);

  useFrame(({ clock, pointer }) => {
    if (frames.current < 90) { frames.current++; weaveAll(holder.current); }
    const g = move.current;
    if (!g) return;
    const d = i - cur.current, focus = 1 - Math.min(1, Math.abs(d));
    // Only the focused template and the one it is crossing to are drawn, so no stray neighbour sits at the frame edge.
    g.visible = Math.abs(d) < 1;
    g.position.set(d * GAP, 0, -(1 - focus) * 1.4);
    g.scale.setScalar(mix(0.7, 1, focus));
    g.rotation.y = -d * 1.1 + Math.sin(clock.elapsedTime * 0.6 + i) * 0.28 * focus + pointer.x * 0.18 * focus;
    g.rotation.x = -pointer.y * 0.06 * focus;
    g.rotation.z = d * 0.05;
  });

  return (
    <group ref={move}>
      <group scale={fit?.s ?? 1} position={fit ? [-fit.c.x * fit.s, -fit.c.y * fit.s, -fit.c.z * fit.s] : [0, 0, 0]} visible={!!fit}>
        <group ref={holder}>
          <ScannedGarmentMesh manifest={slide.entry} colors={slide.colors} fit={slide.fit ?? 'unisex'} garment={slide.garment} sleeve={slide.sleeve ?? 'Short'} />
        </group>
      </group>
    </group>
  );
}

function Rig({ slides, idx, cur, onSpeed }: { slides: Slide[]; idx: number; cur: Cur; onSpeed: (v: number) => void }) {
  const target = useRef(idx);
  target.current = idx;
  useFrame(({ camera, size }, dt) => {
    const d = Math.min(dt, 0.05), prev = cur.current;
    cur.current += (target.current - prev) * (1 - Math.exp(-d * 3.2));
    if (Math.abs(target.current - cur.current) < 0.0005) cur.current = target.current;
    onSpeed(d > 0 ? (cur.current - prev) / d : 0);
    // Matches the 900px CSS breakpoint where copy sits right; canvas aspect is wrong on phones (the canvas is only the top half).
    const wide = size.width >= 900;
    camera.position.x += ((wide ? -1.05 : 0) - camera.position.x) * 0.1;
    camera.position.y = 0.15; camera.position.z = wide ? 5 : 5.8;
    camera.lookAt(camera.position.x, 0.05, 0);
  });
  return null;
}

export default function FabricStage3D({ slides, idx, active, onSpeed, onError }: { slides: Slide[]; idx: number; active: boolean; onSpeed: (v: number) => void; onError: () => void }) {
  const gl = useRef<THREE.WebGLRenderer | null>(null), cur = useRef(idx);
  const [ready, setReady] = useState(false);
  const ok = useMemo(() => slides.length > 0, [slides]);
  useEffect(() => { if (!ok) onError(); }, [ok, onError]);
  useEffect(() => () => {
    onSpeed(0);
    try { const g = gl.current; if (g && !g.getContext().isContextLost()) { g.dispose(); g.forceContextLoss(); } } catch { /* already lost */ }
  }, [onSpeed]);
  if (!ok) return null;
  return (
    <Canvas frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0.15, 5], fov: 30, near: 0.05, far: 40 }}
      dpr={[1, Math.min(2, window.devicePixelRatio || 1)]} style={{ opacity: ready ? 1 : 0, transition: 'opacity 600ms' }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={s => { gl.current = s.gl; s.gl.domElement.addEventListener('webglcontextlost', onError); }}>
      <hemisphereLight args={['#cfe6ef', '#0a1220', LIGHT.fill * 1.1]} />
      <directionalLight position={KEY_POS as [number, number, number]} intensity={LIGHT.key * 1.2} />
      <directionalLight position={RIM_POS as [number, number, number]} intensity={LIGHT.rim * 1.6} color="#7fe6cf" />
      <directionalLight position={[3.2, 1.2, -3]} intensity={0.9} color="#ff8a7a" />
      <Rig slides={slides} idx={idx} cur={cur} onSpeed={onSpeed} />
      <Suspense fallback={null}>
        {slides.map((s, i) => Math.abs(i - idx) <= 1 && <Slot key={s.cat} slide={s} i={i} cur={cur} onReady={() => setReady(true)} />)}
      </Suspense>
      <ContactShadows position={[0, -HEIGHT / 2 - 0.02, 0]} opacity={0.5} scale={14} blur={2.8} far={1.6} frames={1} />
    </Canvas>
  );
}
