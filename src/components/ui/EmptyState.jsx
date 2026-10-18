// src/components/ui/EmptyState.jsx
// Nothing to show (or a load failure): say what is missing and offer the next step.
// icon: a lucide component; art: a custom illustration node shown instead of the icon.
// tone 'error' announces itself to assistive tech. boxed draws the card frame; compact trims padding.
// kit.EmptyState/ErrorState, AdminUI.EmptyBlock and components/EmptyState.jsx render this. Styles: .ui-empty.
import { Inbox, AlertTriangle } from 'lucide-react';

export default function EmptyState({
  icon, art, title, children, action, tone = 'default', boxed = false, compact = false, className = '', style,
}) {
  const Icon = icon ?? (tone === 'error' ? AlertTriangle : Inbox);
  const cls = ['ui-empty', boxed && 'boxed', compact && 'compact', className].filter(Boolean).join(' ');
  return (
    <div className={cls} data-tone={tone === 'error' ? 'error' : undefined} role={tone === 'error' ? 'alert' : undefined} style={style}>
      {art
        ? <div className="ui-empty-art" aria-hidden="true">{art}</div>
        : <span className="ui-empty-icon" aria-hidden="true"><Icon size={24} strokeWidth={1.8} /></span>}
      {title && <h3 className="ui-empty-title">{title}</h3>}
      {children && <div className="ui-empty-body">{children}</div>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
