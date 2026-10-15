// Tracing guide controls (Garment panel): show/hide, under or over the garment, opacity, size, position and remove.
import { TRACE_LIMITS } from './traceGuide';

function Range({ label, value, range: [min, max], unit = '%', onChange }) {
  return (
    <label className="ds-ins-range ds-byo-range">
      <span>{label} <output>{value}{unit}</output></span>
      <input type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))}/>
    </label>
  );
}

export default function TraceControls({ trace, setTrace }) {
  if (!trace) return null;
  const set = patch => setTrace(t => (t ? { ...t, ...patch } : t));
  return (
    <section className="ds-trace-ctl" aria-label="Tracing guide">
      <p className="ds-h3">Tracing guide</p>
      <p className="ds-note" style={{ marginTop: 0 }}>{trace.name}: locked, see-through, never exported or sent with the order.</p>
      <div className="ds-chips">
        <button type="button" className="ds-chip" onClick={() => set({ hidden: !trace.hidden })}>{trace.hidden ? 'Show' : 'Hide'}</button>
        <button type="button" className="ds-chip" aria-pressed={trace.over} onClick={() => set({ over: !trace.over })} title="Over the garment while you trace details; under it to compare the outline">{trace.over ? 'Over garment' : 'Under garment'}</button>
        <button type="button" className="ds-chip" onClick={() => set({ x: 0, y: 0, scale: 100 })}>Reset position</button>
        <button type="button" className="ds-chip" onClick={() => setTrace(null)}>Remove</button>
      </div>
      <Range label="Opacity" value={trace.opacity} range={TRACE_LIMITS.opacity} onChange={v => set({ opacity: v })}/>
      <Range label="Size" value={trace.scale} range={TRACE_LIMITS.scale} onChange={v => set({ scale: v })}/>
      <Range label="Move left / right" value={trace.x} range={TRACE_LIMITS.x} onChange={v => set({ x: v })}/>
      <Range label="Move up / down" value={trace.y} range={TRACE_LIMITS.y} onChange={v => set({ y: v })}/>
    </section>
  );
}
