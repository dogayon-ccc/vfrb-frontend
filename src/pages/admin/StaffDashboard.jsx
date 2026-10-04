import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TTL } from '../../utils/cache';
import { useCachedResource } from '../../hooks/useCachedResource';
import { NavIcon } from '../../components/ui/icons';
import { PageHeader, StatGrid, Panel, StatusPill, SkeletonRows, EmptyBlock, Meter, Toast, useToast } from '../../components/admin/AdminUI';

const ROLE_LABEL = { sales: 'Sales Staff', production: 'Production Staff', inventory: 'Inventory Staff' };
const STAGE_LABEL = { pattern: 'Pattern', segregation: 'Segregation', cutting: 'Cutting', sewing: 'Sewing', qc: 'QC', pressing: 'Pressing', packing: 'Packing' };
const peso = (n) => `₱${Number(n).toLocaleString('en-PH')}`;

const readUser = () => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } };

function Row({ onClick, children }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag className="adm-row" onClick={onClick}>{children}</Tag>;
}

function List({ loading, items, empty, children }) {
  if (loading) return <SkeletonRows rows={3} h={34} />;
  if (!items.length) return <EmptyBlock>{empty}</EmptyBlock>;
  return <div className="adm-rows">{children}</div>;
}

export default function StaffDashboard() {
  const nav = useNavigate();
  const user = readUser();
  const fn = user.job_function ?? 'general';
  const [toast, setToast] = useToast();

  const [data, loading] = useCachedResource(
    'staff_dashboard',
    () => axios.get('/api/admin/dashboard/staff').then((r) => r.data),
    TTL.DASHBOARD,
    { onError: () => setToast({ type: 'error', msg: 'Failed to load your dashboard.' }) },
  );

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const s = data?.stats ?? {};

  const stats = fn === 'sales'
    ? [{ label: 'Total orders', value: s.total_orders ?? 0 }, { label: 'Needs follow-up', value: s.needs_follow_up ?? 0, color: '#b45309' }, { label: 'Total value', value: s.total_value ? peso(s.total_value) : '—' }]
    : fn === 'production'
    ? [{ label: 'Assigned today', value: s.assigned_today ?? 0 }, { label: 'At my stage', value: s.at_my_stage ?? 0 }, { label: 'Completed', value: s.completed ?? 0 }]
    : [{ label: 'Active orders', value: s.active_orders ?? 0 }, { label: 'Low stock', value: s.low_stock ?? 0, color: '#b45309' }, { label: 'Urgent', value: s.urgent ?? 0, color: '#dc2626' }];

  const actions = fn === 'production'
    ? <button className="adm-btn primary" onClick={() => nav('/admin/output-log')}><NavIcon name="production" size={14} color="currentColor" /> Log output</button>
    : fn === 'sales' ? null
    : fn === 'inventory' ? (
      <div className="adm-qa">
        <button className="adm-btn" onClick={() => nav('/admin/physical-count')}><NavIcon name="physicalCount" size={14} color="currentColor" /> Count</button>
        <button className="adm-btn primary" onClick={() => nav('/admin/inventory')}><NavIcon name="stockIn" size={14} color="currentColor" /> Stock in</button>
      </div>
    )
    : (
      <div className="adm-qa">
        <button className="adm-btn" onClick={() => nav('/admin/physical-count')}><NavIcon name="physicalCount" size={14} color="currentColor" /> Count</button>
        <button className="adm-btn" onClick={() => nav('/admin/production-incidents')}><NavIcon name="warning" size={14} color="currentColor" /> Incidents</button>
        <button className="adm-btn" onClick={() => nav('/admin/output-log')}><NavIcon name="production" size={14} color="currentColor" /> Output log</button>
        <button className="adm-btn primary" onClick={() => nav('/admin/inventory')}><NavIcon name="stockIn" size={14} color="currentColor" /> Stock in</button>
      </div>
    );

  return (
    <>
      <PageHeader title={`${ROLE_LABEL[fn] ?? 'Staff'} Dashboard`} sub={`${greet}, ${user.name?.split(' ')[0] ?? 'there'} · ${today}`}>{actions}</PageHeader>
      <StatGrid items={stats} loading={loading} />
      {fn === 'sales' ? <SalesBody data={data} loading={loading} nav={nav} />
        : fn === 'production' ? <ProductionBody data={data} loading={loading} nav={nav} />
        : <GeneralBody data={data} loading={loading} nav={nav} />}
      <Toast toast={toast} />
    </>
  );
}

