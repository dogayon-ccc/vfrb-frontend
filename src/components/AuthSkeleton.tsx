// Placeholder in the AuthShell layout, shown while the login screen gets ready.
import { useEffect, useState } from 'react';
import art from '../assets/brand/sewing-2.webp';
import '../styles/auth.css';

let artLoaded = false;

// Ready as soon as the panel photo has loaded; a cached photo is ready on first render.
export function useAuthReady() {
  const [ready, setReady] = useState(artLoaded);
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const img = new Image();
    img.onload = img.onerror = () => { artLoaded = true; if (alive) setReady(true); };
    img.src = art;
    return () => { alive = false; };
  }, [ready]);
  return ready;
}

// Login card rows as [marginTop, rowHeight, barWidth, barHeight, align], measured from the real card.
// A string rowHeight is a class whose height changes where the real text wraps (auth.css).
const GOOGLE_ROWS = import.meta.env.VITE_GOOGLE_LOGIN !== 'false' ? [[24, 20, '100%', 1], [24, 54, '100%', 54]] : [];
const SPLIT_ROWS = [
  [0, 'skr-title', '45%', 30], [8, 'skr-sub', '85%', 14],
  [24, 22, 110, 12], [6, 55, '100%', 55], [15, 22, 80, 12], [6, 55, '100%', 55],
  [2, 44, 116, 14, 'flex-end'], [16, 56, '100%', 56],
  ...GOOGLE_ROWS,
  [28, 44, '55%', 14, 'center'], [20, 'skr-contact', '80%', 14, 'center'], [12, 44, '30%', 14, 'center'],
];

// Same shape as AuthShell variant="split" (Login).
function SplitSkeleton() {
  return (
    <div className="au au--split au-skel" role="status" aria-busy="true" aria-label="Loading sign in">
      <aside className="au-art au-art--navy">
        <span className="au-brand">
          <i className="sk sk-dark" style={{ width: 44, height: 44, borderRadius: '50%' }} />
          <i className="sk sk-dark" style={{ width: 150, height: 18 }} />
        </span>
        <div className="au-flats" />
        <div className="au-art-in">
          <div className="skr-h"><i className="sk sk-dark" style={{ width: '80%' }} /><i className="sk sk-dark" style={{ width: '50%' }} /></div>
          <div className="skr-line"><i className="sk sk-dark" style={{ width: '90%' }} /><i className="sk sk-dark" style={{ width: '40%' }} /></div>
        </div>
      </aside>
      <main className="au-main">
        <div className="au-card" style={{ maxWidth: 440 }}>
          {SPLIT_ROWS.map(([mt, h, w, bh, al], n) => (
            <div key={n} className={typeof h === 'string' ? h : undefined}
              style={{ marginTop: mt, height: typeof h === 'number' ? h : undefined, display: 'flex', alignItems: 'center', justifyContent: al || 'flex-start' }}>
              <i className="sk" style={{ width: w, height: bh, borderRadius: bh > 40 ? 12 : 8 }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function AuthSkeleton({ variant }: any) {
  if (variant === 'split') return <SplitSkeleton />;
  return (
    <div className="au au-skel" role="status" aria-busy="true" aria-label="Loading sign in">
      <aside className="au-art">
        <div className="au-art-in">
          <i className="sk sk-dark" style={{ height: 44, width: '70%' }} />
          <i className="sk sk-dark" style={{ height: 44, width: '45%' }} />
          <div className="au-steps">
            {[0, 1, 2].map(n => <i key={n} className="sk sk-dark" style={{ height: 18, width: `${80 - n * 10}%`, margin: '18px 0' }} />)}
          </div>
        </div>
      </aside>
      <main className="au-main">
        <div className="au-card" style={{ maxWidth: 400 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 26 }}>
            <i className="sk" style={{ width: 56, height: 56, borderRadius: '50%' }} />
            <i className="sk" style={{ height: 32, width: '60%' }} />
            <i className="sk" style={{ height: 14, width: '75%' }} />
          </div>
          {[0, 1].map(n => (
            <div key={n} style={{ marginBottom: 18 }}>
              <i className="sk" style={{ height: 12, width: 90, marginBottom: 8 }} />
              <i className="sk" style={{ height: 48, borderRadius: 12 }} />
            </div>
          ))}
          <i className="sk" style={{ height: 50, borderRadius: 12, marginTop: 8 }} />
          <i className="sk" style={{ height: 14, width: '50%', margin: '20px auto 0' }} />
        </div>
      </main>
    </div>
  );
}
