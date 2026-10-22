import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import { PageHeader, Panel, StatusPill, Meter, Toast, useToast, SkeletonRows, ErrorBlock, PillTabs } from '../../components/admin/AdminUI';
import { DataTable } from '../../components/ui';
import { isAdmin } from '../../utils/jobAccess';
import ProductionProgress, { useProductionSummary, progressStages } from '../../components/admin/ProductionProgress';

const STAGES = [
  { key: 'pattern', label: 'Pattern', icon: 'pattern', desc: 'Pattern preparation and layout' },
  { key: 'segregation', label: 'Segregation', icon: 'segregation', desc: 'Size segregation of cut pieces' },
  { key: 'cutting', label: 'Cutting', icon: 'cutting', desc: 'Fabric cutting by pattern' },
  { key: 'sewing', label: 'Sewing', icon: 'garmentType', desc: 'Assembly and inline QC (80% standard)' },
  { key: 'qc', label: 'QC Check', icon: 'qc', desc: 'Final quality control inspection' },
  { key: 'pressing', label: 'Pressing', icon: 'pressing', desc: 'Garment pressing and finishing' },
  { key: 'packing', label: 'Packing', icon: 'package', desc: 'Pack and prepare for delivery' },
];
const STATUS_SEQ = ['pending', 'confirmed', 'pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing', 'completed'];
const SIZE_LABEL = { XXL: '2XL', XXXL: '3XL', CUSTOM: 'Custom' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'In progress');

