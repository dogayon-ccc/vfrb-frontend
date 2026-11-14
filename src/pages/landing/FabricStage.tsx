// Home chapters 2 and 3: a sticky 3D stage whose camera and turn are driven by scroll progress.
// Copy is limited to what VFRB's own pages already state; colourways are samples, not a stock list.
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ViewLink as Link } from '../../components/ViewLink';
import '../../styles/landing-stage.css';

const Stage3D = lazy(() => import('./FabricStage3D').catch(() => ({ default: () => null as any })));

const CHAPTERS = [
  { n: '01', tag: 'The template', h: 'Your uniform, before it is cut.', p: 'Every VFRB Studio template is drawn in 2D and, where VFRB has a model, previewed in 3D. Turn it, change its colours, add your logo and text.' },
  { n: '02', tag: 'Made to size', h: 'Pattern, cut, checked.', p: 'The details that make a uniform fit.' },
  { n: '03', tag: 'Your colours', h: 'Turn it. Then make it yours.', p: 'These are sample colourways. In the Studio you choose the colours for the body, sleeves, collar and pocket.' },
] as const;

const CARDS = [
  ['Pattern for each size', 'Every order starts from a pattern made for each size.'],
  ['Checked at QC', 'Finished pieces are checked against the measurements for their size. Pieces that fail go back for alteration.'],
  ['Embroidery and printing in-house', 'Computerized embroidery, printing and sublimation, photographed at VFRB.'],
] as const;

export const WAYS = [
  { id: 'teal', label: 'Teal and navy', body: '#028090', collar: '#1B2A4A', pocket: '#046A78' },
  { id: 'navy', label: 'Navy and teal', body: '#1B2A4A', collar: '#02C39A', pocket: '#24365C' },
  { id: 'wine', label: 'Wine and navy', body: '#7A1F3D', collar: '#1B2A4A', pocket: '#8C2A4B' },
  { id: 'forest', label: 'Forest and cream', body: '#1F5D46', collar: '#EFE9DA', pocket: '#2A7059' },
] as const;
export type Way = typeof WAYS[number];

class Boundary extends Component<{ onError: () => void; children?: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.err ? null : this.props.children; }
}

function canGL() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

function Silhouette({ way }: { way: Way }) {
  return (
    <svg className="fs__sil" viewBox="0 0 200 240" role="img" aria-label={`Scrub top in ${way.label}`}>
      <path d="M70 20 L100 44 L130 20 L168 40 L190 88 L160 100 L148 76 L148 220 L52 220 L52 76 L40 100 L10 88 L32 40 Z" fill={way.body} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M70 20 L100 58 L130 20" fill="none" stroke={way.collar} strokeWidth="7" strokeLinejoin="round" />
      <rect x="62" y="132" width="28" height="32" rx="2" fill={way.pocket} /><rect x="110" y="132" width="28" height="32" rx="2" fill={way.pocket} />
    </svg>
  );
}

export default function FabricStage() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [mode, setMode] = useState<'wait' | '3d' | 'static'>('wait');
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [ch, setCh] = useState(0);
  const [way, setWay] = useState<Way>(WAYS[0]);

  useEffect(() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    setMode(calm || save || !canGL() ? 'static' : '3d');
  }, []);

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
      const p = Math.min(1, Math.max(0, -r.top / span));
      progress.current = p;
      setCh(c => { const n = p < 0.3 ? 0 : p < 0.66 ? 1 : 2; return n === c ? c : n; });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [mode]);

  const jump = (i: number) => {
    const el = root.current;
    if (!el) return;
    const span = el.offsetHeight - innerHeight, top = el.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + span * [0.05, 0.48, 0.88][i], behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const fail = useCallback(() => setMode('static'), []);
  const live = mode === '3d';

  const swatches = (
    <div className="fs__ways" role="group" aria-label="Sample colourways">
      {WAYS.map(w => (
        <button key={w.id} type="button" aria-pressed={way.id === w.id} onClick={() => setWay(w)} title={w.label}>
          <span style={{ background: `linear-gradient(135deg, ${w.body} 55%, ${w.collar} 55%)` }} /><b>{w.label}</b>
        </button>
      ))}
    </div>
  );

  return (
    <section ref={root} className={`fs${live ? ' fs--live' : ' fs--static'}`} aria-labelledby="fs-h" data-ch={ch}>
      <div className="fs__stick">
        <div className="fs__bg" aria-hidden="true" />
        {live && near && (
          <div className="fs__canvas" aria-hidden="true">
            <Boundary onError={fail}><Suspense fallback={null}><Stage3D progress={progress} way={way} active={onScreen} onError={fail} /></Suspense></Boundary>
          </div>
        )}
        {!live && <div className="fs__flat"><Silhouette way={way} /></div>}

        <div className="fs__copy">
          <h2 id="fs-h" className="fs__title">From template to finished uniform</h2>
          <article className={`fs__ch fs__ch--a${ch === 0 || !live ? ' is-on' : ''}`}>
            <p className="fs__tag"><span>{CHAPTERS[0].n}</span>{CHAPTERS[0].tag}</p>
            <p className="fs__h">{CHAPTERS[0].h}</p>
            <p className="fs__p">{CHAPTERS[0].p}</p>
            <Link className="fs__link" to="/login">Open the Studio <span aria-hidden="true">→</span></Link>
          </article>
          <article className={`fs__ch fs__ch--b${ch === 1 || !live ? ' is-on' : ''}`}>
            <p className="fs__tag"><span>{CHAPTERS[1].n}</span>{CHAPTERS[1].tag}</p>
            <p className="fs__h">{CHAPTERS[1].h}</p>
            <ul className="fs__cards">{CARDS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}</ul>
          </article>
          <article className={`fs__ch fs__ch--c${ch === 2 || !live ? ' is-on' : ''}`}>
            <p className="fs__tag"><span>{CHAPTERS[2].n}</span>{CHAPTERS[2].tag}</p>
            <p className="fs__h">{CHAPTERS[2].h}</p>
            <p className="fs__p">{CHAPTERS[2].p}</p>
            {swatches}
          </article>
        </div>

        {live && (
          <ol className="fs__dots" aria-label="Story chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.n}><button type="button" aria-current={ch === i || undefined} aria-label={`${c.n} ${c.tag}`} onClick={() => jump(i)}><i /><span>{c.n}</span></button></li>
            ))}
          </ol>
        )}
        {live && <p className="fs__note" aria-hidden="true">3D preview, approximate · scroll to move the camera</p>}
      </div>
    </section>
  );
}
