// Run: node --experimental-strip-types tools/print-export-checks.mjs [outDir]
// Pure production-export logic: print sizes -> 300 DPI pixels, resolution flags, placement, file names, ZIP and PDF writers.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pxForCm, cmForPx, parsePrintWidth, buildPrintPlan, printFileNames, kindOf, zoneLabel, qualityNote } from '../src/pages/client/design-studio/print/printSpec.ts';
import { makeZip, crc32, pngWithDpi } from '../src/pages/client/design-studio/print/zipStore.ts';
import { buildPrintPdf } from '../src/pages/client/design-studio/print/printPdf.ts';

import { deflateSync } from 'node:zlib';
import { remapBox, remapOverlays } from '../src/pages/client/design-studio/overlayRemap.ts';
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const logo = { type: 'Image', __logo: true, __artwork: true, __layerId: 'L1', __layerName: 'Left chest logo', src: 'data:image/png;base64,AAAA', width: 600, height: 300, scaleX: 0.5, scaleY: 0.5, left: 200, top: 150, originX: 'center', originY: 'center', angle: 0 };
const text = { type: 'Textbox', __text: true, __layerId: 'T1', text: 'GRADE 10 - ROSE', width: 400, height: 60, scaleX: 1, scaleY: 1, left: 100, top: 400, originX: 'left', originY: 'top' };
const pocket = { type: 'Group', __pocket: true, __layerId: 'P1' };
const hidden = { ...logo, __layerId: 'H1', visible: false };
const metrics = { front: { canvas: { w: 400, h: 800 }, box: { left: 50, top: 100, width: 300, height: 600 } } };

t('stroke width is part of the printed size, so dialog height equals the rendered height', () => {
  const hl = { type: 'Path', __draw: true, __layerId: 'D1', width: 100, height: 40, scaleX: 1, scaleY: 1, stroke: '#0f0', strokeWidth: 20, left: 0, top: 0 };
  const it = buildPrintPlan({ front: [hl] }, { D1: 6 }, metrics).items[0];
  assert.equal(it.bboxPx.w, 120); assert.equal(it.bboxPx.h, 60); assert.equal(it.heightCm, 3); // 6 cm * 60/120
});
t('PNG gets a valid pHYs chunk of 300 DPI (11811 px/m)', () => {
  const crc = b => crc32(b), ch = (ty, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(ty, 4, 'latin1'); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ihdr), ch('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 0]))), ch('IEND', Buffer.alloc(0))]);
  const o = Buffer.from(pngWithDpi(new Uint8Array(png), 300));
  assert.equal(o.subarray(37, 41).toString(), 'pHYs'); assert.equal(o.readUInt32BE(41), 11811); assert.equal(o.readUInt32BE(45), 11811);
  assert.equal(o.readUInt32BE(50), crc32(new Uint8Array(o.subarray(37, 50)))); assert.equal(o.length, png.length + 21);
});
t('garment switch keeps the share of the artboard and never stretches artwork', () => {
  const r = remapBox({ left: 180, top: 235, scaleX: 1, scaleY: 1 }, { w: 360, h: 470 }, { w: 320, h: 380 });
  assert.equal(r.left, 160); assert.equal(r.top, 190); assert.equal(r.scaleX, 380 / 470); assert.equal(r.scaleX, r.scaleY); // the smaller ratio
  assert.deepEqual(remapBox({}, { w: 100, h: 100 }, { w: 100, h: 100 }), { left: 0, top: 0, scaleX: 1, scaleY: 1 });
});
t('remapOverlays moves artwork but not the garment base or hover glow', () => {
  const mk = p => ({ left: 100, top: 100, scaleX: 1, scaleY: 1, ...p, set(v) { Object.assign(this, v); }, setCoords() {} });
  const objs = [mk({ __garmentBase: true }), mk({ __hoverGlow: true }), mk({ __logo: true })];
  assert.equal(remapOverlays({ getObjects: () => objs }, { w: 400, h: 400 }, { w: 200, h: 400 }), 1);
  assert.equal(objs[0].left, 100); assert.equal(objs[1].left, 100); assert.equal(objs[2].left, 50); assert.equal(objs[2].scaleX, 0.5);
  assert.equal(remapOverlays({ getObjects: () => objs }, { w: 200, h: 400 }, { w: 200, h: 400 }), 0);
});
t('2.54 cm is exactly 300 px; 8 cm is 945 px', () => { assert.equal(pxForCm(2.54), 300); assert.equal(pxForCm(8), 945); });
t('px and cm convert back within a pixel', () => assert.ok(Math.abs(cmForPx(pxForCm(12.7)) - 12.7) < 0.01));
t('print width accepts a comma decimal and rejects junk and out-of-range sizes', () => {
  assert.equal(parsePrintWidth('8,5'), 8.5); assert.equal(parsePrintWidth(' 10 '), 10);
  for (const bad of ['', 'abc', 0, 0.2, 51, -4, null, undefined, NaN]) assert.equal(parsePrintWidth(bad), null);
});
t('only real prints count: pockets, hidden and garment parts are skipped', () => {
  assert.equal(kindOf(logo), 'image'); assert.equal(kindOf(text), 'text');
  assert.equal(kindOf(pocket), null); assert.equal(kindOf(hidden), null); assert.equal(kindOf({ __garmentBase: true }), null);
});
t('an item with no entered size is pending, never guessed', () => {
  const p = buildPrintPlan({ front: [logo, text, pocket] }, {}, metrics);
  assert.equal(p.items.length, 2); assert.equal(p.ready.length, 0); assert.equal(p.pending.length, 2);
  assert.ok(p.items.every(i => i.widthCm === null && i.heightCm === null && i.quality === 'unsized'));
});
t('height follows the artwork aspect ratio of what is drawn', () => {
  const p = buildPrintPlan({ front: [logo] }, { L1: 10 }, metrics);
  assert.equal(p.items[0].widthCm, 10); assert.equal(p.items[0].heightCm, 5); // 300x150 drawn => 2:1
});
t('effective DPI uses the source pixels over the print width', () => {
  // 600 source px over 10 cm (3.937 in) = 152 DPI -> low; over 5 cm = 305 DPI -> ok; over 25 cm = 61 -> poor
  assert.deepEqual(['L1'].map(() => buildPrintPlan({ front: [logo] }, { L1: 10 }, metrics).items[0]).map(i => [i.dpi, i.quality]), [[152, 'low']]);
  const q = w => buildPrintPlan({ front: [logo] }, { L1: w }, metrics).items[0];
  assert.deepEqual([q(5).dpi, q(5).quality], [305, 'ok']); assert.deepEqual([q(25).dpi, q(25).quality], [61, 'poor']);
  assert.match(qualityNote(q(25)), /Very low resolution/); assert.match(qualityNote(q(10)), /Below 300/);
});
t('text and SVG are vector: no resolution warning at any size', () => {
  const svg = { ...logo, __layerId: 'S1', src: 'data:image/svg+xml;base64,AAAA' };
  const p = buildPrintPlan({ front: [text, svg] }, { T1: 30, S1: 40 }, metrics);
  assert.deepEqual(p.items.map(i => [i.quality, i.dpi]), [['vector', null], ['vector', null]]);
});
t('placement is a share of the drawn garment, with a plain zone name', () => {
  const p = buildPrintPlan({ front: [logo] }, { L1: 8 }, metrics).items[0].placement; // centre (200,150): (200-50)/300=50%, (150-100)/600=8%
  assert.deepEqual([p.xPct, p.yPct, p.zone], [50, 8, 'upper centre']);
  assert.equal(zoneLabel(50, 50), 'centre'); assert.equal(zoneLabel(20, 80), 'lower left');
});
t('left/top-origin objects are placed by their centre', () => {
  const p = buildPrintPlan({ front: [text] }, { T1: 12 }, metrics).items[0]; // left 100 + 400/2 = 300 -> 83%
  assert.equal(p.placement.xPct, 83);
});
t('no garment box means no placement, not a made-up one', () => assert.equal(buildPrintPlan({ front: [logo] }, { L1: 8 }, {}).items[0].placement, null));
t('back-face items are tagged and named separately; sizes key by layer id', () => {
  const back = { ...logo, __layerId: 'B1', __layerName: 'Back print' };
  const p = buildPrintPlan({ front: [logo], back: [back] }, { L1: 8, B1: 20 }, {});
  assert.deepEqual(p.ready.map(i => i.face), ['front', 'back']);
  assert.deepEqual(printFileNames(p.ready), ['01-front-left-chest-logo_8x4cm_300dpi.png', '02-back-back-print_20x10cm_300dpi.png']);
});
t('file names are unique even for identical layer names', () => {
  const a = { ...logo, __layerId: 'A' }, b = { ...logo, __layerId: 'B' };
  const names = printFileNames(buildPrintPlan({ front: [a, b] }, { A: 8, B: 8 }, {}).ready);
  assert.equal(new Set(names).size, 2);
});
t('crc32 matches the standard check value', () => assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926));

