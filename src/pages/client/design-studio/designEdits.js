// AI design edits (POST /api/ai/design-edits): the template facts sent to the server and the final check before applying.
// Every fact comes from the functions that draw the garment (zonesFor, placementsFor, PATTERNS); nothing here adds geometry.
// The server already rejects unknown operations; checkEdit() repeats that against freshly computed facts so the Studio never
// applies a zone, pattern, placement or text target this template does not really have.
import { zonesFor, placementsFor, PATTERNS } from './dsShared';
import { assetFor, templateIdFor } from './garmentAssets';
import { withBody } from './colorRules';
import { applyGarment, CATALOG } from './garmentCatalog';

const HEX = /^#[0-9A-F]{6}$/i;

// What this garment really offers right now. A photo base has no patterns (PatternPanel shows none there either).
export function templateFacts(cfg) {
  const { garment, sleeve, fit } = cfg;
  return {
    id: templateIdFor(garment, sleeve, fit) ?? garment,
    garment,
    zones: zonesFor(garment, sleeve, fit),
    placements: placementsFor(garment, sleeve, fit).map((p) => p.id),
    patterns: assetFor(garment, sleeve, 'front', fit) ? [] : PATTERNS.map((p) => p.id),
  };
}

// Why an operation cannot be applied to this template, or '' when it can.
export function checkEdit(op, facts, textIds) {
  const has = (list, v) => typeof v === 'string' && list.includes(v);
  switch (op?.op) {
    case 'set_color':   return !has(facts.zones, op.zone) ? 'zone not on this garment' : HEX.test(op.hex ?? '') ? '' : 'invalid colour';
    case 'set_pattern': return !has(facts.zones, op.zone) ? 'zone not on this garment' : has(facts.patterns, op.pattern) ? '' : 'pattern not available here';
    case 'add_text':    return !op.text?.trim() ? 'empty text' : has(facts.placements, op.placement) ? '' : 'placement not on this garment';
    case 'edit_text':   return !has(textIds, op.target) ? 'text no longer on the design' : op.text?.trim() ? '' : 'empty text';
    case 'move_text':   return !has(textIds, op.target) ? 'text no longer on the design' : has(facts.placements, op.placement) ? '' : 'placement not on this garment';
    default:            return 'unknown operation';
  }
}

// Colour and pattern operations on the DesignState, with the same rules as the Colours and Pattern panels.
export function applyStateEdits(cfg, ops) {
  return ops.reduce((p, op) => {
    if (op.op === 'set_color') return { ...p, colors: op.zone === 'body' ? withBody(p.colors, op.hex) : { ...p.colors, [op.zone]: op.hex } };
    if (op.op === 'set_pattern') {
      const patternParams = { ...(p.patternParams ?? {}) }; delete patternParams[op.zone]; // a new pattern drops the old one's params
      return { ...p, patterns: { ...(p.patterns ?? {}), [op.zone]: op.pattern }, patternParams };
    }
    return p;
  }, cfg);
}

// Short, plain description of one operation for the review list.
export function describeEdit(op, zoneLabel, placementLabel) {
  switch (op.op) {
    case 'set_color':   return `${zoneLabel(op.zone)} colour → ${op.hex}`;
    case 'set_pattern': return `${zoneLabel(op.zone)} pattern → ${op.pattern}`;
    case 'add_text':    return `Add "${op.text}" at ${placementLabel(op.placement)}`;
    case 'edit_text':   return `Change text to "${op.text}"`;
    case 'move_text':   return `Move text to ${placementLabel(op.placement)}`;
    default:            return op.op;
  }
}

// ── From scratch: /api/ai/describe-design returns a loose brief (Top/Bottom, collar, sleeve, colours, pattern, text). It is mapped to
// ONE real catalog template by fixed rules (never by trusting a free-text garment name), then expressed as the same operations and
// checked by checkEdit against that template, so a design started by AI is exactly what the customer could have built by hand.
const COLLAR_FAMILY = { 'V-Neck': 'Scrub Top', 'Polo Collar': 'Polo Shirt', 'Round Neck': 'Round Neck', 'Mandarin': 'Mandarin Collar' };
const SLEEVE = { 'Short Sleeve': 'Short', 'Long Sleeve': 'Long', '3/4 Sleeve': '3/4' };
const BRIEF_PATTERN = { 'h-stripe': 'hstripes', 'v-stripe': 'vstripes', pinstripe: 'pinstripe', grid: 'checker', dots: 'polka' };

// { cfg: the design on its template (no edits yet), ops: checked operations, skipped: [{ op, why }], notes: plain differences }
export function briefToStart(brief, cfg) {
  const garment = brief?.garmentType === 'Bottom' ? 'Pants' : COLLAR_FAMILY[brief?.collarType] ?? 'Polo Shirt';
  const inCat = CATALOG.find(c => c.id === brief?.category)?.families?.some(f => (f.id ?? f) === garment);
  const want = SLEEVE[brief?.sleeveType] ?? null;
  const start = applyGarment({ ...cfg, garment: null }, garment, { sleeve: want ?? undefined, ...(inCat ? { category: brief.category } : {}) });
  const facts = templateFacts(start), notes = [];
  if (brief?.sleeveType && start.sleeve !== want) notes.push(`${brief.sleeveType} is not offered for ${garment}; using ${start.sleeve ?? 'its only style'}.`);
  if (brief?.pocketType && brief.pocketType !== 'none') notes.push('Pockets follow the template; change them in Details.');
  const ops = [];
  if (HEX.test(brief?.colors?.body ?? '')) ops.push({ op: 'set_color', zone: 'body', hex: brief.colors.body.toUpperCase() });
  if (HEX.test(brief?.colors?.accent ?? '')) {
    if (facts.zones.includes('collar')) ops.push({ op: 'set_color', zone: 'collar', hex: brief.colors.accent.toUpperCase() });
    else notes.push(`${garment} has no separate collar colour here, so the accent colour was not used.`);
  }
  const pat = BRIEF_PATTERN[brief?.pattern];
  if (pat) ops.push({ op: 'set_pattern', zone: 'body', pattern: pat });
  const text = typeof brief?.textContent === 'string' ? brief.textContent.trim().slice(0, 40) : '';
  if (text) ops.push({ op: 'add_text', text, placement: facts.placements.includes('left_chest') ? 'left_chest' : facts.placements[0] });
  const ok = [], skipped = [];
  for (const op of ops) { const why = checkEdit(op, facts, []); (why ? skipped : ok).push(why ? { op, why } : op); }
  return { cfg: start, ops: ok, skipped, notes };
}
