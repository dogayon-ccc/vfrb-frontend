// Panel editor logic: the undo timeline and the shape geometry. Run: node tools/panel-editor-checks.mjs
import fs from 'node:fs';
import { build } from 'esbuild';

const dir = new URL('../src/pages/client/design-studio/', import.meta.url);
const load = async (file) => {
  const out = await build({ entryPoints: [new URL(file, dir).pathname.replace(/^\/([A-Z]:)/, '$1')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
};
const H = await load('panelHistory.ts');
let pass = 0, fail = 0;
const ok = (c, n) => { c ? pass++ : (fail++, console.log('FAIL', n)); };

let h = H.startHistory('a');
ok(!H.canUndo(h) && !H.canRedo(h) && H.moveHistory(h, -1) === null, 'a fresh timeline has nothing to undo or redo');
ok(H.pushStep(h, 'a') === h, 'an unchanged snapshot is not a step');
h = H.pushStep(H.pushStep(h, 'b'), 'c');
h = H.moveHistory(h, -1);
ok(h.stack[h.at] === 'b' && H.canRedo(h), 'undo goes back one step and keeps redo');
ok(H.pushStep(h, 'b') === h && H.canRedo(h), 're-recording the restored state keeps redo');
const settled = H.settleStep(h, 'b2');
ok(settled.stack[settled.at] === 'b2' && H.canRedo(settled) && H.pushStep(settled, 'b2') === settled, 'a re-serialised restore replaces its step without losing redo');
h = H.pushStep(h, 'd');
ok(h.stack.join('') === 'abd' && !H.canRedo(h), 'a new edit drops the redo branch');
let long = H.startHistory('0');
for (let i = 1; i <= 100; i++) long = H.pushStep(long, String(i));
ok(long.stack.length === H.HISTORY_MAX_STEPS && long.stack[long.at] === '100', 'the step cap drops the oldest steps');
let big = H.startHistory('x');
for (let i = 0; i < 20; i++) big = H.pushStep(big, String(i) + 'y'.repeat(2_000_000));
ok(big.stack.reduce((n, s) => n + s.length, 0) <= H.HISTORY_MAX_CHARS && big.at === big.stack.length - 1 && big.stack.length >= 2, 'the memory cap holds with large uploads');

const ops = fs.readFileSync(new URL('panelArtOps.ts', dir), 'utf8');
const A = await load('panelArtOps.ts').catch(() => null);
if (A) {
  ok(A.shapePoints('diamond', 100).length === 4 && A.shapePoints('star', 100).length === 10, 'diamond has 4 corners and the star 10');
  ok(A.shapePoints('star', 100).every(p => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100), 'star points stay inside their box');
  ok(A.SHAPES.length === 8 && A.SHAPES.every(([k]) => A.makeShape(k, 500, 300).left === 500), 'all eight shapes are created at the asked place');
  ok(A.readArt(A.makeShape('line', 0, 0, '#C8102E'), 1024).fill === '#C8102E', 'a line reports its stroke as its colour');
} else ok(false, 'panelArtOps loads');
ok(/await loadFont\(css, w\)/.test(ops), 'a self-hosted face is loaded before text is measured');
const ws = fs.readFileSync(new URL('PanelWorkspace.tsx', dir), 'utf8'), flat = fs.readFileSync(new URL('panelFlat.ts', dir), 'utf8'), ds = fs.readFileSync(new URL('../DesignStudio.tsx', dir), 'utf8');
ok(/await ensureFonts\(/.test(ws) && /await ensureFonts\(objects/.test(flat), 'restore and export both register saved web fonts');
ok(/bakedRef\.current\) panelApi\.current\?\.undo\(\); else undo\(\)/.test(ds) && /baked \? panelCan\.undo : canUndo/.test(ds), 'the host undo drives the panel timeline for baked garments');
ok(/o \|\| readOnly \|\|/.test(ws), 'arrow and delete keys cannot change a read-only design');

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
