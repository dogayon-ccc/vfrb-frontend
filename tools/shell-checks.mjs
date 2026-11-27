// Source checks for the shared shell: veil on every page change, no blank Suspense fallbacks, one Pagination, route announcer. Run: node tools/shell-checks.mjs
import fs from 'node:fs';
const r = p => fs.readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else { fail++; console.log('FAIL ' + name); } };
const veil = r('components/RouteVeil.tsx'), app = r('App.tsx'), adm = r('layouts/AdminLayout.tsx'), css = r('styles/route-veil.css');
ok(!/WIPE_EVERY_PAGE/.test(veil) && /setRun\(n => n \+ 1\)/.test(veil), 'veil plays on every pathname change');
ok(/rv--lite/.test(veil) && /\.rv--lite/.test(css), 'same-area changes use the shorter wipe');
ok(/prefers-reduced-motion: reduce\) \{ \.rv \{ display: none/.test(css), 'veil is off under reduced motion');
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
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
