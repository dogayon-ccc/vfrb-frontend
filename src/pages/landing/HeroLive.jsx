// Landing hero 3D layer, lazy so the entry chunk only carries a width check: the full gate, the wait for load + idle,
// the 3D/2D switch and the turntable all live here. The 2D pattern stays in Landing.jsx and is only hidden or shown.
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { hero3DAllowed } from './heroGate';

function NoTurntable({ onError }) { useEffect(() => { onError(); }, [onError]); return null; }
const HeroTurntable = lazy(() => import('./HeroTurntable').catch(() => ({ default: NoTurntable })));

function hasWebGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

// host: the hero section in Landing.jsx; the .lp-visual box's data-view and the pattern's aria-hidden are set here, so the entry keeps no state.
export default function HeroLive({ host }) {
  const [want, setWant] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState('3d');
  // Starts after the page has loaded and gone idle, so the 3D chunk never delays first paint.
  useEffect(() => {
    if (!hero3DAllowed({ width: window.innerWidth, saveData: navigator.connection?.saveData,
      calm: matchMedia('(prefers-reduced-motion: reduce)').matches, webgl: hasWebGL() })) return undefined;
    let idle = 0;
    const start = () => { idle = (window.requestIdleCallback ?? (f => setTimeout(f, 300)))(() => setWant(true), { timeout: 2500 }); };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
    return () => { window.removeEventListener('load', start); (window.cancelIdleCallback ?? clearTimeout)(idle); };
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);
  const live = want && !failed;
  const shown = live && ready && view === '3d' ? '3d' : 'pattern';
  useEffect(() => {
    const box = host.current?.querySelector('.lp-visual'), pattern = box?.querySelector('.pr');
    if (!box) return;
    box.dataset.view = shown;
    if (shown === '3d') pattern?.setAttribute('aria-hidden', 'true'); else pattern?.removeAttribute('aria-hidden');
  }, [shown, host]);
  if (!live) return null;
  return (
    <>
      <Suspense fallback={null}><HeroTurntable visible={shown === '3d'} onReady={onReady} onError={onError} /></Suspense>
      {ready && (
        <div className="lp-switch" role="group" aria-label="Hero view">
          <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D model</button>
          <button type="button" aria-pressed={view === 'pattern'} onClick={() => setView('pattern')}>Cutting pattern</button>
        </div>
      )}
    </>
  );
}
