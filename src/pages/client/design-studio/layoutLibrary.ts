// Ready-made layouts: original compositions of ordinary shape and text layers, placed by garment zone (fractions of the zone's box, so
// they fit any template that draws the zone). Every part lands as its own editable layer. A layout is offered only when its zone exists
// on the current garment and face; there is no cuff zone in any VFRB template, so there is no cuff layout.
import type { ZoneSet } from './zoneMap';

export interface LayoutItem { kind: 'shape' | 'text'; shape?: string; text?: string; fx: number; fy: number; w: number; h?: number; color: string; name: string; font?: string }
export interface Layout { id: string; name: string; note: string; zone: string; face: 'front' | 'back' | 'any'; items: LayoutItem[] }

const INK = '#1B2A4A', GOLD = '#C9A227', WHITE = '#FFFFFF', RED = '#B3262E';
export const LAYOUTS: Layout[] = [
  { id: 'left-chest-emblem', name: 'Left chest emblem', note: 'Badge with initials, wearer’s left', zone: 'body', face: 'front', items: [
    { kind: 'shape', shape: 'badge', fx: 0.7, fy: 0.2, w: 0.2, color: INK, name: 'Emblem' },
    { kind: 'text', text: 'VFRB', fx: 0.7, fy: 0.2, w: 0.07, color: WHITE, name: 'Initials', font: 'Montserrat' }] },
  { id: 'center-chest-wordmark', name: 'Center chest wordmark', note: 'Name over a rule', zone: 'body', face: 'front', items: [
    { kind: 'text', text: 'YOUR NAME', fx: 0.5, fy: 0.3, w: 0.1, color: INK, name: 'Wordmark', font: 'Oswald' },
    { kind: 'shape', shape: 'line', fx: 0.5, fy: 0.37, w: 0.5, color: GOLD, name: 'Rule' }] },
  { id: 'full-front-crest', name: 'Full front crest', note: 'Large star crest with a title', zone: 'body', face: 'front', items: [
    { kind: 'shape', shape: 'star', fx: 0.5, fy: 0.38, w: 0.5, color: GOLD, name: 'Crest' },
    { kind: 'text', text: 'TEAM', fx: 0.5, fy: 0.62, w: 0.12, color: INK, name: 'Title', font: 'Bebas Neue' }] },
  { id: 'back-name-number', name: 'Back name and number', note: 'Name arched above a big number', zone: 'body', face: 'back', items: [
    { kind: 'text', text: 'SURNAME', fx: 0.5, fy: 0.2, w: 0.09, color: INK, name: 'Surname', font: 'Oswald' },
    { kind: 'text', text: '07', fx: 0.5, fy: 0.42, w: 0.3, color: INK, name: 'Number', font: 'Bebas Neue' }] },
  { id: 'back-yoke-title', name: 'Back title', note: 'Short title across the upper back', zone: 'body', face: 'back', items: [
    { kind: 'text', text: 'SCHOOL · YEAR', fx: 0.5, fy: 0.16, w: 0.1, color: INK, name: 'Title', font: 'Montserrat' }] },
  { id: 'sleeve-badge', name: 'Sleeve badge', note: 'Round badge on each sleeve', zone: 'sleeveL', face: 'front', items: [
    { kind: 'shape', shape: 'circle', fx: 0.5, fy: 0.55, w: 0.4, color: RED, name: 'Sleeve badge' }] },
  { id: 'sleeve-band', name: 'Sleeve band', note: 'Two bands near the hem', zone: 'sleeveL', face: 'front', items: [
    { kind: 'shape', shape: 'rect', fx: 0.5, fy: 0.7, w: 0.8, h: 0.08, color: INK, name: 'Band' },
    { kind: 'shape', shape: 'rect', fx: 0.5, fy: 0.82, w: 0.8, h: 0.04, color: GOLD, name: 'Thin band' }] },
  { id: 'collar-trim', name: 'Collar trim', note: 'Contrast stripe on the collar', zone: 'collar', face: 'any', items: [
    { kind: 'shape', shape: 'rect', fx: 0.5, fy: 0.5, w: 0.8, h: 0.12, color: GOLD, name: 'Collar trim' }] },
  { id: 'hem-band', name: 'Hem decoration', note: 'Band and dots above the hem', zone: 'body', face: 'any', items: [
    { kind: 'shape', shape: 'rect', fx: 0.5, fy: 0.92, w: 0.9, h: 0.025, color: INK, name: 'Hem band' },
    { kind: 'shape', shape: 'circle', fx: 0.25, fy: 0.86, w: 0.03, color: GOLD, name: 'Dot' },
    { kind: 'shape', shape: 'circle', fx: 0.5, fy: 0.86, w: 0.03, color: GOLD, name: 'Dot' },
    { kind: 'shape', shape: 'circle', fx: 0.75, fy: 0.86, w: 0.03, color: GOLD, name: 'Dot' }] },
  { id: 'monogram', name: 'Monogram', note: 'Initials in a ring', zone: 'body', face: 'front', items: [
    { kind: 'shape', shape: 'circle', fx: 0.5, fy: 0.35, w: 0.28, color: INK, name: 'Ring' },
    { kind: 'text', text: 'AB', fx: 0.5, fy: 0.35, w: 0.1, color: WHITE, name: 'Initials', font: 'Montserrat' }] },
];

export const layoutsFor = (zones: ZoneSet | null, face: string) =>
  zones ? LAYOUTS.filter(l => zones[l.zone] && (l.face === 'any' || l.face === face)) : [];

// Absolute canvas placement for each item. Positions snap onto the cloth; sizes are fractions of the zone width, so nothing is invented in mm.
export function layoutPlacement(layout: Layout, zones: ZoneSet, snap: (z: ZoneSet[string], c: [number, number]) => [number, number]) {
  const z = zones[layout.zone];
  if (!z) return [];
  return layout.items.map(it => {
    const [x, y] = snap(z, [z.box.l + it.fx * z.box.w, z.box.t + it.fy * z.box.h]);
    return { ...it, x, y, width: it.w * z.box.w, height: it.h != null ? it.h * z.box.h : undefined };
  });
}
