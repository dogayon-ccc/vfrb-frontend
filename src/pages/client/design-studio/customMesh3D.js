// Parametric 3D for build-your-own garments (docs/engineering/ADR-custom-3d.md). Pure: spec -> named parts as BufferGeometry, built from
// the same option builders as the 2D sketch (customGarment.js topOptions / bottomOptions / skirtOptions, garmentPaths.js sleeve paths), so
// length, fit, neckline, sleeve, hem, jogger options and skirt length match the drawing. Shapes are simple lofts: always "3D (approx.)".
//
// Model space: 1 template unit = K, x right, y up, +z the front; the garment is centred on its body's vertical span. Every part has
// positions, normals, UVs (u around, v along) and at most MAX_TRIS triangles. Logic-checked in tools/logic-checks.mjs.
import * as THREE from 'three';
import { kindOf, normalizeCustom, topOptions, bottomOptions, skirtOptions, CUSTOM_TOP } from './customGarment';
import { customPaths, getGarmentPaths, BUTTON_DOWN_OPTIONS } from './garmentPaths';

export const K = 0.005;          // model units per template unit (a 380-unit top is 1.9 tall, like the staged models)
export const MAX_TRIS = 20000;
const SEG = 48;                  // points around a body ring
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.min(1, Math.max(0, t));
const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };

// A loft through `rows` rings of `cols` points each, given by at(i, j) -> [x, y, z] in template units (y down, as in 2D).
// closed: the ring wraps (a seam column is duplicated so UVs run 0..1).
function loft(rows, cols, at, closed = true) {
  const cw = closed ? cols + 1 : cols, pos = new Float32Array(rows * cw * 3), uv = new Float32Array(rows * cw * 2), idx = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cw; j++) {
    const [x, y, z] = at(i, j % cols), k = i * cw + j;
    pos.set([x, y, z], k * 3); uv.set([j / (cw - 1), i / (rows - 1)], k * 2);
  }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cw - 1; j++) {
    const a = i * cw + j, b = a + 1, c = a + cw, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { pos, uv, idx };
}

// Raw lofts -> one BufferGeometry in model space (template units * K, y flipped, centred on cy).
function toGeometry(raws, cx, cy) {
  const n = raws.reduce((s, r) => s + r.pos.length / 3, 0), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  let o = 0;
  for (const r of raws) {
    const m = r.pos.length / 3;
    for (let k = 0; k < m; k++) pos.set([(r.pos[k * 3] - cx) * K, (cy - r.pos[k * 3 + 1]) * K, r.pos[k * 3 + 2] * K], (o + k) * 3);
    uv.set(r.uv, o * 2);
    for (const i of r.idx) idx.push(i + o);
    o += m;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

const ang = j => (j / SEG) * Math.PI * 2;   // 0 = viewer's right side, PI/2 = front centre

// A tube between two 2D centres (template units) with radii r0 -> r1 and depth ratio dz, `rows` rings of `cols` points.
function tube(c0, c1, r0, r1, rows, cols = 32, dz = 0.85, zc = 0) {
  const ax = c1[0] - c0[0], ay = c1[1] - c0[1], L = Math.hypot(ax, ay) || 1, px = -ay / L, py = ax / L;
  return loft(rows, cols, (i, j) => {
    const t = i / (rows - 1), r = lerp(r0, r1, t), a = (j / cols) * Math.PI * 2;
    return [lerp(c0[0], c1[0], t) + px * r * Math.cos(a), lerp(c0[1], c1[1], t) + py * r * Math.cos(a), zc + r * dz * Math.sin(a)];
  });
}

// A flat patch (pocket) on a ring surface: corners in 2D, pushed onto the surface front (+1) or back (-1) with surfZ(x, y).
function patch(x0, y0, w, h, side, surfZ, lift = 1.5) {
  const rows = 6, cols = 6;
  return loft(rows, cols, (i, j) => {
    const x = x0 + (w * j) / (cols - 1), y = y0 + (h * i) / (rows - 1);
    return [x, y, side * (surfZ(x, y) + lift)];
  }, false);
}

// Sleeve tube from a 2D sleeve path (A shoulder, B underarm, C underarm hem, D outer hem: garmentPaths.js contract).
function sleeveTube(d, rows, from = 0, to = 1, grow = 1) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number), A = [n[0], n[1]], B = [n[2], n[3]], C = [n[4], n[5]], D = [n[6], n[7]];
  const top = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], hem = [(C[0] + D[0]) / 2, (C[1] + D[1]) / 2];
  const r0 = Math.hypot(A[0] - B[0], A[1] - B[1]) / 2, r1 = Math.hypot(C[0] - D[0], C[1] - D[1]) / 2;
  const at = t => [lerp(top[0], hem[0], t), lerp(top[1], hem[1], t)];
  return tube(at(from), at(to), lerp(r0, r1, from) * grow, lerp(r0, r1, to) * grow, rows);
}

