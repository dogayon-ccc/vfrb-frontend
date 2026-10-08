import { assetFor, assetById } from './garmentAssets';
import { glbSlotFor, slotLive } from './glbSlots';
import { applyGarment, resolveSleeve, FAMILY_BY_NAME } from './garmentCatalog';
// Real VFRB inspiration gallery: photos only. Editable garment families live in garmentCatalog.js and are never listed here as designs. `glb` stays null until a garment-only GLB passes
// docs/engineering/GLB-CAPABILITY-MATRIX.md; until then an entry is a photo reference and is never presented as editable 3D.
// category/gender/sleeve are read from the photo, not confirmed by the client: verify before release.

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

export const PIECES = [
  { id: 'upper', label: 'Upper body' },
  { id: 'lower', label: 'Lower body' },
  { id: 'set',   label: 'Full set' },
  { id: 'dress', label: 'Dress' },
];
export const GENDERS = [{ id: 'female', label: 'Women' }, { id: 'male', label: 'Men' }, { id: 'unisex', label: 'Unisex' }];
export const SLEEVES = ['Short', '3/4', 'Long'];

// base = [catalog category, garment, sleeve, asset]. `asset` is the id of the exact 2D photo base the photo must land on, or null for the vector template.
// An entry is editable only when the target really resolves to that base (see openTarget), so two photos of one family can never share the wrong base.
// Left out on purpose (reference only): shirt-mandarin-polkadot (Mandarin Collar / Long is the band-collar BIR photo base, a different garment); blouse-mandarin-yellow is a full-placket blouse, but Mandarin Collar / Short is now the housekeeping tunic photo.
const BASES = {
  'scrub-set-women-vneck':  ['Medical / Scrubs', 'Scrub Top', 'Short', 'scrub-top-women-short'],
  'scrub-set-men-vneck':    ['Medical / Scrubs', 'Scrub Top', 'Short', 'scrub-top-men-short'],
  'scrub-set-housekeeping': ['Hospitality / Service', 'Mandarin Collar', 'Short', 'mandarin-tunic-housekeeping'],
  'blouse-tunic-roundneck-blue': ['Corporate', 'T-Shirt', 'Short', null],
  'shirt-utility-beige-long': ['Industrial / Work', 'Button-Down', 'Long', null],
  'bir-blouse-trousers-blue': ['Corporate', 'Button-Down', 'Long', 'button-down-bir-long'],
  'blouse-roundneck-fuchsia': ['Corporate', 'Round Neck', 'Short', 'round-neck-fuchsia-short'],
};

