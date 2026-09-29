export default function GarmentThumb({ paths, colors, size = 56 }) {
  return (
    <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width={size} height={Math.round(size * 1.18)} aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.body    && <path d={paths.body}    fill={colors.body   ?? '#1e3a5f'} stroke="rgba(15,23,42,.18)" strokeWidth="1.5"/>}
      {paths.collar  && <path d={paths.collar}  fill={colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
      {paths.sleeveL && <path d={paths.sleeveL} fill={colors.sleeve ?? colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
      {paths.sleeveR && <path d={paths.sleeveR} fill={colors.sleeve ?? colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
      {paths.pocket  && <path d={paths.pocket}  fill={colors.pocket ?? colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.12)" strokeWidth="0.5"/>}
    </svg>
  );
}
