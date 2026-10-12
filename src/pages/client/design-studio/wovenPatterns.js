// Woven and printed zone patterns, generated in code (no image assets). Each woven pattern is a real weave: a warp colour
// sequence, a weft colour sequence and a structure (which thread is on top at each crossing), so houndstooth, glen plaid,
// gingham or denim come out of the same rule cloth does. Colour 1 is the zone's own colour (cfg.colors, the source of truth);
// colour 2, scale and rotation live in cfg.patternParams[zone]. 2D only: the 3D path paints these zones as solid colour.

const A = 0, B = 1, M = 2, D = 3, L = 4;  // colour 1, colour 2, light mix, dark mix, lighter colour 1
const run = (...pairs) => pairs.flatMap(([c, n]) => Array(n).fill(c));
const twill = (x, y) => ((x + y) & 3) < 2;          // 2/2 twill: diagonal rib
const plain = (x, y) => ((x + y) & 1) === 0;        // 1/1 plain weave
const denimUp = (x, y) => ((x + y) & 3) !== 0;      // 3/1 warp-faced twill
const herring = (x, y) => (((Math.floor(x / 6) & 1 ? x + y : x - y) & 3) + 4) % 4 < 2; // twill reversing every 6 ends

// Seeded so a tweed looks identical on every device and in every export.
function flecks(n, seed) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => { const r = rnd(); return r < 0.58 ? A : r < 0.74 ? D : r < 0.88 ? L : B; });
}

const WEAVES = {
  pinstripe:   { warp: run([A, 15], [B, 1]),                   weft: [A],                   up: twill,   rep: 4 },
  chalkstripe: { warp: run([A, 17], [M, 1], [B, 1], [M, 1]),   weft: [A],                   up: plain,   rep: 2 },
  houndstooth: { warp: run([A, 4], [B, 4]),                    weft: run([A, 4], [B, 4]),   up: twill,   rep: 4 },
  glenplaid:   { warp: run([A, 4], [B, 4], [A, 4], [B, 4], [A, 2], [B, 2], [A, 2], [B, 2], [A, 2], [B, 2], [A, 2], [B, 2]), weft: null, up: twill, rep: 4 },
  tartan:      { warp: run([A, 10], [D, 6], [A, 2], [B, 2], [A, 2], [D, 6]), weft: null,      up: twill,   rep: 4 },
  gingham:     { warp: run([A, 6], [B, 6]),                    weft: null,                  up: plain,   rep: 2 },
  herringbone: { warp: [A],                                    weft: [M],                   up: herring, rep: 12 },
  windowpane:  { warp: run([A, 22], [B, 2]),                   weft: null,                  up: plain,   rep: 2 },
  twill:       { warp: [A],                                    weft: [M],                   up: twill,   rep: 4 },
  tweed:       { warp: flecks(24, 11),                         weft: flecks(20, 29),        up: twill,   rep: 4 },
  denim:       { warp: [A],                                    weft: [B],                   up: denimUp, rep: 4 },
};

export const WOVEN_PATTERNS = [
  { id: 'pinstripe', label: 'Pinstripe' }, { id: 'chalkstripe', label: 'Chalk stripe' }, { id: 'houndstooth', label: 'Houndstooth' },
  { id: 'glenplaid', label: 'Glen plaid' }, { id: 'tartan', label: 'Tartan' }, { id: 'gingham', label: 'Gingham' },
  { id: 'herringbone', label: 'Herringbone' }, { id: 'pindot', label: 'Pin dot' }, { id: 'windowpane', label: 'Check' },
  { id: 'twill', label: 'Twill' }, { id: 'tweed', label: 'Tweed' }, { id: 'denim', label: 'Denim' },
];
const IDS = new Set(WOVEN_PATTERNS.map(p => p.id));
export const isWoven = id => IDS.has(id);

export const SCALE_RANGE = { min: 0.5, max: 3 };
const HEX = /^#[0-9a-f]{6}$/i;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const luma = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// Colour 2 until the customer picks one: a contrast of the zone colour (denim: undyed weft).
export const defaultColour2 = (id, c1) => (id === 'denim' ? '#e9e4d8' : luma(HEX.test(c1 ?? '') ? c1 : '#1b2a4a') > 0.5 ? '#1f2937' : '#f8fafc');

// Saved params are clamped on use, so a hand-edited or older record can never break rendering.
export function wovenParams(id, params, c1) {
  const p = params && typeof params === 'object' ? params : {};
  const scale = Number.isFinite(p.scale) ? Math.min(SCALE_RANGE.max, Math.max(SCALE_RANGE.min, p.scale)) : 1;
  const rotation = Number.isFinite(p.rotation) ? ((Math.round(p.rotation) % 180) + 180) % 180 : 0;
  return { scale, rotation, c2: HEX.test(p.c2 ?? '') ? p.c2.toLowerCase() : defaultColour2(id, c1) };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);
