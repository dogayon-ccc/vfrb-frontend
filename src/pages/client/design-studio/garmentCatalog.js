// src/pages/client/design-studio/garmentCatalog.js
//
// THE canonical garment catalog. Before this file, "which garments exist" was answered by
// cross-referencing four separate places by hand: dsShared.js's CATS (category -> garment
// names) and SLEEVE_OPTS (garment -> sleeve list), garmentPaths.js's BASE_PATHS (which
// garments actually have a 2D definition), and garmentCapabilities.js's get3DCapabilities()
// (which garments have a real GLB, and what that model supports). Adding or checking a
// garment meant knowing to look in all four. This file assembles those into ONE structure;
// none of the underlying facts change — this is consolidation, not new data. CATS/SLEEVE_OPTS/
// FIT_GARMENTS in dsShared.js are now derived from CATALOG (see bottom of that file) so
// nothing that already imports them from there needs to change.
//
// Hierarchy: CATEGORY -> FAMILY (a garment name; "T-Shirt", "Polo Shirt", ...) -> FIT (male/
// female, only for families with a real multi-fit 3D model) -> STYLE (a sleeve length). A
// family's fit/style options and 3D status are read once, here, from the real capability data
// — never guessed, never invented for a garment that doesn't have it.
import { photoFits, assetFor, templateIdFor } from './garmentAssets';
import { glbSlotFor, slotLive } from './glbSlots';
import { BASE_PATHS, getGarmentPaths } from './garmentPaths';
import { get3DCapabilities, fitsFor, sleeves3DFor } from './garmentCapabilities';

// Category -> its garments, in display order. Source: the VFRB interview's garment list
// (unchanged from the previous CATS in dsShared.js — moved, not altered).
// PE/Sports removed per VFRB_ENGINEERING_CONSTITUTION.md ("Target categories" list / "NO
// SPORTS / PE CATEGORY") — it is a hard-locked business rule, not a style choice. 'Track
// Pants' had a real 2D path (garmentPaths.js) but appeared in no other category, so it is
// dropped from the catalog along with it rather than invented a new home to keep it visible.
const CATEGORY_DEFS = [
  { id: 'School Uniform',      icon: 'school',      garments: ['Polo Shirt', 'Round Neck', 'Pants', 'Shorts', 'Skirt'] },
  { id: 'Corporate',           icon: 'corporate',   garments: ['Polo Shirt', 'Button-Down', 'Mandarin Collar', 'T-Shirt', 'Pants', 'Skirt'] },
  { id: 'Medical / Scrubs',    icon: 'medical',     garments: ['Scrub Top', 'Lab Coat', 'Lab Coverall', 'Pants'] },
  { id: 'Hospitality / Service', icon: 'hospitality', garments: ['Mandarin Collar', 'Button-Down', 'Polo Shirt', 'Pants', 'Skirt'] },
  { id: 'Industrial / Work',   icon: 'industrial',  garments: ['Button-Down', 'Polo Shirt', 'T-Shirt', 'Lab Coverall', 'Pants', 'Shorts'] },
];

// Sleeve styles VFRB really offers per garment. One row to edit if the client adds a style; every consumer reads FAMILIES.
const SLEEVE_OPTS = {
  'Polo Shirt': ['Short'],
  'T-Shirt': ['Short'],
  'Round Neck': ['Short', 'Long'],
  'Mandarin Collar': ['Short', 'Long'],
  'Button-Down': ['Short', 'Long'],
  'Scrub Top': ['Short', '3/4'],
  'Lab Coat': ['Long'],
  'Lab Coverall': ['Long'],
  'Pants': [], 'Shorts': [], 'Skirt': [],
};

// Garment names retired as duplicates: 'School Polo' was an exact copy of 'Polo Shirt'; 'V-Neck Shirt' duplicated 'Scrub Top'. Old saved designs still carry the name.
export const LEGACY_GARMENT = { 'School Polo': 'Polo Shirt', 'V-Neck Shirt': 'Scrub Top' };

