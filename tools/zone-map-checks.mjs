// Run: node tools/zone-map-checks.mjs   (zone-aware garment switch on the real VFRB templates: mapping, Unmapped Artwork, exact return, undo/redo, save/reopen)
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const v = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
const Z = await v.ssrLoadModule('/src/pages/client/design-studio/zoneMap.ts');
const R = await v.ssrLoadModule('/src/pages/client/design-studio/overlayRemap.ts');
const P = await v.ssrLoadModule('/src/pages/client/design-studio/garmentPaths.ts');
const { zonesResolver } = await v.ssrLoadModule('/src/pages/client/design-studio/zoneResolver.ts');
const G = await v.ssrLoadModule('/src/pages/client/design-studio/garmentCatalog.ts');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '\n    ', e.message.split('\n')[0]); } };

const ab = (garment, sleeve = 'Short', face = 'front') => { const p = P.getGarmentPaths(garment, sleeve, face); return { w: p.w, h: p.h, key: `${garment}|${sleeve}|female`, face }; };
// An interior point of a zone, nearest its box centre (a collar ring's box centre can be a hole).
const inside = (zones, k) => {
  const { box, poly } = zones[k]; let best = null, bd = 1e9;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) { const p = [box.l + (box.w * i) / 24, box.t + (box.h * j) / 24]; if (!Z.inPoly(poly, p)) continue; const d = Math.hypot(p[0] - (box.l + box.w / 2), p[1] - (box.t + box.h / 2)); if (d < bd) { bd = d; best = p; } }
  return best;
};
const art = (id, p, ab0, extra = {}) => R.stampArtboard({ __layerId: id, __artwork: true, originX: 'center', originY: 'center', left: p[0], top: p[1], width: 40, height: 20, scaleX: 1.5, scaleY: 1.5, angle: 12, visible: true, ...extra }, ab0);
const near = (a, b, m = '') => assert.ok(Math.abs(a - b) < 1e-6, `${m} ${a} vs ${b}`);
const place = o => ({ left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY });
const polo = ab('Polo Shirt'), poloZ = zonesResolver(polo.key, 'front');
const mk = (ab0, zones = ['body', 'sleeveL', 'sleeveR', 'pocket', 'collar']) => { const zs = zonesResolver(ab0.key, ab0.face); return zones.map(k => art(`a-${k}`, inside(zs, k), ab0, { __zone: undefined })); };
const strip = o => { const { __ab, ...x } = o; return x; };

t('zones come from the real templates: polo has five, pants only body, blazer has no pocket', () => {
  assert.deepEqual(Object.keys(poloZ).sort(), ['body', 'collar', 'pocket', 'sleeveL', 'sleeveR']);
  assert.deepEqual(Object.keys(zonesResolver('Pants|Short|female', 'front')), ['body']);
  assert.deepEqual(Object.keys(zonesResolver('Blazer|Short|female', 'front')).sort(), ['body', 'collar', 'sleeveL', 'sleeveR']);
  assert.equal(zonesResolver('Polo Shirt|Short|female', 'back').pocket, undefined);
});

t('Polo -> Lab Coat: body + sleeve artwork stays, each inside the same zone, never stretched', () => {
  const lab = ab('Lab Coat'), labZ = zonesResolver(lab.key, 'front'), list = mk(polo, ['body', 'sleeveL', 'sleeveR']);
  const out = R.remapPlain(list, lab, zonesResolver);
  assert.equal(out.length, 3);
  out.forEach((o, i) => { const z = ['body', 'sleeveL', 'sleeveR'][i]; assert.equal(o.visible, true); assert.ok(!o.__unmapped); assert.equal(o.__ab.key, lab.key); assert.ok(Z.inPoly(labZ[z].poly, [o.left, o.top]) || Z.inBox(labZ[z].box, [o.left, o.top]), `${z} lands inside Lab Coat ${z}`); near(o.scaleX, o.scaleY, 'aspect kept'); assert.equal(o.angle, 12); assert.equal(o.__layerId, list[i].__layerId); });
});

