import { useEffect } from 'react';
import { OPENING_MS } from './studioView';

const sized = (paths, content) => (
  <svg className="ds-table-svg" viewBox={`0 0 ${paths.w} ${paths.h}`} aria-hidden="true">{content}</svg>
);

// The dashed cut line around the garment. Sits under the Fabric canvas, so it never reaches saves, exports or thumbnails.
export function CutLine({ paths }: any) {
  const outer = paths.w * 0.027;
  const shapes = [paths.body, paths.sleeveL, paths.sleeveR].filter(Boolean);
  return sized(paths, <>
    <mask id="ds-cut-mask" maskUnits="userSpaceOnUse" x={-paths.w} y={-paths.h} width={paths.w * 3} height={paths.h * 3}>
      <rect x={-paths.w} y={-paths.h} width={paths.w * 3} height={paths.h * 3} fill="#fff"/>
      {shapes.map(d => <path key={d} className="ds-cut-hole" d={d} style={{ strokeWidth: outer * .86 }}/>)}
    </mask>
    <g mask="url(#ds-cut-mask)">
      {shapes.map(d => <path key={d} className="ds-cut" d={d} style={{ strokeWidth: outer, strokeDasharray: `${outer * .6} ${outer * .42}` }}/>)}
    </g>
  </>);
}

// Cut pieces slide together over the live canvas: never takes a click, and any click or key ends it at once.
export default function StageOpening({ paths, colors, onEnd }: any) {
  useEffect(() => {
    const opts = { capture: true };
    window.addEventListener('pointerdown', onEnd, opts);
    window.addEventListener('keydown', onEnd, opts);
    const t = setTimeout(onEnd, OPENING_MS);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', onEnd, opts);
      window.removeEventListener('keydown', onEnd, opts);
    };
  }, [onEnd]);
  const pieces = [['sl', paths.sleeveL, colors?.sleeve], ['sr', paths.sleeveR, colors?.sleeve], ['bd', paths.body, colors?.body],
    ['pk', paths.pocket, colors?.pocket], ['cl', paths.collar, colors?.collar]];
  return sized(paths, pieces.filter(p => p[1]).map(([k, d, fill]) => <path key={k} className={`ds-open ds-open-${k}`} d={d} style={{ fill: fill ?? 'none' }}/>));
}
