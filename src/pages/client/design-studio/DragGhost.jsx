import { motion, AnimatePresence } from 'framer-motion';
import { T2 } from './dsShared';

// The floating item a panel drag shows in flight. Rendered once at the
// Design Studio root so it overlays the tool rail, sheet AND canvas
// regardless of which panel started the drag. Follows the pointer with
// zero lag while dragging (raw x/y, not a spring — a laggy follow reads
// as broken, not "physical"); the lift (scale-up + shadow) and the
// settle-into-place on drop are what carry the spring feel instead.
export default function DragGhost({ ghost }) {
  return (
    <AnimatePresence>
      {ghost && (
        <motion.div
          key="drag-ghost"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{
            scale:   ghost.settling ? 0.85 : ghost.over ? 1.12 : 1.06,
            opacity: 1,
            x: ghost.x, y: ghost.y,
          }}
          exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
          transition={ghost.settling
            ? { type: 'spring', stiffness: 420, damping: 26 }
            : { x: { duration: 0 }, y: { duration: 0 }, scale: { type: 'spring', stiffness: 380, damping: 22 } }}
          style={{
            position: 'fixed', top: 0, left: 0, zIndex: 999,
            translateX: '-50%', translateY: '-50%',
            pointerEvents: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4,
          }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'var(--bg-card, #fff)',
            border: `2px solid ${ghost.over ? T2 : 'rgba(15,23,42,.18)'}`,
            boxShadow: ghost.over
              ? `0 14px 28px rgba(2,195,154,.35), 0 0 0 4px rgba(2,195,154,.15)`
              : '0 10px 22px rgba(15,23,42,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', transition: 'border-color .12s, box-shadow .12s',
          }}>
            {ghost.preview
              ? (typeof ghost.preview === 'string' && ghost.preview.startsWith('data:')
                ? <img src={ghost.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                : <span style={{ fontSize: 22 }}>{ghost.preview}</span>)
              : <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(15,23,42,.5)', textAlign: 'center', lineHeight: 1.1 }}>
                  {ghost.label}
                </span>}
          </div>
          {ghost.over && (
            <span style={{
              fontSize: 9, fontWeight: 800, color: '#fff', background: T2,
              padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
            }}>
              Drop to place
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
