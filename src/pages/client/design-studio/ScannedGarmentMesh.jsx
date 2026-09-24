import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Decal, useGLTF } from '@react-three/drei';
import { renderDecals, bodyBounds } from './overlayDecals';
import { buildRegionTexture, DEFAULT_GARMENT_COLOR } from './regionTexture';
import { ensureZoneMask, createZoneUniforms, setZoneUniforms, patchZoneMaterial } from './regionShader';

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

// three r150 applies ONE uv transform (the `map`'s) to every map on a material, so with a zone `map` the grain cannot rely on
// repeat.set(14, 14); the same grain is tiled inside a canvas instead and used with repeat 1.
let tiledGrain;
function tiledGrainNormal(size) {
  if (tiledGrain?.image.width === size) return tiledGrain;
  const base = grainNormal().image, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = g.createPattern(base, 'repeat');
  g.fillRect(0, 0, size, size);
  tiledGrain = new THREE.CanvasTexture(c);
  return tiledGrain;
}

function partMaterial(color, part, map = null) {
  if (part.plain) return new THREE.MeshStandardMaterial({ color, roughness: part.roughness ?? 0.4, metalness: part.metalness ?? 0, side: THREE.DoubleSide });
  return new THREE.MeshPhysicalMaterial({
    color, roughness: part.roughness ?? 0.88, metalness: 0,
    sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.2),
    // No UVs (zone-mask path) means no normal map.
    map, normalMap: part.zoneOf ? null : (map ? tiledGrainNormal(map.image.width) : grainNormal()),
    normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide,
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

const TEX_SIZE = window.matchMedia('(pointer: coarse)').matches ? 1024 : 2048;

// Colour-picker drags fire many changes; the 2048px zone texture is only rebuilt once the value settles.
function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// UV path: zone colours and patterns painted into the part's own UV layout (see regionTexture.js).
function useRegionTexture(geometry, part, colors, patterns, patternParams, pxToModel) {
  const settled = useDebounced(JSON.stringify([colors, patterns, patternParams]), 120);
  const tex = useMemo(() => {
    if (!part.regionOf) return null;
    const [c, p, pp] = JSON.parse(settled);
    return buildRegionTexture({ geometry, regionOf: part.regionOf, colors: c ?? {}, patterns: p ?? {}, patternParams: pp ?? {}, pxToModel, size: TEX_SIZE });
  }, [geometry, part, settled, pxToModel]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

// No-UV path: per-vertex zone mask + shader uniforms (see regionShader.js). One material per part; edits only change uniforms.
function useZoneMaterial(geometry, part, colors, patterns, patternParams, pxToModel) {
  const state = useMemo(() => {
    if (!part.zoneOf) return null;
    ensureZoneMask(geometry, part.zoneOf);
    const uniforms = createZoneUniforms();
    return { uniforms, material: patchZoneMaterial(partMaterial('#ffffff', part), uniforms) };
  }, [geometry, part]);
  const dep = JSON.stringify([colors, patterns, patternParams, pxToModel]);
  useMemo(() => { if (state) setZoneUniforms(state.uniforms, { colors, patterns, patternParams, pxToModel }); }, // eslint-disable-line react-hooks/exhaustive-deps
  [state, dep]);
  useEffect(() => () => state?.material.dispose(), [state]);
  return state?.material ?? null;
}

function ScannedPart({ geometry, part, colors, patterns, patternParams, decals, frame, torso }) {
  const color = part.fixedColor ?? colors[part.colorKey] ?? colors[part.fallbackKey] ?? DEFAULT_GARMENT_COLOR;
  const pxToModel = (2 * torso) / (frame.x1 - frame.x0);
  const zoneMap = useRegionTexture(geometry, part, colors, patterns, patternParams, pxToModel);
  const zoneMaterial = useZoneMaterial(geometry, part, colors, patterns, patternParams, pxToModel);
  const material = useMemo(() => zoneMaterial ?? partMaterial(zoneMap ? '#ffffff' : color, part, zoneMap), [zoneMaterial, color, part, zoneMap]);
  useEffect(() => () => { if (!zoneMaterial) material.dispose(); }, [material, zoneMaterial]);
  const placed = useMemo(() => (part.decals ? placeDecals(geometry, decals, frame, torso) : []), [geometry, decals, frame, torso, part]);
  return (
    <mesh geometry={geometry} material={material}>
      {placed.map((p, i) => <Decal key={p.key} position={p.position} rotation={p.rotation} scale={p.scale} map={p.tex} roughness={0.75} depthWrite={false} renderOrder={i + 1} polygonOffsetFactor={-10 - i} />)}
    </mesh>
  );
}

export default function ScannedGarmentMesh({ manifest, colors = {}, patterns, patternParams, fit, garment, sleeve, overlays }) {
  const key = String(fit ?? '').toLowerCase();
  const { nodes } = useGLTF(manifest.models[key] ?? Object.values(manifest.models)[0]);
  const decals = useDecals(overlays);
  const frame = useMemo(() => bodyBounds(garment, sleeve), [garment, sleeve]);
  const torso = manifest.torso[key] ?? Object.values(manifest.torso)[0];
  const { rotation, scale, position } = manifest.transform;
  return (
    <group rotation={rotation} scale={scale} position={position}>
      {manifest.parts.map(part => nodes[part.node]?.geometry && (
        <ScannedPart key={part.node} geometry={nodes[part.node].geometry} part={part} colors={colors} patterns={patterns} patternParams={patternParams} decals={decals} frame={frame} torso={torso} />
      ))}
    </group>
  );
}
