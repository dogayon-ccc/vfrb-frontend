// One "Guides" button in the stage's top lane (icon + count on phones and tablets). Its panel holds Grid, grid size, Snap, Rulers,
// Centre line and Smart guides. It is rendered at the Studio root so nothing (rulers, sheet, stage) can cover or clip it: a modal
// dialog with a backdrop up to 1023px, a popover capped to the stage height (scrolling inside) on desktop. Escape closes; focus returns.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GRID_PCTS, GRID_LABEL } from './canvasGuides';

const ITEMS = [
  ['grid', 'Grid', 'Neutral grid from the garment’s top-left corner'],
  ['snap', 'Snap', 'Pull elements onto the centre, grid and guides while dragging'],
  ['rulers', 'Rulers', '% of the garment; drag from a ruler to add a guide'],
  ['centre', 'Centre line', 'Dashed line down the garment centre; elements snap to it'],
  ['smart', 'Smart guides', 'Snap to other elements’ edges and centres, with guide lines'],
];
const narrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

export default function GuidesMenu({ guides, setGuides }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(narrow);
  const [pos, setPos] = useState(null);
  const btn = useRef(null), panel = useRef(null);
  const id = useId(), titleId = useId();
  const close = () => { setOpen(false); btn.current?.focus(); };
  // Desktop: under the button, never past the stage (the panel scrolls inside instead).
  useLayoutEffect(() => {
    if (!open) return;
    const m = narrow();
    setModal(m);
    if (m || !btn.current) return;
    const r = btn.current.getBoundingClientRect(), stage = btn.current.closest('.ds-cv')?.getBoundingClientRect();
    const top = r.bottom + 6;
    setPos({ left: r.left, top, maxHeight: Math.max(160, (stage ? stage.bottom : innerHeight) - top - 8) });
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector('input')?.focus();
    const down = e => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key, true); };
  }, [open]);
  const on = Object.entries(guides).filter(([k, v]) => !['size', 'v'].includes(k) && v).length;
  const root = btn.current?.closest('.ds') ?? (typeof document !== 'undefined' ? document.body : null);
  const rows = ITEMS.map(([k, label, hint]) => (
    <div key={k} className="ds-guides-row">
      <label>
        <input type="checkbox" checked={!!guides[k]} onChange={e => setGuides(g => ({ ...g, [k]: e.target.checked }))}/>
        <span><b>{label}</b><small>{hint}</small></span>
      </label>
      {k === 'grid' && (
        <select aria-label="Grid size" value={guides.size} disabled={!guides.grid} onChange={e => setGuides(g => ({ ...g, size: Number(e.target.value) }))}>
          {GRID_PCTS.map(s => <option key={s} value={s}>{GRID_LABEL[s]}</option>)}
        </select>
      )}
    </div>
  ));
  return (
    <div className="ds-guides">
      <button ref={btn} type="button" className="ds-guides-btn" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" aria-label={`Guides${on ? `, ${on} on` : ''}`}
        onClick={() => setOpen(o => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
        <span className="ds-guides-txt">Guides</span>{on > 0 && <span className="ds-guides-n" aria-hidden="true">{on}</span>}
      </button>
      {open && root && createPortal(modal ? (
        <div className="ds-guides-modal">
          <div className="ds-guides-scrim" aria-hidden="true" onClick={close}/>
          <div ref={panel} id={id} className="ds-guides-pop" data-modal="1" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ds-guides-head"><h2 id={titleId}>Guides</h2><button type="button" className="ds-guides-close" aria-label="Close" onClick={close}><X size={18} aria-hidden="true"/></button></div>
            {rows}
          </div>
        </div>
      ) : (
        <div ref={panel} id={id} className="ds-guides-pop" role="dialog" aria-label="Guides" style={pos ? { position: 'fixed', left: pos.left, top: pos.top, maxHeight: pos.maxHeight } : { visibility: 'hidden' }}>
          {rows}
        </div>
      ), root)}
    </div>
  );
}
