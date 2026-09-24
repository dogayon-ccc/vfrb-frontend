import { NavIcon } from '../../../components/ui/icons';
import { ZONE_LABEL, zonesFor, T, T2, secLabel, SHAPE_TYPE_LABEL } from './dsShared';
import AIDesignChat from '../AIDesignChat';

// Real contextual inspector for the currently-selected Fabric object — shown
// in place of the static Design Summary whenever something is selected.
// Fabric stays the source of truth: every control reads straight off selObj
// and writes back through the existing updateSelected()/deleteSelected(),
// same mutate-in-place pattern ShapesPanel.jsx already uses (the ambient
// re-render that makes the sliders track live comes from updateSelected's
// own pushHistory(), not a duplicate state store).
function kindOf(o) {
  // o.type is Fabric's own class tag (rect/circle/triangle/ellipse/line/
  // polygon) — reading it directly (via SHAPE_TYPE_LABEL) means Triangle/
  // Ellipse/Line/Star show their real name instead of every non-circle
  // shape being mislabeled "Rectangle".
  if (o.__shape) return SHAPE_TYPE_LABEL[o.type] ?? 'Shape';
  if (o.__draw)  return 'Drawing';
  if (o.__logo)  return 'Logo';
  return 'Text';
}

function SelectionInspector({ selObj, updateSelected, deleteSelected }) {
  const kind    = kindOf(selObj);
  const hasFill = selObj.__shape || (!selObj.__logo && !selObj.__draw); // shapes + text
  // A Line has no fill (it's a stroked path, not an area) — its visible
  // color IS its stroke. Every other fillable shape/text edits .fill as before.
  const isLine  = selObj.__shape && selObj.type === 'line';
  const angle   = Math.round(selObj.angle ?? 0);

  // Width/Height are the real on-canvas size (base width/height × the
  // current scale factor) — Fabric stores those as two separate numbers,
  // but showing the multiplied-out pixel size is what a designer actually
  // expects to type into a "Width" field. Setting it back solves for the
  // scale factor Fabric needs, so nothing here is a value Fabric doesn't
  // already track — no shadow state, just a different unit to display it in.
  const baseW = selObj.width ?? 0;
  const baseH = selObj.height ?? 0;
  const dispW = Math.round(baseW * (selObj.scaleX ?? 1));
  const dispH = Math.round(baseH * (selObj.scaleY ?? 1));

  const numField = (label, value, onCommit) => (
    <div>
      <p style={secLabel}>{label}</p>
      <input type="number" defaultValue={Math.round(value)} key={value}
        onBlur={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) onCommit(v); }}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        style={{ width: '100%', padding: '6px 9px', borderRadius: 8, fontSize: 12,
          border: '1px solid rgba(15,23,42,.12)', color: 'rgba(15,23,42,.8)' }}/>
    </div>
  );

  return (
    <>
      <h2 className="ds-eyebrow">Selected: {selObj.__layerName || kind}</h2>

      <p className="ds-group-label">Transform</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {numField('X', selObj.left ?? 0, v => updateSelected({ left: v }))}
        {numField('Y', selObj.top ?? 0, v => updateSelected({ top: v }))}
        {baseW > 0 && numField('Width', dispW, v => updateSelected({ scaleX: v / baseW }))}
        {baseH > 0 && numField('Height', dispH, v => updateSelected({ scaleY: v / baseH }))}
      </div>

      <div>
        <p style={secLabel}>Rotation: {angle}°</p>
        <input type="range" min="0" max="360" value={angle}
          onChange={e => updateSelected({ angle: Number(e.target.value) })}
          style={{ width: '100%', accentColor: T2 }}/>
      </div>

      <p className="ds-group-label">Appearance</p>

      {hasFill && (
        <div>
          <p style={secLabel}>Color</p>
          <input type="color" value={selObj.fill || '#02C39A'}
            onChange={e => updateSelected({ fill: e.target.value })}
            style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid rgba(15,23,42,.12)',
              cursor: 'pointer', padding: 2 }}/>
        </div>
      )}

      <div>
        <p style={secLabel}>Opacity: {Math.round((selObj.opacity ?? 1) * 100)}%</p>
        <input type="range" min="10" max="100" value={Math.round((selObj.opacity ?? 1) * 100)}
          onChange={e => updateSelected({ opacity: Number(e.target.value) / 100 })}
          style={{ width: '100%', accentColor: T2 }}/>
      </div>

      <button type="button" className="ds-act" onClick={deleteSelected}
        style={{ color: '#E63946', borderColor: 'rgba(230,57,70,.3)' }}>
        <NavIcon name="delete" size={16}/> Delete
      </button>

      <p style={{ fontSize: 11, color: 'rgba(15,23,42,.35)', textAlign: 'center', margin: '10px 0 0', lineHeight: 1.5 }}>
        Click empty canvas to deselect.
      </p>
    </>
  );
}

export function SummaryContent({ cfg, saved, saveDesign, orderThis, downloadImage, clearGarment }) {
  const zones = zonesFor(cfg.garment, cfg.sleeve);
  const swatches = zones.filter(z => z !== 'tipping' || cfg.colors.tipping);
  const details = [zones.includes('sleeve') && `${cfg.sleeve} sleeve`, cfg.category].filter(Boolean).join(' · ');

  return (
    <>
      <h2 className="ds-eyebrow">Design summary</h2>
      <ul className="ds-swatches">
        {swatches.map(z => (
          <li key={z}>
            <span className="ds-swatch" style={{ background: cfg.colors[z] ?? 'var(--bg-surface)' }}/>
            <span>
              <span className="ds-swatch-name">{ZONE_LABEL[z]}</span>
              <span className="ds-swatch-hex">{cfg.colors[z] ?? 'Not set'}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="ds-sum-title">{cfg.garment}</p>
      <p className="ds-sum-sub">{details}</p>
      <button type="button" className="ds-act" onClick={saveDesign} disabled={!cfg.garment}>
        <NavIcon name={saved ? 'success' : 'save'} size={16}/> {saved ? 'Saved' : 'Save design'}
      </button>
      <button type="button" className="ds-act" onClick={downloadImage} disabled={!cfg.garment}>
        <NavIcon name="image" size={16}/> Download image
      </button>
      <button type="button" className="ds-act ds-act--primary" onClick={orderThis} disabled={!cfg.garment}>Order this design</button>
      {cfg.garment && clearGarment && (
        <button type="button" className="ds-act" onClick={clearGarment}>
          <NavIcon name="delete" size={16}/> Remove garment
        </button>
      )}
      <AIDesignChat docked/>
    </>
  );
}

export default function RightInfoPanel({ selObj, updateSelected, deleteSelected, ...rest }) {
  const showInspector = !!selObj && !selObj.__garmentBase && !selObj.__hoverGlow;
  return (
    <aside className="ds-info" aria-label={showInspector ? 'Selected object' : 'Design summary'}>
      {showInspector
        ? <SelectionInspector selObj={selObj} updateSelected={updateSelected} deleteSelected={deleteSelected}/>
        : <SummaryContent {...rest}/>}
    </aside>
  );
}