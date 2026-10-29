import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { cacheGet, cacheSet } from '../../utils/cache';
import { NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, StatGrid, PillTabs, Panel, StatusPill, SearchBox, ErrorBlock, SkeletonRows, FilterSheet, FilterButton, useIsMobile, OrderLink } from '../../components/admin/AdminUI';

// Prepared once packing is done; staff move it to In transit, then Delivered. Full payment delivers an order already in transit.
// `tone` reuses an existing StatusPill colour.
const DEL_CFG = {
  ready:     { l:'Prepared',            c:'var(--warning)', tone:'preparing'  },
  in_transit:{ l:'In transit',          c:'var(--teal)',    tone:'in_transit' },
  partial:   { l:'Partially delivered', c:'var(--purple)',  tone:'in_transit' },
  delivered: { l:'Delivered',           c:'var(--success)', tone:'delivered'  },
  returned:  { l:'Returned',            c:'var(--danger)',  tone:'returned'   },
};
const autoStatus = (d) => (['delivered', 'returned'].includes(d.delivery_status) ? d.delivery_status : Number(d.delivered_qty) > 0 ? 'partial' : d.delivery_status === 'in_transit' ? 'in_transit' : 'ready');
const AutoPill = ({ d }) => { const k = autoStatus(d); return <StatusPill status={DEL_CFG[k].tone} label={k === 'partial' ? `${DEL_CFG[k].l} · ${d.delivered_qty}/${d.quantity_ordered ?? '—'}` : DEL_CFG[k].l} />; };

const METHODS = ['cash','gcash','ewallet','bank_transfer'];
const TERMS   = ['full_payment','down_payment','net_30'];
const METHOD_LABEL = { cash:'Cash', gcash:'GCash', ewallet:'E-Wallet', bank_transfer:'Bank Transfer' };

// Auto-created deliveries fall back to "Address pending"; the server refuses Delivered until a real address is on file.
const lacksAddress = (d) => d.delivery_method !== 'pickup' && (!d.delivery_address?.trim() || /^address pending$/i.test(d.delivery_address.trim()));

