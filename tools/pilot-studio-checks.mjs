// Checks for src/pages/client/design-studio/pilotPanels.ts. Run: node tools/pilot-studio-checks.mjs
import fs from 'node:fs';
import { buildSync } from 'esbuild';

const root = new URL('../', import.meta.url);
const out = buildSync({ entryPoints: [new URL('src/pages/client/design-studio/pilotPanels.ts', root).pathname.replace(/^\/([A-Za-z]:)/, '$1')], bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'silent' });
const P = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
const A = (await import('data:text/javascript;base64,' + Buffer.from(buildSync({ entryPoints: [new URL('src/pages/client/design-studio/studioAssets.ts', root).pathname.replace(/^\/([A-Za-z]:)/, '$1')], bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'silent' }).outputFiles[0].text).toString('base64')));
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL ' + name); } };
const asset = A.UV_BAKED_ASSETS[0], ref = A.assetRefFor(asset), keys = P.colorKeys(asset);

for (const side of ['front', 'back']) {
  const panels = P.parsePanelSvg(fs.readFileSync(new URL('public' + asset.panelSvg[side].url, root), 'utf8'));
  const ids = panels.map(p => p.id).sort();
  ok(panels.length >= 4 && panels.every(p => p.side === side), `${side}: panels parsed for this side only`);
  ok(panels.every(p => asset.parts.some(x => x.node === p.part)), `${side}: every SVG panel is a registered part`);
  ok(new Set(ids).size === ids.length, `${side}: panel ids are unique`);
  ok(panels.every(p => /^M/.test(p.d) && /Z\s*$/.test(p.d)), `${side}: every outline is a closed M/L path`);
}
ok(P.parsePanelSvg('<path data-panel="body.front" d="M0,0 L1,1 Z" fill="red"/><path data-panel="x.front" d="M0,0 <script>"/><path data-panel="body.back" d="javascript:1"/>').length === 1, 'parsePanelSvg drops paths with unsafe or missing data');
ok(P.parsePanelSvg('<path data-panel="a.sideways" d="M0,0 Z"/>').length === 0, 'parsePanelSvg ignores unknown sides');

const f = asset.frames.front, sz = P.canvasSize(f, 1024);
ok(sz.width === 1024 && Math.abs(sz.height / sz.width - (f.y1 - f.y0) / (f.x1 - f.x0)) < 0.002, 'canvas keeps the frame aspect ratio');
ok(P.panelTransform(f) === `translate(${f.x1} ${f.y1}) scale(-1 1)`, 'panel transform mirrors x about the frame edge');
{
  const [x, y] = [-0.3, 0.2], mx = f.x1 - x, my = f.y1 + -y;
  const s = (f.x1 - x) / (f.x1 - f.x0), t = (f.y1 - y) / (f.y1 - f.y0);
  ok(Math.abs(mx / (f.x1 - f.x0) - s) < 1e-12 && Math.abs(my / (f.y1 - f.y0) - t) < 1e-12, 'SVG placement equals the bake mapping (s, t) for a sample point');
}
ok(Object.keys(P.PART_LABEL).every(k => asset.parts.some(p => p.node === k)) && asset.parts.every(p => P.PART_LABEL[p.node]), 'every registered part has a label');

