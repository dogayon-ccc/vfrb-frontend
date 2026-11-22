// Run: node tools/sleeve-right-checks.mjs   (optional right-sleeve colour: fallback, 3D support, save/restore, old designs)
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const v = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
const L = p => v.ssrLoadModule(`/src/pages/client/design-studio/${p}.ts`);
const { withRightSleeve } = await L('colorRules');
const { splitSleeves, zonesFor } = await L('dsShared');
const { serializeDesign, deserializeDesign } = await L('designSerialization');
const { get3DCapabilities } = await L('garmentCapabilities');

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '\n    ', e.message.split('\n')[0]); } };

const scrub = ['Scrub Top', 'Short', 'unisex'];
t('right sleeve follows sleeve, then body, until sleeveR is set', () => {
  assert.equal(withRightSleeve({ body: '#111111', sleeve: '#222222' }, '#111111').sleeveR, '#222222');
  assert.equal(withRightSleeve({ body: '#111111' }, '#111111').sleeveR, '#111111');
  assert.equal(withRightSleeve({ sleeve: '#222222', sleeveR: '#333333' }).sleeveR, '#333333');
});
t('the authored scrub top declares a separate right-sleeve part in 3D and offers the zone', () => {
  assert.equal(splitSleeves(...scrub), true);
  assert.ok(zonesFor(...scrub).includes('sleeveR'));
  assert.ok(get3DCapabilities(scrub[0], scrub[2], scrub[1]).patterns.zones.includes('sleeveR'));
});
t('a garment whose model has no right-sleeve part never offers the zone', () => {
  assert.equal(splitSleeves('Polo Shirt', 'Short', 'unisex'), false);
  assert.equal(zonesFor('Polo Shirt', 'Short', 'unisex').includes('sleeveR'), false);
});
t('an old design without sleeveR restores with the sleeve colour and no sleeveR key', () => {
  const { cfg: old } = deserializeDesign({ garment: 'Scrub Top', sleeve: 'Short', fit: 'unisex', colors: { body: '#1B2A4A', sleeve: '#FFFFFF' } });
  assert.equal('sleeveR' in old.colors, false);
  assert.equal(withRightSleeve(old.colors, old.colors.body).sleeveR, '#FFFFFF');
  assert.equal(serializeDesign(old).colors.sleeve, '#FFFFFF');
});
t('sleeveR survives save and restore on the scrub top', () => {
  const saved = serializeDesign({ garment: scrub[0], sleeve: scrub[1], fit: scrub[2], colors: { body: '#1B2A4A', sleeve: '#FFFFFF', sleeveR: '#CC0000' } });
  assert.equal(saved.colors.sleeveR, '#CC0000');
  assert.equal(deserializeDesign(JSON.parse(JSON.stringify(saved))).cfg.colors.sleeveR, '#CC0000');
});
t('a stale sleeveR is dropped when saving a garment that cannot show it', () => {
  const saved = serializeDesign({ garment: 'Polo Shirt', sleeve: 'Short', colors: { body: '#1B2A4A', sleeveR: '#CC0000' } });
  assert.equal('sleeveR' in saved.colors, false);
});
console.log(`\n${pass} passed, ${fail} failed`);
await v.close();
process.exit(fail ? 1 : 0);
