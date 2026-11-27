// 2D uniform-set preview: both pieces drawn together on one scale (setScale.js), top tucked over the bottom. Read-only; each
// piece is still edited on its own. Colours, patterns and details come from each piece's design; logos and text show here only for panel-art pieces.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { uvBakedAssetFor } from './studioAssets';
import { renderBakedFace } from './panelFlat';
import GarmentSilhouette from './GarmentSilhouette';
import { setLayout2D } from './setScale';

// A UV-baked piece is drawn from its own part colours and panel artwork, never from the single-colour base photo.
function BakedPiece({ asset, c }: any) {
  const [url, setUrl] = useState<string | null>(null);
  const key = JSON.stringify([c.colors, c.details, c.panelArt]);
  useEffect(() => {
    let stale = false;
    renderBakedFace(asset, c.colors, c.details ?? {}, c.panelArt ?? null, 'front', 1200).then(u => { if (!stale) setUrl(u); }).catch(() => { if (!stale) setUrl(''); });
    return () => { stale = true; };
  }, [asset, key]); // eslint-disable-line react-hooks/exhaustive-deps -- key covers colours, details and artwork
  if (url === '') return <p className="ds-set2d-note">This piece could not be drawn. Reload the page to try again.</p>;
  return url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'top' }}/> : null;
}

const draw = (c, b, k) => {
  const baked = uvBakedAssetFor(c.garment, c.sleeve ?? 'Short', c.fit);
  return (
    <div style={{ position: 'absolute', left: b.x * k, top: b.y * k, width: b.w * k, height: b.h * k }}>
      {baked ? <BakedPiece asset={baked} c={c}/> : <GarmentSilhouette garment={c.garment} sleeve={c.sleeve ?? 'Short'} fit={c.fit} colors={c.colors} details={c.details} custom={c.custom}
        patterns={c.patterns} patternParams={c.patternParams} width={Math.round(b.w * k)} height={Math.round(b.h * k)}/>}
    </div>
  );
};

export default function SetView2D({ top, bottom, note = null }: any) {
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
        Both pieces at their real relative length.{L?.approx ? ' A traced piece is shown at a typical length.' : ''} Logos and text may show only on each piece's own view.{note ? ` ${note}` : ''}
      </p>
    </div>
  );
}
