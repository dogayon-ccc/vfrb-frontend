// Production print planning: pure functions, no Fabric and no DOM, so tools/print-export-checks.mjs can test them in Node.
//
// What is physical here, and what is not:
//  - Print size is the width the CUSTOMER enters for each artwork item (cm). Height follows the item's own aspect ratio.
//  - Files are rendered at PRINT_DPI over that size, so pixel size = cm / 2.54 * 300. Nothing is guessed.
//  - Garment dimensions (VFRB's size chart and patterns) are internal and are never used or shown. Placement is therefore given as
//    a share of the drawn garment, not in cm, and the sheet says so.
export const PRINT_DPI = 300;
export const CM_PER_INCH = 2.54;
export const PRINT_MIN_CM = 0.5;
export const PRINT_MAX_CM = 50;
export const FULL_DPI = 300;   // at or above: prints at full quality
export const MIN_DPI = 150;    // below: visibly soft, flagged as poor

export const pxForCm = (cm: number) => Math.max(1, Math.round((cm / CM_PER_INCH) * PRINT_DPI));
export const cmForPx = (px: number) => (px / PRINT_DPI) * CM_PER_INCH;
export const round1 = (n: number) => Math.round(n * 10) / 10;

// A width the customer typed ("8", "8.5", "8,5"), or null when it is not a usable print width.
export function parsePrintWidth(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < PRINT_MIN_CM || n > PRINT_MAX_CM) return null;
  return round1(n);
}

export type PrintKind = 'image' | 'text' | 'shape' | 'drawing';
export interface FaceMetrics { canvas: { w: number; h: number }; box: { left: number; top: number; width: number; height: number } | null }
export interface PrintItem {
  id: string; face: 'front' | 'back'; label: string; kind: PrintKind;
  json: any;                          // the saved overlay object (re-rendered alone for its print file)
  bboxPx: { w: number; h: number };   // unrotated size on the design canvas
  centre: { x: number; y: number };   // canvas px
  angle: number;
  srcWidthPx: number | null;          // raster artwork only
  vector: boolean;
  widthCm: number | null;             // customer-entered; null = not calibrated
  heightCm: number | null;
  dpi: number | null;                 // effective resolution of raster artwork at widthCm
  quality: 'vector' | 'ok' | 'low' | 'poor' | 'unsized';
  placement: { xPct: number; yPct: number; zone: string } | null;
}

export function kindOf(o: any): PrintKind | null {
  if (!o || o.__garmentBase || o.__hoverGlow || o.__pocket || o.__erase) return null;
  if (o.visible === false) return null;
  if (o.__text || typeof o.text === 'string') return 'text';
  if (o.__logo || o.__artwork || o.type?.toLowerCase() === 'image') return 'image';
  if (o.__draw) return 'drawing';
  if (o.__shape) return 'shape';
  return null;
}

const isVectorSrc = (s: unknown) => typeof s === 'string' && (/^data:image\/svg/i.test(s) || /\.svg(\?|$)/i.test(s));
const KIND_LABEL: Record<PrintKind, string> = { image: 'Artwork', text: 'Text', shape: 'Shape', drawing: 'Drawing' };

export function itemLabel(o: any, kind: PrintKind, n: number): string {
  const own = String(o.__layerName ?? '').trim();
  if (kind === 'text' && !own) return `Text "${String(o.text ?? '').replace(/\s+/g, ' ').slice(0, 24)}"`;
  return own || `${KIND_LABEL[kind]} ${n}`;
}

export function zoneLabel(xPct: number, yPct: number): string {
  const row = yPct < 33 ? 'upper' : yPct > 66 ? 'lower' : 'middle';
  const col = xPct < 38 ? 'left' : xPct > 62 ? 'right' : 'centre';
  return row === 'middle' && col === 'centre' ? 'centre' : `${row} ${col}`;
}

