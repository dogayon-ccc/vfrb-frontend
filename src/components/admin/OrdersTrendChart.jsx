import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Hex, not CSS vars: SVG presentation attributes ignore var().
const tick = { fontSize: 12, fill: '#64748b' };
const tip = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--ink)' };

// Orders placed per month from the dashboard API's order_trends; rows: [{ month, orders }].
export default function OrdersTrendChart({ rows }) {
  const label = `Orders placed per month: ${rows.map((r) => `${r.month} ${r.orders}`).join(', ')}.`;
  return (
    <div role="img" aria-label={label} style={{ width: '100%', minWidth: 0, height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} accessibilityLayer={false}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'rgba(2,128,144,0.08)' }} contentStyle={tip} />
          <Bar dataKey="orders" name="Orders" fill="#028090" radius={[6, 6, 0, 0]} isAnimationActive={!REDUCED} animationDuration={200} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
