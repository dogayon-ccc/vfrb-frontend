// Photo-based 2D bases. A garment/sleeve/face listed here renders a real cut-out photo recoloured through its alpha mask; anything not listed
// keeps the vector template. `zones` is the list of colour zones the photo can really support (a single-colour photo has only 'body').
// Add an entry only after tools/make-base-asset.py produced the cut-out and the edge was checked on a contrasting background.
export const ASSET_2D = {
  'Scrub Top': {
    Short: {
      front: {
        src: '/garments2d/scrub-top-women-front.webp', w: 335, h: 399, refLum: 140.1, zones: ['body'],
        source: 'VFRB-supplied flat-lay photo (scrub_suit_women_v-neck.png), top cropped',
        limitations: ['Front view only. The back view uses the generic shape.', 'One colour zone: collar, pocket and trim are not coloured separately.', 'No patterns on a photo base.'],
      },
    },
  },
};

export const assetFor = (garment, sleeve, face = 'front') => ASSET_2D[garment]?.[sleeve]?.[face] ?? null;
export const hasPhotoBase = (garment, sleeve) => !!ASSET_2D[garment]?.[sleeve]?.front;

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
      const ratio = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / asset.refLum;
      if (ratio <= 1) { px[i] = tr * ratio; px[i + 1] = tg * ratio; px[i + 2] = tb * ratio; }
      else { const k = Math.min(1, (ratio - 1) * 0.8); px[i] = tr + (255 - tr) * k; px[i + 1] = tg + (255 - tg) * k; px[i + 2] = tb + (255 - tb) * k; }
    }
    ctx.putImageData(d, 0, 0);
  }
  if (tintCache.size > 24) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
  return c;
}
