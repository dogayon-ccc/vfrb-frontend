// Build-your-own controls: the shape choices for a custom top, trousers or skirt (customGarment.js). Used by the picker's first
// Scratch card and by the Garment panel once the custom garment is open, so a saved design can be reopened and refined.
import { kindOf, normalizeCustom, NECKLINES, CUSTOM_SLEEVES, HEMS, BOTTOM_STYLES, SLIDERS, CUSTOM_3D_NOTE } from './customGarment';

function Seg({ label, items, value, onPick }) {
  return (
    <div className="ds-pick-frow" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      {items.map(([id, text]) => (
        <button key={id} type="button" role="radio" className="ds-chip" aria-checked={value === id} aria-pressed={value === id} onClick={() => onPick(id)}>{text}</button>
      ))}
    </div>
  );
}

function Slider({ label, value, range: [min, max], ends, onPick }) {
  return (
    <label className="ds-ins-range ds-byo-range">
      <span>{label} <output>{value}%</output></span>
      <input type="range" min={min} max={max} step={1} value={value} aria-valuetext={`${value}% (${ends[0]} to ${ends[1]})`}
        onChange={e => onPick(Number(e.target.value))}/>
      <span className="ds-byo-ends" aria-hidden="true"><span>{ends[0]}</span><span>{ends[1]}</span></span>
    </label>
  );
}

function Check({ label, checked, onPick }) {
  return (
    <label className="ds-byo-check">
      <input type="checkbox" checked={checked} onChange={e => onPick(e.target.checked)}/>{label}
    </label>
  );
}

// spec: the current choices (normalised here); onSpec(next) gets a clamped spec; sleeve/onSleeve only for tops.
export function CustomControls({ garment, spec, sleeve, onSpec, onSleeve }) {
  const kind = kindOf(garment);
  if (!kind) return null;
  const s = normalizeCustom(spec, garment), sl = SLIDERS[kind];
  const set = patch => onSpec(normalizeCustom({ ...s, ...patch }, garment));
  return (
    <div className="ds-byo">
      {kind === 'top' && (<>
        <Seg label="Neckline" items={NECKLINES} value={s.neckline} onPick={v => set({ neckline: v })}/>
        <Seg label="Sleeve" items={CUSTOM_SLEEVES} value={sleeve} onPick={onSleeve}/>
        <Slider label="Length" value={s.length} range={sl.length} ends={['Cropped', 'Long']} onPick={v => set({ length: v })}/>
        <Slider label="Fit" value={s.fit} range={sl.fit} ends={['Slim', 'Loose']} onPick={v => set({ fit: v })}/>
        <Seg label="Hem" items={HEMS} value={s.hem} onPick={v => set({ hem: v })}/>
      </>)}
      {kind === 'bottom' && (<>
        <Seg label="Style" items={BOTTOM_STYLES} value={s.style} onPick={v => set({ style: v })}/>
        <Slider label="Length" value={s.length} range={sl.length} ends={['Shorts', 'Full length']} onPick={v => set({ length: v })}/>
        <Slider label="Rise" value={s.rise} range={sl.rise} ends={['Low', 'High']} onPick={v => set({ rise: v })}/>
        {s.style === 'jogger' && (
          <div className="ds-pick-frow" role="group" aria-label="Jogger details">
            <span>Jogger</span>
            <Check label="Cuffs" checked={s.cuffs} onPick={v => set({ cuffs: v })}/>
            <Check label="Drawstring" checked={s.drawstring} onPick={v => set({ drawstring: v })}/>
          </div>
        )}
      </>)}
      {kind === 'skirt' && <Slider label="Length" value={s.length} range={sl.length} ends={['Mini', 'Maxi']} onPick={v => set({ length: v })}/>}
    </div>
  );
}

// The 2D-only line every custom garment carries (picker, Garment panel). The line already names the custom sketch, so no badge here.
export function CustomNote() {
  return <p className="ds-note ds-byo-note">{CUSTOM_3D_NOTE}</p>;
}
