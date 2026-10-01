// src/pages/client/Dashboard.jsx — Customer home (wireframe: hero → KPIs → recent orders + notifications)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { asList } from '../../utils/asList';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { NavIcon } from '../../components/ui/icons';
import EmptyState from '../../components/EmptyState';
import { MiniPreview } from './design-studio/InspoGallery';
import {
  Kpi, StatusPill, OrderThumb, Skeleton, useToast, Stepper, LIFECYCLE, lifecycleIndex,
  orderTitle, fmtDate, reltime, parseCfg, IN_PRODUCTION,
} from '../../components/customer/kit';

function greeting(name) {
  const h = new Date().getHours();
  return `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}, ${(name || 'there').split(' ')[0]}`;
}

const CONF = ['#028090', '#02C39A', '#fbbf24', '#f472b6', '#60a5fa'];
function Confetti() {
  const ps = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    c: CONF[i % CONF.length], x: Math.random() * 100, d: (Math.random() - .5) * 240,
    r: Math.random() * 720, dl: Math.random() * .5, du: 1.6 + Math.random() * .8, s: 6 + Math.random() * 7,
  })), []);
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`@keyframes cxc{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--dx),75vh) rotate(var(--r));opacity:0}}
        @media(prefers-reduced-motion:reduce){.cx-cf{display:none}}`}</style>
      {ps.map((p, i) => (
        <div key={i} className="cx-cf" style={{ position: 'absolute', top: -10, left: `${p.x}%`, width: p.s, height: p.s,
          background: p.c, borderRadius: i % 2 ? 2 : '50%', '--dx': `${p.d}px`, '--r': `${p.r}deg`,
          animation: `cxc ${p.du}s ease-in ${p.dl}s forwards`, opacity: 0 }} />
      ))}
    </div>
  );
}

