// Shared admin chart kit: one palette, one tooltip, one legend, one card for every Recharts chart.
import { useEffect, useId, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import Card from '../../ui/Card';

// Categorical order is fixed; validated (dataviz validate_palette) on #fcfcfb light and #161d24 dark.
const SERIES = {
  light: ['#00899B', '#B97D22', '#3B57A6', '#B04C7E', '#4E8A3A'],
  dark: ['#1A9FB0', '#C08830', '#6F8BE0', '#CC6C99', '#5C9A48'],
};
const MOTION_MS = 200;

const isDark = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
const cssVar = (name, fallback) => {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// SVG attributes ignore var(), so tokens are resolved to hex and re-read when the theme flips.
export function useChartTheme() {
  const read = () => {
    const dark = isDark();
    return {
      dark,
      series: SERIES[dark ? 'dark' : 'light'],
      grid: cssVar('--border', dark ? '#2a3540' : '#e6e9ee'),
      tick: cssVar('--text-subtle', dark ? '#9aa7b4' : '#5b6675'),
      surface: cssVar('--bg-card', dark ? '#161d24' : '#ffffff'),
      ink: cssVar('--ink', dark ? '#e6edf3' : '#1B2A4A'),
      status: { ok: cssVar('--success', '#15803d'), low: cssVar('--warning', '#b45309'), out: cssVar('--danger', '#C4313B') },
      animate: !reducedMotion(),
    };
  };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export const fmtPeso = (v) => `₱${Number(v ?? 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
export const fmtPesoShort = (v) => {
  const n = Math.abs(Number(v) || 0);
  if (n >= 1e6) return `₱${(v / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `₱${(v / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`;
  return `₱${Math.round(v || 0)}`;
};
export const fmtCount = (v) => Number(v ?? 0).toLocaleString('en-PH');
const pct = (v, total) => (total > 0 ? `${Math.round((v / total) * 100)}%` : '0%');

// Legend with swatches; `value` turns it into a direct label (series name + its headline value).
export function ChartLegend({ items, onHover }: any) {
  if (!items?.length) return null;
  return (
    <ul className="vc-legend">
      {items.map((it) => (
        <li key={it.key} onMouseEnter={() => onHover?.(it.key)} onMouseLeave={() => onHover?.(null)}>
          <i className={`vc-sw${it.line ? ' line' : ''}`} style={{ '--c': it.color }} aria-hidden="true" />
          <span>{it.label}</span>
          {it.value != null && <b>{it.value}</b>}
        </li>
      ))}
    </ul>
  );
}

function ChartTip({ active, payload, label, format, labelFormat }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="vc-tip">
      {label != null && <div className="vc-tip-h">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="vc-tip-r">
          <i className="vc-sw" style={{ '--c': p.color ?? p.payload?.fill }} aria-hidden="true" />
          <span>{p.name}</span>
          <b>{(p.payload?.__fmt ?? format)(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

// Card shell: title, optional headline figure, legend, chart, empty state and a table view for screen readers.
export function ChartCard({ title, subtitle, figure, figureNote, legend, empty, loading, height = 240, table, action, className = '', children }: any) {
  return (
    <Card title={title} subtitle={subtitle} action={action} className={`vc-card adm-in ${className}`}>
      {(figure != null || legend) && !empty && !loading && (
        <div className="vc-head">
          {figure != null && <div className="vc-fig"><b>{figure}</b>{figureNote && <span>{figureNote}</span>}</div>}
          {legend}
        </div>
      )}
      {loading ? <div className="adm-sk vc-sk" style={{ height }} />
        : empty ? <div className="vc-empty" style={{ minHeight: Math.min(height, 180) }}>{empty}</div>
        : children}
      {!loading && !empty && table && (
        <details className="vc-table">
          <summary>Show as table</summary>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead><tr>{table.head.map((h, i) => <th key={h} className={i ? 'num' : undefined}>{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'num' : undefined}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}

const useSafeId = () => useId().replace(/[^a-zA-Z0-9_-]/g, '');
const axisProps = (t) => ({ tick: { fontSize: 12, fill: t.tick }, axisLine: false, tickLine: false });

// Months over time. kind 'area' fills each series with a fading wash of its own hue.
export function TrendChart({ rows, x = 'month', series, format = fmtCount, yFormat, height = 240, label, kind = 'area' }: any) {
  const t = useChartTheme();
  const uid = useSafeId();
  const [hover, setHover] = useState(null);
  // Two points make a misleading slope and one makes no line at all, so short histories read as bars.
  if (rows.length < 3) return <BarsChart rows={rows} x={x} series={series} format={format} yFormat={yFormat} height={height} label={label} />;
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? t.series[i] }));
  return (
    <div className="vc-plot" role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }} accessibilityLayer={false}
          onMouseLeave={() => setHover(null)}>
          <defs>
            {colored.map((s) => (
              <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={kind === 'area' ? (t.dark ? 0.34 : 0.24) : 0} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
            <filter id={`${uid}-lift`} x="-5%" y="-20%" width="110%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity={t.dark ? 0.45 : 0.16} />
            </filter>
          </defs>
          <CartesianGrid stroke={t.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey={x} {...axisProps(t)} interval="preserveStartEnd" minTickGap={12} dy={6} />
          <YAxis {...axisProps(t)} width={yFormat ? 52 : 36} allowDecimals={false} tickCount={5} tickFormatter={yFormat ?? format} />
          <Tooltip cursor={{ stroke: t.tick, strokeDasharray: '3 3', strokeWidth: 1 }}
            content={(p) => <ChartTip {...p} format={format} />} />
          {colored.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2}
              fill={`url(#${uid}-${s.key})`} filter={`url(#${uid}-lift)`}
              strokeOpacity={hover && hover !== s.key ? 0.3 : 1} fillOpacity={hover && hover !== s.key ? 0.3 : 1}
              dot={rows.length <= 12 ? { r: 3.5, strokeWidth: 2, stroke: t.surface, fill: s.color } : false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: t.surface, fill: s.color }}
              isAnimationActive={t.animate} animationDuration={MOTION_MS} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Grouped bars (vertical) or ranked bars (layout="horizontal" lists categories down the side).
export function BarsChart({ rows, x = 'month', series, format = fmtCount, yFormat, height = 240, label, layout = 'vertical', categoryWidth = 96 }: any) {
  const t = useChartTheme();
  const horizontal = layout === 'horizontal';
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? t.series[i] }));
  // A clamped bar width spreads a group apart; short series get a fixed width so groups stay together.
  const fixed = !horizontal && rows.length * series.length <= 8 ? 26 : undefined;
  return (
    <div className="vc-plot" role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} accessibilityLayer={false}
          margin={{ top: 6, right: horizontal ? 16 : 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap={horizontal ? '24%' : '28%'}>
          <CartesianGrid stroke={t.grid} strokeDasharray="2 4" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? <>
            <XAxis type="number" {...axisProps(t)} allowDecimals={false} tickFormatter={yFormat ?? format} />
            <YAxis type="category" dataKey={x} {...axisProps(t)} width={categoryWidth} interval={0} />
          </> : <>
            <XAxis dataKey={x} {...axisProps(t)} interval="preserveStartEnd" minTickGap={8} dy={6} />
            <YAxis {...axisProps(t)} width={yFormat ? 52 : 36} allowDecimals={false} tickCount={5} tickFormatter={yFormat ?? format} />
          </>}
          <Tooltip cursor={{ fill: t.grid, fillOpacity: 0.25 }} content={(p) => <ChartTip {...p} format={format} />} />
          {colored.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} maxBarSize={horizontal ? 18 : 30} barSize={fixed}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={t.animate} animationDuration={MOTION_MS}>
              {s.cellColors && rows.map((r, i) => <Cell key={i} fill={s.cellColors(r, t) ?? s.color} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Part-to-whole ring with the total in the hole and a value + share legend; hover links slice and row.
export function DonutChart({ items, format = fmtCount, totalLabel = 'Total', totalFormat, height = 220, label }: any) {
  const t = useChartTheme();
  const [hover, setHover] = useState(null);
  const data = useMemo(() => items.filter((d) => Number(d.value) > 0)
    .map((d, i) => ({ ...d, value: Number(d.value), color: d.color ?? t.series[i % t.series.length], __fmt: format })), [items, t, format]);
  const total = data.reduce((s, d) => s + d.value, 0);
  const focus = data.find((d) => d.key === hover);
  return (
    <div className="vc-donut">
      <div className="vc-ring" role="img" aria-label={label} style={{ height, width: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer={false}>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="94%" paddingAngle={data.length > 1 ? 1.5 : 0}
              cornerRadius={4} stroke={t.surface} strokeWidth={2} startAngle={90} endAngle={-270}
              onMouseEnter={(_, i) => setHover(data[i]?.key)} onMouseLeave={() => setHover(null)}
              isAnimationActive={t.animate} animationDuration={MOTION_MS}>
              {data.map((d) => <Cell key={d.key} fill={d.color} fillOpacity={hover && hover !== d.key ? 0.35 : 1} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="vc-hole" aria-hidden="true">
          <b>{focus ? pct(focus.value, total) : (totalFormat ?? format)(total)}</b>
          <span>{focus ? focus.label : totalLabel}</span>
        </div>
      </div>
      <ul className="vc-dlist">
        {data.map((d) => (
          <li key={d.key} className={hover && hover !== d.key ? 'dim' : undefined}
            onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}>
            <i className="vc-sw" style={{ '--c': d.color }} aria-hidden="true" />
            <span>{d.label}</span>
            <b>{format(d.value)}</b>
            <em>{pct(d.value, total)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Plain-language summary for role="img" charts: "Jan 3, Feb 5, ...".
export const describeSeries = (rows, x, key, format = fmtCount) => rows.map((r) => `${r[x]} ${format(r[key])}`).join(', ');
