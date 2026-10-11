// Studio top bar: back, name, undo/redo and the one 2D/3D toggle stay visible at every width; only Inspo/Showcase fold into "More" on phones.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Undo2, Redo2, Images, Sparkles, MoreHorizontal } from 'lucide-react';
import { has3DFor, NO_FAMILY_3D } from './garmentCapabilities';

const view3DTitle = (cfg, no3D) => (no3D
  ? (NO_FAMILY_3D.has(cfg.inspirationId) ? 'No 3D model matches the garment in this photo; 2D is the exact preview' : 'No 3D model for this garment and sleeve; 2D is the exact preview')
  : '3D is an approximate spatial preview; use 2D for exact colours and placement');

export default function TopBar({ nav, cfg, setCfg, undo, redo, canUndo, canRedo, viewMode, setViewMode, setHas3DLoaded,
  showInspo, setShowInspo, showShowcase, setShowShowcase, showcaseCount = 0 }) {
  const no3D = !has3DFor(cfg);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [moreOpen]);
  const pickView = (m) => { if (m === '3d') setHas3DLoaded(true); setViewMode(m); };
  // Showcase is offered only while it has designs to show.
  const extras = [
    { id: 'inspo', label: 'Inspo', title: 'Design inspirations: real VFRB photos', icon: Images, on: showInspo, toggle: setShowInspo },
    ...(showcaseCount > 0 ? [{ id: 'showcase', label: 'Showcase', title: 'Designs other clients chose to share', icon: Sparkles, on: showShowcase, toggle: setShowShowcase }] : []),
  ];

  return (
    <div className="ds-bar" data-menu={moreOpen ? 'open' : undefined}>
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

      <div className="ds-bar-extras">
        {extras.map(x => (
          <button key={x.id} type="button" className="ds-bar-btn ds-bar-text" aria-pressed={x.on} title={x.title} onClick={() => x.toggle(p => !p)}>
            <x.icon size={16} strokeWidth={2} aria-hidden="true" /><span>{x.label}</span>
          </button>
        ))}
      </div>

      <div className="ds-bar-more" ref={moreRef}>
        <button type="button" className="ds-bar-btn" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-haspopup="menu" aria-label="More: inspiration and showcase">
          <MoreHorizontal size={20} strokeWidth={2} aria-hidden="true" />
        </button>
        {moreOpen && (
          <div className="ds-bar-menu" role="menu" aria-label="More">
            {extras.map(x => (
              <button key={x.id} type="button" role="menuitemcheckbox" aria-checked={x.on} onClick={() => { x.toggle(p => !p); setMoreOpen(false); }}>
                <x.icon size={18} strokeWidth={2} aria-hidden="true" />{x.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
