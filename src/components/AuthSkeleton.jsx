// Placeholder in the AuthShell layout, shown while the login screen gets ready.
import { useEffect, useState } from 'react';
import art from '../assets/brand/sewing-2.jpg';
import '../styles/auth.css';

const MIN_MS = 200;

export function useAuthReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    const loaded = new Promise(r => { img.onload = img.onerror = r; img.src = art; });
    const timer = new Promise(r => setTimeout(r, MIN_MS));
    Promise.all([loaded, timer]).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  return ready;
}

export default function AuthSkeleton() {
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
