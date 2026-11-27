// Compact numeric adjust for one selected item: X/Y/W/H (% of garment), rotation, opacity. Same updateSelected path as the inspector.
import { metricsPct } from './canvasGuides';

export default function AdjustPopover({ selObj, garmentRect, updateSelected, pushHistory }: any) {
  const g = garmentRect, m = g ? metricsPct(selObj, g) : null;
  const locked = !!selObj.__locked, isText = !!selObj.__text || selObj.type === 'i-text' || selObj.type === 'text';
  const bw = selObj.width ?? 0, bh = selObj.height ?? 0;
  const live = (p: any) => updateSelected(p, false), commit = () => pushHistory?.();
  const num = (label: string, value: number, onCommit: (v: number) => void, off = false) => (
    <label className="ds-adj-f"><span>{label}</span>
      <input type="number" inputMode="decimal" step="0.1" defaultValue={value} key={`${label}-${value}`} disabled={locked || off}
        onBlur={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) onCommit(v); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}/>
    </label>
  );
  const range = (label: string, value: number, min: number, max: number, on: (v: number) => void) => (
    <label className="ds-adj-r"><span>{label}</span>
      <input type="range" min={min} max={max} value={value} disabled={locked} onChange={e => on(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit}/>
    </label>
  );
  const angle = Math.round(selObj.angle ?? 0), op = Math.round((selObj.opacity ?? 1) * 100);
  return (
    <div className="ds-adj" role="group" aria-label="Adjust selected item">
      {m && g && <div className="ds-adj-g">
        {num('X %', m.x, v => updateSelected({ left: (selObj.left ?? 0) + ((v - m.x) / 100) * g.width }))}
        {num('Y %', m.y, v => updateSelected({ top: (selObj.top ?? 0) + ((v - m.y) / 100) * g.height }))}
        {num('W %', m.w, v => updateSelected({ scaleX: ((v / 100) * g.width) / bw }), isText || !(bw > 0))}
        {num('H %', m.h, v => updateSelected({ scaleY: ((v / 100) * g.height) / bh }), isText || !(bh > 0))}
      </div>}
      {range(`Rotation ${angle}°`, angle, 0, 360, v => live({ angle: v }))}
      {range(`Opacity ${op}%`, op, 10, 100, v => live({ opacity: v / 100 }))}
    </div>
  );
}
