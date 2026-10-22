// Contextual style controls for the selected element, shown inside SelectionInspector (RightInfoPanel.jsx): text, shape, and
// the flip / stacking row every element shares. Fabric stays the source of truth: each control reads the object and writes
// through updateSelected (live while dragging, one undo step on release).
import { FlipHorizontal2, FlipVertical2, BringToFront, ArrowUp, ArrowDown, SendToBack } from 'lucide-react';
import { FONTS, LEGACY_FONTS } from './dsShared';
import { webFontFor, nearestWeight, numericWeight } from './studioFonts';
import { clampCurve, gradientSpec, readGradient, readAdjust, adjustFilters, CLIP_KINDS, clipFor } from './overlayTools';

// Fabric is already loaded once a selection exists; this resolves from the module cache.
const withFabric = fn => import('fabric').then(m => fn(m.fabric ?? m.default ?? m));

const HEX = /^#[0-9a-f]{6}$/i;
const hexOr = (c, d) => (HEX.test(c ?? '') ? c : d);
const WEIGHT_NAME = { 400: 'Regular', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };
const SHADOWS = { none: null, soft: { color: 'rgba(0,0,0,.35)', blur: 8, offsetX: 0, offsetY: 3 }, hard: { color: 'rgba(0,0,0,.6)', blur: 0, offsetX: 2, offsetY: 2 } };
const shadowKind = s => (!s ? 'none' : s.blur > 0 ? 'soft' : 'hard');
const CATS = [...new Set(FONTS.map(f => f.cat))];

