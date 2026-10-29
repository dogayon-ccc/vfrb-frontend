// Run: node tools/logic-checks.mjs   (garment state rules, photo gallery data, photo base, shared preview SSR render)
import { createServer } from 'vite';
const v = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const L = p => v.ssrLoadModule(p);
const G = await L('/src/pages/client/design-studio/garmentCatalog.js');
const S = await L('/src/pages/client/design-studio/designSerialization.js');
const D = await L('/src/pages/client/design-studio/designGallery.js');
const A = await L('/src/pages/client/design-studio/garmentAssets.js');
const Sh = await L('/src/pages/client/design-studio/dsShared.js');
// GLBs live on Cloudinary (tools/modelFiles.mjs): fetch any the checks need into the local cache before reading them.
const MF = await import('./modelFiles.mjs');
await MF.fetchModels(MF.studioModelPaths({ GS: await L('/src/pages/client/design-studio/glbSlots.js'), C: await L('/src/pages/client/design-studio/garmentCapabilities.js'), D }));
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const Prev = (await L('/src/components/DesignPreview.jsx')).default;
const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
const base = { category: 'School Uniform', garment: 'Polo Shirt', sleeve: 'Short', fit: 'female' };
{ // Studio undo history (one per garment side) and the save status chip/dock line
  const H = await L('/src/pages/client/design-studio/editHistory.js'), SS = (await L('/src/pages/client/design-studio/saveStatus.js')).saveStatus;
  let h = H.emptyHistory(); h = H.pushStep(h, ['a']); h = H.pushStep(h, ['a', 'b']);
  const u = H.stepHistory(h, -1), r = u && H.stepHistory(u.history, 1);
  t('history: undo then redo returns the same snapshots; nothing past either end', u.snapshot.join() === 'a' && r.snapshot.join() === 'a,b' && H.stepHistory(H.emptyHistory(), -1) === null && H.stepHistory(h, 1) === null);
  t('history: a new step after an undo drops the redo branch; the stack is capped', (x => x.stack.length === 3 && !H.canStep(x, 1))(H.pushStep(u.history, ['c'])) && Array.from({ length: 60 }).reduce(x => H.pushStep(x, []), H.emptyHistory()).stack.length === H.HISTORY_LIMIT);
  const fm = H.pushStep(h, ['x']), fd = H.pushStep(H.pushStep(H.pushStep(fm, ['x', 'y']), ['x', 'y', 'z']), ['x', 'y', 'z', 'w']), fo = H.foldSince(fd, fm);
  t('history: an applied AI preview folds into exactly one undo step back to the mark', fo.stack.length === fm.stack.length + 1 && H.stepHistory(fo, -1).snapshot === fm.stack[fm.idx] && fo.stack[fo.idx].join() === 'x,y,z,w' && H.foldSince(fm, fm) === fm && H.foldSince(fd, H.emptyHistory()) === fd);
  const f = H.switchSide({}, 'front', h, 'back', ['logo']), b = H.switchSide(f.parked, 'back', H.pushStep(f.history, ['logo', 'text']), 'front', []);
  t('history: switching sides parks one history and resumes the other (front keeps its undo, back starts at what loaded)', f.history.stack.length === 1 && f.history.stack[0].join() === 'logo' && b.history === h && H.canStep(b.history, -1) && b.parked.back.stack.length === 2 && !('front' in b.parked));
  const lk = (g, body, pat = 'solid') => H.lookOf({ garment: g, sleeve: 'Short', fit: null, colors: { body }, patterns: { body: pat } });
  let lh = H.emptyHistory(H.entry([], lk('Polo Shirt', '#ffffff')));
  lh = H.syncLook(lh, lk('Polo Shirt', '#ff0000')); lh = H.syncLook(lh, lk('Polo Shirt', '#ff0000', 'hstripes'));
  const lu = H.stepHistory(lh, -1);
  t('history: colour and pattern changes are undo steps, and undo paints the previous look back', lh.stack.length === 3 && H.sameLook(H.lookToApply(lu.snapshot, lh.stack[2].look), lk('Polo Shirt', '#ff0000')) && H.syncLook(lh, lk('Polo Shirt', '#ff0000', 'hstripes')) === lh);
  const rekey = H.syncLook(lh, lk('Scrub Top', '#00ff00'));
  t('history: a garment change re-keys the entry (no step), and undo never paints one garment’s colours onto another', rekey.stack.length === 3 && rekey.stack[2].look.k.startsWith('Scrub Top') && H.lookToApply(lh.stack[1], rekey.stack[2].look) === null);
  t('save status: only an account save reads "Saved"; a browser-only copy, failures and unsaved edits each read differently; there is always a state (never blank)',
    SS({ auto: 'saved' }).short === 'Saved' && SS({ saved: true }).short === 'This device' && SS({ saveErr: 'local', auto: 'saved' }).tone === 'err' && SS({ saveErr: 'none' }).short === 'Not saved'
    && SS({ auto: 'dirty' }).short === 'Unsaved' && SS({ auto: 'saving' }).tone === 'busy' && SS({ saving: true, saveErr: 'none' }).tone === 'busy' && SS({}).short === 'Unsaved');
}
t('pants null sleeve/fit', (c => c.sleeve === null && c.fit === null)(G.applyGarment(base, 'Pants')));
t('Pants 2D has no photo base; a selected valid pattern is supported by its vector design', !A.assetFor('Pants', null, 'front') && Sh.pattern3D('Pants', null, null, 'body', 'hstripes') === true);
t('switching to a pattern-free photo base clears saved pattern and slider state', (c => Object.keys(c.patterns).length === 0 && Object.keys(c.patternParams).length === 0 && !!A.assetFor(c.garment, c.sleeve, 'front', c.fit))(G.applyGarment({ ...base, patterns: { body: 'hstripes' }, patternParams: { body: { width: 6, spacing: 8 } } }, 'Scrub Top')));
t('photo-base stale patterns are removed on Save and Reload', (() => { const photo = G.applyGarment(base, 'Scrub Top'); const raw = S.serializeDesign({ ...photo, patterns: { body: 'hstripes' }, patternParams: { body: { width: 6 } } }); const loaded = S.deserializeDesign(JSON.parse(JSON.stringify(raw))); return raw.patterns.body === 'solid' && loaded.cfg.patterns.body === 'solid' && Object.keys(loaded.cfg.patternParams).length === 0; })());
t('Pants pattern and color survive Save -> Reload -> Order Wizard snapshot', (() => { const cfg = { ...G.applyGarment(base, 'Pants'), colors: { body: '#274c77' }, patterns: { body: 'hstripes' }, patternParams: { body: { width: 6, spacing: 8 } } }; const saved = S.serializeDesign(cfg, {}); const loaded = S.deserializeDesign(JSON.parse(JSON.stringify(saved))); const order = S.serializeDesign(loaded.cfg ?? loaded, {}); return loaded.cfg.garment === 'Pants' && loaded.cfg.colors.body === '#274c77' && loaded.cfg.patterns.body === 'hstripes' && loaded.cfg.patternParams.body.width === 6 && order.patterns.body === 'hstripes'; })());
t('polo keeps Short and Long (Long is 2D only); a sleeve it does not offer falls back to Short', G.applyGarment({ ...base, sleeve: 'Long' }, 'Polo Shirt').sleeve === 'Long' && G.applyGarment({ ...base, sleeve: '3/4' }, 'Polo Shirt').sleeve === 'Short');
const E0 = id => D.ENTRIES.find(d => d.id === id);
t('gallery = 39 photos only (19 original; Pleated Bib Blouse retired 2026-10-16 + 15 worn cutouts + 5 v3 product photos)', D.ENTRIES.length === 39 && D.ENTRIES.every(d => d.kind === 'photo') && D.ENTRIES.filter(d => d.source === 'worn').length === 15 && D.ENTRIES.filter(d => d.source === 'product').length === 5);
t('no template names as entries', !D.ENTRIES.some(d => ['Polo Shirt', 'Pants', 'Shorts', 'Skirt', 'Round Neck', 'Button-Down'].includes(d.name)));
t('metadata shape', D.ENTRIES.every(d => d.id && d.image && d.label && d.category && d.piece && 'gender' in d && 'sleeve' in d && 'garmentFamily' in d && typeof d.editable2D === 'boolean' && (d.glb === null || d.glb === d.glbSrc) && d.templateId === d.id && d.previewSrc === d.image && 'glbStatus' in d && Array.isArray(d.zones) && d.faces && d.source && d.status));
t('only exact slot-backed photos, photos their family model was generated from, or reference photos with derived pieces have 3D (the Dress Slacks photo lost its gated Meshy model on 2026-10-15)', JSON.stringify(D.ENTRIES.filter(d => d.has3D).map(d => d.id).sort()) === JSON.stringify(['bir-blouse-trousers-blue', 'blazer-blouse-blue', 'blazer-collarless-tan', 'blazer-open-front-black', 'blazer-pinstripe-royal', 'blazer-tweed-herringbone', 'blazer-white-notch', 'blouse-asymmetric-blue', 'blouse-mandarin-yellow', 'blouse-roundneck-fuchsia', 'blouse-tunic-roundneck-blue', 'dress-bir-green-yellow-collar', 'dress-butter-belted', 'dress-tunic-maternity-navy', 'jack-shirt-two-tone', 'polo-red-claremont', 'school-skirt', 'scrub-set-housekeeping', 'scrub-set-men-vneck', 'scrub-set-women-vneck', 'shirt-mandarin-polkadot', 'shirt-utility-beige-long', 'shorts']) && D.ENTRIES.filter(d => d.has3D).every(d => d.glbStatus === 'approx' && (d.base[3] ? d.glbSrc === '/models/garments/' + d.base[3] + '.glb' : d.pieces ? d.glbSrc === (id => `/models/vfrb-derived/${E0(id).pieces.single ? id : id + '-top'}.glb`)(d.id) : d.glbSrc === `/models/vfrb-staged/${({ 'shirt-mandarin-polkadot': 'shirt-mandarin-long-male', 'polo-red-claremont': 'polo-shirt-unisex-short', 'blazer-collarless-tan': 'collarless-blazer-long', 'blazer-pinstripe-royal': 'collarless-blazer-short' })[d.id] ?? d.id}.glb`)));
t('statuses are reference/editable-2d/2d-3d-approx, 3D tier only with a live GLB', D.ENTRIES.every(d => ['reference', 'editable-2d', '2d-3d-approx'].includes(d.tier) && (d.tier === '2d-3d-approx') === !!d.glbSrc));
t('search blazer = 8; the short-sleeve pantsuit opens the rebuilt Short-Sleeve Notch Jacket and is found by "jacket"', D.filterDesigns({ q: 'blazer' }).length === 8 && D.filterDesigns({ q: 'jacket' }).some(d => d.id === 'pantsuit-notch-short-gray'));
t('search mandarin >= 3', D.filterDesigns({ q: 'mandarin' }).length >= 3);
t('filter medical = 2 scrub sets', D.filterDesigns({ category: 'medical' }).length === 2 && D.filterDesigns({ category: 'medical' }).every(d => d.piece === 'set'));
t('unisex has 1 photo (the embroidered polo)', D.facetCounts({}).gender.unisex === 1);
t('33 editable photos: every reference photo with derived pieces opens its own template (yellow blouse included); the two held-back pinstripe suits stay reference-only; polka-dot, red polo, pleated skirt, notch blouse, four blazers and the shirt-dress open their own families', D.ENTRIES.filter(d => d.editable2D).length === 33 && E0('shirt-utility-beige-long').editable2D && E0('blouse-mandarin-yellow').editable2D && !E0('set-pinstripe-pants').editable2D && !E0('set-pinstripe-skirt').editable2D && E0('shirt-mandarin-polkadot').editable2D && ['school-skirt', 'blazer-blouse-blue', 'blazer-tweed-herringbone', 'blazer-white-notch', 'dress-bir-green-yellow-collar'].every(id => E0(id).editable2D));
t('BIR photo opens Button-Down Long + Female on its own template', (o => o.garment === 'Button-Down' && o.sleeve === 'Long' && o.fit === 'female')(D.openTarget(E0('bir-blouse-trousers-blue'), {})) && D.openTarget(E0('shirt-utility-beige-long'), {}).fit === 'male');
for (const d of D.ENTRIES) { const tg = D.openTarget(d, {}); t(`${d.id}: ${d.editable2D ? 'opens ' + tg?.garment : 'reference-only'}`, d.editable2D ? !!G.FAMILY_BY_NAME[tg.garment] : tg === null); }
t('assetFor Scrub Top Short front', !!A.assetFor('Scrub Top', 'Short', 'front'));
t('no asset for 3/4, back, T-Shirt', !A.assetFor('Scrub Top', '3/4', 'front') && !A.assetFor('Scrub Top', 'Short', 'back') && !A.assetFor('T-Shirt', 'Short', 'front'));
t('zonesFor photo base = [body]', JSON.stringify(Sh.zonesFor('Scrub Top', 'Short')) === '["body"]');
t('zonesFor 3/4 keeps vector zones', Sh.zonesFor('Scrub Top', '3/4').length > 1);
t('assetFor Mandarin Collar Short front = photo, 2 zones', (a => !!a && a.zones.join() === 'body,collar' && !!a.trim)(A.assetFor('Mandarin Collar', 'Short', 'front')));
t('Mandarin Collar Long is the BIR blouse photo; any back stays vector', A.assetFor('Mandarin Collar', 'Long', 'front')?.id === 'mandarin-blouse-bir-long' && !A.assetFor('Mandarin Collar', 'Short', 'back') && !A.assetFor('Mandarin Collar', 'Long', 'back'));
t('zonesFor mandarin photo = body,collar', Sh.zonesFor('Mandarin Collar', 'Short').join() === 'body,collar');
t('mandarin fits: female (tunic and BIR photo bases) and male (polka-dot shirt model, Long only)', G.FAMILY_BY_NAME['Mandarin Collar'].fits.join() === 'female,male' && G.resolveFit('Mandarin Collar', 'male') === 'male' && G.resolveFit('Mandarin Collar', 'unisex') === 'female');
t('housekeeping photo opens Mandarin Collar Short', (g => g?.garment === 'Mandarin Collar' && g.sleeve === 'Short')(D.openTarget(D.ENTRIES.find(d => d.id === 'scrub-set-housekeeping'), {})));
const E = id => D.ENTRIES.find(d => d.id === id);
t('housekeeping photo lands on the housekeeping asset', (g => A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'mandarin-tunic-housekeeping')(D.openTarget(E('scrub-set-housekeeping'), {})));
t('yellow mandarin blouse opens its own traced Mandarin Blouse (Reference) (never the housekeeping tunic base)', (o => o?.garment === 'Mandarin Blouse (Reference)' && !A.assetFor(o.garment, o.sleeve, 'front', o.fit))(D.openTarget(E('blouse-mandarin-yellow'), {})) && E('blouse-mandarin-yellow').tier === '2d-3d-approx');
t('polka-dot mandarin shirt opens Mandarin Collar / Long / male (vector template, its own model), never the female BIR blouse base', (o => o?.garment === 'Mandarin Collar' && o.sleeve === 'Long' && o.fit === 'male')(D.openTarget(E('shirt-mandarin-polkadot'), {})) && E('shirt-mandarin-polkadot').tier === '2d-3d-approx' && E('shirt-mandarin-polkadot').glb === '/models/vfrb-staged/shirt-mandarin-long-male.glb' && !E('shirt-mandarin-polkadot').exactBase);
t('women scrub photo -> women asset', (g => A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'scrub-top-women-short')(D.openTarget(E('scrub-set-women-vneck'), {})));
t('men scrub photo -> men asset', (g => g.fit === 'male' && A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'scrub-top-men-short')(D.openTarget(E('scrub-set-men-vneck'), {})));
t('sleeve filter the photo does not have is ignored, base unchanged', D.openTarget(E('scrub-set-housekeeping'), { sleeve: 'Long' })?.sleeve === 'Short');
t('unknown asset id -> null', A.assetById('nope') === null && A.assetById('mandarin-tunic-housekeeping')?.src.endsWith('.webp'));
t('photo bases are front-only', !A.hasBackView('Mandarin Collar', 'Short') && !A.hasBackView('Scrub Top', 'Short', 'male') && A.hasBackView('T-Shirt', 'Short') && !A.hasBackView('Mandarin Collar', 'Long') && !A.hasBackView('Round Neck', 'Short') && A.hasBackView('Round Neck', 'Long'));
const R = G.resolveTarget('Mandarin Collar', 'Short', 'female');
t('resolveTarget mandarin: exact tunic photo + its own GLB, approx, no fake fit', R.assetId === 'mandarin-tunic-housekeeping' && R.photo && R.glb === '/models/garments/mandarin-tunic-housekeeping.glb' && R.status === '2d-3d-approx' && R.fit === 'female');
t('mandarin routing: Long male -> polka-dot shirt model on the vector template; Long female (BIR photo) and Short male have no model', (r => r.photo === false && r.templateId === 'mandarin-shirt-long-male' && r.glb === '/models/vfrb-staged/shirt-mandarin-long-male.glb')(G.resolveTarget('Mandarin Collar', 'Long', 'male')) && (r => r.assetId === 'mandarin-blouse-bir-long' && r.glb === null && r.status === 'editable-2d')(G.resolveTarget('Mandarin Collar', 'Long', 'female')) && G.resolveTarget('Mandarin Collar', 'Short', 'male').glb === null);
t('resolveTarget Mandarin Collar Long: band-collar BIR photo, 2D only', (r => r.assetId === 'mandarin-blouse-bir-long' && r.glb === null && r.status === 'editable-2d')(G.resolveTarget('Mandarin Collar', 'Long')));
t('resolveTarget polo: 2D+3D approx, never verified', (r => r.status === '2d-3d-approx' && !!r.glb)(G.resolveTarget('Polo Shirt', 'Short', 'female')));
t('resolveTarget Button-Down Long (unisex, default) keeps the vector template and gets the utility-shirt 3D model', (r => r.assetId === null && r.photo === false && r.glb === '/models/vfrb-staged/shirt-utility-beige-long.glb' && r.status === '2d-3d-approx' && r.fit === 'unisex')(G.resolveTarget('Button-Down', 'Long')));
t('resolveTarget Button-Down Long + Female -> separate BIR photo template + its own GLB, approx', (r => r.assetId === 'button-down-bir-long' && r.fit === 'female' && r.glb === '/models/garments/button-down-bir-long.glb' && r.status === '2d-3d-approx')(G.resolveTarget('Button-Down', 'Long', 'female')));
t('Button-Down offers Unisex and Female fits; unisex keeps the vector back view, female BIR is front-only', G.FAMILY_BY_NAME['Button-Down'].fits.join() === 'unisex,female' && A.hasBackView('Button-Down', 'Long', 'unisex') && !A.hasBackView('Button-Down', 'Long', 'female'));
t('resolveTarget Button-Down Short: the work-shirt scan, no photo', (r => r.assetId === null && r.glb === '/models/processed/work-shirt-short-sleeve-capped.glb' && r.status === '2d-3d-approx')(G.resolveTarget('Button-Down', 'Short')));
t('Button-Down Short + Female: no photo base, the work-shirt scan (no fake women\'s photo)', (r => r.assetId === null && r.glb === '/models/processed/work-shirt-short-sleeve-capped.glb' && r.status === '2d-3d-approx')(G.resolveTarget('Button-Down', 'Short', 'female')));
const Cp = await L('/src/pages/client/design-studio/garmentCapabilities.js');
t('Pants has no generated 3D pattern without a 2D pattern selection', Object.keys(Cp.patternsFor3D(Cp.scannedEntryFor('Pants', null, null), {})).length === 0);
t('Pants cannot receive unknown or 2D-only stale pattern state in 3D', Cp.patternsFor3D(Cp.scannedEntryFor('Pants', null, null), { body: 'stale-not-a-pattern' }).body === 'solid' && Cp.patternsFor3D(Cp.scannedEntryFor('Pants', null, null), { body: 'geometric' }).body === 'solid' && Sh.PATTERNS.some(p => p.id === 'geometric'));
t('photo-backed GLB ignores stale pattern state even if the model could shade it', Object.values(Cp.patternsFor3D(Cp.scannedEntryFor('Pants', null, null), { body: 'hstripes' }, { photoBase: true })).every(v => v === 'solid'));
t('3D selector: BIR entry only for Long + female; unisex Long -> utility shirt; Short -> work shirt; Mandarin Long -> none', Cp.scannedEntryFor('Button-Down', 'Long', 'female')?.id === 'button-down-bir-blouse' && Cp.scannedEntryFor('Button-Down', 'Long', 'unisex')?.id === 'button-down-utility-long' && Cp.scannedEntryFor('Button-Down', 'Short', 'unisex')?.id === 'work-shirt' && Cp.scannedEntryFor('Button-Down', 'Short', 'female')?.id === 'work-shirt' && Cp.scannedEntryFor('Mandarin Collar', 'Long', 'female') === null);
t('sleeve 3D labels are per fit: Button-Down unisex and female both Short+Long', Cp.sleeves3DFor('Button-Down', 'unisex').join() === 'Short,Long' && Cp.sleeves3DFor('Button-Down', 'female').join() === 'Short,Long');
t('explicit men/women never lands on the other gender photo', A.assetFor('Round Neck', 'Short', 'front', 'male') === null && A.assetFor('Scrub Top', 'Short', 'front', 'male')?.id === 'scrub-top-men-short');
t('resolveTarget unknown -> null', G.resolveTarget('Garbage') === null);
t('no current garment is verified (honest zero)', Object.keys(G.FAMILY_BY_NAME).every(g => G.resolveTarget(g, null, null).status !== '2d-3d' && !G.FAMILY_BY_NAME[g].verified3D));
t('statusFor supports a future verified asset', G.statusFor({ editable2D: true, has3D: true, verified3D: true }) === '2d-3d' && G.statusFor({ editable2D: true, has3D: true, verified3D: false }) === '2d-3d-approx' && G.statusFor({ editable2D: true, has3D: false, verified3D: true }) === 'editable-2d' && G.statusFor({ editable2D: false, has3D: true, verified3D: true }) === 'reference');
const sc = S.serializeDesign({ ...G.applyGarment(base, 'Mandarin Collar'), colors: { body: '#123456', collar: '#abcdef' }, overlays: [] });
const ph = renderToString(React.createElement(Prev, { cfg: sc, height: 220 }));
t('mandarin preview: one photo (front only), no vector svg', (ph.match(/<img/g) || []).length === 1 && !ph.includes('<svg') && ph.includes('mandarin-tunic-housekeeping'));
const ser = S.serializeDesign({ ...G.applyGarment(base, 'T-Shirt'), colors: { body: '#123456' }, overlays: [] });
let h = renderToString(React.createElement(Prev, { cfg: ser, height: 220 }));
t('studio cfg -> 2 silhouettes, no 3D toggle without WebGL', (h.match(/<svg/g) || []).length === 2 && !h.includes('Preview type'));
t('previewUrl -> img', renderToString(React.createElement(Prev, { cfg: ser, previewUrl: '/x.png' })).includes('src="/x.png"'));
t('null cfg no crash', renderToString(React.createElement(Prev, { cfg: null })).includes('No design preview'));
t('legacy garmentType no crash', typeof renderToString(React.createElement(Prev, { cfg: { garmentType: 'T-Shirt' } })) === 'string');
t('unknown garment no crash', typeof renderToString(React.createElement(Prev, { cfg: { garment: 'Garbage' } })) === 'string');
t('reference image', renderToString(React.createElement(Prev, { cfg: null, referenceImageUrl: '/ref.png' })).includes('/ref.png'));
for (const g of ['Pants', 'Skirt', 'Polo Shirt', 'T-Shirt', 'Scrub Top']) { const cfg = { ...G.applyGarment(base, g), colors: { body: '#123456' }, overlays: [] }; const r = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(cfg)))); const b = r.cfg ?? r; t(`roundtrip ${g}`, b.garment === g && b.sleeve === cfg.sleeve && b.fit === cfg.fit); }
// Studio picker: browsing a category never changes the design, picking a garment sets the category it was picked from.
const SG = await L('/src/pages/client/design-studio/selectGarment.js');
t('selectFamily passes the browsed category', (c => { let st = { ...base, category: 'School Uniform' }; SG.selectFamily(fn => { st = fn(st); }, G.familyFor('Scrub Top'), 'Medical / Scrubs'); return st.garment === 'Scrub Top' && st.category === 'Medical / Scrubs'; })());
t('selectFamily without a category keeps the current one', (c => { let st = { ...base, category: 'School Uniform' }; SG.selectFamily(fn => { st = fn(st); }, G.familyFor('Scrub Top')); return st.garment === 'Scrub Top' && st.category === 'School Uniform'; })());
// Personal artwork is a tagged image overlay: the tag survives serialize -> JSON -> deserialize, and the garment stays untouched.
{ const art = { type: 'Image', __logo: true, __artwork: true, __layerId: 'a1', __layerName: 'Artwork' };
  const cfg = { ...G.applyGarment(base, 'Scrub Top'), colors: { body: '#123456' } };
  const r = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(cfg, { overlays: [art], frontOverlays: [art], backOverlays: [] }))));
  const kept = JSON.stringify(r).includes('"__artwork":true');
  t('artwork tag survives save/restore', kept);
  t('artwork does not alter garment, sleeve or fit', r.cfg.garment === 'Scrub Top' && r.cfg.sleeve === cfg.sleeve && r.cfg.fit === cfg.fit); }
// Text fonts: self-hosted web faces resolved from a saved CSS stack; legacy system stacks resolve to none and are left alone.
const SF = await L('/src/pages/client/design-studio/studioFonts.js');
t('studio fonts: a saved stack resolves to its web face; legacy system stacks do not', SF.webFontFor("'Bebas Neue', sans-serif,'Noto Color Emoji'")?.id === 'bebas' && SF.webFontFor("Arial Black, 'Arial Bold', sans-serif") === null && SF.primaryFamily("'Great Vibes', cursive") === 'Great Vibes');
t('studio fonts: weights snap to an existing cut', SF.nearestWeight(SF.WEB_FONTS.find(f => f.id === 'inter'), SF.numericWeight('bold')) === 700 && SF.nearestWeight(SF.WEB_FONTS.find(f => f.id === 'anton'), 700) === 400 && SF.numericWeight('normal') === 400);
// Hero: Button-Down / Short / unisex work shirt has an explicit vector templateId that survives save/restore; photo ids and old records are unaffected.
{ const HID = 'button-down-work-shirt-short', hc = { ...base, garment: 'Button-Down', sleeve: 'Short', fit: 'unisex' };
  const sv = S.serializeDesign(hc, {}), r = S.deserializeDesign(JSON.parse(JSON.stringify(sv)));
  t('hero serializes explicit vector templateId', sv.templateId === HID);
  t('hero templateKeyById resolves', JSON.stringify(A.templateKeyById(HID)) === JSON.stringify({ garment: 'Button-Down', sleeve: 'Short', fit: 'unisex' }));
  t('hero restores same garment/sleeve/fit', r.cfg.garment === 'Button-Down' && r.cfg.sleeve === 'Short' && r.cfg.fit === 'unisex');
  t('hero resolveTarget carries templateId, work-shirt GLB, approx status', (x => x.templateId === HID && x.glb === '/models/processed/work-shirt-short-sleeve-capped.glb' && x.status === '2d-3d-approx' && !x.photo)(G.resolveTarget('Button-Down', 'Short', 'unisex')));
  t('hero 3D zones are body/sleeve/collar/pocket, tipping is 2D only', Sh.zone3D('Button-Down', 'Short', 'unisex', 'pocket') === true && Sh.zone3D('Button-Down', 'Short', 'unisex', 'tipping') === false);
  t('hero is not verified', !G.FAMILY_BY_NAME['Button-Down'].verified3D);
  t('old record without templateId still loads by garment/sleeve/fit', (o => o.cfg.garment === 'Button-Down' && o.cfg.sleeve === 'Short')(S.deserializeDesign({ garment: 'Button-Down', sleeve: 'Short', fit: 'unisex', colors: {} })));
  t('unknown templateId is ignored', S.deserializeDesign({ templateId: 'nope', garment: 'Pants' }).cfg.garment === 'Pants');
  t('BIR Button-Down Long female keeps its photo id', S.serializeDesign({ ...base, garment: 'Button-Down', sleeve: 'Long', fit: 'female' }, {}).templateId === 'button-down-bir-long');
  t('Button-Down Long unisex and Short female stay templateId null', S.serializeDesign({ ...base, garment: 'Button-Down', sleeve: 'Long', fit: 'unisex' }, {}).templateId === null && S.serializeDesign({ ...base, garment: 'Button-Down', sleeve: 'Short', fit: 'female' }, {}).templateId === null); }
// Fit must reach every zone/pattern lookup: Button-Down Long unisex is the vector sketch (all zones), not the female BIR photo (body only).
t('zonesFor honours fit: Button-Down Long unisex has collar/pocket, female BIR is body only', Sh.zonesFor('Button-Down', 'Long', 'unisex').includes('collar') && Sh.zonesFor('Button-Down', 'Long', 'unisex').includes('pocket') && Sh.zonesFor('Button-Down', 'Long', 'female').join() === 'body');
// Second registered vector template: Polo Shirt / Short, per fit.
{ const pm = S.serializeDesign({ ...base, garment: 'Polo Shirt', sleeve: 'Short', fit: 'male' }, {}), pf = S.serializeDesign({ ...base, garment: 'Polo Shirt', sleeve: 'Short', fit: 'female' }, {});
  t('polo serializes per-fit vector templateId', pm.templateId === 'polo-shirt-short-male' && pf.templateId === 'polo-shirt-short-female');
  t('polo templateId restores garment/sleeve/fit', (r => r.cfg.garment === 'Polo Shirt' && r.cfg.fit === 'female' && r.cfg.sleeve === 'Short')(S.deserializeDesign(JSON.parse(JSON.stringify(pf)))));
  t('legacy School Polo record still maps to Polo Shirt', S.deserializeDesign({ garment: 'School Polo', sleeve: 'Short', fit: 'male' }).cfg.garment === 'Polo Shirt');
  t('polo resolveTarget: templateId, per-fit GLB, approx status', (x => x.templateId === 'polo-shirt-short-female' && x.glb === encodeURI('/models/female polo shirt.glb') && x.status === '2d-3d-approx')(G.resolveTarget('Polo Shirt', 'Short', 'female')) && G.resolveTarget('Polo Shirt', 'Short', 'male').glb === encodeURI('/models/Polo Shirt male.glb'));
  t('polo pocket is 2D only, collar is 3D', Sh.zone3D('Polo Shirt', 'Short', 'male', 'collar') === true && !Sh.zonesFor('Polo Shirt', 'Short', 'male').includes('pocket')); }
// Hero 3D contract: the work-shirt GLB serves exactly this template, 3D paints only what the model supports, everything else is 2D only.
{ const HID = 'button-down-work-shirt-short', e = Cp.scannedEntryFor('Button-Down', 'Short', 'unisex');
  const hp = { body: 'hstripes', sleeve: 'checker', collar: 'geometric', pocket: 'polka', tipping: 'vstripes' };
  const p3 = Cp.patternsFor3D(e, hp);
  t('hero 3D entry is the work-shirt scan', e.id === 'work-shirt' && e.capabilities.zones.includes('collar'));
  t('hero 3D paints body/sleeve patterns, pocket/collar/geometric stay solid', p3.body === 'hstripes' && p3.sleeve === 'checker' && p3.collar === 'solid' && p3.pocket === 'solid');
  t('a photo-base scan (no 3D patterns) paints every zone solid', Object.values(Cp.patternsFor3D(Cp.scannedEntryFor('Scrub Top', 'Short', 'female'), hp)).every(v => v === 'solid'));
  t('no 3D entry gives solid, never undefined', Object.values(Cp.patternsFor3D(null, { body: 'hstripes' })).every(v => v === 'solid'));
  t('pattern3D flags 2D-only combinations on the hero', Sh.pattern3D('Button-Down', 'Short', 'unisex', 'body', 'hstripes') === true && Sh.pattern3D('Button-Down', 'Short', 'unisex', 'body', 'geometric') === false && Sh.pattern3D('Button-Down', 'Short', 'unisex', 'pocket', 'hstripes') === false && Sh.pattern3D('Pants', null, null, 'body', 'hstripes') === true);
  t('picking Button-Down from the default design lands on the hero template', (c => c.sleeve === 'Short' && c.fit === 'unisex' && S.serializeDesign(c, {}).templateId === HID)(G.applyGarment({ ...base, category: 'Corporate', fit: 'male', sleeve: 'Short' }, 'Button-Down')));
  t('order snapshot (previewPng stripped by the backend) keeps the hero templateId', (o => o.templateId === HID && S.deserializeDesign(o).cfg.garment === 'Button-Down')((({ previewPng, ...rest }) => rest)(JSON.parse(JSON.stringify(S.serializeDesign({ ...base, garment: 'Button-Down', sleeve: 'Short', fit: 'unisex' }, {}, 'data:image/png;base64,AA==')))))); }
