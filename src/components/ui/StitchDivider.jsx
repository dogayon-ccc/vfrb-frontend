// src/components/ui/StitchDivider.jsx — 1px dashed rule; `active` uses thread-red (one per view); `label` centres a caption.
export default function StitchDivider({ active = false, vertical = false, label, spacing = 16, style, ...rest }) {
  const line = active ? 'var(--pr-stitch-active)' : 'var(--pr-stitch)';
  if (label && !vertical) {
    const seam = <span aria-hidden="true" style={{ flex: 1, borderTop: line }} />;
    return (
      <div
        role="separator"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, margin: `${spacing}px 0`,
          color: 'var(--pr-ink-meta)', fontSize: 'var(--text-meta)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
          ...style,
        }}
        {...rest}
      >
        {seam}<span>{label}</span>{seam}
      </div>
    );
  }
  return (
    <hr
      aria-orientation={vertical ? 'vertical' : undefined}
      style={{
        border: 0, flexShrink: 0,
        ...(vertical
          ? { borderLeft: line, alignSelf: 'stretch', width: 0, margin: `0 ${spacing}px` }
          : { borderTop: line, width: '100%', margin: `${spacing}px 0` }),
        ...style,
      }}
      {...rest}
    />
  );
}
