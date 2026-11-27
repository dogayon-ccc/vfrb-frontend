// Artwork objects for the flat panels: shapes, font choices and what the inspector reads from a selected object.
import { Circle, Line, Polygon, Rect, Triangle, type FabricObject } from 'fabric';
import { WEB_FONTS, webFontFor, loadFont, nearestWeight, numericWeight } from './studioFonts';

export const BASE_FONTS: [string, string][] = [['Serif', '"DM Serif Display", Georgia, serif'], ['Sans', 'Arial, Helvetica, sans-serif'], ['Bold sans', '"Arial Black", Arial, sans-serif']];
export const ALL_FONTS: [string, string][] = [...BASE_FONTS, ...WEB_FONTS.map((f): [string, string] => [f.label, f.css])];

export type ShapeKind = 'rectangle' | 'square' | 'circle' | 'triangle' | 'star' | 'diamond' | 'line' | 'dashed';
export const SHAPES: [ShapeKind, string][] = [
  ['rectangle', 'Rectangle'], ['square', 'Square'], ['circle', 'Circle'], ['triangle', 'Triangle'], ['star', 'Star'], ['diamond', 'Diamond'], ['line', 'Line'], ['dashed', 'Dashed line'],
];

// Points of a five-point star or a diamond inside a box `s` across.
export function shapePoints(kind: 'star' | 'diamond', s: number): { x: number; y: number }[] {
  if (kind === 'diamond') return [{ x: s / 2, y: 0 }, { x: s, y: s / 2 }, { x: s / 2, y: s }, { x: 0, y: s / 2 }];
  return Array.from({ length: 10 }, (_, i) => { const r = (i % 2 ? 0.22 : 0.5) * s, a = (Math.PI / 5) * i - Math.PI / 2; return { x: s / 2 + r * Math.cos(a), y: s / 2 + r * Math.sin(a) }; });
}

export function makeShape(kind: ShapeKind, cx: number, cy: number, fill = '#FFFFFF'): FabricObject {
  const at = { left: cx, top: cy, originX: 'center' as const, originY: 'center' as const, fill, strokeUniform: true };
  if (kind === 'rectangle') return new Rect({ ...at, width: 200, height: 120 });
  if (kind === 'square') return new Rect({ ...at, width: 140, height: 140 });
  if (kind === 'circle') return new Circle({ ...at, radius: 70 });
  if (kind === 'triangle') return new Triangle({ ...at, width: 150, height: 130 });
  if (kind === 'star' || kind === 'diamond') return new Polygon(shapePoints(kind, 150), at);
  return new Line([0, 0, 220, 0], { ...at, fill: '', stroke: fill, strokeWidth: 10, ...(kind === 'dashed' ? { strokeDashArray: [28, 18] } : null) });
}

export type ArtKind = 'text' | 'image' | 'shape' | 'line';
export interface ArtInfo {
  kind: ArtKind; text: string; fill: string; font: string; weight: number; italic: boolean; align: string; lineHeight: number; spacing: number;
  outline: string; outlineWidth: number; angle: number; opacity: number; widthPct: number;
}

export const kindOf = (o: any): ArtKind => (typeof o.text === 'string' ? 'text' : /^image$/i.test(o.type) ? 'image' : /^line$/i.test(o.type) ? 'line' : 'shape');

export function readArt(o: FabricObject | undefined, panelW: number): ArtInfo | null {
  if (!o) return null;
  const t = o as any, kind = kindOf(t), paint = kind === 'line' ? t.stroke : t.fill;
  return {
    kind, text: kind === 'text' ? String(t.text) : '', fill: typeof paint === 'string' && paint ? paint : '#000000', font: String(t.fontFamily ?? ''),
    weight: numericWeight(t.fontWeight), italic: t.fontStyle === 'italic', align: String(t.textAlign ?? 'left'), lineHeight: t.lineHeight ?? 1.16, spacing: t.charSpacing ?? 0,
    outline: kind !== 'line' && typeof t.stroke === 'string' && t.stroke ? t.stroke : '#111111', outlineWidth: kind !== 'line' && t.stroke ? t.strokeWidth ?? 0 : 0,
    angle: Math.round(((o.angle ?? 0) % 360 + 360) % 360), opacity: o.opacity ?? 1, widthPct: Math.round((o.getScaledWidth() / panelW) * 100),
  };
}

const SHAPE_NAMES: Record<string, string> = { rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle', polygon: 'Star or diamond', line: 'Line' };
export const layerName = (o: any): string => (typeof o.text === 'string' && o.text ? o.text.replace(/\s+/g, ' ').slice(0, 24) : SHAPE_NAMES[String(o.type).toLowerCase()] ?? 'Logo image');

// Loads the face first so the text is measured with it, and snaps to a weight the face really has.
export async function fontProps(css: string, weight: number): Promise<{ fontFamily: string; fontWeight: number }> {
  const web = webFontFor(css), w = web ? nearestWeight(web, weight) : weight;
  if (web) await loadFont(css, w);
  else await document.fonts.load(`${w} 64px ${css}`).catch(() => []);
  return { fontFamily: css, fontWeight: w };
}
export const weightsFor = (css: string): number[] => webFontFor(css)?.weights ?? [400, 700];
