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

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

const STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];

const inp = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: FONT,
};
const lbl = {
  display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.07em', color: '#64748b', marginBottom: 7, fontFamily: FONT,
};
const fi = e => { e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; };

const STATUS_STYLE = {
  reported:     { bg: '#fef2f2', fg: '#dc2626', label: 'Reported' },
  acknowledged: { bg: '#fffbeb', fg: '#d97706', label: 'Acknowledged' },
  resolved:     { bg: '#f0fdf4', fg: '#16a34a', label: 'Resolved' },
};
const TYPE_LABEL = {
  machine_breakdown: { icon: '⚙️', label: 'Machine Breakdown' },
  cutting_damage:     { icon: '✂️', label: 'Cutting Damage' },
};

function getIsManager() {
  return (JSON.parse(sessionStorage.getItem('vfrb_user') || '{}').role) === 'manager';
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
    <div style={{ fontFamily: FONT, paddingBottom: 40 }}>
      <style>{`
        @media (max-width: 480px) {
          .pi-filters { flex-direction: column; align-items: stretch; }
          .pi-filters select { width: 100% !important; min-width: 0 !important; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Production Incidents</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Machine breakdowns and cutting damage — report, acknowledge, resolve.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          background: T, color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          minHeight: 44,
        }}>+ Report Incident</button>
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
        <p style={{ color: '#64748b', fontSize: 13 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <p style={{ fontSize: 14 }}>No incidents reported. Shop floor running clean.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.reported;
            const ty = TYPE_LABEL[item.incident_type] ?? {};
            return (
              <div key={item.incident_id} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                padding: 16, borderLeft: `4px solid ${T}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{ty.icon} {ty.label}</span>
                    {item.order_id && <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>Order #{item.order_id}</span>}
                    {item.stage && <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>· {item.stage}</span>}
                  </div>
                  <span style={{ background: st.bg, color: st.fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, height: 'fit-content' }}>{st.label}</span>
                </div>
                <p style={{ fontSize: 13, color: '#334155', margin: '8px 0' }}>{item.description}</p>
                {item.qty_affected != null && <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>Pieces affected: {item.qty_affected}</p>}

                {item.status !== 'resolved' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {item.status === 'reported' && (
                      <button onClick={() => acknowledge(item.incident_id)} style={{
                        background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                        borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                      }}>Acknowledge</button>
                    )}
                    {resolvingId === item.incident_id ? (
                      <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
                        <input autoFocus value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)}
                          placeholder="Resolution notes…" style={{ ...inp, flex: 1 }} onFocus={fi} onBlur={fo} />
                        <button onClick={() => submitResolve(item.incident_id)} style={{
                          background: T2, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                        }}>Save</button>
                      </div>
                    ) : (
                      <button onClick={() => { setResolvingId(item.incident_id); setResolutionNotes(''); }} style={{
                        background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                        borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                      }}>Resolve</button>
                    )}
                  </div>
                )}
                {item.status === 'resolved' && item.resolution_notes && (
                  <p style={{ fontSize: 12, color: '#16a34a', margin: '4px 0 0', fontStyle: 'italic' }}>✓ {item.resolution_notes}</p>
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
              style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Report Incident</h3>

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
                  background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 10,
                  padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44,
                }}>Cancel</button>
                <button type="submit" style={{
                  background: T, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 44,
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
              background: toast.type === 'error' ? '#E53E3E' : T,
              color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}>{toast.message}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
