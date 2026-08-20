// src/pages/admin/SalesTransactions.jsx
// VFRB Enterprise — Sales & Payment Recording
//
// NO PAYMENT GATEWAY — VFRB collects payment physically (cash, GCash screenshot, bank transfer).
// This page records the payment (amount, method, reference, OR number).
//
// SCHEMA — sales_transactions:
//   transaction_id(PK), order_id(FK), processed_by(FK→user_id),
//   amount_total, amount_paid, balance_due,
//   payment_method ENUM(cash|gcash|ewallet|bank_transfer|not_yet_paid),
//   payment_terms ENUM(full_payment|down_payment|net_30),
//   payment_date, or_number, completion_status, notes, created_at, updated_at
//
// HOW IT WORKS WITHOUT A PAYMENT GATEWAY:
//   Customer pays via GCash → sends screenshot (kept off-system, e.g. group chat)
//   → Staff records the payment here → balance_due auto-computed from
//   amount_total - amount_paid

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }                   from 'framer-motion';
import axios                                         from 'axios';
import { cacheGet, cacheSet, cacheClear }            from '../../utils/cache';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;
const T    = '#028090', T2 = '#02C39A';
const inp  = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi   = e => { e.target.style.borderColor=T; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo   = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7, fontFamily:FONT };
const SK   = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const fmt  = v => `\u20B1${Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2})}`;

const METHODS = ['cash','gcash','ewallet','bank_transfer'];
const TERMS   = ['full_payment','down_payment','net_30'];
const METHOD_CFG = {
  cash:          { label:'Cash',          color:'#22c55e', icon:'\uD83D\uDCB5' },
  gcash:         { label:'GCash',         color:'#7c3aed', icon:'\uD83D\uDCF1' },
  ewallet:       { label:'E-Wallet',      color:'#3b82f6', icon:'\uD83D\uDCB3' },
  bank_transfer: { label:'Bank Transfer', color:'#f59e0b', icon:'\uD83C\uDFE6' },
  not_yet_paid:  { label:'Not Yet Paid',  color:'#ef4444', icon:'\u23F3'       },
};

