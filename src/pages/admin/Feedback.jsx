// src/pages/admin/Feedback.jsx
// NEW — added Aug 27 2026. Manager-only triage view for the minimal
// feedback system (see backend migration comment for scope rationale —
// deliberately no upvoting/public board).
//
// RESHAPED (Sept 2 2026): brought into compliance with theme.css's own
// stated rule ("NO hardcoded colors in component files — use these
// vars") — this file previously had zero var(--) usage, same as every
// other admin page except Landing.jsx (checked all 24, this wasn't a
// one-off). Also swapped emoji category icons for NavIcon (matching the
// icon-cleanup convention already applied to AdminLayout/CustomerLayout/
// DesignStudio), and switched the status pill to the shared Badge
// component instead of a hand-rolled span — Badge already existed but
// was unused here. Logic below (axios calls, optimistic status update,
// filter state) is untouched — this is a visual-layer-only pass.
//
// Dropped: an unused `const T = '#028090'` that was never actually
// referenced anywhere in the file — dead code, not a functional change.

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, Badge, NavIcon } from '../../components/ui';

const CATEGORY_ICON = { bug: 'bug', suggestion: 'suggestion', other: 'chat' };
const STATUS_TONE   = { new: 'danger', reviewed: 'warning', archived: 'neutral' };
const STATUS_LABEL  = { new: 'New', reviewed: 'Reviewed', archived: 'Archived' };

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
    <div style={{ fontFamily: 'var(--font)', paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
          Feedback
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-subtle)', margin: '4px 0 0' }}>
          What customers and staff have said about the system itself.
        </p>
      </div>

      <select value={filter} onChange={e => setFilter(e.target.value)} style={{
        padding: '10px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
        background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 'var(--text-base)',
        fontFamily: 'var(--font)', marginBottom: 16, minHeight: 44,
      }}>
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="reviewed">Reviewed</option>
        <option value="archived">Archived</option>
      </select>

      {loading ? (
        <p style={{ color: 'var(--text-subtle)', fontSize: 'var(--text-base)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-faint)' }}>
          <NavIcon name="chat" size={36} color="var(--text-faint)" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 'var(--text-md)' }}>No feedback yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <Card key={item.feedback_id} padding="sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--ink)' }}>
                  <NavIcon name={CATEGORY_ICON[item.category] ?? 'chat'} size={14} color="var(--text-subtle)" />
                  {item.user?.name ?? 'Unknown user'}
                </span>
                <Badge tone={STATUS_TONE[item.status] ?? 'danger'}>
                  {STATUS_LABEL[item.status] ?? 'New'}
                </Badge>
              </div>
              <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                {item.message}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {item.status !== 'reviewed' && (
                  <button onClick={() => setStatus(item.feedback_id, 'reviewed')} style={{
                    background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)',
                    borderRadius: 'var(--r-md)', padding: '6px 12px', fontSize: 'var(--text-xs)', fontWeight: 700,
                    fontFamily: 'var(--font)', cursor: 'pointer', minHeight: 44,
                  }}>
                    Mark Reviewed
                  </button>
                )}
                {item.status !== 'archived' && (
                  <button onClick={() => setStatus(item.feedback_id, 'archived')} style={{
                    background: 'var(--bg-surface)', color: 'var(--text-subtle)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)', padding: '6px 12px', fontSize: 'var(--text-xs)', fontWeight: 700,
                    fontFamily: 'var(--font)', cursor: 'pointer', minHeight: 44,
                  }}>
                    Archive
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
