import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import GarmentSilhouette from './GarmentSilhouette';
import { ZONE_LABEL, zonesFor, SHAPE_TYPE_LABEL, TOOLS, FONTS } from './dsShared';
import AIDesignChat from '../AIDesignChat';

// Real contextual inspector for the currently-selected Fabric object — shown
// in place of the static Design Summary whenever something is selected.
// Fabric stays the source of truth: every control reads straight off selObj
// and writes back through the existing updateSelected()/deleteSelected(),
// same mutate-in-place pattern ShapesPanel.jsx already uses (the ambient
// re-render that makes the sliders track live comes from updateSelected's
// own pushHistory(), not a duplicate state store).
// A real, user-placed selection vs. Fabric's own internal helper objects (the garment
// silhouette itself, the hover-glow highlight) — shared by both places that decide whether
// to show selection controls, instead of two copies of the same two flag checks.
export function isEditableSelection(o) {
  return !!o && !o.__garmentBase && !o.__hoverGlow;
}

function kindOf(o) {
  // o.type is Fabric's own class tag (rect/circle/triangle/ellipse/line/
  // polygon) — reading it directly (via SHAPE_TYPE_LABEL) means Triangle/
  // Ellipse/Line/Star show their real name instead of every non-circle
  // shape being mislabeled "Rectangle".
  if (o.__shape) return SHAPE_TYPE_LABEL[o.type] ?? 'Shape';
  if (o.__draw)  return 'Drawing';
  if (o.__artwork) return 'Artwork';
  if (o.__logo)  return 'Logo';
  return 'Text';
}

// Same controls on desktop (right panel) and tablet/phone ('selected' tab in the sheet).
export function SelectionInspector({ selObj, updateSelected, deleteSelected, duplicateSelected, toggleSelectedLock, pushHistory }) {
  const kind   = kindOf(selObj);
  const isText = !!selObj.__text || selObj.type === 'i-text' || selObj.type === 'text';
  const isLine = selObj.__shape && selObj.type === 'line';
  const hasFill = selObj.__shape || isText;
  const locked = !!selObj.__locked;
  const angle  = Math.round(selObj.angle ?? 0);
  const baseW = selObj.width ?? 0;
  const baseH = selObj.height ?? 0;
  const dispW = Math.round(baseW * (selObj.scaleX ?? 1));
  const dispH = Math.round(baseH * (selObj.scaleY ?? 1));
  const live = (props) => updateSelected(props, false);
  const commit = () => pushHistory?.();
  const fontId = FONTS.find(f => f.css === selObj.fontFamily)?.id ?? '';

  const num = (label, value, onCommit) => (
    <label className="ds-ins-field">
      <span>{label}</span>
      <input type="number" inputMode="numeric" defaultValue={Math.round(value)} key={`${label}-${Math.round(value)}`} disabled={locked}
        onBlur={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) onCommit(v); }}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}/>
    </label>
  );
  const range = (label, value, min, max, onLive, disabled) => (
    <label className="ds-ins-range">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} disabled={disabled}
        onChange={e => onLive(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit}/>
    </label>
  );

  return (
    <div className="ds-ins">
      <div className="ds-ins-head">
        <h2 className="ds-eyebrow">{kind}{selObj.__layerName && selObj.__layerName !== kind ? ` · ${selObj.__layerName}` : ''}</h2>
        <button type="button" className="ds-lay-btn" aria-pressed={locked} aria-label={locked ? 'Unlock item' : 'Lock item'}
          title={locked ? 'Unlock' : 'Lock position and size'} onClick={toggleSelectedLock}>
          <NavIcon name="lock" size={15}/>
        </button>
      </div>
      {locked && <p className="ds-ins-note">Locked — unlock to move, resize or delete.</p>}

      {isText && (
        <section className="ds-ins-sec">
          <p className="ds-group-label">Text</p>
          <label className="ds-ins-field ds-ins-wide">
            <span>Content</span>
            <input type="text" maxLength={32} defaultValue={selObj.text ?? ''} key={selObj.__layerId} disabled={locked}
              onChange={e => e.target.value && live({ text: e.target.value })} onBlur={commit}/>
          </label>
          <label className="ds-ins-field ds-ins-wide">
            <span>Font</span>
            <select value={fontId} disabled={locked} onChange={e => updateSelected({ fontFamily: FONTS.find(f => f.id === e.target.value)?.css })}>
              {fontId === '' && <option value="">Current</option>}
              {FONTS.map(f => <option key={f.id} value={f.id}>{f.label ?? f.id}</option>)}
            </select>
          </label>
          {range(`Size ${Math.round(selObj.fontSize ?? 18)}px`, Math.round(selObj.fontSize ?? 18), 8, 96, v => live({ fontSize: v }), locked)}
          <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Text alignment">
            {['left', 'center', 'right'].map(a => (
              <button key={a} type="button" role="radio" aria-checked={(selObj.textAlign ?? 'left') === a} disabled={locked}
                onClick={() => updateSelected({ textAlign: a })}>{a[0].toUpperCase() + a.slice(1)}</button>
            ))}
          </div>
        </section>
      )}

      <section className="ds-ins-sec">
        <p className="ds-group-label">Position &amp; size</p>
        <div className="ds-ins-grid">
          {num('X', selObj.left ?? 0, v => updateSelected({ left: v }))}
          {num('Y', selObj.top ?? 0, v => updateSelected({ top: v }))}
          {!isText && baseW > 0 && num('Width', dispW, v => updateSelected({ scaleX: v / baseW }))}
          {!isText && baseH > 0 && num('Height', dispH, v => updateSelected({ scaleY: v / baseH }))}
        </div>
        {range(`Rotation ${angle}°`, angle, 0, 360, v => live({ angle: v }), locked)}
      </section>

      <section className="ds-ins-sec">
        <p className="ds-group-label">Appearance</p>
        {hasFill && (
          <label className="ds-ins-field ds-ins-wide">
            <span>Color</span>
            <input type="color" disabled={locked} value={(isLine ? selObj.stroke : selObj.fill) || '#02C39A'}
              onChange={e => live(isLine ? { stroke: e.target.value } : { fill: e.target.value })} onBlur={commit}/>
          </label>
        )}
        {range(`Opacity ${Math.round((selObj.opacity ?? 1) * 100)}%`, Math.round((selObj.opacity ?? 1) * 100), 10, 100,
          v => live({ opacity: v / 100 }), false)}
      </section>

      <div className="ds-ins-actions">
        {duplicateSelected && (
          <button type="button" className="ds-act" onClick={duplicateSelected} disabled={locked}>
            <NavIcon name="duplicate" size={16}/> Duplicate
          </button>
        )}
        <button type="button" className="ds-act ds-act--danger" onClick={deleteSelected} disabled={locked}>
          <NavIcon name="delete" size={16}/> Delete
        </button>
      </div>
      <p className="ds-ins-note">Tap empty canvas to deselect.</p>
    </div>
  );
}