// Tops: body loft, neckline band, sleeves, cuffs (long sleeves), hem band and a chest pocket when the options have one.
function topParts(o, paths, sleeve) {
  const w = o.w ?? 320, cx = w / 2, neckW = o.neckW ?? 30, hpsY = o.hpsY ?? 44, frontDrop = o.frontDrop ?? 22, backDrop = o.backDrop ?? 6;
  const sh = o.sh ?? [88, 64], arm = o.arm ?? [95, 128], hem = o.hem ?? [97, 334], waist = o.waist ?? 0, hemCurve = o.hemCurve ?? 4, collar = o.collar ?? 'rib';
  const halfW = y => (y <= sh[1] ? lerp(neckW, sh[0], smooth((y - hpsY) / (sh[1] - hpsY)))
    : y <= arm[1] ? lerp(sh[0], arm[0], (y - sh[1]) / (arm[1] - sh[1]))
    : (t => lerp(arm[0], hem[0], t) - waist * 4 * t * (1 - t))((y - arm[1]) / (hem[1] - arm[1])));
  const halfD = y => halfW(y) * (y < arm[1] ? 0.5 : 0.56);
  const vee = collar === 'v';
  // Neckline: the front drops to frontDrop (a point for V, a curve otherwise); the back keeps its small drop.
  const neckY = a => { const s = Math.sin(a), c = Math.abs(Math.cos(a));
    return hpsY + (s > 0 ? frontDrop * (vee ? Math.max(0, 1 - c / 0.9) : s * s) : backDrop * -s); };
  const hemYAt = a => hem[1] + hemCurve * 2 * Math.abs(Math.sin(a)) - (o.vents ? 16 * smooth((Math.abs(Math.cos(a)) - 0.92) / 0.08) : 0);
  const ROWS = 60;
  const bodyAt = (i, j) => {
    const a = ang(j), t = i / (ROWS - 1), y = lerp(neckY(a), hemYAt(a), t), k = smooth(i / 8);
    const hw = lerp(neckW, halfW(y), k), hd = lerp(neckW * 0.62, halfD(y), k);
    return [cx + hw * Math.cos(a), y, hd * Math.sin(a)];
  };
  const body = loft(ROWS, SEG, bodyAt);
  const ring0 = j => bodyAt(0, j);
  // Collar band: a rib along the opening, or a stand (polo, mandarin, point) with a fall collar for polo / point / notch.
  const band = [];
  const stand = ['polo', 'mandarin', 'point'].includes(collar), fall = ['polo', 'point', 'notch'].includes(collar);
  const standH = collar === 'mandarin' ? 13 : 9;
  if (stand) band.push(loft(4, SEG, (i, j) => { const [x, y, z] = ring0(j), t = i / 3, s = 1 - 0.04 * t; return [cx + (x - cx) * s, y - standH * t, z * s]; }));
  else band.push(loft(4, SEG, (i, j) => { const [x, y, z] = ring0(j), t = i / 3, s = 1.03; return [cx + (x - cx) * s, y + 7 * t, z * s]; }));
  if (fall) {
    const depth = collar === 'notch' ? 30 : 16, spread = collar === 'notch' ? 1.2 : 1.12;
    // Collar points (point collar) reach further down beside the front centre.
    const tip = a => (collar === 'point' ? 12 * Math.max(0, 1 - Math.abs(a - Math.PI / 2 - 0.42) / 0.3) + 12 * Math.max(0, 1 - Math.abs(a - Math.PI / 2 + 0.42) / 0.3) : 0);
    band.push(loft(5, SEG, (i, j) => {
      const [x, y, z] = ring0(j), t = i / 4, a = ang(j), top = y - (stand ? standH : 0), s = lerp(1.04, spread, t);
      return [cx + (x - cx) * s, lerp(top, y + depth + tip(a), t), z * s * 1.02];
    }));
  }
  // Hem band: 7 units up from the hem, a hair outside the body.
  const hemBand = loft(3, SEG, (i, j) => { const [x, y, z] = bodyAt(ROWS - 1, j), t = i / 2; return [cx + (x - cx) * 1.012, y - 7 * t, z * 1.012]; });
  const out = { body: [body], collarBand: band, hem: [hemBand] };
  if (paths.sleeveL && paths.sleeveR) {
    out.sleeves = [sleeveTube(paths.sleeveL, 24), sleeveTube(paths.sleeveR, 24)];
    if (sleeve === 'Long') out.cuffs = [sleeveTube(paths.sleeveL, 3, 0.9, 1, 1.05), sleeveTube(paths.sleeveR, 3, 0.9, 1, 1.05)];
  }
  if (o.pocket) {
    const surfZ = (x, y) => halfD(y) * Math.sqrt(Math.max(0, 1 - ((x - cx) / halfW(y)) ** 2));
    out.pockets = [patch(o.pocket.x, o.pocket.y, o.pocket.w, o.pocket.h, 1, surfZ)];
    out.pocketDetail = 'patchPocket';
  }
  return { raws: out, cx, span: [hpsY, hem[1] + 2 * hemCurve], frameHalf: Math.max(sh[0], arm[0], hem[0]) };
}

