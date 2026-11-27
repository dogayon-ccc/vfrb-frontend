// Placement spots on the baked panels, checked against the real authored SVGs. Run: node tools/panel-spots-checks.mjs
import fs from 'node:fs';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const out = await build({ entryPoints: [new URL('src/pages/client/design-studio/panelSpots.ts', root).pathname.replace(/^\/([A-Z]:)/, '$1')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const P = await import('data:text/javascript;base64,' + Buffer.from((await build({ entryPoints: [new URL('src/pages/client/design-studio/pilotPanels.ts', root).pathname.replace(/^\/([A-Z]:)/, '$1')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })).outputFiles[0].text).toString('base64'));

const asset = fs.readFileSync(new URL('src/pages/client/design-studio/studioAssets.ts', root), 'utf8');
const num = (side, k) => Number(new RegExp(`${side}: \\{ x0: ([-\\d.]+), x1: ([-\\d.]+), y0: ([-\\d.]+), y1: ([-\\d.]+) \\}`).exec(asset).slice(1)[k]);
const frames = Object.fromEntries(['front', 'back'].map(s => [s, { x0: num(s, 0), x1: num(s, 1), y0: num(s, 2), y1: num(s, 3) }]));
const dir = new URL('public/studio-assets/scrub-top-pilot01/', root);
const panels = [...P.parsePanelSvg(fs.readFileSync(new URL('panels_front.svg', dir), 'utf8')), ...P.parsePanelSvg(fs.readFileSync(new URL('panels_back.svg', dir), 'utf8'))];

let pass = 0, fail = 0;
const ok = (c, n) => { c ? pass++ : (fail++, console.log('FAIL', n)); };
const W = 1024, H = P.canvasSize(frames.front, W).height;
const front = S.panelSpots(panels, 'front', frames.front, W), back = S.panelSpots(panels, 'back', frames.back, W);
const by = (list, id) => list.find(s => s.id === id);

ok(front.length >= 6 && back.length >= 5, 'both sides get spots from the real panels');
ok(by(front, 'chest-wearer-left').cx > by(front, 'chest').cx && by(front, 'chest-wearer-right').cx < by(front, 'chest').cx, 'front: wearer-left chest is on the viewer right');
const bodyMid = by(front, 'chest').cx;
ok(by(front, 'sleeve-wearer-left').cx > bodyMid && by(front, 'sleeve-wearer-right').cx < bodyMid, 'front: the left sleeve panel sits on the viewer right (mirrored bake canvas)');
const backMid = by(back, 'back-centre').cx;
ok(by(back, 'sleeve-wearer-left').cx < backMid && by(back, 'sleeve-wearer-right').cx > backMid, 'back: the left sleeve panel sits on the viewer left');
for (const [side, list, h] of [['front', front, H], ['back', back, P.canvasSize(frames.back, W).height]]) {
  ok(list.every(s => s.cx - s.maxW / 2 >= -1 && s.cx + s.maxW / 2 <= W + 1 && s.cy - s.maxH / 2 >= -1 && s.cy + s.maxH / 2 <= h + 1), side + ': every spot box stays on the canvas');
  ok(list.every(s => s.maxW > 0 && s.maxH > 0), side + ': every spot has a positive size');
}
ok(by(front, 'chest').cy < by(front, 'lower-front').cy && by(back, 'upper-back').cy < by(back, 'lower-back').cy, 'spots run top to bottom');
ok(S.panelSpots(panels.filter(p => p.part !== 'sleeve_l'), 'front', frames.front, W).every(s => s.id !== 'sleeve-wearer-left'), 'a spot is offered only when its panel is drawn');
ok(S.panelSpots([], 'front', frames.front, W).length === 0, 'no body panel means no spots');
ok(S.spotScale(100, 50, { maxW: 200, maxH: 200 }) === 1 && S.spotScale(400, 50, { maxW: 200, maxH: 200 }) === 0.5, 'artwork is shrunk to fit, never enlarged');
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
