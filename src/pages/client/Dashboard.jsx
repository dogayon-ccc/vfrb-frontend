// src/pages/client/Dashboard.jsx — Customer home (hero → KPIs → active orders, designs, recent orders; notifications live in the navbar bell)
import { humanize } from '../../utils/humanize';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { asList } from '../../utils/asList';
import { cacheGet, cacheSet, cacheClear, TTL } from '../../utils/cache';
import { Button, Stepper, Skeleton, EmptyState, AlertBanner, PageHeader } from '../../components/ui';
import { savedDesignName, garmentLabel } from '../../utils/designName';
import { openDesign, reorderDesign, duplicateDesign } from '../../utils/designActions';
import { setStudioLock } from '../../utils/studioLock';
import { Palette } from 'lucide-react';
import heroPhoto from '../../assets/brand/uniforms.jpg';
import {
  StatusPill, OrderThumb, DesignThumb, LIFECYCLE, lifecycleIndex, nextStep,
  orderTitle, fmtDate, reltime, IN_PRODUCTION,
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

// Order ticket: thumbnail stub, perforation, then name, meta and status; the whole ticket opens the order.
function OrderTicket({ order, meta, children }) {
  const nav = useNavigate();
  return (
    <li className="dx-tk">
      <span className="dx-tk-stub"><OrderThumb order={order} size={56} /></span>
      <div className="dx-tk-body">
        <button type="button" className="dx-tk-main" onClick={() => nav(`/orders/${order.order_id}`)}
          aria-label={`Open order ${order.order_id}, ${orderTitle(order)}`}>
          <span className="dx-row-txt"><strong>{orderTitle(order)}</strong><small>{meta}</small>
            {order.status === 'pending' && order.created_at && <small>Waiting for VFRB since {shortDate(order.created_at)}</small>}</span>
          <StatusPill status={order.status} />
        </button>
        {children}
      </div>
    </li>
  );
}

const shortDate = (d) => fmtDate(d, { month: 'short', day: 'numeric' });
const openStatus = (o) => o && !['completed', 'cancelled'].includes(o.status);

export default function CustomerDashboard() {
  const nav = useNavigate();
  const location = useLocation();
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } }, []);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [draft, setDraft] = useState(null);
  const openStudio = () => { try { if (draft?.studio_config) sessionStorage.setItem('studio_config', JSON.stringify(draft.studio_config)); else sessionStorage.removeItem('studio_config'); } catch { /* private mode */ } nav('/design-studio'); };
  const [designs, setDesigns] = useState([]);
  const [copying, setCopying] = useState(null);
  const [designErr, setDesignErr] = useState('');
  const startNew = () => { try { sessionStorage.removeItem('studio_config'); } catch { /* storage blocked */ } setStudioLock(null); nav('/design-studio'); };
  const duplicate = async (d) => {
    setCopying(d.id); setDesignErr('');
    try { openDesign(await duplicateDesign(d), nav); } catch { setDesignErr('Could not make a copy. Check your connection and try again.'); setCopying(null); }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!location.state?.justCreated) return;
    setConfetti(true);
    cacheClear('orders_list'); cacheClear('customer_dashboard');
    const t = setTimeout(() => setConfetti(false), 3400);
    window.history.replaceState({}, '', location.pathname);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  const load = useCallback(async (force = false) => {
    if (force) { cacheClear('orders_list'); cacheClear('customer_dashboard'); }
    setError(false);
    const cs = cacheGet('customer_dashboard'), co = cacheGet('orders_list');
    if (cs) setStats(cs); if (co) setOrders(asList(co));
    if (cs && co) { setLoading(false); }
    const [s, o, d, g] = await Promise.allSettled([
      cs ? null : axios.get('/api/customer/dashboard'),
      co ? null : axios.get('/api/customer/orders'),
      axios.get('/api/customer/drafts/latest'),
      axios.get('/api/customer/designs'),
    ]);
    if (s.status === 'fulfilled' && s.value) { setStats(s.value.data); cacheSet('customer_dashboard', s.value.data, TTL.DASHBOARD); }
    if (o.status === 'fulfilled' && o.value) { const l = asList(o.value.data); setOrders(l); cacheSet('orders_list', l, TTL.ORDERS); }
    else if (o.status === 'rejected' && !co) setError(true);
    if (d.status === 'fulfilled' && d.value.data?.draft?.studio_config?.garment) setDraft(d.value.data.draft);
    if (g.status === 'fulfilled' && Array.isArray(g.value.data)) setDesigns(g.value.data.filter(x => x.is_archived && x.config?.garment).slice(0, 4));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0)), [orders]);
  const active = sorted.filter(o => !['completed', 'cancelled'].includes(o.status));
  // All tiles count the same list with disjoint statuses (backend in_production also counted confirmed).
  const total = orders.length;
  const inProd = orders.filter(o => IN_PRODUCTION.includes(o.status)).length;
  const confirmed = orders.filter(o => o.status === 'confirmed').length;
  const completed = orders.filter(o => o.status === 'completed').length;
  const pending = orders.filter(o => o.status === 'pending').length;
  // Same title as My Designs: the customer's design name, else the draft label, else the garment.
  const draftTitle = draft ? garmentLabel(savedDesignName(draft.studio_config) || draft.label || humanize(draft.studio_config.garment)) : '';

  const featured = active[0] ?? sorted[0] ?? null;
  const moreActive = active.slice(1, 3);
  const recent = sorted.filter(o => o !== featured && !moreActive.includes(o)).slice(0, 3);
  const next = nextStep(featured);
  const pcs = (o) => `Order #${o.order_id} · ${Number(o.quantity_ordered ?? 0)} pcs`;

  return (
    <div className="cx-page dx">
      {confetti && <Confetti />}
      {confetti && <AlertBanner tone="success" title="Order placed!" style={{ marginBottom: 16 }}>The VFRB team will review and confirm it shortly.</AlertBanner>}

      <PageHeader title="Dashboard" subtitle={greeting(user.name)} />

      <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="dx-hero" aria-labelledby="dash-hero-t">
        <div className="dx-hero-txt">
          <h2 id="dash-hero-t" className="dx-title">{loading ? 'Your design studio' : draft ? draftTitle : 'Design your team’s uniform'}</h2>
          <p className="dx-hero-sub">{draft
            ? `Draft, last edited ${reltime(draft.updated_at)}. Pick up where you left off, then order in bulk.`
            : 'Pick a garment, set the colours and add your logo. Quantity and sizes come after.'}</p>
          <div className="dx-hero-acts">
            <Button variant="primary" size="lg" icon="designStudio" onClick={openStudio}>{draft ? 'Continue design' : 'Start designing'}</Button>
            <Button size="lg" onClick={() => nav('/my-designs')}>My designs</Button>
          </div>
          <p className="dx-proof">Family-owned since 2000, Bayanan, Muntinlupa City</p>
        </div>
        <span className="dx-perf" aria-hidden="true" />
        <div className="dx-stage">
          {loading ? <Skeleton variant="block" height="100%" label="Loading your design" className="dx-stage-sk" />
            : draft ? <DesignThumb src={draft.preview_dataurl} garment={draft.studio_config.garment} colors={draft.studio_config.colors} name={draftTitle} scale={1.8} />
            : <img src={heroPhoto} alt="" className="dx-stage-photo" width="1600" height="720" fetchpriority="high" />}
        </div>
      </motion.section>

      <section className="dx-sec" aria-labelledby="ord-h">
        <div className="cx-sec-h"><h2 id="ord-h">{loading || openStatus(featured) ? 'Your orders' : featured ? 'Latest order' : 'How ordering works'}</h2>
          {total > 0 && <Link to="/orders" className="cx-link">All orders</Link>}</div>
        {!loading && total > 0 && (
          <nav className="dx-summary" aria-label="Orders by status">
            <Link to="/orders" className="dx-chip">{total} order{total === 1 ? '' : 's'}</Link>
            {[['pending', pending, 'pending'], ['confirmed', confirmed, 'confirmed'], ['prod', inProd, 'in production'], ['done', completed, 'completed']]
              .filter(([, n]) => n > 0).map(([id, n, label]) => <Link key={id} to={`/orders?status=${id}`} className="dx-chip">{n} {label}</Link>)}
          </nav>
        )}
        {loading ? <Skeleton variant="block" count={2} height={88} gap={12} label="Loading orders" />
          : error ? (
            <EmptyState compact tone="error" title="Couldn’t load your orders"
              action={<Button onClick={() => { setLoading(true); load(true); }}>Try again</Button>}>Check your connection and try again.</EmptyState>
          ) : featured ? (
            <ol className="dx-thread">
              <OrderTicket order={featured} meta={`${pcs(featured)}${featured.target_delivery_date ? ` · Due ${shortDate(featured.target_delivery_date)}` : ''}`}>
                <div className="dx-tk-more">
                  {featured.status !== 'cancelled' && <Stepper steps={LIFECYCLE} label={`Order ${featured.order_id} progress`} current={lifecycleIndex(featured.status)} />}
                  <p className="dx-next-b"><b>{next.title}.</b> {next.body}</p>
                </div>
              </OrderTicket>
              {moreActive.map(o => <OrderTicket key={o.order_id} order={o} meta={pcs(o)} />)}
              {recent.map(o => <OrderTicket key={o.order_id} order={o} meta={`${pcs(o)} · ${fmtDate(o.created_at)}`} />)}
            </ol>
          ) : (
            <div className="dx-howto">
              <Stepper steps={LIFECYCLE} label="Order steps" current={0} />
              <p className="dx-next-b"><b>{next.title}.</b> {next.body}</p>
            </div>
          )}
      </section>

      {!loading && designs.length > 0 && (
        <section className="dx-sec" aria-labelledby="rd-h">
          <div className="cx-sec-h"><h2 id="rd-h">Recent designs</h2><Link to="/my-designs" className="cx-link">View all</Link></div>
          <div className="dx-rd">
            {designs.map(d => {
              const name = garmentLabel(savedDesignName(d.config) || d.label || humanize(d.garment));
              return (
                <div key={d.id} className="dx-rd-item">
                  <button type="button" className="dx-rd-open" aria-label={`${d.locked ? 'View' : 'Open'} ${name} in the Studio`} onClick={() => openDesign(d, nav)}>
                    <span className="dx-rd-thumb"><DesignThumb src={d.is_copy ? null : d.photo_path} garment={d.garment} colors={d.config?.colors} name={name} scale={1.5} /></span>
                    <strong>{name}</strong><em>{d.locked ? 'Ordered · view only' : d.is_copy ? 'Copy · colors only' : 'Saved design'}</em>
                  </button>
                  <div className="dx-rd-acts">
                    <Button variant="primary" fullWidth onClick={() => reorderDesign(d, nav)}>Reorder</Button>
                    <Button fullWidth disabled={!!copying} onClick={() => duplicate(d)}>{copying === d.id ? 'Copying…' : 'Duplicate to edit'}</Button>
                  </div>
                </div>
              );
            })}
            <button type="button" className="cx-newtile" onClick={startNew}>
              <Palette size={22} aria-hidden="true" /> <strong>Start a new design</strong><span>Pick a garment and make it yours</span>
            </button>
          </div>
          {designErr && <p role="alert" className="dx-err">{designErr}</p>}
        </section>
      )}
    </div>
  );
}