// Bottoms: waistband, seat, two legs, hem or cuffs, drawstring, side and back pockets (as the 2D trousers() draws them).
function bottomParts(o) {
  const w = 250, cx = w / 2, waist = 76, band = 15, waistY = o.waistY, by = waistY + band, hip = 84;
  const { hipY, crotchY, hemY, hemOut, hemIn } = o;
  const halfW = y => (y <= hipY ? lerp(waist + 2, hip, smooth((y - by) / (hipY - by))) : hip);
  const halfD = y => halfW(y) * 0.62;
  const ringAt = (y, j, s = 1) => { const a = ang(j); return [cx + halfW(y) * s * Math.cos(a), y, halfD(y) * s * Math.sin(a)]; };
  const waistband = loft(4, SEG, (i, j) => { const y = lerp(waistY, by, i / 3), a = ang(j), hw = lerp(waist, waist + 2, i / 3) * 1.02; return [cx + hw * Math.cos(a), y, hw * 0.64 * Math.sin(a)]; });
  const seat = loft(24, SEG, (i, j) => ringAt(lerp(by, crotchY + 8, i / 23), j));
  const legR = (hip) / 2, hemR = (hemOut - hemIn) / 2, hemC = (hemOut + hemIn) / 2;
  const leg = s => tube([cx + s * legR, crotchY - 6], [cx + s * hemC, hemY], legR, hemR, 40, 32, 1.0);
  const out = { waistband: [waistband], body: [seat], legs: [leg(-1), leg(1)] };
  const cuffRing = (s, h, grow) => tube([cx + s * hemC, hemY - h], [cx + s * hemC, hemY], hemR * grow, hemR * grow, 3, 32, 1.0);
  if (o.cuffs) out.cuffs = [cuffRing(-1, 14, 1.06), cuffRing(1, 14, 1.06)];
  else out.hem = [cuffRing(-1, 7, 1.015), cuffRing(1, 7, 1.015)];
  if (o.drawstring) out.drawstring = [-1, 1].map(s => tube([cx + s * 6, by - 4], [cx + s * 14, by + 22], 1.3, 1.3, 6, 10, 1, halfD(by) * 1.04));
  const surfZ = (x, y) => halfD(y) * Math.sqrt(Math.max(0, 1 - ((x - cx) / halfW(y)) ** 2));
  if (o.slantPockets) out.sidePockets = [-1, 1].map(s => patch(s < 0 ? cx - waist + 2 : cx + waist - 26, by + 2, 24, 44, 1, surfZ, 1.2));
  if (o.fly) out.backPockets = [-1, 1].map(s => patch(s < 0 ? cx - waist + 16 : cx + 18, by + 22, waist - 34, 36, -1, surfZ, 1.2));
  return { raws: out, cx, span: [waistY, hemY], frameHalf: Math.max(hip, hemOut) };
}

