// Shared chrome for all auth pages. Presentation only; form logic lives in each page.
import { motion, useReducedMotion } from 'framer-motion';
import { ViewLink as Link } from './ViewLink';
import logo from '../assets/company-logo.jpg';
import art from '../assets/brand/sewing-2.jpg';
import '../styles/auth.css';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

// 16px stops iOS Safari from zooming the page on focus.
export const authInput = (focusedKey, current, error) => ({
  width: '100%', padding: '13px 16px', minHeight: 48, borderRadius: 12, fontSize: 16,
  color: 'var(--ink)', background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT, transition: 'border-color .18s, box-shadow .18s',
  border: `1.5px solid ${error ? 'var(--danger)' : focusedKey === current ? 'var(--teal)' : 'var(--border)'}`,
  boxShadow: error ? '0 0 0 3px rgba(229,62,62,.10)' : focusedKey === current ? '0 0 0 3px rgba(2,128,144,.12)' : 'none',
});

const STEPS = [
  { t: 'Design', d: 'Build your uniform visually in the Studio' },
  { t: 'Order', d: 'Bulk quantities, sizes and delivery in four steps' },
  { t: 'Track', d: 'Follow production and message VFRB staff' },
];

export default function AuthShell({ title, subtitle, maxWidth = 400, children }) {
  const calm = useReducedMotion();
  const rise = calm ? {} : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] } } };

  return (
    <div className="au">
      <aside className="au-art">
        <img src={art} alt="" decoding="async" fetchpriority="low" />
        <Link to="/" className="au-back"><span aria-hidden="true">←</span> VFRB Enterprise</Link>
        <div className="au-art-in">
          <h2 className="au-h">Custom uniforms, made smarter.</h2>
          <ol className="au-steps">
            {STEPS.map(s => <li key={s.t}><b>{s.t}</b><span>{s.d}</span></li>)}
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
            <h1 className="au-title">{title}</h1>
            {subtitle && <div className="au-sub">{subtitle}</div>}
          </motion.div>
          <motion.div variants={rise}>{children}</motion.div>
        </motion.div>
      </main>
    </div>
  );
}
