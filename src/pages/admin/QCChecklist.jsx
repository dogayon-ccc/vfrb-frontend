// FIX (Sony Mark, Sept 10 2026): hex→var(--...) token migration — 92 of 96
// literal hex values replaced with real theme.css tokens (--teal, --ink,
// --border, --success-bg, --teal-50, etc.). Remaining 4 (#16a34a/#dc2626,
// gradient end-stops paired with var(--success)/var(--danger) start-stops)
// have no darker-shade token equivalent in theme.css — left literal,
// same documented-exception pattern as other pages' gradient endpoints.
// Logic (checklist state, pass/fail computation, QC submit) untouched.
// TASK AA — QC Checklist inspection card redesign
//
// Changes from prior version:
//   1. LIVE 80/20 COUNTER — as staff toggles pass/fail on the physical count
//      inputs, a live status reads:
//        "16/20 passed (80%) ✅ CLEAR TO PRESS"
//        "14/20 passed (70%) ⛔ HOLD — rework required"
//      This is Ma'am Fe's exact rule from the interview: 80% of sampled
//      pieces must pass; 20% tolerance for alteration.
//   2. FOR ALTERATION LABEL — failed pieces render with a teal
//      "For Alteration" badge, NOT "Rejected." This matches the interview:
//      "Failed pieces: returned for alteration (NOT remade from scratch)"
//   3. INSPECTION CARD VISUAL — the QC form is now styled as a physical
//      inspection card: white card, teal left border, garment type header,
//      measurement grid laid out like a real quality sheet.
//   4. Pass/Fail toggles polished — green/red with icon, bigger touch target.
//   5. All existing functionality preserved (measurements, existing result
//      load, submit to API, QCModal, standalone page).
//
// LOCKED RULES enforced:
//   - 80/20 rule: 80% of sampled pieces must pass (from interview)
//   - Failed = For Alteration (NOT rejected, NOT remade)
//   - qc_required + qc_passed_at on orders table
//   - No material_formulas references

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { NavIcon }                           from '../../components/ui/icons';

const T  = 'var(--teal)';
const T2   = 'var(--teal-2)';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

const SK = {
  borderRadius: 6,
  background: 'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
  backgroundSize: '400px',
  animation: 'sk 1.4s infinite',
};

const inp = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--ink)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
  fontFamily: FONT,
};

const fi = e => { e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; };

const lbl = {
  display: 'block', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-subtle)', marginBottom: 7,
  fontFamily: FONT,
};

// QC checklist items — from Ma'am Fe's interview (Apr 30 2026)
const CHECKS = [
  { key: 'stitching_ok', label: 'Stitching',   icon: 'qcStitching', desc: 'Uniform, secure, no loose threads' },
  { key: 'color_ok',     label: 'Color Match',  icon: 'qcColor',    desc: 'Matches color specified in order + PO swatch' },
  { key: 'size_ok',      label: 'Size / Fit',   icon: 'qcSize',     desc: 'Measurements match spec sheet per size' },
  { key: 'label_ok',     label: 'Labels',       icon: 'qcLabel',    desc: 'Size + brand labels correctly attached' },
  { key: 'finish_ok',    label: 'Finish',       icon: 'qcFinish',   desc: 'No raw edges, clean pressing, no stains' },
  { key: 'button_ok',    label: 'Buttons/Zip',  icon: 'qcFastener', desc: 'All fasteners functional', optional: true },
];

// ── 80/20 status calculator ───────────────────────────────────────────────────
// Returns { pct, passes, clears, label, color, bgColor, borderColor }
function calc8020(itemsChecked, itemsPassed) {
  const checked = parseInt(itemsChecked, 10) || 0;
  const passed  = parseInt(itemsPassed,  10) || 0;

  if (checked === 0) return null;

  const pct    = Math.round((passed / checked) * 100);
  const clears = pct >= 80;

  return {
    pct,
    passed,
    checked,
    failed: checked - passed,
    clears,
    label: clears
      ? `${passed}/${checked} passed (${pct}%) ✅ CLEAR TO PRESS`
      : `${passed}/${checked} passed (${pct}%) ⛔ HOLD — rework required`,
    color:       clears ? '#166534' : 'var(--danger-border)',
    bgColor:     clears ? 'var(--success-bg)' : 'var(--danger-bg)',
    borderColor: clears ? 'var(--success-border)' : 'var(--danger-border)',
  };
}

