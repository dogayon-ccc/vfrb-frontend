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
//
// RESHAPED (Sept 3 2026): unlike Login.jsx/Suppliers.jsx, this file's 13
// action-type colors are a deliberate categorization taxonomy, not a
// brand mismatch — forcing them all to teal would make 13 event types
// harder to tell apart at a glance, not more consistent. Mapped each to
// the nearest real theme.css semantic token instead (teal/purple/
// success/info/danger/warning/text-muted — all 7 hues already exist as
// real tokens, confirmed before using any of them).
//
// One judgment call, not silently made: `delivery_updated` was a
// distinct orange (#EA580C) in the original, with no equivalent token
// in theme.css. Adding a brand-new global --orange token for exactly
// one action type felt like a bigger decision than a single-page
// reshape should make unilaterally, so it's mapped to --warning
// (amber) instead — slightly less distinct from inventory_adjustment
// than before. Flagging this explicitly in case a dedicated logistics
// color is wanted later.
//
// Icon-chip backgrounds: the original used a `${hexColor}15` alpha-
// suffix trick, which doesn't work with var() references. Used each
// hue's existing pale `-50`/`-bg` token instead (--teal-50, --purple-50,
// --success-bg, etc.) — all already real, none invented for this page.
//
// Logic (filters, pagination, the ActivityLogController@index contract)
// completely untouched.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Card, NavIcon } from '../../components/ui';

const ACTION_LABELS = {
  output_logged:        { label: 'Output Logged',      icon: 'package',      color: 'var(--teal)',       bg: 'var(--teal-50)' },
  stage_progress:       { label: 'Stage Progress',      icon: 'production',   color: 'var(--purple)',     bg: 'var(--purple-50)' },
  qc_checked:            { label: 'QC Check',            icon: 'qc',            color: 'var(--success)',    bg: 'var(--success-bg)' },
  physical_count:        { label: 'Physical Count',      icon: 'physicalCount', color: 'var(--info)',       bg: 'var(--info-bg)' },
  count_reconciled:      { label: 'Count Reconciled',    icon: 'reconcile',    color: 'var(--info)',       bg: 'var(--info-bg)' },
  inventory_stock_in:    { label: 'Stock In',            icon: 'stockIn',      color: 'var(--success)',    bg: 'var(--success-bg)' },
  inventory_stock_out:   { label: 'Stock Out',           icon: 'stockOut',     color: 'var(--danger)',     bg: 'var(--danger-bg)' },
  inventory_adjustment:  { label: 'Stock Adjustment',    icon: 'adjustment',   color: 'var(--warning)',    bg: 'var(--warning-bg)' },
  inventory_wastage:     { label: 'Wastage Logged',      icon: 'delete',       color: 'var(--danger)',     bg: 'var(--danger-bg)' },
  delivery_updated:      { label: 'Delivery Update',     icon: 'delivery',     color: 'var(--warning)',    bg: 'var(--warning-bg)' },
  po_created:             { label: 'PO Created',          icon: 'invoice',      color: 'var(--purple)',     bg: 'var(--purple-50)' },
  rfq_created:            { label: 'RFQ Created',         icon: 'email',        color: 'var(--purple)',     bg: 'var(--purple-50)' },
  // usage_rate_set entry removed Aug 29 2026 — backend no longer emits this
  // action_type (source data was deleted in the no-formula redesign).
  settings_updated:       { label: 'Settings Updated',    icon: 'settings',     color: 'var(--text-muted)', bg: 'var(--bg-surface)' },
};

const inp = { padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)' };

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
    <div style={{ maxWidth:1000, margin:'0 auto', fontFamily:'var(--font)' }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', margin:'0 0 4px' }}>Activity Log</h1>
        <p style={{ fontSize:13, color:'var(--text-subtle)', margin:0 }}>
          Every logged output, QC check, stock movement, and PO/RFQ action across the system — {total} record{total === 1 ? '' : 's'}.
        </p>
      </div>

      {/* Filters */}
      <Card padding="sm" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
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
              style={{ padding:'9px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-subtle)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 16px', borderRadius:'var(--r-md)', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', color:'var(--danger)', fontSize:13, marginBottom:16 }}>
          <NavIcon name="warning" size={14} color="var(--danger)" />{error}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height:56, borderRadius:'var(--r-md)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'al-shimmer 1.4s infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <NavIcon name="outputLog" size={32} color="var(--text-faint)" style={{ marginBottom:8 }} />
            <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', margin:'0 0 4px' }}>No activity found</p>
            <p style={{ fontSize:12, color:'var(--text-faint)', margin:0 }}>Try adjusting the filters above.</p>
          </div>
        </Card>
      ) : (
        <Card padding="sm" bodyStyle={{ padding:0 }}>
          <AnimatePresence>
            {rows.map((row, i) => {
              const meta = ACTION_LABELS[row.action_type] ?? { label: row.action_type, icon: null, color: 'var(--text-subtle)', bg: 'var(--bg-surface)' };
              return (
                <motion.div key={`${row.action_type}-${row.actor_user_id}-${row.occurred_at}-${i}`}
                  initial={{ opacity:0 }} animate={{ opacity:1 }}
                  style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', borderTop: i>0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:34, height:34, borderRadius:'var(--r-md)', background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {meta.icon ? <NavIcon name={meta.icon} size={16} color={meta.color} /> : <span style={{ color:meta.color, fontSize:16 }}>•</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:meta.color, textTransform:'uppercase', letterSpacing:'.03em' }}>{meta.label}</span>
                      <span style={{ fontSize:12, color:'var(--text-faint)' }}>·</span>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)' }}>{row.actor_name}</span>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'var(--text-faint)', background:'var(--bg-surface)', borderRadius:'var(--r-xs)', padding:'1px 6px' }}>{row.actor_role}</span>
                    </div>
                    <p style={{ fontSize:13, color:'var(--ink)', margin:0 }}>{row.description}</p>
                  </div>
                  <span style={{ fontSize:11, color:'var(--text-faint)', whiteSpace:'nowrap', flexShrink:0, paddingTop:2 }} title={new Date(row.occurred_at).toLocaleString('en-PH')}>
                    {timeAgo(row.occurred_at)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Card>
      )}

      {/* Pagination */}
      {!loading && lastPage > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:16 }}>
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            style={{ padding:'8px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color: page<=1 ? 'var(--text-faint)' : 'var(--ink)', fontSize:13, fontWeight:600, cursor: page<=1 ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}>
            ← Prev
          </button>
          <span style={{ fontSize:13, color:'var(--text-subtle)' }}>Page {page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => load(page + 1)}
            style={{ padding:'8px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color: page>=lastPage ? 'var(--text-faint)' : 'var(--ink)', fontSize:13, fontWeight:600, cursor: page>=lastPage ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}>
            Next →
          </button>
        </div>
      )}

      <style>{`@keyframes al-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  );
}
