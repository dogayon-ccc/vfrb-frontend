// Renders the authored Scrub Top GLBs in headless Chrome (three via the Vite dev server, tools/flat-from-glb.html) and writes
// src/assets/flats/<glb>/{front,back}.svg: one even-odd <path> per visible mesh part, id = the GLB node name.
// Masks go to tools/out/. Reads models from public/ or the local model cache only; nothing is uploaded or written to public/models.
// Usage: node tools/flat-from-glb.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import { ROOT, modelFile } from './modelFiles.mjs';

const GARMENTS = ['scrub-top-vneck-short', 'scrub-top-vneck-three-quarter'];
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(ROOT, 'tools', 'out'), FLATS = path.join(ROOT, 'src', 'assets', 'flats');
const TOL = 2;        // px, Douglas-Peucker tolerance (~0.15% of a 1.3k px diagonal)
const MIN_AREA = 12;  // px², contour islands smaller than this are render speckle
const LIMIT = 0.02;   // max allowed deviation, share of the bounding-box diagonal
const FILL = { body: '#3a6ea5', sleeve_l: '#81b29a', sleeve_r: '#81b29a', neck_band: '#e07a5f', chest_pocket: '#f2cc8f', lower_pockets: '#f2cc8f' };

// Marching squares over pixel centres; returns closed loops of [x, y] on the half-pixel grid.
function contours(labels, W, H, k) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && labels[y * W + x] === k;
  const S = W + 2, key = (i, j, v) => ((j + 1) * S + (i + 1)) * 2 + v; // v=0: edge (i,j)-(i+1,j), v=1: edge (i,j)-(i,j+1)
  const pos = new Map(), adj = new Map();
  const link = (a, b) => { for (const [p, q] of [[a, b], [b, a]]) (adj.get(p) ?? adj.set(p, []).get(p)).push(q); };
  const SEG = { 1: ['l', 'b'], 2: ['b', 'r'], 3: ['l', 'r'], 4: ['t', 'r'], 5: ['l', 'b', 't', 'r'], 6: ['t', 'b'], 7: ['t', 'l'], 8: ['t', 'l'],
    9: ['t', 'b'], 10: ['t', 'l', 'b', 'r'], 11: ['t', 'r'], 12: ['l', 'r'], 13: ['b', 'r'], 14: ['l', 'b'] };
  for (let j = -1; j < H; j++) for (let i = -1; i < W; i++) {
    const segs = SEG[inside(i, j) * 8 + inside(i + 1, j) * 4 + inside(i + 1, j + 1) * 2 + inside(i, j + 1)];
    if (!segs) continue;
    const e = { t: [key(i, j, 0), i + 1, j + 0.5], b: [key(i, j + 1, 0), i + 1, j + 1.5], l: [key(i, j, 1), i + 0.5, j + 1], r: [key(i + 1, j, 1), i + 1.5, j + 1] };
    for (let s = 0; s < segs.length; s += 2) {
      const [a, ax, ay] = e[segs[s]], [b, bx, by] = e[segs[s + 1]];
      pos.set(a, [ax, ay]); pos.set(b, [bx, by]); link(a, b);
    }
  }
  const seen = new Set(), loops = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = []; let prev = null, cur = start;
    while (!seen.has(cur)) { seen.add(cur); loop.push(pos.get(cur)); const [n1, n2] = adj.get(cur); [prev, cur] = [cur, n1 === prev ? n2 : n1]; }
    loops.push(loop);
  }
  return loops;
}

const area = l => l.reduce((s, [x, y], i) => { const [u, v] = l[(i + 1) % l.length]; return s + x * v - u * y; }, 0) / 2;
function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

// Douglas-Peucker on a closed loop, split at the vertex farthest from the first.
function simplify(loop, tol) {
  const far = loop.reduce((m, p, i) => (Math.hypot(p[0] - loop[0][0], p[1] - loop[0][1]) > Math.hypot(loop[m][0] - loop[0][0], loop[m][1] - loop[0][1]) ? i : m), 0);
  const keep = new Set([0, far]), stack = [[0, far], [far, loop.length]];
  while (stack.length) {
    const [a, b] = stack.pop(); let worst = -1, d = tol;
    for (let i = a + 1; i < b; i++) { const di = segDist(loop[i], loop[a], loop[b % loop.length]); if (di > d) { d = di; worst = i; } }
    if (worst > 0) { keep.add(worst); stack.push([a, worst], [worst, b]); }
  }
  return [...keep].sort((x, y) => x - y).map(i => loop[i]);
}

const loopDev = (raw, simple) => Math.max(...raw.map(p => Math.min(...simple.map((q, i) => segDist(p, q, simple[(i + 1) % simple.length])))));