export function SummaryContent({ cfg, saved, saveDesign, orderThis, ordering, downloadImage, clearGarment, onOpenTool, activeTool, layerCount = 0, face = 'front' }) {
  const zones = zonesFor(cfg.garment, cfg.sleeve, cfg.fit);
  const swatches = zones.filter(z => z !== 'tipping' || cfg.colors.tipping);
  const details = [zones.includes('sleeve') && `${cfg.sleeve} sleeve`, cfg.category].filter(Boolean).join(' · ');

  return (
    <>
      <h2 className="ds-eyebrow">Design summary</h2>
      <AnimatePresence mode="wait" initial={false}>
        {cfg.garment ? (
          <motion.div key={cfg.garment} className="ds-sum-card"
            initial={{ opacity:0, y:8, scale:.97 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-6 }} transition={{ duration:.2, ease:'easeOut' }}>
            <div className="ds-sum-thumb">
              <GarmentSilhouette garment={cfg.garment} sleeve={cfg.sleeve} fit={cfg.fit} colors={cfg.colors} width={64} height={76}/>
            </div>
            <div style={{ minWidth:0 }}>
              <p className="ds-sum-title" style={{ margin:0 }}>{cfg.garment}</p>
              <p className="ds-sum-sub" style={{ margin:'2px 0 0' }}>{details}</p>
            </div>
          </motion.div>
        ) : (
          <motion.p key="none" className="ds-sum-sub" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            No garment selected yet — choose one in the Type tab.
          </motion.p>
        )}
      </AnimatePresence>
      <ul className="ds-swatch-row" aria-label="Zone colors">
        {swatches.map(z => (
          <li key={z} title={`${ZONE_LABEL[z]}: ${cfg.colors[z] ?? 'Not set'}`}>
            <span className="ds-swatch ds-swatch--lg" style={{ background: cfg.colors[z] ?? 'var(--bg-surface)' }}/>
            <span className="ds-swatch-name">{ZONE_LABEL[z]}</span>
          </li>
        ))}
      </ul>
      {cfg.garment && (
        <ul className="ds-stats" aria-label="Design at a glance">
          <li><b>{swatches.length}</b><span>colour zones</span></li>
          <li><b>{layerCount}</b><span>{layerCount === 1 ? 'layer' : 'layers'} · {face}</span></li>
        </ul>
      )}
      {cfg.garment && onOpenTool && (
        <nav className="ds-jump" aria-label="Jump to a design tool">
          {[['type', zones.includes('sleeve') ? 'Garment & sleeve' : 'Garment', zones.includes('sleeve') ? cfg.sleeve : cfg.garment], ['color', 'Colors', `${swatches.length} zones`],
            ['pattern', 'Pattern'], ['assets', 'Logos & shapes'], ['text', 'Text']].map(([id, label, val]) => {
            const icon = TOOLS.find(t => t.id === id)?.icon ?? 'info';
            return (
              <button key={id} type="button" data-active={activeTool === id ? 'true' : undefined} onClick={() => onOpenTool(id)}>
                <NavIcon name={icon} size={15}/>
                <span>{label}</span>{val && <em>{val}</em>}
                <NavIcon name="chevronRight" size={13}/>
              </button>
            );
          })}
        </nav>
      )}
      <div className="ds-actions">
        <button type="button" className="ds-act" onClick={downloadImage} disabled={!cfg.garment}>
          <NavIcon name="image" size={16}/> Image
        </button>
        {cfg.garment && clearGarment && (
          <button type="button" className="ds-link-danger ds-act--wide" onClick={clearGarment}>
            <NavIcon name="delete" size={14}/> Remove garment
          </button>
        )}
      </div>
      <AIDesignChat docked/>
    </>
  );
}

export default function RightInfoPanel({ selObj, updateSelected, deleteSelected, duplicateSelected, toggleSelectedLock, pushHistory, open, onClose, ...rest }) {
  const showInspector = !!selObj && !selObj.__garmentBase && !selObj.__hoverGlow;
  return (
    <aside className="ds-info" data-open={open ? 'true' : 'false'} aria-label={showInspector ? 'Selected object' : 'Design summary'}>
      {onClose && <button type="button" className="ds-info-close" aria-label="Close panel" onClick={onClose}><NavIcon name="close" size={16}/></button>}
      {showInspector
        ? <SelectionInspector selObj={selObj} updateSelected={updateSelected} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} toggleSelectedLock={toggleSelectedLock} pushHistory={pushHistory}/>
        : <SummaryContent {...rest}/>}
    </aside>
  );
}