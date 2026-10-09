// Run: node tools/asset-audit.mjs [--write]
// Cross-checks every asset the studio registries and source reference against the files in public/models, public/garments2d
// and public/gallery. Reports missing references, unreferenced files and duplicate ids. --write regenerates
// docs/engineering/ASSET-REGISTRY.md from the same data (the registries stay the source of truth; the doc is a checked snapshot).
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DIRS = ['models', 'garments2d', 'gallery'];
// Files on disk that nothing references on purpose. Anything else unreferenced fails the audit.
export const UNREFERENCED_OK = {
  '/models/lab-coverall.glb': 'Listed in UNSUPPORTED_3D_MODELS (fused human figure, single mesh, no materials/UVs); kept as source, never rendered.',
  '/models/processed/work-shirt-short-sleeve.glb': 'Output of tools/glb-extract/build_processed.py and the input of cap_open_boundaries.py; the studio renders the capped copy.',
  '/models/vfrb-staged/pants.glb': 'Staged by the project owner; no tool or registry uses it yet and its intended processing is unverified. pants-trousers.glb comes from a different source scan.',
};

const v = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const L = p => v.ssrLoadModule(p);
const A = await L('/src/pages/client/design-studio/garmentAssets.js');
const GS = await L('/src/pages/client/design-studio/glbSlots.js');
const C = await L('/src/pages/client/design-studio/garmentCapabilities.js');
const D = await L('/src/pages/client/design-studio/designGallery.js');
await v.close();

const refs = new Map(); // asset path -> Set of "who references it"
const add = (p, who) => { if (!p) return; p = decodeURI(p); (refs.get(p) ?? refs.set(p, new Set()).get(p)).add(who); };

const photoBases = [];
for (const [garment, bySleeve] of Object.entries(A.ASSET_2D))
  for (const [sleeve, byFace] of Object.entries(bySleeve))
    for (const [face, byFit] of Object.entries(byFace))
      for (const [fit, a] of Object.entries(byFit)) {
        photoBases.push({ ...a, garment, sleeve, face, fit });
        add(a.src, `photo base ${a.id}`);
        if (a.trim?.mask) add(a.trim.mask, `trim mask ${a.id}`);
      }

for (const s of Object.values(GS.GLB_SLOTS)) if (GS.slotLive(s) || fs.existsSync(path.join(ROOT, 'public', s.file))) add(s.file, `GLB slot ${s.id} (${s.state})`);
for (const e of C.SCANNED_GARMENTS) for (const m of Object.values(e.models)) add(m, `3D entry ${e.id}`);
for (const m of C.UNSUPPORTED_3D_MODELS ?? []) if (m?.path) add(m.path, `unsupported model (${m.reason ?? 'rejected'})`);
for (const d of D.ENTRIES) add(d.image, `gallery photo ${d.id}`);