const outDir = process.argv[2];
const zip = makeZip([{ name: '01-front-logo_8x4cm_300dpi.png', data: Uint8Array.from([137, 80, 78, 71, 1, 2, 3]) }, { name: 'export-summary.txt', data: new TextEncoder().encode('hello') }], new Date(2026, 10, 21, 10, 30));
t('zip has the end-of-central-directory record and two entries', () => {
  const dv = new DataView(zip.buffer); const e = zip.length - 22;
  assert.equal(dv.getUint32(e, true), 0x06054b50); assert.equal(dv.getUint16(e + 10, true), 2);
});
// A real JPEG is not needed to test structure: any bytes work as the DCT stream placeholder.
const pdf = buildPrintPdf({ title: 't', subtitle: 'Demo - Polo Shirt - 21 November 2026', notes: ['Note one.', 'Note two is long enough to wrap onto more than one line in the sheet footer area, hopefully.'], skipped: ['front Text "x"'] },
  [{ label: 'Front', jpeg: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]), w: 400, h: 800, boxes: [{ n: 1, cx: 0.5, cy: 0.2, w: 0.2, h: 0.1, angle: 15 }] }],
  Array.from({ length: 30 }, (_, i) => ({ n: i + 1, view: 'Front', item: `Item ${i + 1}`, size: '8 x 4', px: '945 x 472', position: 'upper centre (50%, 8%)', quality: '305 DPI at this size', low: i % 2 === 0 })));
t('pdf: header, trailer, 1 diagram page + 2 table pages, xref offsets exact', () => {
  const s = Buffer.from(pdf).toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4')); assert.ok(s.trimEnd().endsWith('%%EOF'));
  assert.match(s, /\/Count 3/);
  const xr = s.lastIndexOf('\nxref\n') + 1; const lines = s.slice(xr).split('\n'); const count = Number(lines[1].split(' ')[1]);
  for (let i = 1; i < count; i++) { const off = Number(lines[2 + i].slice(0, 10)); assert.equal(s.slice(off, off + `${i} 0 obj`.length), `${i} 0 obj`); }
  assert.equal(Number(s.match(/startxref\n(\d+)/)[1]), xr);
  assert.ok(!/NaN|undefined/.test(s.replace(/[\x80-\xff]/g, '')));
});
if (outDir) { writeFileSync(`${outDir}/sample.zip`, zip); writeFileSync(`${outDir}/sample.pdf`, pdf); }
console.log(`${n} passed`);
