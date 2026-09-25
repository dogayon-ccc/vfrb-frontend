// src/pages/client/design-studio/designSerialization.js
//
// Single serialization/deserialization contract for a customer design.
//
// Why this exists: before this file, studio_config was built inline at three
// separate call sites in DesignStudio.jsx (saveDesign, orderThis, the 30s
// autosave debounce) — each producing a slightly different shape (one
// hardcoded pocketType:'left_chest', only orderThis captured
// frontOverlays/backOverlays, autosave and saveDesign only ever captured the
// currently-visible face). Reading back was just as inconsistent: the
// sessionStorage path (INIT_CFG) never re-applied saved canvas overlays at
// all, only the DB-draft path did, and only when sessionStorage was empty.
//
// DesignState (the canonical shape, matches what customers actually design):
//   { name, category, garment, fit, sleeve, colors, patterns, patternParams,
//     overlays, frontOverlays, backOverlays }
//
// serializeDesign(cfg, overlaysBundle) -> plain object safe to
//   JSON.stringify into sessionStorage / order_drafts.studio_config /
//   orders.studio_config.
// deserializeDesign(raw) -> { cfg, overlays, frontOverlays, backOverlays },
//   never throws, always returns a fully-defaulted cfg.

export const DEFAULT_CFG = {
  name: '',
  category: 'School Uniform',
  garment: null,
  fit: 'male',
  sleeve: 'Short',
  colors:   { body:'#1e3a5f', collar:'#c8a96e', sleeve:'#1e3a5f', pocket:'#c8a96e', tipping:null },
  patterns: { body:'solid', collar:'solid', sleeve:'solid', pocket:'solid' },
  patternParams: {},
};

// Legacy producers wrote garmentType/sleeveType alongside garment/sleeve (the
// backend and several read-only consumers — OrderDetail/Orders/Dashboard —
// key off garmentType in older records). Every serialized object still
// carries both so nothing that already reads studio_config.garmentType
// breaks; garment/sleeve remain the canonical field this module reads back.
function withLegacyAliases(cfg) {
  return {
    ...cfg,
    garmentType: cfg.garment,
    sleeveType:  cfg.sleeve,
    collarType:  null, // Design Studio has no separate collar-style picker
    pocketType:  null, // Design Studio has no separate pocket-type picker
  };
}

// ── serializeDesign ──────────────────────────────────────────────────────
// cfg: the live editor state (garment/fit/sleeve/colors/patterns/patternParams/name).
// overlaysBundle: { overlays, frontOverlays, backOverlays } — plain Fabric
//   JSON arrays already exported by the caller (this module doesn't touch
//   Fabric/canvas APIs, keeping it framework-agnostic and testable).
// previewPng: optional data-URL, only ever set by orderThis().
export function serializeDesign(cfg, overlaysBundle = {}, previewPng) {
  const { overlays = [], frontOverlays = [], backOverlays = [] } = overlaysBundle;
  const out = withLegacyAliases({
    name:          cfg.name ?? '',
    category:      cfg.category ?? DEFAULT_CFG.category,
    garment:       cfg.garment ?? null,
    fit:           cfg.fit ?? DEFAULT_CFG.fit,
    sleeve:        cfg.sleeve ?? DEFAULT_CFG.sleeve,
    colors:        { ...DEFAULT_CFG.colors,   ...cfg.colors },
    patterns:      { ...DEFAULT_CFG.patterns, ...cfg.patterns },
    patternParams: { ...cfg.patternParams },
    overlays,
    frontOverlays,
    backOverlays,
  });
  if (previewPng) out.previewPng = previewPng;
  return out;
}

// ── deserializeDesign ────────────────────────────────────────────────────
// raw: a JSON string, a plain object, or null/undefined — from
//   sessionStorage, order_drafts.studio_config (already decoded by
//   OrderDraftController::latest()), or an order's studio_config.
// Never throws. Missing/partial/malformed input all resolve to a fully
// defaulted, safe-to-render DesignState.
export function deserializeDesign(raw) {
  let sc = null;
  if (raw && typeof raw === 'object') {
    sc = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try { sc = JSON.parse(raw); } catch { sc = null; }
  }
  if (!sc || typeof sc !== 'object') sc = {};

  const cfg = {
    name:          sc.name ?? DEFAULT_CFG.name,
    category:      sc.category ?? DEFAULT_CFG.category,
    // garment/sleeve are canonical; garmentType/sleeveType are the legacy
    // aliases older saved records (or the backend's own copy) may carry.
    garment:       sc.garment ?? sc.garmentType ?? DEFAULT_CFG.garment,
    fit:           sc.fit ?? DEFAULT_CFG.fit,
    sleeve:        sc.sleeve ?? sc.sleeveType ?? DEFAULT_CFG.sleeve,
    colors:        { ...DEFAULT_CFG.colors,   ...(sc.colors   && typeof sc.colors   === 'object' ? sc.colors   : {}) },
    patterns:      { ...DEFAULT_CFG.patterns, ...(sc.patterns && typeof sc.patterns === 'object' ? sc.patterns : {}) },
    patternParams: { ...(sc.patternParams && typeof sc.patternParams === 'object' ? sc.patternParams : {}) },
  };

  const asArray = v => Array.isArray(v) ? v : [];
  // Older saves only ever wrote a single `overlays` (whichever face was
  // active at save time) — fall back to it for both faces so a pre-contract
  // draft still restores its content onto the front face instead of
  // silently going blank.
  const overlays      = asArray(sc.overlays);
  const frontOverlays = asArray(sc.frontOverlays).length ? asArray(sc.frontOverlays) : overlays;
  const backOverlays  = asArray(sc.backOverlays);

  return { cfg, overlays, frontOverlays, backOverlays };
}
