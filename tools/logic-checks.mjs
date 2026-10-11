// Run: node tools/logic-checks.mjs   (garment state rules, photo gallery data, photo base, shared preview SSR render)
import { createServer } from 'vite';
const v = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const L = p => v.ssrLoadModule(p);
const G = await L('/src/pages/client/design-studio/garmentCatalog.js');
const S = await L('/src/pages/client/design-studio/designSerialization.js');
const D = await L('/src/pages/client/design-studio/designGallery.js');
const A = await L('/src/pages/client/design-studio/garmentAssets.js');
const Sh = await L('/src/pages/client/design-studio/dsShared.js');
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const Prev = (await L('/src/components/DesignPreview.jsx')).default;
const out = []; const t = (n, c) => out.push((c ? 'PASS ' : 'FAIL ') + n);
const base = { category: 'School Uniform', garment: 'Polo Shirt', sleeve: 'Short', fit: 'female' };
t('pants null sleeve/fit', (c => c.sleeve === null && c.fit === null)(G.applyGarment(base, 'Pants')));
t('Pants 2D has no photo base; a selected valid pattern is supported by its vector design', !A.assetFor('Pants', null, 'front') && Sh.pattern3D('Pants', null, null, 'body', 'hstripes') === true);
t('switching to a pattern-free photo base clears saved pattern and slider state', (c => Object.keys(c.patterns).length === 0 && Object.keys(c.patternParams).length === 0 && !!A.assetFor(c.garment, c.sleeve, 'front', c.fit))(G.applyGarment({ ...base, patterns: { body: 'hstripes' }, patternParams: { body: { width: 6, spacing: 8 } } }, 'Scrub Top')));
t('photo-base stale patterns are removed on Save and Reload', (() => { const photo = G.applyGarment(base, 'Scrub Top'); const raw = S.serializeDesign({ ...photo, patterns: { body: 'hstripes' }, patternParams: { body: { width: 6 } } }); const loaded = S.deserializeDesign(JSON.parse(JSON.stringify(raw))); return raw.patterns.body === 'solid' && loaded.cfg.patterns.body === 'solid' && Object.keys(loaded.cfg.patternParams).length === 0; })());
t('Pants pattern and color survive Save -> Reload -> Order Wizard snapshot', (() => { const cfg = { ...G.applyGarment(base, 'Pants'), colors: { body: '#274c77' }, patterns: { body: 'hstripes' }, patternParams: { body: { width: 6, spacing: 8 } } }; const saved = S.serializeDesign(cfg, {}); const loaded = S.deserializeDesign(JSON.parse(JSON.stringify(saved))); const order = S.serializeDesign(loaded.cfg ?? loaded, {}); return loaded.cfg.garment === 'Pants' && loaded.cfg.colors.body === '#274c77' && loaded.cfg.patterns.body === 'hstripes' && loaded.cfg.patternParams.body.width === 6 && order.patterns.body === 'hstripes'; })());
t('polo forced Short', G.applyGarment({ ...base, sleeve: 'Long' }, 'Polo Shirt').sleeve === 'Short');
const E0 = id => D.ENTRIES.find(d => d.id === id);
t('gallery = 40 photos only (20 original + 15 worn cutouts + 5 v3 product photos)', D.ENTRIES.length === 40 && D.ENTRIES.every(d => d.kind === 'photo') && D.ENTRIES.filter(d => d.source === 'worn').length === 15 && D.ENTRIES.filter(d => d.source === 'product').length === 5);
t('no template names as entries', !D.ENTRIES.some(d => ['Polo Shirt', 'Pants', 'Shorts', 'Skirt', 'Round Neck', 'Button-Down'].includes(d.name)));
t('metadata shape', D.ENTRIES.every(d => d.id && d.image && d.label && d.category && d.piece && 'gender' in d && 'sleeve' in d && 'garmentFamily' in d && typeof d.editable2D === 'boolean' && (d.glb === null || d.glb === d.glbSrc) && d.templateId === d.id && d.previewSrc === d.image && 'glbStatus' in d && Array.isArray(d.zones) && d.faces && d.source && d.status));
t('only exact slot-backed photos, or photos their family model was generated from, have 3D', JSON.stringify(D.ENTRIES.filter(d => d.has3D).map(d => d.id).sort()) === JSON.stringify(['bir-blouse-trousers-blue', 'blazer-blouse-blue', 'blazer-collarless-tan', 'blazer-pinstripe-royal', 'blazer-tweed-herringbone', 'blazer-white-notch', 'blouse-roundneck-fuchsia', 'dress-bir-green-yellow-collar', 'pants', 'polo-red-claremont', 'school-skirt', 'scrub-set-housekeeping', 'scrub-set-men-vneck', 'scrub-set-women-vneck', 'shirt-mandarin-polkadot', 'shirt-utility-beige-long', 'shorts']) && D.ENTRIES.filter(d => d.has3D).every(d => d.glbStatus === 'approx' && (d.base[3] ? d.glbSrc === '/models/garments/' + d.base[3] + '.glb' : d.glbSrc === `/models/vfrb-staged/${({ 'shirt-mandarin-polkadot': 'shirt-mandarin-long-male', 'polo-red-claremont': 'polo-shirt-unisex-short', 'blazer-collarless-tan': 'collarless-blazer-long', 'blazer-pinstripe-royal': 'collarless-blazer-short' })[d.id] ?? d.id}.glb`)));
t('statuses are reference/editable-2d/2d-3d-approx, 3D tier only with a live GLB', D.ENTRIES.every(d => ['reference', 'editable-2d', '2d-3d-approx'].includes(d.tier) && (d.tier === '2d-3d-approx') === !!d.glbSrc));
t('search blazer = 8', D.filterDesigns({ q: 'blazer' }).length === 8);
t('search mandarin >= 3', D.filterDesigns({ q: 'mandarin' }).length >= 3);
t('filter medical = 2 scrub sets', D.filterDesigns({ category: 'medical' }).length === 2 && D.filterDesigns({ category: 'medical' }).every(d => d.piece === 'set'));
t('unisex has 1 photo (the embroidered polo)', D.facetCounts({}).gender.unisex === 1);
t('19 editable photos (yellow blouse stays reference-only; polka-dot, red polo, pleated skirt, notch blouse, four blazers and the shirt-dress open their own families)', D.ENTRIES.filter(d => d.editable2D).length === 19 && E0('shirt-utility-beige-long').editable2D && !E0('blouse-mandarin-yellow').editable2D && E0('shirt-mandarin-polkadot').editable2D && ['school-skirt', 'blazer-blouse-blue', 'blazer-tweed-herringbone', 'blazer-white-notch', 'dress-bir-green-yellow-collar'].every(id => E0(id).editable2D));
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
t('yellow mandarin blouse is reference-only (no wrong base)', E('blouse-mandarin-yellow').tier === 'reference' && D.openTarget(E('blouse-mandarin-yellow'), {}) === null);
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
t('resolveTarget Button-Down Short keeps the capped work shirt GLB, no photo', (r => r.assetId === null && r.glb === '/models/processed/work-shirt-short-sleeve-capped.glb')(G.resolveTarget('Button-Down', 'Short')));
t('Button-Down Short + Female: no photo base, capped work-shirt model (no fake women\'s photo)', (r => r.assetId === null && r.glb === '/models/processed/work-shirt-short-sleeve-capped.glb')(G.resolveTarget('Button-Down', 'Short', 'female')));
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
// Text fonts: only named families are probed; generic-only stacks are always kept so the list is never empty.
const FA = await L('/src/pages/client/design-studio/fontAvailable.js');
t('primaryFamilies skips generics and emoji', JSON.stringify(FA.primaryFamilies("Arial Black, 'Arial Bold', sans-serif, 'Apple Color Emoji'")) === JSON.stringify(['Arial Black', 'Arial Bold']));
t('generic-only stack has no probe family', FA.primaryFamilies('cursive').length === 0 && FA.primaryFamilies('ui-sans-serif, system-ui, sans-serif').length === 0);
t('availableFonts without a canvas keeps every font', FA.availableFonts([{ id: 'a', css: 'Papyrus, fantasy' }]).length === 1);
// Hero: Button-Down / Short / unisex work shirt has an explicit vector templateId that survives save/restore; photo ids and old records are unaffected.
{ const HID = 'button-down-work-shirt-short', hc = { ...base, garment: 'Button-Down', sleeve: 'Short', fit: 'unisex' };
  const sv = S.serializeDesign(hc, {}), r = S.deserializeDesign(JSON.parse(JSON.stringify(sv)));
  t('hero serializes explicit vector templateId', sv.templateId === HID);
  t('hero templateKeyById resolves', JSON.stringify(A.templateKeyById(HID)) === JSON.stringify({ garment: 'Button-Down', sleeve: 'Short', fit: 'unisex' }));
  t('hero restores same garment/sleeve/fit', r.cfg.garment === 'Button-Down' && r.cfg.sleeve === 'Short' && r.cfg.fit === 'unisex');
  t('hero resolveTarget carries templateId, capped work-shirt GLB, approx status', (x => x.templateId === HID && x.glb === '/models/processed/work-shirt-short-sleeve-capped.glb' && x.status === '2d-3d-approx' && !x.photo)(G.resolveTarget('Button-Down', 'Short', 'unisex')));
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
  t('hero 3D entry is the capped work-shirt GLB', e.id === 'work-shirt' && e.models.unisex === '/models/processed/work-shirt-short-sleeve-capped.glb');
  t('hero 3D paints body/sleeve patterns, pocket/collar/geometric stay solid', p3.body === 'hstripes' && p3.sleeve === 'checker' && p3.collar === 'solid' && p3.pocket === 'solid');
  t('a photo-base scan (no 3D patterns) paints every zone solid', Object.values(Cp.patternsFor3D(Cp.scannedEntryFor('Scrub Top', 'Short', 'female'), hp)).every(v => v === 'solid'));
  t('no 3D entry gives solid, never undefined', Object.values(Cp.patternsFor3D(null, { body: 'hstripes' })).every(v => v === 'solid'));
  t('pattern3D flags 2D-only combinations on the hero', Sh.pattern3D('Button-Down', 'Short', 'unisex', 'body', 'hstripes') === true && Sh.pattern3D('Button-Down', 'Short', 'unisex', 'body', 'geometric') === false && Sh.pattern3D('Button-Down', 'Short', 'unisex', 'pocket', 'hstripes') === false && Sh.pattern3D('Pants', null, null, 'body', 'hstripes') === true);
  t('picking Button-Down from the default design lands on the hero template', (c => c.sleeve === 'Short' && c.fit === 'unisex' && S.serializeDesign(c, {}).templateId === HID)(G.applyGarment({ ...base, category: 'Corporate', fit: 'male', sleeve: 'Short' }, 'Button-Down')));
  t('order snapshot (previewPng stripped by the backend) keeps the hero templateId', (o => o.templateId === HID && S.deserializeDesign(o).cfg.garment === 'Button-Down')((({ previewPng, ...rest }) => rest)(JSON.parse(JSON.stringify(S.serializeDesign({ ...base, garment: 'Button-Down', sleeve: 'Short', fit: 'unisex' }, {}, 'data:image/png;base64,AA==')))))); }
