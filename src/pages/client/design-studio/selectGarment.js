import { applyGarment } from './garmentCatalog';

export const selectFamily = (setCfg, fam) => setCfg(p => applyGarment(p, fam.id));
