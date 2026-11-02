// How often staff and customers accept AI-recommended materials (GET /api/admin/ai/recommendation-metrics). Read-only.
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Panel, PillTabs, StatGrid, DataTable, SkeletonRows, EmptyBlock, ErrorBlock } from './AdminUI';

const WINDOWS = [{ key: '3', label: '3 months' }, { key: '6', label: '6 months' }, { key: '12', label: '12 months' }];
const pct = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`);
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

function RateTable({ label, first, firstKey, rows }) {
  return (
    <DataTable label={label} mobileCards densityToggle={false} className="adm-flush-table">
      <thead><tr><th>{first}</th><th>Lines</th><th>Staff accepted</th><th>Staff rate</th><th>Customer rate</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[firstKey]}>
            <td data-label={first} style={{ fontWeight: 600 }}>{firstKey === 'month' ? monthLabel(r.month) : r.garment}</td>
            <td data-label="Lines">{r.lines}</td>
            <td data-label="Staff accepted">{r.staff_accepted} of {r.staff_accepted + r.staff_rejected}</td>
            <td data-label="Staff rate">{pct(r.staff_acceptance_rate)}</td>
            <td data-label="Customer rate">{pct(r.customer_acceptance_rate)}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export default function AiQualityPanel() {
  const [months, setMonths] = useState('6');
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setData(null);
    return axios.get('/api/admin/ai/recommendation-metrics', { params: { months } })
      .then((r) => setData(r.data))
      .catch(() => setFailed(true));
  }, [months]);
  useEffect(() => { load(); }, [load]);

  const o = data?.overall;
  return (
    <Panel title="AI recommendation quality" style={{ marginTop: 16 }}>
      <p className="adm-sub" style={{ marginTop: -6 }}>
        How often staff and customers accept the materials the AI recommends. Materials customers picked themselves are not counted.
      </p>
      <PillTabs tabs={WINDOWS} value={months} onChange={setMonths} />

      {failed ? <ErrorBlock msg="Could not load AI quality figures." onRetry={load} />
        : !data ? <SkeletonRows rows={3} h={44} />
        : o.lines === 0 ? <EmptyBlock>No AI-recommended materials in this period yet.</EmptyBlock>
        : (
          <>
            <StatGrid items={[
              { label: 'Staff acceptance', value: pct(o.staff_acceptance_rate), sub: `${o.staff_accepted} accepted, ${o.staff_rejected} rejected` },
              { label: 'Customer acceptance', value: pct(o.customer_acceptance_rate), sub: `${o.customer_accepted} accepted, ${o.customer_rejected} rejected` },
              { label: 'Lines counted', value: o.lines, sub: `Since ${new Date(`${data.since}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` },
            ]} />
            <h3 className="adm-sub" style={{ margin: '16px 0 6px', fontWeight: 600 }}>By garment</h3>
            <RateTable label="Acceptance by garment" first="Garment" firstKey="garment" rows={data.by_garment} />
            <h3 className="adm-sub" style={{ margin: '16px 0 6px', fontWeight: 600 }}>By month</h3>
            <RateTable label="Acceptance by month" first="Month" firstKey="month" rows={data.by_month} />
            <p className="adm-sub" style={{ margin: '10px 0 0', fontSize: 12 }}>{data.note}</p>
          </>
        )}
    </Panel>
  );
}
