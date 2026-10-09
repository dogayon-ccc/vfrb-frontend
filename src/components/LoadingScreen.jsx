// Full-screen brand loader (logo inside a spinning ring) whenever the app area changes:
// site ↔ login, login → dashboard, logout → login, dashboard → studio, …
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';
import { areaOf } from '../utils/routeArea';
import '../styles/skeleton.css';

const SHOW_MS = 700;

export function LoadingScreen({ leaving }) {
  return (
    <div className={`ldr${leaving ? ' ldr-out' : ''}`} role="status" aria-live="polite" aria-label="Loading">
      <div className="ldr-mark">
        <span className="ldr-ring" aria-hidden="true" />
        <img src={logo} alt="" />
      </div>
      <p>Loading…</p>
    </div>
  );
}

export default function RouteLoadingScreen() {
  const { pathname } = useLocation();
  const prev = useRef(pathname);
  const timers = useRef([]);
  const [phase, setPhase] = useState(null);

  // Layout effect so the overlay paints before the new page's first frame. Timers live in a
  // ref so a follow-up redirect inside the same area (/admin → /admin/dashboard) can't strand it.
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = pathname;
    if (areaOf(from) === areaOf(pathname)) return;
    timers.current.forEach(clearTimeout);
    setPhase('in');
    timers.current = [
      setTimeout(() => setPhase('out'), SHOW_MS),
      setTimeout(() => setPhase(null), SHOW_MS + 220),
    ];
  }, [pathname]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return phase ? <LoadingScreen leaving={phase === 'out'} /> : null;
}
