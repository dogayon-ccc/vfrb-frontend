import { NavIcon } from '../../../components/ui/icons';
import { SHAPE_TYPE_LABEL, FONTS } from './dsShared';
import { metricsPct } from './canvasGuides';

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
// [where, short label, accessible label]
const ALIGN = [['left', 'Left', 'Align left'], ['hcenter', 'Center', 'Center horizontally'], ['right', 'Right', 'Align right'],
  ['top', 'Top', 'Align top'], ['vcenter', 'Middle', 'Center vertically'], ['bottom', 'Bottom', 'Align bottom']];

export function SelectionInspector({ selObj, updateSelected, deleteSelected, duplicateSelected, alignSelected, toggleSelectedLock, pushHistory, garmentRect = null }) {
  // Metrics are % of the garment (origin = its top-left), the same system as the rulers; a multi-selection shows its group bounds.
  const active = selObj.canvas?.getActiveObject?.() ?? selObj, multi = active.type === 'activeselection';
  const m = metricsPct(active, garmentRect), g = garmentRect;
  const kind   = multi ? `${m?.n ?? 2} elements` : kindOf(selObj);
  const isText = !!selObj.__text || selObj.type === 'i-text' || selObj.type === 'text';
  const isLine = selObj.__shape && selObj.type === 'line';
  const hasFill = selObj.__shape || isText;
  const locked = !!selObj.__locked;
  const angle  = Math.round(selObj.angle ?? 0);
  const baseW = selObj.width ?? 0;
  const baseH = selObj.height ?? 0;
  const live = (props) => updateSelected(props, false);
  const commit = () => pushHistory?.();
  const fontId = FONTS.find(f => f.css === selObj.fontFamily)?.id ?? '';

  const num = (label, value, onCommit, readOnly = false) => (
    <label className="ds-ins-field">
      <span>{label}</span>
      <input type="number" inputMode="decimal" step="0.1" defaultValue={value} key={`${label}-${value}`} disabled={locked} readOnly={readOnly}
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
        <h2 className="ds-eyebrow">{kind}{!multi && selObj.__layerName && selObj.__layerName !== kind ? ` · ${selObj.__layerName}` : ''}</h2>
        {!multi && <button type="button" className="ds-lay-btn" aria-pressed={locked} aria-label={locked ? 'Unlock item' : 'Lock item'}
          title={locked ? 'Unlock' : 'Lock position and size'} onClick={toggleSelectedLock}>
          <NavIcon name="lock" size={15}/>
        </button>}
      </div>
      {locked && <p className="ds-ins-note">Locked — unlock to move, resize or delete.</p>}

      {isText && !multi && (
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
        <p className="ds-group-label">Position &amp; size · % of garment</p>
        {m && (
          <div className="ds-ins-grid">
            {num('X %', m.x, v => updateSelected({ left: (active.left ?? 0) + ((v - m.x) / 100) * g.width }))}
            {num('Y %', m.y, v => updateSelected({ top: (active.top ?? 0) + ((v - m.y) / 100) * g.height }))}
            {num('W %', m.w, v => updateSelected({ scaleX: ((v / 100) * g.width) / baseW }), multi || isText || !(baseW > 0))}
            {num('H %', m.h, v => updateSelected({ scaleY: ((v / 100) * g.height) / baseH }), multi || isText || !(baseH > 0))}
          </div>
        )}
        {!multi && range(`Rotation ${angle}°`, angle, 0, 360, v => live({ angle: v }), locked)}
        {alignSelected && !multi && <p className="ds-group-label" style={{ marginTop: 12 }}>Align on garment</p>}
        {alignSelected && !multi && (
          <div className="ds-ins-align" role="group" aria-label="Align to garment">
            {ALIGN.map(([where, short, label]) => (
              <button key={where} type="button" className="ds-act" aria-label={label} title={`${label} on the garment`} disabled={locked}
                onClick={() => alignSelected(where)}>{short}</button>
            ))}
          </div>
        )}
      </section>

      {!multi && <section className="ds-ins-sec">
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
      </section>}

      <div className="ds-ins-actions">
        {duplicateSelected && !multi && (
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
