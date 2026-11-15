// Run: node tools/check-glb-urls.mjs [baseUrl]
// Default base: VITE_MODEL_BASE_URL, else the models-draco folder on Cloudinary.
// Fetches each trouser/slacks candidate GLB, reads only its JSON chunk (works for Draco files) and prints size, triangles,
// bounds and the leg-length / width ratio, so the best straight-leg model can be picked from facts. Writes nothing.
import { loadEnv } from 'vite';

const DEFAULT = 'https://res.cloudinary.com/jh4fru9j/raw/upload/models-draco';
const base = (process.argv[2] || process.env.VITE_MODEL_BASE_URL || loadEnv('development', process.cwd(), 'VITE_').VITE_MODEL_BASE_URL || DEFAULT).replace(/\/$/, '');

const CANDIDATES = [
  'authored/pants-straight', 'authored/pants-jogger', 'vfrb-staged/pants',
  'vfrb-derived/pantsuit-notch-short-gray-bottom', 'vfrb-derived/bir-blouse-trousers-blue-bottom',
  'vfrb-derived/blazer-double-breasted-gray-bottom', 'vfrb-derived/blazer-pinstripe-navy-bottom',
  'vfrb-derived/blouse-roundneck-fuchsia-bottom', 'vfrb-derived/blouse-roundneck-mustard-bottom',
  'vfrb-derived/polo-barong-brown-bottom', 'vfrb-derived/shirt-two-tone-gpc-bottom', 'vfrb-derived/set-pinstripe-pants-bottom',
];

const json = buf => (buf.toString('ascii', 0, 4) === 'glTF' ? JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) : null);

console.log(`base: ${base}\n`);
const rows = [];
for (const c of CANDIDATES) {
  const url = `${base}/${c}.glb`;
  try {
    const res = await fetch(url);
    if (!res.ok) { rows.push({ model: c, status: res.status }); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const j = json(buf);
    if (!j) { rows.push({ model: c, status: 'not a GLB' }); continue; }
    const prims = (j.meshes ?? []).flatMap(m => m.primitives);
    const mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];
    let tris = 0;
    for (const p of prims) {
      const a = j.accessors[p.attributes.POSITION];
      a.min?.forEach((v, k) => (mins[k] = Math.min(mins[k], v)));
      a.max?.forEach((v, k) => (maxs[k] = Math.max(maxs[k], v)));
      if (p.indices != null) tris += j.accessors[p.indices].count / 3;
    }
    const [w, h, d] = maxs.map((v, k) => v - mins[k]);
    rows.push({ model: c, status: 200, KB: Math.round(buf.length / 1024), tris, parts: prims.length, w: +w.toFixed(2), h: +h.toFixed(2), d: +d.toFixed(2), 'h/w': +(h / w).toFixed(2),
      draco: !!j.extensionsUsed?.includes('KHR_draco_mesh_compression') });
  } catch (e) { rows.push({ model: c, status: `network: ${e.message}` }); }
}
console.table(rows);
console.log('Look for: status 200, parts >= 2 (named zones), h/w between about 1.8 and 3.2 for a pair of straight legs, tris under 60000.');
console.log('A derived "-bottom" file is a plane cut from a fused set (waist lip, no garment-only guarantee): it is only a fallback.');