// sleeve = sleeve of the top/dress piece (null when no sleeve). source = how the photo was shot; worn = model photo with the body removed; mannequin/hanger photos fuse the
// mannequin or hanger into an image-to-3D result, flat-lay photos do not.
const D = (id, name, category, gender, piece, sleeve, collar, source, parts = [piece]) => {
  const e = build(id, name, category, gender, piece, sleeve, collar, source, parts);
  const ok = !!openTarget(e);
  return ok ? e : { ...e, base: null, garmentFamily: null, editable2D: false, editable2d: false, exactBase: false, glb: null, glbSrc: null, glbStatus: 'none', zones: [], faces: { front: false, back: false }, has3D: false, status: 'photo-only', tier: 'reference' };
};
const build = (id, name, category, gender, piece, sleeve, collar, source, parts) => {
  const base = BASES[id] ?? null;
  const asset = base?.[3] ? assetById(base[3]) : null, slot = asset ? glbSlotFor(asset.id) : null, live = slotLive(slot);
  return {
    id, templateId: id, name, label: name, image: `/gallery/${id}.webp`, previewSrc: `/gallery/${id}.webp`, garmentFamily: base ? base[1] : null, editable2D: !!base, editable2d: !!base,
    kind: 'photo', exactBase: !!base?.[3], category, categories: [category], gender, genders: [gender], piece, sleeve, sleeves: sleeve ? [sleeve] : [], collar, source, parts, base,
    thumb: `/gallery/${id}.webp`, glb: live ? slot.file : null, glbSrc: live ? slot.file : null, glbStatus: slot?.state ?? 'none',
    zones: asset?.zones ?? [], faces: { front: !!base, back: false },
    // reference = photo only; editable-2d = opens the nearest 2D silhouette; 2d-3d-approx = exact photo base plus its own garment-only GLB (glbSlots.js).
    tier: base ? (live ? (slot.state === 'verified' ? '2d-3d' : '2d-3d-approx') : 'editable-2d') : 'reference', has3D: live, status: live ? '3d-' + slot.state : 'photo-only',
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
  // worn = model photo, background removed; arms, neck, hands and shoes stripped by clothing segmentation (tools/worn-photo-cutouts.py). Category/gender/sleeve read from the photo.
  D('bir-blouse-trousers-blue','BIR Thursday Blouse and Trousers','corporate',   'female', 'set',   'Long',  'Point collar',   'worn', ['upper', 'lower']),
  D('pantsuit-notch-short-gray','Short-Sleeve Notch Jacket and Trousers','corporate','female','set', 'Short', 'Notch lapel',    'worn', ['upper', 'lower']),
  D('polo-barong-brown',       'Polo Barong and Slacks',        'corporate',   'male',   'set',   'Short', 'Barong collar',  'worn', ['upper', 'lower']),
  D('jack-shirt-two-tone',     'Two-Tone Work Shirt (Polo Jack)','industrial', 'male',   'upper', 'Short', 'Point collar',   'worn'),
  D('blazer-double-breasted-gray','Double-Breasted Collarless Blazer Set','corporate','female','set','Long', 'Collarless',     'worn', ['upper', 'upper', 'lower']),
  D('dress-butter-belted',     'Belted Shift Dress',            'dress',       'female', 'dress', 'Short', 'Round neck',    'worn'),
  D('dress-bir-green-yellow-collar','BIR Official Uniform Dress','dress',      'female', 'dress', 'Short', 'Notch collar',   'worn'),
  D('dress-sheath-denim-blue', 'Sheath Dress, Notched Neckline','dress',       'female', 'dress', 'Short', 'Notched round neck','worn'),
  D('blazer-pinstripe-navy',   'Pinstripe Notch Blazer Set',    'corporate',   'female', 'set',   '3/4',   'Notch lapel',    'worn', ['upper', 'upper', 'lower']),
  D('blazer-blouse-blue-short','Short-Sleeve Blazer Blouse and Trousers','corporate','female','set','Short','Notch lapel',    'worn', ['upper', 'lower']),
  D('blouse-roundneck-fuchsia','Round Neck Blouse and Trousers (Fuchsia)','corporate','female','set','Short','Round neck',    'worn', ['upper', 'lower']),
  D('blouse-roundneck-mustard','Round Neck Blouse with Waist Band and Trousers','corporate','female','set','Short','Round neck','worn', ['upper', 'lower']),
  D('polo-red-claremont',      'Polo Shirt (Embroidered Logo)', 'corporate',   'unisex', 'upper', 'Short', 'Polo collar',   'worn'),
  D('shirt-two-tone-gpc',      'Two-Tone Short-Sleeve Shirt and Slacks','corporate','male','set', 'Short', 'Point collar',   'worn', ['upper', 'lower']),
  D('peplum-set-navy',         'Peplum Top and Pencil Skirt',   'corporate',   'female', 'set',   'Short', 'Square neck',    'worn', ['upper', 'lower']),
];

export const TIER_LABEL = {
  'reference':    { label: 'Reference photo', tone: 'muted', note: 'Inspiration only. No editable shape or 3D model for this design.' },
  'editable-2d':  { label: 'Editable 2D', tone: 'info', note: 'Opens the closest VFRB garment template for editing. The photo stays a reference; the template is not an exact copy of it.' },
  '2d-3d-approx': { label: '2D + 3D (approx.)', tone: 'warn', note: 'Editable in 2D with a real 3D model. 3D colour zones are approximate.' },
  '2d-3d':        { label: '2D + 3D', tone: 'ok', note: 'Editable in 2D with a verified 3D model.' },
};

export const ENTRIES = DESIGNS;

const matchesQuery = (d, q) => {
  const t = (q ?? '').trim().toLowerCase();
  if (!t) return true;
  return [d.name, d.collar, d.garmentFamily, CATEGORIES.find(c => c.id === d.category)?.label].some(v => v && String(v).toLowerCase().includes(t));
};

const matches = (d, f) =>
  (!f.category || d.categories.includes(f.category)) && (!f.gender || d.genders.includes(f.gender)) &&
  (!f.piece || d.piece === f.piece) && (!f.sleeve || d.sleeves.includes(f.sleeve)) && (!f.tier || d.tier === f.tier) && matchesQuery(d, f.q);

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
  const [, garment, baseSleeve, assetId = null] = d.base;
  if (!FAMILY_BY_NAME[garment]) return null;
  const t = {
    category: cat ?? undefined, garment,
    sleeve: d.sleeves.includes(f.sleeve) ? f.sleeve : baseSleeve,
    fit: d.genders.includes(f.gender) ? f.gender : d.genders[0],
  };
  // The target must land on the exact base this photo was matched to. A filter that changes sleeve or gender can move it onto another asset; then it is reference only.
  const r = applyGarment({}, garment, t);
  const landed = assetFor(garment, resolveSleeve(garment, r.sleeve), 'front', r.fit)?.id ?? null;
  return landed === assetId ? t : null;
}
