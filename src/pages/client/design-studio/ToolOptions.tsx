import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Square, Circle, Triangle, Star, Hexagon, MoveUpRight } from 'lucide-react';
import { BOX_TOOLS, SHAPE_KINDS, railOf, BRUSH_KINDS, brushKind as kindOf } from './railTools';
import { SIDES } from './overlayTools';
import { PH_SWATCHES } from './dsShared';
import { hasScreenEyedropper, pickScreenColour } from './eyedropper';

// The active tool's own options, in a flyout beside the left tool rail (Canva/Photoshop style): pick a tool, its settings appear next to it.
//   brush : size, opacity, smoothing, colour      pen / line : width, colour      eraser : size
// Text and shapes keep their panels for now. The flyout is portaled into .ds-body (the rail scrolls, so a child would be clipped)
// and anchored to the active rail button; on phones the rail is a row, so the flyout opens full width under it.
const PALETTE = PH_SWATCHES.slice(0, 10); // the same Philippine colours as the Colours panel, so one palette everywhere
const KIND_ICON = { rect: Square, ellipse: Circle, triangle: Triangle, star: Star, polygon: Hexagon, arrow: MoveUpRight };
const COPY: Record<string, { title: string; hint: string }> = {
  brush:  { title: 'Brush', hint: 'Drag on the garment. Each stroke is its own layer and one undo step.' },
  sample: { title: 'Eyedropper', hint: 'Tap a garment part to take its colour as the active colour. The brush, pen, shapes and paint bucket then use it.' },
  eraser: { title: 'Eraser', hint: 'Rubs out your drawings and uploaded art only, never the garment, text or shapes.' },
  pen:    { title: 'Pen', hint: 'Click to place points, drag a point to curve the line. Enter finishes, Backspace removes the last point.' },
  line:   { title: 'Line', hint: 'Drag from one point to another. Hold Shift to snap to 45°.' },
  shape:  { title: 'Shape', hint: 'Choose a kind, then drag on the garment. Hold Shift to keep it even. Each shape is its own layer.' },
};

