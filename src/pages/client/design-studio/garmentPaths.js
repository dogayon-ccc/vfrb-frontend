// Garment SVG path data, extracted from DesignStudio.jsx.
// Sleeve paths are 4 points (shoulder, armpit, outer-hem, outer-cap) closed
// with a curve back to the shoulder point. Parse/rebuild instead of regex
// string-patching — patching broke silently the moment the cap edge became
// a curve instead of a straight "L x,y Z" (no crash, just stopped matching).
function parseSleeve(str) {
  if (!str) return null;
  const n = str.match(/-?\d+(\.\d+)?/g).map(Number);
  return { ax:n[0], ay:n[1], bx:n[2], by:n[3], cx:n[4], cy:n[5], dx:n[6], dy:n[7] };
}
function buildSleeve(p, bow) {
  const mx = (p.dx + p.ax) / 2 + bow, my = (p.dy + p.ay) / 2;
  return `M ${p.ax},${p.ay} L ${p.bx},${p.by} L ${p.cx},${p.cy} L ${p.dx},${p.dy} Q ${mx},${my} ${p.ax},${p.ay} Z`;
}

export const SLEEVE_VARIANTS = {
  'Sleeveless': (base) => ({ ...base, sleeveL: null, sleeveR: null }),
  'Short':      (base) => base,
  '3/4':        (base) => {
    const l = parseSleeve(base.sleeveL), r = parseSleeve(base.sleeveR);
    if (!l || !r) return base;
    return {
      ...base,
      sleeveL: buildSleeve({ ...l, dx:l.dx-18, dy:l.dy+28 }, -7),
      sleeveR: buildSleeve({ ...r, dx:r.dx+18, dy:r.dy+28 }, 7),
    };
  },
  'Long':       (base) => {
    const l = parseSleeve(base.sleeveL), r = parseSleeve(base.sleeveR);
    if (!l || !r) return base;
    return {
      ...base,
      sleeveL: buildSleeve({ ...l, cx:l.cx-30, cy:l.cy+22, dx:l.dx-35, dy:l.dy+19 }, -7),
      sleeveR: buildSleeve({ ...r, cx:r.cx+30, cy:r.cy+22, dx:r.dx+35, dy:r.dy+19 }, 7),
    };
  },
};

