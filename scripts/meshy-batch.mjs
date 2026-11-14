// Batch Meshy image-to-3D: node scripts/meshy-batch.mjs [photo-id ...]. Needs MESHY_API_KEY and a paid Meshy plan (the API rejects free plans).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { extname, basename } from 'node:path';

const KEY = process.env.MESHY_API_KEY;
if (!KEY) { console.error('Set MESHY_API_KEY (https://www.meshy.ai/settings/api).'); process.exit(1); }
const API = 'https://api.meshy.ai/openapi/v1/image-to-3d';
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const SRC = 'public/gallery', OUT = 'meshy-out';
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const all = readdirSync(SRC).filter(f => MIME[extname(f)]).map(f => basename(f, extname(f)));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : all;
mkdirSync(OUT, { recursive: true });

async function run(id) {
  if (existsSync(`${OUT}/${id}.glb`)) return console.log('skip (done)', id);
  const f = readdirSync(SRC).find(n => basename(n, extname(n)) === id);
  const uri = `data:${MIME[extname(f)]};base64,${readFileSync(`${SRC}/${f}`).toString('base64')}`;
  const body = { image_url: uri, ai_model: 'meshy-6', should_texture: true, enable_pbr: true, should_remesh: true, topology: 'quad', target_polycount: 15000, target_formats: ['glb'] };
  const res = await fetch(API, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${id}: create ${res.status} ${await res.text()}`);
  const { result } = await res.json();
  for (;;) {
    await sleep(8000);
    const t = await (await fetch(`${API}/${result}`, { headers: H })).json();
    if (t.status === 'SUCCEEDED') {
      const glb = await fetch(t.model_urls.glb);
      writeFileSync(`${OUT}/${id}.glb`, Buffer.from(await glb.arrayBuffer()));
      return console.log('ok', id, `${t.consumed_credits} credits`);
    }
    if (t.status === 'FAILED' || t.status === 'CANCELED') throw new Error(`${id}: ${t.status} ${t.task_error?.message ?? ''}`);
  }
}

for (const id of ids) { try { await run(id); } catch (e) { console.error(String(e.message)); } }
