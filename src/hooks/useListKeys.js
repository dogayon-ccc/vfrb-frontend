import { useCallback, useEffect, useRef, useState } from 'react';

const typing = (el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName) || el?.isContentEditable;

// Keyboard for a dense list: / focuses search, j/k (or arrows inside the list) move, Enter opens, Home/End jump.
// Spread rowProps(i) on each row; rows get a roving tabindex so Tab enters the list once.
export default function useListKeys({ count, onOpen, enabled = true }) {
  const [active, setActive] = useState(0);
  const rows = useRef([]);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, count - 1))); }, [count]);

  const move = useCallback((i) => {
    if (!count) return;
    const n = Math.max(0, Math.min(count - 1, i));
    setActive(n);
    rows.current[n]?.focus({ preventScroll: false });
  }, [count]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('[aria-modal="true"]')) return;
      if (typing(e.target)) {
        if (e.key === 'Escape' && e.target === searchRef.current) e.target.blur();
        return;
      }
      const inList = listRef.current?.contains(e.target);
      if (e.key === '/' && searchRef.current) { e.preventDefault(); searchRef.current.focus(); return; }
      if (e.key === 'j' || (inList && e.key === 'ArrowDown')) { e.preventDefault(); move(inList ? active + 1 : active); return; }
      if (e.key === 'k' || (inList && e.key === 'ArrowUp')) { e.preventDefault(); move(inList ? active - 1 : active); return; }
      if (inList && e.key === 'Home') { e.preventDefault(); move(0); return; }
      if (inList && e.key === 'End') { e.preventDefault(); move(count - 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, active, count, move]);

  const rowProps = (i) => ({
    ref: (el) => { rows.current[i] = el; },
    tabIndex: i === active ? 0 : -1,
    'data-active': i === active || undefined,
    onFocus: () => setActive(i),
    ...(onOpen && {
      onClick: () => onOpen(i),
      onKeyDown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onOpen(i); } },
    }),
  });

  return { active, setActive, move, rowProps, listRef, searchRef };
}
