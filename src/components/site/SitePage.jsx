import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export default function SitePage({ title, children }) {
  const { hash, pathname } = useLocation();
  useEffect(() => { if (title) document.title = `${title} | VFRB Enterprise`; }, [title]);
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, hash]);
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [hash, pathname]);
  return (
    <div className="vs vs-page">
      <SiteHeader />
      <main id="main" key={pathname} className="vs-enter">{children}</main>
      <SiteFooter />
    </div>
  );
}
