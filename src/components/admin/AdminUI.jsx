import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATUS_TONE } from './statusTone';
import { NavIcon } from '../ui/icons';
import BottomSheet from '../ui/BottomSheet';

export const PageHeader = ({ title, sub, children }) => (
  <div className="adm-page-head adm-in">
    <div><h1 className="adm-h1">{title}</h1>{sub && <p className="adm-sub">{sub}</p>}</div>
    {children && <div className="adm-actions">{children}</div>}
  </div>
);

export const StatGrid = ({ items, loading }) => (
  <div className="adm-stats">
    {items.map((s) => {
      const Tag = s.onClick ? 'button' : 'div';
      return (
        <Tag key={s.label} className="adm-stat adm-in" onClick={s.onClick}>
          <div className="adm-stat-top">
            <span className="adm-stat-label">{s.label}</span>
            {s.chip != null && <span className={`adm-chip ${s.chipTone ?? ''}`}>{s.chip}</span>}
          </div>
          {loading ? <div className="adm-sk" style={{ height: 26, width: '50%', marginTop: 8 }} />
            : <div className="adm-stat-val" style={s.color ? { color: s.color } : undefined}>{s.value}</div>}
          {s.sub && <div className="adm-stat-sub">{s.sub}</div>}
        </Tag>
      );
    })}
  </div>
);

export const PillTabs = ({ tabs, value, onChange }) => (
  <div className="adm-tabs" role="tablist">
    {tabs.map((t) => (
      <button key={t.key} role="tab" aria-selected={value === t.key}
        className={`adm-tab${value === t.key ? ' on' : ''}`} onClick={() => onChange(t.key)}>
        {t.label}{t.count != null && <span className="n">{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Panel = ({ title, action, children, flush, style }) => (
  <section className="adm-panel adm-in" style={style}>
    {(title || action) && (
      <div className="adm-panel-head"><h2 className="adm-panel-title">{title}</h2>{action}</div>
    )}
    <div className={flush ? undefined : 'adm-panel-body'}>{children}</div>
  </section>
);

export const StatusPill = ({ status, label }) => {
  const t = STATUS_TONE[String(status).toLowerCase()] ?? STATUS_TONE.default;
  return <span className="adm-pill" style={{ background: t.bg, color: t.fg }}>{label ?? String(status).replace(/_/g, ' ')}</span>;
};

export const SkeletonRows = ({ rows = 4, h = 38 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="adm-sk" style={{ height: h }} />)}
  </div>
);

export const EmptyBlock = ({ children }) => <div className="adm-empty">{children}</div>;

export const ErrorBlock = ({ msg = 'Could not load data.', onRetry }) => (
  <div className="adm-err"><span>{msg}</span>{onRetry && <button className="adm-btn" onClick={onRetry}>Retry</button>}</div>
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

export const Meter = ({ pct, tone }) => (
  <div className={`adm-meter ${tone ?? ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
    <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

export const Segments = ({ total, index }) => (
  <div className="adm-segs" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => <i key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
  </div>
);

export const Banner = ({ tone = 'info', icon, children, action }) => (
  <div className={`adm-banner ${tone}`} role={tone === 'warn' ? 'alert' : 'note'}>
    {icon && <NavIcon name={icon} size={16} color="currentColor" />}<span>{children}</span>{action}
  </div>
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

/* Filter picker: bottom sheet on phones, same component on desktop. */
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
