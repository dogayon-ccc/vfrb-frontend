// Usage (from the frontend root): VFRB_PILOT01_DIR=<unzipped evidence dir> node tools/studio-diag/run.cjs mirror|gradient <out.png|out.json>
// Needs: npm i playwright (or a global Playwright with Chromium) and the frontend's own node_modules (three, esbuild).
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../..'), pilot = path.resolve(process.env.VFRB_PILOT01_DIR || ''), mode = process.argv[2] || 'mirror', out = process.argv[3] || `studio-diag-${mode}.out`;
if (!fs.existsSync(path.join(pilot, 'panels2d/mapping_manifest.json'))) { console.error('Set VFRB_PILOT01_DIR to the unzipped Pilot 01 evidence folder (contains glb/ and panels2d/).'); process.exit(2); }
const bundle = path.join(__dirname, 'diag.bundle.js');
execFileSync(path.join(root, 'node_modules/.bin/esbuild'), [path.join(__dirname, 'diag.js'), '--bundle', '--format=esm', `--outfile=${bundle}`, '--loader:.ts=ts', '--log-level=warning'], { stdio: 'inherit', env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') } });
const types = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u.startsWith('/pilot/') ? path.join(pilot, u.slice(7)) : path.join(__dirname, u.replace(/^\/harness\//, '')); if (!f.startsWith(pilot) && !f.startsWith(__dirname) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0, '127.0.0.1', async () => {
  let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 800, height: 600 } });
  p.on('pageerror', e => console.log('pageerror', String(e).slice(0, 400)));
  await p.goto(`http://127.0.0.1:${srv.address().port}/harness/index.html?mode=${mode}`);
  await p.waitForFunction(() => window.__diag, null, { timeout: 280000 }); const d = await p.evaluate(() => window.__diag);
  if (d.error) { console.error(d.error); process.exitCode = 1; } else if (d.png) { fs.writeFileSync(out, Buffer.from(d.png.split(',')[1], 'base64')); console.log(JSON.stringify({ rows: d.rows, audit: d.audit })); } else { if (d.samples) console.error('samples [mirror,expS,expT,gotS,gotT,B,A]', JSON.stringify(d.samples)); fs.writeFileSync(out, JSON.stringify(d.gradient, null, 1)); console.log(JSON.stringify(d.gradient, null, 1)); }
  await b.close(); srv.close(); });
