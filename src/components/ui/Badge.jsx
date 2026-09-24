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
  // BUG FIX (Sept 2 2026): these two referenced var(--color-surface)/
  // var(--color-muted), which don't exist in theme.css (real tokens:
  // --bg-surface / --text-muted) — silently unstyled, same root cause as
  // the Card.jsx fix alongside this one. Not currently hit by either live
  // call site (Profile.jsx/Settings.jsx only use success/warning/info),
  // but Feedback.jsx's "Archived" status needs a working neutral tone.
  neutral: { bg: 'var(--bg-surface)', fg: 'var(--text-muted)' },
  // Added (Sept 2 2026, Suppliers.jsx reshape): matches theme.css's own
  // .badge-teal class exactly (var(--teal-50)/var(--teal-dark)) — that
  // class already existed, correctly defined, and was used precisely
  // nowhere in any page before this. This app's own primary brand color
  // was the one tone missing from its own status-pill component.
  teal: { bg: 'var(--teal-50)', fg: 'var(--teal-dark)' },
  // Added (Sept 5 2026, UserManagement.jsx reshape): the customer role
  // pill needed a purple tone, same reasoning as teal above — this
  // color already exists as a real brand token (var(--purple), used
  // for the Manager identity chip elsewhere) but had no Badge tone.
  purple: { bg: 'var(--purple-50)', fg: 'var(--purple-dark)' },
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
