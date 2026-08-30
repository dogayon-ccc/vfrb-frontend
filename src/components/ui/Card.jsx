// src/components/ui/Card.jsx
// ─────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// main.css already defines `.card` / `.card-header` (background: card
// color, 1px border, radius-lg, subtle shadow) — but grep across pages/
// found zero uses of either class. Every page that needs a card panel
// currently hand-rolls the same inline style object from scratch (verified
// directly in Profile.jsx: 4 separate `{background:'#fff', border:'1px
// solid #e2e8f0', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.05)'}`
// blocks in one file). This component is that reuse point — it wires
// directly to the existing CSS classes/tokens rather than inventing new
// ones, so a future token change in main.css (e.g. adjusting --radius-lg)
// updates every card in the app instead of nothing.
//
// Usage:
//   <Card title="Change Password">
//     ...fields...
//   </Card>
//
//   <Card padding="sm" tone="subtle">...</Card>   // quieter variant, e.g.
//                                                  // the privacy-notice
//                                                  // block on Profile
// ─────────────────────────────────────────────────────────────────────────
export default function Card({
  title, subtitle, action, tone = 'default', padding = 'md',
  children, style, bodyStyle, className = '',
}) {
  const pad = padding === 'sm' ? '14px 16px' : padding === 'lg' ? '26px 28px' : '20px 22px';

  const rootStyle = tone === 'subtle'
    ? { background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)' }
    : { background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', boxShadow: '0 1px 3px rgba(0,0,0,.05)' };

  return (
    <div className={`card ${className}`} style={{ ...rootStyle, ...style }}>
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, padding: `${padding === 'sm' ? '12px 16px' : '16px 22px'}`,
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div>
            {title && (
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '3px 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: pad, ...bodyStyle }}>
        {children}
      </div>
    </div>
  );
}
