// One tooltip for every Studio control with data-tip: shown 200 ms after hover or keyboard focus, hidden on leave, blur, Escape or scroll.
// Fixed-position so scrolling rails never clip it; the fade is skipped under reduced motion (CSS).
import { useEffect, useRef, useState } from 'react';

const DELAY = 200, GAP = 8;

export default function StudioTip() {
  const [tip, setTip] = useState(null); // { text, x, y, side }
  const timer = useRef(0), target = useRef(null);
  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      target.current?.removeAttribute('aria-describedby');
      target.current = null;
      setTip(null);
    };
    const show = el => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect(), rail = el.closest('[data-tip-side=right]');
        const right = !!rail && getComputedStyle(rail).flexDirection === 'column' && r.right + 220 < window.innerWidth;
        target.current = el;
        el.setAttribute('aria-describedby', 'ds-tip');
        setTip(right ? { text: el.dataset.tip, x: r.right + GAP, y: r.top + r.height / 2, side: 'right' }
          : { text: el.dataset.tip, x: Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120), y: r.bottom + GAP, side: 'below' });
      }, DELAY);
    };
    const over = e => { const el = e.target.closest?.('[data-tip]'); if (el && el !== target.current) show(el); };
    const out = e => { const el = e.target.closest?.('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hide(); };
    const focus = e => { const el = e.target.closest?.('[data-tip]'); if (el && e.target.matches(':focus-visible')) show(el); };
    const key = e => { if (e.key === 'Escape' && target.current) hide(); };
    const scroll = () => { if (target.current) hide(); }; // a pending tip survives the scroll that focusing a rail button causes
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, true);
    return () => {
      hide();
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll, true);
    };
  }, []);
  if (!tip) return null;
  return <div id="ds-tip" role="tooltip" className="ds-tip" data-side={tip.side} style={{ left: tip.x, top: tip.y }}>{tip.text}</div>;
}
