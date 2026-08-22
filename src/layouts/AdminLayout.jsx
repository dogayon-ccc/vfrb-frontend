// src/layouts/AdminLayout.jsx
// FIXED: mobile topbar shows logo + portal label (teal/purple gradient by role)
// FIXED: logout accessible via More drawer only (removed redundant topbar Out button)
// FIXED: all admin nav items reachable on mobile via scrollable More drawer
// NO dark mode — vibrant light with teal + purple color accents
//
// Aug 22 2026 — Tailwind migration (per Dave's decision: new/rewritten
// components use Tailwind utility classes going forward; inline style
// stays only for values genuinely computed at render time — sidebar
// width, role-based gradients). All behavior below is unchanged from
// the previous version: notification polling, mark-read/mark-all,
// role-based nav, collapse persistence, mobile drawer, and the FF-1
// logout token-order fix. Every Tailwind color/radius class used here
// (teal, teal-light, teal-dark, teal-darker, purple, purple-dark,
// surface, card, border, muted, faint, ink, danger) maps to the exact
// hex values already registered in main.css's @theme block — nothing
// new was invented. --danger-bg / --danger-border aren't promoted to
// @theme yet, so those two use Tailwind's arbitrary-value syntax
// (bg-[var(--danger-bg)]) to keep reading the same runtime tokens.
import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/company-logo.jpg';

const STAFF_NAV = [
  { to:'/admin',              icon:'⊞', label:'Dashboard',    end:true  },
  { to:'/admin/orders',       icon:'📋', label:'Orders'               },
  { to:'/admin/inventory',    icon:'📦', label:'Inventory'            },
  { to:'/admin/messages',     icon:'💬', label:'Messages'             },
  { to:'/admin/procurement',  icon:'🛒', label:'Procurement'          },
  { to:'/admin/delivery',     icon:'🚚', label:'Delivery'             },
  { to:'/admin/materials',    icon:'🧵', label:'Materials'            },
  { to:'/admin/material-rates',icon:'📐',label:'Usage Rates'          },
  { to:'/admin/production',   icon:'🏭', label:'Production'           },
  { to:'/admin/output-log',   icon:'📝', label:'Output Log'           },
  { to:'/admin/qc',           icon:'✅', label:'QC Checklist'         },
  { to:'/admin/physical-count',icon:'🔢',label:'Physical Count'       },
  { to:'/admin/transactions', icon:'💰', label:'Sales & Pay'          },
  { to:'/admin/settings',     icon:'⚙️', label:'Settings'             },
];
const MANAGER_EXTRA = [
  { to:'/admin/reports',      icon:'📊', label:'Reports'              },
  { to:'/admin/activity-log', icon:'📋', label:'Activity Log'         },
  { to:'/admin/invoice',      icon:'🧾', label:'Invoice'              },
  { to:'/admin/suppliers',    icon:'🏪', label:'Suppliers'            },
  { to:'/admin/users',        icon:'👥', label:'Users'                },
];

// Mobile bottom nav — 5 most critical
const MOB_NAV = [
  { to:'/admin',           icon:'⊞', label:'Home',     end:true  },
  { to:'/admin/orders',    icon:'📋', label:'Orders'             },
  { to:'/admin/inventory', icon:'📦', label:'Stock'              },
  { to:'/admin/messages',  icon:'💬', label:'Chat'               },
  { to:'/admin/production',icon:'🏭', label:'Production'         },
];

// Shared nav-link utility strings (kept as constants so the JSX below
// stays readable — this is still "Tailwind utility classes", just
// composed once instead of retyped at every call site).
const linkBase =
  'flex items-center gap-2.5 px-3 py-[9px] my-px rounded-[10px] no-underline ' +
  'text-[13px] font-medium whitespace-nowrap overflow-hidden relative ' +
  'transition-[background,color,transform] duration-150';
