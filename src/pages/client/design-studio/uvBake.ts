// GPU bake of the 2D panels into each part's UV texture. Every mapped triangle is rasterised in UV space (position = uv) with its three
// panel coordinates as a varying, so the hardware's barycentric interpolation does the per-triangle mapping. Culling is off: neither
// the UV winding nor the panel-space winding can drop a triangle. The result becomes the part's `map`.
import * as THREE from 'three';
import { panelCorners, type MappingPanel, type PanelView, type StudioMapping } from './studioMapping';

const VERT = `attribute vec2 aST; uniform vec2 uShift; varying vec2 vST;
void main(){ vST = aST; gl_Position = vec4((position.xy + uShift) * 2.0 - 1.0, 0.0, 1.0); }`;
// Colour path: the panel canvas is tagged sRGB (decoded to linear on sampling) and the render target is sRGB (re-encoded on write), so the
// baked bytes equal the panel bytes and the garment material decodes them exactly once.
const FRAG = `uniform sampler2D uPanel; varying vec2 vST;
void main(){ gl_FragColor = texture2D(uPanel, vST); }`;

export interface BakeOptions { size?: number; sizes?: Record<string, number>; pad?: number; clear?: THREE.ColorRepresentation; anisotropy?: number }

export class UvBaker {
  private targets = new Map<string, THREE.WebGLRenderTarget>();
  private panelTex = new Map<PanelView, THREE.Texture>();
  private owned = new Set<THREE.Texture>();
  private sizes: Record<string, number>;
  private geos = new Map<string, THREE.BufferGeometry>();
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mats = new Map<PanelView, THREE.ShaderMaterial>();
  readonly size: number; readonly pad: number; private clear: THREE.Color; private aniso: number;

  constructor(private gl: THREE.WebGLRenderer, readonly mapping: StudioMapping, opts: BakeOptions = {}) {
    this.size = opts.size ?? 2048; this.sizes = opts.sizes ?? {}; this.pad = opts.pad ?? 2; this.clear = new THREE.Color(opts.clear ?? 0xffffff);
    this.aniso = opts.anisotropy ?? Math.min(8, gl.capabilities.getMaxAnisotropy());
    for (const p of mapping.panels) {
      const g = new THREE.BufferGeometry(), pos = new Float32Array(p.triCount * 9);
      for (let i = 0; i < p.triCount * 3; i++) { pos[i * 3] = p.uv[i * 2]; pos[i * 3 + 1] = p.uv[i * 2 + 1]; }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aST', new THREE.BufferAttribute(panelCorners(p, mapping.frames[p.view], mapping.xMirror), 2));
      this.geos.set(p.id, g);
    }
  }

  // The 2D panel for a view, usually the Fabric canvas element. Call again (or set needsUpdate) after it changes.
  setPanel(view: PanelView, source: HTMLCanvasElement | OffscreenCanvas | THREE.Texture) {
    const prev = this.panelTex.get(view);
    if (prev && this.owned.delete(prev)) prev.dispose();
    const tex = source instanceof THREE.Texture ? source : new THREE.CanvasTexture(source as HTMLCanvasElement);
    if (!(source instanceof THREE.Texture)) { tex.encoding = THREE.sRGBEncoding; this.owned.add(tex); }
    tex.flipY = false; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
    this.panelTex.set(view, tex);
    const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uPanel: { value: tex }, uShift: { value: new THREE.Vector2() } }, side: THREE.DoubleSide, transparent: true, depthTest: false, depthWrite: false });
    this.mats.get(view)?.dispose(); this.mats.set(view, m);
  }

  sizeOf(part: string) { return this.sizes[part] ?? this.size }

  target(part: string): THREE.WebGLRenderTarget {
    let t = this.targets.get(part);
    if (!t) {
      const n = this.sizeOf(part);
      t = new THREE.WebGLRenderTarget(n, n, { depthBuffer: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true });
      t.texture.encoding = THREE.sRGBEncoding; t.texture.flipY = false; t.texture.anisotropy = this.aniso;
      this.targets.set(part, t);
    }
    return t;
  }

  // Bakes every panel of a part. Edge padding first (shifted copies), exact triangles last, so a shifted copy never covers a true texel.
  bake(part: string, clear?: THREE.ColorRepresentation): THREE.Texture {
    const rt = this.target(part), panels = this.mapping.panels.filter(p => p.part === part);
    const prevT = this.gl.getRenderTarget(), prevC = new THREE.Color(), prevA = this.gl.getClearAlpha(), prevAuto = this.gl.autoClear; this.gl.getClearColor(prevC);
    this.gl.autoClear = false; // each render() must add to the target, not wipe it
    this.gl.setRenderTarget(rt); this.gl.setClearColor(clear === undefined ? this.clear : new THREE.Color(clear), 1); this.gl.clear();
    const step = 1 / this.sizeOf(part), draw = (p: MappingPanel, dx: number, dy: number) => {
      const mat = this.mats.get(p.view); if (!mat) throw new Error(`uvBake: no panel set for view ${p.view}`);
      mat.uniforms.uShift.value.set(dx, dy); this.scene.clear();
      this.scene.add(new THREE.Mesh(this.geos.get(p.id)!, mat)); this.gl.render(this.scene, this.cam);
    };
    for (let r = this.pad; r >= 1; r--) for (const p of panels) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) draw(p, dx * r * step, dy * r * step);
    for (const p of panels) draw(p, 0, 0);
    this.gl.setRenderTarget(prevT); this.gl.setClearColor(prevC, prevA); this.gl.autoClear = prevAuto;
    return rt.texture;
  }
  bakeAll(colors: Record<string, THREE.ColorRepresentation> = {}): Record<string, THREE.Texture> {
    const out: Record<string, THREE.Texture> = {};
    for (const part of new Set(this.mapping.panels.map(p => p.part))) out[part] = this.bake(part, colors[part]);
    return out;
  }
  touchPanel(view: PanelView) { const t = this.panelTex.get(view); if (t) t.needsUpdate = true; }
  dispose() { this.targets.forEach(t => t.dispose()); this.geos.forEach(g => g.dispose()); this.mats.forEach(m => m.dispose()); this.owned.forEach(t => t.dispose()); this.owned.clear(); this.panelTex.clear(); }
}
