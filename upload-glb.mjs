import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.upload' });
dotenv.config(); // also reads .env if present

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const api_key = process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY;
const api_secret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET;

if (!cloud_name || !api_key || !api_secret) {
  console.error('Missing Cloudinary keys. Check that .env.upload is in the project root.');
  process.exit(1);
}

cloudinary.config({ cloud_name, api_key, api_secret, secure: true });

const ROOT = process.argv[2] || 'public/models';
const FOLDER = process.argv[3] || 'models';
const files = fs
  .readdirSync(ROOT, { recursive: true })
  .filter((f) => f.toLowerCase().endsWith('.glb'))
  .map((f) => f.split(path.sep).join('/'));

console.log(`Found ${files.length} GLB files. Uploading...`);

let ok = 0;
const failed = [];
for (const [i, rel] of files.entries()) {
  try {
    await cloudinary.uploader.upload(path.join(ROOT, rel), {
      resource_type: 'raw',
      public_id: `${FOLDER}/${rel.replace(/ /g, "-")}`,
      overwrite: true,
      unique_filename: false,
      use_filename: false,
    });
    ok++;
    console.log(`[${i + 1}/${files.length}] OK   ${rel}`);
  } catch (e) {
    failed.push(rel);
    console.log(`[${i + 1}/${files.length}] FAIL ${rel} - ${e.message}`);
  }
}

console.log(`\nDone. ${ok} uploaded, ${failed.length} failed.`);
if (failed.length) console.log('Failed files:', failed);
console.log(`\nYour VITE_MODEL_BASE_URL is:\nhttps://res.cloudinary.com/${cloud_name}/raw/upload/${FOLDER}`);
