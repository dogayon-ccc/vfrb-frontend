// src/pages/admin/DeliveryTracking.jsx
// Uses correct DB column: delivery_status (NOT status)
// delivery_tracking table (NO 's')
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

const T = '#028090', T2 = '#02C39A';
const SK = { borderRadius:6, background:'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize:'400px', animation:'sk 1.4s infinite' };
const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:FONT, boxSizing:'border-box' };
const fi = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px rgba(2,128,144,.1)`; };
const fo = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none'; };

const DEL_CFG = {
  preparing:  { l:'Preparing',  c:'#f59e0b', bg:'#fef3c7' },
  dispatched: { l:'Dispatched', c:'#3b82f6', bg:'#dbeafe' },
  in_transit: { l:'In Transit', c:'#8b5cf6', bg:'#ede9fe' },
  delivered:  { l:'Delivered',  c:'#22c55e', bg:'#dcfce7' },
  returned:   { l:'Returned',   c:'#ef4444', bg:'#fee2e2' },
};

// FIX (Task 6): payment recording used to be a completely separate manual
// step on a different page (SalesTransactions.jsx) — nothing connected the
// two. Per the client interview, payment IS typically tied to delivery
// (subcontract pays per delivery; direct clients pay the remaining 20% on
// delivery), so staff had to remember, mid-shift, to go re-find the same
// order on another page and re-enter it. This merges an OPTIONAL payment
// section into the same modal — reuses the exact same POST /api/admin/transactions
// endpoint SalesTransactions.jsx already calls, so no backend duplication.
const METHODS = ['cash','gcash','ewallet','bank_transfer'];
const TERMS   = ['full_payment','down_payment','net_30'];
const METHOD_CFG = {
  cash:          { label:'Cash',          color:'#22c55e', icon:'💵' },
  gcash:         { label:'GCash',         color:'#7c3aed', icon:'📱' },
  ewallet:       { label:'E-Wallet',      color:'#3b82f6', icon:'💳' },
  bank_transfer: { label:'Bank Transfer', color:'#f59e0b', icon:'🏦' },
};

function MarkDeliveredModal({ delivery, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const [warn,  setWarn]  = useState('');

  // Optional payment section — collapsed detail, expanded by default since
  // recording payment at delivery time is the common case per VFRB's real
  // workflow, but staff can ignore it entirely if payment isn't ready yet
  // (e.g. OTG subcontract: delivered Wednesday, bank transfer only Friday).
  const [recordPayment, setRecordPayment] = useState(true);
  const [amountPaid,    setAmountPaid]    = useState('');
  const [method,        setMethod]        = useState('cash');
  const [terms,         setTerms]         = useState('down_payment');
  const [orNumber,      setOrNumber]      = useState('');

  const submit = async () => {
    setBusy(true); setErr(''); setWarn('');

    // Step 1 — the delivery status change is the critical action; it must
    // succeed on its own regardless of what happens with payment below.
    try {
      await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/delivered`, { notes });
    } catch(e) {
      setErr(e.response?.data?.message ?? 'Failed to mark delivered.');
      setBusy(false);
      return;
    }

    // Step 2 — optional payment log, same endpoint SalesTransactions.jsx uses.
    const paid = Number(amountPaid);
    if (recordPayment && paid > 0) {
      try {
        await axios.post('/api/admin/transactions', {
          order_id: delivery.order_id,
          amount_paid: paid,
          payment_method: method,
          payment_terms: terms,
          or_number: orNumber || null,
          notes: notes || null,
        });
      } catch(e) {
        // Delivery already succeeded — don't block on this, but don't hide
        // the failure either. Staff can still log it via Sales & Pay.
        setWarn(
          (e.response?.data?.message ?? 'Payment could not be recorded.') +
          ' Delivery was marked successfully — log the payment from Sales & Pay.'
        );
        setBusy(false);
        return;
      }
    }

    onDone();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:18, width:'min(460px,100%)', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 22px', background:'#f0fdf4', borderBottom:'1px solid #bbf7d0' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>✅ Mark as Delivered</h3>
          <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0' }}>
            Order #{delivery.order_id} · SAP VL01N → Outbound Delivery
          </p>
        </div>
        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 }}>
              Delivery Notes
            </label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="e.g. Received by principal, complete delivery, no damage…" rows={3}
              style={{ ...inp, resize:'none', minHeight:70 }} onFocus={fi} onBlur={fo}/>
          </div>

          <button type="button" onClick={()=>setRecordPayment(v=>!v)}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontFamily:FONT }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>💰 Record payment for this delivery</span>
            <span style={{ fontSize:11, color:'#64748b' }}>{recordPayment ? 'Hide' : 'Show'} — optional</span>
          </button>

          {recordPayment && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'14px', borderRadius:10, background:'#f8fafc', border:'1px solid #e2e8f0' }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 }}>
                  Amount Paid (₱)
                </label>
                <input type="number" min={0} step={0.01} value={amountPaid}
                  onChange={e=>setAmountPaid(e.target.value)}
                  placeholder="Leave blank to skip payment for now"
                  style={inp} onFocus={fi} onBlur={fo}/>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 }}>
                  Payment Terms
                </label>
                <select value={terms} onChange={e=>setTerms(e.target.value)} style={inp} onFocus={fi} onBlur={fo}>
                  {TERMS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 }}>
                  Payment Method
                </label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {METHODS.map(m => {
                    const cfg = METHOD_CFG[m];
                    const on = method === m;
                    return (
                      <button key={m} type="button" onClick={()=>setMethod(m)}
                        style={{ padding:'8px 12px', borderRadius:9, border:`1px solid ${on?cfg.color+'55':'#e2e8f0'}`, background:on?cfg.color+'15':'#fff', color:on?cfg.color:'#64748b', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                        {cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'#64748b', marginBottom:7 }}>
                  {method === 'cash' ? 'OR Number' : 'Reference Number'}
                </label>
                <input value={orNumber} onChange={e=>setOrNumber(e.target.value)}
                  placeholder={method === 'cash' ? 'OR number' : 'Reference number'}
                  style={inp} onFocus={fi} onBlur={fo}/>
              </div>
            </div>
          )}

          {err  && <p style={{ color:'#ef4444', fontSize:12 }}>⚠️ {err}</p>}
          {warn && <p style={{ color:'#f59e0b', fontSize:12 }}>⚠️ {warn}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 20px', borderRadius:9, border:'none', background:busy?'#94a3b8':'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:12, fontWeight:700, cursor:busy?'not-allowed':'pointer', fontFamily:FONT }}>
            {busy ? '⏳…' : '✓ Confirm Delivery'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UpdateStatusModal({ delivery, onClose, onDone }) {
  const [status, setStatus] = useState(delivery.delivery_status ?? 'preparing');
  const [notes,  setNotes]  = useState('');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/status`, { delivery_status: status, notes });
      onDone();
    } catch(e) { setErr(e.response?.data?.message ?? 'Failed.'); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#fff', borderRadius:18, width:'min(400px,100%)', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.15)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#0f172a', margin:0 }}>Update Delivery Status</h3>
          <p style={{ fontSize:11, color:'#64748b', margin:'3px 0 0' }}>Order #{delivery.order_id}</p>
        </div>
        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {Object.entries(DEL_CFG).map(([k,cfg]) => (
              <button key={k} onClick={()=>setStatus(k)} type="button"
                style={{ padding:'10px 14px', borderRadius:10, border:'none', cursor:'pointer', textAlign:'left', fontFamily:FONT, background:status===k?cfg.bg:'#f8fafc', outline:`2px solid ${status===k?cfg.c+'55':'#e2e8f0'}` }}>
                <span style={{ fontSize:13, fontWeight:700, color:status===k?cfg.c:'#0f172a' }}>
                  {status===k?'● ':'○ '}{cfg.l}
                </span>
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Notes (optional)…" rows={2}
            style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          {err && <p style={{ color:'#ef4444', fontSize:12 }}>⚠️ {err}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', background:'#f8fafc' }}>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ padding:'9px 20px', borderRadius:9, border:'none', background:busy?'#94a3b8':`linear-gradient(135deg,${T},${T2})`, color:'#fff', fontSize:12, fontWeight:700, cursor:busy?'not-allowed':'pointer', fontFamily:FONT }}>
            {busy?'⏳…':'✓ Update'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminDeliveryTracking() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [modal,      setModal]      = useState(null); // { type:'delivered'|'status', delivery }

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('delivery_list');
      if (cached) { setDeliveries(cached); setLoading(false); return; }
    }
    setLoading(true);
    axios.get('/api/admin/delivery')
      .then(r => {
        const list = r.data?.data?.data ?? r.data?.data ?? r.data ?? [];
        setDeliveries(list);
        cacheSet('delivery_list', list, 60_000); // 60s — delivery_status changes often
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // FIX: use delivery_status not status
  const filtered = deliveries.filter(d =>
    filter === 'all' || d.delivery_status === filter
  );

  const counts = {};
  deliveries.forEach(d => {
    const s = d.delivery_status ?? 'preparing';
    counts[s] = (counts[s] ?? 0) + 1;
  });

  return (
    <>
      <style>{`
      /* ── Responsive — injected by v10 mobile sweep ── */
      .adm-stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }
      .adm-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: start;
      }
      .adm-filter {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 16px;
      }
      .adm-filter input,
      .adm-filter select { flex: 1; min-width: 150px; }
      .adm-table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
      }
      .adm-table-wrap table { width: 100%; min-width: 520px; border-collapse: collapse; }
      /* ── TABLET 768–1023px ── */
      @media (max-width: 1023px) {
        .adm-grid-2 { grid-template-columns: 1fr; gap: 14px; }
      }
      /* ── MOBILE ≤ 767px ── */
      @media (max-width: 767px) {
        .adm-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
        .adm-grid-2 { grid-template-columns: 1fr; gap: 12px; }
        .adm-filter { flex-direction: column; }
        .adm-filter input,
        .adm-filter select { min-width: 0; width: 100%; }
        .adm-mob-hide { display: none !important; }
      }
@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>

      {modal?.type === 'delivered' && (
        <MarkDeliveredModal delivery={modal.delivery}
          onClose={()=>setModal(null)} onDone={()=>{ setModal(null); load(); }}/>
      )}
      {modal?.type === 'status' && (
        <UpdateStatusModal delivery={modal.delivery}
          onClose={()=>setModal(null)} onDone={()=>{ setModal(null); load(); }}/>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>Delivery Tracking</h1>
          <p style={{ color:'#64748b', fontSize:13, margin:0 }}>SAP VL01N · {deliveries.length} total deliveries</p>
        </div>
        <button onClick={load}
          style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>
          ⟳ Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
        {Object.entries(DEL_CFG).map(([k,cfg]) => (
          <button key={k} onClick={()=>setFilter(k===filter?'all':k)}
            style={{ padding:'12px 14px', borderRadius:12, border:`1px solid ${filter===k?cfg.c+'40':'#e2e8f0'}`, background:filter===k?cfg.bg:'#fff', cursor:'pointer', textAlign:'left', fontFamily:FONT, transition:'all .14s' }}>
            <p style={{ fontSize:20, fontWeight:800, color:filter===k?cfg.c:'#0f172a', margin:'0 0 3px' }}>
              {counts[k] ?? 0}
            </p>
            <p style={{ fontSize:11, color:'#64748b', margin:0 }}>{cfg.l}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {['all', ...Object.keys(DEL_CFG)].map(s => {
          const cfg = DEL_CFG[s] ?? { l:'All', c:'#64748b', bg:'#f1f5f9' };
          const act = filter === s;
          return (
            <button key={s} onClick={()=>setFilter(s)}
              style={{ padding:'7px 13px', borderRadius:9, border:`1px solid ${act?cfg.c+'40':'#e2e8f0'}`, background:act?cfg.bg:'#fff', color:act?cfg.c:'#64748b', fontSize:11, fontWeight:act?700:500, cursor:'pointer', fontFamily:FONT, whiteSpace:'nowrap' }}>
              {s === 'all' ? 'All' : cfg.l}
              {s!=='all' && counts[s]>0 && <span style={{ marginLeft:5, fontSize:9, opacity:.7 }}>({counts[s]})</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['Tracking #','Order','Customer','Scheduled','Address','Status','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(4).fill(0).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  {Array(7).fill(0).map((_,j) => (
                    <td key={j} style={{ padding:'12px 14px' }}>
                      <div style={{ ...SK, height:10, width:'70%' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:'50px', textAlign:'center' }}>
                <p style={{ fontSize:36, margin:'0 0 12px', opacity:.3 }}>🚚</p>
                <p style={{ color:'#64748b', fontSize:13, fontWeight:600 }}>No deliveries found</p>
                <p style={{ color:'#94a3b8', fontSize:12, margin:'4px 0 0' }}>Deliveries are auto-created when orders reach Packing stage.</p>
              </td></tr>
            ) : filtered.map((d, i) => {
              // FIX: use delivery_status not status
              const ds  = d.delivery_status ?? 'preparing';
              const cfg = DEL_CFG[ds] ?? DEL_CFG.preparing;
              const isDone = ds === 'delivered';
              return (
                <tr key={d.tracking_id ?? i} style={{ borderBottom:'1px solid #f1f5f9' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, color:T }}>
                    #{d.tracking_id}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:'#0f172a' }}>
                    #{d.order_id}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'#0f172a' }}>
                    {/* FIX: backend returns flat customer_name (joined from users),
                        there is no nested d.order.user — that always resolved
                        to undefined and silently showed '—' for every row. */}
                    {d.customer_name ?? '—'}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:11, color:'#64748b', whiteSpace:'nowrap' }}>
                    {d.estimated_delivery_date
                      ? new Date(d.estimated_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                      : d.expected_delivery_date
                      ? new Date(d.expected_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                      : '—'}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:11, color:'#64748b', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.delivery_address ?? d.customer_address ?? '—'}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ padding:'4px 10px', borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.c }}>
                      {cfg.l}
                    </span>
                    {d.actual_delivery_date && (
                      <p style={{ fontSize:9, color:'#94a3b8', margin:'3px 0 0' }}>
                        {new Date(d.actual_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
                      </p>
                    )}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {!isDone && (
                        <>
                          <button onClick={()=>setModal({ type:'status', delivery:d })}
                            style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#0f172a', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>
                            Update
                          </button>
                          <button onClick={()=>setModal({ type:'delivered', delivery:d })}
                            style={{ padding:'5px 10px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
                            ✓ Delivered
                          </button>
                        </>
                      )}
                      {isDone && (
                        <span style={{ fontSize:11, color:'#22c55e', fontWeight:700 }}>✓ Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
