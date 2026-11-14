import { useEffect, type RefObject } from 'react';

// One delegated pointer listener: writes --tx/--ty (deg) on the hovered card. Fine pointers and no-reduced-motion only; React never re-renders.
export default function useTilt(root: RefObject<HTMLElement>, selector: string, max = 7, dep?: unknown) {
  useEffect(() => {
    const el = root.current;
    if (!el || !matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return undefined;
    let cur: HTMLElement | null = null, raf = 0;
    const reset = () => { cancelAnimationFrame(raf); cur?.style.removeProperty('--tx'); cur?.style.removeProperty('--ty'); cur = null; };
    const move = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>(selector) ?? null;
      if (t !== cur) { reset(); cur = t; }
      if (!t) return;
      const x = e.clientX, y = e.clientY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const b = t.getBoundingClientRect();
        t.style.setProperty('--tx', `${(((x - b.left) / b.width - 0.5) * max * 2).toFixed(2)}deg`);
        t.style.setProperty('--ty', `${(-((y - b.top) / b.height - 0.5) * max * 2).toFixed(2)}deg`);
      });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', reset); reset(); };
  }, [root, selector, max, dep]);
}
