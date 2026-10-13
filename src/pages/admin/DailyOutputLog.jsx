import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui';
import { PageHeader, PillTabs, TabPanel, Panel, StatusPill, ErrorBlock, EmptyBlock, SkeletonRows, OrderLink, RecordedBy } from '../../components/admin/AdminUI';
import QCChecklistForm from '../../components/admin/QCChecklistForm';

const STAGES = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
const SIZES  = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'custom'];
const SIZE_LABELS = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: '2XL', xxxl: '3XL', custom: 'Custom' };
const cap = (s) => (s === 'qc' ? 'QC' : s.charAt(0).toUpperCase() + s.slice(1));
// The shop works in local time: toISOString() is UTC, which before 8am in Manila is still yesterday.
const localDay = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

const emptyForm = (order_id = '', stage = 'cutting') => ({
  order_id, stage, log_date: localDay(),
  qty_xs: 0, qty_s: 0, qty_m: 0, qty_l: 0, qty_xl: 0, qty_xxl: 0, qty_xxxl: 0, qty_custom: 0,
  defect_count: 0, alteration_count: 0, defect_notes: '', notes: '',
});

const SizeChips = ({ row }) => {
  const chips = SIZES.map((s) => [SIZE_LABELS[s], Number(row?.[s] ?? row?.[`qty_${s}`]) || 0]).filter(([, n]) => n > 0);
  return chips.length ? <div className="adm-chipset">{chips.map(([l, n]) => <span key={l}><i>{l}</i>{n}</span>)}</div> : null;
};

