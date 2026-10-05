import { applyGarment } from './garmentCatalog';

// `category` is the category the customer was browsing when they picked the garment.
export const selectFamily = (setCfg, fam, category) => setCfg(p => applyGarment(p, fam.id, category ? { category } : {}));
