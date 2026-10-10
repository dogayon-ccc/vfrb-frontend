// Garment SVG path data for the 2D vector templates.
//
// Zones (body, collar, sleeveL, sleeveR, pocket) are the colourable, clickable regions. `details` are decorative
// lines drawn on top (seams, plackets, buttons, the inside of the neck opening): they carry no zone and take no
// clicks, so they never change what a customer can edit or what an order records.
//
// Sleeve paths are 4 points (shoulder A, armpit B, underarm hem C, outer hem D) closed with a curve back to A.
// Every consumer that reshapes a sleeve reads those first 8 numbers, so the order is part of the contract.
// The body path uses only M/L/Q commands with x,y pairs: overlayDecals.bodyBounds reads its numbers pairwise.

const f = n => Math.round(n * 10) / 10;
const pt = (x, y) => `${f(x)},${f(y)}`;

// Legacy sleeve reshaping, kept for templates still drawn by hand (Lab Coverall).
function parseSleeve(str) {
  if (!str) return null;
  const n = str.match(/-?\d+(\.\d+)?/g).map(Number);
  return { ax:n[0], ay:n[1], bx:n[2], by:n[3], cx:n[4], cy:n[5], dx:n[6], dy:n[7] };
}
function buildSleeve(p, bow) {
  const mx = (p.dx + p.ax) / 2 + bow, my = (p.dy + p.ay) / 2;
  return `M ${p.ax},${p.ay} L ${p.bx},${p.by} L ${p.cx},${p.cy} L ${p.dx},${p.dy} Q ${mx},${my} ${p.ax},${p.ay} Z`;
}

// One sleeve from its shoulder point A and armpit B. `angle` is degrees below horizontal, `len` the length of the
// top edge, `open` the width of the hem opening. side = -1 for the viewer's left sleeve, +1 for the right.
function sleeveGeom(A, B, side, { angle, len, open }) {
  const a = angle * Math.PI / 180;
  const u = [side * Math.cos(a), Math.sin(a)];   // down the arm, away from the body
  const v = [-side * Math.sin(a), Math.cos(a)];  // across the hem, toward the underarm
  const D = [A[0] + u[0] * len, A[1] + u[1] * len];
  const C = [D[0] + v[0] * open, D[1] + v[1] * open];
  const M = [(A[0] + D[0]) / 2 - v[0] * 5, (A[1] + D[1]) / 2 - v[1] * 5]; // top edge bows slightly outward
  const d = `M ${pt(...A)} L ${pt(...B)} L ${pt(...C)} L ${pt(...D)} Q ${pt(...M)} ${pt(...A)} Z`;
  // Hem stitching 6px up the sleeve; long sleeves get a cuff band instead.
  const back = (P, k) => [P[0] - u[0] * k, P[1] - u[1] * k];
  const hemLine = `M ${pt(...back(C, 6))} L ${pt(...back(D, 6))}`;
  const cuff = `M ${pt(...back(C, 16))} L ${pt(...back(D, 16))}`;
  return { d, hemLine, cuff };
}

const SLEEVE_SHAPES = {
  'Short': s => s,
  '3/4':   s => ({ angle: s.angle + 28, len: s.len * 2.05, open: s.open * 0.8 }),
  'Long':  s => ({ angle: Math.min(80, s.angle + 38), len: s.len * 3.15, open: s.open * 0.68 }),
};

const roundRect = (x, y, w, h, r = 3) =>
  `M ${pt(x + r, y)} L ${pt(x + w - r, y)} Q ${pt(x + w, y)} ${pt(x + w, y + r)} L ${pt(x + w, y + h - r)} Q ${pt(x + w, y + h)} ${pt(x + w - r, y + h)} ` +
  `L ${pt(x + r, y + h)} Q ${pt(x, y + h)} ${pt(x, y + h - r)} L ${pt(x, y + r)} Q ${pt(x, y)} ${pt(x + r, y)} Z`;
