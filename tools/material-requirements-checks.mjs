// Behaviour checks for src/utils/materialRequirements.ts and src/utils/specFit.ts. Run: node tools/material-requirements-checks.mjs
import fs from 'node:fs';
import ts from 'typescript';
const load = async (f) => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(fs.readFileSync(new URL(`../src/utils/${f}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'));
const R = await load('materialRequirements.ts'); const S = await load('specFit.ts');
let pass = 0, fail = 0;
const eq = (n, g, w) => { JSON.stringify(g) === JSON.stringify(w) ? pass++ : (fail++, console.log(`FAIL ${n}\n  got  ${JSON.stringify(g)}\n  want ${JSON.stringify(w)}`)); };
const d = (o) => ({ ...R.blankDraft(o.attribute ?? ''), ...o });

// parsing the API shape (decimals arrive as strings)
const g = R.groupByKind([{ garment_kind: 'top', attribute: 'gsm', min_value: '150.00', max_value: null, is_required: 1 }, { garment_kind: 'dress', attribute: 'construction', text_value: 'woven', is_required: 0 }, { garment_kind: 'bogus', attribute: 'gsm' }]);
eq('grouped by kind, unknown kind dropped', [g.top.length, g.dress.length, g.bottom.length], [1, 1, 0]);
const t = R.toDraft(g.top[0]);
eq('draft from row', [t.attribute, t.min, t.max, t.required], ['gsm', '150', '', true]);
const f = R.toDraft({ attribute: 'fiber:cotton', min_value: '60', max_value: '100', is_required: false });
eq('fibre row round-trips', [f.attribute, f.fiber, R.draftAttribute(f)], ['fiber', 'cotton', 'fiber:cotton']);

// validation
eq('valid set', R.validateDrafts([d({ attribute: 'gsm', min: '150' }), d({ attribute: 'construction', text: 'Woven' })]), {});
const e1 = d({ attribute: '' }); eq('missing type', Object.values(R.validateDrafts([e1])).length, 1);
const a = d({ attribute: 'gsm', min: '100' }), b = d({ attribute: 'gsm', max: '200' });
eq('duplicate attribute', Object.keys(R.validateDrafts([a, b])), [b.key]);
eq('needs a bound', Object.keys(R.validateDrafts([d({ attribute: 'gsm' })])).length, 1);
eq('min above max', Object.keys(R.validateDrafts([d({ attribute: 'gsm', min: '300', max: '100' })])).length, 1);
eq('out of range gsm', Object.keys(R.validateDrafts([d({ attribute: 'gsm', min: '5' })])).length, 1);
eq('shrinkage may be negative in range', R.validateDrafts([d({ attribute: 'shrinkage_pct', max: '-2' })]), {});
eq('non-numeric rejected', Object.keys(R.validateDrafts([d({ attribute: 'gsm', min: 'abc' })])).length, 1);
eq('fibre needs a name', Object.keys(R.validateDrafts([d({ attribute: 'fiber', min: '50' })])).length, 1);
eq('fibre pct capped at 100', Object.keys(R.validateDrafts([d({ attribute: 'fiber', fiber: 'cotton', min: '101' })])).length, 1);
eq('construction must be known', Object.keys(R.validateDrafts([d({ attribute: 'construction', text: 'felt' })])).length, 1);
eq('finish needs text', Object.keys(R.validateDrafts([d({ attribute: 'finish', text: ' ' })])).length, 1);
eq('21 rows rejected', !!R.validateDrafts(Array.from({ length: 21 }, (_, i) => d({ attribute: 'gsm', min: String(30 + i) }))) ._all, true);

// payload
eq('payload', R.buildRequirementsPayload([d({ attribute: 'gsm', min: '150', max: '', required: true }), d({ attribute: 'fiber', fiber: ' Cotton ', min: '60' }), d({ attribute: 'construction', text: 'Woven' })]), {
  requirements: [{ attribute: 'gsm', min_value: 150, max_value: null, is_required: true }, { attribute: 'fiber:cotton', min_value: 60, max_value: null, is_required: false }, { attribute: 'construction', text_value: 'woven', is_required: false }] });
eq('empty set payload clears kind', R.buildRequirementsPayload([]), { requirements: [] });

// change detection ignores order and formatting
const x = [d({ attribute: 'gsm', min: '150' }), d({ attribute: 'finish', text: 'Soil' })];
eq('reordered = unchanged', R.draftsChanged(x, [x[1], x[0]]), false);
eq('"150.0" = 150', R.draftsChanged(x, [d({ attribute: 'gsm', min: '150.0' }), x[1]]), false);
eq('required flag is a change', R.draftsChanged(x, [{ ...x[0], required: true }, x[1]]), true);
eq('removing a row is a change', R.draftsChanged(x, [x[0]]), true);

// customer disclosure: text only
eq('specFit lines', S.specFitLines({ complete: false, items: [{ label: 'Weight', status: 'match', text: "Weight meets VFRB's requirement (verified)", min: 150, value: 160 }, { text: "Weight meets VFRB's requirement (verified)" }, { text: '' }, { text: 5 }, null] }), ["Weight meets VFRB's requirement (verified)"]);
eq('specFit absent/empty/garbage', [S.specFitLines(null), S.specFitLines({}), S.specFitLines({ items: [] }), S.specFitLines({ items: 'x' }), S.specFitLines('x')], [[], [], [], [], []]);

console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