// ---- new worn-photo assets + GLB slots
const GS = await import(new URL('../src/pages/client/design-studio/glbSlots.js', import.meta.url));
const fsx = await import('node:fs'); const pathx = await import('node:path'); const urlx = await import('node:url');
const pub = f => MF.modelFile(pathx.join(urlx.fileURLToPath(new URL('../public/', import.meta.url)), f));
t('all 15 worn photos have a cutout file', D.ENTRIES.filter(d => d.source === 'worn').every(d => fsx.existsSync(pub(d.image.slice(1)))));
t('every registered photo base and trim mask exists, ids are unique', (bases => bases.length === 6 && new Set(bases.map(a => a.id)).size === bases.length && bases.every(a => fsx.existsSync(pub(a.src.slice(1))) && (!a.trim || fsx.existsSync(pub(a.trim.mask.slice(1))))))(Object.values(A.ASSET_2D).flatMap(g => Object.values(g)).flatMap(s => Object.values(s)).flatMap(f => Object.values(f))));
t('product bottoms open their exact family with no sleeve or photo base', ['pants:Pants', 'shorts:Shorts', 'corporate-skirt:Skirt'].every(k => { const [id, fam] = k.split(':'); const o = D.openTarget(E0(id), {}); return o && o.garment === fam && o.sleeve === null && !E0(id).exactBase && E0(id).tier === (id === 'shorts' ? '2d-3d-approx' : 'editable-2d'); }));
t('pleated skirt opens Pleated Skirt (never the pencil Skirt); notch blouse opens Blouse; blazers open Blazer on their own sleeve', D.openTarget(E0('school-skirt'), {})?.garment === 'Pleated Skirt' && D.openTarget(E0('blazer-blouse-blue'), {})?.garment === 'Blouse' && D.openTarget(E0('blazer-tweed-herringbone'), {})?.sleeve === 'Long' && D.openTarget(E0('blazer-white-notch'), {})?.sleeve === '3/4' && D.openTarget(E0('dress-bir-green-yellow-collar'), {})?.garment === 'Dress');
t('lower-body filter lists the four single bottoms', JSON.stringify(D.filterDesigns({ piece: 'lower' }).map(d => d.id).sort()) === JSON.stringify(['corporate-skirt', 'pants', 'school-skirt', 'shorts']));
t('bottoms have canonical template ids that round-trip to (family, null, null)', ['Pants:pants-trousers', 'Shorts:shorts-standard', 'Skirt:skirt-pencil'].every(k => { const [g, id] = k.split(':'); const tk = A.templateKeyById(id); return A.templateIdFor(g, null, null) === id && tk && tk.garment === g && tk.sleeve === null && tk.fit === null; }));
t('gallery photo id survives Save -> Reload -> Order snapshot as inspirationId; templateId is the Pants template', (() => { const t = D.openTarget(E0('pants'), {}); const cfg = { ...G.applyGarment({ ...base }, t.garment, { ...t, inspirationId: 'pants' }), colors: { body: '#7a1f2b' } }; const raw = S.serializeDesign(cfg, {}); const back = S.deserializeDesign(JSON.parse(JSON.stringify(raw))); const snap = S.serializeDesign(back.cfg, {}); return raw.inspirationId === 'pants' && raw.templateId === 'pants-trousers' && back.cfg.garment === 'Pants' && back.cfg.inspirationId === 'pants' && snap.inspirationId === 'pants' && snap.colors.body === '#7a1f2b'; })());
t('switching garment drops the photo id; a mismatched or unknown photo id is never saved', (() => { const onPants = G.applyGarment({ ...base }, 'Pants', { inspirationId: 'pants' }); const moved = G.applyGarment(onPants, 'Shorts'); return moved.inspirationId === null && S.serializeDesign({ ...onPants, inspirationId: 'shorts' }, {}).inspirationId === null && S.serializeDesign({ ...onPants, inspirationId: 'nope' }, {}).inspirationId === null && S.deserializeDesign({ garment: 'Pants', inspirationId: 'school-skirt' }).cfg.inspirationId === null; })());
{ const U = await L('/src/pages/client/design-studio/uniformSet.js');
  const fams = Object.keys(G.FAMILY_BY_NAME);
  t('every family is a set top or bottom except the full-length ones (Lab Coverall, Dress and the two derived dresses)', fams.every(f => ['Lab Coverall', 'Dress', 'Belted Shift Dress', 'Maternity Tunic Dress'].includes(f) ? G.pieceOf(f) === null : ['top', 'bottom'].includes(G.pieceOf(f))) && ['Pants', 'Shorts', 'Skirt', 'Pleated Skirt'].every(f => G.pieceOf(f) === 'bottom'));
  const top = S.serializeDesign({ ...G.applyGarment({ ...base }, 'Polo Shirt', { fit: 'male' }), colors: { body: '#123456' } }, { frontOverlays: [{ type: 'i-text', text: 'TOP' }] });
  const bot = S.serializeDesign({ ...G.applyGarment({ ...base }, 'Pants', { inspirationId: 'pants' }), colors: { body: '#800000' } }, {});
  const snap = U.withSet(bot, { id: 'set-1', active: 'bottom', pieces: { top, bottom: null } });
  const q = U.orderQueue(snap);
  t('a set orders top first, each piece keeps its own garment, colour, template and overlays', q?.length === 2 && q[0].garment === 'Polo Shirt' && q[0].colors.body === '#123456' && q[0].frontOverlays?.[0]?.text === 'TOP' && q[1].garment === 'Pants' && q[1].colors.body === '#800000' && q[1].templateId === 'pants-trousers' && q[1].inspirationId === 'pants' && q.every((p, n) => p.uniformSet.id === 'set-1' && p.uniformSet.part === n + 1 && p.uniformSet.of === 2 && !p.uniformSet.pieces));
  t('a piece in the wrong role is dropped, a one-piece set is not orderable', U.normalizeSet({ id: 'x', active: 'top', pieces: { top: bot, bottom: top } }).pieces.top === null && U.orderQueue(U.withSet(bot, { id: 'x', active: 'bottom', pieces: { top: null, bottom: null } })) === null && U.normalizeSet({ id: 1, active: 'top' }) === null);
  t('set survives Save -> Reload (deserialize ignores it, normalize restores it)', (() => { const raw = JSON.parse(JSON.stringify(snap)); const d = S.deserializeDesign(raw); const set = U.normalizeSet(raw.uniformSet); return d.cfg.garment === 'Pants' && set.active === 'bottom' && set.pieces.top.garment === 'Polo Shirt'; })());
  t('set orders group by set id, top first, string or parsed studio_config, single order stays alone', (() => { const a = { order_id: 7, studio_config: JSON.stringify({ uniformSet: { id: 's9', role: 'bottom' } }) }, b = { order_id: 6, studio_config: { uniformSet: { id: 's9', role: 'top' } } }, c = { order_id: 5, studio_config: '{"uniformSet":{"id":"zz","role":"top"}}' }, d = { order_id: 4, studio_config: null }; const g = U.setOrders(a, [d, c, b, a]); return g.map(o => o.order_id).join() === '6,7' && U.setOrders(d, [a, b]).length === 1 && U.setOrders(c, [{ order_id: 3, studio_config: 'bad{' }]).length === 1; })());
  { const W = await L('/src/pages/client/order-wizard/orderForm.js'), day = new Date(2026, 9, 26);
    const base = { ...W.INIT, garment_type: 'Polo Shirt', color: 'Navy', fabric_type: 'Cotton', delivery_address: 'Quezon City', client_design_notes: 'Navy polo with a left chest logo' };
    const one = W.orderFields({ ...base, sizes: { M: 60, L: 40 } }, null);
    t('wizard: a single-piece order posts the size total as quantity and drops empty fields', one.quantity_ordered === 100 && one.sizes === '{"M":60,"L":40}' && one.order_type === 'direct' && !('studio_config' in one) && !('preferred_date' in one) && !('measurements' in one));
    const cu = W.orderFields({ ...base, sizing_type: 'custom', custom_qty: '120', measurements: { chest: '40', waist: '' } }, null);
    t('wizard: custom measurements use the backend column keys, in inches, and say so to VFRB', cu.measurements === '{"chest":40}' && cu.custom_qty === 120 && cu.quantity_ordered === 120 && /in inches/.test(cu.special_notes) && !('sizes' in cu));
    t('wizard: an upload-only order needs a file, a garment and a description; a Studio design needs nothing re-entered', Object.keys(W.validateStep(0, { ...W.INIT }, null)).join() === 'garment_type,design_ref_file,client_design_notes' && !Object.keys(W.validateStep(0, { ...base, design_ref_file: {} }, null)).length && !Object.keys(W.validateStep(0, { ...W.INIT }, { garment: 'Polo Shirt' })).length);
    t('wizard: the preferred date is optional but never under a week out; a Studio colour skips the colour field', !W.validateStep(2, base, null, day).deadline && W.validateStep(2, { ...base, deadline: '2026-10-30' }, null, day).deadline && !W.validateStep(2, { ...base, deadline: '2026-11-02' }, null, day).deadline && !W.validateStep(1, { ...W.INIT, sizes: { M: 100 } }, { colors: { body: '#000' } }).color);
    const pf = W.prefillFrom({ garment: 'Polo Shirt', sleeve: 'Short', colors: { body: '#1B2A4A' }, category: 'School Uniform' });
    t('wizard: a Studio design prefills garment, implied collar, sleeve, colour and a description that clears the 15-character rule', pf.garment_type === 'Polo Shirt' && pf.collar_type === 'Polo Collar' && pf.sleeve_type === 'Short Sleeve' && pf.color === 'Navy Blue' && pf.client_design_notes.length >= 15);
    t('wizard: bottoms are told apart by set role first, then by name', W.garmentKind('Pants') === 'bottoms' && W.garmentKind('Polo Shirt') === 'tops' && W.garmentKind('Shorts', 'top') === 'tops' && W.garmentKind('Blouse', 'bottom') === 'bottoms'); }
  { const Q = await L('/src/utils/orderQuantity.js');
    t('order quantity = size total (custom: piece count); minimum 100 shown as pieces still needed', Q.orderQty({ sizing_type: 'standard', sizes: { S: 40, M: '35', XL: 0 } }) === 75 && Q.qtyShort({ sizes: { S: 40, M: 35 } }) === 25 && Q.qtyShort({ sizes: { M: 100 } }) === 0 && Q.orderQty({ sizing_type: 'custom', custom_qty: '120', sizes: { M: 5 } }) === 120 && Q.qtyShort({}) === 100); }
  t('Apply to Both: colours and patterns copy only into zones the other garment has, no patterns onto a photo base', (() => { const snap = { garment: 'Pants', colors: { body: '#111111', waistband: '#222222' }, patterns: {}, patternParams: {} }; const cfg = { colors: { body: '#aa0000', collar: '#00aa00' }, patterns: { body: 'hstripes', collar: 'dots' }, patternParams: { body: { width: 6 } } }; const m = U.mirrorStyle(snap, cfg, ['body', 'waistband'], true), p = U.mirrorStyle(snap, cfg, ['body'], false); return m.colors.body === '#aa0000' && m.colors.waistband === '#222222' && !('collar' in m.colors) && m.patterns.body === 'hstripes' && !('collar' in m.patterns) && m.patternParams.body.width === 6 && p.colors.body === '#aa0000' && Object.keys(p.patterns).length === 0 && snap.colors.body === '#111111'; })());
  t('Apply to Both: an added logo or text lands on the other piece at the same relative place, as a new layer on the same face', (() => { const snap = { garment: 'Pants', overlays: [{ text: 'A' }], frontOverlays: [{ text: 'A' }], backOverlays: [] }; const o = { text: 'TEAM', left: 100, top: 50, __layerId: 'x' }; const f = U.mirrorOverlay(snap, o, { w: 200, h: 100 }, { w: 300, h: 400 }), b = U.mirrorOverlay(snap, o, { w: 200, h: 100 }, { w: 300, h: 400 }, 'back'); const n = f.frontOverlays[1]; return f.frontOverlays.length === 2 && f.overlays === f.frontOverlays && n.left === 150 && n.top === 200 && n.__layerId !== 'x' && b.backOverlays.length === 1 && b.frontOverlays.length === 1 && snap.frontOverlays.length === 1; })());
  t('staff note names the set, the part and the linked order', U.setNote({ ...q[1].uniformSet, linkedOrderIds: [41] }) === 'Uniform set set-1: part 2 of 2 (top Polo Shirt + bottom Pants); with order #41.'); }
t('BIR blouse photo -> Button-Down Long + Female base', (g => g.garment === 'Button-Down' && g.sleeve === 'Long' && g.fit === 'female' && A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'button-down-bir-long')(D.openTarget(E('bir-blouse-trousers-blue'), {})));
t('fuchsia blouse photo -> Round Neck Short base', (g => g.garment === 'Round Neck' && A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'round-neck-fuchsia-short')(D.openTarget(E('blouse-roundneck-fuchsia'), {})));
t('kept derived singles open their derived template; sets that lost a derived piece open authored or rebuilt pieces (Pants, Skirt, Jogger Scrub Pants for scrub photos, or a rebuilt parametric trouser) with no 3D reference; the mislabelled denim dress stays reference-only', ['jack-shirt-two-tone', 'blouse-mandarin-yellow'].every(id => E(id).tier === '2d-3d-approx' && E(id).pieces.derived && D.openTarget(E(id), {})?.garment === E(id).pieces.single)
  && [['blouse-roundneck-mustard', 'Blouse', 'Creased Trousers'], ['blazer-pinstripe-navy', 'Blazer', 'Pantsuit Trousers'], ['shirt-two-tone-gpc', 'Button-Down', "Men's Slacks"], ['polo-barong-brown', 'Barong Shirt', "Men's Slacks"], ['peplum-set-navy', 'Peplum Top', 'Midi Pencil Skirt'], ['pantsuit-notch-short-gray', 'Short-Sleeve Notch Jacket', 'Pantsuit Trousers'], ['blazer-double-breasted-gray', 'Blazer', 'Pantsuit Trousers'], ['scrub-set-men-vneck', 'Scrub Top', 'Jogger Scrub Pants'], ['scrub-set-housekeeping', 'Mandarin Collar', 'Jogger Scrub Pants'], ['bir-blouse-trousers-blue', 'Button-Down', 'Pantsuit Trousers']]
    .every(([id, top, bottom]) => !E(id).pieces.derived && E(id).pieces.top === top && E(id).pieces.bottom === bottom && D.openTarget(E(id), {})?.garment === top && !E(id).ref3D) && E('dress-sheath-denim-blue').tier === 'reference' && D.openTarget(E('dress-sheath-denim-blue'), {}) === null);
