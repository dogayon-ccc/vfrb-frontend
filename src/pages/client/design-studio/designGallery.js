// Real VFRB garments (client photos) as the browsable design catalog. `glb` stays null until a garment-only GLB passes
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
export const PIECES = [
  { id: 'upper', label: 'Upper body' },
  { id: 'lower', label: 'Lower body' },
  { id: 'set',   label: 'Full set' },
  { id: 'dress', label: 'Dress' },
];
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
const D = (id, name, category, gender, piece, sleeve, collar, source, parts = [piece]) =>
  ({ id, name, category, gender, piece, sleeve, collar, source, parts, base: BASES[id] ?? null, thumb: `/gallery/${id}.webp`, glb: null, status: 'photo-only' });

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

const matches = (d, f) =>
  (!f.category || d.category === f.category) && (!f.gender || d.gender === f.gender) &&
  (!f.piece || d.piece === f.piece) && (!f.sleeve || d.sleeve === f.sleeve);

export const filterDesigns = (f = {}, list = DESIGNS) => list.filter(d => matches(d, f));

// Count per option value with that facet's own filter ignored, so a chip with 0 results can be disabled instead of silently empty.
export function facetCounts(f = {}, list = DESIGNS) {
  const count = (key, values) => Object.fromEntries(values.map(v => [v, filterDesigns({ ...f, [key]: v }, list).length]));
  return {
    category: count('category', CATEGORIES.map(c => c.id)),
    gender:   count('gender', ['female', 'male']),
    piece:    count('piece', PIECES.map(p => p.id)),
    sleeve:   count('sleeve', SLEEVES),
  };
}
