import { hasScreenEyedropper, pickScreenColour } from './eyedropper';
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { Canvas as FabricCanvas, FabricImage, FabricText, Point, type FabricObject } from 'fabric';
import { PANEL_ART_MAX_OBJECTS, type UvBakedAsset, type PanelArt } from './studioAssets';
import {
  parsePanelSvg, canvasSize, frameSize, panelTransform, pocketBackings, PART_LABEL, sha256Hex, withoutCarriageReturns,
  type PanelSide, type SvgPanel,
} from './pilotPanels';
import { panelSpots, spotScale, type PanelSpot } from './panelSpots';
import { hasWebGL } from './webglSupport';
import './pilotStudio.css';

const PilotViewport3D = lazy(() => import('./PilotViewport3D'));

const SIDES: PanelSide[] = ['front', 'back'];
const DEFAULT_COLOR = '#1B2A4A';
const HEX = /^#[0-9a-f]{6}$/i;
const PALETTE: [string, string][] = [
  ['Navy', '#1B2A4A'], ['Royal blue', '#2A52A8'], ['Sky blue', '#87CEEB'], ['Forest green', '#006B54'], ['Maroon', '#7A0000'], ['Grey', '#808080'], ['Black', '#111111'],
  ['White', '#FFFFFF'], ['Red', '#C8102E'], ['Yellow', '#FFD100'], ['Orange', '#F57C00'], ['Purple', '#6A1B9A'], ['Teal', '#028090'], ['Pink', '#FFB6C1'],
];
const FONTS: [string, string][] = [['Serif', '"DM Serif Display", Georgia, serif'], ['Sans', 'Arial, Helvetica, sans-serif'], ['Bold sans', '"Arial Black", Arial, sans-serif']];
const MAX_UPLOAD = 4 * 1024 * 1024, UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const TEX_W = 1024;
const DETAIL_PARTS = new Set(['chest_pocket', 'lower_pockets', 'neck_band']);
const POCKET_PARTS = new Set(['chest_pocket', 'lower_pockets']); // rectangles: their traced outline has gaps, so a body-coloured box sits behind them

// Light fills get a dark seam line and dark fills a light one, so pockets and the neck band stay readable at any colour.
function edgeFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? 'rgba(27,42,74,0.45)' : 'rgba(255,255,255,0.5)';
}

export type Mode = 'pattern' | 'split' | '3d';
type Details = Record<string, { show: boolean }>;
interface ArtInfo { kind: 'text' | 'image'; text: string; fill: string; font: string; size: number; angle: number; opacity: number; widthPct: number }

const sheetSize = (host: { w: number; h: number }, aspect: number) => (host.w / host.h > aspect ? { w: host.h * aspect, h: host.h } : { w: host.w, h: host.w / aspect });

function useNarrow() {
  const q = '(max-width: 900px)';
  const [n, setN] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q), f = () => setN(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return n;
}

const styleControls = (o: FabricObject) => o.set({ transparentCorners: false, cornerColor: '#016a77', cornerStrokeColor: '#ffffff', cornerStyle: 'rect', cornerSize: 22, touchCornerSize: 44, borderColor: '#016a77', borderDashArray: [6, 4], padding: 4 });

function readArt(o: FabricObject | undefined, panelW: number): ArtInfo | null {
  if (!o) return null;
  const t = o as any, isText = o.type === 'text' || o.type === 'Text' || typeof t.text === 'string';
  return {
    kind: isText ? 'text' : 'image', text: isText ? String(t.text ?? '') : '', fill: isText && typeof t.fill === 'string' ? t.fill : '#000000', font: isText ? String(t.fontFamily ?? '') : '',
    size: isText ? Math.round(t.fontSize * (t.scaleY ?? 1)) : 0, angle: Math.round(((o.angle ?? 0) % 360 + 360) % 360), opacity: o.opacity ?? 1, widthPct: Math.round((o.getScaledWidth() / panelW) * 100),
  };
}

async function downscaleToDataUrl(file: File, max = 1024): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('unreadable')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}

export type PanelDetails = Record<string, { show: boolean }>;

// Imperative handle for the host Studio: a flat front/back picture of the design (for thumbnails and the order preview).
export interface PanelWorkspaceHandle { preview: (side: PanelSide) => string | null }

export interface PanelWorkspaceProps {
  asset: UvBakedAsset;
  colors: Record<string, string>;
  setColors: (update: (prev: Record<string, string>) => Record<string, string>) => void;
  details: PanelDetails;
  setDetails: (update: (prev: PanelDetails) => PanelDetails) => void;
  /** Artwork to open with; read once per garment. */
  initialArt: PanelArt | null;
  /** Called (debounced) with the current artwork. Return 'full' when it could not be kept. */
  onArt: (art: PanelArt) => 'saved' | 'full' | void;
  persist: 'device' | 'design';
  embedded?: boolean;
  title?: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  initialNotice?: string | null;
  handleRef?: Ref<PanelWorkspaceHandle>;
  readOnly?: boolean;
  /** Controlled view: the host Studio's top-bar 2D/3D switch drives it. Omit for the standalone page. */
  mode?: Mode;
  onMode?: (m: Mode) => void;
}

