// Landing hero 3D: the VFRB-authored Scrub Top drawn by the Studio's own mesh and light rig. Display only; lazy-loaded after first paint.
import { Component, type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds, Center, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ScannedGarmentMesh from '../client/design-studio/ScannedGarmentMesh';
import { scannedEntryFor } from '../client/design-studio/garmentCapabilities';
import { LIGHT, KEY_POS, RIM_POS } from '../client/design-studio/lightRig';

const ENTRY = scannedEntryFor('Scrub Top', 'Short', 'unisex');
const COLORS = { body: '#028090', sleeve: '#028090', collar: '#1B2A4A', pocket: '#046A78' };
const INTRO = 2.2, ASSEMBLE_AT = 1100;
const ease = t => 1 - (1 - t) ** 3;

class Boundary extends Component<{ onError: () => void; children?: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.err ? null : this.props.children; }
}

// One turn from the back to the front, eased out; afterwards the visitor's drag takes over.
function Turn({ children }: any) {
  const ref = useRef(null), t = useRef(0);
  useFrame((_, dt) => {
    if (t.current >= 1 || !ref.current) return;
    t.current = Math.min(1, t.current + dt / INTRO);
    ref.current.rotation.y = (1 - ease(t.current)) * -Math.PI * 1.2;
  });
  return <group ref={ref} rotation-y={-Math.PI * 1.2}>{children}</group>;
}

function Model({ exploded, onReady }: any) {
  const ref = useRef(null);
  const [floor, setFloor] = useState(null);
  useEffect(() => {
    if (ref.current) setFloor(new THREE.Box3().setFromObject(ref.current).min.y - 0.01);
    onReady();
  }, [onReady]);
  return (
    <>
      <Bounds fit clip margin={1.45}>
        <Turn><Center><group ref={ref}>
          <ScannedGarmentMesh manifest={ENTRY} colors={COLORS} fit="unisex" garment="Scrub Top" sleeve="Short" exploded={exploded} />
        </group></Center></Turn>
      </Bounds>
      {floor !== null && <ContactShadows position={[0, floor, 0] as [number, number, number]} frames={1} opacity={0.38} scale={2.4} blur={2.6} far={1.2} />}
    </>
  );
}

export default function HeroTurntable({ visible, onReady, onError }: any) {
  const [exploded, setExploded] = useState(true);
  const [awake, setAwake] = useState(true);
  const gl = useRef<any>(null), sleep = useRef<ReturnType<typeof setTimeout>>(), assemble = useRef<ReturnType<typeof setTimeout>>();
  // Render every frame only while something moves; otherwise on demand.
  const wake = useCallback((ms) => { clearTimeout(sleep.current); setAwake(true); if (ms) sleep.current = setTimeout(() => setAwake(false), ms); }, []);
  const once = useRef(false);
  const ready = useCallback(() => {
    if (once.current) return;
    once.current = true;
    onReady();
    wake(INTRO * 1000 + 600);
    assemble.current = setTimeout(() => setExploded(false), ASSEMBLE_AT);
  }, [onReady, wake]);
  useEffect(() => () => {
    clearTimeout(sleep.current); clearTimeout(assemble.current);
    try { const g = gl.current; if (g && !g.getContext().isContextLost()) { g.dispose(); g.forceContextLoss(); } } catch { /* already lost */ }
  }, []);
  useEffect(() => { if (!ENTRY) onError(); }, [onError]);
  const toggle = () => { clearTimeout(assemble.current); setExploded(v => !v); wake(900); };
  if (!ENTRY) return null;
  return (
    <figure className="lp-3d" aria-hidden={!visible || undefined}>
      <div className="pr-stage lp-3d__stage">
        <Boundary onError={onError}>
          <Canvas frameloop={awake && visible ? 'always' : 'demand'} camera={{ position: [0, 0.1, 3.6] as [number, number, number], fov: 32 }}
            dpr={[1, 2]} gl={{ antialias: true, alpha: true, toneMapping: THREE.LinearToneMapping, toneMappingExposure: 1 }}
            onCreated={(s) => { gl.current = s.gl; s.gl.domElement.addEventListener('webglcontextlost', onError); }}>
            <hemisphereLight intensity={LIGHT.fill} />
            <directionalLight position={KEY_POS as [number, number, number]} intensity={LIGHT.key} />
            <directionalLight position={RIM_POS as [number, number, number]} intensity={LIGHT.rim} />
            <Suspense fallback={null}><Model exploded={exploded} onReady={ready} /></Suspense>
            <OrbitControls makeDefault enablePan={false} enableZoom={false} enableDamping dampingFactor={0.08}
              minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI * 0.62} onStart={() => wake(0)} onEnd={() => wake(1200)} />
          </Canvas>
        </Boundary>
        <span className="pr-tag lp-3d__chip">3D preview, approximate</span>
        <button type="button" className="lp-3d__btn" aria-pressed={exploded} onClick={toggle} tabIndex={visible ? 0 : -1}>
          {exploded ? 'Put it together' : 'Take it apart'}
        </button>
      </div>
      <figcaption>Scrub top, VFRB&rsquo;s own 3D model of the Studio template. The shape is approximate. Drag to turn it.</figcaption>
    </figure>
  );
}
