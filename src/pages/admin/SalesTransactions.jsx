import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../../utils/cache';
import { NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, StatGrid, Panel, SearchBox, Banner, ErrorBlock, SkeletonRows, OrderLink, useIsMobile, RecordedBy } from '../../components/admin/AdminUI';

const fmt = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const METHODS = ['cash', 'gcash', 'ewallet', 'bank_transfer'];
const TERMS   = ['full_payment', 'down_payment', 'net_30'];
const METHOD_CFG = {
  cash:          { label: 'Cash',          icon: 'salesPay', bg: 'var(--success-bg)', fg: 'var(--success-text)' },
  gcash:         { label: 'GCash',         icon: 'phone',    bg: 'var(--purple-50)',  fg: 'var(--purple)' },
  ewallet:       { label: 'E-Wallet',      icon: 'ewallet',  bg: 'var(--info-bg)',    fg: 'var(--info-text)' },
  bank_transfer: { label: 'Bank Transfer', icon: 'bank',     bg: 'var(--warning-bg)', fg: 'var(--warning-text)' },
  not_yet_paid:  { label: 'Not yet paid',  icon: 'pending',  bg: 'var(--danger-bg)',  fg: 'var(--danger-text)' },
};
// Admin list endpoints return the client as customer_name (a join), not a nested user.
// When the payment was recorded (the server's processed_at), with older fallbacks.
const recordedAt = (t) => t.processed_at ?? t.date_processed ?? t.created_at ?? t.payment_date;
const clientOf = (x) => x?.customer_name ?? x?.user?.name ?? x?.order?.user?.name ?? '—';
const Method = ({ m }) => {
  const c = METHOD_CFG[m] ?? { label: m ?? '—', icon: 'ewallet', bg: 'var(--bg-surface)', fg: 'var(--text-subtle)' };
  return <span className="adm-pill" style={{ background: c.bg, color: c.fg, display: 'inline-flex', alignItems: 'center', gap: 4 }}><NavIcon name={c.icon} size={12} color="currentColor" />{c.label}</span>;
};
// The order total is a manager decision (the API rejects amount_total from staff), so only managers see or set it.
function getIsManager() {
  try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').role === 'manager'; }
  catch { return false; }
}
const Balance = ({ t }) => (Number(t.balance_due) > 0
  ? <span style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{fmt(t.balance_due)}</span>
  : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--success-text)' }}><NavIcon name="success" size={12} color="currentColor" />Paid</span>);

