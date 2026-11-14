// 3D half of the slide show (lazy). Every template stays mounted once seen, each loads behind its own Suspense/boundary so one slow or missing GLB never blanks the stage.
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import ScannedGarmentMesh from '../client/design-studio/ScannedGarmentMesh';
import { LIGHT, KEY_POS, RIM_POS } from '../client/design-studio/lightRig';
import { modelUrl } from '../../lib/modelUrl';
import { weaveAll } from './fabricMaterial';
import type { Slide } from './FabricStage';

const HEIGHT = 1.7, GAP = 3.4;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type Cur = { current: number };

const urlOf = (s: Slide) => {
  const m = s.entry.models, k = String(s.fit ?? '').toLowerCase();
  return modelUrl(m[k] ?? Object.values(m)[0]) as string;
};

class SlotBoundary extends Component<{ onFail: () => void; children?: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.err ? null : this.props.children; }
}

function Slot({ slide, i, cur, onReady, onFail }: { slide: Slide; i: number; cur: Cur; onReady: (cat: string) => void; onFail: (cat: string) => void }) {
  const move = useRef<THREE.Group>(null), holder = useRef<THREE.Group>(null), frames = useRef(0), shown = useRef(false);
  const [fit, setFit] = useState<{ s: number; c: THREE.Vector3 } | null>(null);

  useFrame(({ clock, pointer, size }) => {
    // The mesh arrives after mount (Suspense), so measure every frame until it has real height.
    if (!shown.current && holder.current) {
      const box = new THREE.Box3().setFromObject(holder.current), sz = box.getSize(new THREE.Vector3());
      if (sz.y > 0 && Number.isFinite(sz.y)) { shown.current = true; setFit({ s: HEIGHT / sz.y, c: box.getCenter(new THREE.Vector3()) }); onReady(slide.cat); }
    }
    if (frames.current < 90) { frames.current++; weaveAll(holder.current); }
    const g = move.current;
    if (!g) return;
    const d = i - cur.current, focus = 1 - Math.min(1, Math.abs(d)), k = size.width >= 900 ? 1.16 : 0.98;
    g.visible = shown.current && Math.abs(d) < 1;
    g.position.set(d * GAP, 0, -(1 - focus) * 1.4);
    g.scale.setScalar(mix(0.7, 1, focus) * k);
    g.rotation.y = -d * 1.1 + Math.sin(clock.elapsedTime * 0.6 + i) * 0.28 * focus + pointer.x * 0.18 * focus;
    g.rotation.x = -pointer.y * 0.06 * focus;
    g.rotation.z = d * 0.05;
  });

  return (
    <group ref={move} visible={false}>
      <group scale={fit?.s ?? 1} position={fit ? [-fit.c.x * fit.s, -fit.c.y * fit.s, -fit.c.z * fit.s] : [0, 0, 0]}>
        <group ref={holder}>
          <SlotBoundary onFail={() => onFail(slide.cat)}>
            <Suspense fallback={null}>
              <ScannedGarmentMesh manifest={slide.entry} colors={slide.colors} fit={slide.fit ?? 'unisex'} garment={slide.garment} sleeve={slide.sleeve ?? 'Short'} />
            </Suspense>
          </SlotBoundary>
        </group>
      </group>
    </group>
  );
}

function Rig({ idx, cur, onSpeed }: { idx: number; cur: Cur; onSpeed: (v: number) => void }) {
  const target = useRef(idx);
  target.current = idx;
  useFrame(({ camera, size }, dt) => {
    const d = Math.min(dt, 0.05), prev = cur.current;
    cur.current += (target.current - prev) * (1 - Math.exp(-d * 3.2));
    if (Math.abs(target.current - cur.current) < 0.0005) cur.current = target.current;
    onSpeed(d > 0 ? (cur.current - prev) / d : 0);
    // 900px matches the CSS breakpoint where the copy sits right; canvas aspect is wrong on phones (canvas is only the top half).
    const wide = size.width >= 900;
    camera.position.x += ((wide ? -1.15 : 0) - camera.position.x) * 0.1;
    camera.position.y = 0.15; camera.position.z = wide ? 5 : 5.8;
    camera.lookAt(camera.position.x, 0.05, 0);
  });
  return null;
}

export default function FabricStage3D({ slides, idx, active, onSpeed, onError, onReady, onFail }: { slides: Slide[]; idx: number; active: boolean; onSpeed: (v: number) => void; onError: () => void; onReady: (cat: string) => void; onFail: (cat: string) => void }) {
  const gl = useRef<THREE.WebGLRenderer | null>(null), cur = useRef(idx), seen = useRef(new Set<number>());
  seen.current.add(idx); if (idx > 0) seen.current.add(idx - 1); if (idx < slides.length - 1) seen.current.add(idx + 1);

  // Current and next models fetch now, the rest on idle, so jumping to any slide finds its GLB cached.
  useEffect(() => {
    const first = [idx, idx + 1, idx - 1].filter(i => slides[i]);
    first.forEach(i => { try { useGLTF.preload(urlOf(slides[i])); } catch { /* the slot boundary reports it */ } });
    const t = setTimeout(() => slides.forEach(s => { try { useGLTF.preload(urlOf(s)); } catch { /* same */ } }), 1200);
    return () => clearTimeout(t);
  }, [idx, slides]);

  useEffect(() => () => {
    onSpeed(0);
    try { const g = gl.current; if (g && !g.getContext().isContextLost()) { g.dispose(); g.forceContextLoss(); } } catch { /* already lost */ }
  }, [onSpeed]);

  return (
    <Canvas frameloop={active ? 'always' : 'never'} camera={{ position: [0, 0.15, 5], fov: 30, near: 0.05, far: 40 }}
      dpr={[1, Math.min(1.75, window.devicePixelRatio || 1)]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={s => { gl.current = s.gl; s.gl.domElement.addEventListener('webglcontextlost', onError); }}>
      <hemisphereLight args={['#cfe6ef', '#0a1220', LIGHT.fill * 1.1]} />
      <directionalLight position={KEY_POS as [number, number, number]} intensity={LIGHT.key * 1.2} />
      <directionalLight position={RIM_POS as [number, number, number]} intensity={LIGHT.rim * 1.6} color="#7fe6cf" />
      <directionalLight position={[3.2, 1.2, -3]} intensity={0.9} color="#ff8a7a" />
      <Rig idx={idx} cur={cur} onSpeed={onSpeed} />
      {slides.map((s, i) => seen.current.has(i) && <Slot key={s.cat} slide={s} i={i} cur={cur} onReady={onReady} onFail={onFail} />)}
      <ContactShadows position={[0, -HEIGHT / 2 - 0.02, 0]} opacity={0.5} scale={14} blur={2.8} far={1.6} frames={1} />
    </Canvas>
  );
}
