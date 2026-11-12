import { useEffect } from 'react';

// Publishes the on-screen keyboard height as --kb-inset (and html[data-kb]) so composers can sit above it.
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty('--kb-inset', `${inset}px`);
      if (inset > 80) root.dataset.kb = ''; else delete root.dataset.kb;
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--kb-inset');
      delete root.dataset.kb;
    };
  }, []);
}
