// Checks for the baked-panel artwork contract and its wiring into the main Studio. Run: node tools/panel-art-checks.mjs
import fs from 'node:fs';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const text = p => fs.readFileSync(new URL(p, root), 'utf8').replace(/\r\n/g, '\n');
const load = p => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(text(p), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'));
const A = await load('src/pages/client/design-studio/studioAssets.ts');
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL ' + name); } };
const obj = i => ({ type: 'Text', text: 't' + i, left: i, top: i });

ok(A.cleanPanelArt(null) === null && A.cleanPanelArt('x') === null && A.cleanPanelArt([]) === null, 'non-objects are dropped');
ok(A.cleanPanelArt({ front: [], back: [] }) === null, 'an empty bundle is dropped (old records keep their shape)');
const good = A.cleanPanelArt({ front: [obj(1)], back: [obj(2), obj(3)] });
ok(good && good.front.length === 1 && good.back.length === 2, 'a valid bundle round-trips');
ok(A.cleanPanelArt({ front: [obj(1)] })?.back.length === 0, 'a missing side becomes empty');
ok(A.cleanPanelArt({ front: [1, 'a'], back: [] }) === null, 'non-object entries drop the bundle');
ok(A.cleanPanelArt({ front: [[1]], back: [] }) === null, 'array entries drop the bundle');
ok(A.cleanPanelArt({ front: Array.from({ length: A.PANEL_ART_MAX_OBJECTS + 1 }, (_, i) => obj(i)), back: [] }) === null, 'more than the object cap is dropped');
ok(A.cleanPanelArt({ front: Array.from({ length: A.PANEL_ART_MAX_OBJECTS }, (_, i) => obj(i)), back: [] }) !== null, 'exactly the cap is kept');
ok(A.cleanPanelArt({ front: [{ src: 'x'.repeat(A.PANEL_ART_MAX_BYTES) }], back: [] }) === null, 'over the byte cap is dropped');
ok(A.panelArtBytes(null) === 0 && A.panelArtBytes(good) > 0, 'panelArtBytes measures the bundle');

const ser = text('src/pages/client/design-studio/designSerialization.ts');
ok(/baked \? cleanPanelArt\(\(cfg as any\)\.panelArt\) : null/.test(ser), 'serializeDesign writes panelArt only for a baked garment');
ok(/uvBakedAssetFor\(cfg\.garment, cfg\.sleeve, cfg\.fit\) \? cleanPanelArt\(sc\.panelArt\) : null/.test(ser), 'deserializeDesign reads panelArt only for a baked garment');
ok(/return \{ cfg, overlays, frontOverlays, backOverlays, panelArt \}/.test(ser), 'deserializeDesign returns panelArt');

const ds = text('src/pages/client/DesignStudio.tsx');
ok((ds.match(/restorePanelArt\(panelArt\)/g) ?? []).length === 3, 'all three restore sites (browser copy, account draft, set piece) reopen the panels with the saved art');
ok(/serializeDesign\(\{ \.\.\.cfg, panelArt: panelArtRef\.current \}/.test(ds), 'the one snapshot serializer carries the panel art');
ok(/\[cfg, locked, editTick, panelTick\]/.test(ds), 'autosave and the Unsaved check re-run when artwork changes');
ok(/panelApi\.current\?\.preview\('front'\) \?\? exportPNG\(\)/.test(ds), 'the draft thumbnail comes from the panels for a baked garment');
ok(/bakedRef\.current && panelApi\.current/.test(ds), 'the order preview comes from the panels for a baked garment');
ok(!/uvBakedAssetFor\(.*allowPending/.test(ds), 'the Studio does not bypass the rights gate');

const ws = text('src/pages/client/design-studio/PanelWorkspace.tsx');
ok(!/localStorage/.test(ws), 'the shared workspace never touches localStorage (hosts own persistence)');
ok(/PANEL_ART_MAX_OBJECTS/.test(ws), 'the workspace enforces the artwork count cap when adding');

// bboxOf (gap-fill box for the rectangular pocket parts)
const bboxSrc = text('src/pages/client/design-studio/pilotPanels.ts').match(/export function bboxOf[\s\S]*?\n}\n/)[0].replace('export function bboxOf(d: string): Frame | null', 'function bboxOf(d)').replace(/let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;/, 'let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;');
const bboxOf = new Function(`${bboxSrc}; return bboxOf;`)();
const bb = bboxOf('M -0.2 0.1 L 0.3 0.1 L 0.3 0.5 L -0.2 0.5 Z');
ok(bb && bb.x0 === -0.2 && bb.x1 === 0.3 && bb.y0 === 0.1 && bb.y1 === 0.5, 'bboxOf reads an M/L/Z path');
ok(bboxOf('') === null && bboxOf('M 1') === null, 'bboxOf rejects empty or odd coordinate lists');
ok(bboxOf('M 1e-3 2 L 3 4 Z') !== null, 'bboxOf reads exponent numbers');

// The Studio must not leak dead tools or a second view switch for a baked garment.
ok(/rail=\{locked \|\| baked \? null : \{ history:/.test(ds), 'the silhouette tool rail (brush, bucket, eraser) is not offered for a baked garment');
ok(/hideViewToggle=\{!!baked\}/.test(ds) && /hideViewToggle = false/.test(text('src/pages/client/design-studio/TopBar.tsx')), 'the top-bar 2D/3D switch is hidden for a baked garment (the workspace has its own)');
ok(/if \(baked && viewMode !== '2d'\) setViewMode\('2d'\)/.test(ds), 'the hidden silhouette canvas never enters its own immersive 3D mode');
ok(/drawer=\{baked \? null :/.test(ds), 'the silhouette tool drawer is not offered for a baked garment');
ok(/ps-layers/.test(ws) && /Layers, \$\{side\}/.test(ws), 'the workspace lists layers with show/hide and delete');

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
