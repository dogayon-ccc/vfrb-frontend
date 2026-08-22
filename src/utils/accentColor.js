// src/utils/accentColor.js
// CUSTOMER-ONLY portal accent color preference.
//
// SCOPE (locked by master prompt):
//   - Affects ONLY the customer portal view for the customer who set it.
//   - Does NOT touch VFRB's own brand identity (theme.css --teal stays
//     the locked brand color for admin/staff and for the login page).
//   - Does NOT affect any other customer's session.
//   - Preset list only — NOT a freeform color picker.
//
// PALETTE ORIGIN: reuses hex values already live in this codebase
// (PH_SWATCHES in admin/PurchaseOrders.jsx — "Philippine institutional
// colour swatches, master prompt color map") instead of inventing new
// hex values. Pale/low-contrast swatches from that list (White, Light
// Blue, Mint, etc.) are excluded here because they fail contrast as a
// button/accent color against white text — that filtering is the only
// deviation from the source list.
//
// PERSISTENCE (current state — read this before editing):
//   Storage is localStorage only, keyed per customer user_id, e.g.
//   "vfrb_accent_42". There is NO backend column for this yet — no
//   `accent_color` (or similar) field exists on `users` in vfrb_db.sql
//   as of this build. Do NOT wire this to PUT /api/customer/profile
//   until that column is confirmed and added — see the note at the
//   bottom of this file for the exact swap-in point when it exists.

const STORAGE_PREFIX = "vfrb_accent_";

// ── Preset palette (7 total incl. default) ────────────────────────────────
// Values 2–7 copied verbatim from PH_SWATCHES in admin/PurchaseOrders.jsx.
export const ACCENT_PRESETS = [
  { id: "teal", name: "VFRB Teal (Default)", hex: "#028090" },
  { id: "navy", name: "Navy Blue", hex: "#1B2A4A" },
  { id: "royal", name: "Royal Blue", hex: "#2952A3" },
  { id: "bottle", name: "Bottle Green", hex: "#006A4E" },
  { id: "maroon", name: "Maroon", hex: "#800000" },
  { id: "charcoal", name: "Charcoal", hex: "#4B5563" },
  { id: "red", name: "Red", hex: "#CC0000" },
];

export const DEFAULT_ACCENT_HEX = ACCENT_PRESETS[0].hex;

// ── Color math (no dependency — mixes hex with white/black) ──────────────
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)))
    .toString(16)
    .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Mix a hex color toward white (percent > 0) or black (percent < 0).
 * @param {string} hex
 * @param {number} percent  -1..1
 */
function shade(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const target = percent > 0 ? 255 : 0;
  const p = Math.abs(percent);
  return rgbToHex(
    r + (target - r) * p,
    g + (target - g) * p,
    b + (target - b) * p,
  );
}

/**
 * Given a preset hex, derive the 3 CSS vars the app already reads
 * (--teal, --teal-2, --teal-dark). Returns null for the default teal —
 * meaning "no override, let theme.css's real values through unchanged."
 *
 * @param {string} hex
 * @returns {{ '--teal': string, '--teal-2': string, '--teal-dark': string } | null}
 */
export function getAccentVars(hex) {
  if (!hex || hex.toLowerCase() === DEFAULT_ACCENT_HEX.toLowerCase()) {
    return null;
  }
  return {
    "--teal": hex,
    "--teal-2": shade(hex, 0.22),
    "--teal-dark": shade(hex, -0.18),
  };
}

// ── Storage (localStorage, customer-scoped by user_id) ────────────────────

/**
 * @param {string|number} userId  users.user_id of the logged-in customer
 * @returns {string} hex — falls back to DEFAULT_ACCENT_HEX if unset/unreadable
 */
export function loadAccent(userId) {
  if (!userId) return DEFAULT_ACCENT_HEX;
  try {
    return localStorage.getItem(STORAGE_PREFIX + userId) || DEFAULT_ACCENT_HEX;
  } catch {
    return DEFAULT_ACCENT_HEX;
  }
}

/**
 * Persist + broadcast an accent change so CustomerLayout (mounted once,
 * above the routed page) picks it up without a page reload.
 *
 * @param {string|number} userId
 * @param {string} hex
 */
export function saveAccent(userId, hex) {
  if (!userId) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, hex);
  } catch {
    // Quota / private-mode — fail silently, in-memory state still updates
  }
  window.dispatchEvent(new CustomEvent("vfrb:accent-change", { detail: hex }));
}

export const ACCENT_CHANGE_EVENT = "vfrb:accent-change";

// ── Backend swap-in point (not active yet) ─────────────────────────────────
// Once `users.accent_color` (or equivalent) is confirmed and migrated:
//   1. In saveAccent(), after the localStorage write, add:
//        axios.put('/api/customer/profile', { accent_color: hex }).catch(() => {});
//      (safe today too — UserController@customerUpdateProfile ignores
//      unknown fields, so sending this early would not error, it would
//      just silently not persist server-side — hence why it's commented
//      out rather than left in as dead weight.)
//   2. In loadAccent(), prefer `user.accent_color` from GET /api/customer/profile
//      over localStorage, falling back to localStorage during the migration
//      window so existing local picks aren't lost.
