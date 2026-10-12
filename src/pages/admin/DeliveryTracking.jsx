import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { cacheGet, cacheSet } from '../../utils/cache';
import { NavIcon } from '../../components/ui';
import BottomSheet from '../../components/ui/BottomSheet';
import { PageHeader, StatGrid, PillTabs, Panel, StatusPill, SearchBox, ErrorBlock, SkeletonRows, FilterSheet, FilterButton, useIsMobile, OrderLink } from '../../components/admin/AdminUI';

const DEL_CFG = {
  preparing:  { l:'Preparing',  c:'var(--warning)', bg:'var(--warning-bg)' },
  dispatched: { l:'Dispatched', c:'var(--info)',     bg:'var(--info-bg)'    },
  in_transit: { l:'In Transit', c:'var(--purple)',   bg:'var(--purple-50)'  },
  delivered:  { l:'Delivered',  c:'var(--success)',  bg:'var(--success-bg)' },
  returned:   { l:'Returned',   c:'var(--danger)',   bg:'var(--danger-bg)'  },
};

const METHODS = ['cash','gcash','ewallet','bank_transfer'];
const TERMS   = ['full_payment','down_payment','net_30'];
const METHOD_LABEL = { cash:'Cash', gcash:'GCash', ewallet:'E-Wallet', bank_transfer:'Bank Transfer' };

function MarkDeliveredModal({ delivery, onClose, onDone, isMobile }) {
  const [notes, setNotes] = useState('');
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const [warn,  setWarn]  = useState('');
  const [marked, setMarked] = useState(false);

  const [recordPayment, setRecordPayment] = useState(true);
  const [amountPaid,    setAmountPaid]    = useState('');
  const [method,        setMethod]        = useState('cash');
  const [terms,         setTerms]         = useState('down_payment');
  const [orNumber,      setOrNumber]      = useState('');

  const submit = async () => {
    setBusy(true); setErr(''); setWarn('');
    try {
      await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/delivered`, { notes });
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
    <BottomSheet title={`Mark order #${delivery.order_id} delivered`} onClose={marked ? onDone : onClose} isMobile={isMobile} maxWidth={480}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <label><span className="adm-field">Delivery notes</span>
          <textarea className="adm-input" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} disabled={marked}
            placeholder="e.g. Received by the principal, complete, no damage…" />
        </label>

        <label className="adm-mrow" style={{ cursor:'pointer', fontSize:13, fontWeight:700, minHeight:44 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><NavIcon name="salesPay" size={14} color="currentColor" /> Record a payment with this delivery</span>
          <input type="checkbox" checked={recordPayment} onChange={e=>setRecordPayment(e.target.checked)} disabled={marked} style={{ width:20, height:20 }} />
        </label>

        {recordPayment && !marked && (
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
              <button className="adm-btn success" onClick={submit} disabled={busy}><NavIcon name="success" size={14} color="currentColor" /> {busy ? 'Saving…' : 'Confirm delivery'}</button>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

function UpdateStatusModal({ delivery, onClose, onDone, isMobile }) {
  const [status, setStatus] = useState(delivery.delivery_status ?? 'preparing');
  const [notes,  setNotes]  = useState('');
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      await axios.patch(`/api/admin/delivery/${delivery.tracking_id}/status`, { delivery_status: status, notes });
      onDone();
    } catch (e) { setErr(e.response?.data?.message ?? 'Could not update the status.'); }
    finally { setBusy(false); }
  };

  return (
    <BottomSheet title={`Delivery status · order #${delivery.order_id}`} onClose={onClose} isMobile={isMobile} maxWidth={420}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div className="adm-sheet-list" role="radiogroup" aria-label="Delivery status" style={{ margin:'-8px -8px 0' }}>
          {Object.entries(DEL_CFG).map(([k, cfg]) => (
            <button key={k} type="button" role="radio" aria-checked={status === k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><i style={{ width:10, height:10, borderRadius:'50%', background:cfg.c }} />{cfg.l}</span>
              {status === k && <NavIcon name="success" size={14} color="currentColor" />}
            </button>
          ))}
        </div>
        <label><span className="adm-field">Notes (optional)</span>
          <textarea className="adm-input" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} />
        </label>
        {err && <ErrorBlock msg={err} />}
        <div className="adm-sheet-foot">
          <button className="adm-btn" onClick={onClose}>Cancel</button>
          <button className="adm-btn primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Update status'}</button>
        </div>
      </div>
    </BottomSheet>
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
      {modal?.type === 'delivered' && <MarkDeliveredModal isMobile={isMobile} delivery={modal.delivery} onClose={() => setModal(null)} onDone={() => { setModal(null); load(true); }} />}
      {modal?.type === 'status' && <UpdateStatusModal isMobile={isMobile} delivery={modal.delivery} onClose={() => setModal(null)} onDone={() => { setModal(null); load(true); }} />}
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
                      <td style={{ fontWeight: 600 }}><OrderLink id={d.order_id}/></td>
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
        {loading ? <SkeletonRows rows={3} h={140} /> : loadErr ? null : filtered.length === 0 ? (
          <div className="adm-empty"><NavIcon name="delivery" size={30} color="currentColor" /><div style={{ marginTop: 8, fontWeight: 700 }}>No deliveries found</div></div>
        ) : filtered.map((d, i) => {
          const ds = d.delivery_status ?? 'preparing';
          return (
            <div key={d.tracking_id ?? i} className="adm-mcard accent" style={{ '--i': Math.min(i, 8), '--acc': DEL_CFG[ds]?.c ?? 'var(--teal)' }}>
              <div className="adm-mrow"><b style={{ color: 'var(--teal)' }}><OrderLink id={d.order_id} prefix="Order #"/></b><StatusPill status={ds} label={DEL_CFG[ds]?.l} /></div>
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