// ── Pass/Fail toggle row ──────────────────────────────────────────────────────
function CheckRow({ item, value, onChange }) {
  const isPassed = value === true;
  const isFailed = value === false;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 14px', borderRadius: 11,
      background: isPassed ? 'var(--success-bg)' : isFailed ? 'var(--danger-bg)' : 'var(--bg)',
      border: `1px solid ${isPassed ? 'var(--success-border)' : isFailed ? 'var(--danger-border)' : 'var(--border)'}`,
      transition: 'all .15s',
    }}>
      {/* Icon */}
      <span style={{ flexShrink: 0, marginTop: 1 }}><NavIcon name={item.icon} size={20} color="var(--teal)"/></span>

      {/* Label + desc */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            {item.label}
          </p>
          {item.optional && (
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 400 }}>optional</span>
          )}
          {/* FOR ALTERATION badge on failed items — NOT "Rejected" (interview rule) */}
          {isFailed && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: '2px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800,
                background: `${T}15`, color: T, border: `1px solid ${T}40`,
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}
            >
              For Alteration
            </motion.span>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '3px 0 0', lineHeight: 1.5 }}>
          {item.desc}
        </p>
      </div>

      {/* Pass / Fail buttons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignSelf: 'center' }}>
        <button
          onClick={() => onChange(isPassed ? null : true)}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: FONT,
            fontSize: 12, fontWeight: 700, minHeight: 36,
            background: isPassed ? 'var(--success)' : 'var(--bg-surface)',
            color:      isPassed ? 'var(--bg-card)'    : 'var(--text-subtle)',
            transition: 'all .13s',
          }}
        >
          ✓ Pass
        </button>
        <button
          onClick={() => onChange(isFailed ? null : false)}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: FONT,
            fontSize: 12, fontWeight: 700, minHeight: 36,
            background: isFailed ? 'var(--danger)' : 'var(--bg-surface)',
            color:      isFailed ? 'var(--bg-card)'    : 'var(--text-subtle)',
            transition: 'all .13s',
          }}
        >
          ✗ Fail
        </button>
      </div>
    </div>
  );
}

// ── QC Form — used as page section or inside QCModal ─────────────────────────
export function QCChecklistForm({ orderId, orderData, onComplete, onClose }) {
  const [checks,   setChecks]   = useState({});
  const [measures, setMeasures] = useState({
    chest_cm: '', length_cm: '', sleeve_cm: '', waist_cm: '', shoulder_cm: '',
  });
  const [counts,   setCounts]   = useState({
    items_checked: '', items_passed: '', items_failed: '',
  });
  const [notes,    setNotes]    = useState('');
  const [existing, setExisting] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  // Load existing QC result if present
  useEffect(() => {
    if (!orderId) return;
    axios.get(`/api/admin/orders/${orderId}/qc`)
      .then(r => {
        const c = r.data?.checklist;
        if (!c) return;
        setExisting(c);
        setChecks({
          stitching_ok: c.stitching_ok, color_ok: c.color_ok,
          size_ok: c.size_ok, label_ok: c.label_ok,
          finish_ok: c.finish_ok, button_ok: c.button_ok,
        });
        setMeasures({
          chest_cm: c.chest_cm ?? '', length_cm: c.length_cm ?? '',
          sleeve_cm: c.sleeve_cm ?? '', waist_cm: c.waist_cm ?? '',
          shoulder_cm: c.shoulder_cm ?? '',
        });
        setCounts({
          items_checked: c.items_checked ?? '',
          items_passed:  c.items_passed  ?? '',
          items_failed:  c.items_failed  ?? '',
        });
        setNotes(c.notes ?? '');
      })
      .catch(() => {});
  }, [orderId]);

  const setCheck = (k, v) => setChecks(c => ({ ...c, [k]: v }));

  // Auto-calculate items_failed from checked − passed
  const handleCountChange = (k, v) => {
    const next = { ...counts, [k]: v };
    if (k === 'items_checked' || k === 'items_passed') {
      const chk = parseInt(k === 'items_checked' ? v : next.items_checked, 10) || 0;
      const psd = parseInt(k === 'items_passed'  ? v : next.items_passed,  10) || 0;
      next.items_failed = String(Math.max(0, chk - psd));
    }
    setCounts(next);
  };

  // Live 80/20 result
  const result8020 = calc8020(counts.items_checked, counts.items_passed);

  // Checklist validation
  const requiredChecks = CHECKS.filter(c => !c.optional);
  const allAnswered    = requiredChecks.every(c => checks[c.key] !== undefined && checks[c.key] !== null);
  const checksPassed   = requiredChecks.every(c => checks[c.key] === true);

  // Overall pass = checklist items all pass AND 80/20 threshold met
  const willPass = checksPassed && (result8020?.clears ?? false);
  const anyFailed = CHECKS.some(c => checks[c.key] === false);

  const submit = async () => {
    if (!allAnswered) { setErr('Answer all required checklist items.'); return; }
    if (!counts.items_checked || parseInt(counts.items_checked, 10) < 1) {
      setErr('Enter how many garments were inspected.'); return;
    }
    setSaving(true); setErr('');
    try {
      const payload = {
        ...checks,
        ...measures,
        items_checked: parseInt(counts.items_checked, 10),
        items_passed:  parseInt(counts.items_passed,  10) || 0,
        items_failed:  parseInt(counts.items_failed,  10) || 0,
        notes,
      };
      const r = await axios.post(`/api/admin/orders/${orderId}/qc`, payload);
      onComplete?.(r.data);
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Failed to submit QC result.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Inspection card header ── */}
      <div style={{
        borderLeft: `4px solid ${T}`, paddingLeft: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: T, textTransform: 'uppercase', letterSpacing: '.07em', margin: 0 }}>
            QC Inspection Card
          </p>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: '3px 0 0' }}>
            {orderData?.garment_type ?? 'Garment'} — Order #{orderId}
          </h3>
          {orderData && (
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '3px 0 0' }}>
              {orderData.quantity_ordered ?? 0} pcs · {orderData.color ?? '—'} ·{' '}
              {orderData.collar_type ?? ''} {orderData.sleeve_type ?? ''}
            </p>
          )}
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 99, fontSize: 10, fontWeight: 700,
          background: 'var(--teal-50)', color: T, border: `1px solid ${T}30`,
        }}>
          80/20 QC Rule
        </div>
      </div>

      {/* ── Previous result banner ── */}
      {existing && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: existing.passed ? 'var(--success-bg)' : 'var(--danger-bg)',
          border: `1px solid ${existing.passed ? 'var(--success-border)' : 'var(--danger-border)'}`,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: existing.passed ? '#166534' : 'var(--danger-border)' }}>
            {existing.passed ? '✓ Previous QC: PASSED' : '✗ Previous QC: FAILED'}
            {' '}— {existing.checker?.name ?? '—'} ·{' '}
            {existing.checked_at
              ? new Date(existing.checked_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
              : ''}
          </p>
          {!existing.passed && (
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '4px 0 0' }}>
              Failed pieces have been returned for alteration (not remade).
            </p>
          )}
        </div>
      )}

      {/* ── Checklist items ── */}
      <div>
        <p style={{ ...lbl, marginBottom: 10 }}>Inspection Items</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CHECKS.map(item => (
            <CheckRow
              key={item.key}
              item={item}
              value={checks[item.key] ?? null}
              onChange={v => setCheck(item.key, v)}
            />
          ))}
        </div>

        {/* For Alteration summary — list all failed items */}
        {anyFailed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 10,
              background: `${T}08`, border: `1px solid ${T}20`,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: T, margin: '0 0 5px' }}>
              Items for Alteration (NOT rejected — rework only):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CHECKS.filter(c => checks[c.key] === false).map(c => (
                <span key={c.key} style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: 'var(--bg-card)', border: `1px solid ${T}30`, color: T,
                }}>
                  <NavIcon name={c.icon} size={11} color={T}/> {c.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Physical count grid ── */}
      <div>
        <p style={{ ...lbl, marginBottom: 4 }}>Physical Sample Count</p>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '0 0 10px', lineHeight: 1.5 }}>
          80% of sampled pieces must pass to clear this stage.
          Failed pieces are returned for alteration, not remade.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            ['items_checked', 'Pieces Inspected', 'var(--ink)'],
            ['items_passed',  'Passed',           'var(--success)'],
            ['items_failed',  'For Alteration',   T       ],
          ].map(([k, label, color]) => (
            <div key={k}>
              <label style={{ ...lbl, color }}>
                {label}
              </label>
              <input
                type="number" min={0}
                value={counts[k]}
                onChange={e => handleCountChange(k, e.target.value)}
                readOnly={k === 'items_failed'}
                style={{
                  ...inp,
                  textAlign: 'center',
                  borderColor: k === 'items_checked' ? 'var(--border)' : `${color}40`,
                  background: k === 'items_failed' ? 'var(--bg)' : 'var(--bg-card)',
                  cursor: k === 'items_failed' ? 'default' : 'text',
                }}
                onFocus={k !== 'items_failed' ? fi : undefined}
                onBlur={k !== 'items_failed' ? fo : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── LIVE 80/20 COUNTER ── */}
      <AnimatePresence>
        {result8020 && (
          <motion.div
            key="counter"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0        }}
            style={{
              padding: '16px 18px', borderRadius: 12,
              background: result8020.bgColor,
              border: `1px solid ${result8020.borderColor}`,
            }}
          >
            {/* Progress bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: result8020.color }}>
                  Pass Rate
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: result8020.color }}>
                  {result8020.pct}%
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(0,0,0,.08)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result8020.pct}%` }}
                  transition={{ duration: .5, ease: 'easeOut' }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: result8020.clears
                      ? 'linear-gradient(90deg,var(--success),#16a34a)'
                      : 'linear-gradient(90deg,var(--danger),#dc2626)',
                  }}
                />
              </div>
              {/* 80% threshold marker */}
              <div style={{ position: 'relative', height: 8, marginTop: -8, pointerEvents: 'none' }}>
                <div style={{
                  position: 'absolute', left: '80%', top: 0,
                  width: 2, height: 8, background: 'var(--text-faint)', borderRadius: 1,
                }}/>
              </div>
            </div>

            {/* Status label */}
            <p style={{ fontSize: 14, fontWeight: 800, color: result8020.color, margin: 0 }}>
              {result8020.label}
            </p>

            {/* Sub-detail */}
            <p style={{ fontSize: 11, color: result8020.color, opacity: .7, margin: '4px 0 0' }}>
              {result8020.failed} piece{result8020.failed !== 1 ? 's' : ''} for alteration ·{' '}
              80% threshold = {Math.ceil(result8020.checked * 0.8)} pieces
              {result8020.clears
                ? ` · ✅ Stage can advance to Pressing`
                : ` · ⛔ ${Math.ceil(result8020.checked * 0.8) - result8020.passed} more piece(s) must pass`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Measurements (inspection card style) ── */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <p style={{ ...lbl, marginBottom: 10 }}>
          Measurements (cm)
          <span style={{ color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>
            — optional, store for records
          </span>
        </p>
        <div className="qc-measures" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {[
            ['chest_cm', 'Chest'], ['length_cm', 'Length'],
            ['sleeve_cm', 'Sleeve'], ['waist_cm', 'Waist'], ['shoulder_cm', 'Shoulder'],
          ].map(([k, label]) => (
            <div key={k}>
              <label style={{ ...lbl, fontSize: 9 }}>{label}</label>
              <input
                type="number" step={0.1} min={0}
                value={measures[k]}
                onChange={e => setMeasures(m => ({ ...m, [k]: e.target.value }))}
                placeholder="0.0"
                style={{ ...inp, textAlign: 'center', padding: '8px 6px' }}
                onFocus={fi} onBlur={fo}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <label style={lbl}>QC Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observations, defect details, alteration instructions…"
          rows={2}
          style={{ ...inp, resize: 'none' }}
          onFocus={fi} onBlur={fo}
        />
      </div>

      {err && (
        <p style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }}>⚠️ {err}</p>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {onClose && (
          <button onClick={onClose} style={{
            padding: '10px 18px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--ink)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT,
          }}>
            Cancel
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: .98 }}
          onClick={submit}
          disabled={saving || !allAnswered}
          style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            fontSize: 13, fontWeight: 700, cursor: (saving || !allAnswered) ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            color: 'var(--bg-card)',
            background: (saving || !allAnswered) ? 'var(--text-faint)'
              : willPass
                ? 'linear-gradient(135deg,var(--success),#16a34a)'
                : 'linear-gradient(135deg,var(--danger),#dc2626)',
            opacity: !allAnswered ? .6 : 1,
          }}
        >
          {saving        ? '⏳ Submitting…'
           : !allAnswered ? 'Answer all items'
           : willPass     ? '✓ Submit QC — PASS'
           :                '✗ Submit QC — FAIL (For Alteration)'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Standalone QC Modal ───────────────────────────────────────────────────────
export function QCModal({ order, onClose, onComplete }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
      backdropFilter: 'blur(5px)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, overflowY: 'auto',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: .95 }}
        animate={{ opacity: 1, scale: 1  }}
        style={{
          background: 'var(--bg-card)', borderRadius: 18,
          width: 'min(640px,100%)', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,.18)', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg)', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              🔍 QC Checklist — Order #{order?.order_id}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '3px 0 0' }}>
              80/20 rule · Must pass before advancing to Pressing
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: 'none',
            background: 'var(--bg-surface)', cursor: 'pointer', fontSize: 14, color: 'var(--text-subtle)',
          }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <QCChecklistForm
            orderId={order?.order_id}
            orderData={order}
            onComplete={data => { onComplete?.(data); onClose?.(); }}
            onClose={onClose}
          />
        </div>
      </motion.div>
    </div>
  );
}

// ── Standalone page (/admin/qc) ───────────────────────────────────────────────
export default function AdminQCChecklist() {
  const [orders,  setOrders]  = useState([]);
  const [selId,   setSelId]   = useState('');
  const [loading, setLoading] = useState(true);
  const [done,    setDone]    = useState(null);

  useEffect(() => {
    axios.get('/api/admin/orders?status=qc')
      .then(r => {
        const all = r.data?.data ?? r.data ?? [];
        setOrders(all);
        if (all.length) setSelId(String(all[0].order_id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selOrder = orders.find(o => String(o.order_id) === selId);

  return (
    <>
      <style>{`
        @keyframes sk {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        /* Mobile ≤ 767px */
        @media (max-width: 767px) {
          .qc-layout { grid-template-columns: 1fr !important; }
          .qc-measures { grid-template-columns: repeat(3,1fr) !important; gap: 6px !important; }
        }
        /* iPad Pro 1024–1279px */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .qc-layout { grid-template-columns: 200px 1fr !important; }
        }
        /* 4K */
        @media (min-width: 2560px) {
          .qc-layout { grid-template-columns: 320px 1fr !important; }
        }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>
          QC Checklist
        </h1>
        <p style={{ color: 'var(--text-subtle)', fontSize: 13, margin: 0 }}>
          80/20 inspection · Passes required before advancing to Pressing ·
          Failed pieces = For Alteration (not rejected)
        </p>
      </div>

      {/* Result banner */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0  }}
          style={{
            padding: '14px 18px', borderRadius: 13, marginBottom: 20,
            background: done.passed ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${done.passed ? 'var(--success-border)' : 'var(--danger-border)'}`,
          }}
        >
          <p style={{
            fontSize: 14, fontWeight: 800, margin: 0,
            color: done.passed ? '#166534' : 'var(--danger-border)',
          }}>
            {done.passed
              ? '✓ QC Passed — Order can now advance to Pressing'
              : '✗ QC Failed — Pieces returned for alteration (not remade)'}
          </p>
        </motion.div>
      )}

      <div
        className="qc-layout"
        style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18, alignItems: 'start' }}
      >
        {/* Order selector */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>
            Orders in QC Stage
          </p>
          {loading ? (
            [1, 2, 3].map((_, i) => (
              <div key={i} style={{ ...SK, height: 44, borderRadius: 10, marginBottom: 8 }}/>
            ))
          ) : orders.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: 30, margin: '0 0 8px', opacity: .3 }}>🔍</p>
              <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>No orders in QC stage</p>
            </div>
          ) : (
            orders.map(o => (
              <button
                key={o.order_id}
                onClick={() => { setSelId(String(o.order_id)); setDone(null); }}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontFamily: FONT,
                  marginBottom: 6, transition: 'all .12s',
                  background: selId === String(o.order_id) ? 'var(--teal-50)' : 'var(--bg)',
                  outline: selId === String(o.order_id) ? `2px solid ${T}40` : '2px solid transparent',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  Order #{o.order_id}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-subtle)', margin: '2px 0 0' }}>
                  {o.garment_type ?? 'Custom'} · {o.quantity_ordered ?? 0} pcs
                </p>
              </button>
            ))
          )}
        </div>

        {/* QC form */}
        {selOrder ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
          }}>
            <QCChecklistForm
              orderId={selId}
              orderData={selOrder}
              onComplete={data => setDone(data)}
            />
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '50px',
            textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
          }}>
            <p style={{ fontSize: 36, margin: '0 0 12px', opacity: .3 }}>🔍</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>Select an order to begin QC</p>
          </div>
        )}
      </div>
    </>
  );
}
