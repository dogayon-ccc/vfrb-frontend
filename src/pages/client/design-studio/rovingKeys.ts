import { useEffect } from 'react';

// Radio groups and tab lists follow the ARIA pattern: one Tab stop per group, arrows move and select. Delegated so every panel gets it.
const GROUPS = '[role=radiogroup],[role=tablist]';
const ITEMS = '[role=radio]:not(:disabled),[role=tab]:not(:disabled)';
const isOn = el => el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true';

export function nextRoving(i, n, key) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (i + 1) % n;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (i - 1 + n) % n;
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  return null;
}

function syncStops(root) {
  root.querySelectorAll(GROUPS).forEach(g => {
    const items = [...g.querySelectorAll(ITEMS)], stop = items.find(isOn) ?? items[0];
    items.forEach(x => { x.tabIndex = x === stop ? 0 : -1; });
  });
}

export function useRovingGroups() {
  useEffect(() => {
    let frame = 0;
    const sync = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => syncStops(document.body)); };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'aria-selected', 'disabled'] });
    sync();
    // Capture, so arrows on a radio never reach the Studio's nudge shortcut.
    const onKey = e => {
      const item = e.target.closest?.(ITEMS), group = item?.closest(GROUPS);
      if (!group || e.ctrlKey || e.metaKey || e.altKey) return;
      const items = [...group.querySelectorAll(ITEMS)], to = nextRoving(items.indexOf(item), items.length, e.key);
      if (to === null) return;
      e.preventDefault();
      e.stopPropagation();
      items[to].focus();
      items[to].click();
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);
}
