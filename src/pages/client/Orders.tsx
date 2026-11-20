import { useState, useEffect, useCallback, useMemo } from 'react';
import usePageTitle from '../../hooks/usePageTitle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { asList } from '../../utils/asList';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import EmptyState from '../../components/EmptyState';
import { Button, PageHeader, Skeleton } from '../../components/ui';
import {
  Chips, StatusPill, OrderThumb, LIFECYCLE, lifecycleIndex, GROUPS, orderTitle, fmtDate, parseCfg, groupOrders,
} from '../../components/customer/kit';
import { ROLE_LABEL } from './design-studio/uniformSet';
import { reorderDesign } from '../../utils/designActions';
import '../../styles/customer-home.css';

const SORTS = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'due', label: 'Due date' },
];

const isOpen = (o: any) => o.status !== 'completed' && o.status !== 'cancelled';

// One slim progress line instead of a five-step tracker per order.
function Progress({ o }: any) {
  if (!isOpen(o)) return null;
  const i = lifecycleIndex(o.status);
  return (
    <span className="ox-prog" role="img" aria-label={`Order ${o.order_id}: step ${i + 1} of ${LIFECYCLE.length}, ${LIFECYCLE[i]}`}>
      <span className="ox-prog-bar"><i style={{ width: `${((i + 1) / LIFECYCLE.length) * 100}%` }} /></span>
      <small>{LIFECYCLE[i]}</small>
    </span>
  );
}

function Row({ o, onOpen, onReorder, showStatus = true, role }: any) {
  const cfg = parseCfg(o);
  const canReorder = Object.keys(cfg).length > 0 && o.status !== 'pending'; // a pending order is still under VFRB review
  return (
    <li className="ox-row">
      <button type="button" className="ox-row-open" onClick={onOpen} aria-label={`View order ${o.order_id}, ${orderTitle(o)}`}>
        <span className="ox-thumb"><OrderThumb order={o} size={52} /></span>
        <span className="ox-main">
          <strong>{role ? `${role}: ` : ''}{orderTitle(o)}</strong>
          <small>Order #{o.order_id} · {o.quantity_ordered ?? 0} pcs · Ordered {fmtDate(o.created_at)}</small>
        </span>
        <span className="ox-due">{o.target_delivery_date ? <><small>Due</small>{fmtDate(o.target_delivery_date)}</> : <small>No due date yet</small>}</span>
        <Progress o={o} />
        {showStatus && <StatusPill status={o.status} />}
      </button>
      {canReorder && <Button size="sm" onClick={() => onReorder({ config: cfg })} aria-label={`Reorder order #${o.order_id}`}>Reorder</Button>}
    </li>
  );
}

