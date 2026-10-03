// src/pages/admin/Orders.jsx
// FIX (Sony Mark, Sept 10 2026): hex→var(--...) token migration — 86
// literal hex replaced with real tokens. IMPORTANT CORRECTION mid-fix:
// theme.css has a dedicated --status-pending/--status-confirmed/
// --status-pattern/.../--status-cancelled palette (11 tokens) whose hex
// values match this file's ORIGINAL 11-status colors exactly — the
// first pass here mistakenly reused generic --purple/--teal/--warning
// (the ActivityLog.jsx/ProductionList.jsx "hue shortage" pattern),
// before discovering these dedicated tokens existed. Corrected to use
// the real --status-* tokens directly — no hue-sharing compromise
// needed for this file after all. Worth flagging: ProductionList.jsx/
// ActivityLog.jsx's own "hue shortage" documentation may predate these
// tokens and could be worth revisiting, not touched here (out of scope
// for this file's fix).
// Emoji (⏳✅📐🗂️✂️🧵🔍🔧📦🎉✕👁✓👑📋) → NavIcon, all keys verified to
// exist in icons.jsx already except `manager` (Crown) — added, verified
// against the real installed lucide-react first. Logic (status filters,
// confirm/cancel flow, pipeline strip, caching) untouched.
// FF-2 Step 5 — Admin Orders
//
// PRESERVED from uploaded source:
//   - FF-1 fix: goTrack navigates to /admin/production/:order_id ✓
//   - STATUS_CFG with all 11 statuses ✓
//   - PipelineStrip mini dots ✓
//   - Tab filter + search logic ✓
//   - Manager banner + isManager guard ✓
//   - Skeleton loaders ✓
//
// ADDED in FF-2:
//   - cacheGet/cacheSet (TTL.ORDERS = 30s) — no cold fetch on every mount
//   - cacheClear on Refresh so forced reload always gets fresh data
//   - useMemo for counts — O(n) only when orders changes, not every render
//   - Color swatch dot on each row (from order.color or studio_config.colors.body)
//   - Mobile card view (≤767px): replaces table with stacked cards
//   - Confirm order button for manager (PATCH /api/admin/orders/:id/confirm)
//   - Optimistic UI on confirm: instant status change → rollback on error
//   - 4K: content auto-centers via parent layout token
//
// DSA annotations:
//   counts:    useMemo + reduce — O(n) once per orders change
//   filtered:  filter + String.includes — O(n) per keystroke (debounced)
//   STATUS_SEQ: object as hash map — O(1) status → color/label/icon lookup

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate }                                        from 'react-router-dom';
import axios                                                  from 'axios';
import { cacheGet, cacheSet, cacheClear, TTL }               from '../../utils/cache';
import { NavIcon }                                            from '../../components/ui/icons';
import { PageHeader, StatGrid, PillTabs, ErrorBlock, Panel, StatusPill, SearchBox, Segments, Banner, Toast, useToast, useIsMobile, FilterSheet, FilterButton, SkeletonRows } from '../../components/admin/AdminUI';


// ── Status config — O(1) lookup hash map ──────────────────────────────────────
// DSA: JavaScript object used as hash map: status string → style/label O(1)
const STATUS_CFG = {
  pending:     { color:'var(--status-pending)',     bg:'var(--warning-bg)', label:'Pending',     icon:'pending',     seq:0  },
  confirmed:   { color:'var(--status-confirmed)',   bg:'var(--info-bg)',    label:'Confirmed',   icon:'success',     seq:1  },
  pattern:     { color:'var(--status-pattern)',     bg:'var(--purple-50)',  label:'Pattern',     icon:'pattern',     seq:2  },
  segregation: { color:'var(--status-segregation)', bg:'var(--purple-50)',  label:'Segregation', icon:'segregation', seq:3  },
  cutting:     { color:'var(--status-cutting)',     bg:'var(--info-bg)',    label:'Cutting',     icon:'cutting',     seq:4  },
  sewing:      { color:'var(--status-sewing)',      bg:'var(--teal-50)',    label:'Sewing',      icon:'garmentType', seq:5  },
  qc:          { color:'var(--status-qc)',          bg:'var(--warning-bg)', label:'QC',          icon:'qc',          seq:6  },
  pressing:    { color:'var(--status-pressing)',    bg:'var(--purple-50)',  label:'Pressing',    icon:'pressing',    seq:7  },
  packing:     { color:'var(--status-packing)',     bg:'var(--success-bg)',label:'Packing',     icon:'package',     seq:8  },
  completed:   { color:'var(--status-completed)',   bg:'var(--success-bg)',label:'Completed',   icon:'success',     seq:9  },
  cancelled:   { color:'var(--status-cancelled)', bg:'var(--danger-bg)', label:'Cancelled',   icon:'close',  seq:-1 },
};

