import { useEffect, useRef } from 'react';
import { PHASES } from '../../components/site/content';

const STATIONS = PHASES.flatMap(p => p.stages);
// Station track position -> 0..1 thread progress: the needle follows a line 70% down the viewport (a short desktop row takes 35% of a screen).
export const threadProgress = (top, height, vh) => Math.min(1, Math.max(0, (vh * 0.7 - top) / Math.max(1, height, vh * 0.35)));

// The seven floor stations on one red thread that sews itself across as the page scrolls; static and fully sewn with reduced motion.
export default function ProductionLine() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const items = [...el.querySelectorAll('.pl-st')], track = el.querySelector('.pl-line');
    const paint = p => {
      el.style.setProperty('--p', p.toFixed(3));
      items.forEach((li, i) => li.toggleAttribute('data-on', p >= i / (items.length - 1) - 0.001));
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') { paint(1); return undefined; }
    let raf = 0;
    const tick = () => { raf = 0; const r = track.getBoundingClientRect(); paint(threadProgress(r.top, r.height, window.innerHeight)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); tick(); }
      else { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
    }, { rootMargin: '20% 0px' });
    io.observe(el);
    paint(0);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return (
    <section ref={ref} className="pl vs-sec" aria-labelledby="pl-title">
      <div className="vs-wrap">
        <p className="pl-kicker">On the VFRB floor</p>
        <h2 className="vs-h2" id="pl-title">Seven stations, one thread</h2>
        <p className="pl-sub">Once you accept VFRB&rsquo;s proposal, your order moves through every station below. VFRB tracks each one; your account shows the order&rsquo;s status.</p>
        <div className="pl-track">
        <div className="pl-thread" aria-hidden="true"><span /></div>
        <ol className="pl-line">
          {STATIONS.map(([name, text], i) => (
            <li key={name} className="pl-st" style={{ '--i': i }}>
              <span className="pl-dot" aria-hidden="true">{i + 1}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
