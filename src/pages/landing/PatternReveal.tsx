import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import flat from '../../assets/flats/scrub-top-vneck-short/front.svg?raw';

// Same zone paths the Studio draws for the short-sleeve Scrub Top front.
const Z = Object.fromEntries([...flat.matchAll(/<path id="([^"]+)"[^>]*?\sd="([^"]+)"/g)].map(m => [m[1], m[2]]));
const BOX = '-30 -20 940 1064';
const clamp = v => Math.min(100, Math.max(0, Math.round(v)));
const KEYS = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageDown: -10, PageUp: 10 };
const LABELS = [['Sleeve', 118, 270], ['Sleeve', 762, 270], ['Pocket', 309, 418], ['Pocket', 284, 760], ['Pocket', 594, 760]];

export default function PatternReveal() {
  const calm = useReducedMotion();
  const [cut, setCut] = useState(calm ? 50 : 100);
  const [intro, setIntro] = useState(!calm);
  const box = useRef(null);
  // One sweep on load shows the pattern under the finished garment; any input ends it.
  useEffect(() => {
    if (!intro) return undefined;
    const go = setTimeout(() => setCut(50), 400), end = setTimeout(() => setIntro(false), 1200);
    return () => { clearTimeout(go); clearTimeout(end); };
  }, [intro]);
  const fromX = (x) => { const b = box.current.getBoundingClientRect(); setCut(clamp(((x - b.left) / b.width) * 100)); };
  const onKey = (e) => {
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? 100 : KEYS[e.key] !== undefined ? cut + KEYS[e.key] * (e.shiftKey ? 5 : 1) : null;
    if (to === null) return;
    e.preventDefault();
    setIntro(false);
    setCut(clamp(to));
  };

  return (
    <figure className="pr">
      <div className="pr-table">
        <div ref={box} className={`pr-stage${intro ? ' is-intro' : ''}`} style={{ '--cut': `${cut}%` }}
          onPointerDown={(e) => { setIntro(false); e.currentTarget.setPointerCapture(e.pointerId); fromX(e.clientX); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) fromX(e.clientX); }}>
          <svg className="pr-layer pr-pattern" viewBox={BOX} aria-hidden="true">
            {Object.entries(Z).map(([id, d]) => <g key={id}><path d={d} className="pr-seam" /><path d={d} className="pr-piece" /></g>)}
            <path className="pr-grain" d="M440 430V930M428 448L440 430L452 448M428 912L440 930L452 912" />
            {LABELS.map(([t, x, y], i) => <text key={i} x={x} y={y} className="pr-label">{t}</text>)}
          </svg>
          <svg className="pr-layer pr-done" viewBox={BOX} aria-hidden="true">
            <path d={Z.body} fill="#028090" fillRule="evenodd" />
            <path d={Z.sleeve_l} fill="#028090" /><path d={Z.sleeve_r} fill="#028090" />
            <path d={Z.neck_band} fill="#1B2A4A" fillRule="evenodd" />
            <path d={Z.chest_pocket} fill="#046A78" /><path d={Z.lower_pockets} fill="#046A78" fillRule="evenodd" />
            <path className="pr-stitch" d={`${Z.chest_pocket}${Z.lower_pockets}M176 990H714`} />
          </svg>
          <span className="pr-tag pr-tag--done" aria-hidden="true">Finished uniform</span>
          <span className="pr-tag pr-tag--pattern" aria-hidden="true">Cutting pattern</span>
          <div className="pr-handle" role="slider" tabIndex={0} aria-label="Reveal the finished uniform over its cutting pattern"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={cut} aria-valuetext={`${cut}% finished uniform`} onKeyDown={onKey}>
            <span aria-hidden="true" />
          </div>
          {/* Above the handle and both layers, below the knob's reach, so it reads at every position. */}
          <svg className="pr-layer pr-marks" viewBox={BOX} aria-hidden="true"><text x={440} y={680} className="pr-label pr-label--top">Front</text></svg>
        </div>
      </div>
      <figcaption>Scrub top Studio template, 2D. Drag the handle or use the arrow keys to compare.</figcaption>
    </figure>
  );
}
