// Shared chrome for all auth pages. Presentation only; form logic lives in each page.
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ViewLink as Link } from './ViewLink';
import logo from '../assets/company-logo.jpg';
import art from '../assets/brand/sewing-2.jpg';
import flatA from '../assets/flats/scrub-top-vneck-short/front.svg';
import flatB from '../assets/flats/scrub-top-vneck-short/back.svg';
import flatC from '../assets/flats/scrub-top-vneck-three-quarter/front.svg';
import flatD from '../assets/flats/scrub-top-vneck-three-quarter/back.svg';
import '../styles/auth.css';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

// 16px stops iOS Safari from zooming the page on focus.
export const authInput = (focusedKey, current, error) => ({
  width: '100%', padding: '14px 16px', minHeight: 54, borderRadius: 14, fontSize: 16,
  color: 'var(--ink)', background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT, transition: 'border-color .18s, box-shadow .18s',
  border: `1.5px solid ${error ? 'var(--danger)' : focusedKey === current ? 'var(--teal)' : 'var(--border)'}`,
  boxShadow: error ? '0 0 0 3px rgba(229,62,62,.10)' : focusedKey === current ? '0 0 0 3px rgba(2,128,144,.12)' : 'none',
});

export const fieldA11y = (id, msg) => ({ 'aria-invalid': msg ? true : undefined, 'aria-describedby': msg ? `${id}-err` : undefined });

export function FieldError({ id, msg }) {
  return msg ? <p id={`${id}-err`} role="alert" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>{msg}</p> : null;
}

const STEPS = [
  'Design your uniform in the Studio',
  'Place a bulk order and review your delivery date',
  'Follow your order and message the VFRB team',
];

// Flat garment layers: d = parallax depth, r = fixed tilt (never above 8°).
const FLATS = [
  { src: flatD, cls: 'f1', d: 4, r: -8 },
  { src: flatB, cls: 'f2', d: 7, r: 6 },
  { src: flatC, cls: 'f3', d: 11, r: -3 },
  { src: flatA, cls: 'f4', d: 16, r: 4 },
];

// Pointer parallax on fine pointers only; writes CSS vars so React never re-renders.
function useParallax(ref, off) {
  useEffect(() => {
    const el = ref.current;
    if (off || !el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    const move = (e) => {
      const b = el.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.setProperty('--px', x.toFixed(3)); el.style.setProperty('--py', y.toFixed(3)); });
    };
    const leave = () => { cancelAnimationFrame(raf); el.style.setProperty('--px', 0); el.style.setProperty('--py', 0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [ref, off]);
}

function SplitArt({ calm }) {
  const ref = useRef(null);
  useParallax(ref, calm);
  return (
    <aside className="au-art au-art--navy" ref={ref}>
      <Link to="/" className="au-brand" aria-label="VFRB Enterprise home">
        <img src={logo} alt="" width="44" height="44" />
        <span>VFRB Enterprise</span>
      </Link>
      <div className="au-flats" aria-hidden="true">
        {FLATS.map(f => <img key={f.cls} src={f.src} alt="" className={`au-flat ${f.cls}`} style={{ '--d': f.d, '--r': `${f.r}deg` }} />)}
      </div>
      <div className="au-art-in">
        <h2 className="au-h">Custom uniforms, made smarter.</h2>
        <p className="au-line">Design, order and follow your uniforms in one place.</p>
      </div>
    </aside>
  );
}

export default function AuthShell({ title, subtitle, maxWidth = 400, variant, children }) {
  const calm = useReducedMotion();
  const rise = calm ? {} : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] } } };
  const split = variant === 'split';

  if (split) return (
    <div className="au au--split">
      <SplitArt calm={calm} />
      <main className="au-main">
        <motion.div className="au-card" style={{ maxWidth }} initial={calm ? false : 'hidden'} animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
          <motion.div variants={rise} style={{ marginBottom: 24 }}>
            {title && <h1 className="au-title">{title}</h1>}
            {subtitle && <div className="au-sub">{subtitle}</div>}
          </motion.div>
          <motion.div variants={rise}>{children}</motion.div>
        </motion.div>
      </main>
    </div>
  );

  return (
    <div className="au">
      <aside className="au-art">
        <img src={art} alt="" decoding="async" fetchpriority="low" />
        <Link to="/" className="au-back"><span aria-hidden="true">←</span> VFRB Enterprise</Link>
        <div className="au-art-in">
          <h2 className="au-h">Custom uniforms, made smarter.</h2>
          <ol className="au-steps">
            {STEPS.map(s => <li key={s}><b>{s}</b></li>)}
          </ol>
          <p className="au-since">Family-owned since 2000 · Bayanan, Muntinlupa City</p>
        </div>
      </aside>

      <main className="au-main">
        <motion.div className="au-card" style={{ maxWidth }} initial={calm ? false : 'hidden'} animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
          <motion.div variants={rise} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
            <Link to="/" aria-label="Back to home" style={{ marginBottom: 16, lineHeight: 0 }}>
              <img className="au-logo" src={logo} alt="VFRB Enterprise" />
            </Link>
            {title && <h1 className="au-title">{title}</h1>}
            {subtitle && <div className="au-sub">{subtitle}</div>}
          </motion.div>
          <motion.div variants={rise}>{children}</motion.div>
        </motion.div>
      </main>
    </div>
  );
}
