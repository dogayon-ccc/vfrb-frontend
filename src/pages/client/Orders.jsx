// src/pages/client/Orders.jsx — Orders list: search, sort, status chips, visual order cards with the 5-step strip
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { asList } from '../../utils/asList';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import EmptyState from '../../components/EmptyState';
import { Card, Button, PageHeader, Stepper, Skeleton } from '../../components/ui';
import {
  Chips, StatusPill, OrderThumb, LIFECYCLE, lifecycleIndex, GROUPS, orderTitle, fmtDate,
} from '../../components/customer/kit';

const SORTS = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'due', label: 'Due date' },
];

function OrderCard({ o, onOpen }) {
  const done = o.status === 'completed' || o.status === 'cancelled';
  return (
    <Card as={motion.button} type="button" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      interactive padding="none" onClick={onOpen} className="ox-card" aria-label={`View order ${o.order_id}, ${orderTitle(o)}`}>
      <div className="ox-top">
        <span className="ox-thumb"><OrderThumb order={o} size={64} /></span>
        <span className="ox-txt">
          <small>Order #{o.order_id}</small>
          <strong>{orderTitle(o)}</strong>
          <span>{o.quantity_ordered ?? 0} pcs{o.target_delivery_date ? ` · Due ${fmtDate(o.target_delivery_date, { month: 'short', day: 'numeric' })}` : ''}</span>
        </span>
        <StatusPill status={o.status} />
      </div>
      {!done && <div className="ox-steps"><Stepper steps={LIFECYCLE} current={lifecycleIndex(o.status)} label={`Order ${o.order_id} progress`} /></div>}
      <div className="ox-foot"><span>Ordered {fmtDate(o.created_at)}</span><b>View details</b></div>
    </Card>
  );
}

export default function CustomerOrders() {
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('new');

  const load = useCallback((force = false) => {
    if (force) cacheClear('orders_list');
    const cached = cacheGet('orders_list');
    if (cached) { setOrders(asList(cached)); setError(false); setLoading(false); return; }
    setLoading(true);
    axios.get('/api/customer/orders')
      .then(r => { const l = asList(r.data); setOrders(l); setError(false); cacheSet('orders_list', l, TTL?.ORDERS ?? 30_000); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => Object.fromEntries(GROUPS.map(g => [g.id, orders.filter(o => g.test(o.status)).length])), [orders]);

  const list = useMemo(() => {
    const g = GROUPS.find(x => x.id === group) ?? GROUPS[0];
    const q = search.toLowerCase().trim();
    const out = orders.filter(o => g.test(o.status) && (!q
      || String(o.order_id).includes(q)
      || orderTitle(o).toLowerCase().includes(q)
      || o.garment_type?.toLowerCase().includes(q)
      || o.color?.toLowerCase().includes(q)
      || o.client_design_notes?.toLowerCase().includes(q)));
    const t = (d, miss = 0) => (d ? new Date(d).getTime() : miss);
    return out.sort((a, b) => sort === 'old' ? t(a.created_at) - t(b.created_at)
      : sort === 'due' ? t(a.target_delivery_date, 8.64e15) - t(b.target_delivery_date, 8.64e15)
      : t(b.created_at) - t(a.created_at));
  }, [orders, group, search, sort]);

  const chips = GROUPS.map(g => ({ id: g.id, label: g.label, count: counts[g.id] }));
  const blank = group === 'all' && !search;

  return (
    <div className="cx-page">
      <PageHeader title="My Orders"
        subtitle={loading ? 'Loading your orders…' : orders.length ? `${orders.length} order${orders.length !== 1 ? 's' : ''} total` : 'No orders yet'}>
        <Button variant="primary" icon="add" onClick={() => nav('/order/create')}>New order</Button>
      </PageHeader>

      <div className="ox-tools">
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
      </div>

      {loading ? (
        <div className="ox-grid">
          {[1, 2, 3].map(i => <Card key={i} padding="sm"><Skeleton variant="text" count={3} label="Loading orders" /></Card>)}
        </div>
      ) : error ? (
        <EmptyState illustration="error" headline="Couldn't load your orders"
          sub="Something went wrong reaching the server. Check your connection and try again."
          cta={{ label: 'Retry', onClick: () => load(true) }} />
      ) : list.length === 0 ? (
        <EmptyState illustration="order"
          headline={search ? `No results for "${search}"` : blank ? "You haven't placed an order yet" : 'No orders in this filter'}
          sub={blank ? 'Design your uniform and place your first order.' : 'Try a different filter or clear your search.'}
          cta={blank ? { label: 'Start a design', onClick: () => nav('/design-studio') } : { label: 'Clear filters', onClick: () => { setSearch(''); setGroup('all'); } }} />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="ox-grid">{list.map(o => <OrderCard key={o.order_id} o={o} onOpen={() => nav(`/orders/${o.order_id}`)} />)}</div>
        </AnimatePresence>
      )}
    </div>
  );
}
