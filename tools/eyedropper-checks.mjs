// Source-contract checks for the panel workspace eyedropper. Run: node tools/eyedropper-checks.mjs
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const ws = fs.readFileSync(new URL('src/pages/client/design-studio/PanelWorkspace.tsx', root), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL ' + n); } };
ok(/import \{ hasScreenEyedropper, pickScreenColour \} from '\.\/eyedropper'/.test(ws), 'uses the shared screen eyedropper helper');
ok(/hasScreenEyedropper\(\)\) \{ const hex = await pickScreenColour\(\)/.test(ws), 'uses the browser EyeDropper API when present');
ok(/setArmed\(target\)/.test(ws) && /takeRef\.current\(hit\.dataset\.part\)/.test(ws), 'falls back to taking a tapped part colour on the 2D stage');
ok(/takeRef\.current\(p\.node\)/.test(ws), 'the parts list also takes a colour while armed');
ok(/eyedrop\('part'\)/.test(ws) && /eyedrop\('text'\)/.test(ws), 'offered for part colour and for text colour');
ok(/armObj\.current = fcs\.current\[side\]\?\.getActiveObject\(\)/.test(ws), 'the text target is captured before the stage click clears the selection');
ok(/disabled=\{readOnly\}/.test(ws.slice(ws.indexOf('const eyedrop'))), 'disabled in read-only mode');
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
