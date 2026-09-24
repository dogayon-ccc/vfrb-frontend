// src/pages/admin/DeliveryTracking.jsx
// Uses correct DB column: delivery_status (NOT status)
// delivery_tracking table (NO 's')
//
// FIX (Task 6): payment recording used to be a completely separate manual
// step on a different page (SalesTransactions.jsx) — nothing connected the
// two. Per the client interview, payment IS typically tied to delivery
// (subcontract pays per delivery; direct clients pay the remaining 20% on
// delivery), so staff had to remember, mid-shift, to go re-find the same
// order on another page and re-enter it. This merges an OPTIONAL payment
// section into the same modal — reuses the exact same POST /api/admin/transactions
// endpoint SalesTransactions.jsx already calls, so no backend duplication.
//
// RESHAPED (Sept 6 2026): hex -> theme.css tokens, emoji -> NavIcon.
// DEL_CFG's 5 statuses map cleanly (preparing=warning, dispatched=info,
// in_transit=purple, delivered=success, returned=danger). METHOD_CFG
// reuses the EXACT same 4-method mapping already established on
// SalesTransactions.jsx (cash=success/gcash=purple/ewallet=info/
// bank_transfer=warning) rather than reinventing it — same reasoning as
// OrderDetail.jsx reusing ProductionList.jsx's stage colors: a manager
// recording a GCash payment here should see the same purple GCash chip
// they'd see on Sales & Pay, not an independently-chosen color.
//
// Dropped the unused `TTL` import (checked first this time -- confirmed
// genuinely dead, not repeating the near-miss from Inventory.jsx where
// it WAS actually used). Also removed a real dead-CSS block: the
// ".adm-stats/.adm-grid-2/.adm-filter/.adm-table-wrap" classes were
// defined in this file's injected <style> tag but never applied via
// className anywhere in the JSX -- same "v10 mobile sweep never
// actually wired up" pattern already found and removed from
// UserManagement.jsx. Replaced with real, actually-applied responsive
// classes below instead of leaving the page with zero mobile handling.
//
// The customer_name flat-field bug-fix comment (backend returns a
// joined flat field, not nested d.order.user) and the whole payment-
// at-delivery merge logic are real, load-bearing, and untouched.

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet } from '../../utils/cache';
import { NavIcon } from '../../components/ui';

const SK  = { borderRadius:'var(--r-sm)', background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)', backgroundSize:'400px', animation:'dt-shimmer 1.4s infinite' };
const inp = { width:'100%', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:13, outline:'none', fontFamily:'var(--font)', boxSizing:'border-box' };
const fi  = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(2,128,144,.1)'; };
const fo  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };

const DEL_CFG = {
  preparing:  { l:'Preparing',  c:'var(--warning)', bg:'var(--warning-bg)' },
  dispatched: { l:'Dispatched', c:'var(--info)',     bg:'var(--info-bg)'    },
  in_transit: { l:'In Transit', c:'var(--purple)',   bg:'var(--purple-50)'  },
  delivered:  { l:'Delivered',  c:'var(--success)',  bg:'var(--success-bg)' },
  returned:   { l:'Returned',   c:'var(--danger)',   bg:'var(--danger-bg)'  },
};

