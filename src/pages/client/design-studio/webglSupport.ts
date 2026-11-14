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

// Frees the GPU context now. r3f calls forceContextLoss again on unmount, so that second call is made a no-op.
export function releaseGL(g) {
  try {
    if (!g || g.getContext().isContextLost()) return;
    g.dispose(); g.forceContextLoss(); g.forceContextLoss = () => {};
  } catch { /* already lost */ }
}
