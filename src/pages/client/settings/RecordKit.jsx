// Shared pieces for the saved-record lists in Account Settings (shipping addresses, billing profiles).
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { CircleCheck, CircleAlert, Pencil, Star, Trash2 } from 'lucide-react';
import { Badge, Skeleton } from '../../../components/ui';

// Inline status line; success clears itself, errors stay until the next action.
export function Notice({ msg, type }) {
  const err = type === 'error';
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          role={err ? 'alert' : 'status'} aria-live="polite"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 700, marginTop: 12,
            background: err ? 'var(--danger-bg)' : 'var(--success-bg)', border: `1px solid ${err ? 'var(--danger-border)' : 'var(--success-border)'}`,
            color: err ? 'var(--danger-text)' : 'var(--success-text)' }}>
          {err ? <CircleAlert size={14} aria-hidden="true" /> : <CircleCheck size={14} aria-hidden="true" />}
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// [message, show]: a success message that fades after a few seconds.
export function useFlash(ms = 4000) {
  const [msg, setMsg] = useState('');
  const t = useRef(null);
  const show = useCallback((m) => { clearTimeout(t.current); setMsg(m); if (m) t.current = setTimeout(() => setMsg(''), ms); }, [ms]);
  useEffect(() => () => clearTimeout(t.current), []);
  return [msg, show];
}

// GET a list endpoint the signed-in customer owns; the server already sorts the default first.
export function useRecords(url) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setLoading(true); setFailed(false);
    return axios.get(url).then((r) => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { items, loading, failed, load };
}

// Laravel 422 → { field: first message }.
export const fieldErrors = (e) => Object.fromEntries(Object.entries(e?.response?.data?.errors ?? {}).map(([k, v]) => [k, v?.[0]]));

export function RecordRow({ title, isDefault, children, onEdit, onDelete, onMakeDefault, busy }) {
  return (
    <div className="rk-row">
      <div style={{ minWidth: 0, flex: '1 1 220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', margin: 0, overflowWrap: 'anywhere' }}>{title}</p>
          {isDefault && <Badge tone="teal">Default</Badge>}
        </div>
        {children}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {!isDefault && (
          <button type="button" className="rk-btn" onClick={onMakeDefault} disabled={busy}>
            <Star size={14} aria-hidden="true" /> Set default
          </button>
        )}
        <button type="button" className="rk-btn rk-ico" onClick={onEdit} aria-label={`Edit ${title}`} disabled={busy}><Pencil size={15} aria-hidden="true" /></button>
        <button type="button" className="rk-btn rk-ico rk-del" onClick={onDelete} aria-label={`Delete ${title}`} disabled={busy}><Trash2 size={15} aria-hidden="true" /></button>
      </div>
      <style>{`
        .rk-row{padding:14px 16px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);display:flex;align-items:flex-start;
          gap:12px;justify-content:space-between;flex-wrap:wrap;transition:border-color .18s,box-shadow .18s}
        .rk-row:hover{border-color:var(--teal);box-shadow:var(--shadow-sm)}
        .rk-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 12px;border-radius:9px;
          border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer}
        .rk-btn:hover{border-color:var(--teal);color:var(--teal-dark)}
        .rk-ico{min-width:44px;padding:0}
        .rk-del{color:var(--danger-text)}
        .rk-del:hover{border-color:var(--danger-text);color:var(--danger-text)}
        .rk-btn:disabled{opacity:.6;cursor:not-allowed}
        .rk-btn:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px}
      `}</style>
    </div>
  );
}

export const DefaultToggle = ({ checked, onChange, children }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', cursor: 'pointer', minHeight: 44 }}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--teal)' }} />
    {children}
  </label>
);

export const Skeletons = ({ n = 2 }) => (
  <Skeleton variant="block" count={n} height={68} gap={12} label="Loading" />
);
