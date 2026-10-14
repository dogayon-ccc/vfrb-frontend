// The one uniform-piece selector on the stage: Top / Bottom / Set. Without a set, the other piece reads "+ Bottom" (or "+ Top") and starts
// one. "Set" previews both pieces together on one scale: in 2D always, in 3D while each piece has its own model (no fused or substitute model).
import { SET_ROLES, ROLE_LABEL } from './uniformSet';
import { pieceOf } from './garmentCatalog';

export default function PieceSelector({ cfg, uset, onSwitch, onStart, onLeave, canSet, showSet, onShowSet, applyBoth = false, onApplyBoth = null }) {
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
          title={canSet ? 'Preview both pieces together' : 'Choose a garment for both pieces to preview the set'}>Set</button>
      )}
      {uset && <button type="button" className="ds-piece-leave" aria-label="Leave uniform set" title="Keep only this piece" onClick={onLeave}>×</button>}
      {/* Where colour, pattern, logo and text edits go: the piece on the canvas, or both pieces of the set. */}
      {uset && onApplyBoth && (
        <span className="ds-apply" role="radiogroup" aria-label="Apply colour, pattern, logo and text to">
          <span className="ds-wide-only">Apply to</span>
          {SET_ROLES.map(r => (
            <button key={r} type="button" role="radio" aria-checked={!applyBoth && r === active}
              onClick={() => { onApplyBoth(false); if (r !== active) pick(r); }}>{ROLE_LABEL[r]}</button>
          ))}
          <button type="button" role="radio" aria-checked={applyBoth} title="Colour and pattern edits, and each logo or text you add, go on both pieces"
            onClick={() => { onShowSet(false); onApplyBoth(true); }}>Both</button>
        </span>
      )}
    </div>
  );
}
