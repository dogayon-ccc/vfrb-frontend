// Full-screen brand loader (logo inside a spinning ring) whenever the app area changes:
// site ↔ login, login → dashboard, logout → login, dashboard → studio, and between public site pages.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';
import { areaOf } from '../utils/routeArea';
import '../styles/skeleton.css';

// Public page → public page gets the full 1s show; area changes (login, dashboard, …) stay quick.
const TIMING = { slow: [720, 280], quick: [140, 100] };

export function LoadingScreen({ leaving, quick }) {
  return (
    <div className={`ldr${quick ? ' ldr-quick' : ''}${leaving ? ' ldr-out' : ''}`} role="status" aria-live="polite" aria-label="Loading">
      <div className="ldr-mark">
        <span className="ldr-ring" aria-hidden="true" />
        <img src={logo} alt="" />
      </div>
      <p className="ldr-text"><b>VFRB Enterprise</b><small>Custom Uniforms. Smarter Solutions.</small></p>
      <span className="ldr-bar" aria-hidden="true" />
    </div>
  );
}

export default function RouteLoadingScreen() {
  const { pathname } = useLocation();
  const prev = useRef(pathname);
  const timers = useRef([]);
  const [phase, setPhase] = useState(null);
  const [quick, setQuick] = useState(true);

  // Layout effect so the overlay paints before the new page's first frame. Timers live in a
  // ref so a follow-up redirect inside the same area (/admin → /admin/dashboard) can't strand it.
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = pathname;
    const siteHop = areaOf(from) === 'site' && areaOf(pathname) === 'site';
    if (from === pathname || (areaOf(from) === areaOf(pathname) && !siteHop)) return;
    const [show, fade] = TIMING[siteHop ? 'slow' : 'quick'];
    timers.current.forEach(clearTimeout);
    setQuick(!siteHop);
    setPhase('in');
    timers.current = [
      setTimeout(() => setPhase('out'), show),
      setTimeout(() => setPhase(null), show + fade),
    ];
  }, [pathname]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return phase ? <LoadingScreen leaving={phase === 'out'} quick={quick} /> : null;
}
