// src/components/ui/Drawer.jsx
// Side panel for a record opened from a list: right edge on desktop, bottom sheet under 768px.
// Esc closes and Tab is trapped (useDialogFocus). onPrev/onNext add buttons plus the [ and ] keys.
// footer holds the actions. Styles: .ui-drawer in styles/theme.css.
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import useDialogFocus from '../../hooks/useDialogFocus';

const typing = (el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName) || el?.isContentEditable;

export default function Drawer({ title, subtitle, onClose, onPrev, onNext, footer, children, label }) {
  const ref = useRef(null);
  useDialogFocus(ref, { onClose });
  const onKey = (e) => {
    if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '[' && onPrev) { e.preventDefault(); onPrev(); }
    if (e.key === ']' && onNext) { e.preventDefault(); onNext(); }
  };
  return (
    <div className="ui-drawer-scrim" onClick={onClose}>
      <aside ref={ref} className="ui-drawer" role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <header className="ui-drawer-head">
          <div style={{ minWidth: 0 }}>
            <h2 className="ui-drawer-title">{title}</h2>
            {subtitle && <p className="ui-drawer-sub">{subtitle}</p>}
          </div>
          <div className="ui-drawer-nav">
            {onPrev && <button type="button" className="ui-drawer-icon" onClick={onPrev} aria-label="Previous" title="Previous ( [ )"><ChevronLeft size={18} aria-hidden="true" /></button>}
            {onNext && <button type="button" className="ui-drawer-icon" onClick={onNext} aria-label="Next" title="Next ( ] )"><ChevronRight size={18} aria-hidden="true" /></button>}
            <button type="button" className="ui-drawer-icon" onClick={onClose} aria-label="Close" title="Close (Esc)"><X size={18} aria-hidden="true" /></button>
          </div>
        </header>
        <div className="ui-drawer-body">{children}</div>
        {footer && <footer className="ui-drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
