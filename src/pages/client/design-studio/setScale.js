// One scale for a uniform set's two pieces, shared by the 2D set view and the 3D SetStack. Pure: logic-checks.mjs tests it.
//
// Why: each 2D template and each 3D model is sized to fill the stage on its own, so drawing two pieces at their native size
// puts them in the wrong ratio (the Pants template is ~1.17x the Polo's drawn length; the real size-M ratio is 100/70 = 1.43,
// and every derived template is normalised to the same height). The real anchor is the PH size chart (size M, internal only):
// a top's body length and a bottom's length. Within a role, base templates keep their drawn ratio to the role's reference
// garment (they share one generator and unit); derived templates carry no length of their own, so they take the chart length
// and are flagged approximate. Customers never see these numbers: the Studio shows only the drawing.
import { getGarmentPaths } from './garmentPaths';
import { assetFor } from './garmentAssets';
import { pieceOf } from './garmentCatalog';
import { isDerived } from './derivedFamilies';
import { chartLengthCm } from '../../../utils/sizeChart';

export const SET_OVERLAP = 0.1; // the top's hem covers the bottom's waistband by 10% of the top's length (same in 2D and 3D)
const REF = { top: { garment: 'Polo Shirt', cm: () => chartLengthCm('tops') }, bottom: { garment: 'Pants', cm: () => chartLengthCm('bottoms') } };

const ys = d => (String(d ?? '').match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, i) => i % 2 === 1);

// The template's body outline: its vertical extent in template units. This is the garment's designed length.
export function templateSpan(garment, sleeve) {
  const p = getGarmentPaths(garment, sleeve ?? 'Short', 'front'), y = ys(p.body);
  return y.length ? { y0: Math.min(...y), y1: Math.max(...y), w: p.w, h: p.h } : null;
}

// What is actually drawn in the template canvas: a photo base is fitted to the whole canvas (so its fitted height says nothing
// about length and is only used to place it), otherwise the body outline.
export function drawnSpan(garment, sleeve, fit) {
  const t = templateSpan(garment, sleeve), a = assetFor(garment, sleeve, 'front', fit);
  if (!t || !a) return t;
  const s = Math.min(t.w / a.w, t.h / a.h), h = a.h * s, y0 = (t.h - h) / 2;
  return { y0, y1: y0 + h, w: t.w, h: t.h };
}

// Real length in cm (internal) for a set piece, and whether it is an approximation. null for a garment outside a set role.
export function realLength(garment, sleeve) {
  const role = pieceOf(garment), ref = role && REF[role], refCm = ref?.cm();
  if (!refCm) return null;
  if (isDerived(garment)) return { cm: refCm, approx: true };
  const own = templateSpan(garment, sleeve), base = templateSpan(ref.garment, 'Short');
  if (!own || !base) return { cm: refCm, approx: true };
  return { cm: refCm * (own.y1 - own.y0) / (base.y1 - base.y0), approx: false };
}

// 2D set layout in cm, top-left origin: each piece's template canvas box (draw GarmentSilhouette into it) and the visible extent.
// The top is centred over the bottom; the bottom's waist sits SET_OVERLAP of the top's length above the top's hem.
export function setLayout2D(top, bottom) {
  const parts = [top, bottom].map(c => ({ cfg: c, span: drawnSpan(c.garment, c.sleeve, c.fit), len: realLength(c.garment, c.sleeve) }));
  if (parts.some(p => !p.span || !p.len)) return null;
  const [t, b] = parts.map(p => ({ ...p, u: p.len.cm / (p.span.y1 - p.span.y0) })); // cm per template unit
  const width = Math.max(t.span.w * t.u, b.span.w * b.u), cx = width / 2;
  const tTop = 0, tHem = tTop + t.span.y1 * t.u;
  const bTop = tHem - SET_OVERLAP * t.len.cm - b.span.y0 * b.u;
  const box = (p, y) => ({ x: cx - (p.span.w * p.u) / 2, y, w: p.span.w * p.u, h: p.span.h * p.u });
  const top0 = tTop + t.span.y0 * t.u, bottom1 = bTop + b.span.y1 * b.u;
  return { top: box(t, tTop), bottom: box(b, bTop), extent: { y0: top0, y1: bottom1, w: width }, approx: t.len.approx || b.len.approx };
}
