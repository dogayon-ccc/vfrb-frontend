// Upload-first order for a complete uniform set: reference check → top and bottom size matrices → delivery → one order.
// The server stores the verdict; this screen only shows it and never sends a garment or verdict of its own.
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '../../../hooks/usePageTitle';
import { useObjectUrl } from '../../../hooks/useObjectUrl';
import { AlertBanner, Badge, Button, Field, NavIcon, PageHeader } from '../../../components/ui';
import { checkUpload } from '../../../utils/fileCheck';
import { useReferenceRules } from '../../../utils/uploadRules';
import MaterialsReveal from '../MaterialsReveal';
import { minDeadline } from './orderForm';
import { PIECES, SIZES, MIN_PER_PIECE, REASON_COPY, canContinue, canRetry, checkMatrix, copyTopToBottom, emptyMatrix, resumeRef, setCell, setOrderFields, total } from './setOrder';
import type { HeldUpload, Matrix, Piece, RefResult } from './setOrder';
import './setOrder.css';

const STAGES = ['Reference', 'Sizes', 'Delivery'];
const LABEL: Record<Piece, string> = { top: 'Top', bottom: 'Bottom' };
const apiMessage = (e: any) => e.response?.data?.errors && Object.values(e.response.data.errors)[0]?.[0] || e.response?.data?.message || (e.response ? 'The order could not be submitted.' : 'No connection. Check your internet and try again.');

