// Uniform set: one top and one bottom designed together, each keeping its own garment, colours, overlays and template.
// The active piece stays the top-level design snapshot (every existing reader keeps working); the set rides along as
// `uniformSet`. Ordering creates one linked order per piece (a single order holds one garment).
import { pieceOf, LEGACY_GARMENT } from './garmentCatalog';

export const SET_ROLES = ['top', 'bottom'];
export const otherRole = r => (r === 'top' ? 'bottom' : 'top');
export const ROLE_LABEL = { top: 'Top', bottom: 'Bottom' };
// Garment a new, empty piece starts on; the customer can change it within the same role.
export const DEFAULT_PIECE = { top: 'Polo Shirt', bottom: 'Pants' };

const clean = snap => {
  if (!snap || typeof snap !== 'object') return null;
  const { uniformSet, previewPng, ...rest } = snap; // eslint-disable-line no-unused-vars
  // A piece saved on a removed or renamed garment keeps its place in the set on the garment that replaced it.
  return LEGACY_GARMENT[rest.garment] ? { ...rest, garment: LEGACY_GARMENT[rest.garment], templateId: undefined } : rest;
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

// The orders of one uniform set, top first: `order` and every other order of the same set id from `orders` (a customer order list,
// where studio_config may still be a JSON string). A single-garment order returns just itself.
export function setOrders(order, orders = []) {
  const cfgOf = o => { const c = o?.studio_config; if (typeof c !== 'string') return c ?? null; try { return JSON.parse(c); } catch { return null; } };
  const id = cfgOf(order)?.uniformSet?.id;
  if (!id) return [order];
  const byId = new Map([order, ...orders].filter(o => cfgOf(o)?.uniformSet?.id === id).map(o => [o.order_id, o]));
  const rank = o => SET_ROLES.indexOf(cfgOf(o)?.uniformSet?.role);
  return [...byId.values()].sort((a, b) => rank(a) - rank(b));
}

// "Apply to: Both": the edit made on the active piece is copied onto the other piece's saved snapshot.
// Colours and patterns copy only into zones the other garment has (`zones`); `patternsOk` is false on a photo base (no patterns there).
export function mirrorStyle(snap, cfg, zones, patternsOk) {
  if (!snap) return snap;
  const pick = (src = {}) => Object.fromEntries(Object.entries(src).filter(([z]) => zones.includes(z)));
  const next = { ...snap, colors: { ...snap.colors, ...pick(cfg.colors) } };
  if (patternsOk) {
    next.patterns = { ...snap.patterns, ...pick(cfg.patterns) };
    next.patternParams = { ...snap.patternParams, ...pick(cfg.patternParams) };
  }
  return next;
}

// A logo or text added with "Both": the same element on the other piece, at the same relative place on that garment, as a new layer.
// src/dst are the garments' canvas sizes { w, h }; face is 'front' or 'back'.
export function mirrorOverlay(snap, obj, src, dst, face = 'front') {
  if (!snap || !obj || !(src?.w > 0) || !(src?.h > 0)) return snap;
  const copy = { ...obj, left: ((obj.left ?? 0) / src.w) * dst.w, top: ((obj.top ?? 0) / src.h) * dst.h, __layerId: crypto.randomUUID() };
  const key = face === 'back' ? 'backOverlays' : 'frontOverlays';
  const list = [...(snap[key] ?? (face === 'back' ? [] : snap.overlays ?? [])), copy];
  return face === 'back' ? { ...snap, backOverlays: list } : { ...snap, frontOverlays: list, overlays: list };
}
