// Flat picture of a UV-baked garment drawn straight from the design data (part colours + panel artwork). Used by the set preview,
// PNG/PDF export and order thumbnails, so none of them depends on the panel workspace being mounted.
import { StaticCanvas } from 'fabric';
import type { UvBakedAsset, PanelArt } from './studioAssets';
import { parsePanelSvg, cleanOutline, canvasSize, frameSize, sha256Hex, withoutCarriageReturns, pocketBackings, envelopeOf, type PanelSide, type SvgPanel } from './pilotPanels';

export const DEFAULT_PART_COLOR = '#1B2A4A';
export const DETAIL_PARTS = new Set(['chest_pocket', 'lower_pockets', 'neck_band']);
export const POCKET_PARTS = new Set(['chest_pocket', 'lower_pockets']); // the body colour backs these rows so no gap shows beside a pocket
const ART_W = 1024; // panel artwork is stored in the coordinates of a 1024 px wide panel canvas

export function partColorOf(asset: UvBakedAsset, colors: Record<string, string>, node: string): string {
  const p = asset.parts.find(x => x.node === node)!;
  return colors[p.colorKey] ?? (p.fallbackKey ? colors[p.fallbackKey] : undefined) ?? colors.body ?? DEFAULT_PART_COLOR;
}
export const partHidden = (asset: UvBakedAsset, details: Record<string, { show?: boolean }>, node: string) => {
  const p = asset.parts.find(x => x.node === node);
  return !!(p?.detail && details[p.detail]?.show === false);
};
// Spec sheet row: every visible part with the colour it is really painted in, fallbacks included.
export const partColourRow = (asset: UvBakedAsset, colors: Record<string, string>, details: Record<string, { show?: boolean }>) =>
  asset.parts.filter(p => !partHidden(asset, details, p.node)).map(p => `${p.node.replace(/_l$/, ' left').replace(/_r$/, ' right').replace(/_/g, ' ')}: ${partColorOf(asset, colors, p.node)}`).join('  ');

// Light fills get a dark seam line and dark fills a light one, so pockets and the neck band stay readable at any colour.
export function edgeFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? 'rgba(27,42,74,0.45)' : 'rgba(255,255,255,0.5)';
}

export async function loadPanels(asset: UvBakedAsset): Promise<Record<PanelSide, SvgPanel[]>> {
  const out = { front: [] as SvgPanel[], back: [] as SvgPanel[] };
  for (const s of ['front', 'back'] as PanelSide[]) {
    const res = await fetch(asset.panelSvg[s].url);
    if (!res.ok) throw new Error(`panel ${s}: ${res.status}`);
    const buf = await res.arrayBuffer(), hash = await sha256Hex(withoutCarriageReturns(buf)); // pins are over LF bytes, so a CRLF checkout still loads
    const text = new TextDecoder().decode(buf);
    if (hash && hash !== asset.panelSvg[s].sha256) throw new Error(`panel ${s}: hash mismatch`);
    out[s] = parsePanelSvg(text).map(p => ({ ...p, d: cleanOutline(p.d, p.part) }));
    if (!out[s].length) throw new Error(`panel ${s}: no outlines`);
  }
  return out;
}

export interface FlatInput {
  asset: UvBakedAsset; colors: Record<string, string>; details: Record<string, { show?: boolean }>; panels: SvgPanel[]; side: PanelSide;
}

// Paints the coloured parts into a context already sized to the panel frame.
export function paintParts(ctx: CanvasRenderingContext2D, width: number, { asset, colors, details, panels, side }: FlatInput) {
  const f = asset.frames[side], k = width / frameSize(f).w;
  ctx.save(); ctx.scale(k, k); ctx.translate(f.x1, f.y1); ctx.scale(-1, 1);
  const body = panels.find(p => p.part === 'body');
  if (body) {
    ctx.save(); ctx.clip(new Path2D(envelopeOf(body.d))); ctx.fillStyle = partColorOf(asset, colors, 'body');
    for (const b of pocketBackings(panels.filter(p => !partHidden(asset, details, p.part)), POCKET_PARTS)) ctx.fillRect(b.x0, b.y0 - 0.03, b.x1 - b.x0, b.y1 - b.y0 + 0.06);
    ctx.restore();
  }
  for (const p of panels) {
    if (partHidden(asset, details, p.part)) continue;
    const path = new Path2D(p.d), fill = partColorOf(asset, colors, p.part), detail = DETAIL_PARTS.has(p.part);
    ctx.fillStyle = fill; ctx.fill(path);
    ctx.lineJoin = 'round'; ctx.lineWidth = (detail ? 1.25 : 4) * (width / ART_W) / k; ctx.strokeStyle = detail ? edgeFor(fill) : fill; ctx.stroke(path);
  }
  ctx.restore();
}

// One side of the garment as a PNG data URL, `height` px tall. Transparent unless a background is given.
export async function renderBakedFace(asset: UvBakedAsset, colors: Record<string, string>, details: Record<string, { show?: boolean }>,
  art: PanelArt | null, side: PanelSide, height: number, background?: string): Promise<string> {
  const panels = (await loadPanels(asset))[side];
  const base = canvasSize(asset.frames[side], ART_W), k = height / base.height;
  const out = document.createElement('canvas');
  out.width = Math.round(base.width * k); out.height = Math.round(base.height * k);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, out.width, out.height); }
  paintParts(ctx, out.width, { asset, colors, details, panels, side });
  const objects = art?.[side] ?? [];
  if (objects.length) {
    await Promise.all(objects.map((o: any) => (o?.fontFamily ? document.fonts.load(`64px ${o.fontFamily}`).catch(() => []) : null)));
    const layer = new StaticCanvas(undefined, { width: base.width, height: base.height, enableRetinaScaling: false });
    try {
      await layer.loadFromJSON({ objects });
      layer.renderAll();
      ctx.drawImage(layer.toCanvasElement(k), 0, 0, out.width, out.height);
    } finally { void layer.dispose(); }
  }
  return out.toDataURL('image/png');
}

export async function renderBakedFaces(asset: UvBakedAsset, colors: Record<string, string>, details: Record<string, { show?: boolean }>, art: PanelArt | null, height: number, background?: string) {
  return {
    front: await renderBakedFace(asset, colors, details, art, 'front', height, background),
    back: await renderBakedFace(asset, colors, details, art, 'back', height, background),
  };
}
