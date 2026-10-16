// Parametric 3D for build-your-own garments (docs/engineering/ADR-custom-3d.md). Pure: spec -> named parts as BufferGeometry, built from
// the same option builders as the 2D sketch (customGarment.js topOptions / bottomOptions / skirtOptions, garmentPaths.js sleeve paths), so
// length, fit, neckline, sleeve, hem, jogger options and skirt length match the drawing. Shapes are simple lofts: always "3D (approx.)".
//
// Model space: 1 template unit = K, x right, y up, +z the front; the garment is centred on its body's vertical span. Every part has
// positions, normals, UVs (u around, v along) and at most MAX_TRIS triangles. Logic-checked in tools/logic-checks.mjs.
import * as THREE from 'three';
import { kindOf, normalizeCustom, topOptionsFor, bottomOptions, skirtOptions, tailoredOptions } from './customGarment';
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
  return { pos, uv, idx, seam: closed ? { rows, cw } : null };
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
  // A closed loft repeats its first column at the end (so UVs run 0..1); those twin vertices get separate normals, which showed as a
  // hard light/dark line down the side. Give each pair their average normal.
  const nrm = g.attributes.normal;
  let base = 0;
  for (const r of raws) {
    if (r.seam) for (let i = 0; i < r.seam.rows; i++) {
      const a = base + i * r.seam.cw, b = a + r.seam.cw - 1;
      const v = [0, 1, 2].map(k => nrm.array[a * 3 + k] + nrm.array[b * 3 + k]), l = Math.hypot(...v) || 1;
      for (const at of [a, b]) nrm.setXYZ(at, v[0] / l, v[1] / l, v[2] / l);
    }
    base += r.pos.length / 3;
  }
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

// The 2D sleeve is drawn flat-lay, sticking out; worn, it hangs lower. The 3D sleeve axis turns this far further toward straight down.
const SLEEVE_DROOP = 0.35;
function sleeveAxis(d) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number), A = [n[0], n[1]], B = [n[2], n[3]], C = [n[4], n[5]], D = [n[6], n[7]];
  const top = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], h0 = [(C[0] + D[0]) / 2, (C[1] + D[1]) / 2];
  const L = Math.hypot(h0[0] - top[0], h0[1] - top[1]), a = Math.atan2(h0[1] - top[1], h0[0] - top[0]);
  const dA = Math.atan2(Math.sin(Math.PI / 2 - a), Math.cos(Math.PI / 2 - a)), a2 = a + Math.sign(dA) * Math.min(Math.abs(dA), SLEEVE_DROOP);
  return { top, hem: [top[0] + L * Math.cos(a2), top[1] + L * Math.sin(a2)], r0: Math.hypot(A[0] - B[0], A[1] - B[1]) / 2, r1: Math.hypot(C[0] - D[0], C[1] - D[1]) / 2 };
}

// Sleeve tube from a 2D sleeve path (A shoulder, B underarm, C underarm hem, D outer hem: garmentPaths.js contract).
// The first ring is pulled in (shoulder) so the tube end does not stand proud of the shoulder line.
// Two raw lofts as one (the first keeps its UV-seam record).
function merge(a, b) {
  const o = a.pos.length / 3, pos = new Float32Array(a.pos.length + b.pos.length), uv = new Float32Array(a.uv.length + b.uv.length);
  pos.set(a.pos); pos.set(b.pos, a.pos.length); uv.set(a.uv); uv.set(b.uv, a.uv.length);
  return { pos, uv, idx: [...a.idx, ...b.idx.map(i => i + o)], seam: a.seam };
}
// A disc closing a tube's first ring, so the inside of a sleeve never shows where it meets the shoulder.
function closeStart(t, cols = 32) {
  const ring = j => [t.pos[j * 3], t.pos[j * 3 + 1], t.pos[j * 3 + 2]];
  const c = [0, 1, 2].map(k => Array.from({ length: cols }, (_, j) => ring(j)[k]).reduce((x, y) => x + y, 0) / cols);
  return merge(t, loft(2, cols, (i, j) => (i === 0 ? c : ring(j))));
}

