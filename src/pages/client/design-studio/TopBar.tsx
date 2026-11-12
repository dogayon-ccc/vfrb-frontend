// Studio top bar: back, name, save state, undo/redo, the 2D/3D toggle (phones: on the stage) and the one primary action (Review & order).
// Save and PNG/PDF export live here too (phones fold Save and undo/redo into the "..." menu). A final design shows Reorder and Duplicate to edit.
// The garment picker is reached from "Change garment" and the empty canvas; Showcase appears only while it has designs.
import { useEffect, useState } from 'react';
import { ArrowLeft, Undo2, Redo2, Sparkles, Save, Check, ChevronRight } from 'lucide-react';
import ActionMenu from '../../../components/ui/ActionMenu';
import { has3DFor, NO_FAMILY_3D, standIn3D, no3DReason } from './garmentCapabilities';
import { cap3D } from './garmentCatalog';
import Capability3D from './Capability3D';
import { isCustom, CUSTOM_3D_NOTE } from './customGarment';
import { garmentLabel } from '../../../utils/designName';

const view3DTitle = (cfg, no3D) => (no3D
  ? (isCustom(cfg.garment) ? CUSTOM_3D_NOTE
    : no3DReason(cfg.garment) ? `${no3DReason(cfg.garment)}; 2D is the exact preview`
    : NO_FAMILY_3D.has(cfg.inspirationId) ? 'No 3D model matches the garment in this photo; 2D is the exact preview'
    : standIn3D(cfg.garment) ? `The only 3D model for ${garmentLabel(cfg.garment)} is a generic stand-in, not this garment, so 3D is off; 2D is the exact preview`
    : 'No 3D model for this garment and sleeve; 2D is the exact preview')
  : cap3D(cfg) === 'verified' ? 'Verified 3D model: edits show on the matching part'
  : '3D is an approximate, read-only spatial preview; use 2D for exact colours and placement');

