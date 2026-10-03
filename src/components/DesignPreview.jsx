import { Component, Suspense, lazy, useMemo, useState } from 'react';
import GarmentSilhouette from '../pages/client/design-studio/GarmentSilhouette';
import { familyFor, STATUS_3D_LABEL } from '../pages/client/design-studio/garmentCatalog';
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
const tab = on => ({ padding: '4px 12px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: on ? 'var(--teal, #028090)' : 'rgba(15,23,42,.07)', color: on ? '#fff' : 'rgba(15,23,42,.65)' });

// The one preview used by Order Wizard, client Order Detail and admin Order Detail.
// Default is always 2D (reference photo, submitted artwork PNG, or the template silhouette). 3D is offered only for a family with a real GLB
// and only when WebGL works; any 3D failure drops back to 2D instead of breaking the page.
export default function DesignPreview({ cfg, previewUrl = null, referenceImageUrl = null, height = 240 }) {
  const [view, setView] = useState('2d');
  const design = useMemo(() => {
    try { const r = cfg?.garment ? deserializeDesign(cfg) : null; return r?.cfg ?? r; } catch { return null; }
  }, [cfg]);
  const garment = design?.garment ?? cfg?.garmentType ?? null;
  const fam = familyFor(garment);
  const can3D = !!(design && fam && fam.status3D !== 'none' && hasWebGL());
  const note = fam && fam.status3D !== 'none' ? STATUS_3D_LABEL[fam.status3D]?.label : null;
  const sleeveGap = can3D && design.sleeve && !fam.sleeves3D.includes(design.sleeve);

  const flat = (
    <div style={box(height)}>
      {referenceImageUrl ? <img src={referenceImageUrl} alt="Reference" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}/>
        : previewUrl ? <img src={previewUrl} alt="Submitted design" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}/>
        : design && fam ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {(hasBackView(design.garment, design.sleeve ?? 'Short', design.fit) ? ['front', 'back'] : ['front']).map(f => <GarmentSilhouette key={f} garment={design.garment} sleeve={design.sleeve ?? 'Short'} fit={design.fit} colors={design.colors} face={f} width={Math.round(height * 0.5)} height={Math.round(height * 0.62)}/>)}
          </div>
        ) : <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>No design preview available</p>}
    </div>
  );

  return (
    <div>
      {can3D && (
        <div role="group" aria-label="Preview type" style={{ display: 'flex', gap: 6, marginBottom: 8, justifyContent: 'flex-end' }}>
          <button type="button" style={tab(view === '2d')} aria-pressed={view === '2d'} onClick={() => setView('2d')}>2D</button>
          <button type="button" style={tab(view === '3d')} aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button>
        </div>
      )}
      {view === '3d' && can3D ? (
        <Boundary resetKey={view} fallback={<>{flat}<p className="ds-note" style={{ marginTop: 6 }}>3D could not load. Showing 2D.</p></>}>
          <div style={{ ...box(height), background: 'var(--bg-surface)' }}>
            <Suspense fallback={<p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Loading 3D…</p>}>
              <div style={{ width: '100%', height: '100%' }}><Scene3D cfg={design}/></div>
            </Suspense>
          </div>
          {(note || sleeveGap) && (
            <p style={{ fontSize: 11, color: '#b45309', margin: '6px 0 0' }}>
              {sleeveGap ? `3D shows ${fam.sleeves3D.join(' / ').toLowerCase()} sleeves. ${design.sleeve.toLowerCase()} is 2D only.` : note}
            </p>
          )}
        </Boundary>
      ) : flat}
    </div>
  );
}
