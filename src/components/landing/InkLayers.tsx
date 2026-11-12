import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Trailing ring that grows over anything clickable. Fine pointers only; the native cursor stays.
function CursorRing() {
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ring.current;
    if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let x = -100, y = -100, tx = x, ty = y, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY;
      el.setAttribute('data-on', '');
      el.toggleAttribute('data-hot', !!(e.target as Element | null)?.closest?.('a, button, [role="slider"], summary'));
    };
    const leave = () => el.removeAttribute('data-on');
    raf = requestAnimationFrame(loop);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); };
  }, []);
  return <div ref={ring} className="lp-ring" aria-hidden="true" />;
}

// Film grain, edge vignette and the cursor ring, all pointer-events:none and portalled out of the page flow.
export default function InkLayers() {
  return createPortal(
    <>
      <div className="lp-vignette" aria-hidden="true" />
      <div className="lp-grain" aria-hidden="true" style={{ backgroundImage: GRAIN }} />
      <CursorRing />
    </>,
    document.body,
  );
}