t('Polo -> Pants: body kept; sleeve, collar and pocket artwork parked as Unmapped Artwork with garment + zone recorded', () => {
  const pants = ab('Pants'), list = mk(polo), out = R.remapPlain(list, pants, zonesResolver);
  assert.equal(out.length, 5);
  const by = Object.fromEntries(out.map(o => [o.__layerId, o]));
  assert.ok(!by['a-body'].__unmapped && by['a-body'].visible);
  for (const k of ['sleeveL', 'sleeveR', 'pocket', 'collar']) { const o = by[`a-${k}`]; assert.equal(o.__unmapped, true); assert.equal(o.visible, false); assert.equal(o.__origin.key, polo.key); assert.equal(o.__origin.zone, k); assert.equal(o.__origin.face, 'front'); assert.equal(o.__layerId, `a-${k}`); }
});

t('acceptance: Polo (body + sleeve) -> Lab Coat -> Polo, then Pants -> Polo, returns the exact original placement', () => {
  const list = mk(polo, ['body', 'sleeveL']);
  const lab = R.remapPlain(list, ab('Lab Coat'), zonesResolver), back = R.remapPlain(lab, polo, zonesResolver);
  back.forEach((o, i) => { assert.deepEqual(place(o), place(list[i])); assert.ok(!o.__unmapped); });
  const pants = R.remapPlain(R.remapPlain(list, ab('Pants'), zonesResolver), ab('Blazer'), zonesResolver), home = R.remapPlain(pants, polo, zonesResolver);
  home.forEach((o, i) => { assert.deepEqual(place(o), place(list[i])); assert.equal(o.visible, true); assert.ok(!o.__unmapped); });
});

t('parked artwork rejoins a garment that has its zone, without waiting for its home garment', () => {
  const out = R.remapPlain(R.remapPlain(mk(polo, ['sleeveL']), ab('Pants'), zonesResolver), ab('Blazer'), zonesResolver)[0];
  assert.ok(!out.__unmapped && out.visible); assert.ok(Z.inBox(zonesResolver('Blazer|Short|female', 'front').sleeveL.box, [out.left, out.top]));
});

t('Polo -> Blazer: pocket (not drawn on a blazer) is parked; sleeves and collar follow', () => {
  const out = R.remapPlain(mk(polo), ab('Blazer'), zonesResolver);
  assert.deepEqual(out.filter(o => o.__unmapped).map(o => o.__layerId), ['a-pocket']);
});

t('reassigning parked artwork places it inside the chosen zone, visible, and it stays there on the next switch', () => {
  const pants = ab('Pants'), parked = R.remapPlain(mk(polo, ['sleeveL']), pants, zonesResolver)[0], pz = zonesResolver(pants.key, 'front');
  const placed = { ...parked, ...Z.placeInZone(parked, pz.body) };
  assert.ok(placed.visible && !placed.__unmapped && Z.inPoly(pz.body.poly, [placed.left, placed.top]));
  assert.ok(placed.scaleX <= parked.scaleX + 1e-9, 'never enlarged');
  const next = R.remapPlain([placed], ab('Skirt'), zonesResolver)[0];
  assert.ok(!next.__unmapped && next.visible);
});

t('artwork carried onto a zone with a gap (polo body -> trouser legs) lands on the cloth, not between the legs', () => {
  const pants = ab('Pants'), pz = zonesResolver(pants.key, 'front'), body = Z.zonesOf(P.getGarmentPaths('Polo Shirt', 'Short', 'front')).body;
  const c = [body.box.l + body.box.w / 2, body.box.t + body.box.h * 0.9], out = R.remapPlain([art('hem', c, polo)], pants, zonesResolver)[0];
  assert.ok(!out.__unmapped && Z.inPoly(pz.body.poly, [out.left, out.top]));
});

t('front/back share a key: no remap, same objects back', () => {
  const list = mk(polo, ['body']), back = ab('Polo Shirt', 'Short', 'back');
  assert.equal(R.remapPlain(list, back, zonesResolver)[0], list[0]);
});