// Every distinct garment name across all categories, in first-seen order (a name can appear in
// more than one category — e.g. "Polo Shirt" is both School Uniform and Corporate — it's the
// same family either way, not a duplicate to invent apart).
const FAMILY_NAMES = [...new Set(CATEGORY_DEFS.flatMap(c => c.garments))];

// One entry per family: everything real and verified about it, nothing guessed.
const FAMILIES = Object.fromEntries(FAMILY_NAMES.map(name => {
  const has2D = !!BASE_PATHS[name];
  const cap = get3DCapabilities(name);
  const styles = SLEEVE_OPTS[name] ?? [];
  // supported: real GLB, matches this session's verified list (T-Shirt). partial: real GLB but
  // an approximate/incomplete region mapping (Polo, per garmentCapabilities.js's own
  // `regionAccuracy: 'approximate'`). none: no real GLB — 2D-only, honestly labelled as such,
  // never a fake preview.
  const status3D = !cap.supported ? 'none' : cap.regionAccuracy?.startsWith('approx') ? 'partial' : 'supported';
  // A family's supported zones, at its default (first) style — the real per-style zone set
  // (zonesFor(name, sleeve) in dsShared.js) can differ by sleeve length for a couple of
  // garments; this is the catalog-level summary, not a replacement for that per-style check.
  const sampleZones = has2D ? Object.entries(getGarmentPaths(name, styles[0] ?? 'Short'))
    .filter(([k, v]) => ['body', 'collar', 'sleeveL', 'sleeveR', 'pocket'].includes(k) && v)
    .map(([k]) => (k === 'sleeveL' || k === 'sleeveR' ? 'sleeve' : k)) : [];
  return [name, {
    id: name,
    displayName: name,
    has2D,
    fits: cap.supported ? fitsFor(name) : photoFits(name),
    styles,
    defaultStyle: styles[0] ?? null,
    sleeves3D: cap.supported ? sleeves3DFor(name) : [], // styles any 3D model of this family has (any fit); per-selection checks use sleeves3DFor(name, fit)
    status3D,
    // A GLB counts as verified only when its capability entry carries an explicit `verification: { method, date }` record. None do today.
    verified3D: !!cap.supported && !!cap.verification,
    model3D: cap.supported ? cap.model : null,
    zones: [...new Set(sampleZones)],
    patterns: cap.supported ? (cap.patterns?.ids ?? []) : null, // null = no 3D pattern constraint known; 2D pattern list (dsShared.PATTERNS) still applies
    supportsText: cap.supported ? !!cap.text : null,
    supportsLogo: cap.supported ? !!cap.logo : null,
    frontBack: cap.supported ? !!cap.frontBack : null,
  }];
}));

// The full CATEGORY -> FAMILY tree, for browsing UI.
export const CATALOG = CATEGORY_DEFS.map(cat => ({
  id: cat.id,
  icon: cat.icon,
  families: cat.garments.map(name => FAMILIES[name]),
}));

// Flat lookup by garment name, for anything that already has a name and just wants its facts
// (badges, validation) without walking the category tree.
export const FAMILY_BY_NAME = FAMILIES;

export function familyFor(garment) {
  return FAMILIES[garment] ?? null;
}

// The one place that decides which sleeve value a design may carry. A family with no sleeve styles (Pants / Shorts / Skirt)
// carries `null` — never a stale value from the previously selected garment, and never an invented 'Short'. A family with styles
// keeps the current sleeve when it is one of them, otherwise falls back to its real default. Blank designs (no garment) pass through.
export function resolveSleeve(garment, sleeve) {
  const fam = FAMILIES[garment];
  if (!fam) return sleeve ?? null;
  if (fam.styles.length === 0) return null;
  return fam.styles.includes(sleeve) ? sleeve : fam.defaultStyle;
}