function sleeveTube(d, rows, from = 0, to = 1, grow = 1, shoulder = 0.78) {
  const { top, hem, r0, r1 } = sleeveAxis(d);
  const at = t => [lerp(top[0], hem[0], t), lerp(top[1], hem[1], t)];
  return tube(at(from), at(to), lerp(r0, r1, from) * grow * (to === 1 && from < 0.5 ? shoulder : 1), lerp(r0, r1, to) * grow, rows);
}


// Fall collar widths in template units measured down the body surface: `back` all round, rising to `point` at `at` radians either side
// of the front centre, then a straight front edge back to the neck at the centre (the open V at the top button).
const FALL = { point: { back: 15, point: 34, at: 0.42 }, polo: { back: 14, point: 22, at: 0.38 }, notch: { back: 26, point: 40, at: 0.55 } };
const FALL_COLS = 96, FALL_ROWS = 7, FALL_GAP = 1.6;

// The fall leaf: its top edge on the stand (or the neckline), then rows placed by arc length down the body, so a wider point never
// jumps body rows; each row sits FALL_GAP off the surface along the body's own normal, so the leaf lies on the shoulders and chest.
function fallCollar(collar, bodyAtA, cx, standH, maxRow) {
  const f = FALL[collar], sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const width = a => {
    const d = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));   // 0 at the front centre, PI at the back
    return d < f.at ? f.point * (d / f.at) : lerp(f.back, f.point, clamp01(1 - (d - f.at) / 0.7));   // straight edges: a crisp point
  };
  const normal = (i, a) => {
    const p = bodyAtA(i, a), u = sub(bodyAtA(i + 0.05, a), p), v = sub(bodyAtA(i, a + 0.01), p);
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (n[0] * (p[0] - cx) + n[2] * p[2] < 0) n = n.map(c => -c);
    const l = Math.hypot(...n) || 1;
    return n.map(c => c / l);
  };
  // Row index at surface distance s below the neckline, walking the body in small steps.
  const rowAt = (a, s) => {
    let i = 0, p = bodyAtA(0, a), run = 0;
    while (run < s && i < maxRow - 1) {
      const q = bodyAtA(i + 0.05, a), step = Math.hypot(...sub(q, p));
      if (run + step >= s) return i + 0.05 * ((s - run) / step);
      run += step; i += 0.05; p = q;
    }
    return i;
  };
  return loft(FALL_ROWS, FALL_COLS, (r, j) => {
    const a = (j / FALL_COLS) * Math.PI * 2;
    if (r === 0) {   // over the top of the stand, a gap outside it
      const [x, y, z] = bodyAtA(0, a), s = 1 + FALL_GAP / Math.hypot(x - cx, z);
      return [cx + (x - cx) * s, y - standH - FALL_GAP * 0.5, z * s];
    }
    const i = rowAt(a, (width(a) * (r - 1)) / (FALL_ROWS - 2)), p = bodyAtA(i, a), n = normal(i, a);
    return [p[0] + n[0] * FALL_GAP, p[1] + n[1] * FALL_GAP, p[2] + n[2] * FALL_GAP];
  });
}