t('legacy designs without __ab load untouched; art outside every zone keeps its share of the artboard', () => {
  assert.deepEqual(R.remapPlain([{ left: 7, top: 9 }], ab('Pants'), zonesResolver), [{ left: 7, top: 9 }]);
  const free = art('free', [2, 2], polo), out = R.remapPlain([free], ab('Lab Coat'), zonesResolver)[0];
  assert.ok(!out.__unmapped && out.visible); near(out.left, 2 * (340 / 320));
});

t('save and reopen: JSON round trip of a switched design keeps every object, parked ones included', () => {
  const parked = R.remapPlain(mk(polo), ab('Pants'), zonesResolver), reopened = JSON.parse(JSON.stringify(parked));
  assert.equal(reopened.length, 5); assert.equal(reopened.filter(o => o.__unmapped).length, 4);
  const home = R.remapPlain(reopened, polo, zonesResolver), orig = mk(polo);
  home.forEach((o, i) => assert.deepEqual(place(o), place(orig[i])));
});

t('undo/redo: a pre-switch snapshot and a post-switch snapshot both load on either garment without losing objects', () => {
  const before = mk(polo), after = R.remapPlain(before, ab('Pants'), zonesResolver);
  const undoOnPants = R.remapPlain(before, ab('Pants'), zonesResolver), redoOnPolo = R.remapPlain(after, polo, zonesResolver);
  assert.equal(undoOnPants.length, 5); assert.equal(redoOnPolo.length, 5);
  assert.deepEqual(undoOnPants.map(o => !!o.__unmapped), after.map(o => !!o.__unmapped));
  redoOnPolo.forEach((o, i) => assert.deepEqual(place(o), place(before[i])));
});

t('live canvas: remapOverlays parks, hides, deselects, and restores real objects; base and glow untouched', () => {
  const mkObj = o => ({ ...o, set(p) { Object.assign(this, p); return this; }, setCoords() {} });
  const objs = [{ __garmentBase: true, left: 0 }, { __hoverGlow: true, left: 0 }, ...mk(polo, ['body', 'sleeveL']).map(mkObj)];
  let active = objs[3]; const canvas = { getObjects: () => objs, requestRenderAll() {}, getActiveObject: () => active, discardActiveObject() { active = null; } };
  const orig = objs.slice(2).map(place);
  assert.equal(R.remapOverlays(canvas, polo, ab('Pants'), zonesResolver), 2);
  assert.equal(objs[3].__unmapped, true); assert.equal(objs[3].visible, false); assert.equal(active, null); assert.equal(objs[0].left, 0);
  R.remapOverlays(canvas, ab('Pants'), polo, zonesResolver);
  objs.slice(2).forEach((o, i) => { assert.deepEqual(place(o), orig[i]); assert.equal(o.visible, true); });
});

t('every garment pair, sleeve and face: nothing disappears, parked + shown = total, round trip is exact', () => {
  const ids = [...new Set(G.CATALOG.flatMap(c => c.families).map(f => f.id))];
  let combos = 0;
  for (const a of ids) for (const b of ids) for (const face of ['front', 'back']) {
    const A = ab(a, 'Short', face), B = ab(b, 'Long', face), zs = zonesResolver(A.key, face); if (!zs) continue;
    const list = [...Object.keys(zs).map(k => art(`z-${k}`, inside(zs, k), A)), art('free', [1, 1], A)];
    const out = R.remapPlain(list, B, zonesResolver);
    assert.equal(out.length, list.length, `${a}->${b} ${face}`);
    assert.equal(out.filter(o => o.visible !== false).length + out.filter(o => o.__unmapped).length, list.length, `${a}->${b} partition`);
    out.filter(o => o.__unmapped).forEach(o => assert.ok(!zonesResolver(B.key, face)?.[o.__origin.zone], `${a}->${b} parked only unsupported zone ${o.__origin.zone}`));
    if (a !== b) { const home = R.remapPlain(JSON.parse(JSON.stringify(out)), A, zonesResolver); home.forEach((o, i) => { assert.deepEqual(place(o), place(list[i]), `${a}->${b}->${a} ${face}`); assert.ok(!o.__unmapped); }); }
    combos++;
  }
  console.log('     ', combos, 'garment/face combinations');
});

await v.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