function RecordModal({ onClose, onDone, isMobile, isManager }) {
  const [orders,    setOrders]    = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [form, setForm] = useState({ order_id: '', amount_paid: '', amount_total: '', payment_method: 'cash', payment_terms: 'down_payment', or_number: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    axios.get('/api/admin/orders', { params: { per_page: 100 } })
      .then((r) => setOrders((r.data?.data ?? r.data ?? []).filter((o) => o.status !== 'cancelled')))
      .catch(() => { setOrders([]); setErr('Orders could not be loaded. Close and try again.'); });
  }, []);
  useEffect(() => {
    setOrderInfo(null);
    if (!form.order_id) return;
    axios.get(`/api/admin/orders/${form.order_id}`).then((r) => setOrderInfo(r.data?.order ?? r.data)).catch(() => setErr('That order could not be loaded.'));
  }, [form.order_id]);

  const existingTxn = orderInfo?.transactions?.[0] ?? null;
  const isFirstPayment = !existingTxn;
  const alreadyPaid = existingTxn ? Number(existingTxn.amount_paid ?? 0) : 0;
  const agreedTotal = !isFirstPayment ? Number(existingTxn.amount_total ?? orderInfo?.agreed_total ?? 0)
    : isManager ? Number(form.amount_total || 0) : Number(orderInfo?.agreed_total ?? 0);
  const staffBlocked = !isManager && !!orderInfo && orderInfo.agreed_total == null;
  const paid = Number(form.amount_paid ?? 0);
  const balance = Math.max(0, agreedTotal - alreadyPaid - paid);

  const submit = async () => {
    if (!form.order_id) { setErr('Select an order.'); return; }
    if (staffBlocked) { setErr('A manager must set the order total first.'); return; }
    if (!paid || paid <= 0) { setErr('Enter a valid amount paid.'); return; }
    if (isManager && isFirstPayment && (!form.amount_total || Number(form.amount_total) <= 0)) { setErr("Enter the order total — required for this order's first payment."); return; }
    setBusy(true); setErr('');
    try {
      const payload = { order_id: Number(form.order_id), amount_paid: paid, payment_method: form.payment_method, payment_terms: form.payment_terms, or_number: form.or_number || null, notes: form.notes || null };
      if (isManager && isFirstPayment) payload.amount_total = Number(form.amount_total);
      await axios.post('/api/admin/transactions', payload);
      onDone();
    } catch (e) { setErr(e.response?.data?.message ?? 'Failed to record payment.'); }
    finally { setBusy(false); }
  };

  const refLabel = form.payment_method === 'gcash' ? 'GCash ref #' : form.payment_method === 'bank_transfer' ? 'Bank ref #' : 'OR number';
  return (
    <BottomSheet title="Record payment" onClose={onClose} isMobile={isMobile} maxWidth={520}>
      <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '-8px 0 14px' }}>No payment gateway — record what the client paid.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label><span className="adm-field">Order *</span>
          <select className="adm-input" value={form.order_id} onChange={(e) => set('order_id', e.target.value)} disabled={!orders}>
            <option value="">{orders ? 'Select order…' : 'Loading orders…'}</option>
            {(orders ?? []).map((o) => <option key={o.order_id} value={o.order_id}>#{o.order_id} — {clientOf(o)} ({o.status}) · {o.garment_type ?? ''}</option>)}
          </select>
        </label>

        {orderInfo && (
          <div className="adm-callout info" style={{ marginBottom: 0 }}>
            <NavIcon name="orders" size={16} color="currentColor" />
            <div>
              <b>{orderInfo.garment_type ?? 'Order'} · {orderInfo.quantity_ordered ?? '—'} pcs</b>
              {isManager
                ? (isFirstPayment ? 'First payment for this order — enter the agreed total.' : <>Total {fmt(agreedTotal)} · paid {fmt(alreadyPaid)} · remaining {fmt(Math.max(0, agreedTotal - alreadyPaid))}</>)
                : (!staffBlocked && <>Paid {fmt(alreadyPaid)} · remaining {fmt(Math.max(0, agreedTotal - alreadyPaid))}</>)}
            </div>
          </div>
        )}

        {staffBlocked && (
          <div className="adm-callout warn" style={{ marginBottom: 0 }} role="alert">
            <NavIcon name="warning" size={16} color="currentColor" />
            <div><b>A manager must set the order total first</b>Payments for this order can be recorded once the total is set.</div>
          </div>
        )}

        <div className="adm-form-grid">
          {isManager && (
            <label><span className="adm-field">Order total (₱){isFirstPayment ? ' *' : ''}</span>
              {isFirstPayment
                ? <input className="adm-input" type="number" inputMode="decimal" min={0.01} step={0.01} value={form.amount_total} onChange={(e) => set('amount_total', e.target.value)} placeholder="0.00" />
                : <input className="adm-input" value={fmt(agreedTotal)} readOnly disabled />}
            </label>
          )}
          <label><span className="adm-field">Amount paid (₱) *</span>
            <input className="adm-input" type="number" inputMode="decimal" min={0.01} step={0.01} value={form.amount_paid} onChange={(e) => set('amount_paid', e.target.value)} placeholder="0.00" />
          </label>
        </div>

        {paid > 0 && orderInfo && !staffBlocked && (isFirstPayment ? agreedTotal > 0 : true) && (
          <div className={`adm-callout ${balance > 0 ? 'warn' : 'ok'}`} style={{ marginBottom: 0 }} role="status">
            <NavIcon name={balance > 0 ? 'pending' : 'success'} size={16} color="currentColor" />
            <div><b>{balance > 0 ? fmt(balance) : 'Fully paid'}</b>Balance after this payment</div>
          </div>
        )}

        <label><span className="adm-field">Payment terms</span>
          <select className="adm-input" value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)}>
            {TERMS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </label>

        <div>
          <span className="adm-field">Payment method</span>
          <div className="adm-chip-row" role="radiogroup" aria-label="Payment method">
            {METHODS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={form.payment_method === m} className={`adm-fchip${form.payment_method === m ? ' on' : ''}`} onClick={() => set('payment_method', m)}>
                {METHOD_CFG[m].label}
              </button>
            ))}
          </div>
        </div>

        <div className="adm-form-grid">
          <label><span className="adm-field">{refLabel}</span>
            <input className="adm-input" value={form.or_number} onChange={(e) => set('or_number', e.target.value)} placeholder={form.payment_method === 'cash' ? 'OR number' : 'Reference number'} />
          </label>
          <label><span className="adm-field">Notes</span>
            <input className="adm-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
          </label>
        </div>

        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy || staffBlocked}>{busy ? 'Recording…' : 'Record payment'}</button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default function AdminSalesTransactions() {
  const [txns,    setTxns]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const isMobile = useIsMobile();
  const isManager = getIsManager();

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('sales_transactions_v2');
      if (cached) { setTxns(cached.txns); setTotal(cached.total); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    // Paginated (default 20): ask for the most recent 100 so the totals cover more than one page.
    axios.get('/api/admin/transactions', { params: { per_page: 100 } })
      .then((r) => {
        const list = r.data?.data ?? r.data ?? [];
        const t = r.data?.total ?? list.length;
        setTxns(list); setTotal(t);
        cacheSet('sales_transactions_v2', { txns: list, total: t }, 120_000);
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const sum = (k) => txns.reduce((a, t) => a + Number(t[k] ?? 0), 0);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return txns.filter((t) => !q || String(t.order_id).includes(q) || clientOf(t).toLowerCase().includes(q) || (t.or_number ?? '').toLowerCase().includes(q));
  }, [txns, search]);

  const empty = (
    <div className="adm-empty"><NavIcon name="salesPay" size={30} color="currentColor" />
      <div style={{ marginTop: 8, fontWeight: 700 }}>{search ? `No payments match “${search}”` : 'No payments recorded yet'}</div>
      {search ? <button className="adm-link-btn" onClick={() => setSearch('')}>Clear search</button>
        : <button className="adm-link-btn" onClick={() => setModal(true)}>Record the first payment</button>}
    </div>
  );

  return (
    <>
      {modal && <RecordModal isMobile={isMobile} isManager={isManager} onClose={() => setModal(false)} onDone={() => { setModal(false); cacheClear('sales_transactions_v2'); load(true); }} />}

      <PageHeader title="Sales & Payments" sub="Manual recording · Cash, GCash, e-wallet or bank transfer · no payment gateway">
        <button className="adm-btn" onClick={() => load(true)}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
        <button className="adm-btn primary" onClick={() => setModal(true)}><NavIcon name="add" size={14} color="currentColor" /> Record payment</button>
      </PageHeader>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load payments." onRetry={() => load(true)} /></div>}
      {!loading && total > txns.length && <Banner tone="warn" icon="warning">Showing the latest {txns.length} of {total} payments — the totals below cover only these.</Banner>}

      <StatGrid loading={loading} items={[
        { label: 'Total collected', value: fmt(sum('amount_paid')), color: 'var(--success-text)' },
        { label: 'Balance due', value: fmt(sum('balance_due')), color: sum('balance_due') > 0 ? 'var(--warning-text)' : undefined },
        { label: 'Payments', value: txns.length },
      ]} />

      <div className="adm-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search order #, client or OR / ref number…" label="Search payments" /></div>

      <div className="adm-only-d">
        <Panel flush>
          {loading ? <SkeletonRows rows={5} h={44} /> : loadErr ? null : filtered.length === 0 ? empty : (
            <div className="adm-tbl-scroll">
              <table className="adm-table">
                <thead><tr><th>Txn</th><th>Order</th><th>Client</th><th>Paid</th><th>Balance</th><th>Method</th><th className="adm-hide-t">OR / Ref</th><th>Recorded</th></tr></thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.transaction_id ?? i}>
                      <td style={{ color: 'var(--text-subtle)' }}>#{t.transaction_id}</td>
                      <td><OrderLink id={t.order_id} /></td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clientOf(t)}</td>
                      <td style={{ fontWeight: 800, color: 'var(--success-text)' }}>{fmt(t.amount_paid)}</td>
                      <td><Balance t={t} /></td>
                      <td><Method m={t.payment_method} /></td>
                      <td className="adm-hide-t" style={{ color: 'var(--text-subtle)' }}>{t.or_number ?? '—'}</td>
                      <td style={{ minWidth: 150 }}><RecordedBy name={t.processed_by_name} at={recordedAt(t)} label="" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={search}>
        {loading ? <SkeletonRows rows={3} h={110} /> : loadErr ? null : filtered.length === 0 ? empty : filtered.map((t, i) => (
          <div key={t.transaction_id ?? i} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': Number(t.balance_due) > 0 ? 'var(--warning)' : 'var(--success)' }}>
            <div className="adm-mrow"><OrderLink id={t.order_id} prefix="Order #" /><Method m={t.payment_method} /></div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{clientOf(t)}</div>
            <div className="adm-mrow" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success-text)' }}>{fmt(t.amount_paid)}</span>
              <Balance t={t} />
            </div>
            <div style={{ marginTop: 4 }}><RecordedBy name={t.processed_by_name} at={recordedAt(t)} label="Recorded by" />{t.or_number && <span className="adm-recby"> · OR {t.or_number}</span>}</div>
          </div>
        ))}
      </div>
    </>
  );
}
