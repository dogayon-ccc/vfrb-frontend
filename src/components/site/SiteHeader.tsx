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

// One 0.7 s turn per press; a new press restarts it. Skipped under reduced motion.
function spinMark(img) {
  if (!img?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  img.getAnimations().forEach(a => a.cancel());
  img.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'ease-in-out' });
}

export default function SiteHeader({ tone = 'paper' }: { tone?: 'paper' | 'ink' }) {
  const [open, setOpen] = useState(false);
  const { pathname, search, hash } = useLocation();
  // Already home: skip the no-op view transition, which would swallow a quick second press.
  const atHome = pathname === '/' && !search && !hash;
  const root = useRef(null);
  const burger = useRef(null);
  const mark = useRef(null);
  const [stuck, setStuck] = useState(false);
  // Ink tone only: the bar slides away while reading down and returns on the first scroll up.
  const [away, setAway] = useState(false);
  // The landing hero has its own Sign in, so the header one waits until the hero scrolls away.
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setStuck(y > 8); setPastHero(y > window.innerHeight * 0.6);
      if (tone === 'ink') {
        if (y > 240 && y > last + 4) setAway(true);
        else if (y < last - 4 || y <= 240) setAway(false);
      }
      last = y;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [tone]);

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
    <header className={`vs vs-header${stuck || open ? ' is-stuck' : ''}${tone === 'ink' ? ' vs-header--ink' : ''}${away && !open ? ' is-away' : ''}`} ref={root}>
      <a href="#main" className="vs-skip" onClick={skipToMain}>Skip to content</a>
      <div className="vs-wrap vs-header__bar">
        <Link to="/" className="vs-brand" aria-label="VFRB Enterprise home" onClick={(e) => { spinMark(mark.current); if (atHome) e.preventDefault(); }}>
          <img ref={mark} src={logo} alt="" width="40" height="40" />
          <span><b>VFRB Enterprise</b><small>Custom Uniforms. Smarter Solutions.</small></span>
        </Link>
        <nav className="vs-nav" aria-label="Main">
          {NAV.map(n => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
        </nav>
        <div className={`vs-header__cta${pathname === '/' && !pastHero ? ' is-off' : ''}`}>
          <Btn to="/login">Sign in</Btn>
        </div>
        <button ref={burger} type="button" className="vs-burger" aria-expanded={open} aria-controls="vs-sheet"
          aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </div>
      <nav id="vs-sheet" className={`vs-sheet${open ? ' is-open' : ''}`} aria-label="Mobile" aria-hidden={!open}>
        {NAV.map(n => <NavLink key={n.to} to={n.to} className="vs-sheet__link">{n.label}<span aria-hidden="true">›</span></NavLink>)}
        <div className="vs-sheet__cta">
          <Btn to="/login">Sign in</Btn>
        </div>
      </nav>
    </header>
  );
}
