// Pieces rail: a card per uniform piece (tap to edit it) and the piece actions. A left column on desktop; on phones and tablets
// piece tabs above the canvas, for a set only (the actions move to the Garment sheet).
import GarmentSilhouette from './GarmentSilhouette';
import { SET_ROLES, ROLE_LABEL } from './uniformSet';
import { pieceOf } from './garmentCatalog';
import { garmentLabel } from '../../../utils/designName';

function Card({ role, c, name }) {
  return (
    <>
      <span className="ds-rail-thumb" aria-hidden="true">
        {c && <GarmentSilhouette garment={c.garment} sleeve={c.sleeve ?? 'Short'} fit={c.fit} colors={c.colors} details={c.details} custom={c.custom}
          patterns={c.patterns} patternParams={c.patternParams} width={48} height={58}/>}
      </span>
      <span className="ds-rail-txt"><small>{role ? ROLE_LABEL[role] : 'Garment'}</small><strong>{garmentLabel(name) ?? 'Not chosen yet'}</strong></span>
    </>
  );
}

// Preview the set, "Apply edits to both pieces" (desktop only, once both have a garment), add or drop the matching piece.
// The desktop rail shows them under the cards; phones and tablets show them in the Garment sheet (`inSheet`).
export function PieceActions({ cfg, uset, other = null, onStart, canSet, setView = true, showSet, onShowSet,
  applyBoth = false, onApplyBoth = null, readOnly = false, inSheet = false }) {
  const role = cfg.garment ? pieceOf(cfg.garment) : null;
  if (readOnly || !role) return null;
  return (
    <div className="ds-rail-acts" data-sheet={inSheet || undefined}>
      {uset && setView && (
        <button type="button" className="ds-btn" aria-pressed={showSet} disabled={!canSet} onClick={() => onShowSet(!showSet)}
          title={canSet ? undefined : 'Choose a garment for both pieces to preview the set'}>{showSet ? 'Back to one piece' : 'Preview the set'}</button>
      )}
      {uset && onApplyBoth && other && !inSheet && (
        <label className="ds-switch" title="Colour and pattern edits, and each logo or text you add, go on both pieces">
          <input type="checkbox" checked={applyBoth} onChange={e => { onShowSet(false); onApplyBoth(e.target.checked); }}/>
          <span>Apply edits to both pieces</span>
        </label>
      )}
      {!uset && (
        <button type="button" className="ds-piece-add" data-card onClick={onStart}>
          <span className="ds-piece-add-plus" aria-hidden="true">+</span>Add a matching {ROLE_LABEL[SET_ROLES.find(r => r !== role)].toLowerCase()}
        </button>
      )}
    </div>
  );
}

export default function PiecesRail(props) {
  const { cfg, uset, other = null, onSwitch, onShowSet, showSet, readOnly = false } = props;
  if (!cfg.garment) return null;
  const role = pieceOf(cfg.garment);
  const active = uset?.active ?? role;
  const pieceCfg = r => (r === active ? cfg : other?.role === r ? other.cfg : null);
  return (
    <aside className="ds-rail" aria-label="Pieces" data-set={uset ? '1' : undefined}>
      <h2 className="ds-rail-h">Pieces</h2>
      {uset ? (
        <ul className="ds-rail-list" role="group" aria-label="Piece to edit">
          {SET_ROLES.map(r => (
            <li key={r}>
              <button type="button" className="ds-rail-card" aria-pressed={!showSet && r === active} disabled={readOnly}
                onClick={() => { onShowSet(false); onSwitch(r); }}>
                <Card role={r} c={pieceCfg(r)} name={r === active ? cfg.garment : uset.pieces[r]?.garment}/>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ds-rail-card" data-single><Card role={role} c={cfg} name={cfg.garment}/></div>
      )}
      <PieceActions {...props}/>
    </aside>
  );
}
