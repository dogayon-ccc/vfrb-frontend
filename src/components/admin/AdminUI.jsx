import { STATUS_TONE } from './statusTone';

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
