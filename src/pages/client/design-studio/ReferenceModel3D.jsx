// Read-only 3D reference of a gallery photo (designGallery `ref3D`): the garment-only Meshy model of that photo, one neutral colour,
// orbit only. It shows shape, not a design: nothing here is editable and a fused set stays one piece. Lazy-loaded by InspoGallery.
import { Component, Suspense, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

function Model({ url }) {
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
  // The reference files are 1–3 MB each; drop them from the loader cache when the preview closes.
  useEffect(() => () => useGLTF.clear(url), [url]);
  return <Bounds fit clip observe margin={1.15}><Center><primitive object={object}/></Center></Bounds>;
}

export default function ReferenceModel3D({ url, height = 320 }) {
  const fallback = <p className="ds-note" style={{ textAlign: 'center' }}>The 3D reference could not load. The photo above is the reference.</p>;
  return (
    <Boundary fallback={fallback}>
      <div style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', background: '#eef2f6', touchAction: 'none' }}>
        <Canvas camera={{ position: [0, 0, 3.4], fov: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <hemisphereLight args={['#ffffff', '#6b7788', 0.75]}/>
          <directionalLight position={[1.5, 2, 3]} intensity={1.1}/>
          <directionalLight position={[-2, 1, -2]} intensity={0.45}/>
          <Suspense fallback={null}><Model url={url}/></Suspense>
          <OrbitControls makeDefault enablePan={false} minDistance={1.5} maxDistance={8}/>
        </Canvas>
      </div>
    </Boundary>
  );
}
