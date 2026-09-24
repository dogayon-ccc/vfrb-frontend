import { getGarmentPaths } from './garmentPaths';

export default function GarmentSilhouette({ garment, sleeve = 'Short', colors = {}, width = 44, height = 52 }) {
  const p = getGarmentPaths(garment, sleeve, 'front');

  const zones = [
    { d: p.body,    fill: colors.body },
    { d: p.collar,  fill: colors.collar },
    { d: p.sleeveL, fill: colors.sleeve ?? colors.body },
    { d: p.sleeveR, fill: colors.sleeve ?? colors.body },
    { d: p.pocket,  fill: colors.pocket ?? colors.collar },
  ];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${p.w} ${p.h}`} xmlns="http://www.w3.org/2000/svg">
      {zones.map(({ d, fill }, i) => d &&
        <path key={i} d={d} fill={fill ?? '#e2e8f0'} stroke="rgba(0,0,0,.14)" strokeWidth={1.5}/>)}
    </svg>
  );
}
