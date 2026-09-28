// Shared customer-portal building blocks (status, thumbnails, KPI, chips, stepper, toast).
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { NavIcon } from '../ui/icons';
import { MiniPreview } from '../../pages/client/design-studio/InspoGallery';

// Real orders.status enum → label/colors (same values used across customer pages).
export const STATUS = {
  pending:     { label: 'Pending',     color: '#b45309', bg: '#fef3c7', icon: 'pending' },
  confirmed:   { label: 'Confirmed',   color: '#1d4ed8', bg: '#dbeafe', icon: 'success' },
  pattern:     { label: 'Pattern',     color: '#6d28d9', bg: '#ede9fe', icon: 'pattern' },
  segregation: { label: 'Segregation', color: '#6d28d9', bg: '#f5f3ff', icon: 'segregation' },
  cutting:     { label: 'Cutting',     color: '#4338ca', bg: '#e0e7ff', icon: 'cutting' },
  sewing:      { label: 'Sewing',      color: '#0e7490', bg: '#cffafe', icon: 'garmentType' },
  qc:          { label: 'QC',          color: '#c2410c', bg: '#ffedd5', icon: 'qc' },
  pressing:    { label: 'Pressing',    color: '#be185d', bg: '#fce7f3', icon: 'pressing' },
  packing:     { label: 'Packing',     color: '#be185d', bg: '#fdf2f8', icon: 'package' },
  completed:   { label: 'Completed',   color: '#15803d', bg: '#dcfce7', icon: 'success' },
  cancelled:   { label: 'Cancelled',   color: '#b91c1c', bg: '#fee2e2', icon: 'error' },
};
export const IN_PRODUCTION = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];

// Filter groups shown as chips (each maps onto real statuses only).
export const GROUPS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'pending', label: 'Pending', test: s => s === 'pending' || s === 'confirmed' },
  { id: 'prod', label: 'In Production', test: s => IN_PRODUCTION.includes(s) },
  { id: 'done', label: 'Completed', test: s => s === 'completed' },
  { id: 'cancelled', label: 'Cancelled', test: s => s === 'cancelled' },
];

// Customer-facing 5-step lifecycle derived from the real status (no new data).
export const LIFECYCLE = ['Submitted', 'Confirmed', 'Production', 'Quality Check', 'Completed'];
export function lifecycleIndex(status) {
  if (status === 'completed') return 4;
  if (['qc', 'pressing', 'packing'].includes(status)) return 3;
  if (['pattern', 'segregation', 'cutting', 'sewing'].includes(status)) return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

export const fmtDate = (d, o = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-PH', o) : '—';
export const orderTitle = (o) => o?.design?.design_name ?? o?.garment_type ?? 'Custom Order';
export const parseCfg = (o) => {
  const raw = o?.studio_config;
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
};
export function reltime(ts) {
  if (!ts) return '';
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(ts, { month: 'short', day: 'numeric' });
}

export function StatusPill({ status }) {
  const c = STATUS[status] ?? STATUS.pending;
  return (
    <span className="cx-pill" style={{ background: c.bg, color: c.color }}>
      <NavIcon name={c.icon} size={11} color={c.color} strokeWidth={2.5} /> {c.label}
    </span>
  );
}

// Garment thumbnail from the order's real studio_config; swatch fallback from order.color.
export function OrderThumb({ order, size = 52 }) {
  const cfg = parseCfg(order);
  const scale = size / 66;
  return (
    <div className="cx-thumb" style={{ width: size, height: size }} aria-hidden="true">
      {cfg.garment ? (
        <div style={{ transform: `scale(${scale * 0.9})`, transformOrigin: 'center', lineHeight: 0 }}>
          <MiniPreview garment={cfg.garment} colors={cfg.colors ?? {}} />
        </div>
      ) : (
        <div style={{ width: '55%', height: '55%', borderRadius: 8,
          background: /^#[0-9a-f]{3,8}$/i.test(order?.color ?? '') ? order.color : 'var(--teal)' }} />
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="cx-head">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {children && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

export function Kpi({ icon, value, label, color, to, loading }) {
  const body = (
    <>
      <div className="cx-kpi-i" style={{ background: `${color}18`, color }}>
        <NavIcon name={icon} size={18} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0 }}>
        {loading ? <div className="cx-sk" style={{ width: 36, height: 22, marginBottom: 4 }} /> : <b>{value}</b>}
        <span>{label}</span>
      </div>
    </>
  );
  return to ? <Link to={to} className="cx-kpi">{body}</Link> : <div className="cx-kpi">{body}</div>;
}

export function Chips({ items, value, onChange, label }) {
  return (
    <div className="cx-chips" role="group" aria-label={label}>
      {items.map(i => (
        <button key={i.id} className="cx-chip" aria-pressed={value === i.id} onClick={() => onChange(i.id)}>
          {i.label}{i.count != null && <small>({i.count})</small>}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ steps, current }) {
  return (
    <div className="cx-stepper" role="list" aria-label="Order progress">
      {steps.map((s, i) => (
        <div key={s} role="listitem" className="cx-step"
          data-s={i < current ? 'done' : i === current ? 'now' : 'todo'}
          aria-current={i === current ? 'step' : undefined}>
          <i>{i < current ? '✓' : i + 1}</i><span>{s}</span>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', style }) {
  return <div className="cx-sk" style={{ height: h, width: w, ...style }} />;
}

export function useToast() {
  const [t, setT] = useState(null);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 3200); return () => clearTimeout(id); }, [t]);
  const show = useCallback((msg, type = 'success') => setT({ msg, type }), []);
  const node = t ? (
    <div className="cx-toast" role="status" aria-live="polite"
      style={{ background: t.type === 'error' ? 'var(--danger)' : 'var(--teal)' }}>{t.msg}</div>
  ) : null;
  return [node, show];
}
