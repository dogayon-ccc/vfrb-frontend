// src/pages/admin/ActivityLog.jsx
// Activity Log (Aug 22 2026 session) — manager-only.
//
// Reads ActivityLogController@index, a UNION view over 9 tables that
// already had actor/timestamp columns (daily_output_logs, qc_checklists,
// physical_count_logs, inventory_logs, delivery_tracking, purchase_orders,
// rfq_requests, material_usage_rates, order_production_tracking,
// company_settings). This page invents nothing — it's a filtered,
// paginated view of activity that was already being recorded.
//
// Explicitly NOT included (per the scoping conversation): login/logout
// history (no auth_logs table exists), and this is not a cryptographically
// immutable ledger — it's a read view over mutable operational tables.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const ACTION_LABELS = {
  output_logged:         { label: 'Output Logged',      icon: '📦', color: '#028090' },
  stage_progress:        { label: 'Stage Progress',      icon: '🏭', color: '#7C3AED' },
  qc_checked:             { label: 'QC Check',            icon: '✅', color: '#16A34A' },
  physical_count:         { label: 'Physical Count',      icon: '🔢', color: '#2563EB' },
  count_reconciled:       { label: 'Count Reconciled',    icon: '⚖️', color: '#2563EB' },
  inventory_stock_in:     { label: 'Stock In',            icon: '⬇️', color: '#16A34A' },
  inventory_stock_out:    { label: 'Stock Out',           icon: '⬆️', color: '#DC2626' },
  inventory_adjustment:   { label: 'Stock Adjustment',    icon: '🔧', color: '#D97706' },
  inventory_wastage:      { label: 'Wastage Logged',      icon: '🗑️', color: '#DC2626' },
  delivery_updated:       { label: 'Delivery Update',     icon: '🚚', color: '#EA580C' },
  po_created:              { label: 'PO Created',          icon: '🧾', color: '#7C3AED' },
  rfq_created:             { label: 'RFQ Created',         icon: '📨', color: '#7C3AED' },
  usage_rate_set:          { label: 'Usage Rate Set',      icon: '📐', color: '#0891B2' },
  settings_updated:        { label: 'Settings Updated',    icon: '⚙️', color: '#64748B' },
};

const inp = { padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT };

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
}

export default function ActivityLog() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [page, setPage]           = useState(1);
  const [lastPage, setLastPage]   = useState(1);
  const [total, setTotal]         = useState(0);
  const [actionTypes, setActionTypes] = useState([]);

  const [filterAction, setFilterAction]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  useEffect(() => {
    axios.get('/api/admin/activity-log/action-types')
      .then(r => setActionTypes(r.data))
      .catch(() => {});
  }, []);

  const load = useCallback((targetPage = 1) => {
    setLoading(true);
    setError(null);
    const params = { page: targetPage, per_page: 20 };
    if (filterAction)   params.action    = filterAction;
    if (filterDateFrom) params.date_from = filterDateFrom;
    if (filterDateTo)   params.date_to   = filterDateTo;

    axios.get('/api/admin/activity-log', { params })
      .then(r => {
        setRows(r.data.data);
        setPage(r.data.current_page);
        setLastPage(r.data.last_page);
        setTotal(r.data.total);
      })
      .catch(() => setError('Could not load activity log.'))
      .finally(() => setLoading(false));
  }, [filterAction, filterDateFrom, filterDateTo]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', fontFamily:FONT }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>Activity Log</h1>
        <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
          Every logged output, QC check, stock movement, and PO/RFQ action across the system — {total} record{total === 1 ? '' : 's'}.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16, background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:14 }}>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={inp}>
          <option value="">All action types</option>
          {actionTypes.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>
          ))}
        </select>
        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={inp} title="From date"/>
        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={inp} title="To date"/>
        {(filterAction || filterDateFrom || filterDateTo) && (
          <button onClick={() => { setFilterAction(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            style={{ padding:'9px 14px', borderRadius:9, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding:'12px 16px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', fontSize:13, marginBottom:16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height:56, borderRadius:10, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:12 }}>
          <p style={{ fontSize:32, margin:'0 0 8px' }}>📋</p>
          <p style={{ fontSize:14, fontWeight:700, color:'#0f172a', margin:'0 0 4px' }}>No activity found</p>
          <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>Try adjusting the filters above.</p>
        </div>
      ) : (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
          <AnimatePresence>
            {rows.map((row, i) => {
              const meta = ACTION_LABELS[row.action_type] ?? { label: row.action_type, icon: '•', color: '#64748b' };
              return (
                <motion.div key={`${row.action_type}-${row.actor_user_id}-${row.occurred_at}-${i}`}
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', borderTop: i>0 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:`${meta.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:meta.color, textTransform:'uppercase', letterSpacing:'.03em' }}>{meta.label}</span>
                      <span style={{ fontSize:12, color:'#94a3b8' }}>·</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'#334155' }}>{row.actor_name}</span>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#94a3b8', background:'#f1f5f9', borderRadius:6, padding:'1px 6px' }}>{row.actor_role}</span>
                    </div>
                    <p style={{ fontSize:13, color:'#0f172a', margin:0 }}>{row.description}</p>
                  </div>
                  <span style={{ fontSize:11, color:'#94a3b8', whiteSpace:'nowrap', flexShrink:0, paddingTop:2 }} title={new Date(row.occurred_at).toLocaleString('en-PH')}>
                    {timeAgo(row.occurred_at)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {!loading && lastPage > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:16 }}>
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            style={{ padding:'8px 14px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color: page<=1 ? '#cbd5e1' : '#0f172a', fontSize:13, fontWeight:600, cursor: page<=1 ? 'not-allowed' : 'pointer', fontFamily:FONT }}>
            ← Prev
          </button>
          <span style={{ fontSize:13, color:'#64748b' }}>Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1)}
            style={{ padding:'8px 14px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color: page>=lastPage ? '#cbd5e1' : '#0f172a', fontSize:13, fontWeight:600, cursor: page>=lastPage ? 'not-allowed' : 'pointer', fontFamily:FONT }}>
            Next →
          </button>
        </div>
      )}

      <style>{`@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}
