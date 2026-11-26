// Rasterises every mapped UV triangle into a grid and reports texels claimed by two different parts (artwork bleed between meshes)
// and by the front and back panel of one part. Needs VFRB_PILOT01_DIR (the evidence folder); skips without it.
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.VFRB_PILOT01_DIR;
if (!dir) { console.log('(VFRB_PILOT01_DIR not set: skipped)'); process.exit(0); }
const N = Number(process.env.UV_GRID || 2048), MAX_CROSS_PART = Number(process.env.UV_MAX_CROSS_PART || 0);
const m = JSON.parse(fs.readFileSync(path.join(dir, 'panels2d', 'mapping_manifest.json'), 'utf8'));
const parts = [...new Set(m.panels.map(p => p.part))];
const owner = new Int16Array(N * N).fill(-1), view = new Int8Array(N * N).fill(-1);
const cross = new Map(), sameView = new Map(); let sameParts = 0;

for (const p of m.panels) {
  const pi = parts.indexOf(p.part), vi = p.view === 'front' ? 0 : 1;
  for (const tri of p.mesh.uv) {
    const [a, b, c] = tri.map(([u, v]) => [u * N, v * N]);
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-12) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(N - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(N - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d;
      const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
      if (l1 < 0 || l2 < 0 || 1 - l1 - l2 < 0) continue;
      const i = y * N + x, o = owner[i];
      if (o === -1) { owner[i] = pi; view[i] = vi; continue; }
      if (o !== pi) { const k = `${parts[o]}|${p.part}`; cross.set(k, (cross.get(k) || 0) + 1); }
      else if (view[i] !== vi) sameParts++;
      else sameView.set(p.id, (sameView.get(p.id) || 0) + 1);
    }
  }
}

const crossTotal = [...cross.values()].reduce((s, v) => s + v, 0);
let claimed = 0; for (let i = 0; i < owner.length; i++) if (owner[i] !== -1) claimed++;
console.log(`grid ${N}x${N}, claimed texels ${claimed}, parts ${parts.join(', ')}`);
console.log(`cross-part texels: ${crossTotal}`, Object.fromEntries(cross));
console.log(`same part, front vs back texels: ${sameParts}`);
console.log(`same panel, triangle-on-triangle texels:`, Object.fromEntries(sameView));
const ok = crossTotal <= MAX_CROSS_PART;
console.log(ok ? 'PASS no UV texel is claimed by two parts (one shared atlas would be safe)' : `FAIL ${crossTotal} texels claimed by two parts: use one texture per part`);
process.exit(ok ? 0 : 1);
