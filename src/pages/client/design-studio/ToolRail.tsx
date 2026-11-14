// Tool rail in the stage's top lane: Photoshop-style tools and single-letter shortcuts (railTools.js), plus the active colour.
import { haptic } from '../../../utils/haptics';
import { useEffect } from 'react';
import { MousePointer2, Undo2, Redo2, Hand, Pipette, PaintBucket, Brush, Eraser, PenTool, Slash, Type, Shapes } from 'lucide-react';
import { RAIL_TOOLS, PICK_TOOLS, STROKE_SIZES, STROKE_TOOLS, railKey, activeRail } from './railTools';

const ICONS = { move: MousePointer2, hand: Hand, sample: Pipette, fill: PaintBucket, brush: Brush, eraser: Eraser, pen: PenTool, line: Slash, text: Type, shape: Shapes };
const SHOWN = ['move', 'hand', 'sample', 'fill', 'brush', 'eraser', 'pen', 'text', 'shape'];
const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };

export default function ToolRail({ rail, hand, setHand, canPan, zoomBy, readOnly = false }: any) {
  const { tool, setTool, pick, setPick, erasing, setErasing, color, setColor, size, setSize, note, colourOnly, onShapes, history = null } = rail;
  const active = activeRail({ hand, pick, tool, erasing });
  const off = id => (readOnly ? id !== 'move' : (id === 'hand' && !canPan) || (colourOnly && !RAIL_TOOLS.find(t => t.id === id)?.colour && id !== 'move'));

  // the set preview has no canvas to act on: leave any pick tool so it cannot linger
  useEffect(() => { if (readOnly) { setPick(null); setHand(false); if (tool === 'draw') setTool('assets'); } }, [readOnly]);

  const choose = (id) => {
    if (off(id)) return;
    haptic('tick');
    const leaveDraw = () => { if (tool === 'draw') setTool('assets'); };
    setHand(id === 'hand');
    setPick(PICK_TOOLS.includes(id) ? id : null);
    if (id === 'brush' || id === 'eraser') { setErasing(id === 'eraser'); setTool('draw'); return; }
    if (id === 'text') { setTool('text'); return; }
    if (id === 'shape') { onShapes?.(); setTool('assets'); return; }
    leaveDraw();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (typing() || e.defaultPrevented) return;
      const r = railKey(e);
      if (!r || (r === 'move' && e.key === 'Escape' && active === 'move')) return;
      e.preventDefault();
      if (r === 'zoom-in' || r === 'zoom-out') zoomBy(r === 'zoom-in' ? 1.25 : 0.8);
      else choose(r);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="ds-tools" role="toolbar" aria-label="Tools" data-tip-side="right">
      {RAIL_TOOLS.filter(t => SHOWN.includes(t.id)).map(({ id, key, label, hint }: any) => {
        const I = ICONS[id];
        return (
          <button key={id} type="button" className="ds-tools-btn" data-tool={id} aria-pressed={active === id} disabled={off(id)}
            aria-label={label} aria-keyshortcuts={key} data-tip={readOnly && id !== 'move' ? `${label}: switch to one piece to use tools` : `${label} (${key}): ${id === 'hand' && !canPan ? 'zoom in to pan' : hint.toLowerCase()}`}
            onClick={() => choose(id)}>
            <I size={20} aria-hidden="true"/>
          </button>
        );
      })}
      {history && (
        <span className="ds-tools-hist" role="group" aria-label="History">
          <button type="button" className="ds-tools-btn" aria-label="Undo" disabled={!history.canUndo} onClick={() => { haptic('tick'); history.undo(); }}><Undo2 size={20} aria-hidden="true"/></button>
          <button type="button" className="ds-tools-btn" aria-label="Redo" disabled={!history.canRedo} onClick={() => { haptic('tick'); history.redo(); }}><Redo2 size={20} aria-hidden="true"/></button>
        </span>
      )}
      <label className="ds-tools-ink" data-tip="Active colour: the brush, pen, line, rectangle, ellipse and paint bucket use it, the eyedropper sets it">
        <input type="color" value={color} disabled={readOnly} onChange={e => setColor(e.target.value)} aria-label="Active colour"/>
      </label>
      {STROKE_TOOLS.includes(active) && setSize && (
        <div className="ds-tools-size" role="radiogroup" aria-label="Stroke width">
          {STROKE_SIZES.map(s => (
            <button key={s} type="button" role="radio" aria-checked={size === s} aria-label={`${s} px stroke`} data-tip={`${s} px stroke`} onClick={() => setSize(s)}>
              <i style={{ width: s + 2, height: s + 2 }} aria-hidden="true"/>
            </button>
          ))}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">{note}</span>
    </div>
  );
}
