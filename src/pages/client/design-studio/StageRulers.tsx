// Stage rulers and ruler guides in template units (origin = the garment's top-left; 0-100 across its width and down its height). The
// grid is drawn on the live canvas from the same maths, so grid lines land on ruler ticks. DOM only: never saved, exported or undoable.
import { useEffect, useRef, useState } from 'react';
import { relativeTicks, toPct, fromPct, snapGuidePct } from './canvasGuides';

export const RULER_H = 20, RULER_W = 34; // ruler bands: top ruler height, left ruler width (the pane shifts by them)

// Rulers along the full top and left stage edges in template units (ticks before 0 and past 100, labels 0 to 100); 0, 50 and 100 are
// emphasised; a live marker follows the pointer; dragging from a ruler pulls out a guide (top ruler: horizontal, left: vertical).
// sel: the selected object's box in template units ({ x, y, w, h }), highlighted on both rulers. Display only.
export function PinnedRulers({ view, g, fitRef, onGuide, gridPct = 0, sel = null }: any) {
  const { ox, oy, s, pw, ph } = view;
  const xs = relativeTicks(ox, s, pw, g.left, g.width, 30, gridPct), ys = relativeTicks(oy, s, ph, g.top, g.height, 24, gridPct);
  const mx = useRef(null), my = useRef(null);
  const [drag, setDrag] = useState(null); // { axis, pct } while a guide is being pulled out
  // Pointer marker: moved directly (no React render per pointer move).
  useEffect(() => {
    const fit = fitRef.current;
    if (!fit) return undefined;
    const move = e => { const r = fit.getBoundingClientRect(); const x = e.clientX - r.left - RULER_W, y = e.clientY - r.top - RULER_H;
      if (mx.current) { mx.current.style.transform = `translateX(${x}px)`; mx.current.style.opacity = x >= 0 && x <= pw ? 1 : 0; }
      if (my.current) { my.current.style.transform = `translateY(${y}px)`; my.current.style.opacity = y >= 0 && y <= ph ? 1 : 0; } };
    const out = () => { if (mx.current) mx.current.style.opacity = 0; if (my.current) my.current.style.opacity = 0; };
    fit.addEventListener('pointermove', move); fit.addEventListener('pointerleave', out);
    return () => { fit.removeEventListener('pointermove', move); fit.removeEventListener('pointerleave', out); };
  }, [fitRef, pw, ph]);
  const start = (axis) => (e) => {
    e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId);
    const r = fitRef.current.getBoundingClientRect();
    const at = ev => (axis === 'h' ? snapGuidePct(toPct(ev.clientY - r.top - RULER_H, oy, s, g.top, g.height)) : snapGuidePct(toPct(ev.clientX - r.left - RULER_W, ox, s, g.left, g.width)));
    const onRuler = ev => (axis === 'h' ? ev.clientY - r.top < RULER_H : ev.clientX - r.left < RULER_W);
    setDrag({ axis, pct: at(e) });
    const mv = ev => setDrag({ axis, pct: at(ev) });
    const up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); setDrag(null); if (!onRuler(ev)) onGuide({ axis, pct: at(ev) }); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  };
  const tick = (t, axis) => (axis === 'x'
    ? <g key={t.v} data-v={t.v} data-key={t.key || undefined}><line x1={t.at} y1={t.key ? 4 : t.major ? 9 : 14} x2={t.at} y2={RULER_H}/>{t.label && <text x={t.at + 3} y={15} fontSize={13}>{t.v}</text>}</g>
    : <g key={t.v} data-v={t.v} data-key={t.key || undefined}><line x1={t.key ? 4 : t.major ? RULER_W - 9 : RULER_W - 5} y1={t.at} x2={RULER_W} y2={t.at}/>{t.label && <text x={2} y={t.at - 3} fontSize={13}>{t.v}</text>}</g>);
  const gx0 = Math.max(0, fromPct(0, ox, s, g.left, g.width)), gx1 = Math.min(pw, fromPct(100, ox, s, g.left, g.width));
  const gy0 = Math.max(0, fromPct(0, oy, s, g.top, g.height)), gy1 = Math.min(ph, fromPct(100, oy, s, g.top, g.height));
  return (
    <>
      <button type="button" className="ds-ruler-corner" aria-label="Ruler units: template units, not centimetres" data-tip="Template units, not centimetres">u</button>
      <svg className="ds-ruler ds-ruler-x" aria-label="Horizontal ruler, template units 0 to 100 across the garment: drag down to add a guide" role="img" width={pw} height={RULER_H} onPointerDown={start('h')}>
        {gx1 > gx0 && <rect className="ds-ruler-art" x={gx0} y={0} width={gx1 - gx0} height={RULER_H}/>}
        {sel && <rect className="ds-ruler-sel" x={fromPct(sel.x, ox, s, g.left, g.width)} y={0} width={Math.max(1, (sel.w / 100) * g.width * s)} height={RULER_H}/>}
        {xs.map(t => tick(t, 'x'))}
        <line ref={mx} className="ds-ruler-mark" x1={0} y1={0} x2={0} y2={RULER_H}/>
      </svg>
      <svg className="ds-ruler ds-ruler-y" aria-label="Vertical ruler, template units 0 to 100 down the garment: drag right to add a guide" role="img" width={RULER_W} height={ph} onPointerDown={start('v')}>
        {gy1 > gy0 && <rect className="ds-ruler-art" x={0} y={gy0} width={RULER_W} height={gy1 - gy0}/>}
        {sel && <rect className="ds-ruler-sel" x={0} y={fromPct(sel.y, oy, s, g.top, g.height)} width={RULER_W} height={Math.max(1, (sel.h / 100) * g.height * s)}/>}
        {ys.map(t => tick(t, 'y'))}
        <line ref={my} className="ds-ruler-mark" x1={0} y1={0} x2={RULER_W} y2={0}/>
      </svg>
      {drag && <GuideLine guide={drag} view={view} g={g} live/>}
    </>
  );
}

// One guide across the stage at a template-unit position; double-click (or Delete when focused) removes it.
export function GuideLine({ guide, view, g, onRemove = null, live = false }: any) {
  const v = guide.axis === 'v';
  const at = v ? RULER_W + fromPct(guide.pct, view.ox, view.s, g.left, g.width) : RULER_H + fromPct(guide.pct, view.oy, view.s, g.top, g.height);
  return (
    <div className="ds-rguide" data-axis={guide.axis} data-live={live || undefined} style={v ? { left: at } : { top: at }}
      tabIndex={live ? -1 : 0} role={live ? undefined : 'separator'} aria-orientation={v ? 'vertical' : 'horizontal'} aria-label={`Guide at ${guide.pct}`}
      title={live ? undefined : `Guide at ${guide.pct} · double-click to remove`} onDoubleClick={onRemove ?? undefined}
      onKeyDown={onRemove ? e => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); onRemove(); } } : undefined}>
      <span>{guide.pct}</span>
    </div>
  );
}
