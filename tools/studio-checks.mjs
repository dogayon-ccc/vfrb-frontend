// Source checks for the Studio colour/eyedropper/toolbar batch. Run: node tools/studio-checks.mjs
import fs from 'node:fs';
const rd = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const D = f => rd('src/pages/client/design-studio/' + f);
const rt = D('railTools.ts'), ftb = D('FloatingToolbar.tsx'), cp = D('ColorsPanel.tsx'), to = D('ToolOptions.tsx'), cv = D('CanvasViewport.tsx'), ds = rd('src/pages/client/DesignStudio.tsx');
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : (fail++, console.log('FAIL', n)); };
t('eyedropper: rail tool I is a pick tool', /id: 'sample', key: 'I'/.test(rt) && /PICK_TOOLS = \['sample'/.test(rt));
t('eyedropper: a tapped part sets the active colour through changeBrushColor (keeps the drawing engine in sync)', /pk\?\.pick === 'sample'[^\n]*pk\.setColor\(/.test(ds) && /setColor: changeBrushColor/.test(ds));
t('eyedropper: screen picker only where the browser has EyeDropper', /hasScreenEyedropper\(\) &&/.test(cp) && /hasScreenEyedropper\(\) &&/.test(to));
t('colours: part chips stay visible next to Done so collar, sleeve and body can be changed any time', /onDone \? <PartChips/.test(cp));
t('tool options use the shared Philippine palette', /PH_SWATCHES\.slice/.test(to) && !/#E63946/.test(to));
t('floating toolbar: order, mirror, hide, lock, duplicate, delete, align, wired from the Studio', ['Bring forward', 'Send backward', 'Add a mirrored copy', 'Hide', 'Duplicate', 'Delete'].every(x => ftb.includes(x)) && /toggleSelectedLock=\{toggleSelectedLock\}/.test(cv) && /arrangeLayer=\{arrangeLayer\}/.test(ds));
t('floating toolbar: a locked item can still be unlocked, nothing else', /aria-pressed=\{locked\}/.test(ftb) && !/disabled=\{locked\}[^>]*toggleSelectedLock/.test(ftb));
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
