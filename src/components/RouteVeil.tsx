import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { areaOf } from '../utils/routeArea';
import logo from '../assets/company-logo.jpg';
import '../styles/route-veil.css';

// Dashboards swap pages constantly, so the wipe only plays when the area changes.
const WIPE_EVERY_PAGE = new Set(['site', 'auth']);

export default function RouteVeil() {
  const { pathname } = useLocation();
  const area = areaOf(pathname);
  const prev = useRef<{ path: string; area: string } | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const last = prev.current;
    prev.current = { path: pathname, area };
    if (!last) return;
    if (last.path === pathname) return;
    if (last.area !== area || WIPE_EVERY_PAGE.has(area)) setRun(n => n + 1);
  }, [pathname, area]);

  return (
    <div key={run} className={`rv${run === 0 ? ' rv--boot' : ''}`} aria-hidden="true">
      <i className="rv__mark"><img src={logo} alt="" width="56" height="56" /></i>
      <i className="rv__bar" />
    </div>
  );
}
