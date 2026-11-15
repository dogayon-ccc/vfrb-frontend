import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FIND_UNIFORM } from '../site/content';
import { startStudioIn } from '../../utils/studioIntent';
import { haptic } from '../../utils/haptics';

const GarmentSilhouette = lazy(() => import('../../pages/client/design-studio/GarmentSilhouette'));
// One garment that has a real 2D template in the catalog for each category.
const LEAD: Record<string, string> = { 'School Uniform': 'Polo Shirt', 'Medical / Scrubs': 'Scrub Top', Corporate: 'Blazer', 'Hospitality / Service': 'Mandarin Collar', 'Industrial / Work': 'Lab Coverall' };
const COLORS = { body: '#1B2A4A', collar: '#02C39A', pocket: '#24365C' };

// Canva-style start row: pick a category and the Studio opens filtered to it.
export default function QuickCreate() {
  const nav = useNavigate();
  return (
    <section className="qc" aria-labelledby="qc-h">
      <div className="cx-sec-h"><h2 id="qc-h">Start a design</h2></div>
      <ul className="qc-row">
        {FIND_UNIFORM.map(([label, cat]) => (
          <li key={cat}>
            <button type="button" className="qc-tile" onClick={() => { haptic('snap'); startStudioIn(cat); nav('/design-studio'); }}
              aria-label={`Design a ${label.toLowerCase()} uniform`}>
              <span className="qc-art" aria-hidden="true">
                <Suspense fallback={null}><GarmentSilhouette garment={LEAD[cat]} colors={COLORS} width={120} height={146} /></Suspense>
              </span>
              <strong>{label}</strong>
              <small>{LEAD[cat]}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
