// Fabric look: the cloth surface a design is previewed on (poplin, twill, piqué, knit...). Pure pixel math, no DOM, so it is testable in Node
// and the Studio only turns the numbers into a canvas tile. It changes how the colour is lit (a multiply layer, never the colour itself).
// It is a preview of the weave only: the real fabric, weight and supplier are confirmed by VFRB, and the AI material recommendation is separate.
export const TILE = 96; // every weave period divides 96, so the tile repeats without a seam

export interface FabricLook { id: string; label: string; hint: string; amp: number; period: number }
export const FABRIC_LOOKS: FabricLook[] = [
  { id: 'plain',  label: 'Standard',   hint: 'The default soft grain',                      amp: 0,  period: 8 },
  { id: 'poplin', label: 'Poplin',     hint: 'Fine, smooth shirting weave',                 amp: 11, period: 2 },
  { id: 'twill',  label: 'Twill',      hint: 'Diagonal rib: trousers, work and drill cloth', amp: 17, period: 6 },
  { id: 'pique',  label: 'Pique',      hint: 'Small raised diamonds: polo shirts',          amp: 18, period: 12 },
  { id: 'jersey', label: 'Jersey knit', hint: 'Fine knit columns: tees and sport polos',     amp: 14, period: 12 },
  { id: 'oxford', label: 'Oxford',     hint: 'Basket weave: button-down shirts',            amp: 15, period: 8 },
  { id: 'scrub',  label: 'Scrub blend', hint: 'Tight polyester-blend twill: healthcare',     amp: 10, period: 4 },
  { id: 'canvas', label: 'Canvas',     hint: 'Coarse plain weave with slubs: aprons, work wear', amp: 22, period: 8 },
  { id: 'denim',  label: 'Denim',      hint: 'Steep twill with a speckled weft',            amp: 23, period: 8 },
];
export const LOOK_IDS = FABRIC_LOOKS.map(l => l.id);
export const DEFAULT_LOOK = 'plain';
export const lookById = (id: unknown): FabricLook => FABRIC_LOOKS.find(l => l.id === id) ?? FABRIC_LOOKS[0];
// Anything unknown (old saves, hostile input) becomes the default look.
export const normalizeLook = (id: unknown): string => (typeof id === 'string' && LOOK_IDS.includes(id) ? id : DEFAULT_LOOK);

const tri = (x: number, p: number) => { const t = ((x % p) + p) % p / p; return t < 0.5 ? t * 2 : 2 - t * 2; };   // 0..1..0 over one period
const sm = (t: number) => t * t * (3 - 2 * t);

// How much darker (0..1) the weave makes pixel (i, j) before noise. Periodic in both axes with period dividing TILE.
export function weaveBase(id: string, i: number, j: number): number {
  switch (id) {
    case 'poplin': return ((i + j) % 2 === 0 ? 0.55 : 0.2) + (i % 4 < 2 ? 0.12 : 0);
    case 'twill': return sm(tri(i + j, 6));
    case 'scrub': return sm(tri(i + j, 4)) * 0.8;
    case 'denim': return sm(tri(2 * i + j, 8)) * 0.85 + (j % 4 === 0 ? 0.12 : 0);
    case 'pique': { const x = tri(i, 12) - 0.5, y = tri(j, 12) - 0.5; return sm(Math.min(1, (Math.abs(x) + Math.abs(y)) * 2)); } // diamond cells: dark in the groove, light on the raised centre
    case 'jersey': { const col = i % 4, v = Math.abs(((j + (col < 2 ? col : 4 - col) * 2) % 6) - 3) / 3; return (col === 0 ? 0.55 : col === 2 ? 0.25 : 0.4) * 0.5 + v * 0.55; }
    case 'oxford': { const block = (Math.floor(i / 4) + Math.floor(j / 4)) % 2; return (block ? (i % 2 ? 0.7 : 0.2) : (j % 2 ? 0.7 : 0.2)); }
    case 'canvas': return ((i % 4 < 2) !== (j % 4 < 2) ? 0.35 : 0.8) + (((i >> 2) + (j >> 2)) % 2 ? 0.1 : 0);
    default: return 0;
  }
}

// Greyscale RGBA bytes of the weave tile: 255 where the cloth is lit, down to 255 * (1 - amp) in the deepest groove.
export function lookPixels(id: string, size = TILE): Uint8ClampedArray {
  const look = lookById(id), out = new Uint8ClampedArray(size * size * 4);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const slub = id === 'canvas' || id === 'denim' ? (((j >> 1) * 37) % 5 === 0 ? 0.18 : 0) : 0;   // thread-thickness variation along the weft
    const v = Math.min(1, Math.max(0, weaveBase(id, i, j) * 0.85 + rnd() * 0.15 + slub));
    const k = (j * size + i) * 4, g = Math.round(255 * (1 - (look.amp / 100) * v));
    out[k] = out[k + 1] = out[k + 2] = g; out[k + 3] = 255;
  }
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();
// The weave as a canvas tile (browser only). Null for the standard look: the Studio keeps its original grain there.
export function lookTile(id: string): HTMLCanvasElement | null {
  const key = normalizeLook(id);
  if (key === DEFAULT_LOOK || typeof document === 'undefined') return null;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = TILE;
    const img = new ImageData(lookPixels(key) as any, TILE, TILE);
    c.getContext('2d')!.putImageData(img, 0, 0);
    cache.set(key, c);
  }
  return c;
}

// A swatch of the weave for the picker: the tile enlarged, lit like cloth on a neutral base colour.
export function lookSwatchUrl(id: string, base = '#c9d3df', px = 72): string {
  const k = normalizeLook(id);
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d')!; x.fillStyle = base; x.fillRect(0, 0, px, px);
  const tile = k === DEFAULT_LOOK ? null : lookTile(k);
  if (tile) { x.globalCompositeOperation = 'multiply'; x.imageSmoothingEnabled = false; x.drawImage(tile, 0, 0, TILE, TILE, 0, 0, px * 2, px * 2); }
  return c.toDataURL('image/png');
}
