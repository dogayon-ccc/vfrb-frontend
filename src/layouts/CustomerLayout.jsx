// src/layouts/CustomerLayout.jsx — customer shell: top bar + rail (desktop), collapsing header + bottom nav (mobile), Studio FAB.
import { useState, useEffect, useLayoutEffect, Suspense } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { AppPageSkeleton } from '../components/PageSkeletons';
import FeedbackWidget from '../components/FeedbackWidget';
import { signOut } from '../utils/session';
import logo from '../assets/company-logo.jpg';
import { loadAccent, getAccentVars, ACCENT_CHANGE_EVENT } from '../utils/accentColor';
import '../styles/customer-shell.css';
import { LayoutDashboard, ClipboardList, MessageSquare, Settings, Palette, LogOut, Shirt, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
const FAB_ROUTES = ['/my-designs', '/orders'];
const readUser = () => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; } };

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const still = useReducedMotion();
  const section = location.pathname.startsWith('/order/create') ? 'New Order'
    : (NAV.find(n => location.pathname.startsWith(n.to))?.label ?? 'Client Portal');
  const [name, setName] = useState('Client');
  const [unread, setUnread] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    // A saved manual toggle always wins; tablets default to the slim rail.
    try { const s = localStorage.getItem('vfrb_cust_sb'); if (s !== null) return JSON.parse(s); } catch { /* width default */ }
    return typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1023;
  });
  // Per-customer accent override, applied as CSS vars on .cm-shell only; admin keeps the brand teal.
  const [accentVars, setAccentVars] = useState(() => getAccentVars(loadAccent(readUser().user_id)));
  const barHidden = useHideOnScroll(location.pathname);

  // Customer tokens and base styles apply only while this shell is mounted (portals included).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.cx = '';
    return () => { delete root.dataset.cx; };
  }, []);

  useEffect(() => {
    const onAccentChange = (e) => setAccentVars(getAccentVars(e.detail));
    window.addEventListener(ACCENT_CHANGE_EVENT, onAccentChange);
    return () => window.removeEventListener(ACCENT_CHANGE_EVENT, onAccentChange);
  }, []);
  useEffect(() => { setName(readUser().name || 'Client'); setMoreOpen(false); }, [location.pathname]);

  // Visibility-aware, non-overlapping poll — no request stacking when the tab is hidden or the server is slow.
  useVisiblePoll(async () => {
    const r = await axios.get('/api/customer/notifications/summary');
    setUnread(r.data?.unread_count ?? 0);
  }, 60000);

  const toggle = () => setCollapsed(c => { const n = !c; localStorage.setItem('vfrb_cust_sb', JSON.stringify(n)); return n; });
  const logout = () => { signOut(); navigate('/login', { replace: true }); };
  const openStudio = () => navigate('/design-studio');
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'C';
  const unreadLabel = unread > 0 ? `Messages, ${unread} unread` : 'Messages';
  const fab = FAB_ROUTES.includes(location.pathname);

  return (
    <div className="cm-shell" data-rail={collapsed ? 'slim' : 'full'} style={accentVars || undefined}>
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
        <button type="button" className="cx-bar-cta" onClick={openStudio}><Palette size={16} strokeWidth={2} aria-hidden="true" />Design Studio</button>
        <NavLink to="/messages" className="cx-icon-btn cx-bar-msg" aria-label={unreadLabel}>
          <MessageSquare size={19} strokeWidth={1.9} aria-hidden="true" />
          {unread > 0 && <i className="cx-dot" />}
        </NavLink>
        <NavLink to="/settings" className="cx-user" aria-label="Account settings">
          <span className="cx-av" aria-hidden="true">{initials}</span>
          <span className="cx-user-n" aria-hidden="true">{name}</span>
        </NavLink>
      </header>

      <aside className="cx-rail" aria-label="Main navigation">
        <nav>
          {NAV.map(item => {
            const badge = item.to === '/messages' && unread > 0;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className="cx-rail-link"
                title={collapsed ? item.label : undefined} aria-label={collapsed ? (badge ? unreadLabel : item.label) : undefined}>
                <item.icon size={18} strokeWidth={1.9} aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && badge && <b className="cx-count">{unread > 99 ? '99+' : unread}</b>}
              </NavLink>
            );
          })}
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

      <main className="cm-main">
        <div className="cm-content" data-fab={fab || undefined}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname}
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
              <button type="button" className="cx-rail-link cx-rail-studio" onClick={openStudio}><Palette size={20} strokeWidth={1.9} aria-hidden="true" /><span>Design Studio</span></button>
              <NavLink to="/settings" end className="cx-rail-link" onClick={() => setMoreOpen(false)}><Settings size={20} strokeWidth={1.9} aria-hidden="true" /><span>Settings</span></NavLink>
              <NavLink to="/settings?tab=feedback" className="cx-rail-link" onClick={() => setMoreOpen(false)}><MessageSquare size={20} strokeWidth={1.9} aria-hidden="true" /><span>Send feedback</span></NavLink>
              <div className="cx-rail-sep" />
              <button type="button" className="cx-rail-link cx-rail-out" onClick={logout}><LogOut size={20} strokeWidth={1.9} aria-hidden="true" /><span>Sign out</span></button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="cx-nav" aria-label="Mobile navigation">
        {MOB_NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} className="cx-nav-item"
            aria-label={item.to === '/messages' && unread > 0 ? `Chat, ${unread} unread` : undefined}>
            <span className="cx-nav-ico"><item.icon size={21} strokeWidth={1.9} aria-hidden="true" /></span>
            {item.short}
            {item.to === '/messages' && unread > 0 && <span className="cx-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
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
