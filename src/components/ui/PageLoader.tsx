import { useEffect, useState } from 'react';
import logo from '../../assets/company-logo.jpg';

// True once `ms` has passed since mount; fallbacks use it so fast loads show nothing.
export function useAfter(ms = 150) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return on;
}

// Suspense fallback: stays blank for 150 ms, then plays one 0.7 s pulse + stitch fill. Styles: admin.css (.pl-*).
export default function PageLoader({ label = 'Loading page' }: any) {
  const show = useAfter(150);
  return (
    <div className="pl" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {show && (
        <div className="pl-box" aria-hidden="true">
          <img src={logo} alt="" className="pl-mark"/>
          <span className="pl-stitch"/>
        </div>
      )}
    </div>
  );
}
