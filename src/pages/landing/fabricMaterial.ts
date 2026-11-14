// Landing-only: adds a procedural woven-fabric micro-surface to the Studio's garment materials without editing them.
// Triplanar in model space (the scans have no UVs), fades out when a thread would be under ~1 px so it never shimmers.
import * as THREE from 'three';

const KEY = 'vfrb-weave-1';
const WEAVE_FN = 'float fabW(vec2 p){ vec2 c = floor(p * 2.0); vec2 f = fract(p * 2.0); float t = mod(c.x + c.y, 2.0) < 0.5 ? sin(f.x * 3.14159) : sin(f.y * 3.14159); return 0.5 + 0.5 * t; }';
const WEAVE_COLOR = `
  vec3 fabN = normalize(cross(dFdx(vFabP), dFdy(vFabP)));
  vec3 fabA = pow(abs(fabN), vec3(4.0)); fabA /= (fabA.x + fabA.y + fabA.z + 1e-5);
  float fabS = 150.0;
  float fabWv = fabA.x * fabW(vFabP.zy * fabS) + fabA.y * fabW(vFabP.xz * fabS) + fabA.z * fabW(vFabP.xy * fabS);
  fabWv = mix(0.5, fabWv, 1.0 - smoothstep(0.45, 1.4, length(fwidth(vFabP * fabS))));
  diffuseColor.rgb *= 0.92 + 0.16 * fabWv;`;
const WEAVE_ROUGH = '\n  roughnessFactor = clamp(roughnessFactor + (fabWv - 0.5) * 0.16, 0.04, 1.0);';

/** Returns true when the material was patched. Skips unlit/basic materials and any shader it cannot patch safely. */
export function patchFabric(material: THREE.Material): boolean {
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial || m.userData.weave) return false;
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    const ok = sh.vertexShader.includes('#include <begin_vertex>')
      && sh.fragmentShader.includes('#include <color_fragment>') && sh.fragmentShader.includes('#include <roughnessmap_fragment>');
    if (!ok) return;
    sh.vertexShader = 'varying vec3 vFabP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFabP = position;');
    sh.fragmentShader = `varying vec3 vFabP;\n${WEAVE_FN}\n` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>${WEAVE_COLOR}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>${WEAVE_ROUGH}`);
  };
  m.customProgramCacheKey = () => `${prevKey?.() ?? ''}|${KEY}`;
  m.userData.weave = true;
  m.needsUpdate = true;
  return true;
}

/** Walks a group and patches every garment material it finds; cheap to call repeatedly (patched ones are skipped). */
export function weaveAll(root: THREE.Object3D | null): number {
  let n = 0;
  root?.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(mt => { if (mt && patchFabric(mt)) n++; });
  });
  return n;
}
