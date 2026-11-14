// Home slide show: one sticky stage, one real VFRB 3D template per uniform category. Scroll (or the arrows) changes slide; the camera slides along x with directional motion blur.
import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { scannedEntryFor } from '../client/design-studio/garmentCapabilities';
import { startStudioIn } from '../../utils/studioIntent';
import '../../styles/landing-stage.css';

const Stage3D = lazy(() => import('./FabricStage3D').catch(() => ({ default: () => null as any })));

type Colors = { body: string; sleeve: string; collar: string; pocket: string };
const c = (body: string, collar: string, pocket: string): Colors => ({ body, sleeve: body, collar, pocket });

// tries: [sleeve, fit] pairs, first one with a real 3D model wins. A category whose template has no model is left out, never faked.
const DEFS = [
  { cat: 'School Uniform', label: 'School', garment: 'Polo Shirt', tries: [['Short', 'unisex'], ['Short', 'male']], colors: c('#1B2A4A', '#028090', '#24365C') },
  { cat: 'Medical / Scrubs', label: 'Medical', garment: 'Scrub Top', tries: [['Short', 'unisex']], colors: c('#028090', '#1B2A4A', '#046A78') },
  { cat: 'Corporate', label: 'Corporate', garment: 'Blazer', tries: [['Long', 'female'], ['Three-Quarter', 'female']], colors: c('#1B2A4A', '#1B2A4A', '#24365C') },
  { cat: 'Hospitality / Service', label: 'Hospitality', garment: 'Mandarin Collar', tries: [['Long', 'male'], ['Long', 'female']], colors: c('#7A1F3D', '#EFE9DA', '#8C2A4B') },
  { cat: 'Industrial / Work', label: 'Industrial', garment: 'Lab Coverall', tries: [['Long', 'unisex'], ['Short', 'unisex'], [undefined, undefined]], colors: c('#1F5D46', '#EFE9DA', '#2A7059') },
] as const;

export type Slide = { cat: string; label: string; garment: string; colors: Colors; entry: any; sleeve?: string; fit?: string };

function resolve(): Slide[] {
  const out: Slide[] = [];
  for (const d of DEFS) {
    for (const [sleeve, fit] of d.tries as readonly (readonly [string | undefined, string | undefined])[]) {
      const entry = scannedEntryFor(d.garment, sleeve, fit);
      if (entry) { out.push({ cat: d.cat, label: d.label, garment: d.garment, colors: d.colors, entry, sleeve, fit }); break; }
    }
  }
  return out;
}

class Boundary extends Component<{ onError: () => void; children?: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.err ? null : this.props.children; }
}

