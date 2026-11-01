import { useEffect } from 'react';

// Pointer position (-0.5..0.5) as --px/--py on fine pointers only; writes CSS vars so React never re-renders.
export default function useParallax(ref, off) {
  useEffect(() => {
    const el = ref.current;
    if (off || !el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let raf = 0;
    const set = (x, y) => { el.style.setProperty('--px', x); el.style.setProperty('--py', y); };
    const move = (e) => {
      const b = el.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => set(x.toFixed(3), y.toFixed(3)));
    };
    const leave = () => { cancelAnimationFrame(raf); set(0, 0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [ref, off]);
}