// Tops: body loft, neckline band, sleeves, cuffs (long sleeves), hem band and a chest pocket when the options have one.
function topParts(o, paths, sleeve) {
  const w = o.w ?? 320, cx = w / 2, neckW = o.neckW ?? 30, hpsY = o.hpsY ?? 44, frontDrop = o.frontDrop ?? 22, backDrop = o.backDrop ?? 6;
  const sh = o.sh ?? [88, 64], arm = o.arm ?? [95, 128], hem = o.hem ?? [97, 334], waist = o.waist ?? 0, hemCurve = o.hemCurve ?? 4, collar = o.collar ?? 'rib';
  const pep = o.peplum;
  // Below the armhole: straight to the hem (with an optional waist), or in to the peplum waist seam and flaring out to the hem.
  const lower = y => (pep
    ? (y <= pep.y ? lerp(arm[0], pep.half, smooth((y - arm[1]) / (pep.y - arm[1]))) : lerp(pep.half, hem[0], 1 - (1 - clamp01((y - pep.y) / (hem[1] - pep.y))) ** 2))
    : (t => lerp(arm[0], hem[0], t) - waist * 4 * t * (1 - t))((y - arm[1]) / (hem[1] - arm[1])));
  const halfW = y => (y <= sh[1] ? lerp(neckW, sh[0], smooth((y - hpsY) / (sh[1] - hpsY)))
    : y <= arm[1] ? lerp(sh[0], arm[0], (y - sh[1]) / (arm[1] - sh[1])) : lower(y));
  // Depth ratio eases from 0.5 (chest) to 0.56 (waist) across the armhole line: a hard switch left a step that cut through the chest pocket.
  const halfD = y => halfW(y) * lerp(0.5, 0.56, smooth((y - arm[1] + 20) / 40));
  // An open-front jacket (o.openFront): the neckline drops in a V to the lapel depth, so the notch collar's leaves lie along it as lapels.
  const vee = collar === 'v' || (collar === 'notch' && !!o.openFront);
  // Neckline: the front drops to frontDrop (a point for V, a curve otherwise); the back keeps its small drop.
  const neckY = a => { const s = Math.sin(a), c = Math.abs(Math.cos(a));
    return hpsY + (s > 0 ? frontDrop * (vee ? Math.max(0, 1 - c / 0.9) : s * s) : backDrop * -s); };
  const hemYAt = a => hem[1] + hemCurve * 2 * Math.abs(Math.sin(a)) - (o.vents ? 16 * smooth((Math.abs(Math.cos(a)) - 0.92) / 0.08) : 0);
  const ROWS = 60;
  // Body surface at a (fractional) row i and angle a.
  // Drape: low folds on the sides (zero at the front and back centre, where plackets, buttons and logos sit), from the armhole down.
  const drape = (y, a) => 0.022 * smooth((y - arm[1]) / Math.max(1, hem[1] - arm[1])) * Math.min(1, Math.abs(Math.cos(a)) * 1.8)
    * (0.6 * Math.sin(6 * a + 0.7) + 0.4 * Math.sin(11 * a + 2.1));
  const bodyAtA = (i, a) => {
    const t = i / (ROWS - 1), y = lerp(neckY(a), hemYAt(a), t), k = smooth(i / 8), f = 1 + drape(y, a);
    const hw = lerp(neckW, halfW(y), k) * f, hd = lerp(neckW * 0.62, halfD(y), k) * f;
    return [cx + hw * Math.cos(a), y, hd * Math.sin(a)];
  };
  const bodyAt = (i, j) => bodyAtA(i, ang(j));
  const body = loft(ROWS, SEG, bodyAt);
  // Collar band: a rib along the opening, or a stand (polo, mandarin, point) with a fall collar for polo / point / notch.
  const band = [];
  const stand = ['polo', 'mandarin', 'point'].includes(collar), fall = ['polo', 'point', 'notch'].includes(collar);
  const standH = collar === 'mandarin' ? 13 : 9;
  if (stand) band.push(loft(4, SEG, (i, j) => { const [x, y, z] = bodyAt(0, j), t = i / 3, s = 1 - 0.04 * t; return [cx + (x - cx) * s, y - standH * t, z * s]; }));
  else band.push(loft(4, SEG, (i, j) => { const [x, y, z] = bodyAt(0, j), t = i / 3, s = 1.03; return [cx + (x - cx) * s, y + 7 * t, z * s]; }));
  if (fall) band.push(fallCollar(collar, bodyAtA, cx, stand ? standH : 0, ROWS));
  // Hem band: 7 units up from the hem, a hair outside the body.
  const hemBand = loft(3, SEG, (i, j) => { const [x, y, z] = bodyAt(ROWS - 1, j), t = i / 2; return [cx + (x - cx) * 1.012, y - 7 * t, z * 1.012]; });
  const out = { body: [body], collarBand: band, hem: [hemBand] };
  if (paths.sleeveL && paths.sleeveR) {
    // Each sleeve starts a little inside the body along its own axis (from -0.1) and is closed there, so the joint is buried in the body.
    out.sleeves = [closeStart(sleeveTube(paths.sleeveL, 24, -0.1)), closeStart(sleeveTube(paths.sleeveR, 24, -0.1))];
    if (sleeve === 'Long') out.cuffs = [sleeveTube(paths.sleeveL, 3, 0.9, 1, 1.05), sleeveTube(paths.sleeveR, 3, 0.9, 1, 1.05)];
    // Short and 3/4 sleeves: a turned hem (a slightly wider band outside, a lip just inside) so the end has a thickness, not a bare pipe.
    else out.sleeves.push(...[paths.sleeveL, paths.sleeveR].flatMap(d => [sleeveTube(d, 3, 0.93, 1, 1.025), sleeveTube(d, 2, 0.94, 1, 0.95)]));
  }
  const surfZ = (x, y) => halfD(y) * Math.sqrt(Math.max(0, 1 - ((x - cx) / halfW(y)) ** 2));
  // The body's real depth at (x, y) on the front (side 1) or back (-1), including the taper into the neckline over the first rows
  // (surfZ alone is the full chest depth and stands proud of the body near the neck).
  const surfAt = (x, y, side = 1) => {
    const a = side * Math.PI / 2, y0 = neckY(a), i = clamp01((y - y0) / (hemYAt(a) - y0)) * (ROWS - 1), k = smooth(i / 8);
    const hw = lerp(neckW, halfW(y), k), hd = lerp(neckW * 0.62, halfD(y), k);
    return hd * Math.sqrt(Math.max(0, 1 - ((x - cx) / hw) ** 2));
  };
  const on = (x, y, side, lift) => [x, y, side * (surfAt(x, y, side) + lift)];
  const line = (x, y0, y1, side = 1, n = 16) => Array.from({ length: n }, (_, i) => on(x, lerp(y0, y1, i / (n - 1)), side, 0.5));
  if (o.pocket) {
    out.pockets = [patch(o.pocket.x, o.pocket.y, o.pocket.w, o.pocket.h, 1, surfZ)];
    out.pocketDetail = 'patchPocket';
  }
  // Closures, at the same places as the 2D top(): placket edges and buttons, or a coat front edge and buttons.
  const buttons = [], edges = [];
  if (o.closures3D && o.placket) {
    const { top: py0 = hpsY + frontDrop, bottom: py1, buttons: n = 3, width = 8 } = o.placket, step = (py1 - py0 - 14) / Math.max(1, n - 1);
    edges.push(pathTube(line(cx - width, py0, py1), 0.6, 6), pathTube(line(cx + width, py0, py1), 0.6, 6));
    for (let i = 0; i < n; i++) { const y = py0 + 9 + i * step; buttons.push(button(cx, y, surfAt(cx, y) + 0.8, 2.6, 1)); }
  }
  if (o.closures3D && o.coat) {
    const { buttons: n = 4, step = 58 } = o.coat === true ? {} : o.coat, lap = o.lapel ?? 92;
    edges.push(pathTube(line(cx, hpsY + lap, hem[1] - 1), 0.9, 6));
    for (let i = 0; i < n; i++) { const y = hpsY + lap + 12 + i * step; buttons.push(button(cx - 8, y, surfAt(cx - 8, y) + 0.9, 3, 1)); }
  }
  if (buttons.length) out.buttons = buttons;
  if (edges.length) out.frontEdge = edges;
  if (o.flaps) out.flaps = [-1, 1].flatMap(s => {
    const x0 = s < 0 ? cx - o.flaps.x0 - o.flaps.w : cx + o.flaps.x0, x1 = x0 + o.flaps.w, y0 = o.flaps.y, y1 = y0 + 12;
    const edge = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].flatMap(([x, y], i, a) => (i ? Array.from({ length: 6 }, (_, k) => {
      const [px, py] = a[i - 1], t = (k + 1) / 6; return on(lerp(px, x, t), lerp(py, y, t), 1, 1.6); }) : [on(x, y, 1, 1.6)]));
    return [patch(x0, y0, o.flaps.w, 12, 1, surfZ, 1.4), pathTube(edge, 0.7, 6)];   // flap and its raised edge
  });
  if (o.backZip) out.backZip = [pathTube(line(cx, hpsY + backDrop + 2, o.backZip.bottom, -1), 0.7, 6)];
  // Peplum waist seam: a fine ridge right round the body.
  if (pep) out.seams = [pathTube(Array.from({ length: SEG + 1 }, (_, j) => { const a = ang(j); return [cx + halfW(pep.y) * 1.01 * Math.cos(a), pep.y, halfD(pep.y) * 1.01 * Math.sin(a)]; }), 0.6, 6)];
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

