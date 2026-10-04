// src/pages/client/Orders.jsx — Orders list (wireframe: filter chips, table on desktop, cards on mobile)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { asList } from '../../utils/asList';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import EmptyState from '../../components/EmptyState';
import {
  PageHeader, Chips, StatusPill, OrderThumb, Skeleton, Stepper, LIFECYCLE, lifecycleIndex,
  GROUPS, orderTitle, fmtDate,
} from '../../components/customer/kit';

const SORTS = [
  { id: 'new', label: 'Newest first' },
  { id: 'old', label: 'Oldest first' },
  { id: 'due', label: 'Due date' },
];

function MobileCard({ o, onOpen }) {
  const done = o.status === 'completed' || o.status === 'cancelled';
  return (
    <motion.button layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      whileTap={{ scale: .99 }} onClick={onOpen} className="cx-card"
      aria-label={`View order ${o.order_id}, ${orderTitle(o)}`}
      style={{ width: '100%', textAlign: 'left', padding: 14, cursor: 'pointer', font: 'inherit', color: 'inherit', display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <OrderThumb order={o} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-faint)' }}>ORDER #{o.order_id}</p>
          <p style={{ margin: '2px 0 4px', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orderTitle(o)}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-subtle)' }}>
            {o.quantity_ordered ?? 0} pcs{o.target_delivery_date ? ` · Due ${fmtDate(o.target_delivery_date, { month: 'short', day: 'numeric' })}` : ''}
          </p>
        </div>
        <StatusPill status={o.status} />
      </div>
      {!done && <div style={{ marginTop: 14 }}><Stepper steps={LIFECYCLE} current={lifecycleIndex(o.status)} /></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-faint)' }}>
        <span>{fmtDate(o.created_at)}</span>
        <span style={{ color: 'var(--teal)', fontWeight: 700 }}>View details →</span>
      </div>
    </motion.button>
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
      || o.design?.design_name?.toLowerCase().includes(q)
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
        <button className="cx-btn cx-btn-p" onClick={() => nav('/order/create')}><NavIcon name="add" size={14} color="#fff" /> New Order</button>
      </PageHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <div className="cx-ord-tools">
          <div style={{ position: 'relative', flex: 1 }}>
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
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="cx-card" style={{ padding: 14, display: 'flex', gap: 12 }}>
            <Skeleton h={52} w={52} /><div style={{ flex: 1 }}><Skeleton h={12} w="35%" /><Skeleton h={16} w="65%" style={{ marginTop: 8 }} /></div></div>)}
        </div>
      ) : error ? (
        <EmptyState illustration="error" headline="Couldn't load your orders"
          sub="Something went wrong reaching the server. Check your connection and try again."
          cta={{ label: 'Retry', onClick: () => load(true) }} />
      ) : list.length === 0 ? (
        <EmptyState illustration="order"
          headline={search ? `No results for "${search}"` : blank ? "You haven't placed an order yet" : 'No orders in this filter'}
          sub={blank ? 'Design your uniform and place your first order.' : 'Try a different filter or clear your search.'}
          cta={blank ? { label: 'Start Designing →', onClick: () => nav('/design-studio') } : { label: 'Clear filters', onClick: () => { setSearch(''); setGroup('all'); } }} />
      ) : (
        <>
          {/* Desktop / tablet-landscape: table */}
          <div className="cx-card cx-only-d" style={{ overflow: 'hidden' }}>
            <table className="cx-tbl">
              <thead><tr><th>Order</th><th>Garment</th><th>Qty</th><th>Ordered</th><th>Due</th><th>Status</th><th aria-label="Open" /></tr></thead>
              <tbody>
                {list.map(o => (
                  <tr key={o.order_id} tabIndex={0} onClick={() => nav(`/orders/${o.order_id}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(`/orders/${o.order_id}`); } }}
                    aria-label={`View order ${o.order_id}`}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><OrderThumb order={o} size={40} />
                      <div style={{ minWidth: 0 }}><b style={{ fontSize: 13 }}>#{o.order_id}</b>
                        <div style={{ fontSize: 12, color: 'var(--text-subtle)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orderTitle(o)}</div></div></div></td>
                    <td>{o.garment_type ?? '—'}</td>
                    <td>{o.quantity_ordered ?? 0} pcs</td>
                    <td>{fmtDate(o.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>{fmtDate(o.target_delivery_date, { month: 'short', day: 'numeric' })}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td style={{ color: 'var(--teal)', fontWeight: 700, fontSize: 12 }}>View →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile / tablet-portrait: cards */}
          <div className="cx-only-m">
            <AnimatePresence mode="popLayout">
              <div className="cx-ord-cards">{list.map(o => <MobileCard key={o.order_id} o={o} onOpen={() => nav(`/orders/${o.order_id}`)} />)}</div>
            </AnimatePresence>
          </div>
        </>
      )}
      <style>{`
        .cx-ord-tools{display:flex;gap:10px;flex-direction:column}
        @media(min-width:560px){.cx-ord-tools{flex-direction:row}}
        .cx-ord-cards{display:grid;gap:12px;grid-template-columns:1fr}
        @media(min-width:640px){.cx-ord-cards{grid-template-columns:1fr 1fr}}
      `}</style>
    </div>
  );
}
