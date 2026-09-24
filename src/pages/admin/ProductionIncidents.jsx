// src/pages/admin/ProductionIncidents.jsx
// NEW PAGE — added Aug 25 2026 by Claude Account 3.
//
// Interview-grounded (VFRB_MaamFe_Interview_Transcript_Apr30.docx): two
// real shop-floor workflows with no prior system equivalent —
//   1. Machine breakdown — sewer reports to line leader, mechanic called
//      immediately ("Patawag ka ng mekaniko agad-agad").
//   2. Cutting damage — mover reports on the spot, line leader confirms
//      it wasn't intentional, piece re-cut to catch up.
//
// Any staff can report + acknowledge + resolve — this is an operational
// tool like QCChecklist/PhysicalCount, NOT manager-exclusive (unlike
// Reports/Suppliers/UserManagement).
//
// RESHAPED (Sept 4 2026): unlike ActivityLog/ProductionList, this page's
// 3 status colors are a genuine severity/status trio, not a categorical
// taxonomy — and they were already extremely close to real tokens
// (reported's #fef2f2/#dc2626 vs --danger-bg's exact #fef2f2, etc.), so
// this is the first reshaped page where the status pill maps onto
// Badge directly rather than needing a judgment call. TYPE_LABEL's
// icons also both already exist from the last two pages (Wrench for
// mechanical breakdown, Scissors for cutting damage — added originally
// for Materials.jsx/ProductionList.jsx, reused here as-is).
//
// Preserved deliberately, not "improved": the incident card's left
// border is hardcoded teal regardless of status (reported/
// acknowledged/resolved all get the same teal stripe) — that's the
// original's actual behavior, not an oversight, so it stays var(--teal)
// rather than becoming status-colored. Also preserved: the success-type
// toast uses brand teal, not semantic green — an existing app-wide
// choice (positive action = brand color), not something to "correct"
// into --success as part of a token-compliance pass.
//
// Logic (report/acknowledge/resolve, optimistic UI, the filters)
// completely untouched.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { Card, Badge, NavIcon }              from '../../components/ui';

const STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];

const inp = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--r-md)',
  border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--ink)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)',
};
const lbl = {
  display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.07em', color: 'var(--text-subtle)', marginBottom: 7, fontFamily: 'var(--font)',
};
const fi = e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px rgba(2,128,144,.1)'; };
const fo = e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; };

const STATUS_TONE = { reported: 'danger', acknowledged: 'warning', resolved: 'success' };
const STATUS_LABEL = { reported: 'Reported', acknowledged: 'Acknowledged', resolved: 'Resolved' };
const TYPE_LABEL = {
  machine_breakdown: { icon: 'adjustment', label: 'Machine Breakdown' },
  cutting_damage:     { icon: 'cutting',    label: 'Cutting Damage' },
};

function getIsManager() {
  return (JSON.parse(localStorage.getItem('vfrb_user') || '{}').role) === 'manager';
}

