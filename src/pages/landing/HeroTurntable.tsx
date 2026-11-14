// Landing hero 3D: the real scrub-top GLB (female, 3/4 sleeve) drawn by the Studio's own mesh and light rig. Display only; lazy-loaded after first paint.
import { Component, type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds, Center, ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ScannedGarmentMesh from '../client/design-studio/ScannedGarmentMesh';
import { scannedEntryFor } from '../client/design-studio/garmentCapabilities';
import { LIGHT, KEY_POS, RIM_POS } from '../client/design-studio/lightRig';
import { releaseGL } from '../client/design-studio/webglSupport';

const ENTRY = scannedEntryFor('Scrub Top', '3/4', 'female');
// Institutional colours VFRB's clients order in; the first is the template's own.
const SWATCHES = [['Teal', '#028090'], ['Navy blue', '#1B2A4A'], ['Royal blue', '#2952A3'], ['Bottle green', '#006A4E'], ['Maroon', '#800000'], ['Gray', '#808080']] as const;
const paint = (hex: string) => ({ body: hex, sleeve: hex, collar: hex, pocket: hex });
const INTRO = 2.2;
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

function Model({ colors, onReady }: any) {
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
          <ScannedGarmentMesh manifest={ENTRY} colors={colors} fit="female" garment="Scrub Top" sleeve="3/4" />
        </group></Center></Turn>
      </Bounds>
      {floor !== null && <ContactShadows position={[0, floor, 0] as [number, number, number]} frames={1} opacity={0.38} scale={2.4} blur={2.6} far={1.2} />}
    </>
  );
}

export default function HeroTurntable({ visible, onReady, onError }: any) {
  const [awake, setAwake] = useState(true);
  const [swatch, setSwatch] = useState(0), [live, setLive] = useState(false);
  const gl = useRef<any>(null), sleep = useRef<ReturnType<typeof setTimeout>>();
  // Render every frame only while something moves; otherwise on demand.
  const wake = useCallback((ms) => { clearTimeout(sleep.current); setAwake(true); if (ms) sleep.current = setTimeout(() => setAwake(false), ms); }, []);
  const once = useRef(false);
  const ready = useCallback(() => {
    if (once.current) return;
    once.current = true;
    setLive(true);
    onReady();
    wake(INTRO * 1000 + 600);
  }, [onReady, wake]);
  useEffect(() => () => {
<<<<<<< HEAD
    clearTimeout(sleep.current);
    try { const g = gl.current; if (g && !g.getContext().isContextLost()) { g.dispose(); g.forceContextLoss(); } } catch { /* already lost */ }
=======
    clearTimeout(sleep.current); clearTimeout(assemble.current);
    releaseGL(gl.current);
>>>>>>> origin/ts-migration
  }, []);
  useEffect(() => { if (!ENTRY) onError(); }, [onError]);
  const pick = (i: number) => { setSwatch(i); wake(700); };
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
            <Suspense fallback={null}><Model colors={paint(SWATCHES[swatch][1])} onReady={ready} /></Suspense>
            <OrbitControls makeDefault enablePan={false} enableZoom={false} enableDamping dampingFactor={0.08}
              minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI * 0.62} onStart={() => wake(0)} onEnd={() => wake(1200)} />
          </Canvas>
        </Boundary>
        <span className="pr-tag lp-3d__chip">3D preview, approximate</span>
      </div>
      {live && (
        <div className="lp-3d__sw" role="group" aria-label="Preview colour, approximate">
          <span>Approximate preview</span>
          {SWATCHES.map(([name, hex], i) => (
            <button key={name} type="button" className="lp-3d__dot" aria-label={name} aria-pressed={swatch === i} onClick={() => pick(i)} tabIndex={visible ? 0 : -1}><i style={{ background: hex }} /></button>
          ))}
        </div>
      )}
      <figcaption>Scrub top, 3D model. The shape and colour are approximate. Drag to turn it.</figcaption>
    </figure>
  );
}
