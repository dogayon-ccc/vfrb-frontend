// Tool rail in the stage's top lane: Photoshop-style tools and single-letter shortcuts (railTools.js), plus the active colour.
import { haptic } from '../../../utils/haptics';
import { useEffect, useRef } from 'react';
import ToolOptions from './ToolOptions';
import { MousePointer2, Undo2, Redo2, Hand, Pipette, PaintBucket, Brush, Eraser, PenTool, Slash, Type, Shapes, Shirt, ImagePlus, Sun } from 'lucide-react';
import { RAIL_TOOLS, PICK_TOOLS, STROKE_SIZES, STROKE_TOOLS, railKey, activeRail } from './railTools';

const ICONS = { move: MousePointer2, hand: Hand, sample: Pipette, fill: PaintBucket, brush: Brush, eraser: Eraser, pen: PenTool, line: Slash, text: Type, shape: Shapes };
const SHOWN = ['move', 'hand', 'fill', 'brush', 'eraser', 'pen', 'text', 'shape'];
// Desktop only (CSS hides these below 1024px, where the bottom sheet has the tabs): the panels that open in the left flyout.
// data-tab keeps the how-to tour's [data-tab=type] / [data-tab=add] targets pointing at a real control.
const DOCK = [
  { id: 'garment', tool: 'type',   tab: 'type',  label: 'Garment', hint: 'Garment, colours, pattern and details', Icon: Shirt },
  { id: 'add',     tool: 'assets', tab: 'add',   label: 'Add',     hint: 'Logos, shapes and starter templates',  Icon: ImagePlus, sub: 'logo' },
  { id: 'scene',   tool: 'scene',  tab: 'scene', label: 'Scene',   hint: 'Backdrop, lighting and turntable for the 3D preview', Icon: Sun },
];
const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };

export default function ToolRail({ rail, hand, setHand, canPan, zoomBy, readOnly = false }: any) {
  const { tool, setTool, pick, setPick, erasing, setErasing, color, setColor, size, setSize, opacity = 1, setOpacity, smooth = 0.5, setSmooth, colourOnly, onShapes, history = null, flyTool = null, openFly = null, closeFly = null } = rail;
  const rootRef = useRef(null);
  const active = activeRail({ hand, pick, tool, erasing });
  const off = id => (readOnly ? id !== 'move' : (id === 'hand' && !canPan) || (colourOnly && !RAIL_TOOLS.find(t => t.id === id)?.colour && id !== 'move'));

  // the set preview has no canvas to act on: leave any pick tool so it cannot linger
  useEffect(() => { if (readOnly) { setPick(null); setHand(false); if (tool === 'draw') setTool('assets'); } }, [readOnly]);

  const choose = (id) => {
    if (off(id)) return;
    haptic('tick');
    const leaveDraw = () => { if (tool === 'draw') setTool('assets'); };
    if (id !== 'text' && id !== 'shape') closeFly?.(); // a drawing tool has its own options; the flyout steps aside
    setHand(id === 'hand');
    setPick(PICK_TOOLS.includes(id) ? id : null);
    if (id === 'brush' || id === 'eraser') { setErasing(id === 'eraser'); setTool('draw'); return; }
    if (id === 'text') { openFly ? openFly('text') : setTool('text'); return; }
    if (id === 'shape') { onShapes?.(); openFly ? openFly('assets', 'shapes') : setTool('assets'); return; }
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
    <>
    <div className="ds-tools" role="toolbar" aria-label="Tools" data-tip-side="right" ref={rootRef}>
      {!readOnly && !colourOnly && openFly && DOCK.map(({ id, tool: tl, tab, label, hint, Icon, sub }, i) => {
        const on = flyTool === tl || (id === 'garment' && ['color', 'pattern', 'details'].includes(flyTool)) || (id === 'add' && flyTool === 'text');
        return (
          <button key={id} type="button" className="ds-tools-btn ds-tools-dock" data-dock={id} data-tab={tab} data-last={i === DOCK.length - 1 || undefined} aria-pressed={on}
            aria-label={label} data-tip={`${label}: ${hint}`} onClick={() => { haptic('tick'); if (on) closeFly?.(); else openFly(tl, sub); }}>
            <Icon size={20} aria-hidden="true"/>
          </button>
        );
      })}
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
      <label className="ds-tools-ink" data-tip="Active colour: the brush, pen, line, rectangle, ellipse and paint bucket use it">
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
    </div>
    {!readOnly && !colourOnly && <ToolOptions active={active} rootRef={rootRef} size={size} setSize={setSize} color={color} setColor={setColor} opacity={opacity} setOpacity={setOpacity} smooth={smooth} setSmooth={setSmooth} onDone={() => choose('move')}/>}
    </>
  );
}