const dot = (x, y, r = 2.6) => `M ${pt(x - r, y)} Q ${pt(x - r, y - r)} ${pt(x, y - r)} Q ${pt(x + r, y - r)} ${pt(x + r, y)} Q ${pt(x + r, y + r)} ${pt(x, y + r)} Q ${pt(x - r, y + r)} ${pt(x - r, y)} Z`;

// Tops: one parametric flat-lay shape. Proportions follow a men's M polo laid flat (chest 52 cm, length 72 cm, ratio ~0.66).
function top(o) {
  const {
    w = 320, h = 380, neckW = 30, hpsY = 44, frontDrop = 22, backDrop = 6,
    sh = [88, 64], arm = [95, 128], hem = [97, 334], hemCurve = 4, waist = 0,
    sleeve = { angle: 40, len: 66, open: 56 }, collar = 'rib', pocket = null, placket = null, vents = false, coat = false,
  } = o;
  const cx = w / 2;
  const L = (dx, y) => [cx - dx, y], R = (dx, y) => [cx + dx, y];
  const LH = L(neckW, hpsY), RH = R(neckW, hpsY);
  const vee = collar === 'v';
  const frontY = hpsY + frontDrop;                   // lowest point of the front neckline
  const frontNeck = vee ? `L ${pt(cx, frontY)} L` : `Q ${pt(cx, hpsY + 2 * frontDrop)}`;
  const midSide = (arm[1] + hem[1]) / 2;
  const sides = `L ${pt(...R(sh[0], sh[1]))} L ${pt(...R(arm[0], arm[1]))} Q ${pt(...R(arm[0] - waist, midSide))} ${pt(...R(hem[0], hem[1]))} ` +
    `Q ${pt(cx, hem[1] + 2 * hemCurve)} ${pt(...L(hem[0], hem[1]))} Q ${pt(...L(arm[0] - waist, midSide))} ${pt(...L(arm[0], arm[1]))} L ${pt(...L(sh[0], sh[1]))} Z`;
  // Front and back both use the high back neckline; on the front, the inside of the back shows through the opening (a shade detail).
  const body = `M ${pt(...LH)} Q ${pt(cx, hpsY + 2 * backDrop)} ${pt(...RH)} ${sides}`;
  const opening = `M ${pt(...LH)} Q ${pt(cx, hpsY + 2 * backDrop)} ${pt(...RH)} ${vee ? `L ${pt(cx, frontY)} L` : `Q ${pt(cx, hpsY + 2 * frontDrop)}`} ${pt(...LH)} Z`;

  const sl = s => {
    const l = sleeveGeom(L(sh[0], sh[1]), L(arm[0], arm[1]), -1, s), r = sleeveGeom(R(sh[0], sh[1]), R(arm[0], arm[1]), 1, s);
    return { sleeveL: l.d, sleeveR: r.d, lines: [l, r] };
  };

  // Collar shapes (front view) and the band seen from the back.
  const backBand = `M ${pt(...LH)} Q ${pt(cx, hpsY + 2 * backDrop)} ${pt(...RH)} L ${pt(RH[0] + 1, RH[1] - 7)} Q ${pt(cx, hpsY - 14 + 2 * backDrop)} ${pt(LH[0] - 1, LH[1] - 7)} Z`;
  let front = null, back = backBand;
  const frontDetails = [], over = [];
  if (collar === 'rib') {
    const rib = 7;
    front = `M ${pt(...LH)} Q ${pt(cx, hpsY + 2 * frontDrop)} ${pt(...RH)} L ${pt(RH[0] + rib - 1, RH[1] + 2)} Q ${pt(cx, hpsY + 2 * (frontDrop + rib))} ${pt(LH[0] - rib + 1, LH[1] + 2)} Z ` +
      `M ${pt(...LH)} Q ${pt(cx, hpsY + 2 * backDrop)} ${pt(...RH)} L ${pt(RH[0] - 3, RH[1] + 4)} Q ${pt(cx, hpsY + 2 * backDrop + 8)} ${pt(LH[0] + 3, LH[1] + 4)} Z`;
    back = backBand;
  } else if (collar === 'v') {
    const b = 7;
    front = `M ${pt(...LH)} L ${pt(cx, frontY)} L ${pt(...RH)} L ${pt(RH[0] + b, RH[1] + 2)} L ${pt(cx, frontY + b * 1.5)} L ${pt(LH[0] - b, LH[1] + 2)} Z ` +
      `M ${pt(...LH)} Q ${pt(cx, hpsY + 2 * backDrop)} ${pt(...RH)} L ${pt(RH[0] - 3, RH[1] + 4)} Q ${pt(cx, hpsY + 2 * backDrop + 8)} ${pt(LH[0] + 3, LH[1] + 4)} Z`;
  } else if (collar === 'mandarin') {
    const band = 13;
    // Stand-up band: lower edge on the front neckline, upper edge rising gently to the back of the neck; small gap at centre front.
    const half = s => {
      const H = s < 0 ? LH : RH;
      const P = [[H[0] - s * 2, H[1] + 1], [cx + s * 12, frontY + 1], [cx + s * 2, frontY], [cx + s * 2, frontY - band], [cx + s * 14, frontY - band], [H[0] + s * 3, H[1] - 8]];
      // Both halves wound the same way, or the nonzero fill punches a hole where a half overlaps the back band.
      const [a, b, c, d, e, g] = s < 0 ? P : [P[5], P[4], P[3], P[2], P[1], P[0]];
      return `M ${pt(...a)} Q ${pt(...b)} ${pt(...c)} L ${pt(...d)} Q ${pt(...e)} ${pt(...g)} Z`;
    };
    front = `${backBand} ${half(-1)} ${half(1)}`;
  } else if (collar === 'polo' || collar === 'point') {
    // Stand behind the neck, then two leaves lying on the chest meeting at the placket.
    const spread = collar === 'polo' ? 1 : 0.8, drop = collar === 'polo' ? 34 : 38;
    const leaf = s => {
      const H = s < 0 ? LH : RH, tip = [cx + s * 30 * spread, hpsY + drop], inner = [cx + s * 3, frontY + 4];
      return `M ${pt(H[0] - s * 1, H[1] - 6)} Q ${pt(H[0] + s * 9, H[1] + 12)} ${pt(...tip)} L ${pt(...inner)} Q ${pt(cx + s * 14, hpsY + 8)} ${pt(H[0] - s * 1, H[1] - 6)} Z`;
    };
    const stand = `M ${pt(LH[0] - 1, LH[1] - 6)} Q ${pt(cx, hpsY - 12)} ${pt(RH[0] + 1, RH[1] - 6)} L ${pt(...RH)} Q ${pt(cx, hpsY + 2 * backDrop)} ${pt(...LH)} Z`;
    front = `${stand} ${leaf(-1)} ${leaf(1)}`;
    back = `M ${pt(LH[0] - 4, LH[1] + 4)} Q ${pt(cx, hpsY + 2 * backDrop + 16)} ${pt(RH[0] + 4, RH[1] + 4)} L ${pt(RH[0] + 1, RH[1] - 6)} Q ${pt(cx, hpsY - 18)} ${pt(LH[0] - 1, LH[1] - 6)} Z`;
  } else if (collar === 'notch') {
    // Lab coat: lapels folded back from a centre-front opening.
    const lap = s => {
      const H = s < 0 ? LH : RH;
      return `M ${pt(H[0], H[1] - 4)} L ${pt(cx + s * 2, hpsY + 92)} L ${pt(cx + s * 26, hpsY + 64)} L ${pt(cx + s * 34, hpsY + 40)} L ${pt(cx + s * 42, hpsY + 34)} L ${pt(H[0] + s * 8, H[1] + 4)} Z`;
    };
    front = `M ${pt(LH[0] - 1, LH[1] - 4)} Q ${pt(cx, hpsY - 16)} ${pt(RH[0] + 1, RH[1] - 4)} L ${pt(RH[0] - 3, RH[1] + 2)} Q ${pt(cx, hpsY - 6)} ${pt(LH[0] + 3, LH[1] + 2)} Z ${lap(-1)} ${lap(1)}`;
  }

  // Front-only details: neck opening, placket and buttons.
  if (collar !== 'notch') frontDetails.push({ d: opening, kind: 'shade' });
  if (placket) {
    const { top: py0 = frontY, bottom: py1, buttons = 3, width = 8 } = placket;
    frontDetails.push({ d: `M ${pt(cx - width, py0)} L ${pt(cx - width, py1)} L ${pt(cx + width, py1)} L ${pt(cx + width, py0)}`, kind: 'line' });
    const step = (py1 - py0 - 14) / Math.max(1, buttons - 1);
    for (let i = 0; i < buttons; i++) frontDetails.push({ d: dot(cx, py0 + 9 + i * step), kind: 'button', over: true });
  }
  if (coat) {
    frontDetails.push({ d: `M ${pt(cx, hpsY + 92)} L ${pt(cx, hem[1] + hemCurve)}`, kind: 'line' });
    for (let i = 0; i < 4; i++) frontDetails.push({ d: dot(cx - 8, hpsY + 104 + i * 58, 3), kind: 'button', over: true });
  }
  if (pocket) frontDetails.push({ d: `M ${pt(pocket.x + 3, pocket.y + 6)} L ${pt(pocket.x + pocket.w - 3, pocket.y + 6)}`, kind: 'seam', over: true });

  const shared = [
    { d: `M ${pt(...LH)} L ${pt(...L(sh[0], sh[1]))} M ${pt(...RH)} L ${pt(...R(sh[0], sh[1]))}`, kind: 'seam' },
    { d: `M ${pt(...L(hem[0] - 2, hem[1] - 7))} Q ${pt(cx, hem[1] - 7 + 2 * hemCurve)} ${pt(...R(hem[0] - 2, hem[1] - 7))}`, kind: 'seam' },
    ...(vents ? [{ d: `M ${pt(...L(hem[0] - 1, hem[1]))} L ${pt(...L(hem[0] - 1, hem[1] - 16))} M ${pt(...R(hem[0] - 1, hem[1]))} L ${pt(...R(hem[0] - 1, hem[1] - 16))}`, kind: 'line' }] : []),
  ];

  const pocketPath = pocket ? roundRect(pocket.x, pocket.y, pocket.w, pocket.h, 3) : null;
  const base = sl(sleeve);
  return {
    w, h, body, collar: front, pocket: pocketPath, sleeveL: base.sleeveL, sleeveR: base.sleeveR,
    sleeveSpec: { A: [L(sh[0], sh[1]), R(sh[0], sh[1])], B: [L(arm[0], arm[1]), R(arm[0], arm[1])], shape: sleeve },
    details: [...shared.map(d => ({ ...d })), ...frontDetails.map(d => ({ ...d, face: 'front' }))],
    back: { collar: back },
  };
}

