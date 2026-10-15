// 2D uniform-set preview: both pieces drawn together on one scale (setScale.js), top tucked over the bottom. Read-only; each
// piece is still edited on its own. Colours, patterns and details come from each piece's design; logos and text stay on its own view.
import { useLayoutEffect, useRef, useState } from 'react';
import GarmentSilhouette from './GarmentSilhouette';
import { setLayout2D } from './setScale';

const draw = (c, b, k) => (
  <div style={{ position: 'absolute', left: b.x * k, top: b.y * k, width: b.w * k, height: b.h * k }}>
    <GarmentSilhouette garment={c.garment} sleeve={c.sleeve ?? 'Short'} fit={c.fit} colors={c.colors} details={c.details} custom={c.custom}
      patterns={c.patterns} patternParams={c.patternParams} width={Math.round(b.w * k)} height={Math.round(b.h * k)}/>
  </div>
);

export default function SetView2D({ top, bottom, note = null }) {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const L = setLayout2D(top, bottom);
  const H = L ? L.extent.y1 - L.extent.y0 : 0;
  const k = L && size ? Math.min(size.h / H, size.w / L.extent.w) : 0; // screen px per cm, the same for both pieces
  return (
    <div className="ds-set2d" role="img" aria-label={`Uniform set preview: ${top.garment} with ${bottom.garment}`}>
      <div ref={ref} className="ds-set2d-fit">
        {k > 0 && (
          <div style={{ position: 'relative', width: L.extent.w * k, height: H * k }}>
            <div style={{ position: 'absolute', left: 0, top: -L.extent.y0 * k }}>{draw(bottom, L.bottom, k)}{draw(top, L.top, k)}</div>
          </div>
        )}
      </div>
      <p className="ds-set2d-note">
        Both pieces at their real relative length.{L?.approx ? ' A traced piece is shown at a typical length.' : ''} Logos and text show on each piece's own view.{note ? ` ${note}` : ''}
      </p>
    </div>
  );
}
