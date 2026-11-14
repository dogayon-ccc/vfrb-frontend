import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import DeckNav from '../../pages/landing/DeckNav';
import InkLayers from '../landing/InkLayers';
import '../../styles/motion.css';
import useTilt from '../../hooks/useTilt';
import '../../styles/landing-ink.css';
import '../../styles/depth.css';

// deck: inner pages tag sections with data-slide and get the Home dots and bar; lean drops the footer contact block that Home already shows.
type SitePageProps = { title?: string; children?: ReactNode; tone?: 'paper' | 'ink'; deck?: boolean; lean?: boolean };

export default function SitePage({ title, children, tone = 'paper', deck = false, lean = false }: SitePageProps) {
  const { hash, pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  useTilt(main, '.lp-card, .lp-tile, .vs-tile, .lp-contact__list a', 7, pathname);
  useEffect(() => { if (title) document.title = `${title} | VFRB Enterprise`; }, [title]);
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, hash]);
  useEffect(() => {
    if (!hash) return undefined;
    const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [hash, pathname]);
  return (
    <div className={`vs vs-page${tone === 'ink' ? ' vs-page--ink' : ''}`}>
      <SiteHeader tone={tone} />
      <main ref={main} id="main" key={pathname} className="vs-enter">{children}</main>
      <SiteFooter lean={lean} />
      {deck && <><InkLayers /><DeckNav /></>}
    </div>
  );
}