const METHODS = ['cash','gcash','ewallet','bank_transfer'];
const TERMS   = ['full_payment','down_payment','net_30'];
// Same mapping as SalesTransactions.jsx -- see file header note.
const METHOD_CFG = {
  cash:          { label:'Cash',          c:'var(--success)', bg:'var(--success-bg)', icon:'salesPay' },
  gcash:         { label:'GCash',         c:'var(--purple)',  bg:'var(--purple-50)',  icon:'phone'    },
  ewallet:       { label:'E-Wallet',      c:'var(--info)',    bg:'var(--info-bg)',    icon:'ewallet'  },
  bank_transfer: { label:'Bank Transfer', c:'var(--warning)', bg:'var(--warning-bg)', icon:'bank'     },
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
        style={{ background:'var(--bg-card)', borderRadius:'var(--r-xl)', width:'min(460px,100%)', maxHeight:'90vh', overflowY:'auto', boxShadow:'var(--shadow-xl)' }}>
        <div style={{ padding:'16px 22px', background:'var(--success-bg)', borderBottom:'1px solid var(--success-border)' }}>
          <h3 style={{ display:'flex', alignItems:'center', gap:7, fontSize:15, fontWeight:800, color:'var(--ink)', margin:0 }}>
            <NavIcon name="success" size={16} color="var(--success)" /> Mark as Delivered
          </h3>
          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'3px 0 0' }}>
            Order #{delivery.order_id} · Outbound Delivery
          </p>
        </div>
        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7 }}>
              Delivery Notes
            </label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="e.g. Received by principal, complete delivery, no damage…" rows={3}
              style={{ ...inp, resize:'none', minHeight:70 }} onFocus={fi} onBlur={fo}/>
          </div>

          <button type="button" onClick={()=>setRecordPayment(v=>!v)}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer', fontFamily:'var(--font)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'var(--ink)' }}>
              <NavIcon name="salesPay" size={13} color="var(--ink)" /> Record payment for this delivery
            </span>
            <span style={{ fontSize:11, color:'var(--text-subtle)' }}>{recordPayment ? 'Hide' : 'Show'} — optional</span>
          </button>

          {recordPayment && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:'14px', borderRadius:'var(--r-md)', background:'var(--bg)', border:'1px solid var(--border)' }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7 }}>
                  Amount Paid (₱)
                </label>
                <input type="number" min={0} step={0.01} value={amountPaid}
                  onChange={e=>setAmountPaid(e.target.value)}
                  placeholder="Leave blank to skip payment for now"
                  style={inp} onFocus={fi} onBlur={fo}/>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7 }}>
                  Payment Terms
                </label>
                <select value={terms} onChange={e=>setTerms(e.target.value)} style={inp} onFocus={fi} onBlur={fo}>
                  {TERMS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7 }}>
                  Payment Method
                </label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {METHODS.map(m => {
                    const cfg = METHOD_CFG[m];
                    const on = method === m;
                    return (
                      <button key={m} type="button" onClick={()=>setMethod(m)}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:'var(--r-md)', border:`1px solid ${on ? cfg.c : 'var(--border)'}`, background: on ? cfg.bg : 'var(--bg-card)', color: on ? cfg.c : 'var(--text-subtle)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                        <NavIcon name={cfg.icon} size={12} color={on ? cfg.c : 'var(--text-subtle)'} /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-subtle)', marginBottom:7 }}>
                  {method === 'cash' ? 'OR Number' : 'Reference Number'}
                </label>
                <input value={orNumber} onChange={e=>setOrNumber(e.target.value)}
                  placeholder={method === 'cash' ? 'OR number' : 'Reference number'}
                  style={inp} onFocus={fi} onBlur={fo}/>
              </div>
            </div>
          )}

          {err  && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12 }}><NavIcon name="warning" size={13} color="var(--danger)" />{err}</p>}
          {warn && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--warning)', fontSize:12 }}><NavIcon name="warning" size={13} color="var(--warning)" />{warn}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg)' }}>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:'var(--r-md)', border:'none', background: busy ? 'var(--text-faint)' : 'var(--success)', color:'#fff', fontSize:12, fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}>
            <NavIcon name={busy ? 'loading' : 'success'} size={13} color="#fff" style={busy ? { animation:'dt-spin .8s linear infinite' } : undefined} />
            {busy ? '…' : 'Confirm Delivery'}
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
        style={{ background:'var(--bg-card)', borderRadius:'var(--r-xl)', width:'min(400px,100%)', overflow:'hidden', boxShadow:'var(--shadow-xl)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'var(--ink)', margin:0 }}>Update Delivery Status</h3>
          <p style={{ fontSize:11, color:'var(--text-subtle)', margin:'3px 0 0' }}>Order #{delivery.order_id}</p>
        </div>
        <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {Object.entries(DEL_CFG).map(([k,cfg]) => (
              <button key={k} onClick={()=>setStatus(k)} type="button"
                style={{ padding:'10px 14px', borderRadius:'var(--r-md)', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'var(--font)', background: status===k ? cfg.bg : 'var(--bg)', outline:`2px solid ${status===k ? cfg.c : 'var(--border)'}` }}>
                <span style={{ fontSize:13, fontWeight:700, color: status===k ? cfg.c : 'var(--ink)' }}>
                  {status===k ? '● ' : '○ '}{cfg.l}
                </span>
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Notes (optional)…" rows={2}
            style={{ ...inp, resize:'none' }} onFocus={fi} onBlur={fo}/>
          {err && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger)', fontSize:12 }}><NavIcon name="warning" size={13} color="var(--danger)" />{err}</p>}
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end', background:'var(--bg)' }}>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={submit} disabled={busy}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:'var(--r-md)', border:'none', background: busy ? 'var(--text-faint)' : 'linear-gradient(135deg,var(--teal),var(--teal-2))', color:'#fff', fontSize:12, fontWeight:700, cursor: busy ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}>
            <NavIcon name={busy ? 'loading' : 'success'} size={13} color="#fff" style={busy ? { animation:'dt-spin .8s linear infinite' } : undefined} />
            {busy ? '…' : 'Update'}
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
      @keyframes dt-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
      @keyframes dt-spin{to{transform:rotate(360deg)}}
      .dt-stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; margin-bottom:20px; }
      .dt-wrap  { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:var(--r-lg); border:1px solid var(--border); }
      .dt-wrap table { width:100%; min-width:560px; border-collapse:collapse; }
      @media (max-width:767px) {
        .dt-stats { grid-template-columns:1fr 1fr; }
        .dt-header { flex-direction:column; align-items:stretch !important; }
        .dt-header button { width:100%; justify-content:center; }
      }
      @media (min-width:2560px) {
        .dt-stats { grid-template-columns:repeat(5,1fr); }
      }
      `}</style>

      {modal?.type === 'delivered' && (
        <MarkDeliveredModal delivery={modal.delivery}
          onClose={()=>setModal(null)} onDone={()=>{ setModal(null); load(true); }}/>
      )}
      {modal?.type === 'status' && (
        <UpdateStatusModal delivery={modal.delivery}
          onClose={()=>setModal(null)} onDone={()=>{ setModal(null); load(true); }}/>
      )}

      {/* Header */}
      <div className="dt-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12, fontFamily:'var(--font)' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--ink)', margin:'0 0 4px' }}>Delivery Tracking</h1>
          <p style={{ color:'var(--text-subtle)', fontSize:13, margin:0 }}>{deliveries.length} total deliveries</p>
        </div>
        <button onClick={()=>load(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:'var(--r-md)', border:'1px solid var(--border)', background:'var(--bg-card)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
          <NavIcon name="refresh" size={13} color="var(--ink)" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="dt-stats">
        {Object.entries(DEL_CFG).map(([k,cfg]) => (
          <button key={k} onClick={()=>setFilter(k===filter?'all':k)}
            style={{ padding:'12px 14px', borderRadius:'var(--r-lg)', border:`1px solid ${filter===k?cfg.c:'var(--border)'}`, background: filter===k ? cfg.bg : 'var(--bg-card)', cursor:'pointer', textAlign:'left', fontFamily:'var(--font)', transition:'all .14s' }}>
            <p style={{ fontSize:20, fontWeight:800, color: filter===k ? cfg.c : 'var(--ink)', margin:'0 0 3px' }}>
              {counts[k] ?? 0}
            </p>
            <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0 }}>{cfg.l}</p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {['all', ...Object.keys(DEL_CFG)].map(s => {
          const cfg = DEL_CFG[s] ?? { l:'All', c:'var(--text-subtle)', bg:'var(--bg-surface)' };
          const act = filter === s;
          return (
            <button key={s} onClick={()=>setFilter(s)}
              style={{ padding:'7px 13px', borderRadius:'var(--r-md)', border:`1px solid ${act?cfg.c:'var(--border)'}`, background:act?cfg.bg:'var(--bg-card)', color:act?cfg.c:'var(--text-subtle)', fontSize:11, fontWeight:act?700:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
              {s === 'all' ? 'All' : cfg.l}
              {s!=='all' && counts[s]>0 && <span style={{ marginLeft:5, fontSize:9, opacity:.7 }}>({counts[s]})</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="dt-wrap" style={{ background:'var(--bg-card)', boxShadow:'var(--shadow-xs)' }}>
        <table>
          <thead>
            <tr style={{ background:'var(--bg)' }}>
              {['Tracking #','Order','Client','Scheduled','Address','Status','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-subtle)', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'2px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(4).fill(0).map((_,i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--bg-surface)' }}>
                  {Array(7).fill(0).map((_,j) => (
                    <td key={j} style={{ padding:'12px 14px' }}>
                      <div style={{ ...SK, height:10, width:'70%' }}/>
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:'50px', textAlign:'center' }}>
                <NavIcon name="delivery" size={36} color="var(--text-faint)" style={{ marginBottom:12 }} />
                <p style={{ color:'var(--text-subtle)', fontSize:13, fontWeight:600 }}>No deliveries found</p>
                <p style={{ color:'var(--text-faint)', fontSize:12, margin:'4px 0 0' }}>Deliveries are auto-created when orders reach Packing stage.</p>
              </td></tr>
            ) : filtered.map((d, i) => {
              // FIX: use delivery_status not status
              const ds  = d.delivery_status ?? 'preparing';
              const cfg = DEL_CFG[ds] ?? DEL_CFG.preparing;
              const isDone = ds === 'delivered';
              return (
                <tr key={d.tracking_id ?? i} style={{ borderBottom:'1px solid var(--bg-surface)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'11px 14px', fontSize:12, fontWeight:700, color:'var(--teal)' }}>
                    #{d.tracking_id}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, fontWeight:600, color:'var(--ink)' }}>
                    #{d.order_id}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--ink)' }}>
                    {/* FIX: backend returns flat customer_name (joined from users),
                        there is no nested d.order.user — that always resolved
                        to undefined and silently showed '—' for every row. */}
                    {d.customer_name ?? '—'}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-subtle)', whiteSpace:'nowrap' }}>
                    {d.estimated_delivery_date
                      ? new Date(d.estimated_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                      : d.expected_delivery_date
                      ? new Date(d.expected_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                      : '—'}
                  </td>
                  <td style={{ padding:'11px 14px', fontSize:11, color:'var(--text-subtle)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.delivery_address ?? d.customer_address ?? '—'}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ padding:'4px 10px', borderRadius:'var(--r-full)', fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.c }}>
                      {cfg.l}
                    </span>
                    {d.actual_delivery_date && (
                      <p style={{ fontSize:9, color:'var(--text-faint)', margin:'3px 0 0' }}>
                        {new Date(d.actual_delivery_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}
                      </p>
                    )}
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {!isDone && (
                        <>
                          <button onClick={()=>setModal({ type:'status', delivery:d })}
                            style={{ padding:'5px 10px', borderRadius:'var(--r-sm)', border:'1px solid var(--border)', background:'var(--bg)', color:'var(--ink)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
                            Update
                          </button>
                          <button onClick={()=>setModal({ type:'delivered', delivery:d })}
                            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:'var(--r-sm)', border:'none', background:'var(--success)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>
                            <NavIcon name="success" size={11} color="#fff" /> Delivered
                          </button>
                        </>
                      )}
                      {isDone && (
                        <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--success)', fontWeight:700 }}>
                          <NavIcon name="success" size={11} color="var(--success)" /> Done
                        </span>
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
