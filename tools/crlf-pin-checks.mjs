// The panel SVG pins must hold for LF and CRLF checkouts alike (Git on Windows converts). Run: node tools/crlf-pin-checks.mjs
import fs from 'node:fs'; import crypto from 'node:crypto';
const root = new URL('../', import.meta.url);
const reg = fs.readFileSync(new URL('src/pages/client/design-studio/studioAssets.ts', root), 'utf8');
const pins = [...reg.matchAll(/panels_(front|back)\.svg`, sha256: '([0-9a-f]{64})'/g)].map(m => [m[1], m[2]]);
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL ' + n); } };
ok(pins.length === 2, 'both panel SVG pins are found in the registry');
const strip = b => Buffer.from(b.filter(x => x !== 13));
for (const [side, pin] of pins) {
  const lf = fs.readFileSync(new URL(`public/studio-assets/scrub-top-pilot01/panels_${side}.svg`, root));
  const crlf = Buffer.from(lf.toString('utf8').replace(/\r?\n/g, '\r\n'));
  const h = b => crypto.createHash('sha256').update(strip(b)).digest('hex');
  ok(h(lf) === pin, `${side}: LF checkout matches the pin`);
  ok(h(crlf) === pin, `${side}: CRLF checkout matches the pin`);
}
ok(/withoutCarriageReturns\(await res\.arrayBuffer\(\)\)/.test(fs.readFileSync(new URL('src/pages/client/design-studio/PanelWorkspace.tsx', root), 'utf8')), 'the loader hashes the carriage-return-free bytes');
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
