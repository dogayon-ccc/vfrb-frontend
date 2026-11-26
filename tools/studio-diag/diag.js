import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { parseMapping, panelCoord, auditMapping } from '../../src/pages/client/design-studio/studioMapping.ts';
import { UvBaker } from '../../src/pages/client/design-studio/uvBake.ts';

const J = u => fetch(u).then(r => r.json()), T = u => fetch(u).then(r => r.text());
const COL = { front: { base: '#d6e6fa', shape: '#4f8fe0', ink: '#0b3a7a', name: 'FRONT' }, back: { base: '#fbe3c4', shape: '#e59a3a', ink: '#7a3d00', name: 'BACK' } };

function drawPanel(mapping, svgs, view, mirror, W) {
  const f = mapping.frames[view], H = Math.round(W * f.h / f.w), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), k = COL[view];
  g.fillStyle = k.base; g.fillRect(0, 0, W, H);
  // silhouette from the real SVG panel (svg x = xy.x, svg y = -xy.y)
  const sx = W / f.w, sy = H / f.h; g.save();
  g.setTransform(mirror ? -sx : sx, 0, 0, sy, mirror ? f.x1 * sx : -f.x0 * sx, f.y1 * sy);
  g.fillStyle = k.shape; g.strokeStyle = k.ink; g.lineWidth = 0.004;
  for (const m of svgs[view].matchAll(/ d="([^"]+)"/g)) { const p = new Path2D(m[1]); g.fill(p, 'nonzero'); g.stroke(p); }
  g.restore();
  const to = (x, y) => { const [s, t] = panelCoord(f, x, y, mirror); return [s * W, t * H]; };
  const bboxC = id => { const p = mapping.panels.find(q => q.id === id); if (!p) return null; let a = 1e9, b = -1e9, c2 = 1e9, d = -1e9;
    for (let i = 0; i < p.xy.length; i += 2) { a = Math.min(a, p.xy[i]); b = Math.max(b, p.xy[i]); c2 = Math.min(c2, p.xy[i + 1]); d = Math.max(d, p.xy[i + 1]); } return [(a + b) / 2, (c2 + d) / 2, b - a]; };
  const label = (cx, cy, lines, size, fill = '#fff') => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${size}px Arial`; lines.forEach((l, i) => { const y = cy + (i - (lines.length - 1) / 2) * size * 1.15; g.lineWidth = size / 6; g.strokeStyle = k.ink; g.strokeText(l, cx, y); g.fillStyle = fill; g.fillText(l, cx, y); }); };
  const sl = bboxC(`sleeve_l.${view}`), sr = bboxC(`sleeve_r.${view}`), cp = bboxC('chest_pocket.front'), bd = bboxC(`body.${view}`);
  const S = W / 1280;
  if (sl) { const [x, y] = to(sl[0], sl[1]); label(x, y, ['WEARER', 'LEFT'], 30 * S); }
  if (sr) { const [x, y] = to(sr[0], sr[1]); label(x, y, ['WEARER', 'RIGHT'], 30 * S); }
  if (view === 'front' && cp) { const [x, y] = to(cp[0], cp[1]); g.beginPath(); g.arc(x, y, 62 * S, 0, 7); g.fillStyle = '#ffd400'; g.fill(); g.lineWidth = 6 * S; g.strokeStyle = '#000'; g.stroke(); label(x, y, ['LEFT', 'CHEST', 'POCKET'], 22 * S, '#000'); }
  if (bd) { const [x, y] = to(bd[0], bd[1]);
    // upward arrow
    g.fillStyle = '#d00'; g.beginPath(); g.moveTo(x, y - 190 * S); g.lineTo(x + 60 * S, y - 110 * S); g.lineTo(x + 22 * S, y - 110 * S); g.lineTo(x + 22 * S, y - 20 * S); g.lineTo(x - 22 * S, y - 20 * S); g.lineTo(x - 22 * S, y - 110 * S); g.lineTo(x - 60 * S, y - 110 * S); g.closePath(); g.fill();
    label(x, y + 40 * S, [k.name, 'ABC 123 →', 'R·F·G·7'], 52 * S); }
  return c;
}

const MODE = new URLSearchParams(location.search).get('mode') || 'mirror';

async function gradient() {
  const man = await J('/pilot/panels2d/mapping_manifest.json');
  const glb = null; const size = 2048;
  const gl = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }); gl.setSize(64, 64);
  const res = {};
  for (const mirror of [false, true]) {
    const mapping = parseMapping(man, { xMirror: mirror }), baker = new UvBaker(gl, mapping, { size, pad: 0, clear: 0x000000 });
    for (const view of ['front', 'back']) { const f = mapping.frames[view], W = 1280, H = Math.round(W * f.h / f.w), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
      let gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#f00'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#000'); gr.addColorStop(1, '#0f0'); g.fillStyle = gr; g.fillRect(0, 0, W, H); baker.setPanel(view, c); }
    baker.bakeAll(); let rng = 12345; const rnd = () => (rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296;
    const stats = {};
    for (const part of new Set(mapping.panels.map(p => p.part))) {
      const px = new Uint8Array(size * size * 4); gl.readRenderTargetPixels(baker.target(part), 0, 0, size, size, px);
      for (const pn of mapping.panels.filter(q => q.part === part)) { const f = mapping.frames[pn.view]; let n = 0, tested = 0, maxE = 0, sum = 0; const errs = [];
        const cs = panelCornersExport(pn, f, mirror);
        while (tested < 4000 && n < 400000) { n++; const t = Math.floor(rnd() * pn.triCount), o = t * 6, U = pn.uv, ax = U[o] * size, ay = U[o+1] * size, bx = U[o+2] * size, by = U[o+3] * size, cx = U[o+4] * size, cy = U[o+5] * size;
          const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 40) continue; // triangles under ~20 texels
          let r1 = rnd(), r2 = rnd(); if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; } const px0 = r1 * ax + r2 * bx + (1 - r1 - r2) * cx, py0 = r1 * ay + r2 * by + (1 - r1 - r2) * cy;
          const X = Math.floor(px0), Y = Math.floor(py0), qx = X + 0.5, qy = Y + 0.5;
          const w1 = ((by - cy) * (qx - cx) + (cx - bx) * (qy - cy)) / den, w2 = ((cy - ay) * (qx - cx) + (ax - cx) * (qy - cy)) / den, w3 = 1 - w1 - w2; if (w1 < 0.1 || w2 < 0.1 || w3 < 0.1) continue;
          const es = w1 * cs[o] + w2 * cs[o+2] + w3 * cs[o+4], et = w1 * cs[o+1] + w2 * cs[o+3] + w3 * cs[o+5]; const i = (Y * size + X) * 4; const gs = px[i] / 255, gt = px[i+1] / 255;
          const e = Math.max(Math.abs(gs - es), Math.abs(gt - et)); if (tested < 4 && pn.id === 'body.back') (window.__samples ||= []).push([mirror, es.toFixed(3), et.toFixed(3), gs.toFixed(3), gt.toFixed(3), px[i+2], px[i+3]]); tested++; maxE = Math.max(maxE, e); sum += e; errs.push(e); }
        errs.sort((a, b) => a - b); stats[`${mirror ? 'inverted' : 'existing'} ${pn.id}`] = { tested, maxErr: +maxE.toFixed(4), p99: +(errs[Math.floor(errs.length * 0.99)] ?? 0).toFixed(4), mean: +(sum / Math.max(1, tested)).toFixed(5), over0_02: errs.filter(e => e > 0.02).length }; } }
    Object.assign(res, stats); baker.dispose(); }
  window.__diag = { gradient: res, samples: window.__samples };
}
function panelCornersExport(p, f, mirror) { const out = new Float64Array(p.xy.length); for (let i = 0; i < p.xy.length; i += 2) { const [s, t] = panelCoord(f, p.xy[i], p.xy[i+1], mirror); out[i] = s; out[i+1] = t; } return out; }

async function main() {
  const man = await J('/pilot/panels2d/mapping_manifest.json');
  const svgs = { front: await T('/pilot/panels2d/panels_front.svg'), back: await T('/pilot/panels2d/panels_back.svg') };
  const glb = await new Promise((res, rej) => new GLTFLoader().load('/pilot/glb/scrub-top-pilot01.glb', res, undefined, rej));
  const W = 560, Hh = 660;
  const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); gl.setSize(W, Hh); gl.setPixelRatio(1); gl.outputEncoding = THREE.sRGBEncoding; gl.setClearColor(0xe9edf1);
  const out = { audit: null, rows: [] };
  const cell = { w: 560, h: 660 }, comp = document.createElement('canvas'); comp.width = cell.w * 4; comp.height = cell.h * 2 + 120; const cg = comp.getContext('2d');
  cg.fillStyle = '#fff'; cg.fillRect(0, 0, comp.width, comp.height);
  const variants = [{ key: 'existing', mirror: false, title: 'A. EXISTING MAPPING  (panel x = manifest xy.x)' }, { key: 'inverted', mirror: true, title: 'B. X-INVERTED  (panel x = -xy.x, applied in the app mapping layer)' }];
  for (let r = 0; r < 2; r++) {
    const v = variants[r], mapping = parseMapping(man, { xMirror: v.mirror });
    if (r === 0) out.audit = auditMapping(mapping);
    const baker = new UvBaker(gl, mapping, { size: 2048, pad: 3, clear: 0xff00ff });
    const panels = { front: drawPanel(mapping, svgs, 'front', v.mirror, 1280), back: drawPanel(mapping, svgs, 'back', v.mirror, 1280) };
    baker.setPanel('front', panels.front); baker.setPanel('back', panels.back);
    const maps = baker.bakeAll();
    const root = glb.scene.clone(true);
    root.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ map: maps[o.name], roughness: 0.95, metalness: 0, side: THREE.DoubleSide }); } });
    const scene = new THREE.Scene(); scene.add(root, new THREE.HemisphereLight(0xffffff, 0x888888, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(1, 2, 3); scene.add(dl); const dl2 = dl.clone(); dl2.position.set(-1, 2, -3); scene.add(dl2);
    const cam = new THREE.PerspectiveCamera(24, W / Hh, 0.1, 50);
    const shot = (z) => { cam.position.set(0, 0, z); cam.lookAt(0, 0, 0); gl.render(scene, cam); return gl.domElement; };
    const y0 = 70 + r * (cell.h + 50);
    cg.fillStyle = '#111'; cg.font = '700 26px Arial'; cg.textAlign = 'left'; cg.fillText(v.title, 14, y0 - 28 + (r ? 0 : 0) - 0);
    const draw2D = (cv, cx) => { const s = Math.min((cell.w - 20) / cv.width, (cell.h - 20) / cv.height); cg.drawImage(cv, cx + 10, y0 + 10, cv.width * s, cv.height * s); };
    draw2D(panels.front, 0); cg.drawImage(shot(4.2), cell.w, y0); draw2D(panels.back, cell.w * 2); cg.drawImage(shot(-4.2), cell.w * 3, y0);
    cg.fillStyle = '#222'; cg.font = '600 18px Arial'; ['2D front panel', '3D front (camera +Z)', '2D back panel', '3D back (camera -Z)'].forEach((t, i) => cg.fillText(t, i * cell.w + 12, y0 + 24));
    // unfilled (magenta clear colour) texels in the baked texture of the body part
    const px = new Uint8Array(2048 * 2048 * 4); gl.readRenderTargetPixels(baker.target('body'), 0, 0, 2048, 2048, px); let mag = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 240 && px[i + 1] < 20 && px[i + 2] > 240) mag++;
    const cen = {}; for (const part of ['body']) for (const pn of mapping.panels.filter(q => q.part === part)) { let m2 = 0; for (let t = 0; t < pn.triCount; t++) { const u = (pn.uv[t*6]+pn.uv[t*6+2]+pn.uv[t*6+4])/3, vv = (pn.uv[t*6+1]+pn.uv[t*6+3]+pn.uv[t*6+5])/3; const X = Math.min(2047, Math.floor(u*2048)), Y = Math.min(2047, Math.floor(vv*2048)); const i = (Y*2048+X)*4; if (px[i] > 240 && px[i+1] < 20 && px[i+2] > 240) m2++; } cen[pn.id] = m2 + '/' + pn.triCount; }
    out.rows.push({ key: v.key, bodyUnfilledTexels: mag, magentaCentroids: cen });
    baker.dispose();
  }
  out.png = comp.toDataURL('image/png'); window.__diag = out;
}
(MODE === 'gradient' ? gradient() : main()).catch(e => { window.__diag = { error: String(e && e.stack || e) }; });