// Literal paths anywhere in src (thumbnails, previews, fallbacks).
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)]);
for (const file of walk(path.join(ROOT, 'src')).filter(f => /\.(jsx?|css)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/['"`](\/(?:models|garments2d|gallery)\/[^'"`$]+?\.(?:glb|webp|png|jpe?g|svg))['"`]/g)) add(m[1], `literal in ${path.relative(ROOT, file).replace(/\\/g, '/')}`);
}

const onDisk = DIRS.flatMap(d => fs.existsSync(path.join(ROOT, 'public', d)) ? walk(path.join(ROOT, 'public', d)) : [])
  .map(f => '/' + path.relative(path.join(ROOT, 'public'), f).replace(/\\/g, '/')).sort();
const missing = [...refs.keys()].filter(p => !fs.existsSync(path.join(ROOT, 'public', p))).sort();
const unreferenced = onDisk.filter(p => !refs.has(p));
// PNG masters copied by tools/vfrb-asset-import are kept unresized as the authoritative source; each must have its gallery preview.
const MASTER = '/garments2d/source/';
const isMaster = p => p.startsWith(MASTER) && p.endsWith('.png');
const mastersWithoutPreview = onDisk.filter(isMaster).filter(p => !onDisk.includes(`/gallery/${p.slice(MASTER.length, -4)}.webp`));
const unexplained = unreferenced.filter(p => !UNREFERENCED_OK[p] && !isMaster(p));
const ids = photoBases.map(b => b.id);
const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
const sharedFiles = [...refs.entries()].filter(([p, who]) => [...who].filter(w => w.startsWith('photo base')).length > 1).map(([p]) => p);

// Contract status per editable garment: verified-3d > approximate-3d > editable-2d; photos without a base are reference-only.
const status3D = e => (e.verification || e.status === 'verified') ? 'verified-3d' : 'approximate-3d';
const garmentRows = C.SCANNED_GARMENTS.map(e => ({ id: e.id, label: status3D(e), models: Object.entries(e.models).map(([f, m]) => `${f}: ${decodeURI(m)}`).join('; '), limits: (e.capabilities?.limitations ?? []).join('; ') }));
const galleryRows = D.ENTRIES.map(d => ({ id: d.id, label: d.tier === 'reference' ? 'reference-only' : d.tier === 'editable-2d' ? 'editable-2d' : d.tier === '2d-3d' ? 'verified-3d' : 'approximate-3d', target: d.base ? `${d.base[1]} / ${d.base[2]}${d.base[3] ? ' (' + d.base[3] + ')' : ' (vector)'}` : '—', glb: d.glb ?? '—' }));

const result = { referenced: refs.size, onDisk: onDisk.length, missing, unreferenced: unreferenced.filter(p => !isMaster(p)), masters: onDisk.filter(isMaster).length, mastersWithoutPreview, unexplained, dupIds, sharedFiles, photoBases: photoBases.length, garmentRows, galleryRows };

if (process.argv.includes('--write')) {
  const row = cells => `| ${cells.join(' | ')} |`;
  const md = [
    '# Asset registry (generated)',
    '',
    'Generated by `node tools/asset-audit.mjs --write` from the studio registries (`garmentAssets.js`, `glbSlots.js`, `garmentCapabilities.js`, `designGallery.js`).',
    'Edit the registries, not this file. Status labels: `reference-only` (photo only), `editable-2d` (opens a 2D template), `approximate-3d` (real GLB with documented limits), `verified-3d` (GLB with a verification record; none yet).',
    '',
    `Files on disk: ${onDisk.length} · referenced paths: ${refs.size} · missing: ${missing.length} · unreferenced: ${unreferenced.length} (unexplained: ${unexplained.length}) · duplicate photo-base ids: ${dupIds.length}`,
    '',
    '## 2D photo bases',
    row(['id', 'garment / sleeve / face / fit', 'file', 'zones']), row(['---', '---', '---', '---']),
    ...photoBases.map(b => row([b.id, `${b.garment} / ${b.sleeve} / ${b.face} / ${b.fit}`, b.src, b.zones.join(', ')])),
    '',
    '## 3D garments',
    row(['entry', 'status', 'models', 'limitations']), row(['---', '---', '---', '---']),
    ...garmentRows.map(r => row([r.id, r.label, r.models, r.limits || '—'])),
    '',
    '## Gallery photos',
    row(['photo', 'status', 'opens', 'GLB']), row(['---', '---', '---', '---']),
    ...galleryRows.map(r => row([r.id, r.label, r.target, r.glb])),
    '',
    '## Files kept but not rendered',
    ...unreferenced.filter(p => !isMaster(p)).map(p => `- \`${p}\`: ${UNREFERENCED_OK[p] ?? '**UNEXPLAINED: reference it or document why it is kept**'}`),
    `- ${onDisk.filter(isMaster).length} PNG masters in \`${MASTER}\` (authoritative sources from tools/vfrb-asset-import; previews are \`/gallery/<name>.webp\`; missing preview: ${mastersWithoutPreview.length})`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'docs/engineering/ASSET-REGISTRY.md'), md);
}

console.log(JSON.stringify({ ...result, garmentRows: undefined, galleryRows: undefined }, null, 1));
const failed = missing.length || unexplained.length || dupIds.length || mastersWithoutPreview.length;
console.log(failed ? 'ASSET AUDIT: FAIL' : 'ASSET AUDIT: PASS');
process.exit(failed ? 1 : 0);