t('Round Neck Long stays vector; Short resolves to its photo GLB', !A.assetFor('Round Neck', 'Long', 'front') && G.resolveTarget('Round Neck', 'Long').glb === null && G.resolveTarget('Round Neck', 'Long').status === 'editable-2d' && G.resolveTarget('Round Neck', 'Short', 'female').glb === '/models/garments/round-neck-fuchsia-short.glb' && G.resolveTarget('Round Neck', 'Short', 'female').status === '2d-3d-approx');
t('GLB slots: live files exist; empty/candidate slots never render', Object.values(GS.GLB_SLOTS).every(sl => { const exists = fsx.existsSync(pub(sl.file.slice(1))); return sl.verification === null && (GS.slotLive(sl) ? exists : (sl.state === 'none' ? !exists : sl.state === 'candidate' && exists)); }));
t('GLB slots: every photo base has a slot, resolveTarget exposes it', ['scrub-top-women-short', 'scrub-top-men-short', 'mandarin-tunic-housekeeping', 'mandarin-blouse-bir-long', 'round-neck-fuchsia-short'].every(id => GS.glbSlotFor(id)) && G.resolveTarget('Mandarin Collar', 'Long').glbSlot?.id === 'mandarin-blouse-bir-long');
t('GLB slots: a slot never changes 3D status', G.resolveTarget('Mandarin Collar', 'Long').glb === null && G.resolveTarget('Mandarin Collar', 'Long').status === 'editable-2d');
t('15 worn photos each have a photo: slot', D.ENTRIES.filter(d => d.source === 'worn').every(d => GS.glbSlotFor(d.id)?.id === `photo:${d.id}`));
t('capped Hero GLB exists at its runtime path', fsx.existsSync(pub('models/processed/work-shirt-short-sleeve-capped.glb')));
{ const cp = await import('node:child_process'); const r = cp.spawnSync(process.execPath, [urlx.fileURLToPath(new URL('./asset-audit.mjs', import.meta.url))], { encoding: 'utf8' }); t('asset audit: every referenced asset exists, every kept file is explained', r.status === 0 && /ASSET AUDIT: PASS/.test(r.stdout)); }
t('Pants exposes only enumerated procedural patterns, no arbitrary fabric upload', G.resolveTarget('Pants').status === '2d-3d-approx' && G.FAMILY_BY_NAME.Pants.patterns.includes('hstripes') && Cp.get3DCapabilities('Pants', null, null).customFabricTextures === false);
const glbJson = file => { const b = fsx.readFileSync(pub(file)); if (b.toString('ascii', 0, 4) !== 'glTF' || b.readUInt32LE(4) !== 2) return null; const n = b.readUInt32LE(12); return JSON.parse(b.toString('utf8', 20, 20 + n).trim()); };
const pantsPrimitive = glbJson('models/vfrb-staged/pants.glb')?.meshes?.[0]?.primitives?.[0];
t('Pants GLB has no UVs or baked material; only its enumerated procedural patterns are supported', !!pantsPrimitive && !('TEXCOORD_0' in pantsPrimitive.attributes) && pantsPrimitive.material === undefined && Cp.get3DCapabilities('Pants', null, null).customFabricTextures === false);
t('Shorts renders the garment-only model of its gallery photo; Pants renders the authored trousers (the Meshy pants file is gated, never routed), both lit with the shader zone mask', (() => { const sh = Cp.scannedEntryFor('Shorts', null, null), pa = Cp.scannedEntryFor('Pants', null, null); return sh && /\/models\/vfrb-staged\//.test(sh.models.unisex) && fsx.existsSync(pub(sh.models.unisex.slice(1))) && sh.parts[0].zoneOf && !sh.parts[0].unlit && pa?.id === 'pants-straight-authored' && fsx.existsSync(pub(pa.models.unisex.slice(1))) && pa.parts.every(x => x.zoneOf && !x.unlit) && !Cp.SCANNED_GARMENTS.some(x => x.id === 'pants') && !!Cp.GATED_3D.pants; })());
t('gallery shorts photo exposes its real 3D model; the pants and corporate-skirt photos are labelled family-level approximations (2D tier, no photo GLB)', (d => d.tier === '2d-3d-approx' && d.glb === Cp.scannedEntryFor(d.garmentFamily, null, null).models.unisex)(D.ENTRIES.find(x => x.id === 'shorts')) && ['pants', 'corporate-skirt'].every(id => { const d = D.ENTRIES.find(x => x.id === id); return d.tier === 'editable-2d' && d.glb === null && d.familyApprox3D; }));
t('routing: a selection gets 3D only from a model with that exact sleeve; no short-sleeve substitute for 3/4 or Long', Cp.scannedEntryFor('Scrub Top', '3/4', 'male') === null && Cp.scannedEntryFor('Mandarin Collar', 'Long', 'female') === null && Cp.scannedEntryFor('Round Neck', 'Long', 'female') === null && Cp.scannedEntryFor('Scrub Top', 'Short', 'male')?.id === 'scrub-top' && Cp.scannedEntryFor('Pants', 'Short', null)?.id === 'pants-straight-authored' && Cp.has3DModel('Button-Down', 'Long', 'unisex') && !Cp.has3DModel('Mandarin Collar', 'Long', 'female') && Cp.has3DModel('Mandarin Collar', 'Short', 'female'));
t('gallery 3D references: 23 read-only models, each file present, sets flagged; mismatched photos have none; a derived editable model never replaces the reference file', (() => { const refs = D.ENTRIES.filter(d => d.ref3D); return refs.length === 9 && ['blazer-open-front-black', 'blouse-mandarin-yellow', 'blouse-tunic-roundneck-blue'].every(id => E0(id).ref3D && !E0(id).ref3D.set && E0(id).glb !== E0(id).ref3D.file) && !E0('polo-red-claremont').ref3D && !E0('shirt-mandarin-polkadot').ref3D && !E0('dress-bir-green-yellow-collar').ref3D && refs.every(d => d.ref3D.file === `/models/reference/${d.id}.glb` && fsx.existsSync(pub(d.ref3D.file.slice(1)))) && D.ENTRIES.find(d => d.id === 'set-pinstripe-skirt').ref3D.set && ['dress-sheath-denim-blue', 'scrub-set-women-vneck', 'blouse-scarf-cream', 'blazer-blouse-blue-short', 'set-vest-blouse', 'corporate-skirt'].every(id => !D.ENTRIES.find(d => d.id === id).ref3D); })());
t('new families route to their own models per sleeve; no model for a sleeve they lack', Cp.scannedEntryFor('Blazer', 'Long', null)?.id === 'blazer-long' && Cp.scannedEntryFor('Blazer', '3/4', null)?.id === 'blazer-three-quarter' && Cp.scannedEntryFor('Blouse', 'Short', null)?.id === 'blouse-notch-short' && Cp.scannedEntryFor('Dress', 'Short', null)?.id === 'dress-collared-short' && Cp.scannedEntryFor('Pleated Skirt', null, null)?.id === 'pleated-skirt' && Cp.scannedEntryFor('Skirt', null, null)?.id === 'skirt-pencil-lofted' && Cp.scannedEntryFor('Blouse', 'Long', null) === null && ['Blazer', 'Blouse', 'Dress', 'Pleated Skirt'].every(g => G.FAMILY_BY_NAME[g]?.has2D && G.FAMILY_BY_NAME[g].status3D === 'partial'));
{
  const e = (g, s, f) => Cp.scannedEntryFor(g, s, f), model = (g, s, f) => { const x = e(g, s, f); return x ? (x.models[f] ?? Object.values(x.models)[0]) : null; };
  t('Lab Coat + Long resolves to the garment-only lab coat GLB', model('Lab Coat', 'Long', null) === '/models/vfrb-staged/lab-coat-long.glb' && G.resolveTarget('Lab Coat', 'Long').glb === '/models/vfrb-staged/lab-coat-long.glb' && G.FAMILY_BY_NAME['Lab Coat'].status3D === 'partial');
  t('Lab Coverall resolves to the garment-only coverall (never the legacy hooded figure) and stays full-body (no set piece)', model('Lab Coverall', 'Long', null) === '/models/vfrb-staged/lab-coverall-garment.glb' && !Cp.SCANNED_GARMENTS.some(x => Object.values(x.models).some(m => m === '/models/lab-coverall.glb')) && G.pieceOf('Lab Coverall') === null && Cp.UNSUPPORTED_3D_MODELS.some(m => m.file === 'lab-coverall.glb'));
  t('Scrub Top Female 3/4 -> new 3/4 model; Female and Male Short keep their photo-base models; Male 3/4 has none', model('Scrub Top', '3/4', 'female') === '/models/vfrb-staged/scrub-top-women-three-quarter.glb' && model('Scrub Top', 'Short', 'female') === '/models/garments/scrub-top-women-short.glb' && model('Scrub Top', 'Short', 'male') === '/models/garments/scrub-top-men-short.glb' && e('Scrub Top', '3/4', 'male') === null && e('Scrub Top', 'Short', 'female')?.id !== 'scrub-top-women-three-quarter');
  t('lab garments keep their 2D pocket colour (2D only in 3D); new models have no text, logo or extra 3D zones', ['Lab Coat', 'Lab Coverall'].every(g => Sh.zonesFor(g, 'Long').includes('pocket') && Sh.zone3D(g, 'Long', null, 'pocket') === false) && ['lab-coat-long', 'lab-coverall', 'scrub-top-women-three-quarter'].every(id => { const x = Cp.SCANNED_GARMENTS.find(y => y.id === id); return x.capabilities.zones.join() === 'body' && !x.capabilities.text && !x.capabilities.logo && !x.verification; }));
  t('unisex exact-sleeve models serve male, female, unisex and no-fit selections (Lab Coat, Lab Coverall)', ['male', 'female', 'unisex', null].every(f => model('Lab Coat', 'Long', f) === '/models/vfrb-staged/lab-coat-long.glb' && model('Lab Coverall', 'Long', f) === '/models/vfrb-staged/lab-coverall-garment.glb' && Cp.has3DModel('Lab Coat', 'Long', f)));
  t('an exact-fit model still wins over a unisex one; unisex never unlocks a missing sleeve or a single-fit model', e('Button-Down', 'Long', 'female')?.id === 'button-down-bir-blouse' && e('Button-Down', 'Long', 'male')?.id === 'button-down-utility-long' && e('Scrub Top', '3/4', 'male') === null && e('Lab Coat', 'Short', 'male') === null && e('Blazer', 'Long', 'male') === null && model('Scrub Top', 'Short', 'female') === '/models/garments/scrub-top-women-short.glb');
  t('a carried-over default fit never lands a new garment on a variant with no photo base or model (Mandarin -> female tunic); explicit fits are kept; other defaults unchanged', (() => { const D0 = S.DEFAULT_CFG; const m = G.applyGarment(D0, 'Mandarin Collar'); return m.sleeve === 'Short' && m.fit === 'female' && G.applyGarment(D0, 'Mandarin Collar', { sleeve: 'Long', fit: 'male' }).fit === 'male' && G.applyGarment({ ...D0, garment: 'Mandarin Collar', fit: 'female' }, 'Mandarin Collar', { fit: 'male' }).fit === 'male' && G.applyGarment(D0, 'Scrub Top').fit === 'male' && G.applyGarment(D0, 'Polo Shirt').fit === 'male' && G.applyGarment(D0, 'Button-Down').fit === 'unisex'; })());
  t('Polo: male and female keep their own scans; unisex (and the red polo photo) gets the unisex polo model; no Long polo', model('Polo Shirt', 'Short', 'male') === encodeURI('/models/Polo Shirt male.glb') && model('Polo Shirt', 'Short', 'female') === encodeURI('/models/female polo shirt.glb') && model('Polo Shirt', 'Short', 'unisex') === '/models/vfrb-staged/polo-shirt-unisex-short.glb' && e('Polo Shirt', 'Long', 'unisex') === null && (o => o?.fit === 'unisex' && o.garment === 'Polo Shirt')(D.openTarget(E0('polo-red-claremont'), {})));
  t('Collarless Blazer is its own family: Long -> tan model, Short -> royal model, 3/4 none; never the notch-lapel Blazer', model('Collarless Blazer', 'Long', null) === '/models/vfrb-staged/collarless-blazer-long.glb' && model('Collarless Blazer', 'Short', null) === '/models/vfrb-staged/collarless-blazer-short.glb' && e('Collarless Blazer', '3/4', null) === null && e('Blazer', 'Short', null) === null && G.pieceOf('Collarless Blazer') === 'top' && D.openTarget(E0('blazer-collarless-tan'), {})?.sleeve === 'Long' && D.openTarget(E0('blazer-pinstripe-royal'), {})?.sleeve === 'Short');
  {
    // Exact gallery -> read-only 3D reference map (browser-verified 2026-10-10: each loads only its own file and renders its own outfit).
    // 2026-10-16: photos that lost a derived piece lost their 3D reference viewer; only the two held-back pinstripe sets keep a full-set preview.
    const SETS = ['set-pinstripe-pants', 'set-pinstripe-skirt'];
    const SOLO = ['blouse-mandarin-yellow', 'blouse-asymmetric-blue', 'blouse-tunic-roundneck-blue', 'blazer-open-front-black', 'dress-tunic-maternity-navy', 'jack-shirt-two-tone', 'dress-butter-belted'];
    const DFr = await L('/src/pages/client/design-studio/derivedFamilies.js'), AU = fsx.readFileSync(urlx.fileURLToPath(new URL('./asset-audit.mjs', import.meta.url)), 'utf8');
    const refs = D.ENTRIES.filter(d => d.ref3D), refDir = MF.modelDir(pathx.join(urlx.fileURLToPath(new URL('../public/', import.meta.url)), 'models', 'reference'));
    t('full-set previews: exactly 2 sets and 7 solo references, each its own file; every other reference file belongs to a photo that lost a derived piece and is documented as kept source', refs.length === 9 && SETS.every(id => E0(id).ref3D?.set === true && E0(id).ref3D.file === `/models/reference/${id}.glb`) && SOLO.every(id => E0(id).ref3D?.set === false) && fsx.readdirSync(refDir).length === 23 && fsx.readdirSync(refDir).every(f => refs.some(d => d.ref3D.file === `/models/reference/${f}`) || (DFr.REFS_WITH_REMOVED.has(f.slice(0, -4)) && AU.includes(`'${f.slice(0, -4)}'`))));
    t('a fused set file is never the editable model: sets open a separately cut piece (an exact cut, or a derived top), and the two held-back pinstripe sets have none', SETS.every(id => !E0(id).has3D && !E0(id).glb) && [...DFr.REFS_WITH_REMOVED].filter(E0).every(id => !E0(id).glb || /^\/models\/garments\//.test(E0(id).glb)));
    t('rejected or mismatched sources have no 3D viewer at all (vest set with mannequin, worn blouse photo, corporate skirt)', ['set-vest-blouse', 'blazer-blouse-blue-short', 'corporate-skirt'].every(id => !E0(id).ref3D && !(E0(id).has3D && /vest|corporate-skirt/.test(E0(id).glb ?? ''))) && !Cp.SCANNED_GARMENTS.some(x => Object.values(x.models).some(m => /corporate-skirt|dress-shift|vest-blouse/.test(m))));
  }
  {
    const GP = await L('/src/pages/client/design-studio/garmentPaths.js');
    // Every gallery photo has exactly one explicit path, and every editable one survives Save -> Reopen -> Order with its identity and model.
    const galDir = pathx.join(urlx.fileURLToPath(new URL('../public/', import.meta.url)), 'gallery');
    const webp = fsx.readdirSync(galDir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort();
    t('gallery: one entry per public/gallery image (39), every image file present', webp.length === 39 && JSON.stringify(webp) === JSON.stringify(D.ENTRIES.map(d => d.id).sort()));
    const editable = D.ENTRIES.filter(d => D.openTarget(d, {}));
    t('gallery paths are explicit: 33 open an editable template, 6 are reference-only (2 held-back sets with a read-only 3D viewer, 4 photo-only)', editable.length === 33 && D.ENTRIES.filter(d => !D.openTarget(d, {})).length === 6 && D.ENTRIES.filter(d => !D.openTarget(d, {}) && d.ref3D).map(d => d.id).sort().join() === 'set-pinstripe-pants,set-pinstripe-skirt' && D.ENTRIES.filter(d => !D.openTarget(d, {}) && !d.ref3D).map(d => d.id).sort().join() === 'blazer-blouse-blue-short,dress-sheath-denim-blue,dress-shift-geometric,set-vest-blouse' && D.ENTRIES.every(d => (d.tier === 'reference') === !D.openTarget(d, {})));
    const trip = d => {
      const t0 = D.openTarget(d, {}), cfg = { ...G.applyGarment(S.DEFAULT_CFG, t0.garment, { ...t0, inspirationId: d.id }), colors: { ...S.DEFAULT_CFG.colors, body: '#7a1f2b' } };
      const saved = JSON.parse(JSON.stringify(S.serializeDesign(cfg, {}))), back = S.deserializeDesign(saved).cfg, order = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(back, {})))).cfg;
      const r0 = G.resolveTarget(cfg.garment, cfg.sleeve, cfg.fit);
      return [back, order].every(x => x.garment === cfg.garment && x.sleeve === cfg.sleeve && x.fit === cfg.fit && x.inspirationId === d.id && x.colors.body === '#7a1f2b' && G.resolveTarget(x.garment, x.sleeve, x.fit).templateId === r0.templateId && G.resolveTarget(x.garment, x.sleeve, x.fit).glb === r0.glb && Cp.has3DModel(x.garment, x.sleeve, x.fit) === (!!r0.glb || !!Cp.scannedEntryFor(x.garment, x.sleeve, x.fit)?.parametric))
        && saved.templateId === r0.templateId && saved.inspirationId === d.id && (!d.has3D || r0.glb === d.glb);
    };
    const broken = editable.filter(d => !trip(d)).map(d => d.id);
    t('all 19 editable gallery photos survive Save -> Reopen -> Order payload with garment, sleeve, fit, template, gallery id, colour and the same 3D model (photo GLB when the photo has one)', broken.length === 0, broken.join());
    t('3D coverage kinds (2026-10-16): 23 photos with their own model, 7 labelled family-level approximations, 3 2D only (the sets that open a rebuilt top), 2 full-set previews, 6 reference-only', editable.filter(d => d.has3D).length === 23 && D.ENTRIES.filter(d => d.familyApprox3D).map(d => d.id).sort().join() === 'blazer-double-breasted-gray,blazer-pinstripe-navy,blouse-roundneck-mustard,blouse-scarf-cream,corporate-skirt,pants,shirt-two-tone-gpc' && editable.filter(d => !d.has3D && !d.familyApprox3D).map(d => d.id).sort().join() === 'pantsuit-notch-short-gray,peplum-set-navy,polo-barong-brown' && D.ENTRIES.filter(d => d.ref3D?.set).length === 2 && D.ENTRIES.filter(d => d.tier === 'reference').length === 6 && D.ENTRIES.filter(d => d.familyApprox3D).every(d => d.tier === 'editable-2d' && !d.has3D && !d.glb));
    {
      // Designs saved before 2026-10-12 opened this photo on T-Shirt / Short / female; that model is a V-neck tee, so 3D stays withheld for
      // them (Studio, Wizard, Order Detail all gate on has3DFor), while choosing T-Shirt directly keeps its model.
      const tunic = G.applyGarment(S.DEFAULT_CFG, 'T-Shirt', { sleeve: 'Short', fit: 'female', inspirationId: 'blouse-tunic-roundneck-blue' });
      const saved = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(tunic, {})))).cfg;
      const plain = G.applyGarment(S.DEFAULT_CFG, 'T-Shirt', { fit: 'female' });
      t('tunic photo: a design saved on the old T-Shirt route keeps 3D withheld (the T-Shirt model is a V-neck tee); a plain T-Shirt keeps 3D; changing garment drops the photo and the block; the photo itself now opens its own derived model',
        Cp.has3DFor(G.applyGarment(S.DEFAULT_CFG, D.openTarget(E0('blouse-tunic-roundneck-blue'), {}).garment, { inspirationId: 'blouse-tunic-roundneck-blue' })) && Cp.has3DModel(tunic.garment, tunic.sleeve, tunic.fit) && !Cp.has3DFor(tunic) && saved.inspirationId === 'blouse-tunic-roundneck-blue' && !Cp.has3DFor(saved) && Cp.has3DFor(plain) && Cp.has3DFor(G.applyGarment(tunic, 'Polo Shirt', {})) === Cp.has3DModel('Polo Shirt', G.applyGarment(tunic, 'Polo Shirt', {}).sleeve, G.applyGarment(tunic, 'Polo Shirt', {}).fit) && G.applyGarment(tunic, 'Polo Shirt', {}).inspirationId == null);
      t('Skirt offers 3D again through the authored pencil skirt (never the withheld stand-in); the corporate-skirt photo is labelled a family approximation; every NO_FAMILY_3D id is now an editable photo with its own derived model (the block only guards old T-Shirt designs)', [...Cp.NO_FAMILY_3D].every(id => E0(id).tier === '2d-3d-approx' && E0(id).pieces?.single && !E0(id).familyApprox3D) && !Cp.standIn3D('Skirt') && E0('corporate-skirt').familyApprox3D && Cp.has3DFor({ ...G.applyGarment(S.DEFAULT_CFG, 'Skirt', {}), inspirationId: 'corporate-skirt' }) && Cp.has3DFor(G.applyGarment(S.DEFAULT_CFG, 'Skirt', {})) && G.FAMILY_BY_NAME.Skirt.status3D === 'partial');
    }
    t('My Designs fallback thumbnail and Order previews have a 2D shape for every catalog family (build-your-own garments draw from their saved spec)', Object.keys(G.FAMILY_BY_NAME).every(g => !!GP.BASE_PATHS[g] || !!GP.customPaths(g, null).body));
  }
  t('every 3D runtime model path exists under public/', Cp.SCANNED_GARMENTS.every(x => Object.values(x.models).every(m => fsx.existsSync(pub(decodeURI(m).slice(1))))));
}
{
  const SN = await L('/src/pages/client/design-studio/snapGuides.js'), GS = (await L('/src/pages/client/design-studio/canvasGuides.js')).gridSpec;
  const G0 = { left: 60, top: 40, width: 200, height: 300 };
  const tg = SN.snapTargets({ width: 320, height: 400, garment: G0, others: [{ left: 100, top: 100, width: 40, height: 20 }], grid: GS(G0, 10) });
  const a = SN.computeSnap({ left: 137, top: 200, width: 46, height: 30 }, tg);
  t('snap: centre within 6px jumps to the canvas/garment centre line, with one vertical guide', a.dx === 160 - 160 + (160 - (137 + 23)) && a.guides.some(g => g.axis === 'v' && g.at === 160));
  const b = SN.computeSnap({ left: 101, top: 300, width: 30, height: 10 }, tg);
  t('snap: an element edge snaps to another element edge before a grid line', b.dx === -1 && b.guides.find(g => g.axis === 'v').kind === 'object');
  const c = SN.computeSnap({ left: 13, top: 13, width: 2, height: 2 }, SN.snapTargets({ width: 320, height: 400 }));
  t('snap: no target within the threshold -> no move, no guides; grid lines only when the grid is on', c.dx === 0 && c.dy === 0 && c.guides.length === 0 && SN.computeSnap({ left: 18, top: 300, width: 4, height: 4 }, SN.snapTargets({ width: 320, height: 400, grid: GS({ left: 0, top: 0, width: 200, height: 200 }, 10) })).guides.some(g => g.kind === 'grid'));
  t('snap grid is the rulers\' grid: lines from the garment top-left every pct of its width/height, plus the 50% centre on BOTH axes', (() => {
    const g20 = SN.snapTargets({ width: 320, height: 400, grid: GS(G0, 20) }); // sx 40, sy 60: 50% (160, 190) is off-cell on y
    const gv = g20.v.filter(l => l.kind === 'grid').map(l => l.at), gh = g20.h.filter(l => l.kind === 'grid').map(l => l.at);
    return gv.includes(60) && gv.includes(100) && gv.includes(160) && gh.includes(40) && gh.includes(100) && gh.includes(190) && SN.computeSnap({ left: 0, top: 187, width: 6, height: 6 }, g20).dy === 0; })());
  t('rotation snap: locks within 3deg of a 15deg step, wraps negatives, leaves other angles alone', SN.snapAngle(44) === 45 && SN.snapAngle(-2) === 0 && SN.snapAngle(358.5) === 0 && SN.snapAngle(37) === 37);
  t('snap threshold is ~6 screen px at any zoom (logical px = 6 / scale), clamped to 2..12 logical px', SN.snapThreshold(1) === 6 && SN.snapThreshold(2) === 3 && SN.snapThreshold(0.5) === 12 && SN.snapThreshold(0.3) === 12 && SN.snapThreshold(4) === 2 && SN.snapThreshold(0) === 6);
  t('zoom-aware threshold: a 5 px gap snaps at 100% and on a phone (scale 0.5) but not at 270% (13.5 screen px away)', (() => { const tg = SN.snapTargets({ width: 320, height: 400 }), box = { left: 145, top: 10, width: 10, height: 4 }; /* right edge 155, centre line 160 */
    return SN.computeSnap(box, tg, SN.snapThreshold(1)).dx === 5 && SN.computeSnap(box, tg, SN.snapThreshold(0.5)).dx === 5 && SN.computeSnap(box, tg, SN.snapThreshold(2.7)).dx === 0; })());
  t('resize: each control moves only its own sides (tl/tr/bl/br/ml/mr/mt/mb); unknown controls move nothing', ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb', 'mtr'].map(c => { const e = SN.movingEdges(c); return `${e.x ?? '-'}/${e.y ?? '-'}`; }).join() === 'left/top,right/top,left/bottom,right/bottom,left/-,right/-,-/top,-/bottom,-/-');
  {
    const tg = SN.snapTargets({ width: 320, height: 400, others: [{ left: 200, top: 300, width: 50, height: 20 }] });
    const r = SN.computeResizeSnap({ left: 100, top: 100, width: 97, height: 40 }, 'mr', tg, 6); // right side 197 -> 200
    t('resize snap: the right handle 3 px from an element edge widens to it (ratio 100/97), height untouched, one vertical guide', Math.abs(r.rx - 100 / 97) < 1e-9 && r.ry === 1 && r.guides.length === 1 && r.guides[0].at === 200 && r.guides[0].kind === 'object');
    const l = SN.computeResizeSnap({ left: 163, top: 100, width: 40, height: 40 }, 'ml', tg, 6); // left side 163 -> centre line 160
    t('resize snap: the left handle grows leftwards onto the centre line (width 43/40)', Math.abs(l.rx - 43 / 40) < 1e-9 && l.guides[0].at === 160);
    const u = SN.computeResizeSnap({ left: 100, top: 100, width: 98, height: 196 }, 'br', tg, 6, true); // right 198 (2 off 200), bottom 296 (4 off 300)
    t('proportional corner resize uses one ratio from the closer side and shows only that side\'s guide (no false guide for the other)', Math.abs(u.rx - 100 / 98) < 1e-9 && u.ry === u.rx && u.guides.length === 1 && u.guides[0].axis === 'v');
    t('resize snap never collapses or flips an element, and far from any line changes nothing', (r0 => r0.rx === 1 && r0.guides.length === 0)(SN.computeResizeSnap({ left: 158, top: 0, width: 1, height: 10 }, 'ml', tg, 6)) && SN.computeResizeSnap({ left: 10, top: 10, width: 30, height: 30 }, 'br', tg, 2).guides.length === 0);
  }
  {
    const lim = SN.panLimits({ w: 320, h: 380, scale: 2.7, viewW: 900, viewH: 700 });
    t('pan limits: only where the zoomed artboard overflows (by overflow + margin), zero when it fits', lim.x === 0 && Math.abs(lim.y - ((380 * 2.7 - 700) / 2 + SN.PAN_MARGIN)) < 1e-9 && SN.panLimits({ w: 320, h: 380, scale: 1, viewW: 900, viewH: 700 }).y === 0);
    t('pan clamp keeps the artboard reachable and never returns -0', (c => c.x === 0 && Object.is(c.x, 0) && c.y === -lim.y)(SN.clampPan({ x: -50, y: -9999 }, lim)) && Object.is(SN.clampPan({ x: -0, y: 0 }, { x: 0, y: 0 }).x, 0));
  }
}
// P0 draft continuity (G1-G3): account draft label, design identity across the Laravel JSON round trip, and the save/delete call sites.
{
  const H = await L('/src/utils/studioHandoff.js');
  const named = 'Bayanihan Clinic — Ñoño’s “Lab Coat” #2 (Pasig)';
  t('draft label is the customer\'s design name (Unicode, punctuation and spacing kept; runs of whitespace collapsed)', S.draftLabel({ name: `  ${named.replace(' ', '   ')} `, garment: 'Lab Coat', category: 'Medical / Scrubs' }) === named);
  t('draft label falls back to "<garment> — <category>" for unnamed or blank-named designs, never "undefined"', S.draftLabel({ name: '   ', garment: 'Lab Coat', category: 'Medical / Scrubs' }) === 'Lab Coat — Medical / Scrubs' && S.draftLabel({ garment: 'Pants' }) === 'Pants' && S.draftLabel({}) === '');
  t('draft label fits the 120-character backend limit', S.draftLabel({ name: 'x'.repeat(300) }).length === 120);
  const cfgN = { ...G.applyGarment({ ...base }, 'Lab Coat', { category: 'Medical / Scrubs' }), name: named, colors: { body: '#123456' } };
  const snap = S.serializeDesign(cfgN, { overlays: [{ type: 'textbox', text: 'Ñoño', left: 10.5, top: 20 }], frontOverlays: [{ type: 'textbox', text: 'Ñoño', left: 10.5, top: 20 }], backOverlays: [] }, 'data:image/png;base64,AAAA');
  t('design name rides the serialized snapshot and reads back unchanged', snap.name === named && S.deserializeDesign(JSON.parse(JSON.stringify(snap))).cfg.name === named);
  // What Laravel hands back: keys reordered, {} and [] swapped, null-valued keys dropped, floats re-printed, no preview.
  const php = v => Array.isArray(v) ? (v.length ? v.map(php) : {}) : v && typeof v === 'object' ? (Object.keys(v).length ? Object.fromEntries(Object.keys(v).reverse().filter(k => v[k] !== null).map(k => [k, php(v[k])])) : []) : v;
  const { previewPng, ...stored } = snap; // eslint-disable-line no-unused-vars
  const fp = H.draftFingerprint(snap);
  t('design fingerprint matches the same design after the backend JSON round trip, and ignores the preview image', !!fp && fp === H.draftFingerprint(php(JSON.parse(JSON.stringify(stored)))) && fp === H.draftFingerprint({ ...snap, previewPng: 'data:image/png;base64,BBBB' }));
  t('design fingerprint differs for any real design change (colour, name, overlay text, overlay position)', [{ ...snap, colors: { ...snap.colors, body: '#123457' } }, { ...snap, name: named + '.' }, { ...snap, frontOverlays: [{ ...snap.frontOverlays[0], text: 'Nono' }] }, { ...snap, frontOverlays: [{ ...snap.frontOverlays[0], left: 10.6 }] }].every(x => H.draftFingerprint(x) !== fp) && H.draftFingerprint(null) === null);
  const src = p => fsx.readFileSync(urlx.fileURLToPath(new URL(p, import.meta.url)), 'utf8');
  const studio = src('../src/pages/client/DesignStudio.jsx'), wizard = src('../src/pages/client/OrderWizard.jsx');
  t('Studio: every account draft write goes through one payload that always carries a preview and the design-name label', (studio.match(/axios\.post\('\/api\/customer\/drafts'/g) ?? []).length === 1 && /preview_dataurl: await fitDraftPreview\(exportPNG\(\)\)/.test(studio) && /label:\s+draftLabel\(cfg\)/.test(studio) && !/`\$\{cfg\.garment\} — \$\{cfg\.category\}`/.test(studio));
  t('Studio never deletes the account draft (Order keeps it; the Wizard retires it after a successful submit)', !/drafts\/latest'\)/.test(studio.replace(/axios\.get\('\/api\/customer\/drafts\/latest'\)/g, '')) && !/axios\.delete\([^)]*drafts/.test(studio));
  t('Wizard deletes the draft only after the order POST succeeds, and only when the draft is still the ordered design', (m => m.length === 1)(wizard.match(/axios\.delete\('\/api\/customer\/drafts\/latest'\)/g) ?? []) && wizard.indexOf("axios.post('/api/customer/orders'") < wizard.indexOf("axios.delete('/api/customer/drafts/latest')") && /draftFingerprint\(d\.data\?\.draft\?\.studio_config\) === fp\) return axios\.delete/.test(wizard) && !/catch\(e\)[\s\S]{0,400}drafts\/latest/.test(wizard));
}
// Order title = the saved design name (studio_config.name, the only place the API stores it), else the garment; never blank.
{
  const N = await L('/src/utils/designName.js'), K = await L('/src/components/customer/kit.jsx');
  const nm = 'Bayanihan Clinic — Ñoño’s “Lab Coat” #2 (Pasig)';
  t('order title is the saved design name from studio_config (decoded object on detail, JSON string on the list endpoint)', K.orderTitle({ garment_type: 'Lab Coat', studio_config: { name: nm } }) === nm && K.orderTitle({ garment_type: 'Lab Coat', studio_config: JSON.stringify({ name: `  ${nm}  ` }) }) === nm);
  t('legacy/unnamed orders fall back to the humanized garment, then "Custom Order"; never undefined, null or empty', [
    [{ garment_type: 'polo_shirt', studio_config: { name: '' } }, 'Polo Shirt'], [{ garment_type: 'Lab Coat', studio_config: { name: '   ' } }, 'Lab Coat'],
    [{ garment_type: 'Lab Coat', studio_config: null }, 'Lab Coat'], [{ garment_type: 'Lab Coat', studio_config: '{bad json' }, 'Lab Coat'],
    [{ garment_type: '', studio_config: { name: null } }, 'Custom Order'], [{}, 'Custom Order'], [null, 'Custom Order'], [{ garment_type: 'Pants', studio_config: { name: 42 } }, 'Pants'],
  ].every(([o, want]) => K.orderTitle(o) === want));
  t('saved design name helper is shared by the draft label (one rule for drafts and orders)', N.savedDesignName({ name: ' a  b ' }) === 'a b' && S.draftLabel({ name: ' a  b ', garment: 'Pants' }) === 'a b' && N.savedDesignName('null') === '' && N.savedDesignName(undefined) === '');
}
// P2 thumbnails: one DesignThumb for saved designs; a real saved preview is never confused with the colour-silhouette fallback.
{
  const K = await L('/src/components/customer/kit.jsx');
  const html = p => renderToString(React.createElement(K.DesignThumb, p));
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const withSrc = html({ src: png, garment: 'Lab Coat', colors: { body: '#800000' }, name: 'Ñoño’s coat' });
  t('DesignThumb with a saved preview renders that image (loading until it decodes) and no silhouette or fallback note', /data-kind="loading"/.test(withSrc) && withSrc.includes(`src="${png}"`) && !/<svg/.test(withSrc) && !/cx-dthumb-note/.test(withSrc) && /aria-label="Saved preview of Ñoño’s coat"/.test(withSrc));
  const none = html({ src: null, garment: 'Lab Coat', colors: { body: '#800000' }, name: 'Ñoño’s coat', scale: 2.3 });
  t('DesignThumb without a preview shows the colour silhouette as a labelled fallback ("Colours only"), never an <img>', /data-kind="fallback"/.test(none) && /<svg/.test(none) && /#800000/.test(none) && !/<img/.test(none) && />Colours only</.test(none) && /aria-label="No saved preview: garment colours only for Ñoño’s coat"/.test(none));
  const small = html({ src: '', garment: 'Pants', compact: true });
  t('compact DesignThumb fallback keeps the framed silhouette and an accessible label, without the caption that would not fit', /data-kind="fallback"/.test(small) && /cx-dthumb--sm/.test(small) && !/cx-dthumb-note/.test(small) && /aria-label="No saved preview: garment colours only"/.test(small));
  t('starter-design photos are labelled as starter photos, not as the customer\'s saved preview', /aria-label="Starter design photo of Polo"/.test(html({ src: png, garment: 'Polo Shirt', name: 'Polo', what: 'Starter design photo' })));
  const src = p => fsx.readFileSync(urlx.fileURLToPath(new URL(p, import.meta.url)), 'utf8');
  const my = src('../src/pages/client/MyDesigns.jsx'), home = src('../src/pages/client/Dashboard.jsx'), canvas = src('../src/pages/client/design-studio/useGarmentCanvas.js');
  t('My Designs and Home draw saved-design thumbnails only through DesignThumb (draft preview_dataurl, archived photo_path)', !/MiniPreview/.test(my) && !/MiniPreview/.test(home) && /<DesignThumb src=\{img\}/.test(my) && /img=\{draft\.preview_dataurl\}/.test(my) && /DesignThumb compact src=\{draft\.preview_dataurl\}/.test(home) && /DesignThumb compact src=\{d\.photo_path\}/.test(home));
  const tiles = [my, home].flatMap(s => s.match(/<(button|Link|a)\b[^>]*>(?:(?!<\/\1>)[\s\S])*?<DesignThumb compact[\s\S]*?<\/\1>/g) ?? []);
  t('a compact DesignThumb inside an interactive tile is aria-hidden, so the tile text is its single accessible name', tiles.length > 0 && tiles.every(b => /aria-hidden="true"[^<]*>\s*<DesignThumb compact|<DesignThumb compact[^>]*aria-hidden="true"/.test(b)));
  t('Home and My Designs title a design by the customer\'s saved name first', /savedDesignName\(draft\.studio_config\) \|\| draft\.label/.test(home) && /savedDesignName\(d\.config\) \|\| d\.label/.test(home) && /savedDesignName\(c\) \|\| label \|\| fallback/.test(my));
  t('the draft preview render (exportPNG) hides the zone hover outline, like exportFace', /const exportPNG[\s\S]{0,300}__hoverGlow[\s\S]{0,120}o\.visible = false/.test(canvas));
}
// Customer atelier foundation: tokens stay in the customer scope, admin never imports them.
{
  const K = await L('/src/components/customer/kit.jsx');
  const html = (C, p) => renderToString(React.createElement(C, p));
  const err = html(K.ErrorState, { onRetry: () => {} }), sw = html(K.SwatchChip, { color: '#800000', name: 'Maroon', selected: true, onSelect: () => {} });
  t('ErrorState announces itself and offers a retry; SwatchChip exposes its selection as aria-pressed', /role="alert"/.test(err) && /<button[^>]*>.*Try again<\/button>/.test(err) && /aria-pressed="true"/.test(sw) && /--sw:#800000/.test(sw) && !/<button/.test(html(K.SwatchChip, { color: '#fff', name: 'White' })));
  const src = p => fsx.readFileSync(urlx.fileURLToPath(new URL(p, import.meta.url)), 'utf8');
  const walk = d => fsx.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : /\.(jsx?|css)$/.test(e.name) ? [`${d}/${e.name}`] : []);
  const root = urlx.fileURLToPath(new URL('../src', import.meta.url));
  const admin = [`${root}/layouts/AdminLayout.jsx`, ...walk(`${root}/pages/admin`), ...(fsx.existsSync(`${root}/components/admin`) ? walk(`${root}/components/admin`) : [])];
  const leaks = admin.filter(f => /customer(-shell)?\.css|premium\.css|components\/customer\/|layouts\/CustomerLayout|--cx-/.test(fsx.readFileSync(f, 'utf8')));
  t('admin routes import no customer tokens, shell styles or customer kit', admin.length > 10 && leaks.length === 0);
  const cust = src('../src/styles/customer.css'), shell = src('../src/styles/customer-shell.css'), layout = src('../src/layouts/CustomerLayout.jsx');
  const defs = [...cust.matchAll(/([^{}]+)\{[^{}]*--cx-[\w-]+\s*:/g)].map(m => m[1].trim());
  const global = ['theme.css', 'admin.css', 'site.css', 'auth.css', 'modals.css', 'responsive.css'].filter(f => /--cx-/.test(src(`../src/styles/${f}`))).concat(/--cx-/.test(src('../src/main.css')) ? ['main.css'] : []);
  t('customer tokens are defined only on customer roots (html[data-cx], .cm-shell, the Studio .ds; dark mode re-points the same roots, never .ds), never on :root or shared stylesheets', defs.length === 2 && defs[0].endsWith(':is(html[data-cx],.cm-shell,.ds)') && defs[1].endsWith('html[data-theme=dark]:is([data-cx]),html[data-theme=dark] .cm-shell') && global.length === 0);
  const sels = [...shell.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[;}])\s*([^{}@;]+)\{/g)].map(m => m[1].trim()).filter(s => !/^(from|to|\d+%)$/.test(s)).flatMap(s => s.split(','));
  t('every customer shell rule is scoped to the customer root, so admin is untouched after the shell has loaded', sels.length > 30 && sels.every(s => /data-cx|\.cx-|\.cm-(shell|main|content|studio-fab)/.test(s)));
  t('the customer shell sets data-cx on mount and removes it on unmount; shell CSS is imported only by the layout', /useLayoutEffect\(\(\) => \{[\s\S]{0,120}dataset\.cx = ''[\s\S]{0,60}delete root\.dataset\.cx/.test(layout) && /import '\.\.\/styles\/customer-shell\.css'/.test(layout) && !/customer-shell\.css/.test(src('../src/main.jsx')));
}
// Studio shell: one stacking scale, one 2D/3D toggle, and 2D as the landing view for any garment whose 3D is not verified.
{
  const src = p => fsx.readFileSync(urlx.fileURLToPath(new URL(p, import.meta.url)), 'utf8');
  const z = Object.fromEntries([...src('../src/styles/customer.css').matchAll(/--cx-z-(\w+):(\d+)/g)].map(m => [m[1], +m[2]]));
  t('z-index tokens order bar < banner < popover < sheet < modal, with stage controls below the bar', z.stage < z.bar && z.bar < z.banner && z.banner < z.popover && z.popover < z.sheet && z.sheet < z.modal);
  const dir = urlx.fileURLToPath(new URL('../src/pages/client/design-studio', import.meta.url));
  const files = [...fsx.readdirSync(dir).filter(f => f.endsWith('.jsx')).map(f => `${dir}/${f}`), urlx.fileURLToPath(new URL('../src/pages/client/DesignStudio.jsx', import.meta.url))];
  const literals = files.flatMap(f => [...fsx.readFileSync(f, 'utf8').matchAll(/z-?[iI]ndex\s*:\s*'?(\d+)/g)].filter(m => +m[1] >= 10).map(m => `${f.split(/[\\/]/).pop()}:${m[1]}`));
  t('Studio overlays use the z-index tokens: no literal z-index of 10 or more in Studio files', literals.length === 0);
  const styles = src('../src/pages/client/design-studio/DesignStudioStyles.jsx');
  t('Studio bar, draft strip and toast sit on their token levels; the phone bottom nav is in the page flow', [/\.ds-bar\{[^}]*z-index:var\(--cx-z-bar\)/, /\.ds-draft\{[^}]*z-index:var\(--cx-z-banner\)/, /\.ds-bnav\{display:grid;flex:none;/, /\.ds-toast\{[^}]*z-index:var\(--cx-z-popover\)/].every(r => r.test(styles)));
  const studio = files.map(f => [f.split(/[\\/]/).pop(), fsx.readFileSync(f, 'utf8')]);
  const toggles = studio.filter(([, s]) => /\[\s*'2d'\s*,\s*'3d'\s*\]\.map/.test(s)).map(([n]) => n);
  t('exactly one 2D/3D toggle (TopBar); the inspector has no duplicate Preview toggle', toggles.length === 1 && toggles[0] === 'TopBar.jsx' && !/Preview mode/.test(src('../src/pages/client/design-studio/TypePanel.jsx')));
  const V = await L('/src/pages/client/design-studio/studioView.js');
  const C = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const combos = C.CATALOG.flatMap(c => c.families).flatMap(f => (f.styles?.length ? f.styles : [null]).flatMap(sl => (f.fits?.length ? f.fits : [undefined]).map(fit => ({ garment: f.id, sleeve: sl, fit }))));
  const unverified = combos.filter(c => C.resolveTarget(c.garment, c.sleeve, c.fit)?.status !== '2d-3d');
  t('a garment lands in 2D unless its 3D is verified (every catalog garment/sleeve/fit today; a verified one keeps the current view)', combos.length > 20 && unverified.every(c => V.landingViewFor(c, '3d') === '2d') && V.landingView('2d-3d', '3d') === '3d' && V.landingView('2d-3d-approx', '3d') === '2d' && V.landingViewFor({ garment: null }, '3d') === '2d');
  const ds = src('../src/pages/client/DesignStudio.jsx');
  t('the draft offer is an in-flow strip shown only on an empty canvas; restoring over existing work asks first', /pendingDraft && !cfg\.garment && layers\.length === 0 && \(\s*<DraftStrip/.test(ds) && /hasWork \? setConfirm\(true\) : onRestore\(\)/.test(src('../src/pages/client/design-studio/DraftStrip.jsx')) && !/position:'absolute', top:58/.test(ds));
}
// Studio: every element once. One garment picker, undo/redo only in the top bar, rail tools wait for a garment.
{
  const dir = urlx.fileURLToPath(new URL('../src/pages/client/design-studio', import.meta.url));
  const rd = f => fsx.readFileSync(f, 'utf8');
  const all = [...fsx.readdirSync(dir).filter(f => /\.jsx?$/.test(f)).map(f => [f, rd(`${dir}/${f}`)]), ['DesignStudio.jsx', rd(urlx.fileURLToPath(new URL('../src/pages/client/DesignStudio.jsx', import.meta.url)))]];
  const get = n => all.find(([f]) => f === n)?.[1] ?? '';
  const pickers = all.filter(([f, s]) => f.endsWith('.jsx') && /CATALOG\.map|\.families\.map|filterDesigns\(/.test(s)).map(([f]) => f); // UI components only; data modules may map the catalog
  const users = all.filter(([f, s]) => f !== 'GarmentPicker.jsx' && /<GarmentPicker\b/.test(s)).map(([f]) => f).sort();
  t('one garment picker component: only GarmentPicker lists garments or photos; used inline on the canvas (DesignStudio) and in the picker modal (InspoGallery)',
    pickers.length === 1 && pickers[0] === 'GarmentPicker.jsx' && users.join() === 'DesignStudio.jsx,InspoGallery.jsx' && !all.some(([f]) => f === 'FirstRunGallery.jsx')
    && /tab=\{pickerTab\}/.test(get('DesignStudio.jsx')) && /setPickerTab\('templates'\)/.test(get('DesignStudio.jsx')) && /setPickerTab\('inspiration'\)/.test(get('DesignStudio.jsx')) && !/CATALOG|selectFamily/.test(get('TypePanel.jsx')));
  const undoUi = all.filter(([f, s]) => f !== 'TopBar.jsx' && /Undo2|Redo2|aria-label="(Undo|Redo)"|onClick=\{(history\.)?(undo|redo)\}/.test(s)).map(([f]) => f);
  t('undo/redo controls exist only in the top bar', undoUi.length === 0 && /aria-label="Undo"/.test(get('TopBar.jsx')) && /aria-label="Redo"/.test(get('TopBar.jsx')));
  const drawer = get('ToolDrawer.jsx');
  t('tabs and the Pieces rail appear only once a garment exists (the panel says to choose one first)',
    /const noGarment = !p\.cfg\.garment/.test(drawer) && /\{!noGarment && \(\s*<nav className="ds-tabs"/.test(drawer) && /Choose a garment on the canvas to start designing\./.test(drawer)
    && /if \(!cfg\.garment\) return null;/.test(get('PiecesRail.jsx')));
  const SH = await L('/src/pages/client/design-studio/dsShared.js');
  t('six labelled tabs on desktop (Garment, Colour, Details, Logo, Layers, Ask AI): every tool belongs to exactly one tab, Layers is a real tab, Draw sits in Logo & text; phones and tablets: Garment, Colours, Logo, Layers, More (Details, Ask AI, View, Save a copy)',
    SH.TABS.map(t => t.label).join('|') === 'Garment|Colours|Details|Logo & text|Layers|Ask AI'
    && SH.TOOLS.filter(t => t.id !== 'selected').every(t => SH.TABS.filter(x => x.tools.includes(t.id)).length === 1)
    && SH.tabOf('draw').id === 'logotext' && SH.tabOf('pattern').id === 'color' && /layers:\s*\(\)\s*=>/.test(drawer) && (drawer.match(/<LayersPanel\b/g) ?? []).length === 1
    && !/sr-only|toggleMore/.test(drawer) && /<span>\{SHORT\[t\.id\] \?\? t\.label\}<\/span>/.test(drawer)
    && /const NAV = \['type', 'color', 'logotext', 'layers'\];/.test(drawer) && /className="ds-more"/.test(drawer) && /<span>More<\/span>/.test(drawer));
  const bar = get('TopBar.jsx'), dsx = fsx.readFileSync(urlx.fileURLToPath(new URL('../src/pages/client/DesignStudio.jsx', import.meta.url)), 'utf8');
  t('top bar holds the one primary action: Review & order (Review on phones), Reorder when final; Save, export and the save state live there; no dock, no inline lock banner',
    /'Review & order'/.test(bar) && /className="ds-bar-primary" onClick=\{onReorder\}/.test(bar) && /onClick=\{saveDesign\}/.test(bar) && /Export PDF spec sheet/.test(bar)
    && !/<StudioDock/.test(get('ToolDrawer.jsx')) && !/FINAL DESIGN/.test(dsx) && /<PiecesRail /.test(dsx) && !/ds-bar-cat|cfg\.category/.test(bar));
  const CATd = await L('/src/pages/client/design-studio/garmentCatalog.js');
  t('dock 3D status matches the garment cards: an unverified "supported" model reads "3D (approx.)", plain "3D" only with a verification record',
    /\{label3D\(cfg\)\}/.test(get('TopBar.jsx')) && !/Approx\. 3D</.test(get('TopBar.jsx'))
    && ['Pants', 'Jogger Scrub Pants', 'Custom Skirt'].every(g => { const f = CATd.familyFor(g); return f && f.status3D !== 'none' && !f.verified3D; }));
}
// Studio visual quality: photo bases never above native resolution; a new design starts with one base colour.
{
  const A = await L('/src/pages/client/design-studio/garmentAssets.js');
  const Pth = await L('/src/pages/client/design-studio/garmentPaths.js');
  const V = await L('/src/pages/client/design-studio/studioView.js');
  const bases = Object.entries(A.ASSET_2D).flatMap(([g, bs]) => Object.entries(bs).flatMap(([sl, bf]) => Object.entries(bf).flatMap(([face, bfit]) => Object.values(bfit).map(a => ({ a, art: Pth.getGarmentPaths(g, sl, face) })))));
  // On-screen size of the photo = native x in-canvas scale x viewport scale; at the cap that is exactly native or less, for every base.
  t('every photo base is capped at 1:1 on screen (in-canvas scale x max viewport scale <= 1)', bases.length >= 6 && bases.every(({ a, art }) => V.inCanvasScale(a, art) * V.photoMaxScale(a, art) <= 1 + 1e-9) && V.photoMaxScale(null, { w: 320, h: 380 }) === Infinity);
  const cv = fsx.readFileSync(urlx.fileURLToPath(new URL('../src/pages/client/design-studio/CanvasViewport.jsx', import.meta.url)), 'utf8');
  t('the viewport applies the photo cap to fit x zoom and disables zoom-in at it', /const cap = photoMaxScale\(photo, canvasSize\)/.test(cv) && /const base = Math\.min\(fit, cap\)/.test(cv) && /const scale = Math\.min\(zoom \* base, cap\)/.test(cv) && /ctrl\('Zoom in'[^]*?disabled: atCap/.test(cv));
  // Runtime anti-aliasing of the cut-out edge: alpha only ever drops, transparent stays transparent, the interior stays opaque.
  const w = 6, h = 6, px = new Uint8ClampedArray(w * h * 4);
  for (let y = 1; y < 5; y++) for (let x = 1; x < 5; x++) px[(y * w + x) * 4 + 3] = 255;
  const before = Array.from({ length: w * h }, (_, i) => px[i * 4 + 3]);
  A.featherEdge(px, w, h);
  const after = Array.from({ length: w * h }, (_, i) => px[i * 4 + 3]);
  t('photo cut-out edges are anti-aliased at runtime without fringes (alpha never rises; edges soften; interior opaque)', after.every((v, i) => v <= before[i]) && after[0] === 0 && after[1 * w + 1] < 255 && after[1 * w + 1] > 0 && after[2 * w + 2] === 255);
  const C = await L('/src/pages/client/design-studio/colorRules.js');
  const G2 = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const S2 = await L('/src/pages/client/design-studio/designSerialization.js');
  const one = c => ['collar', 'sleeve', 'pocket'].every(z => c[z] === c.body);
  t('a new design starts with one base colour on every zone', one(S2.DEFAULT_CFG.colors) && one(C.startColors('#800000')) && one(S2.deserializeDesign(null).cfg.colors));
  const pickNew = (pick) => { let st = { ...S2.DEFAULT_CFG, colors: { ...C.startColors('#1B2A4A'), sleeve: '#CC0000', collar: '#CC0000' } }; SG.selectFamily(fn => { st = fn(st); }, G2.familyFor('Polo Shirt'), null, pick); return st.colors; };
  t('picking the first garment starts single-colour (body colour on every zone, carousel colour included), never the previous sleeves', one(pickNew()) && pickNew().body === '#1B2A4A' && one(pickNew({ bodyColor: '#274C77' })) && pickNew({ bodyColor: '#274C77' }).sleeve === '#274C77');
  const fresh = { ...S2.DEFAULT_CFG, colors: { ...S2.DEFAULT_CFG.colors } };
  const polo = G2.applyGarment(fresh, 'Polo Shirt');
  const tunic = G2.applyGarment(fresh, 'Mandarin Collar', { sleeve: 'Short', fit: 'female' });
  const realTrim = C.realTrimFor('Mandarin Collar', 'Short', 'female');
  t('picking a garment keeps one colour, except a real garment trim (housekeeping tunic keeps its photo trim); leaving it follows the body again',
    one(polo.colors) && !!realTrim && tunic.colors.collar === realTrim && one(G2.applyGarment(tunic, 'Polo Shirt').colors) && C.realTrimFor('Polo Shirt', 'Short', 'male') === null);
  const moved = C.withBody({ body: '#111111', collar: '#111111', sleeve: '#111111', pocket: '#ffffff' }, '#800000');
  t('a new base colour moves the zones that follow it, not a zone coloured on purpose', moved.collar === '#800000' && moved.sleeve === '#800000' && moved.pocket === '#ffffff');
  const PCo = await L('/src/pages/client/design-studio/photoColours.js');
  const fromPhoto = PCo.withPhotoColour(C.startColors('#1B2A4A'), 'polo-red-claremont'), trimmed = PCo.withPhotoColour(C.startColors('#1B2A4A', '#ffffff'), 'polo-red-claremont');
  t('"Use as template": the photo colour reaches the pocket and a following collar; a real trim stays', fromPhoto.pocket === '#AD0C2C' && fromPhoto.collar === '#AD0C2C' && fromPhoto.sleeve === '#AD0C2C' && trimmed.collar === '#ffffff' && trimmed.pocket === '#AD0C2C');
}
// Stage lanes, picker, phone first run, 3D honesty and 3D colour calibration.
{
  const src = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const cv = src('../src/pages/client/design-studio/CanvasViewport.jsx'), css = src('../src/pages/client/design-studio/DesignStudioStyles.jsx');
  // Lane contract: chip, set bar, guides and 3D notes are in the top lane; zoom, Front/Back and the stage light in the bottom lane; the panes sit in the fit area between.
  const at = k => cv.indexOf(k), top = at('className="ds-lane ds-lane-top"'), fit = at('className="ds-stage-fit"'), bot = at('className="ds-lane ds-lane-bottom"');
  const inTop = ['<GuidesMenu ', 'className="ds-stage-note"'].every(k => at(k) > top && at(k) < fit) && !/\{stageBtn\}|className="ds-ctx-chip"/.test(cv);
  const inFit = [...cv.matchAll(/className="ds-pane"/g)].every(m => m.index > fit && m.index < bot);
  const inBot = ['className="ds-ctrlbar"', 'className="ds-stage-hint"', "ctrl('Zoom out'"].every(k => at(k) > bot);
  const rule = sel => (css.match(new RegExp(sel.replace(/[.[\]()]/g, '\\$&') + '\\{([^}]*)\\}')) ?? [])[1] ?? '';
  const noOverlay = ['.ds-ctx-chip', '.ds-ctrlbar', '.ds-stage-note', '.ds-stage-hint', '.ds-guides'].every(sel => !/position:absolute/.test(rule(sel)));
  t('stage lane contract: top lane (chip, guides, stage light, 3D notes) and bottom lane (stage bar, zoom level and hints) are outside the fit area that holds the garment panes; none of them is absolutely positioned over it',
    top > 0 && top < fit && fit < bot && inTop && inFit && inBot && noOverlay && /\.ds-stage-fit\{position:relative;flex:1;min-height:0;\}/.test(css) && /\.ds-pane\{position:absolute;inset:0;\}/.test(css) && /\.ds-cv\{[^}]*flex-direction:column/.test(css));
  t('the garment is fitted to ~72% of the visible stage, never past the area between the lanes (fit is capped by the pane, and the pane fills only that area)', /STAGE_FILL = 0\.72/.test(cv) && /const byH = Math\.min\(stageH \* STAGE_FILL \/ share, pane\.clientHeight\)/.test(cv) && cv.indexOf('ref={paneRef}') > fit && cv.indexOf('ref={paneRef}') < bot);
  // Picker: sticky header (title + close) and sticky action footer; every card carries its badge and the key lists each badge shown.
  const gp = src('../src/pages/client/design-studio/GarmentPicker.jsx');
  t('picker header (title, close, tabs, badge key) and action footer stick to the scroll box; the close lives in the header, never over a card',
    /\.ds-pick-head\{position:sticky;top:0;/.test(css) && /\.ds-pick-foot\{position:sticky;bottom:0;/.test(css) && /function Head\([^)]*onClose/.test(gp) && (gp.match(/ds-pick-close/g) ?? []).length === 1 && !/float:right/.test(rule('.ds-pick-close')));
  t('every picker card shows its status badge (no hidden default) and the key lists the badges present; template cards and the carousel hero use the same four tiers as photos', !/!== def &&/.test(gp) && (gp.match(/<Badge icon=/g) ?? []).length === 4 && (gp.match(/<Legend labels=\{PHOTO_LABEL\}/g) ?? []).length === 2 && !/TEMPLATE_STATUS/.test(gp));
  // Top bar: no Inspo, no menu (a menu with one item is never rendered).
  const tb = src('../src/pages/client/design-studio/TopBar.jsx');
  t('top bar has no Inspo button and no overflow menu; Showcase is a direct button shown only with designs', !/<span>Inspo<|label: 'Inspo'|role="menu"|aria-haspopup/.test(tb) && /showcaseCount > 0 &&/.test(tb));
  // Phone first run: no sheet, no Save/Order, no stage light until a garment exists.
  const ds = src('../src/pages/client/DesignStudio.jsx');
  t('phone first run hides the tabs and panel (the picker gets the full height) and the stage lanes (stage light) until a garment exists',
    /data-first=\{!cfg\.garment \|\| undefined\}/.test(ds) && /\.ds\[data-first\] \.ds-panel\{display:none;\}/.test(css) && /\.ds\[data-first\] \.ds-cv\{flex:1;height:auto;\}/.test(css)
    && /\{cfg\.garment && \(\s*<div className="ds-lane ds-lane-bottom">/.test(cv) && !/inset:0 0 64px/.test(css));
  // Picker honesty: one sentence + chips; inspiration-only photos get a real path to existing editable garments, never an invented template.
  const P = await L('/src/pages/client/design-studio/GarmentPicker.jsx');
  const refs = D.ENTRIES.filter(d => !d.editable2D);
  const sim = refs.map(d => D.filterDesigns(P.similarFilters(d, D.ENTRIES, x => x.editable2D), D.ENTRIES).filter(x => x.editable2D));
  t('every inspiration-only photo offers "See editable garments like this": its category/piece filter (relaxed only when empty) lists existing editable photos only',
    refs.length === 6 && sim.every(list => list.length > 0 && list.every(x => D.ENTRIES.includes(x) && x.editable2D)) && /See editable garments like this/.test(gp));
  t('preview says one sentence and puts status in chips; a photo with a 3D reference shows it by default (photo + 3D on desktop, Photo | 3D switch on phones)',
    refs.concat(D.ENTRIES.filter(d => d.editable2D)).every(d => (P.previewSentence(d).match(/[.!?](\s|$)/g) ?? []).length === 1 && P.previewChips(d).length >= 3) && /className="ds-pick-media" data-view=\{view3D\}/.test(gp) && /useState\('3d'\)/.test(gp) && !/Show 3D reference/.test(gp));
  // The phone "Editable (4)": a uniform set with the bottom active limits the photos to bottoms; the limit is now a visible, removable chip.
  const bottoms = D.ENTRIES.filter(d => d.base && G.pieceOf(d.base[1]) === 'bottom');
  t('a uniform set limits the picker to its active piece (bottom = 4 editable photos of 40) and says so with a removable chip; templates default to All (or a landing tile\'s real category)',
    bottoms.length === 4 && bottoms.every(d => d.editable2D) && /<RoleChip /.test(gp) && /Remove filter:/.test(gp) && /useState\(startCat \?\? ALL\)/.test(gp));
  // 3D honesty: a generic stand-in model is never served.
  const Cp2 = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const standInFiles = Cp2.STAND_IN_3D_MODELS.flatMap(x => Object.values(x.models));
  t('generic stand-in 3D models are never served: the bucket cut of the peplum-dress figure stays withheld, no served entry uses a stand-in file, and the stand-in only blocks a garment no real model serves',
    JSON.stringify(Cp2.STAND_IN_3D_MODELS.map(x => x.id)) === '["skirt"]' && Cp2.SCANNED_GARMENTS.every(x => Object.values(x.models).every(m => !standInFiles.includes(m))) && Cp2.scannedEntryFor('Skirt', null, 'unisex')?.id === 'skirt-pencil-lofted'
    && !Cp2.standIn3D('Skirt') && /standIn3D\(cfg\.garment\)/.test(tb));
  // 3D colour: linear tone mapping and ~1x irradiance on a front-facing panel, sheen tinted by the zone colour (measured dE 18.3 -> 2.4 in the browser).
  const s3 = src('../src/pages/client/DesignStudio3D.jsx'), rs = src('../src/pages/client/design-studio/regionShader.js'), sg = src('../src/pages/client/design-studio/ScannedGarmentMesh.jsx');
  const Lt = Object.fromEntries([...(src('../src/pages/client/design-studio/lightRig.js').match(/export const LIGHT = \{([^}]*)\}/)?.[1] ?? '').matchAll(/(\w+): ([\d.]+)/g)].map(m => [m[1], +m[2]]));
  const key = [2.5, 3.5, 4], irr = Lt.fill + Lt.key * key[2] / Math.hypot(...key);
  t('3D lighting is calibrated: linear tone mapping, front panel irradiance within 5% of 1x, cloth sheen follows the zone colour and specular stays low',
    /toneMapping:THREE\.LinearToneMapping/.test(s3) && !/ACESFilmic/.test(s3) && Math.abs(irr - 1) < 0.05 && /material\.sheenColor \*= diffuseColor\.rgb/.test(rs) && /specularIntensity: 0\.2/.test(sg));
  // Exploded view, part picking and lighting presets: authored scrub tops (named parts) only; both presets keep ~1x front irradiance.
  const LP = (await L('/src/pages/client/design-studio/lightRig.js')).LIGHT_PRESETS, cv3 = src('../src/pages/client/design-studio/CanvasViewport.jsx');
  const ex = (garment, sleeve, fit) => Cp2.explodableFor({ garment, sleeve, fit });
  t('exploded view: only the authored scrub tops (separate collar, sleeve and pocket parts) explode; fused scans do not; both lighting presets stay within 5% of 1x; reduced motion stops auto-rotate',
    ex('Scrub Top', 'Short', 'unisex') && ex('Scrub Top', '3/4', 'unisex') && !ex('Scrub Top', 'Short', 'female') && !ex('Polo Shirt', 'Short', 'female') && !ex('Pants', null, 'unisex')
    && Object.values(LP).every(p => Math.abs(p.fill + p.key * p.keyPos[2] / Math.hypot(...p.keyPos) - 1) < 0.05) && LP.studio.fill === Lt.fill
    && /autoRotate=\{spin && !exploded\}/.test(s3) && /useState\(!CALM\)/.test(s3) && /CALM \? 1 :/.test(sg) && /e\.delta > 6/.test(sg)
    && /const canExplode = explodableFor\(cfg\);/.test(cv3) && /onPickZone=\{canExplode \? pickZone : null\}/.test(cv3));
  // The saved-design edit gate lets view-only stage controls (zoom, Fit, Front/Back, Explode, Lighting, Full screen, stage light) through.
  t('WebGL lost mid-session: the stage returns to 2D with a timed notice (the 3D lane keeps its own "not available" note)',
    /const on3DLost = \(\) => \{ setWebglOk\(false\); setViewMode\?\.\('2d'\); setLostNote\(true\); \};/.test(cv3) && /setTimeout\(\(\) => setLostNote\(false\), 8000\)/.test(cv3)
    && /: lostNote \? \[\{ id: 'gllost', text: '3D stopped working on this device\. Showing the 2D design\.', warn: true \}\] : \[\];/.test(cv3));
  t('saved-design edit gate: the stage controls bar is view-only and the gate skips [data-view-only] targets',
    /className="ds-ctrlbar" role="toolbar" aria-label="Stage controls" data-view-only>/.test(cv3) && /gateEdit = lock\?\.warn \? \(e\) => \{ if \(e\.target\.closest\?\.\('\[data-view-only\]'\)\) return;/.test(src('../src/pages/client/DesignStudio.jsx')));
}
// Canvas, grid, guides, alignment, navigation and eraser.
{
  const src = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const CG = await L('/src/pages/client/design-studio/canvasGuides.js');
  const SN2 = await L('/src/pages/client/design-studio/snapGuides.js');
  const cv = src('../src/pages/client/design-studio/CanvasViewport.jsx'), css = src('../src/pages/client/design-studio/DesignStudioStyles.jsx');
  const layers = src('../src/pages/client/design-studio/canvasLayers.js'), hook = src('../src/pages/client/design-studio/useGarmentCanvas.js'), gm = src('../src/pages/client/design-studio/GuidesMenu.jsx');
  // 1. One Guides button and popover; defaults off on phones; the old prefs shape carries over.
  const ph = CG.guideDefaults(true), dk = CG.guideDefaults(false), old = CG.readGuidePrefs({ grid: true, snap: false, size: 40 }, false);
  t('guides: one popover with Grid, grid size, Snap, Rulers, Centre line, Smart guides; grid, rulers and centre line off by default (smart guides on desktop only); old prefs carried over',
    ['Grid', 'Snap', 'Rulers', 'Centre line', 'Smart guides'].every(l => gm.includes(`'${l}'`)) && /aria-label="Grid size"/.test(gm) && /<GuidesMenu /.test(cv) && !/aria-label="Grid and rulers"/.test(cv)
    && !ph.grid && !ph.rulers && !ph.centre && !ph.smart && !dk.centre && dk.smart && !dk.grid && old.grid && old.rulers && !old.snap && old.size === 20 && CG.readGuidePrefs({ size: 33 }).size === 10 && CG.readGuidePrefs({ v: 2, size: 10 }).size === 10);
  // 2. Grid: neutral ink, minor ~10% / every 5th ~18%, fades at low zoom, over the garment only between base and design, never in exports.
  t('grid: neutral ink (no teal), minor 10% and every 5th line 18%, fades from 12 to 6 screen px, stage grid follows the artboard',
    CG.GRID_ALPHA.minor === 0.1 && CG.GRID_ALPHA.major === 0.18 && CG.GRID_MAJOR_PCT === 50 && CG.gridFade(12) === 1 && CG.gridFade(6) === 0 && CG.gridFade(9) === 0.5
    && /\.ds-sgrid line\{stroke:rgb\(var\(--ds-grid-ink\)/.test(css) && /--ds-grid-ink:var\(--cx-shade\)/.test(css) && !/ds-grid line\{stroke:rgba\(2,128,144/.test(css)
    && /<StageGrid view=\{view\} g=\{garmentRect\}/.test(cv) && !/<Grid /.test(cv));
  t('the grid is never painted over the garment: the live canvas paints only the design and (when on) the centre line; exports render elsewhere',
    /render\(ctx, objects\);\s*if \(ctx === c\.contextContainer && opts\.current\.centre\) drawCentre/.test(layers) && !/drawGrid|source-atop/.test(layers)
    && /installStageLayers\(fc\.current, snapOpts\)/.test(hook));
  // 3-4. Centre line and smart guides: centre always a snap line; edges and other elements only with smart guides.
  const box = { left: 60, top: 40, width: 200, height: 300 }, oth = [{ left: 100, top: 100, width: 40, height: 20 }];
  const centreOnly = SN2.snapTargets({ width: 320, height: 400, garment: box, garmentEdges: false }), full = SN2.snapTargets({ width: 320, height: 400, garment: box, others: oth });
  t('centre line: dashed garment-centre line drawn on the live canvas, and the garment centre is a snap line even without smart guides; smart guides add edges and other elements',
    centreOnly.v.some(l => l.at === 160 && l.kind === 'garment') && !centreOnly.v.some(l => l.at === 60) && full.v.some(l => l.at === 60) && full.v.some(l => l.kind === 'object' && l.at === 120)
    && /setLineDash\(\[6 \* px, 4 \* px\]\)/.test(layers) && /garmentEdges: smart/.test(hook) && /const others = smart \?/.test(hook));
  // 5. Placement targets: only the garment's existing presets, per face.
  const front = CG.placementTargets('Polo Shirt', 'Short', 'unisex', 'front', 320, 380).map(x => x.id), back = CG.placementTargets('Polo Shirt', 'Short', 'unisex', 'back', 320, 380).map(x => x.id);
  const scrub = CG.placementTargets('Scrub Top', 'Short', 'female', 'front', 320, 380).map(x => x.id);
  t('placement ghosts show only the existing logo presets for the garment and face (no back centre on the front, no arm targets without sleeves)',
    front.join() === 'left_chest,center_chest,left_arm,right_arm' && back.join() === 'back_center,left_arm,right_arm' && !scrub.some(id => id.endsWith('_arm')) && CG.placementTargets(null, null, null, 'front', 1, 1).length === 0
    && /dragGuides\.current\.ghosts \?\?= placementTargets\(/.test(hook) && /\(obj\.__logo && !obj\.__artwork\) \|\| obj\.__text/.test(hook));
  // 6. Rulers: relative units only.
  const rul = src('../src/pages/client/design-studio/StageRulers.jsx');
  const ticks = CG.relativeTicks(10, 1.5, 600, 40, 200), t0 = ticks.find(x => x.v === 0), t100 = ticks.find(x => x.v === 100);
  t('rulers: % of the garment only (whole-number labels, never units or sizes), horizontal 11 px labels, ink-2 on paper; 0 and 100 sit on the garment edges',
    ticks.every(x => Number.isInteger(x.v)) && !!t0 && !!t100 && Math.abs(t0.at - (10 + 40 * 1.5)) < 1e-9 && Math.abs(t100.at - (10 + 240 * 1.5)) < 1e-9
    && /fontSize=\{11\}/.test(rul) && !/rotate\(-90/.test(cv + rul) && !/\b(cm|mm|inch|inches)\b/i.test(cv + layers + rul) && /\.ds-ruler text\{fill:var\(--cx-ink-2\)/.test(css) && /relativeTicks\(/.test(rul) && !/pinnedTicks|rulerSteps/.test(cv + rul));
  // 7. Alignment and distribution.
  const bs = [{ left: 10, top: 10, width: 20, height: 10 }, { left: 50, top: 40, width: 40, height: 20 }, { left: 30, top: 100, width: 10, height: 10 }];
  const L0 = CG.alignDeltas(bs, 'left'), C0 = CG.alignDeltas(bs, 'hcenter'), D0 = CG.distributeDeltas(bs, 'v');
  const tops = bs.map((b, i) => ({ t: b.top + D0[i].dy, h: b.height })).sort((a, b) => a.t - b.t);
  t('align left/centre/right/top/middle/bottom to the selection bounds; distribute 3+ with equal gaps (ends fixed); fewer elements do nothing',
    bs.every((b, i) => b.left + L0[i].dx === 10) && bs.every((b, i) => b.left + b.width / 2 + C0[i].dx === 50) && Math.abs((tops[1].t - tops[0].t - tops[0].h) - (tops[2].t - tops[1].t - tops[1].h)) < 1e-9
    && tops[0].t === 10 && tops[2].t === 100 && CG.distributeDeltas(bs.slice(0, 2), 'h').every(d => !d.dx && !d.dy) && CG.alignDeltas(bs.slice(0, 1), 'left').every(d => !d.dx));
  const ftb = src('../src/pages/client/design-studio/FloatingToolbar.jsx');
  t('alignment lives in the toolbar slot: align for 2+, distribute for 3+, centre-on-garment for one; one undo step each; arrow keys move between buttons; 44 px on touch',
    /data-slot="align"/.test(ftb) && /n >= 3 && DISTRIBUTE/.test(ftb) && /alignSelected\('hcenter'\)/.test(ftb) && /function roving/.test(ftb)
    && (hook.match(/const arrangeSelected[\s\S]*?\}, \[pushHistory, bumpLayers\]\);/)?.[0].match(/pushHistory\(\)/g) ?? []).length === 1 && /\.ds-ftb button,[^{]*\{min-width:44px;min-height:44px;\}/.test(css));
  t('a multi-selection is saved, autosaved and put in history in canvas coordinates (members of an active selection are decomposed), never relative to the selection',
    (hook.match(/plainObject\(o, OVERLAY_PROPS\)/g) ?? []).length === 1 && /const overlayJSON = canvas =>/.test(hook) && (hook.match(/overlayJSON\(/g) ?? []).length === 4 && !/o\.toObject\(OVERLAY_PROPS\)/.test(hook) && /export function plainObject/.test(layers) && /translateToGivenOrigin/.test(layers));
  // 8. Navigation: Fit (Ctrl+0), Space-drag pan, pinch zoom on touch, existing pan limits kept.
  t('navigation: Fit button and Ctrl+0, Space-drag pan kept, two-finger pinch zoom clamped to the zoom range, pan limits re-applied; a zone opens its colours on a tap, not on the first finger of a pinch',
    /ctrl\('Fit', <Scan/.test(cv) && /e\.key === '0'/.test(cv) && /e\.code === 'Space'/.test(cv) && /setZoom\(clampZoom\(pinch\.current\.z \* dist\(\)/.test(cv) && /limits\.current = panLimits\(/.test(cv) && /clampPan\(/.test(cv)
    && /\.ds-pane\[data-garment\]\{touch-action:none;\}/.test(css) && /fc\.current\.on\('mouse:up', \(opt\) => \{\s*const t = tap; tap = null;/.test(hook));
  // 9. Eraser: customer strokes and uploaded art only, one undo step, holes move with the layer.
  const pts = CG.samplePath([['M', 0, 0], ['L', 10, 0], ['Q', 15, 0, 20, 0]], 2);
  t('eraser cuts only free drawings and uploaded art (never the garment, text, shapes, locked or hidden layers), samples the stroke without gaps, one undo step',
    CG.erasable({ __draw: true }) && CG.erasable({ __logo: true }) && CG.erasable({ __artwork: true, __logo: true }) && !CG.erasable({ __text: true }) && !CG.erasable({ __shape: true }) && !CG.erasable({ __garmentBase: true, __draw: true })
    && !CG.erasable({ __draw: true, __locked: true }) && !CG.erasable({ __draw: true, visible: false }) && pts.length === 11 && pts.every((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) <= 2 + 1e-9)
    && /inverted: true/.test(layers) && /invertTransform\(o\.calcTransformMatrix\(\)\)/.test(layers) && /'__erase'/.test(hook) && /if \(n\) \{ pushHistory\(\); bumpLayers\(\); \}/.test(hook) && /c\.remove\(path\);/.test(hook));
}
// One garment-relative coordinate system: grid, rulers, ruler guides, metrics; phone stage space; Guides panel layering.
{
  const src = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const CG = await L('/src/pages/client/design-studio/canvasGuides.js');
  const SN3 = await L('/src/pages/client/design-studio/snapGuides.js');
  const rul = src('../src/pages/client/design-studio/StageRulers.jsx'), cv = src('../src/pages/client/design-studio/CanvasViewport.jsx'), css = src('../src/pages/client/design-studio/DesignStudioStyles.jsx');
  const gm = src('../src/pages/client/design-studio/GuidesMenu.jsx'), layers = src('../src/pages/client/design-studio/canvasLayers.js'), ins = src('../src/pages/client/design-studio/RightInfoPanel.jsx');
  // Grid lines coincide with ruler ticks: same origin (garment top-left) and the same % per px, for every size, zoom and offset tried.
  const g = { left: 37, top: 21, width: 246, height: 301 };
  let worst = 0, missing = 0, cases = 0, has50 = true;
  for (const pct of CG.GRID_PCTS) for (const s of [0.5, 0.9, 1.3, 2.4]) for (const o of [-60, 0, 85]) {
    const cell = (g.width * pct / 100) * s, fade = CG.gridFade(Math.min(cell, (g.height * pct / 100) * s));
    const lines = CG.gridLines(o + g.left * s, cell, pct, 0, 900).filter(l => fade > 0 || l.v % 50 === 0);
    const ticks = new Map(CG.relativeTicks(o, s, 900, g.left, g.width, 30).map(t => [t.v, t.at]));
    has50 = has50 && CG.gridLines(o + g.left * s, cell, pct, 0, 900).some(l => l.v === 50);
    for (const l of lines) { cases++; if (!ticks.has(l.v)) missing++; else worst = Math.max(worst, Math.abs(ticks.get(l.v) - l.at)); }
  }
  t('grid lines coincide with ruler ticks (garment top-left origin; Fine 5% / Medium 10% / Coarse 20%; every zoom and pan tried) and the 50% centre is a grid line at every size',
    cases > 300 && missing === 0 && worst < 1e-6 && has50 && JSON.stringify(CG.GRID_PCTS) === '[5,10,20]' && JSON.stringify(CG.gridSpec(g, 10)) === JSON.stringify({ x0: 37, y0: 21, sx: 24.6, sy: 30.1, pct: 10 }));
  t('the stage grid is an SVG over the whole stage under the artboard, drawn from the same gridLines() as the garment grid and the snapping grid',
    /<StageGrid view=\{view\} g=\{garmentRect\} pct=\{guides\.size\}/.test(cv) && /w=\{view\.pw \+ stageOff\.dx\} h=\{view\.ph \+ stageOff\.dy\}/.test(cv) && /gridLines\(/.test(rul)
    && /\.ds-sgrid\{position:absolute;left:0;top:0;z-index:0;pointer-events:none;\}/.test(css) && SN3.snapTargets({ width: 320, height: 400, grid: CG.gridSpec(g, 10) }).v.some(l => l.kind === 'grid' && Math.abs(l.at - (37 + 24.6 * 3)) < 1e-9));
  // Rulers: full stage length, beyond 0 and 100, labels every 10% when they fit, 0/50/100 emphasised, live pointer marker, '%' corner.
  const tk = CG.relativeTicks(200, 1.4, 900, 37, 246, 30), lab = tk.filter(x => x.major).map(x => x.v);
  t('rulers run the full stage edge in garment % (negative before it, over 100 after it), label every 10% when it fits (else 25/50/100), emphasise 0, 50 and 100, show a live pointer marker',
    tk.some(x => x.v < 0) && tk.some(x => x.v > 100) && lab.includes(-10) && lab.includes(110) && lab.every(v => v % 10 === 0) && ['0', '50', '100'].every(v => tk.find(x => String(x.v) === v)?.key)
    && CG.relSteps(150, 30).major === 25 && CG.relSteps(400, 30).major === 10 && CG.relSteps(60, 30).major === 50 && /className="ds-ruler-mark"/.test(rul) && /fit\.addEventListener\('pointermove', move\)/.test(rul) && />%<\/div>/.test(rul));
  // Ruler guides: pulled from a ruler, snap to whole % (50 within 1.5), objects snap to them, session only (never saved), double-click removes.
  const gl = CG.guideLines(g, [{ axis: 'v', pct: 50 }, { axis: 'h', pct: 10 }]);
  t('ruler guides: drag from a ruler creates one, it snaps to whole % (and 50%), elements snap to it, double-click or Delete removes it, kept for the session only',
    CG.snapGuidePct(48.7) === 50 && CG.snapGuidePct(37.4) === 37 && gl[0].at === 37 + 123 && Math.abs(gl[1].at - (21 + 30.1)) < 1e-9 && SN3.snapTargets({ width: 320, height: 400, guides: gl }).v.some(l => l.kind === 'guide')
    && /onPointerDown=\{start\('h'\)\}/.test(rul) && /onDoubleClick=\{onRemove/.test(rul) && /const \[rulerGuides, setRulerGuides\] = useState\(\[\]\)/.test(cv) && !/rulerGuides/.test(src('../src/pages/client/design-studio/designSerialization.js')) && !/localStorage[^;]*rulerGuides/.test(cv));
  // Metrics: X, Y, W, H in % of the garment and rotation; multi-selection = group bounds + "N elements".
  const one = { type: 'i-text', width: 100, height: 20, scaleX: 1.5, scaleY: 1, angle: 30, getBoundingRect: () => ({ left: 37 + 24.6, top: 21 + 60.2, width: 150, height: 20 }) };
  const many = { type: 'activeselection', getObjects: () => [1, 2, 3], getBoundingRect: () => ({ left: 37, top: 21, width: 123, height: 150.5 }) };
  const m1 = CG.metricsPct(one, g), m3 = CG.metricsPct(many, g);
  t('metrics are % of the garment from its top-left (X, Y, W, H) plus rotation, while moving/resizing and in the inspector; a multi-selection shows its bounds and "N elements"; never units',
    m1.x === 10 && m1.y === 20 && m1.w === 61 && m1.h === 6.6 && m1.r === 30 && m3.n === 3 && m3.w === 50 && m3.h === 50 && CG.readoutPct(one, g) === 'X 10%  Y 20%  W 61%  H 7%  30°' && CG.readoutPct(many, g).startsWith('3 elements · X 0%')
    && /metricsPct\(active, garmentRect\)/.test(ins) && /`\$\{m\?\.n \?\? 2\} elements`/.test(ins) && /'X %'/.test(ins) && !/\b(cm|mm|inch|px)\b/.test(ins.match(/Position &amp; size[^<]*/)?.[0] ?? '') && /readoutPct\(ro\.obj, garmentBox\(c\)\)/.test(src('../src/pages/client/design-studio/useGarmentCanvas.js')));
  t('old guide prefs migrate: px sizes 10/20/40 become 5/10/20 % once (v2), and stay put after',
    CG.readGuidePrefs({ grid: true, size: 40 }).size === 20 && CG.readGuidePrefs({ size: 10 }).size === 5 && CG.readGuidePrefs({ v: 2, size: 5 }).size === 5 && CG.guideDefaults().v === 2);
  // Phone/tablet layout: one fixed column (piece tabs for a set, stage, a sheet of <= 40% that folds to a handle, bottom nav); a stage bar of <= 5 labelled controls.
  const cvx = src('../src/pages/client/design-studio/CanvasViewport.jsx'), tdx = src('../src/pages/client/design-studio/ToolDrawer.jsx');
  const bar2D = cvx.slice(cvx.indexOf('{show2D ? (<>'), cvx.indexOf('</>) : (<>')), bar3D = cvx.slice(cvx.indexOf('</>) : (<>'), cvx.indexOf("ctrl(full ? 'Exit full screen'"));
  t('phone/tablet layout: the stage fills the column, a sheet of at most 40% of the screen folds to a handle, five-item bottom nav; no snap states; stage bar of at most five labelled controls with hints outside it',
    /\.ds-lane-top:not\(\[data-notes\]\)\{flex-wrap:nowrap;/.test(css) && !/text-overflow:ellipsis/.test(css.match(/\.ds-ctx-chip\{[^}]*\}/)?.[0] ?? 'text-overflow:ellipsis')
    && /\.ds-cv\{flex:1 1 auto;min-height:0;\}/.test(css) && /\.ds-sheet\{display:flex;flex-direction:column;min-height:0;max-height:40dvh;/.test(css)
    && /\.ds-sheet\[data-folded\]>:not\(\.ds-sheet-handle\)\{display:none;\}/.test(css) && /\.ds-bnav\{display:grid;flex:none;grid-template-columns:repeat\(5,/.test(css)
    && !/data-snap|ds-grab|sheetOpen/.test(css + tdx)
    && (bar2D.match(/ctrl\('/g) ?? []).length + 1 <= 5 && (bar3D.match(/ctrl\(/g) ?? []).length + 1 <= 5 && /className="ds-stage-hint"/.test(cvx) && !/ds-stage-hint[^]*?<\/div>\s*<\/div>\s*\)\}\s*$/.test('')
    && !/<span className="sr-only">/.test(cvx));
  t('phone top lane wider than the screen (Guides + uniform set switch) scrolls from its start instead of centring past both edges: no Guides button off-screen',
    /\.ds-lane-top:not\(\[data-notes\]\)\{[^}]*justify-content:flex-start;overflow-x:auto;/.test(css) && /\.ds-lane-top:not\(\[data-notes\]\)>:first-child\{margin-left:auto;\}/.test(css) && /\.ds-lane-top:not\(\[data-notes\]\)>:last-child\{margin-right:auto;\}/.test(css));
  // Guides panel: rendered at the Studio root; a modal dialog up to 1023px; on desktop capped to the stage and scrolling inside.
  t('Guides panel is rendered at the Studio root (above rulers and sheet): modal dialog with backdrop, close button and Escape up to 1023px; desktop popover capped to the stage height with internal scroll',
    /createPortal\(/.test(gm) && /aria-modal="true"/.test(gm) && /className="ds-guides-scrim"/.test(gm) && /className="ds-guides-close"/.test(gm) && /e\.key === 'Escape'/.test(gm) && /max-width: 1023px/.test(gm)
    && /maxHeight: Math\.max\(160, \(stage \? stage\.bottom : innerHeight\) - top - 8\)/.test(gm) && /\.ds-guides-modal\{position:fixed;inset:0;z-index:var\(--cx-z-modal\)/.test(css) && /\.ds-guides-pop\{z-index:var\(--cx-z-popover\);[^}]*overflow-y:auto/.test(css));
}
// Upload my design: content-checked types, SVG rasterised, min size, original kept, background removal review, Use as artwork or
// reference (existing reference-file field); reference/set 3D in the picker preview; GLB inventory honesty.
{
  const src = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const UG = await L('/src/pages/client/design-studio/uploadGuard.js');
  const ug = src('../src/pages/client/design-studio/uploadGuard.js'), up = src('../src/pages/client/design-studio/useLogoUpload.js'), wiz = ['OrderWizard.jsx', 'order-wizard/WizardSteps.jsx', 'order-wizard/OrderSummary.jsx'].map(f => src(`../src/pages/client/${f}`)).join(' ');
  const B = a => Uint8Array.from(a);
  t('uploads are typed by their bytes (PNG, JPG, WEBP, SVG with prolog/comments/doctype); text, PDF or HTML named .png is rejected',
    UG.sniffBytes(B([0x89, 0x50, 0x4e, 0x47])) === 'png' && UG.sniffBytes(B([0xff, 0xd8, 0xff, 0xe0])) === 'jpg' && UG.sniffBytes(B([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])) === 'webp'
    && UG.sniffBytes(B([0x3c]), '<?xml version="1.0"?>\n<!-- logo -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x">\n<svg xmlns="http://www.w3.org/2000/svg">') === 'svg'
    && UG.sniffBytes(B([0x68, 0x65]), 'hello') === null && UG.sniffBytes(B([0x25, 0x50, 0x44, 0x46]), '%PDF-1.7') === null && UG.sniffBytes(B([0x3c]), '<html><body><svg></svg>') === null
    && /if \(!kind\) return \{ ok: false, code: 'TYPE'/.test(ug));
  t('SVG is only ever decoded as an image and rasterised to PNG (no scripts or links survive; never put in the DOM as markup); 5 MB cap; minimum size message; original kept',
    UG.svgDrawSize('<svg viewBox="0 0 300 150">').w === 1600 && UG.svgDrawSize('<svg viewBox="0 0 300 150">').h === 800 && UG.svgDrawSize('<svg width="40" height="80">').h === 1600
    && UG.MAX_BYTES === 5 * 1024 * 1024 && UG.MIN_SIDE.artwork === 200 && /c\.getContext\('2d'\)\.drawImage\(img, 0, 0, w, h\)/.test(ug) && !/innerHTML|dangerouslySetInnerHTML|DOMParser/.test(ug + up)
    && /Use one at least \$\{min\} px on its shortest side/.test(ug) && /original: file/.test(ug) && /prepareUpload\(file, kind === 'artwork' \? 'artwork' : 'logo'\)/.test(up));
  t('artwork goes through the existing lazy background removal with a review: before/after, "Remove background" on by default (a toggle back to the original), AI on request',
    /processLogo\(prep\.file, \{ mode: method/.test(up) && /removeBg: removed/.test(up) && /phase: 'review'/.test(up) && /const tryAi = /.test(up) && /s\.removeBg && s\.cut/.test(up)
    && /import\('\.\/bgRemove'\)/.test(src('../src/lib/logoBackground.js')) && /Remove background/.test(src('../src/pages/client/design-studio/LogoAssets.jsx')));
  t('"Use as: artwork | reference photo": both accepted; a reference rides the order\'s existing design_ref_file field (no new field), within the server\'s JPG/PNG 5 MB rule',
    /useAs === 'reference'/.test(up) && /attachReference\(ref\)/.test(up) && /setDesignRef\(file\)/.test(up) && /const ref = peekDesignRef\(\)[\s\S]*design_ref_file: ref/.test(wiz) && /fd\.append\('design_ref_file', f\.design_ref_file\)/.test(wiz)
    && /checkUpload\(f, rules\)/.test(wiz) && /prep\.kind === 'jpg' \|\| prep\.kind === 'png'\) return prep\.original/.test(ug) && /\['Reference', form\.design_ref_file\?\.name\]/.test(wiz)
    && /'studio_design_ref'/.test(src('../src/utils/studioHandoff.js')));
  t('first-run "Upload my design" is no longer cancelled by its own effect (the file is cleared only when its timer fires)',
    /setTimeout\(\(\) => \{ (artSetRef\.current\(\); )?setPendingArt\(null\); onLogoFileRef\.current\(pendingArt\); \}, 450\)/.test(src('../src/pages/client/DesignStudio.jsx')));
  // Reference upload (server rule) and logo upload (zone, size cap, lazy background removal).
  const FC = await L('/src/utils/fileCheck.js'), UR = await L('/src/utils/uploadRules.js');
  const la = src('../src/pages/client/design-studio/LogoAssets.jsx'), rip = src('../src/pages/client/design-studio/RightInfoPanel.jsx');
  const fakeFile = (bytes, name) => ({ name, size: bytes.length, slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer }) });
  const refR = UR.toPickerRules(UR.REFERENCE_FALLBACK);
  const exe = await FC.checkUpload(fakeFile([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0], 'logo.png'), refR);
  const exeAsLogo = UG.sniffBytes(B([0x4d, 0x5a, 0x90, 0]), 'MZ');
  t('executables are rejected by content whatever their name: a Windows .exe renamed logo.png fails the reference check and the logo/artwork sniff; a real PDF passes as a reference',
    /whatever its name says/.test(exe) && exeAsLogo === null && await FC.checkUpload(fakeFile([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0, 0, 0, 0, 0, 0], 'brief.pdf'), refR) === '');
  const php = fsx.readFileSync('C:/laragon/www/vfrb-capstone/app/Support/UploadRules.php', 'utf8');
  t('reference types come from the server rule (App\\Support\\UploadRules, served at /api/customer/upload-rules); the fallback mirrors it; jpeg folds into jpg',
    JSON.stringify(refR.kinds) === '["jpg","png","pdf"]' && refR.maxBytes === 5120 * 1024 && refR.label === 'JPG, PNG or PDF, up to 5 MB'
    && /REFERENCE_MIMES = \['jpg', 'jpeg', 'png', 'pdf'\]/.test(php) && /REFERENCE_MAX_KB = 5120/.test(php)
    && /\/api\/customer\/upload-rules/.test(src('../src/utils/uploadRules.js')) && /accept=\{rules\.accept\}/.test(wiz) && /refRules\.accept/.test(la));
  t('Studio reference: its own kind, preview (image) or file tile (PDF), Remove and Replace; never placed on the garment',
    /id: 'reference'/.test(la) && /function ReferenceCard/.test(la) && /onRemove=\{logo\.removeReference\}/.test(la) && /if \(kind === 'reference'\)[\s\S]*?attachReference\(file\);[\s\S]*?return;/.test(up));
  t('logo upload: background removal fetched only when used; placed images capped in size so a save fits; a placed logo can be moved to a zone',
    !/^import .*logoBackground/m.test(up) && /import\('\.\.\/\.\.\/\.\.\/lib\/logoBackground'\)/.test(up) && /fitForCanvas\(file, art \? 'artwork' : 'logo'\)/.test(up)
    && UG.fitScale(4000, 2000, 1024) === 0.256 && UG.fitScale(500, 300, 1024) === 1 && /Move to zone/.test(rip) && /presetPos\(z\.id\)/.test(rip));
  // Reference and full-set 3D in the picker preview.
  const r3 = src('../src/pages/client/design-studio/ReferenceModel3D.jsx'), gp2 = src('../src/pages/client/design-studio/GarmentPicker.jsx');
  t('every gallery photo with a 3D reference (9, 2 of them full sets) shows it by default: one lazy Canvas, DPR capped, skeleton while loading, photo fallback, context released on close; label kept',
    D.ENTRIES.filter(d => d.ref3D).length === 9 && D.ENTRIES.filter(d => d.ref3D?.set).length === 2 && /const ReferenceModel3D = lazy\(/.test(gp2) && /useState\('3d'\)/.test(gp2)
    && /DPR = [^;]*\[1, 1\.5\] : \[1, 2\]/.test(r3) && /forceContextLoss\(\)/.test(r3) && /useGLTF\.clear\(modelUrl\(url\)\)/.test(r3) && /ds-ref3d-skel/.test(r3) && /onError=\{\(\) => \{ setRef3DFailed\(true\); setView3D\('photo'\); \}\}/.test(gp2)
    && /neutral colour, not editable/.test(gp2) && D.ENTRIES.filter(d => d.ref3D).every(d => fsx.existsSync(MF.modelFile(urlx.fileURLToPath(new URL('../public' + d.ref3D.file, import.meta.url))))));
  // GLB inventory: nothing non-garment-only or stand-in is wired; the five unwired files stay unwired with a recorded reason.
  const Cp4 = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const served = new Set([...Cp4.SCANNED_GARMENTS.flatMap(x => Object.values(x.models).map(decodeURI)), ...D.ENTRIES.filter(d => d.ref3D).map(d => d.ref3D.file)]);
  const unwired = ['/models/lab-coverall.glb', '/models/processed/pants-trousers.glb', '/models/processed/shorts-textured.glb', '/models/processed/skirt-pencil.glb', '/models/processed/work-shirt-short-sleeve.glb'];
  const audit = src('./asset-audit.mjs');
  t('GLB inventory: the five unwired files (fused figure, superseded cuts with hand stubs/notches, stand-in, uncapped build input) are not served and each has a recorded reason',
    unwired.every(f => !served.has(f) && audit.includes(`'${f}'`)));
}
// Skirt: redrawn 2D pencil template; authored garment-only GLB registered as a pending "3D (approx.)" candidate (not served).
{
  const src = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const GP2 = await L('/src/pages/client/design-studio/garmentPaths.js');
  const front = GP2.getGarmentPaths('Skirt', null, 'front'), back = GP2.getGarmentPaths('Skirt', null, 'back');
  const kinds = d => d.details.map(x => x.kind).join();
  t('Skirt 2D: one body zone; pencil silhouette with curved waistband, side darts (front and back), centre-back zip and a lapped back vent on the back only',
    !!front.body && !front.collar && !front.sleeveL && !front.pocket && JSON.stringify(Sh.zonesFor('Skirt', null, null)) === '["body"]' && /C /.test(front.body)
    && back.details.length > front.details.length && back.details.some(x => x.kind === 'button') && !front.details.some(x => x.kind === 'button') && /seam/.test(kinds(front)));
  // The GLB itself: a new file, garment-only authored geometry, two UV-mapped parts, y up, about 1.9 units tall, <= 20k triangles.
  const glbPath = MF.modelFile(urlx.fileURLToPath(new URL('../public/models/authored/skirt-pencil-lofted.glb', import.meta.url)));
  const buf = fsx.readFileSync(glbPath), jl = buf.readUInt32LE(12), gj = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  const tris = gj.meshes.reduce((n, m) => n + m.primitives.reduce((k, pr) => k + gj.accessors[pr.indices].count / 3, 0), 0);
  const pos = gj.meshes.map(m => gj.accessors[m.primitives[0].attributes.POSITION]);
  const ymin = Math.min(...pos.map(a => a.min[1])), ymax = Math.max(...pos.map(a => a.max[1])), zmax = Math.max(...pos.map(a => a.max[2])), zmin = Math.min(...pos.map(a => a.min[2]));
  t('authored pencil-skirt GLB: two named parts (skirt_body, waistband), both with UVs and normals, <= 20k triangles, y up and 1.9 units tall, built by tools/glb-extract/build_pencil_skirt.py',
    JSON.stringify(gj.nodes.map(n => n.name).sort()) === '["skirt_body","waistband"]' && gj.meshes.every(m => ['POSITION', 'NORMAL', 'TEXCOORD_0'].every(a => a in m.primitives[0].attributes))
    && tris <= 20000 && tris > 10000 && Math.abs(ymax - ymin - 1.9) < 0.01 && zmax - zmin < 0.9 && fsx.existsSync(urlx.fileURLToPath(new URL('./glb-extract/build_pencil_skirt.py', import.meta.url))));
  // Registered as pending: never served, so Skirt still offers no 3D until the client approves; the stand-in stays withheld.
  const Cp5 = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const cand = Cp5.SCANNED_GARMENTS.find(x => x.id === 'skirt-pencil-lofted');
  t('the authored skirt is Skirt\'s editable "3D (approx.)" (the Downloads corporate skirt is the rejected file): licence recorded, calibrated zone-mask path, nothing left pending',
    !!cand && cand.label === '3D (approx.)' && /^enabled/.test(cand.approval) && /VFRB-authored/.test(cand.license) && cand.parts.every(pt => pt.zoneOf && !pt.regionOf)
    && Cp5.PENDING_3D_MODELS.length === 0 && Cp5.has3DModel('Skirt', null, null) && G.FAMILY_BY_NAME.Skirt.status3D === 'partial' && !Cp5.standIn3D('Skirt')
    && /skirt-pencil-lofted/.test(src('../docs/engineering/GLB-STAGING-AUDIT.md')));
}
// Colourable 3D references (preview only), T-shirt UV sheen fix, nothing promoted without UVs and a 2D template.
{
  const src = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const RC = await L('/src/pages/client/design-studio/referenceColour.js');
  const refs = D.ENTRIES.filter(d => d.ref3D), sets = refs.filter(d => d.ref3D.set), singles = refs.filter(d => !d.ref3D.set);
  const gp = src('../src/pages/client/design-studio/GarmentPicker.jsx'), rm = src('../src/pages/client/design-studio/ReferenceModel3D.jsx');
  // Every reference: Try colours. Sets: a measured Top/Bottom split per model; singles: one body colour.
  const box = { min: { x: -1, y: -1 }, max: { x: 1, y: 1 } };
  t('every 3D reference offers "Try colours": 7 single garments take one body colour, 2 full sets a Top/Bottom colour split per model (waist height, or the gap between flat-lay pieces), labelled "approximate split"',
    refs.length === 9 && singles.length === 7 && sets.length === 2 && sets.every(d => RC.REF_SPLIT[d.id])
    && Object.values(RC.REF_SPLIT).every(sp => ['x', 'y'].includes(sp.axis) && sp.at > 0.3 && sp.at < 0.8) && RC.REF_SPLIT['scrub-set-women-vneck'].axis === 'x'
    && RC.refZoneOf(null, box)(0, 0.9) === 'body' && RC.refZoneOf({ axis: 'y', at: 0.5 }, box)(0, 0.5) === 'body' && RC.refZoneOf({ axis: 'y', at: 0.5 }, box)(0, -0.5) === 'pocket'
    && RC.refZoneOf({ axis: 'x', at: 0.6 }, box)(0.1, 0) === 'body' && RC.refZoneOf({ axis: 'x', at: 0.6 }, box)(0.3, 0) === 'pocket'
    && />\{tryCol \? 'Back to neutral' : 'Try colours'\}</.test(gp) && /approximate split/.test(gp) && /<SwatchGrid /.test(gp) && /split=\{preview\.ref3D\.set \? REF_SPLIT\[preview\.id\]/.test(gp));
  t('reference colours use the calibrated zone-mask material and the Studio light rig (linear tone mapping); one lazy Canvas, released on close',
    /patchZoneMaterial\(partMaterial\('#ffffff', \{ zoneOf: true \}\), uniforms\)/.test(rm) && /toneMapping: THREE\.LinearToneMapping/.test(rm) && /intensity=\{LIGHT\.fill\}/.test(rm)
    && /forceContextLoss\(\)/.test(rm) && /zone\.material\.dispose\(\)/.test(rm) && /export const LIGHT = \{ fill: 0\.42, key: 0\.85, rim: 1\.0 \}/.test(src('../src/pages/client/design-studio/lightRig.js')));
  // Preview only: the colours live in the preview's own state, are reset on Back, and never reach a callback, studio_config or the order.
  t('preview colours are never saved or sent: held in picker state only, reset on Back, never passed to onPickPhoto/onPick3D, and the caption says VFRB produces from the 2D design',
    RC.PREVIEW_CAPTION === "Colour preview of the photo's 3D reference. VFRB produces from your 2D design." && /setTryCol\(false\)/.test(gp.match(/const back = \(\) => \{[^}]*\}/)?.[0] ?? '')
    && (gp.match(/onPickPhoto\(([^)]*)\)/g) ?? []).every(c => !/refCol|tryCol/.test(c)) && (gp.match(/onPick3D\(([^)]*)\)/g) ?? []).every(c => !/refCol|tryCol/.test(c))
    && !/setCfg|serializeDesign|stashStudioConfig|sessionStorage\.|localStorage\.|axios/.test(src('../src/pages/client/design-studio/referenceColour.js') + rm));
  // T-shirt (UV paint path): the sheen follows the painted texel colour, like the zone-mask path.
  t('UV paint path (T-shirt): sheen takes the painted colour instead of white (measured dE mean 11.0 -> 6.2, max 20.4 -> 10.4)',
    /if \(map\) \{\s*m\.onBeforeCompile = sh => \{ sh\.fragmentShader = sh\.fragmentShader\.replace\('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\\n#ifdef USE_SHEEN\\nmaterial\.sheenColor \*= diffuseColor\.rgb;\\n#endif'\); \};/.test(src('../src/pages/client/design-studio/ScannedGarmentMesh.jsx')));
  // Nothing promoted: every reference GLB lacks UVs, and the sets are fused.
  const noUv = refs.every(d => { const b = fsx.readFileSync(MF.modelFile(urlx.fileURLToPath(new URL('../public' + d.ref3D.file, import.meta.url)))), l = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + l).toString('utf8'));
    return j.meshes.every(m => m.primitives.every(pr => !('TEXCOORD_0' in pr.attributes))); });
  const Cp6 = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const served6 = new Set(Cp6.SCANNED_GARMENTS.flatMap(x => Object.values(x.models)));
  t('no reference is promoted to editable 3D: none has UVs (constitution), 14 are fused sets, and singles have no 2D template of their cut (or a different one)',
    noUv && refs.every(d => !served6.has(d.ref3D.file)));
  t('the re-supplied Downloads corporate skirt is recorded as the rejected staging file (same SHA-256) and the authored pencil skirt as Skirt\'s 3D',
    /09f723e47fb8/.test(src('../docs/engineering/GLB-STAGING-AUDIT.md')) && /Enabled as Skirt's "3D \(approx\.\)"/.test(src('../docs/engineering/GLB-STAGING-AUDIT.md')));
}
// Settings: PH mobile numbers (same cases as App\Rules\PhMobile on the API).
{
  const P = await L('/src/utils/phPhone.js');
  const ok = ['0917 123 4567', '+63 917-123-4567', '09171234567'], bad = ['0917123456', '+6391712345678', '(02) 8123 4567'];
  t('PH mobile: 09XXXXXXXXX or +639XXXXXXXXX accepted with spaces/dashes, short, long and landline numbers rejected, empty allowed unless required',
    ok.every(P.isPhMobile) && !bad.some(P.isPhMobile) && P.compactPhone('0917 123-4567') === '09171234567'
    && P.phPhoneError('') === '' && P.phPhoneError('', { required: true }) === 'Enter a contact number.' && /^Use a PH mobile number/.test(P.phPhoneError('12345')));
  const rd = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const prof = rd('../src/pages/client/settings/ProfileSection.jsx');
  t('SMS line: "your number is saved" only for a stored PH mobile number; display format 0917 123 4567 / +63 917 123 4567',
    P.SMS_NOT_ACTIVE === 'Text alerts are not active yet; your number is saved.' && P.smsStatusLine('09171234567') === P.SMS_NOT_ACTIVE
    && ![null, '', '12345', undefined].some(v => P.smsStatusLine(v) === P.SMS_NOT_ACTIVE) && P.smsStatusLine(null, { noNumber: 'x' }) === 'x'
    && P.formatPhMobile('09171234567') === '0917 123 4567' && P.formatPhMobile('+639171234567') === '+63 917 123 4567' && P.formatPhMobile('(02) 8123') === '(02) 8123');
  t('Profile: a failed load shows a retryable error instead of a blank form that could be saved over the real profile',
    /\.catch\(\(\) => setFailed\(true\)\)/.test(prof) && /if \(failed\) return <div className="st-stack"><LoadError what="your profile" onRetry=\{load\}\/><\/div>;/.test(prof) && /if \(failed\) return;/.test(prof));
  const LS = await L('/src/utils/loadState.js'); const od = rd('../src/pages/client/OrderDetail.jsx');
  const rej = s => ({ status: 'rejected', reason: s ? { response: { status: s } } : new Error('Network Error') });
  t('Order Detail: a network or server failure is a retryable error, never "Order not found", and is not cached; 404/403 stay "not found"',
    LS.fetchFailed(rej()) && LS.fetchFailed(rej(500)) && LS.fetchFailed(rej(429)) && !LS.fetchFailed(rej(404)) && !LS.fetchFailed(rej(403)) && !LS.fetchFailed({ status: 'fulfilled', value: {} })
    && /const failed = fetchFailed\(o\);/.test(od) && /if \(!failed\) cacheSet\(CACHE_KEY/.test(od) && od.indexOf('if (loadErr) return') < od.indexOf('if (!order) return') && /onRetry=\{\(\) => load\(true\)\}/.test(od));
  const Cp = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const noted = Cp.SCANNED_GARMENTS.filter(g => Cp.hemNote3D(g.capabilities)).map(g => g.id);
  const cv = rd('../src/pages/client/design-studio/CanvasViewport.jsx');
  t('3D hem note: every model whose registry limitation says another garment shows at the hem or waist says so on the stage; models without it say nothing',
    noted.includes('collarless-blazer-long') && !noted.includes('collarless-blazer-short') && !noted.some(id => /^polo|^t-shirt|scrub-top/.test(id))
    && Cp.SCANNED_GARMENTS.every(g => !!Cp.hemNote3D(g.capabilities) === (g.capabilities.limitations ?? []).some(l => /under the hem|hem can remain at the waist/.test(l)))
    && Cp.hemNote3D(Cp.get3DCapabilities('Collarless Blazer', 'female', 'Long'))?.startsWith('3D: the strip under the hem') && Cp.hemNote3D(Cp.get3DCapabilities('Polo Shirt', 'male', 'Short')) === null
    && /const hem = hemNote3D\(c3\);/.test(cv) && /hem && \{ id: 'hem', text: hem, warn: true \}/.test(cv));
}
// Admin order detail: a Studio order still shows the customer's reference photo, order notes, gallery origin and zone colours (read-only).
{
  const od = fsx.readFileSync(urlx.fileURLToPath(new URL('../src/pages/admin/OrderDetail.jsx', import.meta.url)), 'utf8');
  const dd = fsx.readFileSync(urlx.fileURLToPath(new URL('../src/components/admin/OrderDesignDetails.jsx', import.meta.url)), 'utf8');
  t('admin OrderDetail renders OrderDesignDetails under the design (reference photo, notes, origin, colours); the reference image has skeleton and error states; no edit controls',
    /<OrderDesignDetails order=\{order\} \/>/.test(od) && /cfg && order\.client_design_ref_file/.test(dd) && /order\.notes &&/.test(dd) && /cfg\.inspirationId/.test(dd)
    && /state === 'loading' && <div className="adm-sk"/.test(dd) && /could not be displayed/.test(dd) && !/axios|onChange|<input|<textarea/.test(dd));
}

// Derived templates from the reference models (derive_template.py, derivedFamilies.js): originals untouched, garment-only pieces,
// sets kept whole, one data table, nothing existing re-routed, both creation entries reach the Studio.
{
  const crypto = await import('node:crypto');
  const rel = q => MF.modelFile(urlx.fileURLToPath(new URL(q, import.meta.url)));
  const sha = p => crypto.createHash('sha256').update(fsx.readFileSync(p)).digest('hex');
  const man = JSON.parse(fsx.readFileSync(rel('./glb-extract/derived-manifest.json'), 'utf8'));
  // A GLB in public/ must be the recorded original; one served from Cloudinary (Draco-compressed) must be the copy that
  // tools/served-glbs.mjs verified against that same original.
  const served = JSON.parse(fsx.readFileSync(rel('./glb-extract/served-sha256.json'), 'utf8')).models;
  const glbOk = (file, original) => (fsx.existsSync(urlx.fileURLToPath(new URL('../public' + file, import.meta.url)))
    ? sha(rel('../public' + file)) === original
    : served[file]?.original_sha256 === original && fsx.existsSync(rel('../public' + file)) && sha(rel('../public' + file)) === served[file].sha256);
  const DF = await L('/src/pages/client/design-studio/derivedFamilies.js');
  const CAT = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const CAP = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const GA = await L('/src/pages/client/design-studio/garmentAssets.js');
  const GAL = await L('/src/pages/client/design-studio/designGallery.js');
  const SER = await L('/src/pages/client/design-studio/designSerialization.js');
  const GP = await L('/src/pages/client/design-studio/garmentPaths.js');
  const RC = await L('/src/pages/client/design-studio/referenceColour.js');
  const refDir = MF.modelDir(rel('../public/models/reference/'));
  const refs = fsx.readdirSync(refDir).filter(f => f.endsWith('.glb'));
  t('originals unchanged: all 23 reference GLBs hash to the values recorded before and after derivation, or are the verified served copy of them (no derived file is written outside public/models/vfrb-derived)',
    refs.length === 23 && refs.every(f => glbOk(`/models/reference/${f}`, man.originals_sha256[f.replace('.glb', '')]))
    && man.pieces.every(p => p.glb.startsWith('/models/vfrb-derived/') && Object.values(p.shade).every(s => s.startsWith('/models/vfrb-derived/shade/'))));
  t('every derived piece is on disk exactly as recorded (GLB SHA-256), with front/back shade maps, and every piece is at most 50k triangles unless a decimation gate kept it whole (reported)',
    man.pieces.every(p => glbOk(p.glb, p.glb_sha256) && Object.values(p.shade).every(s => fsx.existsSync(rel('../public' + s)))
      && (p.tris <= 50000 || (p.decimation.decimated === false && /gate failed/.test(p.decimation.reason)))));
  t('decimated pieces passed every gate: front IoU >= 0.98, all five views >= 0.97, and the neckline / waist opening did not close (top-view cover +0.02 at most)',
    man.pieces.filter(p => p.decimation.decimated).every(p => p.decimation.front_iou >= 0.98 && p.decimation.view_iou_min >= 0.97 && p.decimation.opening_cover_after <= p.decimation.opening_cover_before + 0.02));
  t('garment-only: the two mannequin necks were removed by the measured cylinder cut (faces removed, neckline open afterwards) and no floating fragment remains in any piece',
    ['set-pinstripe-pants', 'set-pinstripe-skirt'].every(r => man.references[r].neck.faces_removed > 0 && man.references[r].neck.opening_cover_after < 0.1)
    && Object.values(man.references).every(e => e.fragments.fragment_faces < 0.001 * e.tris_source));
  t('sets keep top AND bottom: every REF_SPLIT set has both pieces written; each promoted set registers as two pieces (top + bottom roles); the two not-promoted sets register nothing',
    Object.keys(RC.REF_SPLIT).every(r => ['top', 'bottom'].every(k => man.pieces.some(p => p.id === `${r}-${k}`)))
    && Object.keys(RC.REF_SPLIT).every(r => { const pc = DF.derivedPiecesFor(r); return DF.NOT_PROMOTED[r] ? !pc : pc && CAT.pieceOf(pc.top) === 'top' && CAT.pieceOf(pc.bottom) === 'bottom'; }));
  t('one data table: every derived family is unique by name, in a constitution category (no Sports/PE), matched by exactly one capability entry (its own), labelled pending VFRB confirmation',
    new Set(DF.DERIVED_FAMILIES.map(d => d.name)).size === DF.DERIVED_FAMILIES.length && DF.DERIVED_FAMILIES.length === 7 && DF.DERIVED_FAMILIES.every(d => !DF.NOT_PROMOTED[d.ref])
    && DF.DERIVED_FAMILIES.every(d => (DF.SUPERSEDED_DERIVED.has(d.id) ? !CAT.CATALOG.some(c => c.families.some(f => f.id === d.name)) && !!CAT.FAMILY_BY_NAME[d.name] : CAT.CATALOG.some(c => c.id === d.category && c.families.some(f => f.id === d.name))) && !/sport|pe\b/i.test(d.category))
    && DF.DERIVED_FAMILIES.every(d => { const m = CAP.SCANNED_GARMENTS.filter(x => x.match.test(d.name)); return d.no3D ? m.length === 0 : m.length === 1 && m[0].id === `derived-${d.id}` && m[0].approval === DF.DERIVED_APPROVAL && m[0].license === 'unknown (not recorded)'; })
    && DF.DERIVED_LABEL === 'Derived from reference, pending VFRB confirmation');
  t('derived 2D templates are real closed paths with one body zone (no collar, sleeve or pocket zone), a traced back only where it differs, and the shade layer',
    DF.DERIVED_FAMILIES.every(d => { const p = GP.getGarmentPaths(d.name, null), b = GP.getGarmentPaths(d.name, null, 'back');
      return /^M [\d.]+,[\d.]+( L [\d.]+,[\d.]+){8,} Z$/.test(p.body) && !p.collar && !p.sleeveL && !p.sleeveR && !p.pocket && b.body === (d.geo.back ?? d.geo.body) && !!p.shade.front; }));
  t('every kept derived family is 2D + 3D (approx.), never verified; every removed piece (2026-10-16) is gone from the catalog, 3D and template ids and names an authored template',
    DF.DERIVED_FAMILIES.every(d => !d.no3D && CAT.resolveTarget(d.name, null, null).status === '2d-3d-approx')
    && Object.entries(DF.REMOVED_GARMENT).every(([name, to]) => !CAT.FAMILY_BY_NAME[name] && !DF.DERIVED_BY_NAME[name] && !CAP.SCANNED_GARMENTS.some(x => x.match.test(name)) && (GP.BASE_PATHS[to] || !!GP.customPaths(to, null).body) && CAT.FAMILY_BY_NAME[to]));
  // Nothing existing moved: every pre-existing family x style x fit and every unchanged gallery photo resolves exactly as at HEAD 57bbc2f.
  const base = JSON.parse(fsx.readFileSync(rel('./glb-extract/baseline-before-derived.json'), 'utf8'));
  const famSame = Object.entries(base.families).every(([k, b]) => { const [g, s0, f0] = k.split('|'); const sl = s0 === 'null' ? null : s0, fit = f0 === 'null' ? null : f0;
    // Intended changes since the baseline (2026-10-15): Pants is served by the authored trousers (its Meshy model is gated); the Scrub Top
    // unisex fit is now the scratch sketch with its authored model; Mandarin Collar Short (male) has a registered vector template id.
    const want = { ...b, ...(g === 'Pants' ? { model: 'pants-straight-authored', glb: '/models/authored/pants-straight.glb' } : {}),
      ...(g === 'Scrub Top' && fit === 'unisex' ? { templateId: sl === '3/4' ? 'scrub-top-sketch-three-quarter' : 'scrub-top-sketch-short', model: sl ? `scrub-top-vneck-authored-${sl === '3/4' ? 'three-quarter' : 'short'}` : b.model,
        glb: sl === '3/4' ? '/models/authored/scrub-top-vneck-three-quarter.glb' : '/models/authored/scrub-top-vneck-short.glb' } : {}),
      ...(g === 'Mandarin Collar' && fit === 'male' && sl !== 'Long' ? { templateId: 'mandarin-shirt-short-male' } : {}),
    };
    const r = CAT.resolveTarget(g, sl, fit); return GA.templateIdFor(g, CAT.resolveSleeve(g, sl), CAT.resolveFit(g, fit)) === want.templateId && (CAP.scannedEntryFor(g, sl, fit)?.id ?? null) === want.model && (r?.status ?? null) === want.status && (r?.glb ?? null) === want.glb; });
  const moved = GAL.ENTRIES.filter(d => JSON.stringify(GAL.openTarget(d)) !== JSON.stringify(base.gallery[d.id].target));
  t('every existing family still resolves to the same template, 3D model and status (136 family x style x fit cases vs the HEAD baseline); only reference photos with derived pieces open somewhere new, and they open their own derived family',
    famSame && moved.every(d => DF.derivedPiecesFor(d.id) && !DF.REUSED_TOPS[d.id] && GAL.openTarget(d).garment === (DF.derivedPiecesFor(d.id).single ?? DF.derivedPiecesFor(d.id).top)));
  t('a design saved before this change opens unchanged (garment, sleeve, fit, templateId and 3D availability, incl. the tunic photo saved on the T-Shirt template)',
    Object.entries(base.saved).every(([i, b]) => { const sc = [
      { garment: 'Scrub Top', fit: 'female', sleeve: 'Short', colors: { body: '#1B2A4A' }, templateId: 'scrub-top-women-short', inspirationId: 'scrub-set-women-vneck', category: 'Medical / Scrubs' },
      { garment: 'Pants', fit: null, sleeve: null, colors: { body: '#1e3a5f' }, templateId: 'pants-trousers', inspirationId: null, category: 'School Uniform' },
      { garment: 'T-Shirt', fit: 'female', sleeve: 'Short', colors: { body: '#D7D1C7' }, templateId: null, inspirationId: 'blouse-tunic-roundneck-blue', category: 'Corporate' }][i];
      const { cfg } = SER.deserializeDesign(sc); return cfg.garment === b.garment && cfg.sleeve === b.sleeve && cfg.fit === b.fit && GA.templateIdFor(cfg.garment, cfg.sleeve, cfg.fit) === b.templateId && CAP.has3DFor(cfg) === b.has3D; }));
  // Both creation entries reach the Studio.
  const PK = fsx.readFileSync(rel('../src/pages/client/design-studio/GarmentPicker.jsx'), 'utf8');
  const fams = Object.values(CAT.FAMILY_BY_NAME);
  t('"Start from scratch": every listed family offers only combinations that open an editable template (Category -> Garment -> Fit/Cut -> Style -> Studio); derived families are listed under "Start from a reference" (Traced from reference photos); no family is the default',
    fams.every(f => { const r = CAT.resolveTarget(f.id, f.defaultStyle, f.fits[0]); return !r || r.status === 'reference' || CAT.applyGarment({}, f.id, { fit: r.fit, sleeve: r.sleeve }).garment === f.id; })
    && /\['templates', 'Start from scratch', 'Scratch'\]/.test(PK) && /<h3>Traced from reference photos<\/h3>/.test(PK) && /r\.status !== 'reference'/.test(PK) && /Open in Studio/.test(PK));
  { const GPm = await L('/src/pages/client/design-studio/GarmentPicker.jsx');
    const own = fams.filter(f => !f.derived);
    t('"Start from scratch" lists vector templates only: no photo base is shown or opened (Scrub Top and Mandarin Collar open their vector sketch), and every own family keeps at least one', own.every(f => GPm.combosFor(f, { vectorOnly: true }).every(c => !A.assetFor(f.id, c.sleeve, 'front', c.fit))) && ['Scrub Top', 'Mandarin Collar', 'Round Neck', 'Button-Down'].every(id => GPm.combosFor(fams.find(f => f.id === id), { vectorOnly: true }).length > 0) && /!f\.derived && tierOfFamily/.test(PK)); }
  t('"Start from a reference": every reference photo with derived pieces opens its template (Use as template), sets open their top with the bottom waiting as the other set piece, in the photo\'s measured colours',
    /\['inspiration', 'Start from a reference', 'Reference'\]/.test(PK) && />Use as template</.test(PK)
    && [...new Set(DF.DERIVED_FAMILIES.map(d => d.ref))].every(ref => { const d = GAL.ENTRIES.find(e => e.id === ref), tg = GAL.openTarget(d); return d.editable2D && tg && CAT.applyGarment({}, tg.garment, tg).garment === tg.garment; })
    && /withPhotoColour\(b\.colors, d\.id, 1\)/.test(fsx.readFileSync(rel('../src/pages/client/DesignStudio.jsx'), 'utf8')));
  t('2D realism layers are decorative only: no zone key, never selectable or evented, so they never reach history or the saved design',
    /const deco = \{ selectable: false, evented: false, objectCaching: false, __garmentBase: true \}/.test(fsx.readFileSync(rel('../src/pages/client/design-studio/fabricShading.js'), 'utf8'))
    && !/__zoneKeys*:/.test(fsx.readFileSync(rel('../src/pages/client/design-studio/fabricShading.js'), 'utf8')));
}

// Validator-readiness fixes (2026-10-12). Backend items are source checks of the Laravel repo (VFRB_BACKEND, default the Laragon path).
{
  const rd = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const BE = process.env.VFRB_BACKEND || 'C:/laragon/www/vfrb-capstone';
  const be = q => fsx.readFileSync(`${BE}/${q}`, 'utf8');
  if (fsx.existsSync(`${BE}/routes/api.php`)) {
    const inv = be('app/Http/Controllers/Api/InventoryController.php');
    const adj = inv.slice(inv.indexOf('private function adjustStock'), inv.indexOf('private function notifyLowStock'));
    t('stock-out/wastage larger than the stock is refused inside the locked transaction (422 "Only X unit in stock; cannot remove Y."), with no clamp and no log row; cache and low-stock handling unchanged',
      /lockForUpdate\(\)->first\(\);\s*\/\/[^\n]*\n\s*if \(\$locked->quantity_in_stock \+ \$delta < 0\) \{\s*return \['short'/.test(adj) && !/max\(0,/.test(adj)
      && /"Only \{\$fmt\(\$newStock\['short'\]\)\} \{\$material->unit\} in stock; cannot remove \{\$fmt\(\$qty\)\}\."/.test(adj) && /\], 422\);\s*\}\s*(?:\/\/[^\n]*\n\s*if \(in_array\(\$type, \['adjustment', 'wastage'\], true\)\) \{\s*AuditLog::record\('inventory_adjusted', 'materials', \$id\);\s*\}\s*)?Cache::forget\('materials_list'\);/.test(adj)
      && adj.indexOf("return ['short'") < adj.indexOf("DB::table('inventory_logs')->insert") && /notifyLowStock\(/.test(adj));
    const ord = be('app/Http/Controllers/Api/OrderController.php');
    const upd = ord.slice(ord.indexOf('public function adminUpdate'), ord.indexOf('private function notifyManagers'));
    t('admin order update: status, total, negotiated delivery date and review notes are manager-only; the manager note goes to the customer message and never overwrites orders.notes (the customer\'s own notes)',
      /hasAny\(\['status', 'agreed_total', 'negotiated_delivery_date', 'notes'\]\) && !\$request->user\(\)->isManager\(\)/.test(upd)
      && /collect\(\$request->only\(\['status', 'negotiated_delivery_date'\]\)\)/.test(upd) && !/only\(\[[^\]]*'notes'/.test(upd)
      && /Reason: \{\$request->input\('notes'\)\}/.test(upd) && /Note from VFRB: \{\$request->input\('notes'\)\}/.test(upd));
    const st = be('app/Http/Controllers/Api/SettingsController.php');
    t('email_provider_live comes from the mail config: false for log/array mailers and sandbox hosts (mailtrap, sandbox, mailhog, mailpit, localhost), true otherwise; no hard-coded false',
      /'email_provider_live' => self::emailProviderLive\(\)/.test(st) && /in_array\(\$mailer, \['log', 'array'\], true\)/.test(st) && /mailtrap\|sandbox\|mailhog\|mailpit\|localhost/.test(st));
    const api = be('routes/api.php'), uc = be('app/Http/Controllers/Api/UserController.php');
    const staffGroup = api.slice(api.lastIndexOf("Route::middleware(['auth:sanctum', 'role:staff,manager", api.indexOf("'/profile/password', [UserController::class, 'adminUpdatePassword']")));
    t('admin password change: PUT /api/admin/profile/password in the staff+manager group, customer and admin routes share one method (current password check + the same strength rule)',
      /Route::put\('\/profile\/password', \[UserController::class, 'adminUpdatePassword'\]\)/.test(api) && /role:staff,manager/.test(staffGroup.slice(0, 200))
      && /function customerUpdatePassword\(Request \$request\)\s*\{\s*return \$this->changeOwnPassword\(\$request\);/.test(uc) && /function adminUpdatePassword\(Request \$request\)\s*\{\s*return \$this->changeOwnPassword\(\$request\);/.test(uc)
      && /private function changeOwnPassword[\s\S]*PasswordRule::min\(8\)->mixedCase\(\)->numbers\(\)->symbols\(\)[\s\S]*Hash::check\(\$request->input\('current_password'\)/.test(uc));
  } else console.log(`NOTE backend repo not found at ${BE}: the four backend source checks were not run`);
  const od = rd('../src/pages/admin/OrderDetail.jsx');
  t('admin OrderDetail: "Order Summary (PDF)" only for managers (manager-only endpoint); "Track Production" and "Open tracking" only with the production area',
    /const isManager = getIsManager\(\), canTrack = canAccessArea\(readAdminUser\(\), 'production'\);/.test(od) && /\{canTrack && \(\s*<button className="adm-btn primary"[^\n]*\n\s*<NavIcon name="production"[^\n]*Track Production/.test(od)
    && /\{isManager && \(\s*<button className="adm-btn" onClick=\{handleDownloadPdf\}/.test(od) && /action=\{canTrack \? <button className="adm-link-btn"[^\n]*Open tracking →<\/button> : null\}/.test(od) && /Note to the customer \(required if cancelling\)/.test(od));
  const ui = rd('../src/components/admin/AdminUI.jsx'), css = rd('../src/styles/admin.css');
  t('order ids in Delivery, Incidents and Reports are real links to /admin/orders/:id (react-router Link, keyboard focus ring, 44px on touch, row click not triggered)',
    /export const OrderLink = \(\{ id, prefix = '#' \}\) => \(\s*<Link className="adm-order-link" to=\{`\/admin\/orders\/\$\{id\}`\} onClick=\{e => e\.stopPropagation\(\)\}>/.test(ui)
    && /\.adm-order-link:focus-visible\{outline:2px solid var\(--teal\)/.test(css) && /@media\(pointer:coarse\)\{\.adm-order-link\{min-height:44px;min-width:44px/.test(css)
    && ['DeliveryTracking', 'Reports'].every(f => /<OrderLink id=\{/.test(rd(`../src/pages/admin/${f}.jsx`)))
    && !/#\{d\.order_id\}<\/td>|Order #\{item\.order_id\}<\/span>|#\{affected\.slice/.test(['DeliveryTracking', 'Reports'].map(f => rd(`../src/pages/admin/${f}.jsx`)).join('\n')));
  const PR = await L('/src/utils/passwordRules.js'), as = rd('../src/pages/admin/Settings.jsx'), ps = rd('../src/pages/client/settings/ProfileSection.jsx');
  t('one password rule for customer and admin panels (8+, upper and lower case, number, symbol), admin Settings has its own Password panel calling PUT /api/admin/profile/password; no profile edit or session logout',
    PR.passwordOk('Abcdef1!') && !PR.passwordOk('abcdef1!') && !PR.passwordOk('Abcdefg!') && !PR.passwordOk('Abcdefg1') && !PR.passwordOk('Ab1!') && PR.passwordLevel('') === 1 && PR.passwordLevel('Abcdef1!') === 4
    && /axios\.put\('\/api\/admin\/profile\/password', pw\)/.test(as) && /passwordOk\(pw\.password\)/.test(as) && /passwordOk\(pw\.password\)/.test(ps) && /autoComplete="current-password"/.test(as)
    && !/admin\/profile'|logout-other|other-sessions/.test(as));
  t('email preference copy says "test inbox" (no provider name) and the validation docs no longer name Mailtrap',
    /test inbox/.test(as) && /test inbox/.test(rd('../src/pages/client/AccountSettings.jsx')) && !/mailtrap/i.test(as + rd('../docs/validation/SURVEY-EVIDENCE-MATRIX.md') + rd('../docs/validation/VALIDATOR-RUNBOOK.md')));
  t('dead code removed: no unused SK style const in Delivery, Physical Count, Purchase Orders, Users; no unused TTL import in Users',
    ['DeliveryTracking', 'PhysicalCount', 'PurchaseOrders', 'UserManagement'].every(f => !/\bconst SK\b/.test(rd(`../src/pages/admin/${f}.jsx`))) && !/\bTTL\b/.test(rd('../src/pages/admin/UserManagement.jsx')));
  const um = rd('../src/pages/admin/UserManagement.jsx'), umRoles = um.match(/const ROLE_CFG = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  t('User Management roles: create, edit-role and filter tabs all come from one list of Admin (manager), Staff and Owner; no Client option',
    /manager: \{[^}]*l:'Admin'/.test(umRoles) && /staff:\s+\{[^}]*l:'Staff'/.test(umRoles) && /owner:\s+\{[^}]*l:'Owner'/.test(umRoles) && !/customer/.test(umRoles)
    && (um.match(/\{ROLE_OPTIONS\}/g) ?? []).length === 2 && /Object\.entries\(ROLE_CFG\)\.map\(\(\[key, r\]\) => \(\{ key, label:r\.tab/.test(um)
    && !/<option value="(manager|staff|customer)"|key:'customer'|'Clients'|'Managers'/.test(um));
}

// Owner: read-only admin account. Frontend mirror of backend OwnerReadOnly (GET-only, 9 areas); the server stays the enforcement point.
{
  const JA = await L('/src/utils/jobAccess.js'), AR = await L('/src/utils/authRoute.js');
  const rdo = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const owner = { role: 'owner' };
  t('owner pages: exactly the backend read-only areas (invoice = the page over the orders API); everything else is closed',
    JA.OWNER_PAGES.join() === 'dashboard,orders,reports,transactions,invoice,inventory,materials,activity-log,audit-logs'
    && ['/admin', '/admin/dashboard', '/admin/orders/12', '/admin/reports', '/admin/transactions', '/admin/invoice?x=1', '/admin/inventory', '/admin/materials', '/admin/activity-log', '/admin/audit-logs'].every(JA.ownerCanOpen)
    && !['/admin/users', '/admin/settings', '/admin/production', '/admin/procurement', '/admin/physical-count', '/admin/delivery', '/admin/messages', '/admin/customers', '/admin/suppliers', '/admin/qc'].some(JA.ownerCanOpen)
    && JA.isOwner(owner) && !JA.isOwner({ role: 'manager' }) && JA.canAccessArea(owner, 'inventory') && !JA.canAccessArea(owner, 'production'));
  const app = rdo('../src/App.jsx'), lay = rdo('../src/layouts/AdminLayout.jsx'), login = rdo('../src/pages/auth/Login.jsx');
  t('owner routing: signs in to the admin portal, gets the manager dashboard, every admin route sits behind OwnerGate; reports/activity-log/audit-logs/invoice open to owner, other manager pages do not',
    AR.isStaffRole(owner) && AR.homeFor(owner) === '/admin/dashboard' && /if \(isStaffRole\(data\.user\)\)/.test(login)
    && /\['manager', 'owner'\]\.includes\(user\.role\) \? <AdminDashboard\/>/.test(app) && /isOwner\(\) && !ownerCanOpen\(pathname\) \? <AccessDenied/.test(app)
    && /<Route element=\{<OwnerGate\/>\}>\s*<Route path="dashboard"/.test(app) && /<\/Route>\s*<Route path="\*" element=\{<AdminNotFound\/>\}\/>/.test(app)
    && ['reports', 'activity-log', 'audit-logs', 'invoice'].every(r => new RegExp(`path="${r}"\\s+element=\\{<RequireManager owner>`).test(app))
    && ['feedback', 'suppliers', 'users'].every(r => new RegExp(`path="${r}"\\s+element=\\{<RequireManager>`).test(app)) && !/\['manager',\s*'staff'\]\.includes/.test(app));
  t('owner shell: nav lists only owner pages, label says view only, no notification bell or polling (API refuses notifications)',
    /owner \? STAFF_NAV\.filter\(i => ownerCanOpen\(i\.to\)\)/.test(lay) && /owner \? MANAGER_EXTRA\.filter\(i => ownerCanOpen\(i\.to\)\)/.test(lay) && /owner \? MOB_NAV\.filter\(i => ownerCanOpen\(i\.to\)\)/.test(lay)
    && /'Owner · view only'/.test(lay) && /\{!owner && <div ref=\{bellRef\}/.test(lay) && /if \(isOwner\(\)\) return; \/\/ the API refuses notifications/.test(lay));
  const audit = rdo('../src/pages/admin/AuditLog.jsx');
  t('audit log: read-only GET /api/admin/audit-logs with action/date filters and pages; listed in the manager Admin group',
    /axios\.get\('\/api\/admin\/audit-logs'/.test(audit) && !/axios\.(post|put|patch|delete)/.test(audit)
    && ['params.action', 'params.date_from', 'params.date_to', 'page: target'].every(s => audit.includes(s))
    && /\{ to:'\/admin\/audit-logs',\s+icon:ScrollText,\s+label:'Audit Log'/.test(rdo('../src/layouts/adminNav.js')));
  const dash = rdo('../src/pages/admin/Dashboard.jsx');
  t('owner dashboard: no revenue (snapshot or chart tab), no Total Orders, no RFQ/delivery requests, links only to owner pages',
    /!owner && \{ label: 'Total Orders'/.test(dash) && /!owner && \{ label: 'Revenue \(Month\)'/.test(dash) && /action=\{owner \? null : <PillTabs/.test(dash)
    && /owner \? Promise\.resolve\(\[\]\) : axios\.get\('\/api\/admin\/rfq/.test(dash) && /owner \? Promise\.resolve\(\[\]\) : axios\.get\('\/api\/admin\/delivery/.test(dash)
    && /\.filter\(\(q\) => !owner \|\| ownerCanOpen\(q\.path\)\)/.test(dash) && /!\['RFQs Awaiting Response', 'Upcoming Deliveries'\]\.includes\(a\.title\)/.test(dash) && /items\.length > 0 && onFooter &&/.test(dash));
  const pg = f => rdo(`../src/pages/admin/${f}.jsx`);
  t('owner write controls hidden: payment, stock in/out, add/edit material, run automation, staff AI check; no links to pages the owner cannot open',
    /\{!isOwner\(\) && <button className="adm-btn primary" onClick=\{\(\) => setModal\(true\)\}>/.test(pg('SalesTransactions')) && /!isOwner\(\) && <button className="adm-link-btn" onClick=\{\(\) => setModal\(true\)\}>/.test(pg('SalesTransactions'))
    && /\{!isOwner\(\) && <>\s*<button[^\n]*physical-count[\s\S]*?setModal\('out'\)[\s\S]*?setModal\('in'\)[\s\S]*?<\/>\}/.test(pg('Inventory')) && /action=\{isOwner\(\) \? null : <button[^\n]*procurement/.test(pg('Inventory'))
    && (pg('Materials').match(/!owner && /g) ?? []).length === 5 && /\{!isOwner\(\) && \(\s*<button className="adm-btn primary" onClick=\{runDigest\}/.test(pg('Reports'))
    && /if \(isOwner\(\)\) return <span/.test(pg('OrderDetail')) && /action=\{isOwner\(\) \? null : <button[^\n]*\/admin\/delivery/.test(pg('OrderDetail')) && /\{!isOwner\(\) && <Panel title="Communication"/.test(pg('OrderDetail'))
    && /isManager && order\.status === 'pending'/.test(pg('Orders')) && /'View only \(Owner\)'/.test(pg('Orders')) && !/axios\.(post|put|patch|delete)/.test(pg('Invoice') + pg('ActivityLog')));
}

// Garment details (pockets, buttons, closures): one table, only what each 2D template really draws, saved in studio_config.details.
{
  const GD = await L('/src/pages/client/design-studio/garmentDetails.js'), GP = await L('/src/pages/client/design-studio/garmentPaths.js');
  const rdx = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const fams = Object.values(G.FAMILY_BY_NAME);
  const combos = fams.flatMap(f => (f.styles.length ? f.styles : [null]).flatMap(sl => (f.fits.length ? f.fits : [null]).map(fit => [f.id, sl, fit])));
  t('details: an older design (no details key) opens unchanged: empty details, and every template draws exactly as before',
    (() => { const old = { garment: 'Polo Shirt', sleeve: 'Short', fit: 'male', colors: { body: '#1b2a4a' }, frontOverlays: [] }; const c = S.deserializeDesign(JSON.parse(JSON.stringify(old))).cfg; return JSON.stringify(c.details) === '{}' && JSON.stringify(S.serializeDesign(c).details) === '{}'; })()
    && combos.every(([g, sl]) => ['front', 'back'].every(f => JSON.stringify(GD.detailedPaths(g, sl, f, {})) === JSON.stringify(GP.getGarmentPaths(g, sl, f)))));
  t('details: hidden pocket and recoloured buttons survive Save -> My Designs reload -> Order Wizard snapshot -> Order Detail, and print on the spec sheet and admin view',
    (() => {
      const cfg = { ...G.applyGarment(base, 'Button-Down'), details: { patchPocket: { show: false }, buttons: { color: '#C0A060' }, closure: { color: 'red' } } };
      const saved = S.serializeDesign(cfg, {}); const order = S.serializeDesign(S.deserializeDesign(JSON.parse(JSON.stringify(saved))).cfg, {});
      const shown = GD.detailedPaths(order.garment, order.sleeve, 'front', S.deserializeDesign(order).cfg.details);
      return JSON.stringify(order.details) === JSON.stringify({ patchPocket: { show: false }, buttons: { color: '#c0a060' } }) && shown.pocket === null
        && shown.details.filter(d => d.part === 'buttons').every(d => d.style.fill === '#c0a060') && !shown.details.some(d => d.part === 'patchPocket')
        && JSON.stringify(GD.describeDetails(order.details)) === JSON.stringify(['Patch pocket: none', 'Buttons: #C0A060']);
    })()
    && /\['Details', describeDetails\(cfg\.details\)/.test(rdx('../src/pages/client/DesignStudio.jsx')) && /describeDetails\(cfg\?\.details\)/.test(rdx('../src/components/admin/OrderDesignDetails.jsx'))
    && /details=\{design\.details\}/.test(rdx('../src/components/DesignPreview.jsx')) && /cfg\.fit,\s*cfg\.details,\s*customKey\b/.test(rdx('../src/pages/client/DesignStudio.jsx')));
  t('details: no control for a garment that cannot draw it: every listed option is drawn by that template; photo bases and derived templates list none; unsupported keys are dropped on save',
    combos.every(([g, sl, fit]) => GD.detailsFor(g, sl, fit).every(o => ['front', 'back'].some(f => { const p = GP.getGarmentPaths(g, sl, f); return o.id === 'patchPocket' ? !!p.pocket : p.details.some(d => d.part === o.id); })))
    && GD.detailsFor('Scrub Top', 'Short', 'female').length === 0 && GD.detailsFor('T-Shirt', 'Short', 'male').length === 0
    && fams.filter(f => f.derived).every(f => GD.detailsFor(f.id, f.styles[0] ?? null, f.fits[0] ?? null).length === 0)
    && GD.detailsFor('Polo Shirt', 'Short', 'male').map(o => o.id).join() === 'patchPocket,buttons,closure' && GD.detailsFor('Pants', null, null).map(o => o.id).join() === 'sidePockets,backPockets,buttons,closure'
    && JSON.stringify(S.serializeDesign({ ...G.applyGarment(base, 'T-Shirt'), details: { buttons: { color: '#000000' } } }).details) === '{}'
    && /const options = detailsFor\(cfg\.garment, cfg\.sleeve, cfg\.fit\);/.test(rdx('../src/pages/client/design-studio/DetailsPanel.jsx'))
    && /changes are shown in 2D only/.test(rdx('../src/pages/client/design-studio/CanvasViewport.jsx')));
}
// ── Prompt 1B: text, shapes, woven patterns, layer tools, 2D realism ──
{
  const rdx = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const W = await L('/src/pages/client/design-studio/wovenPatterns.js');
  const OT = await L('/src/pages/client/design-studio/overlayTools.js');
  const SHP = (await L('/src/pages/client/design-studio/dsShared.js')).SHAPES;
  t('shapes: every panel shape has a layer label; path shapes (heart, badge, speech, ribbon) have a closed 24-unit path',
    SHP.every(s => OT.SHAPE_KIND_LABEL[s.kind]) && ['heart', 'badge', 'bubble', 'ribbon'].every(k => /^M.*Z$/.test(OT.SHAPE_PATHS[k]) && SHP.some(s => s.kind === k)));
  t('gradient fill: spec is a percentage-unit linear gradient, and reading it back gives the same colours and direction',
    (() => { const h = OT.gradientSpec('#111111', '#eeeeee', 'h'), r = OT.readGradient(h), v = OT.readGradient(OT.gradientSpec('#000000', '#ffffff'));
      return h.gradientUnits === 'percentage' && r.from === '#111111' && r.to === '#eeeeee' && r.dir === 'h' && v.dir === 'v' && OT.readGradient('#ff0000') === null; })());
  t('image adjust: reads brightness/contrast/greyscale off Fabric filters (defaults 0, 0, off); crop shapes are none, circle, rounded, heart',
    (() => { const a = OT.readAdjust({ filters: [{ type: 'Brightness', brightness: 0.25 }, { type: 'Grayscale' }] }), z = OT.readAdjust({});
      return a.b === 25 && a.c === 0 && a.grey && z.b === 0 && !z.grey && OT.CLIP_KINDS.map(k => k[0]).join() === 'none,circle,rounded,heart'; })());
  t('crop shape (__clip) is an overlay prop, so it survives save, reload and undo',
    /OVERLAY_PROPS = \[[^\]]*'__clip'/.test(rdx('../src/pages/client/design-studio/useGarmentCanvas.js')));
  const doc = rdx('../docs/engineering/FONT-LICENSES.md');
  t('fonts: 12 OFL faces across sans, serif, script, display, condensed and mono; every weight file exists; each has its licence text and a row in FONT-LICENSES.md',
    SF.WEB_FONTS.length === 12 && ['Sans', 'Serif', 'Script', 'Display', 'Condensed', 'Mono'].every(c => SF.WEB_FONTS.some(f => f.cat === c))
    && SF.WEB_FONTS.every(f => f.weights.every(w => fsx.existsSync(pub(`fonts/${f.file}-${w}.woff2`)))
      && /SIL OPEN FONT LICENSE Version 1\.1/.test(fsx.readFileSync(pub(`fonts/licenses/${f.file}.txt`), 'utf8'))
      && doc.includes(`| ${f.label} |`) && doc.includes('`' + f.file + '`'))
    && Sh.FONTS === SF.WEB_FONTS && Sh.LEGACY_FONTS.length > 0);
  t('fonts: lazy, never precached by the service worker, loaded only through FontFace on first use',
    /"fonts\/\*\*"\]/.test(rdx('../vite.config.js')) && !/fonts\.googleapis/.test(rdx('../index.html'))
    && /loadFontPreviews\(\)/.test(rdx('../src/pages/client/design-studio/TextPanel.jsx')) && /new FontFace\(/.test(rdx('../src/pages/client/design-studio/studioFonts.js')));

  const woven = Sh.PATTERNS.filter(p => p.woven).map(p => p.id);
  t('patterns: at least 12 procedural woven/printed patterns (no image assets), each with a bounded tile',
    woven.length >= 12 && ['pinstripe', 'chalkstripe', 'houndstooth', 'glenplaid', 'tartan', 'gingham', 'herringbone', 'pindot', 'windowpane', 'twill', 'tweed', 'denim'].every(id => woven.includes(id))
    && woven.every(id => { const { cols, rows } = W.tileThreads(id); return cols > 0 && rows > 0 && cols <= 64 && rows <= 64; })
    && W.wovenTile('tartan', '#123456', '#ffffff', 1) === null);
  t('patterns: params are clamped (scale, rotation, colour 2) so a bad record cannot break rendering',
    (p => p.scale === 3 && p.rotation === 10 && p.c2 === '#f8fafc')(W.wovenParams('tartan', { scale: 99, rotation: 190, c2: 'red' }, '#1b2a4a'))
    && W.wovenParams('denim', null, '#1b2a4a').c2 === '#e9e4d8' && W.wovenParams('gingham', null, '#ffffff').c2 === '#1f2937');
  t('patterns: woven zones are 2D only (the 3D path paints them solid and the panel says so)',
    Sh.pattern3D('Pants', null, null, 'body', 'houndstooth') === false && /The 3D model shows this zone in its solid colour/.test(rdx('../src/pages/client/design-studio/PatternPanel.jsx')));

  // Round trip: a design using every new property survives Save -> My Designs reload -> Order Wizard -> order studio_config.
  const textObj = { type: 'IText', text: 'VARSITY', fontFamily: SF.WEB_FONTS[5].css, fontWeight: 400, fontSize: 30, charSpacing: 120, lineHeight: 1.2, textAlign: 'center',
    fill: '#ffffff', stroke: '#111111', strokeWidth: 2, paintFirst: 'stroke', shadow: { color: 'rgba(0,0,0,.35)', blur: 8, offsetX: 0, offsetY: 3 }, flipX: true, opacity: 0.8, angle: 12,
    __text: true, __curve: 40, __layerId: 't1', __layerName: 'VARSITY' };
  const shapeObj = { type: 'Polygon', points: [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 10 }], fill: '#ff0000', stroke: '#000000', strokeWidth: 3, strokeUniform: true, flipY: true,
    __shape: true, __shapeKind: 'arrow', __locked: true, visible: false, __layerId: 's1' };
  const rectObj = { type: 'Rect', width: 72, height: 56, rx: 12, ry: 12, fill: '#00ff00', __shape: true, __shapeKind: 'roundrect', __layerId: 'r1' };
  const cfg1B = { ...G.applyGarment(base, 'Pants'), colors: { body: '#274c77' }, patterns: { body: 'houndstooth' }, patternParams: { body: { scale: 1.5, rotation: 45, c2: '#f5f0e8' } } };
  const bundle = { overlays: [textObj, shapeObj, rectObj], frontOverlays: [textObj, shapeObj, rectObj], backOverlays: [] };
  const saved = S.serializeDesign(cfg1B, bundle);
  const reopened = S.deserializeDesign(JSON.parse(JSON.stringify(saved)));
  const order = JSON.parse(JSON.stringify(S.serializeDesign(reopened.cfg, { overlays: reopened.frontOverlays, frontOverlays: reopened.frontOverlays, backOverlays: reopened.backOverlays })));
  t('1B round trip: woven pattern + params, curved/outlined/shadowed text, shape kind, lock, hide and flip survive Save -> reload -> order',
    order.patterns.body === 'houndstooth' && JSON.stringify(order.patternParams.body) === JSON.stringify(cfg1B.patternParams.body)
    && JSON.stringify(order.frontOverlays) === JSON.stringify(bundle.frontOverlays)
    && W.describePatterns(order.patterns, order.patternParams, order.colors, id => Sh.PATTERNS.find(p => p.id === id)?.label).join() === 'Body: Houndstooth (colour 2 #F5F0E8, scale 1.5x, 45°)');
  t('1B: the overlay props that carry the new tools are saved with every overlay, and every load path revives fonts and arcs',
    (h => /'__curve','__shapeKind'/.test(h) && (h.match(/then\(reviveOverlays\)/g) ?? []).length === 2 && /reviveOverlays\(\[c\]\)/.test(h))(rdx('../src/pages/client/design-studio/useGarmentCanvas.js'))
    && /reviveOverlays\(await fabric\.util\.enlivenObjects/.test(rdx('../src/pages/client/design-studio/overlayDecals.js')));

  // An older design (stripe params, a system-font text, a pre-1B star) opens and re-saves identically.
  const oldRaw = { name: 'Old', category: 'School Uniform', garment: 'Pants', colors: { body: '#123456' }, patterns: { body: 'hstripes', collar: 'solid', sleeve: 'solid', pocket: 'solid' },
    patternParams: { body: { width: 6, spacing: 8 } }, details: {},
    frontOverlays: [{ type: 'IText', text: 'OLD', fontFamily: Sh.LEGACY_FONTS[0].css, fontWeight: 'bold', __text: true }, { type: 'Polygon', points: [], __shape: true }], backOverlays: [] };
  const oldBack = S.deserializeDesign(JSON.parse(JSON.stringify(oldRaw)));
  const oldSaved = S.serializeDesign(oldBack.cfg, { overlays: oldBack.frontOverlays, frontOverlays: oldBack.frontOverlays, backOverlays: oldBack.backOverlays });
  t('old designs unchanged: legacy stripes, params, system-font text and an untagged star re-save identically and keep their labels',
    JSON.stringify(oldSaved.patterns) === JSON.stringify(oldRaw.patterns) && JSON.stringify(oldSaved.patternParams) === JSON.stringify(oldRaw.patternParams)
    && JSON.stringify(oldSaved.frontOverlays) === JSON.stringify(oldRaw.frontOverlays) && OT.shapeLabel({ type: 'polygon' }) === 'Star' && SF.webFontFor(oldRaw.frontOverlays[0].fontFamily) === null);

  const arc = OT.arcPathD(200, 50), m = arc && arc.match(/A ([\d.]+) /);
  t('curved text: off at 0, an arc as long as the straight text otherwise, clamped to -100..100',
    OT.arcPathD(200, 0) === null && OT.arcPathD(200, 1) === null && !!arc && Math.abs(Number(m[1]) * 0.5 * 1.75 * Math.PI - 200) < 0.1 && / 1 [-\d.]+ [-\d.]+$/.test(arc)
    && / 0 [-\d.]+ [-\d.]+$/.test(OT.arcPathD(200, -50)) && OT.clampCurve(400) === 100 && OT.clampCurve('x') === 0);
  t('shapes: all nine (rectangle, rounded, circle, ellipse, triangle, star, hexagon, line, arrow) are offered and labelled',
    ['rect', 'roundrect', 'circle', 'ellipse', 'triangle', 'star', 'polygon', 'line', 'arrow'].every(k => Sh.SHAPES.some(x => x.kind === k) && OT.SHAPE_KIND_LABEL[k]));
  t('editing tools: contextual text/shape controls, flip, z-order, shortcuts and 44px touch handles are wired',
    (x => ['Letter spacing', 'Curve', 'Outline', 'Shadow', 'Letter case', 'Corner radius', 'Flip horizontally', 'Bring to front'].every(k => x.includes(k)))(rdx('../src/pages/client/design-studio/StyleSections.jsx'))
    && /TextStyleSection/.test(rdx('../src/pages/client/design-studio/RightInfoPanel.jsx')) && /ShapeStyleSection/.test(rdx('../src/pages/client/design-studio/RightInfoPanel.jsx'))
    && /BracketRight/.test(rdx('../src/pages/client/DesignStudio.jsx')) && /KeyL/.test(rdx('../src/pages/client/DesignStudio.jsx'))
    && /touchCornerSize: 44/.test(rdx('../src/pages/client/design-studio/overlayTools.js')));
  t('undo/redo: text restyles commit after the async relayout; z-order goes through history',
    (h => /restyleText\(obj, props\)\.then\(\(\) => \{ canvas\.renderAll\(\); if \(commit\) pushHistory\(\)/.test(h) && /moveInStack\(canvas, obj, where\)\) return;\s+canvas\.renderAll\(\);\s+pushHistory\(\);/.test(h))(rdx('../src/pages/client/design-studio/useGarmentCanvas.js')));
  t('history: starts at an empty baseline (the first action is undoable); a design load restarts it, a side switch parks it, the export face swap keeps it; only the newest overlay load lands',
    (h => /history = useRef\(emptyHistory\(\)\)/.test(h) && /switchSide\(parkedHistory\.current/.test(h) && /if \(!keepHistory\) resetHistory\(\)/.test(h) && (h.match(/token !== overlayLoad\.current/g) ?? []).length === 3)(rdx('../src/pages/client/design-studio/useGarmentCanvas.js'))
    && (rdx('../src/pages/client/DesignStudio.jsx').match(/keepHistory: true/g) ?? []).length === 3 // export face swap x2 + AI undo (restore, then one pushed step)
    && /loadCanvasJSON\(aiPreview\.canvas, \{ keepHistory: true \}\)/.test(rdx('../src/pages/client/DesignStudio.jsx'))
    && /side: \{ from: face, to: newFace \}/.test(rdx('../src/pages/client/DesignStudio.jsx')));
  t('2D realism layers are decorative only: built from deco (never selectable, never saved)',
    (x => /function detailRealism/.test(x) && !/selectable: true|evented: true/.test(x) && (x.match(/\.\.\.deco/g) ?? []).length >= 6)(rdx('../src/pages/client/design-studio/fabricShading.js'))
    && /__garmentBase: true, __detailKind: d\.kind/.test(rdx('../src/pages/client/design-studio/useGarmentCanvas.js')));
  t('previews and specs: shared preview passes woven patterns; PDF and admin list them; SSR renders without a DOM',
    /patterns=\{design\.patterns\} patternParams=\{design\.patternParams\}/.test(rdx('../src/components/DesignPreview.jsx'))
    && /\['Patterns', describePatterns\(/.test(rdx('../src/pages/client/DesignStudio.jsx')) && /describePatterns\(cfg\?\.patterns/.test(rdx('../src/components/admin/OrderDesignDetails.jsx'))
    && renderToString(React.createElement(Prev, { cfg: saved })).includes('<svg'));
}
// Account settings: square photo crop, dark-mode accent contrast, mode resolution.
{
  const C = await L('/src/utils/squareCrop.js'), K = await L('/src/utils/colorMath.js'), Ac = await L('/src/utils/accentColor.js'), Tm = await L('/src/utils/themeMode.js');
  const st = 240, near = (a, b) => Math.abs(a - b) < 1e-6, src = f => fsx.readFileSync(f, 'utf8');
  t('crop: a landscape photo covers the square stage and starts centred, so the crop is the middle square', (r => near(r.size, 1000) && near(r.sx, 250) && near(r.sy, 0))(C.cropRect(C.centerPan(1500, 1000, st, 1), 1500, 1000, st, 1)));
  t('crop: panning past an edge is clamped so no gap shows', (p => p.x === 0 && near(p.y, 0))(C.clampPan(500, 500, 1500, 1000, st, 1)) && (p => near(p.x, st - 360) && near(p.y, 0))(C.clampPan(-9999, 0, 1500, 1000, st, 1)));
  t('crop: zooming keeps the stage centre on the same image point and shrinks the square', (() => { const p = C.zoomAround(C.centerPan(1000, 1000, st, 1), 1000, 1000, st, 1, 2); const r = C.cropRect(p, 1000, 1000, st, 2); return near(r.size, 500) && near(r.sx, 250) && near(r.sy, 250); })());
  t('crop: the source rectangle never leaves the image', [[800, 600], [600, 800], [64, 64]].every(([w, h]) => [1, 1.7, 3].every(z => { const r = C.cropRect(C.clampPan(-1e6, -1e6, w, h, st, z), w, h, st, z); return r.sx >= 0 && r.sy >= 0 && r.sx + r.size <= w + 1e-6 && r.sy + r.size <= h + 1e-6; })));
  t('accent: light default teal leaves theme.css alone; other presets set the accent tokens', Ac.getAccentVars(Ac.DEFAULT_ACCENT_HEX) === null && Ac.getAccentVars('#800000')['--teal'] === '#800000');
  t('accent: every preset in dark mode reads at 4.5:1 as text on both dark cards, on its tint, and carries dark button text at 4.5:1',
    Ac.ACCENT_PRESETS.every(p => { const v = Ac.getAccentVars(p.hex, true); return K.contrast(v['--teal'], Ac.DARK_SURFACE) >= 4.5 && K.contrast(v['--teal'], '#161d24') >= 4.5 && K.contrast(v['--teal'], Ac.DARK_ON_ACCENT) >= 4.5 && K.contrast(v['--teal-dark'], v['--teal-50']) >= 4.5; }));
  t('accent: server ids and preset hexes round-trip', Ac.ACCENT_PRESETS.every(p => Ac.accentIdFor(Ac.accentHexFor(p.id)) === p.id));
  t('mode: system follows the device, light and dark are fixed', Tm.isDarkMode('dark', false) && !Tm.isDarkMode('light', true) && Tm.isDarkMode('system', true) && !Tm.isDarkMode('system', false));
  t('appearance is painted only by the portal layouts (Design Studio and auth keep the default look)',
    ['src/layouts/CustomerLayout.jsx', 'src/layouts/AdminLayout.jsx'].every(f => /useAppearance\(/.test(src(f))) && !/useAppearance/.test(src('src/pages/client/DesignStudio.jsx')));
  t('settings records: addresses and billing share one kit; no hard-coded status colours left in either',
    ['src/pages/client/AccountSettings.jsx', 'src/pages/client/settings/BillingSection.jsx'].every(f => /from '\.\/(settings\/)?RecordKit'/.test(src(f)) && !/#fef2f2|#f0fdf4|#dc2626|#16a34a/.test(src(f))));
}
// QC inline in Daily Output Log: one write path, one gate, read-only history, recorded-by everywhere.
{
  const src = f => fsx.readFileSync(f, 'utf8'), BE = process.env.VFRB_BACKEND ?? 'C:/laragon/www/vfrb-capstone', be = f => fsx.existsSync(`${BE}/${f}`) ? src(`${BE}/${f}`) : null;
  const dol = src('src/pages/admin/DailyOutputLog.jsx'), form = src('src/components/admin/QCChecklistForm.jsx'), hist = src('src/pages/admin/QCChecklist.jsx');
  t('QC: Daily Output Log shows the checklist inline at the QC stage and says Pressing is blocked until it passes',
    /const atQc = form\.stage === 'qc'/.test(dol) && /\{atQc && \(/.test(dol) && /<QCChecklistForm inline orderId=\{form\.order_id\}/.test(dol) && /Pressing is blocked until QC passes/.test(dol));
  t('QC: the inline form writes to the same endpoint Reports read (POST /api/admin/orders/{id}/qc)', /axios\.post\(`\/api\/admin\/orders\/\$\{orderId\}\/qc`/.test(form));
  t('QC: the QC page is read-only history (GET /api/admin/qc-checklists, no writes, no form)',
    /axios\.get\('\/api\/admin\/qc-checklists'/.test(hist) && !/axios\.(post|put|patch|delete)/.test(hist) && !/<QCChecklistForm/.test(hist));
  t('QC: the form previews pass/fail by the server rule (an optional check answered Fail also fails)', /CHECKS\.every\(\(c\) => checks\[c\.key\] !== false\)/.test(form));
  t('recorded-by name and date: Sales & Pay, Activity Log, QC history and today\'s output use one RecordedBy',
    ['src/pages/admin/SalesTransactions.jsx', 'src/pages/admin/ActivityLog.jsx', 'src/pages/admin/QCChecklist.jsx', 'src/pages/admin/DailyOutputLog.jsx'].every(f => /<RecordedBy name=/.test(src(f)))
    && /RecordedBy name=\{l\.logged_by_name\}/.test(dol) && /RecordedBy name=\{t\.processed_by_name\}/.test(src('src/pages/admin/SalesTransactions.jsx')));
  const svc = be('app/Services/ProductionStageService.php'), prod = be('app/Http/Controllers/Api/ProductionController.php'), qcc = be('app/Http/Controllers/Api/QCChecklistController.php'), act = be('app/Http/Controllers/Api/ActivityLogController.php');
  if (svc) {
    t('QC gate (backend): one rule for output logging and the manager override, latest checklist must have passed',
      /public static function qcBlocked\(object \$order\): bool/.test(svc) && /return ! ?\(\$latest && \$latest->passed\);/.test(svc) && /self::qcBlocked\(\$order\)/.test(svc)
      && /ProductionStageService::qcBlocked\(\$order\)/.test(prod) && !/function checkQCGate/.test(svc + prod));
    t('QC (backend): a passing checklist releases a held QC order once every QC piece is logged; history endpoint is read-only',
      /releaseQcHold\(\$orderId\)/.test(qcc) && /incompleteStages\(\$orderId, 'qc', true\)/.test(svc) && /public function index\(Request \$request\)/.test(qcc));
    t('Activity Log (backend): payments appear with who recorded them, without amounts', /'payment_recorded' as action_type, processed_by as actor_user_id/.test(act) && !/amount_paid|amount_total/.test(act.slice(act.indexOf("'payment_recorded'"), act.indexOf("'payment_recorded'") + 400)));
  }
}
// Rulers origin and grid units; set scale shared by 2D and 3D; template-backed details and garments.
{
  const GA = await L('/src/pages/client/design-studio/garmentAssets.js'), CL = await L('/src/pages/client/design-studio/canvasLayers.js');
  const CG = await L('/src/pages/client/design-studio/canvasGuides.js'), SS = await L('/src/pages/client/design-studio/setScale.js');
  const CT = await L('/src/pages/client/design-studio/garmentCatalog.js'), GD = await L('/src/pages/client/design-studio/garmentDetails.js'), GP = await L('/src/pages/client/design-studio/garmentPaths.js');
  const DF = await L('/src/pages/client/design-studio/derivedFamilies.js'), SC = await L('/src/utils/sizeChart.js');
  const src = f => fsx.readFileSync(f, 'utf8');
  const px = new Uint8ClampedArray(10 * 8 * 4); for (let y = 2; y <= 5; y++) for (let x = 3; x <= 7; x++) px[(y * 10 + x) * 4 + 3] = 255;
  const ob = GA.opaqueBounds(px, 10, 8);
  t('rulers origin: a photo with a transparent border measures from its opaque pixels (6 px border = 0% sits on the cloth)', ob.l === 3 && ob.r === 7 && ob.t === 2 && ob.b === 5 && GA.opaqueBounds(new Uint8ClampedArray(16), 2, 2) === null);
  const img = { getBoundingRect: () => ({ left: 10, top: 20, width: 200, height: 160 }), __content: { ...ob } }; // 10x8 image drawn 20x
  t('rulers origin: garmentBox uses the opaque box for a photo base and the plain box for a vector path', (r => r.left === 70 && r.top === 60 && r.width === 100 && r.height === 80)(CL.baseRect(img))
    && CL.baseRect({ getBoundingRect: () => ({ left: 1, top: 2, width: 3, height: 4 }) }).width === 3 && /__content: src\.__content/.test(src('src/pages/client/design-studio/useGarmentCanvas.js')));
  t('grid units: major grid lines are exactly the always-labelled ruler values (multiples of 50%) at every grid size',
    [5, 10, 20].every(pct => CG.gridLines(0, pct * 2, pct, -400, 800).every(l => l.major === (Math.abs(l.v % 50) < 1e-9))));
  t('one unit system: the pixel-unit ruler/readout helpers are gone; rulers, grid, snap and readout are % of the garment',
    !/rulerTicks|rulerSteps|pinnedTicks|readoutText|GRID_SIZES|gridSize/.test(src('src/pages/client/design-studio/snapGuides.js') + src('src/pages/client/design-studio/useGarmentCanvas.js')));
  const polo = SS.realLength('Polo Shirt', 'Short'), pants = SS.realLength('Pants'), shorts = SS.realLength('Shorts');
  t('set scale: anchored to the PH size chart (size M top body length 70, bottom length 100), not to each template\'s framing',
    SC.chartLengthCm('tops') === 70 && SC.chartLengthCm('bottoms') === 100 && Math.abs(polo.cm - 70) < 1e-9 && Math.abs(pants.cm - 100) < 1e-9 && !polo.approx && !pants.approx);
  t('set scale: base templates keep their drawn ratio within a role (shorts shorter than pants); derived pieces are flagged approximate',
    shorts.cm > 50 && shorts.cm < 70 && !shorts.approx && DF.DERIVED_FAMILIES.filter(d => d.role).every(d => SS.realLength(d.name)?.approx === true));
  const bd = SS.realLength('Button-Down', 'Long'), bdT = SS.templateSpan('Button-Down', 'Long'), poT = SS.templateSpan('Polo Shirt', 'Short');
  const bdLay = SS.setLayout2D({ garment: 'Button-Down', sleeve: 'Long' }, { garment: 'Pants' }), bdD = SS.drawnSpan('Button-Down', 'Long');
  t('set scale: a photo-base piece takes its template length, not the fitted photo height, and is drawn at that length',
    Math.abs(bd.cm - 70 * (bdT.y1 - bdT.y0) / (poT.y1 - poT.y0)) < 1e-9 && bd.cm < 80 && Math.abs((bdD.y1 - bdD.y0) * (bdLay.top.h / bdD.h) - bd.cm) < 1e-6);
  const lay = SS.setLayout2D({ garment: 'Polo Shirt', sleeve: 'Short' }, { garment: 'Pants' });
  t('2D set layout: one px-per-cm for both pieces, bottom waist tucked 10% of the top\'s length under its hem, pieces centred',
    !!lay && Math.abs((lay.extent.y1 - lay.extent.y0) - (70 + 100 - 7)) < 0.5 && Math.abs((lay.top.x + lay.top.w / 2) - (lay.bottom.x + lay.bottom.w / 2)) < 1e-9 && !lay.approx);
  const cvp = src('src/pages/client/design-studio/CanvasViewport.jsx'), psel = src('src/pages/client/design-studio/PiecesRail.jsx');
  t('set view is 2D only: 3D shows one piece at a time (no companion model), rulers step aside for the 2D set, the Set button is hidden in 3D, and a single garment shows only "Add a matching ..."',
    /<SetView2D /.test(cvp) && /!!garmentRect && !set2D/.test(cvp) && /const set2D = showSet && !!setCompanion && viewMode !== '3d';/.test(cvp)
    && !/companion=/.test(cvp) && !/needs a 3D model for both pieces/.test(cvp)
    && /\{uset && setView && \(/.test(psel) && /if \(readOnly \|\| !role\) return null;/.test(psel) && /\{!uset && \(/.test(psel) && /Add a matching \{ROLE_LABEL\[/.test(psel));
  const fams = Object.values(CT.FAMILY_BY_NAME);
  t('details: a control exists only where the 2D template draws that part; photo bases and derived templates get none',
    fams.every(f => GD.detailsFor(f.id, f.styles[0] ?? 'Short').every(o => ['front', 'back'].some(face => { const p = GP.getGarmentPaths(f.id, f.styles[0] ?? 'Short', face); return o.id === 'patchPocket' ? !!p.pocket : p.details.some(d => d.part === o.id); })))
    && DF.DERIVED_FAMILIES.every(d => GD.detailsFor(d.name).length === 0) && GD.detailsFor('Polo Shirt', 'Short').map(o => o.id).join() === 'patchPocket,buttons,closure');
  t('garments with real paths already in the catalog: Mandarin Collar (vector + derived blouse), Pants, Jogger Scrub Pants; derived trousers and slacks are gone; Track Pants stays out (no PE)',
    ['Mandarin Collar', 'Mandarin Blouse', 'Pants', 'Jogger Scrub Pants'].every(n => CT.FAMILY_BY_NAME[n]?.has2D) && ['Straight Trousers', 'Straight Slacks', "Men's Jogger Scrub Pants", "Women's Jogger Scrub Pants"].every(n => !CT.FAMILY_BY_NAME[n]) && !CT.FAMILY_BY_NAME['Track Pants']);
}
// AI design assistant (B5): strict operations only, from a template or from scratch, preview/undo on the one DesignState.
{
  const DE = await L('/src/pages/client/design-studio/designEdits.js'), CT = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const src = f => fsx.readFileSync(f, 'utf8'), BE = process.env.VFRB_BACKEND ?? 'C:/laragon/www/vfrb-capstone';
  const base = { garment: null, sleeve: null, fit: null, colors: { body: '#FFFFFF', collar: '#FFFFFF' }, patterns: {}, patternParams: {} };
  const a = DE.briefToStart({ garmentType: 'Top', collarType: 'Polo Collar', sleeveType: '3/4 Sleeve', category: 'School Uniform', colors: { body: '#1b2a4a', accent: '#ffffff' }, pattern: 'h-stripe', textContent: 'SMITH' }, base);
  t('AI from scratch: a brief maps to one real catalog template by fixed rules, an unoffered sleeve is corrected and said, ops are checked',
    a.cfg.garment === 'Polo Shirt' && !!CT.FAMILY_BY_NAME[a.cfg.garment] && a.cfg.sleeve === 'Short' && a.notes.some(n => /3\/4 Sleeve is not offered/.test(n))
    && a.ops.every(op => DE.checkEdit(op, DE.templateFacts(a.cfg), []) === '') && a.ops.some(op => op.op === 'add_text' && op.placement === 'left_chest'));
  const b = DE.briefToStart({ garmentType: 'Bottom', colors: { body: '#333333', accent: '#ff0000' }, textContent: '' }, base);
  t('AI from scratch: a bottom starts on Pants; an accent with no collar zone is reported, never forced onto another zone',
    b.cfg.garment === 'Pants' && !b.ops.some(op => op.zone === 'collar') && b.notes.some(n => /accent colour was not used/.test(n)));
  const ph = DE.briefToStart({ garmentType: 'Top', collarType: 'V-Neck', sleeveType: 'Short Sleeve', colors: { body: '#123456' }, pattern: 'dots' }, base);
  t('AI from scratch: a pattern the template cannot show (photo base) is listed as not applied, with the reason',
    DE.templateFacts(ph.cfg).patterns.length > 0 || ph.skipped.some(x => x.why === 'pattern not available here'));
  t('B5 client re-check: unknown zones, placements, texts and operations are refused with a plain reason',
    DE.checkEdit({ op: 'set_color', zone: 'hood', hex: '#000000' }, DE.templateFacts({ garment: 'Polo Shirt', sleeve: 'Short' }), []) === 'zone not on this garment'
    && DE.checkEdit({ op: 'move_text', target: 'gone', placement: 'left_chest' }, DE.templateFacts({ garment: 'Polo Shirt', sleeve: 'Short' }), []) === 'text no longer on the design'
    && DE.checkEdit({ op: 'resize_everything' }, {}, []) === 'unknown operation');
  const ds = src('src/pages/client/DesignStudio.jsx'), chat = src('src/pages/client/AIDesignChat.jsx'), drawer = src('src/pages/client/design-studio/ToolDrawer.jsx');
  const FU = (await L('/src/components/site/content.js')).FIND_UNIFORM;
  t('landing "Find your uniform": five tiles, each a real garmentCatalog category with garments; the picker ignores unknown ids',
    FU.length === 5 && FU.every(([, c]) => G.CATALOG.find(x => x.id === c)?.families.length > 0)
    && /CATALOG\.some\(x => x\.id === c\) \? c : null/.test(src('src/pages/client/design-studio/GarmentPicker.jsx')));
  t('B5 preview: re-checks every op, snapshots design + overlays + history; Apply folds it into one undo step, Cancel restores all three and leaves no step',
    /checkEdit\(op, facts, ids\)/.test(ds) && /setAiPreview\(\{ cfg, canvas: getCanvasJSON\(\), result, mark: markHistory\(\) \}\)/.test(ds) && /setCfg\(aiPreview\.cfg\)/.test(ds)
    && /loadCanvasJSON\(aiPreview\.canvas, \{ keepHistory: true \}\)/.test(ds) && /settleHistory\(aiPreview\.mark, false\)/.test(ds) && /settleHistory\(aiPreview\?\.mark, true\)/.test(ds)
    && /> Apply<\/button>/.test(chat) && /Couldn't suggest edits right now\. You can still edit by hand\./.test(chat));
  t('B5 3D: the preview is the one DesignState, so 3D shows it; "See it in 3D" only when a model exists, otherwise it says so',
    /view3D: viewAI3D, has3D: has3DFor\(cfg\)/.test(ds) && /No 3D model for this garment; the 2D design is the preview\./.test(chat));
  t('AI scope: one Studio AI panel of strict B5 operations; no free chat, no sizing, quantity, yardage or price prompts',
    /<AIDesignChat cfg=\{p\.cfg\}/.test(drawer) && !/AIPanel|AIEditPanel/.test(drawer) && !fsx.existsSync('src/pages/client/design-studio/AIPanel.jsx')
    && !/\byards?\b|(?<!box-)\bsizing\b|mode:\s*'chat'|chat_context|QUICK/i.test(chat.replace(/^\s*\/\/.*$/gm, '')) &&!/applyAI\b|applyAIEdits/.test(ds));
  const ai = fsx.existsSync(`${BE}/app/Http/Controllers/Api/AIController.php`) ? src(`${BE}/app/Http/Controllers/Api/AIController.php`) : null;
  if (ai) t('AI scope (backend): describe-design has no free chat branch (no client-supplied prompt is passed to the model)', !/describeDesignChat|chat_context|chat_response/.test(ai));
  t('CLAUDE.md states the approved AI scope', /AI is restricted to raw-material recommendation and strict, deterministic Studio B5 design editing/.test(src('CLAUDE.md')));
}
// Showcase: explicit opt-in with withdraw, manager approval, allowlisted publishing, safe open.
{
  const SG = await L('/src/pages/client/design-studio/ShowcaseGallery.jsx');
  const src = f => fsx.readFileSync(f, 'utf8'), BE = process.env.VFRB_BACKEND ?? 'C:/laragon/www/vfrb-capstone';
  const mine = { name: 'My school polo', garment: 'Polo Shirt', sleeve: 'Short', fit: null, colors: { body: '#111111', collar: '#111111' }, patterns: {}, patternParams: {}, details: {}, inspirationId: 'p1' };
  const opened = SG.openShowcase(mine, { name: 'OTHER CLIENT', garment: 'Pants', colors: { body: '#274C77' }, overlays: [{ text: 'X' }], uniformSet: { id: 'z' } });
  t('showcase open: another client\'s look changes garment and colours only; the customer keeps their own name; no overlays or set are taken',
    opened.garment === 'Pants' && opened.colors.body === '#274C77' && opened.name === 'My school polo' && !('overlays' in opened) && !('uniformSet' in opened) && opened.inspirationId === null
    && SG.openShowcase(mine, { garment: 'Not A Garment' }).garment !== 'Not A Garment');
  const gal = src('src/pages/client/design-studio/ShowcaseGallery.jsx'), cons = src('src/pages/client/design-studio/ShowcaseConsent.jsx'), q = src('src/pages/admin/ShowcaseModerationQueue.jsx');
  t('showcase gallery: never loads another client\'s overlays, shows a load failure honestly, lucide icons and tokens only',
    !/loadCanvasJSON|photo_path\s*\?/.test(gal) && /could not be loaded/.test(gal) && !/rgba\(|#[0-9a-f]{3,6}\b|✕/i.test(gal.replace(/^\s*\/\/.*$/gm, '')));
  t('showcase opt-in: says what is and is never shared before sharing; pending, published and rejected (with reason) shown; withdraw offered; no emoji',
    /SHOWCASE_NOT_SHARED/.test(cons) && /withdraw-showcase/.test(cons) && /Not approved\{note/.test(cons) && !/🏆/.test(src('src/pages/client/design-studio/InspoGallery.jsx')) && /<ShowcaseConsent /.test(src('src/pages/client/design-studio/InspoGallery.jsx')));
  t('showcase moderation: manager sees pending and published, can take a published design down, and is told the label is public',
    /status: 'approved'/.test(q) && /showcase-remove/.test(q) && /never use a person's, school's or company's name/.test(q) && /RequireManager><AdminShowcaseQueue/.test(src('src/App.jsx')));
  const dc = fsx.existsSync(`${BE}/app/Http/Controllers/Api/DesignController.php`) ? src(`${BE}/app/Http/Controllers/Api/DesignController.php`) : null;
  if (dc) t('showcase (backend): public list = approved AND active, through the allowlist with no photo; withdraw and delete end consent',
    /where\('showcase_status', 'approved'\)->where\('is_active', 1\)/.test(dc) && /SHOWCASE_KEYS = \['garment', 'fit', 'sleeve', 'category', 'colors', 'patterns', 'patternParams', 'details', 'templateId'\]/.test(dc)
    && /'photo_path' => null/.test(dc) && /function customerWithdrawShowcase/.test(dc) && /Deleted by the customer/.test(dc));
}
// ---- 2026-10-15: scratch sketches, build your own, pockets, tracing guide, reference-to-2D, set targeting, 3D gating and authored models
{
  const rd = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const CG = await L('/src/pages/client/design-studio/customGarment.js');
  const GP = await L('/src/pages/client/design-studio/garmentPaths.js');
  const GD = await L('/src/pages/client/design-studio/garmentDetails.js');
  const Cp = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const DFx = await L('/src/pages/client/design-studio/derivedFamilies.js');
  const PK = await L('/src/pages/client/design-studio/pocketTools.js');
  const TG = await L('/src/pages/client/design-studio/traceGuide.js');
  const RS = await L('/src/pages/client/design-studio/referenceSketch.js');
  const base = { category: 'School Uniform', garment: 'Polo Shirt', sleeve: 'Short', fit: 'male', colors: { body: '#1b2a4a' } };
  // Scratch is sketches only: Scrub Top and Mandarin Collar open their vector templates (no photo base) with their pocket/button/zip controls.
  const scrub = G.applyGarment(base, 'Scrub Top', { fit: 'unisex', sleeve: 'Short' }), mand = G.applyGarment(base, 'Mandarin Collar', { fit: 'male', sleeve: 'Short' });
  const ids = c => GD.detailsFor(c.garment, c.sleeve, c.fit).map(o => o.id);
  t('scratch: Scrub Top (unisex) and Mandarin Collar (male) open vector sketches with pocket, button and zip controls; Scrub Top has two lower pockets',
    !A.assetFor(scrub.garment, scrub.sleeve, 'front', scrub.fit) && !A.assetFor(mand.garment, mand.sleeve, 'front', mand.fit) && ['patchPocket', 'lowerPockets'].every(i => ids(scrub).includes(i))
    && ['buttons', 'closure'].every(i => ids(mand).includes(i)) && GP.getGarmentPaths('Scrub Top', 'Short').details.filter(d => d.part === 'lowerPockets' && d.kind === 'line').length === 2
    && S.serializeDesign(scrub).templateId === 'scrub-top-sketch-short' && S.deserializeDesign(S.serializeDesign(scrub)).cfg.fit === 'unisex');
  t('scratch template cards never draw a photo base (GarmentPicker has no assetFor); Build your own is the first Scratch card',
    !/assetFor/.test(rd('../src/pages/client/design-studio/GarmentPicker.jsx')) && /<BuildYourOwnCard onPick=\{\(\) => setByo\(true\)\}\/>\s*\{families\.map/.test(rd('../src/pages/client/design-studio/GarmentPicker.jsx')));
  t('Jogger Scrub Pants: a vector template under Medical / Scrubs (no PE category), a bottom, with cuffs, drawstring and side pockets and no fly',
    G.CATALOG.find(c => c.id === 'Medical / Scrubs').families.some(f => f.id === 'Jogger Scrub Pants') && !G.CATALOG.some(c => /PE|Sport/i.test(c.id)) && G.pieceOf('Jogger Scrub Pants') === 'bottom'
    && GP.BASE_PATHS['Jogger Scrub Pants'].details.some(d => d.part === 'sidePockets') && !GP.BASE_PATHS['Jogger Scrub Pants'].details.some(d => d.part === 'closure'));
  // Build your own: clamped, saved, restored, reflected in the sketch, 2D only.
  const wild = CG.normalizeCustom({ neckline: 'cowl', length: 999, fit: -5, hem: 'x', extra: 1 }, CG.CUSTOM_TOP), jog = CG.normalizeCustom({ style: 'straight', cuffs: true, drawstring: true, length: '40' }, CG.CUSTOM_BOTTOM);
  const ysOf = d => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);
  const tall = Math.max(...ysOf(GP.customPaths(CG.CUSTOM_TOP, { length: 100 }).body)), short = Math.max(...ysOf(GP.customPaths(CG.CUSTOM_TOP, { length: 0 }).body));
  const top = G.applyGarment(base, CG.CUSTOM_TOP, { sleeve: 'Sleeveless', custom: { neckline: 'mandarin', length: 70, fit: 30, hem: 'curved' } });
  const back = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(top, {})))).cfg;
  t('build your own: values are clamped (unknown neckline/hem fall back, sliders 0-100, cuffs and drawstring only on joggers)',
    JSON.stringify(wild) === '{"neckline":"v","length":100,"fit":0,"hem":"straight"}' && jog.cuffs === false && jog.drawstring === false && jog.length === 40 && CG.normalizeCustom({}, 'Polo Shirt') === null);
  t('build your own: the choices change the drawn sketch, survive Save -> Reload (cfg.custom, templateId custom-top, sleeve); 2D only (no 3D model)',
    tall > short + 50 && !GP.customPaths(CG.CUSTOM_TOP, {}, 'Sleeveless').sleeveL && back.garment === CG.CUSTOM_TOP && back.sleeve === 'Sleeveless' && JSON.stringify(back.custom) === JSON.stringify(top.custom)
    && S.serializeDesign(top).templateId === 'custom-top' && !Cp.has3DFor(top) && !Cp.has3DFor({ garment: CG.CUSTOM_BOTTOM }) && !G.CATALOG.some(c => c.families.some(f => CG.isCustom(f.id)))
    && CG.describeCustom(CG.CUSTOM_TOP, top.custom).some(l => /Mandarin/.test(l)));
  // Pockets: real layers, saved in overlays, on the spec sheet and admin view, never 3D decals.
  const pocketJson = [{ type: 'group', __pocket: 'flap', __pocketColor: '#c0392b', objects: [] }, { type: 'i-text', text: 'x', __text: true }];
  t('pockets: five presets with panels and stitching, tagged and saved like any overlay, listed per face for the spec sheet and admin order view, excluded from 3D decals',
    PK.POCKET_KINDS.length === 5 && PK.POCKET_KINDS.every(k => PK.pocketGeometry(k.id).panels.length && PK.pocketGeometry(k.id).stitches.length)
    && JSON.stringify(PK.describePockets({ front: pocketJson, back: [] })) === '["Front: Flap pocket #C0392B"]' && PK.mirroredX(10, 50) === 90
    && /'__pocket','__pocketPanels','__pocketColor'/.test(rd('../src/pages/client/design-studio/useGarmentCanvas.js')) && /!o\.__pocket/.test(rd('../src/pages/client/design-studio/overlayDecals.js'))
    && /describePockets/.test(rd('../src/pages/client/design-studio/SpecSheet.jsx')) && /describePockets/.test(rd('../src/components/admin/OrderDesignDetails.jsx')));
  // Tracing guide: a DOM underlay, never in the canvas, the design JSON, exports or the order.
  const tr = TG.normalizeTrace({ src: 'data:image/png;base64,AAAA', opacity: 500, scale: 1, x: 99 });
  t('tracing guide: only image data URLs, values clamped; never a Fabric object, never serialised, never in an export; uploads pass the upload guard',
    tr.opacity === 90 && tr.scale === 25 && tr.x === 60 && TG.normalizeTrace({ src: 'javascript:alert(1)' }) === null && TG.normalizeTrace({ src: 'data:image/svg+xml;base64,AA' }) === null
    && !/(trace|setTrace|traceGuide|ds-trace)/.test(rd('../src/pages/client/design-studio/useGarmentCanvas.js').replace(/^\s*\/\/.*$/gm, '')) && !('trace' in S.serializeDesign({ ...scrub, trace: tr }, {}))
    && /className="ds-trace-slot"/.test(rd('../src/pages/client/design-studio/CanvasViewport.jsx')) && /prepareUpload\(file, kind === 'artwork' \? 'artwork' : 'logo'\)/.test(rd('../src/pages/client/design-studio/useLogoUpload.js')));
  // Reference to 2D: deterministic silhouette reading of synthetic outlines; the customer always confirms; 3D is never claimed.
  const W = 80, H = 100, mk = f => { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = f(x, y) ? 1 : 0; return m; };
  const pantsM = mk((x, y) => y > 10 && y < 95 && x > 20 && x < 60 && !(y > 45 && x > 37 && x < 43));
  const teeM = mk((x, y) => (y > 10 && y < 90 && x > 22 && x < 58) || (y > 12 && y < 35 && x > 5 && x < 75));
  const skirtM = mk((x, y) => { const w = 14 + (y - 10) * 0.35; return y > 10 && y < 70 && Math.abs(x - 40) < w; });
  const kinds = [RS.analyzeSilhouette(pantsM, W, H)?.kind, RS.analyzeSilhouette(teeM, W, H)?.kind, RS.analyzeSilhouette(skirtM, W, H)?.kind];
  t('reference to 2D: two legs read as trousers, a T outline as a sleeved top, a flared outline as a skirt; an empty image is not read; the proposal is a clamped build-your-own spec',
    kinds.join() === 'trousers,top,skirt' && RS.analyzeSilhouette(new Uint8Array(W * H), W, H) === null && RS.sketchFromAnalysis(RS.analyzeSilhouette(teeM, W, H)).garment === CG.CUSTOM_TOP
    && RS.sketchFromAnalysis(null, 'trousers').custom.style === 'straight' && /No 3D from a photo/.test(RS.REF_3D_NOTE), kinds.join());
  // Set targeting: Both mirrors logos, text, shapes, drawings and pockets; the 3D set passes each piece's own overlays.
  const hook = rd('../src/pages/client/design-studio/useGarmentCanvas.js'), d3 = rd('../src/pages/client/DesignStudio3D.jsx');
  t('set "Apply to: Both": every added logo, text, shape, drawing and pocket is offered to the other piece; the 3D set view renders each piece with its own overlays',
    (hook.match(/onAdded\.current\?\.\(/g) ?? []).length >= 5 && /topOverlays=\{companionOverlays\} bottomOverlays=\{overlays\}/.test(d3) && /<GarmentMesh cfg=\{bottom\} overlays=\{bottomOverlays\}\/>/.test(d3));
  // Layer tools: the inspector is reachable (no inner scroll trap); locked items cannot be aligned, duplicated or deleted from the toolbar.
  t('layer tools: the inspector never traps the wheel (inner panels inside the panel scroller do not scroll themselves); the floating toolbar respects a lock',
    /\.ds-panel-scroll \.ds-sum,\.ds-panel-scroll \.ds-ins\{overflow:visible;overscroll-behavior:auto;min-height:auto;\}/.test(rd('../src/pages/client/design-studio/DesignStudioStyles.jsx'))
    && (rd('../src/pages/client/design-studio/FloatingToolbar.jsx').match(/disabled=\{locked\}/g) ?? []).length === 3);
  t("rulers, grid and centre line measure the garment's own zones, never its drop shadow or edge shading",
    /export const isGarmentZone = o => !!o\.__garmentBase && o\.visible !== false && typeof o\.__zoneKey === 'string'/.test(rd('../src/pages/client/design-studio/canvasLayers.js')) && /filter\(isGarmentZone\)/.test(rd('../src/pages/client/design-studio/canvasLayers.js')));
  const cv2 = rd('../src/pages/client/design-studio/CanvasViewport.jsx');
  t('full screen: the Fullscreen API on the Studio root with an app-level expanded fallback, the view restored on exit, a labelled toggle; Fit has its own icon',
    /el\.requestFullscreen\(\{ navigationUI: 'hide' \}\)/.test(cv2) && /setFull\('app'\)/.test(cv2) && /restoreView/.test(cv2) && /ctrl\(full \? 'Exit full screen' : 'Full screen'/.test(cv2) && /<Scan size/.test(cv2));
  // 3D: derived bottoms and the gated Meshy pants are 2D only; Pants, Jogger Scrub Pants and the Scrub Top sketch use the authored meshes.
  t("3D gating: no derived bottom remains (removed 2026-10-16); Straight Slacks has no model of its own and reopens the rebuilt Men's Slacks; Men's Slacks is rebuilt (parametric 2D, keeps its name, no 3D); the Meshy pants file is never routed",
    DFx.DERIVED_FAMILIES.every(d => d.role !== 'bottom') && !Cp.has3DModel('Straight Slacks', null, null) && DFx.REMOVED_GARMENT['Straight Slacks'] === "Men's Slacks"
    && !DFx.REMOVED_GARMENT["Men's Slacks"] && !Cp.scannedEntryFor("Men's Slacks", null, null)
    && !Cp.SCANNED_GARMENTS.some(x => x.models && Object.values(x.models).includes('/models/vfrb-staged/pants.glb')));
  const glbJ = f => { const b = fsx.readFileSync(MF.modelFile(urlx.fileURLToPath(new URL('../public' + f, import.meta.url)))), n = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + n).toString('utf8')); };
  const TOPP = ['body', 'chest_pocket', 'lower_pockets', 'neck_band', 'sleeve_l', 'sleeve_r'];
  const authored = { 'Scrub Top|Short|unisex': TOPP, 'Scrub Top|3/4|unisex': TOPP,
    'Pants|null|null': ['back_pockets', 'fly', 'leg_l', 'leg_r', 'side_pockets', 'waistband'], 'Jogger Scrub Pants|null|null': ['cuffs', 'drawstring', 'leg_l', 'leg_r', 'side_pockets', 'waistband'] };
  t('authored meshes: Scrub Top sketch (Short, 3/4), Pants and Jogger Scrub Pants each load a GLB of named parts, every part with UVs and normals, about 1.9 units tall; parts map to 2D zones and pockets follow the 2D details',
    Object.entries(authored).every(([k, parts]) => { const [g, s0, f0] = k.split('|'); const e = Cp.scannedEntryFor(g, s0 === 'null' ? null : s0, f0 === 'null' ? null : f0); if (!e || !/^\/models\/authored\//.test(Object.values(e.models)[0])) return false;
      const j = glbJ(Object.values(e.models)[0]), pos = j.meshes.map(m => j.accessors[m.primitives[0].attributes.POSITION]);
      return JSON.stringify(j.nodes.map(n => n.name).sort()) === JSON.stringify(parts) && j.meshes.every(m => ['POSITION', 'NORMAL', 'TEXCOORD_0'].every(a => a in m.primitives[0].attributes))
        && Math.max(...pos.map(a => a.max[1])) - Math.min(...pos.map(a => a.min[1])) > 1.75 && e.parts.every(p => parts.includes(p.node)); })
    && Cp.scannedEntryFor('Scrub Top', 'Short', 'unisex').parts.find(p => p.node === 'chest_pocket').detail === 'patchPocket' && Cp.scannedEntryFor('Scrub Top', 'Short', 'male')?.id === 'scrub-top'
    && /details\?\.\[part\.detail\]\?\.show === false/.test(rd('../src/pages/client/design-studio/ScannedGarmentMesh.jsx')) && /details=\{cfg\.details\}/.test(d3)
    && fsx.existsSync(urlx.fileURLToPath(new URL('./glb-extract/build_authored_garments.py', import.meta.url))));
}
// 2026-10-16: 2D fidelity (sketch line, tapered sleeves, jogger options) and removal of derived pieces whose mesh is not garment-only.
{
  const SL = await L('/src/pages/client/design-studio/sketchLine.js'), GPx = await L('/src/pages/client/design-studio/garmentPaths.js');
  const DFy = await L('/src/pages/client/design-studio/derivedFamilies.js'), SERy = await L('/src/pages/client/design-studio/designSerialization.js');
  const USy = await L('/src/pages/client/design-studio/uniformSet.js'), CATy = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const srcy = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  t('sketch line: light ink over dark fills, dark ink over light fills and patterns; canvas, GarmentSilhouette, GarmentThumb and pocket layers all use it; the CSS token mirrors it',
    SL.sketchInk('#1b2a4a') === SL.SKETCH_LINE_ON_DARK && SL.sketchInk('#000') === SL.SKETCH_LINE_ON_DARK && SL.sketchInk('#ffffff') === SL.SKETCH_LINE && SL.sketchInk('#F2F0EC') === SL.SKETCH_LINE && SL.sketchInk(null) === SL.SKETCH_LINE
    && ['useGarmentCanvas.js', 'GarmentSilhouette.jsx', 'GarmentThumb.jsx', 'overlayTools.js'].every(f => /sketchInk\(/.test(srcy(`../src/pages/client/design-studio/${f}`)))
    && srcy('../src/pages/client/design-studio/DesignStudioStyles.jsx').includes(`--ds-sketch-line:${SL.SKETCH_LINE};`));
  const sleeveW = d => { const n = d.match(/-?\d+(\.\d+)?/g).map(Number), dist = (i, j) => Math.hypot(n[i] - n[j], n[i + 1] - n[j + 1]); return { top: dist(0, 2), hem: dist(4, 6), minX: Math.min(n[0], n[2], n[4], n[6]) }; };
  const tapered = ['3/4', 'Long'].flatMap(sl => ['Polo Shirt', 'Scrub Top', 'Custom Top'].map(g => sleeveW(GPx.getGarmentPaths(g, sl).sleeveL)));
  t('3/4 and long sleeves taper to the cuff (hem narrower than the shoulder width, never a bell) and stay on the template', tapered.every(w => w.hem < w.top && w.minX >= 0));
  const jog = GPx.customPaths('Custom Bottom', { style: 'jogger', cuffs: true, drawstring: true }), plain = GPx.customPaths('Custom Bottom', { style: 'jogger' });
  t('build your own: cuffs add a rib band and the drawstring its cords, so the preview shows exactly what was chosen', jog.details.length === plain.details.length + 2);
  t('details panel shows one note; the custom note no longer repeats the "Custom sketch" badge',
    (srcy('../src/pages/client/design-studio/DetailsPanel.jsx').match(/className="ds-det-note"/g) ?? []).length === 1 && !/ds-sketch/.test(srcy('../src/pages/client/design-studio/BuildYourOwn.jsx')));
  t('stage bar: Fit is pressed only while fitted; full screen, stage light, turntable, exploded view and 3D lighting carry visible labels',
    /'aria-pressed': fitted/.test(srcy('../src/pages/client/design-studio/CanvasViewport.jsx')) && ['Turntable', 'Explode', 'LIGHT_PRESETS[lighting].label', 'Full screen'].every(k => srcy('../src/pages/client/design-studio/CanvasViewport.jsx').includes(k)) && /<b>Dark stage<\/b>/.test(srcy('../src/pages/client/design-studio/GuidesMenu.jsx')) && !/ds-stage-lbl/.test(srcy('../src/pages/client/design-studio/CanvasViewport.jsx')));
  {
    const dp = srcy('../src/components/DesignPreview.jsx'), s3d = srcy('../src/pages/client/DesignStudio3D.jsx'), wz = srcy('../src/pages/client/OrderWizard.jsx');
    t('order 3D preview: logos/text ride as decals, turntable is off under reduced motion, a lost context drops to 2D, the snapshot is a PNG upload',
      /overlays=\{overlays\} turntable=\{spin\} captureRef=\{capture\} onContextLost=/.test(dp) && /useState\(\(\) => !calm\(\)\)/.test(dp) && /&& !lost;/.test(dp)
      && /const spin = turntable \?\? ownSpin;/.test(s3d) && /gl\.render\(scene, camera\); return gl\.domElement\.toDataURL\('image\/png'\)/.test(s3d)
      && /fd\.append\('design_3d_snapshot_file', await dataUrlBlob\(f\.design_3d_snapshot\)/.test(wz));
  }
  const removedNames = Object.keys(DFy.REMOVED_GARMENT);
  t('a saved design on a removed derived garment opens its nearest authored template, never crashes; a uniform set keeps the piece in its role',
    removedNames.every(n => { const { cfg } = SERy.deserializeDesign({ garment: n, colors: { body: '#123456' }, templateId: 'derived-x' }); return cfg.garment === DFy.REMOVED_GARMENT[n] && !!GPx.getGarmentPaths(cfg.garment, cfg.sleeve ?? 'Short').body; })
    && (u => u?.pieces.bottom?.garment === 'Pantsuit Trousers' && u.pieces.top?.garment === 'Blazer')(USy.normalizeSet?.({ id: 'x', active: 'top', pieces: { top: { garment: 'Double-Breasted Blazer' }, bottom: { garment: 'Slim Suit Trousers' } } }) ?? { pieces: { top: { garment: 'Blazer' }, bottom: { garment: 'Pantsuit Trousers' } } })
    && removedNames.every(n => !CATy.FAMILY_BY_NAME[n]));
  console.log('removed derived ids: ' + Object.keys(DFy.REMOVED_DERIVED).join(', '));
}
// 2026-10-16: Pantsuit Trousers rebuilt as a parametric family (customGarment PARAM_FAMILIES): own 2D construction from one spec; 2D only.
{
  const CGz = await L('/src/pages/client/design-studio/customGarment.js');
  const Cz = await L('/src/pages/client/design-studio/garmentCapabilities.js'), GCz = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const GPz = await L('/src/pages/client/design-studio/garmentPaths.js'), Sz = await L('/src/pages/client/design-studio/designSerialization.js');
  const DFz = await L('/src/pages/client/design-studio/derivedFamilies.js'), Dz = await L('/src/pages/client/design-studio/designGallery.js');
  const GDz = await L('/src/pages/client/design-studio/garmentDetails.js');
  const PT = 'Pantsuit Trousers';
  t('Pantsuit Trousers spec drives 2D: belt loops off removes the 2D loop lines; length changes the sketch',
    GPz.customPaths(PT, { length: 0 }).h < GPz.customPaths(PT, { length: 100 }).h
    && GPz.customPaths(PT, { beltLoops: false }).details.length === GPz.customPaths(PT, {}).details.length - 1 && GPz.customPaths(PT, {}, 'Short', 'back').details.length === GPz.customPaths(PT, { beltLoops: false }, 'Short', 'back').details.length + 1);
  t('Pantsuit Trousers spec: clamped, unknown keys dropped, family defaults (full length, crease, belt loops), never a jogger option',
    JSON.stringify(CGz.normalizeCustom({ length: 500, width: -3, junk: 1, cuffs: true }, PT)) === '{"length":100,"rise":60,"width":0,"crease":true,"beltLoops":true,"turnUp":false}'
    && CGz.isParametric(PT) && !CGz.isCustom(PT));
  const cfg = GCz.applyGarment(Sz.DEFAULT_CFG, PT, { custom: { width: 70, turnUp: true } }), saved = Sz.deserializeDesign(JSON.parse(JSON.stringify(Sz.serializeDesign(cfg, {})))).cfg;
  t('Pantsuit Trousers: a catalog bottom (Corporate, female), 2D only, a template id, and its spec survives Save -> Reopen',
    GCz.pieceOf(PT) === 'bottom' && GCz.CATALOG.find(c => c.id === 'Corporate').families.some(f => f.id === PT) && !Cz.has3DFor({ garment: PT })
    && GCz.resolveTarget(PT, null, null).status === 'editable-2d' && GCz.resolveTarget(PT, null, null).templateId === 'pantsuit-trousers'
    && saved.garment === PT && saved.custom.width === 70 && saved.custom.turnUp === true);
  t('Pantsuit Trousers: old designs keep the name (no remap to Pants); the gallery set photo opens it as the bottom; the removed derived cut stays unregistered',
    !GCz.LEGACY_GARMENT[PT] && DFz.derivedPiecesFor('pantsuit-notch-short-gray')?.bottom === PT && !DFz.DERIVED_BY_NAME[PT]
    && Dz.ENTRIES.some(d => d.id === 'pantsuit-notch-short-gray'));
  t('Pantsuit Trousers Details: side/back pockets, buttons and fly trim are offered',
    ['sidePockets', 'backPockets', 'buttons', 'closure'].every(id => GDz.detailsFor(PT, null, null).some(o => o.id === id)));
  t("Men's Slacks and Creased Trousers: rebuilt tailored families (male / female), own template ids, 2D only; their set photos open them",
    [["Men's Slacks", 'polo-barong-brown', 'mens-slacks', 'male'], ['Creased Trousers', 'blouse-roundneck-mustard', 'creased-trousers', 'female']].every(([g, ref, tid, fit]) =>
      !Cz.has3DFor({ garment: g }) && GCz.resolveTarget(g, null, null).templateId === tid
      && GCz.pieceOf(g) === 'bottom' && CGz.PARAM_FAMILIES[g].fit === fit && DFz.derivedPiecesFor(ref)?.bottom === g && !GCz.LEGACY_GARMENT[g])
    && GPz.customPaths("Men's Slacks", null).body !== GPz.customPaths(PT, null).body);
  t('Midi Pencil Skirt: rebuilt parametric skirt (midi default, length slider), 2D only, opened by the peplum set photo',
    CGz.normalizeCustom(null, 'Midi Pencil Skirt').length === 78
    && !Cz.has3DFor({ garment: 'Midi Pencil Skirt' }) && GCz.pieceFacet('Midi Pencil Skirt') === 'skirt' && DFz.derivedPiecesFor('peplum-set-navy')?.bottom === 'Midi Pencil Skirt'
    && GCz.resolveTarget('Midi Pencil Skirt', null, null).templateId === 'midi-pencil-skirt');
}
// 2026-10-16: the three rebuilt tops (Short-Sleeve Notch Jacket, Peplum Top, Barong Shirt) and the gallery sets that open rebuilt pieces.
{
  const CGz = await L('/src/pages/client/design-studio/customGarment.js');
  const Cz = await L('/src/pages/client/design-studio/garmentCapabilities.js'), GCz = await L('/src/pages/client/design-studio/garmentCatalog.js');
  const GPz = await L('/src/pages/client/design-studio/garmentPaths.js'), Sz = await L('/src/pages/client/design-studio/designSerialization.js');
  const Dz = await L('/src/pages/client/design-studio/designGallery.js'), USz = await L('/src/pages/client/design-studio/uniformSet.js');
  t('peplum flare drives 2D: a fuller flare changes the sketch, and the 2D draws the back zip',
    GPz.customPaths('Peplum Top', { flare: 100 }).body !== GPz.customPaths('Peplum Top', { flare: 0 }).body
    && GPz.customPaths('Peplum Top', null, 'Short', 'back').details.some(d => d.part === 'closure'));
  t("rebuilt tops: construction is fixed (neckline/hem cannot be changed), sleeves are the family's own",
    CGz.normalizeCustom({ neckline: 'v', hem: 'curved' }, 'Short-Sleeve Notch Jacket').neckline === 'notch' && CGz.normalizeCustom({ neckline: 'v' }, 'Barong Shirt').hem === 'vents'
    && JSON.stringify(GCz.FAMILY_BY_NAME['Barong Shirt'].styles) === '["Short","Long"]' && GCz.resolveSleeve('Short-Sleeve Notch Jacket', 'Long') === 'Short');
  t('rebuilt tops are catalog tops, 2D only, own template ids',
    [['Short-Sleeve Notch Jacket', 'Short', 'short-sleeve-notch-jacket'], ['Peplum Top', 'Short', 'peplum-top'], ['Barong Shirt', 'Long', 'barong-shirt']].every(([g, sl, tid]) =>
      GCz.pieceOf(g) === 'top' && !Cz.has3DFor({ garment: g, sleeve: sl }) && GCz.resolveTarget(g, sl, null).templateId === tid));
  // Gallery sets: each photo opens its own top and the rebuilt bottom; Save -> Reopen -> Order keeps garment, measurements, colours, gallery id, template and model.
  const SETS7 = { 'blazer-double-breasted-gray': ['Blazer', 'Pantsuit Trousers'], 'blazer-pinstripe-navy': ['Blazer', 'Pantsuit Trousers'], 'shirt-two-tone-gpc': ['Button-Down', "Men's Slacks"],
    'bir-blouse-trousers-blue': ['Button-Down', 'Pantsuit Trousers'], 'pantsuit-notch-short-gray': ['Short-Sleeve Notch Jacket', 'Pantsuit Trousers'],
    'peplum-set-navy': ['Peplum Top', 'Midi Pencil Skirt'], 'polo-barong-brown': ['Barong Shirt', "Men's Slacks"] };
  const why = {};
  const bad = Object.entries(SETS7).filter(([id, [top, bottom]]) => {
    const e = Dz.ENTRIES.find(d => d.id === id), t0 = Dz.openTarget(e, {});
    if (!e || e.pieces?.top !== top || e.pieces?.bottom !== bottom || t0?.garment !== top) { why[id] = `pieces ${e?.pieces?.top}/${e?.pieces?.bottom} opens ${t0?.garment}`; return true; }
    const mk = (g, extra) => ({ ...GCz.applyGarment(Sz.DEFAULT_CFG, g, { ...(g === top ? t0 : {}), inspirationId: id, ...extra }), colors: { ...Sz.DEFAULT_CFG.colors, body: g === top ? '#2a3b5c' : '#1b1b1b' } });
    const tc = mk(top, CGz.isParametric(top) ? { custom: { length: 61, fit: 37 } } : {}), bc = mk(bottom, { custom: CGz.kindOf(bottom) === 'skirt' ? { length: 66 } : { length: 83, width: 71 } });
    const ser = c => JSON.parse(JSON.stringify(Sz.serializeDesign(c, {})));
    const snap = USz.withSet(ser(tc), { id: 'set-' + id, active: 'top', pieces: { top: ser(tc), bottom: ser(bc) } });
    const queue = USz.orderQueue(JSON.parse(JSON.stringify(snap)));
    if (!queue || queue.length !== 2) { why[id] = 'queue'; return true; }
    return [tc, bc].some((c, i) => {
      const o = Sz.deserializeDesign(JSON.parse(JSON.stringify(queue[i]))).cfg, r0 = GCz.resolveTarget(c.garment, c.sleeve, c.fit), r1 = GCz.resolveTarget(o.garment, o.sleeve, o.fit);
      const fail = o.garment !== c.garment || JSON.stringify(o.custom ?? null) !== JSON.stringify(c.custom ?? null) || o.colors.body !== c.colors.body || o.inspirationId !== id
        || r1.templateId !== r0.templateId || r1.glb !== r0.glb || Cz.scannedEntryFor(o.garment, o.sleeve, o.fit)?.id !== Cz.scannedEntryFor(c.garment, c.sleeve, c.fit)?.id
        || queue[i].uniformSet.role !== ['top', 'bottom'][i];
      if (fail) why[id] = `${['top', 'bottom'][i]} ${o.garment} custom ${JSON.stringify(o.custom)} vs ${JSON.stringify(c.custom)} insp ${o.inspirationId}`;
      return fail;
    });
  }).map(([id]) => id);
  t('7 gallery sets open their top and the rebuilt bottom, and Save -> Reopen -> Order (uniform set queue) keeps garment, measurements, colours, gallery id, template and model for both pieces', bad.length === 0, JSON.stringify(why));
}
{ // Administrator (Station): hidden manager-only controls; Settings opens on the Password section only
  const JA = await L('/src/utils/jobAccess.js'), rd = q => fsx.readFileSync(urlx.fileURLToPath(new URL(q, import.meta.url)), 'utf8');
  const st = { role: 'staff', assigned_stage: 'cutting' }, inv = rd('../src/pages/admin/Inventory.jsx'), od = rd('../src/pages/admin/OrderDetail.jsx'), se = rd('../src/pages/admin/Settings.jsx'), lay = rd('../src/layouts/AdminLayout.jsx');
  t('station: Inventory hides Export CSV/PDF and the Transaction log tab; Order detail hides Client materials',
    /\{!isStation\(\) && <>\s*<button[^\n]*exportStock\('csv'\)[\s\S]*?Export PDF'\}<\/button>\s*<\/>\}/.test(inv) && /isStation\(\) \? \[\] : \[\{ key:'logs'/.test(inv) && /tab==='logs' && !isStation\(\)/.test(inv) && /\{!isStation\(\) && <ClientMaterialsPanel/.test(od));
  t('station: can open /admin/settings for the Password section only (no settings fetches); manager and owner unchanged',
    JA.canOpen('/admin/settings', st) && JA.STATION_SETTINGS.join() === 'password' && /filter\(\(\[k\]\) => !station \|\| STATION_SETTINGS\.includes\(k\)\)/.test(se) && /if \(station\) return;\s*loadCompany/.test(se)
    && JA.canOpen('/admin/settings', { role: 'manager' }) && !JA.canOpen('/admin/settings', { role: 'owner' }) && !JA.canOpen('/admin/materials', st));
  t('station: sidebar footer role label wraps in full', JA.roleLabel(st) === 'Administrator (Station) · Cutting' && /\.adm-sb-user small \{[^}]*overflow-wrap: anywhere[^}]*\}/.test(lay) && !/\.adm-sb-user small \{[^}]*ellipsis/.test(lay));
}
{ // Login "Request access": the honeypot is off-screen and unfocusable, and the POST carries only the five form fields
  const RA = await L('/src/pages/auth/RequestAccess.jsx'), src = fsx.readFileSync(urlx.fileURLToPath(new URL('../src/pages/auth/RequestAccess.jsx', import.meta.url)), 'utf8');
  const hp = src.match(/<div style=\{HONEYPOT_STYLE\} aria-hidden="true">[\s\S]*?<\/div>/)?.[0] ?? '', s = RA.HONEYPOT_STYLE;
  t('request access: the "website" honeypot sits off-screen in an aria-hidden wrapper with tabIndex -1',
    s.position === 'absolute' && parseInt(s.left, 10) <= -1000 && s.width === 1 && s.overflow === 'hidden' && /name="website" tabIndex=\{-1\}/.test(hp));
  const cfg = RA.accessRequestConfig({ name: ' Ana ', organization: '', email: 'a@b.ph ', mobile: '', website: '', password: 'x', token: 'y' });
  t('request access: the submit sends no credentials (no cookies, no token, fresh axios instance) and only name/organization/email/mobile/website',
    cfg.withCredentials === false && !cfg.headers && cfg.url === '/api/request-access' && Object.keys(cfg.data).join() === 'name,organization,email,mobile,website'
    && cfg.data.name === 'Ana' && /axios\.create\(\)\.request\(accessRequestConfig\(form\)\)/.test(src) && !/axios\.(post|request)\(/.test(src));
}
{ // Flats from GLB (tools/flat-from-glb.mjs): every authored Scrub Top part has a same-id zone path in its front or back SVG flat
  for (const [sleeve, id] of [['Short', 'scrub-top-vneck-short'], ['3/4', 'scrub-top-vneck-three-quarter']]) {
    const entry = Cp.scannedEntryFor('Scrub Top', sleeve, 'unisex'), nodes = (entry?.parts ?? []).map(p => p.node);
    const svg = f => fsx.readFileSync(urlx.fileURLToPath(new URL(`../src/assets/flats/${id}/${f}.svg`, import.meta.url)), 'utf8');
    const ids = new Set(['front', 'back'].flatMap(f => [...svg(f).matchAll(/<path id="([^"]+)"/g)].map(m => m[1])));
    t(`flats: ${id} front/back SVG zones match every 3D part (${nodes.join(', ')})`,
      entry?.models?.unisex?.endsWith(`/${id}.glb`) && nodes.length > 0 && nodes.every(n => ids.has(n)) && [...ids].every(n => nodes.includes(n)));
  }
}
{ // Studio flats: the unisex Scrub Top draws the GLB flat fitted to the top() body box; an older saved design keeps its colours and pockets
  const GP = await L('/src/pages/client/design-studio/garmentPaths.js'), GD = await L('/src/pages/client/design-studio/garmentDetails.js');
  const OD = await L('/src/pages/client/design-studio/overlayDecals.js'), T = GP.BASE_PATHS['Scrub Top'];
  const corners = d => (n => (xs => (ys => [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)])(n.filter((_, i) => i % 2)))(n.filter((_, i) => i % 2 === 0)))(d.match(/-?\d+(\.\d+)?/g).map(Number));
  let shift = 0;
  for (const sl of ['Short', '3/4']) for (const face of ['front', 'back']) {
    const p = GP.getGarmentPaths('Scrub Top', sl, face), a = corners(p.body), b = corners(face === 'back' ? T.back?.body ?? T.body : T.body);
    shift = Math.max(shift, ...a.map((v, i) => Math.abs(v - b[i])));
    t(`flats: Scrub Top ${sl} ${face} uses the flat with every zone (pocket front only), stitches dashed`, !!p.flat && !!(p.body && p.collar && p.sleeveL && p.sleeveR)
      && !!p.pocket === (face === 'front') && p.details.some(d => d.kind === 'seam') && p.details.some(d => d.part === 'lowerPockets') === (face === 'front'));
  }
  t(`flats: body box equals the top() template, so a logo at any body corner moves ${shift}px (max 0.1)`, shift <= 0.1);
  t('flats: other garments, other sleeves and the canvas size are unchanged', !GP.getGarmentPaths('Scrub Top', 'Long').flat && !GP.getGarmentPaths('Polo Shirt', 'Short').flat
    && GP.getGarmentPaths('Scrub Top', 'Short').w === T.w && GP.getGarmentPaths('Scrub Top', 'Short').h === T.h && OD.bodyBounds('Scrub Top', 'Short').y1 === corners(T.body)[3]);
  const colors = { body: '#112233', collar: '#aabbcc', sleeve: '#445566', pocket: '#778899' };
  const old = S.deserializeDesign({ garment: 'Scrub Top', category: 'Medical', sleeve: 'Short', fit: 'unisex', colors, details: { lowerPockets: { show: false } } }).cfg;
  const shown = GD.detailedPaths('Scrub Top', 'Short', 'front', old.details);
  t('flats: a Scrub Top saved before the flats opens with the same zone colours and its hidden lower pockets stay hidden',
    Object.entries(colors).every(([k, v]) => old.colors[k] === v) && !!shown.flat && !shown.details.some(d => d.part === 'lowerPockets') && !!shown.pocket
    && GD.detailsFor('Scrub Top', 'Short', 'unisex').map(o => o.id).join() === 'patchPocket,lowerPockets');
  console.log(`flats: body h/w ${['Short', '3/4'].map(sl => `${sl} flat ${GP.getGarmentPaths('Scrub Top', sl).flatRatio}`).join(', ')}, template ${(c => ((c[3] - c[2]) / (c[1] - c[0])).toFixed(2))(corners(T.body))}`);
}
{ // Size chart to generator settings, the 12 program garments, their 3D labels and zone parity (docs/FLATS.md)
  const GP = await L('/src/pages/client/design-studio/garmentPaths.js'), CG = await L('/src/pages/client/design-studio/customGarment.js');
  const CAT = await L('/src/pages/client/design-studio/garmentCatalog.js'), CP = await L('/src/pages/client/design-studio/garmentCapabilities.js');
  const ZONES = ['body', 'collar', 'sleeveL', 'sleeveR', 'pocket'], keys = p => ZONES.filter(z => p[z]).join();
  const nums = d => d.match(/-?\d+(\.\d+)?/g).map(Number), span = (d, o) => (v => Math.max(...v) - Math.min(...v))(nums(d).filter((_, i) => i % 2 === o));
  const SL = ['Short', '3/4', 'Long', 'Sleeveless'], FACES = ['front', 'back'];
  t('size chart: size M (and an unknown size) redraws every template exactly as before, so saved designs keep their shapes and zones',
    Object.keys(GP.BASE_PATHS).every(g => SL.every(s => FACES.every(f => [{ size: 'M' }, { size: '??' }].every(z => JSON.stringify(GP.getGarmentPaths(g, s, f, z)) === JSON.stringify(GP.getGarmentPaths(g, s, f)))))));
  const grows = (g, s) => (p => p.every((x, i) => !i || (span(x.body, 0) > span(p[i - 1].body, 0) && span(x.body, 1) > span(p[i - 1].body, 1))))(['XS', 'M', '3XL'].map(size => GP.getGarmentPaths(g, s, 'front', { size })));
  t('size chart: XS < M < 3XL in body width and length for tops, trousers and skirts; ratios come from the chart (3XL body length 78/70)',
    [['Polo Shirt', 'Short'], ['Lab Coat', 'Long'], ['Barong Shirt', 'Long'], ['Pants', null], ["Men's Slacks", null], ['Skirt', null]].every(([g, s]) => grows(g, s ?? 'Short'))
    && Math.abs(CG.sizeRatios('tops', '3XL')['Body Length'] - 78 / 70) < 1e-9 && Math.abs(CG.sizeRatios('bottoms', 'XS').Rise - 1) < 1e-9);
  const shW = (g, fit) => -nums(GP.getGarmentPaths(g, 'Short', 'front', { size: 'M', fit }).sleeveL)[0]; // left shoulder point: further left = wider
  t("size chart: the women's cut narrows an unshaped top; an already-shaped Blouse keeps its own cut", shW('Polo Shirt', 'female') < shW('Polo Shirt', 'male') && shW('Blouse', 'female') === shW('Blouse', 'male'));
  t('size chart: every sized drawing stays inside its canvas', ['XS', '3XL'].every(size => [['Polo Shirt', 'Long'], ['Scrub Top', '3/4'], ['Lab Coat', 'Long'], ['Pantsuit Trousers', 'Short']].every(([g, s]) => {
    const p = GP.getGarmentPaths(g, s, 'front', { size }), n = ZONES.filter(z => p[z]).flatMap(z => nums(p[z]));
    return n.every((v, i) => v >= 0 && v <= (i % 2 ? p.h : p.w));
  })));
  const TARGETS = [['Scrub Top', 'Short'], ['Scrub Top', '3/4'], ['Jogger Scrub Pants', null], ['Polo Shirt', 'Short'], ['Polo Shirt', 'Long'], ['Lab Coat', 'Long'], ['Mandarin Blouse', 'Short'],
    ['Round Neck', 'Long'], ['Barong Shirt', 'Short'], ['Barong Shirt', 'Long'], ["Men's Slacks", null], ['Pantsuit Trousers', null]];
  const opened = TARGETS.map(([g, s]) => ({ g, s, c: G.applyGarment({ ...base, fit: null }, g, s ? { sleeve: s } : {}) }));
  t('program garments: all 12 open an editable 2D template with named zones, on the asked sleeve, each family once',
    opened.every(({ g, s, c }) => c.garment === g && c.sleeve === s && CAT.familyFor(g)?.has2D && Sh.zonesFor(g, s, c.fit).includes('body') && !!GP.getGarmentPaths(g, s ?? 'Short').body)
    && new Set(Object.keys(CAT.FAMILY_BY_NAME).map(n => n.toLowerCase())).size === Object.keys(CAT.FAMILY_BY_NAME).length);
  t('program garments: the 3D label is has3DFor\'s answer; Polo Long and Round Neck Long have no model and say "3D not available"',
    opened.every(({ c }) => CAT.label3D(c) === (CP.has3DFor(c) ? '3D (approx.)' : '3D not available'))
    && ['Polo Shirt', 'Round Neck'].every(g => ['male', 'female'].every(fit => CAT.label3D({ garment: g, sleeve: 'Long', fit }) === '3D not available'))
    && CAT.label3D({ garment: 'Polo Shirt', sleeve: 'Short', fit: 'male' }) === '3D (approx.)');
  console.log(`program garments: ${opened.map(({ g, s, c }) => `${g}${s ? ' ' + s : ''} = ${CAT.label3D(c)}`).join('; ')}`);
  const SP = (await L('/src/pages/client/design-studio/SizeProportions.jsx')).default, sp = (garment, sizes) => renderToString(React.createElement(SP, { studio: { garment, sleeve: 'Long', fit: 'male', colors: {} }, sizes }));
  t('Order Wizard size row: one drawing per ordered size in chart order, on one shared frame; none for a traced template or no sizes; no cm anywhere',
    (h => (h.match(/<svg/g) ?? []).length === 2 && h.indexOf('>XS<') < h.indexOf('>3XL<') && new Set(h.match(/viewBox="[^"]+"/g).map(v => v.split(' ').slice(2).join())).size === 1 && !/\bcm\b|\d+–\d+/.test(h))(sp('Polo Shirt', { '3XL': 10, XS: 5, M: 0 }))
    && sp('Mandarin Blouse (Reference)', { M: 5 }) === '' && sp('Polo Shirt', {}) === '' && GP.sizable("Men's Slacks") && GP.sizable('Mandarin Blouse') && !GP.sizable('Mandarin Blouse (Reference)'));
  // M5: Mandarin Blouse is parametric (size chart, own zones, no model); the traced outline stays for saved designs and its photo only.
  const mb = G.applyGarment({ ...base, fit: null }, 'Mandarin Blouse', { sleeve: 'Long' }), mbp = GP.getGarmentPaths('Mandarin Blouse', 'Long');
  t('M5 Mandarin Blouse: parametric top with body, collar and both sleeves; Short and Long; one picker entry; "3D not available" from has3DFor',
    ['body', 'collar', 'sleeveL', 'sleeveR'].every(z => !!mbp[z]) && mb.sleeve === 'Long' && CAT.FAMILY_BY_NAME['Mandarin Blouse'].styles.join() === 'Short,Long'
    && G.CATALOG.flatMap(c => c.families.map(f => f.id)).filter(n => /^Mandarin Blouse/.test(n)).every(n => n === 'Mandarin Blouse')
    && !CP.has3DFor(mb) && CAT.label3D(mb) === '3D not available' && S.serializeDesign({ ...mb, overlays: [] }).templateId === 'mandarin-blouse'
    && S.deserializeDesign(S.serializeDesign({ ...mb, overlays: [] })).cfg.garment === 'Mandarin Blouse');
  const oldMb = S.deserializeDesign({ garment: 'Mandarin Blouse', templateId: 'derived-blouse-mandarin-yellow', colors: { body: '#c9a227' } }).cfg;
  t('M5 old traced Mandarin Blouse design: its saved templateId reopens the traced outline with the same colour and 3D status; the photo still opens it',
    oldMb.garment === 'Mandarin Blouse (Reference)' && oldMb.colors.body === '#c9a227' && Sh.zonesFor(oldMb.garment, oldMb.sleeve, oldMb.fit).join() === 'body'
    && CP.has3DFor(oldMb) && CAT.label3D(oldMb) === '3D (approx.)'
    && D.openTarget(D.ENTRIES.find(d => d.id === 'blouse-mandarin-yellow'), {})?.garment === 'Mandarin Blouse (Reference)');
  // Tier 1 (GLB flats) keep the part-name parity check above; Tier 2 (generator templates) must keep the generator's zone keys at every size.
  const tier2 = opened.filter(({ g, s }) => !GP.getGarmentPaths(g, s ?? 'Short').flat);
  t(`zone parity: ${tier2.length} Tier 2 garments draw the generator's zone keys, unchanged by size and fit`, tier2.length === 10 && tier2.every(({ g, s }) => {
    const sl = s ?? 'Short', gen = CG.isParametric(g) ? GP.customPaths(g, null, sl) : (GP.SLEEVE_VARIANTS[sl] ?? (b => b))(GP.BASE_PATHS[g]);
    return [null, { size: 'XS' }, { size: '3XL', fit: 'female' }].every(z => keys(GP.getGarmentPaths(g, sl, 'front', z)) === keys(gen));
  }));
}
console.log(out.join('\n')); const f =out.filter(x => x.startsWith('FAIL')).length; console.log(`${out.length - f}/${out.length} passed`);
await v.close(); process.exit(f ? 1 : 0);
