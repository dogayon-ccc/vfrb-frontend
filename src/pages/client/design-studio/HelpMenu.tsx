// Studio help menu: tour, how-to guides, shortcuts. Rendered in a portal because the scrolling rail would clip an absolutely placed menu.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Act = (() => void) | undefined;
type Props = { onTour?: Act; onKeys?: Act; onHowTo?: Act };

const ITEMS = [
  { id: 'tour', label: 'Take the tour', hint: 'One minute, point by point' },
  { id: 'howto', label: 'How-to guides', hint: 'Short guides for common jobs' },
  { id: 'keys', label: 'Keyboard shortcuts', hint: 'Every key and gesture', key: '?' },
] as const;

export default function HelpMenu({ onTour, onKeys, onHowTo }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const run: Record<string, Act> = { tour: onTour, keys: onKeys, howto: onHowTo };
  const items = ITEMS.filter(i => run[i.id]);

  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus({ preventScroll: true }); };

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    setPos({ left: r.right + 12, bottom: Math.max(12, window.innerHeight - r.bottom) });
  }, [open]);

  useEffect(() => {
    if (!open || !pos) return undefined;
    const rows = () => [...(menu.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    rows()[0]?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!menu.current?.contains(t) && !btn.current?.contains(t)) close(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { close(false); return; }
      const list = rows(), at = list.indexOf(document.activeElement as HTMLElement);
      const to = ({ ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 } as Record<string, number>)[e.key];
      if (to === undefined) return;
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    const resize = () => close(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key, true);
    window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key, true); window.removeEventListener('resize', resize); };
  }, [open, pos]);

  if (!items.length) return null;
  return (
    <div className="ds-help">
      <button ref={btn} type="button" className="ds-help-btn" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'ds-help-menu' : undefined}
        aria-keyshortcuts="?" onClick={() => (open ? close(false) : setOpen(true))}>
        <span className="ds-help-mark" aria-hidden="true">?</span>
        <span className="ds-help-label">Help</span>
      </button>
      {open && pos && createPortal(
        <ul id="ds-help-menu" ref={menu} className="ds-help-menu" role="menu" aria-label="Studio help" style={pos}>
          {items.map(i => (
            <li key={i.id} role="none">
              <button type="button" role="menuitem" onClick={() => { close(false); run[i.id]?.(); }}>
                <strong>{i.label}</strong>
                <small>{i.hint}</small>
                {'key' in i && <kbd aria-hidden="true">{i.key}</kbd>}
              </button>
            </li>
          ))}
        </ul>,
        btn.current?.closest('.ds') ?? document.body,
      )}
    </div>
  );
}
