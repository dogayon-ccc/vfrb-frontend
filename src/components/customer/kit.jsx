// Shared customer-portal building blocks (status, thumbnails, KPI, chips, steppers, states, swatches, toast).
import { useEffect, useState, useCallback, useId } from 'react';
import { RotateCw } from 'lucide-react';
import UiPageHeader from '../ui/PageHeader';
import StatTile from '../ui/StatTile';
import UiStepper from '../ui/Stepper';
import UiEmptyState from '../ui/EmptyState';
import StatusChip from '../ui/StatusChip';
import { MiniPreview } from '../../pages/client/design-studio/InspoGallery';
import { BASE_PATHS } from '../../pages/client/design-studio/garmentPaths';
import { savedDesignName } from '../../utils/designName';
import { humanize } from '../../utils/humanize';

// Derived set garments (e.g. Midi Pencil Skirt) have no silhouette of their own; use the base Skirt, not the Polo fallback.
const thumbGarment = (g) => (BASE_PATHS[g] || !/skirt/i.test(g ?? '') ? g : 'Skirt');

// Real orders.status enum → customer label + icon. Colour comes from StatusChip's group tokens.
export const STATUS = {
  pending:     { label: 'Pending',     icon: 'pending' },
  confirmed:   { label: 'Confirmed',   icon: 'success' },
  // Production stages are VFRB's call: the customer sees "Confirmed" until the order is completed.
  pattern:     { label: 'Confirmed', icon: 'success' },
  segregation: { label: 'Confirmed', icon: 'success' },
  cutting:     { label: 'Confirmed', icon: 'success' },
  sewing:      { label: 'Confirmed', icon: 'success' },
  qc:          { label: 'Confirmed', icon: 'success' },
  pressing:    { label: 'Confirmed', icon: 'success' },
  packing:     { label: 'Confirmed', icon: 'success' },
  completed:   { label: 'Completed',   icon: 'success' },
  cancelled:   { label: 'Cancelled',   icon: 'error' },
};
export const IN_PRODUCTION = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];

// Filter groups shown as chips (each maps onto real statuses only).
export const GROUPS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'pending', label: 'Pending', test: s => s === 'pending' },
  { id: 'prod', label: 'Confirmed', test: s => s === 'confirmed' || IN_PRODUCTION.includes(s) },
  { id: 'done', label: 'Completed', test: s => s === 'completed' },
  { id: 'cancelled', label: 'Cancelled', test: s => s === 'cancelled' },
];

// Customer-facing 5-step lifecycle derived from the real status (no new data).
export const LIFECYCLE = ['Submitted', 'Confirmed', 'Completed'];
export function lifecycleIndex(status) {
  if (status === 'completed') return 2;
  if (status === 'confirmed' || IN_PRODUCTION.includes(status)) return 1;
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
  // Shared U1 chip: customer-facing label, group colour + icon.
  const c = STATUS[status] ?? STATUS.pending;
  return <StatusChip status={STATUS[status] ? status : 'pending'} label={c.label} />;
}

// Garment thumbnail from the order's real studio_config; swatch fallback from order.color.
export function OrderThumb({ order, size = 52 }) {
  const cfg = parseCfg(order);
  const scale = size / 66;
  return (
    <div className="cx-thumb" style={{ width: size, height: size }} aria-hidden="true">
      {cfg.garment ? (
        <div style={{ transform: `scale(${scale * 0.9})`, transformOrigin: 'center', lineHeight: 0 }}>
          <MiniPreview garment={thumbGarment(cfg.garment)} colors={cfg.colors ?? {}} />
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
        <span className="cx-dthumb-sil" style={{ transform: `scale(${scale})` }} aria-hidden="true"><MiniPreview garment={thumbGarment(garment)} colors={colors ?? {}}/></span>
        {!compact && <span className="cx-dthumb-note" aria-hidden="true">{src ? 'Preview unavailable' : 'Colours only'}</span>}
      </>}
    </div>
  );
}

// Shared page header (ui/PageHeader).
export function PageHeader({ title, subtitle, meta, back, children }) {
  return <UiPageHeader title={title} subtitle={subtitle} meta={meta} back={back} actions={children} />;
}

// KPI on the shared stat tile. Tone follows what the figure means (pending = amber attention);
// a caller's per-page `color` prop is ignored so the palette stays semantic.
const KPI_TONE = { pending: 'attention', success: 'success', settings: 'info', error: 'danger' };
export function Kpi({ icon, value, label, to, loading, tone }) {
  return <StatTile icon={icon} value={value} label={label} to={to} loading={loading} tone={tone ?? KPI_TONE[icon] ?? 'default'} />;
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

// Order progress on the shared stepper (ui/Stepper).
export function Stepper({ steps, current, blocked, label = 'Order progress' }) {
  return <UiStepper steps={steps} current={current} blocked={blocked} label={label} />;
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

// Nothing to show yet: say what is missing and offer the next step (ui/EmptyState).
export function EmptyState({ icon, title, children, action }) {
  return <UiEmptyState boxed icon={icon} title={title} action={action}>{children}</UiEmptyState>;
}

// Load failure with a retry; announced to assistive tech.
export function ErrorState({ title = 'This didn’t load', children = 'Check your connection, then try again.', onRetry, retrying = false }) {
  return (
    <UiEmptyState boxed tone="error" title={title}
      action={onRetry && <button type="button" className="cx-btn cx-btn-s" onClick={onRetry} disabled={retrying}><RotateCw size={15} strokeWidth={2} aria-hidden="true" />{retrying ? 'Trying again…' : 'Try again'}</button>}>
      {children}
    </UiEmptyState>
  );
}

// Fabric-swatch colour chip; selectable when onSelect is given (stitched ring marks the selection). size="dot" keeps only the dot, named for assistive tech and on hover.
export function SwatchChip({ color, name, selected = false, onSelect, size = 'md', disabled = false }) {
  const dot = size === 'dot';
  const body = <><span className="cx-swatch-dot" style={{ '--sw': color }} aria-hidden="true" /><span className={dot ? 'sr-only' : undefined}>{name}</span></>;
  return onSelect
    ? <button type="button" className="cx-swatch" data-size={size} aria-pressed={selected} onClick={onSelect} disabled={disabled} title={dot ? name : undefined}>{body}</button>
    : <span className="cx-swatch" data-size={size} title={dot ? name : undefined}>{body}</span>;
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
