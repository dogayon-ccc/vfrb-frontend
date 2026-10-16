// Garment families derived from the read-only reference models (public/models/reference): each piece was cleaned, split at its set
// split and traced into a closed 2D outline by tools/glb-extract/derive_template.py (geometry in derivedTemplates.generated.js).
// THE one table: catalog, 2D paths, 3D entries, template ids and the gallery all read it. One body colour zone per piece: no derived
// model or outline separates collar, sleeve or pocket. Names are generic garment names, pending VFRB confirmation.
import { DERIVED_GEOMETRY } from './derivedTemplates.generated';

export const DERIVED_LABEL = 'Derived from reference, pending VFRB confirmation';
export const DERIVED_APPROVAL = 'enabled 2026-10-12 (derived from reference; VFRB confirmation pending)';
// Recorded in GLB-STAGING-AUDIT.md: Meshy generations from the gallery photos, staged in asset-staging/mesh-3d; no licence is recorded.
export const DERIVED_SOURCE = 'Meshy image-to-3D generation of the gallery photo (asset-staging/mesh-3d, byte-identical copy in public/models/reference)';
export const DERIVED_LICENCE = 'unknown (not recorded)';

// [piece id, family name, catalog category, set role (null = full-length, never in a set), sleeve as photographed, fit, 3D off reason]
const ROWS = [
  ['blazer-open-front-black', 'Open-Front Blazer', 'Corporate', 'top', 'Long', 'female'],
  ['blouse-asymmetric-blue', 'Asymmetric Collar Blouse', 'Corporate', 'top', 'Short', 'female'],
  ['blouse-mandarin-yellow', 'Mandarin Blouse', 'Hospitality / Service', 'top', 'Short', 'female'],
  ['blouse-pleated-bib-white', 'Pleated Bib Blouse', 'School Uniform', 'top', 'Short', 'female',
    'flattened hanger scan: torso depth 0.07-0.09 against 0.66-0.74 for worn blouses at the same scale (GLB-STAGING-AUDIT.md)'],
  ['blouse-scarf-cream', 'Scarf-Tie Blouse', 'Corporate', 'top', 'Short', 'female'],
  ['blouse-tunic-roundneck-blue', 'Belted Tunic Blouse', 'Corporate', 'top', 'Short', 'female'],
  ['dress-butter-belted', 'Belted Shift Dress', 'Corporate', null, 'Short', 'female'],
  ['dress-tunic-maternity-navy', 'Maternity Tunic Dress', 'Corporate', null, '3/4', 'female'],
  ['jack-shirt-two-tone', 'Jack Shirt', 'Industrial / Work', 'top', 'Short', 'male'],
  ['blazer-double-breasted-gray-top', 'Double-Breasted Blazer', 'Corporate', 'top', 'Long', 'female'],
  ['blazer-double-breasted-gray-bottom', 'Slim Suit Trousers', 'Corporate', 'bottom', null, 'female'],
  ['blazer-pinstripe-navy-top', 'Fitted Notch Jacket', 'Corporate', 'top', '3/4', 'female'],
  ['blazer-pinstripe-navy-bottom', 'Slim Trousers', 'Corporate', 'bottom', null, 'female'],
  ['bir-blouse-trousers-blue-bottom', 'Straight Trousers', 'Corporate', 'bottom', null, 'female'],
  ['blouse-roundneck-fuchsia-bottom', 'Ankle Trousers', 'Corporate', 'bottom', null, 'female'],
  ['blouse-roundneck-mustard-top', 'Banded Round Neck Blouse', 'Corporate', 'top', 'Short', 'female'],
  ['blouse-roundneck-mustard-bottom', 'Creased Trousers', 'Corporate', 'bottom', null, 'female'],
  ['pantsuit-notch-short-gray-top', 'Short-Sleeve Notch Jacket', 'Corporate', 'top', 'Short', 'female'],
  ['pantsuit-notch-short-gray-bottom', 'Pantsuit Trousers', 'Corporate', 'bottom', null, 'female'],
  ['peplum-set-navy-top', 'Peplum Top', 'Corporate', 'top', 'Short', 'female'],
  ['peplum-set-navy-bottom', 'Midi Pencil Skirt', 'Corporate', 'bottom', null, 'female'],
  ['polo-barong-brown-top', 'Barong Shirt', 'Corporate', 'top', 'Short', 'male'],
  ['polo-barong-brown-bottom', "Men's Slacks", 'Corporate', 'bottom', null, 'male'],
  ['scrub-set-housekeeping-bottom', 'Housekeeping Trousers', 'Hospitality / Service', 'bottom', null, 'female'],
  ['scrub-set-men-vneck-bottom', "Men's Jogger Scrub Pants", 'Medical / Scrubs', 'bottom', null, 'male'],
  ['scrub-set-women-vneck-bottom', "Women's Jogger Scrub Pants", 'Medical / Scrubs', 'bottom', null, 'female'],
  ['set-pinstripe-pants-top', 'Pant-Suit Jacket', 'Corporate', 'top', '3/4', 'female'],
  ['set-pinstripe-pants-bottom', 'Cuffed Trousers', 'Corporate', 'bottom', null, 'female'],
  ['set-pinstripe-skirt-top', 'Skirt-Suit Jacket', 'Corporate', 'top', '3/4', 'female'],
  ['set-pinstripe-skirt-bottom', 'Straight Skirt', 'Corporate', 'bottom', null, 'female'],
  ['shirt-two-tone-gpc-top', 'Two-Tone Shirt', 'Corporate', 'top', 'Short', 'male'],
  ['shirt-two-tone-gpc-bottom', 'Straight Slacks', 'Corporate', 'bottom', null, 'male'],
];

