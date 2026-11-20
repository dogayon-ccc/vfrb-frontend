// Behaviour checks for src/utils/materialSpecs.ts (payload building, JSON parsing, null handling, verification).
// Run: node tools/material-spec-checks.mjs
import fs from 'node:fs';
import ts from 'typescript';

const src = fs.readFileSync(new URL('../src/utils/materialSpecs.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const M = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

let pass = 0; let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : (fail++, console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`));
};

// API row as the backend returns it: decimals and JSON columns are strings.
const row = {
  fiber_composition: '[{"fiber":"cotton","pct":65.0},{"fiber":"polyester","pct":35.0}]',
  gsm: '169.5', usable_width_cm: '152.4', stretch_pct: '5.0', stretch_direction: 'crosswise',
  construction: 'woven', finish: 'soil release', shrinkage_pct: '2.0', colourfastness_grade: '4.0',
  spec_provenance: '{"gsm":{"source":"supplier_datasheet","reference":"DS-77","recorded_at":"2026-11-19T00:00:00+08:00"}}',
  spec_verified_at: '2026-11-19 10:00:00', spec_verified_by: 3,
};
const empty = { fiber_composition: null, gsm: null, usable_width_cm: null, stretch_pct: null, stretch_direction: null, construction: null, finish: null, shrinkage_pct: null, colourfastness_grade: null, spec_provenance: null, spec_verified_at: null, spec_verified_by: null };

// Parsing
eq('fibres parsed from JSON string', M.parseFibers(row.fiber_composition), [{ fiber: 'cotton', pct: 65 }, { fiber: 'polyester', pct: 35 }]);
eq('fibres accept an already-decoded array', M.parseFibers([{ fiber: 'wool', pct: 100 }]), [{ fiber: 'wool', pct: 100 }]);
eq('fibres: null, garbage and bad JSON are empty', [M.parseFibers(null), M.parseFibers('nope'), M.parseFibers('{}')], [[], [], []]);
eq('provenance parsed', M.parseProvenance(row.spec_provenance).gsm.reference, 'DS-77');
eq('provenance: null/garbage are empty', [M.parseProvenance(null), M.parseProvenance('x'), M.parseProvenance('[]')], [{}, {}, {}]);

// Null means unknown, never zero
eq('num: null, empty, blank are unknown', [M.num(null), M.num(''), M.num('  '), M.num(undefined)], [null, null, null, null]);
eq('num: "0" is a real zero', M.num('0'), 0);
const f0 = M.toForm(empty);
eq('empty row gives empty form, no zeros', [f0.gsm, f0.usable_width, f0.stretch_pct, f0.shrinkage_pct, f0.colourfastness_grade, f0.fibers.length], ['', '', '', '', '', 0]);
eq('state none for an empty row', M.specState(empty), 'none');
eq('state unverified', M.specState({ ...row, spec_verified_at: null }), 'unverified');
eq('state verified', M.specState(row), 'verified');
eq('a row with only a zero shrinkage is recorded, not unknown', M.specState({ ...empty, shrinkage_pct: '0.0' }), 'unverified');

// Only changed fields are sent; unchanged values are never echoed
const stored = M.toForm(row);
eq('untouched form has no changes', M.changedFields({ ...stored }, stored), []);
eq('untouched form sends nothing', M.buildPayload({ ...stored }, stored), {});
let f = { ...stored, gsm: '180', spec_source: 'lab_test', spec_reference: ' LT-9 ' };
eq('one changed field is the only value sent', M.buildPayload(f, stored), { gsm: 180, gsm_unit: 'gsm', spec_source: 'lab_test', spec_reference: 'LT-9' });
eq('unchanged values are not echoed', Object.keys(M.buildPayload(f, stored)).filter((k) => ['fiber_composition', 'construction', 'finish', 'stretch_pct', 'shrinkage_pct'].includes(k)), []);
eq('no spec_verified unless asked (edit clears verification server-side)', 'spec_verified' in M.buildPayload(f, stored), false);
eq('verify in the same request', M.buildPayload(f, stored, { verify: true }).spec_verified, true);
eq('verify only payload', M.verifyOnlyPayload(), { spec_verified: true });

// Unit conversion does not create spurious changes
eq('5 oz/yd2 equals stored 169.5 gsm: no change', M.changedFields({ ...stored, gsm: '5', gsm_unit: 'oz_yd2' }, stored), []);
eq('60 in equals stored 152.4 cm: no change', M.changedFields({ ...stored, usable_width: '60', usable_width_unit: 'in' }, stored), []);
f = { ...stored, gsm: '6', gsm_unit: 'oz_yd2', spec_source: 'vfrb_measured' };
eq('oz/yd2 change sends raw value and unit for the server to convert', [M.buildPayload(f, stored).gsm, M.buildPayload(f, stored).gsm_unit], [6, 'oz_yd2']);
f = { ...stored, usable_width: '1.6', usable_width_unit: 'm', spec_source: 'vfrb_measured' };
eq('width in metres sends usable_width (not usable_width_cm)', [M.buildPayload(f, stored).usable_width, M.buildPayload(f, stored).usable_width_unit, 'usable_width_cm' in M.buildPayload(f, stored)], [1.6, 'm', false]);

// Stretch travels together; clearing needs both null
f = { ...stored, stretch_direction: 'both', spec_source: 'lab_test' };
eq('direction change also sends stretch_pct', [M.buildPayload(f, stored).stretch_pct, M.buildPayload(f, stored).stretch_direction], [5, 'both']);
f = { ...stored, stretch_pct: '8', spec_source: 'lab_test' };
eq('stretch change also sends direction', [M.buildPayload(f, stored).stretch_pct, M.buildPayload(f, stored).stretch_direction], [8, 'crosswise']);
f = { ...stored, stretch_pct: '', stretch_direction: '' };
eq('clearing both sends both null', [M.buildPayload(f, stored).stretch_pct, M.buildPayload(f, stored).stretch_direction], [null, null]);
eq('clearing needs no source and none is sent', 'spec_source' in M.buildPayload(f, stored), false);
eq('clearing both passes validation', M.validate(f), []);
eq('orphan direction is rejected before sending', M.validate({ ...stored, stretch_pct: '' }).map((i) => i.field), ['stretch_direction']);

// Clearing a value sends null, not zero
f = { ...stored, shrinkage_pct: '' };
eq('cleared shrinkage is null', M.buildPayload(f, stored).shrinkage_pct, null);
f = { ...stored, shrinkage_pct: '0' };
eq('typed zero shrinkage is 0 (a recorded value)', M.buildPayload({ ...f, spec_source: 'lab_test' }, stored).shrinkage_pct, 0);
f = { ...stored, finish: '   ' };
eq('blank finish clears to null', M.buildPayload(f, stored).finish, null);
f = { ...stored, construction: '' };
eq('cleared construction is null', M.buildPayload(f, stored).construction, null);

// Fibres are sent as an array of objects, never a JSON string
f = { ...stored, fibers: [{ fiber: 'Cotton', pct: '50' }, { fiber: 'Polyester', pct: '50' }], spec_source: 'supplier_datasheet' };
eq('fibres go as an array', M.buildPayload(f, stored).fiber_composition, [{ fiber: 'Cotton', pct: 50 }, { fiber: 'Polyester', pct: 50 }]);
eq('reordered or re-cased identical fibres are not a change', M.changedFields({ ...stored, fibers: [{ fiber: 'Polyester', pct: '35' }, { fiber: 'COTTON', pct: '65' }] }, stored), []);
eq('clearing all fibres sends null', M.buildPayload({ ...stored, fibers: [] }, stored).fiber_composition, null);
eq('fibres not totalling 100 are blocked', M.validate({ ...stored, fibers: [{ fiber: 'cotton', pct: '60' }] }).map((i) => i.field), ['fiber_composition']);
eq('duplicate fibre blocked', M.validate({ ...stored, fibers: [{ fiber: 'cotton', pct: '50' }, { fiber: 'Cotton', pct: '50' }] }).length > 0, true);
eq('more than 8 fibres blocked', M.validate({ ...stored, fibers: Array.from({ length: 9 }, (_, i) => ({ fiber: 'f' + i, pct: '11.1' })) }).length > 0, true);

// Ranges
eq('gsm below range blocked', M.validate({ ...stored, gsm: '10' }).map((i) => i.field), ['gsm']);
eq('gsm 6 oz/yd2 is in range', M.validate({ ...stored, gsm: '6', gsm_unit: 'oz_yd2' }), []);
eq('colourfastness 6 blocked', M.validate({ ...stored, colourfastness_grade: '6' }).map((i) => i.field), ['colourfastness_grade']);
eq('shrinkage -5 allowed', M.validate({ ...stored, shrinkage_pct: '-5' }), []);
eq('width 5 in (12.7 cm) blocked', M.validate({ ...stored, usable_width: '5', usable_width_unit: 'in' }).map((i) => i.field), ['usable_width_cm']);

// Source required before a value write can go out
f = { ...stored, gsm: '180' };
eq('value write without a source is blocked', M.saveBlockers(f, stored), ['Choose where these values come from.']);
eq('with a source it is allowed', M.saveBlockers({ ...f, spec_source: 'lab_test' }, stored), []);
eq('a clear alone needs no source', M.saveBlockers({ ...stored, gsm: '' }, stored), []);

// UI wiring (source checks; behaviour in a browser is NOT covered here)
const page = fs.readFileSync(new URL('../src/pages/admin/Materials.tsx', import.meta.url), 'utf8');
const sec = fs.readFileSync(new URL('../src/components/admin/MaterialSpecSection.tsx', import.meta.url), 'utf8');
eq('edit rights come from isAdmin (manager only)', /canEdit=\{isAdmin\(\)\}/.test(page), true);
eq('owner gets a read-only specs view', /canEdit=\{false\}/.test(page) && /View specs/.test(page), true);
eq('specs shown for VFRB-owned fabrics only', /category === 'Fabric' && !isClient\(m\)/.test(page), true);
eq('master PUT still sends MASTER keys only', /Object\.fromEntries\(MASTER\.map/.test(page) && !/spec_/.test(page.split('const submit')[1].split('const field')[0]), true);
eq('spec save is its own PUT to the material', /axios\.put\(`\/api\/admin\/materials\/\$\{item\.material_id\}`, payload\)/.test(sec), true);
eq('master save is blocked while spec edits are unsaved', /if \(specDirty\)/.test(page), true);

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
