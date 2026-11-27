import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_META } from './RouteMeta';

// After each page change: a polite live-region announcement of the new page, and a document title for private pages (public ones are set by RouteMeta).
export default function RouteAnnouncer() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const t = setTimeout(() => {
      const h = document.querySelector('main h1, [role="main"] h1')?.textContent?.trim();
      const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
      if (h && !PUBLIC_META[path as keyof typeof PUBLIC_META]) document.title = `${h} | VFRB Enterprise`;
      setMsg(h || document.title);
    }, 400);
    return () => clearTimeout(t);
  }, [pathname]);
  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{msg}</div>;
}
