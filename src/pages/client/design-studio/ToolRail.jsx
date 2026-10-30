// Tool rail in the stage's top lane: Photoshop-style tools and single-letter shortcuts (railTools.js), plus the active colour.
import { useEffect } from 'react';
import { MousePointer2, Hand, Pipette, PaintBucket, Brush, Eraser, Type, Shapes } from 'lucide-react';
import { RAIL_TOOLS, railKey, activeRail } from './railTools';

const ICONS = { move: MousePointer2, hand: Hand, sample: Pipette, fill: PaintBucket, brush: Brush, eraser: Eraser, text: Type, shape: Shapes };
const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };

export default function ToolRail({ rail, hand, setHand, canPan, zoomBy }) {
  const { tool, setTool, pick, setPick, erasing, setErasing, color, setColor, note, colourOnly } = rail;
  const active = activeRail({ hand, pick, tool, erasing });
  const off = id => (id === 'hand' && !canPan) || (colourOnly && !RAIL_TOOLS.find(t => t.id === id)?.colour && id !== 'move');

  const choose = (id) => {
    if (off(id)) return;
    const leaveDraw = () => { if (tool === 'draw') setTool('assets'); };
    setHand(id === 'hand');
    setPick(id === 'sample' || id === 'fill' ? id : null);
    if (id === 'brush' || id === 'eraser') { setErasing(id === 'eraser'); setTool('draw'); return; }
    if (id === 'text') { setTool('text'); return; }
    if (id === 'shape') { setTool('assets'); return; }
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
    <div className="ds-tools" role="toolbar" aria-label="Tools">
      {RAIL_TOOLS.map(({ id, key, label, hint }) => {
        const I = ICONS[id];
        return (
          <button key={id} type="button" className="ds-tools-btn" data-tool={id} aria-pressed={active === id} disabled={off(id)}
            aria-label={label} aria-keyshortcuts={key} title={`${label} (${key}): ${id === 'hand' && !canPan ? 'zoom in to pan' : hint.toLowerCase()}`}
            onClick={() => choose(id)}>
            <I size={17} aria-hidden="true"/>
          </button>
        );
      })}
      <label className="ds-tools-ink" title="Active colour: the brush and paint bucket use it, the eyedropper sets it">
        <input type="color" value={color} onChange={e => setColor(e.target.value)} aria-label="Active colour"/>
      </label>
      <span className="sr-only" role="status" aria-live="polite">{note}</span>
    </div>
  );
}
