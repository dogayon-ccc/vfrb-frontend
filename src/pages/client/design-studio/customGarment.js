// "Build your own" garments: a top, trousers or a skirt whose shape the customer sets with a few choices. The choices are saved in
// studio_config as cfg.custom and fed to the same generators as the VFRB templates (garmentPaths.js top() / trousers() / skirt()).
// Pure: every value is clamped here, so a saved or hand-edited config can never ask a generator for a shape it cannot draw.
// 3D is a parametric approximation built from the same choices (customMesh3D.js, docs/engineering/ADR-custom-3d.md), labelled "3D (approx.)".

export const CUSTOM_TOP = 'Custom Top';
export const CUSTOM_BOTTOM = 'Custom Bottom';
export const CUSTOM_SKIRT = 'Custom Skirt';
export const CUSTOM_GARMENTS = [CUSTOM_TOP, CUSTOM_BOTTOM, CUSTOM_SKIRT];
export const isCustom = garment => CUSTOM_GARMENTS.includes(garment);

// Rebuilt families (2026-10-16): named garments drawn by the same parametric generators, each with its own construction and a few
// editable measurements saved in cfg.custom. They replace pieces that were cut from fused set scans (derivedFamilies REMOVED_DERIVED),
// so no scan geometry is reused. kind 'tailored' = tailored trousers (fly, waistband button, belt loops, slant and welt pockets, crease).
export const PANTSUIT_TROUSERS = 'Pantsuit Trousers';
export const PARAM_FAMILIES = {
  [PANTSUIT_TROUSERS]: { kind: 'tailored', category: 'Corporate', role: 'bottom', fit: 'female', ref: 'pantsuit-notch-short-gray', templateId: 'pantsuit-trousers',
    defaults: { length: 100, rise: 60, width: 45, crease: true, beltLoops: true, turnUp: false } },
  // Men's cut: straighter hip (hip 80 against 84), a little lower rise and a fuller leg.
  "Men's Slacks": { kind: 'tailored', category: 'Corporate', role: 'bottom', fit: 'male', ref: 'polo-barong-brown', templateId: 'mens-slacks', hip: 80,
    defaults: { length: 100, rise: 50, width: 55, crease: true, beltLoops: true, turnUp: false } },
  // Women's slim ankle trouser with a sharp crease.
  'Creased Trousers': { kind: 'tailored', category: 'Corporate', role: 'bottom', fit: 'female', ref: 'blouse-roundneck-mustard', templateId: 'creased-trousers',
    defaults: { length: 70, rise: 65, width: 25, crease: true, beltLoops: true, turnUp: false } },
  // Pencil skirt on the parametric skirt (waistband, hip-to-hem taper, hem band), midi by default.
  'Midi Pencil Skirt': { kind: 'skirt', category: 'Corporate', role: 'bottom', fit: 'female', ref: 'peplum-set-navy', templateId: 'midi-pencil-skirt',
    defaults: { length: 78 } },
  // Tops: the parametric top with the family's own collar, closure and details. `fixed` spec keys are construction, not choices;
  // `extra` adds the family's own sliders; `opts(o, s)` adds its construction to the generator options (2D and 3D read the same).
  'Short-Sleeve Notch Jacket': { kind: 'top', category: 'Corporate', role: 'top', fit: 'female', ref: 'pantsuit-notch-short-gray', templateId: 'short-sleeve-notch-jacket',
    sleeves: ['Short'], fixed: { neckline: 'notch', hem: 'straight' }, defaults: { neckline: 'notch', length: 40, fit: 45, hem: 'straight' },
    opts: o => ({ lapel: 74, frontDrop: 74, openFront: true, waist: 6, coat: { buttons: 2, step: 46 }, flaps: { x0: 30, w: 44, y: o.hem[1] - 64 } }) },
  // Fitted bodice to a waist seam, then a flared peplum; round neck, back zip.
  'Peplum Top': { kind: 'top', category: 'Corporate', role: 'top', fit: 'female', ref: 'peplum-set-navy', templateId: 'peplum-top',
    sleeves: ['Short'], fixed: { neckline: 'round', hem: 'straight' }, defaults: { neckline: 'round', length: 35, fit: 35, hem: 'straight', flare: 60 },
    extra: { flare: { range: [0, 100], label: 'Peplum flare', ends: ['Soft', 'Full'] } },
    opts: (o, s) => {
      const y = o.hem[1] - 84, half = o.arm[0] - 18;   // waist seam 84 units above the hem, bodice taken in to it
      return { waist: 0, hemCurve: 4, peplum: { y, half }, hem: [Math.round(half + lerp(16, 56, s.flare / 100)), o.hem[1]], backZip: { bottom: y } };
    } },
  // Barong-style shirt: point collar on a half placket (four buttons), straight hem with side slits, short or long sleeves.
  'Barong Shirt': { kind: 'top', category: 'Corporate', role: 'top', fit: 'male', ref: 'polo-barong-brown', templateId: 'barong-shirt',
    sleeves: ['Short', 'Long'], fixed: { neckline: 'point', hem: 'vents' }, defaults: { neckline: 'point', length: 70, fit: 50, hem: 'vents' },
    opts: () => ({ placket: { top: 62, bottom: 186, buttons: 4, width: 7 } }) },
};
export const isParamFamily = garment => !!PARAM_FAMILIES[garment];
// Any garment whose shape comes from a spec (build-your-own or a rebuilt family).
export const isParametric = garment => isCustom(garment) || isParamFamily(garment);
export const CUSTOM_BADGE = 'Custom sketch';
export const CUSTOM_3D_NOTE = 'Custom sketch: 3D (approx.) is built from your choices; shape and drape are approximate.';

