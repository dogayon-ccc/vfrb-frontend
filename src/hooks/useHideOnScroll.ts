// True while the window scrolls down past `after` px; false on any upward scroll or when `resetKey` changes.
import { useEffect, useState } from 'react';

export function useHideOnScroll(resetKey, after = 56) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setHidden(false); }, [resetKey]);
  useEffect(() => {
    let last = window.scrollY, raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (Math.abs(y - last) < 6) return;
        setHidden(y > last && y > after);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [after]);
  return hidden;
}
