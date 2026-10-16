import { sketchInk } from './sketchLine';

// Vector sketch thumbnail. Zone edges and the template's seams and lines (collar, placket, pocket, hem, cuffs, drawstring) are drawn in
// the sketch-line ink over any fill (sketchLine.js), so the garment's detail still reads when every zone is one colour.
export default function GarmentThumb({ paths, colors, size = 56 }) {
  const body = colors.body ?? '#1e3a5f', collar = colors.collar ?? '#c8a96e', sleeve = colors.sleeve ?? body, pocket = colors.pocket ?? collar;
  const lines = (paths.details ?? []).filter(d => d.kind === 'seam' || d.kind === 'line');
  const line = (over) => lines.filter(d => !!d.over === over).map((d, i) => (
    <path key={`${over}${i}`} d={d.d} fill="none" stroke={sketchInk(body)} strokeWidth={d.kind === 'line' ? 1.4 : 1.2} strokeDasharray={d.kind === 'seam' ? '3 2.5' : undefined}/>
  ));
  return (
    <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width={size} height={Math.round(size * 1.18)} aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.body    && <path d={paths.body}    fill={body}   stroke="rgba(15,23,42,.18)" strokeWidth="1.5"/>}
      {line(false)}
      {paths.collar  && <path d={paths.collar}  fill={collar} stroke={sketchInk(collar)} strokeWidth="1.5"/>}
      {paths.sleeveL && <path d={paths.sleeveL} fill={sleeve} stroke={sketchInk(sleeve)} strokeWidth="1.5"/>}
      {paths.sleeveR && <path d={paths.sleeveR} fill={sleeve} stroke={sketchInk(sleeve)} strokeWidth="1.5"/>}
      {paths.pocket  && <path d={paths.pocket}  fill={pocket} stroke={sketchInk(pocket)} strokeWidth="1.2" strokeDasharray="3 2"/>}
      {line(true)}
    </svg>
  );
}
