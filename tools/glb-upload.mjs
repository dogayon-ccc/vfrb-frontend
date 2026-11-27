// Uploads a model folder to a NEW Cloudinary folder and checks every file afterwards. It never deletes and never overwrites.
//   preview (default):  node tools/glb-upload.mjs <slim-dir> --folder models-v2
//   upload:             node tools/glb-upload.mjs <slim-dir> --folder models-v2 --upload     (needs CLOUDINARY_URL in this terminal only)
//   check what is live: node tools/glb-upload.mjs <slim-dir> --folder models-v2 --verify     (needs only --cloud or CLOUDINARY_URL)
// CLOUDINARY_URL is cloudinary://<api_key>:<api_secret>@<cloud_name>. Never put it in a VITE_ variable, a committed file or a chat.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const signParams = (params, secret) => crypto.createHash('sha1').update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret).digest('hex');
export const publicId = (folder, rel) => `${folder}/${rel.replace(/ /g, '-')}`; // the same space rule as src/lib/modelUrl.ts

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.glb$/i.test(e.name) ? [path.join(d, e.name)] : []);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

async function main() {
  const argv = process.argv.slice(2), flag = (n, d) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
  const dir = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : null, folder = flag('--folder', 'models-v2');
  if (!dir || !/^[a-z0-9][a-z0-9_-]*$/i.test(folder)) { console.error('Usage: node tools/glb-upload.mjs <dir> --folder <new-folder> [--upload | --verify]'); process.exit(2); }
  if (folder === 'models-draco') { console.error('Refusing to write into models-draco: the live site loads from it. Use a new folder.'); process.exit(2); }
  const url = process.env.CLOUDINARY_URL ? new URL(process.env.CLOUDINARY_URL) : null;
  const cloud = flag('--cloud', url?.hostname), files = walk(dir).sort(), rel = f => path.relative(dir, f).split(path.sep).join('/');
  const doUpload = argv.includes('--upload'), doVerify = argv.includes('--verify') || doUpload;
  if (!doVerify) { files.forEach(f => console.log(`would upload ${publicId(folder, rel(f))}`)); console.log(`\n${files.length} files. Nothing was sent. Add --upload to send them.`); return; }
  if (!cloud) { console.error('Set CLOUDINARY_URL, or pass --cloud <name> with --verify.'); process.exit(2); }
  const failed = [];
  if (doUpload) {
    if (!url?.username || !url?.password) { console.error('--upload needs CLOUDINARY_URL with the API key and secret.'); process.exit(2); }
    for (const [i, f] of files.entries()) {
      const params = { overwrite: 'false', public_id: publicId(folder, rel(f)), timestamp: String(Math.floor(Date.now() / 1000)) };
      const form = new FormData();
      form.set('file', new Blob([fs.readFileSync(f)]), path.basename(f));
      Object.entries(params).forEach(([k, v]) => form.set(k, v));
      form.set('api_key', decodeURIComponent(url.username)); form.set('signature', signParams(params, decodeURIComponent(url.password)));
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, { method: 'POST', body: form });
      const body = await res.json().catch(() => ({}));
      console.log(`${i + 1}/${files.length} ${res.ok ? (body.existing ? 'already there' : 'uploaded') : `FAILED ${res.status} ${body.error?.message ?? ''}`} ${params.public_id}`);
      if (!res.ok) failed.push(params.public_id);
    }
  }
  const base = `https://res.cloudinary.com/${cloud}/raw/upload/${folder}`;
  let same = 0;
  for (const f of files) {
    const res = await fetch(encodeURI(`${base}/${rel(f).replace(/ /g, '-')}`)).catch(() => null);
    if (res?.ok && sha(Buffer.from(await res.arrayBuffer())) === sha(fs.readFileSync(f))) same++; else failed.push(`${rel(f)} (${res ? res.status : 'no answer'}${res?.ok ? ', different bytes' : ''})`);
  }
  console.log(`\n${same}/${files.length} files at ${base} match this folder byte for byte.`);
  if (failed.length) { console.log(`Problems:\n  ${failed.join('\n  ')}\nDo not switch VITE_MODEL_BASE_URL yet.`); process.exit(1); }
  console.log(`Next: set VITE_MODEL_BASE_URL=${base} in .env.local, test locally, then change it in Vercel. Keep models-draco until the live site has been checked.`);
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) await main();
