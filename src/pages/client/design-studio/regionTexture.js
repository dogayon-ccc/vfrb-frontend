import * as THREE from 'three';
import { PATTERNS } from './dsShared';

// Region-level customisation for scanned GLBs whose zones share one mesh and one material.
// The GLBs are pattern-piece exports: every UV island is a cut panel (sleeve, front, neck band, pocket...).
// Islands are found from the UV data, classified into 2D zone keys by the manifest's `regionOf`, and
// painted into a generated UV texture, so solid colour and patterns follow the real garment surface.

// Patterned zone: `ink` is the zone colour, `ground` is that colour mixed toward white (see 2D: stripes are zone colour at 35% opacity).
const GROUND_MIX = 0.65;
const TILE_SCALE = 4;

const islandCache = new WeakMap();

// Welds vertices by UV, then unions triangles that share a welded UV vertex -> one island per cut panel.
export function getIslands(geometry) {
  if (islandCache.has(geometry)) return islandCache.get(geometry);
  const uv = geometry.attributes.uv, pos = geometry.attributes.position, index = geometry.index;
  if (!uv) { islandCache.set(geometry, null); return null; }
  const vcount = pos.count, weld = new Int32Array(vcount), keys = new Map();
  for (let i = 0; i < vcount; i++) {
    const key = `${Math.round(uv.getX(i) * 1e5)},${Math.round(uv.getY(i) * 1e5)}`;
    if (!keys.has(key)) keys.set(key, keys.size);
    weld[i] = keys.get(key);
  }
  const parent = Int32Array.from({ length: keys.size }, (_, i) => i);
  const find = a => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const tcount = (index ? index.count : vcount) / 3;
  const tri = t => (index ? [index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2]);
  for (let t = 0; t < tcount; t++) {
    const [a, b, c] = tri(t);
    parent[find(weld[b])] = find(weld[a]);
    parent[find(weld[c])] = find(weld[a]);
  }
  const byRoot = new Map(), islands = [];
  const of = v => {
    const r = find(weld[v]);
    if (!byRoot.has(r)) { byRoot.set(r, islands.length); islands.push({ tris: [], verts: new Set() }); }
    return islands[byRoot.get(r)];
  };
  for (let t = 0; t < tcount; t++) { const v = tri(t); const isl = of(v[0]); isl.tris.push(v); v.forEach(i => isl.verts.add(i)); }
  islands.forEach(isl => {
    const n = isl.verts.size, c = [0, 0, 0];
    isl.verts.forEach(i => { c[0] += pos.getX(i); c[1] += pos.getY(i); c[2] += pos.getZ(i); });
    isl.n = n; isl.c = c.map(v => v / n);
    isl.map = fitPlanar(isl, pos, uv);
  });
  islandCache.set(geometry, islands);
  return islands;
}

// Least-squares affine map from UV to model-space (x, y): [X, Y] = M * [u, v] + t. Null when the island is degenerate.
function fitPlanar(isl, pos, uv) {
  let s = [0, 0, 0, 0, 0, 0, 0, 0, 0], bx = [0, 0, 0], by = [0, 0, 0];
  isl.verts.forEach(i => {
    const u = uv.getX(i), v = uv.getY(i), p = [u, v, 1], X = pos.getX(i), Y = pos.getY(i);
    for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) s[r * 3 + c] += p[r] * p[c]; bx[r] += p[r] * X; by[r] += p[r] * Y; }
  });
  const inv = invert3(s);
  if (!inv) return null;
  const mul = b => [0, 1, 2].map(r => inv[r * 3] * b[0] + inv[r * 3 + 1] * b[1] + inv[r * 3 + 2] * b[2]);
  const [a1, b1, c1] = mul(bx), [a2, b2, c2] = mul(by);
  const det = a1 * b2 - b1 * a2;
  return Math.abs(det) < 1e-7 ? null : { a1, b1, c1, a2, b2, c2, det };
}

function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map(v => v / det);
}

export function regionMap(geometry, regionOf) {
  const islands = getIslands(geometry);
  return islands ? islands.map(isl => regionOf({ n: isl.n, c: isl.c })) : null;
}

const hexMix = (hex, toward, t) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex), b = p(toward);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

const REGION_COLOR = {
  body: c => c.body,
  sleeve: c => c.sleeve ?? c.body,
  collar: c => c.collar ?? c.body,
  pocket: c => c.pocket ?? c.collar ?? c.body,
};

