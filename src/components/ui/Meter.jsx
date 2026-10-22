// src/components/ui/Meter.jsx
// Thin progress / stock bar. tone: 'ok' | 'low' | 'warn' | undefined (teal). marker: optional 0-100 tick (e.g. reorder point).
// AdminUI.Meter renders this. Styles: .adm-meter in styles/admin.css, .ui-meter-mark in styles/theme.css.
const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

export default function Meter({ pct, tone, label = 'Progress', marker, className = '' }) {
  return (
    <div className={`adm-meter ui-meter ${tone ?? ''} ${className}`.trim()} role="progressbar" aria-label={label}
      aria-valuenow={Math.round(clamp(pct))} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${clamp(pct)}%` }} />
      {marker != null && <b className="ui-meter-mark" style={{ left: `${clamp(marker)}%` }} aria-hidden="true" />}
    </div>
  );
}
