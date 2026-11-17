// Move the profile photo into Account settings > Personal information (src/pages/client/settings/ProfileSection.tsx).
// Reuses ProfilePhotoField as-is (pick, square crop, upload, remove). Adds ~6 lines; nothing is removed.
// Usage (Git Bash, repo root):  node.exe tools/patch-profile-photo.mjs --dry-run   then   node.exe tools/patch-profile-photo.mjs
// All-or-nothing: every anchor must match exactly once or nothing is written. Keeps CRLF/LF. Backs up before writing.
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry-run');
const target = process.argv.find((a) => a.endsWith('.tsx')) ?? 'src/pages/client/settings/ProfileSection.tsx';
const raw = fs.readFileSync(target, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

const edits = [
  { name: 'imports',
    find: "import LoadError from './LoadError';\n",
    put: (m) => m + "import ProfilePhotoField from '../../../components/ProfilePhotoField';\nimport { readUser } from '../../../utils/authRoute';\n" },
  { name: 'photo state',
    find: "  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));\n",
    put: (m) => m + "  const [photo, setPhoto] = useState(() => readUser()?.avatar ?? null);\n" },
  { name: 'photo row',
    find: '            <div className="st-2col">\n',
    put: (m) => '            <ProfilePhotoField avatar={photo} name={form.name} onChange={setPhoto} />\n' +
                '            <div style={{ borderTop: \'1px solid var(--border)\' }} />\n' + m },
];

if (s.includes('ProfilePhotoField')) { console.error('ABORT: ProfilePhotoField is already in this file. Nothing written.'); process.exit(2); }
for (const e of edits) {
  const n = s.split(e.find).length - 1;
  if (n !== 1) { console.error(`ABORT: anchor "${e.name}" matched ${n} times (need exactly 1). Nothing written.`); process.exit(1); }
}
for (const e of edits) s = s.replace(e.find, e.put);

const out = crlf ? s.replace(/\n/g, '\r\n') : s;
console.log(`${target}: ${crlf ? 'CRLF' : 'LF'}, all ${edits.length} anchors matched once.`);
if (DRY) { console.log('dry run: nothing written.'); process.exit(0); }
const bak = `${target}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.copyFileSync(target, bak);
fs.writeFileSync(target, out);
console.log(`backup: ${path.basename(bak)}\nwritten.`);
