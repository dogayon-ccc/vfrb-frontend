// Top -> Bottom -> Top switching, set save/reopen and the Pilot gate, on the real serializer. Run: node tools/set-switch-checks.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vfrb-set-'));
fs.writeFileSync(path.join(dir, 'entry.ts'), ['designSerialization', 'uniformSet', 'studioAssets'].map(f => `export * from ${JSON.stringify(path.join(root, 'src/pages/client/design-studio', f))};`).join('\n'));
const load = async pilot => {
  const out = path.join(dir, `m${pilot}.mjs`);
  await build({ entryPoints: [path.join(dir, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', define: { 'import.meta.env.VITE_STUDIO_PILOT': JSON.stringify(pilot) },
    plugins: [{ name: 'glob', setup(b) { b.onLoad({ filter: /\.tsx?$/ }, a => { const t = fs.readFileSync(a.path, 'utf8'); return t.includes('import.meta.glob') ? { contents: t.replace(/import\.meta\.glob\([^)]*\)/g, '({})'), loader: a.path.endsWith('x') ? 'tsx' : 'ts' } : null; }); } }] });
  return import(out);
};
const P = await load('1'), N = await load('0');
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const text = (id, s) => ({ type: 'i-text', text: s, left: 40, top: 50, __layerId: id, __text: true });
const bundle = (front, back = []) => ({ overlays: front, frontOverlays: front, backOverlays: back });
const top = { name: 'Ward A', category: 'Medical / Healthcare', garment: 'Scrub Top', fit: 'male', sleeve: 'Short', colors: { body: '#028090', sleeve: '#028090' } };
const bottom = { name: '', category: 'Medical / Healthcare', garment: 'Jogger Scrub Pants', fit: 'male', sleeve: null, colors: { body: '#1B2A4A' } };
const art = { front: [{ type: 'i-text', text: 'ICU', left: 10, top: 10 }], back: [] };

t('switch Top -> Bottom -> Top keeps each piece\'s overlays, colours and garment', () => {
  const topSnap = P.serializeDesign(top, bundle([text('a', 'TOP-LOGO')], [text('b', 'TOP-BACK')]));
  let set = { id: 'set-1', active: 'top', pieces: { top: null, bottom: null } };
  set = { ...set, active: 'bottom', pieces: { ...set.pieces, top: topSnap } };                       // switchPiece(bottom): outgoing top is stored
  const b = P.deserializeDesign(P.serializeDesign(bottom, bundle([text('c', 'BOTTOM-LOGO')])));
  const bottomSnap = P.serializeDesign({ ...b.cfg, name: 'Ward A' }, bundle(b.frontOverlays));
  set = { ...set, active: 'top', pieces: { ...set.pieces, bottom: bottomSnap } };                    // switchPiece(top): outgoing bottom is stored
  const back = P.deserializeDesign(set.pieces.top);
  assert.equal(back.cfg.garment, 'Scrub Top');
  assert.equal(back.frontOverlays[0].text, 'TOP-LOGO');
  assert.equal(back.backOverlays[0].text, 'TOP-BACK');
  assert.equal(back.cfg.colors.body, '#028090');
  assert.equal(P.deserializeDesign(set.pieces.bottom).frontOverlays[0].text, 'BOTTOM-LOGO');
});
t('a saved set survives JSON, reopen and normalizeSet with both pieces', () => {
  const snap = P.withSet(P.serializeDesign(top, bundle([text('a', 'X')])), { id: 'set-2', active: 'top', pieces: { top: null, bottom: P.serializeDesign(bottom, bundle([text('c', 'Y')])) } });
  const set = P.normalizeSet(JSON.parse(JSON.stringify(snap)).uniformSet);
  assert.equal(set.id, 'set-2'); assert.equal(set.active, 'top');
  assert.equal(set.pieces.bottom.garment, 'Jogger Scrub Pants'); assert.equal(set.pieces.bottom.frontOverlays[0].text, 'Y');
  assert.equal(set.pieces.top.frontOverlays[0].text, 'X');
});
t('a set has one name whichever piece it was typed on', () => {
  const snap = P.withSet(P.serializeDesign({ ...top, name: 'Night shift' }, bundle([])), { id: 's', active: 'top', pieces: { top: null, bottom: P.serializeDesign({ ...bottom, name: 'old' }, bundle([])) } });
  assert.equal(snap.uniformSet.pieces.bottom.name, 'Night shift');
});
t('a piece on the wrong role\'s garment is dropped, never moved', () => {
  const set = P.normalizeSet({ id: 's', active: 'top', pieces: { top: P.serializeDesign(bottom, bundle([])), bottom: P.serializeDesign(top, bundle([])) } });
  assert.equal(set.pieces.top, null); assert.equal(set.pieces.bottom, null);
});
t('order queue lists top first, shares the name, and needs both pieces', () => {
  const snap = P.withSet(P.serializeDesign(top, bundle([])), { id: 'set-3', active: 'top', pieces: { top: null, bottom: P.serializeDesign(bottom, bundle([])) } });
  const q = P.orderQueue(snap);
  assert.deepEqual(q.map(p => p.uniformSet.role), ['top', 'bottom']); assert.ok(q.every(p => p.name === 'Ward A'));
  assert.equal(P.orderQueue(P.withSet(P.serializeDesign(top, bundle([])), { id: 'x', active: 'top', pieces: { top: null, bottom: null } })), null);
});
t('Pilot on: panel art and the asset identity ride with the baked top only', () => {
  const s = P.serializeDesign({ ...top, panelArt: art }, bundle([]));
  assert.equal(s.assetId, 'vfrb.scrub-top.pilot01'); assert.equal(s.panelArt.front[0].text, 'ICU');
  assert.equal(P.deserializeDesign(JSON.parse(JSON.stringify(s))).panelArt.front[0].text, 'ICU');
});
t('a stale asset reference and panel art never leak onto the bottom piece', () => {
  const stale = { ...bottom, assetId: 'vfrb.scrub-top.pilot01', assetVersion: '1.0.0', mappingHash: 'c59c80d7c7f9c7590a233b0a299a54774078022379a77216c938ee8941878bfa', panelArt: art };
  const s = P.serializeDesign(stale, bundle([]));
  assert.equal(s.assetId, undefined); assert.equal(s.panelArt, undefined);
});
t('Pilot off (production): no baked identity, no panel art, the top still saves and reopens', () => {
  const s = N.serializeDesign({ ...top, panelArt: art }, bundle([text('a', 'K')]));
  assert.equal(s.assetId, undefined); assert.equal(s.panelArt, undefined);
  assert.equal(N.deserializeDesign(JSON.parse(JSON.stringify(s))).frontOverlays[0].text, 'K');
});
t('an old single-face save restores onto the front, back stays empty', () => {
  const d = P.deserializeDesign({ garment: 'Scrub Top', sleeve: 'Short', overlays: [text('a', 'OLD')] });
  assert.equal(d.frontOverlays[0].text, 'OLD'); assert.deepEqual(d.backOverlays, []);
});
fs.rmSync(dir, { recursive: true, force: true });
console.log(`${n}/${n} passed`);
