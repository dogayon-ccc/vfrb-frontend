// Stage view rules: a garment lands in 2D unless its 3D is verified (none are yet); then the current view is kept.
import { resolveTarget } from './garmentCatalog';

// The table's opening plays once per tab session; blocked storage falls back to memory, reduced motion never plays it.
export const OPENING_MS = 600;
const OPENING_KEY = 'ds_opening_seen', openingMemo = { done: false };
export function claimOpening(storage, reduced, memo = openingMemo) {
  if (reduced || memo.done) return false;
  memo.done = true;
  try {
    if (storage?.getItem(OPENING_KEY)) return false;
    storage?.setItem(OPENING_KEY, '1');
  } catch { /* the memo already holds it for this page */ }
  return true;
}

export const landingView = (status, current = '2d') => (status === '2d-3d' ? current : '2d');
export const landingViewFor = (cfg, current = '2d') =>
  landingView(cfg?.garment ? resolveTarget(cfg.garment, cfg.sleeve, cfg.fit)?.status ?? null : null, current);

// A raster photo base is never shown above its native resolution: the largest artboard scale that keeps it at or under 1:1 on screen.
export const inCanvasScale = (asset, artboard) => Math.min(artboard.w / asset.w, artboard.h / asset.h);
export const photoMaxScale = (asset, artboard) => (asset && artboard?.w && artboard?.h ? 1 / inCanvasScale(asset, artboard) : Infinity);