export default function ProductionIncidents() {
  const isManager = getIsManager();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [form, setForm] = useState({
    order_id: '', incident_type: 'machine_breakdown', stage: '',
    description: '', qty_affected: '',
  });

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterType)   params.incident_type = filterType;
    axios.get('/api/admin/production-incidents', { params })
      .then(({ data }) => setItems(data?.data ?? data ?? []))
      .catch(() => notify('Failed to load incidents.', 'error'))
      .finally(() => setLoading(false));
  }, [filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  const submitReport = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return notify('Description is required.', 'error');

    const payload = {
      incident_type: form.incident_type,
      description:   form.description.trim(),
      order_id:      form.order_id ? Number(form.order_id) : null,
      stage:         form.stage || null,
      qty_affected:  form.qty_affected ? Number(form.qty_affected) : null,
    };

    // Optimistic UI — insert a temp row instantly, roll back on failure
    const tempId = `temp-${Date.now()}`;
    const optimistic = { incident_id: tempId, ...payload, status: 'reported', created_at: new Date().toISOString() };
    setItems(prev => [optimistic, ...prev]);
    setShowForm(false);
    setForm({ order_id: '', incident_type: 'machine_breakdown', stage: '', description: '', qty_affected: '' });

    try {
      const { data } = await axios.post('/api/admin/production-incidents', payload);
      setItems(prev => prev.map(i => i.incident_id === tempId ? data : i));
      notify('Incident reported.');
    } catch {
      setItems(prev => prev.filter(i => i.incident_id !== tempId));
      notify('Failed to report incident. Please retry.', 'error');
    }
  };

  const acknowledge = async (id) => {
    const prev = items;
    setItems(items.map(i => i.incident_id === id ? { ...i, status: 'acknowledged' } : i));
    try {
      const { data } = await axios.patch(`/api/admin/production-incidents/${id}/acknowledge`);
      setItems(cur => cur.map(i => i.incident_id === id ? data : i));
      notify('Incident acknowledged.');
    } catch {
      setItems(prev);
      notify('Failed to acknowledge. Please retry.', 'error');
    }
  };

  const submitResolve = async (id) => {
    if (!resolutionNotes.trim()) return notify('Resolution notes required.', 'error');
    const prev = items;
    setItems(items.map(i => i.incident_id === id ? { ...i, status: 'resolved' } : i));
    setResolvingId(null);
    try {
      const { data } = await axios.patch(`/api/admin/production-incidents/${id}/resolve`, { resolution_notes: resolutionNotes.trim() });
      setItems(cur => cur.map(i => i.incident_id === id ? data : i));
      setResolutionNotes('');
      notify('Incident resolved.');
    } catch {
      setItems(prev);
      notify('Failed to resolve. Please retry.', 'error');
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font)', paddingBottom: 40 }}>
      <style>{`
        @media (max-width: 480px) {
          .pi-filters { flex-direction: column; align-items: stretch; }
          .pi-filters select { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Production Incidents</h1>
          <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: '4px 0 0' }}>
            Machine breakdowns and cutting damage — report, acknowledge, resolve.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)',
          padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          minHeight: 44, fontFamily: 'var(--font)',
        }}>
          <NavIcon name="add" size={14} color="#fff" /> Report Incident
        </button>
      </div>

      {/* Filters */}
      <div className="pi-filters" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 160 }}>
          <option value="">All statuses</option>
          <option value="reported">Reported</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inp, width: 'auto', minWidth: 180 }}>
          <option value="">All types</option>
          <option value="machine_breakdown">Machine Breakdown</option>
          <option value="cutting_damage">Cutting Damage</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>Loading…</p>
      ) : items.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <NavIcon name="success" size={36} color="var(--text-faint)" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14, color: 'var(--text-faint)' }}>No incidents reported. Shop floor running clean.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const ty = TYPE_LABEL[item.incident_type] ?? {};
            return (
              <div key={item.incident_id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
                padding: 16, borderLeft: '4px solid var(--teal)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {ty.icon && <NavIcon name={ty.icon} size={14} color="var(--text-subtle)" />}
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{ty.label}</span>
                    {item.order_id && <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-subtle)' }}>Order #{item.order_id}</span>}
                    {item.stage && <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--text-subtle)', textTransform: 'capitalize' }}>· {item.stage}</span>}
                  </div>
                  <Badge tone={STATUS_TONE[item.status] ?? 'danger'}>{STATUS_LABEL[item.status] ?? 'Reported'}</Badge>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0' }}>{item.description}</p>
                {item.qty_affected != null && <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '0 0 8px' }}>Pieces affected: {item.qty_affected}</p>}

                {item.status !== 'resolved' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {item.status === 'reported' && (
                      <button onClick={() => acknowledge(item.incident_id)} style={{
                        background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)',
                        borderRadius: 'var(--r-sm)', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44, fontFamily: 'var(--font)',
                      }}>Acknowledge</button>
                    )}
                    {resolvingId === item.incident_id ? (
                      <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
                        <input autoFocus value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                          placeholder="Resolution notes…" style={{ ...inp, flex: 1 }} onFocus={fi} onBlur={fo} />
                        <button onClick={() => submitResolve(item.incident_id)} style={{
                          background: 'var(--teal-2)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', padding: '8px 14px',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44, fontFamily: 'var(--font)',
                        }}>Save</button>
                      </div>
                    ) : (
                      <button onClick={() => { setResolvingId(item.incident_id); setResolutionNotes(''); }} style={{
                        background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)',
                        borderRadius: 'var(--r-sm)', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44, fontFamily: 'var(--font)',
                      }}>Resolve</button>
                    )}
                  </div>
                )}
                {item.status === 'resolved' && item.resolution_notes && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', margin: '4px 0 0', fontStyle: 'italic' }}>
                    <NavIcon name="success" size={12} color="var(--success)" />{item.resolution_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Report modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
            onClick={() => setShowForm(false)}>
            <motion.form initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={submitReport} onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-xl)', padding: 24, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-xl)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: '0 0 16px' }}>Report Incident</h3>

              <label style={lbl}>Type</label>
              <select value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })} style={{ ...inp, marginBottom: 12 }}>
                <option value="machine_breakdown">Machine Breakdown</option>
                <option value="cutting_damage">Cutting Damage</option>
              </select>

              <label style={lbl}>Order # (optional)</label>
              <input type="number" value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })}
                style={{ ...inp, marginBottom: 12 }} onFocus={fi} onBlur={fo} />

              <label style={lbl}>Stage (optional)</label>
              <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} style={{ ...inp, marginBottom: 12 }}>
                <option value="">—</option>
                {STAGES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>

              {form.incident_type === 'cutting_damage' && (
                <>
                  <label style={lbl}>Pieces affected</label>
                  <input type="number" min="0" value={form.qty_affected} onChange={e => setForm({ ...form, qty_affected: e.target.value })}
                    style={{ ...inp, marginBottom: 12 }} onFocus={fi} onBlur={fo} />
                </>
              )}

              <label style={lbl}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder={form.incident_type === 'machine_breakdown' ? 'Which machine, what happened…' : 'What was cut wrong, how it happened…'}
                style={{ ...inp, marginBottom: 16, resize: 'vertical' }} onFocus={fi} onBlur={fo} required />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  background: 'var(--bg-surface)', color: 'var(--text-muted)', border: 'none', borderRadius: 'var(--r-md)',
                  padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44, fontFamily: 'var(--font)',
                }}>Cancel</button>
                <button type="submit" style={{
                  background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)',
                  padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44, fontFamily: 'var(--font)',
                }}>Submit Report</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 200,
              background: toast.type === 'error' ? 'var(--danger)' : 'var(--teal)',
              color: '#fff', padding: '12px 20px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600,
              boxShadow: 'var(--shadow-lg)', fontFamily: 'var(--font)',
            }}>{toast.message}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
