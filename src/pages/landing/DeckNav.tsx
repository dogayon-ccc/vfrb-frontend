// Keynote-style navigation over the Home sections: right-edge dots, a bottom control bar and keyboard keys. Sections stay normal scrolling content (crawlable, no wheel hijack).
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';

export type DeckSlide = { id: string; label: string };

const TYPING = 'input, textarea, select, [contenteditable="true"]';

export default function DeckNav({ slides }: { slides: readonly DeckSlide[] }) {
  const reduce = useReducedMotion() ?? false;
  const [active, setActive] = useState(0);
  const last = slides.length - 1;

  useEffect(() => {
    const els = slides.map(s => document.getElementById(s.id));
    const seen = new Map<Element, number>();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => seen.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
      let best = -1, ratio = 0;
      els.forEach((el, i) => { const r = el ? seen.get(el) ?? 0 : 0; if (r > ratio) { ratio = r; best = i; } });
      if (best >= 0) setActive(best);
    }, { threshold: [0.15, 0.35, 0.55, 0.75] });
    els.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [slides]);

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(last, i));
    document.getElementById(slides[n].id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
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

  return createPortal(
    <>
      <nav className="lp-dots" aria-label="Home sections">
        {slides.map((s, i) => (
          <button key={s.id} type="button" className="lp-dots__b" aria-label={`${i + 1}. ${s.label}`} aria-current={i === active ? 'true' : undefined} onClick={() => go(i)}>
            <span className="lp-dots__tip">{s.label}</span>
          </button>
        ))}
      </nav>
      <div className={`lp-bar${active === 0 ? ' is-hidden' : ''}`} {...(active === 0 ? ({ inert: '' } as Record<string, string>) : {})} role="group" aria-label="Slide controls">
        <button type="button" className="lp-bar__b" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous section">&larr;</button>
        <span className="lp-bar__t" aria-live="polite"><b>{String(active + 1).padStart(2, '0')}</b> / {String(slides.length).padStart(2, '0')} &middot; {slides[active].label}</span>
        <button type="button" className="lp-bar__b" onClick={() => go(active + 1)} disabled={active === last} aria-label="Next section">&rarr;</button>
      </div>
    </>,
    document.body,
  );
}
