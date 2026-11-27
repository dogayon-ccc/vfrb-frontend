// The two floating bars over the cutting mat: the tool rail (pointer, pan, add artwork) and the zoom bar with the calibration status.
import { useEffect, useRef, useState } from 'react';
import { MousePointer2, Hand, Image as ImageIcon, Type, Shapes, Minus, Plus, Grid3x3, type LucideIcon } from 'lucide-react';
import { SHAPES, type ShapeKind } from './panelArtOps';

export type PanelTool = 'select' | 'pan';
export const ZOOM_MIN = 1, ZOOM_MAX = 4, ZOOM_STEP = 0.25;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z / ZOOM_STEP) * ZOOM_STEP));

export interface PanelCanvasBarProps {
  tool: PanelTool; setTool: (t: PanelTool) => void; zoom: number; setZoom: (z: number) => void; grid: boolean; setGrid: (g: boolean) => void;
  disabled: boolean; onImage: () => void; onText: () => void; onShape: (k: ShapeKind) => void;
}

const face = (Icon: LucideIcon, label: string) => <><Icon size={20} strokeWidth={2} aria-hidden="true" /><span>{label}</span></>;

export default function PanelCanvasBar({ tool, setTool, zoom, setZoom, grid, setGrid, disabled, onImage, onText, onShape }: PanelCanvasBarProps) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="ps-bar">
      <div className="ps-rail" role="toolbar" aria-label="Panel tools">
        <button type="button" aria-pressed={tool === 'select'} onClick={() => setTool('select')}>{face(MousePointer2, 'Select')}</button>
        <button type="button" aria-pressed={tool === 'pan'} onClick={() => setTool('pan')}>{face(Hand, 'Pan')}</button>
        <button type="button" onClick={onImage} disabled={disabled}>{face(ImageIcon, 'Image')}</button>
        <button type="button" onClick={onText} disabled={disabled}>{face(Type, 'Text')}</button>
        <div className="ps-bar-menu" ref={box}>
          <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(o => !o)} disabled={disabled}>{face(Shapes, 'Shapes')}</button>
          {open && (
            <div className="ps-bar-pop" role="group" aria-label="Shapes">
              {SHAPES.map(([k, label]) => <button key={k} type="button" onClick={() => { onShape(k); setOpen(false); }}>{label}</button>)}
            </div>
          )}
        </div>
      </div>
      <div className="ps-zoom" role="group" aria-label="Zoom and grid">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(clampZoom(zoom - ZOOM_STEP))} disabled={zoom <= ZOOM_MIN}><Minus size={18} aria-hidden="true" /></button>
        <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(clampZoom(zoom + ZOOM_STEP))} disabled={zoom >= ZOOM_MAX}><Plus size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => setZoom(1)}>Fit</button>
        <button type="button" aria-label="Grid" aria-pressed={grid} onClick={() => setGrid(!grid)} title="Each square is a tenth of the panel width. It is not a real-world unit."><Grid3x3 size={18} aria-hidden="true" /></button>
        <span className="ps-bar-flag" title="No measured calibration for this garment, so no centimetres, DPI or print files are claimed.">Not calibrated</span>
      </div>
    </div>
  );
}
