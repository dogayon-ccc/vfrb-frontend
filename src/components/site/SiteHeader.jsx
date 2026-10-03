import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewLink as Link, ViewNavLink as NavLink } from '../ViewLink';
import '../../styles/site.css';
import logo from '../../assets/company-logo.jpg';
import { NAV } from './config';
import { Btn } from './parts';

function skipToMain(e) {
  e.preventDefault();
  const t = document.getElementById('main') || document.querySelector('h1');
  if (t) { t.tabIndex = -1; t.focus(); t.scrollIntoView({ block: 'start' }); }
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const root = useRef(null);
  const burger = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const on = () => setStuck(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    root.current.querySelector('.vs-sheet a')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); burger.current?.focus(); return; }
      if (e.key !== 'Tab') return;
      const items = [burger.current, ...root.current.querySelectorAll('.vs-sheet a')];
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header className={`vs vs-header${stuck || open ? ' is-stuck' : ''}`} ref={root}>
      <a href="#main" className="vs-skip" onClick={skipToMain}>Skip to content</a>
      <div className="vs-wrap vs-header__bar">
        <Link to="/" className="vs-brand" aria-label="VFRB Enterprise home">
          <img src={logo} alt="" width="40" height="40" />
          <span><b>VFRB Enterprise</b><small>Custom Uniforms. Smarter Solutions.</small></span>
        </Link>
        <nav className="vs-nav" aria-label="Main">
          {NAV.map(n => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
        </nav>
        <div className="vs-header__cta">
          <Link to="/login" className="vs-login">Log in</Link>
          <Btn to="/register">Design your uniform</Btn>
        </div>
        <button ref={burger} type="button" className="vs-burger" aria-expanded={open} aria-controls="vs-sheet"
          aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </div>
      <nav id="vs-sheet" className={`vs-sheet${open ? ' is-open' : ''}`} aria-label="Mobile" aria-hidden={!open}>
        {NAV.map(n => <NavLink key={n.to} to={n.to} className="vs-sheet__link">{n.label}<span aria-hidden="true">›</span></NavLink>)}
        <div className="vs-sheet__cta">
          <Btn to="/register">Design your uniform</Btn>
          <Btn to="/login" variant="line">Log in</Btn>
        </div>
      </nav>
    </header>
  );
}