// Even-odd scanline fill of the simplified loops at pixel centres, for the pixel-mismatch check.
function rasterize(loops, W, H) {
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const cy = y + 0.5, xs = [];
    for (const l of loops) l.forEach(([ax, ay], i) => { const [bx, by] = l[(i + 1) % l.length]; if ((ay <= cy) !== (by <= cy)) xs.push(ax + (cy - ay) * (bx - ax) / (by - ay)); });
    xs.sort((a, b) => a - b);
    for (let n = 0; n + 1 < xs.length; n += 2) for (let x = Math.max(0, Math.ceil(xs[n] - 0.5)); x < Math.min(W, Math.ceil(xs[n + 1] - 0.5)); x++) m[y * W + x] = 1;
  }
  return m;
}

function flat({ id, face, W, H, parts, labels: b64 }, report) {
  const labels = new Uint8Array(Buffer.from(b64, 'base64')), diag = Math.hypot(W, H), paths = [];
  const union = new Uint8Array(W * H);
  parts.forEach((name, n) => {
    const raw = contours(labels, W, H, n + 1).filter(l => Math.abs(area(l)) >= MIN_AREA);
    if (!raw.length) return; // not visible from this side
    const simple = raw.map(l => simplify(l, TOL)), filled = rasterize(simple, W, H);
    let px = 0, miss = 0;
    labels.forEach((l, i) => { const on = l === n + 1; px += on; miss += on !== !!filled[i]; if (filled[i]) union[i] = 1; });
    const dev = Math.max(...raw.map((l, i) => loopDev(l, simple[i]))) + 0.5; // +0.5 px: contour sits on pixel edges
    report.push({ id, face, part: name, dev: dev / diag, mismatch: miss / px, points: simple.reduce((s, l) => s + l.length, 0) });
    const d = simple.map(l => 'M' + l.map(([x, y]) => `${x} ${y}`).join('L') + 'Z').join('');
    paths.push(`  <path id="${name}" fill="${FILL[name] ?? '#999999'}" fill-rule="evenodd" d="${d}"/>`);
  });
  let sil = 0, silMiss = 0;
  labels.forEach((l, i) => { sil += l > 0; silMiss += (l > 0) !== !!union[i]; });
  report.push({ id, face, part: '(silhouette)', mismatch: silMiss / sil });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" data-source="/models/authored/${id}.glb" data-face="${face}">\n${paths.join('\n')}\n</svg>\n`;
}

const readBody = req => new Promise((ok, fail) => { const c = []; req.on('data', d => c.push(d)).on('end', () => ok(JSON.parse(Buffer.concat(c).toString() || '{}'))).on('error', fail); });
let finish; const finished = new Promise(r => { finish = r; });
const results = [];
const bridge = { name: 'flat-bridge', configureServer(s) { s.middlewares.use(async (req, res, next) => {
  const glb = req.url.match(/^\/__flats\/glb\/([\w-]+)\.glb$/);
  if (glb) { res.setHeader('Content-Type', 'model/gltf-binary'); return fs.createReadStream(modelFile(`/models/authored/${glb[1]}.glb`)).pipe(res); }
  if (req.url === '/__flats/jobs') return res.end(JSON.stringify(GARMENTS));
  if (req.method === 'POST' && req.url === '/__flats/result') { results.push(await readBody(req)); return res.end('ok'); }
  if (req.method === 'POST' && req.url === '/__flats/done') { finish(await readBody(req)); return res.end('ok'); }
  next();
}); } };

for (const g of GARMENTS) if (!fs.existsSync(modelFile(`/models/authored/${g}.glb`) ?? '')) throw new Error(`${g}.glb is not in public/ or the model cache`);
const server = await createServer({ root: ROOT, configFile: false, appType: 'mpa', logLevel: 'error', plugins: [bridge], server: { port: 5199, open: false } });
await server.listen();
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vfrb-flats-'));
const chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', `--user-data-dir=${profile}`,
  new URL('tools/flat-from-glb.html', server.resolvedUrls.local[0]).href], { stdio: 'ignore' });
const timer = setTimeout(() => finish({ error: 'timed out after 120 s' }), 120_000);
const done = await finished;
clearTimeout(timer); chrome.kill(); await server.close();
if (done.error) { console.error(done.error); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (const r of results) {
  fs.writeFileSync(path.join(OUT, `${r.id}-${r.face}.png`), Buffer.from(r.png.split(',')[1], 'base64'));
  fs.mkdirSync(path.join(FLATS, r.id), { recursive: true });
  fs.writeFileSync(path.join(FLATS, r.id, `${r.face}.svg`), flat(r, report));
}
const pct = x => (x * 100).toFixed(2) + '%';
for (const r of report) console.log(`${r.dev > LIMIT ? 'OVER ' : '     '}${r.id} ${r.face.padEnd(5)} ${r.part.padEnd(14)} dev ${r.dev == null ? '   -  ' : pct(r.dev)}  px-mismatch ${pct(r.mismatch)}${r.points ? `  ${r.points} pts` : ''}`);
const over = report.filter(r => r.dev > LIMIT);
console.log(over.length ? `${over.length} part(s) exceed ${pct(LIMIT)} of the diagonal` : `all parts within ${pct(LIMIT)} of the diagonal`);