// Set tops that already have an exact template of the same photo (photo base + its own model cut from the same scan): reused, not duplicated.
// Their derived -top.glb is still written (a set always keeps both pieces) but not registered.
export const REUSED_TOPS = {
  'bir-blouse-trousers-blue': 'Button-Down', 'blouse-roundneck-fuchsia': 'Round Neck', 'scrub-set-housekeeping': 'Mandarin Collar',
  'scrub-set-men-vneck': 'Scrub Top', 'scrub-set-women-vneck': 'Scrub Top',
};

// Derived but not promoted (files written, reported, never registered): the plane at the set's REF_SPLIT does not separate the garments.
// Checked in front/back/side renders of the derived pieces on 2026-10-12.
export const NOT_PROMOTED = {
  'set-pinstripe-skirt': "the split plane (0.485) lies above the jacket's front hem: the skirt piece carries the jacket's lower front panels with their pockets, and the neck cut leaves a ragged rim above the collar",
  'set-pinstripe-pants': "the trousers carry the jacket's hanging front tail, and the neck cut leaves a ragged rim above the collar",
};

// Rows whose geometry has been generated and passed review (a batch not yet run is simply absent, never half-registered).
// Derived bottoms are 2D only (2026-10-15): each is cut from a fused set at the top's hem (straight-cut waist, a lip of the top can remain), so
// it is not a clean garment mesh. They stay off until a clean model of that cut exists; the 2D outline is unaffected.
export const DERIVED_BOTTOM_NO_3D = 'cut from a fused set model at the hem, not a clean garment mesh; 3D stays off until a clean model exists';

