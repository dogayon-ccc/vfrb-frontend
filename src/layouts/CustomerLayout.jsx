// src/layouts/CustomerLayout.jsx — customer shell: sidebar (desktop), bottom nav (mobile), topbar, Studio FAB.
import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useVisiblePoll } from '../hooks/useVisiblePoll';
import PageErrorBoundary from '../components/PageErrorBoundary';
import IconBox from '../components/ui/IconBox';
import FeedbackWidget from '../components/FeedbackWidget';
import { signOut } from '../utils/session';
import logo from '../assets/company-logo.jpg';
import { loadAccent, getAccentVars, ACCENT_CHANGE_EVENT } from '../utils/accentColor';
// Icon values below are components, rendered as <item.icon size={N}/> at each call site.
import { LayoutDashboard, PenSquare, ClipboardList, MessageSquare, Settings, Palette, LogOut, Shirt, MoreHorizontal } from 'lucide-react';

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';

const NAV = [
  { to:'/dashboard',               icon:LayoutDashboard, label:'Dashboard',    short:'Home',     end:true  },
  { to:'/my-designs',    icon:Shirt,           label:'My Designs',   short:'Designs',  end:false },
  { to:'/orders',        icon:ClipboardList,   label:'My Orders',    short:'Orders',   end:false },
  // AI Materials has no nav entry — it's the blocking MaterialsReveal screen after order submit, not a standalone page.
  { to:'/messages',      icon:MessageSquare,   label:'Messages',     short:'Chat',     end:false },
  { to:'/settings',      icon:Settings,        label:'Settings',     short:'Settings', end:false },
];

// Bottom nav follows the wireframe: Home, Designs, Orders, Chat + More.
const MOB_NAV = [
  { to:'/dashboard',    icon:LayoutDashboard, short:'Home',    end:true  },
  { to:'/my-designs',   icon:Shirt,           short:'Designs', end:false },
  { to:'/orders',       icon:ClipboardList,   short:'Orders',  end:false },
  { to:'/messages',     icon:MessageSquare,   short:'Chat',    end:false },
];

const FAB_ROUTES = ['/my-designs', '/orders'];