// Skirt: waistband, body flaring from the hip to the hem, hem band.
function skirtParts(o) {
  const w = 260, cx = w / 2, waist = 58, waistY = 30, band = 16, by = waistY + band, hip = 79, { hipY, hemY, hemX } = o;
  const halfW = y => (y <= hipY ? lerp(waist + 3, hip, smooth((y - by) / (hipY - by))) : lerp(hip, hemX, (y - hipY) / (hemY - hipY)));
  const ringAt = (y, j, s = 1) => { const a = ang(j), hw = halfW(y) * s; return [cx + hw * Math.cos(a), y, hw * 0.6 * Math.sin(a)]; };
  const waistband = loft(4, SEG, (i, j) => { const y = lerp(waistY, by, i / 3), a = ang(j), hw = (waist + 2) * 1.02; return [cx + hw * Math.cos(a), y, hw * 0.62 * Math.sin(a)]; });
  const body = loft(40, SEG, (i, j) => ringAt(lerp(by, hemY, i / 39), j));
  const hem = loft(3, SEG, (i, j) => ringAt(lerp(hemY - 7, hemY, i / 2), j, 1.012));
  return { raws: { waistband: [waistband], body: [body], hem: [hem] }, cx, span: [waistY, hemY], frameHalf: Math.max(hip, hemX) };
}

// Part name -> colour zone, decals and the 2D detail it follows (Details panel show/hide).
const PART_META = {
  body: { colorKey: 'body', decals: true }, sleeves: { colorKey: 'sleeve' }, cuffs: { colorKey: 'sleeve' }, collarBand: { colorKey: 'collar' },
  hem: { colorKey: 'body' }, pockets: { colorKey: 'pocket' }, waistband: { colorKey: 'body' }, legs: { colorKey: 'body' },
  drawstring: { colorKey: 'body' }, sidePockets: { colorKey: 'body', detail: 'sidePockets' }, backPockets: { colorKey: 'body', detail: 'backPockets' },
};

function assemble({ raws, cx, span, frameHalf }, pocketDetail) {
  const cy = (span[0] + span[1]) / 2;
  const parts = Object.entries(raws).filter(([name]) => name !== 'pocketDetail').map(([name, list]) => ({
    name, geometry: toGeometry(list, cx, cy), colorKey: PART_META[name].colorKey, decals: !!PART_META[name].decals,
    detail: name === 'pockets' ? pocketDetail : PART_META[name].detail ?? null,
  }));
  return { parts, torso: frameHalf * K };
}

// The one entry point: a build-your-own garment from its spec, or the Button-Down vector template. null for anything else.
export function buildCustomParts(garment, spec, sleeve = 'Short') {
  if (garment === 'Button-Down') {
    const r = topParts(BUTTON_DOWN_OPTIONS, getGarmentPaths('Button-Down', sleeve), sleeve);
    return assemble(r, r.raws.pocketDetail);
  }
  const kind = kindOf(garment);
  if (!kind) return null;
  const s = normalizeCustom(spec, garment);
  if (kind === 'top') { const r = topParts(topOptions(s), customPaths(CUSTOM_TOP, s, sleeve), sleeve); return assemble(r, r.raws.pocketDetail); }
  if (kind === 'skirt') return assemble(skirtParts(skirtOptions(s)));
  return assemble(bottomParts(bottomOptions(s)));
}

// Memoised by (garment, spec, sleeve). The caller owns the geometry: disposeParts() frees it when the spec changes.
export const customMeshKey = (garment, spec, sleeve) => `${garment}|${sleeve ?? ''}|${JSON.stringify(normalizeCustom(spec, garment) ?? null)}`;
export const disposeParts = built => built?.parts.forEach(p => p.geometry.dispose());
export const triangleCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
