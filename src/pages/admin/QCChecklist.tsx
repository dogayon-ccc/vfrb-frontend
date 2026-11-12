// QC history (read-only): every submitted checklist from GET /api/admin/qc-checklists. New checks are recorded in Daily Output Log at the QC stage.
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import Badge from '../../components/ui/Badge';
import { PageHeader, Panel, Banner, PillTabs, SearchBox, SkeletonRows, EmptyBlock, OrderLink, RecordedBy } from '../../components/admin/AdminUI';
import { CHECKS } from '../../components/admin/QCChecklistForm';

const RESULTS = [{ key: '', label: 'All' }, { key: 'passed', label: 'Passed' }, { key: 'failed', label: 'Not passed' }];
const failedOf = (c) => CHECKS.filter((k) => c[k.key] === 0 || c[k.key] === false).map((k) => k.label);
const rate = (c) => (c.items_checked > 0 ? Math.round((c.items_passed / c.items_checked) * 100) : 0);

export default function AdminQCChecklist() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [last, setLast] = useState(1);
  const [result, setResult] = useState('');
  const [orderQ, setOrderQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  const orderId = /^\d+$/.test(orderQ.replace('#', '').trim()) ? orderQ.replace('#', '').trim() : '';
  const load = useCallback((p = 1) => {
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/qc-checklists', { params: { page: p, per_page: 25, result: result || undefined, order_id: orderId || undefined } })
      .then((r) => { setRows((cur) => (p === 1 ? r.data.data : [...cur, ...r.data.data])); setPage(r.data.current_page); setLast(r.data.last_page); })
      .catch(() => setLoadErr(true)).finally(() => setLoading(false));
  }, [result, orderId]);
  useEffect(() => { load(1); }, [load]);

  return (
    <>
      <PageHeader title="QC History" sub="Every QC checklist submitted, newest first · read-only">
        <button className="adm-btn" onClick={() => load(1)}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>

      <Banner tone="info" icon="info" action={<Link className="adm-btn" to="/admin/output-log">Open Output Log</Link>}>
        New QC checks are recorded in Daily Output Log: pick an order at the QC stage and the checklist opens there. The order moves to Pressing only after a passing check.
      </Banner>
      {loadErr && <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={() => load(1)}>Retry</button>}>QC history could not be loaded.</Banner>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <PillTabs value={result} onChange={setResult} tabs={RESULTS} />
        <div style={{ flex: '1 1 200px', maxWidth: 280 }}><SearchBox value={orderQ} onChange={setOrderQ} placeholder="Order number" label="Filter by order number" /></div>
      </div>

      <Panel flush>
        {loading && rows.length === 0 ? <SkeletonRows rows={4} h={52} /> : rows.length === 0 ? (
          <EmptyBlock><NavIcon name="qc" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>{result || orderId ? 'No QC checks match these filters' : 'No QC checks recorded yet'}</div></EmptyBlock>
        ) : (
          <div className="adm-tbl-scroll">
            <table className="adm-table" style={{ minWidth: 720 }}>
              <thead><tr><th>Order</th><th>Result</th><th>Sample</th><th>Failed checks</th><th className="adm-hide-t">Notes</th><th>Recorded</th></tr></thead>
              <tbody>
                {rows.map((c) => {
                  const failed = failedOf(c);
                  return (
                    <tr key={c.check_id}>
                      <td><OrderLink id={c.order_id} /><div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{c.garment_type ?? '—'}</div></td>
                      <td><Badge tone={c.passed ? 'success' : 'danger'}>{c.passed ? 'Passed' : 'Not passed'}</Badge></td>
                      <td style={{ whiteSpace: 'nowrap' }}><b>{c.items_passed}/{c.items_checked}</b> <span style={{ color: 'var(--text-subtle)' }}>({rate(c)}%)</span></td>
                      <td style={{ color: failed.length ? 'var(--danger-text)' : 'var(--text-subtle)' }}>{failed.length ? failed.join(', ') : '—'}</td>
                      <td className="adm-hide-t" style={{ color: 'var(--text-muted)', maxWidth: 240 }}>{c.notes || '—'}</td>
                      <td><RecordedBy name={c.checked_by_name} at={c.checked_at} label="" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {page < last && (
          <div style={{ padding: 12, textAlign: 'center' }}>
            <button className="adm-btn" onClick={() => load(page + 1)} disabled={loading}>{loading ? 'Loading…' : 'Load more'}</button>
          </div>
        )}
      </Panel>
    </>
  );
}
