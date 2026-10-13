// src/components/OrderBilling.jsx
// Invoice + payment receipts for one order, shared by customer and admin Order Detail.
//   mode="customer": GET /api/customer/orders/{id}/billing, PDF downloads only.
//   mode="admin":    GET /api/admin/orders/{id}/billing; managers can also issue, mark paid and void.
// Every amount shown comes from the server (orders.agreed_total, the issued invoice, recorded receipts);
// nothing is computed here. A 404 renders nothing and is never retried.
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { NavIcon } from './ui';

const peso = (n) => (n == null || n === '' ? '—'
  : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const day = (d) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const METHODS = [['cash', 'Cash'], ['gcash', 'GCash'], ['ewallet', 'E-wallet'], ['bank_transfer', 'Bank transfer']];
const METHOD_LABEL = Object.fromEntries(METHODS);
const STATUS = { issued: ['Unpaid', 'ob-pill-warn'], paid: ['Paid', 'ob-pill-ok'], void: ['Void', 'ob-pill-muted'] };
const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

const CSS = `
.ob { display:flex; flex-direction:column; gap:14px; min-width:0; font-family:inherit; }
.ob-row { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; min-width:0; }
.ob-title { margin:0; font-size:14px; font-weight:800; color:var(--ink); overflow-wrap:anywhere; min-width:0; }
.ob-sub { margin:2px 0 0; font-size:12px; color:var(--text-subtle); overflow-wrap:anywhere; }
.ob-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 110px), 1fr)); gap:8px; }
.ob-stat { min-width:0; padding:10px 12px; border-radius:10px; background:var(--bg-surface); border:1px solid var(--border); }
.ob-stat span { display:block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-subtle); }
.ob-stat strong { display:block; margin-top:3px; font-size:15px; font-weight:800; color:var(--ink); overflow-wrap:anywhere; }
.ob-pill { display:inline-flex; align-items:center; min-height:24px; padding:0 10px; border-radius:999px; font-size:11px; font-weight:800; white-space:nowrap; }
.ob-pill-warn { background:#fef3c7; color:#92400e; }
.ob-pill-ok { background:#dcfce7; color:#166534; }
.ob-pill-muted { background:var(--bg-surface); color:var(--text-subtle); }
.ob-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:44px; min-width:44px; padding:0 14px;
  border-radius:10px; border:1px solid var(--border); background:var(--bg-card); color:var(--ink); font:inherit; font-size:13px; font-weight:700;
  cursor:pointer; max-width:100%; }
.ob-btn:disabled { opacity:.55; cursor:not-allowed; }
.ob-btn:focus-visible, .ob-in:focus-visible { outline:2px solid var(--teal); outline-offset:2px; }
.ob-btn-p { background:var(--teal); border-color:var(--teal); color:#fff; }
.ob-btn-d { color:#b91c1c; border-color:#fecaca; }
.ob-actions { display:flex; gap:8px; flex-wrap:wrap; }
.ob-actions .ob-btn { flex:1 1 140px; }
.ob-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
.ob-item { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding:10px 12px;
  border:1px solid var(--border); border-radius:10px; min-width:0; }
.ob-item > div { min-width:0; flex:1 1 160px; }
.ob-form { display:grid; gap:10px; padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); min-width:0; }
.ob-form label { display:grid; gap:4px; font-size:12px; font-weight:700; color:var(--text-subtle); min-width:0; }
.ob-in { width:100%; box-sizing:border-box; min-height:44px; padding:0 12px; border-radius:10px; border:1px solid var(--border);
  background:var(--bg-card); color:var(--ink); font:inherit; font-size:16px; }
textarea.ob-in { min-height:72px; padding:10px 12px; resize:vertical; }
.ob-note { margin:0; font-size:12px; color:var(--text-subtle); line-height:1.5; }
.ob-err { margin:0; font-size:13px; color:#b91c1c; }
.ob-ok { margin:0; font-size:13px; color:#166534; }
.ob-sk { height:96px; border-radius:10px; background:var(--bg-surface); }
`;

export default function OrderBilling({ orderId, mode = 'customer', isManager = false }) {
  const scope = mode === 'admin' ? 'admin' : 'customer';
  const canManage = scope === 'admin' && isManager;

  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [busy, setBusy] = useState('');           // which action is in flight
  const [form, setForm] = useState(null);         // 'issue' | 'paid' | 'void' | null
  const [msg, setMsg] = useState(null);           // { type: 'ok'|'err', text }
  const [issue, setIssue] = useState({ billing_profile_id: '', due_date: '', notes: '' });
  const [pay, setPay] = useState({ payment_method: 'cash', reference_no: '', notes: '' });

  const load = useCallback(async (signal) => {
    setState('loading');
    try {
      const r = await axios.get(`/api/${scope}/orders/${orderId}/billing`, { signal });
      setData(r.data);
      setState('ready');
    } catch (e) {
      if (axios.isCancel(e)) return;
      setState([403, 404].includes(e.response?.status) ? 'missing' : 'error');
    }
  }, [scope, orderId]);

  useEffect(() => {
    if (!orderId) return undefined;
    const ctl = new AbortController();
    load(ctl.signal);
    return () => ctl.abort();
  }, [orderId, load]);

  const download = async (kind, id, number) => {
    setBusy(`${kind}-${id}`); setMsg(null);
    try {
      const res = await axios.get(`/api/${scope}/${kind}s/${id}/document`, { params: { format: 'pdf' }, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `VFRB-${number}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMsg({ type: 'err', text: 'Could not download the document. Please try again.' });
    } finally {
      setBusy('');
    }
  };

  const act = async (key, request, okText) => {
    setBusy(key); setMsg(null);
    try {
      const r = await request();
      if (r.data?.billing) setData(r.data.billing);
      setForm(null);
      setMsg({ type: 'ok', text: okText });
    } catch (e) {
      setMsg({ type: 'err', text: errMsg(e, 'That did not go through. Please try again.') });
    } finally {
      setBusy('');
    }
  };

  const submitIssue = (e) => {
    e.preventDefault();
    const body = { notes: issue.notes || null, due_date: issue.due_date || null,
      billing_profile_id: issue.billing_profile_id ? Number(issue.billing_profile_id) : null };
    act('issue', () => axios.post(`/api/admin/orders/${orderId}/invoice`, body), 'Invoice issued. The customer has been notified.');
  };
  const submitPaid = (e) => {
    e.preventDefault();
    act('paid', () => axios.patch(`/api/admin/invoices/${data.invoice.invoice_id}/mark-paid`,
      { payment_method: pay.payment_method, reference_no: pay.reference_no || null, notes: pay.notes || null }),
    'Payment recorded and receipt issued.');
  };
  const submitVoid = () => act('void', () => axios.patch(`/api/admin/invoices/${data.invoice.invoice_id}/void`), 'Invoice voided.');

  if (state === 'missing') return null;
  if (state === 'loading') return <><style>{CSS}</style><div className="ob"><div className="ob-sk" aria-hidden="true" /></div></>;
  if (state === 'error') return (
    <><style>{CSS}</style>
      <div className="ob" role="alert">
        <p className="ob-err">Billing could not be loaded.</p>
        <div className="ob-actions"><button type="button" className="ob-btn" onClick={() => load()}>Try again</button></div>
      </div>
    </>
  );

  const { invoice, receipts = [], total, paid_to_date: paid, balance, labels = {} } = data;
  const invTitle = labels.invoice_title || 'Billing Invoice';
  const rctTitle = labels.receipt_title || 'Payment Acknowledgement';
  const [statusText, statusCls] = STATUS[invoice?.status] ?? [];

  return (
    <>
      <style>{CSS}</style>
      <div className="ob">
        {total != null && (
          <div className="ob-stats">
            <div className="ob-stat"><span>Total</span><strong>{peso(total)}</strong></div>
            <div className="ob-stat"><span>Paid</span><strong>{peso(paid)}</strong></div>
            <div className="ob-stat"><span>Balance</span><strong>{peso(balance)}</strong></div>
          </div>
        )}

        {invoice ? (
          <div className="ob-item">
            <div>
              <div className="ob-row" style={{ justifyContent: 'flex-start' }}>
                <p className="ob-title">{invTitle} {invoice.invoice_number}</p>
                {statusText && <span className={`ob-pill ${statusCls}`}>{statusText}</span>}
              </div>
              <p className="ob-sub">
                Issued {day(invoice.issued_at)}{invoice.due_date ? ` · Due ${day(invoice.due_date)}` : ''}
                {invoice.billed_to_name ? ` · ${invoice.billed_to_name}` : ''}
              </p>
            </div>
            <button type="button" className="ob-btn" disabled={busy === `invoice-${invoice.invoice_id}`}
              onClick={() => download('invoice', invoice.invoice_id, invoice.invoice_number)}
              aria-label={`Download ${invTitle} ${invoice.invoice_number} as PDF`}>
              <NavIcon name="download" size={14} color="currentColor" />
              {busy === `invoice-${invoice.invoice_id}` ? 'Preparing…' : 'PDF'}
            </button>
          </div>
        ) : (
          <p className="ob-note">
            {scope === 'customer'
              ? 'No invoice yet. It will appear here once VFRB issues it.'
              : total == null ? 'Set the agreed total on this order before an invoice can be issued.' : 'No invoice issued yet.'}
          </p>
        )}

        {receipts.length > 0 && (
          <div>
            <p className="ob-title" style={{ fontSize: 13, marginBottom: 8 }}>{rctTitle}s</p>
            <ul className="ob-list">
              {receipts.map((r) => (
                <li key={r.receipt_id} className="ob-item">
                  <div>
                    <p className="ob-title" style={{ fontSize: 13 }}>{r.receipt_number} · {peso(r.amount)}</p>
                    <p className="ob-sub">
                      {day(r.paid_at)} · {METHOD_LABEL[r.payment_method] ?? r.payment_method}
                      {r.reference_no ? ` · Ref ${r.reference_no}` : ''} · Balance after {peso(r.balance_after)}
                    </p>
                  </div>
                  <button type="button" className="ob-btn" disabled={busy === `receipt-${r.receipt_id}`}
                    onClick={() => download('receipt', r.receipt_id, r.receipt_number)}
                    aria-label={`Download ${rctTitle} ${r.receipt_number} as PDF`}>
                    <NavIcon name="download" size={14} color="currentColor" />
                    {busy === `receipt-${r.receipt_id}` ? 'Preparing…' : 'PDF'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {labels.receipt_note && (invoice || receipts.length > 0) && <p className="ob-note">{labels.receipt_note}.</p>}
        {scope === 'admin' && data.void_count > 0 && (
          <p className="ob-note">{data.void_count} voided invoice{data.void_count === 1 ? '' : 's'} on record.</p>
        )}

        {canManage && data.awaiting_delivery && (
          <p className="ob-note">The invoice can be issued once the order reaches Delivery. Down payments before then get a receipt only.</p>
        )}
        {canManage && !form && (data.can_issue || invoice?.status === 'issued') && (
          <div className="ob-actions">
            {data.can_issue && <button type="button" className="ob-btn ob-btn-p" onClick={() => setForm('issue')}>Issue invoice</button>}
            {invoice?.status === 'issued' && <>
              <button type="button" className="ob-btn ob-btn-p" onClick={() => setForm('paid')}>Mark as paid</button>
              <button type="button" className="ob-btn ob-btn-d" onClick={() => setForm('void')}>Void invoice</button>
            </>}
          </div>
        )}

        {canManage && form === 'issue' && (
          <form className="ob-form" onSubmit={submitIssue}>
            <p className="ob-note">The invoice uses the order's agreed total of {peso(total)}.</p>
            {(data.billing_profiles ?? []).length > 0 && (
              <label>Bill to
                <select className="ob-in" value={issue.billing_profile_id}
                  onChange={(e) => setIssue((s) => ({ ...s, billing_profile_id: e.target.value }))}>
                  <option value="">Customer account name</option>
                  {data.billing_profiles.map((p) => (
                    <option key={p.billing_id} value={p.billing_id}>{p.billing_name}{p.is_default ? ' (default)' : ''}</option>
                  ))}
                </select>
              </label>
            )}
            <label>Due date (optional)
              <input type="date" className="ob-in" value={issue.due_date} min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setIssue((s) => ({ ...s, due_date: e.target.value }))} />
            </label>
            <label>Notes (optional)
              <textarea className="ob-in" maxLength={1000} value={issue.notes}
                onChange={(e) => setIssue((s) => ({ ...s, notes: e.target.value }))} />
            </label>
            <div className="ob-actions">
              <button type="button" className="ob-btn" onClick={() => setForm(null)} disabled={busy === 'issue'}>Cancel</button>
              <button type="submit" className="ob-btn ob-btn-p" disabled={busy === 'issue'}>{busy === 'issue' ? 'Issuing…' : 'Issue invoice'}</button>
            </div>
          </form>
        )}

        {canManage && form === 'paid' && invoice && (
          <form className="ob-form" onSubmit={submitPaid}>
            <p className="ob-note">Records payment of the remaining balance ({peso(balance)}) and issues a receipt.</p>
            <label>Payment method
              <select className="ob-in" value={pay.payment_method} onChange={(e) => setPay((s) => ({ ...s, payment_method: e.target.value }))}>
                {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>Reference no. (optional)
              <input className="ob-in" maxLength={50} value={pay.reference_no}
                onChange={(e) => setPay((s) => ({ ...s, reference_no: e.target.value }))} />
            </label>
            <label>Notes (optional)
              <textarea className="ob-in" maxLength={1000} value={pay.notes}
                onChange={(e) => setPay((s) => ({ ...s, notes: e.target.value }))} />
            </label>
            <div className="ob-actions">
              <button type="button" className="ob-btn" onClick={() => setForm(null)} disabled={busy === 'paid'}>Cancel</button>
              <button type="submit" className="ob-btn ob-btn-p" disabled={busy === 'paid'}>{busy === 'paid' ? 'Saving…' : 'Record payment'}</button>
            </div>
          </form>
        )}

        {canManage && form === 'void' && invoice && (
          <div className="ob-form" role="group" aria-label="Confirm void">
            <p className="ob-note">Void {invoice.invoice_number}? It stays on record but the customer will no longer see it. You can then issue a new one.</p>
            <div className="ob-actions">
              <button type="button" className="ob-btn" onClick={() => setForm(null)} disabled={busy === 'void'}>Keep invoice</button>
              <button type="button" className="ob-btn ob-btn-d" onClick={submitVoid} disabled={busy === 'void'}>{busy === 'void' ? 'Voiding…' : 'Void invoice'}</button>
            </div>
          </div>
        )}

        {msg && <p className={msg.type === 'ok' ? 'ob-ok' : 'ob-err'} role={msg.type === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}
      </div>
    </>
  );
}
