// Downloadable files built from the rendered design faces (useGarmentCanvas.exportFace), never from a page screenshot.
// PNG: faces side by side on a transparent background, each EXPORT_FACE_HEIGHT px tall.
// PDF: one A4 landscape spec sheet (JPEG on white + the design's real settings), written without a PDF library.

export const EXPORT_FACE_HEIGHT = 1600;
const GAP = 120;
const LABEL_H = 90;

const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// faces: [{ label, url }]. withLabels draws "Front"/"Back" under each face (PDF only; the PNG stays a clean asset).
export async function composeFaces(faces, { background = null, withLabels = false } = {}) {
  const imgs = await Promise.all(faces.map(f => load(f.url)));
  // Every face is drawn at exactly EXPORT_FACE_HEIGHT (canvas rounding can leave a render a pixel short).
  const widths = imgs.map(i => Math.round(i.naturalWidth * EXPORT_FACE_HEIGHT / i.naturalHeight));
  const h = EXPORT_FACE_HEIGHT + (withLabels ? LABEL_H : 0);
  const w = widths.reduce((s, x) => s + x, 0) + GAP * (imgs.length - 1);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (background) { x.fillStyle = background; x.fillRect(0, 0, w, h); }
  let left = 0;
  imgs.forEach((img, n) => {
    x.drawImage(img, left, 0, widths[n], EXPORT_FACE_HEIGHT);
    if (withLabels) {
      x.fillStyle = '#334155'; x.font = '600 44px Helvetica, Arial, sans-serif'; x.textAlign = 'center';
      x.fillText(faces[n].label, left + widths[n] / 2, h - LABEL_H / 3);
    }
    left += widths[n] + GAP;
  });
  return c;
}

export async function designPng(faces) {
  return (await composeFaces(faces)).toDataURL('image/png');
}

// ── Minimal PDF writer: Catalog, Pages, Page, Helvetica, one DCT (JPEG) image, one content stream. ──
const ascii = s => String(s ?? '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, m => '\\' + m);
const A4_LANDSCAPE = [842, 595];

export async function designPdf(faces, meta) {
  const sheet = await composeFaces(faces, { background: '#ffffff', withLabels: true });
  const jpeg = Uint8Array.from(atob(sheet.toDataURL('image/jpeg', 0.92).split(',')[1]), ch => ch.charCodeAt(0));
  const [W, H] = A4_LANDSCAPE, M = 36, side = 210;
  const box = { x: M, y: M + 24, w: W - 2 * M - side - 16, h: H - 2 * M - 84 };
  const k = Math.min(box.w / sheet.width, box.h / sheet.height);
  const iw = sheet.width * k, ih = sheet.height * k;
  const ix = box.x + (box.w - iw) / 2, iy = box.y + (box.h - ih) / 2;

  const text = (x, y, size, str, bold = false) => `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${ascii(str)}) Tj ET`;
  const lines = [
    'q 0.94 0.96 0.97 rg ' + `${(W - M - side).toFixed(1)} ${M + 24} ${side} ${H - 2 * M - 84} re f Q`,
    text(M, H - M - 16, 18, 'VFRB Enterprise - Design Sheet', true),
    text(M, H - M - 36, 10, `${meta.name || meta.garment} - exported ${meta.date}`),
    `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${ix.toFixed(2)} ${iy.toFixed(2)} cm /Im1 Do Q`,
  ];
  let ty = H - M - 84 - 6;
  const sx = W - M - side + 12;
  for (const [label, value] of meta.rows) {
    lines.push(text(sx, ty, 8, label.toUpperCase(), true)); ty -= 12;
    for (const part of String(value ?? '-').match(/.{1,34}(\s|$)|\S+/g) ?? ['-']) { lines.push(text(sx, ty, 10, part.trim())); ty -= 13; }
    ty -= 6;
  }
  lines.push(text(M, M, 8, 'Screen and print colours are approximate. VFRB confirms fabric colours and placement before production.'));
  const content = lines.join('\n');

  const enc = new TextEncoder();
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    { head: `<< /Type /XObject /Subtype /Image /Width ${sheet.width} /Height ${sheet.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, body: jpeg },
    { head: `<< /Length ${enc.encode(content).length} >>`, body: enc.encode(content) },
  ];
  const parts = [enc.encode('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')];
  let size = parts[0].length;
  const offsets = [];
  objs.forEach((o, n) => {
    offsets.push(size);
    const chunk = typeof o === 'string'
      ? [enc.encode(`${n + 1} 0 obj\n${o}\nendobj\n`)]
      : [enc.encode(`${n + 1} 0 obj\n${o.head}\nstream\n`), o.body, enc.encode('\nendstream\nendobj\n')];
    chunk.forEach(c => { parts.push(c); size += c.length; });
  });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  parts.push(enc.encode(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`));
  return new Blob(parts, { type: 'application/pdf' });
}

export function downloadBlobOrUrl(data, filename) {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(url), 30000);
}
