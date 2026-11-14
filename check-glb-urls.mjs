// Run from repo root: node check-glb-urls.mjs  (reads VITE_MODEL_BASE_URL from env or .env.local) or pass the base URL as arg 1
import fs from 'node:fs';
import path from 'node:path';
if (!process.env.VITE_MODEL_BASE_URL && fs.existsSync(".env.local")) { const m = fs.readFileSync(".env.local", "utf8").match(/^VITE_MODEL_BASE_URL=(.+)$/m); if (m) process.env.VITE_MODEL_BASE_URL = m[1].trim(); }

const BASE = (process.argv[2] || process.env.VITE_MODEL_BASE_URL || '').replace(/\/$/, '');
if (!BASE) { console.error('Pass the base URL as arg 1.'); process.exit(1); }

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

const paths = new Set();
for (const f of walk('src').filter(f => /\.(jsx?|tsx?|mjs)$/.test(f)))
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\/models\/[^'"`]+?\.glb/gi)) !/[${<]/.test(m[0]) && paths.add(m[0]);

const toUrl = (p) => BASE + decodeURI(p.slice('/models'.length)).replace(/ /g, '-'); // same rule as src/lib/modelUrl.ts
const bad = [];
for (const p of [...paths].sort()) {
  const url = encodeURI(toUrl(p));
  const r = await fetch(url, { method: 'HEAD' }).catch(() => ({ status: 0, headers: new Map() }));
  const ok = r.status === 200;
  if (!ok) bad.push(`${r.status}  ${p}`);
  console.log(ok ? 'OK  ' : 'FAIL', r.status, p);
}
console.log(`\n${paths.size - bad.length}/${paths.size} reachable`);
if (bad.length) console.log('Missing on Cloudinary:\n' + bad.join('\n'));