// ---- new worn-photo assets + GLB slots
const GS = await import(new URL('../src/pages/client/design-studio/glbSlots.js', import.meta.url));
const fsx = await import('node:fs'); const pathx = await import('node:path'); const urlx = await import('node:url');
const pub = f => pathx.join(urlx.fileURLToPath(new URL('../public/', import.meta.url)), f);
t('all 15 worn photos have a cutout file', D.ENTRIES.filter(d => d.source === 'worn').every(d => fsx.existsSync(pub(d.image.slice(1)))));
t('every registered photo base and trim mask exists, ids are unique', (bases => bases.length === 6 && new Set(bases.map(a => a.id)).size === bases.length && bases.every(a => fsx.existsSync(pub(a.src.slice(1))) && (!a.trim || fsx.existsSync(pub(a.trim.mask.slice(1))))))(Object.values(A.ASSET_2D).flatMap(g => Object.values(g)).flatMap(s => Object.values(s)).flatMap(f => Object.values(f))));
t('product bottoms open their exact family with no sleeve or photo base', ['pants:Pants', 'shorts:Shorts', 'corporate-skirt:Skirt'].every(k => { const [id, fam] = k.split(':'); const o = D.openTarget(E0(id), {}); return o && o.garment === fam && o.sleeve === null && !E0(id).exactBase && E0(id).tier === (id === 'corporate-skirt' ? 'editable-2d' : '2d-3d-approx'); }));
t('pleated skirt opens Pleated Skirt (never the pencil Skirt); notch blouse opens Blouse; blazers open Blazer on their own sleeve', D.openTarget(E0('school-skirt'), {})?.garment === 'Pleated Skirt' && D.openTarget(E0('blazer-blouse-blue'), {})?.garment === 'Blouse' && D.openTarget(E0('blazer-tweed-herringbone'), {})?.sleeve === 'Long' && D.openTarget(E0('blazer-white-notch'), {})?.sleeve === '3/4' && D.openTarget(E0('dress-bir-green-yellow-collar'), {})?.garment === 'Dress');
t('lower-body filter lists the four single bottoms', JSON.stringify(D.filterDesigns({ piece: 'lower' }).map(d => d.id).sort()) === JSON.stringify(['corporate-skirt', 'pants', 'school-skirt', 'shorts']));
t('bottoms have canonical template ids that round-trip to (family, null, null)', ['Pants:pants-trousers', 'Shorts:shorts-standard', 'Skirt:skirt-pencil'].every(k => { const [g, id] = k.split(':'); const tk = A.templateKeyById(id); return A.templateIdFor(g, null, null) === id && tk && tk.garment === g && tk.sleeve === null && tk.fit === null; }));
t('gallery photo id survives Save -> Reload -> Order snapshot as inspirationId; templateId is the Pants template', (() => { const t = D.openTarget(E0('pants'), {}); const cfg = { ...G.applyGarment({ ...base }, t.garment, { ...t, inspirationId: 'pants' }), colors: { body: '#7a1f2b' } }; const raw = S.serializeDesign(cfg, {}); const back = S.deserializeDesign(JSON.parse(JSON.stringify(raw))); const snap = S.serializeDesign(back.cfg, {}); return raw.inspirationId === 'pants' && raw.templateId === 'pants-trousers' && back.cfg.garment === 'Pants' && back.cfg.inspirationId === 'pants' && snap.inspirationId === 'pants' && snap.colors.body === '#7a1f2b'; })());
t('switching garment drops the photo id; a mismatched or unknown photo id is never saved', (() => { const onPants = G.applyGarment({ ...base }, 'Pants', { inspirationId: 'pants' }); const moved = G.applyGarment(onPants, 'Shorts'); return moved.inspirationId === null && S.serializeDesign({ ...onPants, inspirationId: 'shorts' }, {}).inspirationId === null && S.serializeDesign({ ...onPants, inspirationId: 'nope' }, {}).inspirationId === null && S.deserializeDesign({ garment: 'Pants', inspirationId: 'school-skirt' }).cfg.inspirationId === null; })());
{ const U = await L('/src/pages/client/design-studio/uniformSet.js');
  const fams = Object.keys(G.FAMILY_BY_NAME);
  t('every family is a set top or bottom except the full-body Lab Coverall and Dress', fams.every(f => ['Lab Coverall', 'Dress'].includes(f) ? G.pieceOf(f) === null : ['top', 'bottom'].includes(G.pieceOf(f))) && ['Pants', 'Shorts', 'Skirt', 'Pleated Skirt'].every(f => G.pieceOf(f) === 'bottom'));
  const top = S.serializeDesign({ ...G.applyGarment({ ...base }, 'Polo Shirt', { fit: 'male' }), colors: { body: '#123456' } }, { frontOverlays: [{ type: 'i-text', text: 'TOP' }] });
  const bot = S.serializeDesign({ ...G.applyGarment({ ...base }, 'Pants', { inspirationId: 'pants' }), colors: { body: '#800000' } }, {});
  const snap = U.withSet(bot, { id: 'set-1', active: 'bottom', pieces: { top, bottom: null } });
  const q = U.orderQueue(snap);
  t('a set orders top first, each piece keeps its own garment, colour, template and overlays', q?.length === 2 && q[0].garment === 'Polo Shirt' && q[0].colors.body === '#123456' && q[0].frontOverlays?.[0]?.text === 'TOP' && q[1].garment === 'Pants' && q[1].colors.body === '#800000' && q[1].templateId === 'pants-trousers' && q[1].inspirationId === 'pants' && q.every((p, n) => p.uniformSet.id === 'set-1' && p.uniformSet.part === n + 1 && p.uniformSet.of === 2 && !p.uniformSet.pieces));
  t('a piece in the wrong role is dropped, a one-piece set is not orderable', U.normalizeSet({ id: 'x', active: 'top', pieces: { top: bot, bottom: top } }).pieces.top === null && U.orderQueue(U.withSet(bot, { id: 'x', active: 'bottom', pieces: { top: null, bottom: null } })) === null && U.normalizeSet({ id: 1, active: 'top' }) === null);
  t('set survives Save -> Reload (deserialize ignores it, normalize restores it)', (() => { const raw = JSON.parse(JSON.stringify(snap)); const d = S.deserializeDesign(raw); const set = U.normalizeSet(raw.uniformSet); return d.cfg.garment === 'Pants' && set.active === 'bottom' && set.pieces.top.garment === 'Polo Shirt'; })());
  t('staff note names the set, the part and the linked order', U.setNote({ ...q[1].uniformSet, linkedOrderIds: [41] }) === 'Uniform set set-1: part 2 of 2 (top Polo Shirt + bottom Pants); with order #41.'); }
