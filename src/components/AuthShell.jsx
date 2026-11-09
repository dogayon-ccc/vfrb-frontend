// Shared chrome for all auth pages. Presentation only; form logic lives in each page.
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ViewLink as Link } from './ViewLink';
import { NavIcon } from './ui/icons';
import useParallax from '../hooks/useParallax';
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
  color: 'var(--ink)', background: '#fff', boxSizing: 'border-box',
  // Focus: 2px teal ring (#028090 is 4.5:1 on the white card) outside the border, not just a faint glow.
  outline: focusedKey === current ? '2px solid #028090' : 'none', outlineOffset: 2,
  fontFamily: FONT, transition: 'border-color .18s, box-shadow .18s',
  border: `1.5px solid ${error ? 'var(--danger)' : focusedKey === current ? 'var(--teal)' : 'var(--border)'}`,
  boxShadow: error ? '0 0 0 3px rgba(229,62,62,.10)' : focusedKey === current ? '0 0 0 3px rgba(2,128,144,.12)' : 'none',
});

export const fieldA11y = (id, msg) => ({ 'aria-invalid': msg ? true : undefined, 'aria-describedby': msg ? `${id}-err` : undefined });

export function FieldError({ id, msg }) {
  return msg ? <p id={`${id}-err`} role="alert" className="au-err">{msg}</p> : null;
}

export const FormError = ({ msg }) => (msg ? <p role="alert" className="au-formerr"><NavIcon name="warning" size={16} color="var(--danger)" />{msg}</p> : null);

// True only once `on` has lasted `ms`, so a fast request never flashes a loader.
export function useLate(on, ms = 150) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!on) { setLate(false); return undefined; }
    const t = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return late;
}

export function SubmitBtn({ loading, disabled, busy, line, children }) {
  const late = useLate(loading);
  return (
    <button type="submit" className={`au-submit${line ? ' au-submit--line' : ''}`} disabled={loading || disabled} aria-busy={loading}>
      {late && <span className="au-spin" aria-hidden="true" />}{late ? busy : children}
    </button>
  );
}

export function AuthDone({ icon, title, action, onAction, children }) {
  return (
    <div role="status" className="au-done">
      <span className="au-done__icon"><NavIcon name={icon} size={26} color="var(--teal)" /></span>
      <h2>{title}</h2>
      <p>{children}</p>
      <button type="button" className="au-submit" onClick={onAction}>{action}</button>
    </div>
  );
}

export function Field({ id, label, error, aside, trailing, ...input }) {
  const [on, setOn] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="au-label">{label}</label>
      <div className="au-inputwrap">
        <input id={id} {...input} {...fieldA11y(id, error)} onFocus={() => setOn(true)} onBlur={() => setOn(false)}
          style={{ ...authInput(on ? id : '', id, error), ...(trailing && { paddingRight: 52 }) }} />
        {trailing}
      </div>
      <FieldError id={id} msg={error} />
      {aside && <div className="au-asiderow">{aside}</div>}
    </div>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  return <Field {...props} type={show ? 'text' : 'password'} trailing={
    <button type="button" className="au-eye" onClick={() => setShow(v => !v)} aria-label="Show password" aria-pressed={show}>
      <NavIcon name={show ? 'hide' : 'show'} size={18} />
    </button>} />;
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

let dropped = false;

function SplitArt({ calm }) {
  const ref = useRef(null);
  useParallax(ref, calm);
  // Flats drop onto the panel once per visit, not again on every auth page hop.
  const [drop] = useState(() => !calm && !dropped);
  useEffect(() => { dropped = true; }, []);
  return (
    <aside className="au-art au-art--navy" ref={ref}>
      <Link to="/" className="au-brand" aria-label="VFRB Enterprise home">
        <img src={logo} alt="" width="44" height="44" />
        <span>VFRB Enterprise</span>
      </Link>
      <div className={`au-flats${drop ? ' is-drop' : ''}`} aria-hidden="true">
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
  const rise = calm ? {} : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0.7, 0.2, 1] } } };
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
