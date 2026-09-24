// Staff home (non-manager). Manager keeps AdminDashboard.jsx unchanged —
// this branches by job_function into 3 layouts that actually differ in
// content, not just a filtered nav menu, matching what each role's Figma
// reference shows: general staff (urgent orders + low stock), sales staff
// (payment follow-up + funnel), production staff (assigned orders + a
// per-stage checklist). All real data via /api/admin/dashboard/staff.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { TTL } from '../../utils/cache';
import { useCachedResource } from '../../hooks/useCachedResource';
import { navColor } from '../../utils/navColors';
import { NavIcon } from '../../components/ui/icons';

const T = '#028090';
const CARD = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.05)' };
const SK = { borderRadius: 6, background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '400px', animation: 'sk 1.4s infinite' };
const ROLE_LABEL = { sales: 'Sales Staff', production: 'Production Staff', inventory: 'Inventory Staff' };
const STAGE_LABEL = { pattern:'Pattern', segregation:'Segregation', cutting:'Cutting', sewing:'Sewing', qc:'QC', pressing:'Pressing', packing:'Packing' };

function StatPill({ value, label, loading }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 12, padding: 10, textAlign: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{loading ? '—' : value}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function QuickTile({ icon, label, path }) {
  const nav = useNavigate();
  const c = navColor(path);
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={() => nav(path)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <NavIcon name={icon} size={17} color={c.fg} />
      </span>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#0f172a', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </motion.button>
  );
}

export default function StaffDashboard() {
  const nav = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
  const fn = user.job_function ?? 'general';
  const [toast, setToast] = useState(null);

  const [data, loading] = useCachedResource('staff_dashboard', () => axios.get('/api/admin/dashboard/staff').then((r) => r.data), TTL.DASHBOARD, { onError: () => setToast('Failed to load your dashboard.') });

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const heroStats = fn === 'sales'
    ? [{ v: data?.stats?.total_orders, l: 'Total Orders' }, { v: data?.stats?.needs_follow_up, l: 'Needs Follow-up' }, { v: data?.stats?.total_value ? `₱${Number(data.stats.total_value).toLocaleString('en-PH')}` : '—', l: 'Total Value' }]
    : fn === 'production'
    ? [{ v: data?.stats?.assigned_today, l: 'Assigned Today' }, { v: data?.stats?.at_my_stage, l: 'At My Stage' }, { v: data?.stats?.completed, l: 'Completed' }]
    : [{ v: data?.stats?.active_orders, l: 'Active Orders' }, { v: data?.stats?.low_stock, l: 'Low Stock' }, { v: data?.stats?.urgent, l: 'Urgent' }];

  return (
    <>
      <style>{`
        @keyframes sk { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .stf-hero { background:linear-gradient(135deg,#016070,#028090,#02C39A); border-radius:16px; padding:20px 22px; margin-bottom:16px; }
        .stf-stats { margin-top:14px; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .stf-quick { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:18px; }
        .stf-row { padding:10px 14px; border-bottom:1px solid #f8fafc; display:flex; justify-content:space-between; align-items:center; gap:8px; }
      `}</style>

      <div className="stf-hero">
        <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginBottom: 3 }}>{greet}, {user.name?.split(' ')[0] ?? 'there'} 👋</p>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{ROLE_LABEL[fn] ?? 'Staff'} Dashboard</h1>
        <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: 0 }}>VFRB Enterprise · {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <div className="stf-stats">
          {heroStats.map((s) => <StatPill key={s.l} value={s.v ?? 0} label={s.l} loading={loading} />)}
        </div>
      </div>

      {fn === 'sales' ? (
        <SalesBody data={data} loading={loading} nav={nav} />
      ) : fn === 'production' ? (
        <ProductionBody data={data} loading={loading} nav={nav} />
      ) : (
        <GeneralBody data={data} loading={loading} nav={nav} />
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '10px 16px', borderRadius: 10, background: '#450a0a', color: '#fff', fontSize: 13, fontWeight: 600 }}>{toast}</div>}
    </>
  );
}

function GeneralBody({ data, loading, nav }) {
  const urgent = data?.urgent_orders ?? [];
  const low = data?.low_stock_materials ?? [];
  return (
    <>
      <div className="stf-quick">
        <QuickTile icon="physicalCount" label="Stock In" path="/admin/physical-count" />
        <QuickTile icon="production" label="Output Log" path="/admin/output-log" />
        <QuickTile icon="warning" label="Incidents" path="/admin/production-incidents" />
        <QuickTile icon="physicalCount" label="Count" path="/admin/physical-count" />
      </div>

      <div style={{ ...CARD, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Urgent Orders</p></div>
        {loading ? <div style={{ padding: 14 }}><div style={{ ...SK, height: 32 }} /></div>
          : urgent.length === 0 ? <p style={{ padding: '18px 14px', fontSize: 12, color: '#64748b', margin: 0 }}>Nothing urgent right now.</p>
          : urgent.map((o) => (
            <div key={o.order_id} className="stf-row" style={{ cursor: 'pointer' }} onClick={() => nav(`/admin/orders/${o.order_id}`)}>
              <div><p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: T }}>ORD-{o.order_id} · {o.customer_name}</p></div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: 99 }}>URGENT</span>
            </div>
          ))}
      </div>

      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Low Stock Alert</p>
          <button onClick={() => nav('/admin/inventory')} style={{ border: 'none', background: 'none', color: T, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>View Inventory →</button>
        </div>
        {loading ? <div style={{ padding: 14 }}><div style={{ ...SK, height: 32 }} /></div>
          : low.length === 0 ? <p style={{ padding: '18px 14px', fontSize: 12, color: '#64748b', margin: 0 }}>All materials healthy.</p>
          : low.map((m) => (
            <div key={m.material_id} className="stf-row">
              <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{m.material_name}</p>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', margin: 0 }}>{m.quantity_in_stock} {m.unit}</p>
            </div>
          ))}
      </div>
    </>
  );
}

