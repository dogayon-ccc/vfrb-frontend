import { secLabel, ZONE_LABEL, zonesFor, zone3D, ONLY_2D_TAG } from './dsShared';
import { assetFor } from './garmentAssets';
import { withBody } from './colorRules';
import { SwatchGrid, CustomColor, colourName } from './SwatchGrid';

// Colours of the one zone tapped on the garment: named swatch dots, then a custom swatch with a hex field.
// The zone list stays behind "Other zones" for keyboard and screen-reader users.
export default function ColorsPanel({ cfg, setCfg, activeZone, setActiveZone }) {
  // The base colour carries every zone still following it (colorRules.js); other zones change alone.
  const setColor = (zone, c) => setCfg(p => ({ ...p, colors: zone === 'body' ? withBody(p.colors, c) : { ...p.colors, [zone]: c } }));
  // On a photo base with a trim mask the 'collar' zone recolours the whole trim (band, cuffs, welts), so it is called Trim.
  const photo = cfg.garment ? assetFor(cfg.garment, cfg.sleeve, 'front', cfg.fit) : null;
  const label = z => (photo?.trim && z === 'collar' ? 'Trim' : ZONE_LABEL[z] ?? z);
  const cur = cfg.colors[activeZone];
  const only2D = zone3D(cfg.garment, cfg.sleeve, cfg.fit, activeZone) === false;

  return (
    <div className="ds-colors">
      {cfg.garment && (
        <div className="ds-zone-now">
          <span className="ds-zone-dot" style={{ background: cur ?? 'var(--cx-paper-2)' }}/>
          <span>Editing <b>{label(activeZone)}</b>: {colourName(cur)}</span>
          {only2D && <span title="The 3D model has no separate region for this zone" style={ONLY_2D_TAG}>2D only</span>}
          <code>{(cur ?? '').toUpperCase()}</code>
        </div>
      )}
      <details className="ds-zone-more">
        <summary>Other zones</summary>
        <div className="ds-zones" role="group" aria-label="Colour zone">
          {zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => z !== 'pocket' || cfg.details?.patchPocket?.show !== false).map(z => (
            <button key={z} type="button" className="ds-zone" aria-pressed={activeZone === z} onClick={() => setActiveZone(z)}>
              <span className="ds-zone-sw" style={{ background: cfg.colors[z] ?? 'var(--cx-paper-2)' }} aria-hidden="true"/>
              {label(z)}
            </button>
          ))}
        </div>
      </details>

      {activeZone === 'tipping' && cfg.colors.tipping === null ? (
        <button type="button" className="ds-btn" onClick={() => setColor('tipping', '#ffffff')}>+ Add tipping (contrast collar edge)</button>
      ) : (
        <>
          <p style={secLabel}>Philippine colours</p>
          <SwatchGrid label={label(activeZone)} current={cur} onPick={hex => setColor(activeZone, hex)}/>
          <p style={secLabel}>Custom</p>
          <CustomColor label={label(activeZone)} current={cur} onPick={hex => setColor(activeZone, hex)}/>
          {activeZone === 'tipping' && <button type="button" className="ds-link" onClick={() => setColor('tipping', null)}>Turn off tipping</button>}
        </>
      )}
    </div>
  );
}
