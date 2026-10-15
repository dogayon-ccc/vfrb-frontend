import { useEffect, useId, useState } from 'react';
import { detailedPaths, applyDetails } from './garmentDetails';
import { customPaths } from './garmentPaths';
import { isCustom } from './customGarment';
import { assetFor, tintedCanvas } from './garmentAssets';
import { isWoven, wovenParams, wovenTileUrl, tileSize } from './wovenPatterns';

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

// custom: a build-your-own shape (cfg.custom); passed explicitly so a list of saved designs never draws one design with another's shape.
export default function GarmentSilhouette({ garment, sleeve = 'Short', colors = {}, width = 44, height = 52, face = 'front', fit, details, patterns, patternParams, custom = null }) {
  const uid = useId().replace(/:/g, '');
  const asset = assetFor(garment, sleeve, face, fit);
  if (asset) return <PhotoBase asset={asset} colors={colors} width={width} height={height}/>;
  const p = isCustom(garment) ? applyDetails(customPaths(garment, custom, sleeve, face), details) : detailedPaths(garment, sleeve, face, details);

  const zones = [
    { d: p.body,    fill: colors.body,                    z: 'body' },
    { d: p.collar,  fill: colors.collar,                  z: 'collar' },
    { d: p.sleeveL, fill: colors.sleeve ?? colors.body,   z: 'sleeve' },
    { d: p.sleeveR, fill: colors.sleeve ?? colors.body,   z: 'sleeve' },
    { d: p.pocket,  fill: colors.pocket ?? colors.collar, z: 'pocket' },
  ];
  // Woven patterns (wovenPatterns.js) as SVG pattern fills, same tile and transform as the Studio canvas; none during SSR.
  const woven = Object.fromEntries([...new Set(zones.map(z => z.z))].map(z => {
    const id = patterns?.[z], fill = zones.find(x => x.z === z).fill;
    if (!isWoven(id) || !fill) return [z, null];
    const prm = wovenParams(id, patternParams?.[z], fill), url = wovenTileUrl(id, fill, prm.c2, prm.scale);
    if (!url) return [z, null];
    return [z, { pid: `w${uid}${z}`, url, ...tileSize(id, prm.scale), rot: prm.rotation }];
  }));
  const fillOf = (z, fill) => (woven[z] ? `url(#${woven[z].pid})` : fill ?? '#e2e8f0');

  const lines = (p.details ?? []).filter(d => DETAIL[d.kind] && (width >= 80 || d.kind === 'shade'));
  // The customer's button or closure colour (garmentDetails.js) overrides the template ink.
  const detail = (d, i) => <path key={`d${i}`} d={d.d} {...DETAIL[d.kind]} {...(d.style?.fill && { fill: d.style.fill })} {...(d.style?.stroke && { stroke: d.style.stroke, strokeWidth: d.style.strokeWidth })}/>;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${p.w} ${p.h}`} xmlns="http://www.w3.org/2000/svg">
      <defs>{Object.values(woven).filter(Boolean).map(w => (
        <pattern key={w.pid} id={w.pid} patternUnits="userSpaceOnUse" width={w.w} height={w.h} patternTransform={w.rot ? `rotate(${w.rot})` : undefined}>
          <image href={w.url} width={w.w} height={w.h} preserveAspectRatio="none"/>
        </pattern>))}</defs>
      {zones.slice(0, 1).map(({ d, fill, z }, i) => d &&
        <path key={i} d={d} fill={fillOf(z, fill)} stroke="rgba(0,0,0,.14)" strokeWidth={1.5}/>)}
      {lines.filter(d => !d.over).map(detail)}
      {zones.slice(1).map(({ d, fill, z }, i) => d &&
        <path key={i + 1} d={d} fill={fillOf(z, fill)} stroke="rgba(0,0,0,.14)" strokeWidth={1.5}/>)}
      {lines.filter(d => d.over).map(detail)}
      {/* Derived template: the reference model's own lighting multiplied over the fill, as on the Studio canvas. */}
      {p.shade?.[face] && <image href={p.shade[face]} x={0} y={0} width={p.w} height={p.h} preserveAspectRatio="none" style={{ mixBlendMode: 'multiply' }}/>}
    </svg>
  );
}
