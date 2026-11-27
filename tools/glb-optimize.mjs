// Audits every GLB in a folder and writes optimized copies next to a report. Sources are never modified or overwritten.
//   one-time:  npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf sharp
//   run:       node tools/glb-optimize.mjs <dir-or-file> [--out optimized-glb] [--max-tex 2048] [--audit-only]
// Optimized output keeps full UV precision (texcoords stay 16-bit+) and is checked for the same triangle count and UV bounds as the source.
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const target = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--out' && argv[argv.indexOf(a) - 1] !== '--max-tex');
const OUT = path.resolve(flag('--out', 'optimized-glb'));
const MAX_TEX = Number(flag('--max-tex', 2048));
const AUDIT_ONLY = argv.includes('--audit-only');
if (!target) { console.error('Usage: node tools/glb-optimize.mjs <dir-or-file> [--out dir] [--max-tex 2048] [--audit-only]'); process.exit(2); }

let core, ext, fns, draco3d, sharp;
try {
  core = await import('@gltf-transform/core'); ext = await import('@gltf-transform/extensions'); fns = await import('@gltf-transform/functions');
  draco3d = (await import('draco3dgltf')).default; sharp = (await import('sharp')).default;
} catch (e) {
  console.error('Missing packages. Run: npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf sharp\n' + e.message);
  process.exit(2);
}

const walk = p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap(n => walk(path.join(p, n))) : /\.glb$/i.test(p) ? [p] : [];
const files = walk(path.resolve(target)).filter(f => !f.startsWith(OUT + path.sep));
if (!files.length) { console.error('No .glb files under ' + target); process.exit(1); }

const io = new core.NodeIO().registerExtensions(ext.ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });

// Geometry facts that must survive optimization: triangle count and per-primitive UV bounds.
function facts(doc) {
  let tris = 0, verts = 0, prims = 0, noUv = 0; const uv = [Infinity, Infinity, -Infinity, -Infinity];
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    prims++; const pos = p.getAttribute('POSITION'), idx = p.getIndices(), t = p.getAttribute('TEXCOORD_0');
    verts += pos?.getCount() ?? 0; tris += idx ? idx.getCount() / 3 : (pos?.getCount() ?? 0) / 3;
    if (!t) { noUv++; continue; }
    const a = [0, 0]; for (let i = 0; i < t.getCount(); i++) { t.getElement(i, a); uv[0] = Math.min(uv[0], a[0]); uv[1] = Math.min(uv[1], a[1]); uv[2] = Math.max(uv[2], a[0]); uv[3] = Math.max(uv[3], a[1]); }
  }
  const tex = doc.getRoot().listTextures().map(t => { const s = t.getSize(); return s ? `${s[0]}x${s[1]}` : '?'; });
  return { meshes: doc.getRoot().listMeshes().length, prims, verts, tris, noUv, uv: uv.map(n => Number.isFinite(n) ? +n.toFixed(4) : null), materials: doc.getRoot().listMaterials().length, textures: tex, anims: doc.getRoot().listAnimations().length, nodes: doc.getRoot().listNodes().map(n => n.getName()).filter(Boolean).sort().join('|'), ext: doc.getRoot().listExtensionsUsed().map(e => e.extensionName) };
}

const issues = f => {
  const out = [];
  if (f.noUv) out.push(`${f.noUv} primitive(s) without UVs: colour and decals can only use geometry zones (approximate), not exact artwork mapping`);
  if (f.uv[0] != null && (f.uv[0] < -0.001 || f.uv[1] < -0.001 || f.uv[2] > 1.001 || f.uv[3] > 1.001)) out.push('UVs outside 0..1 (tiled or overlapping islands): check before using as a print surface');
  if (f.anims) out.push(`${f.anims} animation(s): garments should be static`);
  if (f.meshes > 12) out.push(`${f.meshes} meshes: merge parts that never need separate colours`);
  if (f.verts > 150000) out.push(`${f.verts} vertices: heavy for mobile, decimate offline`);
  if (f.textures.some(s => Math.max(...s.split('x').map(Number)) > MAX_TEX)) out.push(`texture above ${MAX_TEX}px`);
  return out;
};

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const file of files) {
  const rel = path.relative(path.resolve(fs.statSync(target).isDirectory() ? target : path.dirname(target)), file) || path.basename(file);
  const row = { file: rel, bytesBefore: fs.statSync(file).size };
  try {
    const doc = await io.read(file), before = facts(doc);
    Object.assign(row, { before, issues: issues(before), pinned: /studio-assets/.test(file) });
    if (!AUDIT_ONLY) {
      await doc.transform(
        fns.dedup(), fns.prune({ keepLeaves: true, keepAttributes: true }), // UVs are used by the Studio bake even when no material texture references them; no flatten/join: part nodes are the colour and decal zones
        fns.textureCompress({ encoder: sharp, resize: [MAX_TEX, MAX_TEX] }),
        fns.draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14, quantizeColor: 8 }),
      );
      const dest = path.join(OUT, rel); fs.mkdirSync(path.dirname(dest), { recursive: true });
      await io.write(dest, doc);
      const after = facts(await io.read(dest));
      const sameTris = before.tris === after.tris, uvOk = before.uv.every((v, i) => v == null || Math.abs(v - after.uv[i]) < 0.002);
      Object.assign(row, { after, bytesAfter: fs.statSync(dest).size, parity: sameTris && uvOk && before.nodes === after.nodes ? 'ok' : `CHANGED (tris ${before.tris}->${after.tris}, uv ${before.uv}->${after.uv}, nodes ${before.nodes === after.nodes ? 'same' : 'renamed or removed'})` });
      if (row.pinned) row.note = 'hash-pinned asset: keep the original; use the optimized copy for review only';
    }
  } catch (e) { row.error = String(e.message ?? e); }
  rows.push(row);
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));
const kb = n => n == null ? '-' : (n / 1024).toFixed(0) + ' KB';
console.log('file'.padEnd(46), 'before'.padStart(9), 'after'.padStart(9), 'tris'.padStart(8), 'parity');
for (const r of rows) console.log(r.file.slice(-45).padEnd(46), kb(r.bytesBefore).padStart(9), kb(r.bytesAfter).padStart(9), String(r.before?.tris ?? '-').padStart(8), r.error ? 'ERROR ' + r.error : (r.parity ?? 'audit'));
for (const r of rows) for (const i of r.issues ?? []) console.log(`  ! ${r.file}: ${i}`);
const bad = rows.filter(r => r.error || (r.parity && r.parity !== 'ok'));
console.log(`\n${rows.length} file(s), report: ${path.join(OUT, 'report.json')}${bad.length ? `, ${bad.length} need attention` : ''}`);
process.exit(bad.length ? 1 : 0);
