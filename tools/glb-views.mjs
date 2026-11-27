// Six orthographic depth pictures of a model, used to check that a lighter copy still looks like its source.
export const GATE = { iou: 0.99, depth: 0.004 };
const SIZE = 384;
const AXES = [[0, 1, 2, 1], [0, 1, 2, -1], [2, 1, 0, 1], [2, 1, 0, -1], [0, 2, 1, 1], [0, 2, 1, -1]]; // [across, up, depth, facing]

export function triangles(doc) {
  const out = [];
  const visit = node => {
    const mesh = node.getMesh(), m = node.getWorldMatrix();
    for (const p of mesh?.listPrimitives() ?? []) {
      const pos = p.getAttribute('POSITION'), idx = p.getIndices(), n = idx ? idx.getCount() : pos.getCount(), v = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        pos.getElement(idx ? idx.getScalar(i) : i, v);
        out.push(m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]);
      }
    }
    node.listChildren().forEach(visit);
  };
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  scene.listChildren().forEach(visit);
  return out;
}

// `frame` is the source model's box: the copy is drawn in the same frame, so a shifted or shrunk copy cannot pass.
export function views(doc, frame) {
  const t = triangles(doc);
  if (!frame) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < t.length; i++) { const k = i % 3; if (t[i] < lo[k]) lo[k] = t[i]; if (t[i] > hi[k]) hi[k] = t[i]; }
    frame = { lo, span: Math.max(...hi.map((v, k) => v - lo[k])) || 1 };
  }
  const maps = AXES.map(([a, b, d, face]) => {
    const z = new Float32Array(SIZE * SIZE).fill(Infinity), s = (SIZE - 2) / frame.span;
    for (let i = 0; i < t.length; i += 9) {
      const x = [0, 3, 6].map(o => (t[i + o + a] - frame.lo[a]) * s + 1), y = [0, 3, 6].map(o => (t[i + o + b] - frame.lo[b]) * s + 1);
      const w = [0, 3, 6].map(o => face * (t[i + o + d] - frame.lo[d]) / frame.span);
      const area = (x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]);
      if (Math.abs(area) < 1e-9) continue;
      for (let py = Math.max(0, Math.floor(Math.min(...y))); py <= Math.min(SIZE - 1, Math.ceil(Math.max(...y))); py++)
        for (let px = Math.max(0, Math.floor(Math.min(...x))); px <= Math.min(SIZE - 1, Math.ceil(Math.max(...x))); px++) {
          const cx = px + 0.5, cy = py + 0.5;
          const u = ((x[1] - cx) * (y[2] - cy) - (x[2] - cx) * (y[1] - cy)) / area, v = ((x[2] - cx) * (y[0] - cy) - (x[0] - cx) * (y[2] - cy)) / area;
          if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
          const depth = u * w[0] + v * w[1] + (1 - u - v) * w[2];
          if (depth < z[py * SIZE + px]) z[py * SIZE + px] = depth;
        }
    }
    return z;
  });
  return { frame, maps };
}

// Worst view wins: silhouette overlap, and the mean depth change (share of the model's size) where both pictures have cloth.
export function compareViews(a, b) {
  let iou = 1, depth = 0;
  a.maps.forEach((m, k) => {
    const n = b.maps[k]; let both = 0, any = 0, sum = 0;
    for (let i = 0; i < m.length; i++) {
      const p = m[i] !== Infinity, q = n[i] !== Infinity;
      if (p || q) any++;
      if (p && q) { both++; sum += Math.abs(m[i] - n[i]); }
    }
    if (any) iou = Math.min(iou, both / any);
    if (both) depth = Math.max(depth, sum / both);
  });
  return { iou, depth };
}
