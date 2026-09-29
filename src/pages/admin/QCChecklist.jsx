// src/pages/admin/QCChecklist.jsx — /admin/qc. 80/20 rule: ≥80% of sampled pieces must pass; failed pieces = For Alteration.
// Exports QCChecklistForm + QCModal unchanged in contract.
import { useState, useEffect } from 'react';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, Panel, Banner, Meter, SkeletonRows, useIsMobile } from '../../components/admin/AdminUI';

const CHECKS = [
  { key: 'stitching_ok', label: 'Stitching', icon: 'qcStitching', desc: 'Uniform, secure, no loose threads' },
  { key: 'color_ok', label: 'Color match', icon: 'qcColor', desc: 'Matches color specified in order + PO swatch' },
  { key: 'size_ok', label: 'Size / fit', icon: 'qcSize', desc: 'Measurements match spec sheet per size' },
  { key: 'label_ok', label: 'Labels', icon: 'qcLabel', desc: 'Size + brand labels correctly attached' },
  { key: 'finish_ok', label: 'Finish', icon: 'qcFinish', desc: 'No raw edges, clean pressing, no stains' },
  { key: 'button_ok', label: 'Buttons / zip', icon: 'qcFastener', desc: 'All fasteners functional', optional: true },
];
const MEASURES = [['chest_cm', 'Chest'], ['length_cm', 'Length'], ['sleeve_cm', 'Sleeve'], ['waist_cm', 'Waist'], ['shoulder_cm', 'Shoulder']];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

function calc8020(itemsChecked, itemsPassed) {
  const checked = parseInt(itemsChecked, 10) || 0;
  const passed = parseInt(itemsPassed, 10) || 0;
  if (checked === 0) return null;
  const pct = Math.round((passed / checked) * 100);
  return { pct, passed, checked, failed: checked - passed, clears: pct >= 80, need: Math.ceil(checked * 0.8) };
}

