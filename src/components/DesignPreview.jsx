import { Component, Suspense, lazy, useMemo, useRef, useState } from 'react';
import GarmentSilhouette from '../pages/client/design-studio/GarmentSilhouette';
import { familyFor, STATUS_3D_LABEL } from '../pages/client/design-studio/garmentCatalog';
import { has3DModel, has3DFor } from '../pages/client/design-studio/garmentCapabilities';
import { deserializeDesign } from '../pages/client/design-studio/designSerialization';
import { hasBackView } from '../pages/client/design-studio/garmentAssets';
import { hasWebGL } from '../pages/client/design-studio/webglSupport';

const Scene3D = lazy(() => import('../pages/client/DesignStudio3D'));

class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: false }); }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

const box = h => ({ height: h, background: 'var(--bg-surface)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' });
const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const tab = on => ({ minHeight: 44, padding: '0 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: on ? 'var(--teal, #028090)' : 'var(--bg-surface-2, rgba(15,23,42,.07))', color: on ? '#fff' : 'var(--text-muted, rgba(15,23,42,.65))' });

// The one preview used by Order Wizard, client Order Detail and admin Order Detail.
// Default is always 2D (reference photo, submitted artwork PNG, or the template silhouette). 3D is offered only for a family with a real GLB
// and only when WebGL works; any 3D failure (load error or a lost context) drops back to 2D instead of breaking the page.
// onSnapshot(pngDataUrl): when given, the 3D view offers "Save 3D snapshot"; `snapshot` is the one already taken.
export default function DesignPreview({ cfg, previewUrl = null, referenceImageUrl = null, height = 240, onSnapshot = null, snapshot = null }) {
  const [view, setView] = useState('2d');
  const [lost, setLost] = useState(false);
  const [spin, setSpin] = useState(() => !calm());
  const capture = useRef(null);
  const parsed = useMemo(() => {
    try { return cfg?.garment ? deserializeDesign(cfg) : null; } catch { return null; }
  }, [cfg]);
  const design = parsed?.cfg ?? null;
  // Logos and text ride to 3D as decals, front and back, the same shape the Studio passes.
  const overlays = useMemo(() => (parsed ? { front: parsed.frontOverlays, back: parsed.backOverlays } : null), [parsed]);
  const garment = design?.garment ?? cfg?.garmentType ?? null;
  const fam = familyFor(garment);
  const can3D = !!(design && fam && has3DFor(design) && hasWebGL()) && !lost;
  // Opened from a photo whose family model is a different garment (NO_FAMILY_3D): the model exists but is withheld.
  const withheld = !!(design && fam && !can3D && has3DModel(design.garment, design.sleeve, design.fit));
  const approx = fam?.status3D === 'partial';
  const note = approx ? 'Approximate 3D: colors and fit may differ from your 2D design. The 2D design is what VFRB produces from.' : null;
  // A selection without its own model (e.g. a long-sleeve design of a short-sleeve-only scan) stays 2D: no substitute model is shown.
  const no3DNote = design && fam && fam.status3D !== 'none' && !can3D && hasWebGL() ? (withheld ? `No 3D model matches this design's garment. Showing 2D.` : `No 3D model for ${design.garment}${design.sleeve ? ` · ${design.sleeve.toLowerCase()} sleeve` : ''}. Showing 2D.`) : null;

  const flat = (
    <div style={box(height)}>
      {referenceImageUrl ? <img src={referenceImageUrl} alt="Reference" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}/>
        : previewUrl ? <img src={previewUrl} alt="Submitted design" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}/>
        : design && fam ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {(hasBackView(design.garment, design.sleeve ?? 'Short', design.fit) ? ['front', 'back'] : ['front']).map(f => <GarmentSilhouette key={f} garment={design.garment} sleeve={design.sleeve ?? 'Short'} fit={design.fit} colors={design.colors} details={design.details} custom={design.custom} patterns={design.patterns} patternParams={design.patternParams} face={f} width={Math.round(height * 0.5)} height={Math.round(height * 0.62)}/>)}
          </div>
        ) : <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>No design preview available</p>}
    </div>
  );

  return (
    <div>
      {can3D && (
        <div role="group" aria-label="Preview type" style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'flex-end' }}>
          <button type="button" style={tab(view === '2d')} aria-pressed={view === '2d'} onClick={() => setView('2d')}>2D</button>
          <button type="button" style={tab(view === '3d')} aria-pressed={view === '3d'} onClick={() => setView('3d')}>{approx ? '3D (approx.)' : '3D'}</button>
        </div>
      )}
      {lost && <p className="ds-note" style={{ marginTop: 0 }}>3D stopped (graphics context lost). Showing 2D.</p>}
      {view === '3d' && can3D ? (
        <Boundary resetKey={view} fallback={<>{flat}<p className="ds-note" style={{ marginTop: 6 }}>3D could not load. Showing 2D.</p></>}>
          <div style={{ ...box(height), background: 'var(--bg-surface)' }}>
            <Suspense fallback={<p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Loading 3D…</p>}>
              <div style={{ width: '100%', height: '100%' }}><Scene3D cfg={design} overlays={overlays} turntable={spin} captureRef={capture} onContextLost={() => setLost(true)}/></div>
            </Suspense>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <button type="button" style={tab(spin)} aria-pressed={spin} onClick={() => setSpin(x => !x)}>{spin ? 'Stop turntable' : 'Turntable'}</button>
            {onSnapshot && (
              <button type="button" style={tab(false)} onClick={() => { const png = capture.current?.(); if (png?.startsWith('data:image/png')) onSnapshot(png); }}>
                {snapshot ? 'Retake 3D snapshot' : 'Save 3D snapshot'}
              </button>
            )}
            {snapshot && <img src={snapshot} alt="Saved 3D snapshot" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8, background: 'var(--bg-surface-2, rgba(15,23,42,.07))' }}/>}
          </div>
          {note && <p style={{ fontSize: 11, color: '#b45309', margin: '6px 0 0' }}>{note}</p>}
        </Boundary>
      ) : <>{flat}{no3DNote && <p className="ds-note" style={{ marginTop: 6 }}>{no3DNote}</p>}</>}
      {snapshot && !onSnapshot && (
        <a href={snapshot} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--teal, #028090)' }}>
          <img src={snapshot} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: 'var(--bg-surface)' }}/>3D snapshot (approx.)
        </a>
      )}
    </div>
  );
}