// Removed 2026-10-16 (picker, catalog, gallery, 3D): pieces whose mesh is not a closed, garment-only shape. Each names the nearest
// authored template (garmentPaths.js), which a saved design or gallery set using the removed piece opens instead, so nothing crashes.
// Evidence: tools/glb-extract/derived-manifest.json (split method per set, opening_cover per piece).
const PLANE_CUT_BOTTOM = "bottom cut from a fused set at the top's hem: straight-cut open waist, not a garment-only mesh";
const PLANE_CUT_TOP = 'top cut from a fused set by a plane at its hem: straight-cut open waist, not a garment-only mesh';
export const REMOVED_DERIVED = {
  'blazer-double-breasted-gray-bottom': ['Pantsuit Trousers', `${PLANE_CUT_BOTTOM}; opens the rebuilt Pantsuit Trousers`],
  'blazer-pinstripe-navy-bottom': ['Pantsuit Trousers', `${PLANE_CUT_BOTTOM}; opens the rebuilt Pantsuit Trousers`],
  'bir-blouse-trousers-blue-bottom': ['Pantsuit Trousers', `${PLANE_CUT_BOTTOM}; opens the rebuilt Pantsuit Trousers`],
  'blouse-roundneck-fuchsia-bottom': ['Pants', PLANE_CUT_BOTTOM],
  'blouse-roundneck-mustard-bottom': ['Creased Trousers', `${PLANE_CUT_BOTTOM}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'pantsuit-notch-short-gray-bottom': ['Pantsuit Trousers', `${PLANE_CUT_BOTTOM}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'peplum-set-navy-bottom': ['Midi Pencil Skirt', `${PLANE_CUT_BOTTOM}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'polo-barong-brown-bottom': ["Men's Slacks", `${PLANE_CUT_BOTTOM}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'scrub-set-housekeeping-bottom': ['Jogger Scrub Pants', 'derived bottom of a scrub set: replaced by the authored jogger'],
  'scrub-set-men-vneck-bottom': ['Jogger Scrub Pants', 'derived bottom of a scrub set: replaced by the authored jogger'],
  'scrub-set-women-vneck-bottom': ['Jogger Scrub Pants', 'derived bottom of a scrub set: replaced by the authored jogger'],
  'set-pinstripe-pants-bottom': ['Pants', PLANE_CUT_BOTTOM],
  'set-pinstripe-skirt-bottom': ['Skirt', PLANE_CUT_BOTTOM],
  'shirt-two-tone-gpc-bottom': ["Men's Slacks", `${PLANE_CUT_BOTTOM}; opens the rebuilt Men's Slacks`],
  'blazer-double-breasted-gray-top': ['Blazer', PLANE_CUT_TOP],
  'blazer-pinstripe-navy-top': ['Blazer', PLANE_CUT_TOP],
  'blouse-roundneck-mustard-top': ['Blouse', PLANE_CUT_TOP],
  'pantsuit-notch-short-gray-top': ['Short-Sleeve Notch Jacket', `${PLANE_CUT_TOP}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'peplum-set-navy-top': ['Peplum Top', `${PLANE_CUT_TOP}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'polo-barong-brown-top': ['Barong Shirt', `${PLANE_CUT_TOP}; rebuilt as a parametric family (customGarment PARAM_FAMILIES)`],
  'shirt-two-tone-gpc-top': ['Button-Down', PLANE_CUT_TOP],
  'set-pinstripe-pants-top': ['Blazer', PLANE_CUT_TOP],
  'set-pinstripe-skirt-top': ['Blazer', PLANE_CUT_TOP],
  'blouse-pleated-bib-white': ['Blouse', 'flattened hanger scan with the neck opening partly closed (opening_cover 0.138)'],
  'blouse-scarf-cream': ['Blouse', 'neck opening half closed by the scarf geometry (opening_cover 0.5)'],
};
const ROW_BY_ID = Object.fromEntries(ROWS.map(row => [row[0], row]));
// Family name of a removed piece -> its authored replacement (designSerialization LEGACY_GARMENT, uniformSet).
// A piece rebuilt under its own name (Pantsuit Trousers) keeps that name: no remap.
export const REMOVED_GARMENT = Object.fromEntries(Object.entries(REMOVED_DERIVED).map(([id, [to]]) => [ROW_BY_ID[id][1], to]).filter(([from, to]) => from !== to));
// Reference photo -> the authored piece that replaces its removed top or bottom.
const REPLACED = role => Object.fromEntries(Object.entries(REMOVED_DERIVED).filter(([id]) => ROW_BY_ID[id][3] === role || (role === 'top' && !id.endsWith('-bottom')))
  .map(([id, [to]]) => [id.replace(/-(top|bottom)$/, ''), to]));
const REPLACED_TOP = REPLACED('top'), REPLACED_BOTTOM = REPLACED('bottom');
// Every reference photo with derived rows, kept or removed.
export const DERIVED_REFS = [...new Set(ROWS.map(([id]) => id.replace(/-(top|bottom)$/, '')))];
// Reference photos that lost a derived piece: their 3D reference viewer and "Try colours" go with it (designGallery REF_3D).
export const REFS_WITH_REMOVED = new Set(Object.keys(REMOVED_DERIVED).map(id => id.replace(/-(top|bottom)$/, '')).filter(ref => !NOT_PROMOTED[ref]));

export const DERIVED_FAMILIES = ROWS.filter(([id]) => DERIVED_GEOMETRY[id] && !NOT_PROMOTED[DERIVED_GEOMETRY[id].ref] && !REMOVED_DERIVED[id]).map(([id, name, category, role, sleeve, fit, no3D = null]) => ({
  id, name, category, role, sleeve, fit, no3D: no3D ?? (role === 'bottom' ? DERIVED_BOTTOM_NO_3D : null), geo: DERIVED_GEOMETRY[id], ref: DERIVED_GEOMETRY[id].ref,
}));
export const DERIVED_BY_NAME = Object.fromEntries(DERIVED_FAMILIES.map(d => [d.name, d]));
export const isDerived = garment => !!DERIVED_BY_NAME[garment];

// What "Use as template" opens for a reference photo: the single piece, or a set's top and bottom. A top may be a reused family, and a
// removed piece is replaced by its authored template (REMOVED_DERIVED). derived = the piece that opens first is a derived template.
// category is the photo's catalog category; sleeve (replaced tops only) is the sleeve as photographed. Sets that were never promoted (NOT_PROMOTED) stay reference-only.
export function derivedPiecesFor(photoId) {
  if (NOT_PROMOTED[photoId]) return null;
  const mine = DERIVED_FAMILIES.filter(d => d.ref === photoId);
  const category = ROWS.find(([id]) => id === photoId || id.startsWith(`${photoId}-`))?.[2];
  if (!category) return null;
  const single = mine.find(d => d.id === photoId);
  if (single) return { single: single.name, derived: true, category };
  if (REPLACED_TOP[photoId] && !ROW_BY_ID[`${photoId}-top`]) return { single: REPLACED_TOP[photoId], derived: false, category, sleeve: ROW_BY_ID[photoId][4] };
  const derivedTop = mine.find(d => d.id === `${photoId}-top`)?.name;
  const top = derivedTop ?? REUSED_TOPS[photoId] ?? REPLACED_TOP[photoId] ?? null;
  const bottom = mine.find(d => d.id === `${photoId}-bottom`)?.name ?? REPLACED_BOTTOM[photoId] ?? null;
  return top && bottom ? { top, bottom, derived: !!derivedTop, category, ...(REPLACED_TOP[photoId] && { sleeve: ROW_BY_ID[`${photoId}-top`][4] }) } : null;
}

// 2D paths: one body zone; the back uses its own traced outline only where it differs from the front. `shade` = the model's lighting.
export const derivedPaths = d => ({
  w: d.geo.w, h: d.geo.h, body: d.geo.body, collar: null, sleeveL: null, sleeveR: null, pocket: null, details: [],
  back: d.geo.back ? { body: d.geo.back } : null, shade: d.geo.shade, derived: true,
});