t('BIR blouse photo -> Button-Down Long + Female base', (g => g.garment === 'Button-Down' && g.sleeve === 'Long' && g.fit === 'female' && A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'button-down-bir-long')(D.openTarget(E('bir-blouse-trousers-blue'), {})));
t('fuchsia blouse photo -> Round Neck Short base', (g => g.garment === 'Round Neck' && A.assetFor(g.garment, g.sleeve, 'front', g.fit)?.id === 'round-neck-fuchsia-short')(D.openTarget(E('blouse-roundneck-fuchsia'), {})));
t('mustard blouse, fused blazer sets, dresses, barong and two-tone shirts: reference-only', ['blouse-roundneck-mustard', 'blazer-pinstripe-navy', 'dress-sheath-denim-blue', 'shirt-two-tone-gpc', 'jack-shirt-two-tone', 'polo-barong-brown', 'peplum-set-navy'].every(id => E(id).tier === 'reference' && D.openTarget(E(id), {}) === null));
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
t('Pants and Shorts render the garment-only models of their gallery photos, lit, with the shader zone mask', ['Pants', 'Shorts'].every(g => { const e = Cp.scannedEntryFor(g, null, null); return e && /\/models\/vfrb-staged\//.test(e.models.unisex) && fsx.existsSync(pub(e.models.unisex.slice(1))) && e.parts[0].zoneOf && !e.parts[0].unlit; }));
t('gallery pants and shorts photos expose their real 3D model; corporate-skirt (back modelled as shorts) stays 2D only', ['pants', 'shorts'].every(id => { const d = D.ENTRIES.find(x => x.id === id); return d.tier === '2d-3d-approx' && d.glb === Cp.scannedEntryFor(d.garmentFamily, null, null).models.unisex; }) && D.ENTRIES.find(x => x.id === 'corporate-skirt').tier === 'editable-2d' && D.ENTRIES.find(x => x.id === 'corporate-skirt').glb === null);
t('routing: a selection gets 3D only from a model with that exact sleeve; no short-sleeve substitute for 3/4 or Long', Cp.scannedEntryFor('Scrub Top', '3/4', 'male') === null && Cp.scannedEntryFor('Mandarin Collar', 'Long', 'female') === null && Cp.scannedEntryFor('Round Neck', 'Long', 'female') === null && Cp.scannedEntryFor('Scrub Top', 'Short', 'male')?.id === 'scrub-top' && Cp.scannedEntryFor('Pants', 'Short', null)?.id === 'pants' && Cp.has3DModel('Button-Down', 'Long', 'unisex') && !Cp.has3DModel('Mandarin Collar', 'Long', 'female') && Cp.has3DModel('Mandarin Collar', 'Short', 'female'));
t('gallery 3D references: 23 read-only models, each file present, sets flagged; mismatched photos and photos with an editable model have none', (() => { const refs = D.ENTRIES.filter(d => d.ref3D); return refs.length === 23 && ['blazer-open-front-black', 'blouse-mandarin-yellow', 'blouse-tunic-roundneck-blue'].every(id => E0(id).ref3D && !E0(id).ref3D.set && !E0(id).has3D) && !E0('polo-red-claremont').ref3D && !E0('shirt-mandarin-polkadot').ref3D && !E0('dress-bir-green-yellow-collar').ref3D && refs.every(d => d.ref3D.file === `/models/reference/${d.id}.glb` && fsx.existsSync(pub(d.ref3D.file.slice(1)))) && D.ENTRIES.find(d => d.id === 'set-pinstripe-skirt').ref3D.set && ['dress-sheath-denim-blue', 'blazer-blouse-blue-short', 'set-vest-blouse', 'corporate-skirt'].every(id => !D.ENTRIES.find(d => d.id === id).ref3D); })());
t('new families route to their own models per sleeve; no model for a sleeve they lack', Cp.scannedEntryFor('Blazer', 'Long', null)?.id === 'blazer-long' && Cp.scannedEntryFor('Blazer', '3/4', null)?.id === 'blazer-three-quarter' && Cp.scannedEntryFor('Blouse', 'Short', null)?.id === 'blouse-notch-short' && Cp.scannedEntryFor('Dress', 'Short', null)?.id === 'dress-collared-short' && Cp.scannedEntryFor('Pleated Skirt', null, null)?.id === 'pleated-skirt' && Cp.scannedEntryFor('Skirt', null, null)?.id === 'skirt' && Cp.scannedEntryFor('Blouse', 'Long', null) === null && ['Blazer', 'Blouse', 'Dress', 'Pleated Skirt'].every(g => G.FAMILY_BY_NAME[g]?.has2D && G.FAMILY_BY_NAME[g].status3D === 'partial'));
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
    const SETS = ['scrub-set-women-vneck', 'scrub-set-men-vneck', 'scrub-set-housekeeping', 'set-pinstripe-pants', 'set-pinstripe-skirt', 'bir-blouse-trousers-blue', 'pantsuit-notch-short-gray', 'polo-barong-brown', 'blazer-double-breasted-gray', 'blazer-pinstripe-navy', 'blouse-roundneck-fuchsia', 'blouse-roundneck-mustard', 'shirt-two-tone-gpc', 'peplum-set-navy'];
    const SOLO = ['blouse-mandarin-yellow', 'blouse-pleated-bib-white', 'blouse-scarf-cream', 'blouse-asymmetric-blue', 'blouse-tunic-roundneck-blue', 'blazer-open-front-black', 'dress-tunic-maternity-navy', 'jack-shirt-two-tone', 'dress-butter-belted'];
    const refs = D.ENTRIES.filter(d => d.ref3D), refDir = pathx.join(urlx.fileURLToPath(new URL('../public/', import.meta.url)), 'models', 'reference');
    t('full-set previews: exactly 14 sets and 9 solo references, each its own file, every reference file connected, no orphans', refs.length === 23 && SETS.every(id => E0(id).ref3D?.set === true && E0(id).ref3D.file === `/models/reference/${id}.glb`) && SOLO.every(id => E0(id).ref3D?.set === false) && fsx.readdirSync(refDir).length === 23 && fsx.readdirSync(refDir).every(f => refs.some(d => d.ref3D.file === `/models/reference/${f}`)));
    t('fused sets stay read-only: only sets with a separately cut garment also offer an editable model, and that model is the cut, never the fused file', SETS.filter(id => E0(id).has3D).sort().join() === 'bir-blouse-trousers-blue,blouse-roundneck-fuchsia,scrub-set-housekeeping,scrub-set-men-vneck,scrub-set-women-vneck' && SETS.every(id => !E0(id).glb || (E0(id).glb.startsWith('/models/garments/') && E0(id).glb !== E0(id).ref3D.file)));
    t('rejected or mismatched sources have no 3D viewer at all (vest set with mannequin, worn blouse photo, corporate skirt)', ['set-vest-blouse', 'blazer-blouse-blue-short', 'corporate-skirt'].every(id => !E0(id).ref3D && !(E0(id).has3D && /vest|corporate-skirt/.test(E0(id).glb ?? ''))) && !Cp.SCANNED_GARMENTS.some(x => Object.values(x.models).some(m => /corporate-skirt|dress-shift|vest-blouse/.test(m))));
  }
  {
    const GP = await L('/src/pages/client/design-studio/garmentPaths.js');
    // Every gallery photo has exactly one explicit path, and every editable one survives Save -> Reopen -> Order with its identity and model.
    const galDir = pathx.join(urlx.fileURLToPath(new URL('../public/', import.meta.url)), 'gallery');
    const webp = fsx.readdirSync(galDir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)).sort();
    t('gallery: one entry per public/gallery image (40), every image file present', webp.length === 40 && JSON.stringify(webp) === JSON.stringify(D.ENTRIES.map(d => d.id).sort()));
    const editable = D.ENTRIES.filter(d => D.openTarget(d, {}));
    t('gallery paths are explicit: 19 open an editable template, 21 are reference-only (17 with a read-only 3D viewer, 4 photo-only)', editable.length === 19 && D.ENTRIES.filter(d => !D.openTarget(d, {})).length === 21 && D.ENTRIES.filter(d => !D.openTarget(d, {}) && d.ref3D).length === 17 && D.ENTRIES.filter(d => !D.openTarget(d, {}) && !d.ref3D).map(d => d.id).sort().join() === 'blazer-blouse-blue-short,dress-sheath-denim-blue,dress-shift-geometric,set-vest-blouse' && D.ENTRIES.every(d => (d.tier === 'reference') === !D.openTarget(d, {})));
    const trip = d => {
      const t0 = D.openTarget(d, {}), cfg = { ...G.applyGarment(S.DEFAULT_CFG, t0.garment, { ...t0, inspirationId: d.id }), colors: { ...S.DEFAULT_CFG.colors, body: '#7a1f2b' } };
      const saved = JSON.parse(JSON.stringify(S.serializeDesign(cfg, {}))), back = S.deserializeDesign(saved).cfg, order = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(back, {})))).cfg;
      const r0 = G.resolveTarget(cfg.garment, cfg.sleeve, cfg.fit);
      return [back, order].every(x => x.garment === cfg.garment && x.sleeve === cfg.sleeve && x.fit === cfg.fit && x.inspirationId === d.id && x.colors.body === '#7a1f2b' && G.resolveTarget(x.garment, x.sleeve, x.fit).templateId === r0.templateId && G.resolveTarget(x.garment, x.sleeve, x.fit).glb === r0.glb && Cp.has3DModel(x.garment, x.sleeve, x.fit) === !!r0.glb)
        && saved.templateId === r0.templateId && saved.inspirationId === d.id && (!d.has3D || r0.glb === d.glb);
    };
    const broken = editable.filter(d => !trip(d)).map(d => d.id);
    t('all 19 editable gallery photos survive Save -> Reopen -> Order payload with garment, sleeve, fit, template, gallery id, colour and the same 3D model (photo GLB when the photo has one)', broken.length === 0, broken.join());
    t('3D coverage kinds: 17 photo-matched GLBs, 1 labelled family-level approximation (corporate skirt -> pencil-skirt model), 1 editable-2D with its misleading family model withheld (tunic), 14 full-set previews, 21 reference-only', editable.filter(d => d.has3D).length === 17 && D.ENTRIES.filter(d => d.familyApprox3D).map(d => d.id).join() === 'corporate-skirt' && editable.filter(d => !d.has3D && !d.familyApprox3D).map(d => d.id).join() === 'blouse-tunic-roundneck-blue' && E0('blouse-tunic-roundneck-blue').family3DOff && D.ENTRIES.filter(d => d.ref3D?.set).length === 14 && D.ENTRIES.filter(d => d.tier === 'reference').length === 21 && D.ENTRIES.filter(d => d.familyApprox3D).every(d => d.tier === 'editable-2d' && !d.has3D && !d.glb));
    {
      // The tunic photo opens T-Shirt / Short / female; that family model is a V-neck tee, so 3D is withheld for designs opened from
      // this photo (Studio, Wizard, Order Detail all gate on has3DFor), while choosing T-Shirt directly keeps its model.
      const tunic = G.applyGarment(S.DEFAULT_CFG, D.openTarget(E0('blouse-tunic-roundneck-blue'), {}).garment, { ...D.openTarget(E0('blouse-tunic-roundneck-blue'), {}), inspirationId: 'blouse-tunic-roundneck-blue' });
      const saved = S.deserializeDesign(JSON.parse(JSON.stringify(S.serializeDesign(tunic, {})))).cfg;
      const plain = G.applyGarment(S.DEFAULT_CFG, 'T-Shirt', { fit: 'female' });
      t('tunic photo: T-Shirt model exists but 3D is withheld for the design and its saved/ordered copy; a plain T-Shirt keeps 3D; changing garment drops the photo and the block',
        Cp.has3DModel(tunic.garment, tunic.sleeve, tunic.fit) && !Cp.has3DFor(tunic) && saved.inspirationId === 'blouse-tunic-roundneck-blue' && !Cp.has3DFor(saved) && Cp.has3DFor(plain) && Cp.has3DFor(G.applyGarment(tunic, 'Polo Shirt', {})) === Cp.has3DModel('Polo Shirt', G.applyGarment(tunic, 'Polo Shirt', {}).sleeve, G.applyGarment(tunic, 'Polo Shirt', {}).fit) && G.applyGarment(tunic, 'Polo Shirt', {}).inspirationId == null);
      t('the only approximation still shown in 3D is labelled in the 3D pane and the gallery (corporate skirt), and every NO_FAMILY_3D id is an editable photo without its own model', [...Cp.NO_FAMILY_3D].every(id => E0(id).tier === 'editable-2d' && !E0(id).has3D && !E0(id).familyApprox3D) && E0('corporate-skirt').familyApprox3D && Cp.has3DFor({ ...G.applyGarment(S.DEFAULT_CFG, 'Skirt', {}), inspirationId: 'corporate-skirt' }));
    }
    t('My Designs fallback thumbnail and Order previews have a 2D shape for every catalog family', Object.keys(G.FAMILY_BY_NAME).every(g => !!GP.BASE_PATHS[g]));
  }
  t('every 3D runtime model path exists under public/', Cp.SCANNED_GARMENTS.every(x => Object.values(x.models).every(m => fsx.existsSync(pub(decodeURI(m).slice(1))))));
}
{
  const SN = await L('/src/pages/client/design-studio/snapGuides.js');
  const tg = SN.snapTargets({ width: 320, height: 400, garment: { left: 60, top: 40, width: 200, height: 300 }, others: [{ left: 100, top: 100, width: 40, height: 20 }], gridSize: 20 });
  const a = SN.computeSnap({ left: 137, top: 200, width: 46, height: 30 }, tg);
  t('snap: centre within 6px jumps to the canvas/garment centre line, with one vertical guide', a.dx === 160 - 160 + (160 - (137 + 23)) && a.guides.some(g => g.axis === 'v' && g.at === 160));
  const b = SN.computeSnap({ left: 101, top: 300, width: 30, height: 10 }, tg);
  t('snap: an element edge snaps to another element edge before a grid line', b.dx === -1 && b.guides.find(g => g.axis === 'v').kind === 'object');
  const c = SN.computeSnap({ left: 13, top: 13, width: 2, height: 2 }, SN.snapTargets({ width: 320, height: 400, gridSize: 0 }));
  t('snap: no target within the threshold -> no move, no guides; grid lines only when the grid is on', c.dx === 0 && c.dy === 0 && c.guides.length === 0 && SN.computeSnap({ left: 18, top: 300, width: 4, height: 4 }, SN.snapTargets({ width: 320, height: 400, gridSize: 20 })).guides.some(g => g.kind === 'grid'));
  t('rulers: minor tick every 10 canvas px, labelled major every 50, spanning the full canvas', (r => r.length === 33 && r[0].at === 0 && r[r.length - 1].at === 320 && r.filter(x => x.major).length === 7)(SN.rulerTicks(320)));
  t('snap threshold is ~6 screen px at any zoom (logical px = 6 / scale), clamped to 2..12 logical px', SN.snapThreshold(1) === 6 && SN.snapThreshold(2) === 3 && SN.snapThreshold(0.5) === 12 && SN.snapThreshold(0.3) === 12 && SN.snapThreshold(4) === 2 && SN.snapThreshold(0) === 6);
  t('zoom-aware threshold: a 5 px gap snaps at 100% and on a phone (scale 0.5) but not at 270% (13.5 screen px away)', (() => { const tg = SN.snapTargets({ width: 320, height: 400 }), box = { left: 145, top: 10, width: 10, height: 4 }; /* right edge 155, centre line 160 */
    return SN.computeSnap(box, tg, SN.snapThreshold(1)).dx === 5 && SN.computeSnap(box, tg, SN.snapThreshold(0.5)).dx === 5 && SN.computeSnap(box, tg, SN.snapThreshold(2.7)).dx === 0; })());
  t('ruler steps keep minor ticks >= 6 and labels >= 44 screen px apart on round values, at every zoom from phone to 270%', [0.3, 0.45, 0.6, 1, 1.5, 2.7].every(s => { const { step, major } = SN.rulerSteps(s); return step * s >= 6 && major * s >= 44 && major % step === 0 && [2, 5, 10, 20, 25, 50, 100, 200].includes(step); }) && SN.rulerSteps(1).step === 10 && SN.rulerSteps(1).major === 50);
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
  t('readout shows the inspector numbers: X/Y while moving, rounded W × H while resizing', SN.readoutText({ left: 120.4, top: 80.6 }, 'move') === 'X 120  Y 81' && SN.readoutText({ width: 50, height: 20, scaleX: 1.5, scaleY: -2 }, 'scale') === '75 × 40');
  {
    // Pinned rulers: screen position = origin + value * scale. Artboard 320 wide at scale 2, scrolled so canvas 0 is 150 px left
    // of the ruler (origin -150) on a 400 px ruler: visible canvas range is 75..275, step 10 / major 50 at that scale's choice.
    const tk = SN.pinnedTicks(-150, 2, 400, 320, 10, 50);
    t('pinned ruler with the artboard origin scrolled out of view continues from the real coordinates (80..270), never restarts at 0, no negatives', tk[0].v === 80 && tk[tk.length - 1].v === 270 && tk.every(x => x.v >= 0 && Math.abs(x.at - (-150 + x.v * 2)) < 1e-9 && x.at >= 0 && x.at <= 400));
    t('pinned ruler values are whole multiples of the step: no duplicate labels from rounding, majors exactly on multiples of 50', new Set(tk.map(x => x.v)).size === tk.length && tk.every(x => x.v % 10 === 0) && tk.filter(x => x.major).map(x => x.v).join() === '100,150,200,250');
    const fitT = SN.pinnedTicks(40, 1.5, 600, 320, 10, 50);
    t('artboard fully visible: ticks span exactly 0..320 and stop at the artboard edges (none over the empty stage)', fitT[0].v === 0 && fitT[0].at === 40 && fitT[fitT.length - 1].v === 320 && fitT[fitT.length - 1].at === 40 + 320 * 1.5);
    t('pinned ruler handles fractional origins and steps that do not divide the extent', (r => r[0].v === 0 && r[r.length - 1].v === 375 && r.length === 16)(SN.pinnedTicks(12.37, 0.587, 375, 380, 25, 100)));
    const lim = SN.panLimits({ w: 320, h: 380, scale: 2.7, viewW: 900, viewH: 700 });
    t('pan limits: only where the zoomed artboard overflows (by overflow + margin), zero when it fits', lim.x === 0 && Math.abs(lim.y - ((380 * 2.7 - 700) / 2 + SN.PAN_MARGIN)) < 1e-9 && SN.panLimits({ w: 320, h: 380, scale: 1, viewW: 900, viewH: 700 }).y === 0);
    t('pan clamp keeps the artboard reachable and never returns -0', (c => c.x === 0 && Object.is(c.x, 0) && c.y === -lim.y)(SN.clampPan({ x: -50, y: -9999 }, lim)) && Object.is(SN.clampPan({ x: -0, y: 0 }, { x: 0, y: 0 }).x, 0));
  }
  t('grid spacing options are 10/20/40 canvas px and snapping uses the chosen spacing', SN.GRID_SIZES.join() === '10,20,40' && SN.snapTargets({ width: 100, height: 100, gridSize: 40 }).v.filter(l => l.kind === 'grid').map(l => l.at).join() === '40,80');
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
// Customer atelier foundation: tokens stay in the customer scope, admin never imports them, StageTape is exactly the 7 real stages.
{
  const K = await L('/src/components/customer/kit.jsx');
  const html = (C, p) => renderToString(React.createElement(C, p));
  const stages = s => [...s.matchAll(/data-stage="([a-z]+)"/g)].map(m => m[1]);
  const SEVEN = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
  const sewing = html(K.StageTape, { status: 'sewing' }), small = html(K.StageTape, { status: 'sewing', compact: true });
  t('StageTape renders exactly the 7 production stages in shop-floor order, full and compact', [sewing, small].every(s => stages(s).join() === SEVEN.join()) && K.STAGES.join() === SEVEN.join() && /cx-tape--sm/.test(small));
  t('StageTape emphasises only the current stage (aria-current) and marks earlier ones done', (sewing.match(/aria-current="step"/g) ?? []).length === 1 && /data-stage="sewing" data-s="now" aria-current="step"/.test(sewing) && (sewing.match(/data-s="done"/g) ?? []).length === 3 && (sewing.match(/data-s="todo"/g) ?? []).length === 3);
  const done = html(K.StageTape, { status: 'completed' }), pend = html(K.StageTape, { status: 'pending' });
  t('StageTape: completed = all 7 done; not started = no current stage; status names come from STATUS labels', (done.match(/data-s="done"/g) ?? []).length === 7 && !/aria-current/.test(pend) && (pend.match(/data-s="todo"/g) ?? []).length === 7 && />QC</.test(sewing) && /Production has not started yet/.test(pend));
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
  t('customer tokens are defined only on the customer root (html[data-cx] / .cm-shell), never on :root or shared stylesheets', defs.length === 1 && defs[0].endsWith(':is(html[data-cx],.cm-shell)') && global.length === 0);
  const sels = [...shell.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|[;}])\s*([^{}@;]+)\{/g)].map(m => m[1].trim()).filter(s => !/^(from|to|\d+%)$/.test(s)).flatMap(s => s.split(','));
  t('every customer shell rule is scoped to the customer root, so admin is untouched after the shell has loaded', sels.length > 30 && sels.every(s => /data-cx|\.cx-|\.cm-(shell|main|content|studio-fab)/.test(s)));
  t('the customer shell sets data-cx on mount and removes it on unmount; shell CSS is imported only by the layout', /useLayoutEffect\(\(\) => \{[\s\S]{0,120}dataset\.cx = ''[\s\S]{0,60}delete root\.dataset\.cx/.test(layout) && /import '\.\.\/styles\/customer-shell\.css'/.test(layout) && !/customer-shell\.css/.test(src('../src/main.jsx')));
}
console.log(out.join('\n')); const f = out.filter(x => x.startsWith('FAIL')).length; console.log(`${out.length - f}/${out.length} passed`);
await v.close(); process.exit(f ? 1 : 0);
