// Shared customer-portal building blocks (status, thumbnails, KPI, chips, steppers, states, swatches, toast).
import { useEffect, useState, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, AlertTriangle, RotateCw } from 'lucide-react';
import { NavIcon } from '../ui/icons';
import { MiniPreview } from '../../pages/client/design-studio/InspoGallery';
import { savedDesignName } from '../../utils/designName';
import { humanize } from '../../utils/humanize';

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
export const LIFECYCLE = ['Submitted', 'Confirmed', 'Production', 'Finishing', 'Completed'];
export function lifecycleIndex(status) {
  if (status === 'completed') return 4;
  if (['qc', 'pressing', 'packing'].includes(status)) return 3;
  if (['pattern', 'segregation', 'cutting', 'sewing'].includes(status)) return 2;
  if (status === 'confirmed') return 1;
  return 0;
}

export const fmtDate = (d, o = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-PH', o) : '—';
// The customer's saved design name (studio_config.name; the order API has no separate name field), else the garment.
export const orderTitle = (o) => savedDesignName(o?.studio_config) || humanize(o?.garment_type)?.trim() || 'Custom Order';
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

// Thumbnail of a saved design. `src` is the persisted artwork (a draft's preview_dataurl, or the order artwork an archived design
// keeps as photo_path) and is shown as the design. Without one, or if it fails to load, the garment silhouette in the design's
// colours stands in, framed and labelled so it never passes for the saved artwork. data-kind: preview | loading | fallback.
export function DesignThumb({ src, garment, colors, name, compact = false, scale = 1, style, what = 'Saved preview' }) {
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  const usable = !!src && failed !== src;
  const kind = !usable ? 'fallback' : loaded === src ? 'preview' : 'loading';
  const why = src ? `${what} unavailable` : `No ${what.toLowerCase()}`;
  const label = kind === 'fallback' ? `${why}: garment colours only${name ? ` for ${name}` : ''}` : `${what}${name ? ` of ${name}` : ''}`;
  return (
    <div className={`cx-dthumb${compact ? ' cx-dthumb--sm' : ''}`} data-kind={kind} role="img" aria-label={label} title={kind === 'fallback' ? `${why} — garment colours only` : undefined} style={style}>
      {usable && <img key={src} src={src} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(src)} onError={() => setFailed(src)}/>}
      {kind === 'loading' && <span className="cx-dthumb-wait" aria-hidden="true"/>}
      {kind === 'fallback' && <>
        <span className="cx-dthumb-sil" style={{ transform: `scale(${scale})` }} aria-hidden="true"><MiniPreview garment={garment} colors={colors ?? {}}/></span>
        {!compact && <span className="cx-dthumb-note" aria-hidden="true">{src ? 'Preview unavailable' : 'Colours only'}</span>}
      </>}
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
  const idx = Math.min(Math.max(current, 0), steps.length - 1);
  return (
    <>
      <div className="cx-stepper" role="list" aria-label="Order progress">
        {steps.map((s, i) => (
          <div key={s} role="listitem" className="cx-step"
            data-s={i < current ? 'done' : i === current ? 'now' : 'todo'}
            aria-current={i === current ? 'step' : undefined}>
            <i>{i < current ? '✓' : i + 1}</i><span>{s}</span>
          </div>
        ))}
      </div>
      <p className="cx-step-cap" aria-hidden="true">Step {idx + 1} of {steps.length} · <strong>{steps[idx]}</strong></p>
    </>
  );
}

export function Skeleton({ h = 16, w = '100%', circle = false, style }) {
  return <div className="cx-sk" aria-hidden="true" style={{ height: h, width: circle ? h : w, ...(circle && { borderRadius: '50%' }), ...style }} />;
}

// Titled page section; the heading labels the region.
export function Section({ title, subtitle, action, children, className = '' }) {
  const id = useId();
  return (
    <section className={`cx-sec ${className}`.trim()} aria-labelledby={title ? id : undefined}>
      {title && <div className="cx-sec-h"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
      {children}
    </section>
  );
}

// Nothing to show yet: say what is missing and offer the next step.
export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="cx-state">
      <span className="cx-state-i" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="cx-state-a">{action}</div>}
    </div>
  );
}

// Load failure with a retry; announced to assistive tech.
export function ErrorState({ title = 'This didn’t load', children = 'Check your connection, then try again.', onRetry, retrying = false }) {
  return (
    <div className="cx-state" data-tone="error" role="alert">
      <span className="cx-state-i" aria-hidden="true"><AlertTriangle size={22} strokeWidth={1.8} /></span>
      <h3>{title}</h3>
      <p>{children}</p>
      {onRetry && <div className="cx-state-a"><button type="button" className="cx-btn cx-btn-s" onClick={onRetry} disabled={retrying}><RotateCw size={15} strokeWidth={2} aria-hidden="true" />{retrying ? 'Trying again…' : 'Try again'}</button></div>}
    </div>
  );
}

// Fabric-swatch colour chip; selectable when onSelect is given (stitched ring marks the selection).
export function SwatchChip({ color, name, selected = false, onSelect, size = 'md', disabled = false }) {
  const body = <><span className="cx-swatch-dot" style={{ '--sw': color }} aria-hidden="true" /><span>{name}</span></>;
  return onSelect
    ? <button type="button" className="cx-swatch" data-size={size} aria-pressed={selected} onClick={onSelect} disabled={disabled}>{body}</button>
    : <span className="cx-swatch" data-size={size}>{body}</span>;
}

// The 7 real production stages, in shop-floor order.
export const STAGES = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
const stageCaption = (status, cur) => status === 'completed' ? 'All 7 stages done'
  : status === 'cancelled' ? 'Order cancelled'
  : cur >= 0 ? <><strong>{STATUS[STAGES[cur]].label}</strong>, stage {cur + 1} of {STAGES.length}</> : 'Production has not started yet';

// Measuring-tape stepper over the production stages; data in (order status), no fetching.
export function StageTape({ status, compact = false, label = 'Production stages' }) {
  const cur = STAGES.indexOf(status);
  const done = status === 'completed' ? STAGES.length : Math.max(cur, 0);
  return (
    <div className={`cx-tape${compact ? ' cx-tape--sm' : ''}`}>
      <ol aria-label={label}>
        {STAGES.map((s, i) => (
          <li key={s} data-stage={s} data-s={i < done ? 'done' : i === cur ? 'now' : 'todo'} aria-current={i === cur ? 'step' : undefined}>
            <span className="cx-tape-seg" aria-hidden="true"><b>{i + 1}</b></span>
            <span className="cx-tape-lbl">{STATUS[s].label}</span>
          </li>
        ))}
      </ol>
      <p className="cx-tape-cap" aria-hidden="true">{stageCaption(status, cur)}</p>
    </div>
  );
}

// Staggered entrance for list items: spread onto an element; CSS disables it under reduced motion.
export const rise = (i, className = '') => ({ className: `cx-rise ${className}`.trim(), style: { '--i': Math.min(i, 6) } });

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
