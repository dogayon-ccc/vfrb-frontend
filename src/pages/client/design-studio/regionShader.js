import * as THREE from 'three';
import { zoneFills } from './regionTexture';
import { PATTERNS } from './dsShared';

// Zone colours/patterns for GLBs WITHOUT UVs or separate materials (the Meshy exports). The zone of every vertex is classified from
// the real geometry (`zoneOf`, an approximation: there are no cut panels to read), stored as a one-hot vec4 attribute, and the
// material shader picks colour/pattern per fragment. Patterns are evaluated in model-space x/y, i.e. projected along Z like the 2D
// front view. Colours and patterns are uniforms, so editing them recompiles nothing and rebuilds no texture.
export const ZONES = ['body', 'sleeve', 'collar', 'pocket'];
const PATTERN_TYPE = { hstripes: 1, vstripes: 2, diagonal: 3, checker: 4, polka: 5 }; // 'geometric' has no shader tile: paints solid

export function ensureZoneMask(geometry, zoneOf) {
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  if (geometry.attributes.zoneMask) return;
  const pos = geometry.attributes.position, mask = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) mask[i * 4 + Math.max(0, ZONES.indexOf(zoneOf(pos.getX(i), pos.getY(i), pos.getZ(i))))] = 1;
  geometry.setAttribute('zoneMask', new THREE.BufferAttribute(mask, 4));
}

export function createZoneUniforms() {
  const arr = f => Array.from({ length: 4 }, f);
  return {
    uZoneColor: { value: arr(() => new THREE.Color('#ffffff')) },
    uZoneInk: { value: arr(() => new THREE.Color('#ffffff')) },
    uZoneType: { value: [0, 0, 0, 0] },
    uZoneParam: { value: arr(() => new THREE.Vector2(5, 5)) },
    uPxToModel: { value: 0.005 },
  };
}

export function setZoneUniforms(u, { colors, patterns = {}, patternParams = {}, pxToModel }) {
  const fills = zoneFills(colors, patterns);
  ZONES.forEach((z, i) => {
    const f = fills[z], type = PATTERN_TYPE[f.id] ?? 0;
    u.uZoneColor.value[i].set(type ? f.ground : f.ink);
    u.uZoneInk.value[i].set(f.ink);
    u.uZoneType.value[i] = type;
    const pp = patternParams[z] ?? PATTERNS.find(p => p.id === f.id)?.defaultParams ?? {};
    u.uZoneParam.value[i].set(pp.width ?? 5, pp.spacing ?? 5);
  });
  u.uPxToModel.value = pxToModel;
}

const DECL = `
uniform vec3 uZoneColor[4]; uniform vec3 uZoneInk[4]; uniform float uZoneType[4]; uniform vec2 uZoneParam[4]; uniform float uPxToModel;
varying vec4 vZoneMask; varying vec3 vZonePos;
// p is in 2D sketch pixels; same 20px tiles as the 2D PATTERNS svgs.
float zoneInk(float type, vec2 p, vec2 wp) {
  float w = wp.x, s = wp.y; vec2 t = mod(p, 20.0);
  if (type < 0.5) return 0.0;
  if (type < 1.5) return float(t.y < w || (t.y >= w + s && t.y < 2.0 * w + s));
  if (type < 2.5) return float(t.x < w || (t.x >= w + s && t.x < 2.0 * w + s));
  if (type < 3.5) {
    float u = p.x + p.y, h = 0.7071 * w;
    return float(abs(mod(u + 10.0, 20.0) - 10.0) <= h || abs(mod(u - (10.0 - s) + 10.0, 20.0) - 10.0) <= h || abs(mod(u - (10.0 + s) + 10.0, 20.0) - 10.0) <= h);
  }
  if (type < 4.5) return float(floor(t.x / 10.0) == floor(t.y / 10.0));
  return float(length(t - vec2(5.0)) < 3.0 || length(t - vec2(15.0)) < 3.0);
}`;
const MAIN = `
{ vec3 zc = vec3(0.0); vec2 zp = vec2(vZonePos.x, -vZonePos.y) / uPxToModel;
  for (int i = 0; i < 4; i++) { float m = vZoneMask[i]; if (m > 0.001) zc += m * mix(uZoneColor[i], uZoneInk[i], zoneInk(uZoneType[i], zp, uZoneParam[i])); }
  diffuseColor.rgb = zc; }`;

export function patchZoneMaterial(material, uniforms) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 zoneMask;\nvarying vec4 vZoneMask;\nvarying vec3 vZonePos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZoneMask = zoneMask;\nvZonePos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${MAIN}`);
  };
  material.customProgramCacheKey = () => 'vfrb-zone-mask-v1';
  return material;
}
