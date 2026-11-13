// Pieces rail: a card per uniform piece (tap to edit it) and the piece actions. A left column on desktop, with the docked layers
// and the shortcut card under them; on phones and tablets a strip above the canvas (piece tabs for a set, the add action for one piece).
import { useEffect, useRef, useState } from 'react';
import GarmentSilhouette from './GarmentSilhouette';
import { SET_ROLES, ROLE_LABEL } from './uniformSet';
import { pieceOf, isCompleteOutfit, COMPLETE_OUTFIT } from './garmentCatalog';
import { garmentLabel } from '../../../utils/designName';
import { NavIcon } from '../../../components/ui/icons';

function Card({ role, c, name }: any) {
  return (
    <>
      <span className="ds-rail-thumb" aria-hidden="true">
        {c && <GarmentSilhouette garment={c.garment} sleeve={c.sleeve ?? 'Short'} fit={c.fit} colors={c.colors} details={c.details} custom={c.custom}
          patterns={c.patterns} patternParams={c.patternParams} width={48} height={58}/>}
      </span>
      <span className="ds-rail-txt"><small>{role ? ROLE_LABEL[role] : isCompleteOutfit(name) ? COMPLETE_OUTFIT : 'Garment'}</small><strong>{garmentLabel(name) ?? 'Not chosen yet'}</strong></span>
    </>
  );
}

// Preview the set, "Apply edits to both pieces" (desktop only, once both have a garment), add or drop the matching piece.
// The desktop rail shows them under the cards; phones and tablets show them in the Garment sheet (`inSheet`).
// "Add a matching bottom/top" for a single piece that has a set partner, else null (the phone ⋯ menu uses it).
export const addPieceLabel = (cfg, uset) => {
  const role = !uset && cfg.garment ? pieceOf(cfg.garment) : null;
  return role ? `Add a matching ${ROLE_LABEL[SET_ROLES.find(r => r !== role)].toLowerCase()}` : null;
};

export function PieceActions({ cfg, uset, other = null, onStart, canSet, setView = true, showSet, onShowSet,
  applyBoth = false, onApplyBoth = null, readOnly = false, inSheet = false }: any) {
  const role = cfg.garment ? pieceOf(cfg.garment) : null;
  if (!readOnly && !role && isCompleteOutfit(cfg.garment)) return <p className="ds-rail-note" data-sheet={inSheet || undefined}>{COMPLETE_OUTFIT}: no matching piece needed.</p>;
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
        <button type="button" className="ds-piece-add" data-card onClick={onStart} aria-label={addPieceLabel(cfg, uset) ?? undefined}>
          <span className="ds-piece-add-plus" aria-hidden="true">+</span><span>Add<span className="ds-piece-add-x"> a matching</span> {ROLE_LABEL[SET_ROLES.find(r => r !== role)].toLowerCase()}</span>
        </button>
      )}
    </div>
  );
}

// One "?" button: the tour, the how-to guides and every shortcut.
function HelpMenu({ onTour, onKeys, onHowTo }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: any) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const go = (fn) => () => { setOpen(false); fn?.(); };
  return (
    <div className="ds-help" ref={ref}>
      <button type="button" className="ds-help-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Help" aria-keyshortcuts="?" onClick={() => setOpen(o => !o)}>?</button>
      {open && (
        <ul className="ds-help-menu" role="menu" aria-label="Help">
          {onTour && <li role="none"><button type="button" role="menuitem" onClick={go(onTour)}>Take the tour</button></li>}
          {onHowTo && <li role="none"><button type="button" role="menuitem" onClick={go(onHowTo)}>How-to guides</button></li>}
          {onKeys && <li role="none"><button type="button" role="menuitem" onClick={go(onKeys)}>Keyboard shortcuts</button></li>}
        </ul>
      )}
    </div>
  );
}

export default function PiecesRail(props) {
  const { cfg, uset, other = null, onSwitch, onShowSet, showSet, readOnly = false, dock = null, help = null } = props;
  if (!cfg.garment) return null;
  const role = pieceOf(cfg.garment);
  const active = uset?.active ?? role;
  const pieceCfg = r => (r === active ? cfg : other?.role === r ? other.cfg : null);
  // Phones and tablets: a single piece still gets the strip, so "Add a matching …" is one tap away (a set shows its piece tabs).
  const strip = !uset && !readOnly && !!role;
  return (
    <aside className="ds-rail ds-chrome" aria-label="Pieces" data-set={uset ? '1' : undefined} data-strip={strip || undefined}>
      <h2 className="ds-rail-h">Pieces</h2>
      {uset ? (
        <ul className="ds-rail-list" role="group" aria-label="Piece to edit">
          {SET_ROLES.map(r => (
            <li key={r}>
              <button type="button" className="ds-rail-card" aria-pressed={!showSet && r === active} disabled={readOnly} title={garmentLabel(r === active ? cfg.garment : uset.pieces[r]?.garment) ?? ROLE_LABEL[r]}
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
      <div id="ds-navigator-slot" className="ds-nav-slot"/>
      <div id="ds-tool-slot" className="ds-tool-slot"/>
      {!readOnly && <HelpMenu onTour={help?.onTour} onKeys={help?.onKeys} onHowTo={help?.onHowTo}/>}
    </aside>
  );
}