// ── Record payment modal ──────────────────────────────────────────────────────
function RecordModal({ onClose, onDone }) {
  const [orders,    setOrders]    = useState([]);
  const [orderInfo, setOrderInfo] = useState(null);
  const [form,      setForm]      = useState({ order_id:'', amount_paid:'', amount_total:'', payment_method:'cash', payment_terms:'down_payment', or_number:'', notes:'' });
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  useEffect(() => {
    axios.get('/api/admin/orders?per_page=100')
      .then(r => setOrders(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.order_id) { setOrderInfo(null); return; }
    axios.get(`/api/admin/orders/${form.order_id}`)
      .then(r => setOrderInfo(r.data?.order ?? r.data))
      .catch(() => {});
  }, [form.order_id]);

  // BUG-005 FIX: orders have no fixed price list — order.transactions[0]
  // (sales_transactions has a UNIQUE KEY on order_id, so there's at most
  // one row) tells us whether this is the order's first payment or not.
  const existingTxn   = orderInfo?.transactions?.[0] ?? null;
  const isFirstPayment = !existingTxn;
  const alreadyPaid    = existingTxn ? Number(existingTxn.amount_paid ?? 0) : 0;
  const agreedTotal    = isFirstPayment
    ? Number(form.amount_total || 0)
    : Number(existingTxn.amount_total ?? orderInfo?.agreed_total ?? 0);

  const paid    = Number(form.amount_paid ?? 0);
  const balance = Math.max(0, agreedTotal - alreadyPaid - paid);

  const submit = async () => {
    if (!form.order_id)    { setErr('Select an order.'); return; }
    if (!paid || paid <= 0){ setErr('Enter a valid amount paid.'); return; }
    if (isFirstPayment && (!form.amount_total || Number(form.amount_total) <= 0)) {
      setErr('Enter the order total — required for this order\'s first payment.');
      return;
    }
    setBusy(true); setErr('');
    try {
      const payload = {
        order_id: Number(form.order_id), amount_paid: paid,
        payment_method: form.payment_method, payment_terms: form.payment_terms,
        or_number: form.or_number || null, notes: form.notes || null,
      };
      // amount_total only applies (and is only accepted by the backend) on
      // an order's first payment — subsequent payments read it from
      // orders.agreed_total server-side.
      if (isFirstPayment) payload.amount_total = Number(form.amount_total);

      await axios.post('/api/admin/transactions', payload);
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed to record payment.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:18, width:'min(520px,100%)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.15)', overflow:'hidden' }}>

        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#f0fdfa,#fff)' }}>
          <div>
            <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0, fontFamily:FONT }}>
              💰 Record Payment
            </h3>
            <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0', fontFamily:FONT }}>
              No payment gateway — record manually
            </p>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, border:'none', background:'#f1f5f9', cursor:'pointer', fontSize:14, color:'#64748b' }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={lbl}>Order *</label>
                <select value={form.order_id} onChange={e => set('order_id', e.target.value)}
                  style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
                  <option value="">Select order…</option>
                  {orders.filter(o => o.status !== 'cancelled').map(o => (
                    <option key={o.order_id} value={o.order_id}>
                      #{o.order_id} — {o.user?.name ?? '—'} ({o.status}) · {o.garment_type ?? ''}
                    </option>
                  ))}
                </select>
              </div>

              {orderInfo && (
                <div style={{ padding:'12px 14px', borderRadius:10, background:'#f0fdfa', border:'1px solid #99f6e4', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <div><p style={{ fontSize:9, color:'#64748b', margin:'0 0 2px', fontFamily:FONT, textTransform:'uppercase' }}>Qty</p><p style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:0, fontFamily:FONT }}>{orderInfo.quantity_ordered ?? '—'} pcs</p></div>
                  <div><p style={{ fontSize:9, color:'#64748b', margin:'0 0 2px', fontFamily:FONT, textTransform:'uppercase' }}>Garment</p><p style={{ fontSize:13, fontWeight:700, color:T, margin:0, fontFamily:FONT, textTransform:'capitalize' }}>{orderInfo.garment_type ?? '—'}</p></div>
                </div>
              )}

              {/* Order Total: editable only on this order's first-ever payment.
                  After that, sales_transactions (unique key on order_id) already
                  has amount_total — show it read-only instead of asking again. */}
              {orderInfo && !isFirstPayment && (
                <div style={{ padding:'12px 14px', borderRadius:10, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                  <p style={{ fontSize:12, color:'#334155', margin:0, fontFamily:FONT, lineHeight:1.5 }}>
                    Order total: <strong>{fmt(agreedTotal)}</strong> · already paid: <strong>{fmt(alreadyPaid)}</strong>
                    {' '}· this payment applies to the remaining <strong>{fmt(Math.max(0, agreedTotal - alreadyPaid))}</strong>
                  </p>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {isFirstPayment ? (
                  <div>
                    <label style={lbl}>Order Total (₱) *</label>
                    <input type="number" min={0.01} step={0.01} value={form.amount_total}
                      onChange={e => set('amount_total', e.target.value)}
                      placeholder="0.00" style={inp} onFocus={fi} onBlur={fo}/>
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>Order Total (₱)</label>
                    <input value={fmt(agreedTotal)} readOnly disabled
                      style={{ ...inp, background:'#f1f5f9', color:'#64748b', cursor:'not-allowed' }}/>
                  </div>
                )}
                <div>
                  <label style={lbl}>Amount Paid (₱) *</label>
                  <input type="number" min={0.01} step={0.01} value={form.amount_paid}
                    onChange={e => set('amount_paid', e.target.value)}
                    placeholder="0.00" style={inp} onFocus={fi} onBlur={fo}/>
                </div>
              </div>

              <div>
                <label style={lbl}>Payment Terms</label>
                <select value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}
                  style={{ ...inp, cursor:'pointer' }} onFocus={fi} onBlur={fo}>
                  {TERMS.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>

              {paid > 0 && orderInfo && (isFirstPayment ? agreedTotal > 0 : true) && (
                <div style={{ padding:'10px 14px', borderRadius:10, background: balance > 0 ? '#fff8f0' : '#f0fdf4', border: `1px solid ${balance > 0 ? '#fcd34d' : '#86efac'}` }}>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 4px', fontFamily:FONT }}>Balance after this payment</p>
                  <p style={{ fontSize:18, fontWeight:800, color: balance > 0 ? '#f59e0b' : '#22c55e', margin:0, fontFamily:FONT }}>
                    {balance > 0 ? fmt(balance) : '✓ Fully Paid'}
                  </p>
                </div>
              )}

              <div>
                <label style={lbl}>Payment Method</label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {METHODS.map(m => {
                    const cfg = METHOD_CFG[m];
                    const on  = form.payment_method === m;
                    return (
                      <button key={m} onClick={() => set('payment_method', m)}
                        style={{ padding:'8px 14px', borderRadius:99, border:`1.5px solid ${on ? cfg.color : '#e2e8f0'}`,
                          background: on ? `${cfg.color}12` : '#fff', color: on ? cfg.color : '#64748b',
                          fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT,
                          display:'flex', alignItems:'center', gap:5 }}>
                        {cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>{form.payment_method === 'gcash' ? 'GCash Ref #' : form.payment_method === 'bank_transfer' ? 'Bank Ref #' : 'OR Number'}</label>
                  <input value={form.or_number} onChange={e => set('or_number', e.target.value)}
                    placeholder={form.payment_method === 'cash' ? 'OR number' : 'Reference number'}
                    style={inp} onFocus={fi} onBlur={fo}/>
                </div>
                <div>
                  <label style={lbl}>Notes</label>
                  <input value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Additional notes" style={inp} onFocus={fi} onBlur={fo}/>
                </div>
              </div>

              {err && <p style={{ color:'#ef4444', fontSize:12, fontWeight:600, fontFamily:FONT }}>⚠️ {err}</p>}
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy} style={{ padding:'9px 22px', borderRadius:9, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity:busy?0.7:1, minWidth:140 }}>
            {busy ? '⏳ Recording…' : '✓ Record Payment'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminSalesTransactions() {
  const [txns,       setTxns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(false);
  const [summary,    setSummary]    = useState({});

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('sales_transactions');
      if (cached) { setTxns(cached.txns); setSummary(cached.summary); setLoading(false); return; }
    }
    setLoading(true);
    axios.get('/api/admin/transactions')
      .then(r => {
        const data = r.data?.data ?? r.data ?? [];
        const totalCollected = data.reduce((a, t) => a + Number(t.amount_paid  ?? 0), 0);
        const totalBalance   = data.reduce((a, t) => a + Number(t.balance_due  ?? 0), 0);
        const s = { total: totalCollected, balance: totalBalance, count: data.length };
        setTxns(data); setSummary(s);
        cacheSet('sales_transactions', { txns:data, summary:s }, 120_000);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = txns.filter(t =>
    !search
    || String(t.order_id).includes(search)
    || (t.order?.user?.name ?? '').toLowerCase().includes(search.toLowerCase())
    || (t.or_number ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        @keyframes sk  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes spin{ to { transform:rotate(360deg); } }
        .st-kpi { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:22px; }
        .st-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:14px; border:1px solid #e2e8f0; }
        .st-wrap table { width:100%; min-width:650px; border-collapse:collapse; }
        @media(max-width:767px){ .st-kpi{ grid-template-columns:1fr 1fr; } }
        @media(min-width:2560px){ .st-kpi{ grid-template-columns:repeat(4,1fr); } }
      `}</style>

      <AnimatePresence>
        {modal && <RecordModal onClose={() => setModal(false)} onDone={() => { setModal(false); cacheClear('sales_transactions'); load(true); }}/>}
      </AnimatePresence>

      <div style={{ fontFamily:FONT, color:'#0f172a' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:FONT }}>Sales & Payments</h1>
            <p style={{ color:'#64748b', fontSize:13, fontFamily:FONT }}>Manual recording · Cash / GCash / Bank Transfer · No payment gateway</p>
          </div>
          <button onClick={() => setModal(true)} style={{ padding:'10px 22px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:'0 4px 14px rgba(2,128,144,.3)' }}>
            + Record Payment
          </button>
        </div>

        <div className="st-kpi">
          {[
            { l:'Total Collected', v:fmt(summary.total   ?? 0), icon:'💰', c:'#22c55e' },
            { l:'Balance Due',     v:fmt(summary.balance ?? 0), icon:'⏳', c:'#f59e0b' },
            { l:'Transactions',    v:summary.count ?? 0,        icon:'📊', c:T          },
          ].map(s => (
            <div key={s.l} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
              <span style={{ fontSize:22, display:'block', marginBottom:10 }}>{s.icon}</span>
              <p style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:'0 0 4px', fontFamily:FONT }}>{s.v}</p>
              <p style={{ fontSize:11, color:'#64748b', margin:0, fontFamily:FONT }}>{s.l}</p>
            </div>
          ))}
        </div>

        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by order #, customer name, or OR number…"
          style={{ ...inp, marginBottom:14 }} onFocus={fi} onBlur={fo}/>

        <div className="st-wrap">
          <table>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Txn #','Order','Client','Amount Paid','Balance','Method','OR / Ref','Date'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={8} style={{ padding:30 }}>{[1,2,3].map(i => <div key={i} style={{ ...SK, height:10, marginBottom:10 }}/>)}</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center' }}>
                      <p style={{ fontSize:36, margin:'0 0 10px', opacity:.3 }}>💰</p>
                      <p style={{ color:'#64748b', fontSize:13, fontWeight:600, fontFamily:FONT }}>No transactions yet</p>
                      <p style={{ color:'#94a3b8', fontSize:12, fontFamily:FONT }}>Click "+ Record Payment" when a customer pays</p>
                    </td></tr>
                  : filtered.map((t, i) => {
                      const mc = METHOD_CFG[t.payment_method] ?? { label:t.payment_method, color:'#64748b', icon:'💳' };
                      return (
                        <tr key={t.transaction_id ?? i} style={{ borderBottom:'1px solid #f1f5f9' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, color:T, fontFamily:FONT }}>#{t.transaction_id}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'#0f172a', fontWeight:600, fontFamily:FONT }}>#{t.order_id}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'#0f172a', fontFamily:FONT }}>{t.order?.user?.name ?? '—'}</td>
                          <td style={{ padding:'11px 14px', fontSize:13, fontWeight:800, color:'#22c55e', fontFamily:FONT }}>{fmt(t.amount_paid)}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, fontFamily:FONT, color: Number(t.balance_due) > 0 ? '#f59e0b' : '#22c55e' }}>
                            {Number(t.balance_due) > 0 ? fmt(t.balance_due) : '✓ Paid'}
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:`${mc.color}15`, color:mc.color, border:`1px solid ${mc.color}30`, whiteSpace:'nowrap' }}>
                              {mc.icon} {mc.label}
                            </span>
                          </td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b', fontFamily:FONT }}>{t.or_number ?? '—'}</td>
                          <td style={{ padding:'11px 14px', fontSize:11, color:'#94a3b8', fontFamily:FONT, whiteSpace:'nowrap' }}>
                            {(t.payment_date || t.created_at)
                              ? new Date(t.payment_date || t.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                              : '—'}
                          </td>
                        </tr>
                      );
                    })
              }
            </tbody>
          </table>
        </div>

        <div style={{ marginTop:18, padding:'12px 16px', borderRadius:10, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'#0f172a', margin:'0 0 3px', fontFamily:FONT }}>No payment gateway needed for VFRB</p>
            <p style={{ fontSize:11, color:'#64748b', margin:0, fontFamily:FONT }}>
              Customers pay Cash, GCash, or Bank Transfer and send a screenshot. Staff records it here, and the system computes the balance automatically. Replaces Ma'am Fe's paper receipt logbook.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
