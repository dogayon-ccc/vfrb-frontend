// The PH size chart as a compact table (Order Wizard sizing step, Studio Details panel). Styles: .size-chart in styles/customer.css.
import { PH_SIZE_CHART } from '../utils/sizeChart';

const COLS = { tops: ['Size', 'Chest', 'Body Length', 'Shoulder'], bottoms: ['Size', 'Waist', 'Hip', 'Length'] };
const HEAD = { 'Body Length': 'Length' };
// Chart is stored in cm; inches round to the nearest half inch.
const toIn = cell => cell.replace(/\d+(\.\d+)?/g, n => String(Math.round((Number(n) / 2.54) * 2) / 2));

export default function SizeChartTable({ kind = 'tops', unit = 'cm', note = 'Measurements vary by garment; check the chart.' }) {
  const c = PH_SIZE_CHART[kind] ?? PH_SIZE_CHART.tops;
  const names = COLS[kind] ?? COLS.tops, cols = names.map(h => c.headers.indexOf(h));
  const cell = (v, i) => (unit === 'in' && i > 0 ? toIn(v) : v);
  return (
    <div className="size-chart">
      <table>
        <caption>Size chart ({unit === 'in' ? 'inches' : c.unit})</caption>
        <thead><tr>{names.map(h => <th key={h} scope="col">{HEAD[h] ?? h}</th>)}</tr></thead>
        <tbody>{c.rows.map(r => <tr key={r[0]}>{cols.map((i, n) => <td key={i}>{cell(r[i], n)}</td>)}</tr>)}</tbody>
      </table>
      {note && <p>{note}</p>}
    </div>
  );
}
