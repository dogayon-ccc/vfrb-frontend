// Navigator (Photoshop-style), docked in the Pieces column on desktop: a live thumbnail of the 2D canvas with the part the stage
// shows framed; drag or click the frame to move the view, arrow keys step it, and the slider zooms. Display only: nothing is saved.
import { useEffect, useRef } from 'react';
import { Minus, Plus, Scan } from 'lucide-react';
import { visibleFrac } from './navigatorView';

const THUMB_W = 184, REFRESH_MS = 400;

export default function Navigator({ source, size, view, zoom, shown, min, max, setZoom, onFit, onPanTo, fitted }) {
  const thumb = useRef(null), drag = useRef(false);
  const ratio = size.w > 0 ? size.h / size.w : 1.2;
  const w = THUMB_W, h = Math.round(Math.min(180, THUMB_W * ratio)), tw = Math.round(h / ratio);
  // Copies the live canvas a few times a second while the page is visible (grid and guides included, as on the stage).
  useEffect(() => {
    const draw = () => {
      const src = source.current, c = thumb.current;
      if (!src || !c || document.hidden || !src.width) return;
      const k = window.devicePixelRatio || 1;
      if (c.width !== Math.round(tw * k)) { c.width = Math.round(tw * k); c.height = Math.round(h * k); }
      const x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height);
      x.drawImage(src, 0, 0, c.width, c.height);
    };
    draw();
    const t = setInterval(draw, REFRESH_MS);
    return () => clearInterval(t);
  }, [source, tw, h]);

  const f = visibleFrac(view, size);
  const at = (e) => { const r = thumb.current.getBoundingClientRect(); onPanTo((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; at(e); };
  const move = (e) => { if (drag.current) at(e); };
  const up = () => { drag.current = false; };
  const key = (e) => {
    if (!f) return;
    const step = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    if (!step) return;
    e.preventDefault();
    onPanTo(f.x + f.w / 2 + step[0], f.y + f.h / 2 + step[1]);
  };
  const pct = Math.round(zoom * 100); // slider units: 100 = Fit; `shown` is the scale the stage reads out

  return (
    <section className="ds-navi" aria-labelledby="ds-navi-h">
      <div className="ds-dock-head">
        <h3 id="ds-navi-h">Navigator</h3>
        <output className="ds-navi-pct" aria-live="off">{shown}%</output>
      </div>
      <div className="ds-navi-box" style={{ width: w, height: h }}>
        <div className="ds-navi-art" style={{ width: tw, height: h }} tabIndex={0} role="group" onKeyDown={key}
          aria-label="Navigator: drag the frame or use the arrow keys to move the view" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <canvas ref={thumb} style={{ width: tw, height: h }} aria-hidden="true"/>
          {f && !fitted && <span className="ds-navi-frame" aria-hidden="true"
            style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}/>}
        </div>
      </div>
      <div className="ds-navi-zoom">
        <button type="button" className="ds-dock-eye" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(min, +(z - 0.15).toFixed(2)))}><Minus size={15} aria-hidden="true"/></button>
        <input type="range" min={Math.round(min * 100)} max={Math.round(max * 100)} step={5} value={pct} aria-label="Zoom" aria-valuetext={`${shown}%`}
          onChange={e => setZoom(Number(e.target.value) / 100)}/>
        <button type="button" className="ds-dock-eye" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(max, +(z + 0.15).toFixed(2)))}><Plus size={15} aria-hidden="true"/></button>
        <button type="button" className="ds-dock-eye" aria-label="Fit" aria-pressed={fitted} title="Fit (Ctrl+0)" onClick={onFit}><Scan size={15} aria-hidden="true"/></button>
      </div>
    </section>
  );
}
