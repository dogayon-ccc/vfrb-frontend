// Pockets, buttons and closures of the chosen garment. Only the options its 2D template really draws are listed (garmentDetails.js).
import { useEffect, useState } from 'react';
import { secLabel, zonesFor } from './dsShared';
import { detailsFor } from './garmentDetails';
import { SwatchGrid, CustomColor, colourName } from './SwatchGrid';
import { POCKET_KINDS } from './pocketTools';
import { detailParts3D } from './garmentCapabilities';
import PocketIcon from './PocketIcon';
import { pieceOf } from './garmentCatalog';
import SizeChartTable from '../../../components/SizeChartTable';

// One note for the whole panel: added pocket layers and the template's own details.
function detailsNote(templateDetails, parts3D) {
  const layers = 'Each added pocket is a layer: drag, resize, mirror or recolour it once selected; it gets a contrast edge automatically.';
  const where = !templateDetails ? 'Added pockets show in the 2D design, exports and the order, not in 3D.'
    : parts3D ? 'Everything here shows in the 2D design, exports and the order. 3D shows or hides the template pockets with you; added pockets and button or zip colours are 2D only.'
    : 'Everything here shows in the 2D design, exports and the order, not in 3D.';
  return `${layers} ${where}`;
}

export default function DetailsPanel({ cfg, setCfg, focus, onColourPocket, onAddPocket }) {
  const options = detailsFor(cfg.garment, cfg.sleeve, cfg.fit);
  const details = cfg.details ?? {};
  const [open, setOpen] = useState(focus ?? null);
  useEffect(() => { if (focus) setOpen(focus); }, [focus]);
  // Writing the template's own value removes the key, so only real changes are saved.
  const set = (id, v) => setCfg(p => { const next = { ...p.details }; if (v) next[id] = v; else delete next[id]; return { ...p, details: next }; });
  const pocketZone = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).includes('pocket');

  // Add pocket: a new editable layer (drag, resize, mirror, duplicate, recolour in the Selection panel). 2D only.
  const addPockets = onAddPocket && cfg.garment && (
    <section className="ds-det-add" aria-label="Add a pocket">
      <p className="ds-group-label">Add pocket</p>
      <div className="ds-det-pockets">
        {POCKET_KINDS.map(k => (
          <button key={k.id} type="button" className="ds-act ds-det-pocket" onClick={() => onAddPocket(k.id, cfg.colors?.pocket ?? cfg.colors?.body ?? '#1b2a4a')}
            title={`Add a ${k.label.toLowerCase()} pocket as a layer you can move, resize, mirror and recolour`}>
            <PocketIcon kind={k.id}/><span>{k.label}</span>
          </button>
        ))}
      </div>
    </section>
  );

  // Size chart on demand, so sizes can be checked without leaving the Studio for the Order Wizard.
  const [chartOpen, setChartOpen] = useState(false);
  const sizeChart = cfg.garment && (
    <section className="ds-det-chart" aria-label="Size chart">
      <button type="button" className="ds-det-head" aria-expanded={chartOpen} aria-controls="ds-det-chart" onClick={() => setChartOpen(o => !o)}>
        <span className="ds-det-name">Size chart</span><span className="ds-det-val">{chartOpen ? 'Hide' : 'Show'}</span>
      </button>
      {chartOpen && <div id="ds-det-chart"><SizeChartTable kind={pieceOf(cfg.garment) === 'bottom' ? 'bottoms' : 'tops'} note="Sizes and quantities are chosen when you order."/></div>}
    </section>
  );

  const note = cfg.garment && <p className="ds-det-note">{detailsNote(options.length > 0, detailParts3D(cfg.garment, cfg.sleeve, cfg.fit))}</p>;

  if (!options.length) {
    return (
      <div className="ds-det">
        {addPockets}
        {note}
        <p className="ds-panel-prompt">This garment's template draws no pockets, buttons or closures of its own.</p>
        {sizeChart}
      </div>
    );
  }
  return (
    <div className="ds-det">
      {addPockets}
      {note}
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
      {sizeChart}
    </div>
  );
}
