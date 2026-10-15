// Small outline of a pocket preset for the Add pocket buttons, drawn from the same geometry as the canvas layer.
import { pocketGeometry } from './pocketTools';

export default function PocketIcon({ kind, size = 22 }) {
  const g = pocketGeometry(kind), pad = 3;
  return (
    <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${g.w + 2 * pad} ${g.h + 2 * pad}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      {g.panels.map((d, i) => <path key={`p${i}`} d={d} fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}
      {g.stitches.map((d, i) => <path key={`s${i}`} d={d} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke"/>)}
      {g.lines.map((d, i) => <path key={`l${i}`} d={d} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>)}
    </svg>
  );
}
