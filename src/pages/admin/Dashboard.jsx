// src/pages/admin/Dashboard.jsx
// TASK F — Caching + optimistic notification read
//
// Changes from original:
//   1. ALL data fetches check cacheGet() before hitting the API
//   2. cacheSet() called after every successful fetch
//   3. Notification "mark as read" uses optimistic UI:
//        - setState instantly (counter decrements, dot disappears)
//        - PATCH fires in background
//        - On error: roll back + show error toast
//        - cacheClear('notifications') on success
//   4. Refresh button forces cacheClear then reload
//   5. "Last updated X ago" shown under KPI header (uses cacheAge)
//   6. DM Sans CDN reference removed — system font fallback
//   7. fontFamily inline strings replaced with CSS var / inherit

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }                               from 'react-router-dom';
import { motion, AnimatePresence }                   from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import axios from 'axios';
import { cacheGet, cacheSet, cacheClear, cacheAge, TTL } from '../../utils/cache';

const T  = '#028090';
const T2 = '#02C39A';
const SK_STYLE = {
  borderRadius: 6,
  background:   'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
  backgroundSize: '400px',
  animation:    'sk 1.4s infinite',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function ageLabel(ms) {
  if (!ms || ms === Infinity) return null;
  if (ms < 10_000) return 'just now';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  return `${Math.round(ms / 60_000)}m ago`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  const bg = type === 'error' ? '#450a0a' : '#022c22';
  const bdr = type === 'error' ? '#ef4444' : '#22c55e';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      style={{
        position: 'fixed', bottom: 28, right: 24, zIndex: 500,
        padding: '12px 18px', borderRadius: 12,
        background: bg, border: `1px solid ${bdr}`,
        color: '#fff', fontSize: 13, fontWeight: 700,
        maxWidth: 340, boxShadow: '0 8px 28px rgba(0,0,0,.3)',
        display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1.4,
      }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {type === 'error' ? '⚠️' : '✓'}
      </span>
      {msg}
    </motion.div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
// Aug 23 — hybrid style pass: gradient fill + white icon badge + soft
// colored shadow, matching the confirmed mockup (Bold/TailAdmin direction
// for headline stat cards specifically — everything else on this page,
// the action-list cards, notification panel, MRP alerts, stays minimal/
// white per the same mockup, since dense lists shouldn't compete visually
// with the cards meant to draw the eye first).
function KPICard({ icon, label, value, sub, grad, shadow, loading, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      style={{
        background: grad, borderRadius: 14,
        padding: '18px 16px', cursor: onClick ? 'pointer' : 'default',
        boxShadow: shadow,
      }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, marginBottom: 12,
      }}>
        {icon}
      </div>
      {loading
        ? <div style={{ ...SK_STYLE, height: 28, width: '55%', marginBottom: 6,
            background: 'linear-gradient(90deg,rgba(255,255,255,.2) 25%,rgba(255,255,255,.35) 50%,rgba(255,255,255,.2) 75%)' }} />
        : <p className="adm-kpi-val"
            style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
            {value}
          </p>
      }
      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.9)', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', margin: '3px 0 0' }}>{sub}</p>}
    </motion.div>
  );
}

// ── Action list card — "needs my attention today" block ───────────────────────
// Generalizes the visual pattern the existing Low-Stock card already used
// (border/header/row/footer). Every color/spacing value here already
// appears elsewhere in this file — nothing new invented.
function ActionListCard({ icon, title, accent, items, loading, emptyLabel,
                           renderItem, footerLabel, onFooter, unavailable, unavailableNote }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
      display: 'flex', flexDirection: 'column', minHeight: 220,
    }}>
      {/* Neutral header — same chrome for every card. Color is reserved for
          the count badge and footer link below, not painted across the
          whole header; that's what makes 5 cards read as one coherent
          family instead of 5 separately-branded widgets. */}
      <div style={{
        padding: '12px 14px', background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#334155', margin: 0,
          display: 'flex', alignItems: 'center', gap: 7 }}>
          {/* Small persistent accent dot — this is what actually makes the
              accent color visible on a card whose count badge and footer
              are both hidden (the "unavailable" Production Delays case);
              without it, changing accent had no visible effect at all. */}
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: accent, flexShrink: 0,
          }}/>
          <span style={{ fontSize: 13 }}>{icon}</span> {title}
        </p>
        {!loading && !unavailable && items.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 800, color: accent, background: `${accent}14`,
            borderRadius: 99, padding: '2px 8px', flexShrink: 0,
          }}>
            {items.length}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {unavailable ? (
          <div style={{ padding: '26px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 20, margin: '0 0 6px', opacity: .5 }}>🚧</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              {unavailableNote}
            </p>
          </div>
        ) : loading ? (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ ...SK_STYLE, height: 36 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '26px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 20, margin: '0 0 6px' }}>✓</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{emptyLabel}</p>
          </div>
        ) : (
          items.map(renderItem)
        )}
      </div>

      {!unavailable && (
        <button onClick={onFooter}
          style={{
            width: '100%', padding: '10px', border: 'none',
            background: 'transparent', color: accent, fontSize: 11,
            fontWeight: 700, cursor: 'pointer',
            borderTop: '1px solid #e2e8f0',
          }}>
          {footerLabel} →
        </button>
      )}
    </div>
  );
}

