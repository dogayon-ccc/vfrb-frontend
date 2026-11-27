// Source checks for the shared shell: veil on every page change, no blank Suspense fallbacks, one Pagination, route announcer. Run: node tools/shell-checks.mjs
import fs from 'node:fs';
const r = p => fs.readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL ' + name); } };
const veil = r('components/RouteVeil.tsx'), app = r('App.tsx'), adm = r('layouts/AdminLayout.tsx'), css = r('styles/route-veil.css');
ok(!/WIPE_EVERY_PAGE/.test(veil) && /setRun\(n => n \+ 1\)/.test(veil), 'veil plays on every pathname change');
ok(/rv--lite/.test(veil) && /\.rv--lite/.test(css), 'same-area changes use the shorter wipe');
const rm = css.slice(css.indexOf('prefers-reduced-motion: reduce'));
ok(/\.rv--lite \{ display: none; \}/.test(rm) && /\.rv__bar \{ display: none; \}/.test(rm), 'reduced motion: same-area changes show nothing');
ok(/\.rv \{[^}]*clip-path: none; animation: rv-hold/.test(rm) && /@keyframes rv-hold \{ 0%, 99% \{ visibility: visible; \} 100% \{ visibility: hidden; \} \}/.test(css), 'reduced motion: area changes show a static mark, not the wipe');
ok(!/\.rv \{[^}]*(transition|transform)/.test(rm) && /\.rv__mark \{[^}]*animation: none/.test(rm), 'reduced motion: the static mark has no movement or fade');
ok(!/<Suspense fallback=\{null\}/.test(app), 'App has no blank Suspense fallback');
ok(!/<Suspense fallback=\{null\}/.test(adm), 'Admin pages have no blank Suspense fallback');
ok(/<RouteAnnouncer\/>/.test(app) && /aria-live="polite"/.test(r('components/RouteAnnouncer.tsx')), 'route changes are announced');
for (const f of ['ActivityLog', 'AuditLog', 'UserManagement', 'CustomersMaster']) {
  const s = r(`pages/admin/${f}.tsx`);
  ok(/<Pagination\b/.test(s), `${f} uses the shared Pagination`);
  ok(!/className="(ui|cm|um)-pager"/.test(s), `${f} has no private pager markup`);
}
const pg = r('components/ui/Pagination.tsx');
ok(/aria-label=\{label\}/.test(pg) && /role="status"/.test(pg) && /disabled=\{busy \|\| page <= 1\}/.test(pg), 'Pagination is labelled, announces its count and disables at the ends');

// Customer canvas: motion only inside the no-preference block, no looping animation, picker list rule out-ranks the inline grid, new-design tile leads.
const cv = r('styles/customer-canvas.css'), gate = cv.indexOf('@media (prefers-reduced-motion: no-preference)');
ok(gate > 0 && [...cv.matchAll(/animation(-name)?:/g)].every(m => m.index > gate), 'every animation sits inside the no-preference block');
ok(!/infinite/.test(cv), 'no looping animation in the customer canvas');
ok(r('main.tsx').indexOf('customer-canvas.css') > r('main.tsx').indexOf('rog-app.css'), 'customer canvas loads after rog-app.css');
ok(/\.ds \.ds-pick\[data-inline\] \.ds-pick-grid\[data-layout="list"\]/.test(cv), 'picker list view out-ranks the inline grid rule');
const dash = r('pages/client/Dashboard.tsx');
ok(dash.indexOf('cx-newtile') < dash.indexOf('draft && ('.concat('\n')) || dash.indexOf('cx-newtile') < dash.indexOf('designs.slice(0, draft'), 'Start a new design comes first in Recent designs');
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
