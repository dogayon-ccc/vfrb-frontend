// Vector flats traced from the authored Scrub Top GLBs (tools/flat-from-glb.mjs). Each face is fitted so its body box equals the top()
// template's body box, so saved overlays, bodyBounds and 3D decals keep their positions. Zone keys stay body/collar/sleeveL/sleeveR/pocket,
// mapped from the 3D part ids as garmentCapabilities AUTHORED_TOP_PARTS does; lower_pockets stays a detail on the body colour.
const RAW = import.meta.glob('../../../assets/flats/*/*.svg', { query: '?raw', import: 'default', eager: true });
const FLATS = { 'Scrub Top': { Short: 'scrub-top-vneck-short', '3/4': 'scrub-top-vneck-three-quarter' } };
const STITCH = 5, EDGE = 4;
const cache = new Map();

const f = n => Math.round(n * 10) / 10;
// A path as polygons (the flats use only absolute M/L/Z).
const polys = d => d.split(/(?=M)/).map(s => { const n = s.match(/-?\d+(?:\.\d+)?/g).map(Number); return n.flatMap((_, i) => (i % 2 ? [] : [[n[i], n[i + 1]]])); });
const toD = ps => ps.map(p => `M ${p.map(q => `${f(q[0])},${f(q[1])}`).join(' L ')} Z`).join(' ');
const area = p => p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
const box = ps => { const all = ps.flat(), xs = all.map(q => q[0]), ys = all.map(q => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
// Fabric fills non-zero, the flats are even-odd: keep the outline only (body), or wind the holes the other way (neck band ring).
const outline = ps => [ps.reduce((a, p) => (Math.abs(area(p)) > Math.abs(area(a)) ? p : a))];
const ring = ps => { const o = outline(ps)[0], s = Math.sign(area(o)); return ps.map(p => (p === o || Math.sign(area(p)) !== s ? p : [...p].reverse())); };
const seam = (a, b) => ({ d: `M ${f(a[0])},${f(a[1])} L ${f(b[0])},${f(b[1])}`, kind: 'seam', over: true });
const toward = (p, q, k) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * k, p[1] + dy / l * k]; };

// A sleeve wider than the canvas (3/4 on 320px) is lowered about its shoulder point until it fits; the shape is unchanged.
function lower(p, side, w) {
  const pivot = p.reduce((a, q) => (q[1] < a[1] ? q : a));
  for (let deg = 0; deg <= 60; deg += 2) {
    const r = deg * Math.PI / 180 * side, c = Math.cos(r), s = Math.sin(r);
    const out = p.map(([x, y]) => [pivot[0] + (x - pivot[0]) * c - (y - pivot[1]) * s, pivot[1] + (x - pivot[0]) * s + (y - pivot[1]) * c]);
    if (out.every(q => q[0] >= EDGE && q[0] <= w - EDGE)) return out;
  }
  return p;
}

// Hem stitch of a sleeve: the outline edge whose two ends are farthest from the sleeve point nearest the body's centre line.
function sleeveHem(p, cx) {
  const ref = p.reduce((a, q) => (Math.abs(q[0] - cx) < Math.abs(a[0] - cx) ? q : a));
  const [i, j] = p.map((q, k) => [Math.hypot(q[0] - ref[0], q[1] - ref[1]), k]).sort((a, b) => b[0] - a[0]).map(e => e[1]);
  return Math.abs(i - j) === 1 || Math.abs(i - j) === p.length - 1 ? seam(toward(p[i], ref, STITCH), toward(p[j], ref, STITCH)) : null;
}

function build(id, face, tpl) {
  const svg = RAW[`../../../assets/flats/${id}/${face}.svg`] ?? '';
  const raw = Object.fromEntries([...svg.matchAll(/<path id="([^"]+)"[^>]*?\sd="([^"]+)"/g)].map(m => [m[1], polys(m[2])]));
  if (!raw.body || !raw.sleeve_l || !raw.sleeve_r || !tpl.body) return null;
  const s = box(outline(raw.body)), t = box(polys(tpl.body.replace(/[QC]/g, 'L'))), sx = (t.x1 - t.x0) / (s.x1 - s.x0), sy = (t.y1 - t.y0) / (s.y1 - s.y0);
  const fit = ps => ps && ps.map(p => p.map(([x, y]) => [t.x0 + (x - s.x0) * sx, t.y0 + (y - s.y0) * sy]));
  const body = fit(outline(raw.body))[0], cx = (t.x0 + t.x1) / 2;
  const [sleeveL, sleeveR] = [raw.sleeve_l, raw.sleeve_r].map(ps => { const p = fit(outline(ps))[0]; return lower(p, box([p]).x0 < cx ? -1 : 1, tpl.w); });
  const hem = body.filter(q => q[1] > t.y1 - 2).sort((a, b) => a[0] - b[0]);
  const details = [
    hem.length > 1 && seam([hem[0][0] + STITCH, t.y1 - STITCH], [hem[hem.length - 1][0] - STITCH, t.y1 - STITCH]),
    sleeveHem(sleeveL, cx), sleeveHem(sleeveR, cx),
    ...(face === 'front' && raw.lower_pockets ? fit(raw.lower_pockets).flatMap(p => {
      const b = box([p]);
      return [{ d: toD([p]), kind: 'line', over: true, part: 'lowerPockets' }, { ...seam([b.x0 + 3, b.y0 + 6], [b.x1 - 3, b.y0 + 6]), part: 'lowerPockets' }];
    }) : []),
  ].filter(Boolean);
  // shade: null drops the old template's raster lighting map, so fabricShading applies its one vector rule to every zone.
  return { ...tpl, body: toD([body]), collar: raw.neck_band ? toD(fit(ring(raw.neck_band))) : null, sleeveL: toD([sleeveL]), sleeveR: toD([sleeveR]),
    pocket: face === 'front' && raw.chest_pocket ? toD(fit(raw.chest_pocket)) : null,
    details, sleeveDetails: [], shade: null, flat: id, flatRatio: +((s.y1 - s.y0) / (s.x1 - s.x0)).toFixed(2) };
}

// The flat for (garment, sleeve, face) fitted to the template paths `tpl`, or null (no flat, or it failed) so the caller keeps top().
export function flatPaths(garment, sleeve, face, tpl) {
  const id = FLATS[garment]?.[sleeve];
  if (!id) return null;
  const key = `${id}|${face}|${tpl.body}`;
  if (!cache.has(key)) { try { cache.set(key, build(id, face, tpl)); } catch { cache.set(key, null); } }
  return cache.get(key);
}
