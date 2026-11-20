// Run: node --experimental-strip-types tools/set-order-checks.mjs
import assert from 'node:assert/strict';
import { emptyMatrix, copyTopToBottom, setCell, checkMatrix, matrixPayload, canContinue, canRetry, setOrderFields, total, resumeRef, REASON_COPY } from '../src/pages/client/order-wizard/setOrder.ts';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const fill = (top, bottom) => { let m = emptyMatrix(); for (const [s, q] of Object.entries(top)) m = setCell(m, 'top', s, String(q)); for (const [s, q] of Object.entries(bottom)) m = setCell(m, 'bottom', s, String(q)); return m; };

t('empty matrix asks for the minimum on both pieces', () => {
  const c = checkMatrix(emptyMatrix());
  assert.equal(c.ok, false); assert.equal(c.messages.length, 2); assert.match(c.messages[0], /add 100 more/);
});
t('105 + 105 is 105 sets', () => { const c = checkMatrix(fill({ M: 55, L: 50 }, { M: 5, L: 100 })); assert.deepEqual([c.ok, c.sets], [true, 105]); });
t('99 + 99 is below the minimum', () => assert.equal(checkMatrix(fill({ M: 99 }, { M: 99 })).ok, false));
t('105 tops vs 100 bottoms names the exact difference', () => assert.match(checkMatrix(fill({ M: 105 }, { M: 100 })).messages[0], /5 more tops than bottoms/));
t('copy gives the bottom its own values', () => {
  const a = fill({ S: 40, M: 60 }, {}); const b = copyTopToBottom(a);
  assert.deepEqual(b.bottom, a.top); assert.notEqual(b.bottom, a.top);
  const c = setCell(b, 'bottom', 'S', '41'); assert.equal(c.top.S, '40'); assert.equal(total(c.bottom), 101);
});
t('cells keep digits only, no decimals or negatives', () => {
  let m = setCell(emptyMatrix(), 'top', 'M', '-3.5'); assert.equal(m.top.M, '35');
  m = setCell(m, 'top', 'M', '007'); assert.equal(m.top.M, '7');
});
t('payload lists only used sizes as integers', () => assert.equal(matrixPayload(fill({ M: 100 }, { L: 100 })), '{"top":{"M":100},"bottom":{"L":100}}'));
t('only an accepted, confirmed, stored verdict continues', () => {
  const ok = { validation_id: 7, verdict: 'accepted', reason: 'complete_set', top: 'Scrub Top', bottom: 'Scrub Pants' };
  assert.equal(canContinue(ok, true), true); assert.equal(canContinue(ok, false), false);
  assert.equal(canContinue({ ...ok, verdict: 'needs_review' }, true), false);
  assert.equal(canContinue({ ...ok, verdict: 'rejected' }, true), false);
  assert.equal(canContinue({ ...ok, validation_id: null }, true), false);
  assert.equal(canContinue(null, true), false);
});
t('retry is offered only for provider trouble', () => {
  assert.equal(canRetry({ validation_id: 1, verdict: 'needs_review', reason: 'ai_unavailable', top: null, bottom: null }), true);
  assert.equal(canRetry({ validation_id: 1, verdict: 'rejected', reason: 'incomplete_set_top_only', top: 'Blouse', bottom: null }), false);
});
t('order payload never carries a garment, verdict or description', () => {
  const f = setOrderFields({ validation_id: 7, verdict: 'accepted', reason: 'complete_set', top: 'Blouse', bottom: 'Skirt' }, fill({ M: 100 }, { M: 100 }),
    { deadline: '', delivery_method: 'pickup', delivery_address: 'x', po_reference: ' PO-1 ', special_notes: '' });
  assert.deepEqual(Object.keys(f).sort(), ['delivery_method', 'po_reference', 'reference_validation_id', 'size_matrix']);
  assert.equal(f.po_reference, 'PO-1');
});
t('only a server-orderable earlier upload can be resumed', () => {
  const h = { id: 5, status: 'approved', reason: 'x', top_garment: 'Blouse', bottom_garment: 'Skirt', orderable: true };
  assert.deepEqual(resumeRef(h), { validation_id: 5, verdict: 'accepted', reason: 'complete_set', top: 'Blouse', bottom: 'Skirt' });
  assert.equal(resumeRef({ ...h, orderable: false }), null);
  assert.equal(resumeRef({ ...h, top_garment: null }), null);
});
t('an unapproved pair has its own held message', () => assert.ok(REASON_COPY.pair_not_approved));
console.log(`${n}/${n} passed`);
