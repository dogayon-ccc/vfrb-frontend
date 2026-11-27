// Stage helpers for the flat panels: side-by-side layout and drag-to-pan when zoomed in.
import { useEffect, useState } from 'react';

// Front and back sit side by side only where each still gets a working width.
export function usePair(query = '(min-width: 1280px)') {
  const [pair, setPair] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const m = window.matchMedia(query), f = () => setPair(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [query]);
  return pair;
}

export function panBy(down: { clientX: number; clientY: number; preventDefault: () => void }, host: HTMLElement | null) {
  if (!host) return;
  down.preventDefault();
  const x = down.clientX, y = down.clientY, left = host.scrollLeft, top = host.scrollTop;
  const move = (e: PointerEvent) => { host.scrollLeft = left - (e.clientX - x); host.scrollTop = top - (e.clientY - y); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
