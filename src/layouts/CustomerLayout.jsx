// src/layouts/CustomerLayout.jsx — customer shell: top bar + bell + rail (desktop), collapsing header + bottom nav (mobile), Studio FAB.
import { useState, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import { asList } from '../utils/asList';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { AppPageSkeleton } from '../components/PageSkeletons';
import FeedbackWidget from '../components/FeedbackWidget';
import { signOut, USER_CHANGE_EVENT } from '../utils/session';
import logo from '../assets/company-logo.jpg';
import { useAppearance } from '../hooks/useAppearance';
import '../styles/customer-shell.css';
import { LayoutDashboard, ClipboardList, MessageSquare, Settings, Palette, LogOut, Shirt, MoreHorizontal, Bell, PanelLeftClose, PanelLeftOpen, Megaphone } from 'lucide-react';

const NAV = [
  { to:'/dashboard',  icon:LayoutDashboard, label:'Dashboard',  short:'Home',    end:true  },
  { to:'/my-designs', icon:Shirt,           label:'My Designs', short:'Designs', end:false },
  { to:'/orders',     icon:ClipboardList,   label:'My Orders',  short:'Orders',  end:false },
  // AI Materials has no nav entry — it's the blocking MaterialsReveal screen after order submit, not a standalone page.
  { to:'/messages',   icon:MessageSquare,   label:'Messages',   short:'Chat',    end:false },
  { to:'/settings',   icon:Settings,        label:'Settings',   short:'Settings', end:false },
];
// Bottom nav follows the wireframe: Home, Designs, Orders, Chat + More.
const MOB_NAV = NAV.slice(0, 4);
// Studio entry: rail on desktop, this FAB on phones (main tabs only, so it never covers a composer or action bar).
const FAB_ROUTES = ['/dashboard', '/my-designs', '/orders'];
const readUser = () => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } };

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const still = useReducedMotion();
  const section = location.pathname.startsWith('/order/create') ? 'New Order'
    : (NAV.find(n => location.pathname.startsWith(n.to))?.label ?? 'Customer Portal');
  const [name, setName] = useState('Customer');
  const [unread, setUnread] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState(null);
  const [notifsErr, setNotifsErr] = useState(false);
  const bellRef = useRef(null);
  const [collapsed, setCollapsed] = useState(() => {
    // A saved manual toggle always wins; tablets default to the slim rail.
    try { const s = localStorage.getItem('vfrb_cust_sb'); if (s !== null) return JSON.parse(s); } catch { /* width default */ }
    return typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1023;
  });
  const [me, setMe] = useState(readUser);
  useAppearance(me.user_id);
  const barHidden = useHideOnScroll(location.pathname);

  // Customer tokens and base styles apply only while this shell is mounted (portals included).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.cx = '';
    return () => { delete root.dataset.cx; };
  }, []);

  useEffect(() => {
    // A new profile photo or name from Settings shows in the bar at once.
    const onUser = (e) => setMe(e.detail ?? readUser());
    window.addEventListener(USER_CHANGE_EVENT, onUser);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUser);
  }, []);
  useEffect(() => { setName(readUser().name || 'Customer'); setMoreOpen(false); setBellOpen(false); }, [location.pathname]);

  // Visibility-aware, non-overlapping poll — no request stacking when the tab is hidden or the server is slow.
  useVisiblePoll(async () => {
    const r = await axios.get('/api/customer/notifications/summary');
    setUnread(r.data?.unread_count ?? 0);
  }, 60000);

  // Bell closes on outside click or Escape.
  useEffect(() => {
    if (!bellOpen) return;
    const away = e => { if (!bellRef.current?.contains(e.target)) setBellOpen(false); };
    const esc = e => { if (e.key === 'Escape') setBellOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [bellOpen]);

  const loadNotifs = async () => {
    setNotifsErr(false);
    try {
      const l = asList((await axios.get('/api/customer/notifications?per_page=20')).data);
      setNotifs(l); setUnread(l.filter(n => !n.is_read).length);
    } catch { setNotifsErr(true); }
  };
  const toggleBell = () => { if (!bellOpen) loadNotifs(); setBellOpen(o => !o); };
  const markRead = async (id) => {
    setNotifs(p => p.map(n => (n.notif_id ?? n.id) === id ? { ...n, is_read: 1 } : n));
    setUnread(u => Math.max(0, u - 1));
    try { await axios.patch(`/api/customer/notifications/${id}/read`); } catch { loadNotifs(); }
  };
  const markAllRead = async () => {
    setNotifs(p => p.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
    try { await axios.post('/api/customer/notifications/read-all'); } catch { loadNotifs(); }
  };

  const toggle = () => setCollapsed(c => { const n = !c; localStorage.setItem('vfrb_cust_sb', JSON.stringify(n)); return n; });
  const logout = () => { signOut(); navigate('/login', { replace: true }); };
  const openStudio = () => navigate('/design-studio');
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'C';
  const bellLabel = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';
  const fab = FAB_ROUTES.includes(location.pathname);

  return (
    <div className="cm-shell" data-rail={collapsed ? 'slim' : 'full'}>
      <a href="#cm-main" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('cm-main')?.focus(); }}>Skip to content</a>
      <header className="cx-bar" data-hidden={barHidden}>
        <Link to="/dashboard" className="cx-brand" aria-label="VFRB Enterprise, back to dashboard">
          <img src={logo} alt="" />
          <span><b>VFRB</b><small>Client portal</small></span>
        </Link>
        <div className="cx-crumb">
          <b>{section}</b>
          <span>{new Date().toLocaleDateString('en-PH', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</span>
        </div>
        <div className="cx-bar-sp" />
        <div className="cx-bell" ref={bellRef}>
          <button type="button" className="cx-icon-btn" onClick={toggleBell} aria-label={bellLabel}
            aria-expanded={bellOpen} aria-controls="cx-bell-panel">
            <Bell size={19} strokeWidth={1.9} aria-hidden="true" />
            {unread > 0 && <b className="cx-bell-n" aria-hidden="true">{unread > 99 ? '99+' : unread}</b>}
          </button>
          {bellOpen && (
            <div className="cx-bell-panel" id="cx-bell-panel" role="region" aria-label="Notifications">
              <div className="cx-bell-h">
                <b>Notifications</b>
                {unread > 0 && <button type="button" className="cx-link" onClick={markAllRead}>Mark all read</button>}
              </div>
              <div className="cx-bell-list" aria-busy={notifs === null && !notifsErr}>
                {notifsErr && !notifs?.length ? (
                  <div className="cx-bell-empty" role="alert">Unable to load notifications.
                    <button type="button" className="cx-btn cx-btn-s" onClick={loadNotifs}>Retry</button></div>
                ) : notifs === null ? (
                  <p className="cx-bell-empty">Loading…</p>
                ) : notifs.length === 0 ? (
                  <p className="cx-bell-empty">You're all caught up.</p>
                ) : notifs.map(n => {
                  const id = n.notif_id ?? n.id;
                  return (
                    <button key={id} type="button" className="cx-bell-item" data-unread={!n.is_read || undefined}
                      onClick={() => !n.is_read && markRead(id)} aria-label={n.is_read ? n.message : `Mark as read: ${n.message}`}>
                      <i aria-hidden="true" />
                      <span><span className="cx-bell-msg">{n.message}</span>
                        {n.date_sent && <small>{new Date(n.date_sent).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</small>}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <NavLink to="/settings" className="cx-user" aria-label="Account settings">
          <span className="cx-av" aria-hidden="true">{me.avatar ? <img src={me.avatar} alt="" /> : initials}</span>
          <span className="cx-user-n" aria-hidden="true">{name}</span>
        </NavLink>
      </header>

      <aside className="cx-rail" aria-label="Main navigation">
        <nav>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className="cx-rail-link"
              title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined}>
              <item.icon size={18} strokeWidth={1.9} aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
          <div className="cx-rail-sep" />
          <button type="button" className="cx-rail-link cx-rail-studio" onClick={openStudio}
            title={collapsed ? 'Design Studio' : undefined} aria-label={collapsed ? 'Design Studio' : undefined}>
            <Palette size={18} strokeWidth={1.9} aria-hidden="true" />{!collapsed && <span>Design Studio</span>}
          </button>
        </nav>
        <div className="cx-rail-foot">
          <button type="button" className="cx-rail-link" onClick={toggle} aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : undefined}>
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.9} aria-hidden="true" /> : <PanelLeftClose size={18} strokeWidth={1.9} aria-hidden="true" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          <button type="button" className="cx-rail-link cx-rail-out" onClick={logout}
            title={collapsed ? 'Sign out' : undefined} aria-label={collapsed ? 'Sign out' : undefined}>
            <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />{!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <main id="cm-main" tabIndex={-1} className="cm-main">
        <div className="cm-content" data-fab={fab || undefined}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} className="vfrb-page"
              initial={still ? false : { opacity:0, y:8 }}
              animate={{ opacity:1, y:0 }}
              exit={still ? { opacity:1 } : { opacity:0, transition:{ duration:.12, ease:[.4, 0, 1, 1] } }}
              transition={{ duration: still ? 0 : .2, ease:[.22, 1, .36, 1] }}>
              {/* Keyed on pathname, so a page crash resets with navigation and never takes the shell down. */}
              <PageErrorBoundary resetKey={location.pathname}>
                <Suspense fallback={<AppPageSkeleton/>}><Outlet/></Suspense>
              </PageErrorBoundary>
            </motion.div>
          </AnimatePresence>
          <FeedbackWidget/>
        </div>
      </main>

      {fab && <button type="button" className="cm-studio-fab" onClick={openStudio} aria-label="Design Studio"><Palette size={24} strokeWidth={2} aria-hidden="true" /></button>}

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div className="cx-scrim" onClick={() => setMoreOpen(false)}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration: still ? 0 : .2 }} />
            <motion.div className="cx-sheet" id="cx-more" role="dialog" aria-label="More"
              initial={still ? false : { y:40, opacity:0 }} animate={{ y:0, opacity:1 }} exit={still ? { opacity:0 } : { y:40, opacity:0 }}
              transition={{ duration: still ? 0 : .3, ease:[.22, 1, .36, 1] }}>
              <h2>More</h2>
              <NavLink to="/settings" end className="cx-rail-link" onClick={() => setMoreOpen(false)}><Settings size={20} strokeWidth={1.9} aria-hidden="true" /><span>Settings</span></NavLink>
              <NavLink to="/settings?tab=feedback" className="cx-rail-link" onClick={() => setMoreOpen(false)}><Megaphone size={20} strokeWidth={1.9} aria-hidden="true" /><span>Send feedback</span></NavLink>
              <div className="cx-rail-sep" />
              <button type="button" className="cx-rail-link cx-rail-out" onClick={logout}><LogOut size={20} strokeWidth={1.9} aria-hidden="true" /><span>Sign out</span></button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="cx-nav" aria-label="Mobile navigation">
        {MOB_NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className="cx-nav-item">
            <span className="cx-nav-ico"><item.icon size={21} strokeWidth={1.9} aria-hidden="true" /></span>
            {item.short}
          </NavLink>
        ))}
        <button type="button" className="cx-nav-item" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-controls="cx-more">
          <span className="cx-nav-ico"><MoreHorizontal size={21} strokeWidth={1.9} aria-hidden="true" /></span>
          More
        </button>
      </nav>
    </div>
  );
}