export default function ToolOptions({ active, rootRef, size, setSize, color, setColor, opacity, setOpacity, smooth, setSmooth, brushKind = 'brush', setBrushKind, sides = SIDES.def, setSides, onDone, onKind, onLibrary }: any) {
  const boxRef = useRef<HTMLDivElement>(null);
  const spec = COPY[BOX_TOOLS.includes(active) ? 'shape' : active];
  type Pos = { left?: number; right?: number; top: number; maxHeight?: number };
  const [pos, setPos] = useState<Pos | null>(null);
  const host = typeof document !== 'undefined' ? (rootRef.current?.closest('.ds-body') as HTMLElement | null) : null;
  const placeRef = useRef<() => void>(() => {});
  const same = (a: Pos | null, b: Pos | null) => !!a && !!b && a.left === b.left && a.right === b.right && a.top === b.top && a.maxHeight === b.maxHeight;

  useLayoutEffect(() => {
    if (!spec) return undefined;
    const place = () => {
      const body = rootRef.current?.closest('.ds-body') as HTMLElement | null;
      const btn = rootRef.current?.querySelector(`[data-tool="${railOf(active)}"]`) as HTMLElement | null;
      if (!body || !btn) { setPos(null); return; }
      const b = body.getBoundingClientRect(), r = btn.getBoundingClientRect(), bar = rootRef.current.getBoundingClientRect();
      if (window.innerWidth < 768) { setPos(p => { const n = { left: 8, right: 8, top: bar.bottom - b.top + 6 }; return same(p, n) ? p : n; }); return; }
      // Keep clear of the Navigator: when it sits beside the popover, the popover must end above it (and scroll inside that room).
      const left = r.right - b.left + 12, nav = body.querySelector('.ds-navi') as HTMLElement | null, nr = nav?.getBoundingClientRect();
      const beside = !!nr && nr.width > 0 && nr.right - b.left > left && nr.left - b.left < left + 260;
      const floor = beside ? nr.top - b.top - 8 : b.height - 72;
      const h = boxRef.current?.scrollHeight ?? 0, top = Math.max(8, Math.min(r.top - b.top - 6, floor - h));
      setPos(p => { const n = { left, top, maxHeight: Math.max(160, floor - top) }; return same(p, n) ? p : n; });
    };
    placeRef.current = place;
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active, spec, rootRef, size, brushKind, sides]);

  // The box is only measurable once it has rendered, and its height changes with the tool; place again whenever it resizes.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || !pos) return undefined;
    const ro = new ResizeObserver(() => placeRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!pos, active]);

  if (!spec || !pos || !host) return null;
  const eraser = active === 'eraser', ink = active === 'pen' || active === 'line', box = BOX_TOOLS.includes(active), brush = active === 'brush', kind = kindOf(brushKind);
  const max = eraser ? 30 : brush ? BRUSH_KINDS[kind].max : 20;
  return createPortal(
    <div ref={boxRef} className="ds-opts" role="group" aria-label={`${spec.title} options`} style={pos}>
      <div className="ds-opts-head">
        <strong>{spec.title}</strong>
        <button type="button" className="ds-opts-x" aria-label="Close options (back to Move)" onClick={onDone}><X size={16} aria-hidden="true"/></button>
      </div>
      {box && (
        <div className="ds-opts-kinds" role="radiogroup" aria-label="Shape kind">
          {SHAPE_KINDS.map(([id, label]) => { const I = KIND_ICON[id]; return (
            <button key={id} type="button" role="radio" aria-checked={active === id} onClick={() => onKind?.(id)}><I size={16} aria-hidden="true"/>{label}</button>
          ); })}
        </div>
      )}
      {brush && setBrushKind && (
        <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Brush style">
          {Object.entries(BRUSH_KINDS).map(([id, k]) => <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setBrushKind(id)}>{k.label}</button>)}
        </div>
      )}
      <p className="ds-opts-hint">{spec.hint}</p>
      {active === 'polygon' && setSides && <label className="ds-opts-row"><span>Sides <b>{sides}</b></span>
        <input type="range" min={SIDES.min} max={SIDES.max} value={sides} onChange={e => setSides(Number(e.target.value))} aria-label="Number of sides"/></label>}
      {!box && <label className="ds-opts-row"><span>Size <b>{size}px</b></span>
        <input type="range" min={1} max={max} value={Math.min(size, max)} onChange={e => setSize(Number(e.target.value))} aria-label="Size in pixels"/></label>}
      {!box && <div className="ds-opts-preview" aria-hidden="true"><i style={{ width: Math.max(2, Math.min(size, 40)), height: Math.max(2, Math.min(size, 40)), background: eraser ? 'var(--cx-ink-2)' : color, opacity: brush ? opacity : 1, borderRadius: brush && kind === 'highlighter' ? 2 : '50%' }}/></div>}
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
            {PALETTE.map(s => <button key={s.hex} type="button" className="ds-opts-dot" style={{ background: s.hex }} aria-label={`Colour ${s.name}`} title={s.name} aria-pressed={color.toLowerCase() === s.hex.toLowerCase()} onClick={() => setColor(s.hex)}/>)}
            <label className="ds-opts-dot ds-opts-custom" aria-label="Custom colour"><input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#02C39A'} onChange={e => setColor(e.target.value)}/></label>
          </div>
          {hasScreenEyedropper() && <button type="button" className="ds-btn ds-eyedrop" onClick={async () => { const hex = await pickScreenColour(); if (hex) setColor(hex); }}>Pick from screen</button>}
        </div>
      )}
      {box && <p className="ds-opts-hint">Fills with the colour above. Change fill, border and corners afterwards in the Selection panel.</p>}
      {box && onLibrary && <button type="button" className="ds-btn ds-opts-more" onClick={onLibrary}>More shapes: heart, badge, ribbon…</button>}
      {ink && <p className="ds-opts-hint">Width and colour apply to the next line you draw.</p>}
    </div>,
    host,
  );
}
