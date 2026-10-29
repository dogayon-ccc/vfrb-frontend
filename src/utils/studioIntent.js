// A public "Find your uniform" tile: the Studio's garment picker opens filtered to this category, also across sign-in.
import { setStudioLock } from './studioLock';

const KEY = 'vfrb_studio_category';
export function startStudioIn(category) {
  try { sessionStorage.setItem(KEY, category); sessionStorage.removeItem('studio_config'); } catch { /* storage blocked: opens unfiltered */ }
  setStudioLock(null);
}
export const peekStudioCategory = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
export const clearStudioCategory = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };
