import { useEffect, useState } from 'react';
import { getGarmentPaths } from './garmentPaths';
import { assetFor, tintedCanvas } from './garmentAssets';

// Photo-based garments render the real recoloured photo (same compositor as the Studio canvas); everything else keeps the vector template.
// Until the tint resolves, and during SSR, the untinted photo shows instead of a blank box.
function PhotoBase({ asset, colors, width, height }) {
  const [url, setUrl] = useState(null);
  const body = colors.body, collar = colors.collar;
  useEffect(() => {
    let live = true;
    tintedCanvas(asset, { body, collar }).then(c => { if (live) setUrl(c.toDataURL()); }).catch(() => {});
    return () => { live = false; };
  }, [asset, body, collar]);
  return <img src={url ?? asset.src} alt="" width={width} height={height} style={{ objectFit: 'contain', display: 'block' }} draggable={false}/>;
}

// Same look as the Studio canvas details (useGarmentCanvas DETAIL_STYLE); fine seams are dropped at thumbnail size.
const DETAIL = {
  line:   { fill: 'none', stroke: 'rgba(0,0,0,.24)', strokeWidth: 1.2 },
  shade:  { fill: 'rgba(0,0,0,.32)', stroke: 'none' },
  button: { fill: 'rgba(255,255,255,.9)', stroke: 'rgba(0,0,0,.35)', strokeWidth: 0.8 },
};

export default function GarmentSilhouette({ garment, sleeve = 'Short', colors = {}, width = 44, height = 52, face = 'front', fit }) {
  const asset = assetFor(garment, sleeve, face, fit);
  if (asset) return <PhotoBase asset={asset} colors={colors} width={width} height={height}/>;
  const p = getGarmentPaths(garment, sleeve, face);

  const zones = [
    { d: p.body,    fill: colors.body },
    { d: p.collar,  fill: colors.collar },
    { d: p.sleeveL, fill: colors.sleeve ?? colors.body },
    { d: p.sleeveR, fill: colors.sleeve ?? colors.body },
    { d: p.pocket,  fill: colors.pocket ?? colors.collar },
  ];

  const details = (p.details ?? []).filter(d => DETAIL[d.kind] && (width >= 80 || d.kind === 'shade'));
  const detail = (d, i) => <path key={`d${i}`} d={d.d} {...DETAIL[d.kind]}/>;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${p.w} ${p.h}`} xmlns="http://www.w3.org/2000/svg">
      {zones.slice(0, 1).map(({ d, fill }, i) => d &&
        <path key={i} d={d} fill={fill ?? '#e2e8f0'} stroke="rgba(0,0,0,.14)" strokeWidth={1.5}/>)}
      {details.filter(d => !d.over).map(detail)}
      {zones.slice(1).map(({ d, fill }, i) => d &&
        <path key={i + 1} d={d} fill={fill ?? '#e2e8f0'} stroke="rgba(0,0,0,.14)" strokeWidth={1.5}/>)}
      {details.filter(d => d.over).map(detail)}
    </svg>
  );
}
