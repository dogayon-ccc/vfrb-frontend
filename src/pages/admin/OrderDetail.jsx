
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import DesignPreview from '../../components/DesignPreview';
import OrderDesignDetails, { ReferenceFile } from '../../components/admin/OrderDesignDetails';
import OrderBilling from '../../components/OrderBilling';
import ProductionProgress from '../../components/admin/ProductionProgress';
import { savedDesignName } from '../../utils/designName';
import { NavIcon, StatusChip, AlertBanner } from '../../components/ui';
import { canAccessArea, readAdminUser, isOwner } from '../../utils/jobAccess';
import { Panel, StatusPill, Meter, EmptyBlock, Toast, useToast, useIsMobile } from '../../components/admin/AdminUI';

function getIsManager() {
  try {
    return (JSON.parse(localStorage.getItem('vfrb_user') || '{}').role) === 'manager';
  } catch { return false; }
}

const STAGES = ['pattern','segregation','cutting','sewing','qc','pressing','packing'];
const STAGE_LABEL = { pattern:'Pattern', segregation:'Segregation', cutting:'Cutting', sewing:'Sewing', qc:'QC', pressing:'Pressing', packing:'Packing' };
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' }) : null);

function Field({ label, value }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase',
        letterSpacing:'.04em', marginBottom:4, fontFamily:'var(--font)' }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)', fontFamily:'var(--font)' }}>{value ?? '—'}</div>
    </div>
  );
}

function ReviewPanel({ order, onUpdated }) {
  const [notes,          setNotes]          = useState('');
  const [busy,           setBusy]           = useState(false);
  const [err,            setErr]            = useState('');

  const submit = async (status) => {
    if (status === 'cancelled' && !notes.trim()) {
      setErr('A reason is required to cancel an order — this is sent to the customer.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const payload = { status, notes };
      const r = await axios.patch(`/api/admin/orders/${order.order_id}`, payload);
      onUpdated(r.data);
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Could not update the order. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background:'var(--warning-bg)', border:'1px solid var(--warning-border)', borderRadius:'var(--r-lg)',
      padding:20, marginBottom:16 }}>
      <h3 style={{ display:'flex', alignItems:'center', gap:7, margin:'0 0 4px', fontSize:13, fontWeight:800, color:'var(--warning-text)',
        textTransform:'uppercase', letterSpacing:'.04em', fontFamily:'var(--font)' }}>
        <NavIcon name="warning" size={14} color="var(--warning)" /> Review & Confirm
      </h3>
      <p style={{ fontSize:13, color:'var(--warning-text)', margin:'0 0 16px', fontFamily:'var(--font)' }}>
        This order is pending — nothing proceeds to production until it's confirmed here.
        Send the date and total with the VFRB proposal below; the customer accepts it to confirm. Cancel here with a reason.
      </p>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:'block', fontSize:13, fontWeight:700, color:'var(--text-subtle)',
          textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' }}>Note to the customer (required if cancelling)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="e.g. Quantity exceeds this week's production quota, proposing split delivery"
          style={{ width:'100%', padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
            fontSize:13, fontFamily:'var(--font)', resize:'vertical', boxSizing:'border-box', background:'var(--bg-card)', color:'var(--ink)' }}/>
      </div>

      {err && <AlertBanner tone="error" title={err} style={{ marginBottom:12 }} />}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={() => submit('confirmed')} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:'var(--r-md)', border:'none', cursor: busy ? 'wait' : 'pointer',
            background:'var(--success-text)', color:'#fff', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>
          {busy ? 'Working…' : <><NavIcon name="success" size={14} color="#fff" /> Confirm Order</>}
        </button>
        <button onClick={() => submit('cancelled')} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:'var(--r-md)', border:'1px solid var(--danger)', cursor: busy ? 'wait' : 'pointer',
            background:'var(--bg-card)', color:'var(--danger-text)', fontSize:13, fontWeight:700, fontFamily:'var(--font)' }}>
          <NavIcon name="close" size={14} color="var(--danger)" /> Cancel Order
        </button>
      </div>
    </div>
  );
}

const inpStyle = { width:'100%', padding:'9px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--border)',
  fontSize:13, boxSizing:'border-box', fontFamily:'var(--font)', background:'var(--bg-card)', color:'var(--ink)' };