const ALL_TABS = [
  'all','pending','confirmed',
  'pattern','segregation','cutting','sewing','qc','pressing','packing',
  'completed','cancelled',
];

const PROD_STAGES = ['confirmed','pattern','segregation','cutting','sewing','qc','pressing','packing'];
const isLive = (st) => !['completed','cancelled'].includes(st);
const fmtDate = (d, y = false) => d ? new Date(d).toLocaleDateString('en-PH', { month:'short', day:'numeric', ...(y ? { year:'numeric' } : {}) }) : '—';

// Segmented stage bar: index of current stage among the 8 production stages
function StageBar({ status }) {
  if (!isLive(status)) return null;
  const idx = status === 'pending' ? -1 : PROD_STAGES.indexOf(status);
  return (
    <div style={{ minWidth:96 }}>
      <Segments total={PROD_STAGES.length} index={idx < 0 ? 0 : idx} />
      <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:4 }}>
        {idx < 0 ? 'Awaiting confirmation' : `Stage ${idx + 1} of ${PROD_STAGES.length}`}
      </div>
    </div>
  );
}

function getSwatchColor(order) {
  try {
    const sc = order.studio_config;
    const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc;
    return parsed?.colors?.body ?? order.color ?? null;
  } catch {
    return order.color ?? null;
  }
}

function OrderActions({ order, isManager, onConfirm, confirming, stop, hideView }) {
  const navigate = useNavigate();
  const live = isLive(order.status);
  const click = (fn) => (e) => { if (stop) e.stopPropagation(); fn(); };
  return (
    <>
      {live && !isManager && (
        <button className="adm-btn primary" onClick={click(() => navigate(`/admin/production/${order.order_id}`))}>
          <NavIcon name="production" size={13} color="currentColor" /> Track
        </button>
      )}
      {!hideView && (
        <button className="adm-btn" onClick={click(() => navigate(`/admin/orders/${order.order_id}`))}>
          <NavIcon name="show" size={13} color="currentColor" /> View
        </button>
      )}
      {isManager && order.status === 'pending' && (
        <button className="adm-btn success" disabled={confirming === order.order_id}
          onClick={click(() => onConfirm(order.order_id))}>
          {confirming === order.order_id ? '…' : <><NavIcon name="success" size={13} color="currentColor" /> Confirm</>}
        </button>
      )}
    </>
  );
}

function OrderRow({ order, isManager, onConfirm, confirming }) {
  const navigate = useNavigate();
  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const swatch = getSwatchColor(order);
  const due = order.target_delivery_date ?? order.deadline;
  const open = () => navigate(`/admin/orders/${order.order_id}`);
  return (
    <tr className="adm-row" tabIndex={0} onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter') open(); }}>
      <td>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:12, height:12, borderRadius:4, flexShrink:0, background: swatch ?? 'var(--bg-surface)', border:'1px solid rgba(0,0,0,.1)' }} />
          <div>
            <div style={{ fontWeight:800, color:'var(--teal)' }}>#{order.order_id}</div>
            <div style={{ fontSize:11, color:'var(--text-faint)' }}>{fmtDate(order.created_at)}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ fontWeight:600, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{order.customer_name ?? '—'}</div>
        <div style={{ fontSize:11, color:'var(--text-subtle)' }}>{order.order_type === 'direct' ? 'Direct' : 'Institutional'}</div>
      </td>
      <td>
        <div style={{ fontWeight:600 }}>{order.garment_type ?? order.design?.design_name ?? 'Custom'}</div>
        <div style={{ fontSize:11, color:'var(--text-subtle)' }}>{order.quantity_ordered ?? 0} pcs{order.color ? ` · ${order.color}` : ''}</div>
      </td>
      <td>
        <StatusPill status={order.status} label={cfg.label} />
        <div className="adm-only-d" style={{ marginTop:8 }}><StageBar status={order.status} /></div>
        <div className="adm-hide-d-t" style={{ fontSize:10, color:'var(--text-faint)', marginTop:4 }}>{due ? `Due ${fmtDate(due)}` : ''}</div>
      </td>
      <td className="adm-hide-t" style={{ whiteSpace:'nowrap', color:'var(--text-subtle)', fontSize:12 }}>{fmtDate(due, true)}</td>
      <td>
        <div className="adm-ra" style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
          <OrderActions order={order} isManager={isManager} onConfirm={onConfirm} confirming={confirming} stop />
        </div>
      </td>
    </tr>
  );
}