// Sleeves and their stitching for a sleeve style, rebuilt from the template's own shoulder/armpit points.
function sleevesFor(base, style) {
  const shape = (SLEEVE_SHAPES[style] ?? SLEEVE_SHAPES.Short)(base.sleeveSpec.shape);
  const l = sleeveGeom(base.sleeveSpec.A[0], base.sleeveSpec.B[0], -1, shape);
  const r = sleeveGeom(base.sleeveSpec.A[1], base.sleeveSpec.B[1], 1, shape);
  const lines = style === 'Long' ? [l.hemLine, l.cuff, r.hemLine, r.cuff] : [l.hemLine, r.hemLine];
  return { sleeveL: l.d, sleeveR: r.d, sleeveDetails: [{ d: lines.join(' '), kind: 'seam', over: true }] };
}

export const SLEEVE_VARIANTS = {
  'Sleeveless': (base) => ({ ...base, sleeveL: null, sleeveR: null, sleeveDetails: [] }),
  'Short':      (base) => (base.sleeveSpec ? { ...base, ...sleevesFor(base, 'Short') } : base),
  '3/4':        (base) => {
    if (base.sleeveSpec) return { ...base, ...sleevesFor(base, '3/4') };
    const l = parseSleeve(base.sleeveL), r = parseSleeve(base.sleeveR);
    if (!l || !r) return base;
    return {
      ...base,
      sleeveL: buildSleeve({ ...l, dx:l.dx-18, dy:l.dy+28 }, -7),
      sleeveR: buildSleeve({ ...r, dx:r.dx+18, dy:r.dy+28 }, 7),
    };
  },
  'Long':       (base) => {
    if (base.sleeveSpec) return { ...base, ...sleevesFor(base, 'Long') };
    const l = parseSleeve(base.sleeveL), r = parseSleeve(base.sleeveR);
    if (!l || !r) return base;
    return {
      ...base,
      sleeveL: buildSleeve({ ...l, cx:l.cx-30, cy:l.cy+22, dx:l.dx-35, dy:l.dy+19 }, -7),
      sleeveR: buildSleeve({ ...r, cx:r.cx+30, cy:r.cy+22, dx:r.dx+35, dy:r.dy+19 }, 7),
    };
  },
};