export default function SetUploadOrder() {
  usePageTitle('New order');
  const nav = useNavigate();
  const rules = useReferenceRules();
  const input = useRef<HTMLInputElement>(null);
  const run = useRef(0);
  const [stage, setStage] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileMsg, setFileMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [ref, setRef] = useState<RefResult | null>(null);
  const [checkErr, setCheckErr] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix);
  const [d, setD] = useState({ deadline: '', delivery_method: 'vfrb_deliver', delivery_address: '', po_reference: '', special_notes: '' });
  const [held, setHeld] = useState<HeldUpload[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<any>(null);
  const url = useObjectUrl(file?.type?.startsWith('image/') ? file : null);
  const check = checkMatrix(matrix);

  useEffect(() => {
    axios.get('/api/customer/reference-validations').then(r => setHeld(Array.isArray(r.data) ? r.data : [])).catch(() => setHeld([]));
  }, []);

  const runCheck = async (f: File) => {
    const id = ++run.current;
    setChecking(true); setRef(null); setCheckErr(''); setConfirmed(false);
    try {
      const fd = new FormData();
      fd.append('reference', f);
      const r = await axios.post('/api/customer/ai/validate-reference', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (id === run.current) setRef(r.data);
    } catch (e: any) {
      if (id === run.current) setCheckErr(e.response?.status === 429 ? 'Too many checks. Wait a minute and try again.' : 'The check could not be completed. Nothing was submitted. Try again.');
    } finally { if (id === run.current) setChecking(false); }
  };

  const pick = async (e: any) => {
    const f: File | null = e.target.files?.[0] ?? null;
    const m = await checkUpload(f, rules);
    e.target.value = '';
    setFileMsg(m);
    if (m || !f) return;
    setFile(f); runCheck(f);
  };
  const drop = () => { run.current++; setFile(null); setRef(null); setCheckErr(''); setConfirmed(false); setChecking(false); };

  const submit = async () => {
    if (!ref || !check.ok) return;
    if (d.delivery_method !== 'pickup' && !d.delivery_address.trim()) { setErr('Enter where VFRB should deliver.'); return; }
    if (d.deadline && d.deadline < minDeadline()) { setErr(`Pick ${minDeadline()} or later.`); return; }
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(setOrderFields(ref, matrix, d)).forEach(([k, v]) => fd.append(k, v as string));
      const r = await axios.post('/api/customer/orders', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCreated(r.data.order);
    } catch (e) { setErr(apiMessage(e)); } finally { setBusy(false); }
  };

  if (created) return <MaterialsReveal key={created.order_id} order={created} onDone={() => nav(`/orders/${created.order_id}`, { state: { justCreated: true } })}/>;

  const verdict = ref?.verdict;
  return (
    <div className="cx-page wz-page so-page">
      <PageHeader back={{ to: '/dashboard', label: 'Home' }} title="New order" subtitle={`Step ${stage + 1} of ${STAGES.length}: ${STAGES[stage]}`}/>
      <ol className="wz-steps" aria-label="Order steps">
        {STAGES.map((l, i) => (
          <li key={l} className="wz-step" data-s={i < stage ? 'done' : i === stage ? 'now' : 'todo'} aria-current={i === stage ? 'step' : undefined}>
            <span className="wz-dot">{i + 1}</span><span className="wz-lbl">{l}</span>
          </li>
        ))}
      </ol>

      <section className="cx-card wz-card so-card" aria-label={STAGES[stage]}>
        {stage === 0 && (
          <div className="wz-stack">
            <p className="wz-lead">Upload a picture or technical drawing of the complete uniform: the top and the bottom. VFRB reads the garments from the file.</p>
            {file ? (
              <div className="so-file">
                {url ? <img src={url} alt="Your uploaded reference"/> : <span className="so-pdf"><NavIcon name="attachment" size={22}/></span>}
                <p><strong>{file.name}</strong></p>
                <Button size="sm" onClick={() => input.current?.click()}>Change</Button>
                <Button size="sm" onClick={drop}>Remove</Button>
              </div>
            ) : (
              <button type="button" className="wz-drop" onClick={() => input.current?.click()}>
                <NavIcon name="attachment" size={22}/><strong>Upload the uniform reference</strong><span>{rules.label}</span>
              </button>
            )}
            {!file && !ref && held.length > 0 && (
              <div className="so-held">
                <p><strong>Earlier uploads</strong></p>
                <ul>
                  {held.map(h => {
                    const r = resumeRef(h);
                    return (
                      <li key={h.id}>
                        <span>{h.top_garment && h.bottom_garment ? `${h.top_garment} + ${h.bottom_garment}` : 'Reference'} · {r ? 'Approved' : h.status === 'rejected' ? 'Not accepted' : 'Waiting for VFRB review'}</span>
                        {r && <Button size="sm" onClick={() => { setRef(r); setConfirmed(false); }}>Use this upload</Button>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <input ref={input} type="file" hidden accept={rules.accept} onChange={pick} aria-label="Uniform reference image or PDF"/>
            {fileMsg && <p className="wz-error" role="alert"><NavIcon name="warning" size={13}/> {fileMsg}</p>}

            <div aria-live="polite">
              {checking && <p className="so-status">Checking the file…</p>}
              {checkErr && <AlertBanner tone="warning" title="Check not completed">{checkErr}</AlertBanner>}
              {ref && verdict === 'accepted' && (
                <div className="so-detected">
                  <p><Badge tone="success">Complete set found</Badge></p>
                  <dl><div><dt>Top</dt><dd>{ref.top}</dd></div><div><dt>Bottom</dt><dd>{ref.bottom}</dd></div></dl>
                  <label className="so-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> This is the complete set I want to order.</label>
                </div>
              )}
              {ref && verdict === 'rejected' && <AlertBanner tone="error" title="This file cannot be ordered">{REASON_COPY[ref.reason] ?? 'This file cannot be used.'} Choose another file.</AlertBanner>}
              {ref && verdict === 'needs_review' && (
                <AlertBanner tone="warning" title="On hold: not orderable yet">
                  {REASON_COPY[ref.reason] ?? 'VFRB needs to review this file.'}{' '}
                  {canRetry(ref) ? 'Nothing was placed.' : 'You cannot order this file until VFRB confirms it.'}
                  {canRetry(ref) && file && <> <Button size="sm" onClick={() => runCheck(file)}>Try again</Button></>}
                </AlertBanner>
              )}
            </div>
          </div>
        )}

        {stage === 1 && (
          <div className="wz-stack">
            <p className="wz-lead">Enter how many of each size. Each piece needs at least {MIN_PER_PIECE}, and tops and bottoms must match.</p>
            <div className="so-scroll">
              <table className="so-matrix">
                <caption className="sr-only">Quantity per size for tops and bottoms</caption>
                <thead><tr><th scope="col">Piece</th>{SIZES.map(s => <th key={s} scope="col">{s}</th>)}<th scope="col">Total</th></tr></thead>
                <tbody>
                  {PIECES.map(p => (
                    <tr key={p}>
                      <th scope="row">{LABEL[p]}<span>{p === 'top' ? ref?.top : ref?.bottom}</span></th>
                      {SIZES.map(s => (
                        <td key={s}><input inputMode="numeric" pattern="[0-9]*" aria-label={`${LABEL[p]} size ${s}`} value={matrix[p][s]} placeholder="0"
                          onChange={e => setMatrix(m => setCell(m, p, s, e.target.value))}/></td>
                      ))}
                      <td className="so-total">{total(matrix[p])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="so-tools">
              <Button size="sm" onClick={() => setMatrix(copyTopToBottom)}>Copy top sizes to bottom</Button>
              <p className="so-sum" role="status" data-ok={check.ok || undefined}>
                {check.ok ? <><NavIcon name="success" size={14}/> {check.sets} complete sets</> : <><NavIcon name="warning" size={14}/> Not ready</>}
              </p>
            </div>
            {!check.ok && <ul className="so-msgs">{check.messages.map(m => <li key={m}>{m}</li>)}</ul>}
          </div>
        )}

        {stage === 2 && (
          <div className="wz-stack">
            <p className="wz-lead">Orders take at least a week. VFRB reviews the order, then sends a price and delivery date for you to accept.</p>
            <p className="so-recap"><strong>{check.sets} sets</strong>: {ref?.top} + {ref?.bottom}</p>
            <div className="wz-grid2">
              <Field type="date" label="Preferred date (optional)" min={minDeadline()} value={d.deadline} onChange={(e: any) => setD({ ...d, deadline: e.target.value })} hint="VFRB confirms the final date."/>
              <Field label="PO reference (optional)" value={d.po_reference} onChange={(e: any) => setD({ ...d, po_reference: e.target.value })} placeholder="Your purchase order number"/>
            </div>
            <div className="wz-seg" role="group" aria-label="Delivery method">
              {[['vfrb_deliver', 'VFRB delivers'], ['pickup', 'Pick up at VFRB']].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={d.delivery_method === v} onClick={() => setD({ ...d, delivery_method: v })}>{l}</button>
              ))}
            </div>
            {d.delivery_method !== 'pickup' && <Field as="textarea" rows={3} label="Delivery address" value={d.delivery_address} onChange={(e: any) => setD({ ...d, delivery_address: e.target.value })} placeholder="Street, barangay, city, province"/>}
            <Field as="textarea" rows={2} label="Notes for VFRB (optional)" value={d.special_notes} onChange={(e: any) => setD({ ...d, special_notes: e.target.value })}/>
          </div>
        )}
      </section>

      {err && <div className="wz-err" role="alert"><NavIcon name="warning" size={14}/> {err}</div>}

      <div className="wz-actions so-actions">
        <div className="wz-btns">
          <Button onClick={stage ? () => { setErr(''); setStage(stage - 1); } : () => nav(-1)}>{stage ? 'Back' : 'Cancel'}</Button>
          {stage < 2
            ? <Button variant="primary" disabled={stage === 0 ? !canContinue(ref, confirmed) : !check.ok} onClick={() => setStage(stage + 1)}>Next: {STAGES[stage + 1]}</Button>
            : <Button variant="primary" disabled={busy || !check.ok} onClick={submit}>{busy ? 'Submitting…' : 'Submit order'}</Button>}
        </div>
      </div>
    </div>
  );
}