function canGL() {
  try {
    const cv = document.createElement('canvas'), gl = cv.getContext('webgl2') || cv.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function FabricStage() {
  const nav = useNavigate();
  const slides = useMemo(resolve, []);
  const N = slides.length;
  const root = useRef<HTMLElement>(null), wrap = useRef<HTMLDivElement>(null), fe = useRef<SVGFEGaussianBlurElement>(null);
  const [mode, setMode] = useState<'wait' | '3d' | 'static'>('wait');
  const [near, setNear] = useState(false), [onScreen, setOnScreen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    setMode(!N || calm || save || !canGL() ? 'static' : '3d');
  }, [N]);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const a = new IntersectionObserver(([e]) => setNear(n => n || e.isIntersecting), { rootMargin: '900px 0px' });
    const b = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: '100px 0px' });
    a.observe(el); b.observe(el);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);

  useEffect(() => {
    if (mode !== '3d') return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight);
      const p = Math.min(0.9999, Math.max(0, -r.top / span));
      setIdx(i => { const n = Math.floor(p * N); return n === i ? i : n; });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [mode, N]);

  const go = (i: number) => {
    const el = root.current;
    if (!el) return;
    const k = Math.min(N - 1, Math.max(0, i)), span = el.offsetHeight - innerHeight, top = el.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + span * ((k + 0.5) / N), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  // Directional blur: the 3D side reports camera speed (slides per second); a horizontal-only SVG blur on the canvas wrapper does the rest.
  const onSpeed = useCallback((v: number) => {
    const sd = Math.min(20, Math.abs(v) * 9), w = wrap.current;
    if (!w) return;
    fe.current?.setAttribute('stdDeviation', `${sd.toFixed(2)} 0`);
    w.style.filter = sd > 0.4 ? 'url(#fs-mb)' : 'none';
  }, []);
  const fail = useCallback(() => setMode('static'), []);
  const live = mode === '3d';
  if (!N) return null;
  // The static fallback draws the scrub-top outline, so its copy names that template.
  const s = live ? slides[Math.min(idx, N - 1)] : (slides.find(x => x.garment === 'Scrub Top') ?? slides[0]);
  const open = () => { startStudioIn(s.cat); nav('/design-studio'); };

  return (
    <section ref={root} id="stage" className={`fs${live ? ' fs--live' : ' fs--static'}`} aria-labelledby="fs-h" style={live ? { height: `${(N + 1) * 85}svh` } : undefined}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="fs-mb" x="-20%" y="-5%" width="140%" height="110%" colorInterpolationFilters="sRGB"><feGaussianBlur ref={fe} stdDeviation="0 0" /></filter>
      </svg>
      <div className="fs__stick">
        <div className="fs__bg" aria-hidden="true" />
        <h2 id="fs-h" className="fs__title">One template for every uniform</h2>
        {live && near && (
          <div className="fs__canvas" ref={wrap} aria-hidden="true">
            <Boundary onError={fail}><Suspense fallback={null}><Stage3D slides={slides} idx={idx} active={onScreen} onSpeed={onSpeed} onError={fail} /></Suspense></Boundary>
          </div>
        )}
        {!live && <div className="fs__flat" aria-hidden="true"><Silhouette colors={s.colors} /></div>}

        <div className="fs__copy">
          <article key={s.cat} className="fs__slide" aria-live="polite">
            <p className="fs__tag"><span>{pad(live ? idx + 1 : slides.indexOf(s) + 1)}</span>/ {pad(N)} &nbsp;{s.cat}</p>
            <p className="fs__h">{s.label} uniforms,<br />cut for you.</p>
            <p className="fs__p">Start from VFRB&rsquo;s {s.garment} template. Choose colours, add your logo and text, then send it as an order.</p>
            <button type="button" className="fs__link" onClick={open}>Design a {s.label.toLowerCase()} uniform <span aria-hidden="true">→</span></button>
          </article>
        </div>

        {live && (
          <>
            <nav className="fs__nav" aria-label="Slides">
              <button type="button" aria-label="Previous slide" disabled={idx === 0} onClick={() => go(idx - 1)}>‹</button>
              <ol>{slides.map((x, i) => (
                <li key={x.cat}><button type="button" aria-current={i === idx || undefined} onClick={() => go(i)}><i /><span>{x.label}</span></button></li>
              ))}</ol>
              <button type="button" aria-label="Next slide" disabled={idx === N - 1} onClick={() => go(idx + 1)}>›</button>
            </nav>
            <div className="fs__bar" aria-hidden="true"><i style={{ transform: `scaleX(${(idx + 1) / N})` }} /></div>
            <p className="fs__note" aria-hidden="true">3D preview, approximate · scroll or use the arrows</p>
          </>
        )}
      </div>
    </section>
  );
}

function Silhouette({ colors }: { colors: Colors }) {
  return (
    <svg className="fs__sil" viewBox="0 0 200 240" role="img" aria-label="Uniform top template">
      <path d="M70 20 L100 44 L130 20 L168 40 L190 88 L160 100 L148 76 L148 220 L52 220 L52 76 L40 100 L10 88 L32 40 Z" fill={colors.body} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M70 20 L100 58 L130 20" fill="none" stroke={colors.collar} strokeWidth="7" strokeLinejoin="round" />
      <rect x="62" y="132" width="28" height="32" rx="2" fill={colors.pocket} /><rect x="110" y="132" width="28" height="32" rx="2" fill={colors.pocket} />
    </svg>
  );
}
