// Studio top bar: back, name, undo/redo and the one 2D/3D toggle stay visible at every width. The garment picker is reached from
// "Change garment" and the empty canvas, so there is no Inspo button; Showcase appears only while it has designs, as a direct button (no menu).
import { ArrowLeft, Undo2, Redo2, Sparkles } from 'lucide-react';
import { has3DFor, NO_FAMILY_3D, standIn3D, no3DReason } from './garmentCapabilities';
import { isCustom, CUSTOM_3D_NOTE } from './customGarment';

const view3DTitle = (cfg, no3D) => (no3D
  ? (isCustom(cfg.garment) ? CUSTOM_3D_NOTE
    : no3DReason(cfg.garment) ? `${no3DReason(cfg.garment)}; 2D is the exact preview`
    : NO_FAMILY_3D.has(cfg.inspirationId) ? 'No 3D model matches the garment in this photo; 2D is the exact preview'
    : standIn3D(cfg.garment) ? `The only 3D model for ${cfg.garment} is a generic stand-in, not this garment, so 3D is off; 2D is the exact preview`
    : 'No 3D model for this garment and sleeve; 2D is the exact preview')
  : '3D is an approximate spatial preview; use 2D for exact colours and placement');

export default function TopBar({ nav, cfg, setCfg, undo, redo, canUndo, canRedo, viewMode, setViewMode, setHas3DLoaded,
  showShowcase, setShowShowcase, showcaseCount = 0 }) {
  const no3D = !has3DFor(cfg);
  const pickView = (m) => { if (m === '3d') setHas3DLoaded(true); setViewMode(m); };

  return (
    <div className="ds-bar">
      <button type="button" className="ds-bar-btn ds-bar-back" onClick={() => nav('/dashboard')} aria-label="Back to dashboard" title="Back to dashboard">
        <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" /><span>Back</span>
      </button>
      <span className="ds-bar-title">Design Studio</span>
      {/* Design name feeds cfg.name, carried into studio_config on every save */}
      <input className="ds-bar-name" value={cfg.name ?? ''} maxLength={80} placeholder="Untitled design" aria-label="Design name"
        onChange={e => setCfg(p => ({ ...p, name: e.target.value.slice(0, 80) }))} />
      <div className="ds-bar-sp" />

      <div className="ds-bar-group" role="group" aria-label="History">
        <button type="button" className="ds-bar-btn" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={18} strokeWidth={2} aria-hidden="true" /></button>
        <button type="button" className="ds-bar-btn" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2 size={18} strokeWidth={2} aria-hidden="true" /></button>
      </div>

      <div className="ds-bar-view" role="radiogroup" aria-label="2D or 3D view">
        {['2d', '3d'].map(m => (
          <button key={m} type="button" role="radio" aria-checked={viewMode === m} disabled={m === '3d' && no3D}
            title={m === '3d' ? view3DTitle(cfg, no3D) : 'Exact 2D design view'} onClick={() => pickView(m)}>{m.toUpperCase()}</button>
        ))}
      </div>

      {showcaseCount > 0 && (
        <button type="button" className="ds-bar-btn ds-bar-text" aria-pressed={showShowcase} aria-label="Showcase" title="Designs other clients chose to share" onClick={() => setShowShowcase(p => !p)}>
          <Sparkles size={16} strokeWidth={2} aria-hidden="true" /><span>Showcase</span>
        </button>
      )}
    </div>
  );
}
