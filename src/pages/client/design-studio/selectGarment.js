import { applyGarment } from './garmentCatalog';

// `category` is the category the customer was browsing when they picked the garment; `pick` is the chosen { fit, sleeve }, re-validated.
// bodyColor (carousel pick) lands in cfg.colors.body, the colour zone the canvas and 3D both read.
export const selectFamily = (setCfg, fam, category, { bodyColor, ...pick } = {}) => setCfg(p => {
  const n = applyGarment(p, fam.id, { ...(category ? { category } : {}), ...pick });
  return bodyColor ? { ...n, colors: { ...n.colors, body: bodyColor } } : n;
});