// Fit is only meaningful for a family whose 3D model ships several fits. Everything else carries `null`, so a fit left over from
// a previous garment can never reach a save, an order, or the 3D loader.
export function resolveFit(garment, fit) {
  const fam = FAMILIES[garment];
  if (!fam || fam.fits.length < 2) return null;
  return fam.fits.includes(fit) ? fit : fam.fits[0];
}

// The one place a garment change is applied to a design, so sleeve and fit are always re-resolved against the NEW garment.
// `next` may carry a sleeve/fit request (from a photo design); both are validated, never trusted.
export function applyGarment(cfg, garment, next = {}) {
  const fam = FAMILIES[garment];
  if (!fam) return { ...cfg, garment: garment ?? null };
  return {
    ...cfg,
    category: next.category ?? cfg.category,
    garment: fam.id,
    sleeve: resolveSleeve(fam.id, next.sleeve ?? (fam.styles.includes(cfg.sleeve) ? cfg.sleeve : null)),
    fit: resolveFit(fam.id, next.fit ?? cfg.fit),
  };
}

// Neighbour family within the same category, for Previous/Next browsing. dir: -1 or 1. Wraps.
export function neighborFamily(category, garment, dir) {
  const cat = CATALOG.find(c => c.id === category) ?? CATALOG[0];
  const list = cat.families;
  const i = list.findIndex(f => f.id === garment);
  if (list.length === 0) return null;
  const next = list[(((i < 0 ? 0 : i) + dir) % list.length + list.length) % list.length];
  return next;
}

// Short label + tone for the 3D-status badge shown on garment cards, so "no real 3D" is stated
// honestly at selection time instead of only discovered after switching to the 3D tab.
export const STATUS_3D_LABEL = {
  supported: { label: '3D', tone: 'ok' },
  partial:   { label: '3D (approx.)', tone: 'warn' },
  none:      { label: '2D only', tone: 'muted' },
};

// ONE answer to "what exactly does (garment, sleeve, fit, face) resolve to": family + variant (2D asset id) + zones + 3D + honest status.
// Gallery, Studio, Order Wizard and both Order Detail pages read this instead of re-deriving it. Status never says 'verified': no GLB has passed validation.
export function resolveTarget(garment, sleeve, fit, face = 'front') {
  const fam = FAMILIES[garment];
  if (!fam) return null;
  const s = resolveSleeve(garment, sleeve), f = resolveFit(garment, fit);
  const asset = assetFor(garment, s, face, f);
  const exactGlb = asset && slotLive(glbSlotFor(asset.id)) ? glbSlotFor(asset.id).file : null; // the photo base's own garment-only GLB
  const sleeve3D = fam.status3D !== 'none' && (!s || sleeves3DFor(garment, f).includes(s));
  return {
    family: fam.id, sleeve: s, fit: f, face, assetId: asset?.id ?? null, templateId: templateIdFor(garment, s, f), photo: !!asset,
    zones: asset ? asset.zones : fam.zones, limitations: asset?.limitations ?? [],
    glb: exactGlb ?? (sleeve3D ? get3DCapabilities(garment, f, s).model : null),
    glbSlot: asset ? glbSlotFor(asset.id) : null, // reserved path for a future garment-only GLB of this exact photo base; never implies a model exists
    glbSrc: exactGlb, // the exact GLB of this photo base, only while its slot is live
    glbStatus: asset ? (glbSlotFor(asset.id)?.state ?? 'none') : 'none',
    status: statusFor({ editable2D: fam.has2D || !!asset, has3D: sleeve3D || !!exactGlb, verified3D: sleeve3D && fam.verified3D }),
  };
}

// The status taxonomy, in one place: reference < editable-2d < 2d-3d-approx < 2d-3d (verified). `verified3D` must come from a recorded verification, never from a guess.
export function statusFor({ editable2D, has3D, verified3D }) {
  if (!editable2D) return 'reference';
  if (!has3D) return 'editable-2d';
  return verified3D ? '2d-3d' : '2d-3d-approx';
}
