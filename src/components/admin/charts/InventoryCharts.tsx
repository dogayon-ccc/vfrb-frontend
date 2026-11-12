import { useMemo } from 'react';
import { ChartCard, BarsChart, DonutChart, useChartTheme, fmtPeso, fmtPesoShort } from './VfrbCharts';

const TOP = 7;

// Stock health and stock value, aggregated from the /api/admin/inventory rows the page already holds.
export default function InventoryCharts({ flagCount, materials, showValue }: any) {
  const t = useChartTheme();
  const byCat = useMemo(() => {
    const m = new Map();
    for (const r of materials) {
      const v = (Number(r.quantity_in_stock) || 0) * (Number(r.unit_cost) || 0);
      const k = r.category ?? 'Uncategorised';
      m.set(k, (m.get(k) ?? 0) + v);
    }
    const rows = [...m].map(([category, value]) => ({ category, value })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    if (rows.length <= TOP) return rows;
    return [...rows.slice(0, TOP - 1), { category: 'Other', value: rows.slice(TOP - 1).reduce((s, r) => s + r.value, 0) }];
  }, [materials]);
  const total = byCat.reduce((s, r) => s + r.value, 0);
  const health = [
    { key: 'ok', label: 'In stock', value: flagCount.ok, color: t.status.ok },
    { key: 'low', label: 'At or below reorder', value: flagCount.low, color: t.status.low },
    { key: 'out', label: 'Out of stock', value: flagCount.out, color: t.status.out },
  ];
  const barH = Math.max(170, byCat.length * 32);
  return (
    <div className="vc-grid" style={{ marginBottom: 16 }}>
      <ChartCard className={showValue ? 'vc-narrow' : 'vc-full'} title="Stock health" subtitle="VFRB materials by reorder flag" height={200}
        empty={!materials.length && 'No materials yet.'}>
        <DonutChart items={health} height={190} totalLabel="materials"
          label={`Stock health: ${health.map((h) => `${h.label} ${h.value}`).join(', ')}.`} />
      </ChartCard>
      {showValue && (
        <ChartCard className="vc-wide" title="Stock value by category" subtitle="On hand × unit cost" height={barH}
          empty={!byCat.length && 'No unit costs recorded yet.'} figure={fmtPeso(total)} figureNote="total stock value"
          table={{ head: ['Category', 'Value'], rows: byCat.map((r) => [r.category, fmtPeso(r.value)]) }}>
          <BarsChart rows={byCat} x="category" layout="horizontal" height={barH} categoryWidth={110} format={fmtPeso} yFormat={fmtPesoShort}
            series={[{ key: 'value', name: 'Stock value' }]}
            label={`Stock value by category: ${byCat.map((r) => `${r.category} ${fmtPeso(r.value)}`).join(', ')}.`} />
        </ChartCard>
      )}
    </div>
  );
}
