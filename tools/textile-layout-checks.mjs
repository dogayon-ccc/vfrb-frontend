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
const LG = await v.ssrLoadModule('/src/pages/client/design-studio/layerGroups.ts');
const R = await v.ssrLoadModule('/src/pages/client/design-studio/overlayRemap.ts');
const P = await v.ssrLoadModule('/src/pages/client/design-studio/garmentPaths.ts');
const PT = await v.ssrLoadModule('/src/pages/client/design-studio/pickerTab.ts');

const PA = await v.ssrLoadModule('/src/pages/client/design-studio/placeAt.ts');
const FL = await v.ssrLoadModule('/src/pages/client/design-studio/fabricLooks.ts');
const SER = await v.ssrLoadModule('/src/pages/client/design-studio/designSerialization.ts');
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

// ---- layer groups ----
const o = (id, extra = {}) => ({ __layerId: id, __shape: true, ...extra });
t('group: needs two groupable layers; locked, base and unmapped objects never join', () => {
  const all = [o('a'), o('b'), o('c', { __locked: true }), o('d', { __garmentBase: true }), o('e', { __unmapped: true })];
  assert.equal(LG.canGroup(all, [all[0]]), false); assert.equal(LG.canGroup(all, [all[0], all[1]]), true);
  assert.equal(LG.canGroup(all, [all[0], all[2]]), false); assert.equal(LG.canGroup(all, [all[0], all[3], all[4]]), false);
});
t('group assigns one id, keeps every member\'s own layer id and zone, and a whole group is not groupable again', () => {
  const all = [o('a', { __zone: 'body' }), o('b', { __zone: 'sleeveL' }), o('c')];
  const ch = LG.groupObjects(all, [all[0], all[1]], 'g1');
  assert.deepEqual(ch.map(x => x.__layerId), ['a', 'b']); assert.deepEqual(all.map(x => x.__groupId), ['g1', 'g1', undefined]);
  assert.equal(all[0].__zone, 'body'); assert.equal(all[1].__zone, 'sleeveL');
  assert.equal(LG.canGroup(all, [all[0], all[1]]), false); assert.equal(LG.canGroup(all, [all[0], all[2]]), true);
});
t('picking one member selects the whole group in stack order', () => {
  const all = [o('a', { __groupId: 'g' }), o('x'), o('b', { __groupId: 'g' }), o('y')];
  assert.deepEqual(LG.expandSelection(all, [all[2]]).map(x => x.__layerId), ['a', 'b']);
  assert.deepEqual(LG.expandSelection(all, [all[1]]).map(x => x.__layerId), ['x']);
});
t('grouping across an existing group absorbs it (no nested groups)', () => {
  const all = [o('a', { __groupId: 'g1' }), o('b', { __groupId: 'g1' }), o('c')];
  LG.groupObjects(all, [all[0], all[2]], 'g2'); assert.deepEqual(all.map(x => x.__groupId), ['g2', 'g2', 'g2']);
});
t('ungroup clears every member of the touched group and nothing else', () => {
  const all = [o('a', { __groupId: 'g1' }), o('b', { __groupId: 'g1' }), o('c', { __groupId: 'g2' }), o('d', { __groupId: 'g2' })];
  const ch = LG.ungroupObjects(all, [all[0]]); assert.equal(ch.length, 2);
  assert.deepEqual(all.map(x => x.__groupId), [undefined, undefined, 'g2', 'g2']); assert.equal(LG.canUngroup([all[0]]), false); assert.equal(LG.canUngroup([all[2]]), true);
});
t('panel helpers: group-wide layer ids and stable group names', () => {
  const rows = [{ id: 'a', groupId: 'g9' }, { id: 'b', groupId: null }, { id: 'c', groupId: 'g9' }, { id: 'd', groupId: 'g3' }];
  assert.deepEqual(LG.layerIdsFor(rows, 'a'), ['a', 'c']); assert.deepEqual(LG.layerIdsFor(rows, 'b'), ['b']);
  const n = LG.groupLabels(rows); assert.equal(n.get('g9'), 'Group 1'); assert.equal(n.get('g3'), 'Group 2');
});
t('group ids survive a garment switch and return (zone-aware remap keeps every member and its group)', () => {
  const ab = (g) => { const p = P.getGarmentPaths(g, 'Short', 'front'); return { w: p.w, h: p.h, key: `${g}|Short|female`, face: 'front' }; };
  const polo = ab('Polo Shirt'), zs = zonesResolver(polo.key, 'front'), c = zs.body.box;
  const mk = (id, x) => R.stampArtboard({ __layerId: id, __groupId: 'grp', __artwork: true, originX: 'center', originY: 'center', left: x, top: c.t + c.h * 0.3, width: 20, height: 20, scaleX: 1, scaleY: 1, visible: true }, polo);
  const list = [mk('m1', c.l + c.w * 0.4), mk('m2', c.l + c.w * 0.6)];
  const away = R.remapPlain(list, ab('Pants'), zonesResolver), home = R.remapPlain(away, polo, zonesResolver);
  assert.equal(away.length, 2); assert.ok(away.every(x => x.__groupId === 'grp'));
  assert.deepEqual(home.map(x => x.__layerId), ['m1', 'm2']); assert.ok(home.every(x => x.__groupId === 'grp' && !x.__unmapped));
});