const PHONE = '(max-width: 599px)';
function usePhone() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches);
  useEffect(() => {
    const q = window.matchMedia(PHONE), on = () => setM(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return m;
}

// The one 2D | 3D switch: in the top bar, and on phones in the stage's top lane instead (CSS picks one), so the bar keeps room for the name.
// The chip beside the switch says what 3D this exact design has (cap3D, shared Capability3D badge).
export function ViewToggle({ cfg, viewMode, setViewMode, setHas3DLoaded }: any) {
  const no3D = !has3DFor(cfg);
  const pickView = (m) => { if (m === '3d') setHas3DLoaded(true); setViewMode(m); };
  return (
    <div className="ds-view">
      <div className="ds-bar-view" role="radiogroup" aria-label="2D or 3D view">
        {['2d', '3d'].map(m => (
          <button key={m} type="button" role="radio" aria-checked={viewMode === m} disabled={m === '3d' && no3D}
            title={m === '3d' ? view3DTitle(cfg, no3D) : 'Exact 2D design view'} onClick={() => pickView(m)}>
            {m.toUpperCase()}
          </button>
        ))}
      </div>
      {cfg.garment && <Capability3D kind={cap3D(cfg)} className={`ds-view-chip${no3D ? ' is-off' : ''}`} title={view3DTitle(cfg, no3D)}/>}
    </div>
  );
}

export default function TopBar({ nav, cfg, setCfg, undo, redo, canUndo, canRedo, viewMode, setViewMode, setHas3DLoaded,
  showShowcase, setShowShowcase, showcaseCount = 0, status = null,
  saveDesign, saving, saved, draftSaved, orderThis, ordering, downloadImage, downloadPdf, exporting, lock = null, onReorder, onDuplicate, copying = false, phoneItems = [] }: any) {
  const phone = usePhone();
  const has = !!cfg.garment;
  // phoneItems: stage actions that leave the stage on phones (back view, full screen, add a matching piece).
  const menu = [
    ...(phone && has ? phoneItems : []),
    phone && !lock && { label: 'Undo', onClick: undo, disabled: !canUndo },
    phone && !lock && { label: 'Redo', onClick: redo, disabled: !canRedo },
    phone && !lock && has && { label: saving ? 'Saving…' : 'Save now', onClick: saveDesign, disabled: !!saving },
    phone && lock && { label: copying ? 'Copying…' : 'Duplicate to edit', onClick: onDuplicate, disabled: copying },
    has && downloadImage && { label: exporting === 'png' ? 'Exporting PNG…' : 'Export PNG image', onClick: downloadImage, disabled: !!exporting },
    has && downloadPdf && { label: exporting === 'pdf' ? 'Exporting PDF…' : 'Export PDF spec sheet', onClick: downloadPdf, disabled: !!exporting },
  ];

  return (
    <div className="ds-bar ds-chrome" role="banner">
      <button type="button" className="ds-bar-btn ds-bar-back" onClick={() => nav('/dashboard')} aria-label="Back to dashboard" title="Back to dashboard">
        <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" /><span>Back</span>
      </button>
      <h1 className="ds-bar-title">Design Studio</h1>
      {/* Design name feeds cfg.name, carried into studio_config on every save */}
      <input className="ds-bar-name" value={cfg.name ?? ''} maxLength={80} placeholder="Untitled design" aria-label="Design name"
        readOnly={!!lock} onChange={e => setCfg(p => ({ ...p, name: e.target.value.slice(0, 80) }))} />
      <div className="ds-bar-sp" />
      {lock
        ? <span className="ds-bar-save" role="status" title="Final designs are read-only"><span className="ds-bar-save-txt">{phone ? 'Final' : lock.orderId ? `Final for order #${lock.orderId}` : 'Final for its order'}</span></span>
        : status && <span className="ds-bar-save" role="status" aria-live="polite" data-tone={status.tone} title={status.long}><span className="ds-bar-save-dot" aria-hidden="true"/><span className="ds-bar-save-txt">{status.tone === 'err' && !phone ? status.long : status.short}</span></span>}

      {!phone && !lock && has && (
        <div className="ds-bar-group" role="group" aria-label="History">
          <button type="button" className="ds-bar-btn" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={18} strokeWidth={2} aria-hidden="true" /></button>
          <button type="button" className="ds-bar-btn" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2 size={18} strokeWidth={2} aria-hidden="true" /></button>
        </div>
      )}

      {has && <ViewToggle cfg={cfg} viewMode={viewMode} setViewMode={setViewMode} setHas3DLoaded={setHas3DLoaded}/>}

      {showcaseCount > 0 && !phone && (
        <button type="button" className="ds-bar-btn ds-bar-text" aria-pressed={showShowcase} aria-label="Showcase" title="Designs other customers chose to share" onClick={() => setShowShowcase(p => !p)}>
          <Sparkles size={16} strokeWidth={2} aria-hidden="true" /><span>Showcase</span>
        </button>
      )}

      {!phone && !lock && has && (
        <button type="button" className="ds-bar-btn ds-bar-text ds-bar-save-btn" onClick={saveDesign} disabled={!!saving} aria-busy={!!saving}>
          {saving ? <span className="ds-spin"/> : saved || draftSaved ? <Check size={16} aria-hidden="true"/> : <Save size={16} aria-hidden="true"/>}<span>{saving ? 'Saving' : 'Save'}</span>
        </button>
      )}
      {lock && !phone && (
        <button type="button" className="ds-bar-btn ds-bar-text" onClick={onDuplicate} disabled={copying} aria-busy={copying} data-view-only>{copying ? 'Copying…' : 'Duplicate to edit'}</button>
      )}
      <ActionMenu label="More: export and options" className="ds-bar-menu" drop="down" items={menu}/>
      {lock ? (
        <button type="button" className="ds-bar-primary" onClick={onReorder} data-view-only>Reorder</button>
      ) : has && (
        <button type="button" className="ds-bar-primary" onClick={orderThis} data-view-only disabled={ordering} aria-busy={!!ordering}>
          {ordering ? <><span className="ds-spin ds-spin--on-thread"/>Preparing…</> : <>{phone ? 'Review' : 'Review & order'}<ChevronRight size={16} aria-hidden="true"/></>}
        </button>
      )}
    </div>
  );
}
