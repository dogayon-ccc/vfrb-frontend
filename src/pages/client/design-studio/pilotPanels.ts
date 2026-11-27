// Pure helpers for the pilot Studio (no DOM, no three.js): panel outlines, panel geometry and the local draft format.
import { cleanAssetRef, type AssetRef, type UvBakedAsset } from './studioAssets';

export type PanelSide = 'front' | 'back';
export interface Frame { x0: number; x1: number; y0: number; y1: number }
export interface SvgPanel { id: string; part: string; side: PanelSide; d: string }

const PATH_DATA = /^[MLZ0-9eE.,\s-]+$/;

// Reads <path data-panel="part.side" d="..."> from the authored panels SVG. Path data is restricted to M/L/Z commands and numbers.
export function parsePanelSvg(text: string): SvgPanel[] {
  const out: SvgPanel[] = [];
  const re = /<path\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const panel = /data-panel="([a-z_]+)\.(front|back)"/.exec(m[1]), d = /(?:^|\s)d="([^"]+)"/.exec(m[1]);
    if (panel && d && PATH_DATA.test(d[1])) out.push({ id: `${panel[1]}.${panel[2]}`, part: panel[1], side: panel[2] as PanelSide, d: d[1] });
  }
  return out;
}

// Bounding box of an M/L/Z path (manifest units). Pockets and the neck band are rectangles, so this fills the gaps the traced outline leaves.
export function bboxOf(d: string): Frame | null {
  const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)?.map(Number) ?? [];
  if (n.length < 4 || n.length % 2) return null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
  return Number.isFinite(x0 + x1 + y0 + y1) ? { x0, x1, y0, y1 } : null;
}

// The traced body outline has gaps beside every pocket, wider than the pocket's own box. Each pocket row band is backed across the body's full width
// (never wider than the body), so the gap shows the body colour instead of the page. Rows come from the pocket, columns from the body.
export function pocketBackings(panels: readonly { part: string; d: string }[], pockets: ReadonlySet<string>): Frame[] {
  const body = panels.filter(p => p.part === 'body').map(p => bboxOf(p.d)).find(Boolean);
  if (!body) return [];
  const pad = (body.y1 - body.y0) * 0.01, out: Frame[] = [];
  for (const p of panels) {
    if (!pockets.has(p.part)) continue;
    const b = bboxOf(p.d);
    if (b) out.push({ x0: body.x0, x1: body.x1, y0: Math.max(body.y0, b.y0 - pad), y1: Math.min(body.y1, b.y1 + pad) });
  }
  return out;
}

export const frameSize = (f: Frame) => ({ w: f.x1 - f.x0, h: f.y1 - f.y0 });

// The panel canvas is `width` px wide; its height keeps the frame's aspect ratio.
export function canvasSize(f: Frame, width = 1024) {
  const { w, h } = frameSize(f);
  return { width, height: Math.round((width * h) / w) };
}

// Maps the authored SVG (manifest x, y down) onto panel coordinates (x mirrored, origin top-left) so it lines up with the bake canvas.
export const panelTransform = (f: Frame) => `translate(${f.x1} ${f.y1}) scale(-1 1)`;

export const PART_LABEL: Record<string, string> = {
  body: 'Body', sleeve_l: 'Left sleeve', sleeve_r: 'Right sleeve', neck_band: 'Neck band', chest_pocket: 'Chest pocket', lower_pockets: 'Lower pockets',
};

export interface PilotArt { version?: string; objects: unknown[] }
export interface PilotDraft {
  v: 1; assetId: string; assetVersion: string; mappingHash: string;
  colors: Record<string, string>; details: Record<string, { show: boolean }>; art: Record<PanelSide, PilotArt | null>;
}
export type DraftResult = { draft: PilotDraft; reason?: undefined } | { draft: null; reason: 'empty' | 'invalid' | 'stale' };

export const DRAFT_KEY = 'vfrb.pilot01.draft.v1';
export const MAX_ART_OBJECTS = 40;
const HEX = /^#[0-9a-f]{6}$/i, DETAIL_KEYS = ['patchPocket', 'lowerPockets'];

export const colorKeys = (a: UvBakedAsset): string[] => [...new Set(a.parts.map(p => p.colorKey))];

export function serializeDraft(ref: AssetRef, s: { colors: Record<string, string>; details: Record<string, { show: boolean }>; art: Record<PanelSide, PilotArt | null> }): PilotDraft {
  return { v: 1, ...ref, colors: { ...s.colors }, details: { ...s.details }, art: { front: s.art.front, back: s.art.back } };
}

const cleanArt = (a: any): PilotArt | null => (a && typeof a === 'object' && Array.isArray(a.objects) && a.objects.length <= MAX_ART_OBJECTS
  ? { version: typeof a.version === 'string' ? a.version : undefined, objects: a.objects } : null);

// A draft is used only when it was made against the exact asset version and mapping now shipped; anything else is reported, not guessed.
export function parseDraft(raw: string | null | undefined, ref: AssetRef, allowedColorKeys: string[]): DraftResult {
  if (!raw) return { draft: null, reason: 'empty' };
  let o: any;
  try { o = JSON.parse(raw); } catch { return { draft: null, reason: 'invalid' }; }
  if (!o || typeof o !== 'object' || o.v !== 1) return { draft: null, reason: 'invalid' };
  const saved = cleanAssetRef(o);
  if (!saved) return { draft: null, reason: 'invalid' };
  if (saved.assetId !== ref.assetId || saved.assetVersion !== ref.assetVersion || saved.mappingHash !== ref.mappingHash) return { draft: null, reason: 'stale' };
  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.colors ?? {})) if (allowedColorKeys.includes(k) && typeof v === 'string' && HEX.test(v)) colors[k] = v;
  const details: Record<string, { show: boolean }> = {};
  for (const k of DETAIL_KEYS) if (typeof o.details?.[k]?.show === 'boolean') details[k] = { show: o.details[k].show };
  return { draft: { v: 1, ...saved, colors, details, art: { front: cleanArt(o.art?.front), back: cleanArt(o.art?.back) } } };
}