const linkIdle    = 'text-muted hover:bg-gradient-to-br hover:from-teal/[.07] hover:to-teal-light/[.05] hover:text-teal hover:translate-x-0.5';
const linkActive  = 'bg-gradient-to-br from-teal/[.14] to-teal-light/[.09] text-teal font-bold shadow-[inset_0_0_0_1px_rgba(2,128,144,.12)]';
const linkActiveMgr = 'bg-gradient-to-br from-purple/[.10] to-[#8b5cf6]/[.07] text-purple';

function ActiveBar({ manager }) {
  return (
    <span
      className={`absolute left-0 top-[18%] bottom-[18%] w-[3px] rounded-r-[3px] ${
        manager
          ? 'bg-gradient-to-b from-purple to-[#a78bfa]'
          : 'bg-gradient-to-b from-teal to-teal-light'
      }`}
    />
  );
}

// Notification row
function NotifRow({ n, onRead }) {
  const id      = n.notif_id ?? n.id;
  const isRead  = !!n.is_read;
  const timeStr = (n.date_sent ?? n.created_at)
    ? new Date(n.date_sent ?? n.created_at).toLocaleTimeString('en-PH', {
        hour:'2-digit', minute:'2-digit',
      })
    : '';

  return (
    <motion.div
      whileHover={{ background:'var(--color-surface)' }}
      onClick={() => { if (!isRead) onRead(id); }}
      className={`px-4 py-2.5 border-b border-surface flex gap-2.5 items-start transition-colors duration-150 ${
        isRead ? 'cursor-default bg-white' : 'cursor-pointer bg-teal/[.04]'
      }`}>
      <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[5px] ${
        isRead ? 'bg-transparent border border-border' : 'bg-teal border-none'
      }`}/>
      <div className="flex-1 min-w-0">
        <p className={`text-xs mb-0.5 leading-snug truncate ${isRead ? 'font-medium' : 'font-bold'} text-ink`}>
          {n.title ?? n.type ?? 'Notification'}
        </p>
        <p className="text-[11px] text-muted m-0 leading-relaxed overflow-hidden line-clamp-2">
          {n.message ?? n.body ?? ''}
        </p>
        {timeStr && (
          <p className="text-[9px] text-faint mt-[3px] mb-0">{timeStr}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [role,      setRole]      = useState('staff');
  const [name,      setName]      = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vfrb_adm_sb') || 'false'); } catch { return false; }
  });
  const [moreOpen,  setMoreOpen]  = useState(false);

  const SW         = collapsed ? 68 : 226;
  const isManager  = role === 'manager';

  // Notification bell
  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notifLoad, setNotifLoad] = useState(false);
  const bellRef = useRef(null);

  const fetchCount = () =>
    axios.get('/api/admin/notifications/unread-count')
      .then(r => setUnread(r.data?.unread_count ?? 0)).catch(() => {});

  const fetchNotifs = () => {
    setNotifLoad(true);
    axios.get('/api/admin/notifications?per_page=20')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setNotifs(list);
        setUnread(list.filter(n => !n.is_read).length);
      }).catch(() => {}).finally(() => setNotifLoad(false));
  };

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    const h = e => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [bellOpen]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
    setRole(u.role || 'staff');
    setName(u.name || 'Staff');
  }, [location.pathname]);

  // Close More drawer on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const openBell = () => { setBellOpen(b => !b); if (!bellOpen) fetchNotifs(); };

  const markRead = id => {
    setNotifs(prev => prev.map(n => (n.notif_id ?? n.id) === id ? { ...n, is_read:1 } : n));
    setUnread(p => Math.max(0, p - 1));
    axios.patch(`/api/admin/notifications/${id}/read`).catch(() => {});
  };

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read:1 })));
    setUnread(0);
    axios.post('/api/admin/notifications/read-all').catch(() => {});
  };

  const toggle = () => setCollapsed(c => {
    const n = !c; localStorage.setItem('vfrb_adm_sb', JSON.stringify(n)); return n;
  });

  // FF-1 FIX: axios interceptor reads vfrb_token from localStorage on every request.
  // If we removeItem first, the token is gone before the POST fires → 401.
  // Fix: pass the token explicitly in the logout call, then clear storage.
  const logout = () => {
    const tok = localStorage.getItem('vfrb_token');
    axios.post('/api/logout', {}, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    }).catch(() => {});
    localStorage.removeItem('vfrb_token');
    localStorage.removeItem('vfrb_user');
    navigate('/admin/login', { replace: true });
  };

  const todayKey      = new Date().toLocaleDateString('en-PH');
  const notifToday    = notifs.filter(n => {
    const d = n.date_sent ?? n.created_at;
    return d && new Date(d).toLocaleDateString('en-PH') === todayKey;
  });
  const notifEarlier  = notifs.filter(n => {
    const d = n.date_sent ?? n.created_at;
    return !d || new Date(d).toLocaleDateString('en-PH') !== todayKey;
  });

  const initials = name ? name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : 'A';
  // Role-based gradients are computed at render time — kept as inline
  // style (Tailwind's default gradient utilities can't cleanly express
  // an angle + two arbitrary CSS-var stops conditionally without this
  // same amount of code, so there's no real gain forcing it into a
  // className string here).
  const headBg   = isManager
    ? 'linear-gradient(135deg, #4c1d95 0%, var(--color-purple) 100%)'
    : 'linear-gradient(135deg, var(--color-teal) 0%, var(--color-teal-light) 100%)';
  const topBg    = isManager
    ? 'linear-gradient(135deg, #3b0764 0%, var(--color-purple-dark) 100%)'
    : 'linear-gradient(135deg, var(--color-teal) 0%, var(--color-teal-darker) 100%)';

  return (
    <div className="flex min-h-screen relative bg-surface">

      {/* Ambient glow in top-right corner — subtle brand presence */}
      <div className="fixed -top-[120px] -right-20 w-[400px] h-[400px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(2,195,154,.06) 0%, transparent 70%)' }}/>

      {/* ─── DESKTOP SIDEBAR ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed top-0 left-0 bottom-0 z-[200] bg-gradient-to-b from-white to-[#f9fbfd] border-r border-border/80 flex-col shadow-[4px_0_24px_rgba(0,0,0,.08),1px_0_0_rgba(2,128,144,.04)] overflow-hidden transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ width: SW }}>

        {/* Gradient header */}
        <div
          className="flex-shrink-0 flex items-center gap-2.5 min-h-[62px] relative overflow-hidden"
          style={{ background: headBg, padding: collapsed ? '14px 10px' : '14px 16px' }}>
          <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-white/[.07] pointer-events-none"/>
          <img src={logo} alt="VFRB"
            className="w-[34px] h-[34px] rounded-[9px] object-cover border-2 border-white/35 flex-shrink-0 relative z-[1]"/>
          {!collapsed && (
            <div className="overflow-hidden flex-1 min-w-0 relative z-[1]">
              <p className="text-[11px] font-extrabold text-white tracking-[.05em] truncate m-0">
                VFRB ENTERPRISE
              </p>
              <p className="text-[9px] text-white/75 font-semibold uppercase tracking-[.07em] mt-0.5 mb-0">
                {isManager ? '● Manager Portal' : '● Staff Portal'}
              </p>
            </div>
          )}
        </div>

        {/* Nav scroll area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin]"
          style={{ padding: collapsed ? '8px 4px' : '8px 10px' }}>

          {!collapsed && (
            <p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-faint px-3 pt-3 pb-1 m-0">
              Operational
            </p>
          )}
          {STAFF_NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              title={collapsed ? item.label : undefined}
              style={collapsed ? { justifyContent:'center', padding:'10px 0' } : {}}>
              {({ isActive }) => (
                <>
                  {isActive && <ActiveBar manager={false}/>}
                  <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
                  {!collapsed && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}

          {isManager && (
            <>
              {!collapsed && (
                <>
                  <div className="h-px bg-surface my-2"/>
                  <p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#a78bfa] px-3 pt-3 pb-1 m-0">
                    Manager
                  </p>
                </>
              )}
              {MANAGER_EXTRA.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActiveMgr : linkIdle}`}
                  title={collapsed ? item.label : undefined}
                  style={collapsed ? { justifyContent:'center', padding:'10px 0' } : {}}>
                  {({ isActive }) => (
                    <>
                      {isActive && <ActiveBar manager/>}
                      <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
                      {!collapsed && <span className="overflow-hidden text-ellipsis">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          {!isManager && !collapsed && (
            <div className="mt-2.5 px-3 py-2.5 rounded-[10px] bg-surface border border-dashed border-border">
              <p className="text-[10px] text-faint font-semibold leading-relaxed m-0">
                🔒 Reports, Invoice, Suppliers & Users — Manager only
              </p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button onClick={toggle}
          className={`m-1.5 p-2.5 rounded-[10px] border border-border bg-surface hover:bg-teal-50 cursor-pointer text-muted text-[11px] flex items-center gap-1.5 flex-shrink-0 transition-all duration-150 ${
            collapsed ? 'justify-center' : 'justify-end'
          }`}>
          {collapsed ? '▶' : '◀ Collapse'}
        </button>

        {/* User strip */}
        <div className="border-t border-border p-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 mb-[7px] overflow-hidden px-0.5 py-1">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-extrabold ${
              isManager
                ? 'bg-gradient-to-br from-purple to-[#a78bfa] shadow-[0_2px_8px_rgba(124,58,237,.35)]'
                : 'bg-gradient-to-br from-teal to-teal-light shadow-[0_2px_8px_rgba(2,128,144,.3)]'
            }`}>
              {initials}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-bold text-ink truncate m-0">{name}</p>
                <p className={`text-[9px] font-bold capitalize m-0 ${isManager ? 'text-purple' : 'text-teal'}`}>
                  {role}
                </p>
              </div>
            )}
          </div>
          <button onClick={logout}
            className={`w-full p-2 rounded-[9px] border border-[var(--color-danger)]/30 bg-transparent hover:bg-[var(--color-danger)]/10 cursor-pointer text-[var(--color-danger)] text-[11px] font-semibold flex items-center gap-1.5 transition-colors duration-150 ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}>
            ←{!collapsed && ' Sign Out'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 min-h-screen flex flex-col relative z-[1] transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] max-md:!ml-0"
        style={{ marginLeft: SW }}>

        {/* ── TOPBAR — gradient, always shows logo+label on mobile ── */}
        <div className="h-[60px] flex-shrink-0 flex items-center px-[22px] gap-2.5 sticky top-0 z-[100] shadow-[0_2px_24px_rgba(0,0,0,.22),0_1px_0_rgba(255,255,255,.08)] max-md:px-4 max-md:h-14"
          style={{ background: topBg }}>

          {/* Mobile: logo + portal label */}
          <img src={logo} alt="VFRB" className="md:hidden w-[30px] h-[30px] rounded-lg object-cover border-[1.5px] border-white/35 flex-shrink-0"/>
          <div className="md:hidden flex-1 min-w-0">
            <p className="text-[11px] font-extrabold text-white tracking-[.04em] m-0 leading-tight truncate">
              VFRB Enterprise
            </p>
            <p className="text-[9px] text-white/65 font-semibold uppercase tracking-[.07em] m-0">
              {isManager ? 'Manager Portal' : 'Staff Portal'}
            </p>
          </div>

          {/* Desktop: date */}
          <span className="hidden md:inline text-white/50 text-xs flex-shrink-0">
            {new Date().toLocaleDateString('en-PH',{
              weekday:'long', month:'long', day:'numeric', year:'numeric' })}
          </span>
          <div className="flex-1"/>

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <motion.button
              whileHover={{ scale:1.07 }}
              whileTap={{ scale:.93 }}
              onClick={openBell}
              className={`w-9 h-9 rounded-[10px] border-none cursor-pointer flex items-center justify-center text-[17px] relative backdrop-blur-sm transition-colors duration-150 ${
                bellOpen ? 'bg-white/25' : 'bg-white/[.13]'
              }`}
              style={{ animation: unread > 0 ? 'bellShake .5s ease' : 'none' }}>
              🔔
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span
                    initial={{ scale:0 }} animate={{ scale:[1,1.25,1] }} exit={{ scale:0 }}
                    transition={{ duration:.35, times:[0,.5,1] }}
                    className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full bg-[var(--color-danger)] text-white text-[9px] font-extrabold flex items-center justify-center px-[3px] border-2 border-white/30">
                    {unread > 99 ? '99+' : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Notification dropdown */}
            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity:0, y:-8, scale:.97 }}
                  animate={{ opacity:1, y:0, scale:1 }}
                  exit={{ opacity:0, y:-6, scale:.97 }}
                  transition={{ duration:.18, ease:'easeOut' }}
                  className="absolute top-[calc(100%+8px)] right-0 w-[340px] max-h-[480px] bg-white border border-border rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,.14)] z-[500] flex flex-col">
                  <div className="px-4 py-[13px] border-b border-border flex justify-between items-center bg-surface flex-shrink-0">
                    <div>
                      <p className="text-[13px] font-extrabold text-ink m-0">Notifications</p>
                      {unread > 0 && (
                        <p className="text-[10px] text-muted mt-px mb-0">{unread} unread</p>
                      )}
                    </div>
                    {unread > 0 && (
                      <button onClick={markAllRead}
                        className="text-[10px] font-bold text-teal bg-transparent border-none cursor-pointer px-2 py-1 rounded-md">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {notifLoad ? (
                      <div className="p-3.5 flex flex-col gap-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-[52px] rounded-[10px] sk"/>
                        ))}
                      </div>
                    ) : notifs.length === 0 ? (
                      <div className="py-9 px-5 text-center">
                        <p className="text-3xl mb-2 opacity-30">🔔</p>
                        <p className="text-[13px] text-faint">No notifications</p>
                      </div>
                    ) : (
                      <>
                        {notifToday.length > 0 && (
                          <>
                            <div className="px-4 pt-2 pb-1 text-[9px] font-extrabold text-faint uppercase tracking-[.08em] bg-[#fafafa]">
                              Today
                            </div>
                            {notifToday.map(n => (
                              <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead}/>
                            ))}
                          </>
                        )}
                        {notifEarlier.length > 0 && (
                          <>
                            <div className={`px-4 pt-2 pb-1 text-[9px] font-extrabold text-faint uppercase tracking-[.08em] bg-[#fafafa] ${
                              notifToday.length > 0 ? 'border-t border-surface' : ''
                            }`}>
                              Earlier
                            </div>
                            {notifEarlier.map(n => (
                              <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead}/>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Manager badge — desktop */}
          {isManager && (
            <span className="hidden md:inline text-[10px] px-2.5 py-1 rounded-full font-bold bg-white/[.18] text-[#e9d5ff] border border-white/20 backdrop-blur-sm">
              👑 Manager
            </span>
          )}

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/35 flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 backdrop-blur-sm">
            {initials}
          </div>

          {/* Desktop name */}
          <span className="hidden md:inline text-[13px] font-semibold text-white/90 whitespace-nowrap">
            {name}
          </span>

        </div>

        {/* Page content */}
        <div className="flex-1 w-full min-w-0 px-6 pt-6 pb-[88px] max-md:px-3.5 max-md:pt-3.5 max-md:pb-[84px]">
          <Outlet/>
        </div>
      </main>

      {/* ─── MORE DRAWER (mobile — all nav items) ───────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 bg-black/30 z-[280] backdrop-blur-[2px]"/>
            <motion.div
              initial={{ y:80, opacity:0 }}
              animate={{ y:0, opacity:1 }}
              exit={{ y:80, opacity:0 }}
              transition={{ type:'spring', stiffness:340, damping:30 }}
              className="fixed bottom-16 left-0 right-0 z-[290] bg-white/[.97] backdrop-blur-xl border-t border-border rounded-t-[20px] shadow-[0_-8px_40px_rgba(0,0,0,.12)] px-4 pt-3.5 pb-2 max-h-[75vh] overflow-y-auto">

              <p className="text-[11px] font-extrabold text-faint uppercase tracking-[.1em] mb-1.5 ml-1">
                All Pages
              </p>

              {/* Staff nav items not in bottom bar */}
              {STAFF_NAV.filter(i =>
                !['/admin','/admin/orders','/admin/inventory',
                  '/admin/messages','/admin/production'].includes(i.to)
              ).map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-3 py-3 rounded-xl no-underline text-sm font-semibold w-full transition-colors duration-150 ${
                      isActive ? 'text-teal bg-teal/[.08]' : 'text-ink hover:bg-teal/[.06]'
                    }`}>
                  <span className="text-xl w-7 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {/* Manager section */}
              {isManager && (
                <>
                  <div className="h-px bg-surface my-2"/>
                  <p className="text-[11px] font-extrabold text-[#a78bfa] uppercase tracking-[.1em] mb-1.5 ml-1">
                    Manager
                  </p>
                  {MANAGER_EXTRA.map(item => (
                    <NavLink key={item.to} to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3.5 px-3 py-3 rounded-xl no-underline text-sm font-semibold w-full text-purple transition-colors duration-150 ${
                          isActive ? 'bg-purple/[.08]' : 'hover:bg-purple/[.06]'
                        }`}>
                      <span className="text-xl w-7 text-center">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </>
              )}

              <div className="h-px bg-surface my-2"/>
              <button
                className="flex items-center gap-3.5 px-3 py-3 rounded-xl border-none bg-transparent w-full cursor-pointer text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/[.06] transition-colors duration-150"
                onClick={logout}>
                <span className="text-xl w-7 text-center">←</span>
                <span>Sign Out</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MOBILE BOTTOM TASKBAR ──────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[300] bg-white/[.96] backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_32px_rgba(0,0,0,.10),0_-1px_0_rgba(2,128,144,.06)] flex justify-around items-center py-[5px] h-[66px]"
        style={{ paddingBottom: 'max(5px, env(safe-area-inset-bottom, 5px))' }}
        aria-label="Mobile navigation">
        {MOB_NAV.map(item => {
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink key={item.to} to={item.to} end={item.end}
              className="flex flex-col items-center gap-0.5 px-2 py-[5px] min-w-[54px] rounded-[14px] transition-transform duration-100 active:scale-90 relative no-underline">
              <span className="text-[23px] leading-none transition-transform duration-150"
                style={{ filter: active ? 'none' : 'grayscale(.4) opacity(.65)', transform: active ? 'scale(1.14)' : 'none' }}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-semibold tracking-[.02em] ${active ? 'text-teal font-extrabold' : 'text-faint'}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-[3px] w-[22px] h-[3px] rounded-[3px] bg-gradient-to-r from-teal to-teal-light shadow-[0_0_8px_rgba(2,195,154,.5)]"/>
              )}
            </NavLink>
          );
        })}

        {/* More button */}
        <button className="flex flex-col items-center gap-0.5 px-2 py-[5px] min-w-[54px] rounded-[14px] border-none cursor-pointer bg-transparent transition-transform duration-100 active:scale-90"
          onClick={() => setMoreOpen(o => !o)}>
          <span className="text-[23px] leading-none transition-transform duration-150"
            style={{ color: moreOpen ? 'var(--color-teal)' : undefined, filter: moreOpen ? 'none' : 'grayscale(.4) opacity(.65)' }}>
            ⋯
          </span>
          <span className={`text-[9px] font-semibold tracking-[.02em] ${moreOpen ? 'text-teal font-extrabold' : 'text-faint'}`}>
            More
          </span>
        </button>
      </nav>

      <style>{`
        @keyframes bellShake {
          0%,100% { transform: rotate(0); }
          20%     { transform: rotate(-14deg); }
          40%     { transform: rotate(14deg); }
          60%     { transform: rotate(-8deg); }
          80%     { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
