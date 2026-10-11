// Stage grid, rulers and ruler guides, all garment-relative (origin = the garment's top-left; x in % of its width, y in % of its
// height). Grid lines and ruler ticks come from the same maths, so they coincide. DOM only: never saved, exported or undoable.
import { useEffect, useRef, useState } from 'react';
import { relativeTicks, gridLines, gridFade, GRID_ALPHA, toPct, fromPct, snapGuidePct } from './canvasGuides';

export const RULER_H = 20, RULER_W = 34; // ruler bands: top ruler height, left ruler width (the pane shifts by them)

// Neutral grid over the whole stage, under the artboard. `view` = where canvas (0, 0) lands in the pane and at what scale.
export function StageGrid({ view, g, pct, dx, dy, w, h }) {
  const s = view.s, cx = (g.width * pct / 100) * s, cy = (g.height * pct / 100) * s;
  const fade = gridFade(Math.min(cx, cy));
  const keep = l => fade > 0 || l.v % 50 === 0; // faded out: only the 0/50/100... lines stay (each always has a ruler tick)
  const xs = gridLines(dx + view.ox + g.left * s, cx, pct, 0, w).filter(keep), ys = gridLines(dy + view.oy + g.top * s, cy, pct, 0, h).filter(keep);
  const line = (l, axis) => <line key={axis + l.v} data-v={l.v} className={l.major ? 'ds-sgrid-major' : undefined}
    {...(axis === 'x' ? { x1: l.at, x2: l.at, y1: 0, y2: h } : { y1: l.at, y2: l.at, x1: 0, x2: w })}/>;
  return (
    <svg className="ds-sgrid" aria-hidden="true" width={w} height={h} style={{ '--ds-ga': GRID_ALPHA.minor * fade, '--ds-gA': GRID_ALPHA.major * Math.max(fade, 0.6) }}>
      <g className="ds-sgrid-x">{xs.map(l => line(l, 'x'))}</g>
      <g className="ds-sgrid-y">{ys.map(l => line(l, 'y'))}</g>
    </svg>
  );
}

// Rulers along the full top and left stage edges in % of the garment (negative before it, beyond 100 after it); 0, 50 and 100 are
// emphasised; a live marker follows the pointer; dragging from a ruler pulls out a guide (top ruler: horizontal, left: vertical).
export function PinnedRulers({ view, g, fitRef, onGuide }) {
  const { ox, oy, s, pw, ph } = view;
  const xs = relativeTicks(ox, s, pw, g.left, g.width, 30), ys = relativeTicks(oy, s, ph, g.top, g.height, 24);
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
    ? <g key={t.v} data-v={t.v} data-key={t.key || undefined}><line x1={t.at} y1={t.key ? 4 : t.major ? 9 : 14} x2={t.at} y2={RULER_H}/>{t.major && <text x={t.at + 3} y={13} fontSize={11}>{t.v}</text>}</g>
    : <g key={t.v} data-v={t.v} data-key={t.key || undefined}><line x1={t.key ? 4 : t.major ? RULER_W - 9 : RULER_W - 5} y1={t.at} x2={RULER_W} y2={t.at}/>{t.major && <text x={2} y={t.at - 3} fontSize={11}>{t.v}</text>}</g>);
  const gx0 = Math.max(0, fromPct(0, ox, s, g.left, g.width)), gx1 = Math.min(pw, fromPct(100, ox, s, g.left, g.width));
  const gy0 = Math.max(0, fromPct(0, oy, s, g.top, g.height)), gy1 = Math.min(ph, fromPct(100, oy, s, g.top, g.height));
  return (
    <>
      <div className="ds-ruler-corner" aria-hidden="true">%</div>
      <svg className="ds-ruler ds-ruler-x" aria-label="Horizontal ruler, % of garment width: drag down to add a guide" role="img" width={pw} height={RULER_H} onPointerDown={start('h')}>
        {gx1 > gx0 && <rect className="ds-ruler-art" x={gx0} y={0} width={gx1 - gx0} height={RULER_H}/>}
        {xs.map(t => tick(t, 'x'))}
        <line ref={mx} className="ds-ruler-mark" x1={0} y1={0} x2={0} y2={RULER_H}/>
      </svg>
      <svg className="ds-ruler ds-ruler-y" aria-label="Vertical ruler, % of garment height: drag right to add a guide" role="img" width={RULER_W} height={ph} onPointerDown={start('v')}>
        {gy1 > gy0 && <rect className="ds-ruler-art" x={0} y={gy0} width={RULER_W} height={gy1 - gy0}/>}
        {ys.map(t => tick(t, 'y'))}
        <line ref={my} className="ds-ruler-mark" x1={0} y1={0} x2={RULER_W} y2={0}/>
      </svg>
      {drag && <GuideLine guide={drag} view={view} g={g} live/>}
    </>
  );
}

// One guide across the stage at a garment %; double-click (or Delete when focused) removes it.
export function GuideLine({ guide, view, g, onRemove = null, live = false }) {
  const v = guide.axis === 'v';
  const at = v ? RULER_W + fromPct(guide.pct, view.ox, view.s, g.left, g.width) : RULER_H + fromPct(guide.pct, view.oy, view.s, g.top, g.height);
  return (
    <div className="ds-rguide" data-axis={guide.axis} data-live={live || undefined} style={v ? { left: at } : { top: at }}
      tabIndex={live ? -1 : 0} role={live ? undefined : 'separator'} aria-orientation={v ? 'vertical' : 'horizontal'} aria-label={`Guide at ${guide.pct}%`}
      title={live ? undefined : `Guide at ${guide.pct}% · double-click to remove`} onDoubleClick={onRemove ?? undefined}
      onKeyDown={onRemove ? e => { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); onRemove(); } } : undefined}>
      <span>{guide.pct}%</span>
    </div>
  );
}