// Bottoms: waistband, hips, crotch and legs as a flat front view.
function trousers({ w = 250, h = 420, waist = 76, waistY = 28, band = 15, hip = 84, hipY = 132, crotchY = 176, hemY = 392, hemOut = 66, hemIn = 7, fly = true, crease = true, cuffs = false, drawstring = false }) {
  const cx = w / 2, by = waistY + band;
  const body = `M ${pt(cx - waist, waistY)} L ${pt(cx + waist, waistY)} L ${pt(cx + waist + 2, by)} Q ${pt(cx + hip + 3, (by + hipY) / 2)} ${pt(cx + hip, hipY)} ` +
    `L ${pt(cx + hemOut, hemY)} L ${pt(cx + hemIn, hemY)} L ${pt(cx + 2, crotchY + 6)} Q ${pt(cx, crotchY - 4)} ${pt(cx - 2, crotchY + 6)} L ${pt(cx - hemIn, hemY)} ` +
    `L ${pt(cx - hemOut, hemY)} L ${pt(cx - hip, hipY)} Q ${pt(cx - hip - 3, (by + hipY) / 2)} ${pt(cx - waist - 2, by)} Z`;
  const legMid = (cx + hemOut + cx + hemIn) / 2 - cx;
  const details = [
    { d: `M ${pt(cx - waist - 2, by)} L ${pt(cx + waist + 2, by)}`, kind: 'line' },
    { d: [-0.72, -0.28, 0.28, 0.72].map(k => `M ${pt(cx + waist * k, waistY)} L ${pt(cx + waist * k, by + 2)}`).join(' '), kind: 'line' },
    { d: `M ${pt(cx - hemOut + 2, hemY - 7)} L ${pt(cx - hemIn - 1, hemY - 7)} M ${pt(cx + hemIn + 1, hemY - 7)} L ${pt(cx + hemOut - 2, hemY - 7)}`, kind: cuffs ? 'line' : 'seam' },
  ];
  if (drawstring) details.push({ d: `M ${pt(cx - 6, by - 4)} Q ${pt(cx - 10, by + 14)} ${pt(cx - 14, by + 22)} M ${pt(cx + 6, by - 4)} Q ${pt(cx + 10, by + 14)} ${pt(cx + 14, by + 22)}`, kind: 'line', face: 'front' });
  if (fly) details.push(
    { d: `M ${pt(cx, by)} L ${pt(cx, crotchY - 8)}`, kind: 'line', face: 'front' },
    { d: `M ${pt(cx + 11, by)} L ${pt(cx + 11, crotchY - 26)} Q ${pt(cx + 11, crotchY - 12)} ${pt(cx + 1, crotchY - 8)}`, kind: 'seam', face: 'front' },
    { d: dot(cx, waistY + band / 2, 2.4), kind: 'button', face: 'front' },
    // slanted front pockets
    { d: `M ${pt(cx - waist + 8, by)} Q ${pt(cx - waist + 14, by + 34)} ${pt(cx - hip + 2, by + 48)} M ${pt(cx + waist - 8, by)} Q ${pt(cx + waist - 14, by + 34)} ${pt(cx + hip - 2, by + 48)}`, kind: 'line', face: 'front' },
  );
  if (fly) details.push({ d: `M ${pt(cx - waist + 16, by + 26)} L ${pt(cx - 18, by + 26)} M ${pt(cx + 18, by + 26)} L ${pt(cx + waist - 16, by + 26)}`, kind: 'line', face: 'back' });
  if (crease) details.push({ d: `M ${pt(cx - legMid - 2, hipY + 10)} L ${pt(cx - legMid, hemY - 10)} M ${pt(cx + legMid + 2, hipY + 10)} L ${pt(cx + legMid, hemY - 10)}`, kind: 'fold' });
  return { w, h, body, collar: null, sleeveL: null, sleeveR: null, pocket: null, details };
}

