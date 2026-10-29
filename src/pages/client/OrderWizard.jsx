// Order Wizard: Design → Sizes → Delivery → Review, then MaterialsReveal for each created order.
// A Studio design (or each piece of a uniform set) arrives via sessionStorage and is never re-entered here.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import MaterialsReveal from './MaterialsReveal';
import { AlertBanner, NavIcon } from '../../components/ui';
import { clearStudioHandoff, draftFingerprint, peekDesignRef } from '../../utils/studioHandoff';
import { qtyShort } from '../../utils/orderQuantity';
import { orderQueue, setNote, ROLE_LABEL } from './design-studio/uniformSet';
import { STEPS, INIT, SHARED, prefillFrom, validateStep, orderFields, garmentKind, garmentOf } from './order-wizard/orderForm';
import { StepDesign, StepSizes, StepDelivery, StepReview } from './order-wizard/WizardSteps';
import { SummaryPanel, SummaryBar } from './order-wizard/OrderSummary';
import { garmentLabel } from '../../utils/designName';

// Pieces of a set already placed, so a retry or refresh after a part-failed submit never places one twice.
const PLACED_KEY = 'set_orders_placed';
const readPlaced = id => { try { return JSON.parse(sessionStorage.getItem(PLACED_KEY) || '{}')[id] ?? {}; } catch { return {}; } };
const writePlaced = (id, placed) => { try { sessionStorage.setItem(PLACED_KEY, JSON.stringify({ [id]: placed })); } catch { /* quota */ } };
const dataUrlBlob = async url => (await fetch(url)).blob();

// Reads the Studio / My Designs handoff once: one form per piece, or one empty form for an upload order.
function readHandoff() {
  const ref = peekDesignRef();
  try {
    const raw = sessionStorage.getItem('studio_config');
    if (!raw) return { studios: [null], forms: [{ ...INIT, design_ref_file: ref }], fp: null, bad: false };
    const parsed = JSON.parse(raw);
    const list = orderQueue(parsed) ?? [parsed];
    return { studios: list, forms: list.map((cfg, i) => ({ ...INIT, ...prefillFrom(cfg), design_ref_file: i === 0 ? ref : null })), fp: draftFingerprint(parsed), bad: false };
  } catch {
    return { studios: [null], forms: [{ ...INIT, design_ref_file: ref }], fp: null, bad: true };
  }
}

const apiMessage = e => {
  const fe = e.response?.data?.errors;
  return (fe && Object.values(fe)[0]?.[0]) ?? e.response?.data?.message ?? (e.response ? 'The order could not be submitted.' : 'No connection. Check your internet and submit again.');
};

