// GLB intake gate: node tools/glb-intake.mjs <file.glb> --source "<photo owner>" --licence "<plan and terms>" [--photos-owned yes] [--no-register]
// Read-only on the GLB. Prints a PASS/FAIL report and appends one line to docs/glb-register.md. Never edits glbSlots.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { intakeStatus } from '../src/pages/client/design-studio/glbSlots.js';

export const LIMITS = { bytes: 3 * 1024 * 1024, trisPerMesh: 20000, texture: 2048 }; // from docs/3D_INTAKE.md
// Names only a person or rig carries; body, leg, neck, arm and hip are also garment parts (pant leg, neck band), so they are not here.
export const BODY_RE = /(^|[^a-z])(human|mannequin|avatar|character|head|face|eyes?|hair|hands?|fingers?|feet|foot|toes?|torso|skin|skeleton|armature|mixamo|bip\d*|spine|pelvis)([^a-z]|$)/i;

export function parseGlb(buf) {
  if (buf.length < 20 || buf.toString('latin1', 0, 4) !== 'glTF') throw new Error('not a binary glTF (.glb) file');
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), chunk = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(chunk.toString('utf8')); else if (type === 0x004E4942) bin = chunk;
    off += 8 + len;
  }
  if (!json) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

export function imageSize(b) {
  if (!b || b.length < 24) return null;
  if (b.readUInt32BE(0) === 0x89504E47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), kind: 'png' };
  if (b[0] === 0xFF && b[1] === 0xD8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), kind: 'jpeg' };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
    const f = b.toString('latin1', 12, 16);
    if (f === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), kind: 'webp' };
    if (f === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3FFF), h: 1 + ((v >> 14) & 0x3FFF), kind: 'webp' }; }
    if (f === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3FFF, h: b.readUInt16LE(28) & 0x3FFF, kind: 'webp' };
  }
  if (b.toString('latin1', 1, 7) === 'KTX 20') return { w: b.readUInt32LE(20), h: b.readUInt32LE(24), kind: 'ktx2' };
  return null;
}

