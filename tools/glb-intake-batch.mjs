// Gate many GLBs at once, read-only (never writes the register): command node tools/glb-intake-batch.mjs <dir|files...> [--parts a,b,c]
import fs from 'node:fs';
import path from 'node:path';
import { inspectGlb, gate } from './glb-intake.mjs';

const argv = process.argv.slice(2), pi = argv.indexOf('--parts');
const parts = pi < 0 ? [] : (argv.splice(pi, 2)[1] ?? '').split(',').filter(Boolean);
const files = argv.flatMap(a => fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter(f => f.endsWith('.glb')).sort().map(f => path.join(a, f)) : [a]);
if (!files.length) { console.error('usage: command node tools/glb-intake-batch.mjs <dir|files...> [--parts a,b,c]'); process.exit(2); }

let failed = 0;
for (const f of files) {
  try {
    const r = inspectGlb(fs.readFileSync(f)), g = gate(r, parts);
    failed += !g.pass;
    console.log(`${g.pass ? 'PASS' : 'FAIL'}  ${path.basename(f).padEnd(34)} ${(r.bytes / 1048576).toFixed(2)}MB ${String(r.tris).padStart(7)}tri uv=${r.uvSets.length ? 'yes' : 'NO'} nodes=${r.nodes.length} draco=${r.compression.draco ? 'y' : 'n'}  ${g.fail.join('; ')}`);
  } catch (e) { failed++; console.log(`FAIL  ${path.basename(f)}  ${e.message}`); }
}
console.log(`\n${files.length - failed}/${files.length} pass the gate (gate only, not slot verification)`);
process.exit(failed ? 1 : 0);