function ActiveOrder({ order }) {
  const nav = useNavigate();
  const idx = lifecycleIndex(order.status);
  const qty = Number(order.quantity_ordered ?? 0), done = Number(order.qty_completed ?? 0);
  return (
    <motion.button layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
      onClick={() => nav(`/orders/${order.order_id}`)} className="cx-card"
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: 16, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
      aria-label={`Open order ${order.order_id}, ${orderTitle(order)}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <OrderThumb order={order} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {orderTitle(order)}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-subtle)' }}>
            Order #{order.order_id} · {qty} pcs{order.target_delivery_date ? ` · Due ${fmtDate(order.target_delivery_date, { month: 'short', day: 'numeric' })}` : ''}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <Stepper steps={LIFECYCLE} current={idx} />
      {qty > 0 && done > 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600 }}>
          {done} / {qty} pcs completed
        </p>
      )}
    </motion.button>
  );
}

export default function CustomerDashboard() {
  const nav = useNavigate();
  const location = useLocation();
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } }, []);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [draft, setDraft] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    if (!location.state?.justCreated) return;
    setConfetti(true);
    cacheClear('orders_list'); cacheClear('customer_dashboard');
    const t = setTimeout(() => setConfetti(false), 3400);
    window.history.replaceState({}, '', location.pathname);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const load = useCallback(async (force = false) => {
    if (force) { cacheClear('orders_list'); cacheClear('customer_dashboard'); cacheClear('customer_notifs'); }
    setError(false);
    const cs = cacheGet('customer_dashboard'), co = cacheGet('orders_list'), cn = cacheGet('customer_notifs');
    if (cs) setStats(cs); if (co) setOrders(asList(co)); if (cn) setNotifs(asList(cn));
    if (cs && co && cn) { setLoading(false); }
    const [s, o, n, d, g] = await Promise.allSettled([
      cs ? null : axios.get('/api/customer/dashboard'),
      co ? null : axios.get('/api/customer/orders'),
      cn ? null : axios.get('/api/customer/notifications?per_page=5'),
      axios.get('/api/customer/drafts/latest'),
      axios.get('/api/customer/designs'),
    ]);
    if (s.status === 'fulfilled' && s.value) { setStats(s.value.data); cacheSet('customer_dashboard', s.value.data, TTL.DASHBOARD); }
    if (o.status === 'fulfilled' && o.value) { const l = asList(o.value.data); setOrders(l); cacheSet('orders_list', l, TTL.ORDERS); }
    else if (o.status === 'rejected' && !co) setError(true);
    if (n.status === 'fulfilled' && n.value) { const l = asList(n.value.data); setNotifs(l); cacheSet('customer_notifs', l, TTL.NOTIFICATIONS); }
    if (d.status === 'fulfilled' && d.value.data?.draft?.studio_config?.garment) setDraft(d.value.data.draft);
    if (g.status === 'fulfilled' && Array.isArray(g.value.data)) setDesigns(g.value.data.filter(x => x.is_archived && x.config?.garment).slice(0, 4));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    const prev = notifs;
    setNotifs(p => p.map(n => (n.notif_id ?? n.id) === id ? { ...n, is_read: 1 } : n));
    try { await axios.patch(`/api/customer/notifications/${id}/read`); cacheClear('customer_notifs'); }
    catch { setNotifs(prev); showToast('Could not mark as read.', 'error'); }
  };

  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)), [orders]);
  const active = sorted.filter(o => !['completed', 'cancelled'].includes(o.status));
  const recent = sorted.slice(0, 6);
  const total = stats?.total_orders ?? orders.length;
  const inProd = stats?.in_production ?? orders.filter(o => IN_PRODUCTION.includes(o.status)).length;
  const completed = stats?.completed_orders ?? orders.filter(o => o.status === 'completed').length;
  const pending = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
  const unread = notifs.filter(n => !n.is_read).length;
  const heroCfg = draft?.studio_config ?? parseCfg(sorted[0]);

  return (
    <div className="cx-page">
      {confetti && <Confetti />}
      {toast}

      {confetti && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} role="status"
          style={{ marginBottom: 16, padding: '14px 18px', borderRadius: 14, background: 'var(--teal-50)', border: '1px solid var(--teal-100)', color: 'var(--teal-dark)', fontWeight: 700, fontSize: 14 }}>
          Order placed! VFRB staff will review and confirm it shortly.
        </motion.div>
      )}

      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="cx-hero"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, opacity: .8, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {greeting(user.name)}
          </p>
          <h1>Design Your Perfect Uniform</h1>
          <p>AI-assisted raw material recommendations for your custom uniform orders.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="cx-btn" style={{ background: '#fff', color: 'var(--teal-dark)' }}
              onClick={() => nav('/design-studio')}>
              <NavIcon name="designStudio" size={15} /> {draft ? 'Continue Design' : 'Start Designing'}
            </button>
            {draft && (
              <button className="cx-btn" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', borderColor: 'rgba(255,255,255,.35)' }}
                onClick={() => nav('/my-designs')}>My Designs</button>
            )}
          </div>
        </div>
        <div aria-hidden="true" className="cx-hero-art">
          <div className="cx-hero-tile">
            <div className="cx-hero-garment">
              <MiniPreview garment={heroCfg?.garment ?? 'Polo Shirt'} colors={heroCfg?.garment ? (heroCfg.colors ?? {}) : {}} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="cx-kpis" style={{ marginBottom: 18 }}>
        <Kpi icon="orders" value={total} label="Total Orders" color="#028090" to="/orders" loading={loading} />
        <Kpi icon="settings" value={inProd} label="In Production" color="#6366f1" to="/orders" loading={loading} />
        <Kpi icon="success" value={completed} label="Completed" color="#16a34a" to="/orders" loading={loading} />
        <Kpi icon="pending" value={pending} label="Pending" color="#d97706" to="/orders" loading={loading} />
      </div>

      <div className="cx-dash-grid">
        <div style={{ display: 'grid', gap: 18, minWidth: 0, alignContent: 'start' }}>
          {/* Active orders with lifecycle stepper */}
          {(loading || active.length > 0) && (
            <section aria-label="Active orders">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Active Orders{active.length > 0 && ` (${active.length})`}</h2>
                <Link to="/orders" className="cx-link">View all →</Link>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {loading ? [1, 2].map(i => <div key={i} className="cx-card" style={{ padding: 16 }}><Skeleton h={48} /><Skeleton h={28} style={{ marginTop: 14 }} /></div>)
                  : active.slice(0, 3).map(o => <ActiveOrder key={o.order_id} order={o} />)}
              </div>
            </section>
          )}

          {/* Recent designs — the customer's own saved designs and current draft */}
          {!loading && (draft || designs.length > 0) && (
            <section className="cx-card" aria-label="Recent designs">
              <div className="cx-card-h"><h2>Recent Designs</h2><Link to="/my-designs" className="cx-link">My Designs →</Link></div>
              <div className="cx-rd">
                {draft && (
                  <button type="button" className="cx-rd-item" onClick={() => nav('/design-studio')}>
                    <span className="cx-thumb" style={{ width: 56, height: 64 }}><MiniPreview garment={draft.studio_config.garment} colors={draft.studio_config.colors ?? {}} /></span>
                    <strong>{draft.label || draft.studio_config.garment}</strong><em>Editable · continue</em>
                  </button>
                )}
                {designs.map(d => (
                  <button key={d.id} type="button" className="cx-rd-item" onClick={() => { sessionStorage.setItem('studio_config', JSON.stringify(d.config)); nav('/design-studio'); }}>
                    <span className="cx-thumb" style={{ width: 56, height: 64 }}><MiniPreview garment={d.garment} colors={d.config?.colors ?? {}} /></span>
                    <strong>{d.label || d.garment}</strong><em>Saved · reuse</em>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Recent orders */}
          <section className="cx-card" aria-label="Recent orders">
            <div className="cx-card-h"><h2>Recent Orders</h2><Link to="/orders" className="cx-link">View all orders</Link></div>
            {loading ? (
              <div style={{ padding: 16, display: 'grid', gap: 12 }}>{[1, 2, 3].map(i => <Skeleton key={i} h={44} />)}</div>
            ) : error ? (
              <EmptyState illustration="error" compact headline="Couldn't load your orders"
                sub="Check your connection and try again." cta={{ label: 'Retry', onClick: () => { setLoading(true); load(true); } }} />
            ) : recent.length === 0 ? (
              <EmptyState illustration="order" compact headline="No orders yet"
                sub="Design your first uniform — AI will suggest the materials."
                cta={{ label: 'Open Design Studio', onClick: () => nav('/design-studio') }} />
            ) : recent.map(o => (
              <button key={o.order_id} className="cx-row" onClick={() => nav(`/orders/${o.order_id}`)}>
                <OrderThumb order={o} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orderTitle(o)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-subtle)' }}>
                    #{o.order_id} · {o.quantity_ordered ?? 0} pcs · {fmtDate(o.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <StatusPill status={o.status} />
              </button>
            ))}
          </section>
        </div>

        {/* Right rail */}
        <aside style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
          {draft && (
            <section className="cx-card" style={{ padding: 16 }} aria-label="Continue your design">
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Continue where you left off</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="cx-thumb" style={{ width: 56, height: 64 }}><MiniPreview garment={draft.studio_config.garment} colors={draft.studio_config.colors ?? {}} /></div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.label || draft.studio_config.garment}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-subtle)' }}>Draft · {reltime(draft.updated_at)}</p>
                </div>
              </div>
              <button className="cx-btn cx-btn-p" style={{ width: '100%' }} onClick={() => nav('/design-studio')}>Continue editing</button>
            </section>
          )}
          <section className="cx-card" aria-label="Notifications">
            <div className="cx-card-h">
              <h2>Notifications{unread > 0 && <span className="cx-pill" style={{ background: 'var(--danger)', color: '#fff', marginLeft: 8 }}>{unread}</span>}</h2>
              <Link to="/messages" className="cx-link">Messages →</Link>
            </div>
            {notifs.length === 0 ? (
              <p style={{ padding: '22px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>You're all caught up.</p>
            ) : notifs.slice(0, 4).map(n => {
              const id = n.notif_id ?? n.id;
              return (
                <button key={id} className="cx-row" style={{ alignItems: 'flex-start' }} onClick={() => !n.is_read && markRead(id)}
                  aria-label={n.is_read ? n.message : `Mark as read: ${n.message}`}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: n.is_read ? 'var(--border)' : 'var(--teal-2)' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, fontWeight: n.is_read ? 400 : 700, color: n.is_read ? 'var(--text-subtle)' : 'var(--ink)',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.message}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-faint)' }}>{reltime(n.date_sent)}</p>
                  </div>
                </button>
              );
            })}
          </section>
        </aside>
      </div>
      <style>{`.cx-rd{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;padding:12px 16px 16px}
        .cx-rd-item{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:44px;padding:10px 6px;border:1px solid var(--border);border-radius:12px;background:var(--bg-surface);cursor:pointer;font:inherit;color:inherit;text-align:center}
        .cx-rd-item:hover{border-color:var(--teal);background:var(--teal-50)}
        .cx-rd-item strong{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cx-rd-item em{font-style:normal;font-size:10px;color:var(--text-subtle)}
        .cx-dash-grid{display:grid;grid-template-columns:1fr;gap:18px}
        @media(min-width:1024px){.cx-dash-grid{grid-template-columns:minmax(0,1fr) 340px;align-items:start}}`}</style>
    </div>
  );
}
