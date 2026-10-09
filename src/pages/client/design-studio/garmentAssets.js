// Photo-based 2D bases, keyed garment > sleeve > face > fit. Anything not listed keeps the vector template.
// `zones` lists the colour zones the photo supports. `gain` (default 1) compresses tone for dark sources so recolouring stays smooth.
// Add an entry only after tools/make-base-asset.py cut it and the edge was checked on a contrasting background.
const LIMITS = ['Front view only. The back view uses the generic shape.', 'One colour zone: collar, pocket and trim are not coloured separately.', 'No patterns on a photo base.'];

const LIMITS_TRIM = ['Front view only. The back view uses the generic shape.', 'Two colour zones: body, and one trim colour shared by the collar band, sleeve cuffs, pocket welts and buttons.', 'No patterns on a photo base.'];

const LIMITS_WORN = ['Front view only: no rear photo exists, so Back is disabled.', 'One colour zone (the whole top). Piping, seams and cuffs keep the photo\'s folds and shading but recolour with the body.', 'Cut from a worn-model photo: arms, neck and trousers were removed by clothing segmentation; a faint source watermark may remain near the hem.', 'No patterns on a photo base.'];

export const ASSET_2D = {
  // Trim = mask built offline by tools/make-trim-mask.py (collar band, cuffs, pocket welts; outline shadows and specks removed). `trimUnset` = the studio's default collar hex: until the customer picks a trim colour the photo's own trim is kept.
  'Mandarin Collar': {
    Long: {
      front: {
        female: { id: 'mandarin-blouse-bir-long', src: '/garments2d/mandarin-blouse-bir-long-front.webp', w: 218, h: 277, refLum: 91.9, zones: ['body'], source: 'VFRB-supplied worn-model photo (BIR Thursday blouse, mandarin collar, long sleeve), background removed', limitations: LIMITS_WORN },
      },
    },
    Short: {
      front: {
        female: { id: 'mandarin-tunic-housekeeping', src: '/garments2d/mandarin-tunic-housekeeping-front.webp', w: 215, h: 267, refLum: 101.2, trim: { mask: '/garments2d/mandarin-tunic-housekeeping-trim.webp', refLum: 60 }, trimUnset: '#c8a96e', zones: ['body', 'collar'], source: 'VFRB-supplied flat-lay photo, housekeeping scrub suit top (mandarin band collar)', limitations: LIMITS_TRIM },
      },
    },
  },
  // Button-Down / Long: blouse cut from the same worn-model photo the GLB was generated from (bir-blouse-trousers-blue), so 2D and 3D are one garment: spread point collar, placket, cuffed long sleeve.
  'Button-Down': {
    Long: {
      front: {
        female: { id: 'button-down-bir-long', src: '/garments2d/button-down-bir-long-front.webp', w: 187, h: 225, refLum: 90.2, zones: ['body'], source: 'VFRB-supplied worn-model photo (BIR blue long-sleeve blouse, point collar), blouse only, trousers removed, background removed', limitations: LIMITS_WORN },
      },
    },
  },
  'Round Neck': {
    Short: {
      front: {
        female: { id: 'round-neck-fuchsia-short', src: '/garments2d/round-neck-fuchsia-short-front.webp', w: 245, h: 298, refLum: 135.1, zones: ['body'], source: 'VFRB-supplied worn-model photo (fuchsia round-neck blouse), background removed', limitations: LIMITS_WORN },
      },
    },
  },
  'Scrub Top': {
    Short: {
      front: {
        female: { id: 'scrub-top-women-short', src: '/garments2d/scrub-top-women-front.webp', w: 335, h: 399, refLum: 140.1, zones: ['body'], source: 'VFRB-supplied flat-lay photo, women V-neck scrub top', limitations: LIMITS },
        male:   { id: 'scrub-top-men-short', src: '/garments2d/scrub-top-men-front.webp', w: 363, h: 422, refLum: 36, gain: 0.45, zones: ['body'], source: 'VFRB-supplied flat-lay photo, men V-neck scrub top', limitations: LIMITS },
      },
    },
  },
};