function CheckRow({ item, value, onChange }) {
  const tone = value === true ? 'pass' : value === false ? 'fail' : '';
  return (
    <div className={`qc-row ${tone}`}>
      <span className="qc-ico"><NavIcon name={item.icon} size={18} color="currentColor" /></span>
      <div className="qc-txt">
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          {item.label}{item.optional && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', marginLeft: 6 }}>optional</span>}
          {value === false && <span className="qc-alt">For alteration</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{item.desc}</div>
      </div>
      <div className="qc-toggle" role="group" aria-label={`${item.label} result`}>
        <button aria-pressed={value === true} className="p" onClick={() => onChange(value === true ? null : true)}><NavIcon name="success" size={14} color="currentColor" /> Pass</button>
        <button aria-pressed={value === false} className="f" onClick={() => onChange(value === false ? null : false)}><NavIcon name="close" size={14} color="currentColor" /> Fail</button>
      </div>
    </div>
  );
}

export function QCChecklistForm({ orderId, orderData, onComplete, onClose }) {
  const [checks, setChecks] = useState({});
  const [measures, setMeasures] = useState({ chest_cm: '', length_cm: '', sleeve_cm: '', waist_cm: '', shoulder_cm: '' });
  const [counts, setCounts] = useState({ items_checked: '', items_passed: '', items_failed: '' });
  const [notes, setNotes] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setChecks({}); setExisting(null); setErr(''); setNotes('');
    setCounts({ items_checked: '', items_passed: '', items_failed: '' });
    setMeasures({ chest_cm: '', length_cm: '', sleeve_cm: '', waist_cm: '', shoulder_cm: '' });
    if (!orderId) return;
    axios.get(`/api/admin/orders/${orderId}/qc`).then((r) => {
      const c = r.data?.checklist;
      if (!c) return;
      setExisting(c);
      setChecks({ stitching_ok: c.stitching_ok, color_ok: c.color_ok, size_ok: c.size_ok, label_ok: c.label_ok, finish_ok: c.finish_ok, button_ok: c.button_ok });
      setMeasures({ chest_cm: c.chest_cm ?? '', length_cm: c.length_cm ?? '', sleeve_cm: c.sleeve_cm ?? '', waist_cm: c.waist_cm ?? '', shoulder_cm: c.shoulder_cm ?? '' });
      setCounts({ items_checked: c.items_checked ?? '', items_passed: c.items_passed ?? '', items_failed: c.items_failed ?? '' });
      setNotes(c.notes ?? '');
    }).catch(() => {});
  }, [orderId]);

  const handleCount = (k, v) => {
    const next = { ...counts, [k]: v };
    if (k === 'items_checked' || k === 'items_passed') {
      next.items_failed = String(Math.max(0, (parseInt(next.items_checked, 10) || 0) - (parseInt(next.items_passed, 10) || 0)));
    }
    setCounts(next);
  };

  const r = calc8020(counts.items_checked, counts.items_passed);
  const required = CHECKS.filter((c) => !c.optional);
  const allAnswered = required.every((c) => checks[c.key] !== undefined && checks[c.key] !== null);
  const willPass = required.every((c) => checks[c.key] === true) && (r?.clears ?? false);
  const failedItems = CHECKS.filter((c) => checks[c.key] === false);

  const submit = async () => {
    if (!allAnswered) { setErr('Answer all required checklist items.'); return; }
    if (!counts.items_checked || parseInt(counts.items_checked, 10) < 1) { setErr('Enter how many garments were inspected.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await axios.post(`/api/admin/orders/${orderId}/qc`, {
        ...checks, ...measures,
        items_checked: parseInt(counts.items_checked, 10),
        items_passed: parseInt(counts.items_passed, 10) || 0,
        items_failed: parseInt(counts.items_failed, 10) || 0,
        notes,
      });
      onComplete?.(res.data);
    } catch (e) { setErr(e.response?.data?.message ?? 'Failed to submit QC result.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="qc-form">
      <div className="qc-head">
        <div>
          <div className="adm-field" style={{ color: 'var(--teal)', marginBottom: 2 }}>QC inspection card</div>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{orderData?.garment_type ?? 'Garment'} — Order #{orderId}</h3>
          {orderData && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{orderData.quantity_ordered ?? 0} pcs · {orderData.color ?? '—'}{orderData.customer_name ? ` · ${orderData.customer_name}` : ''}</div>}
        </div>
        <span className="adm-chip">80/20 rule</span>
      </div>

      {existing && (
        <div className={`adm-callout ${existing.passed ? 'ok' : 'danger'}`} style={{ marginBottom: 0 }}>
          <NavIcon name={existing.passed ? 'success' : 'warning'} size={16} color="currentColor" />
          <div><b>Previous QC: {existing.passed ? 'passed' : 'failed'}</b>
            {existing.checker?.name ?? '—'} · {fmtDate(existing.checked_at)}
            {!existing.passed && ' — failed pieces were returned for alteration (not remade).'}</div>
        </div>
      )}

      <section>
        <div className="adm-field">Inspection items</div>
        <div className="qc-list">{CHECKS.map((it) => <CheckRow key={it.key} item={it} value={checks[it.key] ?? null} onChange={(v) => setChecks((c) => ({ ...c, [it.key]: v }))} />)}</div>
        {failedItems.length > 0 && (
          <div className="adm-callout info" style={{ marginTop: 10, marginBottom: 0 }}>
            <NavIcon name="info" size={16} color="currentColor" />
            <div><b>For alteration — not rejected, rework only</b>{failedItems.map((c) => c.label).join(' · ')}</div>
          </div>
        )}
      </section>

      <section>
        <div className="adm-field">Physical sample count</div>
        <div className="qc-counts">
          {[['items_checked', 'Inspected'], ['items_passed', 'Passed'], ['items_failed', 'For alteration']].map(([k, label]) => (
            <label key={k}><span className="adm-field" style={{ marginBottom: 4 }}>{label}</span>
              <input className="adm-input" type="number" inputMode="numeric" min={0} value={counts[k]} readOnly={k === 'items_failed'}
                onChange={(e) => handleCount(k, e.target.value)} style={{ textAlign: 'center', background: k === 'items_failed' ? 'var(--bg)' : undefined }} />
            </label>
          ))}
        </div>
        {r && (
          <div className={`adm-callout ${r.clears ? 'ok' : 'danger'}`} style={{ marginTop: 12, marginBottom: 0, display: 'block' }} role="status" aria-live="polite">
            <div className="adm-mrow"><b style={{ margin: 0 }}>{r.passed}/{r.checked} passed</b><b style={{ margin: 0 }}>{r.pct}%</b></div>
            <div style={{ margin: '8px 0' }}><Meter pct={r.pct} tone={r.clears ? 'ok' : 'low'} /></div>
            <div style={{ fontWeight: 700 }}>{r.clears ? 'Clear to press' : 'Hold — rework required'}</div>
            <div style={{ opacity: 0.85 }}>
              {r.failed} piece{r.failed !== 1 ? 's' : ''} for alteration · 80% threshold = {r.need} pieces
              {!r.clears && ` · ${r.need - r.passed} more must pass`}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="adm-field">Measurements (cm) <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>— optional, stored for records</span></div>
        <div className="qc-measures">
          {MEASURES.map(([k, label]) => (
            <label key={k}><span className="adm-field" style={{ fontSize: 9, marginBottom: 3 }}>{label}</span>
              <input className="adm-input" type="number" inputMode="decimal" step={0.1} min={0} placeholder="0.0" value={measures[k]}
                onChange={(e) => setMeasures((m) => ({ ...m, [k]: e.target.value }))} style={{ textAlign: 'center', padding: '0 6px' }} />
            </label>
          ))}
        </div>
      </section>

      <section>
        <label className="adm-field" htmlFor="qc-notes">QC notes</label>
        <textarea id="qc-notes" className="adm-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations, defect details, alteration instructions…" />
      </section>

      {err && <div className="adm-callout danger" role="alert" style={{ marginBottom: 0 }}><NavIcon name="warning" size={16} color="currentColor" /><div>{err}</div></div>}

      <div className="adm-actionbar sticky qc-submit">
        {onClose && <button className="adm-btn" onClick={onClose}>Cancel</button>}
        <button className={`adm-btn primary${allAnswered && !willPass ? ' danger-solid' : ''}`} disabled={saving || !allAnswered} onClick={submit}>
          {saving ? 'Submitting…' : !allAnswered ? 'Answer all items' : willPass ? 'Submit QC — PASS' : 'Submit QC — FAIL (for alteration)'}
        </button>
      </div>
    </div>
  );
}

export function QCModal({ order, onClose, onComplete }) {
  const isMobile = useIsMobile();
  return (
    <BottomSheet title={`QC Checklist — Order #${order?.order_id}`} onClose={onClose} isMobile={isMobile} maxWidth={640}>
      <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '-6px 0 16px' }}>80/20 rule · Must pass before advancing to Pressing</p>
      <QCChecklistForm orderId={order?.order_id} orderData={order} onComplete={(d) => { onComplete?.(d); onClose?.(); }} onClose={onClose} />
    </BottomSheet>
  );
}

export default function AdminQCChecklist() {
  const [orders, setOrders] = useState([]);
  const [selId, setSelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [done, setDone] = useState(null);

  const load = () => {
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/orders?status=qc').then((r) => {
      const all = r.data?.data ?? r.data ?? [];
      setOrders(all);
      setSelId((cur) => cur || (all.length ? String(all[0].order_id) : ''));
    }).catch(() => setLoadErr(true)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const selOrder = orders.find((o) => String(o.order_id) === selId);
  const pick = (id) => { setSelId(String(id)); setDone(null); };

  return (
    <>
      <PageHeader title="QC Checklist" sub="80/20 inspection · passes required before Pressing · failed pieces are for alteration, not rejected">
        <button className="adm-btn" onClick={load}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>

      {done && (
        <Banner tone={done.passed ? 'info' : 'warn'} icon={done.passed ? 'success' : 'warning'}>
          {done.passed ? 'QC passed — the order can now advance to Pressing.' : 'QC failed — pieces returned for alteration (not remade).'}
        </Banner>
      )}
      {loadErr && <Banner tone="warn" icon="warning" action={<button className="adm-btn" onClick={load}>Retry</button>}>Could not load orders in QC.</Banner>}

      <div className="qc-layout">
        <Panel title={`In QC${loading ? '' : ` (${orders.length})`}`} flush>
          {loading ? <SkeletonRows rows={3} h={56} /> : orders.length === 0 ? (
            <div className="adm-empty"><NavIcon name="qc" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>No orders in QC stage</div></div>
          ) : (
            <div className="qc-queue" role="listbox" aria-label="Orders in QC stage">
              {orders.map((o) => (
                <button key={o.order_id} role="option" aria-selected={selId === String(o.order_id)} className={selId === String(o.order_id) ? 'on' : ''} onClick={() => pick(o.order_id)}>
                  <b>#{o.order_id}</b>
                  <span>{o.garment_type ?? 'Custom'} · {o.quantity_ordered ?? 0} pcs</span>
                  {o.customer_name && <span className="adm-hide-t">{o.customer_name}</span>}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {selOrder ? (
          <Panel><QCChecklistForm orderId={selId} orderData={selOrder} onComplete={(d) => { setDone(d); load(); }} /></Panel>
        ) : (
          <Panel><div className="adm-empty"><NavIcon name="checklist" size={30} color="currentColor" /><div style={{ marginTop: 8 }}>Select an order to begin QC</div></div></Panel>
        )}
      </div>
    </>
  );
}
