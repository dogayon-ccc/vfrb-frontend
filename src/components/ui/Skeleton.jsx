// src/components/ui/Skeleton.jsx
// Loading placeholder on the shared .sk shimmer. variant: 'text' (lines, last one short) | 'block' | 'circle'.
// count repeats the shape; label is announced once for the whole group. Styles: .sk in main.css, .ui-sk in theme.css.
const px = (v) => (typeof v === 'number' ? `${v}px` : v);

export default function Skeleton({
  variant = 'text', count = 1, width, height, label = 'Loading', gap = 8, className = '', style,
}) {
  const n = Math.max(1, count);
  const h = height ?? (variant === 'text' ? 12 : variant === 'circle' ? 40 : 64);
  const w = width ?? (variant === 'circle' ? h : '100%');
  return (
    <div className={`ui-sk ${className}`.trim()} role="status" aria-busy="true" aria-label={label}
      style={{ gap: px(gap), ...style }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} aria-hidden="true" className={`sk ui-sk-${variant}`}
          style={{ width: variant === 'text' && n > 1 && i === n - 1 ? '62%' : px(w), height: px(h) }} />
      ))}
    </div>
  );
}
