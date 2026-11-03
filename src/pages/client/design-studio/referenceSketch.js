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
// Gate A: the customer vouches for what no outline can prove (no person or mannequin in the photo).
export const REF_UNIFORM_CONFIRM = 'This photo shows only the uniform, with no person or mannequin, and the full set from top to bottom: a top with trousers or a skirt, or a full-length dress.';
// Gate B: the outline itself must read as a full set.
export const REF_NOT_FULL_SET = 'This photo does not read as a full uniform set, so no sketch was made. Upload one photo of the whole set on a plain background (a top with trousers or a skirt, or a full-length dress), with no person or mannequin. A single piece can still be traced over or built with Build your own.';

const clamp01 = v => Math.max(0, Math.min(1, v));
const SET_MIN_ASPECT = 1.6; // a full set (or full-length dress) is at least 1.6 times as tall as its widest row
const SLEEVED = 1.12; // upper rows this much wider than the torso: sleeves or a top over the legs
const TOP_SHARE = 0.45; // in a two-piece set photo the top takes about the upper 45% of the outline
const sleeveOf = (ratio, reach) => (ratio < SLEEVED ? 'Sleeveless' : reach < 0.42 ? 'Short' : reach < 0.66 ? '3/4' : 'Long');

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
  const sleeve = kind === 'top' || kind === 'dress' ? sleeveOf(sleeveRatio, reach) : null;
  return { kind, sure, sleeve, aspect: +aspect.toFixed(2), split: +split.toFixed(2), sleeveRatio: +sleeveRatio.toFixed(2), hemRatio: +(torso > 0 ? hem / torso : 1).toFixed(2), reach: +reach.toFixed(2) };
}

// Full-set gate on the measurements: 'two-piece' (sleeved top over a leg split), 'dress' (full length, no split: a dress or a top
// over a long skirt), or null for a single piece, a short outline or one that could not be read.
export function fullSetOf(a) {
  if (!a || !(a.aspect >= SET_MIN_ASPECT)) return null;
  if (a.split > 0.6) return a.sleeveRatio > SLEEVED ? 'two-piece' : null; // trousers alone have no top over them
  // A dress shows sleeves or a flared hem; a straight tube that narrows at the hem is a long shirt hanging alone.
  return a.sleeveRatio >= SLEEVED || a.hemRatio >= 1.15 ? 'dress' : null;
}
const PROFILE_LEG = 3; // a separate piece over 3x as tall as wide is a trouser leg seen side-on (no top or dress is that narrow)
const isBottom = a => a.kind === 'trousers' || a.kind === 'skirt' || a.aspect >= PROFILE_LEG;

// The accepted set's analysis: a two-piece starts as its top, measured on the top's own share of the outline.
export function setAnalysis(a) {
  const set = fullSetOf(a);
  if (!set) return null;
  return set === 'dress' ? { ...a, set, kind: 'dress', sure: true, sleeve: sleeveOf(a.sleeveRatio, a.reach) }
    : { ...a, set, kind: 'top', sure: true, sleeve: sleeveOf(a.sleeveRatio, a.reach / TOP_SHARE) };
}

// Separate pieces of the mask (a flat-lay set shows them side by side): 4-connected regions over 8% of the filled area, each cut
// to its own box, largest first.
export function piecesOf(mask, w, h) {
  const label = new Int32Array(w * h), regions = [];
  let total = 0;
  for (let i = 0; i < w * h; i++) total += mask[i];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s]) continue;
    const id = regions.length + 1, stack = [s], px = [];
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    label[s] = id;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      px.push(i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && mask[j] && !label[j]) { label[j] = id; stack.push(j); }
      }
    }
    regions.push({ px, x0, y0, x1, y1 });
  }
  return regions.filter(r => r.px.length >= total * 0.08).sort((a, b) => b.px.length - a.px.length).map(r => {
    const pw = r.x1 - r.x0 + 1, ph = r.y1 - r.y0 + 1, m = new Uint8Array(pw * ph);
    for (const i of r.px) { const x = i % w, y = (i - x) / w; m[(y - r.y0) * pw + (x - r.x0)] = 1; }
    return { mask: m, w: pw, h: ph };
  });
}

// Full-set read of a whole photo: separate pieces need a top and a bottom (trousers or skirt) among them; one piece must read as
// a stacked set or a full-length dress. Returns the set analysis (the top first, the bottom kept for its own sketch) or null.
export function readFullSet(mask, w, h) {
  const pieces = piecesOf(mask, w, h);
  if (pieces.length < 2) return setAnalysis(analyzeSilhouette(mask, w, h));
  const read = pieces.map(p => analyzeSilhouette(p.mask, p.w, p.h)).filter(Boolean);
  const bottom = read.find(isBottom), top = read.find(a => a !== bottom && !isBottom(a));
  if (!top || !bottom) return null;
  const b = bottom.kind === 'skirt' ? bottom : { ...bottom, kind: 'trousers' };
  return { ...top, set: 'pieces', kind: 'top', sure: true, sleeve: sleeveOf(top.sleeveRatio, top.reach), bottom: b };
}

// The build-your-own spec the measurements suggest, for the kind the customer confirmed (which may differ from the guess).
export function sketchFromAnalysis(a, kind = a?.kind ?? 'top') {
  if (a?.bottom && (kind === 'trousers' || kind === 'skirt')) a = a.bottom; // a flat-lay set's bottom is measured on its own
  const garment = KIND_GARMENT[kind] ?? CUSTOM_TOP;
  const aspect = a?.set === 'two-piece' && kind === 'top' ? a.aspect * TOP_SHARE : a?.aspect ?? 1.2;
  if (kind === 'trousers') {
    const jogger = (a?.hemRatio ?? 1) < 0.42;
    return { garment, sleeve: null, custom: normalizeCustom({ style: jogger ? 'jogger' : 'straight', length: Math.round(clamp01((aspect - 0.9) / 1.5) * 100), rise: 50, cuffs: jogger, drawstring: false }, garment) };
  }
  if (kind === 'skirt') return { garment, sleeve: null, custom: normalizeCustom({ length: Math.round(clamp01((aspect - 0.5) / 1.1) * 100) }, garment) };
  const sleeve = a?.sleeve ?? 'Short';
  const length = kind === 'dress' ? 100 : Math.round(clamp01((aspect - 0.85) / 0.7) * 100);
  return { garment, sleeve, custom: normalizeCustom({ neckline: 'round', length, fit: 50, hem: 'straight' }, garment) };
}

// Reads a file into a small RGBA buffer (long side 160 px) and returns its full-set analysis, or null. Browser only.
export async function analyzeImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('decode')); i.src = url; });
    const k = 160 / Math.max(img.naturalWidth, img.naturalHeight), w = Math.max(8, Math.round(img.naturalWidth * k)), h = Math.max(8, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return readFullSet(maskFromRgba(ctx.getImageData(0, 0, w, h).data, w, h), w, h);
  } finally { URL.revokeObjectURL(url); }
}
