// src/utils/accentColor.js
// Per-user portal accent (preset list only, no freeform picker), applied as CSS vars on <html> by useAppearance while a
// signed-in portal (customer or admin) is mounted. Login, auth pages and the Design Studio keep the VFRB teal.
// Palette: values 2-7 reuse PH_SWATCHES (admin/PurchaseOrders.jsx); pale swatches are excluded because they fail as a fill.
// Persistence: localStorage per user_id ("vfrb_accent_42") for instant paint, plus notification_preferences.theme_accent
//   (PATCH /api/settings/appearance), seeded at sign-in by seedAccentFromUser().

import axios from "axios";
import { mix, liftForSurface } from "./colorMath";

const STORAGE_PREFIX = "vfrb_accent_";

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

// Dark-mode reference surface (the lightest dark card, --cx-card) and the dark text used on accent fills (--on-teal).
export const DARK_SURFACE = "#1f2528";
export const DARK_ON_ACCENT = "#0b1215";

// Accent tokens for a preset. Light + default teal returns null so theme.css's real values stay untouched.
// Dark lifts the accent until it reads as text on dark cards; fills then carry dark text (DARK_ON_ACCENT) instead of white.
export function getAccentVars(hex, dark = false) {
  if (!hex) hex = DEFAULT_ACCENT_HEX;
  if (dark) {
    const ink = liftForSurface(hex, DARK_SURFACE);
    return {
      "--teal": ink,
      "--teal-2": mix(ink, "#ffffff", 0.3),
      "--teal-dark": mix(ink, "#ffffff", 0.18),
      "--teal-darker": mix(ink, "#ffffff", 0.3),
      "--teal-50": mix(DARK_SURFACE, hex, 0.22),
      "--teal-100": mix(DARK_SURFACE, hex, 0.36),
      "--border-focus": `${ink}99`,
    };
  }
  if (hex.toLowerCase() === DEFAULT_ACCENT_HEX.toLowerCase()) return null;
  return {
    "--teal": hex,
    "--teal-2": mix(hex, "#ffffff", 0.22),
    "--teal-dark": mix(hex, "#000000", 0.18),
    "--teal-darker": mix(hex, "#000000", 0.32),
    "--teal-50": mix(hex, "#ffffff", 0.93),
    "--teal-100": mix(hex, "#ffffff", 0.8),
    "--border-focus": `${hex}80`,
  };
}

// Saved hex for a user, or the default teal.
export function loadAccent(userId) {
  if (!userId) return DEFAULT_ACCENT_HEX;
  try {
    return localStorage.getItem(STORAGE_PREFIX + userId) || DEFAULT_ACCENT_HEX;
  } catch {
    return DEFAULT_ACCENT_HEX;
  }
}

// Saves locally and tells the mounted portal layout to repaint.
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

// ── Server copy (notification_preferences.theme_accent, stored as the preset id) ──
export const accentIdFor = (hex) => ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === String(hex).toLowerCase())?.id ?? "teal";
export const accentHexFor = (id) => ACCENT_PRESETS.find((p) => p.id === id)?.hex ?? DEFAULT_ACCENT_HEX;

// Saves locally (applied at once) and on the account; resolves to an error message or ''.
export async function saveAccentEverywhere(userId, hex) {
  saveAccent(userId, hex);
  try { await axios.patch("/api/settings/appearance", { theme_accent: accentIdFor(hex) }); return ""; }
  catch (e) { return e.response?.data?.message ?? "Saved on this device only; could not reach the server."; }
}

// On sign-in: the account's saved accent wins over whatever this device last had.
export function seedAccentFromUser(user) {
  const id = user?.appearance?.theme_accent;
  if (!user?.user_id || !id) return;
  try { localStorage.setItem(STORAGE_PREFIX + user.user_id, accentHexFor(id)); } catch { /* private mode */ }
}