export function PanelWorkspace({ asset, colors, setColors, details, setDetails, initialArt, onArt, persist, embedded = false, title = 'Scrub top, short sleeve', subtitle = 'Pilot garment, base size only. Source licence not confirmed.', headerExtra, initialNotice = null, handleRef, readOnly = false, mode: modeProp, onMode: onModeProp }: PanelWorkspaceProps) {
  const narrow = useNarrow();
  const [modeLocal, setModeLocal] = useState<Mode>('split');
  const mode = modeProp ?? modeLocal;
  const setMode = useCallback((m: Mode) => { if (onModeProp) onModeProp(m); else setModeLocal(m); }, [onModeProp]);
  const [side, setSide] = useState<PanelSide>('front');
  const [selPart, setSelPart] = useState('body');
  // Eyedropper fallback for browsers without the screen EyeDropper API: arm it, then tap a part to copy its colour onto the target.
  const [armed, setArmed] = useState<'part' | 'text' | null>(null);
  const armObj = useRef<FabricObject | null>(null), takeRef = useRef<(node: string) => boolean>(() => false);
  const [sel, setSel] = useState<ArtInfo | null>(null);
  const [counts, setCounts] = useState<Record<PanelSide, number>>({ front: 0, back: 0 });
  const [svg, setSvg] = useState<{ state: 'loading' | 'error' | 'ready'; panels: Record<PanelSide, SvgPanel[]> }>({ state: 'loading', panels: { front: [], back: [] } });
  const [panelsVersion, setPanelsVersion] = useState(0);
  const [ready3d, setReady3d] = useState(false);
  const [notice, setNotice] = useState<string | null>(initialNotice);
  const [problem, setProblem] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'full'>('idle');
  const [confirmClear, setConfirmClear] = useState(false);
  const [tab, setTab] = useState<'parts' | 'add' | 'layers'>('parts');
  const [mtab, setMtab] = useState<'parts' | 'colour' | 'add' | 'layers' | 'edit'>('parts');
  const [hostSize, setHostSize] = useState<Record<PanelSide, { w: number; h: number }>>({ front: { w: 0, h: 0 }, back: { w: 0, h: 0 } });

  const hosts = useRef<Record<PanelSide, HTMLDivElement | null>>({ front: null, back: null });
  const fabricRoots = useRef<Record<PanelSide, HTMLDivElement | null>>({ front: null, back: null });
  const texCanvases = useMemo(() => {
    const mk = (s: PanelSide) => { const c = document.createElement('canvas'), { width, height } = canvasSize(asset.frames[s], TEX_W); c.width = width; c.height = height; return c; };
    return { front: mk('front'), back: mk('back') };
  }, [asset]);
  const fcs = useRef<Partial<Record<PanelSide, FabricCanvas>>>({});
  const hydrated = useRef(false);
  const loading = useRef(false);
  const [artTick, setArtTick] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialArtRef = useRef(initialArt), onArtRef = useRef(onArt);
  onArtRef.current = onArt;
  const objectsOf = (c: FabricCanvas | undefined): unknown[] => ((c?.toJSON() as { objects?: unknown[] } | undefined)?.objects ?? []);
  const webgl = useMemo(() => hasWebGL(), []);
  const view = narrow && mode === 'split' ? 'pattern' : mode;
  const frames = asset.frames;

  const partColor = useCallback((node: string) => {
    const p = asset.parts.find(x => x.node === node)!;
    return colors[p.colorKey] ?? (p.fallbackKey ? colors[p.fallbackKey] : undefined) ?? colors.body ?? DEFAULT_COLOR;
  }, [asset, colors]);
  const hidden = useCallback((node: string) => { const p = asset.parts.find(x => x.node === node); return !!(p?.detail && details[p.detail]?.show === false); }, [asset, details]);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const out = { front: [] as SvgPanel[], back: [] as SvgPanel[] };
        for (const s of SIDES) {
          const res = await fetch(asset.panelSvg[s].url);
          if (!res.ok) throw new Error(`panel ${s}: ${res.status}`);
          const buf = withoutCarriageReturns(await res.arrayBuffer()), hash = await sha256Hex(buf);
          if (hash && hash !== asset.panelSvg[s].sha256) throw new Error(`panel ${s}: hash mismatch`);
          out[s] = parsePanelSvg(new TextDecoder().decode(buf));
          if (!out[s].length) throw new Error(`panel ${s}: no outlines`);
        }
        if (!stale) setSvg({ state: 'ready', panels: out });
      } catch { if (!stale) setSvg(s => ({ ...s, state: 'error' })); }
    })();
    return () => { stale = true; };
  }, [asset]);

  const bump = useRef<{ t: number; timer: number | null }>({ t: 0, timer: null });
  const paintTex = useCallback(() => {
    for (const s of SIDES) {
      const t = texCanvases[s], ctx = t.getContext('2d'); if (!ctx) continue;
      ctx.clearRect(0, 0, t.width, t.height);
      fcs.current[s]?.getObjects().forEach(o => { if (o.visible) o.render(ctx); });
    }
  }, [texCanvases]);
  const touch3d = useCallback(() => {
    const now = performance.now(), wait = 110 - (now - bump.current.t);
    const fire = () => { bump.current.t = performance.now(); bump.current.timer = null; paintTex(); setPanelsVersion(v => v + 1); };
    if (wait <= 0) fire(); else if (bump.current.timer == null) bump.current.timer = window.setTimeout(fire, wait);
  }, [paintTex]);

  const syncSelection = useCallback((s: PanelSide) => {
    const c = fcs.current[s];
    setSel(readArt(c?.getActiveObject() ?? undefined, c?.getWidth() ?? TEX_W));
  }, []);

  useEffect(() => {
    let cancelled = false; // this run's canvases are disposed on cleanup: a restore still in flight must stop, not report a failure (StrictMode and late-arriving frames both re-run this effect)
    const made: FabricCanvas[] = [];
    for (const s of SIDES) {
      const host = fabricRoots.current[s]; if (!host) continue;
      const el = document.createElement('canvas'), { width, height } = canvasSize(frames[s], TEX_W);
      host.appendChild(el);
      const c = new FabricCanvas(el, { width, height, enableRetinaScaling: false, preserveObjectStacking: true, selection: false, backgroundColor: '' });
      fcs.current[s] = c; made.push(c);
      const changed = () => { if (loading.current) return; setCounts(n => ({ ...n, [s]: c.getObjects().length })); setArtTick(t => t + 1); };
      c.on('after:render', touch3d);
      c.on('object:added', changed); c.on('object:removed', changed); c.on('object:modified', () => { changed(); syncSelection(s); });
      c.on('selection:created', () => syncSelection(s)); c.on('selection:updated', () => syncSelection(s)); c.on('selection:cleared', () => setSel(null));
      c.on('mouse:down', (o: any) => {
        if (o.target || !o.e) return;
        const pt = o.e.touches?.[0] ?? o.e, hit = document.elementsFromPoint(pt.clientX, pt.clientY).find(e => (e as HTMLElement).dataset?.part) as HTMLElement | undefined;
        if (hit?.dataset.part && !takeRef.current(hit.dataset.part)) setSelPart(hit.dataset.part);
      });
    }

    (async () => {
      const init = initialArtRef.current;
      if (init && (init.front.length || init.back.length)) {
        loading.current = true;
        let restored = true;
        try {
          // Text is measured when it is created, so every face the saved art uses must be loaded first or it is laid out in the fallback font.
          const faces = new Set<string>();
          for (const s of SIDES) for (const o of (init[s] ?? []) as any[]) if (typeof o?.fontFamily === 'string') faces.add(`${o.fontWeight ?? 'normal'} ${o.fontStyle ?? 'normal'} 64px ${o.fontFamily}`);
          await Promise.all([...faces].map(f => document.fonts.load(f).catch(() => [])));
          if (cancelled) return;
          for (const s of SIDES) {
            const objs = init[s] ?? [], c = fcs.current[s];
            if (!objs.length || !c) continue;
            await c.loadFromJSON({ objects: objs });
            if (cancelled) return;
            c.getObjects().forEach(o => { styleControls(o); o.setCoords(); }); c.requestRenderAll();
          }
          setCounts({ front: fcs.current.front?.getObjects().length ?? 0, back: fcs.current.back?.getObjects().length ?? 0 });
          paintTex(); setPanelsVersion(v => v + 1);
        } catch (e) {
          if (cancelled) return;
          restored = false;
          console.error('PanelWorkspace: saved artwork could not be restored', e);
          setNotice('The saved artwork could not be opened and was left untouched.');
        }
        if (cancelled) return;
        loading.current = false;
        // A failed restore leaves the canvases empty: autosave stays off so it cannot replace the saved artwork with nothing.
        if (!restored) return;
      }
      if (!cancelled) hydrated.current = true;
    })();

    return () => {
      cancelled = true;
      hydrated.current = false; loading.current = false;
      made.forEach(c => { c.off(); c.dispose(); });
      SIDES.forEach(s => fabricRoots.current[s]?.replaceChildren());
      fcs.current = {};
      if (bump.current.timer != null) window.clearTimeout(bump.current.timer);
    };
  }, [frames, syncSelection, touch3d, paintTex]);

  useEffect(() => {
    const obs = SIDES.map(s => {
      const el = hosts.current[s]; if (!el) return null;
      const o = new ResizeObserver(([e]) => setHostSize(h => ({ ...h, [s]: { w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) } })));
      o.observe(el); return o;
    });
    return () => obs.forEach(o => o?.disconnect());
  }, [view]);

  useEffect(() => { if (narrow && sel) setMtab('edit'); }, [narrow, !!sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheets = useMemo(() => {
    const r = {} as Record<PanelSide, { w: number; h: number }>;
    for (const s of SIDES) { const { w, h } = frameSize(frames[s]); r[s] = sheetSize(hostSize[s].w > 0 ? hostSize[s] : { w: 1, h: 1 }, w / h); }
    return r;
  }, [hostSize, frames]);

  useEffect(() => {
    for (const s of SIDES) { const c = fcs.current[s]; if (c && hostSize[s].w > 0) c.setDimensions({ width: Math.round(sheets[s].w), height: Math.round(sheets[s].h) }, { cssOnly: true }); }
  }, [sheets, hostSize]);

  useEffect(() => {
    if (!hydrated.current) return;
    const t = window.setTimeout(() => {
      try {
        const r = onArtRef.current({ front: objectsOf(fcs.current.front), back: objectsOf(fcs.current.back) });
        setSaveState(r === 'full' ? 'full' : 'saved');
      } catch { setSaveState('full'); }
    }, 500);
    return () => window.clearTimeout(t);
  }, [colors, details, artTick]);

  const active = fcs.current[side];
  const add = (o: FabricObject) => {
    const c = fcs.current[side]; if (!c || readOnly) return;
    if (c.getObjects().length >= PANEL_ART_MAX_OBJECTS) return setProblem(`The ${side} holds at most ${PANEL_ART_MAX_OBJECTS} pieces of artwork. Delete one to add another.`);
    styleControls(o); c.add(o); c.setActiveObject(o); c.requestRenderAll(); };

  const addText = async () => {
    setProblem(null);
    try { await document.fonts.load('64px "DM Serif Display"'); } catch { /* falls back to Georgia */ }
    const c = fcs.current[side]; if (!c) return;
    add(new FabricText('Your text', { left: c.getWidth() / 2, top: c.getHeight() * 0.3, originX: 'center', originY: 'center', fontSize: 72, fontFamily: FONTS[0][1], fill: '#FFFFFF' }));
  };

  const addLogo = async (file: File | undefined) => {
    setProblem(null);
    if (!file) return;
    if (!UPLOAD_TYPES.includes(file.type)) return setProblem('Use a PNG, JPEG or WebP image.');
    if (file.size > MAX_UPLOAD) return setProblem('That image is larger than 4 MB. Use a smaller file.');
    try {
      const img = await FabricImage.fromURL(await downscaleToDataUrl(file)), c = fcs.current[side]; if (!c) return;
      img.scaleToWidth(Math.min(img.width, c.getWidth() * 0.3));
      img.set({ left: c.getWidth() / 2, top: c.getHeight() * 0.3, originX: 'center', originY: 'center' });
      add(img);
    } catch { setProblem('That image could not be read. Try another file.'); }
  };

  const patch = (props: Record<string, unknown>) => {
    const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o) return;
    o.set(props); o.setCoords(); c.requestRenderAll(); setArtTick(t => t + 1); syncSelection(side);
  };

  const applyPicked = (target: 'part' | 'text', hex: string) => {
    const h = hex.toUpperCase();
    if (target === 'part') { setColor(selPart, h); return; }
    const c = fcs.current[side], o = armObj.current ?? c?.getActiveObject();
    if (!c || !o) return;
    o.set({ fill: h }); o.setCoords(); c.requestRenderAll(); setArtTick(t => t + 1); syncSelection(side);
  };
  takeRef.current = (node: string) => {
    if (!armed) return false;
    applyPicked(armed, partColor(node)); armObj.current = null; setArmed(null); return true;
  };
  const eyedrop = (target: 'part' | 'text') => (
    <button type="button" className="ps-btn ps-btn--quiet" aria-pressed={armed === target} disabled={readOnly}
      onClick={async () => {
        if (armed === target) { armObj.current = null; setArmed(null); return; }
        if (target === 'text') armObj.current = fcs.current[side]?.getActiveObject() ?? null;
        if (hasScreenEyedropper()) { const hex = await pickScreenColour(); if (hex) applyPicked(target, hex); armObj.current = null; return; }
        setArmed(target);
      }}>
      {armed === target ? 'Tap a part to copy its colour (tap again to cancel)' : hasScreenEyedropper() ? 'Pick colour from screen' : 'Pick colour from a part'}
    </button>
  );

  const setWidthPct = (pct: number) => {
    const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o) return;
    o.scaleToWidth((c.getWidth() * pct) / 100); o.setCoords(); c.requestRenderAll(); setArtTick(t => t + 1); syncSelection(side);
  };

  const removeActive = () => { const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o) return; c.remove(o); c.discardActiveObject(); c.requestRenderAll(); };
  const reorder = (up: boolean) => { const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o) return; up ? c.bringObjectForward(o) : c.sendObjectBackwards(o); c.requestRenderAll(); setArtTick(t => t + 1); };
  const duplicate = async () => {
    const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o || readOnly) return;
    if (c.getObjects().length >= PANEL_ART_MAX_OBJECTS) return setProblem(`The ${side} holds at most ${PANEL_ART_MAX_OBJECTS} pieces of artwork. Delete one to add another.`);
    try {
      const copy = await o.clone();
      copy.set({ left: (o.left ?? 0) + 24, top: (o.top ?? 0) + 24 }); styleControls(copy);
      c.add(copy); c.setActiveObject(copy); c.requestRenderAll(); syncSelection(side);
    } catch { setProblem('That piece of artwork could not be copied.'); }
  };
  const mirror = () => patch({ flipX: !(fcs.current[side]?.getActiveObject()?.flipX ?? false) });
  // Align the selected artwork to the edges or centre of the panel's frame (its visible bounds, so rotation and scale are respected).
  const alignTo = (edge: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
    const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o) return;
    const b = o.getBoundingRect(), W = c.getWidth(), H = c.getHeight();
    const dx = edge === 'left' ? -b.left : edge === 'right' ? W - (b.left + b.width) : edge === 'centerX' ? (W - b.width) / 2 - b.left : 0;
    const dy = edge === 'top' ? -b.top : edge === 'bottom' ? H - (b.top + b.height) : edge === 'centerY' ? (H - b.height) / 2 - b.top : 0;
    o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy }); o.setCoords(); c.requestRenderAll(); setArtTick(t => t + 1); syncSelection(side);
  };
  const spots = useMemo(() => (svg.state === 'ready' ? panelSpots(svg.panels[side], side, frames[side], TEX_W) : []), [svg, side, frames]);
  const placeAt = (spot: PanelSpot) => {
    const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o || readOnly) return;
    const k = spotScale(o.getScaledWidth(), o.getScaledHeight(), spot);
    o.set({ scaleX: (o.scaleX ?? 1) * k, scaleY: (o.scaleY ?? 1) * k });
    o.setPositionByOrigin(new Point(spot.cx, spot.cy), 'center', 'center'); o.setCoords(); c.requestRenderAll(); setArtTick(t => t + 1); syncSelection(side);
  };
  const clearSide = () => { const c = fcs.current[side]; if (!c) return; c.remove(...c.getObjects()); c.discardActiveObject(); c.requestRenderAll(); setConfirmClear(false); };

  const onStageKey = (e: React.KeyboardEvent) => {
    const c = fcs.current[side], o = c?.getActiveObject(); if (!c || !o || (e.target as HTMLElement).tagName === 'INPUT') return;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeActive(); return; }
    if (e.key === 'Escape') { c.discardActiveObject(); c.requestRenderAll(); return; }
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (d[e.key]) { e.preventDefault(); o.set({ left: (o.left ?? 0) + d[e.key][0], top: (o.top ?? 0) + d[e.key][1] }); o.setCoords(); c.requestRenderAll(); setArtTick(t => t + 1); }
  };

  const downloadPanel = () => {
    const c = fcs.current[side]; if (!c) return;
    paintTex();
    texCanvases[side].toBlob(b => {
      if (!b) return setProblem('The panel could not be exported.');
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `scrub-top-${side}-artwork.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };

  const setColor = (node: string, hex: string) => {
    const p = asset.parts.find(x => x.node === node)!;
    setColors(c => ({ ...c, [p.colorKey]: hex.toUpperCase() }));
  };

  useImperativeHandle(handleRef, () => ({
    preview: (s: PanelSide) => {
      if (svg.state !== 'ready') return null;
      paintTex();
      const t = texCanvases[s], out = document.createElement('canvas'), ctx = out.getContext('2d'), f = frames[s], { w } = frameSize(f);
      if (!ctx) return null;
      out.width = t.width; out.height = t.height;
      const k = t.width / w;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height);
      ctx.save(); ctx.scale(k, k); ctx.translate(f.x1, f.y1); ctx.scale(-1, 1);
      ctx.fillStyle = partColor('body');
      for (const b of pocketBackings(svg.panels[s].filter(p => !hidden(p.part)), POCKET_PARTS)) ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      for (const p of svg.panels[s]) {
        if (hidden(p.part)) continue;
        const path = new Path2D(p.d), fill = partColor(p.part);
        ctx.fillStyle = fill; ctx.fill(path);
        ctx.lineJoin = 'round'; ctx.lineWidth = (DETAIL_PARTS.has(p.part) ? 1.25 : 4) / k; ctx.strokeStyle = DETAIL_PARTS.has(p.part) ? edgeFor(fill) : fill; ctx.stroke(path);
      }
      ctx.restore();
      ctx.drawImage(t, 0, 0);
      try { return out.toDataURL('image/png'); } catch { return null; }
    },
  }), [svg, frames, texCanvases, paintTex, hidden, partColor]);

  const part = asset.parts.find(p => p.node === selPart)!;
  const partHex = partColor(selPart);
  const onThisSide = svg.state !== 'ready' || svg.panels[side].some(p => p.part === selPart);
  const sharedNote = selPart === 'lower_pockets' ? 'The lower pockets share the body colour.' : selPart === 'sleeve_r' && !colors.sleeveR ? 'The right sleeve follows the left sleeve until you set it.' : null;
  const pickFrom3D = useCallback((_k: string, node: string) => setSelPart(node), []);
  const show3d = view !== 'pattern', showPanel = view !== '3d';

  const layerObjs = (fcs.current[side]?.getObjects() ?? []).slice().reverse();
  const layerName = (o: FabricObject) => { const t = o as unknown as { text?: unknown }; return typeof t.text === 'string' && t.text ? t.text.slice(0, 24) : 'Logo image'; };
  const pickLayer = (o: FabricObject) => { const c = fcs.current[side]; if (!c) return; c.setActiveObject(o); c.requestRenderAll(); syncSelection(side); };
  const toggleLayer = (o: FabricObject) => { o.set({ visible: !o.visible }); const c = fcs.current[side]; c?.discardActiveObject(); c?.requestRenderAll(); setArtTick(t => t + 1); };
  const dropLayer = (o: FabricObject) => { const c = fcs.current[side]; if (!c) return; c.remove(o); c.discardActiveObject(); c.requestRenderAll(); };

  const partsBlock = (
    <ul>
      {asset.parts.map(p => (
        <li key={p.node}>
          <button type="button" className="ps-part" aria-pressed={selPart === p.node} onClick={() => { if (!takeRef.current(p.node)) setSelPart(p.node); }}>
            <span className="ps-swatch" style={{ background: partColor(p.node) }} aria-hidden="true" />
            <span>{PART_LABEL[p.node] ?? p.node}</span>
            {hidden(p.node) && <span className="ps-hint">hidden</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  const addBlock = (
    <>
      <div className="ps-add">
        <button type="button" className="ps-btn" onClick={addText} disabled={svg.state !== 'ready' || readOnly}>Add text</button>
        <button type="button" className="ps-btn" onClick={() => fileInput.current?.click()} disabled={svg.state !== 'ready' || readOnly}>Upload logo</button>
        <input ref={fileInput} type="file" accept={UPLOAD_TYPES.join(',')} hidden onChange={e => { void addLogo(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <p className="ps-note">PNG, JPEG or WebP, up to 4 MB. New artwork goes on the {side}. Drag it onto a part.</p>
      {problem && <p className="ps-alert" role="alert">{problem}</p>}
    </>
  );

  const layersBlock = layerObjs.length === 0
    ? <p className="ps-note">No layers on the {side} yet. Add text or a logo and it is listed here.</p>
    : (
      <ul className="ps-layers">
        {layerObjs.map((o, i) => (
          <li key={i} className="ps-layer" data-active={active?.getActiveObject() === o || undefined}>
            <button type="button" className="ps-layer-main" onClick={() => pickLayer(o)}>{layerName(o)}</button>
            <button type="button" className="ps-icon" aria-label={o.visible ? `Hide ${layerName(o)}` : `Show ${layerName(o)}`} aria-pressed={!o.visible} onClick={() => toggleLayer(o)}>{o.visible ? 'Hide' : 'Show'}</button>
            <button type="button" className="ps-icon ps-icon--danger" aria-label={`Delete ${layerName(o)}`} onClick={() => dropLayer(o)}>Delete</button>
          </li>
        ))}
      </ul>
    );

  const colourBlock = (
    <section>
      <h2>{PART_LABEL[selPart] ?? selPart}</h2>
      <div className="ps-colors" role="group" aria-label="Part colour">
        {PALETTE.map(([name, hex]) => (
          <button key={hex} type="button" className="ps-chip" style={{ background: hex }} aria-label={name} aria-pressed={partHex.toLowerCase() === hex.toLowerCase()} title={name} onClick={() => setColor(selPart, hex)} />
        ))}
      </div>
      {eyedrop('part')}
      {!onThisSide && <p className="ps-note">This part has no panel on the {side}. Switch sides to see it.</p>}
      <label className="ps-field">Hex colour
        <input key={`${selPart}-${partHex}`} defaultValue={partHex} maxLength={7} inputMode="text" spellCheck={false}
          onChange={e => { const v = e.target.value.trim(); e.target.setAttribute('aria-invalid', String(!HEX.test(v))); if (HEX.test(v)) setColor(selPart, v); }} />
      </label>
      {sharedNote && <p className="ps-note">{sharedNote}</p>}
      {selPart === 'sleeve_r' && colors.sleeveR && <button type="button" className="ps-btn ps-btn--quiet" onClick={() => setColors(({ sleeveR: _r, ...rest }) => rest)}>Match the left sleeve again</button>}
      {part.detail && (
        <label className="ps-check"><input type="checkbox" checked={!hidden(selPart)} onChange={e => setDetails(d => ({ ...d, [part.detail!]: { show: e.target.checked } }))} />Show the {(PART_LABEL[selPart] ?? '').toLowerCase()}</label>
      )}
    </section>
  );

  const artBlock = (
    <section>
      <h2>Artwork on the {side}</h2>
      {!sel && <p className="ps-note">{counts[side] === 0 ? 'Nothing here yet. Use Add text or Upload logo.' : 'Select a piece of artwork on the panel to change it.'}</p>}
      {sel && (
        <div className="ps-art">
          {sel.kind === 'text' && (
            <>
              <label className="ps-field">Text<input value={sel.text} maxLength={60} onChange={e => patch({ text: e.target.value })} /></label>
              <label className="ps-field">Font
                <select value={FONTS.find(f => f[1] === sel.font)?.[1] ?? ''} onChange={e => patch({ fontFamily: e.target.value })}>
                  {FONTS.map(([n, v]) => <option key={n} value={v}>{n}</option>)}
                </select>
              </label>
              <div className="ps-colors" role="group" aria-label="Text colour">
                {PALETTE.map(([name, hex]) => <button key={hex} type="button" className="ps-chip" style={{ background: hex }} aria-label={`Text ${name}`} aria-pressed={sel.fill.toLowerCase() === hex.toLowerCase()} onClick={() => patch({ fill: hex })} />)}
              </div>
              {eyedrop('text')}
            </>
          )}
          <label className="ps-field">Width, % of the panel
            <input type="range" min={3} max={100} value={Math.min(100, Math.max(3, sel.widthPct))} onChange={e => setWidthPct(Number(e.target.value))} />
            <output>{sel.widthPct}%</output>
          </label>
          <label className="ps-field">Rotation
            <input type="range" min={0} max={359} value={sel.angle} onChange={e => patch({ angle: Number(e.target.value) })} />
            <output>{sel.angle}°</output>
          </label>
          <label className="ps-field">Opacity
            <input type="range" min={10} max={100} value={Math.round(sel.opacity * 100)} onChange={e => patch({ opacity: Number(e.target.value) / 100 })} />
            <output>{Math.round(sel.opacity * 100)}%</output>
          </label>
          {spots.length > 0 && (
            <div className="ps-row" role="group" aria-label="Place at">
              {spots.map(sp => <button key={sp.id} type="button" className="ps-btn ps-btn--quiet" onClick={() => placeAt(sp)} disabled={readOnly}>{sp.label}</button>)}
            </div>
          )}
          <div className="ps-row" role="group" aria-label="Align to the panel">
            {([['left', 'Left'], ['centerX', 'Centre'], ['right', 'Right'], ['top', 'Top'], ['centerY', 'Middle'], ['bottom', 'Bottom']] as const).map(([k, label]) => (
              <button key={k} type="button" className="ps-btn ps-btn--quiet" onClick={() => alignTo(k)}>{label}</button>
            ))}
          </div>
          <div className="ps-row">
            <button type="button" className="ps-btn ps-btn--quiet" onClick={() => patch({ angle: (sel.angle + 270) % 360 })}>Rotate 90° left</button>
            <button type="button" className="ps-btn ps-btn--quiet" onClick={() => patch({ angle: (sel.angle + 90) % 360 })}>Rotate 90° right</button>
            <button type="button" className="ps-btn" onClick={() => void duplicate()} disabled={readOnly}>Copy</button>
            <button type="button" className="ps-btn" onClick={mirror}>Mirror</button>
          </div>
          <div className="ps-row">
            <button type="button" className="ps-btn" onClick={() => reorder(true)}>Bring forward</button>
            <button type="button" className="ps-btn" onClick={() => reorder(false)}>Send back</button>
            <button type="button" className="ps-btn ps-btn--danger" onClick={removeActive}>Delete</button>
          </div>
          <p className="ps-note">Arrow keys nudge the selected artwork. Shift moves it ten steps.</p>
        </div>
      )}
    </section>
  );

  const panelBlock = (
    <section>
      <h2>Panel</h2>
      <div className="ps-row">
        <button type="button" className="ps-btn" onClick={downloadPanel} disabled={!active || counts[side] === 0}>Download {side} artwork (PNG)</button>
        {!confirmClear
          ? <button type="button" className="ps-btn ps-btn--quiet" onClick={() => setConfirmClear(true)} disabled={counts[side] === 0}>Clear {side} artwork</button>
          : <button type="button" className="ps-btn ps-btn--danger" onClick={clearSide} onBlur={() => setConfirmClear(false)}>Confirm: clear {side} artwork</button>}
      </div>
      <p className="ps-note">Sizes are shown against the panel, not in millimetres. This garment has no measured calibration yet, so no real-world size is claimed.</p>
    </section>
  );

  const desktopTabs: [typeof tab, string][] = [['parts', 'Parts'], ['add', 'Add'], ['layers', 'Layers']];
  const mobileTabs: [typeof mtab, string][] = [['parts', 'Parts'], ['colour', 'Colour'], ['add', 'Add'], ['layers', 'Layers'], ['edit', 'Edit']];
  const activeTab = narrow ? mtab : tab;

  return (
    <div className="ps" data-view={view} data-embedded={embedded ? '1' : undefined}>
      <header className="ps-top">
        {!embedded && <Link className="ps-back" to="/design-studio">Back to the Studio</Link>}
        {!embedded && (
          <div className="ps-title">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        )}
        {embedded && <span className="ps-grow" />}
        {headerExtra}
        <div className="ps-seg" role="group" aria-label="Workspace view">
          {(['pattern', 'split', '3d'] as Mode[]).filter(m => !(narrow && m === 'split')).map(m => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} disabled={m !== 'pattern' && !webgl}>{m === 'pattern' ? 'Panels' : m === 'split' ? 'Split' : '3D'}</button>
          ))}
        </div>
        <div className="ps-seg" role="group" aria-label="Garment side">
          {SIDES.map(s => <button key={s} type="button" aria-pressed={side === s} onClick={() => { setSide(s); setSel(null); setConfirmClear(false); }}>{s === 'front' ? 'Front' : 'Back'}</button>)}
        </div>
        <p className="ps-save" role="status">{persist === 'design'
          ? (saveState === 'full' ? 'Artwork is too large to save. Use smaller images or fewer pieces.' : narrow && svg.state === 'ready' && counts[side] === 0 ? `No artwork on the ${side} yet. Add text or a logo, then drag it onto a part.` : 'Artwork saves with your design')
          : (saveState === 'saved' ? 'Draft saved on this device' : saveState === 'full' ? 'Not saved: this device has no storage left. Download your panels.' : 'Changes save on this device')}</p>
      </header>

      <nav className="ps-tabs" aria-label="Tools">
        {(narrow ? mobileTabs : desktopTabs).map(([k, label]) => (
          <button key={k} type="button" className="ps-tab" aria-pressed={activeTab === k} onClick={() => (narrow ? setMtab(k as typeof mtab) : setTab(k as typeof tab))}>{label}</button>
        ))}
      </nav>

      {!narrow && (
        <aside className="ps-parts" aria-label="Garment parts">
          <h2>{tab === 'parts' ? 'Parts' : tab === 'add' ? `Add to the ${side}` : `Layers, ${side}`}</h2>
          {tab === 'parts' && partsBlock}
          {tab === 'add' && addBlock}
          {tab === 'layers' && layersBlock}
        </aside>
      )}

      <main className="ps-stage" data-split={view === 'split'}>
        {SIDES.map(s => (
          <section key={s} className="ps-panel" hidden={!showPanel || side !== s} aria-label={`${s} panel`} tabIndex={0} onKeyDown={s === side ? onStageKey : undefined}>
            <div className="ps-host" ref={el => { hosts.current[s] = el; }}>
              <div className="ps-sheet" style={{ width: sheets[s].w, height: sheets[s].h }}>
                {svg.state === 'ready' && (
                  <svg className="ps-outline" viewBox={`0 0 ${frameSize(frames[s]).w} ${frameSize(frames[s]).h}`} preserveAspectRatio="none" aria-hidden="true">
                    <g transform={panelTransform(frames[s])}>
                      {pocketBackings(svg.panels[s].filter(p => !hidden(p.part)), POCKET_PARTS).map((b, i) => <rect key={`under-${i}`} x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill={partColor('body')} pointerEvents="none" />)}
                      {svg.panels[s].filter(p => !hidden(p.part)).map(p => (
                        <path key={p.id} d={p.d} data-part={p.part} fill={partColor(p.part)} stroke={DETAIL_PARTS.has(p.part) ? edgeFor(partColor(p.part)) : partColor(p.part)} className={DETAIL_PARTS.has(p.part) ? 'ps-detail' : undefined} vectorEffect="non-scaling-stroke" />
                      ))}
                      {svg.panels[s].filter(p => p.part === selPart && !hidden(p.part)).map(p => (
                        <path key={`sel-${p.id}`} d={p.d} className="is-selected" fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" />
                      ))}
                    </g>
                  </svg>
                )}
                <div className="ps-fabric" ref={el => { fabricRoots.current[s] = el; }} />
              </div>
            </div>
            {s === side && svg.state === 'loading' && <p className="ps-state">Loading the panel outlines</p>}
            {s === side && svg.state === 'error' && <p className="ps-state ps-alert" role="alert">The panel outlines could not be loaded. Reload the page to try again.</p>}
            {s === side && svg.state === 'ready' && counts[s] === 0 && <p className="ps-state ps-state--hint" data-hint>No artwork on the {s} yet. Add text or upload a logo, then drag it onto a part.</p>}
          </section>
        ))}

        {show3d && (
          <section className="ps-3d" aria-label="3D preview">
            {!ready3d && webgl && <p className="ps-state">Preparing the 3D garment</p>}
            {webgl ? (
              <Suspense fallback={<p className="ps-state">Loading the 3D viewer</p>}>
                <PilotViewport3D asset={asset} side={side} colors={colors} details={details} panels={texCanvases} panelsVersion={panelsVersion} onPickZone={pickFrom3D} onReady={() => setReady3d(true)}
                  errorLabel="The 3D preview could not load. Your colours and artwork are still here and still save." />
              </Suspense>
            ) : <p className="ps-state ps-alert" role="alert">This browser cannot draw 3D. The panels still work.</p>}
          </section>
        )}
        {embedded && <p className="ps-foot">{subtitle}</p>}
      </main>

      <aside className="ps-inspector" aria-label="Inspector">
        {!narrow && (<>{colourBlock}{artBlock}{panelBlock}</>)}
        {narrow && mtab === 'parts' && <section><h2>Parts</h2>{partsBlock}</section>}
        {narrow && mtab === 'colour' && colourBlock}
        {narrow && mtab === 'add' && <section><h2>{`Add to the ${side}`}</h2>{addBlock}</section>}
        {narrow && mtab === 'layers' && <section><h2>{`Layers, ${side}`}</h2>{layersBlock}</section>}
        {narrow && mtab === 'edit' && (<>{artBlock}{panelBlock}</>)}
        {notice && <p className="ps-note ps-note--notice" role="status">{notice}</p>}
      </aside>
    </div>
  );
}

export default PanelWorkspace;
