import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { FIND_UNIFORM } from '../../components/site/content';
import { startStudioIn } from '../../utils/studioIntent';

// The Studio's own template renderer, loaded only with this section so the hero stays light.
const GarmentSilhouette = lazy(() => import('../client/design-studio/GarmentSilhouette'));

// One real garment per category, each listed under that category in garmentCatalog.js.
const LEAD = { 'School Uniform': 'Polo Shirt', 'Medical / Scrubs': 'Scrub Top', Corporate: 'Blazer', 'Hospitality / Service': 'Mandarin Collar', 'Industrial / Work': 'Lab Coverall' };
const COLORS = { body: '#1B2A4A', collar: '#028090', pocket: '#046A78' };

export default function CategoryCards() {
  const nav = useNavigate();
  return (
    <ul className="lp-cards">
      {FIND_UNIFORM.map(([label, cat]) => (
        <li key={cat}>
          <button type="button" className="lp-card" onClick={() => { startStudioIn(cat); nav('/design-studio'); }}>
            <span className="lp-card__art" aria-hidden="true">
              <Suspense fallback={null}><GarmentSilhouette garment={LEAD[cat]} colors={COLORS} width={160} height={190} /></Suspense>
            </span>
            <b>{label}</b>
            <small>{LEAD[cat]}, 2D template</small>
          </button>
        </li>
      ))}
    </ul>
  );
}
