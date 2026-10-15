// "Build your own" garments: a top, trousers or a skirt whose shape the customer sets with a few choices. The choices are saved in
// studio_config as cfg.custom and fed to the same generators as the VFRB templates (garmentPaths.js top() / trousers() / skirt()).
// Pure: every value is clamped here, so a saved or hand-edited config can never ask a generator for a shape it cannot draw.
// These are 2D sketches only: no 3D model exists for a custom shape, so the Studio never offers 3D for them.

export const CUSTOM_TOP = 'Custom Top';
export const CUSTOM_BOTTOM = 'Custom Bottom';
export const CUSTOM_SKIRT = 'Custom Skirt';
export const CUSTOM_GARMENTS = [CUSTOM_TOP, CUSTOM_BOTTOM, CUSTOM_SKIRT];
export const isCustom = garment => CUSTOM_GARMENTS.includes(garment);
export const CUSTOM_BADGE = 'Custom sketch';
export const CUSTOM_NO_3D = 'Custom sketch: 2D only. No 3D model exists for a shape you build yourself, so 3D is off.';

export const NECKLINES = [['v', 'V-neck'], ['round', 'Round'], ['polo', 'Polo'], ['mandarin', 'Mandarin'], ['notch', 'Notch']];
export const CUSTOM_SLEEVES = [['Sleeveless', 'None'], ['Short', 'Short'], ['3/4', '3/4'], ['Long', 'Long']];
export const HEMS = [['straight', 'Straight'], ['curved', 'Curved'], ['vents', 'Side vents']];
export const BOTTOM_STYLES = [['straight', 'Straight'], ['jogger', 'Jogger']];

// Slider ranges (whole numbers): length and fit are 0-100 % of the generator's range; rise is low (0) to high (100).
export const SLIDERS = {
  top:    { length: [0, 100], fit: [0, 100] },
  bottom: { length: [0, 100], rise: [0, 100] },
  skirt:  { length: [0, 100] },
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
export const kindOf = garment => (garment === CUSTOM_TOP ? 'top' : garment === CUSTOM_BOTTOM ? 'bottom' : garment === CUSTOM_SKIRT ? 'skirt' : null);

// One clean spec for a custom garment, or null for any other garment. Unknown keys are dropped; cuffs and drawstring exist on joggers only.
export function normalizeCustom(raw, garment) {
  const kind = kindOf(garment);
  if (!kind) return null;
  const r = raw && typeof raw === 'object' ? raw : {}, d = DEFAULT_CUSTOM[kind], s = SLIDERS[kind];
  if (kind === 'top') return { neckline: pick(r.neckline, NECKLINES, d.neckline), length: clampPct(r.length, s.length, d.length), fit: clampPct(r.fit, s.fit, d.fit), hem: pick(r.hem, HEMS, d.hem) };
  if (kind === 'skirt') return { length: clampPct(r.length, s.length, d.length) };
  const style = pick(r.style, BOTTOM_STYLES, d.style), jogger = style === 'jogger';
  return { style, length: clampPct(r.length, s.length, d.length), rise: clampPct(r.rise, s.rise, d.rise), cuffs: jogger && r.cuffs === true, drawstring: jogger && r.drawstring === true };
}

const lerp = (a, b, t) => a + (b - a) * t;

// Generator options for each kind. Numbers are the template units of garmentPaths.js (a 320 x 380 top, a 250-wide bottom).
export function topOptions(spec) {
  const s = normalizeCustom(spec, CUSTOM_TOP), t = s.length / 100, f = s.fit / 100;
  const hemY = Math.round(lerp(280, 372, t)), half = Math.round(lerp(84, 110, f)), arm = Math.round(lerp(86, 104, f));
  const neck = { v: { collar: 'v', frontDrop: 46, neckW: 28 }, round: { collar: 'rib', frontDrop: 20 }, polo: { collar: 'polo', frontDrop: 18, placket: { bottom: 128, buttons: 3 } },
    mandarin: { collar: 'mandarin', frontDrop: 14, neckW: 26, placket: { top: 58, bottom: hemY - 6, buttons: Math.max(3, Math.round((hemY - 70) / 48)), width: 7 } },
    notch: { collar: 'notch', neckW: 26, hpsY: 40, lapel: 60, coat: { buttons: Math.max(2, Math.round((hemY - 120) / 60)), step: 52 } } }[s.neckline];
  return { h: hemY + 40, ...neck, sh: [Math.round(lerp(84, 94, f)), 64], arm: [arm, 128], hem: [half, hemY], hemCurve: s.hem === 'curved' ? 10 : 2, vents: s.hem === 'vents', waist: Math.round(lerp(10, 0, f)) };
}
export function bottomOptions(spec) {
  const s = normalizeCustom(spec, CUSTOM_BOTTOM), jogger = s.style === 'jogger', t = s.length / 100;
  const waistY = 28, crotchY = Math.round(lerp(150, 200, s.rise / 100)), hemY = Math.round(lerp(crotchY + 70, 400, t)), hemOut = Math.round(lerp(84, jogger ? 50 : 64, t));
  return { h: hemY + 30, waistY, crotchY, hipY: Math.round(crotchY - 40), hemY, hemOut, hemIn: jogger ? 10 : 7, fly: !jogger, crease: !jogger, slantPockets: true,
    cuffs: jogger && s.cuffs, drawstring: jogger && s.drawstring };
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
  if (kindOf(garment) === 'top') return [`Neckline: ${label(NECKLINES, s.neckline)}`, `Length: ${s.length}%`, `Fit: ${s.fit}% (0 slim, 100 loose)`, `Hem: ${label(HEMS, s.hem)}`];
  if (kindOf(garment) === 'skirt') return [`Length: ${s.length}%`];
  return [`Style: ${label(BOTTOM_STYLES, s.style)}`, `Length: ${s.length}%`, `Rise: ${s.rise}% (0 low, 100 high)`, ...(s.style === 'jogger' ? [`Cuffs: ${s.cuffs ? 'yes' : 'no'}`, `Drawstring: ${s.drawstring ? 'yes' : 'no'}`] : [])];
}
