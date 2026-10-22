import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams }                 from 'react-router-dom';
import axios                                                  from 'axios';
import { cacheGet, cacheClear }                              from '../../utils/cache';
import { fetchResource }                                     from '../../utils/adminResources';
import { NavIcon }                                            from '../../components/ui/icons';
import { canAccessArea, isOwner, isAdmin }                    from '../../utils/jobAccess';
import ProductionProgress, { useProductionSummaries }        from '../../components/admin/ProductionProgress';
import { DataTable, Drawer, EmptyState }                      from '../../components/ui';
import useListKeys                                            from '../../hooks/useListKeys';
import { PageHeader, PillTabs, ErrorBlock, StatusPill, SearchBox, Banner, Toast, useToast, useIsMobile, FilterSheet, FilterButton } from '../../components/admin/AdminUI';

const LABEL = {
  pending:'Pending', confirmed:'Confirmed', pattern:'Pattern', segregation:'Segregation', cutting:'Cutting', sewing:'Sewing',
  qc:'QC', pressing:'Pressing', packing:'Packing', completed:'Completed', cancelled:'Cancelled',
};
const ALL_TABS = ['all', ...Object.keys(LABEL)];

const isLive = (st) => !['completed','cancelled'].includes(st);
// Orders with output to show: anything past confirmation (for_delivery included) that isn't closed.
const inProduction = (st) => isLive(st) && !['pending','confirmed'].includes(st);
const fmtDate = (d, y = false) => d ? new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', ...(y ? { year:'numeric' } : {}) }) : '—';
const dueOf = (o) => o.target_delivery_date ?? o.deadline;

function getSwatchColor(order) {
  try {
    const sc = order.studio_config;
    const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc;
    return parsed?.colors?.body ?? order.color ?? null;
  } catch {
    return order.color ?? null;
  }
}

// Staff track an order's production only if their job function includes the production area (else the route is AccessDenied).
const canTrack = () => canAccessArea(JSON.parse(localStorage.getItem('vfrb_user') || '{}'), 'production');

// Clients set their own due date and VFRB works to it, so flag orders that are late or close.
const dueFlag = (due, status) => {
  if (!due || ['completed', 'cancelled'].includes(status)) return null;
  const d = new Date(due); if (Number.isNaN(d.getTime())) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  const days = Math.round((d - t) / 86400000);
  if (days < 0) return { text: `Overdue ${-days}d`, bg: 'var(--danger-bg)', fg: 'var(--danger-text)' };
  if (days <= 3) return { text: days === 0 ? 'Due today' : `Due in ${days}d`, bg: 'var(--warning-bg)', fg: 'var(--warning-text)' };
  return null;
};
const DueChip = ({ due, status }) => {
  const f = dueFlag(due, status);
  return f ? <span style={{ display: 'inline-block', marginLeft: 6, padding: '1px 8px', borderRadius: 99, fontSize: 12, fontWeight: 800, background: f.bg, color: f.fg }}>{f.text}</span> : null;
};

function OrderDrawer({ order, summary, isManager, onConfirm, confirming, onClose, onPrev, onNext }) {
  const navigate = useNavigate();
  const due = dueOf(order);
  const track = isLive(order.status) && canTrack();
  return (
    <Drawer title={`Order #${order.order_id}`} subtitle={`${order.customer_name ?? '—'} · placed ${fmtDate(order.created_at, true)}`}
      onClose={onClose} onPrev={onPrev} onNext={onNext}
      footer={<>
        <Link className="adm-btn" to={`/admin/orders/${order.order_id}`} style={{ minHeight: 44 }}><NavIcon name="show" size={14} color="currentColor" /> Full page</Link>
        {track && (
          <button className="adm-btn" style={{ minHeight: 44 }} onClick={() => navigate(`/admin/production/${order.order_id}`)}>
            <NavIcon name="production" size={14} color="currentColor" /> Track
          </button>
        )}
        {isManager && order.status === 'pending' && (
          <button className="adm-btn primary" style={{ minHeight: 44 }} disabled={confirming === order.order_id} onClick={() => onConfirm(order.order_id)}>
            {confirming === order.order_id ? 'Confirming…' : <><NavIcon name="success" size={14} color="currentColor" /> Confirm order</>}
          </button>
        )}
      </>}>
      <div style={{ marginBottom: 14 }}><StatusPill status={order.status} label={LABEL[order.status]} /><DueChip due={due} status={order.status} /></div>
      <dl className="adm-kv" style={{ marginBottom: 16 }}>
        <dt>Type</dt><dd>{order.order_type === 'subcontract' ? 'Subcontract' : 'Direct'}</dd>
        <dt>Garment</dt><dd>{order.garment_type ?? order.design?.design_name ?? 'Custom'}</dd>
        <dt>Quantity</dt><dd>{order.quantity_ordered ?? 0} pcs</dd>
        <dt>Color</dt><dd>{order.color ?? '—'}</dd>
        <dt>Due</dt><dd>{fmtDate(due, true)}</dd>
      </dl>
      {order.client_design_notes && (
        <div style={{ marginBottom: 16 }}>
          <div className="adm-field">Customer notes</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{order.client_design_notes}</p>
        </div>
      )}
      {inProduction(order.status)
        ? <ProductionProgress summary={summary ?? undefined} orderId={order.order_id} />
        : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-subtle)' }}>{order.status === 'pending' ? 'Not confirmed yet. Production starts after confirmation.' : order.status === 'confirmed' ? 'Confirmed. Pattern stage starts next.' : 'Production closed.'}</p>}
    </Drawer>
  );
}

