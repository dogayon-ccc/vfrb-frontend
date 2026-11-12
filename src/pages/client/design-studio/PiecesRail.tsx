// Pieces rail: a card per uniform piece (tap to edit it) and the piece actions. A left column on desktop, with the docked layers
// and the shortcut card under them; on phones and tablets a strip above the canvas (piece tabs for a set, the add action for one piece).
import GarmentSilhouette from './GarmentSilhouette';
import { SET_ROLES, ROLE_LABEL } from './uniformSet';
import { pieceOf, isCompleteOutfit, COMPLETE_OUTFIT } from './garmentCatalog';
import { garmentLabel } from '../../../utils/designName';
import { NavIcon } from '../../../components/ui/icons';
import { ICON } from './LayersPanel';
import { SHORTCUTS } from './railTools';

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
        <button type="button" className="ds-piece-add" data-card onClick={onStart}>
          <span className="ds-piece-add-plus" aria-hidden="true">+</span><span>Add<span className="ds-piece-add-x"> a matching</span> {ROLE_LABEL[SET_ROLES.find(r => r !== role)].toLowerCase()}</span>
        </button>
      )}
    </div>
  );
}

// Desktop only: the layers on this side, always in view (Photoshop's docked Layers panel). Tap a row to select; the eye hides it.
// Renaming, order, lock and opacity stay in the full Layers tab.
function LayerDock({ layers = [], selectedId, onSelect, onToggleVisibility, onAdd, onOpenLayers }: any) {
  return (
    <section className="ds-dock" aria-labelledby="ds-dock-h">
      <div className="ds-dock-head">
        <h3 id="ds-dock-h">Layers <span>{layers.length}</span></h3>
        {layers.length > 0 && onOpenLayers && <button type="button" className="ds-dock-link" onClick={onOpenLayers}>Edit all</button>}
      </div>
      {layers.length === 0 ? (
        <div className="ds-dock-empty">
          <p>Nothing on this side yet.</p>
          {onAdd && <button type="button" className="ds-btn" onClick={onAdd}>Add a logo or text</button>}
        </div>
      ) : (
        <ul className="ds-dock-list" aria-label="Layers on this side, front-most first">
          {layers.map(l => (
            <li key={l.id} className="ds-dock-row" data-sel={l.id === selectedId || undefined} data-hidden={!l.visible || undefined}>
              <button type="button" className="ds-dock-pick" aria-pressed={l.id === selectedId} onClick={() => onSelect?.(l.id)}>
                <NavIcon name={ICON[l.type] ?? 'text'} size={15}/>
                <span>{l.name}</span>
                {l.locked && <NavIcon name="lock" size={13}/>}
              </button>
              <button type="button" className="ds-dock-eye" aria-label={`${l.visible ? 'Hide' : 'Show'} ${l.name}`} aria-pressed={!l.visible}
                onClick={() => onToggleVisibility?.(l.id)}><NavIcon name={l.visible ? 'show' : 'hide'} size={15}/></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Help at the foot of the column: the tour, every shortcut ("?" anywhere) and the keyboard ones in a fold.
function KeysCard({ onTour, onKeys, onHowTo }: any) {
  return (
    <div className="ds-help">
      {(onTour || onKeys) && (
        <div className="ds-help-acts">
          {onTour && <button type="button" className="ds-btn" onClick={onTour}>Take the tour</button>}
          {onKeys && <button type="button" className="ds-btn" onClick={onKeys} aria-label="All shortcuts" aria-keyshortcuts="?" title="All shortcuts (?)"><kbd>?</kbd></button>}
          {onHowTo && <button type="button" className="ds-btn ds-help-howto" onClick={onHowTo}>How-to guides</button>}
        </div>
      )}
      <details className="ds-keys">
        <summary>Keyboard shortcuts</summary>
        <dl>
          {SHORTCUTS.filter(g => g.group !== 'Touch').flatMap(g => g.keys).map(([k, label]) => <div key={k + label}><dt><kbd>{k}</kbd></dt><dd>{label}</dd></div>)}
        </dl>
      </details>
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
      <div id="ds-navigator-slot" className="ds-nav-slot"/>
      {dock && !readOnly && <LayerDock {...dock}/>}
      {!readOnly && <KeysCard onTour={help?.onTour} onKeys={help?.onKeys} onHowTo={help?.onHowTo}/>}
    </aside>
  );
}
