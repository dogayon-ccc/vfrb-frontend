import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FIND_UNIFORM } from '../../components/site/content';
import { startStudioIn } from '../../utils/studioIntent';
import '../../styles/landing-rog.css';

// The Studio's own template renderer, loaded only with this section so the hero stays light.
const GarmentSilhouette = lazy(() => import('../client/design-studio/GarmentSilhouette'));

// One real garment per category, each listed under that category in garmentCatalog.js.
const LEAD: Record<string, string> = { 'School Uniform': 'Polo Shirt', 'Medical / Scrubs': 'Scrub Top', Corporate: 'Blazer', 'Hospitality / Service': 'Mandarin Collar', 'Industrial / Work': 'Lab Coverall' };
const COLORS = { body: '#1B2A4A', collar: '#02C39A', pocket: '#24365C' };

// Desktop: the hovered or focused panel opens wide. Touch: a snap row where every card is already open.
export default function CategoryCards() {
  const nav = useNavigate();
  const box = useRef<HTMLUListElement>(null);
  const [on, setOn] = useState(0), [armed, setArmed] = useState(false), [shown, setShown] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    setArmed(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    const failsafe = setTimeout(() => setShown(true), 2500); // never leave the cards hidden
    return () => { io.disconnect(); clearTimeout(failsafe); };
  }, []);

  return (
    <ul ref={box} className={`cx${armed ? ' cx--arm' : ''}${shown ? ' is-in' : ''}`} style={{ '--on': on } as React.CSSProperties}>
      {FIND_UNIFORM.map(([label, cat], i) => (
        <li key={cat} className={on === i ? 'is-on' : undefined} style={{ '--i': i } as React.CSSProperties} onPointerEnter={e => e.pointerType === 'mouse' && setOn(i)}>
          <button type="button" className="cx__btn" onFocus={() => setOn(i)} onClick={() => { startStudioIn(cat); nav('/design-studio'); }}>
            <span className="cx__no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="cx__art" aria-hidden="true">
              <Suspense fallback={null}><GarmentSilhouette garment={LEAD[cat]} colors={COLORS} width={240} height={290} /></Suspense>
            </span>
            <span className="cx__name"><b>{label}</b><small>{LEAD[cat]} · 2D template</small></span>
            <span className="cx__go">Open in Studio<i aria-hidden="true" /></span>
          </button>
        </li>
      ))}
    </ul>
  );
}
