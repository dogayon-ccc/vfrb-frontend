export const selectFamily = (setCfg, fam) => setCfg(p => ({
  ...p,
  garment: fam.id,
  sleeve: fam.defaultStyle,
  fit: fam.fits.length > 1 ? (p.fit ?? 'male') : undefined,
}));
