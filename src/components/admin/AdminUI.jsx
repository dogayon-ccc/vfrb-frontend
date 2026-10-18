import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { NavIcon } from '../ui/icons';
import BottomSheet from '../ui/BottomSheet';
import StatusChip from '../ui/StatusChip';
import AlertBanner from '../ui/AlertBanner';
import UiPageHeader from '../ui/PageHeader';
import StatTile, { StatGrid as UiStatGrid } from '../ui/StatTile';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';

// Shared page header (ui/PageHeader); `sub` kept for existing admin pages.
export const PageHeader = ({ title, sub, meta, back, children }) => (
  <UiPageHeader className="adm-in" title={title} subtitle={sub} meta={meta} back={back} actions={children} />
);

// Admin KPI row on the shared stat tiles; numbers ease in once on load.
export const StatGrid = ({ items, loading }) => (
  <UiStatGrid>
    {items.map((s, i) => (
      <StatTile key={s.label} className="adm-in" style={{ animationDelay: `${i * 45}ms` }}
        label={s.label} value={s.value} sub={s.sub} chip={s.chip} chipTone={s.chipTone}
        icon={s.icon} tone={s.tone} to={s.to} onClick={s.onClick} loading={loading} countUp
        valueStyle={s.color ? { color: s.color } : undefined} />
    ))}
  </UiStatGrid>
);

export const PillTabs = ({ tabs, value, onChange }) => {
  const gid = useId();
  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.key === value);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (n == null) return;
    e.preventDefault();
    const next = tabs[(n + tabs.length) % tabs.length].key;
    onChange(next);
    document.getElementById(`${gid}-${next}`)?.focus();
  };
  return (
    <div className="adm-tabs" role="tablist" onKeyDown={onKey}>
      {tabs.map((t) => (
        <button key={t.key} id={`${gid}-${t.key}`} role="tab" type="button" aria-selected={value === t.key} tabIndex={value === t.key ? 0 : -1}
          className={`adm-tab${value === t.key ? ' on' : ''}`} onClick={() => onChange(t.key)}>
          {value === t.key && <motion.span layoutId={`${gid}-ind`} className="adm-tab-ind" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="adm-tab-t">{t.label}{t.count != null && <span className="n">{t.count}</span>}</span>
        </button>
      ))}
    </div>
  );
};

export const TabPanel = ({ k, children }) => <div key={k} className="adm-tabpanel" role="tabpanel">{children}</div>;

// An order number that opens that order: a real link (keyboard, middle-click), 44px tall on touch, never triggers its row.
export const OrderLink = ({ id, prefix = '#' }) => (
  <Link className="adm-order-link" to={`/admin/orders/${id}`} onClick={e => e.stopPropagation()}>{prefix}{id}</Link>
);

// Date and time a row was recorded, in the shop's locale.
export const fmtWhen = (d) => (d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
// "by Ana Cruz · Oct 13, 2026, 2:30 PM": who recorded a row and when.
export const RecordedBy = ({ name, at, label = 'by' }) => (
  <span className="adm-recby">{label && `${label} `}<b>{name || 'Unknown user'}</b>{at && <> · <time dateTime={new Date(at).toISOString()}>{fmtWhen(at)}</time></>}</span>
);

// Shared card (ui/Card). tone 'attention' marks a panel that needs a decision.
export const Panel = ({ title, subtitle, action, children, flush, tone, style }) => (
  <Card className="adm-panel adm-in" title={title} subtitle={subtitle} action={action} tone={tone}
    padding={flush ? 'none' : 'md'} style={style}>
    {children}
  </Card>
);

// Delegates to the shared U1 chip (label + icon + group colour).
export const StatusPill = ({ status, label, group }) => <StatusChip status={status} label={label} group={group} />;

export const SkeletonRows = ({ rows = 4, h = 38 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="adm-sk" style={{ height: h }} />)}
  </div>
);

// Shared empty state (ui/EmptyState); pass title/icon/action for the full version, or just text.
export const EmptyBlock = ({ title, icon, action, children }) => (
  <EmptyState compact title={title} icon={icon} action={action}>{children}</EmptyState>
);

