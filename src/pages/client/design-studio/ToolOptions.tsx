import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Brush, Eraser, PenTool, Slash, Square, Circle } from 'lucide-react';

// The active tool's own options, in a flyout beside the left tool rail (Canva/Photoshop style): pick a tool, its settings appear next to it.
//   brush : size, opacity, smoothing, colour      pen / line : width, colour      eraser : size
// Text and shapes keep their panels for now. The flyout is portaled into .ds-body (the rail scrolls, so a child would be clipped)
// and anchored to the active rail button; on phones the rail is a row, so the flyout opens full width under it.
const PALETTE = ['#02C39A', '#028090', '#1B2428', '#E63946', '#F4A261', '#FFD166', '#FFFFFF', '#000000'];
const SWITCH = [['brush', Brush], ['eraser', Eraser], ['pen', PenTool], ['line', Slash], ['rect', Square], ['ellipse', Circle]] as const;
const COPY: Record<string, { title: string; hint: string }> = {
  brush:  { title: 'Brush', hint: 'Drag on the garment. Each stroke is its own layer and one undo step.' },
  eraser: { title: 'Eraser', hint: 'Rubs out your drawings and uploaded art only, never the garment, text or shapes.' },
  pen:    { title: 'Curved line', hint: 'Click to place points, drag a point to curve the line. Enter finishes, Backspace removes the last point.' },
  line:   { title: 'Straight line', hint: 'Drag from one point to another. Hold Shift to snap to 45°.' },
  rect:   { title: 'Rectangle', hint: 'Drag on the garment. Hold Shift for a square. Each shape is its own layer.' },
  ellipse: { title: 'Ellipse', hint: 'Drag on the garment. Hold Shift for a circle. Each shape is its own layer.' },
};

export default function ToolOptions({ active, rootRef, size, setSize, color, setColor, opacity, setOpacity, smooth, setSmooth, onDone, onPick }: any) {
  const boxRef = useRef<HTMLDivElement>(null);
  const spec = COPY[active];
  const [pos, setPos] = useState<{ left?: number; right?: number; top: number } | null>(null);
  const host = typeof document !== 'undefined' ? (rootRef.current?.closest('.ds-body') as HTMLElement | null) : null;

  useLayoutEffect(() => {
    if (!spec) return undefined;
    const place = () => {
      const body = rootRef.current?.closest('.ds-body') as HTMLElement | null;
      const btn = rootRef.current?.querySelector(`[data-tool="${active}"]`) as HTMLElement | null;
      if (!body || !btn) { setPos(null); return; }
      const b = body.getBoundingClientRect(), r = btn.getBoundingClientRect(), bar = rootRef.current.getBoundingClientRect();
      if (window.innerWidth < 768) { setPos({ left: 8, right: 8, top: bar.bottom - b.top + 6 }); return; }
      const h = boxRef.current?.offsetHeight ?? 0;
      setPos({ left: r.right - b.left + 12, top: Math.max(8, Math.min(r.top - b.top - 6, b.height - h - 72)) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active, spec, rootRef, size]);

  if (!spec || !pos || !host) return null;
  const eraser = active === 'eraser', ink = active === 'pen' || active === 'line', box = active === 'rect' || active === 'ellipse', brush = active === 'brush';
  const max = eraser ? 30 : brush ? 40 : 20;
  return createPortal(
    <div ref={boxRef} className="ds-opts" role="group" aria-label={`${spec.title} options`} style={pos}>
      <div className="ds-opts-head">
        <strong>{spec.title}</strong>
        <button type="button" className="ds-opts-x" aria-label="Close options (back to Move)" onClick={onDone}><X size={16} aria-hidden="true"/></button>
      </div>
      {onPick && (
        <div className="ds-opts-tools" role="radiogroup" aria-label="Drawing tool">
          {SWITCH.map(([id, I]) => (
            <button key={id} type="button" role="radio" aria-checked={active === id} aria-label={COPY[id].title} data-tip={COPY[id].title} onClick={() => onPick(id)}><I size={18} aria-hidden="true"/></button>
          ))}
        </div>
      )}
      <p className="ds-opts-hint">{spec.hint}</p>
      {!box && <label className="ds-opts-row"><span>Size <b>{size}px</b></span>
        <input type="range" min={1} max={max} value={Math.min(size, max)} onChange={e => setSize(Number(e.target.value))} aria-label="Size in pixels"/></label>}
      {!box && <div className="ds-opts-preview" aria-hidden="true"><i style={{ width: Math.max(2, Math.min(size, 40)), height: Math.max(2, Math.min(size, 40)), background: eraser ? 'var(--cx-ink-2)' : color, opacity: brush ? opacity : 1 }}/></div>}
      {brush && (<>
        <label className="ds-opts-row"><span>Opacity <b>{Math.round(opacity * 100)}%</b></span>
          <input type="range" min={10} max={100} value={Math.round(opacity * 100)} onChange={e => setOpacity(Number(e.target.value) / 100)} aria-label="Opacity in percent"/></label>
        <label className="ds-opts-row"><span>Smoothing <b>{Math.round(smooth * 100)}%</b></span>
          <input type="range" min={0} max={100} value={Math.round(smooth * 100)} onChange={e => setSmooth(Number(e.target.value) / 100)} aria-label="Stroke smoothing in percent"/></label>
      </>)}
      {!eraser && (
        <div className="ds-opts-row" role="group" aria-label="Colour">
          <span>Colour</span>
          <div className="ds-opts-sw">
            {PALETTE.map(c => <button key={c} type="button" className="ds-opts-dot" style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={color.toLowerCase() === c.toLowerCase()} onClick={() => setColor(c)}/>)}
            <label className="ds-opts-dot ds-opts-custom" aria-label="Custom colour"><input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#02C39A'} onChange={e => setColor(e.target.value)}/></label>
          </div>
        </div>
      )}
      {box && <p className="ds-opts-hint">Fills with the colour above. Change fill, border and corners afterwards in the Selection panel.</p>}
      {ink && <p className="ds-opts-hint">Width and colour apply to the next line you draw.</p>}
    </div>,
    host,
  );
}
