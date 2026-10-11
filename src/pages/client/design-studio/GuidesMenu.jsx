// One "Guides" button in the stage's top lane; its popover holds Grid, grid size, Snap, Rulers, Centre line and Smart guides.
// Escape or a click outside closes it and focus returns to the button.
import { useEffect, useId, useRef, useState } from 'react';
import { GRID_SIZES } from './snapGuides';

const SIZE_LABEL = { 10: 'Fine', 20: 'Medium', 40: 'Coarse' }; // relative names, never units
const ITEMS = [
  ['grid', 'Grid', 'A neutral grid behind your design'],
  ['snap', 'Snap', 'Pull elements onto the centre, grid and guides while dragging'],
  ['rulers', 'Rulers', '0 to 100 % of the garment'],
  ['centre', 'Centre line', 'Dashed line down the garment centre; elements snap to it'],
  ['smart', 'Smart guides', 'Snap to other elements’ edges and centres, with guide lines'],
];

export default function GuidesMenu({ guides, setGuides }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null), btn = useRef(null), panel = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector('input')?.focus();
    const down = e => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key, true); };
  }, [open]);
  const on = Object.entries(guides).filter(([k, v]) => k !== 'size' && v).length;
  return (
    <div className="ds-guides" ref={wrap}>
      <button ref={btn} type="button" className="ds-guides-btn" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={() => setOpen(o => !o)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
        <span>Guides</span>{on > 0 && <span className="ds-guides-n" aria-label={`${on} on`}>{on}</span>}
      </button>
      {open && (
        <div ref={panel} id={id} className="ds-guides-pop" role="dialog" aria-label="Guides">
          {ITEMS.map(([k, label, hint]) => (
            <div key={k} className="ds-guides-row">
              <label>
                <input type="checkbox" checked={!!guides[k]} onChange={e => setGuides(g => ({ ...g, [k]: e.target.checked }))}/>
                <span><b>{label}</b><small>{hint}</small></span>
              </label>
              {k === 'grid' && (
                <select aria-label="Grid size" value={guides.size} disabled={!guides.grid} onChange={e => setGuides(g => ({ ...g, size: Number(e.target.value) }))}>
                  {GRID_SIZES.map(s => <option key={s} value={s}>{SIZE_LABEL[s]}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
