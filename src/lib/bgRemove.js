// src/lib/bgRemove.js — VFRB Enterprise
// Task 2 (logo auto-transparency, Aug 30 2026): client-side background
// removal for Design Studio logo uploads, ported from addyosmani/bg-remove
// (github.com/addyosmani/bg-remove, confirmed MIT-licensed — see Part 8
// of the UI/UX master prompt for the license verification) lib/process.ts.
//
// PORT NOTES — what changed from the original and why:
//   - Stripped to plain JS. This project has no TypeScript toolchain
//     (no `typescript` package, no .tsx files anywhere in src/) — adding
//     one just for this file would be a bigger footprint than the
//     feature itself. All logic/behavior is otherwise a direct port.
//   - initializeModel()/processImage() function bodies are unchanged
//     from the original's actual model-loading and matting logic.
//   - Added: proper URL.createObjectURL() cleanup via revokeObjectURL()
//     in processImage() — the original never revoked its blob URL
//     (a real, small leak in the source repo). Fixed here, not a
//     behavior change.
//   - Dropped: the reference app's own UI (App.tsx/Images.tsx/EditModal.tsx,
//     Unsplash sample images, react-dropzone, model-switcher dropdown,
//     dexie). None of that is used for VFRB's single "upload one logo"
//     flow — DesignStudio.jsx already has its own upload UI. `dexie` in
//     particular was checked and confirmed unused by process.ts itself
//     (grepped the source repo — zero hits in lib/ or the App/Images/
//     EditModal components that actually call it), so it's not a
//     dependency here either.
//
// HONEST CAVEAT, worth knowing before relying on this at the defense:
//   env.allowLocalModels = false means model weights (RMBG-1.4, ~176MB;
//   MODNet, smaller) are fetched from Hugging Face's CDN on first use in
//   a given browser, then cached by onnxruntime-web's own Cache Storage
//   usage for subsequent visits. This is a real, unavoidable property of
//   this library as published — it is NOT purely offline like the rest
//   of this project's fonts/assets. In practice this is low-risk for
//   VFRB specifically, since a customer uploading a logo in Design
//   Studio is already mid-session on a live web app and has a
//   connection — but it's a genuine exception to the "no CDN calls"
//   coding standard, not a silent one. If true offline capability is
//   ever required here, the fix is self-hosting the ONNX model files
//   (Cloudinary or /public) and setting env.localModelPath +
//   env.allowRemoteModels = false — a separate, larger task, not done
//   here.

import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
} from "@huggingface/transformers";

const WEBGPU_MODEL_ID = "Xenova/modnet";
const FALLBACK_MODEL_ID = "briaai/RMBG-1.4";

const isIOS = () => {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
};

const state = {
  model: null,
  processor: null,
  isWebGPUSupported: false,
  currentModelId: FALLBACK_MODEL_ID,
  isIOS: isIOS(),
  // Promise cache so concurrent/repeat calls in the same session reuse
  // one in-flight or completed init instead of re-downloading the model.
  initPromise: null,
};

async function initializeWebGPU() {
  const gpu = navigator.gpu;
  if (!gpu) return false;

  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return false;

    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
      device: "webgpu",
      config: { model_type: "modnet", architectures: ["MODNet"] },
    });
    state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID);
    state.isWebGPUSupported = true;
    return true;
  } catch (error) {
    console.error("VFRB bg-remove: WebGPU initialization failed:", error);
    return false;
  }
}

async function doInitializeModel(forceModelId) {
  // Always use RMBG-1.4 for iOS — matches the reference app's own
  // isIOS branch, since MODNet/WebGPU is unsupported there anyway.
  if (state.isIOS) {
    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = true;
    }

    state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
      config: { model_type: "custom" },
    });
    state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    });
    state.currentModelId = FALLBACK_MODEL_ID;
    return true;
  }

  const selectedModelId = forceModelId || FALLBACK_MODEL_ID;

  if (selectedModelId === WEBGPU_MODEL_ID) {
    const webGPUSuccess = await initializeWebGPU();
    if (webGPUSuccess) {
      state.currentModelId = WEBGPU_MODEL_ID;
      return true;
    }
    // Falls through to the RMBG-1.4 path below on WebGPU failure, same
    // as the reference — no error thrown, just a quieter model choice.
  }

  env.allowLocalModels = false;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.proxy = true;
  }

  state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {});
  state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
    revision: "main",
    config: {
      do_normalize: true,
      do_pad: true,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: "ImageFeatureExtractor",
      image_std: [0.5, 0.5, 0.5],
      resample: 2,
      rescale_factor: 0.00392156862745098,
      size: { width: 1024, height: 1024 },
    },
  });

  if (!state.model || !state.processor) {
    throw new Error("Failed to initialize model or processor");
  }
  state.currentModelId = FALLBACK_MODEL_ID;
  return true;
}

