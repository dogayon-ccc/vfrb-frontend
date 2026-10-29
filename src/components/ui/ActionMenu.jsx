// src/components/ui/ActionMenu.jsx
// "⋯" overflow menu: a 44px icon button that opens a small list of actions.
// items: [{ label, onClick, disabled?, tone?: 'danger' }]. drop: 'up' (default) or 'down' for menus near the top of the screen. Esc / outside click close; arrow keys move; focus returns to the button.
import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function ActionMenu({ items, label = 'More actions', align = 'right', drop = 'up', className = '' }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const btn = useRef(null);
  const id = useId();
  const list = items.filter(Boolean);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    wrap.current?.querySelector('[role=menuitem]:not([disabled])')?.focus();
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const close = (refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const els = [...wrap.current.querySelectorAll('[role=menuitem]:not([disabled])')];
    const i = els.indexOf(document.activeElement);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length;
    els[n]?.focus();
  };

  if (!list.length) return null;
  return (
    <div ref={wrap} className={`ui-menu ${className}`.trim()} onKeyDown={onKey}>
      <button ref={btn} type="button" className="ui-menu-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} role="menu" aria-label={label} className={`ui-menu-list ${align === 'left' ? 'left' : ''} ${drop === 'down' ? 'down' : ''}`.replace(/\s+/g, ' ').trim()}>
          {list.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled} className={it.tone === 'danger' ? 'danger' : undefined}
              onClick={() => { close(false); it.onClick(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
