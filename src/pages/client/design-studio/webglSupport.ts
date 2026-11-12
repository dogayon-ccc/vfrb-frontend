let cached = null;

// True when this browser can create a WebGL context. Probed once; the probe context is released immediately.
export function hasWebGL() {
  if (cached !== null) return cached;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    cached = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { cached = false; }
  return cached;
}
