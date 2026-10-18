import { useEffect, useState } from 'react';
import axios from 'axios';

// Horizontal stage bar from GET /api/admin/orders/{id}/production-summary: each stage shows "completed / total".
// Pass `summary` when the caller already has it (bulk /orders/production-summaries), else `orderId` to fetch.
// `compact` renders the one-line version used in the orders list.

const CSS = `
.pp{display:grid;grid-template-columns:repeat(var(--n),minmax(92px,1fr));gap:8px;overflow-x:auto;padding-bottom:2px}
.pp-cell{position:relative;display:flex;flex-direction:column;gap:6px;padding:12px 12px 10px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);min-width:0}
.pp-cell.now{border-color:var(--teal);box-shadow:0 0 0 2px var(--teal-100)}
.pp-cell.done{background:var(--success-bg);border-color:transparent}
.pp-lbl{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-subtle);white-space:nowrap}
.pp-cell.now .pp-lbl{color:var(--teal)}
.pp-num{font-size:26px;font-weight:800;line-height:1;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.pp-num small{font-size:14px;font-weight:600;color:var(--text-faint)}
.pp-cell.done .pp-num{color:var(--success-text)}
.pp-trk{height:6px;border-radius:99px;background:var(--bg-surface);overflow:hidden}
.pp-trk i{display:block;height:100%;border-radius:inherit;background:var(--teal)}
.pp-cell.done .pp-trk i{background:var(--success)}
.pp-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.pp-head b{font-size:15px}
.pp-head span{font-size:12px;color:var(--text-subtle)}
.ppc{display:flex;flex-direction:column;gap:4px;min-width:150px}
.ppc-top{display:flex;justify-content:space-between;gap:8px;font-size:12px}
.ppc-top b{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
.ppc-seg{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:2px}
.ppc-seg i{height:6px;border-radius:2px;background:var(--bg-surface);overflow:hidden;position:relative}
.ppc-seg i>u{position:absolute;inset:0 auto 0 0;background:var(--teal)}
.ppc-seg i.done>u{background:var(--success)}
@media(max-width:640px){.pp{grid-template-columns:repeat(var(--n),minmax(84px,1fr))}.pp-num{font-size:22px}}
`;

export function progressStages(s) {
  if (!s?.stages) return [];
  const total = Number(s.total_ordered) || 0;
  const list = s.stages.map((st) => ({ key: st.stage, label: st.label, done: Number(st.completed) || 0, total: Number(st.total_ordered) || total }));
  list.push({ key: 'delivered', label: 'Delivered', done: Number(s.delivered_total) || 0, total });
  return list;
}

// The stage the order is on: its status, or Delivered once packing is finished.
const currentKey = (s) => (s?.status === 'for_delivery' ? 'delivered' : s?.status === 'completed' ? null : s?.status);

export function useProductionSummary(orderId, summary) {
  const [data, setData] = useState(summary ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (summary !== undefined) { setData(summary); return undefined; }
    if (!orderId) return undefined;
    let off = false;
    setFailed(false);
    axios.get(`/api/admin/orders/${orderId}/production-summary`)
      .then((r) => { if (!off) setData(r.data); })
      .catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [orderId, summary]);
  return [data, failed];
}

export default function ProductionProgress({ orderId, summary, compact = false, title = 'Production progress' }) {
  const [s, failed] = useProductionSummary(orderId, summary);
  const stages = progressStages(s);
  const now = currentKey(s);

  if (compact) {
    if (!stages.length) return <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{failed ? 'Unavailable' : '—'}</span>;
    const cur = stages.find((x) => x.key === now) ?? stages[stages.length - 1];
    return (
      <div className="ppc" style={{ '--n': stages.length }} aria-label={`${cur.label} ${cur.done} of ${cur.total}`}>
        <style>{CSS}</style>
        <div className="ppc-top"><span>{cur.label}</span><b>{cur.done}/{cur.total}</b></div>
        <div className="ppc-seg">
          {stages.map((x) => {
            const pct = x.total > 0 ? Math.min(100, (x.done / x.total) * 100) : 0;
            return <i key={x.key} className={pct >= 100 ? 'done' : ''} title={`${x.label} ${x.done}/${x.total}`}><u style={{ width: `${pct}%` }} /></i>;
          })}
        </div>
      </div>
    );
  }

  if (!s) {
    return failed
      ? <div className="adm-callout danger" role="alert"><div><b>Production progress could not be loaded.</b></div></div>
      : <div className="adm-sk" style={{ height: 96, marginBottom: 14 }} />;
  }

  const overall = stages.length ? stages[stages.length - 1] : null;
  return (
    <section aria-label={title} style={{ marginBottom: 16 }}>
      <style>{CSS}</style>
      <div className="pp-head">
        <b>{title}</b>
        {overall && <span>{s.packed_total ?? 0} packed · {overall.done} of {overall.total} delivered</span>}
      </div>
      <div className="pp" style={{ '--n': stages.length }} role="list">
        {stages.map((x) => {
          const pct = x.total > 0 ? Math.min(100, (x.done / x.total) * 100) : 0;
          const cls = pct >= 100 ? 'done' : x.key === now ? 'now' : '';
          return (
            <div key={x.key} role="listitem" className={`pp-cell ${cls}`} aria-current={x.key === now ? 'step' : undefined}>
              <span className="pp-lbl">{x.label}</span>
              <span className="pp-num">{x.done}<small>/{x.total}</small></span>
              <span className="pp-trk"><i style={{ width: `${pct}%` }} /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