// A round tube along a 3D polyline (template units): topstitching, fold edges, pocket openings. Rings sit square to the path.
function pathTube(points, r, cols = 8) {
  const n = points.length;
  return loft(n, cols, (i, j) => {
    const p = points[i], q = points[Math.min(n - 1, i + 1)], o = points[Math.max(0, i - 1)];
    let t = [q[0] - o[0], q[1] - o[1], q[2] - o[2]];
    const tl = Math.hypot(...t) || 1; t = t.map(c => c / tl);
    // b1 = t x z (falls back to x when the path runs along z), b2 = b1 x t.
    let b1 = [t[1], -t[0], 0]; const bl = Math.hypot(...b1);
    b1 = bl < 1e-3 ? [1, 0, 0] : b1.map(c => c / bl);
    const b2 = [b1[1] * t[2] - b1[2] * t[1], b1[2] * t[0] - b1[0] * t[2], b1[0] * t[1] - b1[1] * t[0]], a = (j / cols) * Math.PI * 2;
    return [0, 1, 2].map(k => p[k] + r * (Math.cos(a) * b1[k] + Math.sin(a) * b2[k]));
  });
}

// A button facing +z (side 1) or -z (side -1): a domed disc of radius r centred on (x, y, z), closed at the back.
function button(x, y, z, r, side) {
  const prof = [[0, 1.2], [0.7, 1.1], [1, 0.6], [1, 0], [0, 0]];
  return loft(prof.length, 16, (i, j) => { const [k, h] = prof[i], a = (j / 16) * Math.PI * 2; return [x + r * k * Math.cos(a), y + r * k * Math.sin(a), z + side * h * r * 0.5]; });
}