const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const trs = n => {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = n.scale ?? [1, 1, 1], [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
};
const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

export function inspectGlb(buf) {
  const { json: j, bin } = parseGlb(buf);
  const acc = j.accessors ?? [], nodes = j.nodes ?? [], meshes = j.meshes ?? [], used = j.extensionsUsed ?? [];
  const meshTris = meshes.map(m => (m.primitives ?? []).reduce((s, p) => {
    const mode = p.mode ?? 4, n = p.indices != null ? acc[p.indices]?.count ?? 0 : acc[p.attributes?.POSITION]?.count ?? 0;
    return s + (mode === 4 ? Math.floor(n / 3) : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0);
  }, 0));
  const prims = meshes.flatMap(m => m.primitives ?? []);
  const uvSets = [...new Set(prims.flatMap(p => Object.keys(p.attributes ?? {}).filter(k => k.startsWith('TEXCOORD_'))))].sort();
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const walk = (i, parent, seen) => {
    if (seen.has(i) || !nodes[i]) return; seen.add(i);
    const n = nodes[i], w = mul(parent, trs(n));
    for (const p of meshes[n.mesh]?.primitives ?? []) {
      const a = acc[p.attributes?.POSITION]; if (!a?.min || !a?.max) continue;
      const q = a.normalized ? NORM[a.componentType] ?? 1 : 1; // quantized (meshopt) min/max are raw integers
      for (let c = 0; c < 8; c++) {
        const v = [c & 1 ? a.max[0] : a.min[0], c & 2 ? a.max[1] : a.min[1], c & 4 ? a.max[2] : a.min[2]].map(x => q === 1 ? x : Math.max(x / q, -1));
        for (let k = 0; k < 3; k++) { const t = w[k] * v[0] + w[4 + k] * v[1] + w[8 + k] * v[2] + w[12 + k]; lo[k] = Math.min(lo[k], t); hi[k] = Math.max(hi[k], t); }
      }
    }
    for (const c of n.children ?? []) walk(c, w, seen);
  };
  const roots = j.scenes?.[j.scene ?? 0]?.nodes ?? nodes.map((_, i) => i).filter(i => !nodes.some(n => n.children?.includes(i)));
  const seen = new Set(); roots.forEach(r => walk(r, I4, seen));
  const size = lo[0] === Infinity ? [0, 0, 0] : hi.map((h, k) => h - lo[k]);
  const textures = (j.images ?? []).map((im, i) => {
    if (im.uri) return { i, name: im.name ?? null, external: !im.uri.startsWith('data:'), size: im.uri.startsWith('data:') ? imageSize(Buffer.from(im.uri.split(',')[1] ?? '', 'base64')) : null };
    const bv = j.bufferViews?.[im.bufferView], s = bv && bin ? bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength) : null;
    return { i, name: im.name ?? null, external: false, size: imageSize(s) };
  });
  const names = [...nodes.map(n => n.name), ...meshes.map(m => m.name), ...(j.materials ?? []).map(m => m.name)].filter(Boolean);
  return {
    bytes: buf.length, tris: meshTris.reduce((a, b) => a + b, 0), maxMeshTris: Math.max(0, ...meshTris), uvSets,
    materials: (j.materials ?? []).map((m, i) => m.name ?? `material ${i}`), nodes: nodes.map((n, i) => n.name ?? `node ${i}`),
    meshNames: meshes.map((m, i) => m.name ?? `mesh ${i}`),
    bbox: { min: lo, max: hi, size }, upAxis: size[1] >= size[0] * 0.8 && size[1] >= size[2] ? 'Y-up' : size[2] > size[1] ? 'Z-up?' : 'lying flat?',
    skinned: (j.skins?.length ?? 0) > 0 || nodes.some(n => n.skin != null) || prims.some(p => p.attributes?.JOINTS_0 != null),
    bodyNames: [...new Set(names.filter(n => BODY_RE.test(n.replace(/[_.\-]+/g, ' '))))],
    textures, compression: { draco: used.includes('KHR_draco_mesh_compression'), meshopt: used.includes('EXT_meshopt_compression') || used.includes('KHR_meshopt_compression') },
    extensionsUsed: used,
  };
}

export function gate(r) {
  const fail = [], warn = [];
  if (r.bytes > LIMITS.bytes) fail.push(`file ${(r.bytes / 1048576).toFixed(2)} MB > 3 MB`);
  if (r.tris === 0) fail.push('no triangles');
  if (r.maxMeshTris > LIMITS.trisPerMesh) fail.push(`a mesh has ${r.maxMeshTris} triangles > ${LIMITS.trisPerMesh}`);
  if (!r.uvSets.includes('TEXCOORD_0')) fail.push('no UV set (TEXCOORD_0): decals cannot land');
  if (r.skinned) fail.push('skinned / armature data present (body rig)');
  if (r.bodyNames.length) fail.push(`body-like names (human body fused?): ${r.bodyNames.join(', ')}`);
  const big = r.textures.filter(t => t.size && Math.max(t.size.w, t.size.h) > LIMITS.texture);
  if (big.length) fail.push(`texture over ${LIMITS.texture}px: ${big.map(t => `${t.size.w}x${t.size.h}`).join(', ')}`);
  if (r.textures.some(t => t.external)) fail.push('external texture URI (GLB must be self-contained)');
  if (r.upAxis !== 'Y-up') warn.push(`orientation ${r.upAxis}: garment height is not the Y axis`);
  const h = r.bbox.size[1]; if (h && (h < 0.2 || h > 3)) warn.push(`height ${h.toFixed(3)} units: scale is not metre-like (0.2..3)`);
  if (r.compression.draco) warn.push('Draco: the viewer fetches a decoder at runtime');
  if (r.materials.length + r.meshNames.length <= 2) warn.push('one material / mesh: fused, one body colour only');
  if (r.textures.some(t => !t.size)) warn.push('a texture size could not be read');
  return { pass: fail.length === 0, fail, warn };
}

