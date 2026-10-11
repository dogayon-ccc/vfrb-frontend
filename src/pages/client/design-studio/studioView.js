// Stage view rules: a garment lands in 2D unless its 3D is verified (none are yet); then the current view is kept.
import { resolveTarget } from './garmentCatalog';

export const landingView = (status, current = '2d') => (status === '2d-3d' ? current : '2d');
export const landingViewFor = (cfg, current = '2d') =>
  landingView(cfg?.garment ? resolveTarget(cfg.garment, cfg.sleeve, cfg.fit)?.status ?? null : null, current);

// A raster photo base is never shown above its native resolution: the largest artboard scale that keeps it at or under 1:1 on screen.
export const inCanvasScale = (asset, artboard) => Math.min(artboard.w / asset.w, artboard.h / asset.h);
export const photoMaxScale = (asset, artboard) => (asset && artboard?.w && artboard?.h ? 1 / inCanvasScale(asset, artboard) : Infinity);
