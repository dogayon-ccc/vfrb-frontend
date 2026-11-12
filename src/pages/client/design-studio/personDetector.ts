// Person check for "Create a 2D garment" and "Add my logo". Runs only in this browser, so the photo never leaves the device.
// A one-time exception to the AI rule: it finds faces (UltraFace, MIT) and never recommends, generates or alters anything.
const MODEL_URL = '/face-detector/ultraface-rfb-320.onnx';
const W = 320, H = 240;
const CHECK_TIMEOUT = 30000;
export const FACE_MIN_SCORE = 0.7; // measured: 10/10 person photos flagged, 1 of the 20 accepted gallery photos refused
export const PERSON_REFUSED = "We can't use photos with people in them for this.";
export const PERSON_CHECKING = 'Checking this photo for people…';
export const PERSON_UNCHECKED_2D = "We couldn't check this photo for people, so Create a 2D garment stays off. Check again, or use another option.";
export const PERSON_UNCHECKED_LOGO = "We couldn't check this image for people. Please make sure there are none before you add it.";

// Nine half-size crops: on the whole image at 320 x 240 a small face in a group photo is too few pixels.
export const cropGrid = (w, h) => [0, 0.25, 0.5].flatMap(x => [0, 0.25, 0.5].map(y => [x * w, y * h, w / 2, h / 2]));

// The model outputs raw [background, face] pairs; softmax turns each into a face probability.
export function bestFaceScore(pairs) {
  let best = 0;
  for (let i = 0; i < pairs.length; i += 2) best = Math.max(best, 1 / (1 + Math.exp(pairs[i] - pairs[i + 1])));
  return best;
}

export function toModelInput(rgba) {
  const n = rgba.length / 4, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] - 127) / 128;
  return out;
}

let loading = null;
const loadModel = () => (loading ??= (async () => {
  const [ort, { default: wasm }, { default: mjs }] = await Promise.all([
    import('onnxruntime-web/wasm'),
    import('../../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'),
    import('../../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url'),
  ]);
  Object.assign(ort.env.wasm, { wasmPaths: { wasm, mjs }, numThreads: 1 });
  return { ort, session: await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] }) };
})().catch((e) => { loading = null; throw e; }));

async function hasFace(file) {
  const { ort, session } = await loadModel();
  const bmp = await createImageBitmap(file);
  const ctx = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d', { willReadFrequently: true });
  try {
    for (const [x, y, w, h] of cropGrid(bmp.width, bmp.height)) {
      ctx.fillStyle = '#fff'; // transparent logos read on white, not black
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(bmp, x, y, w, h, 0, 0, W, H);
      const input = new ort.Tensor('float32', toModelInput(ctx.getImageData(0, 0, W, H).data), [1, 3, H, W]);
      const out = await session.run({ [session.inputNames[0]]: input });
      if (bestFaceScore(Object.values(out).find(t => t.dims[2] === 2).data) >= FACE_MIN_SCORE) return true;
      await new Promise(r => setTimeout(r)); // each crop blocks the main thread briefly, so let the page paint between them
    }
    return false;
  } finally { bmp.close(); }
}

// 'person' | 'clear' | 'failed'. Never rejects: a failed check is a status the gate decides on.
export const checkPerson = file => Promise.race([
  hasFace(file).then(found => (found ? 'person' : 'clear'), () => 'failed'),
  new Promise(r => setTimeout(r, CHECK_TIMEOUT, 'failed')),
]);

// use: 'sketch' (Create a 2D garment) | 'artwork' (Add my logo); anything else, such as a reference photo, is never gated.
export function personGate(use, status) {
  if (use !== 'sketch' && use !== 'artwork') return { blocked: false, message: null };
  if (status === 'clear') return { blocked: false, message: null };
  if (status === 'person') return { blocked: true, message: PERSON_REFUSED };
  if (status === 'failed') return use === 'sketch' ? { blocked: true, message: PERSON_UNCHECKED_2D } : { blocked: false, message: PERSON_UNCHECKED_LOGO };
  return { blocked: true, message: PERSON_CHECKING };
}
