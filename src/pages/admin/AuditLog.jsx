// Audit Log: read-only view of the insert-only audit_logs table (logins, failed logins, key writes).
// Manager and owner only. GET /api/admin/audit-logs; there is no write endpoint.
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PageHeader, Panel, ErrorBlock, EmptyBlock, SkeletonRows } from '../../components/admin/AdminUI';

const PER_PAGE = 20;

// 'login_failed' → 'Login failed'
const actionLabel = (a) => (a ? a.charAt(0).toUpperCase() + a.slice(1).replace(/_/g, ' ') : '—');
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const fmtEntity = (r) => (r.entity ? `${r.entity}${r.entity_id != null ? ` #${r.entity_id}` : ''}` : '—');

export default function AuditLog() {
  const [rows, setRows]         = useState([]);
  const [actions, setActions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal]       = useState(0);

  const [action, setAction]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const load = useCallback((target = 1) => {
    setLoading(true); setError('');
    const params = { page: target, per_page: PER_PAGE };
    if (action)   params.action    = action;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to   = dateTo;
    axios.get('/api/admin/audit-logs', { params })
      .then(({ data }) => {
        setRows(data.data ?? []);
        if (Array.isArray(data.actions)) setActions(data.actions);
        setPage(data.current_page ?? target);
        setLastPage(data.last_page ?? 1);
        setTotal(data.total ?? 0);
      })
      .catch((e) => setError(e.response?.data?.message ?? 'Could not load the audit log.'))
      .finally(() => setLoading(false));
  }, [action, dateFrom, dateTo]);

  useEffect(() => { load(1); }, [load]);

  const filtered = action || dateFrom || dateTo;

  return (
    <>
      <PageHeader title="Audit Log" sub={`Sign-ins, failed sign-ins and key changes · ${total} record${total === 1 ? '' : 's'} · read-only`} />

      <div className="adm-toolbar" style={{ justifyContent: 'flex-start' }}>
        <select className="adm-input" style={{ width: 'auto', minHeight: 44 }} value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <input type="date" className="adm-input" style={{ width: 'auto', minHeight: 44 }} value={dateFrom} max={dateTo || undefined}
          onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="adm-input" style={{ width: 'auto', minHeight: 44 }} value={dateTo} min={dateFrom || undefined}
          onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
        {filtered && <button className="adm-btn" style={{ minHeight: 44 }} onClick={() => { setAction(''); setDateFrom(''); setDateTo(''); }}>Clear filters</button>}
      </div>

      {error && <div style={{ marginBottom: 14 }}><ErrorBlock msg={error} onRetry={() => load(page)} /></div>}

      <Panel flush>
        {loading ? <SkeletonRows rows={6} /> : error ? null : rows.length === 0 ? (
          <EmptyBlock>{filtered ? 'No audit entries match these filters.' : 'No audit entries yet.'}</EmptyBlock>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr>{['Date', 'Name', 'Action', 'Entity', 'IP'].map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.audit_id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                    <td>{r.user_name ?? <span style={{ color: 'var(--text-subtle)' }}>Unknown</span>}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: r.action === 'login_failed' ? 'var(--danger-text)' : undefined }}>{actionLabel(r.action)}</td>
                    <td style={{ color: 'var(--text-subtle)' }}>{fmtEntity(r)}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{r.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!loading && !error && lastPage > 1 && (
        <nav aria-label="Audit log pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="adm-btn" style={{ minHeight: 44 }} disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Page {page} of {lastPage}</span>
          <button className="adm-btn" style={{ minHeight: 44 }} disabled={page >= lastPage} onClick={() => load(page + 1)}>Next →</button>
        </nav>
      )}
    </>
  );
}
