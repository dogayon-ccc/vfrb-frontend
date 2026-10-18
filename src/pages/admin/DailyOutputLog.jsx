import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui';
import { PageHeader, PillTabs, TabPanel, Panel, StatusPill, ErrorBlock, EmptyBlock, SkeletonRows, OrderLink, RecordedBy } from '../../components/admin/AdminUI';
import QCChecklistForm from '../../components/admin/QCChecklistForm';
import ProductionProgress from '../../components/admin/ProductionProgress';

const STAGES = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
const SIZES  = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'custom'];
const SIZE_LABELS = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: '2XL', xxxl: '3XL', custom: 'Custom' };
const cap = (s) => (s === 'qc' ? 'QC' : s.charAt(0).toUpperCase() + s.slice(1));
// The shop works in local time: toISOString() is UTC, which before 8am in Manila is still yesterday.
const localDay = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

const emptyForm = (order_id = '') => ({
  order_id, log_date: localDay(),
  qty_xs: 0, qty_s: 0, qty_m: 0, qty_l: 0, qty_xl: 0, qty_xxl: 0, qty_xxxl: 0, qty_custom: 0,
  notes: '',
});
const emptyDefect = { size: '', qty: 1, reason: '' };

// Per size at this stage: logged, ordered, remaining, and the most that can be entered now
// (min of remaining and what the previous stage has finished but this one hasn't). Mirrors ProductionStageService::sizeLimitError.
function sizeRows(summary, stage) {
  const idx = summary?.stages?.findIndex((x) => x.stage === stage) ?? -1;
  if (idx < 0) return [];
  const cur = summary.stages[idx];
  const prev = idx > 0 ? summary.stages[idx - 1] : null;
  return Object.entries(cur.sizes ?? {}).map(([label, v]) => {
    const key = label.toLowerCase();
    const logged = Number(v.completed) || 0;
    const ordered = v.total_ordered == null ? null : Number(v.total_ordered);
    const remaining = ordered == null ? null : Math.max(0, ordered - logged);
    const fromPrev = prev ? Math.max(0, (Number(prev.sizes?.[label]?.completed) || 0) - logged) : null;
    const caps = [remaining, fromPrev].filter((n) => n != null);
    const max = caps.length ? Math.min(...caps) : null;
    return { key, label: SIZE_LABELS[key] ?? label, logged, ordered, remaining, fromPrev, max, done: ordered != null && logged >= ordered };
  }).filter((r) => SIZES.includes(r.key));
}

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
  const [rev,     setRev]     = useState(0);
  const [defect,  setDefect]  = useState(emptyDefect);
  const [defBusy, setDefBusy] = useState(false);
  const [defMsg,  setDefMsg]  = useState(null); // { ok, text }
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
  const qtyFor = (k, max) => (e) => {
    const n = Math.max(0, Number(e.target.value) || 0);
    set(k, max == null ? n : Math.min(n, max));
  };

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

  // Stages go step by step: output is always logged against the order's current stage, never a chosen one.
  const selOrder = orders.find((o) => String(o.order_id) === String(form.order_id));
  const stage = selOrder && STAGES.includes(selOrder.status) ? selOrder.status : null;

  useEffect(() => {
    setMaterialQty({}); setOrderMaterials([]); setQc(null); setDefect(emptyDefect); setDefMsg(null);
  }, [form.order_id]);

  // Reloaded after every log so the Cutting panel shows what Pattern recorded and what was already issued.
  useEffect(() => {
    if (!form.order_id) return undefined;
    let off = false;
    axios.get(`/api/admin/orders/${form.order_id}`).then((r) => {
      if (off) return;
      const recs = (r.data?.order?.recommendations ?? []).filter((rec) => rec.customer_accepted && rec.material_id);
      setOrderMaterials(recs);
      // Prefill consumption already recorded at Pattern; never overwrite what staff are typing.
      setMaterialQty((q) => {
        const next = { ...q };
        recs.forEach((m) => { if (next[m.material_id] == null && m.actual_qty_issued != null) next[m.material_id] = String(m.actual_qty_issued); });
        return next;
      });
    }).catch(() => {});
    return () => { off = true; };
  }, [form.order_id, rev]);

  useEffect(() => {
    setSummary(null);
    if (!form.order_id) return undefined;
    let off = false;
    axios.get(`/api/admin/orders/${form.order_id}/production-summary`).then((r) => { if (!off) setSummary(r.data); }).catch(() => { if (!off) setSummary(false); });
    return () => { off = true; };
  }, [form.order_id, rev]);

  const rows = summary && stage ? sizeRows(summary, stage) : [];
  // Older orders without a size breakdown: every size open, the server still caps the total.
  const noBreakdown = !!summary && !!stage && !summary.ordered_by_size;
  const orderSizes = summary?.ordered_by_size ? Object.keys(summary.ordered_by_size) : rows.map((r) => r.key.toUpperCase());
  // Every Pattern piece logged but the order is still there: it is waiting on material consumption.
  const patternDone = stage === 'pattern' && rows.length > 0 && rows.every((r) => r.done);

  const reportDefect = async () => {
    if (!defect.size || !(defect.qty > 0) || !defect.reason.trim()) { setDefMsg({ ok: false, text: 'Pick a size, a quantity and a reason.' }); return; }
    setDefBusy(true); setDefMsg(null);
    try {
      const r = await axios.post(`/api/admin/orders/${form.order_id}/defects`, { size: defect.size, qty: Number(defect.qty), reason: defect.reason.trim() });
      setDefMsg({ ok: true, text: r.data?.message ?? 'Defect reported.' });
      setDefect(emptyDefect); setRev((n) => n + 1); load();
    } catch (e) { setDefMsg({ ok: false, text: e.response?.data?.message ?? 'Could not report the defect.' }); }
    finally { setDefBusy(false); }
  };

  // The advance to Pressing is held server-side until the latest QC checklist passed (QC-required orders only).
  const atQc = stage === 'qc' && !!form.order_id;
  const qcHeld = atQc && !!qc && !qc.error && qc.qc_required && !qc.checklist?.passed;
  const onQcDone = (d) => {
    setErr(''); setSuccess(d.message ?? '');
    if (d.advanced) { setForm(emptyForm()); load(); }
    setRev((n) => n + 1);
  };

  const totalInForm = SIZES.reduce((sum, s) => sum + (Number(form[`qty_${s}`]) || 0), 0);
  const materialActuals = () => Object.entries(materialQty)
    .filter(([, v]) => v !== '' && v != null)
    .map(([material_id, qty_used]) => ({ material_id: Number(material_id), qty_used: Number(qty_used) }));

  const submit = async () => {
    if (!form.order_id) { setErr('Select an order.'); return; }
    if (!stage) { setErr('This order is not at a production stage.'); return; }
    // Zero pieces is allowed only to save consumption for a Pattern stage that is complete but held.
    if (totalInForm === 0 && !(patternDone && materialActuals().length)) { setErr('Enter at least 1 piece completed.'); return; }
    setSaving(true); setErr(''); setSuccess('');
    try {
      const r = await axios.post('/api/admin/output-logs', { ...form, stage, material_actuals: materialActuals() });
      const id = form.order_id;
      // A resubmit on a finished stage logs nothing; the server says why the stage is still held.
      if (r.data.already_complete && !r.data.advanced) {
        setSuccess(`Order #${id}: ${r.data.detail}`);
      } else if (r.data.qc_blocked) {
        setSuccess(`Logged ${r.data.total_output} pieces for Order #${id}. ${r.data.message}`);
      } else if (r.data.materials_blocked) {
        const names = (r.data.materials_needing_actual ?? []).map((m) => m.material_name).join(', ');
        setSuccess(`Logged ${r.data.total_output} pieces for Order #${id}. Pattern is on hold until material consumption is entered for: ${names}.`);
      } else {
        const n = r.data.deduction_log?.length;
        const recorded = stage === 'pattern' && r.data.advanced && orderMaterials.length;
        setSuccess(`${r.data.total_output ? `Logged ${r.data.total_output} pieces for Order #${id}.` : `Order #${id}:`}`
          + (r.data.advanced && !r.data.total_output ? ` ${r.data.message}` : '')
          + (recorded ? ' Material consumption recorded; it is deducted from stock when Cutting is complete.' : '')
          + (n ? ` ${n} material(s) deducted from stock.` : ''));
      }
      if (r.data.low_stock?.length) setErr(`Low stock after deduction: ${r.data.low_stock.map((m) => m.material_name).join(', ')}`);
      // A held QC order stays selected so its checklist is right there.
      // The order stays selected so the next size or stage is right there.
      setForm(emptyForm(r.data.advanced && !r.data.qc_blocked ? '' : id));
      setRev((n) => n + 1); load();
    } catch (e) { setErr(e.response?.data?.message ?? 'Failed to log output.'); }
    finally { setSaving(false); }
  };

  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      <style>{`
        .dol-sizes{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
        .dol-size{display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-card)}
        .dol-size.done{background:var(--success-bg);border-color:transparent}
        .dol-size-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
        .dol-size-top b{font-size:15px}
        .dol-size-top span{font-size:15px;font-weight:800;font-variant-numeric:tabular-nums}
        .dol-size small{font-size:var(--text-meta);color:var(--text-subtle)}
        .dol-size .adm-input{text-align:center;padding:0 6px}
        .dol-done{display:flex;align-items:center;justify-content:center;gap:6px;min-height:42px;font-weight:800;color:var(--success-text)}
        .dol-stage{display:flex;align-items:center;min-height:42px;padding:0 12px;border-radius:10px;background:var(--teal-50);border:1px solid var(--teal-100);color:var(--teal);font-weight:800}
        .dol-defect{display:grid;grid-template-columns:110px 90px minmax(0,1fr);gap:8px}
        @media(max-width:560px){.dol-defect{grid-template-columns:1fr 1fr}.dol-defect>:last-child{grid-column:1/-1}}
        .dol-total{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:42px;border-radius:10px;background:var(--teal-50);border:1px solid var(--teal-100);color:var(--teal);font-size:20px;font-weight:800;line-height:1.1}
        .dol-total small{font-size:var(--text-meta);font-weight:600;color:var(--text-subtle)}
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
      {tab === 'log' && form.order_id && <ProductionProgress summary={summary || null} title={`Order #${form.order_id} — production`} />}
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
                <div><span className="adm-field">Your stage</span>
                  <div className="dol-stage" aria-live="polite">{stage ? `${cap(stage)} · step ${STAGES.indexOf(stage) + 1} of ${STAGES.length}` : '—'}</div>
                </div>
              </div>

              <div className="adm-form-grid">
                <label><span className="adm-field">Log date</span>
                  <input className="adm-input" type="date" value={form.log_date} max={localDay()} onChange={(e) => set('log_date', e.target.value)} />
                </label>
                <div><span className="adm-field">Total pieces</span><div className="dol-total" aria-live="polite">{totalInForm}<small>entered below</small></div></div>
              </div>

              {form.order_id && (
                <div>
                  <span className="adm-field">Pieces completed per size</span>
                  {summary === null ? <div className="adm-sk" style={{ height: 90 }} />
                    : summary === false ? <ErrorBlock msg="Size progress could not be loaded." onRetry={() => setRev((n) => n + 1)} />
                    : noBreakdown ? (
                      <div className="dol-sizes">
                        {SIZES.map((s) => (
                          <label key={s} className="dol-size"><b>{SIZE_LABELS[s]}</b>
                            <input className="adm-input" type="number" inputMode="numeric" min={0} value={form[`qty_${s}`]} onChange={qtyFor(`qty_${s}`, null)} aria-label={`Pieces completed, size ${SIZE_LABELS[s]}`} />
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="dol-sizes">
                        {rows.map((r) => (
                          <div key={r.key} className={`dol-size${r.done ? ' done' : ''}`}>
                            <div className="dol-size-top"><b>{r.label}</b><span>{r.logged} / {r.ordered ?? '—'}</span></div>
                            {r.done ? <div className="dol-done"><NavIcon name="success" size={15} color="currentColor" /> Done</div> : (
                              <>
                                <small>{r.remaining ?? '—'} remaining{r.fromPrev != null ? ` · ${r.fromPrev} ready from ${cap(STAGES[STAGES.indexOf(stage) - 1])}` : ''}</small>
                                <input className="adm-input" type="number" inputMode="numeric" min={0} max={r.max ?? undefined} disabled={r.max === 0}
                                  value={form[`qty_${r.key}`]} onChange={qtyFor(`qty_${r.key}`, r.max)} aria-label={`Pieces completed, size ${r.label}, at most ${r.max ?? 'any'}`} />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {stage === 'pattern' && orderMaterials.length > 0 && (
                <div className="adm-callout info" style={{ display: 'block', marginBottom: 0 }}>
                  <b>Material consumption (from the marker)</b>
                  <div style={{ marginBottom: 10 }}>
                    Enter how much of each material this order needs, worked out from the pattern and marker layout. Required before Pattern can advance.
                    Nothing leaves stock yet: it is deducted once Cutting is complete.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {orderMaterials.map((m) => {
                      const unit = m.unit ?? m.material_unit ?? '';
                      const stock = m.material_quantity_in_stock;
                      const short = stock != null && Number(materialQty[m.material_id]) > Number(stock);
                      return (
                        <div key={m.material_id}>
                          <div className="dol-mat">
                            <span>{m.material_name} <small style={{ fontWeight: 400 }}>({unit}{stock != null ? ` · ${stock} in stock` : ''})</small></span>
                            <input className="adm-input" type="number" inputMode="decimal" min={0} step="any" placeholder="qty needed" aria-label={`Consumption, ${m.material_name}, in ${unit}`}
                              value={materialQty[m.material_id] ?? ''} onChange={(e) => setMaterialQty((q) => ({ ...q, [m.material_id]: e.target.value }))} />
                          </div>
                          {short && <small style={{ color: 'var(--danger-text)' }}>More than the {stock} {unit} in stock. Restock before Cutting.</small>}
                        </div>
                      );
                    })}
                  </div>
                  {patternDone && totalInForm === 0 && (
                    <div style={{ marginTop: 10 }}>All Pattern pieces are logged. Fill in the consumption and press <b>Save consumption</b> to release the order to Segregation.</div>
                  )}
                </div>
              )}

              {stage === 'cutting' && orderMaterials.some((m) => m.actual_qty_issued != null) && (
                <div className="adm-callout info" style={{ display: 'block', marginBottom: 0 }}>
                  <b>Materials issued when Cutting is complete</b>
                  <div style={{ marginBottom: 10 }}>Recorded at Pattern. Deducted from stock automatically once every piece is cut. Sewing does not deduct again.</div>
                  <div className="dol-rows">
                    {orderMaterials.filter((m) => m.actual_qty_issued != null).map((m) => (
                      <div key={m.material_id}>
                        <span>{m.material_name}</span>
                        <span><b>{m.actual_qty_issued} {m.unit ?? m.material_unit ?? ''}</b> · {m.issued_at ? 'issued' : 'pending'}</span>
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

              {form.order_id && orderSizes.length > 0 && (
                <div className="adm-callout warn" style={{ display: 'block', marginBottom: 0 }}>
                  <b>Report a defect</b>
                  <div style={{ marginBottom: 10 }}>Only pieces you sewed on this order can be reported.</div>
                  <div className="dol-defect">
                    <select className="adm-input" value={defect.size} onChange={(e) => setDefect((d) => ({ ...d, size: e.target.value }))} aria-label="Defect size">
                      <option value="">Size…</option>
                      {orderSizes.map((z) => <option key={z} value={z}>{SIZE_LABELS[z.toLowerCase()] ?? z}</option>)}
                    </select>
                    <input className="adm-input" type="number" inputMode="numeric" min={1} value={defect.qty} aria-label="Defect quantity"
                      onChange={(e) => setDefect((d) => ({ ...d, qty: Math.max(1, Number(e.target.value) || 1) }))} />
                    <input className="adm-input" value={defect.reason} maxLength={1000} placeholder="Reason, e.g. skipped stitch" aria-label="Defect reason"
                      onChange={(e) => setDefect((d) => ({ ...d, reason: e.target.value }))} />
                  </div>
                  {defMsg && <div role={defMsg.ok ? 'status' : 'alert'} style={{ marginTop: 8, fontWeight: 700, color: defMsg.ok ? 'var(--success-text)' : 'var(--danger-text)' }}>{defMsg.text}</div>}
                  <button className="adm-btn" style={{ marginTop: 10, minHeight: 40 }} onClick={reportDefect} disabled={defBusy}>
                    <NavIcon name={defBusy ? 'loading' : 'warning'} size={14} color="currentColor" /> {defBusy ? 'Reporting…' : 'Report defect'}
                  </button>
                </div>
              )}
              <label><span className="adm-field">Shift notes (optional)</span>
                <textarea className="adm-input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes for this shift…" />
              </label>

              {err && <div className="adm-callout danger" role="alert" style={{ marginBottom: 0 }}><NavIcon name="warning" size={16} color="currentColor" /><div>{err}</div></div>}
              {success && <div className="adm-callout ok" role="status" style={{ marginBottom: 0 }}><NavIcon name="success" size={16} color="currentColor" /><div>{success}</div></div>}

              <div className="adm-actionbar sticky">
                <button className="adm-btn primary" onClick={submit} disabled={saving || !stage || (rows.length > 0 && rows.every((r) => r.done) && !(patternDone && orderMaterials.length))} style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}>
                  <NavIcon name={saving ? 'loading' : 'success'} size={15} color="currentColor" /> {saving ? 'Saving…' : patternDone && orderMaterials.length ? 'Save consumption' : 'Log output'}
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
              <Panel><EmptyBlock>Select an order to see its progress</EmptyBlock></Panel>
            )}
            {summary?.defects_by_size && Object.keys(summary.defects_by_size).length > 0 && (
              <Panel title="Defects reported">
                <div className="dol-rows">
                  {Object.entries(summary.defects_by_size).map(([z, n]) => <div key={z}><span>Size {SIZE_LABELS[z.toLowerCase()] ?? z}</span><b style={{ color: 'var(--danger-text)' }}>{n}</b></div>)}
                </div>
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
                        {l.defect_count > 0 ? <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>{l.defect_count} defect{l.defect_count > 1 ? 's' : ''}{l.defect_size ? ` · ${l.defect_size}` : ''}</span> : '—'}
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