function Range({ label, value, min, max, step = 1, onLive, onCommit, disabled }) {
  return (
    <label className="ds-ins-range">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={e => onLive(Number(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit}/>
    </label>
  );
}

function Seg({ label, items, value, onPick, disabled }) {
  return (
    <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label={label}>
      {items.map(([id, text, title]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} title={title} aria-label={title ?? text} disabled={disabled}
          onClick={() => onPick(id)}>{text}</button>
      ))}
    </div>
  );
}

// Solid or two-colour gradient fill, for shapes and text. Solid returns to the gradient's first colour.
function FillSection({ o, live, commit, locked, fallback }) {
  const g = readGradient(o.fill), from = g?.from ?? hexOr(o.fill, fallback);
  const paint = (f, t, d) => withFabric(fabric => live({ fill: new fabric.Gradient(gradientSpec(f, t, d)) }));
  return (
    <>
      <Seg label="Fill style" value={g ? g.dir : 'solid'} disabled={locked}
        onPick={k => (k === 'solid' ? (live({ fill: from }), commit()) : paint(from, g?.to ?? '#ffffff', k).then(commit))}
        items={[['solid', 'Solid'], ['v', 'Gradient ↓', 'Vertical gradient'], ['h', 'Gradient →', 'Horizontal gradient']]}/>
      {g && <Colour label="Gradient end" value={hexOr(g.to, '#ffffff')} disabled={locked} onLive={c => paint(g.from, c, g.dir)} onCommit={commit}/>}
    </>
  );
}

// Logos and artwork: brightness, contrast, greyscale and a crop shape. Fabric filters and clipPath, so they save and reach 3D.
export function ImageStyleSection({ o, live, commit, locked }) {
  const a = readAdjust(o), clip = o.__clip ?? 'none';
  const adjust = next => withFabric(fabric => { o.set({ filters: adjustFilters(fabric, { ...a, ...next }) }); o.applyFilters(); live({}); });
  return (
    <>
      <Range label={`Brightness ${a.b}`} value={a.b} min={-100} max={100} disabled={locked} onLive={b => adjust({ b })} onCommit={commit}/>
      <Range label={`Contrast ${a.c}`} value={a.c} min={-100} max={100} disabled={locked} onLive={c => adjust({ c })} onCommit={commit}/>
      <Seg label="Colour mode" value={a.grey ? 'grey' : 'colour'} disabled={locked} onPick={k => adjust({ grey: k === 'grey' }).then(commit)}
        items={[['colour', 'Colour'], ['grey', 'Greyscale']]}/>
      <p className="ds-group-label" style={{ marginTop: 12 }}>Crop shape</p>
      <Seg label="Crop shape" value={clip} disabled={locked}
        onPick={k => withFabric(fabric => { live({ clipPath: clipFor(fabric, k, o.width, o.height), __clip: k }); commit(); })} items={CLIP_KINDS}/>
    </>
  );
}

const Colour = ({ label, value, onLive, onCommit, disabled }) => (
  <label className="ds-ins-field ds-ins-wide">
    <span>{label}</span>
    <input type="color" value={value} disabled={disabled} onChange={e => onLive(e.target.value)} onBlur={onCommit}/>
  </label>
);

export function TextStyleSection({ o, set, live, commit, locked }) {
  const web = webFontFor(o.fontFamily), legacy = !web && LEGACY_FONTS.find(f => f.css === o.fontFamily);
  const weight = numericWeight(o.fontWeight), text = o.text ?? '';
  const caseNow = text === text.toUpperCase() ? 'upper' : text === text.toLowerCase() ? 'lower' : 'mixed';
  const outline = o.strokeWidth > 0 && o.stroke ? o.strokeWidth : 0;
  const curve = clampCurve(o.__curve);
  const pickFont = id => { const f = FONTS.find(x => x.id === id); if (f) set({ fontFamily: f.css, fontWeight: nearestWeight(f, weight) }); };
  return (
    <>
      <label className="ds-ins-field ds-ins-wide">
        <span>Font</span>
        <select value={web?.id ?? ''} disabled={locked} onChange={e => pickFont(e.target.value)}>
          {!web && <option value="">{legacy ? `${legacy.label} (older design)` : 'Current'}</option>}
          {CATS.map(c => <optgroup key={c} label={c}>{FONTS.filter(f => f.cat === c).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</optgroup>)}
        </select>
      </label>
      {web && web.weights.length > 1 && (
        <Seg label="Font weight" value={nearestWeight(web, weight)} disabled={locked} onPick={w => set({ fontWeight: w })}
          items={web.weights.map(w => [w, WEIGHT_NAME[w] ?? w])}/>
      )}
      <Range label={`Size ${Math.round(o.fontSize ?? 18)}px`} value={Math.round(o.fontSize ?? 18)} min={8} max={120} disabled={locked}
        onLive={v => live({ fontSize: v })} onCommit={commit}/>
      <Range label={`Letter spacing ${Math.round((o.charSpacing ?? 0) / 10)}`} value={o.charSpacing ?? 0} min={-100} max={800} step={10} disabled={locked}
        onLive={v => live({ charSpacing: v })} onCommit={commit}/>
      {text.includes('\n') && (
        <Range label={`Line height ${(o.lineHeight ?? 1.16).toFixed(2)}`} value={o.lineHeight ?? 1.16} min={0.8} max={2.5} step={0.05} disabled={locked}
          onLive={v => live({ lineHeight: v })} onCommit={commit}/>
      )}
      <Seg label="Text alignment" value={o.textAlign ?? 'left'} disabled={locked} onPick={a => set({ textAlign: a })}
        items={[['left', 'Left'], ['center', 'Centre'], ['right', 'Right']]}/>
      <Seg label="Letter case" value={caseNow} disabled={locked}
        onPick={c => set({ text: c === 'upper' ? text.toUpperCase() : c === 'lower' ? text.toLowerCase() : text.toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase()) })}
        items={[['upper', 'AB', 'Uppercase'], ['lower', 'ab', 'Lowercase'], ['mixed', 'Ab', 'Capitalise words']]}/>
      <Range label={`Curve ${curve === 0 ? 'off' : curve > 0 ? `arch ${curve}` : `dip ${-curve}`}`} value={curve} min={-100} max={100} disabled={locked}
        onLive={v => live({ __curve: v })} onCommit={commit}/>
      {curve !== 0 && <p className="ds-ins-note">Curved text is edited in the Content box above.</p>}

      <FillSection o={o} live={live} commit={commit} locked={locked} fallback="#000000"/>

      <p className="ds-group-label" style={{ marginTop: 12 }}>Outline &amp; shadow</p>
      <Range label={`Outline ${outline ? `${outline}px` : 'off'}`} value={outline} min={0} max={8} step={0.5} disabled={locked}
        onLive={v => live({ strokeWidth: v, stroke: v ? hexOr(o.stroke, '#000000') : null, paintFirst: 'stroke', strokeLineJoin: 'round' })} onCommit={commit}/>
      {outline > 0 && <Colour label="Outline colour" value={hexOr(o.stroke, '#000000')} disabled={locked} onLive={c => live({ stroke: c })} onCommit={commit}/>}
      <Seg label="Shadow" value={shadowKind(o.shadow)} disabled={locked} onPick={k => set({ shadow: SHADOWS[k] && { ...SHADOWS[k] } })}
        items={[['none', 'No shadow'], ['soft', 'Soft'], ['hard', 'Hard']]}/>
    </>
  );
}

export function ShapeStyleSection({ o, live, commit, locked }) {
  const isLine = o.type === 'line', rounded = o.type === 'rect';
  const stroke = o.strokeWidth ?? 0;
  return (
    <>
      {!isLine && <Colour label={readGradient(o.fill) ? 'Gradient start' : 'Fill'} value={readGradient(o.fill)?.from ?? hexOr(o.fill, '#02c39a')} disabled={locked}
        onLive={c => { const g = readGradient(o.fill); g ? withFabric(f => live({ fill: new f.Gradient(gradientSpec(c, g.to, g.dir)) })) : live({ fill: c }); }} onCommit={commit}/>}
      {!isLine && <FillSection o={o} live={live} commit={commit} locked={locked} fallback="#02c39a"/>}
      <Colour label={isLine ? 'Colour' : 'Border colour'} value={hexOr(o.stroke, '#000000')} disabled={locked}
        onLive={c => live({ stroke: c, ...(!isLine && !stroke && { strokeWidth: 2 }) })} onCommit={commit}/>
      <Range label={`${isLine ? 'Thickness' : 'Border'} ${stroke ? `${stroke}px` : 'none'}`} value={stroke} min={isLine ? 1 : 0} max={isLine ? 24 : 12} step={0.5}
        disabled={locked} onLive={v => live({ strokeWidth: v, ...(!HEX.test(o.stroke ?? '') && { stroke: '#000000' }) })} onCommit={commit}/>
      {rounded && (
        <Range label={`Corner radius ${Math.round(o.rx ?? 0)}`} value={Math.round(o.rx ?? 0)} min={0} max={Math.round(Math.min(o.width, o.height) / 2)}
          disabled={locked} onLive={v => live({ rx: v, ry: v })} onCommit={commit}/>
      )}
    </>
  );
}

// Flip and stacking order, for any single element.
export function ArrangeRow({ o, set, arrangeLayer, locked }) {
  const btn = (key, title, Icon, onClick, pressed) => (
    <button key={key} type="button" className="ds-act" title={title} aria-label={title} aria-pressed={pressed} disabled={locked} onClick={onClick}>
      <Icon size={16} aria-hidden="true"/>
    </button>
  );
  return (
    <div className="ds-ins-align" role="group" aria-label="Flip and order">
      {btn('fx', 'Flip horizontally', FlipHorizontal2, () => set({ flipX: !o.flipX }), !!o.flipX)}
      {btn('fy', 'Flip vertically', FlipVertical2, () => set({ flipY: !o.flipY }), !!o.flipY)}
      {arrangeLayer && <>
        {btn('front', 'Bring to front (Ctrl+Shift+])', BringToFront, () => arrangeLayer('front'))}
        {btn('fwd', 'Bring forward (Ctrl+])', ArrowUp, () => arrangeLayer('forward'))}
        {btn('bwd', 'Send backward (Ctrl+[)', ArrowDown, () => arrangeLayer('backward'))}
        {btn('back', 'Send to back (Ctrl+Shift+[)', SendToBack, () => arrangeLayer('back'))}
      </>}
    </div>
  );
}