export default function CustomerLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const section  = location.pathname.startsWith('/order/create') ? 'New Order'
    : (NAV.find(n => location.pathname.startsWith(n.to))?.label ?? 'Client Portal');
  const [name,      setName]      = useState('Client');
  const [unread,    setUnread]    = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    // A saved manual toggle always wins; this default only applies on first load.
    try {
      const stored = localStorage.getItem('vfrb_cust_sb');
      if (stored !== null) return JSON.parse(stored);
    } catch { /* fall through to width-based default */ }
    if (typeof window !== 'undefined' &&
        window.innerWidth >= 768 && window.innerWidth <= 1023) {
      return true;
    }
    return false;
  });
  const [moreOpen, setMoreOpen] = useState(false);

  // Per-customer accent override, applied as CSS vars on .cm-shell — scoped to this
  // subtree only; theme.css's brand teal and the admin/staff portals are untouched.
  const [accentVars, setAccentVars] = useState(() => {
    const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
    return getAccentVars(loadAccent(u.user_id));
  });

  useEffect(() => {
    const onAccentChange = (e) => setAccentVars(getAccentVars(e.detail));
    window.addEventListener(ACCENT_CHANGE_EVENT, onAccentChange);
    return () => window.removeEventListener(ACCENT_CHANGE_EVENT, onAccentChange);
  }, []);

  const SW = collapsed ? 68 : 222;

  const toggle = () => setCollapsed(c => {
    const n = !c; localStorage.setItem('vfrb_cust_sb', JSON.stringify(n)); return n;
  });

  const logout = () => { signOut(); navigate('/login', { replace: true }); };

  const openStudio = () => navigate('/design-studio');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
    setName(u.name || 'Client');
  }, [location.pathname]);

  // Visibility-aware, non-overlapping poll — no request stacking when the tab is hidden or the server is slow.
  useVisiblePoll(async () => {
    const r = await axios.get('/api/customer/notifications/summary');
    setUnread(r.data?.unread_count ?? 0);
  }, 60000);

  // Close "More" drawer on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const initials = name ? name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : 'C';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }

        /* ── Shell ─────────────────────────────────────────────────────────── */
        .cm-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg, var(--bg));
        }

        /* ── Sidebar (desktop only) ─────────────────────────────────────────
           Vibrant: gradient header strip, teal accent on active items
        ── */
        .cm-sb {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 200;
          background: linear-gradient(180deg, #06414c 0%, #032d36 100%);
          border-right: 0;
          display: none;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 3px 0 24px rgba(3,45,54,.28);
          transition: width .22s cubic-bezier(.4,0,.2,1);
        }

        /* Sidebar gradient header */
        .cm-sb-nav p { color: rgba(255,255,255,.45) !important; }
        .cm-sb-nav > div { border-top-color: rgba(255,255,255,.12) !important; }
        .cm-sb-user { border-top-color: rgba(255,255,255,.12) !important; }
        .cm-sb-user p { color: #fff !important; }
        .cm-sb-user p + p { color: rgba(255,255,255,.55) !important; }
        .cm-sb-head, .cm-brand-link { text-decoration: none; color: inherit; cursor: pointer; }
        .cm-brand-link { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; min-height: 44px; }
        .cm-sb-collapse { background: rgba(255,255,255,.08) !important; border-color: rgba(255,255,255,.14) !important; color: rgba(255,255,255,.7) !important; }
        .cm-sb-collapse:hover { background: rgba(255,255,255,.16) !important; }
        .cm-sb-out { border-color: rgba(255,255,255,.22) !important; color: #ffb4b4 !important; }
        .cm-sb-out:hover { background: rgba(255,255,255,.08) !important; }
        .cm-sb-head {
          background: transparent;
          border-bottom: 1px solid rgba(255,255,255,.1);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          height: 58px;
          position: relative;
          overflow: hidden;
        }

        /* ── Main column ─────────────────────────────────────────────────── */
        .cm-main {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg, var(--bg));
        }

        /* ── Topbar — VIBRANT gradient on mobile, tinted on desktop ── */
        .cm-topbar {
          height: 54px;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--teal) 0%, var(--teal-darker) 100%);
          border-bottom: none;
          display: flex;
          align-items: center;
          padding: 0 14px;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 16px rgba(2,128,144,.25);
        }

        /* ── Content ─────────────────────────────────────────────────────── */
        .cm-content {
          flex: 1;
          width: 100%;
          min-width: 0;
          padding: 14px 14px calc(88px + env(safe-area-inset-bottom, 0px));
        }
        @media (max-width: 767px) {
          .cm-content[data-fab] { padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px)); }
          .cm-desk-only { display: none !important; }
        }

        /* ── Sidebar nav link ─────────────────────────────────────────────── */
        .cm-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,.74);
          white-space: nowrap;
          overflow: hidden;
          transition: background .13s, color .13s, transform .1s;
          position: relative;
          margin: 1px 0;
        }
        .cm-link:hover  { background: rgba(255,255,255,.09); color: #fff; transform: translateX(2px); }
        .cm-link.active { background: rgba(255,255,255,.15); color: #fff; font-weight: 700; }
        .cm-link.active::before {
          content: '';
          position: absolute;
          left: 0; top: 18%; bottom: 18%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, ${T}, ${T2});
        }

        /* Studio button */
        .cm-studio-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, var(--teal), var(--teal-2));
          white-space: nowrap;
          overflow: hidden;
          width: 100%;
          text-align: left;
          transition: all .18s;
          margin: 1px 0;
          box-shadow: 0 2px 12px rgba(2,128,144,.28);
        }
        .cm-studio-btn:hover {
          box-shadow: 0 4px 18px rgba(2,128,144,.38);
          transform: translateY(-1px);
        }

        /* ── Mobile bottom taskbar ───────────────────────────────────────── */
        .cm-bnav {
          display: flex;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 300;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid rgba(226,232,240,.9);
          box-shadow: 0 -4px 24px rgba(2,128,144,.10);
          justify-content: space-around;
          align-items: center;
          padding: 4px 0;
          padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
          height: calc(64px + env(safe-area-inset-bottom, 0px));
        }
        .cm-bnav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 4px 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
          text-decoration: none;
          border-radius: 12px;
          transition: background .12s, transform .12s;
          min-width: 52px;
          position: relative;
        }
        .cm-bnav-item:active { transform: scale(.93); }
        .cm-bnav-icon  { font-size: 22px; line-height: 1; display: block; transition: transform .15s; }
        .cm-bnav-label { font-size: 10px; font-weight: 600; color: var(--text-faint); letter-spacing: .02em; }
        .cm-bnav-item.mob-active .cm-bnav-icon  { transform: scale(1.12); }
        .cm-bnav-item.mob-active .cm-bnav-label { color: ${T}; font-weight: 700; }

        /* Active indicator pill under icon */
        .cm-bnav-item.mob-active::after {
          content: '';
          position: absolute;
          bottom: 2px;
          width: 18px; height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, ${T}, ${T2});
        }

        /* Unread badge */
        .cm-badge {
          position: absolute;
          top: 1px; right: 8px;
          min-width: 14px; height: 14px;
          border-radius: 99px;
          background: var(--danger);
          color: #fff;
          font-size: 8px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          border: 1.5px solid #fff;
        }

        /* ── More drawer (mobile) ────────────────────────────────────────── */
        .cm-more-drawer {
          position: fixed;
          bottom: 64px; left: 0; right: 0;
          z-index: 290;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--border);
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 40px rgba(2,128,144,.12);
          padding: 14px 16px 8px;
        }
        .cm-drawer-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: #1a2332;
          font-size: 14px;
          font-weight: 600;
          transition: background .13s;
          border: none;
          background: transparent;
          width: 100%;
          cursor: pointer;
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
        }
        .cm-drawer-item:hover, .cm-drawer-item:active { background: rgba(2,128,144,.06); }
        .cm-drawer-item.active { color: ${T}; background: rgba(2,128,144,.08); }

        /* Studio FAB (mobile) — sits at bottom:58 so it dips into the nav bar, matching the Figma reference's "punched through" look.
           Mobile-first base rule: visible by default (flex), the >=768px query below hides it on desktop. */
        .cm-studio-fab {
          display: flex;
          position: fixed;
          bottom: calc(var(--taskbar-h, 64px) + 14px + env(safe-area-inset-bottom, 0px));
          right: 16px;
          z-index: 310;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, var(--teal), var(--teal-2));
          color: #fff;
          font-size: 22px;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 4px rgba(255,255,255,.95), 0 6px 24px rgba(2,128,144,.48), 0 0 28px rgba(2,195,154,.2);
          transition: transform .15s, box-shadow .15s;
        }
        .cm-studio-fab:active {
          transform: scale(.92);
          box-shadow: 0 0 0 4px rgba(255,255,255,.95), 0 2px 12px rgba(2,128,144,.3);
        }

        /* ── Responsive (mobile-first: base above is the phone layout) ────── */
        @media (min-width: 768px) {
          .cm-sb          { display: flex !important; }
          .cm-main        { margin-left: ${SW}px; }
          .cm-bnav        { display: none !important; }
          .cm-studio-fab  { display: none !important; }
          .cm-mob-only    { display: none !important; }
          .cm-more-drawer { display: none !important; }
          .cm-content     { padding: 18px 18px 40px; }
          .cm-topbar      { height: 58px; padding: 0 18px; }
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          .cm-content { padding: 20px 20px 40px; }
        }
        @media (min-width: 1280px) {
          .cm-content { padding: 22px 22px 80px; }
        }
        @media (min-width: 2560px) {
          .cm-content {
            padding: 36px 40px 100px;
            max-width: 1800px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        /* ── Scrollbar ─────────────────────────────────────────────────── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        @keyframes fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .cm-link:focus-visible, .cm-bnav-item:focus-visible, .cm-drawer-item:focus-visible,
        .cm-studio-btn:focus-visible, .cm-studio-fab:focus-visible {
          outline: 2px solid ${T}; outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: .01ms !important; }
        }
      
        /* Sidebar + topbar: dark teal rail, light glass topbar on desktop (wireframe) */
        .cm-sb-nav p { font-size: 10px !important; letter-spacing: .12em !important; color: rgba(255,255,255,.5) !important; }
        .cm-link { padding: 10px 12px; margin: 2px 0; font-size: 13.5px; }
        .cm-link:hover { transform: none; background: rgba(255,255,255,.08); }
        .cm-link.active { background: linear-gradient(90deg, rgba(2,195,154,.22), rgba(255,255,255,.06)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
        .cm-link:focus-visible, .cm-studio-btn:focus-visible, .cm-sb-collapse:focus-visible { outline: 2.5px solid #7ee7d3; outline-offset: 2px; }
        .cm-studio-btn { min-height: 42px; }
        .cm-sb-collapse { min-height: 40px; }
        .cm-tb-date { color: rgba(255,255,255,.7); font-size: 12px; flex-shrink: 0; }
        .cm-tb-studio { display: none; align-items: center; gap: 8px; white-space: nowrap; padding: 0 16px; height: 38px; border-radius: 999px; border: 0; cursor: pointer;
          font: 700 13px/1 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; color: #fff;
          background: linear-gradient(135deg, var(--teal), var(--teal-2)); box-shadow: 0 4px 14px rgba(2,128,144,.3);
          transition: transform .15s, box-shadow .15s; }
        .cm-tb-studio:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(2,128,144,.38); }
        .cm-tb-studio:focus-visible, .cm-tb-bell:focus-visible, .cm-tb-user:focus-visible { outline: 2.5px solid var(--teal); outline-offset: 2px; }
        .cm-tb-bell { position: relative; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,.14); flex-shrink: 0; transition: background .15s; }
        @media (max-width: 767px) { .cm-tb-bell { display: none; } }
        .cm-tb-bell:hover { background: rgba(255,255,255,.24); }
        .cm-tb-dot { position: absolute; top: 8px; right: 9px; width: 9px; height: 9px; border-radius: 50%; background: var(--danger); border: 2px solid #fff; }
        .cm-tb-user { display: flex; align-items: center; gap: 10px; text-decoration: none; color: #fff; padding: 3px 4px 3px 3px; border-radius: 999px; transition: background .15s; }
        .cm-tb-user:hover { background: rgba(255,255,255,.14); }
        .cm-tb-av { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, var(--teal), var(--teal-2)); box-shadow: 0 0 0 2px rgba(255,255,255,.45); }
        .cm-tb-name { font-size: 13px; font-weight: 700; white-space: nowrap; padding-right: 8px; }
        @media (min-width: 768px) {
          .cm-tb-studio { display: inline-flex !important; }
          .cm-topbar { height: 60px; background: rgba(255,255,255,.82); backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%);
            border-bottom: 1px solid var(--border); box-shadow: 0 6px 20px rgba(15,23,42,.04); }
          .cm-tb-date { color: var(--text-subtle); }
          .cm-tb-bell { color: var(--ink); background: var(--bg-surface); }
          .cm-tb-bell:hover { background: var(--teal-50); color: var(--teal); }
          .cm-tb-user { color: var(--ink); }
          .cm-tb-user:hover { background: var(--bg-surface); }
          .cm-tb-av { box-shadow: 0 0 0 2px var(--teal-50); }
        }
        @media (prefers-reduced-motion: reduce) { .cm-tb-studio, .cm-tb-bell, .cm-tb-user { transition: none; } }
      
        .cm-tb-crumb { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .cm-tb-crumb b { font-size: 14px; font-weight: 800; color: var(--ink); letter-spacing: -.01em; }
        .cm-tb-crumb span { font-size: 11px; color: var(--text-subtle); }
        .cm-sb-collapse { margin: 4px 10px 6px !important; padding: 0 10px !important; min-height: 34px !important; border: 0 !important; border-radius: 10px !important; background: transparent !important;
          color: rgba(255,255,255,.55) !important; font-size: 11px; display: flex; align-items: center; justify-content: flex-end; gap: 6px; cursor: pointer; flex-shrink: 0; transition: background .15s, color .15s; }
        .cm-sb-collapse:hover { background: rgba(255,255,255,.1) !important; color: #fff !important; }
        @media (pointer: coarse) {
          .cm-link, .cm-tb-user, .cm-sb-out { min-height: 44px; }
          .cm-tb-user { min-width: 44px; justify-content: center; }
          .cm-studio-btn, .cm-sb-collapse { min-height: 44px !important; }
          .cm-tb-bell { width: 44px; height: 44px; }
        }
      `}</style>

      <div className="cm-shell" style={accentVars || undefined}>

        {/* ─── DESKTOP SIDEBAR ──────────────────────────────────────────── */}
        <aside className="cm-sb" style={{ width: SW }}>

          {/* Gradient header */}
          <Link to="/dashboard" className="cm-sb-head" aria-label="VFRB Enterprise — back to dashboard" title="Back to dashboard"
            style={{ padding: collapsed ? '12px 10px' : '12px 16px' }}>
            <img src={logo} alt="VFRB"
              style={{ width:34, height:34, borderRadius:9, objectFit:'cover',
                border:'2px solid rgba(255,255,255,.35)', flexShrink:0, position:'relative', zIndex:1 }}/>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                <p style={{ fontSize:11, fontWeight:800, color:'#fff',
                  letterSpacing:'.05em', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0,
                  textShadow:'0 1px 3px rgba(0,0,0,.15)' }}>
                  VFRB ENTERPRISE
                </p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.75)', fontWeight:600,
                  textTransform:'uppercase', letterSpacing:'.08em', margin:'2px 0 0' }}>
                  Client Site
                </p>
              </div>
            )}
          </Link>

          {/* Nav */}
          <div className="cm-sb-nav" style={{ flex:1, overflowY:'auto', overflowX:'hidden',
            padding: collapsed ? '8px 4px' : '8px 10px',
            scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,.25) transparent' }}>

            {!collapsed && (
              <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase',
                letterSpacing:'.1em', color:'var(--text-faint)', padding:'10px 12px 5px', margin:0 }}>
                Navigation
              </p>
            )}

            {NAV.map(item => {
              const showBadge = item.to === '/messages' && unread > 0;
              return (
                <NavLink key={item.to} to={item.to} end={item.end}
                  className={({ isActive }) => `cm-link${isActive ? ' active' : ''}`}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  style={collapsed ? { justifyContent:'center', padding:'10px 0' } : {}}>
                  <IconBox icon={item.icon} size={16} width={20}>
                    {collapsed && showBadge && (
                      <span style={{ position:'absolute', top:-2, right:-2,
                        width:8, height:8, borderRadius:'50%', background:'var(--danger)',
                        border:'1.5px solid #fff' }}/>
                    )}
                  </IconBox>
                  {!collapsed && (
                    <>
                      <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis' }}>
                        {item.label}
                      </span>
                      {showBadge && (
                        <span style={{ fontSize:11, minWidth:18, height:18,
                          borderRadius:99, background:'var(--danger)', color:'#fff',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:700, padding:'0 4px', flexShrink:0 }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Design Studio */}
            <div style={{ borderTop:'1px solid var(--bg-surface)', margin:'10px 0 4px', paddingTop:8 }}>
              {!collapsed && (
                <p style={{ fontSize:11, fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'.1em', color:'var(--text-faint)', padding:'0 2px', margin:'0 0 6px' }}>
                  Design Tools
                </p>
              )}
              <button className="cm-studio-btn" onClick={openStudio}
                title={collapsed ? 'Design Studio' : undefined}
                aria-label={collapsed ? 'Design Studio' : undefined}
                style={collapsed ? { justifyContent:'center', padding:'10px 0', borderRadius:10 } : {}}>
                <IconBox icon={Palette} size={16} width={20}/>
                {!collapsed && (
                  <>
                    <span style={{ flex:1 }}>Design Studio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapse toggle */}
          <button onClick={toggle} className="cm-sb-collapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}>
            {collapsed ? '\u25B6' : '\u25C0 Collapse'}
          </button>

          {/* User strip */}
          <div className="cm-sb-user" style={{ borderTop:'1px solid var(--border)', padding:'10px', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7,
              overflow:'hidden', padding:'4px 2px' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                background:`linear-gradient(135deg,${T},${T2})`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontSize:12, fontWeight:800,
                boxShadow:`0 2px 8px rgba(2,128,144,.3)` }}>
                {initials}
              </div>
              {!collapsed && (
                <div style={{ overflow:'hidden', flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)',
                    overflow:'hidden', textOverflow:'ellipsis',
                    whiteSpace:'nowrap', margin:0 }}>
                    {name}
                  </p>
                  <p style={{ fontSize:11, color:'var(--text-subtle)', margin:0 }}>Client</p>
                </div>
              )}
            </div>
            <button onClick={logout} className="cm-sb-out"
              style={{ width:'100%', padding:'8px', borderRadius:9,
                border:'1px solid var(--danger-border)', background:'transparent',
                cursor:'pointer', color:'var(--danger)', fontSize:11, fontWeight:600,
                display:'flex', alignItems:'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap:5, fontFamily:"ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
                transition:'background .13s' }}
              onMouseEnter={undefined}>
              <LogOut size={13} strokeWidth={2}/>{!collapsed && ' Sign Out'}
            </button>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="cm-main"
          style={{ transition:'margin-left .22s cubic-bezier(.4,0,.2,1)' }}>

          {/* ── TOPBAR — gradient, always shows logo + portal label + actions ── */}
          <div className="cm-topbar">

            {/* Mobile: logo + portal label */}
            <Link to="/dashboard" className="cm-mob-only cm-brand-link" aria-label="VFRB Enterprise — back to dashboard">
            <img src={logo} alt=""
              style={{ width:30, height:30, borderRadius:8, objectFit:'cover',
                border:'1.5px solid rgba(255,255,255,.35)', flexShrink:0 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:11, fontWeight:800, color:'#fff',
                letterSpacing:'.04em', margin:0, lineHeight:1.2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                VFRB
              </p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.65)', fontWeight:600,
                textTransform:'uppercase', letterSpacing:'.07em', margin:0, whiteSpace:'nowrap' }}>
                Client Portal
              </p>
            </div>
            </Link>

            {/* Desktop: date */}
            <div className="cm-desk-only cm-tb-crumb">
              <b>{section}</b>
              <span>{new Date().toLocaleDateString('en-PH',{ weekday:'long', month:'long', day:'numeric', year:'numeric' })}</span>
            </div>
            <div style={{ flex:1 }}/>

            <NavLink to="/messages" className="cm-tb-bell" aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}>
              <MessageSquare size={18} strokeWidth={2}/>
              {unread > 0 && <i className="cm-tb-dot"/>}
            </NavLink>

            <NavLink to="/settings" className="cm-tb-user" aria-label="Account settings">
              <span className="cm-tb-av">{initials}</span>
              <span className="cm-desk-only cm-tb-name">{name}</span>
            </NavLink>

          </div>

          {/* Page content */}
          <div className="cm-content" data-fab={FAB_ROUTES.includes(location.pathname) || undefined}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity:0, y:8 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-4, transition:{ duration:.12, ease:'easeIn' } }}
                transition={{ duration:.22, ease:'easeOut' }}>
                {/* Page-level error boundary (Aug 23 2026) — a crash here
                    no longer takes the sidebar/nav down with it. This
                    motion.div already remounts on pathname change (via its
                    key prop), which naturally resets the boundary too. */}
                <PageErrorBoundary resetKey={location.pathname}>
                  <Outlet/>
                </PageErrorBoundary>
              </motion.div>
            </AnimatePresence>
            <FeedbackWidget/>
          </div>
        </main>

        {/* ─── Studio FAB (mobile) ───────────────────────────────────────── */}
        {FAB_ROUTES.includes(location.pathname) && (
          <button className="cm-studio-fab" onClick={openStudio} aria-label="Design Studio">
            <Palette size={24} strokeWidth={2}/>
          </button>
        )}

        {/* ─── MORE DRAWER (mobile) ─────────────────────────────────────── */}
        <AnimatePresence>
          {moreOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setMoreOpen(false)}
                style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.3)',
                  zIndex:280, backdropFilter:'blur(2px)' }}/>
              <motion.div
                className="cm-more-drawer"
                initial={{ y:60, opacity:0 }} animate={{ y:0, opacity:1 }}
                exit={{ y:60, opacity:0 }}
                transition={{ type:'spring', stiffness:340, damping:30 }}>
                <p style={{ fontSize:11, fontWeight:800, color:'var(--text-faint)',
                  textTransform:'uppercase', letterSpacing:'.1em',
                  margin:'0 0 8px 4px' }}>Quick Access</p>

                <button className="cm-drawer-item" onClick={openStudio}
                  style={{ color:T }}>
                  <IconBox icon={Palette} size={20} width={28}/>
                  <span>Design Studio</span>
                </button>



                <NavLink to="/settings" className="cm-drawer-item"
                  onClick={() => setMoreOpen(false)}>
                  <IconBox icon={Settings} size={20} width={28}/>
                  <span>Settings</span>
                </NavLink>

                <NavLink to="/settings?tab=feedback" className="cm-drawer-item"
                  onClick={() => setMoreOpen(false)}>
                  <IconBox icon={MessageSquare} size={20} width={28}/>
                  <span>Send Feedback</span>
                </NavLink>



                <div style={{ height:1, background:'var(--bg-surface)', margin:'6px 0' }}/>

                <button className="cm-drawer-item" onClick={logout}
                  style={{ color:'var(--danger)' }}>
                  <IconBox icon={LogOut} size={20} width={28}/>
                  <span>Sign Out</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── MOBILE BOTTOM TASKBAR ─────────────────────────────────────── */}
        <nav className="cm-bnav" aria-label="Mobile navigation">
          {MOB_NAV.map(item => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const showBadge = item.to === '/messages' && unread > 0;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={`cm-bnav-item${active ? ' mob-active' : ''}`}
                style={{ position:'relative' }}>
                <span className="cm-bnav-icon"
                  style={{ filter: active ? 'none' : 'grayscale(.3) opacity(.65)' }}>
                  <item.icon size={22} strokeWidth={2}/>
                </span>
                <span className="cm-bnav-label">{item.short}</span>
                {showBadge && (
                  <span className="cm-badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </NavLink>
            );
          })}

          {/* More button */}
          <button className="cm-bnav-item" onClick={() => setMoreOpen(o => !o)}
            aria-expanded={moreOpen} aria-label="More"
            style={{ border:'none', background:'transparent', cursor:'pointer' }}>
            <span className="cm-bnav-icon"
              style={{ filter: moreOpen ? 'none' : 'grayscale(.3) opacity(.65)',
                color: moreOpen ? T : undefined }}>
              <MoreHorizontal size={22} strokeWidth={2}/>
            </span>
            <span className="cm-bnav-label" style={{ color: moreOpen ? T : undefined }}>
              More
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}