// Tailored trousers (Pantsuit Trousers): one continuous body from the waistband to the hems. Above the crotch each leg is half the hip
// ring plus a flat centre panel (the two halves meet at the centre seam, so the hip reads as one shape); below it each leg becomes its
// own tube, blended over the crotch so the inseams part in a curve. The crease is a ridge down the front and back of each leg.
// Fly, waistband button, belt loops, slant pocket openings, back welts with buttons, darts and the centre-back seam are their own parts.
function tailoredParts(o) {
  const w = 250, cx = w / 2, waist = o.waist ?? 76, band = 15, waistY = o.waistY, by = waistY + band, hip = o.hip ?? 84, seat = 1.06;
  const { hipY, crotchY, hemY, hemOut, hemIn } = o;
  const halfW = y => (y <= hipY ? lerp(waist + 2, hip, smooth((y - by) / (hipY - by))) : hip);
  // Depth: slimmer at the waist (0.56, about a top's hem, so a top or jacket covers the waistband in a set) to 0.64 at the hip; the
  // seat's extra fullness at the back also builds from the waistband down to the hip.
  const hipT = y => smooth((y - by) / (hipY - by));
  const halfD = y => halfW(y) * lerp(0.56, 0.64, hipT(y));
  const seatAt = y => lerp(1, seat, hipT(y));
  // Leg outline below the hip, as the 2D trousers() draws it: outer edge hip -> hemOut, inseam 2 -> hemIn.
  const outer = y => lerp(hip, hemOut, clamp01((y - hipY) / (hemY - hipY))), inner = y => lerp(2, hemIn, clamp01((y - crotchY) / (hemY - crotchY)));
  const blend = y => smooth((y - (crotchY - 6)) / 46);
  const ROWS = 62, COLS = 80, creaseOn = o.crease ? 1 : 0;
  const wrap = d => Math.atan2(Math.sin(d), Math.cos(d));
  // Point on leg s (+1 = viewer's right) at height y and angle a (0 = outward, PI/2 = front). The left leg is the right one turned half
  // round (x and z mirrored), so both keep the same winding.
  const legPoint = (s, y, a) => {
    const u = Math.cos(a), v = Math.sin(a) * s;                                          // u outward, v front (+) / back (-)
    const hw = halfW(Math.min(y, crotchY)), hd = halfD(Math.min(y, crotchY)), back = v < 0 ? seatAt(Math.min(y, crotchY)) : 1;
    const dX = u >= 0 ? hw * u : 0, dZ = hd * v * back;                                  // hip half ring + flat centre panel
    const c = (outer(y) + inner(y)) / 2, r = (outer(y) - inner(y)) / 2;
    // Leg depth starts at the hip ring's depth over the leg's own centre (not the centre-front depth), so the thigh never stands proud of the hip.
    const rz = lerp(hd * back * Math.sqrt(Math.max(0, 1 - (c / hw) ** 2)), r * 0.96, smooth((y - crotchY) / 170));
    // Crease: a narrow ridge on the front and back centre of the leg, fading in below the hip and out just above the hem.
    const fade = creaseOn * smooth((y - hipY - 6) / 30) * (1 - smooth((y - hemY + 14) / 10));
    const front = s * Math.PI / 2, ridge = (target, h) => h * Math.exp(-((wrap(a - target) / 0.1) ** 2));
    const t = blend(y);
    // The ridge grows with the blend too, so it never pushes the front out past the hip where the legs part (a bump in side view).
    // Break: where the hem meets the shoe the front of the leg ripples softly over the last 40 units.
    const brk = 0.018 * smooth((y - hemY + 40) / 30) * Math.max(0, v) * Math.sin((hemY - y) / 6);
    const k = 1 + (t * fade * (ridge(front, 2.4) + ridge(-front, 1.6))) / Math.max(r, 1) + brk;
    return [cx + s * lerp(dX, c + r * u * k, t), y, lerp(dZ, rz * v * k, t)];
  };
  const leg = s => loft(ROWS, COLS, (i, j) => legPoint(s, lerp(by, hemY, i / (ROWS - 1)), (j / COLS) * Math.PI * 2));
  const out = { body: [leg(1), leg(-1)] };
  // Body surface depth at (x, y) above the crotch (the hip ring), +1 front / -1 back.
  const surfZ = (x, y, side = 1) => halfD(y) * (side < 0 ? seatAt(y) : 1) * Math.sqrt(Math.max(0, 1 - ((x - cx) / halfW(y)) ** 2));
  const on = (x, y, side, lift) => [x, y, side * (surfZ(x, y, side) + lift)];
  const curve = (n, f) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
  // Waistband: outside the body with a turned top edge (so it shows a thickness), the button at the front fastening.
  const wbW = y => lerp(waist, waist + 2, (y - waistY) / band) * 1.03, wbD = y => wbW(y) * 0.58;
  // Rows: outside up to the top edge, over it, a little way down the inside, then closed across the opening so the hollow never shows.
  const WB = [[by, 1], [lerp(by, waistY, 1 / 3), 1], [lerp(by, waistY, 2 / 3), 1], [waistY, 1], [waistY + 1.2, 0.95], [waistY + 5, 0.94], [waistY + 5, 0]];
  out.waistband = [loft(WB.length, SEG, (i, j) => {
    const a = ang(j), [y, sc] = WB[i], back = 1;
    return [cx + wbW(y) * sc * Math.cos(a), y, wbD(y) * sc * back * Math.sin(a)];
  })];
  const wbZ = (x, y) => wbD(y) * Math.sqrt(Math.max(0, 1 - ((x - cx) / wbW(y)) ** 2));
  out.buttons = [button(cx, waistY + band / 2, wbZ(cx, waistY + band / 2, 1) + 0.6, 3.2, 1)];
  // Belt loops: four on the front (where the 2D draws them), three on the back.
  if (o.beltLoops) out.loops = [[-0.72, 1], [-0.28, 1], [0.28, 1], [0.72, 1], [-0.42, -1], [0, -1], [0.42, -1]].map(([k, side]) => {
    const x = cx + waist * k;
    return tube([x, waistY + 0.8], [x, by + 3], 2.2, 2.2, 4, 10, 0.4, side * (wbZ(x, waistY + band / 2, side) + 0.9));
  });
  // Fly: the folded fly edge at the centre front and the J-shaped topstitch on the wearer's left; the zip sits under the fly (not modelled).
  const flyEnd = crotchY - 8;
  out.fly = [
    pathTube(curve(16, t => on(cx + 0.6, lerp(by + 0.5, flyEnd, t), 1, 0.7)), 1.0),
    pathTube([...curve(14, t => on(cx + 11, lerp(by + 0.5, crotchY - 26, t), 1, 0.35)),
      ...curve(9, t => { const a = (t * Math.PI) / 2; return on(cx + 1 + 10 * Math.cos(a), crotchY - 26 + 18 * Math.sin(a), 1, 0.35); }).slice(1)], 0.55),
  ];
  // Slant front pockets: a piped opening on the 2D line, from the waistband down to the side seam.
  if (o.slantPockets) out.sidePockets = [-1, 1].map(s => pathTube(curve(18, t => {
    const m = 1 - t, x = cx + s * (m * m * (waist - 8) + 2 * m * t * (waist - 14) + t * t * (hip - 9)), y = m * m * by + 2 * m * t * (by + 34) + t * t * (by + 46);
    return on(x, y, 1, 0.6);
  }), 1.1));
  // Back: jetted welts (a raised lip) with a button below each, darts above them and the centre-back seam.
  if (o.welts) {
    out.backPockets = [];
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? cx - waist + 18 : cx + 20, x1 = s < 0 ? cx - 20 : cx + waist - 18, xm = (x0 + x1) / 2;
      out.backPockets.push(pathTube(curve(16, t => on(lerp(x0, x1, t), by + 27, -1, 0.9)), 1.8, 10));
      out.buttons.push(button(xm, by + 36, -(surfZ(xm, by + 36, -1) + 0.5), 2.6, -1));
    }
  }
  if (o.darts) out.seams = [
    ...[-1, 1].map(s => pathTube(curve(10, t => on(cx + s * (waist / 2 - 2 + 3 * t), lerp(by, by + 20, t), -1, 0.15)), 0.5, 6)),
    pathTube(curve(30, t => on(cx, lerp(by, crotchY - 4, t), -1, 0.1)), 0.55, 6),
  ];
  // Hem: the leg edge turned inside (or a turn-up band folded outside it).
  const hemRows = o.turnUp ? [[hemY - 16, 1.0], [hemY - 16, 1.05], [hemY, 1.05], [hemY, 0.97]] : [[hemY - 7, 1.012], [hemY, 1.012], [hemY, 0.96], [hemY - 1, 0.96]];
  out.hem = [1, -1].map(s => loft(hemRows.length, COLS, (i, j) => {
    const [y, sc] = hemRows[i], p = legPoint(s, y, (j / COLS) * Math.PI * 2), c = cx + s * (outer(y) + inner(y)) / 2;
    return [c + (p[0] - c) * sc, y, p[2] * sc];
  }));
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
  // Tailored trousers: buttons and the fly take the Details colours when set (garmentDetails buttons / closure), else the body colour.
  buttons: { colorKey: 'body', detailColor: 'buttons', plain: true }, fly: { colorKey: 'body', detailColor: 'closure' },
  loops: { colorKey: 'body' }, seams: { colorKey: 'body' },
  // Tops: placket or coat front edge and the back zip follow the closure colour; flap pockets follow the Details show/hide.
  frontEdge: { colorKey: 'body', detailColor: 'closure' }, backZip: { colorKey: 'body', detailColor: 'closure' }, flaps: { colorKey: 'body', detail: 'flapPockets' },
};

