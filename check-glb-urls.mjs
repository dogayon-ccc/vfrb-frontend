// Run from vfrb-frontend root: node check-glb-urls.mjs https://res.cloudinary.com/<cloud>/raw/upload/models
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.argv[2] || process.env.VITE_MODEL_BASE_URL || '').replace(/\/$/, '');
if (!BASE) { console.error('Pass the base URL as arg 1.'); process.exit(1); }

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

const paths = new Set();
for (const f of walk('src').filter(f => /\.(jsx?|mjs)$/.test(f)))
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\/models\/[^'"`]+?\.glb/gi)) !/[${<]/.test(m[0]) && paths.add(m[0]);

const toUrl = (p) => BASE + decodeURI(p.slice('/models'.length)).replace(/ /g, '-'); // same rule as src/lib/modelUrl.js
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