function Group({ g, onOpen, onReorder }: any) {
  if (g.pieces.length === 1) return <ul className="ox-card"><Row o={g.pieces[0]} onOpen={() => onOpen(g.pieces[0])} onReorder={onReorder} /></ul>;
  // Legacy uniform set: the pieces were placed as separate orders. They stay separate records; only the display is joined.
  const same = g.pieces.every((p: any) => p.status === g.pieces[0].status);
  return (
    <section className="ox-card ox-set-card" aria-label={`Uniform set, orders ${g.pieces.map((p: any) => `#${p.order_id}`).join(' and ')}`}>
      <header><b>Uniform set</b><small>{g.pieces.length} orders, one per piece</small>{same && <StatusPill status={g.pieces[0].status} />}</header>
      <ul>{g.pieces.map((p: any) => <Row key={p.order_id} o={p} showStatus={!same} role={ROLE_LABEL[parseCfg(p).uniformSet?.role]} onOpen={() => onOpen(p)} onReorder={onReorder} />)}</ul>
    </section>
  );
}

export default function CustomerOrders() {
  usePageTitle('My Orders');
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sp] = useSearchParams(); // ?status=<group id>
  const [group, setGroup] = useState(() => (GROUPS.some(g => g.id === sp.get('status')) ? sp.get('status') : 'all'));
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('new');
  const [actErr, setActErr] = useState('');
  const reorder = (d) => { setActErr(''); if (!reorderDesign(d, nav)) setActErr('Could not start the order in this browser. Try again.'); };

  const load = useCallback((force = false) => {
    if (force) cacheClear('orders_list');
    const cached = cacheGet('orders_list');
    if (cached) { setOrders(asList(cached)); setError(false); setLoading(false); return; }
    setLoading(true);
    fetchAllPages('/api/customer/orders')
      .then(l => { setOrders(l); setError(false); cacheSet('orders_list', l, TTL?.ORDERS ?? 30_000); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(GROUPS.map(g => [g.id, orders.filter(o => g.test(o.status)).length])), [orders]);

  const list = useMemo(() => {
    const g = GROUPS.find(x => x.id === group) ?? GROUPS[0];
    const q = search.toLowerCase().trim();
    const hit = (o: any) => g.test(o.status) && (!q
      || String(o.order_id).includes(q)
      || orderTitle(o).toLowerCase().includes(q)
      || o.garment_type?.toLowerCase().includes(q)
      || o.color?.toLowerCase().includes(q)
      || o.client_design_notes?.toLowerCase().includes(q));
    const t = (d, miss = 0) => (d ? new Date(d).getTime() : miss);
    const key = (x: any, f) => Math[f === 'max' ? 'max' : 'min'](...x.pieces.map((p: any) => t(p.created_at)));
    const due = (x: any) => Math.min(...x.pieces.map((p: any) => t(p.target_delivery_date, 8.64e15)));
    // A set stays whole if any of its pieces matches the filter or search.
    return groupOrders(orders).filter(x => x.pieces.some(hit)).sort((a, b) => sort === 'old' ? key(a, 'min') - key(b, 'min')
      : sort === 'due' ? due(a) - due(b) : key(b, 'max') - key(a, 'max'));
  }, [orders, group, search, sort]);

  const chips = GROUPS.map(g => ({ id: g.id, label: g.label, count: counts[g.id] }));
  const blank = group === 'all' && !search;

  return (
    <div className="cx-page">
      <PageHeader title="My Orders"
        subtitle={loading ? 'Loading your orders…' : orders.length ? `${orders.length} order${orders.length !== 1 ? 's' : ''} total` : 'No orders yet'}>
        <Button variant="primary" icon="add" onClick={() => nav('/order/create')}>New uniform-set order</Button>
      </PageHeader>

      {orders.length > 0 && <div className="ox-tools">
        <div className="ox-search-row">
          <div className="ox-search">
            <label htmlFor="ord-q" className="sr-only">Search orders</label>
            <input id="ord-q" type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by order ID, garment, color…" className="cx-in" />
          </div>
          <label htmlFor="ord-sort" className="sr-only">Sort orders</label>
          <select id="ord-sort" value={sort} onChange={e => setSort(e.target.value)} className="cx-in cx-sel">
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <Chips items={chips} value={group} onChange={setGroup} label="Filter orders by status" />
      </div>}

      {actErr && <p role="alert" className="mx-err">{actErr}</p>}
      {loading ? (
        <div className="ox-list">{[1, 2, 3].map(i => <Skeleton key={i} variant="block" height={76} label="Loading orders" />)}</div>
      ) : error ? (
        <EmptyState illustration="error" headline="Couldn't load your orders"
          sub="Check your connection and try again."
          cta={{ label: 'Retry', onClick: () => load(true) }} />
      ) : list.length === 0 ? (
        <EmptyState illustration="order"
          headline={search ? `No results for "${search}"` : blank ? "You haven't placed an order yet" : 'No orders in this filter'}
          sub={blank ? 'Upload a picture or drawing of the complete uniform to place your first order.' : 'Try a different filter or clear your search.'}
          cta={blank ? { label: 'Start a uniform-set order', onClick: () => nav('/order/create') } : { label: 'Clear filters', onClick: () => { setSearch(''); setGroup('all'); } }} />
      ) : (
        <div className="ox-list">{list.map(g => <Group key={g.key} g={g} onOpen={(o) => nav(`/orders/${o.order_id}`)} onReorder={reorder} />)}</div>
      )}
    </div>
  );
}
