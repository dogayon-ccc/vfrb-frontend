// Renders the authored Scrub Top and Pants GLBs in headless Chrome (three via the Vite dev server, tools/flat-from-glb.html) and writes
// src/assets/flats/<glb>/{front,back}.svg: one even-odd <path> per visible mesh part, id = the GLB node name.
// Masks go to tools/out/. Reads models from public/ or the local model cache only; nothing is uploaded or written to public/models.
// Draco-compressed models (GARMENT_CFG draco) decode with the decoder shipped in node_modules/three, served locally, never from a CDN.
// Usage: node tools/flat-from-glb.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import { ROOT, modelFile } from './modelFiles.mjs';
import { flat, LIMIT, GARMENT_CFG } from './flatTrace.mjs';

const GARMENTS = ['scrub-top-vneck-short', 'scrub-top-vneck-three-quarter', 'pants-straight'];
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(ROOT, 'tools', 'out'), FLATS = path.join(ROOT, 'src', 'assets', 'flats');

const readBody = req => new Promise((ok, fail) => { const c = []; req.on('data', d => c.push(d)).on('end', () => ok(JSON.parse(Buffer.concat(c).toString() || '{}'))).on('error', fail); });
let finish; const finished = new Promise(r => { finish = r; });
const results = [];
const bridge = { name: 'flat-bridge', configureServer(s) { s.middlewares.use(async (req, res, next) => {
  const glb = req.url.match(/^\/__flats\/glb\/([\w-]+)\.glb$/);
  if (glb) { res.setHeader('Content-Type', 'model/gltf-binary'); return fs.createReadStream(modelFile(`/models/authored/${glb[1]}.glb`)).pipe(res); }
  const dec = req.url.match(/^\/__flats\/draco\/(draco_decoder\.js|draco_decoder\.wasm|draco_wasm_wrapper\.js)$/);
  if (dec) { res.setHeader('Content-Type', dec[1].endsWith('wasm') ? 'application/wasm' : 'text/javascript'); return fs.createReadStream(path.join(ROOT, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf', dec[1])).pipe(res); }
  if (req.url === '/__flats/jobs') return res.end(JSON.stringify(GARMENTS.map(id => ({ id, draco: !!GARMENT_CFG[id]?.draco, hide: GARMENT_CFG[id]?.hideInSilhouette ?? [] }))));
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
for (const r of report) console.log(`${r.dev > LIMIT ? 'OVER ' : '     '}${r.id} ${r.face.padEnd(5)} ${r.part.padEnd(14)} dev ${r.dev == null ? '   -  ' : pct(r.dev)}  px-mismatch ${r.mismatch == null ? '   -  ' : pct(r.mismatch)}${r.points ? `  ${r.points} pts` : ''}`);
const over = report.filter(r => r.dev > LIMIT);
console.log(over.length ? `${over.length} part(s) exceed ${pct(LIMIT)} of the diagonal` : `all parts within ${pct(LIMIT)} of the diagonal`);
