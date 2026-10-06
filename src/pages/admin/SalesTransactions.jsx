
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import axios                                 from 'axios';
import { cacheGet, cacheSet, cacheClear }    from '../../utils/cache';
import { Card, Badge, NavIcon }              from '../../components/ui';
import BottomSheet                           from '../../components/ui/BottomSheet';

const inp  = { width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)', transition:'border .15s, box-shadow .15s', boxSizing:'border-box' };
const fi   = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo   = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
const lbl  = { display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7, fontFamily:'var(--font)' };
const SK   = { borderRadius:'var(--r-sm)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'st-shimmer 1.4s infinite' };
const fmt  = v => `\u20B1${Number(v||0).toLocaleString('en-PH',{minimumFractionDigits:2})}`;

const METHODS = ['cash','gcash','ewallet','bank_transfer'];
const TERMS   = ['full_payment','down_payment','net_30'];
const METHOD_CFG = {
  cash:          { label:'Cash',          tone:'success', icon:'salesPay' },
  gcash:         { label:'GCash',         tone:'purple',  icon:'phone'    },
  ewallet:       { label:'E-Wallet',      tone:'info',    icon:'ewallet'  },
  bank_transfer: { label:'Bank Transfer', tone:'warning', icon:'bank'     },
  not_yet_paid:  { label:'Not Yet Paid',  tone:'danger',  icon:'loading'  },
};

function RecordModal({ onClose, onDone, isMobile }) {
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
      if (isFirstPayment) payload.amount_total = Number(form.amount_total);

      await axios.post('/api/admin/transactions', payload);
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed to record payment.'); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title="Record Payment" onClose={onClose} isMobile={isMobile} maxWidth={520}>
        <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'-8px 0 14px', fontFamily:'var(--font)' }}>
          No payment gateway — record manually
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
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
                <div style={{ padding:'12px 14px', borderRadius:'var(--r-md)', background:'var(--teal-50)', border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                  <div><p style={{ fontSize:9, color:'var(--text-subtle)', margin:'0 0 2px', fontFamily:'var(--font)', textTransform:'uppercase' }}>Qty</p><p style={{ fontSize:16, fontWeight:800, color:'var(--ink)', margin:0, fontFamily:'var(--font)' }}>{orderInfo.quantity_ordered ?? '—'} pcs</p></div>
                  <div><p style={{ fontSize:9, color:'var(--text-subtle)', margin:'0 0 2px', fontFamily:'var(--font)', textTransform:'uppercase' }}>Garment</p><p style={{ fontSize:13, fontWeight:700, color:'var(--teal)', margin:0, fontFamily:'var(--font)', textTransform:'capitalize' }}>{orderInfo.garment_type ?? '—'}</p></div>
                </div>
              )}

              {orderInfo && !isFirstPayment && (
                <div style={{ padding:'12px 14px', borderRadius:'var(--r-md)', background:'var(--bg-surface)', border:'1px solid var(--border)' }}>
                  <p style={{ fontSize:12, color:'var(--text-muted)', margin:0, fontFamily:'var(--font)', lineHeight:1.5 }}>
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
                      style={{ ...inp, background:'var(--bg-surface)', color:'var(--text-subtle)', cursor:'not-allowed' }}/>
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
                <div style={{ padding:'10px 14px', borderRadius:'var(--r-md)', background: balance > 0 ? 'var(--warning-bg)' : 'var(--success-bg)', border: `1px solid ${balance > 0 ? 'var(--warning-border)' : 'var(--success-border)'}` }}>
                  <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'0 0 4px', fontFamily:'var(--font)' }}>Balance after this payment</p>
                  <p style={{ display:'flex', alignItems:'center', gap:6, fontSize:18, fontWeight:800, color: balance > 0 ? 'var(--warning-text)' : 'var(--success-text)', margin:0, fontFamily:'var(--font)' }}>
                    {balance > 0 ? fmt(balance) : <><NavIcon name="success" size={16} color="var(--success)" />Fully Paid</>}
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
                        style={{ padding:'8px 14px', borderRadius:'var(--r-full)', border:`1.5px solid ${on ? 'var(--teal)' : 'var(--border)'}`,
                          background: on ? 'var(--teal-50)' : 'var(--bg-card)', color: on ? 'var(--teal)' : 'var(--text-subtle)',
                          fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)',
                          display:'flex', alignItems:'center', gap:5 }}>
                        <NavIcon name={cfg.icon} size={13} color={on ? 'var(--teal)' : 'var(--text-subtle)'} /> {cfg.label}
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

              {err && (
                <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger-text)', fontSize:12, fontWeight:600, fontFamily:'var(--font)', margin:0 }}>
                  <NavIcon name="warning" size={13} color="var(--danger)" />{err}
                </p>
              )}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:6 }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancel</button>
            <button onClick={submit} disabled={busy} style={{ padding:'9px 22px', borderRadius:'var(--r-md)', border:'none', background:'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', opacity:busy?0.7:1, minWidth:140, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
              <NavIcon name={busy ? 'loading' : 'success'} size={13} color="#fff" style={busy ? { animation:'st-spin .8s linear infinite' } : undefined} />
              {busy ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </div>
    </BottomSheet>
  );
}

export default function AdminSalesTransactions() {
  const [txns,       setTxns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(false);
  const [winW, setWinW] = useState(typeof window!=='undefined'?window.innerWidth:1280);
  useEffect(() => { const h=()=>setWinW(window.innerWidth); window.addEventListener('resize',h); return()=>window.removeEventListener('resize',h); }, []);
  const isMobile = winW <= 767;
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
        @keyframes st-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes st-spin { to { transform:rotate(360deg); } }
        .st-kpi { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; margin-bottom:22px; }
        .st-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:var(--r-lg); border:1px solid var(--border); }
        .st-wrap table { width:100%; min-width:650px; border-collapse:collapse; }
        @media(max-width:767px){ .st-kpi{ grid-template-columns:1fr 1fr; } }
        @media(min-width:2560px){ .st-kpi{ grid-template-columns:repeat(4,1fr); } }
      `}</style>

      <AnimatePresence>
        {modal && <RecordModal onClose={() => setModal(false)} onDone={() => { setModal(false); cacheClear('sales_transactions'); load(true); }} isMobile={isMobile}/>}
      </AnimatePresence>

      <div style={{ fontFamily:'var(--font)', color:'var(--ink)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:4, fontFamily:'var(--font)' }}>Sales & Payments</h1>
            <p style={{ color:'var(--text-subtle)', fontSize:13, fontFamily:'var(--font)' }}>Manual recording · Cash / GCash / Bank Transfer · No payment gateway</p>
          </div>
          <button onClick={() => setModal(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 22px', borderRadius:'var(--r-lg)', border:'none', background:'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', boxShadow:'var(--shadow-teal)' }}>
            <NavIcon name="add" size={14} color="#fff" /> Record Payment
          </button>
        </div>

        <div className="st-kpi">
          {[
            { l:'Total Collected', v:fmt(summary.total   ?? 0), icon:'salesPay', c:'var(--success)' },
            { l:'Balance Due',     v:fmt(summary.balance ?? 0), icon:'loading',  c:'var(--warning)' },
            { l:'Transactions',    v:summary.count ?? 0,        icon:'reports',  c:'var(--teal)'    },
          ].map(s => (
            <Card key={s.l} padding="sm">
              <NavIcon name={s.icon} size={22} color={s.c} style={{ display:'block', marginBottom:10 }} />
              <p style={{ fontSize:22, fontWeight:800, color:'var(--ink)', margin:'0 0 4px', fontFamily:'var(--font)' }}>{s.v}</p>
              <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:'var(--font)' }}>{s.l}</p>
            </Card>
          ))}
        </div>

        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by order #, customer name, or OR number…"
          style={{ ...inp, marginBottom:14 }} onFocus={fi} onBlur={fo}/>

        <div className="st-wrap">
          <table>
            <thead>
              <tr style={{ background:'var(--bg-surface)' }}>
                {['Txn #','Order','Client','Amount Paid','Balance','Method','OR / Ref','Date'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={8} style={{ padding:30 }}>{[1,2,3].map(i => <div key={i} style={{ ...SK, height:10, marginBottom:10 }}/>)}</td></tr>
                : filtered.length === 0
                  ? <tr><td colSpan={8} style={{ padding:'40px', textAlign:'center' }}>
                      <NavIcon name="salesPay" size={36} color="var(--text-faint)" style={{ marginBottom:10 }} />
                      <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>No transactions yet</p>
                      <p style={{ color:'var(--text-faint)', fontSize:12, fontFamily:'var(--font)' }}>Click "+ Record Payment" when a customer pays</p>
                    </td></tr>
                  : filtered.map((t, i) => {
                      const mc = METHOD_CFG[t.payment_method] ?? { label:t.payment_method, tone:'neutral', icon:'ewallet' };
                      return (
                        <tr key={t.transaction_id ?? i} style={{ borderBottom:'1px solid var(--bg-surface)' }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--bg-surface)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, color:'var(--teal)', fontFamily:'var(--font)' }}>#{t.transaction_id}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'var(--ink)', fontWeight:600, fontFamily:'var(--font)' }}>#{t.order_id}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'var(--ink)', fontFamily:'var(--font)' }}>{t.order?.user?.name ?? '—'}</td>
                          <td style={{ padding:'11px 14px', fontSize:13, fontWeight:800, color:'var(--success-text)', fontFamily:'var(--font)' }}>{fmt(t.amount_paid)}</td>
                          <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, fontFamily:'var(--font)', color: Number(t.balance_due) > 0 ? 'var(--warning-text)' : 'var(--success-text)' }}>
                            {Number(t.balance_due) > 0 ? fmt(t.balance_due) : (
                              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <NavIcon name="success" size={12} color="var(--success)" />Paid
                              </span>
                            )}
                          </td>
                          <td style={{ padding:'11px 14px' }}>
                            <Badge tone={mc.tone} icon={mc.icon}>{mc.label}</Badge>
                          </td>
                          <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-subtle)', fontFamily:'var(--font)' }}>{t.or_number ?? '—'}</td>
                          <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-faint)', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
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

        <div style={{ marginTop:18, padding:'12px 16px', borderRadius:'var(--r-md)', background:'var(--bg-surface)', border:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}>
          <NavIcon name="info" size={18} color="var(--text-subtle)" style={{ flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'0 0 3px', fontFamily:'var(--font)' }}>No payment gateway needed for VFRB</p>
            <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0, fontFamily:'var(--font)' }}>
              Customers pay Cash, GCash, or Bank Transfer and send a screenshot. Staff records it here, and the system computes the balance automatically. Replaces Ma'am Fe's paper receipt logbook.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
