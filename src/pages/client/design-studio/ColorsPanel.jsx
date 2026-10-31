import { secLabel, zone3D, ONLY_2D_TAG } from './dsShared';
import { paintZone } from './colorRules';
import { SwatchGrid, CustomColor, colourName } from './SwatchGrid';
import { PartButtons, PartStyles, partLabel } from './PartControls';

// One part of the garment: its colours and the style options it really has. Done returns to the whole uniform;
// without Done (a colour-only copy) the part buttons switch parts instead.
export default function ColorsPanel({ cfg, setCfg, activeZone, setActiveZone, onDone = null }) {
  const setColor = (zone, c) => setCfg(p => ({ ...p, colors: paintZone(p.colors, zone, c) }));
  const label = partLabel(cfg, activeZone);
  const cur = cfg.colors[activeZone];
  const only2D = zone3D(cfg.garment, cfg.sleeve, cfg.fit, activeZone) === false;

  return (
    <div className="ds-colors">
      {cfg.garment && (
        <div className="ds-part-head">
          <div className="ds-zone-now">
            <span className="ds-zone-dot" style={{ background: cur ?? 'var(--cx-paper-2)' }}/>
            <span><b>{label}</b>: {colourName(cur)}</span>
            {only2D && <span title="The 3D model has no separate region for this part" style={ONLY_2D_TAG}>2D only</span>}
            <code>{(cur ?? '').toUpperCase()}</code>
          </div>
          {onDone && <button type="button" className="ds-btn ds-part-done" onClick={onDone}>Done</button>}
        </div>
      )}
      {!onDone && <PartButtons cfg={cfg} active={activeZone} onPick={setActiveZone}/>}

      <PartStyles cfg={cfg} setCfg={setCfg} zone={activeZone}/>

      {activeZone === 'tipping' && cfg.colors.tipping === null ? (
        <button type="button" className="ds-btn ds-part-done" onClick={() => setColor('tipping', '#ffffff')}>+ Add tipping (contrast collar edge)</button>
      ) : (
        <>
          <p style={secLabel}>Philippine colours</p>
          <SwatchGrid label={label} current={cur} onPick={hex => setColor(activeZone, hex)}/>
          <p style={secLabel}>Custom</p>
          <CustomColor label={label} current={cur} onPick={hex => setColor(activeZone, hex)}/>
          {activeZone === 'tipping' && <button type="button" className="ds-link" onClick={() => setColor('tipping', null)}>Turn off tipping</button>}
        </>
      )}
    </div>
  );
}
