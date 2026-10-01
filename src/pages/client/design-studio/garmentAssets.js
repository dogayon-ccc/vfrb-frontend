// Photo-based 2D bases, keyed garment > sleeve > face > fit. Anything not listed keeps the vector template.
// `zones` lists the colour zones the photo supports. `gain` (default 1) compresses tone for dark sources so recolouring stays smooth.
// Add an entry only after tools/make-base-asset.py cut it and the edge was checked on a contrasting background.
const LIMITS = ['Front view only. The back view uses the generic shape.', 'One colour zone: collar, pocket and trim are not coloured separately.', 'No patterns on a photo base.'];

export const ASSET_2D = {
  'Scrub Top': {
    Short: {
      front: {
        female: { src: '/garments2d/scrub-top-women-front.webp', w: 335, h: 399, refLum: 140.1, zones: ['body'], source: 'VFRB-supplied flat-lay photo, women V-neck scrub top', limitations: LIMITS },
        male:   { src: '/garments2d/scrub-top-men-front.webp', w: 363, h: 422, refLum: 36, gain: 0.45, zones: ['body'], source: 'VFRB-supplied flat-lay photo, men V-neck scrub top', limitations: LIMITS },
      },
    },
  },
};

export function assetFor(garment, sleeve, face = 'front', fit) {
  const byFit = ASSET_2D[garment]?.[sleeve]?.[face];
  return byFit ? (byFit[fit] ?? Object.values(byFit)[0]) : null;
}
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

// Luminance-preserving recolour: each pixel keeps its brightness relative to the garment's median, so folds, pocket edges and seams survive.
// Below the median the target colour is darkened, above it the colour is lightened toward white.
export async function tintedCanvas(asset, hex) {
  const key = `${asset.src}|${hex ?? 'orig'}`;
  if (tintCache.has(key)) return tintCache.get(key);
  const img = await loadImage(asset.src);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  if (hex && /^#[0-9a-f]{6}$/i.test(hex)) {
    const d = ctx.getImageData(0, 0, c.width, c.height); const px = d.data; const [tr, tg, tb] = hexRgb(hex);
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const ratio = 1 + ((0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / asset.refLum - 1) * (asset.gain ?? 1);
      if (ratio <= 1) { px[i] = tr * ratio; px[i + 1] = tg * ratio; px[i + 2] = tb * ratio; }
      else { const k = Math.min(1, (ratio - 1) * 0.8); px[i] = tr + (255 - tr) * k; px[i + 1] = tg + (255 - tg) * k; px[i + 2] = tb + (255 - tb) * k; }
    }
    ctx.putImageData(d, 0, 0);
  }
  if (tintCache.size > 24) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
  return c;
}
