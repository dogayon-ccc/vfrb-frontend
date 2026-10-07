import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button.jsx';
import useDialogFocus from '../../hooks/useDialogFocus';

function Panel({ title, body, confirmLabel, busy, onCancel, onConfirm }) {
  const ref = useRef(null);
  useDialogFocus(ref, { onClose: onCancel });
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 500 }}
      onClick={onCancel}>
      <motion.div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="cfm-title" aria-describedby="cfm-body"
        initial={{ scale: .95, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: .97, opacity: 0 }}
        transition={{ duration: .2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 22, maxWidth: 360, width: '100%', outline: 'none' }}>
        <p id="cfm-title" style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', margin: '0 0 8px' }}>{title}</p>
        <p id="cfm-body" style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 18px' }}>{body}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" fullWidth onClick={onCancel}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ConfirmDialog({ open, ...rest }) {
  return <AnimatePresence>{open && <Panel key="cfm" {...rest} />}</AnimatePresence>;
}