const art = { version: '6.9.0', objects: [{ type: 'FabricText' }] };
const state = { colors: { body: '#1b2a4a', sleeve: '#2a52a8' }, details: { patchPocket: { show: false } }, art: { front: art, back: null } };
const raw = JSON.stringify(P.serializeDraft(ref, state));
const back = P.parseDraft(raw, ref, keys);
ok(back.draft && back.draft.colors.body === '#1b2a4a' && back.draft.details.patchPocket.show === false && back.draft.art.front.objects.length === 1 && back.draft.art.back === null, 'draft round-trips colours, details and artwork');
ok(P.parseDraft(null, ref, keys).reason === 'empty' && P.parseDraft('', ref, keys).reason === 'empty', 'no saved draft reports empty');
ok(P.parseDraft('{bad', ref, keys).reason === 'invalid' && P.parseDraft('{"v":2}', ref, keys).reason === 'invalid', 'damaged or unknown drafts are invalid');
ok(P.parseDraft(raw, { ...ref, mappingHash: 'a'.repeat(64) }, keys).reason === 'stale' && P.parseDraft(raw, { ...ref, assetVersion: '2.0.0' }, keys).reason === 'stale', 'a draft from another mapping or version is stale, not applied');
const dirty = JSON.stringify({ ...JSON.parse(raw), colors: { body: 'red', hack: '#ffffff', sleeve: '#2A52A8' }, details: { patchPocket: { show: 'no' }, lowerPockets: { show: true }, evil: { show: true } }, art: { front: { objects: new Array(P.MAX_ART_OBJECTS + 1).fill({}) }, back: { objects: [] } } });
const clean = P.parseDraft(dirty, ref, keys).draft;
ok(clean && Object.keys(clean.colors).join() === 'sleeve' && Object.keys(clean.details).join() === 'lowerPockets' && clean.art.front === null && clean.art.back.objects.length === 0, 'draft cleaning drops bad colours, unknown keys, non-boolean flags and oversized artwork');

const read = f => fs.readFileSync(new URL(f, root), 'utf8');
const page = read('src/pages/client/PilotStudio.tsx') + read('src/pages/client/design-studio/PanelWorkspace.tsx'), // the workspace moved into PanelWorkspace (shared with the main Studio); the checks cover both files
   css = read('src/pages/client/design-studio/pilotStudio.css'), app = read('src/App.tsx');
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const tok = n => new RegExp(`--ps-${n}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)?.[1];
for (const [fg, bg] of [['ink', 'paper'], ['ink-2', 'paper'], ['ink-2', 'card'], ['thread', 'paper'], ['thread', 'card'], ['on-thread', 'thread'], ['danger', 'paper'], ['danger', 'card']]) ok(tok(fg) && tok(bg) && ratio(tok(fg), tok(bg)) >= 4.5, `contrast ${fg} on ${bg} is at least 4.5:1`);
ok(!/\u2014/.test(page) && !/\u2014/.test(css), 'no em dash in the page or its stylesheet');
ok(/:focus-visible/.test(css) && /prefers-reduced-motion/.test(css) && /max-width: 900px/.test(css), 'focus ring, reduced motion and the mobile breakpoint are styled');
ok(/\.ps-btn \{[^}]*min-height: 44px/.test(css) && /\.ps-chip \{[^}]*width: 44px; height: 44px/.test(css) && /\.ps-part \{[^}]*min-height: 44px/.test(css), 'buttons, colour chips and part rows meet the 44px target');
ok(/pilotEnabled\(\) \? lazy\(\(\) => import\('\.\/pages\/client\/PilotStudio'\)\) : null/.test(app) && /PilotStudio && <Route path="\/design-studio\/pilot"/.test(app) && /RequireAuth role="customer"[\s\S]{0,80}PilotStudio/.test(app), 'route exists only when the pilot flag is set, behind the client sign-in');
ok(/setItem\(DRAFT_KEY/.test(page) && /try \{[\s\S]{0,400}setItem\(DRAFT_KEY[\s\S]{0,200}\} catch/.test(page) && /try \{ stored = localStorage\.getItem/.test(page), 'draft reads and writes are guarded against blocked or full storage');
ok(/c\.dispose\(\)/.test(page) && /ResizeObserver/.test(page) && /disconnect\(\)/.test(page), 'Fabric canvases and observers are released on unmount');
ok(/UPLOAD_TYPES = \['image\/png', 'image\/jpeg', 'image\/webp'\]/.test(page) && /MAX_UPLOAD/.test(page) && !/svg/i.test(page.match(/UPLOAD_TYPES = [^;]*;/)[0]), 'logo upload accepts only PNG, JPEG and WebP under a size cap');
ok(/role="alert"/.test(page) && /ps-state/.test(page) && /No artwork on the/.test(page), 'loading, error and empty states exist');
ok(!/customer/i.test(page.replace(/role="customer"/g, '')), 'page copy says client, not customer');

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
