import { useEffect, useState } from 'react';
import logo from '../../assets/company-logo.jpg';

// Suspense fallback: stays blank for 150 ms, then plays one 0.7 s pulse + stitch fill. Styles: admin.css (.pl-*).
export default function PageLoader({ label = 'Loading page' }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, []);
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
