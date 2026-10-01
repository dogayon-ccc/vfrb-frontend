// Browsable design catalog: editable garment templates (from garmentCatalog.js) plus real VFRB garment photos. `glb` stays null until a garment-only GLB passes
// docs/engineering/GLB-CAPABILITY-MATRIX.md; until then an entry is a photo reference and is never presented as editable 3D.
// category/gender/sleeve are read from the photo, not confirmed by the client: verify before release.

import { CATALOG } from './garmentCatalog';

export const CATEGORIES = [
  { id: 'school',      label: 'School' },
  { id: 'corporate',   label: 'Corporate / Business' },
  { id: 'medical',     label: 'Medical / Healthcare' },
  { id: 'hospitality', label: 'Hospitality / Service' },
  { id: 'industrial',  label: 'Industrial / Work' },
  { id: 'dress',       label: 'Uniform Dress' },
];
// Gallery category id -> garmentCatalog.js category id. 'dress' has no 2D family, so it maps to nothing and dress entries stay reference-only.
export const CATALOG_CATEGORY = {
  school: 'School Uniform', corporate: 'Corporate', medical: 'Medical / Scrubs',
  hospitality: 'Hospitality / Service', industrial: 'Industrial / Work', dress: null,
};
const GALLERY_CATEGORY = Object.fromEntries(Object.entries(CATALOG_CATEGORY).filter(([, v]) => v).map(([k, v]) => [v, k]));

export const PIECES = [
  { id: 'upper', label: 'Upper body' },
  { id: 'lower', label: 'Lower body' },
  { id: 'set',   label: 'Full set' },
  { id: 'dress', label: 'Dress' },
];
export const GENDERS = [{ id: 'female', label: 'Women' }, { id: 'male', label: 'Men' }, { id: 'unisex', label: 'Unisex' }];
export const SLEEVES = ['Short', '3/4', 'Long'];

// base = nearest editable 2D garment [catalog category, garment, sleeve], set only where the collar type really matches; null = photo reference only.
const BASES = {
  'scrub-set-women-vneck':  ['Medical / Scrubs', 'Scrub Top', 'Short'],
  'scrub-set-men-vneck':    ['Medical / Scrubs', 'Scrub Top', 'Short'],
  'scrub-set-housekeeping': ['Hospitality / Service', 'Mandarin Collar', 'Short'],
  'blouse-mandarin-yellow': ['Hospitality / Service', 'Mandarin Collar', 'Short'],
  'blouse-tunic-roundneck-blue': ['Corporate', 'T-Shirt', 'Short'],
  'shirt-utility-beige-long': ['Industrial / Work', 'Button-Down', 'Long'],
  'shirt-mandarin-polkadot': ['Corporate', 'Mandarin Collar', 'Long'],
};

// sleeve = sleeve of the top/dress piece (null when no sleeve). source = how the photo was shot; mannequin/hanger photos fuse the
// mannequin or hanger into an image-to-3D result, flat-lay photos do not.
const D = (id, name, category, gender, piece, sleeve, collar, source, parts = [piece]) => {
  const base = BASES[id] ?? null;
  return {
    id, name, kind: 'photo', category, categories: [category], gender, genders: [gender], piece, sleeve, sleeves: sleeve ? [sleeve] : [], collar, source, parts, base,
    thumb: `/gallery/${id}.webp`, glb: null,
    // reference = photo only; editable-2d = opens the nearest 2D silhouette. A photo is never 3D: no GLB exists for any of them.
    tier: base ? 'editable-2d' : 'reference', has3D: false, status: 'photo-only',
  };
};

export const DESIGNS = [
  D('scrub-set-women-vneck',   'Scrub Suit, V-Neck (Women)',    'medical',     'female', 'set',   'Short', 'V-neck',        'flat-lay',  ['upper', 'lower']),
  D('scrub-set-men-vneck',     'Scrub Suit, V-Neck (Men)',      'medical',     'male',   'set',   'Short', 'V-neck',        'flat-lay',  ['upper', 'lower']),
  D('scrub-set-housekeeping',  'Housekeeping Scrub Suit',       'hospitality', 'female', 'set',   'Short', 'Mandarin band', 'flat-lay',  ['upper', 'lower']),
  D('blouse-mandarin-yellow',  'Mandarin Collar Blouse',        'hospitality', 'female', 'upper', 'Short', 'Mandarin',      'mannequin'),
  D('blouse-pleated-bib-white','Pleated Bib Blouse',            'school',      'female', 'upper', 'Short', 'Round scalloped', 'hanger'),
  D('blouse-scarf-cream',      'Blouse with Neck Scarf',        'corporate',   'female', 'upper', 'Short', 'Scarf',         'hanger'),
  D('blouse-asymmetric-blue',  'Asymmetric Collar Blouse',      'corporate',   'female', 'upper', 'Short', 'Asymmetric',    'hanger'),
  D('blouse-tunic-roundneck-blue', 'Round Neck Tunic Blouse',   'corporate',   'female', 'upper', 'Short', 'Round neck',    'mannequin'),
  D('shirt-utility-beige-long','Utility Work Shirt',            'industrial',  'male',   'upper', 'Long',  'Point collar',   'mannequin'),
  D('shirt-mandarin-polkadot', 'Polka Dot Mandarin Shirt',      'corporate',   'male',   'upper', 'Long',  'Mandarin',       'mannequin'),
  D('blazer-collarless-tan',   'Collarless Blazer',             'corporate',   'female', 'upper', '3/4',   'Collarless',     'mannequin'),
  D('blazer-pinstripe-royal',  'Pinstripe Collarless Blazer',   'corporate',   'female', 'upper', '3/4',   'Collarless',     'hanger'),
  D('blazer-white-notch',      'White Single-Breasted Blazer',  'corporate',   'female', 'upper', '3/4',   'Notch lapel',    'hanger'),
  D('blazer-tweed-herringbone','Herringbone Tweed Blazer',      'corporate',   'female', 'upper', 'Long',  'Notch lapel',    'mannequin'),
  D('blazer-open-front-black', 'Open-Front Collarless Blazer',  'corporate',   'female', 'upper', 'Long',  'Collarless',     'mannequin'),
  D('set-pinstripe-pants',     'Pinstripe Pant Suit (3-piece)', 'corporate',   'female', 'set',   '3/4',   'Notch lapel',    'mannequin', ['upper', 'upper', 'lower']),
  D('set-pinstripe-skirt',     'Pinstripe Skirt Suit (3-piece)','corporate',   'female', 'set',   '3/4',   'Notch lapel',    'mannequin', ['upper', 'upper', 'lower']),
  D('set-vest-blouse',         'Vest and Blouse Set',           'corporate',   'female', 'set',   'Short', 'Point collar',   'mannequin', ['upper', 'upper']),
  D('dress-shift-geometric',   'Printed Shift Dress',           'dress',       'female', 'dress', 'Short', 'Scoop neck',    'mannequin'),
  D('dress-tunic-maternity-navy','Tunic Dress (Maternity)',     'dress',       'female', 'dress', '3/4',   'Shirt collar',   'mannequin'),
];

