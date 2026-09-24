// src/lib/logoBackground.js — logo background removal pipeline for Design Studio.
// Two engines, never a silent fallback:
//   auto -> instant, offline flood-fill of a single solid background colour (typical logos)
//   ai   -> RMBG-1.4 in the browser (lib/bgRemove.js) for photos / complex backgrounds
// processLogo() never throws; it returns { status: 'removed'|'unchanged'|'failed', file, message, code }.
import { removeBackgroundAI } from './bgRemove';

const MAX_SIDE = 2048;
const TOL_LOW = 42;       // RGB distance treated as "the background colour"
const TOL_HIGH = 84;      // ring pixels between LOW and HIGH get a soft alpha (anti-halo)
const SOLID_BORDER = 0.85; // share of border pixels that must match for "solid background"

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toPngFile = (canvas, name) => new Promise((resolve, reject) => {
  canvas.toBlob((b) => (b ? resolve(new File([b], `${name.split('.')[0]}-transparent.png`, { type: 'image/png' })) : reject(new Error('Could not encode PNG'))), 'image/png');
});

const median = (arr) => { const a = Array.from(arr).sort((x, y) => x - y); return a[a.length >> 1]; };

export async function removeSolidBackground(file) {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const px = image.data;

  const border = [];
  for (let x = 0; x < w; x++) { border.push(x, (h - 1) * w + x); }
  for (let y = 1; y < h - 1; y++) { border.push(y * w, y * w + w - 1); }

  const clear = border.filter((i) => px[4 * i + 3] < 16).length;
  if (clear / border.length >= 0.9) return { status: 'transparent', file, w, h };

  const opaque = border.filter((i) => px[4 * i + 3] >= 16);
  const bg = [0, 1, 2].map((c) => median(opaque.map((i) => px[4 * i + c])));
  const dist2 = (i) => {
    const dr = px[4 * i] - bg[0], dg = px[4 * i + 1] - bg[1], db = px[4 * i + 2] - bg[2];
    return dr * dr + dg * dg + db * db;
  };
  const low2 = TOL_LOW * TOL_LOW, high2 = TOL_HIGH * TOL_HIGH;

  const matching = opaque.filter((i) => dist2(i) <= low2).length;
  if (matching / border.length < SOLID_BORDER) return { status: 'no-solid', file, w, h };

  const removed = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0, count = 0;
  for (const i of border) if (!removed[i] && dist2(i) <= low2) { removed[i] = 1; stack[sp++] = i; count++; }
  while (sp) {
    const i = stack[--sp], x = i % w, y = (i - x) / w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const n of nb) if (n >= 0 && !removed[n] && dist2(n) <= low2) { removed[n] = 1; stack[sp++] = n; count++; }
  }

  const removedPct = count / (w * h);
  if (removedPct < 0.005) return { status: 'nothing', file, w, h };
  if (removedPct > 0.97) return { status: 'over-removed', file, w, h };

  for (let i = 0; i < removed.length; i++) {
    if (removed[i]) { px[4 * i + 3] = 0; continue; }
    const x = i % w, y = (i - x) / w;
    const touches = (x > 0 && removed[i - 1]) || (x < w - 1 && removed[i + 1]) || (y > 0 && removed[i - w]) || (y < h - 1 && removed[i + w]);
    if (!touches) continue;
    const d2 = dist2(i);
    if (d2 < high2) px[4 * i + 3] = Math.round(255 * ((Math.sqrt(d2) - TOL_LOW) / (TOL_HIGH - TOL_LOW)));
  }
  ctx.putImageData(image, 0, 0);
  return { status: 'removed', file: await toPngFile(canvas, file.name), w, h, removedPct };
}

const AI_HINT = 'Try AI mode, which handles any background.';

function describeAiError(e) {
  if (e?.code === 'EMPTY_MATTE') return { code: 'EMPTY_MATTE', message: 'The AI could not find a logo in this image. Try a clearer picture, or keep the original.' };
  if (e?.code === 'MODEL_TIMEOUT' || e?.code === 'MATTING_TIMEOUT') return { code: e.code, message: `${e.message} Check your connection and retry.` };
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return {
    code: 'AI_UNAVAILABLE',
    message: offline
      ? 'You appear to be offline. AI mode needs a one-time model download.'
      : "Couldn't load the AI model (blocked or unreachable network). Solid-color removal still works offline.",
  };
}

export async function processLogo(file, { mode = 'auto', onProgress } = {}) {
  try {
    if (mode === 'ai') {
      const out = await removeBackgroundAI(file, { onProgress });
      return { status: 'removed', method: 'ai', file: out, message: 'Background removed with AI.' };
    }
    const r = await removeSolidBackground(file);
    switch (r.status) {
      case 'removed':      return { status: 'removed', method: 'auto', file: r.file, message: 'Background removed instantly (solid color detected).' };
      case 'transparent':  return { status: 'unchanged', method: 'auto', file, message: 'This logo already has a transparent background.' };
      case 'nothing':      return { status: 'unchanged', method: 'auto', file, message: 'No solid background found to remove; the logo was added unchanged.' };
      case 'no-solid':     return { status: 'failed', method: 'auto', file, code: 'NO_SOLID_BG', message: `The background isn't a single solid color. ${AI_HINT}` };
      default:             return { status: 'failed', method: 'auto', file, code: 'OVER_REMOVED', message: `The logo is nearly the same color as its background, so removal would erase it. ${AI_HINT}` };
    }
  } catch (e) {
    const info = mode === 'ai' ? describeAiError(e) : { code: 'DECODE', message: "Couldn't read this image. Try another file." };
    return { status: 'failed', method: mode, file, ...info };
  }
}
