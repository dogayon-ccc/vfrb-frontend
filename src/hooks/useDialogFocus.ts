import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const stack = [];

// Traps Tab inside `ref`, closes on Escape (topmost dialog only), restores focus on close.
export default function useDialogFocus(ref, { active = true, onClose, initial } = {}) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const box = ref.current;
    if (!active || !box) return undefined;
    const prev = document.activeElement;
    const token = {};
    stack.push(token);
    const items = () => [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length);
    if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1');
    const first = (initial && box.querySelector(initial)) || items()[0] || box;
    first.focus({ preventScroll: true });

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') { e.stopPropagation(); close.current?.(); return; }
      if (e.key !== 'Tab') return;
      const f = items();
      if (!f.length) { e.preventDefault(); box.focus(); return; }
      const a = f[0]; const z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === box)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(token), 1);
      if (prev && document.contains(prev)) prev.focus?.({ preventScroll: true });
    };
  }, [active, ref, initial]);
}
