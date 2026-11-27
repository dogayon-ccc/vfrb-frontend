// Controls for the selected piece of panel artwork: content and style first, then placement, then order.
import type { ReactNode } from 'react';
import { ALL_FONTS, fontProps, weightsFor, type ArtInfo } from './panelArtOps';
import type { PanelSpot } from './panelSpots';
import type { PanelSide } from './pilotPanels';

export type AlignEdge = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
const WEIGHT_NAMES: Record<number, string> = { 400: 'Regular', 700: 'Bold', 800: 'Extra bold', 900: 'Black' };

export interface PanelArtInspectorProps {
  side: PanelSide; sel: ArtInfo | null; count: number; palette: [string, string][]; spots: PanelSpot[]; readOnly: boolean; textEyedropper: ReactNode;
  patch: (p: Record<string, unknown>) => void; setWidthPct: (v: number) => void; placeAt: (s: PanelSpot) => void; alignTo: (e: AlignEdge) => void;
  onCopy: () => void; onMirror: () => void; onOrder: (up: boolean) => void; onDelete: () => void;
}

export default function PanelArtInspector(p: PanelArtInspectorProps) {
  const { side, sel, patch, readOnly } = p;
  const setFont = async (css: string, weight: number) => patch(await fontProps(css, weight));
  const colourLabel = sel?.kind === 'text' ? 'Text colour' : sel?.kind === 'line' ? 'Line colour' : 'Fill colour';
  return (
    <section>
      <h2>Artwork on the {side}</h2>
      {!sel && <p className="ps-note">{p.count === 0 ? 'Nothing here yet. Add text, an image or a shape.' : 'Select a piece of artwork on the panel to change it.'}</p>}
      {sel && (
        <fieldset className="ps-art" disabled={readOnly}>
          {sel.kind === 'text' && (
            <>
              <label className="ps-field">Text<textarea value={sel.text} rows={2} maxLength={120} onChange={e => patch({ text: e.target.value })} /></label>
              <label className="ps-field">Font
                <select value={ALL_FONTS.find(f => f[1] === sel.font)?.[1] ?? ''} onChange={e => void setFont(e.target.value, sel.weight)}>
                  {ALL_FONTS.map(([n, v]) => <option key={n} value={v}>{n}</option>)}
                </select>
              </label>
              <label className="ps-field">Weight
                <select value={sel.weight} onChange={e => void setFont(sel.font, Number(e.target.value))}>
                  {weightsFor(sel.font).map(w => <option key={w} value={w}>{WEIGHT_NAMES[w] ?? w}</option>)}
                </select>
              </label>
              <div className="ps-row" role="group" aria-label="Text style and alignment">
                <button type="button" className="ps-btn ps-btn--quiet" aria-pressed={sel.italic} onClick={() => patch({ fontStyle: sel.italic ? 'normal' : 'italic' })}>Italic</button>
                <button type="button" className="ps-btn ps-btn--quiet" onClick={() => patch({ text: sel.text.toUpperCase() })}>UPPERCASE</button>
                {(['left', 'center', 'right'] as const).map(a => <button key={a} type="button" className="ps-btn ps-btn--quiet" aria-pressed={sel.align === a} onClick={() => patch({ textAlign: a })}>{a === 'center' ? 'Centred' : a === 'left' ? 'Flush left' : 'Flush right'}</button>)}
              </div>
              <label className="ps-field">Line height
                <input type="range" min={0.8} max={2} step={0.02} value={sel.lineHeight} onChange={e => patch({ lineHeight: Number(e.target.value) })} />
                <output>{sel.lineHeight.toFixed(2)}</output>
              </label>
              <label className="ps-field">Letter spacing
                <input type="range" min={-50} max={500} step={10} value={sel.spacing} onChange={e => patch({ charSpacing: Number(e.target.value) })} />
                <output>{sel.spacing}</output>
              </label>
            </>
          )}
          {sel.kind !== 'image' && (
            <>
              <div className="ps-colors" role="group" aria-label={colourLabel}>
                {p.palette.map(([name, hex]) => <button key={hex} type="button" className="ps-chip" style={{ background: hex }} aria-label={`${colourLabel}: ${name}`} aria-pressed={sel.fill.toLowerCase() === hex.toLowerCase()} onClick={() => patch(sel.kind === 'line' ? { stroke: hex } : { fill: hex })} />)}
                <input type="color" className="ps-chip" aria-label={`${colourLabel}: custom`} value={/^#[0-9a-f]{6}$/i.test(sel.fill) ? sel.fill : '#000000'} onChange={e => patch(sel.kind === 'line' ? { stroke: e.target.value.toUpperCase() } : { fill: e.target.value.toUpperCase() })} />
              </div>
              {sel.kind === 'text' && p.textEyedropper}
            </>
          )}
          {(sel.kind === 'text' || sel.kind === 'shape') && (
            <label className="ps-field">Outline
              <span className="ps-inline">
                <input type="range" min={0} max={16} value={sel.outlineWidth} onChange={e => { const w = Number(e.target.value); patch({ stroke: w ? sel.outline : null, strokeWidth: w, paintFirst: 'stroke', strokeUniform: true }); }} />
                <input type="color" className="ps-chip" aria-label="Outline colour" value={sel.outline} disabled={!sel.outlineWidth} onChange={e => patch({ stroke: e.target.value.toUpperCase() })} />
              </span>
              <output>{sel.outlineWidth || 'None'}</output>
            </label>
          )}
          <label className="ps-field">Width, % of the panel
            <input type="range" min={3} max={100} value={Math.min(100, Math.max(3, sel.widthPct))} onChange={e => p.setWidthPct(Number(e.target.value))} />
            <output>{sel.widthPct}%</output>
          </label>
          <label className="ps-field">Rotation
            <input type="range" min={0} max={359} value={sel.angle} onChange={e => patch({ angle: Number(e.target.value) })} />
            <output>{sel.angle}°</output>
          </label>
          <label className="ps-field">Opacity
            <input type="range" min={10} max={100} value={Math.round(sel.opacity * 100)} onChange={e => patch({ opacity: Number(e.target.value) / 100 })} />
            <output>{Math.round(sel.opacity * 100)}%</output>
          </label>
          {p.spots.length > 0 && (
            <>
              <h3 className="ps-sub">Place at</h3>
              <div className="ps-row" role="group" aria-label="Place at">
                {p.spots.map(sp => <button key={sp.id} type="button" className="ps-btn ps-btn--quiet" onClick={() => p.placeAt(sp)}>{sp.label}</button>)}
              </div>
            </>
          )}
          <h3 className="ps-sub">Align to the panel</h3>
          <div className="ps-row" role="group" aria-label="Align to the panel">
            {([['left', 'Left'], ['centerX', 'Centre'], ['right', 'Right'], ['top', 'Top'], ['centerY', 'Middle'], ['bottom', 'Bottom']] as const).map(([k, label]) => (
              <button key={k} type="button" className="ps-btn ps-btn--quiet" onClick={() => p.alignTo(k)}>{label}</button>
            ))}
          </div>
          <div className="ps-row">
            <button type="button" className="ps-btn ps-btn--quiet" onClick={() => patch({ angle: (sel.angle + 270) % 360 })}>Rotate 90° left</button>
            <button type="button" className="ps-btn ps-btn--quiet" onClick={() => patch({ angle: (sel.angle + 90) % 360 })}>Rotate 90° right</button>
            <button type="button" className="ps-btn" onClick={p.onCopy}>Copy</button>
            <button type="button" className="ps-btn" onClick={p.onMirror}>Mirror</button>
          </div>
          <div className="ps-row">
            <button type="button" className="ps-btn" onClick={() => p.onOrder(true)}>Bring forward</button>
            <button type="button" className="ps-btn" onClick={() => p.onOrder(false)}>Send back</button>
            <button type="button" className="ps-btn ps-btn--danger" onClick={p.onDelete}>Delete</button>
          </div>
          <p className="ps-note">Arrow keys nudge the selected artwork. Shift moves it ten steps.</p>
        </fieldset>
      )}
    </section>
  );
}
