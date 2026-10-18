// src/components/ui/AlertBanner.jsx
// The one alert banner (U1): full width, icon, bold title, high contrast.
// tone: 'error' | 'warning' | 'info' | 'success'. Styles: .alert-banner in theme.css.
import { AlertTriangle, XCircle, Info, CheckCircle2 } from 'lucide-react';

const ICON = { error: XCircle, warning: AlertTriangle, info: Info, success: CheckCircle2 };
const DEFAULT_TITLE = { error: 'Something went wrong', warning: 'Check this', info: 'Note', success: 'Done' };

export default function AlertBanner({ tone = 'error', title, children, action, style }) {
  const Icon = ICON[tone] ?? Info;
  const loud = tone === 'error' || tone === 'warning';
  return (
    <div className={`alert-banner ${tone}`} role={loud ? 'alert' : 'status'} style={style}>
      <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
      <div className="ab-body">
        <strong className="ab-title">{title ?? DEFAULT_TITLE[tone]}</strong>
        {children && <span>{children}</span>}
      </div>
      {action && <div className="ab-action">{action}</div>}
    </div>
  );
}
