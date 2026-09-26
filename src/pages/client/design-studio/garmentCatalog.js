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
import { BASE_PATHS, getGarmentPaths } from './garmentPaths';
import { get3DCapabilities } from './garmentCapabilities';

// Category -> its garments, in display order. Source: the VFRB interview's garment list
// (unchanged from the previous CATS in dsShared.js — moved, not altered).
const CATEGORY_DEFS = [
  { id: 'Medical / Scrubs', icon: 'medical',   garments: ['Scrub Top', 'V-Neck Shirt', 'Lab Coat', 'Lab Coverall', 'Pants', 'Shorts'] },
  { id: 'School Uniform',   icon: 'school',    garments: ['School Polo', 'Round Neck', 'Polo Shirt', 'Pants', 'Shorts', 'Skirt'] },
  { id: 'Corporate',        icon: 'corporate', garments: ['Polo Shirt', 'T-Shirt', 'Mandarin Collar', 'Button-Down', 'V-Neck Shirt', 'Pants'] },
  { id: 'PE / Sports',      icon: 'sports',    garments: ['Round Neck', 'T-Shirt', 'Shorts', 'Track Pants'] },
];

// Garment -> its sleeve/style options (unchanged from the previous SLEEVE_OPTS in dsShared.js).
const SLEEVE_OPTS = {
  'Polo Shirt': ['Sleeveless', 'Short', '3/4', 'Long'],
  'School Polo': ['Short', '3/4', 'Long'],
  'Round Neck': ['Sleeveless', 'Short', '3/4', 'Long'],
  'V-Neck Shirt': ['Sleeveless', 'Short', '3/4', 'Long'],
  'Mandarin Collar': ['Short', '3/4', 'Long'],
  'Scrub Top': ['Short', '3/4'],
  'Lab Coat': ['Long'],
  'Button-Down': ['Short', 'Long'],
  'T-Shirt': ['Short'],
  'Lab Coverall': ['Long'],
  'Pants': [], 'Shorts': [], 'Track Pants': [], 'Skirt': [],
};

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
    fits: cap.supported ? cap.fit : [],
    styles,
    status3D,
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
  partial:   { label: '3D (partial)', tone: 'warn' },
  none:      { label: '2D only', tone: 'muted' },
};