export function qualityOf(vector: boolean, dpi: number | null, widthCm: number | null): PrintItem['quality'] {
  if (widthCm == null) return 'unsized';
  if (vector || dpi == null) return 'vector';
  return dpi >= FULL_DPI ? 'ok' : dpi >= MIN_DPI ? 'low' : 'poor';
}

// facesJSON: { front: overlay[], back: overlay[] } as saved (canvas coordinates). sizes: { [layerId]: widthCm }.
export function buildPrintPlan(facesJSON: Record<string, any[]>, sizes: Record<string, unknown> = {}, metrics: Record<string, FaceMetrics | null | undefined> = {}) {
  const items: PrintItem[] = [];
  for (const face of ['front', 'back'] as const) {
    let n = 0;
    for (const o of facesJSON?.[face] ?? []) {
      const kind = kindOf(o);
      if (!kind) continue;
      n++;
      const sx = Math.abs(o.scaleX ?? 1), sy = Math.abs(o.scaleY ?? 1);
      const bw = Math.max(1, (o.width ?? 0) * sx), bh = Math.max(1, (o.height ?? 0) * sy);
      const cx = o.originX === 'center' ? o.left ?? 0 : (o.left ?? 0) + bw / 2;
      const cy = o.originY === 'center' ? o.top ?? 0 : (o.top ?? 0) + bh / 2;
      const id = String(o.__layerId ?? `${face}-${n}`);
      const widthCm = parsePrintWidth(sizes?.[id]);
      const vector = kind !== 'image' || isVectorSrc(o.src);
      const srcWidthPx = kind === 'image' && !vector ? Math.max(1, (o.width ?? 0) - (o.cropX ?? 0)) : null;
      const heightCm = widthCm == null ? null : round1(widthCm * (bh / bw));
      const dpi = widthCm != null && srcWidthPx ? Math.round(srcWidthPx / (widthCm / CM_PER_INCH)) : null;
      const m = metrics?.[face];
      let placement: PrintItem['placement'] = null;
      if (m?.box && m.box.width > 0 && m.box.height > 0) {
        const xPct = Math.max(0, Math.min(100, Math.round(((cx - m.box.left) / m.box.width) * 100)));
        const yPct = Math.max(0, Math.min(100, Math.round(((cy - m.box.top) / m.box.height) * 100)));
        placement = { xPct, yPct, zone: zoneLabel(xPct, yPct) };
      }
      items.push({ id, face, label: itemLabel(o, kind, n), kind, json: o, bboxPx: { w: bw, h: bh }, centre: { x: cx, y: cy }, angle: o.angle ?? 0,
        srcWidthPx, vector, widthCm, heightCm, dpi, quality: qualityOf(vector, dpi, widthCm), placement });
    }
  }
  return { items, ready: items.filter(i => i.widthCm != null), pending: items.filter(i => i.widthCm == null) };
}

export const slug = (s: string) => String(s ?? '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'item';
const num = (n: number) => String(round1(n)).replace('.', 'p');

// Unique, sortable, self-describing: 01-front-left-chest-logo_8p0x6p2cm_300dpi.png
export function printFileNames(items: Array<Pick<PrintItem, 'face' | 'label' | 'widthCm' | 'heightCm'>>): string[] {
  return items.map((it, i) => `${String(i + 1).padStart(2, '0')}-${it.face}-${slug(it.label)}_${num(it.widthCm ?? 0)}x${num(it.heightCm ?? 0)}cm_${PRINT_DPI}dpi.png`);
}

export function qualityNote(it: Pick<PrintItem, 'quality' | 'dpi'>): string {
  if (it.quality === 'poor') return `Very low resolution (${it.dpi} DPI): will print soft. Use a larger source image or a smaller print size.`;
  if (it.quality === 'low') return `Below 300 DPI (${it.dpi} DPI): acceptable only for small viewing distances.`;
  if (it.quality === 'ok') return `${it.dpi} DPI at this size`;
  if (it.quality === 'vector') return 'Vector or text: sharp at any size';
  return 'No print size set: not exported';
}
