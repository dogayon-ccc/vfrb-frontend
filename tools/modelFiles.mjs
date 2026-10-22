// GLB models are served from Cloudinary since commit d40b50b, so public/models no longer holds them. The checks read a model from
// public/ when it is there, else from a cache downloaded once from VITE_MODEL_BASE_URL with the same path rule as src/lib/modelUrl.js.
// The cache lives in node_modules/.cache/vfrb-models (never committed). Nothing here uploads, deletes or rewrites a source asset.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const PUBLIC = path.join(ROOT, 'public');
export const CACHE = path.join(ROOT, 'node_modules', '.cache', 'vfrb-models');

// '/models/x.glb' for a model path given as '/models/..', 'models/..' or an absolute path under public/; null for anything else.
// On Windows '/models/x' also counts as absolute, so URL-style paths are recognised before path.isAbsolute.
const isFsPath = s => !/^\/?models\//.test(s) && path.isAbsolute(s);
function modelRel(p) {
  const s = String(p);
  const abs = isFsPath(s) ? path.resolve(s) : null;
  const r = abs ? (abs.startsWith(PUBLIC + path.sep) ? '/' + path.relative(PUBLIC, abs).split(path.sep).join('/') : null) : '/' + decodeURI(s).replace(/^\/+/, '');
  return r && r.startsWith('/models/') ? r : null;
}
const cachePath = r => path.join(CACHE, ...r.slice('/models/'.length).split('/'));

// Where to read a file: the public/ copy when it exists, else the cached Cloudinary copy; non-model paths pass through.
export function modelFile(p) {
  const r = modelRel(p), local = isFsPath(String(p)) ? String(p) : path.join(PUBLIC, decodeURI(String(p)).replace(/^\/+/, ''));
  if (!r || !/\.glb$/i.test(r) || fs.existsSync(local)) return local;
  const c = cachePath(r);
  return fs.existsSync(c) ? c : local;
}

// A models/ folder to list: public/ when it exists, else the cache (which holds what was fetched). Keeps a trailing separator.
export function modelDir(p) {
  const s = String(p), r = modelRel(s.replace(/[\\/]+$/, ''));
  if (!r || fs.existsSync(s)) return s;
  return cachePath(r) + (/[\\/]$/.test(s) ? path.sep : '');
}

function modelBase() {
  const b = process.env.VITE_MODEL_BASE_URL || loadEnv('development', ROOT, 'VITE_').VITE_MODEL_BASE_URL || '';
  return b.replace(/\/$/, '');
}

// Downloads every listed model that is in neither public/ nor the cache. Returns the paths that could not be fetched.
export async function fetchModels(paths, { quiet = false } = {}) {
  const want = [...new Set([...paths].map(modelRel).filter(r => r && /\.glb$/i.test(r)))]
    .filter(r => !fs.existsSync(path.join(PUBLIC, r.slice(1))) && !fs.existsSync(cachePath(r)));
  if (!want.length) return [];
  const base = modelBase();
  if (!base) { console.error(`models: ${want.length} GLB(s) are not in public/ and VITE_MODEL_BASE_URL is not set, so they cannot be fetched`); return want; }
  const failed = [];
  let i = 0;
  const worker = async () => {
    for (let r; (r = want[i++]);) {
      const url = encodeURI(base + r.slice('/models'.length).replace(/ /g, '-'));
      try {
        const res = await fetch(url);
        if (!res.ok) { failed.push(`${res.status} ${r}`); continue; }
        const dest = cachePath(r), tmp = `${dest}.part`;
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
        fs.renameSync(tmp, dest);
      } catch (e) { failed.push(`network ${r} (${e.message})`); }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  // A 404 is normal for an empty or candidate GLB slot (no file by design); the checks themselves fail if a live model is missing.
  const absent = failed.filter(f => f.startsWith('404 ')).length, errors = failed.filter(f => !f.startsWith('404 '));
  if (!quiet) console.error(`models: fetched ${want.length - failed.length} GLB(s) into node_modules/.cache/vfrb-models${absent ? `; ${absent} not on Cloudinary` : ''}${errors.length ? `; ${errors.length} failed:\n  ${errors.join('\n  ')}` : ''}`);
  return failed;
}

// Every model path the studio registries, the source and the derivation manifest name, for fetchModels.
export function studioModelPaths({ GS, C, D }) {
  const out = new Set();
  const add = p => { if (typeof p === 'string' && /^\/models\/.+\.glb$/i.test(p)) out.add(decodeURI(p)); };
  for (const s of Object.values(GS?.GLB_SLOTS ?? {})) add(s.file);
  for (const e of [...(C?.SCANNED_GARMENTS ?? []), ...(C?.PENDING_3D_MODELS ?? [])]) Object.values(e.models ?? {}).forEach(add);
  for (const m of C?.UNSUPPORTED_3D_MODELS ?? []) add(m?.path);
  for (const d of D?.ENTRIES ?? []) { add(d.glb); add(d.glbSrc); add(d.ref3D?.file); }
  const walk = dir => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => (f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)])) : []);
  const texts = [...walk(path.join(ROOT, 'src')).filter(f => /\.(jsx?|mjs)$/.test(f)), path.join(ROOT, 'tools', 'logic-checks.mjs'), path.join(ROOT, 'tools', 'asset-audit.mjs')];
  for (const f of texts) for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"`/]((?:\/)?models\/[^'"`$\s]+?\.glb)['"`]/gi)) add('/' + m[1].replace(/^\/+/, ''));
  const man = path.join(ROOT, 'tools', 'glb-extract', 'derived-manifest.json');
  if (fs.existsSync(man)) {
    const j = JSON.parse(fs.readFileSync(man, 'utf8'));
    Object.keys(j.originals_sha256 ?? {}).forEach(id => add(`/models/reference/${id}.glb`));
    (j.pieces ?? []).forEach(p => add(p.glb));
  }
  return out;
}