export function assetFor(garment, sleeve, face = 'front', fit) {
  const byFit = ASSET_2D[garment]?.[sleeve]?.[face];
  if (!byFit) return null;
  // An explicit men's/women's/unisex request never lands on a photo base of another fit (Button-Down unisex keeps the vector template, only Female is the BIR photo); an unspecified fit takes the single base.
  return byFit[fit] ?? ((fit === 'male' || fit === 'female' || fit === 'unisex') ? null : Object.values(byFit)[0]);
}
// Every photo base has an id; a gallery photo and a saved design resolve to the exact base through (garment, sleeve, face, fit), never through the family name alone.
export const assetById = id => { for (const g of Object.values(ASSET_2D)) for (const sl of Object.values(g)) for (const f of Object.values(sl)) for (const a of Object.values(f)) if (a.id === id) return a; return null; };
// Inverse of assetFor: the exact (garment, sleeve, fit) a photo-base templateId stands for, or null. Used to restore a saved design onto the same template.
// Vector (non-photo) templates that carry their own canonical id. Same (garment, sleeve, fit) key shape as ASSET_2D; the 2D shape is the vector path set in garmentPaths.js.
export const VECTOR_TEMPLATES = {
  'Button-Down': { Short: { unisex: { id: 'button-down-work-shirt-short' } } },
  'Polo Shirt': { Short: { male: { id: 'polo-shirt-short-male' }, female: { id: 'polo-shirt-short-female' } } },
};
// Families with no sleeve or fit choice (resolveSleeve/resolveFit return null) have one vector template each.
export const SINGLE_TEMPLATES = { 'Pants': 'pants-trousers', 'Shorts': 'shorts-standard', 'Skirt': 'skirt-pencil' };
export const vectorTemplateId = (garment, sleeve, fit) => VECTOR_TEMPLATES[garment]?.[sleeve]?.[fit]?.id ?? (sleeve == null && fit == null ? SINGLE_TEMPLATES[garment] ?? null : null);
// The canonical templateId for (garment, sleeve, fit): the photo base id, else the vector template id, else null.
export const templateIdFor = (garment, sleeve, fit) => assetFor(garment, sleeve, 'front', fit)?.id ?? vectorTemplateId(garment, sleeve, fit);
export const templateKeyById = id => {
  for (const [garment, g] of Object.entries(ASSET_2D)) for (const [sleeve, sl] of Object.entries(g)) for (const f of Object.values(sl)) for (const [fit, a] of Object.entries(f)) if (a.id === id) return { garment, sleeve, fit };
  for (const [garment, g] of Object.entries(VECTOR_TEMPLATES)) for (const [sleeve, sl] of Object.entries(g)) for (const [fit, a] of Object.entries(sl)) if (a.id === id) return { garment, sleeve, fit };
  for (const [garment, tid] of Object.entries(SINGLE_TEMPLATES)) if (tid === id) return { garment, sleeve: null, fit: null };
  return null;
};
// Only the front is photographed: a photo-based garment has no back view (the vector back would be a different garment).
export const hasBackView = (garment, sleeve, fit) => !assetFor(garment, sleeve, 'front', fit) || !!assetFor(garment, sleeve, 'back', fit);
// Which zones a photo base can recolour, as customer-facing copy.
export const photoZoneNote = asset => asset.trim
  ? 'Real garment photo: body and trim colours are editable. The trim covers the collar band, cuffs, pocket welts and buttons. Patterns are not available.'
  : 'Real garment photo: colour applies to the whole garment. Collar, pocket and patterns are not editable on this base.';
export const hasPhotoBase = (garment, sleeve) => !!assetFor(garment, sleeve);
export const photoFits = garment => Object.keys(Object.values(ASSET_2D[garment] ?? {})[0]?.front ?? {});

const imgCache = new Map();
const tintCache = new Map();

function loadImage(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  }
  return imgCache.get(src);
}

const hexRgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

const isHex = h => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);

// Luminance-preserving recolour: each pixel keeps its brightness relative to the zone's median, so folds, pocket edges and seams survive.
// Below the median the target colour is darkened, above it the colour is lightened toward white.
const shade = (lum, ref, gain, [tr, tg, tb]) => {
  const ratio = 1 + (lum / ref - 1) * gain;
  if (ratio <= 1) return [tr * ratio, tg * ratio, tb * ratio];
  const k = Math.min(1, (ratio - 1) * 0.8);
  return [tr + (255 - tr) * k, tg + (255 - tg) * k, tb + (255 - tb) * k];
};

// `colors` is a hex string (body only) or { body, collar }. `collar` is honoured only for assets that declare a trim zone.
export async function tintedCanvas(asset, colors) {
  const body = typeof colors === 'string' ? colors : colors?.body;
  let trim = asset.trim && typeof colors === 'object' ? colors?.collar : null;
  if (trim && asset.trimUnset && trim.toLowerCase() === asset.trimUnset) trim = null;
  const key = `${asset.src}|${isHex(body) ? body : 'orig'}|${isHex(trim) ? trim : 'orig'}`;
  if (tintCache.has(key)) return tintCache.get(key);
  const img = await loadImage(asset.src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  if (isHex(body) || isHex(trim)) {
    const d = ctx.getImageData(0, 0, c.width, c.height); const px = d.data;
    let maskPx = null;
    if (asset.trim?.mask && isHex(trim)) {
      const m = await loadImage(asset.trim.mask), mc = document.createElement('canvas');
      mc.width = c.width; mc.height = c.height;
      const mx = mc.getContext('2d', { willReadFrequently: true }); mx.drawImage(m, 0, 0, c.width, c.height);
      maskPx = mx.getImageData(0, 0, c.width, c.height).data;
    }
    const bRgb = isHex(body) ? hexRgb(body) : null; const tRgb = isHex(trim) ? hexRgb(trim) : null;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const w = maskPx ? maskPx[i] / 255 : 0; // 1 inside the trim mask
      const orig = [px[i], px[i + 1], px[i + 2]];
      const b = bRgb ? shade(lum, asset.refLum, asset.gain ?? 1, bRgb) : orig;
      const t = tRgb ? shade(lum, asset.trim.refLum, asset.gain ?? 1, tRgb) : orig;
      px[i] = b[0] * (1 - w) + t[0] * w; px[i + 1] = b[1] * (1 - w) + t[1] * w; px[i + 2] = b[2] * (1 - w) + t[2] * w;
    }
    ctx.putImageData(d, 0, 0);
  }
  if (tintCache.size > 24) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
  return c;
}
