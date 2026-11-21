// Production specification sheet: a small PDF writer (Helvetica, DCT images, vector boxes), no library.
// Page per design face: the garment with each print drawn as a numbered outline. Then a table with every print's size, pixel size,
// position and resolution. Garment measurements are never printed (internal to VFRB); placement is a share of the drawn garment.
import { PRINT_DPI } from './printSpec.ts';

export interface SheetFace { label: string; jpeg: Uint8Array; w: number; h: number; boxes: Array<{ n: number; cx: number; cy: number; w: number; h: number; angle: number }> }  // boxes: fractions of the face image
export interface SheetRow { n: number; view: string; item: string; size: string; px: string; position: string; quality: string; low: boolean }
export interface SheetMeta { title: string; subtitle: string; notes: string[]; skipped: string[] }

const ascii = (s: unknown) => String(s ?? '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, m => '\\' + m);
const W = 842, H = 595, M = 36;
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '.' : s);

export function buildPrintPdf(meta: SheetMeta, faces: SheetFace[], rows: SheetRow[]): Uint8Array {
  const enc = new TextEncoder();
  const T = (x: number, y: number, size: number, str: string, bold = false, rgb = '0.1 0.13 0.16') => `${rgb} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${ascii(str)}) Tj ET`;
  const head = (page: string) => [T(M, H - M - 8, 17, 'VFRB Enterprise - Production print sheet', true), T(M, H - M - 26, 9, meta.subtitle), T(W - M - 90, H - M - 8, 9, page)];
  const foot = T(M, M - 14, 7.5, meta.notes[0] ?? '', false, '0.4 0.45 0.5');
  const pages: { content: string; images: number[] }[] = [];

  faces.forEach((f, fi) => {
    const area = { x: M, y: M + 6, w: W - 2 * M, h: H - 2 * M - 52 };
    const k = Math.min(area.w / f.w, area.h / f.h), iw = f.w * k, ih = f.h * k, ix = area.x + (area.w - iw) / 2, iy = area.y + (area.h - ih) / 2;
    const out = [...head(`${f.label} view`), `q ${iw.toFixed(2)} 0 0 ${ih.toFixed(2)} ${ix.toFixed(2)} ${iy.toFixed(2)} cm /Im${fi + 1} Do Q`];
    for (const b of f.boxes) {
      const cx = ix + b.cx * iw, cy = iy + (1 - b.cy) * ih, bw = b.w * iw, bh = b.h * ih, a = (-b.angle * Math.PI) / 180;
      out.push(`q 0.86 0.15 0.15 RG 0.8 w [3 2] 0 d ${Math.cos(a).toFixed(4)} ${Math.sin(a).toFixed(4)} ${(-Math.sin(a)).toFixed(4)} ${Math.cos(a).toFixed(4)} ${cx.toFixed(2)} ${cy.toFixed(2)} cm ${(-bw / 2).toFixed(2)} ${(-bh / 2).toFixed(2)} ${bw.toFixed(2)} ${bh.toFixed(2)} re S Q`);
      out.push(`q 0.86 0.15 0.15 rg ${(cx - bw / 2 - 1).toFixed(1)} ${(cy + bh / 2 + 1).toFixed(1)} 11 11 re f Q`, `1 1 1 rg BT /F2 7.5 Tf ${(cx - bw / 2 + 1.5).toFixed(1)} ${(cy + bh / 2 + 3.5).toFixed(1)} Td (${b.n}) Tj ET`);
    }
    out.push(foot);
    pages.push({ content: out.join('\n'), images: [fi + 1] });
  });

  const PER = 24, cols = [M, M + 22, M + 70, M + 230, M + 330, M + 420, M + 540];
  const tableCount = Math.max(1, Math.ceil(rows.length / PER));
  for (let p = 0; p < tableCount; p++) {
    const out = [...head(`Prints ${p + 1}/${tableCount}`)];
    let y = H - M - 56;
    ['#', 'View', 'Item', 'Print size (cm)', 'File pixels', 'Position on garment', 'Resolution'].forEach((h, i) => out.push(T(cols[i], y, 8, h, true, '0.2 0.3 0.35')));
    out.push(`0.7 0.75 0.78 RG 0.5 w ${M} ${y - 4} m ${W - M} ${y - 4} l S`);
    y -= 18;
    for (const r of rows.slice(p * PER, (p + 1) * PER)) {
      const cells = [String(r.n), r.view, clip(r.item, 30), r.size, r.px, clip(r.position, 22), clip(r.quality, 40)];
      cells.forEach((c, i) => out.push(T(cols[i], y, 8.5, c, i === 0, i === 6 && r.low ? '0.75 0.1 0.1' : '0.1 0.13 0.16')));
      y -= 15.5;
    }
    if (p === tableCount - 1) {
      y -= 8;
      const lines = [...meta.notes.slice(1), ...(meta.skipped.length ? [`Not exported (no print size set): ${meta.skipped.join(', ')}`] : [])];
      for (const n of lines) { for (const part of n.match(/.{1,150}(\s|$)|\S+/g) ?? []) { out.push(T(M, y, 8, part.trim(), false, '0.3 0.35 0.4')); y -= 11; } y -= 3; }
    }
    out.push(foot);
    pages.push({ content: out.join('\n'), images: [] });
  }

  // Objects: 1 catalog, 2 pages, 3 F1, 4 F2, then images, then (page, content) pairs.
  const imgBase = 5, pageBase = imgBase + faces.length;
  const objs: Array<string | { head: string; body: Uint8Array }> = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageBase + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ...faces.map(f => ({ head: `<< /Type /XObject /Subtype /Image /Width ${f.w} /Height ${f.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${f.jpeg.length} >>`, body: f.jpeg })),
  ];
  pages.forEach((pg, i) => {
    const xo = pg.images.map(n => `/Im${n} ${imgBase + n - 1} 0 R`).join(' ');
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> /Contents ${pageBase + i * 2 + 1} 0 R >>`);
    const body = enc.encode(pg.content);
    objs.push({ head: `<< /Length ${body.length} >>`, body });
  });

  const parts: Uint8Array[] = [enc.encode('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')];
  let size = parts[0].length;
  const offsets: number[] = [];
  objs.forEach((o, n) => {
    offsets.push(size);
    const chunk = typeof o === 'string' ? [enc.encode(`${n + 1} 0 obj\n${o}\nendobj\n`)] : [enc.encode(`${n + 1} 0 obj\n${o.head}\nstream\n`), o.body, enc.encode('\nendstream\nendobj\n')];
    chunk.forEach(c => { parts.push(c); size += c.length; });
  });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`;
  parts.push(enc.encode(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${size}\n%%EOF\n`));
  const out = new Uint8Array(parts.reduce((s, c) => s + c.length, 0));
  let p = 0; for (const c of parts) { out.set(c, p); p += c.length; }
  return out;
}

export const DPI_NOTE = `All print files are PNG with transparent backgrounds, rendered at ${PRINT_DPI} DPI at the sizes listed.`;