export default function AdminDailyOutputLog() {
  const [params] = useSearchParams();
  const deepId = /^\d+$/.test(params.get('order_id') ?? '') ? params.get('order_id') : '';
  const [orders,  setOrders]  = useState([]);
  const [logs,    setLogs]    = useState([]);
  const [summary, setSummary] = useState(null);
  const [form,    setForm]    = useState(() => emptyForm(deepId));
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [success, setSuccess] = useState('');
  const [tab,     setTab]     = useState('log');
  const [orderMaterials, setOrderMaterials] = useState([]);
  const [materialQty,    setMaterialQty]    = useState({});
  const [qc, setQc] = useState(null); // latest QC for the selected order: { checklist, qc_required } | { error }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const count = (k) => (e) => set(k, Math.max(0, Number(e.target.value) || 0));

  const load = useCallback(() => {
    setLoading(true); setLoadErr(false);
    Promise.allSettled([
      axios.get('/api/admin/orders', { params: { status: STAGES.join(','), per_page: 100 } }),
      axios.get('/api/admin/output-logs', { params: { date: localDay() } }),
    ]).then(([o, l]) => {
      setOrders(o.status === 'fulfilled' ? (o.value.data?.data ?? o.value.data ?? []) : []);
      setLogs(l.status === 'fulfilled' ? (l.value.data?.data ?? l.value.data ?? []) : []);
      setLoadErr(o.status === 'rejected');
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // An order opened from Production tracking (?order_id=) logs against that order's current stage.
  const selOrder = orders.find((o) => String(o.order_id) === String(form.order_id));
  useEffect(() => {
    if (selOrder && STAGES.includes(selOrder.status)) setForm((f) => (f.stage === selOrder.status ? f : { ...f, stage: selOrder.status }));
  }, [selOrder]);

  useEffect(() => {
    setSummary(null); setMaterialQty({}); setOrderMaterials([]); setQc(null);
    if (!form.order_id) return undefined;
    let off = false;
    axios.get(`/api/admin/output-logs/summary/${form.order_id}`).then((r) => { if (!off) setSummary(r.data); }).catch(() => {});
    axios.get(`/api/admin/orders/${form.order_id}`).then((r) => {
      if (!off) setOrderMaterials((r.data?.order?.recommendations ?? []).filter((rec) => rec.customer_accepted && rec.material_id));
    }).catch(() => {});
    return () => { off = true; };
  }, [form.order_id]);

  // The advance to Pressing is held server-side until the latest QC checklist passed (QC-required orders only).
  const atQc = form.stage === 'qc' && !!form.order_id;
  const qcHeld = atQc && !!qc && !qc.error && qc.qc_required && !qc.checklist?.passed;
  const onQcDone = (d) => {
    setErr(''); setSuccess(d.message ?? '');
    if (d.advanced) { setForm(emptyForm()); load(); }
  };

  const totalInForm = SIZES.reduce((sum, s) => sum + (Number(form[`qty_${s}`]) || 0), 0);
  const materialActuals = () => Object.entries(materialQty)
    .filter(([, v]) => v !== '' && v != null)
    .map(([material_id, qty_used]) => ({ material_id: Number(material_id), qty_used: Number(qty_used) }));

  const submit = async () => {
    if (!form.order_id) { setErr('Select an order.'); return; }
    if (totalInForm === 0) { setErr('Enter at least 1 piece completed.'); return; }
    setSaving(true); setErr(''); setSuccess('');
    try {
      const r = await axios.post('/api/admin/output-logs', { ...form, material_actuals: materialActuals() });
      const id = form.order_id;
      // A resubmit on a finished stage logs nothing; the server says why the stage is still held.
      if (r.data.already_complete && !r.data.advanced) {
        setSuccess(`Order #${id}: ${r.data.detail}`);
      } else if (r.data.qc_blocked) {
        setSuccess(`Logged ${r.data.total_output} pieces for Order #${id}. ${r.data.message}`);
      } else if (r.data.materials_blocked) {
        const names = (r.data.materials_needing_actual ?? []).map((m) => m.material_name).join(', ');
        setSuccess(`Logged ${r.data.total_output} pieces for Order #${id}. Stage advance is on hold until actual usage is entered for: ${names}.`);
      } else {
        const n = r.data.deduction_log?.length;
        setSuccess(`Logged ${r.data.total_output} pieces for Order #${id}.${n ? ` ${n} material(s) deducted from stock.` : ''}`);
      }
      if (r.data.low_stock?.length) setErr(`Low stock after deduction: ${r.data.low_stock.map((m) => m.material_name).join(', ')}`);
      // A held QC order stays selected so its checklist is right there.
      setForm(r.data.qc_blocked ? emptyForm(id, 'qc') : emptyForm());
      load();
    } catch (e) { setErr(e.response?.data?.message ?? 'Failed to log output.'); }
    finally { setSaving(false); }
  };

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <style>{`
        .dol-sizes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
        .dol-sizes .adm-input{text-align:center;padding:0 6px}
        .dol-total{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:42px;border-radius:10px;background:var(--teal-50);border:1px solid var(--teal-100);color:var(--teal);font-size:20px;font-weight:800;line-height:1.1}
        .dol-total small{font-size:10px;font-weight:600;color:var(--text-subtle)}
        .dol-mat{display:flex;align-items:center;gap:10px}
        .dol-mat span{flex:1;min-width:0;font-size:13px;font-weight:600}
        .dol-mat .adm-input{width:120px;text-align:right}
        .dol-rows{display:flex;flex-direction:column}
        .dol-rows>div{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--bg-surface);font-size:13px}
        .dol-rows>div:last-child{border-bottom:none}
        .dol-qc{display:flex;flex-direction:column;gap:14px;padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg-surface)}
        @media(max-width:420px){.dol-sizes{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>

      <PageHeader title="Daily Output Log" sub="Log pieces completed per size per shift · replaces the handwritten sulat">
        <button className="adm-btn" onClick={load}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>

      <PillTabs value={tab} onChange={setTab} tabs={[{ key: 'log', label: 'Log output' }, { key: 'history', label: "Today's history", count: loading ? null : logs.length }]} />

      <TabPanel k={tab}>
      {tab === 'log' && (
        <div className="adm-split">
          <Panel title="New output entry">
            {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Orders in production could not be loaded." onRetry={load} /></div>}
            {!loading && !loadErr && orders.length === 0 && (
              <div className="adm-callout info"><NavIcon name="info" size={16} color="currentColor" /><div><b>No orders in production</b>Output can be logged once an order is confirmed and reaches the Pattern stage.</div></div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="adm-form-grid">
                <label><span className="adm-field">Order</span>
                  <select className="adm-input" value={form.order_id} onChange={(e) => set('order_id', e.target.value)} disabled={loading}>
                    <option value="">{loading ? 'Loading orders…' : 'Select order…'}</option>
                    {orders.map((o) => <option key={o.order_id} value={o.order_id}>#{o.order_id} — {o.garment_type ?? 'Order'} · {cap(o.status)}</option>)}
                  </select>
                </label>
                <label><span className="adm-field">Production stage</span>
                  <select className="adm-input" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                    {STAGES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                  </select>
                </label>
              </div>

              <div className="adm-form-grid">
                <label><span className="adm-field">Log date</span>
                  <input className="adm-input" type="date" value={form.log_date} max={localDay()} onChange={(e) => set('log_date', e.target.value)} />
                </label>
                <div><span className="adm-field">Total pieces</span><div className="dol-total" aria-live="polite">{totalInForm}<small>entered below</small></div></div>
              </div>

              <div>
                <span className="adm-field">Pieces completed per size</span>
                <div className="dol-sizes">
                  {SIZES.map((s) => (
                    <label key={s}><span className="adm-field" style={{ fontSize: 10, marginBottom: 4 }}>{SIZE_LABELS[s]}</span>
                      <input className="adm-input" type="number" inputMode="numeric" min={0} value={form[`qty_${s}`]} onChange={count(`qty_${s}`)} aria-label={`Pieces completed, size ${SIZE_LABELS[s]}`} />
                    </label>
                  ))}
                </div>
              </div>

              {form.stage === 'pattern' && orderMaterials.length > 0 && (
                <div className="adm-callout info" style={{ display: 'block', marginBottom: 0 }}>
                  <b>Actual materials used</b>
                  <div style={{ marginBottom: 10 }}>Required before Pattern can advance.</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {orderMaterials.map((m) => (
                      <div key={m.material_id} className="dol-mat">
                        <span>{m.material_name} <small style={{ fontWeight: 400 }}>({m.unit})</small></span>
                        <input className="adm-input" type="number" inputMode="decimal" min={0} step="any" placeholder="qty used" aria-label={`Quantity used, ${m.material_name}`}
                          value={materialQty[m.material_id] ?? ''} onChange={(e) => setMaterialQty((q) => ({ ...q, [m.material_id]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {atQc && (
                <section className="dol-qc" aria-label="QC checklist">
                  {!qc ? <div className="adm-callout info" style={{ marginBottom: 0 }}><NavIcon name="loading" size={16} color="currentColor" /><div>Checking the latest QC result…</div></div>
                    : qc.error ? <div className="adm-callout danger" role="alert" style={{ marginBottom: 0 }}><NavIcon name="warning" size={16} color="currentColor" /><div><b>QC status could not be loaded</b>The order still cannot move to Pressing without a passing QC check.</div></div>
                    : !qc.qc_required ? <div className="adm-callout info" style={{ marginBottom: 0 }}><NavIcon name="info" size={16} color="currentColor" /><div><b>QC is optional for this order</b>Recording a check is still kept in QC history.</div></div>
                    : qcHeld ? <div className="adm-callout danger" role="status" style={{ marginBottom: 0 }}><NavIcon name="warning" size={16} color="currentColor" /><div><b>Pressing is blocked until QC passes</b>You can keep logging QC pieces. Submit a passing checklist below to release the order.</div></div>
                    : <div className="adm-callout ok" role="status" style={{ marginBottom: 0 }}><NavIcon name="success" size={16} color="currentColor" /><div><b>QC passed</b>The order moves to Pressing once every QC piece is logged.</div></div>}
                  <QCChecklistForm inline orderId={form.order_id} orderData={selOrder} onStatus={setQc} onComplete={onQcDone} />
                </section>
              )}

              <div className="adm-form-grid">
                <label><span className="adm-field">Defects</span>
                  <input className="adm-input" type="number" inputMode="numeric" min={0} value={form.defect_count} onChange={count('defect_count')} />
                </label>
                <label><span className="adm-field">For alteration</span>
                  <input className="adm-input" type="number" inputMode="numeric" min={0} value={form.alteration_count} onChange={count('alteration_count')} />
                </label>
              </div>

              {(form.defect_count > 0 || form.alteration_count > 0) && (
                <label><span className="adm-field">Defect / alteration notes</span>
                  <textarea className="adm-input" rows={2} value={form.defect_notes} onChange={(e) => set('defect_notes', e.target.value)} placeholder="Describe the issue…" />
                </label>
              )}
              <label><span className="adm-field">Shift notes (optional)</span>
                <textarea className="adm-input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes for this shift…" />
              </label>

              {err && <div className="adm-callout danger" role="alert" style={{ marginBottom: 0 }}><NavIcon name="warning" size={16} color="currentColor" /><div>{err}</div></div>}
              {success && <div className="adm-callout ok" role="status" style={{ marginBottom: 0 }}><NavIcon name="success" size={16} color="currentColor" /><div>{success}</div></div>}

              <div className="adm-actionbar sticky">
                <button className="adm-btn primary" onClick={submit} disabled={saving} style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}>
                  <NavIcon name={saving ? 'loading' : 'success'} size={15} color="currentColor" /> {saving ? 'Saving…' : 'Log output'}
                </button>
              </div>
            </div>
          </Panel>

          <div className="adm-stack">
            {selOrder ? (
              <Panel title={<>Order <OrderLink id={selOrder.order_id} /></>}>
                <div className="dol-rows">
                  <div><span>Garment</span><b>{selOrder.garment_type ?? '—'}</b></div>
                  <div><span>Quantity</span><b>{selOrder.quantity_ordered ?? 0} pcs</b></div>
                  <div><span>Color</span><b>{selOrder.color ?? '—'}</b></div>
                  <div><span>Stage</span><StatusPill status={selOrder.status} label={cap(selOrder.status)} /></div>
                </div>
              </Panel>
            ) : (
              <Panel><EmptyBlock><NavIcon name="outputLog" size={30} color="currentColor" /><div style={{ marginTop: 8 }}>Select an order to see its progress</div></EmptyBlock></Panel>
            )}
            {summary?.by_stage?.length > 0 && (
              <Panel title="Cumulative output">
                <div className="dol-rows">
                  {summary.by_stage.map((s) => <div key={s.stage}><span>{cap(s.stage)}</span><b style={{ color: 'var(--teal)' }}>{s.total_pieces} pcs</b></div>)}
                </div>
                {summary.by_size && (
                  <div style={{ marginTop: 12 }}>
                    <span className="adm-field">By size (all stages) · {summary.by_size.grand_total} pcs</span>
                    <SizeChips row={summary.by_size} />
                  </div>
                )}
              </Panel>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <Panel title={`Today's logs — ${today}`} flush>
          {loading ? <SkeletonRows rows={3} h={40} /> : logs.length === 0 ? (
            <EmptyBlock>No logs for today yet. <button className="adm-link-btn" onClick={() => setTab('log')}>Log output</button></EmptyBlock>
          ) : (
            <div className="adm-tbl-scroll">
              <table className="adm-table" style={{ minWidth: 560 }}>
                <thead><tr><th>Order</th><th>Stage</th><th>Total</th><th>By size</th><th>Defects</th><th>Recorded</th></tr></thead>
                <tbody>
                  {logs.map((l, i) => (
                    <tr key={l.log_id ?? i}>
                      <td><OrderLink id={l.order_id} /></td>
                      <td>{cap(l.stage ?? '')}</td>
                      <td style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)' }}>{l.total_output}</td>
                      <td><SizeChips row={l} /></td>
                      <td>
                        {l.defect_count > 0 ? <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>{l.defect_count} defect{l.defect_count > 1 ? 's' : ''}</span> : '—'}
                        {l.alteration_count > 0 && <span style={{ color: 'var(--warning-text)', fontWeight: 700, marginLeft: 6 }}>{l.alteration_count} alt.</span>}
                      </td>
                      <td><RecordedBy name={l.logged_by_name} at={l.created_at} label="" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      </TabPanel>
    </>
  );
}
