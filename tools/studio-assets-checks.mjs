// Checks for src/pages/client/design-studio/studioAssets.ts and the files it points at. Run: node tools/studio-assets-checks.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root));
const src = read('src/pages/client/design-studio/studioAssets.ts').toString('utf8');
const M = await import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'));
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL ' + name); } };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
// authored scrub top: bbox y -0.95..0.936 at scale 0.54, position y -0.05 (garmentCapabilities TOP_T)
const AUTHORED_CENTRE_Y = (-0.95 + 0.936) / 2 * 0.54 - 0.05;
const glbBox = buf => {
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const m of json.meshes) for (const p of m.primitives) { const a = json.accessors[p.attributes.POSITION]; for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], a.min[i]); hi[i] = Math.max(hi[i], a.max[i]); } }
  return { lo, hi, nodes: json.nodes.map(n => n.name) };
};

for (const a of M.UV_BAKED_ASSETS) {
  const glb = read('public' + a.glb), man = read('public' + a.manifest);
  ok(sha(glb) === a.glbSha256, `${a.id}: GLB sha256 matches the registry`);
  ok(sha(man) === a.mappingSha256, `${a.id}: manifest sha256 matches the registry`);
  const m = JSON.parse(man.toString('utf8'));
  ok(m.processed_sha256 === a.glbSha256, `${a.id}: manifest names this exact GLB`);
  ok(m.mapping_version === a.mappingVersion, `${a.id}: manifest version matches`);
  const { lo, hi, nodes } = glbBox(glb), h = (hi[1] - lo[1]) * a.transform.scale;
  ok(a.parts.every(p => nodes.includes(p.node)), `${a.id}: every registered part is a node of the GLB`);
  ok(m.panels.every(p => a.parts.some(x => x.node === p.part)), `${a.id}: every manifest panel belongs to a registered part`);
  ok(Math.abs(h - 1.018) < 0.01, `${a.id}: framed height ${h.toFixed(3)} matches the authored scrub top (1.018)`);
  ok(Math.abs((hi[1] + lo[1]) / 2 * a.transform.scale + a.transform.position[1] - AUTHORED_CENTRE_Y) < 0.01, `${a.id}: vertical centre matches the authored scrub top`);
  ok(['rights_pending', 'approved'].includes(a.rights), `${a.id}: rights is a known value`);
  for (const v of ['front', 'back']) {
    ok(sha(read('public' + a.panelSvg[v].url)) === a.panelSvg[v].sha256, `${a.id}: ${v} panel SVG sha256 matches the registry`);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of m.panels) if (p.view === v) for (const t of p.mesh.xy) for (const [x, y] of t) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const f = a.frames[v];
    ok(Math.abs(f.x0 - x0) < 1e-5 && Math.abs(f.x1 - x1) < 1e-5 && Math.abs(f.y0 - y0) < 1e-5 && Math.abs(f.y1 - y1) < 1e-5, `${a.id}: ${v} frame equals the manifest extents`);
  }
}

const pilot = M.UV_BAKED_ASSETS[0];
ok(M.uvBakedAssetFor('Scrub Top', 'Short', 'male', false) === (pilot.rights === 'approved' ? pilot : null), 'rights gate: pending asset stays hidden without the pilot flag');
ok(M.uvBakedAssetFor('Scrub Top', 'Short', 'male', true)?.id === pilot.id, 'rights gate: pending asset opens with the pilot flag');
ok(M.uvBakedAssetFor('scrub top', 'Short', 'unisex', true)?.id === pilot.id, 'garment match ignores case; unisex fit accepted');
ok(M.uvBakedAssetFor('Scrub Top', '3/4', 'male', true) === null, 'a different sleeve has no baked asset');
ok(M.uvBakedAssetFor('Scrub Top', 'Short', 'female', true) === null, 'an unlisted fit has no baked asset');
ok(M.uvBakedAssetFor('Polo Shirt', 'Short', 'male', true) === null && M.uvBakedAssetFor(null, 'Short', 'male', true) === null, 'other garments and blank designs have none');
ok(M.pilotEnabled() === false, 'pilot flag is off when the build env is unset');

const ref = M.assetRefFor(pilot);
ok(ref.assetId === pilot.id && ref.assetVersion === pilot.version && ref.mappingHash === pilot.mappingSha256, 'asset reference carries id, version and mapping hash');
ok(M.assetRefFor(null) === null, 'no asset, no reference');
ok(JSON.stringify(M.cleanAssetRef({ ...ref, name: 'x', colors: {} })) === JSON.stringify(ref), 'cleanAssetRef keeps only the three fields');
ok(M.cleanAssetRef({}) === null && M.cleanAssetRef(null) === null && M.cleanAssetRef('x') === null, 'cleanAssetRef: old records without the fields give null');
ok(M.cleanAssetRef({ ...ref, mappingHash: 'nothex' }) === null, 'cleanAssetRef rejects a malformed hash');
ok(M.cleanAssetRef({ ...ref, assetId: '../../etc' }) === null && M.cleanAssetRef({ ...ref, assetVersion: 5 }) === null, 'cleanAssetRef rejects path-like ids and non-string versions');
ok(M.isAssetCurrent(null) && M.isAssetCurrent(ref), 'current reference (and none) is current');
ok(!M.isAssetCurrent({ ...ref, mappingHash: 'a'.repeat(64) }) && !M.isAssetCurrent({ ...ref, assetVersion: '0.9.0' }), 'a changed mapping or version is flagged stale');

const ser = read('src/pages/client/design-studio/designSerialization.ts').toString('utf8');
ok(/const assetRef = baked \?/.test(ser) && /if \(assetRef\) Object\.assign\(out, assetRef\)/.test(ser), 'serializeDesign writes the asset fields only when a baked asset applies');
ok(/const savedAsset = cleanAssetRef\(sc\);[\s\S]{0,60}Object\.assign\(cfg, savedAsset\)/.test(ser), 'deserializeDesign restores the fields only when they are well-formed');

const mesh = read('src/pages/client/design-studio/UvBakedGarmentMesh.tsx').toString('utf8');
const viewer = read('src/pages/client/DesignStudio3D.tsx').toString('utf8');
ok(/mappingSha256/.test(mesh) && /hash mismatch/.test(mesh) && /processed_sha256 !== asset\.glbSha256/.test(mesh), 'mesh: the manifest is hash-checked and must name the registered GLB');
ok(/b\.dispose\(\)/.test(mesh) && /material[\s\S]{0,80}dispose/.test(mesh), 'mesh: baker targets and materials are disposed on unmount');
ok(!/localStorage|sessionStorage/.test(mesh), 'mesh: no browser storage');
ok(/uvBakedAssetFor\(cfg\.garment/.test(viewer) && /fallback=\{scannedMesh\}/.test(viewer), 'viewer: the baked tier is chosen through the registry and falls back to the scanned model');
ok(!/uvBakedAssetFor|UvBakedGarmentMesh/.test(read('src/pages/client/design-studio/garmentMeshManifest.ts').toString('utf8')), 'viewer: the manifest loader does not depend on the baked tier');

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
