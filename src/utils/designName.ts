// The customer's own design name from a studio_config (object or JSON string), whitespace-normalised; '' when there is none.
// Shared by the Studio draft label, customer order titles and the admin order view, so one design reads the same everywhere.
// Garment names as customers see them: internal disambiguation suffixes such as " (Reference)" stay out of labels.
export const garmentLabel = s => (s ? String(s).replace(/\s*\(Reference\)/g, '') : s);

export function savedDesignName(cfg) {
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch { return ''; } }
  const name = cfg && typeof cfg === 'object' ? cfg.name : null;
  return typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : '';
}