const cell = s => String(s ?? '').replace(/[|\r\n]+/g, ' ').trim() || '-';
export const registerLine = ({ date, file, result, source, licence }) => `| ${date} | ${cell(file)} | ${cell(result)} | ${cell(source)} | ${cell(licence)} |`;
const HEADER = '# GLB intake register\n\nAppended by `node tools/glb-intake.mjs`. One line per intake run. A "verified" result still needs a manual slot record in `glbSlots.js`.\n\n| Date | File | Result | Source | Licence |\n|---|---|---|---|---|\n';

function args(argv) {
  const o = { file: null, source: '', licence: '', photosOwned: '', register: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') o.source = argv[++i] ?? ''; else if (a === '--licence' || a === '--license') o.licence = argv[++i] ?? '';
    else if (a === '--photos-owned') o.photosOwned = (argv[++i] ?? '').toLowerCase(); else if (a === '--no-register') o.register = false;
    else if (!a.startsWith('--') && !o.file) o.file = a;
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  if (!o.file) { console.error('usage: node tools/glb-intake.mjs <file.glb> --source "<photo owner>" --licence "<plan and terms>" [--photos-owned yes] [--no-register]'); process.exit(2); }
  let r;
  try { r = inspectGlb(fs.readFileSync(o.file)); } catch (e) { console.error(`FAIL ${o.file}: ${e.message}`); process.exit(1); }
  const g = gate(r), status = intakeStatus({ pass: g.pass, ...o });
  const missing = [!o.source.trim() && '--source', !o.licence.trim() && '--licence', o.photosOwned !== 'yes' && '--photos-owned yes'].filter(Boolean);
  const f = n => n.toFixed(3), list = a => a.length ? a.join(', ') : '(none)';
  console.log([
    `${g.pass ? 'PASS' : 'FAIL'}  ${path.basename(o.file)}  -> status: ${status}`,
    `  size         ${(r.bytes / 1048576).toFixed(2)} MB`,
    `  triangles    ${r.tris} total, ${r.maxMeshTris} max per mesh`,
    `  UV sets      ${list(r.uvSets)}`,
    `  materials    ${list(r.materials)}`,
    `  meshes       ${list(r.meshNames)}`,
    `  nodes        ${list(r.nodes)}`,
    `  bbox         min [${r.bbox.min.map(f)}] max [${r.bbox.max.map(f)}] size [${r.bbox.size.map(f)}]`,
    `  orientation  ${r.upAxis}`,
    `  skinned      ${r.skinned ? 'yes' : 'no'}; body-like names: ${list(r.bodyNames)}`,
    `  textures     ${list(r.textures.map(t => t.size ? `${t.size.kind} ${t.size.w}x${t.size.h}` : t.external ? 'external' : 'unknown'))}`,
    `  compression  draco ${r.compression.draco ? 'yes' : 'no'}, meshopt ${r.compression.meshopt ? 'yes' : 'no'}`,
    ...g.fail.map(x => `  FAIL  ${x}`), ...g.warn.map(x => `  WARN  ${x}`),
    g.pass && status !== 'verified' ? `  NOT VERIFIED: missing ${missing.join(', ')}` : '',
  ].filter(Boolean).join('\n'));
  if (o.register) {
    const reg = fileURLToPath(new URL('../docs/glb-register.md', import.meta.url));
    if (!fs.existsSync(reg)) fs.writeFileSync(reg, HEADER);
    const result = `${g.pass ? 'PASS' : 'FAIL'} / ${status}${g.pass && status !== 'verified' ? ` (missing ${missing.join(', ')})` : ''}`;
    fs.appendFileSync(reg, registerLine({ date: new Date().toISOString().slice(0, 10), file: path.basename(o.file), result, source: o.source, licence: o.licence }) + '\n');
    console.log(`  registered in docs/glb-register.md`);
  }
  process.exit(g.pass ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
