import { memo } from 'react';
import { shapePoints, SHAPE_PATHS } from './overlayTools';
import type { OfferedLayout, Placed } from './layoutLibrary';

// [path width, path height, centre x, centre y] of the 24-unit icon paths, so they stretch to the same box the canvas gives them.
const PATH_BOX: Record<string, [number, number, number, number]> = { heart: [18, 17.5, 12, 12.25], badge: [16, 20, 12, 12], bubble: [20, 17, 12, 12.5], ribbon: [22, 12, 12, 12] };
const EDGE = 'rgba(0,0,0,.25)';

function Item({ it }: { it: Placed }) {
  const w = it.width, h = it.drawH, common = { fill: it.color, stroke: EDGE, strokeWidth: 0.6, vectorEffect: 'non-scaling-stroke' as const };
  let body;
  if (it.kind === 'text') body = <text textAnchor="middle" dominantBaseline="central" fontSize={it.size} fontFamily={`'${it.font}', sans-serif`} fontWeight={700} fill={it.color}>{it.text}</text>;
  else if (it.shape === 'line') body = <line x1={-w / 2} x2={w / 2} stroke={it.color} strokeWidth={4} strokeLinecap="round" />;
  else if (it.shape === 'circle') body = <ellipse rx={w / 2} ry={w / 2} {...common} />;
  else if (it.shape === 'ellipse') body = <ellipse rx={w / 2} ry={h / 2} {...common} />;
  else if (it.shape === 'triangle') body = <polygon points={`0,${-h / 2} ${w / 2},${h / 2} ${-w / 2},${h / 2}`} {...common} />;
  else if (it.shape === 'rect' || it.shape === 'roundrect') body = <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={it.shape === 'roundrect' ? 6 : 0} {...common} />;
  else if (it.shape && PATH_BOX[it.shape] && SHAPE_PATHS[it.shape]) { const [bw, bh, cx, cy] = PATH_BOX[it.shape]; body = <path d={SHAPE_PATHS[it.shape]} transform={`scale(${w / bw} ${h / bh}) translate(${-cx} ${-cy})`} {...common} />; }
  else if (it.shape) body = <polygon points={shapePoints(it.shape).map(p => `${(p.x - 0.5) * w},${(p.y - 0.5) * h}`).join(' ')} {...common} />;
  return <g transform={`translate(${it.x} ${it.y}) rotate(${it.angle ?? 0})`}>{body}</g>;
}

// The layout exactly as it will land on this garment piece: the same fitted geometry the placement uses, over the piece outline.
function LayoutPreview({ layout }: { layout: OfferedLayout }) {
  const { vb, poly, items } = layout.view;
  return (
    <svg className="ds-lay-prev" viewBox={vb.join(' ')} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${layout.name} preview`}>
      <polygon points={poly} fill="#ECE8E0" stroke="#9A958A" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {items.map((it, i) => <Item key={i} it={it} />)}
    </svg>
  );
}
export default memo(LayoutPreview);
