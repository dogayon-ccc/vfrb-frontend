// QC inspection card (80/20 rule): POST /api/admin/orders/{id}/qc. Used inline in Daily Output Log at the QC stage.
import { useState, useEffect } from 'react';
import axios from 'axios';
import { NavIcon } from '../ui/icons';
import { Meter, RecordedBy } from './AdminUI';

export const CHECKS = [
  { key: 'stitching_ok', label: 'Stitching', icon: 'qcStitching', desc: 'Uniform, secure, no loose threads' },
  { key: 'color_ok', label: 'Color match', icon: 'qcColor', desc: 'Matches color specified in order + PO swatch' },
  { key: 'size_ok', label: 'Size / fit', icon: 'qcSize', desc: 'Measurements match spec sheet per size' },
  { key: 'label_ok', label: 'Labels', icon: 'qcLabel', desc: 'Size + brand labels correctly attached' },
  { key: 'finish_ok', label: 'Finish', icon: 'qcFinish', desc: 'No raw edges, clean pressing, no stains' },
  { key: 'button_ok', label: 'Buttons / zip', icon: 'qcFastener', desc: 'All fasteners functional', optional: true },
];
const MEASURES = [['chest_cm', 'Chest'], ['length_cm', 'Length'], ['sleeve_cm', 'Sleeve'], ['waist_cm', 'Waist'], ['shoulder_cm', 'Shoulder']];

export function calc8020(itemsChecked, itemsPassed) {
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

// onStatus gets { checklist, qc_required } whenever the latest check loads; inline drops the sticky action bar.
export default function QCChecklistForm({ orderId, orderData, onComplete, onClose, onStatus, inline = false }) {
  const [checks, setChecks] = useState({});
  const [measures, setMeasures] = useState({ chest_cm: '', length_cm: '', sleeve_cm: '', waist_cm: '', shoulder_cm: '' });
  const [counts, setCounts] = useState({ items_checked: '', items_passed: '', items_failed: '' });
  const [notes, setNotes] = useState('');
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [reload, setReload] = useState(0);

  useEffect(() => {
    setChecks({}); setExisting(null); setErr(''); setNotes('');
    setCounts({ items_checked: '', items_passed: '', items_failed: '' });
    setMeasures({ chest_cm: '', length_cm: '', sleeve_cm: '', waist_cm: '', shoulder_cm: '' });
    if (!orderId) return;
    axios.get(`/api/admin/orders/${orderId}/qc`).then((r) => {
      onStatus?.({ checklist: r.data?.checklist ?? null, qc_required: !!r.data?.qc_required });
      const c = r.data?.checklist;
      if (!c) return;
      setExisting(c);
      setChecks({ stitching_ok: c.stitching_ok, color_ok: c.color_ok, size_ok: c.size_ok, label_ok: c.label_ok, finish_ok: c.finish_ok, button_ok: c.button_ok });
      setMeasures({ chest_cm: c.chest_cm ?? '', length_cm: c.length_cm ?? '', sleeve_cm: c.sleeve_cm ?? '', waist_cm: c.waist_cm ?? '', shoulder_cm: c.shoulder_cm ?? '' });
      setCounts({ items_checked: c.items_checked ?? '', items_passed: c.items_passed ?? '', items_failed: c.items_failed ?? '' });
      setNotes(c.notes ?? '');
    }).catch(() => onStatus?.({ error: true }));
  }, [orderId, reload]);

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
  // Same rule as the server: every required check passes, optional ones are not failed, and 80% of the sample passes.
  const willPass = required.every((c) => checks[c.key] === true) && CHECKS.every((c) => checks[c.key] !== false) && (r?.clears ?? false);
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
      setReload((n) => n + 1);
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
          <div><b>Latest QC: {existing.passed ? 'passed' : 'not passed'}</b>
            <RecordedBy name={existing.checked_by_name} at={existing.checked_at} label="Recorded by" />
            {!existing.passed && <div>Failed pieces go back for alteration (not remade). Submit a new checklist after rework.</div>}</div>
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

      <div className={`adm-actionbar${inline ? '' : ' sticky'} qc-submit`}>
        {onClose && <button className="adm-btn" onClick={onClose}>Cancel</button>}
        <button className={`adm-btn primary${allAnswered && !willPass ? ' danger-solid' : ''}`} disabled={saving || !allAnswered} onClick={submit}>
          {saving ? 'Submitting…' : !allAnswered ? 'Answer all items' : willPass ? 'Submit QC — PASS' : 'Submit QC — FAIL (for alteration)'}
        </button>
      </div>
    </div>
  );
}
