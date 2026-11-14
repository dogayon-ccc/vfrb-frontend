import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import { shapeLabel } from './overlayTools';
import { TextStyleSection, ShapeStyleSection, ImageStyleSection, ArrangeRow, BlendRow } from './StyleSections';
import { metricsPct, xyText } from './canvasGuides';
import { pocketLabel } from './pocketTools';
import { SwatchGrid } from './SwatchGrid';

// Real contextual inspector for the currently-selected Fabric object — shown
// in place of the static Design Summary whenever something is selected.
// Fabric stays the source of truth: every control reads straight off selObj
// and writes back through the existing updateSelected(),
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
  if (o.__pocket) return pocketLabel(o.__pocket);
  if (o.__shape) return shapeLabel(o);
  if (o.__draw)  return 'Drawing';
  if (o.__artwork) return 'Artwork';
  if (o.__logo)  return 'Logo';
  return 'Text';
}

// Live "x, y" (template units) of the selection, updated while it is dragged, plus one-step nudge buttons (Shift = 5 steps).
const NUDGE = [['Up', ArrowUp, 0, -1], ['Left', ArrowLeft, -1, 0], ['Right', ArrowRight, 1, 0], ['Down', ArrowDown, 0, 1]];
function NudgePad({ obj, garmentRect, nudgeSelected, locked }: any) {
  const [, tick] = useState(0);
  useEffect(() => {
    const c = obj.canvas;
    if (!c) return undefined;
    const f = () => tick(n => n + 1);
    const evs = ['object:moving', 'object:scaling', 'object:modified'];
    evs.forEach(ev => c.on(ev, f));
    return () => evs.forEach(ev => c.off(ev, f));
  }, [obj]);
  const xy = xyText(metricsPct(obj, garmentRect));
  return (
    <div className="ds-nudge">
      <p className="ds-nudge-xy"><span>x, y</span><output aria-live="off" aria-label="Position in template units">{xy}</output></p>
      <div className="ds-nudge-pad" role="group" aria-label="Nudge by one grid step (Shift: 5 steps)">
        {NUDGE.map(([dir, Icon, dx, dy]) => (
          <button key={dir} type="button" className="ds-act" data-dir={dir.toLowerCase()} aria-label={`Nudge ${dir.toLowerCase()}`} title={`Nudge ${dir.toLowerCase()} one grid step (Shift: 5)`} disabled={locked}
            onClick={e => { const n = e.shiftKey ? 5 : 1; nudgeSelected(dx * n, dy * n); }}><Icon size={16} aria-hidden="true"/></button>
        ))}
      </div>
    </div>
  );
}

// Same controls on desktop (right panel) and tablet/phone ('selected' tab in the sheet).
// [where, short label, accessible label]
const ALIGN = [['left', 'Left', 'Align left'], ['hcenter', 'Center', 'Center horizontally'], ['right', 'Right', 'Align right'],
  ['top', 'Top', 'Align top'], ['vcenter', 'Middle', 'Center vertically'], ['bottom', 'Bottom', 'Align bottom']];