const lblStyle = { display:'block', fontSize:13, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase', marginBottom:6, fontFamily:'var(--font)' };
const peso = v => `₱${Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
const PROPOSAL_LABEL = { pending:'Sent, waiting for the customer', accepted:'Accepted by the customer', declined:'Declined by the customer' };
const apiError = (e, fallback) => {
  const fe = e.response?.data?.errors;
  return (fe && Object.values(fe)[0]?.[0]) ?? e.response?.data?.message ?? fallback;
};

// Manager: VFRB proposal (promised date, total, note), down payment, and the order's message thread beside them.
function ProposalPanel({ order, onUpdated }) {
  const id = order.order_id;
  const customerDate = order.target_delivery_date ? String(order.target_delivery_date).slice(0, 10) : '';
  const [date,  setDate]  = useState(order.promised_date ? String(order.promised_date).slice(0, 10) : customerDate);
  const [total, setTotal] = useState(order.agreed_total ?? '');
  const [note,  setNote]  = useState(order.proposal_note ?? '');
  const [suggested, setSuggested] = useState(null);
  const [dp,    setDp]    = useState('');
  const [busy,  setBusy]  = useState(null);
  const [msg,   setMsg]   = useState(null); // { ok, text }
  const [thread, setThread] = useState(null);
  const [reply,  setReply]  = useState('');
  // Subcontract = arranged by Ma'am Ronnaxe: full payment. Direct/bulk: 80% down, 20% on delivery.
  const fullPay = order.order_type === 'subcontract';

  useEffect(() => {
    let live = true;
    axios.get(`/api/admin/orders/${id}/suggested-date`).then(r => {
      if (!live) return;
      const d = r.data?.suggested_promised_date ?? null;
      setSuggested(d);
      setDate(cur => cur || d || '');
    }).catch(() => {});
    return () => { live = false; };
  }, [id]);

  const loadThread = () => axios.get(`/api/admin/messages/${id}`)
    .then(r => setThread(r.data?.messages ?? []))
    .catch(() => setThread(false));
  useEffect(() => { loadThread(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (order.agreed_total != null && !order.down_payment_received_at)
      setDp((Math.round(Number(order.agreed_total) * (fullPay ? 100 : 80)) / 100).toFixed(2));
  }, [order.agreed_total, order.order_type]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key, fn, okText) => {
    setBusy(key); setMsg(null);
    try {
      const r = await fn();
      if (r.data?.order) onUpdated(r.data.order);
      setMsg({ ok:true, text: r.data?.message ?? okText });
      return true;
    } catch (e) {
      setMsg({ ok:false, text: apiError(e, 'Could not save. Please try again.') });
      return false;
    } finally { setBusy(null); }
  };

  const canPropose = order.status === 'pending' && order.proposal_status !== 'accepted';
  const setSource = (order_type) => run('source', () => axios.patch(`/api/admin/orders/${id}`, { order_type }).then(r => ({ data: { order: r.data } })), 'Order source updated.');
  const dpDone = !!order.down_payment_received_at;
  const dpBlocked = ['completed', 'cancelled'].includes(order.status);

  const sendProposal = () => run('propose', () => axios.post(`/api/admin/orders/${id}/propose`, {
    promised_date: date || undefined, total, proposal_note: note.trim(),
  }), 'Proposal sent.').then(ok => ok && loadThread());
  const markDp = () => run('dp', () => axios.post(`/api/admin/orders/${id}/down-payment`, { down_payment_amount: dp }), 'Down payment recorded.');
  const sendReply = async () => {
    const ok = await run('reply', () => axios.post('/api/admin/messages', { order_id: id, body: reply.trim() }), 'Message sent.');
    if (ok) { setReply(''); loadThread(); }
  };

  return (
    <div className="adm-prop">
      <Panel title="VFRB proposal">
        {order.proposal_status && (
          <div style={{ margin:'0 0 12px' }}>
            <StatusChip status={order.proposal_status === 'declined' ? 'rejected' : order.proposal_status === 'accepted' ? 'accepted' : 'pending'}
              label={PROPOSAL_LABEL[order.proposal_status] ?? order.proposal_status} />
          </div>
        )}
        {canPropose ? (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14, marginBottom:14 }}>
              <div>
                <label style={lblStyle} htmlFor="adm-prop-date">Promised date</label>
                <input id="adm-prop-date" type="date" value={date} onChange={e => setDate(e.target.value)} style={inpStyle}/>
                <p className="adm-prop-hint">
                  {customerDate ? `Customer asked for ${fmtDay(customerDate)}. ` : ''}
                  {suggested ? `Suggested: ${fmtDay(suggested)} (from quantity).` : 'Leave blank to use the suggested date.'}
                </p>
              </div>
              <div>
                <label style={lblStyle} htmlFor="adm-prop-total">Total (₱)</label>
                <input id="adm-prop-total" type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} style={inpStyle}/>
              </div>
            </div>
            <label style={lblStyle} htmlFor="adm-prop-note">Note to the customer</label>
            <textarea id="adm-prop-note" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ ...inpStyle, resize:'vertical' }}
              placeholder="Fabric availability, any cheaper or better option, and why this date and total"/>
            <button className="adm-btn primary" style={{ marginTop:12 }} disabled={!!busy || total === '' || note.trim().length < 10} onClick={sendProposal}>
              {busy === 'propose' ? 'Sending…' : order.proposal_status ? 'Send new proposal' : 'Send proposal'}
            </button>
          </>
        ) : (
          <div className="adm-od-fields">
            <Field label="Promised date" value={fmtDay(order.promised_date)}/>
            <Field label="Total" value={order.agreed_total != null ? peso(order.agreed_total) : null}/>
            {order.proposal_note && <Field label="Note" value={order.proposal_note}/>}
          </div>
        )}

        <div className="adm-prop-dp">
          <label style={lblStyle} htmlFor="adm-src">Order source</label>
          <select id="adm-src" value={fullPay ? 'subcontract' : 'direct'} disabled={!!busy || dpDone || dpBlocked}
            onChange={e => setSource(e.target.value)} style={{ ...inpStyle, marginBottom:6 }}>
            <option value="direct">Direct customer: 80% down, 20% on delivery</option>
            <option value="subcontract">Arranged by Ma'am Ronnaxe: full payment</option>
          </select>
          <p className="adm-prop-hint" style={{ marginBottom:12 }}>
            {order.agreed_total == null ? 'Send a proposal with the total first.'
              : fullPay ? `Full payment: ${peso(order.agreed_total)}.`
              : `At least ${peso(Math.round(Number(order.agreed_total) * 80) / 100)} now, the rest on delivery.`}
          </p>
          <p style={{ ...lblStyle, marginBottom:8 }}>{fullPay ? 'Full payment' : 'Down payment'}</p>
          {dpDone ? (
            <p className="adm-prop-hint" style={{ color:'var(--success-text)', fontWeight:700 }}>
              Received {peso(order.down_payment_amount)} on {fmtDay(order.down_payment_received_at)}.
            </p>
          ) : dpBlocked ? (
            <p className="adm-prop-hint">Not recorded. This order is {order.status}.</p>
          ) : (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <input type="number" min="0.01" step="0.01" value={dp} onChange={e => setDp(e.target.value)}
                aria-label="Down payment amount" placeholder="Amount (₱)" style={{ ...inpStyle, width:'auto', flex:'1 1 140px' }}/>
              <button className="adm-btn primary" disabled={!!busy || !(Number(dp) > 0)} onClick={markDp}>
                {busy === 'dp' ? 'Saving…' : fullPay ? 'Mark full payment received' : 'Mark down payment received'}
              </button>
            </div>
          )}
        </div>

        {msg && <AlertBanner tone={msg.ok ? 'success' : 'error'} title={msg.text} style={{ margin:'12px 0 0' }} />}
      </Panel>

      <Panel title="Messages">
        <div className="adm-thread" aria-live="polite">
          {thread === null && <EmptyBlock>Loading messages…</EmptyBlock>}
          {thread === false && <EmptyBlock>Could not load messages.</EmptyBlock>}
          {Array.isArray(thread) && thread.length === 0 && <EmptyBlock>No messages yet.</EmptyBlock>}
          {Array.isArray(thread) && thread.map(m => (
            <div key={m.message_id} className="adm-thread-m" data-me={m.sender_id === order.user_id ? undefined : ''}>
              <p className="adm-thread-h">{m.sender_name ?? 'User'} · {m.sent_at ? new Date(m.sent_at).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : ''}</p>
              <p className="adm-thread-b">{m.body}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)} aria-label="Reply to the customer"
            placeholder="Reply to the customer" style={{ ...inpStyle, resize:'vertical', flex:1 }}/>
          <button className="adm-btn primary" disabled={!!busy || !reply.trim()} onClick={sendReply}>{busy === 'reply' ? 'Sending…' : 'Send'}</button>
        </div>
      </Panel>
    </div>
  );
}

// Staff verdict on one AI-recommended line. Rejections become "avoid" hints in later prompts.
function StaffCheck({ rec, setToast, onSaved }) {
  const [busy, setBusy] = useState(false);
  if (!rec.rec_id) return null;
  const send = async (verdict) => {
    setBusy(true);
    try {
      const r = await axios.patch(`/api/admin/material-recommendations/${rec.rec_id}/feedback`, { verdict });
      onSaved(r.data?.data ?? { staff_feedback: verdict === 'clear' ? null : verdict });
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message ?? 'Could not save your check.' });
    } finally { setBusy(false); }
  };
  const v = rec.staff_feedback;
  if (isOwner()) return <span style={{ color:'var(--text-subtle)' }}>{v === 'accept' ? 'Suits' : v === 'reject' ? 'Wrong pick' : '—'}</span>;
  return (
    <div className="adm-verdict" role="group" aria-label={`Staff check for ${rec.material_name ?? 'material'}`}>
      <button type="button" className={`adm-btn${v === 'accept' ? ' on ok' : ''}`} disabled={busy} aria-pressed={v === 'accept'}
        onClick={() => send(v === 'accept' ? 'clear' : 'accept')}>Suits</button>
      <button type="button" className={`adm-btn${v === 'reject' ? ' on no' : ''}`} disabled={busy} aria-pressed={v === 'reject'}
        onClick={() => send(v === 'reject' ? 'clear' : 'reject')}>Wrong pick</button>
    </div>
  );
}

const NEXT_STEPS = ['Send proposal', 'Customer decides', 'Down payment', 'Production'];
const jump = (sel) => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

// One clear "what do I do now" card for the manager: proposal, customer reply, down payment, production.
function NextAction({ order }) {
  if (order.status === 'cancelled') return null;
  const ps = order.proposal_status;
  const dpDone = !!order.down_payment_received_at;
  const early = order.status === 'pending';
  const confirmedOnly = order.status === 'confirmed';
  const finished = order.status === 'completed';
  let active = 0;
  if (early) active = ps === 'pending' ? 1 : 0;
  else if (confirmedOnly && !dpDone) active = 2;
  else active = 3;
  const copy = [
    ps === 'declined' ? 'The customer declined. Revise the date, total or note and send the proposal again.'
      : 'Set the promised date (at least 7 days out) and the total, add a note, then send your proposal.',
    'Waiting for the customer to accept or decline. You can message them from here.',
    'The customer accepted. Record the down payment so production can start.',
    finished ? 'Order complete.' : 'Production is open. Staff log output in the Output Log.',
  ][active];
  return (
    <section className="adm-next" aria-label="Next action">
      <ol className="adm-next-steps">
        {NEXT_STEPS.map((label, i) => (
          <li key={label} data-state={finished || i < active ? 'done' : i === active ? 'now' : 'todo'}>
            <span className="adm-next-dot">{finished || i < active ? '✓' : i + 1}</span>
            <span className="adm-next-lbl">{label}</span>
          </li>
        ))}
      </ol>
      <div className="adm-next-body">
        <div>
          <div className="adm-next-kicker">Next action</div>
          <div className="adm-next-title">{finished ? 'All done' : NEXT_STEPS[active]}</div>
          <p className="adm-next-copy">{copy}</p>
        </div>
        {active === 0 && <button className="adm-btn primary" onClick={() => jump('#adm-prop-date')}>Open proposal form</button>}
        {active === 2 && <button className="adm-btn primary" onClick={() => jump('.adm-prop-dp')}>Record down payment</button>}
      </div>
    </section>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [toast, setToast] = useToast();
  const [stages,  setStages]  = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setStages(null); setNotFound(false);
      try {
        const r = await axios.get(`/api/admin/orders/${id}`);
        if (!cancelled) setOrder(r.data?.order ?? r.data);
      } catch (e) {
        if (!cancelled) setLoading(false);
        // A missing order is final: no follow-up requests and no Retry.
        if (e.response?.status === 404) { if (!cancelled) setNotFound(true); return; }
        if (!cancelled) setError('Failed to load order.');
        return;
      }
      if (!cancelled) setLoading(false);
      try {
        const p = await axios.get(`/api/admin/orders/${id}/production`);
        const list = p.data?.stages ?? p.data;
        if (!cancelled) setStages(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setStages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, attempt]);

  const handleDownloadPdf = async () => {
    if (!order) return;
    setDownloadingPdf(true);
    try {
      const res = await axios.get(`/api/admin/orders/${order.order_id}/invoice-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `VFRB-Order-${order.order_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setToast({ type: 'error', msg: 'Could not generate the PDF. Please try again.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="adm-od">
        <div className="adm-sk" style={{ height:28, width:180, marginBottom:10 }} />
        <div className="adm-sk" style={{ height:16, width:260, marginBottom:20 }} />
        <div className="adm-sk" style={{ height:320, marginBottom:14 }} />
        <div className="adm-sk" style={{ height:160 }} />
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="adm-od" style={{ textAlign:'center', padding:'48px 16px' }}>
        <h1 className="adm-h1" style={{ margin:'0 0 6px', fontSize:20 }}>Order not found</h1>
        <p className="adm-sub" style={{ margin:'0 0 16px' }}>Order #{id} does not exist or was removed.</p>
        <button className="adm-btn" style={{ minHeight:44 }} onClick={() => navigate('/admin/orders')}>
          <NavIcon name="back" size={14} color="currentColor" /> Back to Orders
        </button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="adm-od">
        <AlertBanner tone="error" title={error} action={<button className="adm-btn" onClick={() => setAttempt((n) => n + 1)}>Retry</button>} />
        <button className="adm-btn" style={{ marginTop:12 }} onClick={() => navigate('/admin/orders')}>
          <NavIcon name="back" size={14} color="currentColor" /> Back to Orders
        </button>
      </div>
    );
  }
  if (!order) return null;

  const recs = order.recommendations ?? [];
  const client = order.user ?? {};
  const clientName = client.name ?? order.customer_name;

  const isManager = getIsManager(), canTrack = canAccessArea(readAdminUser(), 'production');
  const hasStudioConfig = !!order.studio_config;
  const hasRefFile      = !!order.client_design_ref_file;

  const stageRows = Array.isArray(stages) ? STAGES.map((k) => ({ key:k, row: stages.find((t) => t.stage === k) })) : [];
  const stagesWithData = stageRows.filter((x) => x.row);
  const qcHold = order.status === 'qc' && order.qc_required && !order.qc_passed_at;

  return (
    <div className="adm-od">

      <div className="adm-od-head">
        <div style={{ minWidth:0 }}>
          <button className="adm-link-btn" onClick={() => navigate('/admin/orders')} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:0, marginBottom:8, color:'var(--text-subtle)' }}>
            <NavIcon name="back" size={13} color="currentColor" /> All Orders
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <h1 className="adm-h1" style={{ margin:0, fontSize:24 }}>Order #{order.order_id}</h1>
            <StatusPill status={order.status} />
          </div>
          <div className="adm-sub" style={{ marginTop:6 }}>
            {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs · {order.color ?? '—'}
            {order.po_reference ? ` · PO ${order.po_reference}` : ''}
          </div>
        </div>
        {/* Each action only for accounts its route allows: production tracking (job area) and the PDF (manager-only endpoint). */}
        {(canTrack || isManager) && (
          <div className="adm-actions">
            {canTrack && (
              <button className="adm-btn primary" onClick={() => navigate(`/admin/production/${order.order_id}`)}>
                <NavIcon name="production" size={14} color="currentColor" /> Track Production
              </button>
            )}
            {isManager && (
              <button className="adm-btn" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                <NavIcon name="download" size={14} color="currentColor" />
                {downloadingPdf ? 'Generating…' : 'Order Summary (PDF)'}
              </button>
            )}
          </div>
        )}
      </div>

      {order.status !== 'cancelled' && <ProductionProgress orderId={order.order_id} />}

      {isManager && <NextAction order={order} />}

      {order.status === 'pending' && isManager && (
        <details className="adm-more">
          <summary>Cancel this order or confirm it manually</summary>
          <ReviewPanel order={order} onUpdated={(updated) => setOrder(o => ({ ...o, ...updated }))}/>
        </details>
      )}

      {isManager && (
        <ProposalPanel order={order} onUpdated={(updated) => setOrder(o => ({ ...o, ...updated }))}/>
      )}
      <style>{`
        .adm-prop { display:grid; grid-template-columns:minmax(0,1fr); gap:16px; margin-bottom:16px; }
        @media (min-width:1024px) { .adm-prop { grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); } }
        .adm-prop-st { display:inline-block; margin:0 0 12px; padding:3px 10px; border-radius:99px; font-size:13px; font-weight:700; background:var(--warning-bg); color:var(--warning-text); }
        .adm-prop-st[data-s="accepted"] { background:var(--success-bg, #dcfce7); color:var(--success-text); }
        .adm-prop-st[data-s="declined"] { background:var(--danger-bg, #fee2e2); color:var(--danger-text); }
        .adm-prop-hint { margin:4px 0 0; font-size:13px; color:var(--text-faint); }
        .adm-prop-dp { margin-top:18px; padding-top:14px; border-top:1px solid var(--border); }
        .adm-prop-msg { margin:12px 0 0; font-size:13px; font-weight:600; color:var(--danger-text); }
        .adm-prop-msg[data-ok="true"] { color:var(--success-text); }
        .adm-thread { display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto; }
        .adm-thread-m { padding:8px 10px; border-radius:10px; background:var(--bg-surface); border:1px solid var(--border); max-width:90%; }
        .adm-thread-m[data-me] { align-self:flex-end; background:var(--bg-card); }
        .adm-thread-h { margin:0 0 2px; font-size:13px; color:var(--text-faint); }
        .adm-thread-b { margin:0; font-size:13px; color:var(--ink); white-space:pre-wrap; overflow-wrap:anywhere; }
      `}</style>

      <div className="adm-od-grid">
        <div className="adm-od-side">
          <Panel title="Customer" style={{ order:1 }}>
            <div className="adm-od-fields">
              <Field label="Name"          value={clientName}/>
              <Field label="Organization"  value={client.organization_name ?? order.organization_name}/>
              <Field label="Email"         value={client.email}/>
              <Field label="Contact"       value={client.contact_number}/>
            </div>
          </Panel>

          <Panel title="Order Information" style={{ order:3 }}>
            <div className="adm-od-fields">
              <Field label="Garment Type"   value={order.garment_type}/>
              <Field label="Quantity"       value={order.quantity_ordered ? `${order.quantity_ordered} pcs` : null}/>
              <Field label="Color"          value={order.color}/>
              <Field label="Collar"         value={order.collar_type}/>
              <Field label="Sleeve"         value={order.sleeve_type}/>
              <Field label="Pocket"         value={order.pocket_type}/>
              <Field label="Order Type"     value={order.order_type}/>
              <Field label="Sizing Type"    value={order.sizing_type}/>
              <Field label="PO Reference"   value={order.po_reference}/>
            </div>
          </Panel>

          <Panel title="Size Breakdown" style={{ order:3 }}>
            {(order.measurements ?? []).length === 0 ? (
              <EmptyBlock>No size breakdown submitted.</EmptyBlock>
            ) : (
              <div className="adm-chipset">
                {order.measurements.map((m) => (
                  <span key={m.measurement_id}><i>{m.size_label ?? (m.type === 'custom' ? 'Custom' : '—')}</i>{m.qty ?? '—'}</span>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Quality Control" style={{ order:5 }}
            action={canAccessArea(readAdminUser(), 'production') ? <button className="adm-link-btn" onClick={() => navigate('/admin/qc')}>QC checklist →</button> : null}>
            <div className="adm-od-fields">
              <Field label="QC Required" value={order.qc_required ? 'Yes' : 'No'}/>
              <Field label="QC Result" value={order.qc_passed_at ? `Passed ${fmtDay(order.qc_passed_at)}` : (qcHold ? 'Awaiting passing checklist' : 'Not passed yet')}/>
            </div>
          </Panel>

          <Panel title="Delivery" style={{ order:6 }}
            action={isOwner() ? null : <button className="adm-link-btn" onClick={() => navigate('/admin/delivery')}>Delivery →</button>}>
            <div className="adm-od-fields">
              <Field label="Customer Requested" value={fmtDay(order.target_delivery_date)}/>
              <Field label="Negotiated"       value={fmtDay(order.negotiated_delivery_date)}/>
              <Field label="Est. Completion"  value={fmtDay(order.estimated_completion_date)}/>
            </div>
          </Panel>

          {!isOwner() && <Panel title="Communication" style={{ order:7 }}>
            <button className="adm-btn" onClick={() => navigate(`/admin/messages?order=${order.order_id}`)} style={{ width:'100%', justifyContent:'center' }}>
              <NavIcon name="messages" size={14} color="currentColor" /> Message customer about #{order.order_id}
            </button>
          </Panel>}
        </div>

        <div className="adm-od-main">
          <Panel title="Submitted Design" style={{ order:2 }}>
            {hasStudioConfig ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'stretch', gap:6, width:'100%', minWidth:0 }}>
                {savedDesignName(order.studio_config) && (
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', textAlign:'center', overflowWrap:'anywhere' }}>{savedDesignName(order.studio_config)}</div>
                )}
                <DesignPreview cfg={order.studio_config} height={isMobile ? 260 : 360} previewUrl={order.design_preview_url ?? null}/>
                {order.design_preview_url && (
                  <a href={order.design_preview_url} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600,
                      color:'var(--teal)', textDecoration:'none' }}>
                    <NavIcon name="download" size={13} color="var(--teal)" /> View Submitted Design (PNG)
                  </a>
                )}
              </div>
            ) : hasRefFile ? (
              <ReferenceFile path={order.client_design_ref_file} />
            ) : (
              <EmptyBlock>No design submitted for this order.</EmptyBlock>
            )}
            {order.client_design_notes && (
              <div style={{ marginTop:16, padding:12, background:'var(--bg-surface)', borderRadius:'var(--r-md)',
                fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>
                <strong style={{ color:'var(--ink)' }}>Customer notes: </strong>{order.client_design_notes}
              </div>
            )}
            <OrderDesignDetails order={order} />
          </Panel>

          <Panel title="Material Recommendations" flush style={{ order:8 }}>
            {recs.length === 0 ? (
              <EmptyBlock>No material recommendations recorded yet.</EmptyBlock>
            ) : (
              <div className="adm-tbl-scroll">
                <table className="adm-table">
                  <thead><tr><th>Material</th><th>Customer</th><th>Staff check</th><th>Consumption</th><th>In Stock</th></tr></thead>
                  <tbody>
                    {recs.map((rec, i) => (
                      <tr key={rec.rec_id ?? i}>
                        <td style={{ fontWeight:600 }}>{rec.material_name ?? rec.material?.material_name ?? rec.category ?? '—'}</td>
                        <td style={{ textTransform:'capitalize' }}>{rec.customer_accepted ? 'Accepted' : (rec.status ?? 'pending')}</td>
                        <td><StaffCheck rec={rec} setToast={setToast} onSaved={(f) => setOrder(o => ({ ...o, recommendations: o.recommendations.map(r => r.rec_id === rec.rec_id ? { ...r, ...f } : r) }))}/></td>
                        <td>{rec.actual_qty_issued != null
                          ? <>{rec.actual_qty_issued} {rec.unit ?? rec.material?.unit ?? ''} <span style={{ color:'var(--text-subtle)', fontSize:12 }}>· {rec.issued_at ? 'issued at Cutting' : 'recorded, deducts at Cutting'}</span></>
                          : <span style={{ color:'var(--text-faint)' }}>Not yet recorded</span>}</td>
                        <td style={{ color:'var(--text-subtle)' }}>{rec.material?.quantity_in_stock ?? '—'} {rec.material?.unit ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Billing" style={{ order:9 }}>
            <OrderBilling orderId={order.order_id} mode="admin" isManager={isManager} />
          </Panel>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