// Tile size in threads: one full repeat of both colour sequences and the structure.
export function tileThreads(id) {
  if (id === 'pindot') return { cols: 10, rows: 10 };
  const w = WEAVES[id];
  return { cols: lcm(w.warp.length, w.rep), rows: lcm((w.weft ?? w.warp).length, w.rep) };
}

export const RES = 2;   // tile pixels per sketch pixel, so the weave stays crisp when the stage is zoomed
const THREAD = 2;       // sketch px per thread at scale 1
const cache = new Map();
const threadPx = scale => Math.max(2, Math.round(THREAD * scale * RES)); // tile pixels per thread

// One repeat's size in sketch pixels (the tile canvas is RES times larger).
export function tileSize(id, scale = 1) {
  const { cols, rows } = tileThreads(id), t = threadPx(scale) / RES;
  return { w: cols * t, h: rows * t };
}

// One repeat as a canvas (cached). Each crossing shows the thread on top, with a darker edge and a faint highlight so the
// cloth reads as woven threads rather than flat print. Returns null where there is no DOM (SSR, logic checks).
export function wovenTile(id, c1, c2, scale = 1) {
  if (!isWoven(id) || typeof document === 'undefined') return null;
  const a = HEX.test(c1 ?? '') ? c1.toLowerCase() : '#1b2a4a', b = HEX.test(c2 ?? '') ? c2.toLowerCase() : defaultColour2(id, a);
  const t = threadPx(scale);
  const key = `${id}|${a}|${b}|${t}`;
  if (cache.has(key)) return cache.get(key);
  const { cols, rows } = tileThreads(id);
  const c = document.createElement('canvas'); c.width = cols * t; c.height = rows * t;
  const g = c.getContext('2d');
  if (id === 'pindot') {
    g.fillStyle = a; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = b;
    [[2.5, 2.5], [7.5, 7.5]].forEach(([x, y]) => { g.beginPath(); g.arc(x * t, y * t, t * 0.85, 0, Math.PI * 2); g.fill(); });
  } else {
    const pal = [a, b, mix(a, b, 0.3), mix(a, '#000000', 0.35), mix(a, '#ffffff', 0.18)];
    const w = WEAVES[id], weft = w.weft ?? w.warp;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const warpUp = w.up(x, y);
      g.fillStyle = pal[warpUp ? w.warp[x % w.warp.length] : weft[y % weft.length]];
      g.fillRect(x * t, y * t, t, t);
      // Thread roundness: a warp float darkens at its sides, a weft float at its lower edge.
      g.fillStyle = 'rgba(0,0,0,.13)';
      if (warpUp) g.fillRect(x * t + t - 1, y * t, 1, t); else g.fillRect(x * t, y * t + t - 1, t, 1);
      g.fillStyle = 'rgba(255,255,255,.07)';
      if (warpUp) g.fillRect(x * t + (t >> 1) - 1, y * t, 1, t); else g.fillRect(x * t, y * t + (t >> 1) - 1, t, 1);
    }
  }
  if (cache.size > 48) cache.clear();
  cache.set(key, c);
  return c;
}

// Pattern-space transform: rotation, then back to sketch pixels (the tile is drawn at RES).
export function wovenMatrix(rotation = 0) {
  const r = (rotation * Math.PI) / 180, k = 1 / RES, cos = Math.cos(r) * k, sin = Math.sin(r) * k;
  return [cos, sin, -sin, cos, 0, 0];
}

// Fabric fill for a woven zone, or null when no tile can be drawn.
export function wovenFill(fabric, id, c1, params) {
  const p = wovenParams(id, params, c1), tile = wovenTile(id, c1, p.c2, p.scale);
  return tile ? new fabric.Pattern({ source: tile, repeat: 'repeat', patternTransform: wovenMatrix(p.rotation) }) : null;
}

const urls = new Map();
// Data URL of a tile, for SVG previews (GarmentSilhouette) and the pattern picker.
export function wovenTileUrl(id, c1, c2, scale = 1) {
  const tile = wovenTile(id, c1, c2, scale);
  if (!tile) return null;
  const key = `${id}|${c1}|${c2}|${scale}`;
  if (!urls.has(key)) { if (urls.size > 96) urls.clear(); urls.set(key, tile.toDataURL()); }
  return urls.get(key);
}

// "Body: Houndstooth (colour 2 #F8FAFC, scale 1.5x, 45°)" lines for the PDF spec and the admin order view.
export function describePatterns(patterns, patternParams, colors = {}, labelOf = id => id) {
  return Object.entries(patterns ?? {}).filter(([, id]) => id && id !== 'solid').map(([zone, id]) => {
    const name = `${zone[0].toUpperCase()}${zone.slice(1)}: ${labelOf(id)}`;
    if (!isWoven(id)) return name;
    const p = wovenParams(id, patternParams?.[zone], colors[zone] ?? colors.body);
    return `${name} (colour 2 ${p.c2.toUpperCase()}, scale ${p.scale}x${p.rotation ? `, ${p.rotation}°` : ''})`;
  });
}
