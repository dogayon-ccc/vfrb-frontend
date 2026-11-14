// ThreeUI "Woven Cloth" shader as the hero backdrop, tinted VFRB teal. Lazy: the package is only fetched when the gate passes.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const WovenCloth = lazy(() =>
  import('@designcodeio/threeui/components/WovenCloth')
    .then(m => ({ default: m.WovenCloth }))
    .catch(() => ({ default: () => null })),
);

const MIN_WIDTH = 960;

export default function WovenBackdrop() {
  const reduce = useReducedMotion() ?? false;
  const [wide, setWide] = useState(() => window.innerWidth >= MIN_WIDTH);
  useEffect(() => {
    const mq = matchMedia(`(min-width:${MIN_WIDTH}px)`);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (!wide || reduce || saveData) return null;
  return (
    <div className="lp-woven" aria-hidden="true">
      <Suspense fallback={null}>
        <WovenCloth variant="atelier" hue={-35} saturation={0.9} brightness={0.8} className="lp-woven__frame" />
      </Suspense>
    </div>
  );
}
