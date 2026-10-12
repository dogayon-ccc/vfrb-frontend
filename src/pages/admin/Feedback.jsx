import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { NavIcon } from '../../components/ui';
import { PageHeader, PillTabs, Panel, StatusPill, ErrorBlock, SkeletonRows, Toast, useToast } from '../../components/admin/AdminUI';

const CATEGORY_ICON = { bug: 'bug', suggestion: 'suggestion', other: 'chat' };
const STATUS = { new: ['pending', 'New'], reviewed: ['confirmed', 'Reviewed'], archived: ['default', 'Archived'] };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

export default function AdminFeedback() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [filter, setFilter]   = useState('');
  const [toast, setToast]     = useToast();

  const load = useCallback(() => {
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/feedback', { params: filter ? { status: filter } : {} })
      .then(({ data }) => setItems(data?.data ?? data ?? []))
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    const prev = items;
    setItems(items.map((i) => (i.feedback_id === id ? { ...i, status } : i)));
    try { await axios.patch(`/api/admin/feedback/${id}`, { status }); }
    catch { setItems(prev); setToast({ type: 'error', msg: 'Could not update that feedback. Please retry.' }); }
  };

  return (
    <>
      <Toast toast={toast} />
      <PageHeader title="Feedback" sub="What customers and staff have said about the system itself">
        <button className="adm-btn" onClick={load}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>
      <PillTabs value={filter} onChange={setFilter} tabs={[{ key: '', label: 'All' }, { key: 'new', label: 'New' }, { key: 'reviewed', label: 'Reviewed' }, { key: 'archived', label: 'Archived' }]} />
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load feedback." onRetry={load} /></div>}

      {loading ? <Panel flush><SkeletonRows rows={3} h={90} /></Panel> : loadErr ? null : items.length === 0 ? (
        <Panel><div className="adm-empty"><NavIcon name="chat" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>{filter ? `No ${STATUS[filter][1].toLowerCase()} feedback` : 'No feedback yet'}</div></div></Panel>
      ) : (
        <div className="adm-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} key={filter}>
          {items.map((item, i) => {
            const [tone, label] = STATUS[item.status] ?? STATUS.new;
            return (
              <div key={item.feedback_id} className="adm-mcard" style={{ '--i': Math.min(i, 8), marginBottom: 0 }}>
                <div className="adm-mrow">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, minWidth: 0 }}>
                    <NavIcon name={CATEGORY_ICON[item.category] ?? 'chat'} size={14} color="var(--text-subtle)" />
                    {item.user?.name ?? 'Unknown user'}
                    {item.created_at && <small style={{ fontWeight: 400, color: 'var(--text-faint)' }}>· {fmtDate(item.created_at)}</small>}
                  </span>
                  <StatusPill status={tone} label={label} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.55, overflowWrap: 'anywhere' }}>{item.message}</p>
                {item.status !== 'archived' && (
                  <div className="adm-mfoot">
                    {item.status !== 'reviewed' && <button className="adm-btn" onClick={() => setStatus(item.feedback_id, 'reviewed')}><NavIcon name="success" size={13} color="currentColor" /> Mark reviewed</button>}
                    <button className="adm-btn" onClick={() => setStatus(item.feedback_id, 'archived')}>Archive</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
