// src/pages/admin/Feedback.jsx
// NEW — added Aug 27 2026. Manager-only triage view for the minimal
// feedback system (see backend migration comment for scope rationale —
// deliberately no upvoting/public board).

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const T    = '#028090';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

const STATUS_STYLE = {
  new:      { bg: '#fef2f2', fg: '#dc2626', label: 'New' },
  reviewed: { bg: '#fffbeb', fg: '#d97706', label: 'Reviewed' },
  archived: { bg: '#f1f5f9', fg: '#64748b', label: 'Archived' },
};
const CATEGORY_ICON = { bug: '🐛', suggestion: '💡', other: '💬' };

export default function AdminFeedback() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = filter ? { status: filter } : {};
    axios.get('/api/admin/feedback', { params })
      .then(({ data }) => setItems(data?.data ?? data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    const prev = items;
    setItems(items.map(i => i.feedback_id === id ? { ...i, status } : i));
    try {
      await axios.patch(`/api/admin/feedback/${id}`, { status });
    } catch {
      setItems(prev);
    }
  };

  return (
    <div style={{ fontFamily: FONT, paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Feedback</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          What customers and staff have said about the system itself.
        </p>
      </div>

      <select value={filter} onChange={e => setFilter(e.target.value)} style={{
        padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
        background: '#fff', fontSize: 13, marginBottom: 16, fontFamily: FONT,
      }}>
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="reviewed">Reviewed</option>
        <option value="archived">Archived</option>
      </select>

      {loading ? (
        <p style={{ color: '#64748b', fontSize: 13 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
          <p style={{ fontSize: 14 }}>No feedback yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.new;
            return (
              <div key={item.feedback_id} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {CATEGORY_ICON[item.category] ?? '💬'} {item.user?.name ?? 'Unknown user'}
                  </span>
                  <span style={{ background: st.bg, color: st.fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{st.label}</span>
                </div>
                <p style={{ fontSize: 13, color: '#334155', margin: '0 0 10px' }}>{item.message}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {item.status !== 'reviewed' && (
                    <button onClick={() => setStatus(item.feedback_id, 'reviewed')} style={{
                      background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                      borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 36,
                    }}>Mark Reviewed</button>
                  )}
                  {item.status !== 'archived' && (
                    <button onClick={() => setStatus(item.feedback_id, 'archived')} style={{
                      background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
                      borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', minHeight: 36,
                    }}>Archive</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
