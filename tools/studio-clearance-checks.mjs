// Source checks for the rail clipping, picker capability line, bottom-nav scroll clearance and portrait 3D framing. Run: node tools/studio-clearance-checks.mjs
import fs from 'node:fs';
const r = f => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = r('pages/client/design-studio/DesignStudioStyles.tsx'), d3 = r('pages/client/DesignStudio3D.tsx'), shell = r('styles/customer-shell.css');
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log('FAIL ' + n); } };
const tail = css.slice(css.indexOf('Studio rail: the first piece card is never clipped'));
ok(/\.ds-rail\{justify-content:flex-start;padding-top:16px;scroll-padding-block:16px/.test(tail), 'rail starts at the top edge with padding and scroll padding');
ok(/\.ds-rail-card:focus-visible\{outline-offset:-3px/.test(tail), 'the focus ring is inside the card, so the rail cannot clip it');
ok(/\.ds-pick-head\{z-index:6;\}/.test(tail), 'the picker header (back button) stacks above scrolling content');
ok(/\.ds-pick-tier\{position:static[^}]*white-space:normal[^}]*overflow-wrap:anywhere/.test(tail), 'the capability line is in-flow and wraps');
ok(/\.ds-pick-tier \.ds-pick-badge\{position:static/.test(tail), 'its badge is in-flow');
ok(/@media \(max-width:1023px\)\{html\[data-cx\]\{scroll-padding-bottom:calc\(64px \+ 24px/.test(shell), 'scroll padding clears the fixed bottom nav');
ok(/function FitBounds/.test(d3) && /aspect < 0\.75 \? 1\.25 : 1\.5/.test(d3) && !/<Bounds margin=\{1\.5\}/.test(d3), 'portrait stages frame tighter than landscape');
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
