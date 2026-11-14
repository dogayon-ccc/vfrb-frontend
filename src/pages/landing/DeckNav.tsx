// Keynote-style navigation over the Home sections: right-edge dots, a bottom control bar and keyboard keys. Sections stay normal scrolling content (crawlable, no wheel hijack).
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';

export type DeckSlide = { id: string; label: string; bar?: boolean };

const TYPING = 'input, textarea, select, [contenteditable="true"]';

// Slides come from the page, or are read from `main [data-slide]` so inner pages only tag their sections.
const collect = (): DeckSlide[] => [...document.querySelectorAll<HTMLElement>('main [data-slide]')].filter(el => el.id).map(el => ({ id: el.id, label: el.dataset.slide ?? el.id }));

export default function DeckNav({ slides: given }: { slides?: readonly DeckSlide[] }) {
  const [found, setFound] = useState<DeckSlide[]>([]);
  useEffect(() => { if (!given) setFound(collect()); }, [given]);
  const slides = given ?? found;
  const reduce = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const last = slides.length - 1;
  const showBar = active > 0 && slides[active]?.bar !== false;

  useEffect(() => {
    if (!slides.length) return undefined;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let n = 0;
      slides.forEach((s, i) => { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top <= line) n = i; });
      setActive(atEnd ? slides.length - 1 : n);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [slides]);

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(last, i));
    document.getElementById(slides[n]?.id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [slides, last, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest?.(TYPING)) return;
      const k = e.key;
      if (k === 'PageDown' || k === 'ArrowRight') go(active + 1);
      else if (k === 'PageUp' || k === 'ArrowLeft') go(active - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go]);

  if (slides.length < 2) return null;
  return createPortal(
    <>
      <nav className="lp-dots" aria-label="Home sections">
        {slides.map((s, i) => (
          <button key={s.id} type="button" className="lp-dots__b" aria-label={`${i + 1}. ${s.label}`} aria-current={i === active ? 'true' : undefined} onClick={() => go(i)}>
            <span className="lp-dots__tip">{s.label}</span>
          </button>
        ))}
      </nav>
      <div className={`lp-bar${showBar ? '' : ' is-hidden'}`} {...(showBar ? {} : ({ inert: '' } as Record<string, string>))} role="group" aria-label="Slide controls">
        <button type="button" className="lp-bar__b" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous section">&larr;</button>
        <span className="lp-bar__t" aria-live="polite"><b>{String(active + 1).padStart(2, '0')}</b> / {String(slides.length).padStart(2, '0')}<span className="lp-bar__l"> &middot; {slides[active].label}</span></span>
        <button type="button" className="lp-bar__b" onClick={() => go(active + 1)} disabled={active === last} aria-label="Next section">&rarr;</button>
      </div>
    </>,
    document.body,
  );
}