// Same tile geometry as the 2D PATTERNS svg strings (20x20, or 24x24 for geometric); `w`/`s` are the 2D slider values.
function tileCanvas(id, ink, w, s) {
  const size = id === 'geometric' ? 24 : 20;
  const c = document.createElement('canvas');
  c.width = c.height = size * TILE_SCALE;
  const g = c.getContext('2d');
  g.scale(TILE_SCALE, TILE_SCALE);
  g.fillStyle = g.strokeStyle = ink;
  if (id === 'hstripes') { g.fillRect(0, 0, 20, w); g.fillRect(0, w + s, 20, w); }
  else if (id === 'vstripes') { g.fillRect(0, 0, w, 20); g.fillRect(w + s, 0, w, 20); }
  else if (id === 'diagonal') {
    g.lineWidth = w;
    [[0, 20, 20, 0], [-10 - s, 20, 10 - s, 0], [10 + s, 20, 30 + s, 0]].forEach(([x1, y1, x2, y2]) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); });
  } else if (id === 'checker') { g.fillRect(0, 0, 10, 10); g.fillRect(10, 10, 10, 10); }
  else if (id === 'polka') { [[5, 5], [15, 15]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }); }
  else if (id === 'geometric') { g.lineWidth = 1.5; g.beginPath(); g.moveTo(12, 2); g.lineTo(22, 20); g.lineTo(2, 20); g.closePath(); g.stroke(); }
  return { canvas: c };
}

// Patterns without a tile above (solid, gradient) paint as solid colour.
const PATTERN_IDS = new Set(['hstripes', 'vstripes', 'diagonal', 'checker', 'polka', 'geometric']);

function trianglePath(g, geometry, isl, S) {
  const uv = geometry.attributes.uv;
  g.beginPath();
  isl.tris.forEach(([a, b, c]) => {
    g.moveTo(uv.getX(a) * S, uv.getY(a) * S);
    g.lineTo(uv.getX(b) * S, uv.getY(b) * S);
    g.lineTo(uv.getX(c) * S, uv.getY(c) * S);
    g.closePath();
  });
}

// pxToModel: model units per 2D sketch pixel, so pattern width/spacing match what the 2D canvas shows.
export function buildRegionTexture({ geometry, regionOf, colors, patterns = {}, patternParams = {}, pxToModel, size }) {
  const islands = getIslands(geometry);
  if (!islands) return null;
  const regions = islands.map(isl => regionOf({ n: isl.n, c: isl.c }));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const base = colors.body ?? '#028090';
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  const fills = {};
  Object.keys(REGION_COLOR).forEach(r => {
    const ink = REGION_COLOR[r](colors) ?? base;
    const id = PATTERN_IDS.has(patterns[r]) ? patterns[r] : 'solid';
    fills[r] = { ink, id, ground: id === 'solid' ? ink : hexMix(ink, '#ffffff', GROUND_MIX) };
  });

  islands.forEach((isl, k) => {
    const f = fills[regions[k]] ?? fills.body;
    g.save();
    trianglePath(g, geometry, isl, size);
    g.fillStyle = f.ground; g.strokeStyle = f.ground; g.lineWidth = 2; g.lineJoin = 'round';
    g.fill(); g.stroke(); // stroke bleeds a texel past the island so mipmaps do not pull in the base colour
    if (f.id !== 'solid' && isl.map) {
      const def = PATTERNS.find(p => p.id === f.id);
      const params = patternParams[regions[k]] ?? def?.defaultParams ?? {};
      const { canvas: tile } = tileCanvas(f.id, f.ink, params.width ?? def?.defaultParams?.width ?? 5, params.spacing ?? def?.defaultParams?.spacing ?? 5);
      const pattern = g.createPattern(tile, 'repeat');
      pattern.setTransform(new DOMMatrix().scale(1 / TILE_SCALE));
      // model (X, Y) -> UV is the inverse of the island fit; sketch px -> model is (k, -k).
      const { a1, b1, c1, a2, b2, c2, det } = isl.map;
      const i00 = b2 / det, i01 = -b1 / det, i10 = -a2 / det, i11 = a1 / det;
      const k2 = pxToModel * size;
      g.clip();
      g.setTransform(i00 * k2, i10 * k2, -i01 * k2, -i11 * k2, -(i00 * c1 + i01 * c2) * size, -(i10 * c1 + i11 * c2) * size);
      g.fillStyle = pattern;
      g.fillRect(-4000, -4000, 8000, 8000);
    }
    g.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false; // glTF UV origin is top-left
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 8;
  return tex;
}
