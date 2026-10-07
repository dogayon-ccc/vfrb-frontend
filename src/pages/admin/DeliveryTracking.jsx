
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { cacheGet, cacheSet } from '../../utils/cache';
import { NavIcon } from '../../components/ui';
import { PageHeader, StatGrid, PillTabs, Panel, StatusPill, SearchBox, ErrorBlock, SkeletonRows, FilterSheet, FilterButton, useIsMobile } from '../../components/admin/AdminUI';

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

  const [recordPayment, setRecordPayment] = useState(true);
  const [amountPaid,    setAmountPaid]    = useState('');
  const [method,        setMethod]        = useState('cash');
  const [terms,         setTerms]         = useState('down_payment');
  const [orNumber,      setOrNumber]      = useState('');

  const submit = async () => {
    setBusy(true); setErr(''); setWarn('');

    try {
      await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/delivered`, { notes });
    } catch(e) {
      setErr(e.response?.data?.message ?? 'Failed to mark delivered.');
      setBusy(false);
      return;
    }

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

          {err  && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger-text)', fontSize:12 }}><NavIcon name="warning" size={13} color="var(--danger)" />{err}</p>}
          {warn && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--warning-text)', fontSize:12 }}><NavIcon name="warning" size={13} color="var(--warning)" />{warn}</p>}
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
          {err && <p style={{ display:'flex', alignItems:'center', gap:6, color:'var(--danger-text)', fontSize:12 }}><NavIcon name="warning" size={13} color="var(--danger)" />{err}</p>}
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

const fmtDate = (d, y = true) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', ...(y ? { year: 'numeric' } : {}) }) : '—');
const schedOf = (d) => d.estimated_delivery_date ?? d.expected_delivery_date;

function DeliveryActions({ d, onModal, stop }) {
  const click = (fn) => (e) => { if (stop) e.stopPropagation(); fn(); };
  if (d.delivery_status === 'delivered') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success-text)', fontWeight: 700 }}><NavIcon name="success" size={13} color="currentColor" /> Done</span>;
  return (
    <>
      <button className="adm-btn" onClick={click(() => onModal({ type: 'status', delivery: d }))}>Update status</button>
      <button className="adm-btn success" onClick={click(() => onModal({ type: 'delivered', delivery: d }))}><NavIcon name="success" size={13} color="currentColor" /> Delivered</button>
    </>
  );
}

export default function AdminDeliveryTracking() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(null);
  const isMobile = useIsMobile();

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('delivery_list');
      if (cached) { setDeliveries(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/delivery').then((r) => {
      const list = r.data?.data?.data ?? r.data?.data ?? r.data ?? [];
      setDeliveries(list);
      cacheSet('delivery_list', list, 60_000);
    }).catch(() => setLoadErr(true)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => deliveries.reduce((a, d) => { const s = d.delivery_status ?? 'preparing'; a[s] = (a[s] ?? 0) + 1; return a; }, {}), [deliveries]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return deliveries.filter((d) => (filter === 'all' || (d.delivery_status ?? 'preparing') === filter)
      && (!q || String(d.order_id).includes(q) || String(d.tracking_id).includes(q)
        || d.customer_name?.toLowerCase().includes(q) || (d.delivery_address ?? d.customer_address ?? '').toLowerCase().includes(q)));
  }, [deliveries, filter, search]);

  const tabs = [{ key: 'all', label: 'All', count: deliveries.length }, ...Object.entries(DEL_CFG).map(([k, c]) => ({ key: k, label: c.l, count: counts[k] ?? 0 }))];
  const active = (counts.preparing ?? 0) + (counts.dispatched ?? 0) + (counts.in_transit ?? 0);
  const clearFilters = () => { setSearch(''); setFilter('all'); };

  return (
    <>
      {modal?.type === 'delivered' && <MarkDeliveredModal delivery={modal.delivery} onClose={() => setModal(null)} onDone={() => { setModal(null); load(true); }} />}
      {modal?.type === 'status' && <UpdateStatusModal delivery={modal.delivery} onClose={() => setModal(null)} onDone={() => { setModal(null); load(true); }} />}
      {sheet && <FilterSheet title="Filter by status" options={tabs} value={filter} onChange={setFilter} onClose={() => setSheet(false)} isMobile={isMobile} />}

      <PageHeader title="Delivery Tracking" sub={`${deliveries.length} deliveries · ${active} active`}>
        <button className="adm-btn" onClick={() => load(true)}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load deliveries." onRetry={() => load(true)} /></div>}

      <StatGrid loading={loading} items={Object.entries(DEL_CFG).map(([k, c]) => ({
        label: c.l, value: counts[k] ?? 0, color: filter === k ? c.c : undefined, onClick: () => setFilter(k === filter ? 'all' : k),
      }))} />

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search order, tracking #, client, address…" label="Search deliveries" />
        <FilterButton label={`Status: ${tabs.find((t) => t.key === filter)?.label}`} onClick={() => setSheet(true)} />
      </div>
      <div className="adm-only-d"><PillTabs value={filter} onChange={setFilter} tabs={tabs} /></div>

      <div className="adm-only-d adm-tabpanel" key={filter}>
        <Panel flush>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead><tr><th>Tracking</th><th>Order</th><th>Client</th><th>Scheduled</th><th className="adm-hide-t">Address</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {!loading && filtered.map((d, i) => {
                  const ds = d.delivery_status ?? 'preparing';
                  return (
                    <tr key={d.tracking_id ?? i}>
                      <td style={{ fontWeight: 800, color: 'var(--teal)' }}>#{d.tracking_id}</td>
                      <td style={{ fontWeight: 600 }}>#{d.order_id}</td>
                      <td>{d.customer_name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }}>{fmtDate(schedOf(d))}</td>
                      <td className="adm-hide-t" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }} title={d.delivery_address ?? d.customer_address ?? ''}>{d.delivery_address ?? d.customer_address ?? '—'}</td>
                      <td>
                        <StatusPill status={ds} label={DEL_CFG[ds]?.l} />
                        {d.actual_delivery_date && <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>on {fmtDate(d.actual_delivery_date, false)}</div>}
                      </td>
                      <td><div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}><DeliveryActions d={d} onModal={setModal} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading && <SkeletonRows rows={5} h={48} />}
          {!loading && !loadErr && filtered.length === 0 && (
            <div className="adm-empty"><NavIcon name="delivery" size={30} color="currentColor" />
              <div style={{ marginTop: 8, fontWeight: 700 }}>{search || filter !== 'all' ? 'No deliveries match' : 'No deliveries yet'}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Deliveries are auto-created when orders complete Packing.</div>
              {(search || filter !== 'all') && <button className="adm-link-btn" onClick={clearFilters}>Clear filters</button>}
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={`${filter}-${search}`}>
        {loading ? <SkeletonRows rows={3} h={140} /> : filtered.length === 0 ? (
          <div className="adm-empty"><NavIcon name="delivery" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>No deliveries found</div></div>
        ) : filtered.map((d, i) => {
          const ds = d.delivery_status ?? 'preparing';
          return (
            <div key={d.tracking_id ?? i} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': DEL_CFG[ds]?.c ?? 'var(--teal)' }}>
              <div className="adm-mrow"><b style={{ color: 'var(--teal)' }}>Order #{d.order_id}</b><StatusPill status={ds} label={DEL_CFG[ds]?.l} /></div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{d.customer_name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Tracking #{d.tracking_id} · scheduled {fmtDate(schedOf(d))}</div>
              {(d.delivery_address ?? d.customer_address) && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4, display: 'flex', gap: 5 }}><NavIcon name="location" size={13} color="currentColor" style={{ flexShrink: 0, marginTop: 2 }} />{d.delivery_address ?? d.customer_address}</div>}
              {d.actual_delivery_date && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Delivered {fmtDate(d.actual_delivery_date)}</div>}
              {ds !== 'delivered' && <div className="adm-mfoot"><DeliveryActions d={d} onModal={setModal} /></div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
