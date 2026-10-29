// src/components/ui/Ticket.jsx — kraft or chalk tag with a punched hole; `value` renders with tabular numerals.
export default function Ticket({ label, value, tone = 'kraft', as: Tag = 'div', children, style, ...rest }) {
  const kraft = tone === 'kraft';
  return (
    <Tag
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 32,
        padding: '4px 12px 4px 24px', borderRadius: 'var(--radius-tick)', fontFamily: 'var(--font-v2-sans)',
        fontSize: 'var(--text-label)', fontWeight: 500, maxWidth: '100%',
        background: kraft ? 'var(--color-kraft)' : 'var(--color-chalk)',
        color: kraft ? 'var(--color-on-kraft)' : 'var(--color-ink)',
        border: kraft ? 'none' : 'var(--stitch-line)', ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{
        position: 'absolute', left: 9, top: '50%', width: 6, height: 6, marginTop: -3, borderRadius: '50%',
        background: 'var(--color-chalk)', boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .2)',
      }} />
      {label && <span style={{ overflowWrap: 'anywhere' }}>{label}</span>}
      {value != null && <strong className="num-tab" style={{ fontWeight: 700 }}>{value}</strong>}
      {children}
    </Tag>
  );
}