t('place-at: spots exist only for drawn zones, are blocked by closures, and keep artwork on the cloth', () => {
  let polo = 0, sleeves = 0;
  for (const g of names) {
    for (const face of ['front', 'back']) {
      const zones = zonesResolver(`${g}|Short|female`, face); if (!zones) continue;
      for (const s of PA.spotsFor(zones, face)) {
        assert.equal(s.face, face); assert.ok(zones[s.zone]);
        if (s.zone.startsWith('sleeve')) sleeves++;
        const st = PA.checkSpot(zones, s, 40, 40);
        if (st.ok) { const p = PA.placeAtPatch({ width: 40, height: 40, scaleX: 1, scaleY: 1, originX: 'left', originY: 'top' }, s);
          assert.ok(Math.abs(p.left + (40 * p.scaleX) / 2 - s.cx) < 1e-6 && p.scaleX <= 1); polo++; }
        else assert.ok(st.reason);
      }
    }
  }
  assert.ok(polo > 0, 'no usable spots');
});
t('place-at: front/back/sleeve rules', () => {
  const box = { l: 0, t: 0, w: 200, h: 300 }, poly = [[0,0],[200,0],[200,300],[0,300]];
  const zones = { body: { key: 'body', poly, box }, sleeveR: { key: 'sleeveR', poly: [[200,0],[260,0],[260,100],[200,100]], box: { l: 200, t: 0, w: 60, h: 100 } } };
  const f = PA.spotsFor(zones, 'front').map(x => x.id), b = PA.spotsFor(zones, 'back').map(x => x.id);
  assert.deepEqual(f, ['chest', 'left-chest', 'front-bottom', 'right-sleeve']);
  assert.deepEqual(b, ['back', 'back-neck', 'right-sleeve']);
  assert.equal(PA.spotsFor(null, 'front').length, 0);
  zones.body.avoid = [{ l: 90, t: 0, w: 20, h: 300 }];
  const chest = PA.spotsFor(zones, 'front')[0];
  assert.equal(PA.checkSpot(zones, chest, 30, 30).ok, false);
  const huge = PA.placeAtPatch({ width: 500, height: 500, scaleX: 1, scaleY: 1, originX: 'center', originY: 'center' }, chest);
  assert.ok(500 * huge.scaleX <= chest.maxW + 1e-6);
});

t('fabric looks: unique ids, unknown ids fall back, tiles are periodic and stay light enough to keep colours true', () => {
  assert.equal(new Set(FL.LOOK_IDS).size, FL.LOOK_IDS.length);
  assert.equal(FL.normalizeLook('<script>'), 'plain'); assert.equal(FL.normalizeLook(undefined), 'plain'); assert.equal(FL.normalizeLook('twill'), 'twill');
  const sig = new Set();
  for (const l of FL.FABRIC_LOOKS) {
    for (const [i, j] of [[0, 0], [5, 9], [40, 71]]) assert.equal(FL.weaveBase(l.id, i, j), FL.weaveBase(l.id, i + FL.TILE, j), l.id + ' x'), assert.equal(FL.weaveBase(l.id, i, j), FL.weaveBase(l.id, i, j + FL.TILE), l.id + ' y');
    if (l.id === 'plain') continue;
    const px = FL.lookPixels(l.id, 96); let min = 255, sum = 0;
    for (let k = 0; k < px.length; k += 4) { min = Math.min(min, px[k]); sum += px[k]; assert.ok(px[k] === px[k + 1] && px[k + 3] === 255); }
    assert.ok(min >= 255 * (1 - l.amp / 100) - 1, l.id + ' too dark');
    assert.ok(sum / (px.length / 4) > 255 * 0.7, l.id + ' mean too dark');
    assert.ok(max(px) - min > 4, l.id + ' flat');
    sig.add(Array.from(px.slice(0, 400)).join());
  }
  assert.equal(sig.size, FL.FABRIC_LOOKS.length - 1, 'every weave must differ');
  function max(a) { let m = 0; for (let k = 0; k < a.length; k += 4) m = Math.max(m, a[k]); return m; }
});
t('fabric look saves only when chosen, restores, and hostile values reset to standard', () => {
  const base = { garment: 'Polo Shirt', fit: 'female' };
  const plain = SER.serializeDesign({ ...base }, {}); assert.equal(plain.fabricLook, undefined);
  const saved = SER.serializeDesign({ ...base, fabricLook: 'pique' }, {}); assert.equal(saved.fabricLook, 'pique');
  assert.equal(SER.deserializeDesign(saved).cfg.fabricLook, 'pique');
  assert.equal(SER.deserializeDesign({ ...saved, fabricLook: { x: 1 } }).cfg.fabricLook, 'plain');
  assert.equal(SER.deserializeDesign(null).cfg.fabricLook, 'plain');
});
console.log(`\n${pass} passed, ${fail} failed`);
await v.close();
process.exit(fail ? 1 : 0);
