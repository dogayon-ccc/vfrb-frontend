import { useEffect } from 'react';
import { OPENING_MS } from './studioView';

const sized = (paths, content) => (
  <svg className="ds-table-svg" viewBox={`0 0 ${paths.w} ${paths.h}`} aria-hidden="true">{content}</svg>
);

// The dashed cut line around the garment. Sits under the Fabric canvas, so it never reaches saves, exports or thumbnails.
export function CutLine({ paths }) {
  const outer = paths.w * 0.027;
  const shapes = [paths.body, paths.sleeveL, paths.sleeveR].filter(Boolean);
  return sized(paths, <>
    {shapes.map(d => <path key={d} className="ds-cut" d={d} style={{ strokeWidth: outer, strokeDasharray: `${outer * .6} ${outer * .42}` }}/>)}
    {shapes.map(d => <path key={`m${d}`} className="ds-cut-mask" d={d} style={{ strokeWidth: outer * .86 }}/>)}
  </>);
}

// Cut pieces slide together over the live canvas: never takes a click, and any click or key ends it at once.
export default function StageOpening({ paths, colors, onEnd }) {
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