export const BASE_PATHS = {
  'Polo Shirt': {
    w:320, h:380,
    body:    'M 82,62 L 132,30 L 160,56 L 188,30 L 238,62 L 228,94 Q 236,208 228,332 Q 160,342 92,332 Q 84,208 92,94 Z',
    collar:  'M 132,30 Q 146,48 160,56 Q 174,48 188,30 L 178,50 L 160,62 L 142,50 Z',
    sleeveL: 'M 82,62 L 92,94 L 50,108 L 36,76 Q 52,69 82,62 Z',
    sleeveR: 'M 238,62 L 228,94 L 270,108 L 284,76 Q 268,69 238,62 Z',
    pocket:  'M 108,122 L 134,122 Q 138,122 138,126 L 138,156 Q 138,160 134,160 L 108,160 Q 104,160 104,156 L 104,126 Q 104,122 108,122 Z',
  },
  'School Polo': {
    w:320, h:380,
    body:    'M 80,64 L 130,32 L 160,58 L 190,32 L 240,64 L 230,96 Q 238,210 230,334 Q 160,344 90,334 Q 82,210 90,96 Z',
    collar:  'M 130,32 Q 145,50 160,58 Q 175,50 190,32 L 180,52 L 160,64 L 140,52 Z',
    sleeveL: 'M 80,64 L 90,96 L 48,110 L 34,78 Q 50,71 80,64 Z',
    sleeveR: 'M 240,64 L 230,96 L 272,110 L 286,78 Q 270,71 240,64 Z',
    pocket:  'M 106,120 L 132,120 Q 136,120 136,124 L 136,154 Q 136,158 132,158 L 106,158 Q 102,158 102,154 L 102,124 Q 102,120 106,120 Z',
  },
  'Round Neck': {
    w:320, h:380,
    body:    'M 80,60 L 130,30 L 160,44 L 190,30 L 240,60 L 230,90 Q 238,206 230,330 Q 160,340 90,330 Q 82,206 90,90 Z',
    collar:  'M 138,40 Q 160,56 182,40 Q 174,28 160,26 Q 146,28 138,40 Z',
    sleeveL: 'M 80,60 L 90,90 L 48,106 L 34,74 Q 50,67 80,60 Z',
    sleeveR: 'M 240,60 L 230,90 L 272,106 L 286,74 Q 270,67 240,60 Z',
    pocket:  'M 106,116 L 130,116 Q 134,116 134,120 L 134,150 Q 134,154 130,154 L 106,154 Q 102,154 102,150 L 102,120 Q 102,116 106,116 Z',
  },
  'T-Shirt': {
    w:320, h:380,
    body:    'M 82,62 L 130,32 Q 160,50 190,32 L 238,62 L 228,92 Q 234,210 228,336 Q 160,346 92,336 Q 86,210 92,92 Z',
    collar:  'M 130,32 Q 160,50 190,32 L 186,42 Q 160,60 134,42 Z',
    sleeveL: 'M 82,62 L 92,92 L 50,108 L 36,76 Q 52,69 82,62 Z',
    sleeveR: 'M 238,62 L 228,92 L 270,108 L 284,76 Q 268,69 238,62 Z',
    pocket:  null,
  },
  'V-Neck Shirt': {
    w:320, h:380,
    body:    'M 78,60 L 128,28 L 160,82 L 192,28 L 242,60 L 232,90 Q 240,210 232,334 Q 160,344 88,334 Q 80,210 88,90 Z',
    collar:  'M 128,28 L 160,82 L 192,28 L 182,50 L 160,80 L 138,50 Z',
    sleeveL: 'M 78,60 L 88,90 L 46,106 L 32,74 Q 48,67 78,60 Z',
    sleeveR: 'M 242,60 L 232,90 L 274,106 L 288,74 Q 272,67 242,60 Z',
    pocket:  null,
  },
  'Mandarin Collar': {
    w:320, h:380,
    body:    'M 80,60 L 132,28 L 160,38 L 188,28 L 240,60 L 230,90 Q 238,208 230,332 Q 160,342 90,332 Q 82,208 90,90 Z',
    collar:  'M 145,38 L 175,38 L 179,60 L 160,66 L 141,60 Z',
    sleeveL: 'M 80,60 L 90,90 L 47,106 L 33,74 Q 49.5,67 80,60 Z',
    sleeveR: 'M 240,60 L 230,90 L 273,106 L 287,74 Q 270.5,67 240,60 Z',
    pocket:  null,
  },
  'Scrub Top': {
    w:320, h:390,
    body:    'M 78,60 L 130,26 L 160,64 L 190,26 L 242,60 L 232,90 Q 240,215 232,340 Q 160,350 88,340 Q 80,215 88,90 Z',
    collar:  'M 138,38 L 182,38 L 186,60 L 160,68 L 134,60 Z',
    sleeveL: 'M 78,60 L 88,90 L 46,106 L 32,74 Q 48,67 78,60 Z',
    sleeveR: 'M 242,60 L 232,90 L 274,106 L 288,74 Q 272,67 242,60 Z',
    pocket:  'M 104,118 L 140,118 Q 144,118 144,122 L 144,166 Q 144,170 140,170 L 104,170 Q 100,170 100,166 L 100,122 Q 100,118 104,118 Z',
  },
  'Lab Coat': {
    w:340, h:440,
    body:    'M 70,60 L 130,24 L 170,24 L 170,380 L 85,380 Q 62,210 70,60 Z M 170,24 L 210,24 L 270,60 Q 262,210 255,340 L 170,380 Z',
    collar:  'M 130,24 L 160,28 L 160,60 L 148,56 Z M 170,24 L 200,24 L 192,56 L 180,60 L 180,28 Z',
    sleeveL: 'M 70,60 L 85,90 L 30,110 L 15,78 Q 35.5,69 70,60 Z',
    sleeveR: 'M 270,60 L 255,90 L 310,110 L 325,78 Q 304.5,69 270,60 Z',
    pocket:  'M 100,180 L 142,180 Q 146,180 146,184 L 146,236 Q 146,240 142,240 L 100,240 Q 96,240 96,236 L 96,184 Q 96,180 100,180 Z',
  },
  'Lab Coverall': {
    w:360, h:470,
    body:    'M 88,64 L 142,28 L 180,44 L 218,28 L 272,64 L 260,100 Q 268,190 262,252 L 242,452 L 198,452 L 180,292 L 162,452 L 118,452 L 98,252 Q 92,190 100,100 Z',
    collar:  'M 142,28 L 180,44 L 218,28 L 206,54 L 180,70 L 154,54 Z',
    sleeveL: 'M 88,64 L 100,100 L 56,116 L 42,84 Q 58,74 88,64 Z',
    sleeveR: 'M 272,64 L 260,100 L 304,116 L 318,84 Q 302,74 272,64 Z',
    pocket:  'M 196,118 L 228,118 Q 232,118 232,122 L 232,158 Q 232,162 228,162 L 196,162 Q 192,162 192,158 L 192,122 Q 192,118 196,118 Z',
  },
  'Button-Down': {
    w:320, h:390,
    body:    'M 78,58 L 130,26 L 160,36 L 190,26 L 242,58 L 232,90 Q 240,212 232,336 Q 160,346 88,336 Q 80,212 88,90 Z',
    collar:  'M 130,26 L 150,36 L 160,34 L 170,36 L 190,26 L 180,50 L 160,60 L 140,50 Z',
    sleeveL: 'M 78,58 L 88,90 L 44,106 L 30,72 Q 47,65 78,58 Z',
    sleeveR: 'M 242,58 L 232,90 L 276,106 L 290,72 Q 273,65 242,58 Z',
    pocket:  'M 104,118 L 132,118 Q 136,118 136,122 L 136,154 Q 136,158 132,158 L 104,158 Q 100,158 100,154 L 100,122 Q 100,118 104,118 Z',
  },
  'Pants': {
    w:250, h:420,
    body:    'M 48,30 L 202,30 L 210,200 L 165,385 L 130,385 L 125,215 L 120,385 L 85,385 L 40,200 Z',
    collar:  null,
    sleeveL: null, sleeveR: null, pocket: null,
  },
  'Shorts': {
    w:250, h:300,
    body:    'M 48,30 L 202,30 L 208,140 L 178,248 L 138,248 L 125,160 L 112,248 L 72,248 L 42,140 Z',
    collar:  null,
    sleeveL: null, sleeveR: null, pocket: null,
  },
  'Track Pants': {
    w:250, h:440,
    body:    'M 44,26 L 206,26 L 216,210 L 168,400 L 128,400 L 125,220 L 122,400 L 82,400 L 34,210 Z',
    collar:  null,
    sleeveL: null, sleeveR: null, pocket: 'M 44,180 L 71,180 Q 75,180 75,184 L 75,226 Q 75,230 71,230 L 44,230 Q 40,230 40,226 L 40,184 Q 40,180 44,180 Z',
  },
  'Skirt': {
    w:260, h:360,
    body:    'M 70,30 L 190,30 L 230,50 Q 244,196 250,340 Q 130,350 10,340 Q 16,196 30,50 Z',
    collar:  null,
    sleeveL: null, sleeveR: null, pocket: null,
  },
};

// Blank-canvas state (no garment dropped yet): same default canvas
// dimensions as Polo Shirt so the pane doesn't jump size the moment a
// garment lands, but every path is null so useGarmentCanvas draws
// nothing — no silent Polo Shirt placeholder standing in for "nothing
// selected yet", which is what garment==null used to fall through to
// before this guard existed (`BASE_PATHS[garment] ?? BASE_PATHS['Polo Shirt']`
// treats a missing garment exactly like an unrecognized one).
export const EMPTY_PATHS = { w: 320, h: 380, body: null, collar: null, sleeveL: null, sleeveR: null, pocket: null };

export function getGarmentPaths(garment, sleeve = 'Short', face = 'front') {
  if (!garment) return EMPTY_PATHS;
  const base = BASE_PATHS[garment] ?? BASE_PATHS['Polo Shirt'];
  const variant = SLEEVE_VARIANTS[sleeve];
  const paths = variant ? variant(base) : base;
  // Back view: same silhouette, no collar flap or pocket (nothing back there to draw).
  return face === 'back' ? { ...paths, collar: null, pocket: null } : paths;
}
