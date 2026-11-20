// Technical specifications of a fabric: parsing the GET shape and building the PUT payload.
// Rules mirror backend MaterialSpec / InventoryController: null = unknown (never 0), only changed fields are sent,
// one spec_source/spec_reference per request, any value write clears verification unless spec_verified:true is sent.

export const SPEC_SOURCES = [
  ['supplier_datasheet', 'Supplier datasheet'],
  ['lab_test', 'Lab test'],
  ['vfrb_measured', 'Measured by VFRB'],
  ['import', 'Data import'],
  ['other', 'Other'],
] as const;
export type SpecSource = typeof SPEC_SOURCES[number][0];

export const CONSTRUCTIONS = ['woven', 'knit', 'nonwoven'] as const;
export const DIRECTIONS = ['lengthwise', 'crosswise', 'both'] as const;
export const MAX_FIBERS = 8;

export type Fiber = { fiber: string; pct: number };
export type Provenance = Record<string, { source?: string; reference?: string | null; recorded_at?: string }>;

type NumKey = 'gsm' | 'usable_width_cm' | 'stretch_pct' | 'shrinkage_pct' | 'colourfastness_grade';

// Backend ranges (MaterialSpec::NUMERIC), in canonical units.
export const NUMERIC: Record<NumKey, { label: string; unit: string; min: number; max: number }> = {
  gsm: { label: 'Weight', unit: 'gsm', min: 20, max: 1000 },
  usable_width_cm: { label: 'Usable width', unit: 'cm', min: 20, max: 400 },
  stretch_pct: { label: 'Stretch', unit: '%', min: 0, max: 300 },
  shrinkage_pct: { label: 'Shrinkage', unit: '%', min: -10, max: 30 },
  colourfastness_grade: { label: 'Colourfastness', unit: 'grade 1-5', min: 1, max: 5 },
};

export const OZ_YD2_TO_GSM = 33.9057;
export const TO_CM = { cm: 1, in: 2.54, m: 100 } as const;
export type GsmUnit = 'gsm' | 'oz_yd2';
export type WidthUnit = keyof typeof TO_CM;

// What the API returns for one material (spec columns only). Decimals arrive as strings; JSON columns as strings.
export type SpecRow = {
  fiber_composition?: unknown;
  gsm?: string | number | null;
  usable_width_cm?: string | number | null;
  stretch_pct?: string | number | null;
  stretch_direction?: string | null;
  construction?: string | null;
  finish?: string | null;
  shrinkage_pct?: string | number | null;
  colourfastness_grade?: string | number | null;
  spec_provenance?: unknown;
  spec_verified_at?: string | null;
  spec_verified_by?: number | string | null;
};

// Stored specs in editable form: every text is '' when unknown.
export type SpecForm = {
  fibers: { fiber: string; pct: string }[];
  gsm: string; gsm_unit: GsmUnit;
  usable_width: string; usable_width_unit: WidthUnit;
  stretch_pct: string; stretch_direction: string;
  construction: string;
  finish: string;
  shrinkage_pct: string;
  colourfastness_grade: string;
  spec_source: SpecSource | '';
  spec_reference: string;
};

export function parseJson<T>(raw: unknown): T | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw as T;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function parseFibers(raw: unknown): Fiber[] {
  const v = parseJson<unknown>(raw);
  if (!Array.isArray(v)) return [];
  return v
    .map((f) => ({ fiber: String(f?.fiber ?? '').trim(), pct: Number(f?.pct) }))
    .filter((f) => f.fiber && Number.isFinite(f.pct));
}

