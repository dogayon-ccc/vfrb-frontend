// Manager page for the uniform-set gate: which top+bottom pairs VFRB sells as a set, and the uploads held for a decision.
// Owner is read-only. The server re-checks everything; the disabled states here only save a round trip.
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertBanner, Button, Card, EmptyState, PageHeader } from '../../components/ui';
import { isOwner, readAdminUser } from '../../utils/jobAccess';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { REASON_COPY } from '../client/order-wizard/setOrder';
import './setReview.css';

type Pair = { id: number; top_garment: string; bottom_garment: string; created_at?: string | null };
type Held = { id: number; customer_name: string | null; reason: string; top_garment: string | null; bottom_garment: string | null; pair_approved: boolean; is_pdf: boolean; created_at: string };

const errText = (e: any, fallback: string) => e?.response?.data?.message ?? fallback;

function Preview({ id, pdf }: { id: number; pdf: boolean }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    axios.get(`/api/admin/reference-validations/${id}/file`, { responseType: 'blob' })
      .then(r => { if (live) setBlob(r.data); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [id]);
  const url = useObjectUrl(blob);
  if (failed) return <p className="sr-note">The file could not be loaded.</p>;
  if (!url) return <div className="sr-ph" aria-busy="true">Loading file…</div>;
  return pdf
    ? <a className="adm-btn" href={url} target="_blank" rel="noopener noreferrer">Open PDF</a>
    : <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open the reference full size"><img className="sr-img" src={url} alt="Customer reference upload"/></a>;
}

function HeldRow({ row, tops, bottoms, pairs, readOnly, onDone }: { row: Held; tops: string[]; bottoms: string[]; pairs: Pair[]; readOnly: boolean; onDone: (msg: string) => void }) {
  const [top, setTop] = useState(row.top_garment ?? '');
  const [bottom, setBottom] = useState(row.bottom_garment ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const approved = useMemo(() => pairs.some(p => p.top_garment === top && p.bottom_garment === bottom), [pairs, top, bottom]);

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(true); setErr('');
    try {
      await axios.post(`/api/admin/reference-validations/${row.id}/decision`, decision === 'approve' ? { decision, top_garment: top, bottom_garment: bottom } : { decision });
      onDone(decision === 'approve' ? 'Approved. The customer can now continue this order.' : 'Rejected. The customer cannot order from this file.');
    } catch (e) { setErr(errText(e, 'Could not save the decision. Try again.')); setBusy(false); }
  };

  return (
    <li className="sr-item">
      <Preview id={row.id} pdf={row.is_pdf}/>
      <div className="sr-body">
        <p className="sr-who"><strong>{row.customer_name ?? 'Customer'}</strong> · {new Date(row.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        <p className="sr-note">Held because: {REASON_COPY[row.reason] ?? 'VFRB review is needed.'}</p>
        <div className="sr-pick">
          <label>Top
            <select value={top} onChange={e => setTop(e.target.value)} disabled={readOnly || busy}>
              <option value="">Choose…</option>{tops.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>Bottom
            <select value={bottom} onChange={e => setBottom(e.target.value)} disabled={readOnly || busy}>
              <option value="">Choose…</option>{bottoms.map(b => <option key={b}>{b}</option>)}
            </select>
          </label>
        </div>
        {top && bottom && !approved && <p className="sr-warn" role="status">{top} + {bottom} is not an approved set yet. Add it under Approved sets first, or reject this file.</p>}
        {err && <AlertBanner tone="error" title="Not saved">{err}</AlertBanner>}
        {!readOnly && (
          <div className="sr-actions">
            <Button variant="primary" disabled={busy || !approved} onClick={() => decide('approve')}>Approve this combination</Button>
            <Button disabled={busy} onClick={() => decide('reject')}>Reject</Button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function SetReview() {
  const readOnly = isOwner(readAdminUser());
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [tops, setTops] = useState<string[]>([]);
  const [bottoms, setBottoms] = useState<string[]>([]);
  const [held, setHeld] = useState<Held[] | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [notice, setNotice] = useState('');
  const [addTop, setAddTop] = useState('');
  const [addBottom, setAddBottom] = useState('');
  const [addErr, setAddErr] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoadErr('');
    try {
      const [p, h] = await Promise.all([axios.get('/api/admin/set-pairs'), axios.get('/api/admin/reference-validations')]);
      setPairs(p.data.pairs ?? []); setTops(p.data.tops ?? []); setBottoms(p.data.bottoms ?? []); setHeld(Array.isArray(h.data) ? h.data : []);
    } catch (e) { setLoadErr(errText(e, 'Could not load this page. Check your connection and try again.')); setHeld([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const exists = !!addTop && !!addBottom && pairs.some(p => p.top_garment === addTop && p.bottom_garment === addBottom);
  const addPair = async () => {
    setAddErr(''); setAdding(true);
    try { await axios.post('/api/admin/set-pairs', { top_garment: addTop, bottom_garment: addBottom }); setNotice(`Added ${addTop} + ${addBottom} to the approved combinations.`); setAddTop(''); setAddBottom(''); await load(); }
    catch (e) { setAddErr(errText(e, 'Could not add this combination.')); }
    setAdding(false);
  };
  const removePair = async (p: Pair) => {
    if (!window.confirm(`Remove ${p.top_garment} + ${p.bottom_garment}? New uploads with this combination will be held again. Orders already placed are not changed.`)) return;
    try { await axios.delete(`/api/admin/set-pairs/${p.id}`); setNotice(`Removed ${p.top_garment} + ${p.bottom_garment}.`); await load(); } catch (e) { setAddErr(errText(e, 'Could not remove this combination.')); }
  };
  const when = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : null);

  return (
    <div className="sr-page">
      <PageHeader title="Uniform sets" subtitle="Which top and bottom VFRB sells together, and the uploads waiting for a decision. Only approved combinations can be accepted."/>
      {loadErr && <AlertBanner tone="error" title="Could not load">{loadErr} <Button onClick={load}>Retry</Button></AlertBanner>}
      {notice && <AlertBanner tone="success" title="Done">{notice}</AlertBanner>}
      {readOnly && <AlertBanner tone="info" title="Read-only">A manager makes these decisions.</AlertBanner>}

      <div className="sr-cols">
        <Card title={`Approved combinations${held === null ? '' : ` (${pairs.length})`}`} subtitle="Pairs a manager has added. Each one is checked against every new upload.">
          {!readOnly && (
            <form className="sr-add" onSubmit={e => { e.preventDefault(); if (addTop && addBottom && !exists) addPair(); }} aria-label="Add an approved combination">
              <label>Top
                <select value={addTop} onChange={e => setAddTop(e.target.value)}><option value="">Choose a top…</option>{tops.map(t => <option key={t}>{t}</option>)}</select>
              </label>
              <label>Bottom
                <select value={addBottom} onChange={e => setAddBottom(e.target.value)}><option value="">Choose a bottom…</option>{bottoms.map(b => <option key={b}>{b}</option>)}</select>
              </label>
              <Button type="submit" variant="primary" disabled={!addTop || !addBottom || exists || adding}>Add approved combination</Button>
              {exists && <p className="sr-warn" role="status">{addTop} + {addBottom} is already approved.</p>}
            </form>
          )}
          {addErr && <AlertBanner tone="error" title="Not saved">{addErr}</AlertBanner>}
          {pairs.length === 0
            ? <EmptyState compact>No combinations approved yet, so every new upload is held for review.</EmptyState>
            : <ul className="sr-pairs">{pairs.map(p => (
                <li key={p.id}>
                  <span className="sr-pair"><b>{p.top_garment}</b><i aria-hidden="true">+</i><b>{p.bottom_garment}</b>{when(p.created_at) && <small>Added {when(p.created_at)}</small>}</span>
                  {!readOnly && <Button size="sm" onClick={() => removePair(p)} aria-label={`Remove ${p.top_garment} and ${p.bottom_garment}`}>Remove</Button>}
                </li>))}</ul>}
        </Card>

        <Card title={`Held uploads${held === null ? '' : ` (${held.length})`}`} subtitle="A customer cannot size, get a quote or pay until you decide.">
          {held === null ? <p aria-busy="true">Loading…</p> : held.length === 0
            ? <p className="sr-clear" role="status">Nothing is waiting. New holds appear here.</p>
            : <ul className="sr-list">{held.map(r => (
                <HeldRow key={r.id} row={r} tops={tops} bottoms={bottoms} pairs={pairs} readOnly={readOnly}
                  onDone={m => { setNotice(m); load(); }}/>))}</ul>}
        </Card>
      </div>
    </div>
  );
}
