// Read-only 3D reference of a gallery photo (designGallery `ref3D`): the garment-only Meshy model of that photo or its full set, one
// neutral colour, orbit only. It shows shape, not a design: nothing here is editable and a fused set stays one piece. Lazy-loaded by
// the picker preview; one Canvas at a time, DPR capped, and its WebGL context and the model are released when the preview closes.
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ensureZoneMask, createZoneUniforms, setZoneUniforms, patchZoneMaterial } from './regionShader';
import { partMaterial } from './ScannedGarmentMesh';
import { refZoneOf } from './referenceColour';
import { LIGHT, KEY_POS, RIM_POS } from './lightRig';

const DPR = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? [1, 1.5] : [1, 2];

class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

// `colors` null = the neutral shape preview; otherwise a colour preview through the Studio's calibrated zone-mask material (one body
// colour, or Top/Bottom for a set split at `split`). Colour changes only update uniforms; nothing recompiles.
function Model({ url, onReady, colors = null, split = null }) {
  const { scene } = useGLTF(url);
  const { object, neutral } = useMemo(() => {
    const copy = scene.clone(true);
    const material = new THREE.MeshStandardMaterial({ color: '#aab6c6', roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    copy.traverse(o => {
      if (!o.isMesh) return;
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
      o.material = material;
    });
    return { object: copy, neutral: material };
  }, [scene]);
  const zone = useMemo(() => {
    const uniforms = createZoneUniforms();
    object.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.computeBoundingBox();
      ensureZoneMask(o.geometry, refZoneOf(split, o.geometry.boundingBox));
    });
    return { uniforms, material: patchZoneMaterial(partMaterial('#ffffff', { zoneOf: true }), uniforms) };
  }, [object, split]);
  useEffect(() => {
    if (colors) setZoneUniforms(zone.uniforms, { colors, pxToModel: 0.005 });
    object.traverse(o => { if (o.isMesh) o.material = colors ? zone.material : neutral; });
  }, [colors, zone, object, neutral]);
  useEffect(() => () => { zone.material.dispose(); neutral.dispose(); }, [zone, neutral]);
  useEffect(() => { onReady?.(); }, [object, onReady]);
  // The reference files are 1-7 MB each; drop them from the loader cache when the preview closes.
  useEffect(() => () => useGLTF.clear(url), [url]);
  return <Bounds fit clip observe margin={1.15}><Center><primitive object={object}/></Center></Bounds>;
}

export default function ReferenceModel3D({ url, height = 320, onError = null, fallback = null, colors = null, split = null }) {
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
        <Canvas camera={{ position: [0, 0, 3.4], fov: 30 }} dpr={DPR} gl={{ antialias: true, toneMapping: THREE.LinearToneMapping, toneMappingExposure: 1 }} onCreated={s => { gl.current = s.gl; }}>
          {/* The Studio's calibrated rig, so a previewed colour matches the editable 3D view */}
          <hemisphereLight intensity={LIGHT.fill}/>
          <directionalLight position={KEY_POS} intensity={LIGHT.key}/>
          <directionalLight position={RIM_POS} intensity={LIGHT.rim}/>
          <Suspense fallback={null}><Model url={url} colors={colors} split={split} onReady={() => setReady(true)}/></Suspense>
          <OrbitControls makeDefault enablePan={false} minDistance={1.5} maxDistance={8}/>
        </Canvas>
      </div>
    </Boundary>
  );
}