export default function AdminOrders() {
  const [orders,     setOrders]     = useState([]);
  const [serverTotal, setServerTotal] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [params, setParams] = useSearchParams();
  const tab = ALL_TABS.includes(params.get('status')) ? params.get('status') : 'all';
  // The status tab lives in the URL, so dashboard links like ?status=pending open on that tab.
  const setTab = useCallback((k) => setParams(k === 'all' ? {} : { status: k }, { replace: true }), [setParams]);
  const [search,     setSearch]     = useState('');
  const [confirming, setConfirming] = useState(null);
  const [toast,      setToast]      = useToast();
  const [loadErr,    setLoadErr]    = useState(false);
  const [sheet,      setSheet]      = useState(false);
  const [openId,     setOpenId]     = useState(null);
  const isMobile = useIsMobile();

  const user      = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  const isManager = isAdmin(user);

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_orders_list');
      if (cached?.list) { setOrders(cached.list); setServerTotal(cached.total); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    fetchResource('orders')
      .then(({ list, total }) => { setOrders(list); setServerTotal(total); })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const prodIds = useMemo(() => orders.filter(o => inProduction(o.status)).map(o => o.order_id), [orders]);
  const summaries = useProductionSummaries(prodIds);

  const counts = useMemo(() =>
    orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {}),
  [orders]);

  const filtered = useMemo(() =>
    orders.filter(o => {
      const matchTab = tab === 'all' || o.status === tab;
      const q = search.toLowerCase().trim();
      const matchQ = !q
        || String(o.order_id).includes(q)
        || o.customer_name?.toLowerCase().includes(q)
        || o.color?.toLowerCase().includes(q)
        || o.garment_type?.toLowerCase().includes(q)
        || o.client_design_notes?.toLowerCase().includes(q);
      return matchTab && matchQ;
    }),
  [orders, tab, search]);

  const openIdx = filtered.findIndex(o => o.order_id === openId);
  const keys = useListKeys({ count: filtered.length, onOpen: (i) => setOpenId(filtered[i]?.order_id ?? null) });
  const step = (d) => {
    const n = openIdx + d;
    if (n < 0 || n >= filtered.length) return;
    setOpenId(filtered[n].order_id); keys.setActive(n);
  };

  const confirmOrder = useCallback(async (orderId) => {
    const prev = orders;
    setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status:'confirmed' } : o));
    setConfirming(orderId);
    cacheClear('admin_orders_list');
    try {
      const r = await axios.patch(`/api/admin/orders/${orderId}/confirm`);
      // The other piece of a uniform set is confirmed with it server-side.
      const setIds = r.data?.set_confirmed_ids ?? [];
      if (setIds.length) setOrders(os => os.map(o => setIds.includes(o.order_id) ? { ...o, status:'confirmed' } : o));
      setToast({ msg: r.data?.message ?? `Order #${orderId} confirmed.`, type:'success' });
    } catch (e) {
      setOrders(prev);
      setToast({ msg: e.response?.data?.message ?? 'Could not confirm order. Please retry.', type:'error' });
    } finally {
      setConfirming(null);
    }
  }, [orders, setToast]);

  const tabs = ALL_TABS.map(k => ({ key:k, label: k === 'all' ? 'All' : LABEL[k], count: k === 'all' ? orders.length : (counts[k] ?? 0) }));
  const tabLabel = tabs.find(t => t.key === tab)?.label ?? 'All';
  const open = openIdx >= 0 ? filtered[openIdx] : null;
  const role = isOwner(user) ? 'Owner' : 'Administrator (Manager)';

  return (
    <>
      <Toast toast={toast} />
      {sheet && <FilterSheet title="Filter by status" options={tabs.map(t => ({ key:t.key, label:t.label, count:t.count }))}
        value={tab} onChange={setTab} onClose={() => setSheet(false)} isMobile={isMobile} />}
      {open && (
        <OrderDrawer order={open} summary={summaries[open.order_id]} isManager={isManager} onConfirm={confirmOrder} confirming={confirming}
          onClose={() => setOpenId(null)} onPrev={openIdx > 0 ? () => step(-1) : undefined} onNext={openIdx < filtered.length - 1 ? () => step(1) : undefined} />
      )}

      <PageHeader title="Orders" sub={`${orders.length} total · ${orders.filter(o => isLive(o.status)).length} open · ${role}`}>
        <button className="adm-btn" onClick={() => { cacheClear('admin_orders_list'); load(true); }}>
          <NavIcon name="refresh" size={14} color="currentColor" /> Refresh
        </button>
      </PageHeader>

      {loadErr && <div style={{ marginBottom:14 }}><ErrorBlock msg="Could not load orders." onRetry={() => load(true)} /></div>}
      {!loading && serverTotal != null && serverTotal > orders.length && (
        <Banner tone="warn" icon="warning">
          Showing the latest {orders.length} of {serverTotal} orders — the counts below cover only these.
        </Banner>
      )}

      <div className="adm-only-d"><PillTabs value={tab} onChange={setTab} tabs={tabs} /></div>

      <DataTable label="Orders" dense mobileCards loading={loading} rows={8}
        isEmpty={!loadErr && filtered.length === 0}
        toolbar={<>
          <SearchBox inputRef={keys.searchRef} value={search} onChange={setSearch} placeholder="Search order, customer, garment, color…" label="Search orders" />
          <div className="adm-only-m"><FilterButton label={`Status: ${tabLabel}`} onClick={() => setSheet(true)} /></div>
          <span className="ui-keyhint adm-only-d" aria-hidden="true"><span><kbd className="ui-kbd">/</kbd> search</span><span><kbd className="ui-kbd">j</kbd><kbd className="ui-kbd">k</kbd> move</span><span><kbd className="ui-kbd">Enter</kbd> open</span></span>
        </>}
        empty={<EmptyState title={search ? `No results for “${search}”` : `No ${tab === 'all' ? '' : `${LABEL[tab].toLowerCase()} `}orders`}
          action={(search || tab !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setTab('all'); }}>Clear filters</button>} />}
        footer={<span>Showing {filtered.length} of {orders.length} orders</span>}>
        <thead>
          <tr><th>Order</th><th>Customer</th><th>Garment</th><th className="num">Pcs</th><th>Status</th><th>Production</th><th>Due</th></tr>
        </thead>
        <tbody ref={keys.listRef}>
          {filtered.map((o, i) => {
            const swatch = getSwatchColor(o);
            const due = dueOf(o);
            return (
              <tr key={o.order_id} {...keys.rowProps(i)} aria-label={`Order ${o.order_id}, ${o.customer_name ?? ''}, ${LABEL[o.status] ?? o.status}`}>
                <td data-label="Order">
                  <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:10, height:10, borderRadius:3, flexShrink:0, background: swatch ?? 'var(--bg-surface)', border:'1px solid rgba(0,0,0,.1)' }} aria-hidden="true" />
                    <b style={{ color:'var(--teal)' }}>#{o.order_id}</b>
                    <span style={{ fontSize:12, color:'var(--text-faint)' }}>{fmtDate(o.created_at)}</span>
                  </span>
                </td>
                <td data-label="Customer"><div style={{ fontWeight:600, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.customer_name ?? '—'}</div></td>
                <td data-label="Garment">{o.garment_type ?? o.design?.design_name ?? 'Custom'}{o.color ? <span style={{ color:'var(--text-subtle)' }}> · {o.color}</span> : null}</td>
                <td data-label="Pcs" className="num">{o.quantity_ordered ?? 0}</td>
                <td data-label="Status"><StatusPill status={o.status} label={LABEL[o.status]} /></td>
                <td data-label="Production">{inProduction(o.status) ? <ProductionProgress compact summary={summaries[o.order_id] ?? null} /> : <span style={{ fontSize:13, color:'var(--text-faint)' }}>—</span>}</td>
                <td data-label="Due" style={{ whiteSpace:'nowrap', fontSize:13, color:'var(--text-subtle)' }}>{fmtDate(due)}<DueChip due={due} status={o.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </>
  );
}
