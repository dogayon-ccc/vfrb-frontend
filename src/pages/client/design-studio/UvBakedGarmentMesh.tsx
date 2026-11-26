import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { parseMapping, type Manifest, type PanelView, type StudioMapping } from './studioMapping';
import { UvBaker } from './uvBake';
import { partMaterial } from './ScannedGarmentMesh';
import { DEFAULT_GARMENT_COLOR } from './regionTexture';
import type { UvBakedAsset } from './studioAssets';
import { modelUrl } from '../../../lib/modelUrl';
import { sha256Hex } from './pilotPanels';

const COARSE = window.matchMedia('(pointer: coarse)').matches;
const BIG = COARSE ? 1024 : 2048, SMALL = 1024;
const SIZES: Record<string, number> = { body: BIG, sleeve_l: BIG, sleeve_r: BIG, neck_band: SMALL, chest_pocket: SMALL, lower_pockets: SMALL };
const PANEL_VIEWS: PanelView[] = ['front', 'back'];

const mappings = new Map<string, Promise<StudioMapping>>();

// Fetches the mapping manifest once per asset version and refuses a file whose hash or GLB reference differs from the registry.
function loadMapping(asset: UvBakedAsset): Promise<StudioMapping> {
  const key = `${asset.id}@${asset.version}`;
  let p = mappings.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch(asset.manifest);
      if (!res.ok) throw new Error(`uv-baked: manifest ${asset.manifest} returned ${res.status}`);
      const buf = await res.arrayBuffer(), hash = await sha256Hex(buf);
      if (hash && hash !== asset.mappingSha256) throw new Error(`uv-baked: manifest hash mismatch for ${asset.id}`);
      const m = JSON.parse(new TextDecoder().decode(buf)) as Manifest;
      if (m.processed_sha256 !== asset.glbSha256) throw new Error(`uv-baked: manifest does not belong to the registered GLB of ${asset.id}`);
      return parseMapping(m, { xMirror: asset.xMirror });
    })();
    p.catch(() => mappings.delete(key));
    mappings.set(key, p);
  }
  return p;
}

function useMapping(asset: UvBakedAsset): StudioMapping | null {
  const [state, setState] = useState<{ mapping?: StudioMapping; error?: Error }>({});
  useEffect(() => {
    let stale = false;
    loadMapping(asset).then(mapping => { if (!stale) setState({ mapping }); }, error => { if (!stale) setState({ error }); });
    return () => { stale = true; };
  }, [asset]);
  if (state.error) throw state.error;
  return state.mapping ?? null;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export interface UvBakedGarmentMeshProps {
  asset: UvBakedAsset;
  colors?: Record<string, string>;
  details?: Record<string, { show?: boolean }> | null;
  // Transparent 2D artwork per view, drawn in the panel frame. Bump panelsVersion after drawing into the same canvases.
  panels?: Partial<Record<PanelView, HTMLCanvasElement>> | null;
  panelsVersion?: number;
  onPickZone?: ((colorKey: string, node: string) => void) | null;
  onReady?: (() => void) | null;
}

export default function UvBakedGarmentMesh({ asset, colors = {}, details = null, panels = null, panelsVersion = 0, onPickZone = null, onReady = null }: UvBakedGarmentMeshProps) {
  const { gl, invalidate } = useThree();
  const { nodes } = useGLTF(modelUrl(asset.glb)) as any;
  const mapping = useMapping(asset);
  useEffect(() => () => { Object.values(nodes).forEach((n: any) => n.geometry?.dispose()); }, [nodes]);

  const [baker, setBaker] = useState<UvBaker | null>(null);
  useEffect(() => {
    if (!mapping) return;
    const b = new UvBaker(gl, mapping, { sizes: SIZES });
    setBaker(b);
    return () => { b.dispose(); setBaker(null); };
  }, [gl, mapping]);

  const materials = useMemo(() => (baker ? Object.fromEntries(asset.parts.map(p => [p.node, partMaterial('#ffffff', {}, baker.target(p.node).texture)])) : null), [baker, asset]);
  useEffect(() => () => { if (materials) Object.values(materials).forEach((m: any) => m.dispose()); }, [materials]);

  const colorSig = useDebounced(JSON.stringify(asset.parts.map(p => colors[p.colorKey] ?? (p.fallbackKey ? colors[p.fallbackKey] : undefined) ?? colors.body ?? DEFAULT_GARMENT_COLOR)), 120);
  const blank = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c; }, []);
  const wired = useRef<{ baker: UvBaker; panels: typeof panels } | null>(null);
  const [baked, setBaked] = useState<UvBaker | null>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    if (!baker) return;
    if (wired.current?.baker !== baker || wired.current.panels !== panels) {
      for (const v of PANEL_VIEWS) baker.setPanel(v, panels?.[v] ?? blank);
      wired.current = { baker, panels };
    } else for (const v of PANEL_VIEWS) baker.touchPanel(v);
    const base: string[] = JSON.parse(colorSig);
    asset.parts.forEach((p, i) => baker.bake(p.node, base[i]));
    setBaked(baker);
    invalidate();
    ready.current?.();
  }, [baker, asset, panels, panelsVersion, colorSig, blank, invalidate]);

  if (!materials || baked !== baker) return null;
  const { rotation, scale, position } = asset.transform;
  const pick = (key: string, node: string) => (onPickZone ? (e: any) => { if (e.delta > 6) return; e.stopPropagation(); onPickZone(key, node); } : undefined);
  return (
    <group rotation={rotation} scale={scale} position={position}>
      {asset.parts.filter(p => !(p.detail && details?.[p.detail]?.show === false)).map(p => nodes[p.node]?.geometry && (
        <mesh key={p.node} geometry={nodes[p.node].geometry} material={materials[p.node]} onClick={pick(p.colorKey, p.node)} />
      ))}
    </group>
  );
}