function MarkDeliveredModal({ delivery, onClose, onDone, isMobile }) {
  const needsAddress = lacksAddress(delivery);
  // A delivery still being prepared can ship first; pickups go straight to Delivered.
  // A delivered order can only be returned; a returned one is checked and sent again.
  const isReturn = delivery.delivery_status === 'delivered';
  const canTransit = ['preparing', 'returned'].includes(delivery.delivery_status) && delivery.delivery_method !== 'pickup';
  const [step, setStep] = useState(isReturn ? 'returned' : canTransit ? 'in_transit' : 'delivered');
  const [courier, setCourier] = useState(delivery.courier_name ?? '');
  const [trackingNo, setTrackingNo] = useState(delivery.tracking_number ?? '');
  const [address, setAddress] = useState(needsAddress ? (delivery.customer_address ?? '') : '');
  const [notes, setNotes] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const [warn,  setWarn]  = useState('');
  const [marked, setMarked] = useState(false);
  // Packed pieces not yet delivered; the server caps delivered_qty at this too.
  const [ready, setReady] = useState(null);
  const [qty,   setQty]   = useState('');
  useEffect(() => {
    let off = false;
    axios.get(`/api/admin/orders/${delivery.order_id}/production-summary`)
      .then((r) => { if (off) return; const n = Number(r.data?.ready_for_delivery) || 0; setReady(n); setQty(String(n)); })
      .catch(() => { if (!off) setReady(false); });
    return () => { off = true; };
  }, [delivery.order_id]);
  const qtyNum = Number(qty);
  const qtyBad = ready !== false && (!Number.isInteger(qtyNum) || qtyNum < 1 || (ready != null && qtyNum > ready));
  const ordered = Number(delivery.quantity_ordered) || 0;
  const already = Number(delivery.delivered_qty) || 0;
  const isPartial = ordered > 0 && already + qtyNum < ordered;

  const [recordPayment, setRecordPayment] = useState(true);
  const [amountPaid,    setAmountPaid]    = useState('');
  const [method,        setMethod]        = useState('bank_transfer');
  const [terms,         setTerms]         = useState('full_payment');
  const [orNumber,      setOrNumber]      = useState('');

  const submit = async () => {
    setBusy(true); setErr(''); setWarn('');
    if (step === 'returned') {
      try { await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/status`, { delivery_status: 'returned', notes: notes.trim() }); onDone(); }
      catch (e) { setErr(e.response?.data?.message ?? 'Failed to record the return.'); setBusy(false); }
      return;
    }
    if (step === 'in_transit') {
      try {
        await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/status`, { delivery_status: 'in_transit', courier_name: courier.trim() || null, tracking_number: trackingNo.trim() || null, notes: notes || null, ...(needsAddress ? { delivery_address: address.trim() } : {}) });
        onDone();
      } catch (e) { setErr(e.response?.data?.message ?? 'Failed to mark in transit.'); setBusy(false); }
      return;
    }
    try {
      await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/delivered`, { notes, ...(ready !== false && qty ? { delivered_qty: qtyNum } : {}), ...(needsAddress ? { delivery_address: address.trim() } : {}) });
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Failed to mark delivered.');
      setBusy(false);
      return;
    }
    const paid = Number(amountPaid);
    if (recordPayment && paid > 0) {
      try {
        await axios.post('/api/admin/transactions', { order_id: delivery.order_id, amount_paid: paid, payment_method: method, payment_terms: terms, or_number: orNumber || null, notes: notes || null });
      } catch (e) {
        // The delivery is already marked: never offer to submit it twice, only to close.
        setMarked(true);
        setWarn(`${e.response?.data?.message ?? 'Payment could not be recorded.'} The delivery was marked delivered — record the payment from Sales & Pay.`);
        setBusy(false);
        return;
      }
    }
    onDone();
  };

  return (
    <BottomSheet title={isReturn ? `Record a return · order #${delivery.order_id}` : canTransit ? `Update delivery · order #${delivery.order_id}` : `Mark order #${delivery.order_id} delivered`} onClose={marked ? onDone : onClose} isMobile={isMobile} maxWidth={480}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {canTransit && (
          <div className="adm-chip-row" role="radiogroup" aria-label="New delivery status">
            {[['in_transit', 'In transit'], ['delivered', 'Delivered']].map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={step === k} className={`adm-fchip${step === k ? ' on' : ''}`} onClick={() => setStep(k)} disabled={marked}>{l}</button>
            ))}
          </div>
        )}
        {step === 'in_transit' && (
          <div className="adm-form-grid">
            <label><span className="adm-field">Courier / driver</span>
              <input className="adm-input" maxLength={100} value={courier} onChange={e=>setCourier(e.target.value)} placeholder="Optional" />
            </label>
            <label><span className="adm-field">Tracking number</span>
              <input className="adm-input" maxLength={100} value={trackingNo} onChange={e=>setTrackingNo(e.target.value)} placeholder="Optional" />
            </label>
          </div>
        )}
        {step === 'delivered' && <label><span className="adm-field">Pieces delivered now</span>
          <input className="adm-input" type="number" inputMode="numeric" min={1} max={ready || undefined} value={qty} onChange={e=>setQty(e.target.value)} disabled={marked || ready === null || ready === false} aria-describedby="dlv-qty-hint" />
          <span id="dlv-qty-hint" style={{ display:'block', fontSize:12, marginTop:4, color: qtyBad ? 'var(--danger-text)' : 'var(--text-subtle)' }}>
            {ready === null ? 'Checking packed pieces…' : ready === false ? 'Packed count unavailable — the full remaining quantity will be delivered.'
              : `${ready} packed and ready · ${already} of ${ordered} delivered so far${!qtyBad && isPartial ? ' · this is a partial delivery' : ''}`}
          </span>
        </label>}
        {needsAddress && !isReturn && (
          <label><span className="adm-field">Delivery address (required)</span>
            <textarea className="adm-input" rows={2} value={address} onChange={e=>setAddress(e.target.value)} disabled={marked} required
              placeholder="Street, barangay, city" />
          </label>
        )}
        <label><span className="adm-field">{isReturn ? 'Reason for the return (required)' : 'Delivery notes'}</span>
          <textarea className="adm-input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} disabled={marked} required={isReturn}
            placeholder={isReturn ? 'e.g. Wrong collar colour on 20 pieces' : 'e.g. Received by the principal, complete, no damage…'} />
        </label>

        {step === 'delivered' && <label className="adm-mrow" style={{ cursor:'pointer', fontSize:13, fontWeight:700, minHeight:44 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><NavIcon name="salesPay" size={14} color="currentColor" /> Record a payment with this delivery</span>
          <input type="checkbox" checked={recordPayment} onChange={e=>setRecordPayment(e.target.checked)} disabled={marked} style={{ width:20, height:20 }} />
        </label>}

        {step === 'delivered' && recordPayment && !marked && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, padding:14, borderRadius:12, background:'var(--bg)', border:'1px solid var(--border)' }}>
            <label><span className="adm-field">Amount paid (₱)</span>
              <input className="adm-input" type="number" inputMode="decimal" min={0} step={0.01} value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} placeholder="Leave blank to skip for now" />
            </label>
            <div className="adm-form-grid">
              <label><span className="adm-field">Payment terms</span>
                <select className="adm-input" value={terms} onChange={e=>setTerms(e.target.value)}>
                  {TERMS.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </label>
              <label><span className="adm-field">{method === 'cash' ? 'OR number' : 'Reference number'}</span>
                <input className="adm-input" value={orNumber} onChange={e=>setOrNumber(e.target.value)} placeholder="Optional" />
              </label>
            </div>
            <div>
              <span className="adm-field">Payment method</span>
              <div className="adm-chip-row" role="radiogroup" aria-label="Payment method">
                {METHODS.map(m => (
                  <button key={m} type="button" role="radio" aria-checked={method === m} className={`adm-fchip${method === m ? ' on' : ''}`} onClick={()=>setMethod(m)}>{METHOD_LABEL[m]}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {err && <ErrorBlock msg={err} />}
        {warn && <div className="adm-callout warn" role="alert" style={{ marginBottom:0 }}><NavIcon name="warning" size={16} color="currentColor" /><div>{warn}</div></div>}
        <div className="adm-sheet-foot">
          {marked ? <button className="adm-btn primary" onClick={onDone}>Close</button> : (
            <>
              <button className="adm-btn" onClick={onClose}>Cancel</button>
              <button className="adm-btn success" onClick={submit} disabled={busy || (isReturn && !notes.trim()) || (step === 'delivered' && (ready === null || qtyBad)) || (needsAddress && !address.trim())}><NavIcon name="success" size={14} color="currentColor" /> {busy ? 'Saving…' : isReturn ? 'Record return' : step === 'in_transit' ? 'Mark in transit' : isPartial && ready !== false ? `Deliver ${qtyNum} piece${qtyNum === 1 ? '' : 's'}` : 'Confirm delivery'}</button>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

const fmtDate = (d, y = true) => (d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', ...(y ? { year: 'numeric' } : {}) }) : '—');
const schedOf = (d) => d.estimated_delivery_date ?? d.expected_delivery_date;

function DeliveryActions({ d, onModal, stop }) {
  const click = (fn) => (e) => { if (stop) e.stopPropagation(); fn(); };
  const open = click(() => onModal({ type: 'delivered', delivery: d }));
  if (d.delivery_status === 'delivered') return <button className="adm-btn" onClick={open}><NavIcon name="warning" size={13} color="currentColor" /> Record return</button>;
  const update = ['preparing', 'returned'].includes(d.delivery_status);
  return <button className="adm-btn success" onClick={open}><NavIcon name={update ? 'delivery' : 'success'} size={13} color="currentColor" /> {update ? 'Update delivery' : 'Mark delivered'}</button>;
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

  const counts = useMemo(() => deliveries.reduce((a, d) => { const s = autoStatus(d); a[s] = (a[s] ?? 0) + 1; return a; }, {}), [deliveries]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return deliveries.filter((d) => (filter === 'all' || autoStatus(d) === filter)
      && (!q || String(d.order_id).includes(q) || String(d.tracking_id).includes(q)
        || d.customer_name?.toLowerCase().includes(q) || (d.delivery_address ?? d.customer_address ?? '').toLowerCase().includes(q)));
  }, [deliveries, filter, search]);

  const tabs = [{ key: 'all', label: 'All', count: deliveries.length }, ...Object.entries(DEL_CFG).map(([k, c]) => ({ key: k, label: c.l, count: counts[k] ?? 0 }))];
  const active = (counts.ready ?? 0) + (counts.in_transit ?? 0) + (counts.partial ?? 0);
  const clearFilters = () => { setSearch(''); setFilter('all'); };

  return (
    <>
      {modal?.type === 'delivered' && <MarkDeliveredModal isMobile={isMobile} delivery={modal.delivery} onClose={() => setModal(null)} onDone={() => { setModal(null); load(true); }} />}
      {sheet && <FilterSheet title="Filter by status" options={tabs} value={filter} onChange={setFilter} onClose={() => setSheet(false)} isMobile={isMobile} />}

      <PageHeader title="Delivery Tracking" sub={`${deliveries.length} deliveries · ${active} active`}>
        <button className="adm-btn" onClick={() => load(true)}><NavIcon name="refresh" size={14} color="currentColor" /> Refresh</button>
      </PageHeader>
      {loadErr && <div style={{ marginBottom: 14 }}><ErrorBlock msg="Could not load deliveries." onRetry={() => load(true)} /></div>}

      <StatGrid loading={loading} items={Object.entries(DEL_CFG).map(([k, c]) => ({
        label: c.l, value: counts[k] ?? 0, color: filter === k ? c.c : undefined, onClick: () => setFilter(k === filter ? 'all' : k),
      }))} />

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search order, tracking #, customer, address…" label="Search deliveries" />
        <FilterButton label={`Status: ${tabs.find((t) => t.key === filter)?.label}`} onClick={() => setSheet(true)} />
      </div>
      <div className="adm-only-d"><PillTabs value={filter} onChange={setFilter} tabs={tabs} /></div>

      <div className="adm-only-d adm-tabpanel" key={filter}>
        <Panel flush>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead><tr><th>Tracking</th><th>Order</th><th>Customer</th><th>Scheduled</th><th className="adm-hide-t">Address</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {!loading && filtered.map((d, i) => {
                  const ds = autoStatus(d);
                  return (
                    <tr key={d.tracking_id ?? i}>
                      <td style={{ fontWeight: 800, color: 'var(--teal)' }}>#{d.tracking_id}</td>
                      <td style={{ fontWeight: 600 }}><OrderLink id={d.order_id}/></td>
                      <td>{d.customer_name ?? '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }}>{fmtDate(schedOf(d))}</td>
                      <td className="adm-hide-t" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-subtle)' }} title={d.delivery_address ?? d.customer_address ?? ''}>{d.delivery_address ?? d.customer_address ?? '—'}</td>
                      <td>
                        <AutoPill d={d} />
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
        {loading ? <SkeletonRows rows={3} h={140} /> : loadErr ? null : filtered.length === 0 ? (
          <div className="adm-empty"><NavIcon name="delivery" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>No deliveries found</div></div>
        ) : filtered.map((d, i) => {
          const ds = autoStatus(d);
          return (
            <div key={d.tracking_id ?? i} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': DEL_CFG[ds]?.c ?? 'var(--teal)' }}>
              <div className="adm-mrow"><b style={{ color: 'var(--teal)' }}><OrderLink id={d.order_id} prefix="Order #"/></b><AutoPill d={d} /></div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>{d.customer_name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Tracking #{d.tracking_id} · scheduled {fmtDate(schedOf(d))}</div>
              {(d.delivery_address ?? d.customer_address) && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4, display: 'flex', gap: 5 }}><NavIcon name="location" size={13} color="currentColor" style={{ flexShrink: 0, marginTop: 2 }} />{d.delivery_address ?? d.customer_address}</div>}
              {d.actual_delivery_date && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Delivered {fmtDate(d.actual_delivery_date)}</div>}
              <div className="adm-mfoot"><DeliveryActions d={d} onModal={setModal} /></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
