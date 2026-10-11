// Read-only 3D reference of a gallery photo (designGallery `ref3D`): the garment-only Meshy model of that photo or its full set, one
// neutral colour, orbit only. It shows shape, not a design: nothing here is editable and a fused set stays one piece. Lazy-loaded by
// the picker preview; one Canvas at a time, DPR capped, and its WebGL context and the model are released when the preview closes.
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DPR = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? [1, 1.5] : [1, 2];

class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

function Model({ url, onReady }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const copy = scene.clone(true);
    const material = new THREE.MeshStandardMaterial({ color: '#aab6c6', roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    copy.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.material = material;
    });
    return copy;
  }, [scene]);
  useEffect(() => { onReady?.(); }, [object, onReady]);
  // The reference files are 1-7 MB each; drop them from the loader cache when the preview closes.
  useEffect(() => () => useGLTF.clear(url), [url]);
  return <Bounds fit clip observe margin={1.15}><Center><primitive object={object}/></Center></Bounds>;
}

export default function ReferenceModel3D({ url, height = 320, onError = null, fallback = null }) {
  const [ready, setReady] = useState(false);
  const gl = useRef(null);
  useEffect(() => { setReady(false); }, [url]);
  // Release the GPU context with the preview, not when the browser gets round to it.
  useEffect(() => () => { try { gl.current?.dispose(); gl.current?.forceContextLoss(); } catch { /* already lost */ } }, []);
  const failed = fallback ?? <p className="ds-note" style={{ textAlign: 'center' }}>The 3D reference could not load. The photo is the reference.</p>;
  return (
    <Boundary fallback={failed} onError={onError}>
      <div className="ds-ref3d-stage" style={{ height }} data-ready={ready || undefined} aria-busy={!ready}>
        {!ready && <div className="ds-ref3d-skel" role="status"><span/>Loading 3D reference…</div>}
        <Canvas camera={{ position: [0, 0, 3.4], fov: 30 }} dpr={DPR} gl={{ antialias: true }} onCreated={s => { gl.current = s.gl; }}>
          <hemisphereLight args={['#ffffff', '#6b7788', 0.75]}/>
          <directionalLight position={[1.5, 2, 3]} intensity={1.1}/>
          <directionalLight position={[-2, 1, -2]} intensity={0.45}/>
          <Suspense fallback={null}><Model url={url} onReady={() => setReady(true)}/></Suspense>
          <OrbitControls makeDefault enablePan={false} minDistance={1.5} maxDistance={8}/>
        </Canvas>
      </div>
    </Boundary>
  );
}