// ── Notification panel (with optimistic read) ─────────────────────────────────
function NotifPanel({ notifs, onMarkRead, onMarkAll, loading }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ ...SK_STYLE, height: 40 }} />)}
    </div>
  );
  if (!notifs.length) return (
    <div style={{ padding: '28px 14px', textAlign: 'center' }}>
      <p style={{ fontSize: 22, margin: '0 0 8px' }}>🔔</p>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>All caught up!</p>
    </div>
  );

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {unread > 0 && (
        <div style={{
          padding: '8px 14px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
            {unread} unread
          </span>
          <button onClick={onMarkAll}
            style={{
              padding: '3px 9px', borderRadius: 7, border: 'none',
              background: '#f0fdfa', color: T, fontSize: 10,
              fontWeight: 700, cursor: 'pointer',
            }}>
            Mark all read
          </button>
        </div>
      )}
      {notifs.slice(0, 8).map(n => (
        <div key={n.notif_id}
          style={{
            padding: '10px 14px', borderBottom: '1px solid #f8fafc',
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: n.is_read ? 'transparent' : '#f0fdfa',
            transition: 'background .2s',
          }}>
          {/* Unread dot — optimistic: disappears before API confirms */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
            background: n.is_read ? 'transparent' : T2,
            transition: 'background .2s',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: n.is_read ? 400 : 700,
              color: '#0f172a', margin: '0 0 2px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {n.title}
            </p>
            <p style={{
              fontSize: 11, color: '#64748b', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {n.message}
            </p>
          </div>
          {!n.is_read && (
            <button onClick={() => onMarkRead(n.notif_id)}
              style={{
                padding: '2px 7px', borderRadius: 6, border: 'none',
                background: 'rgba(2,128,144,.08)', color: T,
                fontSize: 9, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              }}>
              ✓
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── STATUS config ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:     '#f59e0b', confirmed: '#3b82f6', pattern:  '#8b5cf6',
  cutting:     '#6366f1', sewing:    '#06b6d4', qc:       '#f97316',
  pressing:    '#ec4899', packing:   '#f472b6', completed:'#22c55e',
  cancelled:   '#ef4444', segregation:'#a78bfa',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const nav  = useNavigate();
  const user = (() => { try { return JSON.parse(sessionStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } })();
  const isManager = user.role === 'manager';

  // ── State ──────────────────────────────────────────────────────────────────
  const [data,      setData]      = useState(null);
  const [notifs,    setNotifs]    = useState([]);
  const [aiText,    setAiText]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [nLoading,  setNLoading]  = useState(true);
  const [aiLoading, setAiLoad]    = useState(false);
  const [lastAge,   setLastAge]   = useState(null); // ms since last dashboard fetch
  const [toast,     setToast]     = useState(null);
  const [showNotif, setShowNotif] = useState(false);

  // Track previous notifs for optimistic rollback
  const prevNotifs = useRef([]);

  // ── Fetch dashboard stats ─────────────────────────────────────────────────
  //    Cache key: 'dashboard_stats' | TTL: 2 min
  const loadDashboard = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) cacheClear('dashboard_stats');

    const cached = cacheGet('dashboard_stats');
    if (cached) {
      setData(cached);
      setLastAge(cacheAge('dashboard_stats'));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: res } = await axios.get('/api/admin/dashboard');
      setData(res);
      cacheSet('dashboard_stats', res, TTL.DASHBOARD);
      setLastAge(0); // just fetched
    } catch {
      setToast({ msg: 'Failed to load dashboard data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch notifications ───────────────────────────────────────────────────
  //    Cache key: 'notifications' | TTL: 1 min
  const loadNotifs = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) cacheClear('notifications');

    const cached = cacheGet('notifications');
    if (cached) {
      setNotifs(cached);
      setNLoading(false);
      return;
    }

    setNLoading(true);
    try {
      const { data: res } = await axios.get('/api/admin/notifications?per_page=20');
      const list = res.data ?? res.notifications ?? res ?? [];
      setNotifs(list);
      cacheSet('notifications', list, TTL.NOTIFICATIONS);
    } catch {
      // Non-fatal — notifications panel just shows empty
    } finally {
      setNLoading(false);
    }
  }, []);

  // ── NEW (Admin Dashboard rebuild — "needs my attention" blocks) ────────────
  // Each of these hits a real, already-existing endpoint (confirmed against
  // routes/api.php + the actual controller for each) — nothing here is
  // invented data. Same cacheGet/cacheSet pattern as loadDashboard/loadNotifs
  // above, reusing the existing TTL constants (no new ones added).

  // Orders needing action — GET /api/admin/orders?status=pending (OrderController::adminIndex)
  const [pendingOrders,  setPendingOrders]  = useState([]);
  const [poLoading,      setPoLoading]      = useState(true);
  const loadPendingOrders = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) cacheClear('dashboard_pending_orders');
    const cached = cacheGet('dashboard_pending_orders');
    if (cached) { setPendingOrders(cached); setPoLoading(false); return; }
    setPoLoading(true);
    try {
      const { data: res } = await axios.get('/api/admin/orders?status=pending&per_page=5');
      const list = res.data ?? [];
      setPendingOrders(list);
      cacheSet('dashboard_pending_orders', list, TTL.ORDERS);
    } catch {
      // Non-fatal — block just shows its empty state
    } finally {
      setPoLoading(false);
    }
  }, []);

  // RFQs awaiting supplier response — GET /api/admin/rfq?status=sent
  // (PurchaseOrderController::rfqIndex; rfq_requests.status enum: draft|sent|responded|closed)
  const [rfqsPending,    setRfqsPending]    = useState([]);
  const [rfqLoading,     setRfqLoading]     = useState(true);
  const loadRfqs = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) cacheClear('dashboard_pending_rfqs');
    const cached = cacheGet('dashboard_pending_rfqs');
    if (cached) { setRfqsPending(cached); setRfqLoading(false); return; }
    setRfqLoading(true);
    try {
      const { data: res } = await axios.get('/api/admin/rfq?status=sent&per_page=5');
      const list = res.data ?? [];
      setRfqsPending(list);
      cacheSet('dashboard_pending_rfqs', list, TTL.SUPPLIERS);
    } catch {
      // Non-fatal — block just shows its empty state
    } finally {
      setRfqLoading(false);
    }
  }, []);

  // Upcoming deliveries — GET /api/admin/delivery (DeliveryController::index)
  // NOTE: the real endpoint only accepts ONE delivery_status value per call
  // (a plain where(), not whereIn()) — so "upcoming" (anything not yet
  // delivered/returned) is filtered client-side against the real fetched
  // records, same pattern already used for `low` (low-stock materials)
  // elsewhere on this page, rather than guessing at a comma-separated
  // filter the backend doesn't actually support.
  const [deliveries,     setDeliveries]     = useState([]);
  const [delivLoading,   setDelivLoading]   = useState(true);
  const loadDeliveries = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) cacheClear('dashboard_upcoming_deliveries');
    const cached = cacheGet('dashboard_upcoming_deliveries');
    if (cached) { setDeliveries(cached); setDelivLoading(false); return; }
    setDelivLoading(true);
    try {
      const { data: res } = await axios.get('/api/admin/delivery?per_page=20');
      const list = (res.data ?? [])
        .filter(d => !['delivered', 'returned'].includes(d.delivery_status))
        .slice(0, 5);
      setDeliveries(list);
      cacheSet('dashboard_upcoming_deliveries', list, TTL.ORDERS);
    } catch {
      // Non-fatal — block just shows its empty state
    } finally {
      setDelivLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); loadNotifs(); loadPendingOrders(); loadRfqs(); loadDeliveries(); }, [loadDashboard, loadNotifs, loadPendingOrders, loadRfqs, loadDeliveries]);

  // ── Optimistic: mark single notification as read ──────────────────────────
  const markRead = useCallback(async (notifId) => {
    // 1. Snapshot for rollback
    prevNotifs.current = notifs;

    // 2. Optimistic update — dot disappears instantly
    setNotifs(prev =>
      prev.map(n => n.notif_id === notifId ? { ...n, is_read: true } : n)
    );

    try {
      // 3. Background PATCH
      await axios.patch(`/api/admin/notifications/${notifId}/read`);
      // 4. Invalidate cache — next load gets fresh data
      cacheClear('notifications');
    } catch {
      // 5. Rollback on error
      setNotifs(prevNotifs.current);
      setToast({ msg: 'Could not mark as read. Please retry.', type: 'error' });
    }
  }, [notifs]);

  // ── Optimistic: mark ALL notifications as read ────────────────────────────
  const markAllRead = useCallback(async () => {
    prevNotifs.current = notifs;
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await axios.post('/api/admin/notifications/read-all');
      cacheClear('notifications');
    } catch {
      setNotifs(prevNotifs.current);
      setToast({ msg: 'Could not mark all as read.', type: 'error' });
    }
  }, [notifs]);

  // ── AI Analytics Summary (manager only) ──────────────────────────────────
  const fetchAI = useCallback(async () => {
    if (!isManager) return;
    setAiLoad(true);
    try {
      const { data: res } = await axios.get('/api/admin/ai/analytics-summary');
      setAiText(res?.insight ?? '');
    } catch {
      setToast({ msg: 'AI summary unavailable.', type: 'error' });
    } finally {
      setAiLoad(false);
    }
  }, [isManager]);

  // ── Derived data ──────────────────────────────────────────────────────────
  // API returns nested: { orders:{total,in_production,...}, revenue:{total,month},
  //                       inventory:{low_stock_count, low_stock_materials},
  //                       production:{stage_dist, delivering}, recent_orders }
  // ...plus flat top-level aliases (total_orders, monthly_sales, etc.) added
  // specifically for this page — used below where the nested shape doesn't
  // have an equivalent (unreconciled_counts, monthly_sales).
  const s = {
    total_orders:        data?.orders?.total          ?? 0,
    active_orders:       data?.orders?.in_production  ?? 0,
    monthly_revenue:     data?.revenue?.month         ?? 0,
    low_stock_count:     data?.inventory?.low_stock_count ?? 0,
    pending_deliveries:  data?.production?.delivering ?? 0,
    // FIX: this was hardcoded to 0 — always showed "0 Pending Count"
    // regardless of actual physical-count reconciliation state.
    unreconciled_counts: data?.unreconciled_counts    ?? 0,
  };
  // FIX: production.stage_dist is per-stage ORDER COUNTS ({stage,count}),
  // not monthly revenue ({month,total}) — feeding it into the revenue bar
  // chart rendered empty/garbage. monthly_sales is the correct field.
  const monthly = data?.monthly_sales               ?? [];
  const recent  = data?.recent_orders              ?? [];
  const low     = data?.inventory?.low_stock_materials ?? [];
  const delayed = data?.production?.delayed_orders     ?? [];
  const delayedThresholdDays = data?.production?.delayed_threshold_days ?? 3;
  const unreadCount = notifs.filter(n => !n.is_read).length;

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const ageLbl = ageLabel(lastAge);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes sk { 0%   { background-position: -400px 0; }
                        100% { background-position:  400px 0; } }
        @keyframes countUp {
          from { opacity:0; transform:translateY(6px) scale(.92); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:.45; }
        }
        * { box-sizing: border-box; }

        /* ── KPI grid: responsive columns ── */
        .adm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }
        @media (max-width: 767px) {
          .adm-kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        }
        @media (min-width: 2560px) {
          .adm-kpi-grid { grid-template-columns: repeat(6, 1fr); }
        }

        /* ── Action-list grid ("Needs Your Attention") — same breakpoints
             as adm-kpi-grid above, for consistency. 5 blocks: 3 cols on
             desktop wraps to 2 rows, 2 cols tablet, 1 col mobile. ── */
        .adm-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        @media (max-width: 767px) {
          .adm-action-grid { grid-template-columns: 1fr; gap: 12px; margin-bottom: 14px; }
        }
        @media (min-width: 2560px) {
          .adm-action-grid { grid-template-columns: repeat(5, 1fr); }
        }

        /* ── Main 2-col grid: stacks on mobile ── */
        .adm-main-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 1023px) {
          .adm-main-grid { grid-template-columns: 1fr; }
        }

        /* ── KPI card count-up spring animation ── */
        .adm-kpi-val {
          animation: countUp .45s cubic-bezier(.34,1.56,.64,1) both;
        }

        /* ── In-production pulse dot ── */
        .adm-prod-pulse {
          display: inline-block;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #f59e0b;
          animation: pulse 1.6s ease-in-out infinite;
          margin-right: 6px;
          vertical-align: middle;
        }

        /* ── Hero: responsive padding ── */
        .adm-dash-hero {
          background: linear-gradient(135deg, #028090, #02C39A);
          border-radius: 16px;
          padding: 22px 26px;
          margin-bottom: 22px;
          box-shadow: 0 6px 24px rgba(2,128,144,.25);
        }
        @media (max-width: 767px) {
          .adm-dash-hero { padding: 16px 18px; margin-bottom: 16px; border-radius: 12px; }
        }

        /* ── Notification panel: full-width on mobile ── */
        .adm-notif-panel {
          position: absolute;
          top: calc(100% + 8px); right: 0;
          width: 340px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,.12);
          z-index: 200;
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .adm-notif-panel {
            position: fixed;
            top: auto; bottom: 74px;
            left: 12px; right: 12px;
            width: auto;
            border-radius: 16px;
          }
        }
      `}</style>

      {/* ── Hero banner ── */}
      <div className="adm-dash-hero">
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 13, marginBottom: 3 }}>
              {greet}, {user.name?.split(' ')[0] ?? 'Admin'} 👋
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
              {isManager ? 'Manager Dashboard' : 'Staff Dashboard'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, margin: 0 }}>
                VFRB Enterprise · {new Date().toLocaleDateString('en-PH', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
              {ageLbl && (
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.7)',
                }}>
                  Updated {ageLbl}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Notifications bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotif(v => !v)}
                style={{
                  padding: '9px 14px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.3)',
                  background: showNotif ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.15)',
                  color: '#fff', fontSize: 16, cursor: 'pointer', position: 'relative',
                }}>
                🔔
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#ef4444', color: '#fff',
                      fontSize: 8, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid rgba(255,255,255,.9)',
                    }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="adm-notif-panel">
                    <div style={{
                      padding: '12px 14px', borderBottom: '1px solid #f1f5f9',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Notifications
                      </p>
                      <button onClick={() => loadNotifs(true)}
                        style={{
                          border: 'none', background: 'transparent',
                          color: '#94a3b8', fontSize: 12, cursor: 'pointer',
                        }}>
                        ↻
                      </button>
                    </div>
                    <NotifPanel
                      notifs={notifs}
                      loading={nLoading}
                      onMarkRead={markRead}
                      onMarkAll={markAllRead}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => nav('/admin/orders')}
              style={{
                padding: '9px 18px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,.3)',
                background: 'rgba(255,255,255,.2)', color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}>
              View Orders →
            </button>

            {isManager && (
              <button onClick={fetchAI} disabled={aiLoading}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.3)',
                  background: 'rgba(255,255,255,.15)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                {aiLoading ? '⏳ Analyzing…' : '🤖 AI Summary'}
              </button>
            )}

            {/* Force refresh — clears cache then reloads */}
            <button
              onClick={() => { loadDashboard(true); loadNotifs(true); }}
              disabled={loading}
              title="Force refresh (clears cache)"
              style={{
                padding: '9px 12px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,.2)',
                background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.75)',
                fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading ? '⏳' : '↻'}
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          NEEDS YOUR ATTENTION — the actual redesign requirement.
          Every block below is a clickable list backed by a REAL endpoint
          (confirmed against the actual Laravel controllers, not guessed):
            - Orders needing action  → GET /api/admin/orders?status=pending
            - Materials running low  → data.inventory.low_stock_materials
                                        (already fetched via /api/admin/dashboard)
            - Production delays      → NOT YET AVAILABLE — see note below
            - RFQs awaiting response → GET /api/admin/rfq?status=sent
            - Upcoming deliveries    → GET /api/admin/delivery (client-filtered
                                        to non-terminal statuses; the real
                                        endpoint only accepts one delivery_status
                                        value per call, confirmed in
                                        DeliveryController::index — not the
                                        comma-separated filter orders supports)
         ══════════════════════════════════════════════════════════════════ */}
      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
        Needs Your Attention
      </h2>
      <div className="adm-action-grid">

        <ActionListCard
          icon="📥" title="Orders Needing Action" accent="#028090"
          items={pendingOrders} loading={poLoading}
          emptyLabel="No pending orders — all caught up"
          footerLabel="View All Pending Orders" onFooter={() => nav('/admin/orders?status=pending')}
          renderItem={(o) => (
            <div key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)}
              style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  #{o.order_id} · {o.garment_type ?? '—'}
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>
                  {o.customer_name ?? '—'}
                </p>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, flexShrink: 0 }}>
                {o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
              </p>
            </div>
          )}
        />

        <ActionListCard
          icon="📦" title="Materials Running Low" accent="#ef4444"
          items={low} loading={loading}
          emptyLabel="No materials below reorder threshold"
          footerLabel="Manage Inventory" onFooter={() => nav('/admin/inventory')}
          renderItem={(m) => (
            <div key={m.material_id} onClick={() => nav('/admin/inventory')}
              style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.material_name}
              </p>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', margin: 0, flexShrink: 0 }}>
                {m.quantity_in_stock} {m.unit}
              </p>
            </div>
          )}
        />

        <ActionListCard
          icon="⏱" title="Production Delays" accent="#f59e0b"
          items={delayed} loading={loading}
          emptyLabel={`No stages stalled ${delayedThresholdDays}+ days`}
          footerLabel="View Production" onFooter={() => nav('/admin/production')}
          renderItem={(o) => (
            <div key={o.order_id} onClick={() => nav(`/admin/orders/${o.order_id}`)}
              style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Order #{o.order_id} — {o.customer_name}
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', textTransform: 'capitalize' }}>
                  {o.stage} · {o.qty_completed}/{o.qty_target} pcs
                </p>
              </div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', margin: 0, flexShrink: 0 }}>
                {o.days_stalled}d stalled
              </p>
            </div>
          )}
        />

        <ActionListCard
          icon="📨" title="RFQs Awaiting Response" accent="#028090"
          items={rfqsPending} loading={rfqLoading}
          emptyLabel="No RFQs waiting on a supplier"
          footerLabel="View Procurement" onFooter={() => nav('/admin/procurement')}
          renderItem={(r) => (
            <div key={r.rfq_id} onClick={() => nav('/admin/procurement')}
              style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.material_name}
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>
                  {r.qty_needed} {r.unit}
                </p>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, flexShrink: 0 }}>
                {r.needed_by_date
                  ? new Date(r.needed_by_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                  : 'No deadline'}
              </p>
            </div>
          )}
        />

        <ActionListCard
          icon="🚚" title="Upcoming Deliveries" accent="#028090"
          items={deliveries} loading={delivLoading}
          emptyLabel="No deliveries in progress"
          footerLabel="View Delivery Tracking" onFooter={() => nav('/admin/delivery')}
          renderItem={(d) => (
            <div key={d.tracking_id} onClick={() => nav('/admin/delivery')}
              style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.customer_name ?? '—'} · {d.garment_type ?? '—'}
                </p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0', textTransform: 'capitalize' }}>
                  {d.delivery_status?.replace('_', ' ')}
                </p>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, flexShrink: 0 }}>
                {d.estimated_delivery_date
                  ? new Date(d.estimated_delivery_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                  : '—'}
              </p>
            </div>
          )}
        />

      </div>

      {/* ── Gemini Insight Card ── */}
      {isManager && (aiText || aiLoading) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderLeft: '4px solid #7c3aed',
            borderRadius: 14, padding: '16px 20px', marginBottom: 22,
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}
        >
          {/* ✦ Gemini badge */}
          <div style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 2px 8px rgba(124,58,237,.25)',
          }}>
            ✦
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', margin: 0,
                textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Gemini AI Insight
              </p>
              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 99,
                background: 'rgba(124,58,237,.1)', color: '#7c3aed',
                fontWeight: 700, border: '1px solid rgba(124,58,237,.2)' }}>
                Manager Only
              </span>
            </div>

            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[72, 88, 55].map((w, i) => (
                  <div key={i} style={{ ...SK_STYLE, height: 10, width: `${w}%`,
                    background: 'linear-gradient(90deg,#ede9fe 25%,#ddd6fe 50%,#ede9fe 75%)' }} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#4c1d95', lineHeight: 1.85,
                margin: 0, fontStyle: 'italic' }}>
                "{aiText}"
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── KPI grid ── */}
      <div className="adm-kpi-grid">
        {[
          { icon: '📋', label: 'Total Orders',    value: s.total_orders   ?? 0,  sub: 'All time',       grad: 'linear-gradient(135deg,#028090,#02c39a)', shadow: '0 6px 18px rgba(2,128,144,.24)', path: '/admin/orders' },
          { icon: '⚙️', label: 'In Production',  value: s.active_orders  ?? 0,  sub: 'Active now',     grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)', shadow: '0 6px 18px rgba(124,58,237,.22)', path: '/admin/orders' },
          { icon: '💰', label: 'Revenue (Month)', value: `₱${Number(s.monthly_revenue ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`, sub: 'This month', grad: 'linear-gradient(135deg,#16a34a,#4ade80)', shadow: '0 6px 18px rgba(22,163,74,.22)' },
          { icon: '⚠️', label: 'Low Stock',       value: s.low_stock_count ?? 0, sub: 'Needs reorder',  grad: 'linear-gradient(135deg,#d97706,#fbbf24)', shadow: '0 6px 18px rgba(217,119,6,.24)', path: '/admin/inventory' },
          // FIX: this card and the new "Upcoming Deliveries" action block
          // above were both labeled "Deliveries" but count different things
          // — this KPI is dispatched+in_transit only (production.delivering),
          // the action block also includes 'preparing'. Same real number,
          // just relabeled so the two don't look like a data bug when
          // they're actually two different (both correct) metrics.
          { icon: '🚚', label: 'In Transit',       value: s.pending_deliveries ?? 0, sub: 'Dispatched',  grad: 'linear-gradient(135deg,#2563eb,#60a5fa)', shadow: '0 6px 18px rgba(37,99,235,.22)', path: '/admin/delivery' },
          { icon: '📊', label: 'Pending Count',   value: s.unreconciled_counts ?? 0, sub: 'Physical count', grad: 'linear-gradient(135deg,#4f46e5,#818cf8)', shadow: '0 6px 18px rgba(79,70,229,.22)', path: '/admin/physical-count' },
        ].map(k => (
          <KPICard key={k.label} {...k} loading={loading}
            onClick={k.path ? () => nav(k.path) : undefined} />
        ))}
      </div>

      <div className="adm-main-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Monthly revenue chart */}
          {(loading || monthly.length > 0) && (
            <div style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
              padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                Monthly Revenue
              </h3>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
                Sales transactions by month
              </p>
              {loading
                ? <div style={{ ...SK_STYLE, height: 200, borderRadius: 10 }} />
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={v => [`₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'Revenue']}
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="total" fill={T} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          )}

          {/* ── Stage distribution chart (Task BB) ── */}
          {(() => {
            // FIX: 'pipeline_snapshot' doesn't exist anywhere in the actual
            // backend response (confirmed against AdminDashboardController.php)
            // — this chart always read undefined and silently rendered
            // nothing. The real field is production.stage_dist: an array of
            // { stage, count }, not an object keyed by stage name.
            const stageDist = data?.production?.stage_dist ?? [];
            const STAGE_ORDER = [
              'pending','confirmed','pattern','segregation',
              'cutting','sewing','qc','pressing','packing','completed',
            ];
            const countByStage = Object.fromEntries(stageDist.map(s => [s.stage, s.count]));
            const stageData = STAGE_ORDER
              .filter(s => (countByStage[s] ?? 0) > 0)
              .map(s => ({
                stage: s.charAt(0).toUpperCase() + s.slice(1),
                count: countByStage[s] ?? 0,
                color: STATUS_COLORS[s] ?? T,
              }));
            if (!loading && stageData.length === 0) return null;
            return (
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 3px' }}>
                  Orders by Stage
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 14px' }}>
                  Current pipeline distribution
                </p>
                {loading ? (
                  <div style={{ ...SK_STYLE, height: 160, borderRadius: 10 }} />
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={stageData}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis
                        type="number" allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        type="category" dataKey="stage" width={78}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => [v, 'Orders']}
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0',
                          borderRadius: 10, fontSize: 12 }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={16}>
                        {stageData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })()}

          {/* ── Orders this week sparkline (Task BB) ── */}
          {(() => {
            const trends = data?.order_trends ?? [];
            if (!loading && trends.length < 2) return null;
            return (
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.05)',
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 3px' }}>
                  Order Trend
                </h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 14px' }}>
                  Orders received · last 6 months
                </p>
                {loading ? (
                  <div style={{ ...SK_STYLE, height: 100, borderRadius: 10 }} />
                ) : (
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={trends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        axisLine={false} tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                        axisLine={false} tickLine={false}
                      />
                      <Tooltip
                        formatter={(v) => [v, 'Orders']}
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0',
                          borderRadius: 10, fontSize: 11 }}
                      />
                      <Line
                        type="monotone" dataKey="orders"
                        stroke={T2} strokeWidth={2.5}
                        dot={{ fill: T2, r: 3 }}
                        activeDot={{ r: 5, fill: T }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })()}

          {/* Recent orders */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
          }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Recent Orders
              </h3>
              <button onClick={() => nav('/admin/orders')}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none',
                  background: '#f0fdfa', color: T, fontSize: 11,
                  fontWeight: 700, cursor: 'pointer',
                }}>
                All Orders →
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ ...SK_STYLE, height: 14 }} />)}
              </div>
            ) : recent.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No orders yet</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Order', 'Customer', 'Garment', 'Status', 'Date'].map(h => (
                      <th key={h} style={{
                        padding: '8px 14px', textAlign: 'left', fontSize: 9,
                        fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                        letterSpacing: '.07em', borderBottom: '1px solid #f1f5f9',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 6).map(o => {
                    const c = STATUS_COLORS[o.status] ?? '#64748b';
                    return (
                      <tr key={o.order_id}
                        style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                        onClick={() => nav('/admin/orders')}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: T }}>
                          #{o.order_id}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#0f172a' }}>
                          {/* FIX: backend returns customer_name (flat field),
                              never a nested user object — o.user?.name was
                              always undefined, always showing '—'. */}
                          {o.customer_name ?? '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b' }}>
                          {o.garment_type ?? '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: 99, fontSize: 9,
                            fontWeight: 700, background: `${c}18`, color: c,
                            textTransform: 'capitalize',
                          }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8' }}>
                          {o.created_at
                            ? new Date(o.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick actions */}
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 14, padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,.05)',
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '📋', l: 'View Orders',       path: '/admin/orders'          },
                { icon: '📦', l: 'Inventory',          path: '/admin/inventory'       },
                { icon: '🧵', l: 'Production',         path: '/admin/production'      },
                { icon: '🛒', l: 'Purchase Orders',    path: '/admin/procurement'     },
                { icon: '📋', l: 'Physical Count',     path: '/admin/physical-count'  },
                ...(isManager ? [
                  { icon: '📊', l: 'Reports & Alerts', path: '/admin/reports'         },
                  { icon: '👥', l: 'User Management',  path: '/admin/users'           },
                ] : []),
              ].map(a => (
                <button key={a.l} onClick={() => nav(a.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10,
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .13s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.borderColor = T + '40'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{a.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Prescriptive MRP alerts (Task BB) ── */}
          {isManager && (() => {
            const alerts = data?.prescriptive_alerts ?? [];
            const critical = alerts.filter(a => a.severity === 'critical');
            const warnings = alerts.filter(a => a.severity === 'warning');
            if (!loading && alerts.length === 0) return null;
            return (
              <div style={{
                background: '#fff',
                border: `1px solid ${critical.length > 0 ? '#fecaca' : '#fed7aa'}`,
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,.05)',
              }}>
                <div style={{
                  padding: '12px 14px',
                  background: critical.length > 0 ? '#fef2f2' : '#fff7ed',
                  borderBottom: `1px solid ${critical.length > 0 ? '#fecaca' : '#fed7aa'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 800,
                    color: critical.length > 0 ? '#991b1b' : '#92400e', margin: 0 }}>
                    {critical.length > 0 ? '🚨' : '⚡'}{' '}
                    MRP Alerts ({alerts.length})
                  </p>
                  <button onClick={() => nav('/admin/reports')}
                    style={{ fontSize: 9, color: T, fontWeight: 700,
                      background: 'none', border: 'none', cursor: 'pointer' }}>
                    Full Report →
                  </button>
                </div>
                {loading ? (
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2].map(i => <div key={i} style={{ ...SK_STYLE, height: 36 }} />)}
                  </div>
                ) : (
                  alerts.slice(0, 4).map((a, i) => (
                    <div key={i} style={{
                      padding: '9px 14px',
                      borderBottom: i < Math.min(alerts.length, 4) - 1
                        ? `1px solid ${a.severity === 'critical' ? '#fef2f2' : '#fff7ed'}`
                        : 'none',
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>
                        {a.severity === 'critical' ? '🔴' : '🟡'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 700,
                          color: a.severity === 'critical' ? '#991b1b' : '#92400e',
                          margin: '0 0 2px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {a.material ?? a.message?.split(':')[0] ?? 'Alert'}
                        </p>
                        <p style={{ fontSize: 10, color: '#64748b', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.action ?? a.message ?? ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          {/* Low stock alerts */}
          {(loading || low.length > 0) && (
            <div style={{
              background: '#fff', border: '1px solid #fecaca',
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
            }}>
              <div style={{
                padding: '12px 14px',
                background: '#fef2f2', borderBottom: '1px solid #fecaca',
              }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#991b1b', margin: 0 }}>
                  ⚠️ {loading ? '—' : low.length} Low Stock Item{low.length !== 1 ? 's' : ''}
                </p>
              </div>
              {loading
                ? <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2].map(i => <div key={i} style={{ ...SK_STYLE, height: 36 }} />)}
                  </div>
                : low.slice(0, 5).map(m => (
                    <div key={m.material_id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '9px 14px',
                      borderBottom: '1px solid #fef2f2',
                    }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                          {m.material_name}
                        </p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>
                          {m.category ?? '—'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', margin: 0 }}>
                          {m.quantity_in_stock}
                        </p>
                        <p style={{ fontSize: 9, color: '#94a3b8', margin: '1px 0 0' }}>
                          {m.unit}
                        </p>
                      </div>
                    </div>
                  ))
              }
              <button onClick={() => nav('/admin/inventory')}
                style={{
                  width: '100%', padding: '10px', border: 'none',
                  background: 'transparent', color: T, fontSize: 11,
                  fontWeight: 700, cursor: 'pointer',
                  borderTop: '1px solid #fecaca',
                }}>
                Manage Inventory →
              </button>
            </div>
          )}

          {/* SAP alignment */}
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)',
          }}>
            <p style={{ fontSize: 10, color: 'rgba(99,102,241,.7)', fontWeight: 700, marginBottom: 5 }}>
              SAP ERP Alignment
            </p>
            <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              VA01→CO11N→MIGO MT-261→VL01N→F-28 · 7-stage pipeline · MI01/MI07 physical count
            </p>
          </div>
        </div>
      </div>

      {/* Overlay closer for notif panel */}
      {showNotif && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100 }}
          onClick={() => setShowNotif(false)}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast key="toast" msg={toast.msg} type={toast.type}
            onDone={() => setToast(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
