// Fabric requirements per garment kind: row parsing, draft validation and the PUT payload.
// Mirrors backend MaterialSpec::requirement(); the server stays the authority and its errors are shown as-is.

export const GARMENT_KINDS = [['top', 'Tops'], ['bottom', 'Bottoms'], ['skirt', 'Skirts'], ['dress', 'Dresses']] as const;
export type GarmentKind = typeof GARMENT_KINDS[number][0];
export const MAX_ROWS = 20;
export const CONSTRUCTIONS = ['woven', 'knit', 'nonwoven'] as const;

// Backend MaterialSpec::NUMERIC, canonical units.
export const NUMERIC_ATTRS: Record<string, { label: string; unit: string; min: number; max: number }> = {
  gsm: { label: 'Weight', unit: 'gsm', min: 20, max: 1000 },
  usable_width_cm: { label: 'Usable width', unit: 'cm', min: 20, max: 400 },
  stretch_pct: { label: 'Stretch', unit: '%', min: 0, max: 300 },
  shrinkage_pct: { label: 'Shrinkage', unit: '%', min: -10, max: 30 },
  colourfastness_grade: { label: 'Colourfastness', unit: 'grade 1-5', min: 1, max: 5 },
};
export const TEXT_ATTRS: Record<string, string> = { construction: 'Construction', finish: 'Finish' };
export const FIBER_RE = /^fiber:[a-z][a-z \-]{0,38}$/;
export const FIBER_RANGE = { min: 0, max: 100 };

export type ReqRow = { attribute: string; min_value?: string | number | null; max_value?: string | number | null; text_value?: string | null; is_required?: boolean | number | null; garment_kind?: string };
export type ReqDraft = { key: string; attribute: string; fiber: string; min: string; max: string; text: string; required: boolean };

export const isFiber = (attr: string) => attr === 'fiber' || attr.startsWith('fiber:');
export const isText = (attr: string) => attr in TEXT_ATTRS;
export const isNumeric = (attr: string) => attr in NUMERIC_ATTRS || isFiber(attr);

const numStr = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '';
};
export const parseNum = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

let seq = 0;
export const blankDraft = (attribute = ''): ReqDraft => ({ key: `r${++seq}`, attribute, fiber: '', min: '', max: '', text: '', required: false });

export function toDraft(r: ReqRow): ReqDraft {
  const attr = String(r.attribute ?? '');
  return {
    key: `r${++seq}`,
    attribute: isFiber(attr) ? 'fiber' : attr,
    fiber: isFiber(attr) ? attr.slice(6) : '',
    min: numStr(r.min_value), max: numStr(r.max_value), text: r.text_value ?? '',
    required: r.is_required === true || r.is_required === 1,
  };
}

export const draftAttribute = (d: ReqDraft) => (d.attribute === 'fiber' ? `fiber:${d.fiber.trim().toLowerCase()}` : d.attribute);

export function attributeLabel(attr: string): string {
  if (isFiber(attr)) return `Fibre: ${attr.slice(6) || '…'}`;
  return NUMERIC_ATTRS[attr]?.label ?? TEXT_ATTRS[attr] ?? attr;
}

export function groupByKind(rows: ReqRow[]): Record<GarmentKind, ReqRow[]> {
  const out = { top: [], bottom: [], skirt: [], dress: [] } as Record<GarmentKind, ReqRow[]>;
  for (const r of rows) if (r.garment_kind && r.garment_kind in out) out[r.garment_kind as GarmentKind].push(r);
  return out;
}

// One message per problem, keyed by draft key. Empty object = ready to save.
export function validateDrafts(drafts: ReqDraft[]): Record<string, string> {
  const errs: Record<string, string> = {};
  const seen = new Set<string>();
  if (drafts.length > MAX_ROWS) errs._all = `At most ${MAX_ROWS} requirements per garment kind.`;
  for (const d of drafts) {
    if (!d.attribute) { errs[d.key] = 'Choose what this requirement is about.'; continue; }
    const attr = draftAttribute(d);
    if (d.attribute === 'fiber' && !FIBER_RE.test(attr)) { errs[d.key] = 'Enter a fibre name using letters only, for example cotton.'; continue; }
    if (seen.has(attr)) { errs[d.key] = `${attributeLabel(attr)} is listed twice.`; continue; }
    seen.add(attr);
    if (isText(d.attribute)) {
      const t = d.text.trim().toLowerCase();
      if (!t) { errs[d.key] = 'Give a value.'; continue; }
      if (d.attribute === 'construction' && !(CONSTRUCTIONS as readonly string[]).includes(t)) errs[d.key] = 'Choose woven, knit or nonwoven.';
      continue;
    }
    const range = isFiber(attr) ? FIBER_RANGE : NUMERIC_ATTRS[d.attribute];
    const lo = parseNum(d.min), hi = parseNum(d.max);
    if ((lo !== null && Number.isNaN(lo)) || (hi !== null && Number.isNaN(hi))) { errs[d.key] = 'Enter numbers only.'; continue; }
    if (lo === null && hi === null) { errs[d.key] = 'Give a minimum, a maximum or both.'; continue; }
    if ((lo !== null && (lo < range.min || lo > range.max)) || (hi !== null && (hi < range.min || hi > range.max))) { errs[d.key] = `Values must be between ${range.min} and ${range.max}.`; continue; }
    if (lo !== null && hi !== null && lo > hi) errs[d.key] = 'The minimum is above the maximum.';
  }
  return errs;
}

// PUT /api/admin/material-spec-requirements/{kind} body. Only call when validateDrafts() is empty.
export function buildRequirementsPayload(drafts: ReqDraft[]) {
  return {
    requirements: drafts.map((d) => {
      const attribute = draftAttribute(d);
      if (isText(d.attribute)) return { attribute, text_value: d.text.trim().toLowerCase(), is_required: d.required };
      return { attribute, min_value: parseNum(d.min), max_value: parseNum(d.max), is_required: d.required };
    }),
  };
}

// Compare as the server would store it, so reordering or reformatting alone is not a change.
const sig = (drafts: ReqDraft[]) => JSON.stringify(buildRequirementsPayload(drafts).requirements
  .map((r) => ({ ...r, attribute: r.attribute.toLowerCase() })).sort((a, b) => a.attribute.localeCompare(b.attribute)));
export const draftsChanged = (a: ReqDraft[], b: ReqDraft[]) => sig(a) !== sig(b);

export const summarize = (d: ReqDraft): string => {
  const attr = draftAttribute(d);
  if (isText(d.attribute)) return d.text.trim();
  const unit = isFiber(attr) ? '%' : NUMERIC_ATTRS[d.attribute]?.unit ?? '';
  const lo = d.min.trim(), hi = d.max.trim();
  const body = lo && hi ? `${lo} to ${hi}` : lo ? `at least ${lo}` : hi ? `at most ${hi}` : '';
  return body ? `${body} ${unit}`.trim() : '';
};
