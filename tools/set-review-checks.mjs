// Source checks for the Set Review page. Run: node tools/set-review-checks.mjs
import fs from 'node:fs';
const rd = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sr = rd('src/pages/admin/SetReview.tsx'), css = rd('src/pages/admin/setReview.css'), app = rd('src/App.tsx'), acc = rd('src/utils/jobAccess.ts');
let pass = 0, fail = 0;
const t = (n, ok) => { ok ? pass++ : (fail++, console.log('FAIL', n)); };
t('subtitle no longer claims the list starts empty', !/starts empty|nothing is assumed/i.test(sr));
t('the add form sits above the approved list, labelled as adding an approved combination', /Add approved combination/.test(sr) && sr.indexOf('sr-add') < sr.indexOf('sr-pairs') && !/Approve this set/.test(sr));
t('adding an existing pair is blocked client-side and the server still decides', /exists/.test(sr) && /axios\.post\('\/api\/admin\/set-pairs'/.test(sr));
t('existing pairs are never auto-created or deleted on load', !/set-pairs'[^)]*,\s*\{[^}]*\}\)[\s\S]{0,40}forEach/.test(sr) && (sr.match(/axios\.delete\(/g) ?? []).length === 1 && /window\.confirm/.test(sr));
t('remove buttons have a specific accessible name', /aria-label=\{`Remove \$\{p\.top_garment\} and \$\{p\.bottom_garment\}`\}/.test(sr));
t('pairs show when they were added, for provenance review', /Added \$\{when\(p\.created_at\)\}|Added \{when\(p\.created_at\)\}/.test(sr));
t('empty held queue is one compact status line, not a card-sized empty state', /sr-clear/.test(sr) && /\.sr-clear\{|\.sr-clear \{/.test(css));
t('owner stays read-only: add form and actions are hidden, and the route is manager-gated', /readOnly/.test(sr) && /isOwner\(readAdminUser\(\)\)/.test(sr) && /path="set-review"[^\n]*RequireManager/.test(app) && /'set-review'/.test(acc));
t('held cards keep secure preview, customer name, reason and decision actions', /reference-validations\/\$\{id\}\/file/.test(sr) && /customer_name/.test(sr) && /REASON_COPY/.test(sr) && /Approve this combination/.test(sr));
console.log(`${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
