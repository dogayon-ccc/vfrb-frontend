import { applyGarment } from './garmentCatalog';

// `category` is the category the customer was browsing when they picked the garment; `pick` is the chosen { fit, sleeve }, re-validated.
export const selectFamily = (setCfg, fam, category, pick = {}) => setCfg(p => applyGarment(p, fam.id, { ...(category ? { category } : {}), ...pick }));
