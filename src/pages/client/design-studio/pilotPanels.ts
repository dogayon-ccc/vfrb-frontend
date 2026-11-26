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