function skirt({ w = 260, h = 360, waist = 58, waistY = 30, band = 16, hip = 78, hipY = 132, hemY = 334, hemX = 68, hemCurve = 4 }) {
  const cx = w / 2, by = waistY + band;
  const body = `M ${pt(cx - waist, waistY)} L ${pt(cx + waist, waistY)} L ${pt(cx + waist + 2, by)} Q ${pt(cx + hip + 3, (by + hipY) / 2)} ${pt(cx + hip, hipY)} ` +
    `L ${pt(cx + hemX, hemY)} Q ${pt(cx, hemY + 2 * hemCurve)} ${pt(cx - hemX, hemY)} L ${pt(cx - hip, hipY)} Q ${pt(cx - hip - 3, (by + hipY) / 2)} ${pt(cx - waist - 2, by)} Z`;
  return {
    w, h, body, collar: null, sleeveL: null, sleeveR: null, pocket: null,
    details: [
      { d: `M ${pt(cx - waist - 2, by)} L ${pt(cx + waist + 2, by)}`, kind: 'line' },
      { d: `M ${pt(cx - 30, by)} L ${pt(cx - 28, by + 44)} M ${pt(cx + 30, by)} L ${pt(cx + 28, by + 44)}`, kind: 'seam' },
      { d: `M ${pt(cx - hemX + 2, hemY - 7)} Q ${pt(cx, hemY - 7 + 2 * hemCurve)} ${pt(cx + hemX - 2, hemY - 7)}`, kind: 'seam' },
      { d: `M ${pt(cx, by)} L ${pt(cx, by + 60)}`, kind: 'line', face: 'back' },
      { d: `M ${pt(cx, hemY + hemCurve)} L ${pt(cx, hemY - 52)}`, kind: 'line', face: 'back' },
      { d: `M ${pt(cx - 18, hipY + 20)} Q ${pt(cx - 22, hemY - 80)} ${pt(cx - 26, hemY - 14)} M ${pt(cx + 18, hipY + 20)} Q ${pt(cx + 22, hemY - 80)} ${pt(cx + 26, hemY - 14)}`, kind: 'fold' },
    ],
  };
}

