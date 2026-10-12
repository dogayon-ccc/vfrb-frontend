// Pockets, buttons and closures of the chosen garment. Only the options its 2D template really draws are listed (garmentDetails.js).
import { useEffect, useState } from 'react';
import { secLabel, zonesFor } from './dsShared';
import { detailsFor } from './garmentDetails';
import { SwatchGrid, CustomColor, colourName } from './SwatchGrid';

export default function DetailsPanel({ cfg, setCfg, focus, onColourPocket }) {
  const options = detailsFor(cfg.garment, cfg.sleeve, cfg.fit);
  const details = cfg.details ?? {};
  const [open, setOpen] = useState(focus ?? null);
  useEffect(() => { if (focus) setOpen(focus); }, [focus]);
  // Writing the template's own value removes the key, so only real changes are saved.
  const set = (id, v) => setCfg(p => { const next = { ...p.details }; if (v) next[id] = v; else delete next[id]; return { ...p, details: next }; });
  const pocketZone = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).includes('pocket');

  if (!options.length) {
    return <p className="ds-panel-prompt">This garment's template draws no pockets, buttons or closures, so there is nothing to change here.</p>;
  }
  return (
    <div className="ds-det">
      <p className="ds-det-note">Shown in the 2D design, exports and the order. The 3D preview does not show them.</p>
      <ul className="ds-det-list">
        {options.map(o => {
          const v = details[o.id];
          if (o.control === 'show') {
            const on = v?.show !== false;
            return (
              <li key={o.id} className="ds-det-row" data-focus={open === o.id || undefined}>
                <span className="ds-det-name">{o.label}
                  {o.id === 'patchPocket' && on && pocketZone && <button type="button" className="ds-link" onClick={onColourPocket}>Colour</button>}
                </span>
                <button type="button" role="switch" aria-checked={on} className="ds-switch" aria-label={`${o.label}: ${on ? 'shown' : 'hidden'}`}
                  onClick={() => set(o.id, on ? { show: false } : null)}><span/></button>
              </li>
            );
          }
          const expanded = open === o.id;
          return (
            <li key={o.id} className="ds-det-row ds-det-row--col" data-focus={expanded || undefined}>
              <button type="button" className="ds-det-head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : o.id)}>
                <span className="ds-det-name">{o.label}</span>
                <span className="ds-det-val">
                  {v?.color && <span className="ds-zone-sw" style={{ background: v.color }} aria-hidden="true"/>}
                  {v?.color ? colourName(v.color) : 'As drawn'}
                </span>
              </button>
              {expanded && (
                <div className="ds-det-body">
                  <p style={secLabel}>Philippine colours</p>
                  <SwatchGrid label={o.label} current={v?.color} onPick={hex => set(o.id, { color: hex.toLowerCase() })}/>
                  <p style={secLabel}>Custom</p>
                  <CustomColor label={o.label} current={v?.color} onPick={hex => set(o.id, { color: hex })}/>
                  {v?.color && <button type="button" className="ds-link" onClick={() => set(o.id, null)}>Back to the template colour</button>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
