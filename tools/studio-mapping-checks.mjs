// Checks for src/pages/client/design-studio/studioMapping.ts. Run: node tools/studio-mapping-checks.mjs
// Set VFRB_PILOT01_DIR=<unzipped Pilot 01 evidence folder> to also validate the real manifest against the real GLB.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const src = fs.readFileSync(new URL('../src/pages/client/design-studio/studioMapping.ts', import.meta.url), 'utf8');
const M = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'));
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL ' + name); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const tri = (xy, uv) => ({ xy, uv });
const man = { mapping_version: '1.0.0', master_id: 't', processed_sha256: 'x', panels: [
  { id: 'body.front', part: 'body', view: 'front', tri_count: 4, mesh: {
    xy: [[[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [0.5, 0]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [1, 0], [0, 1]]],
    uv: [[[0, 0], [0.5, 0], [0, 0.5]], [[0.1, 0.1], [0.2, 0.1], [0.1, 0.1]], [[0.6, 0.6], [0.6, 0.9], [0.9, 0.6]], [[0.2, 0.6], [0.4, 0.6], [0.2, 0.8]]] } },
  { id: 'body.back', part: 'body', view: 'back', tri_count: 1, mesh: { xy: [[[-1, -1], [1, -1], [0, 1]]], uv: [[[0.5, 0], [1, 0], [0.5, 0.5]]] } }] };
const m = M.parseMapping(man, { xMirror: true });
ok(m.panels.length === 2 && m.panels[0].triCount === 4, 'parse counts');
ok(near(m.frames.front.x1 - m.frames.front.x0, 1) && near(m.frames.back.w, 2) && near(m.frames.back.h, 2), 'frames from data');
// known point: xy (0.25, 0.75) in the front frame
ok(M.panelCoord(m.frames.front, 0.25, 0.75, false).every((v, i) => near(v, [0.25, 0.25][i])), 'panelCoord existing: s = x, t flipped');
ok(M.panelCoord(m.frames.front, 0.25, 0.75, true).every((v, i) => near(v, [0.75, 0.25][i])), 'panelCoord inverted: s mirrored');
ok(near(M.panelCoord(m.frames.front, 1, 0, true)[0], 0) && near(M.panelCoord(m.frames.front, 0, 0, true)[0], 1), 'mirror maps frame edges to edges');
// barycentric: the centre of the UV triangle must map to the centre of the panel triangle (affine inside a triangle)
const c = M.panelCorners(m.panels[0], m.frames.front, false), b = [1 / 3, 1 / 3, 1 / 3];
ok(near(b[0] * c[0] + b[1] * c[2] + b[2] * c[4], 1 / 3) && near(b[0] * c[1] + b[1] * c[3] + b[2] * c[5], 2 / 3), 'corner interpolation: centroid maps to centroid');
const au = M.auditMapping(m);
const a0 = au[0];
ok(a0.xyDegenerate === 1 && a0.uvDegenerate === 1, 'audit: collinear xy and zero-area uv are reported');
ok(a0.xyReversed === 1, 'audit: reversed winding is reported, not hidden');
ok(au[1].xyReversed === 0 && au[1].xyDegenerate === 0, 'audit: clean panel is clean');
let threw = false; try { M.parseMapping({ ...man, panels: [{ ...man.panels[1], tri_count: 9 }] }, { xMirror: false }); } catch { threw = true; }
ok(threw, 'parse rejects a triangle-count mismatch');

const dir = process.env.VFRB_PILOT01_DIR;
if (dir) {
  const man2 = JSON.parse(fs.readFileSync(path.join(dir, 'panels2d/mapping_manifest.json'), 'utf8'));
  const buf = fs.readFileSync(path.join(dir, 'glb/scrub-top-pilot01.glb')), jl = buf.readUInt32LE(12), j = JSON.parse(buf.slice(20, 20 + jl).toString()), bin = buf.slice(20 + jl + 8);
  const acc = (i, n, T) => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], o = bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0); return { a, d: new T(bin.buffer.slice(o, o + a.count * n * T.BYTES_PER_ELEMENT)) }; };
  const parts = {}; for (const n of j.nodes) { const p = j.meshes[n.mesh].primitives[0]; const P = acc(p.attributes.POSITION, 3, Float32Array).d, U = acc(p.attributes.TEXCOORD_0, 2, Float32Array).d, ia = j.accessors[p.indices], I = acc(p.indices, 1, ia.componentType === 5125 ? Uint32Array : Uint16Array).d; parts[n.name] = { P, U, I }; }
  const mm = M.parseMapping(man2, { xMirror: false });
  ok(man2.panels.length === 10, 'pilot: 10 panels');
  const G = 1e4, cellKey = (u, v) => Math.round(u * G) + ',' + Math.round(v * G);
  for (const pn of mm.panels) {
    const { P, U, I } = parts[pn.part], grid = new Map(), tris = new Set(), sx = pn.view === 'back' ? 1 : -1;
    for (let v = 0; v < U.length / 2; v++) { const k = cellKey(U[v * 2], U[v * 2 + 1]); (grid.get(k) ?? grid.set(k, []).get(k)).push(v); }
    for (let t = 0; t < I.length; t += 3) tris.add([I[t], I[t + 1], I[t + 2]].sort((a, b) => a - b).join(','));
    const cands = (u, v) => { const out = []; for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) for (const w of grid.get(Math.round(u * G) + du + ',' + (Math.round(v * G) + dv)) ?? []) if (Math.abs(U[w * 2] - u) < 3e-6 && Math.abs(U[w * 2 + 1] - v) < 3e-6) out.push(w); return out; };
    let miss = 0, maxE = 0;
    for (let t = 0; t < pn.triCount; t++) {
      const o = t * 6, cs = [0, 1, 2].map(k => cands(pn.uv[o + k * 2], pn.uv[o + k * 2 + 1]).filter(w => Math.abs(pn.xy[o + k * 2] - sx * P[w * 3]) < 2e-5 && Math.abs(pn.xy[o + k * 2 + 1] - P[w * 3 + 1]) < 2e-5));
      const hit = cs[0].flatMap(a => cs[1].flatMap(b => cs[2].map(c => [a, b, c]))).find(v => tris.has([...v].sort((a, b) => a - b).join(',')));
      if (!hit) { miss++; continue; }
      hit.forEach((w, k) => { maxE = Math.max(maxE, Math.abs(pn.xy[o + k * 2] - sx * P[w * 3]), Math.abs(pn.xy[o + k * 2 + 1] - P[w * 3 + 1])); });
    }
    ok(miss === 0, `pilot ${pn.id}: every manifest triangle is a GLB triangle whose corners match both uv and xy = (${sx < 0 ? '-x' : '+x'}, y) of its position (unmatched ${miss})`);
    ok(maxE < 2e-5, `pilot ${pn.id}: max xy error ${maxE.toExponential(1)}`);
  }
  const au2 = M.auditMapping(mm), sum = k => au2.reduce((s, p) => s + p[k], 0);
  ok(sum('uvOutOfRange') === 0, 'pilot: all uv inside 0..1');
  console.log(`pilot audit: reversed ${sum('xyReversed')}, xy-degenerate ${sum('xyDegenerate')}, uv-degenerate ${sum('uvDegenerate')}`);
} else console.log('(VFRB_PILOT01_DIR not set: evidence validation skipped)');
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