export default function OrderWizard() {
  const nav = useNavigate();
  const [init] = useState(readHandoff);
  const [studios, setStudios] = useState(init.studios);
  const [forms, setForms] = useState(init.forms);
  const [errs, setErrs] = useState(() => init.forms.map(() => ({})));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [created, setCreated] = useState(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const cardRef = useRef(null);
  const moved = useRef(false);

  const isSet = forms.length > 1;
  const setId = studios[0]?.uniformSet?.id ?? null;
  const roleOf = i => studios[i]?.uniformSet?.role ?? null;
  const pieceName = i => `${ROLE_LABEL[roleOf(i)] ?? `Piece ${i + 1}`}: ${garmentLabel(forms[i].garment_type) || 'Garment'}`;
  const titleOf = i => (isSet ? pieceName(i) : null);
  const kindOf = i => garmentKind(forms[i].garment_type || garmentOf(studios[i]), roleOf(i));

  useEffect(() => {
    document.documentElement.dataset.wizard = '1';
    return () => { delete document.documentElement.dataset.wizard; };
  }, []);

  // After a step change: scroll up and move focus to the step card for screen readers.
  useEffect(() => {
    if (!moved.current) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    cardRef.current?.focus({ preventScroll: true });
    moved.current = false;
  }, [step]);

  const setFor = i => (k, v) => {
    setForms(fs => fs.map((f, n) => (n === i || SHARED.includes(k) ? { ...f, [k]: v } : f)));
    setErrs(es => es.map((e, n) => (n === i ? { ...e, [k]: '' } : e)));
  };

  const goTo = n => { moved.current = true; setApiErr(''); setErrs(forms.map(() => ({}))); setStep(n); };
  const validate = () => {
    const all = forms.map((f, i) => (step === 2 && i > 0 ? {} : validateStep(step, f, studios[i])));
    setErrs(all);
    return all.every(e => !Object.values(e).some(Boolean));
  };
  const next = () => { if (validate()) goTo(step + 1); };

  const clearDesign = () => {
    clearStudioHandoff();
    setStudios([null]);
    setForms(f => [{ ...INIT, ...Object.fromEntries(SHARED.map(k => [k, f[0][k]])) }]);
    setErrs([{}]);
    goTo(0);
  };

  // One order; `linked` = order ids already placed for this set, named in the staff note and saved config.
  const postOrder = async (f, s, linked) => {
    const uset = s?.uniformSet ? { ...s.uniformSet, ...(linked.length && { linkedOrderIds: linked }) } : null;
    const { previewPng, ...cfg } = s ?? {};
    const fd = new FormData();
    Object.entries(orderFields(f, s ? (uset ? { ...cfg, uniformSet: uset } : cfg) : null, uset ? setNote(uset) : '')).forEach(([k, v]) => fd.append(k, v));
    if (f.design_ref_file) fd.append('design_ref_file', f.design_ref_file);
    // The backend stores the preview as a file and strips it from studio_config.
    if (previewPng?.startsWith('data:image/png')) fd.append('design_preview_file', await dataUrlBlob(previewPng), `design-${Date.now()}.png`);
    if (f.design_3d_snapshot?.startsWith('data:image/png')) fd.append('design_3d_snapshot_file', await dataUrlBlob(f.design_3d_snapshot), `design-3d-${Date.now()}.png`);
    const r = await axios.post('/api/customer/orders', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r.data.order ?? { order_id: r.data.order_id, garment_type: f.garment_type, quantity_ordered: fd.get('quantity_ordered') };
  };

  const submit = async () => {
    setBusy(true); setApiErr('');
    const placed = setId ? readPlaced(setId) : {};
    const done = [];
    let i = 0;
    try {
      for (; i < forms.length; i++) {
        const role = roleOf(i);
        if (role && placed[role]) { done.push(placed[role]); continue; }
        const o = await postOrder(forms[i], studios[i], done.map(d => d.order_id));
        done.push(o);
        if (setId) { placed[role] = { order_id: o.order_id, garment_type: o.garment_type, quantity_ordered: o.quantity_ordered }; writePlaced(setId, placed); }
      }
      // Retire the account draft only if it still holds the design that was handed in.
      const fp = init.fp;
      if (fp) axios.get('/api/customer/drafts/latest')
        .then(d => { if (draftFingerprint(d.data?.draft?.studio_config) === fp) return axios.delete('/api/customer/drafts/latest'); })
        .catch(() => {});
      clearStudioHandoff();
      try { sessionStorage.removeItem(PLACED_KEY); } catch { /* storage blocked */ }
      setRevealIdx(0); setCreated(done);
    } catch (e) {
      const msg = apiMessage(e);
      setApiErr(done.length ? `${pieceName(0)} was placed as order #${done.map(o => o.order_id).join(', #')}. ${pieceName(i)} failed: ${msg} Submit again to place it.` : msg);
    } finally { setBusy(false); }
  };

  const createdOrder = created?.[revealIdx];
  if (createdOrder) return (
    <MaterialsReveal key={createdOrder.order_id} order={createdOrder}
      onDone={() => (revealIdx < created.length - 1 ? setRevealIdx(revealIdx + 1) : nav(`/orders/${created[0].order_id}`, { state: { justCreated: true } }))}/>
  );

  const perPiece = render => forms.map((f, i) => <div key={i} className="wz-piece">{render(f, i)}</div>);
  const common = i => ({ form: forms[i], set: setFor(i), errors: errs[i] ?? {}, studio: studios[i], title: titleOf(i), uid: `wz${i}` });
  const body = [
    () => perPiece((_, i) => <StepDesign {...common(i)} onOpenStudio={() => nav('/design-studio')}/>),
    () => perPiece((_, i) => <StepSizes {...common(i)} kind={kindOf(i)}/>),
    () => <StepDelivery form={forms[0]} set={setFor(0)} errors={errs[0] ?? {}}/>,
    () => perPiece((_, i) => <StepReview {...common(i)} sharedShown={i > 0} onEdit={goTo}/>),
  ][step];
  const last = step === STEPS.length - 1;
  const belowMin = forms.some(f => qtyShort(f));

  return (
    <div className="cx-page wz-page">
      <header className="wz-head">
        <h1>{isSet ? 'Order a uniform set' : 'Place an order'}</h1>
        <p>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </header>
      <ol className="wz-steps" aria-label="Order steps">
        {STEPS.map((l, i) => (
          <li key={l} className="wz-step" data-s={i < step ? 'done' : i === step ? 'now' : 'todo'} aria-current={i === step ? 'step' : undefined}>
            {i < step
              ? <button type="button" className="wz-dot" onClick={() => goTo(i)} aria-label={`Back to ${l}`}><NavIcon name="success" size={14}/></button>
              : <span className="wz-dot">{i + 1}</span>}
            <span className="wz-lbl">{l}</span>
          </li>
        ))}
      </ol>

      {init.bad && <AlertBanner tone="warning" title="Your saved design couldn't be read">Reopen it from My Designs, or order from your own file below.</AlertBanner>}
      {isSet && <p className="wz-set" role="note">Uniform set: <strong>{forms.map((_, i) => pieceName(i)).join(' + ')}</strong>. Submitting places one linked order per piece.</p>}

      <div className="wz-cols">
        <div className="wz-main">
          <motion.section key={step} className="cx-card wz-card" ref={cardRef} tabIndex={-1} aria-label={`Step ${step + 1}: ${STEPS[step]}`}
            initial={moved.current ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {body()}
            {step === 0 && studios[0] && <button type="button" className="wz-clear" onClick={clearDesign}>Order from my own file instead</button>}
          </motion.section>

          {apiErr && <div className="wz-err" role="alert"><NavIcon name="warning" size={14}/> {apiErr}</div>}

          <div className="wz-actions">
            <SummaryBar forms={forms} studios={studios}/>
            <div className="wz-btns">
              <button type="button" className="cx-btn cx-btn-s" onClick={step ? () => goTo(step - 1) : () => nav(-1)}>{step ? 'Back' : 'Cancel'}</button>
              <button type="button" className="cx-btn cx-btn-p wz-next" aria-busy={busy || undefined} disabled={busy || (last && belowMin)} onClick={last ? submit : next}>
                {busy ? 'Submitting…' : last ? (isSet ? `Submit ${forms.length} orders` : 'Submit order') : `Next: ${STEPS[step + 1]}`}
              </button>
            </div>
          </div>
        </div>
        <div className="wz-side"><SummaryPanel forms={forms} studios={studios}/></div>
      </div>
    </div>
  );
}
