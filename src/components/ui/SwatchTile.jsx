// src/components/ui/SwatchTile.jsx — fabric/colour swatch; a button when `onClick` is set, 44px minimum target.
export default function SwatchTile({ color, image, name, quantity, unit, selected = false, onClick, style, ...rest }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, minWidth: 0, width: '100%', padding: 6,
        borderRadius: 'var(--radius-tick)', background: 'var(--color-chalk)', color: 'var(--color-ink)',
        border: selected ? 'var(--pr-swatch-selected)' : 'var(--pr-stitch)', textAlign: 'left',
        fontFamily: 'var(--font-v2-sans)', fontSize: 'var(--text-label)', cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--pr-dur-fast)', ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{
        width: 'var(--pr-swatch-size)', height: 'var(--pr-swatch-size)', flexShrink: 0, borderRadius: 'var(--pr-swatch-radius)',
        background: image ? `center / cover url(${image})` : color, boxShadow: 'var(--pr-swatch-ring)',
      }} />
      <span style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', fontWeight: 500 }}>{name}</span>
      {quantity != null && (
        <span className="num-tab" style={{ color: 'var(--color-ink-2)', whiteSpace: 'nowrap' }}>
          {quantity}{unit ? ` ${unit}` : ''}
        </span>
      )}
    </Tag>
  );
}
