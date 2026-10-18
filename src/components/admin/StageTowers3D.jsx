// src/components/admin/StageTowers3D.jsx
// Live 3D bar chart: one tower per production stage, height = orders sitting at that stage.
// Heights ease toward each new value, so a dashboard refresh makes the towers move instead of reloading.
// Needs WebGL; falls back to flat bars. Presentation only: data comes in as props.
import { Component, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { MathUtils } from 'three';
import { hasWebGL } from '../../pages/client/design-studio/webglSupport';

const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const GAP = 1.5;

function Tower({ x, target, color, name, value, reduce }) {
  const mesh = useRef();
  const cur = useRef(reduce ? target : 0.02);
  const [hot, setHot] = useState(false);
  useFrame((_, dt) => {
    cur.current = reduce ? target : MathUtils.damp(cur.current, target, 4.5, dt);
    if (!mesh.current) return;
    mesh.current.scale.y = Math.max(cur.current, 0.02);
    mesh.current.position.y = Math.max(cur.current, 0.02) / 2;
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh ref={mesh} castShadow onPointerOver={() => setHot(true)} onPointerOut={() => setHot(false)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hot ? 0.55 : 0.12} roughness={0.35} metalness={0.15} />
      </mesh>
      <Html position={[0, target + 0.45, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <b style={{ font: '800 18px ui-sans-serif,system-ui,sans-serif', color: 'var(--ink)', textShadow: '0 1px 0 #fff' }}>{value}</b>
      </Html>
      <Html position={[0, -0.35, 1.2]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <span style={{ font: '700 13px ui-sans-serif,system-ui,sans-serif', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{name}</span>
      </Html>
    </group>
  );
}

function Scene({ data, reduce }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = (data.length - 1) * GAP;
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 9, 5]} intensity={1.1} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 4, 5]} />
        <meshStandardMaterial color="#e6dfd3" roughness={1} />
      </mesh>
      <group position={[-width / 2, 0, 0]}>
        {data.map((d, i) => (
          <Tower key={d.name} x={i * GAP} target={(d.value / max) * 3.3} color={d.color} name={d.name} value={d.value} reduce={reduce} />
        ))}
      </group>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={!reduce} autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 2.2} minAzimuthAngle={-Math.PI / 3} maxAzimuthAngle={Math.PI / 3} />
    </>
  );
}

function FlatBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'grid', gap: 10, padding: 8 }}>
      {data.map((d) => (
        <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 32px', alignItems: 'center', gap: 10, fontSize: 14 }}>
          <span style={{ fontWeight: 700 }}>{d.name}</span>
          <span style={{ height: 14, borderRadius: 7, background: 'var(--bg-surface)', overflow: 'hidden' }}>
            <i style={{ display: 'block', height: '100%', width: `${(d.value / max) * 100}%`, background: d.color, transition: 'width .6s' }} />
          </span>
          <b>{d.value}</b>
        </div>
      ))}
    </div>
  );
}

class Guard extends Component {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  render() { return this.state.bad ? <FlatBars data={this.props.data} /> : this.props.children; }
}

export default function StageTowers3D({ data, height = 320 }) {
  const reduce = useMemo(calm, []);
  const gl = useMemo(() => hasWebGL(), []);
  if (!gl) return <FlatBars data={data} />;
  return (
    <Guard data={data}>
      <div style={{ height, minWidth: 0 }} role="img" aria-label={`Orders per production stage: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 4.4, 11.5], fov: 38 }} gl={{ antialias: true, alpha: true }}>
          <Scene data={data} reduce={reduce} />
        </Canvas>
      </div>
    </Guard>
  );
}
