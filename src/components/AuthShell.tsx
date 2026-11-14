// Shared chrome for all auth pages. Presentation only; form logic lives in each page.
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ViewLink as Link } from './ViewLink';
import { NavIcon } from './ui/icons';
import useParallax from '../hooks/useParallax';
import logo from '../assets/company-logo.jpg';
import art from '../assets/brand/sewing-2.webp';
import '../styles/auth.css';
import '../styles/rog-auth.css';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

// 16px stops iOS Safari from zooming the page on focus.
export const authInput = (focusedKey, current, error) => ({
  width: '100%', padding: '14px 16px', minHeight: 54, borderRadius: 14, fontSize: 16,
  color: 'var(--au-field-ink, var(--ink))', background: 'var(--au-field, #fff)', boxSizing: 'border-box',
  // Focus: 2px teal ring (#028090 is 4.5:1 on the white card) outside the border, not just a faint glow.
  outline: focusedKey === current ? '2px solid var(--au-ring, #028090)' : 'none', outlineOffset: 2,
  fontFamily: FONT, transition: 'border-color .18s, box-shadow .18s',
  border: `1.5px solid ${error ? 'var(--danger)' : focusedKey === current ? 'var(--teal)' : 'var(--border)'}`,
  boxShadow: error ? '0 0 0 3px rgba(229,62,62,.10)' : focusedKey === current ? '0 0 0 3px rgba(2,128,144,.12)' : 'none',
});

export const fieldA11y = (id, msg) => ({ 'aria-invalid': msg ? true : undefined, 'aria-describedby': msg ? `${id}-err` : undefined });

export function FieldError({ id, msg }: any) {
  return msg ? <p id={`${id}-err`} role="alert" className="au-err">{msg}</p> : null;
}

export const FormError = ({ msg }: any) => (msg ? <p role="alert" className="au-formerr"><NavIcon name="warning" size={16} color="var(--danger)" />{msg}</p> : null);

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

export function SubmitBtn({ loading, disabled, busy, line, children }: any) {
  const late = useLate(loading);
  return (
    <button type="submit" className={`au-submit${line ? ' au-submit--line' : ''}`} disabled={loading || disabled} aria-busy={loading}>
      {late && <span className="au-spin" aria-hidden="true" />}{late ? busy : children}
    </button>
  );
}

export function AuthDone({ icon, title, action, onAction, children }: any) {
  return (
    <div role="status" className="au-done">
      <span className="au-done__icon"><NavIcon name={icon} size={26} color="var(--teal)" /></span>
      <h2>{title}</h2>
      <p>{children}</p>
      <button type="button" className="au-submit" onClick={onAction}>{action}</button>
    </div>
  );
}

export function Field({ id, label, error, aside, trailing, hint, onBlur, ...input }: any) {
  const [on, setOn] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="au-label">{label}</label>
      <div className="au-inputwrap">
        <input id={id} {...input} {...fieldA11y(id, error)} onFocus={() => setOn(true)} onBlur={e => { setOn(false); onBlur?.(e); }}
          style={{ ...authInput(on ? id : '', id, error), ...(trailing && { paddingRight: 52 }) }} />
        {trailing}
      </div>
      <FieldError id={id} msg={error} />
      {hint && !error && <p role="status" className="au-hint">{hint}</p>}
      {aside && <div className="au-asiderow">{aside}</div>}
    </div>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const sync = (e: KeyboardEvent | any) => setCaps(!!e.getModifierState?.('CapsLock'));
  return <Field {...props} type={show ? 'text' : 'password'} hint={caps ? 'Caps Lock is on.' : undefined}
    onKeyDown={sync} onKeyUp={sync} onBlur={e => { setCaps(false); props.onBlur?.(e); }} trailing={
    <button type="button" className="au-eye" onClick={() => setShow(v => !v)} aria-label="Show password" aria-pressed={show}>
      <NavIcon name={show ? 'hide' : 'show'} size={18} />
    </button>} />;
}

const STEPS = [
  'Design your uniform in the Studio',
  'Place a bulk order and review your delivery date',
  'Follow your order and message the VFRB team',
];

function SplitArt({ calm }: any) {
  const ref = useRef(null);
  useParallax(ref, calm);
  return (
    <aside className="au-art au-art--navy" ref={ref}>
      <img className="au-art__photo" src={art} alt="" decoding="async" fetchpriority="low" />
      <div className="vfrb-weave" aria-hidden="true" />
      <Link to="/" className="au-brand" aria-label="VFRB Enterprise home">
        <img src={logo} alt="" width="44" height="44" />
        <span>VFRB Enterprise</span>
      </Link>
      <div className="au-art-in">
        <h2 className="au-h">Custom uniforms, made smarter.</h2>
        <ol className="au-steps">
          {STEPS.map(t => <li key={t}><b>{t}</b></li>)}
        </ol>
      </div>
    </aside>
  );
}

export default function AuthShell({ title, subtitle, maxWidth = 440, children }: any) {
  const calm = useReducedMotion();
  const rise = calm ? {} : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0.7, 0.2, 1] } } };
  return (
    <div className="au au--split">
      <SplitArt calm={calm} />
      <main className="au-main">
        <motion.div className="au-card" style={{ maxWidth }} initial={false} animate="show"
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

}