function assemble({ raws, cx, span, frameHalf }, pocketDetail) {
  const cy = (span[0] + span[1]) / 2;
  const parts = Object.entries(raws).filter(([name]) => name !== 'pocketDetail').map(([name, list]) => ({
    name, geometry: toGeometry(list, cx, cy), colorKey: PART_META[name].colorKey, decals: !!PART_META[name].decals,
    detail: name === 'pockets' ? pocketDetail : PART_META[name].detail ?? null, detailColor: PART_META[name].detailColor ?? null, plain: !!PART_META[name].plain,
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
  if (kind === 'top') { const r = topParts(topOptionsFor(s, garment), customPaths(garment, s, sleeve), sleeve); return assemble(r, r.raws.pocketDetail); }
  if (kind === 'skirt') return assemble(skirtParts(skirtOptions(s)));
  if (kind === 'tailored') return assemble(tailoredParts(tailoredOptions(s, garment)));
  return assemble(bottomParts(bottomOptions(s)));
}

// Memoised by (garment, spec, sleeve). The caller owns the geometry: disposeParts() frees it when the spec changes.
export const customMeshKey = (garment, spec, sleeve) => `${garment}|${sleeve ?? ''}|${JSON.stringify(normalizeCustom(spec, garment) ?? null)}`;
export const disposeParts = built => built?.parts.forEach(p => p.geometry.dispose());
export const triangleCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
