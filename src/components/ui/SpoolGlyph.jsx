// src/components/ui/SpoolGlyph.jsx — thread-spool icon; decorative unless `title` is given.
export default function SpoolGlyph({ size = 24, thread = 'var(--color-teal-fill)', title, style, ...rest }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, ...style }}
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...rest}
    >
      {title && <title>{title}</title>}
      <rect x="5" y="3" width="14" height="3" rx="1" fill="var(--color-kraft)" />
      <rect x="5" y="18" width="14" height="3" rx="1" fill="var(--color-kraft)" />
      <rect x="7" y="6" width="10" height="12" fill={thread} />
      <path d="M7 9h10M7 12h10M7 15h10" stroke="rgb(0 0 0 / .18)" strokeWidth="1" />
    </svg>
  );
}
