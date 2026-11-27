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

// Suspense fallback: blank for 120 ms, then the VFRB mark in HUD brackets with a looping mint scan bar. Styles: rog-app.css (.pl-*).
export default function PageLoader({ label = 'Loading page', full = false }: any) {
  const show = useAfter(120);
  return (
    <div className={`pl${full ? ' pl--full' : ''}`} data-on={show || undefined} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {show && (
        <div className="pl-box" aria-hidden="true">
          <img src={logo} alt="" className="pl-mark"/>
          <span className="pl-bar"><i/></span>
        </div>
      )}
    </div>
  );
}
