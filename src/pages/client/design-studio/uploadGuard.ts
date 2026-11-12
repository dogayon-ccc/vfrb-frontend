// Upload guard for "Upload my design" and logos: the 5 MB cap, the real type read from the file's bytes (never trusted from its name
// or MIME), SVG turned into a PNG (an SVG is only ever decoded as an <img>, where scripts and external loads never run, and only the
// raster is placed or sent), a minimum pixel size, and the original file kept alongside whatever is placed.
import { sniffKind, KIND_MIME as MIME } from '../../../utils/fileCheck';

export const MAX_BYTES = 5 * 1024 * 1024;
export const MIN_SIDE = { logo: 120, artwork: 200 }; // shortest side in px for a sharp print at its placed size
const SVG_LONG_SIDE = 1600; // an SVG is rasterised at this long side
export const PLACE_LONG_SIDE = { logo: 1024, artwork: 1600 }; // placed images are stored inside the saved design JSON
const PLACE_BUDGET = 900 * 1024; // per image, so a two-sided design stays well under the server's request limit

// The file's real kind from its first bytes: png | jpg | webp | svg, or null (a PDF is not an image here).
export function sniffBytes(b, text = '') {
  const kind = sniffKind(b);
  if (kind) return kind === 'pdf' ? null : kind;
  // SVG: optional BOM, XML prolog, comments and doctype, then an <svg> root.
  if (/^﻿?\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return 'svg';
  return null;
}
export async function sniffFile(file) {
  const head = await file.slice(0, 2048).arrayBuffer();
  return sniffBytes(new Uint8Array(head), new TextDecoder().decode(head));
}

// Pixel size an SVG should be drawn at: its width/height or viewBox ratio, scaled so the long side is SVG_LONG_SIDE.
export function svgDrawSize(text) {
  const tag = (text.match(/<svg[^>]*>/i) ?? [''])[0];
  const num = n => { const m = tag.match(new RegExp(`\\s${n}\\s*=\\s*["']\\s*([\\d.]+)`, 'i')); return m ? +m[1] : 0; };
  const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  let w = num('width'), h = num('height');
  if (!(w > 0 && h > 0) && vb) { w = +vb[1]; h = +vb[2]; }
  if (!(w > 0 && h > 0)) { w = 1; h = 1; }
  const k = SVG_LONG_SIDE / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

const decode = src => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('decode')); i.src = src; });
const toBlob = (canvas, type, q) => new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), type, q));
const baseName = n => (n || 'design').replace(/\.[^.]+$/, '');

// Validates and prepares an upload. Resolves to { ok: true, kind, original, file, w, h } where `file` is what gets placed (a PNG for
// an SVG, otherwise the original) and `original` is the untouched upload; or { ok: false, code, message }.
export async function prepareUpload(file, purpose = 'artwork') {
  if (!file) return { ok: false, code: 'EMPTY', message: 'No file was chosen.' };
  if (file.size > MAX_BYTES) return { ok: false, code: 'SIZE', message: 'That file is over 5 MB. Choose a smaller one.' };
  let kind;
  try { kind = await sniffFile(file); } catch { return { ok: false, code: 'READ', message: 'Could not read that file. Choose another one.' }; }
  if (!kind) return { ok: false, code: 'TYPE', message: 'That file is not a PNG, JPG, WEBP or SVG image, whatever its name says. Choose an image file.' };
  const min = MIN_SIDE[purpose] ?? MIN_SIDE.artwork;
  if (kind === 'svg') {
    const text = await file.text();
    const { w, h } = svgDrawSize(text);
    const url = URL.createObjectURL(new Blob([text], { type: MIME.svg }));
    try {
      const img = await decode(url); // image context: no scripts, no external loads
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const png = new File([await toBlob(c, 'image/png')], `${baseName(file.name)}.png`, { type: 'image/png' });
      return { ok: true, kind, original: file, file: png, w, h, rasterised: true };
    } catch { return { ok: false, code: 'DECODE', message: 'This SVG could not be drawn. Export it as a PNG and try again.' }; }
    finally { URL.revokeObjectURL(url); }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await decode(url);
    const w = img.naturalWidth, h = img.naturalHeight;
    if (Math.min(w, h) < min) return { ok: false, code: 'SMALL', message: `This image is only ${w} × ${h} px. Use one at least ${min} px on its shortest side so it prints sharply.` };
    const typed = file.type === MIME[kind] ? file : new File([file], file.name, { type: MIME[kind] }); // the bytes decide the type
    return { ok: true, kind, original: file, file: typed, w, h, rasterised: false };
  } catch { return { ok: false, code: 'DECODE', message: "Couldn't read this image. It may be damaged; try another file." }; }
  finally { URL.revokeObjectURL(url); }
}

// A reference photo for the order's existing reference-file field, which accepts JPG or PNG up to 5 MB: JPG/PNG originals go as they
// are; WEBP and rasterised SVG go as PNG, or JPG when the PNG would pass 5 MB.
export async function referenceFile(prep) {
  if (prep.kind === 'jpg' || prep.kind === 'png') return prep.original;
  const url = URL.createObjectURL(prep.file);
  try {
    const img = await decode(url);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    let blob = await toBlob(c, 'image/png');
    if (blob.size <= MAX_BYTES) return new File([blob], `${baseName(prep.original.name)}.png`, { type: 'image/png' });
    ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    blob = await toBlob(c, 'image/jpeg', 0.9);
    return new File([blob], `${baseName(prep.original.name)}.jpg`, { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}

// Scale for an image of w × h so its long side is at most `long`: 1 when it already fits.
export const fitScale = (w, h, long) => Math.min(1, long / Math.max(w, h, 1));

// The image as it is stored in the design: at most PLACE_LONG_SIDE and PLACE_BUDGET, transparency kept. A file that already fits is
// returned untouched; otherwise PNG, then WEBP, then a smaller size until it fits.
export async function fitForCanvas(file, purpose = 'logo') {
  const url = URL.createObjectURL(file);
  try {
    const img = await decode(url);
    let k = fitScale(img.naturalWidth, img.naturalHeight, PLACE_LONG_SIDE[purpose] ?? PLACE_LONG_SIDE.logo);
    if (k === 1 && file.size <= PLACE_BUDGET) return file;
    for (let pass = 0; pass < 4; pass++, k *= 0.75) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      for (const [type, q] of [['image/png'], ['image/webp', 0.9]]) {
        const blob = await toBlob(c, type, q);
        if (blob.size <= PLACE_BUDGET) return new File([blob], `${baseName(file.name)}.${blob.type === 'image/webp' ? 'webp' : 'png'}`, { type: blob.type });
      }
    }
    return file; // a pathological image: placed as it is rather than refused
  } finally { URL.revokeObjectURL(url); }
}