const POLO = { collar: 'polo', frontDrop: 18, placket: { bottom: 128, buttons: 3 }, vents: true, pocket: { x: 92, y: 120, w: 34, h: 38 } };

export const BASE_PATHS = {
  'Polo Shirt':  top(POLO),
  'School Polo': top(POLO),
  'Round Neck':  top({ collar: 'rib', frontDrop: 20, pocket: { x: 92, y: 116, w: 32, h: 36 } }),
  'T-Shirt':     top({ collar: 'rib', frontDrop: 18 }),
  'V-Neck Shirt': top({ collar: 'v', frontDrop: 46, neckW: 28 }),
  'Mandarin Collar': top({ collar: 'mandarin', frontDrop: 14, neckW: 26, placket: { top: 58, bottom: 330, buttons: 6, width: 7 } }),
  'Scrub Top':   top({ h: 390, collar: 'v', frontDrop: 52, neckW: 28, hem: [99, 344], sleeve: { angle: 38, len: 68, open: 60 }, pocket: { x: 86, y: 132, w: 44, h: 46 } }),
  'Button-Down': top({ h: 390, collar: 'point', frontDrop: 16, neckW: 26, hem: [96, 346], hemCurve: 9, placket: { top: 62, bottom: 342, buttons: 7, width: 7 }, pocket: { x: 92, y: 112, w: 32, h: 38 } }),
  'Lab Coat':    top({ w: 340, h: 440, collar: 'notch', neckW: 28, hpsY: 40, sh: [92, 62], arm: [98, 132], hem: [108, 420], hemCurve: 3, sleeve: { angle: 42, len: 70, open: 58 }, pocket: { x: 76, y: 250, w: 46, h: 54 }, coat: true }),
  'Lab Coverall': {
    w:360, h:470,
    body:    'M 88,64 L 142,28 L 180,44 L 218,28 L 272,64 L 260,100 Q 268,190 262,252 L 242,452 L 198,452 L 180,292 L 162,452 L 118,452 L 98,252 Q 92,190 100,100 Z',
    collar:  'M 142,28 L 180,44 L 218,28 L 206,54 L 180,70 L 154,54 Z',
    sleeveL: 'M 88,64 L 100,100 L 56,116 L 42,84 Q 58,74 88,64 Z',
    sleeveR: 'M 272,64 L 260,100 L 304,116 L 318,84 Q 302,74 272,64 Z',
    pocket:  'M 196,118 L 228,118 Q 232,118 232,122 L 232,158 Q 232,162 228,162 L 196,162 Q 192,162 192,158 L 192,122 Q 192,118 196,118 Z',
    details: [
      { d: 'M 180,70 L 180,292', kind: 'line', face: 'front' },
      { d: 'M 100,252 L 262,252', kind: 'seam' },
    ],
  },
  'Pants':       trousers({}),
  'Shorts':      trousers({ h: 300, hemY: 252, hemOut: 84, hemIn: 9, crotchY: 172, crease: false }),
  'Track Pants': { ...trousers({ h: 440, hemY: 408, hemOut: 58, hemIn: 7, fly: false, crease: false, cuffs: true, drawstring: true }),
    pocket: 'M 44,180 L 71,180 Q 75,180 75,184 L 75,226 Q 75,230 71,230 L 44,230 Q 40,230 40,226 L 40,184 Q 40,180 44,180 Z' },
  'Skirt':       skirt({}),
};

