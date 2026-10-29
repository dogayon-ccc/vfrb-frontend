import { customPaths, sizable } from './garmentPaths';
import GarmentThumb from './GarmentThumb';
import { STD_SIZES } from '../../../utils/orderQuantity';

// The design's garment drawn at each ordered size, on one scale (size-chart proportions, never a measurement).
export default function SizeProportions({ studio, sizes }) {
  const picked = STD_SIZES.filter(s => sizes?.[s] > 0);
  if (!studio?.garment || !sizable(studio.garment) || picked.length < 1) return null;
  const drawn = picked.map(size => ({ size, p: customPaths(studio.garment, studio.custom, studio.sleeve ?? 'Short', 'front', { size, fit: studio.fit }) }));
  const box = { w: Math.max(...drawn.map(d => d.p.w)), h: Math.max(...drawn.map(d => d.p.h)) };
  return (
    <figure className="wiz-size-prop">
      <div className="wiz-size-prop-row">
        {drawn.map(({ size, p }) => (
          <div key={size} className="wiz-size-prop-item">
            <GarmentThumb paths={p} colors={studio.colors ?? {}} size={56} box={box}/>
            <span>{size}</span>
          </div>
        ))}
      </div>
      <figcaption>Your design at each size you ordered, to scale. VFRB cuts every piece to the size chart.</figcaption>
    </figure>
  );
}