export const ErrorBlock = ({ msg = 'Could not load data.', onRetry }) => (
  <AlertBanner tone="error" title={msg} style={{ marginBottom: 0 }}
    action={onRetry && <button className="adm-btn" onClick={onRetry}>Retry</button>} />
);

export const useIsMobile = (bp = 767) => {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(`(max-width:${bp}px)`).matches);
  useEffect(() => {
    const q = window.matchMedia(`(max-width:${bp}px)`);
    const h = (e) => setM(e.matches);
    q.addEventListener('change', h);
    return () => q.removeEventListener('change', h);
  }, [bp]);
  return m;
};

export const SearchBox = ({ value, onChange, placeholder, label }) => (
  <div className="adm-search-wrap">
    <NavIcon name="search" size={15} color="currentColor" />
    <input type="search" className="adm-search" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} aria-label={label ?? placeholder} />
  </div>
);

export const Avatar = ({ name, size = 34, tone }) => (
  <span className={`adm-avatar ${tone ?? ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden="true">
    {(name ?? '?').trim().charAt(0).toUpperCase() || '?'}
  </span>
);

export const Meter = ({ pct, tone, label = 'Progress' }) => (
  <div className={`adm-meter ${tone ?? ''}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
    <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

export const Segments = ({ total, index }) => (
  <div className="adm-segs" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => <i key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
  </div>
);

// Delegates to the shared U1 banner; 'warn' maps to 'warning'.
export const Banner = ({ tone = 'info', title, children, action }) => (
  <AlertBanner tone={tone === 'warn' ? 'warning' : tone} title={title ?? children} action={action}>{title ? children : null}</AlertBanner>
);

export const Toast = ({ toast }) => (
  <AnimatePresence>
    {toast && (
      <motion.div key={toast.msg} role="status" className={`adm-toast ${toast.type === 'error' ? 'error' : ''}`}
        initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2 }}>
        {toast.msg}
      </motion.div>
    )}
  </AnimatePresence>
);

export const useToast = () => {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return [toast, setToast];
};

export const FilterSheet = ({ title = 'Filter', options, value, onChange, onClose, isMobile }) => (
  <BottomSheet title={title} onClose={onClose} isMobile={isMobile} maxWidth={380}>
    <div className="adm-sheet-list" style={{ margin: '-8px -8px 0' }}>
      {options.map((o) => (
        <button key={o.key} className={value === o.key ? 'on' : ''} onClick={() => { onChange(o.key); onClose(); }}>
          <span>{o.label}</span><span style={{ opacity: 0.6, fontSize: 12 }}>{o.count}</span>
        </button>
      ))}
    </div>
  </BottomSheet>
);

export const FilterButton = ({ label, onClick }) => (
  <button className="adm-btn adm-only-m" onClick={onClick} aria-haspopup="dialog">
    <NavIcon name="checklist" size={14} color="currentColor" /> {label}
  </button>
);

// Live data: re-runs `refresh` every `ms` while the tab is visible, and once when the
// tab comes back. `data` is the page's current payload; each new payload stamps the time.
export function useLivePoll(refresh, data, ms = 30_000) {
  const [at, setAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const fn = useRef(refresh);
  fn.current = refresh;
  useEffect(() => { if (data) setAt(new Date()); }, [data]);
  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try { await fn.current(); } finally { inFlight.current = false; setBusy(false); }
  }, []);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') run(); };
    const id = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [run, ms]);
  return { at, busy, run };
}

export const LiveStamp = ({ at, busy, onRefresh, className = 'adm-btn' }) => (
  <button className={`${className} adm-live`} onClick={onRefresh} disabled={busy} aria-label="Refresh now" title="Refreshes every 30 seconds while this tab is open">
    <span className={`adm-live-dot${busy ? ' busy' : ''}`} aria-hidden="true" />
    {at ? `Updated ${at.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}` : 'Live'}
    <NavIcon name="refresh" size={14} color="currentColor" />
  </button>
);

// Foundation primitives, re-exported so admin pages keep one import line.
export { default as DataTable } from '../ui/DataTable';
export { default as AttentionStrip } from '../ui/AttentionStrip';
export { default as Stepper } from '../ui/Stepper';
export { default as StatTile } from '../ui/StatTile';
export { default as Card } from '../ui/Card';
export { default as EmptyState } from '../ui/EmptyState';
