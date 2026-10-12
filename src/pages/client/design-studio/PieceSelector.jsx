// The one uniform-piece selector on the stage: Top / Bottom / Set. Without a set, the other piece reads "+ Bottom" (or "+ Top") and starts
// one. "Set" previews both pieces together in 3D, and only exists while each piece has its own model (no fused or substitute model).
import { SET_ROLES, ROLE_LABEL } from './uniformSet';
import { pieceOf } from './garmentCatalog';

export default function PieceSelector({ cfg, uset, onSwitch, onStart, onLeave, canSet, showSet, onShowSet }) {
  const role = pieceOf(cfg.garment);
  if (!role) return null; // full-length garments (dresses, coveralls) are never in a set
  const active = uset ? uset.active : role;
  const pick = r => {
    onShowSet(false);
    if (uset) onSwitch(r);
    else if (r !== role) onStart();
  };
  return (
    <div className="ds-piece" role="group" aria-label="Uniform piece">
      {SET_ROLES.map(r => {
        const name = r === active ? cfg.garment : uset?.pieces[r]?.garment;
        const add = !uset && r !== role;
        return (
          <button key={r} type="button" aria-pressed={!showSet && r === active} data-add={add || undefined}
            title={add ? `Add a ${ROLE_LABEL[r].toLowerCase()} to make a uniform set` : name ?? undefined} onClick={() => pick(r)}>
            {add ? `+ ${ROLE_LABEL[r]}` : ROLE_LABEL[r]}{name && <span className="ds-wide-only">{name}</span>}
          </button>
        );
      })}
      {uset && (
        <button type="button" aria-pressed={showSet} disabled={!canSet} onClick={() => onShowSet(true)}
          title={canSet ? 'Preview both pieces together in 3D' : 'Both pieces need their own 3D model to preview the set together'}>Set</button>
      )}
      {uset && <button type="button" className="ds-piece-leave" aria-label="Leave uniform set" title="Keep only this piece" onClick={onLeave}>×</button>}
    </div>
  );
}
