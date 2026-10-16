import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Decal, useGLTF } from '@react-three/drei';
import { renderDecals, bodyBounds } from './overlayDecals';
import { buildRegionTexture, DEFAULT_GARMENT_COLOR } from './regionTexture';
import { ensureZoneMask, createZoneUniforms, setZoneUniforms, patchZoneMaterial } from './regionShader';
import { buildCustomParts, customMeshKey, disposeParts } from './customMesh3D';

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

export function partMaterial(color, part, map = null) {
  if (part.unlit) return new THREE.MeshBasicMaterial({ color, side: THREE.FrontSide });
  if (part.plain) return new THREE.MeshStandardMaterial({ color, roughness: part.roughness ?? 0.4, metalness: part.metalness ?? 0, side: THREE.DoubleSide });
  const m = new THREE.MeshPhysicalMaterial({
    // Matte cloth: low specular and a sheen in the cloth's own colour, so dark and saturated colours are not veiled grey (calibrated in DesignStudio3D LIGHT).
    color, roughness: part.roughness ?? 0.88, metalness: 0, specularIntensity: 0.2,
    sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(color),
    // No UVs (zone-mask path) means no normal map, except parametric parts (part.grain), whose lofts carry real UVs.
    map, normalMap: part.zoneOf && !part.grain ? null : (map ? tiledGrainNormal(map.image.width) : grainNormal()),
    normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.DoubleSide,
  });
  // UV path: the colour lives in the zone texture and the material is white, so the sheen takes the painted texel colour (same fix as
  // the zone-mask shader in regionShader.js); a white sheen veiled the T-shirt (measured dE up to 20.4).
  if (map) {
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor *= diffuseColor.rgb;\n#endif'); };
    m.customProgramCacheKey = () => 'vfrb-uv-sheen-v1';
  }
  return m;
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

// details: the design's pocket/button/closure changes (garmentDetails.js); a part tagged with a `detail` the customer hid is not drawn.
export default function ScannedGarmentMesh({ manifest, colors = {}, patterns, patternParams, fit, garment, sleeve, overlays, details = null }) {
  const key = String(fit ?? '').toLowerCase();
  const { nodes } = useGLTF(manifest.models[key] ?? Object.values(manifest.models)[0]);
  useEffect(() => () => Object.values(nodes).forEach(n => n.geometry?.dispose()), [nodes]); // useGLTF cache outlives the renderer; frees GL buffers that pin the dead context
  const decals = useDecals(overlays);
  const frame = useMemo(() => bodyBounds(garment, sleeve), [garment, sleeve]);
  const torso = manifest.torso[key] ?? Object.values(manifest.torso)[0];
  const { rotation, scale, position } = manifest.transform;
  return (
    <group rotation={rotation} scale={scale} position={position}>
      {manifest.parts.filter(part => !(part.detail && details?.[part.detail]?.show === false)).map(part => nodes[part.node]?.geometry && (
        <ScannedPart key={part.node} geometry={nodes[part.node].geometry} part={part} colors={colors} patterns={patterns} patternParams={patternParams} decals={decals} frame={frame} torso={torso} />
      ))}
    </group>
  );
}

// Rebuilds wait until the spec has been still for `ms` (a slider drag fires many changes).
function useThrottledKey(key, ms) {
  const [k, setK] = useState(key);
  useEffect(() => { if (k === key) return undefined; const t = setTimeout(() => setK(key), ms); return () => clearTimeout(t); }, [key, k, ms]);
  return k;
}

// Build-your-own garments and the Button-Down template: parametric parts from the spec (customMesh3D.js), painted through the same
// zone-mask material as the authored models. Throttled to 120 ms, memoised by spec, the previous geometry disposed on every rebuild.
export function CustomGarmentMesh({ garment, spec, sleeve, colors = {}, patterns, patternParams, overlays, details = null, transform }) {
  const key = useThrottledKey(customMeshKey(garment, spec, sleeve), 120);
  const built = useMemo(() => buildCustomParts(garment, spec, sleeve), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => disposeParts(built), [built]);
  // Stable part descriptors per build, so materials are made once per rebuild, not on every render.
  // A part with a Details colour (trouser buttons, fly) takes it when the customer set one; buttons are a plain, slightly glossy material.
  const detailTint = JSON.stringify([details?.buttons?.color ?? null, details?.closure?.color ?? null]);
  const metas = useMemo(() => built?.parts.map(p => {
    const fixedColor = p.detailColor ? details?.[p.detailColor]?.color ?? null : null;
    if (p.plain || fixedColor) return { node: p.name, colorKey: p.colorKey, decals: false, plain: p.plain, roughness: 0.35, fixedColor };
    return { node: p.name, colorKey: p.colorKey, decals: p.decals, zoneOf: () => p.colorKey, grain: true };
  }) ?? [], [built, detailTint]); // eslint-disable-line react-hooks/exhaustive-deps
  const decals = useDecals(overlays);
  const frame = useMemo(() => bodyBounds(garment, sleeve), [garment, sleeve, key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!built) return null;
  const { rotation, scale, position } = transform;
  return (
    <group rotation={rotation} scale={scale} position={position}>
      {built.parts.map((p, i) => !(p.detail && details?.[p.detail]?.show === false) && (
        <ScannedPart key={`${key}|${p.name}`} geometry={p.geometry} part={metas[i]}
          colors={colors} patterns={patterns} patternParams={patternParams} decals={decals} frame={frame} torso={built.torso}/>
      ))}
    </group>
  );
}
