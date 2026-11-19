import { BACKDROPS, useScene, setScene, LIGHTING_IDS } from './sceneStore';
import { LIGHT_PRESETS } from './lightRig';

const CALM = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The 3D preview's scene controls. State lives in sceneStore, shared with the stage bar, so both always agree.
export default function ScenePanel() {
  const s = useScene();
  const off = !s.has3D;
  return (
    <div className="ds-scene">
      {off && <p className="ds-note ds-scene-note" role="status">Scene settings apply to the 3D preview. Switch to 3D, or pick a garment that has a 3D model.</p>}
      <section className="ds-scene-sec" aria-labelledby="sc-bd">
        <h3 id="sc-bd">Backdrop</h3>
        <div className="ds-scene-grid" role="radiogroup" aria-labelledby="sc-bd">
          {BACKDROPS.map((b, i) => (
            <button key={b.label} type="button" role="radio" aria-checked={s.backdrop === i} disabled={off} onClick={() => setScene({ backdrop: i })}>
              <i className="ds-scene-sw" data-stage={b.bg ? undefined : ''} style={b.bg ? { background: b.bg } : undefined} aria-hidden="true"/>{b.label}
            </button>
          ))}
        </div>
        <p className="ds-scene-help">Display only. The design, exports and the PNG capture are not affected.</p>
      </section>
      <section className="ds-scene-sec" aria-labelledby="sc-li">
        <h3 id="sc-li">Lighting</h3>
        <div className="ds-scene-grid ds-scene-grid--2" role="radiogroup" aria-labelledby="sc-li">
          {LIGHTING_IDS.map(id => (
            <button key={id} type="button" role="radio" aria-checked={s.lighting === id} disabled={off || !s.canExplode} onClick={() => setScene({ lighting: id })}>
              {LIGHT_PRESETS[id].label}
            </button>
          ))}
        </div>
        <p className="ds-scene-help">{s.canExplode || off ? 'Colours stay calibrated in both.' : 'This garment\u2019s 3D uses the Studio light only.'}</p>
      </section>
      <section className="ds-scene-sec" aria-labelledby="sc-tt">
        <h3 id="sc-tt">Turntable</h3>
        <button type="button" className="ds-scene-toggle" role="switch" aria-checked={s.spin} disabled={off || CALM} onClick={() => setScene({ spin: !s.spin })}>
          <span>{s.spin ? 'Turning' : 'Off'}</span><i aria-hidden="true"/>
        </button>
        <p className="ds-scene-help">{CALM ? 'Off while your device asks for reduced motion. Drag to rotate.' : 'Turns the garment slowly. Dragging it takes over.'}</p>
      </section>
      <section className="ds-scene-sec" aria-labelledby="sc-ex">
        <h3 id="sc-ex">Explode</h3>
        <button type="button" className="ds-scene-toggle" role="switch" aria-checked={s.explode} disabled={off || !s.canExplode} onClick={() => setScene({ explode: !s.explode })}>
          <span>{s.explode ? 'Parts apart' : 'Assembled'}</span><i aria-hidden="true"/>
        </button>
        <p className="ds-scene-help">{s.canExplode ? 'Pulls the collar, sleeves and pockets apart.' : 'Not available: this garment\u2019s 3D model has no separate parts to pull apart.'}</p>
      </section>
    </div>
  );
}