function GeneralBody({ data, loading, nav }) {
  const urgent = data?.urgent_orders ?? [];
  const low = data?.low_stock_materials ?? [];
  return (
    <div className="adm-cols">
      <Panel title="Urgent orders" flush>
        <List loading={loading} items={urgent} empty="Nothing urgent right now.">
          {urgent.map((o) => (
            <Row key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)}>
              <span><b>ORD-{o.order_id}</b> · {o.customer_name}</span>
              <StatusPill status="urgent" />
            </Row>
          ))}
        </List>
      </Panel>
      <Panel title="Low stock" flush action={<button className="adm-link-btn" onClick={() => nav('/admin/inventory')}>View inventory</button>}>
        <List loading={loading} items={low} empty="All materials are above their reorder level.">
          {low.map((m) => (
            <Row key={m.material_id}>
              <span>{m.material_name}</span>
              <b style={{ color: '#dc2626' }}>{m.quantity_in_stock} {m.unit}</b>
            </Row>
          ))}
        </List>
      </Panel>
    </div>
  );
}

function SalesBody({ data, loading, nav }) {
  const followUp = data?.needs_follow_up ?? [];
  const funnel = data?.order_funnel ?? {};
  const payments = data?.payment_status ?? [];
  const funnelMax = Math.max(1, ...Object.values(funnel));
  return (
    <>
      <div className="adm-cols" style={{ marginBottom: 16 }}>
        <Panel title="Payment follow-up" flush>
          <List loading={loading} items={followUp} empty="No outstanding balances.">
            {followUp.map((o) => (
              <Row key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)}>
                <span>
                  <b>ORD-{o.order_id}</b> · {o.customer_name}
                  <small className="adm-row-sub">Balance due {peso(o.balance)}</small>
                </span>
                <StatusPill status="pending" label={o.paid > 0 ? 'Partial' : 'Awaiting DP'} />
              </Row>
            ))}
          </List>
        </Panel>
        <Panel title="Order status funnel">
          {Object.entries(funnel).map(([label, count]) => (
            <div key={label} className="adm-funnel">
              <span>{label}</span><b>{count}</b>
              <Meter pct={(count / funnelMax) * 100} />
            </div>
          ))}
        </Panel>
      </div>
      <Panel title="Payment status" flush>
        <List loading={loading} items={payments} empty="No orders to show yet.">
          {payments.map((o) => (
            <Row key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>ORD-{o.order_id}</b> · {o.customer_name}
                <Meter pct={o.dp_pct} tone={o.balance > 0 ? 'warn' : 'ok'} />
                <small className="adm-row-sub">Paid {peso(o.paid)} · Balance {peso(o.balance)}</small>
              </span>
              <b style={{ color: o.balance > 0 ? '#dc2626' : '#15803d' }}>{o.balance > 0 ? `${o.dp_pct}% paid` : 'Fully paid'}</b>
            </Row>
          ))}
        </List>
      </Panel>
    </>
  );
}

function ProductionBody({ data, loading, nav }) {
  const orders = data?.assigned_orders ?? [];
  return (
    <>
      <h2 className="adm-section-title">My assigned orders today</h2>
      {loading ? <SkeletonRows rows={2} h={110} />
        : !orders.length ? <EmptyBlock>No orders assigned to your current work yet.</EmptyBlock>
        : (
          <div className="adm-card-grid">
            {orders.map((o) => (
              <button key={o.order_id} className="adm-panel adm-order-card" onClick={() => nav(`/admin/production/${o.order_id}`)}>
                <span className="adm-order-card-top">
                  <span><b>ORD-{o.order_id}</b> · {o.garment_type}<small className="adm-row-sub">{o.customer_name}</small></span>
                  <StatusPill status={o.status} label={STAGE_LABEL[o.status] ?? o.status} />
                </span>
                {o.stages.map((st) => {
                  const done = st.target > 0 && st.completed >= st.target;
                  const current = st.stage === o.status;
                  return (
                    <span key={st.stage} className={`adm-stage-line${current ? ' now' : ''}${done ? ' done' : ''}`}>
                      <NavIcon name={done ? 'success' : 'checklist'} size={13} color="currentColor" />
                      <span>{STAGE_LABEL[st.stage]}</span>
                      {current && st.target > 0 && <Meter pct={(st.completed / st.target) * 100} />}
                      {current && <small>{st.completed}/{st.target}</small>}
                    </span>
                  );
                })}
              </button>
            ))}
          </div>
        )}
    </>
  );
}
