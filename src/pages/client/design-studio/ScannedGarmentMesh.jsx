import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Decal, useGLTF } from '@react-three/drei';
import { renderDecals, bodyBounds } from './overlayDecals';

let grain;
// Fine deterministic fabric grain (blurred noise) as a shared normal map; periodic weaves alias into streaks.
function grainNormal() {
  if (grain) return grain;
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const raw = Float32Array.from({ length: N * N }, rnd);
  const at = (x, y) => raw[((y + N) % N) * N + ((x + N) % N)];
  const h = (x, y) => (at(x, y) * 4 + at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) / 8;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 3, dy = (h(x, y + 1) - h(x, y - 1)) * 3, len = Math.hypot(dx, dy, 1);
    img.data.set([(-dx / len * 0.5 + 0.5) * 255, (-dy / len * 0.5 + 0.5) * 255, (1 / len * 0.5 + 0.5) * 255, 255], (y * N + x) * 4);
  }
  g.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(c);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(14, 14);
  return grain;
}

function partMaterial(color, part) {
  if (part.plain) return new THREE.MeshStandardMaterial({ color, roughness: part.roughness ?? 0.4, metalness: part.metalness ?? 0, side: THREE.DoubleSide });
  return new THREE.MeshPhysicalMaterial({
    color, roughness: part.roughness ?? 0.88, metalness: 0,
    sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.2),
    normalMap: grainNormal(), normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide,
  });
}

const loadTexture = url => new Promise(resolve => new THREE.TextureLoader().load(url, t => {
  t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  resolve(t);
}, undefined, () => resolve(null)));

function useDecals(overlays) {
  const [decals, setDecals] = useState({ front: [], back: [] });
  useEffect(() => {
    let stale = false;
    Promise.all(['front', 'back'].map(async side => {
      const items = await renderDecals(overlays?.[side]);
      const withTex = await Promise.all(items.map(async d => ({ ...d, tex: await loadTexture(d.url) })));
      return withTex.filter(d => d.tex);
    })).then(([front, back]) => { if (!stale) setDecals({ front, back }); }).catch(() => {});
    return () => { stale = true; };
  }, [overlays]);
  return decals;
}

// Places each 2D overlay at the same spot relative to the torso, then drops it onto the surface hit along Z.
// Width is anchored to the torso and height to the body, so arm pose in the scan cannot shift the design.
function placeDecals(geometry, decals, frame, torso) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const bh = max.y - min.y, fw = frame.x1 - frame.x0, fh = frame.y1 - frame.y0, cx = (frame.x0 + frame.x1) / 2;
  const k = (2 * torso) / fw;
  const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  return ['front', 'back'].flatMap(side => decals[side].map((d, i) => {
    const dir = side === 'front' ? -1 : 1, dx = (d.cx - cx) * k;
    const x = side === 'front' ? dx : -dx;
    const y = max.y - ((d.cy - frame.y0) / fh) * bh;
    ray.set(new THREE.Vector3(x, y, -dir * 2), new THREE.Vector3(0, 0, dir));
    const hit = ray.intersectObject(probe)[0];
    if (!hit) return null;
    // Box biased toward the inside so folds (lapels, pockets) stay inside it while the far shell does not.
    return { key: `${side}${i}`, tex: d.tex, position: [x, y, hit.point.z + dir * 0.03], rotation: [0, side === 'front' ? 0 : Math.PI, 0], scale: [d.w * k, d.h * k, 0.22] };
  })).filter(Boolean);
}

function ScannedPart({ geometry, part, colors, decals, frame, torso }) {
  const color = part.fixedColor ?? colors[part.colorKey] ?? colors[part.fallbackKey] ?? '#028090';
  const material = useMemo(() => partMaterial(color, part), [color, part]);
  const placed = useMemo(() => (part.decals ? placeDecals(geometry, decals, frame, torso) : []), [geometry, decals, frame, torso, part]);
  return (
    <mesh geometry={geometry} material={material}>
      {placed.map((p, i) => <Decal key={p.key} position={p.position} rotation={p.rotation} scale={p.scale} map={p.tex} roughness={0.75} depthWrite={false} renderOrder={i + 1} polygonOffsetFactor={-10 - i} />)}
    </mesh>
  );
}

export default function ScannedGarmentMesh({ manifest, colors = {}, fit, garment, sleeve, overlays }) {
  const key = String(fit ?? '').toLowerCase();
  const { nodes } = useGLTF(manifest.models[key] ?? Object.values(manifest.models)[0]);
  const decals = useDecals(overlays);
  const frame = useMemo(() => bodyBounds(garment, sleeve), [garment, sleeve]);
  const torso = manifest.torso[key] ?? Object.values(manifest.torso)[0];
  const { rotation, scale, position } = manifest.transform;
  return (
    <group rotation={rotation} scale={scale} position={position}>
      {manifest.parts.map(part => nodes[part.node]?.geometry && (
        <ScannedPart key={part.node} geometry={nodes[part.node].geometry} part={part} colors={colors} decals={decals} frame={frame} torso={torso} />
      ))}
    </group>
  );
}
