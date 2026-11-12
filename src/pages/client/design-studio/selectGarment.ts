import { applyGarment } from './garmentCatalog';
import { startColors, withBody, realTrimFor } from './colorRules';

// `category` is the category the customer was browsing when they picked the garment; `pick` is the chosen { fit, sleeve }, re-validated.
// bodyColor (carousel pick) lands in cfg.colors.body, the colour zone the canvas and 3D both read.
// A new design (no garment yet) starts single-colour: the body colour on every zone, plus the garment's real trim if it has one.
export const selectFamily = (setCfg, fam, category, { bodyColor, ...pick } = {}) => setCfg(p => {
  const n = applyGarment(p, fam.id, { ...(category ? { category } : {}), ...pick });
  if (!p.garment) return { ...n, colors: startColors(bodyColor ?? p.colors?.body ?? n.colors?.body, realTrimFor(n.garment, n.sleeve, n.fit)) };
  return bodyColor ? { ...n, colors: withBody(n.colors, bodyColor) } : n;
});
