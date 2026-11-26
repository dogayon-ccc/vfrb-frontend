// Registry of Blender-authored garments whose 2D panels are baked into the 3D model (tier 'uv-baked'). Pure data: no three.js, no DOM.
export const UV_BAKED_TIER = 'uv-baked' as const;
export type AssetRights = 'rights_pending' | 'approved';

export interface UvBakedPart { node: string; colorKey: string; fallbackKey?: string; detail?: string }
export interface UvBakedAsset {
  id: string; version: string; garment: RegExp; sleeve: string; fits: readonly string[];
  glb: string; glbSha256: string; manifest: string; mappingSha256: string; mappingVersion: string;
  rights: AssetRights; xMirror: boolean;
  panelSvg: Record<'front' | 'back', { url: string; sha256: string }>;
  frames: Record<'front' | 'back', { x0: number; x1: number; y0: number; y1: number }>;
  transform: { rotation: [number, number, number]; scale: number; position: [number, number, number] };
  parts: readonly UvBakedPart[]; limitations: readonly string[];
}

const BASE = '/studio-assets/scrub-top-pilot01';

export const UV_BAKED_ASSETS: readonly UvBakedAsset[] = [{
  id: 'vfrb.scrub-top.pilot01', version: '1.0.0', garment: /^scrub top$/i, sleeve: 'Short', fits: ['male', 'unisex'],
  glb: `${BASE}/scrub-top-pilot01.glb`, glbSha256: '3e76dea12dbdc39609e50ade0b0c8f4aa1952190411e9f175a33e86dc98728f7',
  manifest: `${BASE}/mapping_manifest.json`, mappingSha256: 'c59c80d7c7f9c7590a233b0a299a54774078022379a77216c938ee8941878bfa', mappingVersion: '1.0.0',
  rights: 'rights_pending', xMirror: true,
  panelSvg: {
    front: { url: `${BASE}/panels_front.svg`, sha256: '5c3228212bf2b404d82ebb3f79fdb284be0acf3976c8b8d0220c8f163eb7afbc' },
    back: { url: `${BASE}/panels_back.svg`, sha256: 'd4d62bbf9398f6f1bde7c76f367f1a5833dc04e7e0ca16b8a07098f71b61496a' },
  },
  frames: {
    front: { x0: -0.61592, x1: 0.61855, y0: -0.72734, y1: 0.71677 },
    back: { x0: -0.615, x1: 0.61859, y0: -0.71988, y1: 0.72734 },
  },
  transform: { rotation: [0, 0, 0], scale: 0.7, position: [0, -0.054, 0] },
  parts: [
    { node: 'body', colorKey: 'body' },
    { node: 'sleeve_l', colorKey: 'sleeve' },
    { node: 'sleeve_r', colorKey: 'sleeveR', fallbackKey: 'sleeve' },
    { node: 'neck_band', colorKey: 'collar' },
    { node: 'chest_pocket', colorKey: 'pocket', detail: 'patchPocket' },
    { node: 'lower_pockets', colorKey: 'body', detail: 'lowerPockets' },
  ],
  limitations: ['pilot garment: source licence not confirmed', 'base size only', 'pocket side walls and the neck inside show the part colour, not artwork'],
}];

// Assets with rights_pending are for staging only: they stay hidden from clients unless VITE_STUDIO_PILOT=1 is set at build time.
export const pilotEnabled = (): boolean => (import.meta as any).env?.VITE_STUDIO_PILOT === '1';

export function uvBakedAssetFor(garment: string | null | undefined, sleeve: string | null | undefined, fit?: string | null, allowPending = pilotEnabled()): UvBakedAsset | null {
  if (!garment) return null;
  const a = UV_BAKED_ASSETS.find(x => x.garment.test(garment) && x.sleeve === sleeve && (!fit || x.fits.includes(fit)));
  if (!a) return null;
  return a.rights === 'approved' || allowPending ? a : null;
}

export interface AssetRef { assetId: string; assetVersion: string; mappingHash: string }

export const assetRefFor = (a: UvBakedAsset | null): AssetRef | null => (a ? { assetId: a.id, assetVersion: a.version, mappingHash: a.mappingSha256 } : null);

const ID_RE = /^[\w.-]{1,80}$/, HASH_RE = /^[a-f0-9]{64}$/;

// Keeps a saved reference only when all three fields are well-formed; anything else is dropped so old or damaged records still load.
export function cleanAssetRef(raw: any): AssetRef | null {
  if (!raw || typeof raw !== 'object') return null;
  const { assetId, assetVersion, mappingHash } = raw;
  return typeof assetId === 'string' && ID_RE.test(assetId) && typeof assetVersion === 'string' && ID_RE.test(assetVersion) && typeof mappingHash === 'string' && HASH_RE.test(mappingHash)
    ? { assetId, assetVersion, mappingHash } : null;
}

// False when the saved design was made against a different version or mapping than the one now shipped.
export const isAssetCurrent = (ref: AssetRef | null): boolean => !ref || UV_BAKED_ASSETS.some(a => a.id === ref.assetId && a.version === ref.assetVersion && a.mappingSha256 === ref.mappingHash);

// ── Panel artwork (customer text and logos placed on the baked garment's flat panels) ──
// Stored beside the design as `panelArt`, never in frontOverlays/backOverlays: those are positioned on the garment silhouette, these on the panel sheet.
export const PANEL_ART_MAX_OBJECTS = 40;
export const PANEL_ART_MAX_BYTES = 2_000_000;
export interface PanelArt { front: unknown[]; back: unknown[] }

const plainObjects = (a: any): unknown[] | null =>
  Array.isArray(a) && a.length <= PANEL_ART_MAX_OBJECTS && a.every(o => o && typeof o === 'object' && !Array.isArray(o)) ? a : null;

export const panelArtBytes = (art: PanelArt | null | undefined): number => (art ? JSON.stringify(art).length : 0);

// Accepts only {front: [...], back: [...]} of plain objects within the count and size caps; anything else (old, damaged, oversize) is dropped whole.
export function cleanPanelArt(raw: any): PanelArt | null {
  if (!raw || typeof raw !== 'object') return null;
  const front = plainObjects(raw.front ?? []), back = plainObjects(raw.back ?? []);
  if (!front || !back || (!front.length && !back.length)) return null;
  const art = { front, back };
  return panelArtBytes(art) <= PANEL_ART_MAX_BYTES ? art : null;
}
