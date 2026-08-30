// src/components/ui/Badge.jsx
// ─────────────────────────────────────────────────────────────────────────
// Small status pill — order status, QC pass/fail, "Email verified", stock
// level, etc. Profile.jsx currently renders "✓ Verified" / "⚠ Not verified"
// as a plain <strong> with an inline color — this is that pattern made
// reusable and icon-consistent (via NavIcon, not emoji).
//
// Usage:  <Badge tone="success">Verified</Badge>
//         <Badge tone="warning" icon="warning">Pending</Badge>
// ─────────────────────────────────────────────────────────────────────────
import { NavIcon } from './icons';

const TONES = {
  success: { bg: 'rgba(34,197,94,.12)',  fg: '#16a34a' },
  warning: { bg: 'rgba(245,158,11,.12)', fg: '#b45309' },
  danger:  { bg: 'rgba(239,68,68,.12)',  fg: '#dc2626' },
  info:    { bg: 'rgba(59,130,246,.12)', fg: '#2563eb' },
  neutral: { bg: 'var(--color-surface)', fg: 'var(--color-muted)' },
};

export default function Badge({ tone = 'neutral', icon, children }) {
  const t = TONES[tone] ?? TONES.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 700,
    }}>
      {icon && <NavIcon name={icon} size={12} color={t.fg} />}
      {children}
    </span>
  );
}
