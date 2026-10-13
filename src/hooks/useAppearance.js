// Paints the signed-in user's mode and accent on <html> while a portal layout is mounted (portals and modals included).
// Unmounting (sign-out, Design Studio, auth pages) restores the default light VFRB look.
import { useLayoutEffect } from 'react';
import { loadAccent, getAccentVars, ACCENT_CHANGE_EVENT, DARK_ON_ACCENT } from '../utils/accentColor';
import { loadMode, isDarkMode, THEME_CHANGE_EVENT } from '../utils/themeMode';

export function useAppearance(userId) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    let mode = loadMode(userId), accent = loadAccent(userId), applied = [];

    const paint = () => {
      const dark = isDarkMode(mode, mq?.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      root.style.colorScheme = dark ? 'dark' : 'light';
      applied.forEach((k) => root.style.removeProperty(k));
      const vars = { ...getAccentVars(accent, dark), ...(dark ? { '--on-teal': DARK_ON_ACCENT } : {}) };
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      applied = Object.keys(vars);
    };
    const onMode = (e) => { mode = e.detail; paint(); };
    const onAccent = (e) => { accent = e.detail; paint(); };

    paint();
    window.addEventListener(THEME_CHANGE_EVENT, onMode);
    window.addEventListener(ACCENT_CHANGE_EVENT, onAccent);
    mq?.addEventListener?.('change', paint);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onMode);
      window.removeEventListener(ACCENT_CHANGE_EVENT, onAccent);
      mq?.removeEventListener?.('change', paint);
      applied.forEach((k) => root.style.removeProperty(k));
      delete root.dataset.theme;
      root.style.colorScheme = '';
    };
  }, [userId]);
}
