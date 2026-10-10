import { assetFor, assetById } from './garmentAssets';
import { glbSlotFor, slotLive } from './glbSlots';
import { applyGarment, resolveSleeve, FAMILY_BY_NAME } from './garmentCatalog';
import { modelFromPhoto } from './garmentCapabilities';
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
  hospitality: 'Hospitality / Service', industrial: 'Industrial / Work', dress: 'Corporate',
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
// Left out on purpose (reference only): blouse-mandarin-yellow is a full-placket blouse, but Mandarin Collar / Short is now the housekeeping tunic photo.
// shirt-mandarin-polkadot opens Mandarin Collar / Long / male (vector template + its own model); the female Long is the BIR blouse photo base.
const BASES = {
  'scrub-set-women-vneck':  ['Medical / Scrubs', 'Scrub Top', 'Short', 'scrub-top-women-short'],
  'scrub-set-men-vneck':    ['Medical / Scrubs', 'Scrub Top', 'Short', 'scrub-top-men-short'],
  'scrub-set-housekeeping': ['Hospitality / Service', 'Mandarin Collar', 'Short', 'mandarin-tunic-housekeeping'],
  'blouse-tunic-roundneck-blue': ['Corporate', 'T-Shirt', 'Short', null],
  'shirt-utility-beige-long': ['Industrial / Work', 'Button-Down', 'Long', null],
  'bir-blouse-trousers-blue': ['Corporate', 'Button-Down', 'Long', 'button-down-bir-long'],
  'blouse-roundneck-fuchsia': ['Corporate', 'Round Neck', 'Short', 'round-neck-fuchsia-short'],
  // v3 product photos of single bottoms: each opens its own family's vector template. Pants and Shorts 3D are garment-only models generated from these exact photos
  // (garmentCapabilities `sourcePhoto`), so those two photos carry their GLB; the corporate-skirt model was rejected (its back is modelled as shorts), so that photo stays editable-2d.
  'pants':           ['Corporate', 'Pants', null, null],
  'shorts':          ['School Uniform', 'Shorts', null, null],
  'corporate-skirt': ['Corporate', 'Skirt', null, null],
  // Photos whose garment-only model now backs a catalog family of the same cut (garmentCapabilities `sourcePhoto`): each opens that family's vector template.
  'blazer-tweed-herringbone': ['Corporate', 'Blazer', 'Long', null],
  'blazer-white-notch': ['Corporate', 'Blazer', '3/4', null],
  'blazer-blouse-blue': ['Corporate', 'Blouse', 'Short', null],
  'dress-bir-green-yellow-collar': ['Corporate', 'Dress', 'Short', null],
  'school-skirt': ['School Uniform', 'Pleated Skirt', null, null],
  'shirt-mandarin-polkadot': ['Corporate', 'Mandarin Collar', 'Long', null],
  'polo-red-claremont': ['Corporate', 'Polo Shirt', 'Short', null],
  'blazer-collarless-tan': ['Corporate', 'Collarless Blazer', 'Long', null],
  'blazer-pinstripe-royal': ['Corporate', 'Collarless Blazer', 'Short', null],
};

// Read-only 3D reference of the photographed garment or set: a garment-only Meshy model generated from this very photo
// (asset-staging/mesh-3d, copied to /models/reference/<photo id>.glb; matched by front/side/back renders, see GLB-STAGING-AUDIT.md).
// It is a shape preview only: one neutral colour, not editable, and a fused set is never split into editable pieces.
// Left out: dress-sheath-denim-blue (its file is a copy of blazer-pinstripe-navy), blazer-blouse-blue-short (the model is the blouse
// alone), set-vest-blouse (mannequin hips fused in), corporate-skirt (back modelled as shorts), and files over 3.5 MB.
const REF_3D = new Set([
  'bir-blouse-trousers-blue', 'blazer-double-breasted-gray', 'blazer-pinstripe-navy', 'blouse-roundneck-fuchsia', 'blouse-roundneck-mustard',
  'pantsuit-notch-short-gray', 'peplum-set-navy', 'polo-barong-brown', 'shirt-two-tone-gpc', 'set-pinstripe-pants', 'set-pinstripe-skirt',
  'scrub-set-women-vneck', 'scrub-set-men-vneck', 'scrub-set-housekeeping',
  'blouse-asymmetric-blue', 'blouse-pleated-bib-white', 'blouse-scarf-cream', 'dress-butter-belted',
  'dress-tunic-maternity-navy', 'jack-shirt-two-tone',
]);

// sleeve = sleeve of the top/dress piece (null when no sleeve). source = how the photo was shot; worn = model photo with the body removed; mannequin/hanger photos fuse the
// mannequin or hanger into an image-to-3D result, flat-lay photos do not.
const D = (id, name, category, gender, piece, sleeve, collar, source, parts = [piece]) => {
  const e = build(id, name, category, gender, piece, sleeve, collar, source, parts);
  const ok = !!openTarget(e);
  return ok ? e : { ...e, base: null, garmentFamily: null, editable2D: false, editable2d: false, exactBase: false, glb: null, glbSrc: null, glbStatus: 'none', zones: [], faces: { front: false, back: false }, has3D: false, status: 'photo-only', tier: 'reference' };
};
const build = (id, name, category, gender, piece, sleeve, collar, source, parts) => {
  const base = BASES[id] ?? null;
  const asset = base?.[3] ? assetById(base[3]) : null;
  // A vector-template photo has a 3D model only when its family's model was generated from this very photo.
  const family3D = base && !asset ? modelFromPhoto(id) : null;
  const slot = asset ? glbSlotFor(asset.id) : family3D?.match.test(base[1]) ? { state: 'approx', file: Object.values(family3D.models)[0] } : null, live = slotLive(slot);
  return {
    id, templateId: id, name, label: name, image: `/gallery/${id}.webp`, previewSrc: `/gallery/${id}.webp`, garmentFamily: base ? base[1] : null, editable2D: !!base, editable2d: !!base,
    kind: 'photo', exactBase: !!base?.[3], category, categories: [category], gender, genders: [gender], piece, sleeve, sleeves: sleeve ? [sleeve] : [], collar, source, parts, base,
    ref3D: REF_3D.has(id) ? { file: `/models/reference/${id}.glb`, set: parts.length > 1 } : null,
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
  D('blazer-collarless-tan',   'Collarless Blazer',             'corporate',   'female', 'upper', 'Long',  'Collarless',     'mannequin'),
  D('blazer-pinstripe-royal',  'Pinstripe Collarless Blazer',   'corporate',   'female', 'upper', 'Short', 'Collarless',     'hanger'),
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
  // product = supplied ghost-mannequin product photo (v3 previews, masters in public/garments2d/source). Reference only on purpose: school-skirt is pleated
  // (the Skirt template and its 3D scan are a pencil skirt) and blazer-blouse-blue has a notch collar no template has.
  D('pants',                   'Dress Slacks',                  'corporate',   'male',   'lower', null,    null,             'product'),
  D('shorts',                  'School Shorts',                 'school',      'male',   'lower', null,    null,             'product'),
  D('corporate-skirt',         'Pencil Skirt',                  'corporate',   'female', 'lower', null,    null,             'product'),
  D('school-skirt',            'Pleated School Skirt',          'school',      'female', 'lower', null,    null,             'product'),
  D('blazer-blouse-blue',      'Notch-Collar Short-Sleeve Blouse','corporate', 'female', 'upper', 'Short', 'Notch lapel',    'product'),
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