export function parseProvenance(raw: unknown): Provenance {
  const v = parseJson<Provenance>(raw);
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

// null/undefined/'' are unknown. Never coerced to 0.
export function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const txt = (v: unknown) => (v == null ? '' : String(v));
const round1 = (x: number) => Math.round(x * 10) / 10;
const same = (a: number | null, b: number | null) => a === b;

export const hasAnySpec = (r: SpecRow | null | undefined): boolean =>
  !!r && (parseFibers(r.fiber_composition).length > 0
    || ['gsm', 'usable_width_cm', 'stretch_pct', 'shrinkage_pct', 'colourfastness_grade'].some((k) => num((r as any)[k]) !== null)
    || !!r.stretch_direction || !!r.construction || !!(r.finish && String(r.finish).trim()));

export type SpecState = 'none' | 'unverified' | 'verified';
export function specState(r: SpecRow | null | undefined): SpecState {
  if (!hasAnySpec(r)) return 'none';
  return r?.spec_verified_at ? 'verified' : 'unverified';
}

export function toForm(r: SpecRow | null | undefined): SpecForm {
  return {
    fibers: parseFibers(r?.fiber_composition).map((f) => ({ fiber: f.fiber, pct: String(f.pct) })),
    gsm: txt(num(r?.gsm)), gsm_unit: 'gsm',
    usable_width: txt(num(r?.usable_width_cm)), usable_width_unit: 'cm',
    stretch_pct: txt(num(r?.stretch_pct)), stretch_direction: txt(r?.stretch_direction),
    construction: txt(r?.construction),
    finish: txt(r?.finish),
    shrinkage_pct: txt(num(r?.shrinkage_pct)), colourfastness_grade: txt(num(r?.colourfastness_grade)),
    // Source is per request, not per saved value: start empty so it is chosen deliberately for each save.
    spec_source: '', spec_reference: '',
  };
}

// Entered value converted to the stored unit and rounded like the backend (1 decimal). null = unknown.
export function canonGsm(f: Pick<SpecForm, 'gsm' | 'gsm_unit'>): number | null {
  const n = num(f.gsm);
  return n === null ? null : round1(f.gsm_unit === 'oz_yd2' ? n * OZ_YD2_TO_GSM : n);
}
export function canonWidth(f: Pick<SpecForm, 'usable_width' | 'usable_width_unit'>): number | null {
  const n = num(f.usable_width);
  return n === null ? null : round1(n * TO_CM[f.usable_width_unit]);
}
const canonPlain = (s: string): number | null => { const n = num(s); return n === null ? null : round1(n); };

const fiberKey = (list: Fiber[]) => list.map((f) => `${f.fiber}:${f.pct}`).sort().join('|');

export type Issue = { field: string; message: string };

// Client-side mirror of the server's rules, for an inline preview. The server stays the authority (422 is shown too).
export function validate(form: SpecForm): Issue[] {
  const out: Issue[] = [];
  const range = (k: NumKey, v: number | null) => {
    const r = NUMERIC[k];
    if (v !== null && (v < r.min || v > r.max)) out.push({ field: k, message: `${r.label} must be between ${r.min} and ${r.max} ${r.unit}.` });
  };
  for (const [k, raw] of [['gsm', form.gsm], ['usable_width_cm', form.usable_width], ['stretch_pct', form.stretch_pct], ['shrinkage_pct', form.shrinkage_pct], ['colourfastness_grade', form.colourfastness_grade]] as const) {
    if (raw.trim() !== '' && num(raw) === null) out.push({ field: k, message: `${NUMERIC[k].label} must be a number.` });
  }
  range('gsm', canonGsm(form)); range('usable_width_cm', canonWidth(form));
  range('stretch_pct', canonPlain(form.stretch_pct)); range('shrinkage_pct', canonPlain(form.shrinkage_pct)); range('colourfastness_grade', canonPlain(form.colourfastness_grade));

  const rows = form.fibers.filter((f) => f.fiber.trim() !== '' || f.pct.trim() !== '');
  if (rows.length > MAX_FIBERS) out.push({ field: 'fiber_composition', message: `At most ${MAX_FIBERS} fibres.` });
  if (rows.length) {
    const names = new Set<string>(); let sum = 0; let bad = false;
    for (const r of rows) {
      const p = num(r.pct); const n = r.fiber.trim().toLowerCase();
      if (!n || p === null || p <= 0 || p > 100) { bad = true; continue; }
      if (names.has(n)) out.push({ field: 'fiber_composition', message: `Fibre "${n}" is listed twice.` });
      names.add(n); sum += p;
    }
    if (bad) out.push({ field: 'fiber_composition', message: 'Each fibre needs a name and a percentage above 0 and up to 100.' });
    else if (Math.abs(sum - 100) > 0.5) out.push({ field: 'fiber_composition', message: `Fibre percentages total ${round1(sum)}, they must total 100.` });
  }
  if (form.finish.trim().length > 60) out.push({ field: 'finish', message: 'Finish is at most 60 characters.' });
  const stretchNow = canonPlain(form.stretch_pct);
  if (form.stretch_direction && stretchNow === null) out.push({ field: 'stretch_direction', message: 'Direction needs a stretch value. Clear both to mark stretch unknown.' });
  return out;
}

// Which spec attributes differ from what is stored.
export function changedFields(form: SpecForm, stored: SpecForm): string[] {
  const c: string[] = [];
  if (!same(canonGsm(form), canonGsm(stored))) c.push('gsm');
  if (!same(canonWidth(form), canonWidth(stored))) c.push('usable_width');
  if (!same(canonPlain(form.stretch_pct), canonPlain(stored.stretch_pct))) c.push('stretch_pct');
  if (form.stretch_direction !== stored.stretch_direction) c.push('stretch_direction');
  if (form.construction !== stored.construction) c.push('construction');
  if (form.finish.trim() !== stored.finish.trim()) c.push('finish');
  if (!same(canonPlain(form.shrinkage_pct), canonPlain(stored.shrinkage_pct))) c.push('shrinkage_pct');
  if (!same(canonPlain(form.colourfastness_grade), canonPlain(stored.colourfastness_grade))) c.push('colourfastness_grade');
  const a = form.fibers.filter((f) => f.fiber.trim() !== '' || f.pct.trim() !== '').map((f) => ({ fiber: f.fiber.trim().toLowerCase(), pct: round1(Number(f.pct)) }));
  const b = stored.fibers.map((f) => ({ fiber: f.fiber.trim().toLowerCase(), pct: round1(Number(f.pct)) }));
  if (fiberKey(a) !== fiberKey(b)) c.push('fiber_composition');
  return c;
}

export type SpecPayload = Record<string, unknown>;

// Only changed fields. null clears to unknown. stretch_pct and stretch_direction always travel together.
// One spec_source/spec_reference for the whole request. verify=true re-verifies in the same request.
export function buildPayload(form: SpecForm, stored: SpecForm, opts: { verify?: boolean } = {}): SpecPayload {
  const ch = changedFields(form, stored);
  const p: SpecPayload = {};
  if (ch.includes('gsm')) { const n = num(form.gsm); p.gsm = n; if (n !== null) p.gsm_unit = form.gsm_unit; }
  if (ch.includes('usable_width')) { const n = num(form.usable_width); p.usable_width = n; if (n !== null) p.usable_width_unit = form.usable_width_unit; }
  if (ch.includes('stretch_pct') || ch.includes('stretch_direction')) {
    p.stretch_pct = num(form.stretch_pct);
    p.stretch_direction = p.stretch_pct === null ? null : (form.stretch_direction || null);
  }
  if (ch.includes('construction')) p.construction = form.construction || null;
  if (ch.includes('finish')) p.finish = form.finish.trim() || null;
  if (ch.includes('shrinkage_pct')) p.shrinkage_pct = num(form.shrinkage_pct);
  if (ch.includes('colourfastness_grade')) p.colourfastness_grade = num(form.colourfastness_grade);
  if (ch.includes('fiber_composition')) {
    const rows = form.fibers.filter((f) => f.fiber.trim() !== '' || f.pct.trim() !== '');
    p.fiber_composition = rows.length ? rows.map((f) => ({ fiber: f.fiber.trim(), pct: Number(f.pct) })) : null;
  }
  const writesValue = Object.values(p).some((v) => v !== null);
  if (Object.keys(p).length > 0) {
    // A source is required only when a non-null value is written; send it whenever values are written.
    if (writesValue && form.spec_source) { p.spec_source = form.spec_source; p.spec_reference = form.spec_reference.trim() || null; }
    if (opts.verify) p.spec_verified = true;
  }
  return p;
}

// Verify what is already stored, no value changes.
export const verifyOnlyPayload = (): SpecPayload => ({ spec_verified: true });

// Reasons a save cannot go out yet (shown inline, before the request).
export function saveBlockers(form: SpecForm, stored: SpecForm): string[] {
  const out = validate(form).map((i) => i.message);
  const p = buildPayload(form, stored);
  const writesValue = Object.entries(p).some(([k, v]) => !k.startsWith('spec_') && !k.endsWith('_unit') && v !== null);
  if (writesValue && !form.spec_source) out.push('Choose where these values come from.');
  return [...new Set(out)];
}