function OrderCard({ order, isManager, onConfirm, confirming, index }) {
  const navigate = useNavigate();
  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
  const swatch = getSwatchColor(order);
  const due = order.target_delivery_date ?? order.deadline;
  return (
    <div className="adm-mcard accent" style={{ '--i': Math.min(index, 8), '--acc': swatch ?? 'var(--teal)' }}
      onClick={() => navigate(`/admin/orders/${order.order_id}`)}>
      <div className="adm-mrow">
        <span style={{ fontSize:14, fontWeight:800, color:'var(--teal)' }}>#{order.order_id}</span>
        <StatusPill status={order.status} label={cfg.label} />
      </div>
      <div style={{ marginTop:8, fontSize:14, fontWeight:700, color:'var(--ink)' }}>{order.customer_name ?? '—'}</div>
      <div style={{ fontSize:12, color:'var(--text-subtle)', marginTop:2 }}>
        {order.garment_type ?? 'Custom'} · {order.quantity_ordered ?? 0} pcs{order.color ? ` · ${order.color}` : ''}
      </div>
      {due && <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:2 }}>Due {fmtDate(due, true)}</div>}
      {isLive(order.status) && <div style={{ marginTop:10 }}><StageBar status={order.status} /></div>}
      {((isLive(order.status) && !isManager) || (isManager && order.status === 'pending')) && (
        <div className="adm-mfoot">
          <OrderActions order={order} isManager={isManager} onConfirm={onConfirm} confirming={confirming} stop hideView />
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('all');
  const [search,     setSearch]     = useState('');
  const [confirming, setConfirming] = useState(null);
  const [toast,      setToast]      = useToast();
  const [loadErr,    setLoadErr]    = useState(false);
  const [sheet,      setSheet]      = useState(false);
  const isMobile = useIsMobile();

  const user      = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  const isManager = user.role === 'manager';

  const load = useCallback((force = false) => {
    if (!force) {
      const cached = cacheGet('admin_orders_list');
      if (cached) { setOrders(cached); setLoading(false); return; }
    }
    setLoading(true); setLoadErr(false);
    axios.get('/api/admin/orders')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setOrders(list);
        cacheSet('admin_orders_list', list, TTL.ORDERS);
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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

  // Optimistic confirm — rolls back on failure. PATCH /confirm only returns {message,new_stage} or {message}.
  const confirmOrder = useCallback(async (orderId) => {
    const prev = orders;
    setOrders(os => os.map(o => o.order_id === orderId ? { ...o, status:'confirmed' } : o));
    setConfirming(orderId);
    cacheClear('admin_orders_list');
    try {
      await axios.patch(`/api/admin/orders/${orderId}/confirm`);
      setToast({ msg:`Order #${orderId} confirmed.`, type:'success' });
    } catch (e) {
      setOrders(prev);
      setToast({ msg: e.response?.data?.message ?? 'Could not confirm order. Please retry.', type:'error' });
    } finally {
      setConfirming(null);
    }
  }, [orders, setToast]);

  const tabs = ALL_TABS.map(k => ({ key:k, label: k === 'all' ? 'All' : (STATUS_CFG[k]?.label ?? k), count: k === 'all' ? orders.length : (counts[k] ?? 0) }));
  const activeCount = orders.filter(o => isLive(o.status)).length;
  const tabLabel = tabs.find(t => t.key === tab)?.label ?? 'All';

  return (
    <>
      <Toast toast={toast} />
      {sheet && <FilterSheet title="Filter by status" options={tabs.map(t => ({ key:t.key, label:t.label, count:t.count }))}
        value={tab} onChange={setTab} onClose={() => setSheet(false)} isMobile={isMobile} />}

      <PageHeader title="Orders" sub={`${orders.length} total · ${isManager ? 'View mode (Manager)' : 'Operational access (Staff)'}`}>
        <button className="adm-btn" onClick={() => { cacheClear('admin_orders_list'); load(true); }}>
          <NavIcon name="refresh" size={14} color="currentColor" /> Refresh
        </button>
      </PageHeader>

      {isManager && (
        <Banner tone="info" icon="manager">
          Manager view — review and confirm pending orders. Stage advancement is Staff-only.
        </Banner>
      )}
      {loadErr && <div style={{ marginBottom:14 }}><ErrorBlock msg="Could not load orders." onRetry={() => load(true)} /></div>}

      <StatGrid loading={loading} items={[
        { label:'Total',     value:orders.length },
        { label:'Active',    value:activeCount, color:'var(--teal)', onClick:() => setTab('all') },
        { label:'Pending',   value:counts.pending ?? 0, color:'var(--warning-text)', onClick:() => setTab('pending') },
        { label:'Completed', value:counts.completed ?? 0, color:'var(--success)', onClick:() => setTab('completed') },
        { label:'Cancelled', value:counts.cancelled ?? 0, color:'var(--danger)', onClick:() => setTab('cancelled') },
      ]} />

      <div className="adm-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search order, client, garment, color…" label="Search orders" />
        <FilterButton label={`Status: ${tabLabel}`} onClick={() => setSheet(true)} />
      </div>
      <div className="adm-only-d"><PillTabs value={tab} onChange={setTab} tabs={tabs} /></div>

      <div className="adm-only-d">
        <Panel flush>
          <div className="adm-tbl-scroll">
            <table className="adm-table">
              <thead>
                <tr><th>Order</th><th>Client</th><th>Garment</th><th>Status</th><th className="adm-hide-t">Deadline</th><th style={{ textAlign:'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? null : filtered.map(o => (
                  <OrderRow key={o.order_id} order={o} isManager={isManager} onConfirm={confirmOrder} confirming={confirming} />
                ))}
              </tbody>
            </table>
          </div>
          {loading && <SkeletonRows rows={6} h={44} />}
          {!loading && filtered.length === 0 && (
            <div className="adm-empty">
              <NavIcon name="orders" size={30} color="currentColor" />
              <div style={{ marginTop:8, fontWeight:700 }}>{search ? `No results for “${search}”` : `No ${tab === 'all' ? '' : `${tab} `}orders`}</div>
              {(search || tab !== 'all') && <button className="adm-link-btn" onClick={() => { setSearch(''); setTab('all'); }}>Clear filters</button>}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div style={{ padding:'10px 18px', borderTop:'1px solid var(--bg-surface)', fontSize:11, color:'var(--text-faint)' }}>
              Showing {filtered.length} of {orders.length} orders
            </div>
          )}
        </Panel>
      </div>

      <div className="adm-only-m adm-stagger" key={`${tab}-${search}`}>
        {loading ? <SkeletonRows rows={4} h={150} />
          : filtered.length === 0 ? (
            <div className="adm-empty"><NavIcon name="orders" size={30} color="currentColor" />
              <div style={{ marginTop:8, fontWeight:700 }}>{search ? `No results for “${search}”` : `No ${tab === 'all' ? '' : `${tab} `}orders`}</div>
            </div>
          ) : filtered.map((o, i) => (
            <OrderCard key={o.order_id} order={o} index={i} isManager={isManager} onConfirm={confirmOrder} confirming={confirming} />
          ))}
        {!loading && filtered.length > 0 && (
          <p style={{ fontSize:11, color:'var(--text-faint)', textAlign:'center', margin:'4px 0 0' }}>{filtered.length} of {orders.length} orders</p>
        )}
      </div>
    </>
  );
}