// Ordered / logged / remaining per size at one stage. Only sizes the customer ordered (ordered_by_size) are listed.
function SizeTable({ summary, status }) {
  const keys = STAGES.map((x) => x.key);
  const [stage, setStage] = useState(keys.includes(status) ? status : 'packing');
  useEffect(() => { if (keys.includes(status)) setStage(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = summary?.stages?.find((x) => x.stage === stage);
  const ordered = summary?.ordered_by_size;
  const rows = useMemo(() => (ordered ? Object.entries(ordered).map(([size, qty]) => {
    const done = Number(st?.sizes?.[size]?.completed) || 0;
    return { size, ordered: Number(qty) || 0, done };
  }) : []), [ordered, st]);
  if (!summary) return null;
  const total = { ordered: Number(summary.total_ordered) || 0, done: Number(st?.completed) || 0 };
  const line = (r, key, bold) => {
    const left = Math.max(0, r.ordered - r.done);
    const pct = r.ordered > 0 ? (r.done / r.ordered) * 100 : 0;
    return (
      <tr key={key} style={bold ? { fontWeight: 800 } : undefined}>
        <td data-label="Size">{bold ? 'Total' : SIZE_LABEL[r.size] ?? r.size}</td>
        <td data-label="Ordered" className="num">{r.ordered}</td>
        <td data-label="Logged" className="num">{r.done}</td>
        <td data-label="Remaining" className="num" style={{ color: left ? 'var(--ink)' : 'var(--success-text)' }}>{left}</td>
        <td data-label="Progress" style={{ minWidth: 110 }}><Meter pct={pct} tone={pct >= 100 ? 'ok' : undefined} label={`${bold ? 'Total' : r.size} ${r.done} of ${r.ordered}`} /></td>
      </tr>
    );
  };
  return (
    <Panel flush title="By size" subtitle={ordered ? 'Sizes on this order only' : 'This order has no size breakdown, so only the total is tracked.'}>
      <div style={{ padding: '0 12px' }}>
        <PillTabs value={stage} onChange={setStage} tabs={STAGES.map((x) => ({ key: x.key, label: x.label }))} />
      </div>
      <DataTable label={`Sizes at ${st?.label ?? stage}`} dense mobileCards className="adm-flush-table">
        <thead><tr><th>Size</th><th className="num">Ordered</th><th className="num">Logged</th><th className="num">Remaining</th><th>Progress</th></tr></thead>
        <tbody>
          {rows.map((r) => line(r, r.size))}
          {line(total, 'total', true)}
        </tbody>
      </DataTable>
    </Panel>
  );
}

const Callout = ({ tone, icon, title, children }) => (
  <div className={`adm-callout ${tone}`} role={tone === 'danger' ? 'alert' : 'note'}>
    <NavIcon name={icon} size={18} color="currentColor" /><div><b>{title}</b>{children}</div>
  </div>
);

export default function ProductionTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [version, setVersion] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [toast, setToast] = useToast();
  const isManager = isAdmin();

  useEffect(() => {
    if (orderId) document.title = `Production — Order #${orderId} | VFRB`;
    return () => { document.title = 'VFRB Enterprise'; };
  }, [orderId]);

  const CACHE_KEY = `production_order_${orderId}`;
  const loadAll = useCallback(async (force = false) => {
    if (!orderId) return;
    if (!force) {
      const c = cacheGet(CACHE_KEY);
      if (c) { setOrder(c); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    try {
      const r = await axios.get(`/api/admin/orders/${orderId}`);
      const orderData = r.data?.order ?? r.data;
      setOrder(orderData);
      cacheSet(CACHE_KEY, orderData, 15_000);
    } catch { setOrder(null); setLoadErr(true); } finally { setLoading(false); }
  }, [orderId, CACHE_KEY]);
  useEffect(() => { loadAll(); }, [loadAll]);
  const [summary, sumFailed] = useProductionSummary(orderId, undefined, version);

  const status = order?.status ?? 'pending';
  const curIdx = STATUS_SEQ.indexOf(status);
  const nextStatus = STATUS_SEQ[curIdx + 1] ?? null;
  const nextStage = STAGES.find((s) => s.key === nextStatus);
  const cur = STAGES.find((s) => s.key === status);
  const isComplete = status === 'completed';
  const isCancelled = status === 'cancelled';
  // Backend gate (ProductionController::advance) blocks qc → pressing, not sewing → qc.
  const qcHold = status === 'qc' && !!Number(order?.qc_required) && !order?.qc_passed_at;
  const canAdvance = !isComplete && !isCancelled && !!nextStatus && nextStatus !== 'completed' && !qcHold;
  // Logged output across every stage, not the status position, so 0 pieces logged reads 0%.
  const logged = progressStages(summary);
  const loggedTotal = logged.reduce((a, x) => a + x.total, 0);
  const pct = isComplete ? 100 : loggedTotal ? Math.round((logged.reduce((a, x) => a + Math.min(x.done, x.total), 0) / loggedTotal) * 100) : 0;
  const stageIdx = STAGES.findIndex((s) => s.key === status);
  const fillPct = stageIdx >= 0 ? (stageIdx / (STAGES.length - 1)) * 100 : isComplete ? 100 : 0;

  const run = async (fn, okMsg) => {
    setAdvancing(true);
    try { await fn(); cacheClear(CACHE_KEY, 'admin_orders_list', 'dashboard_stats', 'production_orders_list'); await loadAll(true); setVersion((v) => v + 1); setToast({ msg: okMsg, type: 'success' }); }
    catch (e) { setToast({ msg: e.response?.data?.message ?? 'Action failed. Please retry.', type: 'error' }); }
    finally { setAdvancing(false); }
  };
  const advanceStage = () => {
    if (!nextStatus || advancing) return;
    const label = nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1);
    run(async () => { await axios.post(`/api/admin/orders/${orderId}/advance`, { notes }); setNotes(''); },
      nextStatus === 'completed' ? `Order #${orderId} completed! Delivery record created.` : `Order #${orderId} advanced to ${label}.`);
  };
  const confirmOrder = () => run(() => axios.patch(`/api/admin/orders/${orderId}/confirm`), `Order #${orderId} confirmed — production can begin.`);

  const primaryLabel = status === 'pending' ? 'Confirm order' : status === 'confirmed' ? 'Begin Pattern stage'
    : status === 'packing' ? 'Complete & generate delivery' : `Advance to ${nextStage?.label ?? nextStatus}`;
  const showAdvance = canAdvance || qcHold || status === 'pending' || status === 'confirmed';

  return (
    <>
      <Toast toast={toast} />
      <PageHeader title={`Order #${orderId}`}
        sub={order ? `${order.garment_type ?? 'Custom'} · ${order.quantity_ordered ?? 0} pcs · ${order.color ?? '—'}${order.customer_name ? ` · ${order.customer_name}` : ''}` : 'Production tracking'}>
        {order && <StatusPill status={status} />}
        <button className="adm-btn" onClick={() => navigate(`/admin/orders/${orderId}`)}><NavIcon name="show" size={14} color="currentColor" /> Order</button>
        <button className="adm-btn" onClick={() => navigate(`/admin/output-log?order_id=${orderId}`)}><NavIcon name="outputLog" size={14} color="currentColor" /> Output log</button>
        <button className="adm-btn" onClick={() => navigate(-1)}><NavIcon name="back" size={14} color="currentColor" /> Back</button>
      </PageHeader>

      {loadErr && !loading && <ErrorBlock msg="Could not load this order." onRetry={() => loadAll(true)} />}
      {!loading && !loadErr && !isCancelled && <ProductionProgress summary={sumFailed ? undefined : summary} orderId={orderId} />}
      {loading ? <SkeletonRows rows={4} h={90} /> : !loadErr && (
        <div className="adm-detail">
          <div className="adm-stack">
            <Panel title="Progress" action={<span style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>{pct}%</span>}>
              <div className="adm-steps" aria-label={`Stage ${stageIdx + 1} of ${STAGES.length}`}>
                <div className="adm-steps-fill" style={{ width: `${fillPct * 0.88}%` }} />
                {STAGES.map((s) => {
                  const sIdx = STATUS_SEQ.indexOf(s.key);
                  const st = sIdx < curIdx ? 'done' : s.key === status ? 'now' : '';
                  return (
                    <div key={s.key} className={`adm-step ${st}`}>
                      <div className="adm-step-dot"><NavIcon name={st === 'done' ? 'success' : s.icon} size={16} color="currentColor" /></div>
                      <span className="adm-step-label">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {qcHold && (
              <Callout tone="danger" icon="lock" title="QC hold — cannot advance to Pressing">
                Complete the QC checklist (80/20 inspection) and submit a PASS result to release this hold.{' '}
                <button className="adm-link-btn" onClick={() => navigate('/admin/qc')}>Open QC checklist</button>
              </Callout>
            )}
            {status === 'pattern' && (
              <Callout tone="info" icon="info" title="Record material consumption">
                Enter each material's consumption from the marker in the Daily Output Log before Pattern can advance. Nothing leaves stock yet.
              </Callout>
            )}
            {status === 'cutting' && (
              <Callout tone="warn" icon="warning" title="Materials will be deducted from inventory">
                Completing Cutting deducts the consumption recorded at Pattern from stock. Make sure stock is sufficient first. Sewing does not deduct again.
              </Callout>
            )}
            {status === 'packing' && (
              <Callout tone="info" icon="delivery" title="Completing packing creates the delivery record">
                This triggers delivery record creation and final payment recording (20% balance for direct clients).
              </Callout>
            )}

            {cur && (
              <Panel title="Current stage" action={<button className="adm-btn" onClick={() => navigate(`/admin/output-log?order_id=${orderId}`)}><NavIcon name="add" size={13} color="currentColor" /> Log output</button>}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="adm-step-dot" style={{ background: 'var(--teal-50)', borderColor: 'var(--teal-2)', color: 'var(--teal)' }}><NavIcon name={cur.icon} size={18} color="currentColor" /></span>
                  <div><div style={{ fontSize: 16, fontWeight: 800 }}>{cur.label}</div><div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>{cur.desc}</div></div>
                </div>
              </Panel>
            )}

            {!isCancelled && <SizeTable summary={summary} status={status} />}

            {showAdvance && (
              <Panel title={qcHold ? 'Stage advance blocked' : status === 'pending' ? 'Confirm this order to begin production' : status === 'confirmed' ? 'Begin Pattern stage' : `Next: ${nextStage?.label ?? nextStatus}`}>
                {qcHold && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-subtle)' }}>Complete the QC checklist first.</p>}
                {!qcHold && !isManager && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-subtle)' }}>
                    {status === 'pending' || status === 'confirmed' ? 'Waiting on a manager for this step.'
                      : 'Log completed pieces in the Daily Output Log — the stage advances automatically once the order quantity is reached.'}
                  </p>
                )}
                {!qcHold && isManager && (
                  <>
                    {status !== 'pending' && status !== 'confirmed' && (
                      <textarea className="adm-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Stage completion notes (optional)…" aria-label="Stage completion notes" style={{ marginBottom: 12 }} />
                    )}
                    <div className="adm-actionbar sticky">
                      <button className={`adm-btn primary${status === 'packing' ? ' success' : ''}`} disabled={advancing} style={{ minHeight: 44 }}
                        onClick={status === 'pending' ? confirmOrder : advanceStage}>
                        {advancing ? 'Processing…' : primaryLabel}
                      </button>
                    </div>
                  </>
                )}
              </Panel>
            )}

            {isComplete && <Callout tone="ok" icon="success" title="Order completed">All production stages finished. Delivery and payment recorded.</Callout>}
            {isCancelled && <Callout tone="danger" icon="close" title="Order cancelled">No further production actions are available.</Callout>}
          </div>

          <div className="adm-stack">
            <Panel title="Order summary">
              <dl className="adm-kv">
                <dt>Customer</dt><dd>{order?.customer_name ?? '—'}</dd>
                <dt>Garment</dt><dd>{order?.garment_type ?? 'Custom'}</dd>
                <dt>Quantity</dt><dd>{order?.quantity_ordered ?? 0} pcs</dd>
                <dt>Color</dt><dd>{order?.color ?? '—'}</dd>
                <dt>Deadline</dt><dd>{(() => { const d = order?.promised_date || order?.negotiated_delivery_date || order?.target_delivery_date || order?.deadline; return d ? fmtDate(d) : '—'; })()}</dd>
              </dl>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
