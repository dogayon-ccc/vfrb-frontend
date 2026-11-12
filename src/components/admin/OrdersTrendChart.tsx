import { TrendChart, BarsChart, describeSeries, fmtPeso, fmtPesoShort } from './charts/VfrbCharts';

// Orders placed per month from the dashboard API's order_trends; rows: [{ month, orders }].
export default function OrdersTrendChart({ rows }: any) {
  return <BarsChart rows={rows} height={220} series={[{ key: 'orders', name: 'Orders' }]}
    label={`Orders placed per month: ${describeSeries(rows, 'month', 'orders')}.`} />;
}

// Amount collected per payment month from the dashboard API's monthly_sales; rows: [{ month, total }].
export function RevenueTrendChart({ rows }: any) {
  return <TrendChart rows={rows} height={220} format={fmtPeso} yFormat={fmtPesoShort} series={[{ key: 'total', name: 'Collected' }]}
    label={`Collected per month: ${describeSeries(rows, 'month', 'total', fmtPeso)}.`} />;
}
