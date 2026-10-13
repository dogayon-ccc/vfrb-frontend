// Per-user display mode (light | dark | system). localStorage per user_id for instant paint; the account copy is
// notification_preferences.theme_mode (PATCH /api/settings/appearance), seeded at sign-in by seedAppearance().
import axios from 'axios';
import { seedAccentFromUser } from './accentColor';

const PREFIX = 'vfrb_theme_';
export const THEME_MODES = ['light', 'system', 'dark'];
export const THEME_CHANGE_EVENT = 'vfrb:theme-change';

export function loadMode(userId) {
  try { const m = userId && localStorage.getItem(PREFIX + userId); return THEME_MODES.includes(m) ? m : 'light'; } catch { return 'light'; }
}

// Saves locally and tells the mounted portal layout to repaint.
export function saveMode(userId, mode) {
  if (!userId || !THEME_MODES.includes(mode)) return;
  try { localStorage.setItem(PREFIX + userId, mode); } catch { /* private mode: still applied for this visit */ }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: mode }));
}

// Saves locally (applied at once) and on the account; resolves to an error message or ''.
export async function saveModeEverywhere(userId, mode) {
  saveMode(userId, mode);
  try { await axios.patch('/api/settings/appearance', { theme_mode: mode }); return ''; }
  catch (e) { return e.response?.data?.message ?? 'Saved on this device only; could not reach the server.'; }
}

// On sign-in: the account's saved mode and accent win over whatever this device last had.
export function seedAppearance(user) {
  seedAccentFromUser(user);
  const m = user?.appearance?.theme_mode;
  if (user?.user_id && THEME_MODES.includes(m)) { try { localStorage.setItem(PREFIX + user.user_id, m); } catch { /* private mode */ } }
}

export const isDarkMode = (mode, prefersDark) => mode === 'dark' || (mode === 'system' && !!prefersDark);
