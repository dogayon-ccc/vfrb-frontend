// src/components/ui/StatTile.jsx
// One figure with its label, on a measuring-tape baseline. Renders as a Link (to), a button (onClick) or a plain tile.
// icon: a lucide component or a NavIcon name. tone: 'default' | 'attention' | 'success' | 'danger' | 'info'.
// countUp eases numeric values in once on mount (skipped under reduced motion).
// StatGrid wraps several. AdminUI.StatGrid and kit.Kpi render these. Styles: .ui-stat in styles/theme.css.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavIcon } from './icons';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useCountUp(target, enabled = true, ms = 700) {
  const n = typeof target === 'number' ? target : null;
  const [v, setV] = useState(n);
  const shown = useRef(0);
  useEffect(() => {
    if (!enabled || n == null || reduceMotion()) { shown.current = n ?? 0; setV(n); return undefined; }
    let raf; const t0 = performance.now(); const from = shown.current;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      shown.current = Math.round(from + (n - from) * (1 - (1 - k) ** 3));
      setV(shown.current);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, ms, enabled]);
  return n == null ? target : v;
}

export function StatGrid({ children, className = '', style }) {
  return <div className={`ui-stat-grid ${className}`.trim()} style={style}>{children}</div>;
}

export default function StatTile({
  label, value, sub, icon, tone = 'default', chip, chipTone, to, onClick, loading = false,
  countUp = false, className = '', style, valueStyle,
}) {
  const shown = useCountUp(value, countUp && !loading);
  const Icon = typeof icon === 'string' ? null : icon;
  const cls = ['ui-stat', tone !== 'default' && tone, className].filter(Boolean).join(' ');
  const body = (
    <>
      <div className="ui-stat-top">
        <span className="ui-stat-label">{label}</span>
        {chip != null && <span className={`ui-stat-chip ${chipTone ?? ''}`.trim()}>{chip}</span>}
        {chip == null && icon && (
          <span className="ui-stat-icon" aria-hidden="true">
            {Icon ? <Icon size={17} strokeWidth={2} /> : <NavIcon name={icon} size={17} strokeWidth={2} />}
          </span>
        )}
      </div>
      {loading
        ? <div className="sk" style={{ height: 28, width: '45%', marginTop: 6 }} aria-hidden="true" />
        : <div className="ui-stat-val" style={valueStyle}>{shown}</div>}
      {sub && <div className="ui-stat-sub">{sub}</div>}
    </>
  );
  if (to) return <Link to={to} className={cls} style={style} aria-busy={loading || undefined}>{body}</Link>;
  if (onClick) return <button type="button" className={cls} style={style} onClick={onClick} aria-busy={loading || undefined}>{body}</button>;
  return <div className={cls} style={style} aria-busy={loading || undefined}>{body}</div>;
}