// Lower-case hex SHA-256 of a buffer, or null where SubtleCrypto is unavailable (plain http outside localhost).
export async function sha256Hex(buf: ArrayBuffer): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)), b => b.toString(16).padStart(2, '0')).join('');
}

// Text assets (the panel SVGs) are pinned by their LF form: Git on Windows checks them out with CRLF, which must not change the hash.
// Only carriage returns are dropped, so any other byte difference still fails the pin.
export const withoutCarriageReturns = (buf: ArrayBuffer): ArrayBuffer => {
  const src = new Uint8Array(buf), out = new Uint8Array(src.length);
  let n = 0;
  for (let i = 0; i < src.length; i++) if (src[i] !== 13) out[n++] = src[i];
  return out.slice(0, n).buffer;
};

// Display-only tidy-up of a traced outline: drops stray tracing fragments, squares the pockets and smooths the rest.
// The pinned SVG files and the 3D UV bake are not touched, so artwork mapping is unaffected.
type Pt = [number, number];
const SQUARE_PARTS = new Set(['chest_pocket', 'lower_pockets']);

const ringArea = (r: Pt[]) => Math.abs(r.reduce((a, p, i) => { const q = r[(i + r.length - 1) % r.length]; return a + q[0] * p[1] - p[0] * q[1]; }, 0) / 2);

function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], len = Math.hypot(bx - ax, by - ay);
  let at = 0, far = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], d = len ? Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / len : Math.hypot(x - ax, y - ay);
    if (d > far) { far = d; at = i; }
  }
  return far > eps ? [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)] : [pts[0], pts[pts.length - 1]];
}

// Even spacing then a moving average: mesh-triangle saw teeth (about 0.02 panel units) flatten while the silhouette keeps its shape.
function smooth(ring: Pt[], step = 0.004, radius = 6, passes = 2): Pt[] {
  const even: Pt[] = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < n; j++) even.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  });
  const N = even.length;
  if (N <= radius * 4) return ring;
  let out = even;
  for (let pass = 0; pass < passes; pass++) {
    const src = out;
    out = src.map((_, i) => {
      let x = 0, y = 0;
      for (let k = -radius; k <= radius; k++) { const p = src[(i + k + N) % N]; x += p[0]; y += p[1]; }
      return [x / (radius * 2 + 1), y / (radius * 2 + 1)] as Pt;
    });
  }
  return out;
}

const toPath = (r: Pt[]) => `M${r.map(p => `${+p[0].toFixed(5)},${+p[1].toFixed(5)}`).join(' L')}Z`;

export function cleanOutline(d: string, part: string): string {
  const rings: Pt[][] = d.split('M').map(s => {
    const n = s.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)?.map(Number) ?? [];
    return Array.from({ length: n.length >> 1 }, (_, i) => [n[i * 2], n[i * 2 + 1]] as Pt);
  }).filter(r => r.length > 2);
  const areas = rings.map(ringArea), max = Math.max(0, ...areas);
  const kept = rings.filter((_, i) => areas[i] >= max * 0.08);
  if (!kept.length) return d;
  return kept.map(r => {
    if (SQUARE_PARTS.has(part)) {
      const xs = r.map(p => p[0]), ys = r.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      return toPath([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    }
    const even = smooth(r), half = even.length >> 1; // a closed ring is simplified as two open halves
    const out = [...simplify(even.slice(0, half + 1), 0.002).slice(0, -1), ...simplify([...even.slice(half), even[0]], 0.002).slice(0, -1)];
    return toPath(out.length > 2 ? out : r);
  }).join(' ');
}

// The body's outermost left and right edge on each row, as one path: inner slits and short side notches are bridged. Used to clip the pocket
// backing bands so they close the traced gaps without sticking out past the sides.
export function envelopeOf(d: string, step = 0.006): string {
  const rings = d.split('M').map(s => s.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)?.map(Number) ?? []).filter(n => n.length > 5);
  const box = bboxOf(d), rows: [number, number, number][] = [];
  if (!box) return '';
  for (let y = box.y0 + step / 2; y < box.y1; y += step) {
    let x0 = Infinity, x1 = -Infinity;
    for (const n of rings) {
      for (let i = 0; i < n.length; i += 2) {
        const ax = n[i], ay = n[i + 1], bx = n[(i + 2) % n.length], by = n[(i + 3) % n.length];
        if ((ay <= y) === (by <= y)) continue;
        const x = ax + ((bx - ax) * (y - ay)) / (by - ay);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      }
    }
    if (x1 > x0) rows.push([y, x0, x1]);
  }
  // Vertical closing: bridges notches shorter than the window and leaves a steady taper or flare as it was.
  const run = (a: number[], f: (...n: number[]) => number) => a.map((_, i) => f(...a.slice(Math.max(0, i - 28), i + 29)));
  const lx = run(run(rows.map(r => r[1]), Math.min), Math.max), rx = run(run(rows.map(r => r[2]), Math.max), Math.min);
  const left = rows.map((r, i) => `${lx[i].toFixed(5)},${r[0].toFixed(5)}`), right = rows.map((r, i) => `${rx[i].toFixed(5)},${r[0].toFixed(5)}`).reverse();
  return left.length ? `M${[...left, ...right].join(' L')}Z` : '';
}
