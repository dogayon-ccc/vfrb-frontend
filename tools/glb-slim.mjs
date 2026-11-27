// Makes lighter copies of heavy garment GLBs and only accepts a copy that still looks the same. Sources are never modified.
//   one-time:  npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf meshoptimizer
//   run:       node tools/glb-slim.mjs <models-dir> --out <dir>      (add --max-tris 50000 to change the triangle target)
// Files named in tools/glb-extract/served-sha256.json are hash-recorded provenance copies and are always passed through unchanged.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, draco } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import { views, compareViews, GATE } from './glb-views.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const src = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : null;
const out = path.resolve(flag('--out', 'slim-glb'));
const MAX_TRIS = Number(flag('--max-tris', 50000)), MIN_SAVING = 0.1;
// Rejected by eye although the numbers passed.
const KEEP = { 'processed/work-shirt-short-sleeve-capped.glb': 'by eye: the slimmed cap under the arm shows new shading marks' };
if (!src || out === src || out.startsWith(src + path.sep)) { console.error('Usage: node tools/glb-slim.mjs <models-dir> --out <dir outside it>'); process.exit(2); }

const recorded = JSON.parse(fs.readFileSync(new URL('./glb-extract/served-sha256.json', import.meta.url), 'utf8')).models;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
await MeshoptSimplifier.ready;

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.glb$/i.test(e.name) ? [path.join(d, e.name)] : []);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const trisOf = doc => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
const layout = doc => JSON.stringify([doc.getRoot().listNodes().map(n => n.getName()).sort(), doc.getRoot().listMeshes().flatMap(m => m.listPrimitives().map(p => p.listSemantics().sort().join())).sort(), doc.getRoot().listTextures().length, doc.getRoot().listMaterials().length]);

const rows = [];
for (const file of walk(src).sort()) {
  const rel = path.relative(src, file).split(path.sep).join('/'), bytes = fs.readFileSync(file), dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const row = { file: rel, before_bytes: bytes.length, after_bytes: bytes.length, before_tris: 0, after_tris: 0, min_silhouette_iou: '', max_depth_diff_pct: '', result: 'kept', reason: '', source_sha256: sha(bytes) };
  fs.writeFileSync(dest, bytes); // the output set is always complete: a rejected copy leaves the original in place
  try {
    const doc = await io.readBinary(bytes);
    row.before_tris = row.after_tris = Math.round(trisOf(doc));
    if (recorded['/models/' + rel]) row.reason = 'hash-recorded provenance copy';
    else if (KEEP[rel]) row.reason = KEEP[rel];
    else if (row.before_tris <= MAX_TRIS) row.reason = `already at or under ${MAX_TRIS} triangles`;
    else {
      const was = views(doc), shape = layout(doc);
      // Gentlest acceptable cut: try the triangle target, then back off until the pictures pass. Part borders stay locked so zones never open gaps.
      for (const target of [MAX_TRIS, MAX_TRIS * 1.5, MAX_TRIS * 2]) {
        if (target >= row.before_tris) break;
        const copy = await io.readBinary(bytes);
        await copy.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: target / row.before_tris, error: 0.002, lockBorder: true }),
          prune({ keepLeaves: true, keepAttributes: true }), draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 14, quantizeColor: 8 }));
        const made = await io.writeBinary(copy), back = await io.readBinary(made), diff = compareViews(was, views(back, was.frame));
        row.min_silhouette_iou = diff.iou.toFixed(4); row.max_depth_diff_pct = (diff.depth * 100).toFixed(3);
        if (layout(back) !== shape) { row.reason = 'copy changed part names, attributes or materials'; continue; }
        if (diff.iou < GATE.iou || diff.depth > GATE.depth) { row.reason = 'copy looked different'; continue; }
        if (made.length > bytes.length * (1 - MIN_SAVING)) { row.reason = 'saves less than 10%'; continue; }
        fs.writeFileSync(dest, made);
        Object.assign(row, { after_bytes: made.length, after_tris: Math.round(trisOf(back)), result: 'slimmed', reason: '' });
        break;
      }
    }
  } catch (e) { row.reason = `could not process: ${e.message}`; row.result = 'error'; }
  row.output_sha256 = sha(fs.readFileSync(dest));
  rows.push(row);
}

const cols = Object.keys(rows[0]);
fs.writeFileSync(path.join(out, 'slim-report.csv'), [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n') + '\n');
rows.forEach((r, i) => console.log(`${String(i + 1).padStart(3)}/${rows.length} ${r.result.padEnd(7)} ${(r.before_bytes / 1024).toFixed(0).padStart(5)} -> ${(r.after_bytes / 1024).toFixed(0).padStart(4)} KB ${String(r.before_tris).padStart(7)} -> ${String(r.after_tris).padStart(6)} tris  ${r.file}${r.reason ? `  (${r.reason})` : ''}`));
const sum = k => rows.reduce((n, r) => n + r[k], 0);
console.log(`\n${rows.length} files, ${rows.filter(r => r.result === 'slimmed').length} slimmed, ${(sum('before_bytes') / 1e6).toFixed(2)} MB -> ${(sum('after_bytes') / 1e6).toFixed(2)} MB, ${(sum('before_tris') / 1e6).toFixed(2)}M -> ${(sum('after_tris') / 1e6).toFixed(2)}M triangles`);
process.exit(rows.some(r => r.result === 'error') ? 1 : 0);
