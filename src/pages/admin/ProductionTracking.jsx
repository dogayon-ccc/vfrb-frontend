// src/pages/admin/ProductionTracking.jsx — /admin/production/:orderId
// Logic unchanged: 3 concurrent loads, manager-only advance/confirm, QC hold guard, cache keys.
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import { PageHeader, Panel, StatusPill, Toast, useToast, SkeletonRows, ErrorBlock } from '../../components/admin/AdminUI';

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
const SIZE_KEYS = [['qty_xs', 'XS'], ['qty_s', 'S'], ['qty_m', 'M'], ['qty_l', 'L'], ['qty_xl', 'XL'], ['qty_xxl', '2XL'], ['qty_xxxl', '3XL'], ['qty_custom', 'Custom']];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'In progress');

function SizeBreakdown({ logs, stage }) {
  const rows = (logs ?? []).filter((l) => l.stage === stage);
  const totals = SIZE_KEYS.map(([k, label]) => [label, rows.reduce((s, l) => s + (parseInt(l[k], 10) || 0), 0)]).filter(([, n]) => n > 0);
  if (!totals.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div className="adm-field">Completed by size</div>
      <div className="adm-chipset">{totals.map(([label, n]) => <span key={label}><i>{label}</i>{n}</span>)}</div>
    </div>
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
  const [tracking, setTracking] = useState([]);
  const [prodLogs, setProdLogs] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [toast, setToast] = useToast();
  const isManager = JSON.parse(localStorage.getItem('vfrb_user') || '{}').role === 'manager';

  useEffect(() => {
    if (orderId) document.title = `Production — Order #${orderId} | VFRB`;
    return () => { document.title = 'VFRB Enterprise'; };
  }, [orderId]);

  const CACHE_KEY = `production_order_${orderId}`;
  const loadAll = useCallback(async (force = false) => {
    if (!orderId) return;
    if (!force) {
      const c = cacheGet(CACHE_KEY);
      if (c) { setOrder(c.order); setTracking(c.tracking); setProdLogs(c.prodLogs); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    try {
      const [o, p, l] = await Promise.allSettled([
        axios.get(`/api/admin/orders/${orderId}`),
        axios.get(`/api/admin/orders/${orderId}/production`),
        axios.get(`/api/admin/output-logs?order_id=${orderId}`),
      ]);
      const orderData = o.status === 'fulfilled' ? (o.value.data?.order ?? o.value.data) : null;
      const trackData = p.status === 'fulfilled' ? (p.value.data?.stages ?? p.value.data ?? []) : [];
      const logsData = l.status === 'fulfilled' ? (l.value.data?.data ?? l.value.data ?? []) : [];
      if (!orderData) setLoadErr(true);
      setOrder(orderData); setTracking(trackData); setProdLogs(logsData);
      cacheSet(CACHE_KEY, { order: orderData, tracking: trackData, prodLogs: logsData }, 15_000);
    } finally { setLoading(false); }
  }, [orderId, CACHE_KEY]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const status = order?.status ?? 'pending';
  const curIdx = STATUS_SEQ.indexOf(status);
  const nextStatus = STATUS_SEQ[curIdx + 1] ?? null;
  const nextStage = STAGES.find((s) => s.key === nextStatus);
  const cur = STAGES.find((s) => s.key === status);
  const isComplete = status === 'completed';
  const isCancelled = status === 'cancelled';
  const qcHold = status === 'sewing' && order?.qc_required === 1 && !order?.qc_passed_at;
  const canAdvance = !isComplete && !isCancelled && !!nextStatus && nextStatus !== 'completed' && !qcHold;
  const pct = curIdx >= 0 ? Math.round((curIdx / (STATUS_SEQ.length - 1)) * 100) : 0;
  const stageIdx = STAGES.findIndex((s) => s.key === status);
  const fillPct = stageIdx >= 0 ? (stageIdx / (STAGES.length - 1)) * 100 : isComplete ? 100 : 0;

  const run = async (fn, okMsg) => {
    setAdvancing(true);
    try { await fn(); cacheClear(CACHE_KEY, 'admin_orders_list', 'dashboard_stats', 'production_orders_list'); await loadAll(true); setToast({ msg: okMsg, type: 'success' }); }
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
              <Callout tone="danger" icon="lock" title="QC hold — cannot advance to QC stage">
                Complete the QC checklist (80/20 inspection) and submit a PASS result to release this hold.{' '}
                <button className="adm-link-btn" onClick={() => navigate('/admin/qc')}>Open QC checklist</button>
              </Callout>
            )}
            {status === 'pattern' && (
              <Callout tone="warn" icon="warning" title="Materials will be deducted from inventory">
                Advancing past Pattern deducts the confirmed materials from stock. Enter actual usage and make sure stock is sufficient first.
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
                  <div><div style={{ fontSize: 16, fontWeight: 800 }}>{cur.label}</div><div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{cur.desc}</div></div>
                </div>
                <SizeBreakdown logs={prodLogs} stage={status} />
              </Panel>
            )}

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
                <dt>Client</dt><dd>{order?.customer_name ?? '—'}</dd>
                <dt>Garment</dt><dd>{order?.garment_type ?? 'Custom'}</dd>
                <dt>Quantity</dt><dd>{order?.quantity_ordered ?? 0} pcs</dd>
                <dt>Color</dt><dd>{order?.color ?? '—'}</dd>
                <dt>Deadline</dt><dd>{order?.target_delivery_date || order?.deadline ? fmtDate(order.target_delivery_date ?? order.deadline) : '—'}</dd>
              </dl>
            </Panel>
            <Panel title="Stage history" flush>
              {tracking.length === 0 ? <div className="adm-empty">No stage activity recorded yet.</div> : (
                <ul className="adm-tl" style={{ padding: '16px 18px 2px' }}>
                  {tracking.map((t, i) => (
                    <li key={i} className={t.stage === status ? 'now' : ''}>
                      <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{t.stage}</div>
                      {t.notes && <div style={{ color: 'var(--text-subtle)' }}>{t.notes}</div>}
                      <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>{fmtDate(t.completed_at)}{t.completed_by ? ` · by ${t.completed_by}` : ''}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
