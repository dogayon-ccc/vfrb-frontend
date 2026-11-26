// Exact 2D panel -> GLB UV mapping for a garment authored in Blender (Pilot 01 scrub top). Pure data and maths, no three.js, no DOM.
// The manifest stores, for every outer-wall triangle of a panel, the three corner coordinates in panel space (xy) and in the GLB's UV
// space (uv). xy is an orthographic projection of the vertex position, so it is affine inside every triangle and barycentric
// interpolation of xy across the UV triangle is exact. Nothing here fits a global transform.

export const MAPPING_FORMAT = 1;
export type PanelView = 'front' | 'back';

// Raw evidence manifest (mapping_manifest.json, mapping_version 1.0.0). Read only; never rewritten.
export interface ManifestPanel {
  id: string; part: string; view: PanelView; tri_count: number;
  mesh: { xy: number[][][]; uv: number[][][] };
}
export interface Manifest {
  mapping_version: string; master_id: string; processed_sha256: string; panels: ManifestPanel[];
}

export interface PanelFrame { view: PanelView; x0: number; x1: number; y0: number; y1: number; w: number; h: number }
export interface MappingPanel {
  id: string; part: string; view: PanelView; triCount: number;
  uv: Float64Array; // 6 numbers per triangle: u0 v0 u1 v1 u2 v2 (glTF, origin top-left)
  xy: Float64Array; // 6 numbers per triangle, manifest panel coordinates (y up), same corner order
}
export interface StudioMapping {
  masterId: string; glbSha256: string; version: string;
  panels: MappingPanel[];
  frames: Record<PanelView, PanelFrame>;
  // The manifest panels are the mirror image of the garment seen from outside (front: xy.x = -x, back: xy.x = +x). Applying the
  // mirror here, in the application layer, gives customer-facing panels that read like the garment viewed from that side.
  xMirror: boolean;
}

export function parseMapping(m: Manifest, opts: { xMirror: boolean }): StudioMapping {
  const panels: MappingPanel[] = m.panels.map(p => {
    const n = p.mesh.xy.length;
    if (n !== p.tri_count || p.mesh.uv.length !== n) throw new Error(`mapping: panel ${p.id} declares ${p.tri_count} triangles, has xy ${n} / uv ${p.mesh.uv.length}`);
    const uv = new Float64Array(n * 6), xy = new Float64Array(n * 6);
    for (let t = 0; t < n; t++) for (let c = 0; c < 3; c++) {
      uv[t * 6 + c * 2] = p.mesh.uv[t][c][0]; uv[t * 6 + c * 2 + 1] = p.mesh.uv[t][c][1];
      xy[t * 6 + c * 2] = p.mesh.xy[t][c][0]; xy[t * 6 + c * 2 + 1] = p.mesh.xy[t][c][1];
    }
    return { id: p.id, part: p.part, view: p.view, triCount: n, uv, xy };
  });
  const frame = (view: PanelView): PanelFrame => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of panels) if (p.view === view) for (let i = 0; i < p.xy.length; i += 2) {
      x0 = Math.min(x0, p.xy[i]); x1 = Math.max(x1, p.xy[i]); y0 = Math.min(y0, p.xy[i + 1]); y1 = Math.max(y1, p.xy[i + 1]);
    }
    return { view, x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
  };
  return { masterId: m.master_id, glbSha256: m.processed_sha256, version: m.mapping_version, panels, frames: { front: frame('front'), back: frame('back') }, xMirror: opts.xMirror };
}

// Panel coordinate (s right, t down, both 0..1) of a manifest xy point.
export const panelCoord = (f: PanelFrame, x: number, y: number, xMirror: boolean): [number, number] =>
  [((xMirror ? f.x1 - x : x - f.x0)) / f.w, (f.y1 - y) / f.h];

// Per-corner panel coordinates of every triangle of a panel (what the bake shader interpolates).
export function panelCorners(p: MappingPanel, f: PanelFrame, xMirror: boolean): Float32Array {
  const out = new Float32Array(p.xy.length);
  for (let i = 0; i < p.xy.length; i += 2) { const [s, t] = panelCoord(f, p.xy[i], p.xy[i + 1], xMirror); out[i] = s; out[i + 1] = t; }
  return out;
}

const area2 = (a: Float64Array, o: number) => (a[o + 2] - a[o]) * (a[o + 5] - a[o + 1]) - (a[o + 4] - a[o]) * (a[o + 3] - a[o + 1]);

export interface PanelAudit {
  id: string; triangles: number; uvOutOfRange: number;
  uvDegenerate: number;   // zero UV area: covers no texel, nothing to paint (reported, never silently hidden)
  xyDegenerate: number;   // collinear in panel space but with UV area: painted as a colour streak along the line, not dropped
  xyReversed: number;     // opposite winding to the panel majority (projection fold-over): painted, local sampling direction flips
  xyDegenerateUvArea: number; xyReversedUvArea: number; // share of the panel's total UV area
}

export function auditMapping(m: StudioMapping, eps = 1e-12): PanelAudit[] {
  return m.panels.map(p => {
    let pos = 0, neg = 0, uvOut = 0, uvDeg = 0, xyDeg = 0, totalUv = 0, degUv = 0, revUv = 0;
    const sign: number[] = [], uvA: number[] = [];
    for (let t = 0; t < p.triCount; t++) {
      const o = t * 6, a = area2(p.xy, o), ua = Math.abs(area2(p.uv, o)) / 2;
      for (let k = 0; k < 6; k++) if (p.uv[o + k] < 0 || p.uv[o + k] > 1) { uvOut++; break; }
      totalUv += ua; uvA.push(ua);
      if (ua < eps) uvDeg++;
      if (Math.abs(a) < eps) { sign.push(0); xyDeg++; if (ua >= eps) degUv += ua; } else { sign.push(a > 0 ? 1 : -1); a > 0 ? pos++ : neg++; }
    }
    const major = pos >= neg ? 1 : -1; let rev = 0;
    sign.forEach((s, t) => { if (s !== 0 && s !== major) { rev++; revUv += uvA[t]; } });
    return { id: p.id, triangles: p.triCount, uvOutOfRange: uvOut, uvDegenerate: uvDeg, xyDegenerate: xyDeg, xyReversed: rev, xyDegenerateUvArea: totalUv ? degUv / totalUv : 0, xyReversedUvArea: totalUv ? revUv / totalUv : 0 };
  });
}