export function SelectionInspector({ selObj, updateSelected, alignSelected, toggleSelectedLock, pushHistory, arrangeLayer, garmentRect = null, setPocketColor = null, mirrorSelected = null,
  zones = [], presetPos = null, nudgeSelected = null }: any) {
  // Metrics are % of the garment (origin = its top-left), the same system as the rulers; a multi-selection shows its group bounds.
  const active = selObj.canvas?.getActiveObject?.() ?? selObj, multi = active.type === 'activeselection';
  const m = metricsPct(active, garmentRect), g = garmentRect;
  const kind   = multi ? `${m?.n ?? 2} elements` : kindOf(selObj);
  const isText = !!selObj.__text || selObj.type === 'i-text' || selObj.type === 'text';
  const locked = !!selObj.__locked;
  const angle  = Math.round(selObj.angle ?? 0);
  const baseW = selObj.width ?? 0;
  const baseH = selObj.height ?? 0;
  const live = (props) => updateSelected(props, false);
  const commit = () => pushHistory?.();

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
      {locked && <p className="ds-ins-note">Locked. Unlock to move, resize or delete.</p>}

      {isText && !multi && (
        <section className="ds-ins-sec">
          <p className="ds-group-label">Text</p>
          <label className="ds-ins-field ds-ins-wide">
            <span>Content</span>
            {/* Controlled: the case buttons and undo change the text from outside this box. */}
            <input type="text" maxLength={32} value={selObj.text ?? ''} disabled={locked}
              onChange={e => live({ text: e.target.value })} onBlur={commit}/>
          </label>
          <label className="ds-ins-field ds-ins-wide">
            <span>Colour</span>
            <input type="color" disabled={locked} value={/^#[0-9a-f]{6}$/i.test(selObj.fill ?? '') ? selObj.fill : '#ffffff'}
              onChange={e => live({ fill: e.target.value })} onBlur={commit}/>
          </label>
          <TextStyleSection o={selObj} set={updateSelected} live={live} commit={commit} locked={locked}/>
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
        {m && nudgeSelected && <NudgePad obj={active} garmentRect={g} nudgeSelected={nudgeSelected} locked={locked}/>}
        {!multi && range(`Rotation ${angle}°`, angle, 0, 360, v => live({ angle: v }), locked)}
        {!multi && selObj.__logo && !selObj.__artwork && presetPos && zones.length > 0 && (
          <>
            <p className="ds-group-label" style={{ marginTop: 12 }}>Move to zone</p>
            <div className="ds-chips" role="group" aria-label="Move logo to a zone">
              {/* Same anchor addLogo uses for a preset, so a moved logo lands where a fresh one would. */}
              {zones.map(z => (
                <button key={z.id} type="button" className="ds-chip" disabled={locked}
                  onClick={() => { const p = presetPos(z.id); if (p) updateSelected({ originX: 'left', originY: 'top', left: p.x, top: p.y }); }}>{z.label}</button>
              ))}
            </div>
          </>
        )}
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

      {!multi && selObj.__pocket && setPocketColor && (
        <section className="ds-ins-sec">
          <p className="ds-group-label">Pocket colour</p>
          {locked ? <p className="ds-ins-note">Unlock to recolour.</p> : <SwatchGrid label="Pocket" current={(selObj.__pocketColor ?? '').toLowerCase()} onPick={hex => setPocketColor(hex)}/>}
          <p className="ds-ins-note">Stitching switches to a light or dark thread to stay visible. Pockets are 2D only.</p>
        </section>
      )}

      {!multi && <section className="ds-ins-sec">
        <p className="ds-group-label">Appearance</p>
        {selObj.__shape && <ShapeStyleSection o={selObj} live={live} commit={commit} locked={locked}/>}
        {selObj.type === 'image' && <ImageStyleSection o={selObj} live={live} commit={commit} locked={locked}/>}
        {range(`Opacity ${Math.round((selObj.opacity ?? 1) * 100)}%`, Math.round((selObj.opacity ?? 1) * 100), 10, 100,
          v => live({ opacity: v / 100 }), false)}
        <BlendRow o={selObj} set={updateSelected} locked={locked}/>
        <ArrangeRow o={selObj} set={updateSelected} arrangeLayer={arrangeLayer} locked={locked}/>
      </section>}

      {/* Duplicate and Delete live on the floating toolbar above the selection only (Ctrl+D, Del). */}
      {mirrorSelected && !multi && (
        <div className="ds-ins-actions">
          <button type="button" className="ds-act" onClick={mirrorSelected} disabled={locked} title="Copy to the other side of the garment's centre line, flipped">
            <NavIcon name="duplicate" size={16}/> Mirror L/R
          </button>
        </div>
      )}
      <p className="ds-ins-note">Duplicate and delete from the toolbar above the selection. Tap empty canvas to deselect.</p>
    </div>
  );
}