// Blank-canvas state (no garment dropped yet): same default canvas
// dimensions as Polo Shirt so the pane doesn't jump size the moment a
// garment lands, but every path is null so useGarmentCanvas draws
// nothing — no silent Polo Shirt placeholder standing in for "nothing
// selected yet", which is what garment==null used to fall through to
// before this guard existed (`BASE_PATHS[garment] ?? BASE_PATHS['Polo Shirt']`
// treats a missing garment exactly like an unrecognized one).
export const EMPTY_PATHS = { w: 320, h: 380, body: null, collar: null, sleeveL: null, sleeveR: null, pocket: null, details: [] };

export function getGarmentPaths(garment, sleeve = 'Short', face = 'front') {
  if (!garment) return EMPTY_PATHS;
  const base = BASE_PATHS[garment] ?? BASE_PATHS['Polo Shirt'];
  const variant = SLEEVE_VARIANTS[sleeve];
  const paths = variant ? variant(base) : base;
  const details = [...(paths.details ?? []), ...(paths.sleeveL ? paths.sleeveDetails ?? [] : [])].filter(d => !d.face || d.face === face);
  // Back view: same silhouette, no pocket; the collar is the band seen from behind where the template has one.
  return face === 'back' ? { ...paths, collar: paths.back?.collar ?? null, pocket: null, details } : { ...paths, details };
}
