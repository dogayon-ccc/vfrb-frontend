// Production package: one 300 DPI transparent PNG per sized print, a production sheet PDF and a plain-text summary, zipped.
// Built from the saved design (the same overlays that are saved and ordered), never from a screenshot of the editor.
import { PRINT_DPI, buildPrintPlan, printFileNames, pxForCm, cmForPx, round1, qualityNote, type FaceMetrics } from './printSpec.ts';
import { makeZip } from './zipStore.ts';
import { buildPrintPdf, DPI_NOTE, type SheetFace, type SheetRow } from './printPdf.ts';
import { renderPrintPng } from './printRender';

export interface PackageInput {
  faces: Array<{ face: 'front' | 'back'; label: string; url: string }>;   // full design faces (transparent PNG data URLs)
  facesJSON: Record<string, any[]>;
  metrics: Record<string, FaceMetrics | null | undefined>;
  sizes: Record<string, unknown>;
  meta: { name: string; garment: string; date: string };
}
export interface PackageResult { zip: Blob; pdf: Blob; files: string[]; exported: number; skipped: string[]; lowRes: string[]; failed: string[] }

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function jpegOnWhite(url: string) {
  const img = await loadImg(url), c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d')!; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
  return { jpeg: Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.9).split(',')[1]), ch => ch.charCodeAt(0)), w: c.width, h: c.height };
}

export async function buildProductionPackage(inp: PackageInput): Promise<PackageResult> {
  const plan = buildPrintPlan(inp.facesJSON, inp.sizes, inp.metrics);
  const failed: string[] = [];
  const rendered: Array<{ item: (typeof plan.ready)[number]; bytes: Uint8Array; w: number; h: number }> = [];
  for (const item of plan.ready) {
    const r = await renderPrintPng(item.json, pxForCm(item.widthCm!));
    if (r) rendered.push({ item, ...r }); else failed.push(item.label);
  }
  // Final height comes from the rendered file (the true bounds, including text measurement), so name, sheet and file agree.
  const sized = rendered.map(r => ({ ...r, item: { ...r.item, widthCm: round1(cmForPx(r.w)), heightCm: round1(cmForPx(r.h)) } }));
  const names = printFileNames(sized.map(s => s.item));
  const rows: SheetRow[] = sized.map((s, i) => ({
    n: i + 1, view: s.item.face === 'front' ? 'Front' : 'Back', item: s.item.label, size: `${s.item.widthCm} x ${s.item.heightCm}`, px: `${s.w} x ${s.h}`,
    position: s.item.placement ? `${s.item.placement.zone} (${s.item.placement.xPct}%, ${s.item.placement.yPct}%)` : 'not measured',
    quality: qualityNote(s.item), low: s.item.quality === 'low' || s.item.quality === 'poor',
  }));
  const sheetFaces: SheetFace[] = [];
  for (const f of inp.faces) {
    const m = inp.metrics[f.face], img = await jpegOnWhite(f.url);
    const boxes = m ? sized.map((s, i) => ({ s, n: i + 1 })).filter(({ s }) => s.item.face === f.face).map(({ s, n }) => ({
      n, cx: s.item.centre.x / m.canvas.w, cy: s.item.centre.y / m.canvas.h, w: s.item.bboxPx.w / m.canvas.w, h: s.item.bboxPx.h / m.canvas.h, angle: s.item.angle })) : [];
    sheetFaces.push({ label: f.label, jpeg: img.jpeg, w: img.w, h: img.h, boxes });
  }
  const skipped = plan.pending.map(p => `${p.face} ${p.label}`);
  const lowRes = sized.filter(s => s.item.quality === 'low' || s.item.quality === 'poor').map(s => `${s.item.label} (${s.item.dpi} DPI)`);
  const notes = [
    'Print sizes were set by the customer in the Studio. Colours on screen are approximate; VFRB confirms fabric, colours and placement before production.',
    DPI_NOTE,
    'Garment measurements are not included. Position is each print\u2019s centre as a share of the drawn garment (x from the left, y from the top) and does not replace VFRB\u2019s own placement confirmation.',
  ];
  const pdfBytes = buildPrintPdf({ title: 'Production print sheet', subtitle: `${inp.meta.name || inp.meta.garment} - ${inp.meta.garment} - ${inp.meta.date}`, notes, skipped }, sheetFaces, rows);
  const summary = [
    `VFRB Enterprise - print files for "${inp.meta.name || inp.meta.garment}" (${inp.meta.garment}), exported ${inp.meta.date}`, '',
    `Format: transparent PNG, ${PRINT_DPI} DPI. Pixel size = print size (cm) / 2.54 x ${PRINT_DPI}.`, '',
    ...sized.map((s, i) => `${names[i]}\n   ${s.item.label} (${s.item.face}) - ${s.item.widthCm} x ${s.item.heightCm} cm - ${s.w} x ${s.h} px - ${qualityNote(s.item)}`),
    ...(skipped.length ? ['', 'Not exported (no print size set): ' + skipped.join(', ')] : []),
    ...(failed.length ? ['', 'Could not be rendered: ' + failed.join(', ')] : []),
    ...(lowRes.length ? ['', 'Low resolution at the chosen size: ' + lowRes.join(', ')] : []),
    '', ...notes,
  ].join('\n');
  const enc = new TextEncoder();
  const files = [...sized.map((s, i) => ({ name: names[i], data: s.bytes })), { name: 'production-sheet.pdf', data: pdfBytes }, { name: 'export-summary.txt', data: enc.encode(summary) }];
  return { zip: new Blob([makeZip(files) as BlobPart], { type: 'application/zip' }), pdf: new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }), files: files.map(f => f.name), exported: sized.length, skipped, lowRes, failed };
}
