import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { areaOf } from '../utils/routeArea';
import logo from '../assets/company-logo.jpg';
import '../styles/route-veil.css';

// Every page change plays the VFRB wipe: the full one when the area changes (login, logout, into or out of the Studio, public <-> app),
// a shorter one between pages of the same area. It never blocks input and never waits on a request.

export default function RouteVeil() {
  const { pathname } = useLocation();
  const area = areaOf(pathname);
  const prev = useRef<{ path: string; area: string } | null>(null);
  const [run, setRun] = useState(0);
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const last = prev.current;
    prev.current = { path: pathname, area };
    if (!last) return;
    if (last.path === pathname) return;
    setLite(last.area === area);
    setRun(n => n + 1);
  }, [pathname, area]);

  return (
    <div key={run} className={`rv${run === 0 ? ' rv--boot' : ''}${lite ? ' rv--lite' : ''}`} aria-hidden="true">
      <i className="rv__mark"><img src={logo} alt="" width="56" height="56" /></i>
      <i className="rv__bar" />
    </div>
  );
}
