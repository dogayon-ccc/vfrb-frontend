// Run: node tools/textile-layout-checks.mjs   (textile library data, params, SVG; closure keep-out for ready-made layouts on every template; garment-chip tab)
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const v = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
const X = await v.ssrLoadModule('/src/pages/client/design-studio/textiles.ts');
const S = await v.ssrLoadModule('/src/pages/client/design-studio/dsShared.ts');
const W = await v.ssrLoadModule('/src/pages/client/design-studio/wovenPatterns.ts');
const Z = await v.ssrLoadModule('/src/pages/client/design-studio/zoneMap.ts');
const LL = await v.ssrLoadModule('/src/pages/client/design-studio/layoutLibrary.ts');
const G = await v.ssrLoadModule('/src/pages/client/design-studio/garmentCatalog.ts');
const { zonesResolver } = await v.ssrLoadModule('/src/pages/client/design-studio/zoneResolver.ts');
const PT = await v.ssrLoadModule('/src/pages/client/design-studio/pickerTab.ts');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '\n    ', e.message.split('\n')[0]); } };

t('library has 60+ textiles with unique ids in known categories', () => {
  assert.ok(X.TEXTILES.length >= 60, String(X.TEXTILES.length));
  assert.equal(new Set(X.TEXTILES.map(x => x.id)).size, X.TEXTILES.length);
  for (const x of X.TEXTILES) { assert.ok(X.TEXTILE_CATEGORIES.includes(x.cat), x.id); assert.ok(x.shapes.length && x.w > 0 && x.h > 0, x.id); }
  for (const c of X.TEXTILE_CATEGORIES) assert.ok(X.TEXTILES.some(x => x.cat === c), c);
});
t('every shape stays in sane unit coordinates and uses a known colour role', () => {
  for (const x of X.TEXTILES) for (const s of x.shapes) {
    assert.ok(['a', 'b', 'bg'].includes(s.c), x.id);
    const pts = s.pts ?? [[s.x, s.y]]; for (const [u, w] of pts) assert.ok(u > -2 && u < 3 && w > -2 && w < 3, `${x.id} ${u},${w}`);
  }
});
t('Philippine-inspired entries carry the original-design disclaimer, never a claim of authenticity', () => {
  const ph = X.TEXTILES.filter(x => x.cat === 'Philippine-inspired'); assert.ok(ph.length >= 5);
  for (const x of ph) assert.ok(/original VFRB design/i.test(x.note) && /not an authentic/i.test(x.note), x.id);
});
t('params clamp and sanitise hostile input', () => {
  const p = X.textileParams({ scale: 99, rotation: -45, opacity: -3, ox: 7, oy: NaN, a: 'red', b: '#ABCDEF', bg: 5 }, '#123456');
  assert.equal(p.scale, 4); assert.equal(p.rotation, 315); assert.equal(p.opacity, 0.1); assert.equal(p.ox, 1); assert.equal(p.oy, 0);
  assert.equal(p.bg, '#123456'); assert.equal(p.b, '#abcdef'); assert.match(p.a, /^#[0-9a-f]{6}$/);
  assert.equal(X.textileParams(null, 'bad').bg, '#1b2a4a');
});
t('default colours are tonal and legible on light and dark cloth', () => {
  const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };
  assert.ok(lum(X.textileParams({}, '#ffffff').a) < 90); assert.ok(lum(X.textileParams({}, '#101828').a) > 160);
});
t('SVG is well-formed, uses the chosen colours, and draws every shape at 9 wrap offsets', () => {
  const x = X.TEXTILES[0], svg = X.textileSvg(x.id, { a: '#ff0000', bg: '#00ff00' }, '#000000');
  assert.match(svg, /^<svg [^>]*viewBox=/); assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('fill="#00ff00"') && svg.includes('#ff0000'));
  assert.equal((svg.match(/<rect /g) ?? []).length, 1 + x.shapes.filter(s => s.t === 'r').length * 9);
  for (const t2 of X.TEXTILES) { const s = X.textileSvg(t2.id, {}, '#224466'); assert.ok(!/NaN|undefined/.test(s), t2.id); }
});
t('scale changes the sketch size of one repeat; rotation and offset reach the pattern matrix', () => {
  const x = X.textileById('t-awning'), a = X.tileSketchSize(x, 1), b = X.tileSketchSize(x, 2);
  assert.ok(Math.abs(b.w - 2 * a.w) < 1 && Math.abs(b.h - 2 * a.h) < 1);
  const m = X.textileMatrix('t-awning', X.textileParams({ rotation: 90, ox: 0.5, oy: 0 }, '#fff'));
  assert.ok(Math.abs(m[0]) < 1e-9 && Math.abs(m[1] - 1 / X.RES) < 1e-9); assert.ok(Math.abs(m[4] - 0.5 * X.tileSketchSize(x, 1).w) < 1e-9);
});
t('repeat toggles map to canvas repeat modes', () => {
  const f = (rx, ry) => X.textileRepeat(X.textileParams({ rx, ry }, '#fff'));
  assert.deepEqual([f(true, true), f(true, false), f(false, true), f(false, false)], ['repeat', 'repeat-x', 'repeat-y', 'no-repeat']);
});
t('textiles are registered as 2D-only patterns and old ids still resolve', () => {
  assert.ok(S.PATTERNS.some(p => p.id === 't-fern' && p.textile && !p.woven));
  assert.ok(S.PATTERNS.some(p => p.id === 'solid') && S.PATTERNS.some(p => p.woven));
  assert.equal(new Set(S.PATTERNS.map(p => p.id)).size, S.PATTERNS.length);
});
t('spec description names zone, pattern, colours, scale and rotation', () => {
  const d = W.describePatterns({ body: 't-argyle', sleeve: 'solid' }, { body: { a: '#112233', b: '#445566', scale: 1.5, rotation: 45 } }, { body: '#ffffff' }, id => id);
  assert.equal(d.length, 1); assert.match(d[0], /Body: Argyle .*#112233.*#445566.*1\.5x, 45°/);
});
t('no textile id is ever treated as woven', () => { for (const x of X.TEXTILES) assert.equal(W.isWoven(x.id), false, x.id); });

t('closure keep-out: only buttons and a tall central placket line are derived', () => {
  const body = { l: 0, t: 0, w: 100, h: 100 };
  const b = Z.closureBoxes([{ kind: 'line', d: 'M 45,10 L 45,60 L 55,60 L 55,10' }, { kind: 'button', d: 'M 50,20 L 52,20 L 52,22 L 50,22 Z' }, { kind: 'line', d: 'M 5,50 L 95,50' }, { kind: 'seam', d: 'M 50,0 L 50,90' }], body);
  assert.equal(b.length, 2);
  assert.deepEqual(Z.closureBoxes(undefined, body), []);
});
t('Polo front exposes placket keep-out; T-Shirt (no closure) exposes none', () => {
  assert.ok(zonesResolver('Polo Shirt|Short|female', 'front').body.avoid.length >= 4);
  assert.equal(zonesResolver('T-Shirt|Short|female', 'front').body.avoid, undefined);
});
const names = Object.keys(G.FAMILY_BY_NAME);
t('every ready-made layout, on every template and face, clears placket and buttons across its FULL rotated bounds', () => {
  let checked = 0;
  for (const n of names) for (const face of ['front', 'back']) {
    const zs = zonesResolver(`${n}|Short|female`, face); if (!zs?.body?.avoid) continue;
    for (const l of LL.layoutsFor(zs, face).filter(x => x.zone === 'body')) for (const it of l.view.items) {
      const bb = LL.aabb(LL.probe(it.x, it.y, it.width, it.drawH ?? it.height ?? it.width, it.angle ?? 0));
      for (const a of zs.body.avoid) assert.ok(!Z.boxesOverlap(a, bb), `${n}/${face}/${l.id}/${it.name}`);
      checked++;
    }
  }
  assert.ok(checked > 50, `only ${checked} items checked`);
});
t('Polo left-chest layouts are all still offered and sit on the wearer-left (viewer right) of the placket', () => {
  const zs = zonesResolver('Polo Shirt|Short|female', 'front'), ls = LL.layoutsFor(zs, 'front').filter(l => l.cat === 'Left chest');
  assert.ok(ls.length >= 3);
  const centreX = zs.body.box.l + zs.body.box.w / 2;
  for (const l of ls) for (const it of l.view.items) assert.ok(it.x > centreX + 10, `${l.id} ${it.name} x=${it.x}`);
});
t('garment chip: scratch designs open the scratch templates, reference designs reopen References', () => {
  assert.equal(PT.pickerTabFor({ inspirationId: null }), 'templates'); assert.equal(PT.pickerTabFor({}), 'templates'); assert.equal(PT.pickerTabFor(undefined), 'templates');
  assert.equal(PT.pickerTabFor({ inspirationId: 'ref-12' }), 'inspiration');
});

console.log(`\n${pass} passed, ${fail} failed`);
await v.close();
process.exit(fail ? 1 : 0);
