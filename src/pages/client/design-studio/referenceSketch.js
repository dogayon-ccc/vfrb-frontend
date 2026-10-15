// "Create a 2D garment from reference": a deterministic read of an uploaded garment photo's silhouette (no AI, no network). It measures
// the garment's outline (leg split, sleeves sticking out of the torso, proportions) and proposes a build-your-own sketch (customGarment.js)
// that the customer confirms or corrects. It is an estimate for a starting sketch, never a pattern: necklines, pockets and construction
// cannot be read from a silhouette, and a busy or cropped photo can be misread, so the customer always confirms the type.
import { CUSTOM_TOP, CUSTOM_BOTTOM, CUSTOM_SKIRT, normalizeCustom } from './customGarment';

export const REF_KINDS = [['top', 'Top'], ['trousers', 'Trousers'], ['skirt', 'Skirt'], ['dress', 'Dress']];
export const KIND_GARMENT = { top: CUSTOM_TOP, dress: CUSTOM_TOP, trousers: CUSTOM_BOTTOM, skirt: CUSTOM_SKIRT };
export const REF_SKETCH_LABEL = '2D sketch generated from reference';
export const REF_SKETCH_NOTE = 'An estimate from the photo\'s outline, not a production pattern: neckline, pockets and the back cannot be read from one flat photo. Check each choice, then refine it.';
export const REF_3D_NOTE = 'No 3D from a photo: one flat image does not show the back, the depth or the real measurements, and VFRB has no converter that makes a valid garment mesh from it. Your sketch is 2D only.';

const clamp01 = v => Math.max(0, Math.min(1, v));

// Foreground mask from RGBA pixels: transparency when the image has it (a background-removed cut), otherwise distance from the border colour.
export function maskFromRgba(px, w, h) {
  const mask = new Uint8Array(w * h);
  let transparent = 0;
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] < 128) transparent++;
  if (transparent > w * h * 0.05) {
    for (let i = 0; i < w * h; i++) mask[i] = px[i * 4 + 3] >= 128 ? 1 : 0;
    return mask;
  }
  let r = 0, g = 0, b = 0, n = 0;
  const add = i => { r += px[i * 4]; g += px[i * 4 + 1]; b += px[i * 4 + 2]; n++; };
  for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
  r /= n; g /= n; b /= n;
  for (let i = 0; i < w * h; i++) {
    const d = Math.hypot(px[i * 4] - r, px[i * 4 + 1] - g, px[i * 4 + 2] - b);
    mask[i] = d > 48 ? 1 : 0;
  }
  return mask;
}

// Row runs of the mask: for each row, its filled spans (ignoring specks narrower than 2% of the width).
function rows(mask, w, h) {
  const out = [], minRun = Math.max(2, Math.round(w * 0.02));
  for (let y = 0; y < h; y++) {
    const spans = [];
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && mask[y * w + x];
      if (on && start < 0) start = x;
      if (!on && start >= 0) { if (x - start >= minRun) spans.push([start, x]); start = -1; }
    }
    out.push(spans);
  }
  return out;
}

// The silhouette's measurements and a proposed kind. Returns null when there is too little garment in the image to read.
export function analyzeSilhouette(mask, w, h) {
  const rs = rows(mask, w, h);
  const filled = rs.map((sp, y) => ({ y, sp })).filter(r => r.sp.length);
  if (filled.length < h * 0.15) return null;
  const y0 = filled[0].y, y1 = filled[filled.length - 1].y, H = y1 - y0 + 1;
  const width = sp => (sp.length ? sp[sp.length - 1][1] - sp[0][0] : 0);
  const at = t => rs[Math.min(y1, y0 + Math.round(t * (H - 1)))];
  const band = (a, b) => { const v = []; for (let t = a; t <= b; t += 0.02) v.push(width(at(t))); return v; };
  const median = v => [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)] ?? 0;
  const maxW = Math.max(...filled.map(r => width(r.sp)));
  // Two legs: most rows in the lowest third are two spans with a real gap between them.
  const low = [];
  for (let t = 0.7; t <= 0.98; t += 0.02) low.push(at(t));
  const split = low.filter(sp => sp.length >= 2 && sp[1][0] - sp[0][1] >= w * 0.02).length / low.length;
  const torso = median(band(0.55, 0.85)), upper = Math.max(...band(0.08, 0.5)), hem = median(band(0.9, 0.98)), top = median(band(0.02, 0.08));
  const sleeveRatio = torso > 0 ? upper / torso : 1;
  // How far down the wide (sleeved) rows reach, as a share of the garment's height.
  let reach = 0;
  for (let t = 0.05; t <= 0.95; t += 0.01) if (width(at(t)) > torso * 1.18) reach = t;
  const aspect = H / Math.max(1, maxW);
  let kind, sure = true;
  if (split > 0.6) kind = 'trousers';
  else if (sleeveRatio > 1.25) kind = aspect > 1.55 ? 'dress' : 'top';
  else if (hem >= top * 1.15 && aspect < 1.35) kind = 'skirt';
  else if (aspect > 1.7) { kind = 'dress'; sure = false; }
  else { kind = 'top'; sure = false; }
  const sleeve = kind === 'top' || kind === 'dress'
    ? (sleeveRatio < 1.12 ? 'Sleeveless' : reach < 0.42 ? 'Short' : reach < 0.66 ? '3/4' : 'Long') : null;
  return { kind, sure, sleeve, aspect: +aspect.toFixed(2), split: +split.toFixed(2), sleeveRatio: +sleeveRatio.toFixed(2), hemRatio: +(torso > 0 ? hem / torso : 1).toFixed(2), reach: +reach.toFixed(2) };
}

// The build-your-own spec the measurements suggest, for the kind the customer confirmed (which may differ from the guess).
export function sketchFromAnalysis(a, kind = a?.kind ?? 'top') {
  const garment = KIND_GARMENT[kind] ?? CUSTOM_TOP;
  const aspect = a?.aspect ?? 1.2;
  if (kind === 'trousers') {
    const jogger = (a?.hemRatio ?? 1) < 0.42;
    return { garment, sleeve: null, custom: normalizeCustom({ style: jogger ? 'jogger' : 'straight', length: Math.round(clamp01((aspect - 0.9) / 1.5) * 100), rise: 50, cuffs: jogger, drawstring: false }, garment) };
  }
  if (kind === 'skirt') return { garment, sleeve: null, custom: normalizeCustom({ length: Math.round(clamp01((aspect - 0.5) / 1.1) * 100) }, garment) };
  const sleeve = a?.sleeve ?? 'Short';
  const length = kind === 'dress' ? 100 : Math.round(clamp01((aspect - 0.85) / 0.7) * 100);
  return { garment, sleeve, custom: normalizeCustom({ neckline: 'round', length, fit: 50, hem: 'straight' }, garment) };
}

// Reads a file into a small RGBA buffer (long side 160 px) and analyses it. Browser only.
export async function analyzeImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('decode')); i.src = url; });
    const k = 160 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return analyzeSilhouette(maskFromRgba(ctx.getImageData(0, 0, w, h).data, w, h), w, h);
  } finally { URL.revokeObjectURL(url); }
}