// Editable garment templates, read from the canonical catalog (never re-declared here). One entry per family, listing every category it belongs to.
const LOWER = new Set(['Pants', 'Shorts', 'Skirt']);
const TIER_OF_3D = { supported: '2d-3d', partial: '2d-3d-approx', none: 'editable-2d' };
export const GARMENTS = (() => {
  const byName = new Map();
  CATALOG.forEach(cat => cat.families.forEach(f => {
    if (!f.has2D) return;
    const e = byName.get(f.id) ?? { fam: f, cats: [] };
    e.cats.push(GALLERY_CATEGORY[cat.id]);
    byName.set(f.id, e);
  }));
  return [...byName.values()].map(({ fam, cats }) => ({
    id: `fam:${fam.id}`, name: fam.displayName, kind: 'garment', family: fam.id,
    categories: cats, category: cats[0],
    genders: fam.fits.length ? fam.fits : [], gender: fam.fits[0] ?? null,
    piece: LOWER.has(fam.id) ? 'lower' : 'upper', sleeves: fam.styles, sleeves3D: fam.sleeves3D,
    collar: null, base: [cats[0], fam.id, fam.defaultStyle], thumb: null,
    tier: TIER_OF_3D[fam.status3D], has3D: fam.status3D !== 'none', status3D: fam.status3D, limitations: fam.limitations ?? [],
  }));
})();

export const TIER_LABEL = {
  'reference':    { label: 'Reference photo', tone: 'muted', note: 'Inspiration only. No editable shape or 3D model for this design.' },
  'editable-2d':  { label: 'Editable 2D', tone: 'info', note: 'Opens the nearest 2D garment shape. No 3D model.' },
  '2d-3d-approx': { label: '2D + 3D (approx.)', tone: 'warn', note: 'Editable in 2D with a real 3D model. 3D colour zones are approximate.' },
  '2d-3d':        { label: '2D + 3D', tone: 'ok', note: 'Editable in 2D with a verified 3D model.' },
};

export const ENTRIES = [...GARMENTS, ...DESIGNS];

const matches = (d, f) =>
  (!f.category || d.categories.includes(f.category)) && (!f.gender || d.genders.includes(f.gender)) &&
  (!f.piece || d.piece === f.piece) && (!f.sleeve || d.sleeves.includes(f.sleeve)) && (!f.tier || d.tier === f.tier);

export const filterDesigns = (f = {}, list = ENTRIES) => list.filter(d => matches(d, f));

// Count per option value with that facet's own filter ignored, so a chip with 0 results can be disabled instead of silently empty.
export function facetCounts(f = {}, list = ENTRIES) {
  const count = (key, values) => Object.fromEntries(values.map(v => [v, filterDesigns({ ...f, [key]: v }, list).length]));
  return {
    category: count('category', CATEGORIES.map(c => c.id)),
    piece:    count('piece', PIECES.map(p => p.id)),
    gender:   count('gender', GENDERS.map(g => g.id)),
    sleeve:   count('sleeve', SLEEVES),
    tier:     count('tier', Object.keys(TIER_LABEL)),
  };
}

// What opening an entry does to the design: [catalog category, garment, sleeve, fit], each re-validated by applyGarment. Null = cannot open in the editor.
export function openTarget(d, f = {}) {
  if (!d.base) return null;
  const cat = CATALOG_CATEGORY[d.categories.includes(f.category) ? f.category : d.category] ?? CATALOG_CATEGORY[d.category];
  const [, garment, baseSleeve] = d.base;
  return {
    category: cat ?? undefined, garment,
    sleeve: d.sleeves.includes(f.sleeve) ? f.sleeve : baseSleeve,
    fit: d.genders.includes(f.gender) ? f.gender : d.genders[0],
  };
}