export const NECKLINES = [['v', 'V-neck'], ['round', 'Round'], ['polo', 'Polo'], ['point', 'Point collar'], ['mandarin', 'Mandarin'], ['notch', 'Notch']];
export const CUSTOM_SLEEVES = [['Sleeveless', 'None'], ['Short', 'Short'], ['3/4', '3/4'], ['Long', 'Long']];
export const HEMS = [['straight', 'Straight'], ['curved', 'Curved'], ['vents', 'Side vents']];
export const BOTTOM_STYLES = [['straight', 'Straight'], ['jogger', 'Jogger']];

// Slider ranges (whole numbers): length and fit are 0-100 % of the generator's range; rise is low (0) to high (100).
export const SLIDERS = {
  top:    { length: [0, 100], fit: [0, 100] },
  bottom: { length: [0, 100], rise: [0, 100] },
  skirt:  { length: [0, 100] },
  tailored: { length: [0, 100], rise: [0, 100], width: [0, 100] },
};
const pick = (v, list, dflt) => (list.some(([id]) => id === v) ? v : dflt);
export const clampPct = (v, [lo, hi] = [0, 100], dflt = 50) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n))) : dflt;
};

export const DEFAULT_CUSTOM = {
  top: { neckline: 'v', length: 50, fit: 50, hem: 'straight' },
  bottom: { style: 'straight', length: 100, rise: 50, cuffs: false, drawstring: false },
  skirt: { length: 50 },
};
export const kindOf = garment => (garment === CUSTOM_TOP ? 'top' : garment === CUSTOM_BOTTOM ? 'bottom' : garment === CUSTOM_SKIRT ? 'skirt' : PARAM_FAMILIES[garment]?.kind ?? null);
const defaultsFor = garment => PARAM_FAMILIES[garment]?.defaults ?? DEFAULT_CUSTOM[kindOf(garment)];
const bool = (v, dflt) => (typeof v === 'boolean' ? v : dflt);

