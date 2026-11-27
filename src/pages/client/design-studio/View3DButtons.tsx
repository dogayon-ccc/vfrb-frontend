// Fixed viewing angles for the 3D check view. "Left" and "right" are the wearer's.
import type { PanelSide } from './pilotPanels';

export type View3D = 'front' | 'back' | 'left' | 'right';
export const VIEW_ANGLES: Record<View3D, number> = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
const LABELS: [View3D, string][] = [['front', 'Front'], ['back', 'Back'], ['left', 'Left side'], ['right', 'Right side']];

export default function View3DButtons({ side, view, onView, onReset }: { side: PanelSide; view: View3D | null; onView: (v: View3D) => void; onReset: () => void }) {
  return (
    <div className="ps-views" role="group" aria-label="3D viewing angle">
      {LABELS.map(([v, label]) => <button key={v} type="button" aria-pressed={(view ?? side) === v} onClick={() => onView(v)}>{label}</button>)}
      <button type="button" onClick={onReset}>Reset view</button>
    </div>
  );
}