function SalesBody({ data, loading, nav }) {
  const followUp = data?.needs_follow_up ?? [];
  const funnel = data?.order_funnel ?? {};
  const payments = data?.payment_status ?? [];
  const funnelMax = Math.max(1, ...Object.values(funnel));
  return (
    <>
      <div style={{ ...CARD, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Orders Needing Payment Follow-up</p></div>
        {loading ? <div style={{ padding: 14 }}><div style={{ ...SK, height: 32 }} /></div>
          : followUp.length === 0 ? <p style={{ padding: '18px 14px', fontSize: 12, color: '#64748b', margin: 0 }}>No outstanding balances.</p>
          : followUp.map((o) => (
            <div key={o.order_id} style={{ margin: '10px 14px', padding: '10px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }} onClick={() => nav(`/admin/orders/${o.order_id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: T, margin: 0 }}>ORD-{o.order_id} · {o.customer_name}</p>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: 99 }}>{o.paid > 0 ? 'Partial' : 'Awaiting DP'}</span>
              </div>
              <p style={{ fontSize: 11, color: '#991b1b', margin: '4px 0 0' }}>Balance due: ₱{Number(o.balance).toLocaleString('en-PH')}</p>
            </div>
          ))}
      </div>

      <div style={{ ...CARD, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 12px' }}>Order Status Funnel</p>
        {Object.entries(funnel).map(([label, count]) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span>{label}</span><span style={{ fontWeight: 700 }}>{count}</span></div>
            <div style={{ height: 6, borderRadius: 99, background: '#f1f5f9' }}><div style={{ height: '100%', width: `${(count / funnelMax) * 100}%`, borderRadius: 99, background: T }} /></div>
          </div>
        ))}
      </div>

      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Payment Status</p></div>
        {payments.map((o) => (
          <div key={o.order_id} style={{ padding: '10px 14px', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>ORD-{o.order_id} <span style={{ fontWeight: 400, color: '#64748b' }}>{o.customer_name}</span></p>
              <span style={{ fontSize: 10, fontWeight: 700, color: o.balance > 0 ? '#dc2626' : '#15803d' }}>{o.balance > 0 ? `${o.dp_pct}% Paid` : 'Fully Paid'}</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: '#f1f5f9', margin: '6px 0' }}><div style={{ height: '100%', width: `${o.dp_pct}%`, borderRadius: 99, background: o.balance > 0 ? '#f59e0b' : '#22c55e' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}><span>Paid: ₱{Number(o.paid).toLocaleString('en-PH')}</span><span>Balance: ₱{Number(o.balance).toLocaleString('en-PH')}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}

function ProductionBody({ data, loading, nav }) {
  const orders = data?.assigned_orders ?? [];
  return (
    <>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => nav('/admin/output-log')}
        style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: T, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <NavIcon name="production" size={18} color="#fff" /> Log Output
      </motion.button>

      <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 10px' }}>My Assigned Orders Today</p>
      {loading ? <div style={{ ...SK, height: 100, borderRadius: 14 }} />
        : orders.length === 0 ? <p style={{ fontSize: 12, color: '#64748b' }}>No orders assigned to your current work yet.</p>
        : orders.map((o) => (
          <div key={o.order_id} style={{ ...CARD, padding: 14, marginBottom: 12, cursor: 'pointer' }} onClick={() => nav(`/admin/production/${o.order_id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: T, margin: 0 }}>ORD-{o.order_id} — {o.garment_type}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{o.customer_name}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#e0f2f1', color: T, textTransform: 'capitalize', height: 'fit-content' }}>{STAGE_LABEL[o.status] ?? o.status}</span>
            </div>
            {o.stages.map((s) => {
              const done = s.target > 0 && s.completed >= s.target;
              const current = s.stage === o.status;
              return (
                <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', opacity: !current && !done ? 0.4 : 1 }}>
                  <NavIcon name={done ? 'success' : 'checklist'} size={13} color={done ? '#22c55e' : current ? T : '#cbd5e1'} />
                  <span style={{ fontSize: 11, color: current ? '#0f172a' : '#64748b', fontWeight: current ? 700 : 400, textDecoration: done ? 'line-through' : 'none' }}>{STAGE_LABEL[s.stage]}</span>
                  {current && s.target > 0 && (
                    <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#f1f5f9', marginLeft: 4 }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (s.completed / s.target) * 100)}%`, borderRadius: 99, background: T }} />
                    </div>
                  )}
                  {current && <span style={{ fontSize: 10, color: '#64748b' }}>{s.completed}/{s.target}</span>}
                </div>
              );
            })}
          </div>
        ))}
    </>
  );
}