// One clean spec for a custom garment, or null for any other garment. Unknown keys are dropped; cuffs and drawstring exist on joggers only.
export function normalizeCustom(raw, garment) {
  const kind = kindOf(garment);
  if (!kind) return null;
  const r = raw && typeof raw === 'object' ? raw : {}, d = defaultsFor(garment), s = SLIDERS[kind];
  if (kind === 'top') {
    const fam = PARAM_FAMILIES[garment];
    const out = { neckline: pick(r.neckline, NECKLINES, d.neckline), length: clampPct(r.length, s.length, d.length), fit: clampPct(r.fit, s.fit, d.fit), hem: pick(r.hem, HEMS, d.hem) };
    for (const [k, x] of Object.entries(fam?.extra ?? {})) out[k] = clampPct(r[k], x.range, d[k]);
    return { ...out, ...(fam?.fixed ?? {}) };
  }
  if (kind === 'skirt') return { length: clampPct(r.length, s.length, d.length) };
  if (kind === 'tailored') return { length: clampPct(r.length, s.length, d.length), rise: clampPct(r.rise, s.rise, d.rise), width: clampPct(r.width, s.width, d.width),
    crease: bool(r.crease, d.crease), beltLoops: bool(r.beltLoops, d.beltLoops), turnUp: bool(r.turnUp, d.turnUp) };
  const style = pick(r.style, BOTTOM_STYLES, d.style), jogger = style === 'jogger';
  return { style, length: clampPct(r.length, s.length, d.length), rise: clampPct(r.rise, s.rise, d.rise), cuffs: jogger && r.cuffs === true, drawstring: jogger && r.drawstring === true };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Generator options for each kind. Numbers are the template units of garmentPaths.js (a 320 x 380 top, a 250-wide bottom).
export function topOptions(spec) {
  const s = normalizeCustom(spec, CUSTOM_TOP), t = s.length / 100, f = s.fit / 100;
  const hemY = Math.round(lerp(280, 372, t)), half = Math.round(lerp(84, 110, f)), arm = Math.round(lerp(86, 104, f));
  const neck = { v: { collar: 'v', frontDrop: 46, neckW: 28 }, round: { collar: 'rib', frontDrop: 20 }, polo: { collar: 'polo', frontDrop: 18, placket: { bottom: 128, buttons: 3 } },
    point: { collar: 'point', frontDrop: 16, neckW: 26, placket: { top: 62, bottom: hemY - 4, buttons: Math.max(4, Math.round((hemY - 70) / 44)), width: 7 } },
    mandarin: { collar: 'mandarin', frontDrop: 14, neckW: 26, placket: { top: 58, bottom: hemY - 6, buttons: Math.max(3, Math.round((hemY - 70) / 48)), width: 7 } },
    notch: { collar: 'notch', neckW: 26, hpsY: 40, lapel: 60, coat: { buttons: Math.max(2, Math.round((hemY - 120) / 60)), step: 52 } } }[s.neckline];
  return { h: hemY + 40, ...neck, sh: [Math.round(lerp(84, 94, f)), 64], arm: [arm, 128], hem: [half, hemY], hemCurve: s.hem === 'curved' ? 10 : 2, vents: s.hem === 'vents', waist: Math.round(lerp(10, 0, f)) };
}
// Top options for any top: build-your-own, or a family with its own construction added (PARAM_FAMILIES opts).
export function topOptionsFor(spec, garment = CUSTOM_TOP) {
  const s = normalizeCustom(spec, garment), o = topOptions(s), fam = PARAM_FAMILIES[garment];
  return fam?.opts ? { ...o, ...fam.opts(o, s), closures3D: true } : o; // closures3D: buttons and edges also in 3D (rebuilt families only)
}
export function bottomOptions(spec) {
  const s = normalizeCustom(spec, CUSTOM_BOTTOM), jogger = s.style === 'jogger', t = s.length / 100;
  const waistY = 28, crotchY = Math.round(lerp(150, 200, s.rise / 100)), hemY = Math.round(lerp(crotchY + 70, 400, t)), hemOut = Math.round(lerp(84, jogger ? 50 : 64, t));
  return { h: hemY + 30, waistY, crotchY, hipY: Math.round(crotchY - 40), hemY, hemOut, hemIn: jogger ? 10 : 7, fly: !jogger, crease: !jogger, slantPockets: true,
    cuffs: jogger && s.cuffs, drawstring: jogger && s.drawstring };
}
// Tailored trousers: full-length by default (length 0 = ankle), leg opening from slim to wide, always a fly, waistband button,
// slant front pockets, back welts and back darts; crease, belt loops and turn-ups are choices.
export function tailoredOptions(spec, garment = PANTSUIT_TROUSERS) {
  const s = normalizeCustom(spec, garment), t = s.length / 100;
  const waistY = 28, crotchY = Math.round(lerp(162, 194, s.rise / 100)), hemY = Math.round(lerp(crotchY + 160, 400, t)), hemIn = 7;
  // waist 70 (Pants: 76): a tailored waist sits inside a jacket or top hem in a set, and gives a truer waist-to-hip shape.
  return { h: hemY + 30, waistY, crotchY, hipY: Math.round(crotchY - 40), waist: 70, hip: PARAM_FAMILIES[garment]?.hip ?? 84, hemY, hemOut: Math.round(lerp(56, 74, s.width / 100)), hemIn, fly: true, crease: s.crease,
    slantPockets: true, beltLoops: s.beltLoops, turnUp: s.turnUp, welts: true, darts: true, tailored: true };
}
export function skirtOptions(spec) {
  const s = normalizeCustom(spec, CUSTOM_SKIRT), t = s.length / 100;
  const hemY = Math.round(lerp(200, 400, t));
  return { h: hemY + 26, hemY, hipY: Math.min(128, Math.round(hemY * 0.45)), hemX: Math.round(lerp(76, 62, t)) };
}

// Customer-facing summary lines (spec sheet, admin order view).
export function describeCustom(garment, spec) {
  const s = normalizeCustom(spec, garment);
  if (!s) return [];
  const label = (list, v) => list.find(([id]) => id === v)?.[1] ?? v;
  if (kindOf(garment) === 'top') return [`Neckline: ${label(NECKLINES, s.neckline)}`, `Length: ${s.length}%`, `Fit: ${s.fit}% (0 slim, 100 loose)`, `Hem: ${label(HEMS, s.hem)}`,
    ...Object.entries(PARAM_FAMILIES[garment]?.extra ?? {}).map(([k, x]) => `${x.label}: ${s[k]}% (0 ${x.ends[0].toLowerCase()}, 100 ${x.ends[1].toLowerCase()})`)];
  if (kindOf(garment) === 'skirt') return [`Length: ${s.length}%`];
  if (kindOf(garment) === 'tailored') return [`Length: ${s.length}% (0 ankle, 100 full)`, `Rise: ${s.rise}% (0 low, 100 high)`, `Leg opening: ${s.width}% (0 slim, 100 wide)`,
    `Crease: ${s.crease ? 'yes' : 'no'}`, `Belt loops: ${s.beltLoops ? 'yes' : 'no'}`, `Turn-ups: ${s.turnUp ? 'yes' : 'no'}`];
  return [`Style: ${label(BOTTOM_STYLES, s.style)}`, `Length: ${s.length}%`, `Rise: ${s.rise}% (0 low, 100 high)`, ...(s.style === 'jogger' ? [`Cuffs: ${s.cuffs ? 'yes' : 'no'}`, `Drawstring: ${s.drawstring ? 'yes' : 'no'}`] : [])];
}
