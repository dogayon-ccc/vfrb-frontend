import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';

// The Studio's workspace shell: the one place that owns the body grid (Pieces rail | tool strip + panel | stage) and what sits over it.
// Business logic stays in DesignStudio.tsx; the three zones arrive as slots, so the grid and its breakpoints
// (.ds-body in DesignStudioStyles) can change without touching Studio state, and a future tool can reuse the shell.
//   rail   : the Pieces column (PiecesRail)
//   drawer : the tool strip and its panel / bottom sheet (ToolDrawer)
//   canvas : the stage (CanvasViewport)
// locked : a saved design open read-only: the whole body is inert, and onGate (capture handlers) turns any edit into the "edit this design?" prompt.
type Props = {
  rail: ReactNode;
  drawer: ReactNode;
  canvas: ReactNode;
  locked?: boolean;
  onGate?: (e: any) => void;
  toast?: string | null;
  toastErr?: boolean;
  reduceMotion?: boolean | null;
};

export default function StudioLayout({ rail, drawer, canvas, locked = false, onGate, toast = null, toastErr = false, reduceMotion = false }: Props) {
  // `inert` is not in React 18's typings; it is passed as a plain attribute (empty string = on).
  const inertAttr: Record<string, string> = locked ? { inert: '' } : {};
  return (
    <div className="ds-body" {...inertAttr} aria-disabled={locked || undefined}
      onPointerDownCapture={onGate} onMouseDownCapture={onGate} onClickCapture={onGate} onKeyDownCapture={onGate}>
      <AnimatePresence>
        {toast && (
          <motion.div key="toast" className="ds-toast" role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : .2 }}>
            <NavIcon name={toastErr ? 'warning' : 'success'} size={16}/> {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {rail}
      {drawer}
      {canvas}
    </div>
  );
}
