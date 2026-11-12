// Garment details the customer controls: pockets, buttons and closures. 2D only: the GLBs are single meshes, so 3D never shows them.
//
// THE table. An option appears for a garment only when its own 2D template really draws it: the pocket zone for a patch pocket, or a
// template detail tagged with that `part` (garmentPaths.js). Photo bases and derived templates draw none, so they get no controls.
// Saved as studio_config.details = { [id]: { show: false } | { color: '#rrggbb' } }; only changes from the template are stored, so an
// older design without the key (or with an empty one) renders exactly as before.
import { getGarmentPaths } from './garmentPaths';
import { assetFor } from './garmentAssets';

export const DETAIL_OPTIONS = [
  { id: 'patchPocket', label: 'Patch pocket', control: 'show', hint: 'Its colour is the Pocket zone in Colours' },
  { id: 'flapPockets', label: 'Flap pockets', control: 'show' },
  { id: 'lowerPockets', label: 'Lower pockets', control: 'show' },
  { id: 'sidePockets', label: 'Side pockets', control: 'show' },
  { id: 'backPockets', label: 'Back pockets', control: 'show' },
  { id: 'buttons',     label: 'Buttons',      control: 'color' },
  { id: 'closure',     label: 'Placket and zip trim', control: 'color' },
];
const BY_ID = Object.fromEntries(DETAIL_OPTIONS.map(o => [o.id, o]));
const HEX = /^#[0-9a-f]{6}$/i;

const draws = (p, id) => (id === 'patchPocket' ? !!p.pocket : (p.details ?? []).some(d => d.part === id));

// Options this garment's template can draw, front or back.
export function detailsFor(garment, sleeve, fit) {
  if (!garment || assetFor(garment, sleeve, 'front', fit)) return [];
  const faces = ['front', 'back'].map(f => getGarmentPaths(garment, sleeve, f));
  return DETAIL_OPTIONS.filter(o => faces.some(p => draws(p, o.id)));
}

// Keeps only valid changes; with a garment, also only the options that garment can draw. Never throws.
export function normalizeDetails(raw, garment, sleeve, fit) {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = garment === undefined ? null : new Set(detailsFor(garment, sleeve, fit).map(o => o.id));
  const out = {};
  for (const [id, v] of Object.entries(raw)) {
    const o = BY_ID[id];
    if (!o || (allowed && !allowed.has(id)) || !v || typeof v !== 'object') continue;
    if (o.control === 'show' && v.show === false) out[id] = { show: false };
    if (o.control === 'color' && HEX.test(v.color ?? '')) out[id] = { color: v.color.toLowerCase() };
  }
  return out;
}

// Template paths with the customer's details applied: hidden parts removed, recoloured parts carry a style override.
const TINT = { buttons: c => ({ fill: c }), closure: c => ({ stroke: c, strokeWidth: 1.6, strokeDashArray: null }) };
export function applyDetails(paths, details) {
  if (!paths || !details || !Object.keys(details).length) return paths;
  const hidden = id => details[id]?.show === false;
  return {
    ...paths,
    pocket: hidden('patchPocket') ? null : paths.pocket,
    details: (paths.details ?? []).filter(d => !(d.part && hidden(d.part)))
      .map(d => (d.part && details[d.part]?.color && TINT[d.part] ? { ...d, style: TINT[d.part](details[d.part].color) } : d)),
  };
}

export const detailedPaths = (garment, sleeve, face, details) => applyDetails(getGarmentPaths(garment, sleeve, face), details);

// One line per changed detail, for the PDF spec sheet and the admin order view.
export const describeDetails = details => Object.entries(normalizeDetails(details))
  .map(([id, v]) => `${BY_ID[id].label}: ${v.show === false ? 'none' : v.color.toUpperCase()}`);
