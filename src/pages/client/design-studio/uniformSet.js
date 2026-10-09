// Uniform set: one top and one bottom designed together, each keeping its own garment, colours, overlays and template.
// The active piece stays the top-level design snapshot (every existing reader keeps working); the set rides along as
// `uniformSet`. Ordering creates one linked order per piece (a single order holds one garment).
import { pieceOf } from './garmentCatalog';

export const SET_ROLES = ['top', 'bottom'];
export const otherRole = r => (r === 'top' ? 'bottom' : 'top');
export const ROLE_LABEL = { top: 'Top', bottom: 'Bottom' };
// Garment a new, empty piece starts on; the customer can change it within the same role.
export const DEFAULT_PIECE = { top: 'Polo Shirt', bottom: 'Pants' };

const clean = snap => {
  if (!snap || typeof snap !== 'object') return null;
  const { uniformSet, previewPng, ...rest } = snap; // eslint-disable-line no-unused-vars
  return rest;
};

// A validated set, or null. A piece whose garment is not that role's garment is dropped, never moved.
export function normalizeSet(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !SET_ROLES.includes(raw.active)) return null;
  const pieces = Object.fromEntries(SET_ROLES.map(r => {
    const p = clean(raw.pieces?.[r]);
    return [r, p && pieceOf(p.garment) === r ? p : null];
  }));
  return { id: raw.id, active: raw.active, pieces };
}

// Whole-set snapshot: `activeSnap` is the freshest copy of the active piece.
export function withSet(activeSnap, set) {
  if (!set) return activeSnap;
  return { ...activeSnap, uniformSet: { id: set.id, active: set.active, pieces: { ...set.pieces, [set.active]: clean(activeSnap) } } };
}

// Pieces to order, top first, each tagged with its place in the set; null unless both pieces have a garment.
export function orderQueue(snap) {
  const set = normalizeSet(snap?.uniformSet);
  if (!set) return null;
  const pieces = { ...set.pieces, [set.active]: pieceOf(snap.garment) === set.active ? clean(snap) : set.pieces[set.active] };
  const roles = SET_ROLES.filter(r => pieces[r]?.garment);
  if (roles.length < 2) return null;
  const parts = roles.map(r => ({ role: r, garment: pieces[r].garment }));
  return roles.map((r, i) => ({
    ...pieces[r],
    ...(r === set.active && snap.previewPng ? { previewPng: snap.previewPng } : {}),
    uniformSet: { id: set.id, role: r, part: i + 1, of: roles.length, parts },
  }));
}

// One line staff see on each order of the set.
export const setNote = u => `Uniform set ${u.id.slice(0, 8)}: part ${u.part} of ${u.of} (${u.parts.map(p => `${p.role} ${p.garment}`).join(' + ')})`
  + (u.linkedOrderIds?.length ? `; with order #${u.linkedOrderIds.join(', #')}` : '') + '.';
