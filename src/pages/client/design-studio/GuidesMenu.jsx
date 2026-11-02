// One "View" button in the stage's top lane, labelled at every width. Its panel holds the view toggles (Grid, Rulers, Snap, Guides),
// grid size and Smart guides (2D only), the stage light and what the 2D base is (Sketch / Derived / Photo). It is rendered at the Studio
// root so nothing can cover or clip it: a modal dialog with a backdrop up to 1023px, a popover capped to the stage height on desktop.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Grid3x3, Ruler, Magnet, Crosshair } from 'lucide-react';
import { GRID_PCTS, GRID_LABEL } from './canvasGuides';
import useDialogFocus from '../../../hooks/useDialogFocus';

export const UNITS_NOTE = 'Rulers show template units, not centimetres. Real sizes appear only after VFRB confirms a scale.';
// [key, label, hint, icon, shortcut]
const TOGGLES = [
  ['grid', 'Grid', 'Grid over the garment, from its top-left corner', Grid3x3, 'Shift+G'],
  ['rulers', 'Rulers', 'Template units 0 to 100; drag from a ruler to add a guide', Ruler, 'R'],
  ['snap', 'Snap', 'Pull elements onto the grid step, centre and guides while dragging', Magnet, null],
  ['guides', 'Guides', 'Dashed centre line and chest line', Crosshair, null],
];
const SMART = ['smart', 'Smart guides', 'Snap to other elements’ edges and centres, with guide lines'];

// The four view toggles as 44px aria-pressed buttons: icon-only in the stage lane, labelled in the View panel.
export function ViewToggles({ guides, setGuides, labelled = false }) {
  return (
    <div className="ds-vt" role="group" aria-label="View toggles" data-labelled={labelled || undefined}>
      {TOGGLES.map(([k, label, hint, Icon, key]) => (
        <button key={k} type="button" className="ds-vt-btn" aria-pressed={!!guides[k]} aria-label={labelled ? undefined : label}
          aria-keyshortcuts={key ?? undefined} title={`${hint}${key ? ` (${key})` : ''}`} onClick={() => setGuides(g => ({ ...g, [k]: !g[k] }))}>
          <Icon size={16} aria-hidden="true"/>{labelled && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
const narrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

// `open` / `onOpenChange` (optional): opened from elsewhere too (phones: More > View, the lane button is hidden there).
export default function GuidesMenu({ guides, setGuides, showGuides = true, base = null, dark = false, setDark = null, open: openProp, onOpenChange }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = v => { const next = typeof v === 'function' ? v(open) : v; if (onOpenChange) onOpenChange(next); else setOpenState(next); };
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
  // Both forms trap Tab; the desktop popover also closes on an outside click.
  useDialogFocus(panel, { active: open, onClose: close, initial: '.ds-vt-btn, input' });
  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector('.ds-vt-btn, input')?.focus();
    const down = e => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key, true); };
  }, [open]);
  const on = showGuides ? Object.entries(guides).filter(([k, v]) => !['size', 'v'].includes(k) && v).length : 0;
  const root = btn.current?.closest('.ds') ?? (typeof document !== 'undefined' ? document.body : null);
  const guideRows = !showGuides ? null : (
    <>
      <ViewToggles guides={guides} setGuides={setGuides} labelled/>
      <div className="ds-guides-row">
        <label htmlFor={`${id}-size`}><span><b>Grid step</b><small>Snap and arrow-key nudge move by this step</small></span></label>
        <select id={`${id}-size`} aria-label="Grid size" value={guides.size} onChange={e => setGuides(g => ({ ...g, size: Number(e.target.value) }))}>
          {GRID_PCTS.map(s => <option key={s} value={s}>{GRID_LABEL[s]}</option>)}
        </select>
      </div>
      <div className="ds-guides-row">
        <label>
          <input type="checkbox" checked={!!guides[SMART[0]]} onChange={e => setGuides(g => ({ ...g, [SMART[0]]: e.target.checked }))}/>
          <span><b>{SMART[1]}</b><small>{SMART[2]}</small></span>
        </label>
      </div>
      <p className="ds-guides-units">{UNITS_NOTE}</p>
    </>
  );
  const rows = (
    <>
      {showGuides && <h3 className="ds-guides-sec">Guides</h3>}
      {guideRows}
      {setDark && (
        <>
          <h3 className="ds-guides-sec">Stage</h3>
          <div className="ds-guides-row">
            <label>
              <input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)}/>
              <span><b>Dark stage</b><small>See the design on a dark background</small></span>
            </label>
          </div>
        </>
      )}
      {base && <p className="ds-guides-base"><b>{base.label}</b> {base.title}</p>}
    </>
  );
  return (
    <div className="ds-guides">
      <button ref={btn} type="button" className="ds-guides-btn" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" aria-label={`View${on ? `, ${on} guides on` : ''}`}
        onClick={() => setOpen(o => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        <span className="ds-guides-txt">View</span>{on > 0 && <span className="ds-guides-n" aria-hidden="true">{on}</span>}
      </button>
      {open && root && createPortal(modal ? (
        <div className="ds-guides-modal">
          <div className="ds-guides-scrim" aria-hidden="true" onClick={close}/>
          <div ref={panel} id={id} className="ds-guides-pop" data-modal="1" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="ds-guides-head"><h2 id={titleId}>View</h2><button type="button" className="ds-guides-close" aria-label="Close" onClick={close}><X size={18} aria-hidden="true"/></button></div>
            {rows}
          </div>
        </div>
      ) : (
        <div ref={panel} id={id} className="ds-guides-pop" role="dialog" aria-label="View" style={pos ? { position: 'fixed', left: pos.left, top: pos.top, maxHeight: pos.maxHeight } : { position: 'fixed', left: 0, top: 0, visibility: 'hidden' }}>
          {rows}
        </div>
      ), root)}
    </div>
  );
}