// initializeModel() — safe to call multiple times; only actually loads
// once per page session (subsequent calls reuse the same promise/result).
export function initializeModel(forceModelId) {
  if (!state.initPromise) {
    state.initPromise = doInitializeModel(forceModelId).catch((error) => {
      // Reset the cache on failure so a later retry (e.g. user tries a
      // second logo after a flaky network blip) gets a fresh attempt
      // instead of being stuck on a rejected promise forever.
      state.initPromise = null;
      throw error;
    });
  }
  return state.initPromise;
}

export function getModelInfo() {
  return {
    currentModelId: state.currentModelId,
    isWebGPUSupported: Boolean(navigator.gpu),
    isIOS: state.isIOS,
  };
}

// processImage(File) -> Promise<File>
// Direct port of the reference's core matting logic — pre-process,
// predict alpha matte, composite it back onto the original pixels as
// the new alpha channel, re-encode as PNG (the only format that can
// actually hold the transparency this function exists to produce).
export async function processImage(file) {
  if (!state.model || !state.processor) {
    throw new Error("Model not initialized. Call initializeModel() first.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await RawImage.fromURL(objectUrl);

    const { pixel_values } = await state.processor(img);
    const { output } = await state.model({ input: pixel_values });

    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height,
      )
    ).data;

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");

    ctx.drawImage(img.toCanvas(), 0, 0);

    const pixelData = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < maskData.length; ++i) {
      pixelData.data[4 * i + 3] = maskData[i];
    }
    ctx.putImageData(pixelData, 0, 0);

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
        "image/png",
      ),
    );

    const [fileName] = file.name.split(".");
    return new File([blob], `${fileName}-transparent.png`, {
      type: "image/png",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// removeLogoBackground(File) -> Promise<File>
// The one function DesignStudio.jsx actually calls. Wraps init+process
// into a single call and NEVER throws — on any failure (model load
// failure, unsupported browser, network blip fetching model weights),
// it logs and returns the ORIGINAL file unchanged, so a logo upload can
// never be blocked by this feature. Matches this project's own stated
// pattern for AI-adjacent features (Gemini key rotation: "all keys
// blocked → return fallback, do not crash").
//
// FIX (reported "drag and drop doesn't work"): that guarantee only held
// for outright failures — a genuinely SLOW or stalled model download
// (huggingface.co unreachable on a restrictive network, or just a slow
// connection trying to pull ~176MB on first use) would leave this pending
// forever with no timeout, showing "Removing background…" indefinitely
// with nothing the user could distinguish from the feature being broken.
// A timeout now falls back to the original file the same way an
// outright error already does, so a slow/blocked network degrades to
// "logo added without background removal" instead of "nothing happens."
// REGRESSION FIX: one flat 20s timeout covered the FIRST-USE model download
// (~176MB) as well as inference, so on a cold cache the race lost, the original
// file (white background intact) was returned, and the download kept running
// unseen in the background. Load and matting now have separate ceilings: the
// load one is long enough for a cold download, the matting one stays short.
const MODEL_LOAD_TIMEOUT_MS = 180_000;
const MATTING_TIMEOUT_MS = 30_000;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function removeLogoBackground(file) {
  try {
    await withTimeout(initializeModel(), MODEL_LOAD_TIMEOUT_MS, "Model load");
    return await withTimeout(processImage(file), MATTING_TIMEOUT_MS, "Background matting");
  } catch (error) {
    console.error("VFRB bg-remove: falling back to original logo file:", error);
    return file;
  }
}
