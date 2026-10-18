import { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { enqueue, flushQueue, queueSize } from '../utils/offlineQueue';
import { signOut, USER_CHANGE_EVENT } from '../utils/session';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { useAppearance } from '../hooks/useAppearance';
import { AppPageSkeleton } from '../components/PageSkeletons';
import IconBox from '../components/ui/IconBox';
import AlertBanner from '../components/ui/AlertBanner';
import '../styles/admin.css';
import logo from '../assets/company-logo.jpg';
import { JOB_FUNCTION_AREAS, isOwner, ownerCanOpen } from '../utils/jobAccess';
import {
  LayoutDashboard, ClipboardList, Package, MessageSquare, ShoppingCart,
  Truck, Layers, Factory, FileText, ShieldCheck, ScanLine, AlertTriangle,
  Wallet, BarChart3, Receipt, Building2, Users, MessageCircle, Settings,
  LogOut, Bell, Trophy, Contact, ScrollText, PanelLeftOpen, PanelLeftClose, MoreHorizontal, Search,
} from 'lucide-react';

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';
const MG = 'var(--purple)';

const STAFF_NAV = [
  { to:'/admin',              icon:LayoutDashboard, label:'Dashboard',    end:true, area:null,         group:'Overview'   },
  { to:'/admin/orders',       icon:ClipboardList,   label:'Orders',                area:null,         group:'Sales'      },
  { to:'/admin/customers',    icon:Contact,         label:'Customers',               area:null,         group:'Sales'      },
  { to:'/admin/inventory',    icon:Package,         label:'Inventory',             area:'inventory',  group:'Inventory'  },
  { to:'/admin/messages',     icon:MessageSquare,   label:'Messages',              area:null,         group:'Sales'      },
  { to:'/admin/procurement',  icon:ShoppingCart,    label:'Procurement',           area:'inventory',  group:'Inventory'  },
  { to:'/admin/delivery',     icon:Truck,           label:'Delivery',              area:null,         group:'Sales'      },
  { to:'/admin/materials',    icon:Layers,          label:'Materials',             area:'inventory',  group:'Inventory'  },
  { to:'/admin/production',   icon:Factory,         label:'Production Orders',     area:'production', group:'Production' },
  { to:'/admin/output-log',   icon:FileText,        label:'Output Log',            area:'production', group:'Production' },
  { to:'/admin/qc',           icon:ShieldCheck,     label:'QC Checklist',          area:'production', group:'Production' },
  { to:'/admin/physical-count',icon:ScanLine,       label:'Physical Count',        area:'inventory',  group:'Inventory'  },
  { to:'/admin/production-incidents',icon:AlertTriangle,label:'Incidents',         area:'production', group:'Production' },
  { to:'/admin/transactions', icon:Wallet,          label:'Sales & Pay',           area:null,         group:'Sales'      },
];

// Sidebar section order. Grouping happens at render time so the drawer keeps STAFF_NAV's order.
const NAV_GROUPS = ['Overview', 'Sales', 'Inventory', 'Production', 'Admin'];

function visibleForJobFunction(navArray, jobFunction) {
  const allowed = JOB_FUNCTION_AREAS[jobFunction] ?? JOB_FUNCTION_AREAS.general;
  return navArray.filter(item => item.area === null || allowed.includes(item.area));
}

function DrawerTile({ item }) {
  return (
    <NavLink to={item.to} className={({ isActive }) => `adm-drawer-tile${isActive ? ' active' : ''}`}>
      <IconBox icon={item.icon} size={18} width={40} style={{ height:40, borderRadius:'var(--radius)', background:'var(--teal-50)', color:'var(--teal)' }}/>
      <span>{item.label}</span>
    </NavLink>
  );
}

const MANAGER_EXTRA = [
  { to:'/admin/reports',      icon:BarChart3,   label:'Reports'              },
  { to:'/admin/invoice',      icon:Receipt,     label:'Invoice'              },
  { to:'/admin/suppliers',    icon:Building2,   label:'Suppliers'            },
  { to:'/admin/users',        icon:Users,       label:'Users'                },
  { to:'/admin/designs/showcase-queue', icon:Trophy, label:'Showcase'           },
  { to:'/admin/feedback',     icon:MessageCircle,label:'Feedback'            },
  { to:'/admin/audit-logs',   icon:ScrollText,  label:'Audit Log'            },
  { to:'/admin/settings',     icon:Settings,    label:'Settings'             },
];

// Staff reach Settings read-only (the page itself gates editing to managers).
const STAFF_SETTINGS = { to:'/admin/settings', icon:Settings, label:'Settings', area:null, group:'Admin' };

const MOB_NAV = [
  { to:'/admin',           icon:LayoutDashboard, label:'Home',     end:true, area:null        },
  { to:'/admin/orders',    icon:ClipboardList,   label:'Orders',            area:null        },
  { to:'/admin/inventory', icon:Package,         label:'Stock',              area:'inventory' },
  { to:'/admin/production',icon:Factory, label:'Production',        area:'production'},
];

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
      whileHover={{ background:'var(--bg)' }}
      onClick={() => { if (!isRead) onRead(id); }}
      style={{
        padding:'10px 16px', cursor: isRead ? 'default' : 'pointer',
        borderBottom:'1px solid var(--bg-surface)',
        background: isRead ? 'var(--bg-card)' : 'var(--teal-50)',
        display:'flex', gap:10, alignItems:'flex-start',
        transition:'background .13s',
      }}>
      <div style={{
        width:7, height:7, borderRadius:'50%', flexShrink:0, marginTop:5,
        background: isRead ? 'transparent' : T,
        border: isRead ? '1px solid var(--border)' : 'none',
      }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{
          fontSize:14, fontWeight: isRead ? 500 : 700, color:'var(--ink)',
          margin:'0 0 2px', lineHeight:1.4,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>
          {n.title ?? n.type ?? 'Notification'}
        </p>
        <p style={{
          fontSize:13.5, color:'var(--text-subtle)', margin:0, lineHeight:1.5,
          overflow:'hidden', display:'-webkit-box',
          WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        }}>
          {n.message ?? n.body ?? ''}
        </p>
        {timeStr && (
          <p style={{ fontSize:13, color:'var(--text-faint)', margin:'3px 0 0' }}>{timeStr}</p>
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
  const [avatar,    setAvatar]    = useState(null);
  const [jobFn,     setJobFn]     = useState('general');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('vfrb_adm_sb');
      if (stored !== null) return JSON.parse(stored);
    } catch { }
    if (typeof window !== 'undefined' &&
        window.innerWidth >= 768 && window.innerWidth <= 1023) {
      return true;
    }
    return false;
  });
  const [moreOpen,  setMoreOpen]  = useState(false);
  const [jumpQ,     setJumpQ]     = useState('');
  const [jumpOpen,  setJumpOpen]  = useState(false);
  const [userId] = useState(() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').user_id; } catch { return null; } });
  useAppearance(userId);

  const SW         = collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-w)';
  const isManager  = role === 'manager';
  const owner      = role === 'owner'; // read-only: only the pages OwnerReadOnly lets it GET
  const roleLabel  = isManager ? 'Admin' : owner ? 'Owner · view only' : jobFn === 'general' ? 'Staff' : `${jobFn[0].toUpperCase()}${jobFn.slice(1)} staff`;
  const visibleStaffNav = isManager ? STAFF_NAV : owner ? STAFF_NAV.filter(i => ownerCanOpen(i.to)) : [...visibleForJobFunction(STAFF_NAV, jobFn), STAFF_SETTINGS];
  const extraNav   = isManager ? MANAGER_EXTRA : owner ? MANAGER_EXTRA.filter(i => ownerCanOpen(i.to)) : [];
  const mobNav     = isManager ? MOB_NAV : owner ? MOB_NAV.filter(i => ownerCanOpen(i.to)) : visibleForJobFunction(MOB_NAV, jobFn);
    const navItems   = isManager ? [...STAFF_NAV, ...MANAGER_EXTRA] : visibleStaffNav;

  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notifLoad, setNotifLoad] = useState(false);
  const bellRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [pendingSync, setPendingSync] = useState(queueSize());

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
    if (isOwner()) return; // the API refuses notifications to the owner
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
    if (!profileOpen) return;
    const h = e => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [profileOpen]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
    setRole(u.role || 'staff');
    setName(u.name || 'Staff');
    setAvatar(u.avatar || null);
    setJobFn(u.job_function || 'general');
  }, [location.pathname]);

  // A new profile photo from Settings shows in the header at once.
  useEffect(() => {
    const onUser = (e) => setAvatar(e.detail?.avatar || null);
    window.addEventListener(USER_CHANGE_EVENT, onUser);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUser);
  }, []);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const moreBtnRef = useRef(null);
  const closeMore = () => { setMoreOpen(false); moreBtnRef.current?.focus(); };
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeMore(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const openBell = () => { setBellOpen(b => !b); if (!bellOpen) fetchNotifs(); };

  const syncOrQueue = (method, url) => {
    if (!navigator.onLine) { enqueue({ method, url }); setPendingSync(queueSize()); return; }
    axios({ method, url }).catch((e) => {
      if (!e.response) { enqueue({ method, url }); setPendingSync(queueSize()); }
    });
  };

  const markRead = id => {
    setNotifs(prev => prev.map(n => (n.notif_id ?? n.id) === id ? { ...n, is_read:1 } : n));
    setUnread(p => Math.max(0, p - 1));
    syncOrQueue('patch', `/api/admin/notifications/${id}/read`);
  };

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, is_read:1 })));
    setUnread(0);
    syncOrQueue('post', '/api/admin/notifications/read-all');
  };

  useEffect(() => {
    const flush = () => flushQueue(axios).then(n => { setPendingSync(queueSize()); if (n > 0) fetchNotifs(); });
    if (navigator.onLine) flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  const toggle = () => setCollapsed(c => {
    const n = !c; localStorage.setItem('vfrb_adm_sb', JSON.stringify(n)); return n;
  });

  const logout = () => { signOut(); navigate('/login', { replace: true }); };

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

  // Title shown in the top bar: the longest nav entry that matches the current URL.
  const titleNav  = [...visibleStaffNav, ...extraNav].sort((a, b) => b.to.length - a.to.length);
  // Page-jump box in the top bar: filters the same nav entries the sidebar shows.
  const jumpHits  = jumpQ.trim() ? [...visibleStaffNav, ...extraNav].filter(i => i.label.toLowerCase().includes(jumpQ.trim().toLowerCase())).slice(0, 6) : [];
  const jumpGo    = (to) => { setJumpQ(''); setJumpOpen(false); navigate(to); };
  const pageTitle = location.pathname === '/admin/dashboard'
    ? 'Dashboard'
    : (titleNav.find(i => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))?.label ?? 'Workspace');

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow-x: hidden; font-family: var(--font-sans); }

        @keyframes sk {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        @keyframes bellShake {
          0%,100% { transform: rotate(0); }
          20%     { transform: rotate(-14deg); }
          40%     { transform: rotate(14deg); }
          60%     { transform: rotate(-8deg); }
          80%     { transform: rotate(8deg); }
        }

        .adm-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg);
          position: relative;
        }

        .adm-sb {
          position: fixed;
          top:0; left:0; bottom:0;
          z-index: 200;
          background: linear-gradient(180deg, var(--color-rail) 0%, var(--color-rail-deep) 100%);
          border-right: 1px solid var(--color-rail-deep);
          border-radius: 0;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-1);
          overflow: hidden;
          transition: width .22s cubic-bezier(.4,0,.2,1);
        }

        .adm-sb-head {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 76px;
          position: relative;
          overflow: hidden;
          background: color-mix(in srgb,var(--color-on-rail) 3%,transparent);
          border-bottom: 1px solid color-mix(in srgb,var(--color-on-rail) 8%,transparent);
        }

        .adm-main {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: transparent;
          position: relative;
          z-index: auto;
        }

        .adm-topbar {
          height: var(--topbar-h);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding: 0 var(--shell-pad);
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
        }

        .adm-content {
          flex: 1;
          width: 100%;
          min-width: 0;
          padding: var(--shell-pad) var(--shell-pad) 48px;
        }

        .adm-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          min-height: 44px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          color: color-mix(in srgb,var(--color-on-rail) 78%,transparent);
          white-space: nowrap;
          overflow: hidden;
          transition: background .13s, color .13s, transform .1s;
          position: relative;
          margin: 1px 0;
        }
        .adm-nav-group {
          margin: 20px 12px 6px;
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: color-mix(in srgb,var(--teal-2) 55%,var(--color-on-rail) 30%);
          white-space: nowrap;
        }
        @media (pointer: coarse) { .adm-link { min-height: 44px; } .adm-bell { width: 44px !important; height: 44px !important; } .adm-profile-btn { min-height: 44px !important; } }
        .adm-link:hover {
          background: color-mix(in srgb,var(--color-on-rail) 6%,transparent);
          color: var(--color-on-rail);
        }
        .adm-link.active {
          background: color-mix(in srgb,var(--color-on-rail) 13%,transparent);
          color: var(--color-on-rail);
          font-weight: 800;
        }
        .adm-link.active.mgr {
          background: linear-gradient(135deg, color-mix(in srgb,var(--color-manager) 34%,transparent), color-mix(in srgb,var(--color-manager) 16%,transparent));
          color: var(--color-on-rail);
        }
        .adm-link.active::before {
          content: '';
          position: absolute;
          left:0; top:20%; bottom:20%;
          width: 4px;
          border-radius: 0 4px 4px 0;
          background: var(--teal-2);
        }
        .adm-link.active.mgr::before {
          background: color-mix(in srgb,var(--color-manager) 55%,var(--color-on-rail));
        }

        .adm-sb-toggle {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          min-height: 44px; min-width: 44px; padding: 0 12px; flex-shrink: 0;
          border-radius: var(--radius); border: 1px solid color-mix(in srgb,var(--color-on-rail) 12%,transparent);
          background: color-mix(in srgb,var(--color-on-rail) 5%,transparent);
          color: color-mix(in srgb,var(--color-on-rail) 78%,transparent);
          font: 600 13px/1 var(--font-sans); cursor: pointer;
          transition: background var(--dur-1), color var(--dur-1);
        }
        .adm-sb-toggle:hover { background: color-mix(in srgb,var(--color-on-rail) 10%,transparent); color: var(--color-on-rail); }
        .adm-sb-toggle:focus-visible, .adm-link:focus-visible { outline: 2px solid var(--teal-2); outline-offset: 2px; }

        .adm-sb-user {
          display: flex; align-items: center; gap: 12px; margin: 8px 10px 0; padding: 12px;
          border-radius: 16px; background: color-mix(in srgb,var(--color-on-rail) 8%,transparent);
        }
        .adm-sb-user-av {
          width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; overflow: hidden;
          display: grid; place-items: center; font-size: 14px; font-weight: 800; color: #fff;
        }
        .adm-sb-user b { display: block; font-size: 15px; font-weight: 800; color: var(--color-on-rail); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-sb-user small { display: block; font-size: 13px; color: color-mix(in srgb,var(--color-on-rail) 70%,transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-jump { position: relative; width: min(360px, 30vw); flex-shrink: 0; }
        .adm-jump > svg { position: absolute; left: 14px; top: 15px; color: var(--text-subtle); pointer-events: none; }
        .adm-jump input {
          width: 100%; height: 48px; padding: 0 16px 0 42px; border-radius: 14px;
          border: 1.5px solid var(--border-strong); background: var(--bg-card);
          color: var(--ink); font: 500 15px var(--font-sans); outline: none; transition: border-color .15s, box-shadow .15s;
        }
        .adm-jump input:focus { border-color: var(--teal); box-shadow: 0 0 0 4px color-mix(in srgb,var(--teal) 18%,transparent); }
        .adm-jump-list {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 450; list-style: none; padding: 6px;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-2);
          animation: jumpIn .14s var(--ease-out) both;
        }
        .adm-jump-list button {
          display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 0 12px;
          border: 0; border-radius: 10px; background: none; color: var(--ink); font: 600 15px var(--font-sans); text-align: left; cursor: pointer;
        }
        .adm-jump-list button:hover, .adm-jump-list button:focus-visible { background: var(--teal-50); color: var(--teal-dark); }
        @keyframes jumpIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
        .adm-crumb { min-width: 0; }
        .adm-crumb-t { margin: 0; font-size: 13px; font-weight: 700; color: var(--text-subtle); }
        .adm-crumb-t b { color: var(--teal-dark); font-weight: 800; }
        .adm-crumb-d { margin: 0; font-size: 15px; color: var(--text-muted); }

        .adm-sec {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: color-mix(in srgb,var(--color-on-rail) 35%,transparent);
          padding: 14px 12px 6px;
          margin: 0;
        }

        .adm-bnav {
          display: none;
          position: fixed;
          bottom:0; left:0; right:0;
          z-index: 300;
          background: color-mix(in srgb,var(--color-on-rail) 96%,transparent);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--border);
          box-shadow: var(--shadow-2);
          justify-content: space-around;
          align-items: center;
          padding: 5px 0;
          padding-bottom: max(5px, env(safe-area-inset-bottom, 5px));
          height: 72px;
        }
        .adm-bnav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 5px 2px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          flex: 1 1 0;
          min-width: 0;
          max-width: 76px;
          border-radius: 14px;
          transition: transform .12s;
          position: relative;
        }
        .adm-bnav-btn:active { transform: scale(.9); }
        .adm-bnav-icon  { font-size: 23px; line-height:1; transition: transform .15s; }
        .adm-bnav-label { font-size: 13px; font-weight: 700; color: var(--text-faint); letter-spacing:0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .adm-bnav-btn.mob-active {
          background: var(--teal-50);
        }
        .adm-bnav-btn.mob-active .adm-bnav-icon  { transform: scale(1.14); }
        .adm-bnav-btn.mob-active .adm-bnav-label { color: ${T}; font-weight:800; }

        .adm-more-drawer {
          position: fixed;
          bottom: 0; left:0; right:0;
          z-index: 290;
          background: color-mix(in srgb,var(--color-on-rail) 97%,transparent);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--border);
          border-radius: var(--radius) var(--radius) 0 0;
          box-shadow: var(--shadow-2);
          padding: 4px 16px calc(72px + env(safe-area-inset-bottom, 0px) + 8px);
          max-height: calc(100dvh - 56px);
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .adm-drawer-sec {
          font-size: 12px; font-weight: 800;
          letter-spacing: .1em; color: var(--text-faint);
          margin: 14px 4px 8px;
        }
        .adm-drawer-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        }
        .adm-drawer-tile {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 10px 4px; border-radius: 12px; text-decoration: none;
          color: var(--ink); font-size: 13.5px; font-weight: 700; text-align: center;
          border: 1px solid var(--border); background: var(--bg-card);
          font-family: var(--font-sans);
        }
        .adm-drawer-tile.active { border-color: ${T}; background: var(--teal-50); }
        .adm-drawer-signout {
          width: 100%; margin-top: 18px; padding: 12px;
          border-radius: 12px; border: 1px solid var(--danger);
          background: transparent; color: var(--danger);
          font-size: 14px; font-weight: 700; cursor: pointer;
          font-family: var(--font-sans);
        }
        .adm-drawer-signout:hover { background: var(--danger-bg); }

        @media (max-width: 767px) {
          .adm-sb       { display: none !important; }
          .adm-main     { margin-left: 0 !important; }
          .adm-bnav     { display: flex; }
          .adm-topbar   { padding: 0 var(--content-pad-mob); height: 56px; }
          .adm-content  { padding: var(--content-pad-mob) var(--content-pad-mob) 88px; }
          /* Bell panel: full width under the 56px top bar, stopping above the bottom nav. */
          .adm-notif-panel {
            position: fixed !important;
            top: 64px !important; left: 8px !important; right: 8px !important;
            width: auto !important;
            max-height: calc(100dvh - 64px - 80px - env(safe-area-inset-bottom, 0px)) !important;
          }
          .adm-desk-only{ display: none !important; }
        }
        @media (max-width: 479px) { .adm-tagline { display: none; } }
        @media (min-width: 768px) {
          .adm-bnav         { display: none !important; }
          .adm-mob-only     { display: none !important; }
          .adm-more-drawer  { display: none !important; }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 2px; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: .01ms !important; }
        }
      `}</style>

      <div className="adm-shell">

        <aside className="adm-sb" style={{ width:SW }}>

          <div className="adm-sb-head"
            style={{ padding: collapsed ? '16px 10px' : '16px 18px' }}>
            <img src={logo} alt="VFRB"
              style={{ width:44, height:44, borderRadius:12, objectFit:'cover',
                border:'2px solid color-mix(in srgb,var(--color-on-rail) 20%,transparent)', flexShrink:0, position:'relative', zIndex:1 }}/>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                <p style={{ fontSize:16, fontWeight:800, color:'var(--color-on-rail)',
                  letterSpacing:'.06em', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>
                  VFRB ENTERPRISE
                </p>
                <p style={{ fontSize:13, color:T2, fontWeight:600, letterSpacing:'.01em', margin:'2px 0 0',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {isManager ? 'Admin workspace' : owner ? 'Owner view' : 'Staff workspace'}
                </p>
              </div>
            )}
          </div>

          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden',
            padding: collapsed ? '8px 4px' : '8px 10px',
            scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>

            {NAV_GROUPS.map((g, gi) => {
              const items = g === 'Admin'
                ? [...visibleStaffNav.filter(i => i.group === g), ...extraNav.map(i => ({ ...i, mgr:true }))]
                : visibleStaffNav.filter(i => i.group === g);
              if (!items.length) return null;
              return (
                <div key={g} role="group" aria-label={g}>
                  {collapsed
                    ? gi > 0 && <div style={{ height:1, background:'color-mix(in srgb,var(--color-on-rail) 8%,transparent)', margin:'8px 6px' }}/>
                    : <p className="adm-nav-group" style={gi === 0 ? { marginTop:4 } : undefined}>{g}</p>}
                  {items.map(item => (
                    <NavLink key={item.to} to={item.to} end={item.end}
                      className={({ isActive }) => `adm-link${isActive ? (item.mgr ? ' active mgr' : ' active') : ''}`}
                      title={collapsed ? item.label : undefined}
                      style={collapsed ? { justifyContent:'center', padding:'10px 0' } : {}}>
                      <IconBox icon={item.icon} size={16} width={20}/>
                      {!collapsed && (
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              );
            })}

          </div>

          <div className="adm-sb-user" style={collapsed ? { justifyContent:'center', margin:'8px 8px 0', padding:8 } : undefined}>
            <div className="adm-sb-user-av" style={{ background: isManager ? 'var(--purple)' : 'var(--teal)' }}>
              {avatar ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
            </div>
            {!collapsed && (
              <div style={{ minWidth:0 }}>
                <b>{name}</b>
                <small>{roleLabel}</small>
              </div>
            )}
          </div>

          <button onClick={toggle} className="adm-sb-toggle" aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : undefined}
            style={{ margin: collapsed ? '6px auto 10px' : '6px 10px 10px' }}>
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.9} aria-hidden="true"/> : <><PanelLeftClose size={18} strokeWidth={1.9} aria-hidden="true"/><span>Collapse</span></>}
          </button>

        </aside>

        <main className="adm-main"
          style={{ marginLeft: SW, transition:'margin-left .22s cubic-bezier(.4,0,.2,1)' }}>

          <div className="adm-topbar">

            <img src={logo} alt="VFRB" className="adm-mob-only"
              style={{ width:30, height:30, borderRadius:8, objectFit:'cover',
                border:'1.5px solid var(--border)', flexShrink:0 }}/>
            <div className="adm-mob-only" style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:800, color:'var(--ink)',
                letterSpacing:'.04em', margin:0, lineHeight:1.2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                VFRB Enterprise
              </p>
              <p className="adm-tagline" style={{ fontSize:12, color:'var(--text-subtle)', fontWeight:600, margin:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Custom Uniforms. Smarter Solutions.</p>
            </div>

            <div className="adm-desk-only adm-crumb">
              <p className="adm-crumb-t">{isManager ? 'Admin' : owner ? 'Owner' : 'Staff'} / <b>{pageTitle}</b></p>
              <p className="adm-crumb-d">
                {new Date().toLocaleDateString('en-PH',{
                  weekday:'long', month:'long', day:'numeric', year:'numeric' })}
              </p>
            </div>
            <div style={{ flex:1 }}/>

            <div className="adm-jump adm-desk-only">
              <Search size={18} strokeWidth={2} aria-hidden="true"/>
              <input type="search" value={jumpQ} placeholder="Jump to a page…" aria-label="Jump to a page"
                onChange={e => { setJumpQ(e.target.value); setJumpOpen(true); }}
                onFocus={() => setJumpOpen(true)} onBlur={() => setTimeout(() => setJumpOpen(false), 120)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && jumpHits[0]) jumpGo(jumpHits[0].to);
                  if (e.key === 'Escape') { setJumpQ(''); setJumpOpen(false); }
                }}/>
              {jumpOpen && jumpHits.length > 0 && (
                <ul className="adm-jump-list" role="listbox" aria-label="Pages">
                  {jumpHits.map(i => (
                    <li key={i.to} role="option" aria-selected="false">
                      <button type="button" onMouseDown={e => { e.preventDefault(); jumpGo(i.to); }}>
                        <i.icon size={18} strokeWidth={1.9} aria-hidden="true"/>{i.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!owner && <div ref={bellRef} style={{ position:'relative' }}>
              <motion.button
                className="adm-bell"
                whileHover={{ scale:1.07 }}
                whileTap={{ scale:.93 }}
                onClick={openBell}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={bellOpen}
                style={{
                  width:48, height:48, borderRadius:14, border:'1px solid var(--border)',
                  background: bellOpen ? 'var(--teal-50)' : 'var(--bg-card)',
                  cursor:'pointer', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:17, position:'relative',
                  transition:'background .15s',
                  animation: unread > 0 ? 'bellShake .5s ease' : 'none',
                }}>
                <Bell size={22} strokeWidth={1.9}/>
                <AnimatePresence>
                  {unread > 0 && (
                    <motion.span
                      initial={{ scale:0 }} animate={{ scale:[1,1.25,1] }} exit={{ scale:0 }}
                      transition={{ duration:.35, times:[0,.5,1] }}
                      style={{
                        position:'absolute', top:-6, right:-6,
                        minWidth:22, height:22, borderRadius:99, boxSizing:'border-box',
                        background:'var(--danger)', color:'var(--text-on-accent)',
                        fontSize:12.5, fontWeight:800, lineHeight:1, whiteSpace:'nowrap',
                        display:'flex', alignItems:'center',
                        justifyContent:'center', padding:'0 3px',
                        border:'2px solid var(--bg-card)',
                      }}>
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    className="adm-notif-panel"
                    initial={{ opacity:0, y:-8, scale:.97 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    exit={{ opacity:0, y:-6, scale:.97 }}
                    transition={{ duration:.18, ease:'easeOut' }}
                    style={{
                      position:'absolute', top:'calc(100% + 8px)', right:0,
                      width:380, maxHeight:520,
                      background:'var(--bg-card)', border:'1px solid var(--border)',
                      borderRadius:'var(--radius)', overflow:'hidden',
                      boxShadow:'var(--shadow-2)',
                      zIndex:500, display:'flex', flexDirection:'column',
                    }}>
                    <div style={{
                      padding:'13px 16px', borderBottom:'1px solid var(--border)',
                      display:'flex', justifyContent:'space-between',
                      alignItems:'center', background:'var(--bg)', flexShrink:0,
                    }}>
                      <div>
                        <p style={{ fontSize:16, fontWeight:800, color:'var(--ink)', margin:0 }}>
                          Notifications
                        </p>
                        {unread > 0 && (
                          <p style={{ fontSize:12, color:'var(--text-subtle)', margin:'1px 0 0' }}>
                            {unread} unread
                          </p>
                        )}
                      </div>
                      {unread > 0 && (
                        <button onClick={markAllRead}
                          style={{ fontSize:12, fontWeight:700, color:T,
                            background:'none', border:'none', cursor:'pointer',
                            padding:'4px 8px', borderRadius:7, fontFamily:'inherit' }}>
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ flex:1, overflowY:'auto' }}>
                      {notifLoad ? (
                        <div style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
                          {[1,2,3].map(i => (
                            <div key={i} style={{
                              height:52, borderRadius:10,
                              background:'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
                              backgroundSize:'400px', animation:'sk 1.4s infinite',
                            }}/>
                          ))}
                        </div>
                      ) : notifs.length === 0 ? (
                        <div style={{ padding:'36px 20px', textAlign:'center' }}>
                          <Bell size={32} strokeWidth={1.5} style={{ opacity:.3, marginBottom:8 }}/>
                          <p style={{ fontSize:13, color:'var(--text-faint)' }}>No notifications</p>
                        </div>
                      ) : (
                        <>
                          {notifToday.length > 0 && (
                            <>
                              <div style={{ padding:'8px 16px 4px', fontSize:12, fontWeight:800,
                                color:'var(--text-faint)', textTransform:'uppercase',
                                letterSpacing:'.08em', background:'var(--bg-surface)' }}>Today</div>
                              {notifToday.map(n => (
                                <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead}/>
                              ))}
                            </>
                          )}
                          {notifEarlier.length > 0 && (
                            <>
                              <div style={{ padding:'8px 16px 4px', fontSize:12, fontWeight:800,
                                color:'var(--text-faint)', textTransform:'uppercase',
                                letterSpacing:'.08em', background:'var(--bg-surface)',
                                borderTop: notifToday.length > 0 ? '1px solid var(--bg-surface)' : 'none' }}>
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
            </div>}

            <div ref={profileRef} style={{ position:'relative' }}>
              <button className="adm-profile-btn" onClick={() => setProfileOpen(o => !o)}
                style={{ display:'flex', alignItems:'center', gap:8, border:'none',
                  background: profileOpen ? 'var(--bg)' : 'transparent',
                  borderRadius:99, padding:'5px 16px 5px 5px', cursor:'pointer',
                  border:'1px solid var(--border)', transition:'background .13s' }}>
                <div style={{ width:38, height:38, borderRadius:'50%',
                  background: isManager ? 'var(--purple)' : T,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: isManager ? 'var(--text-on-accent)' : 'var(--on-teal)', fontSize:12, fontWeight:800, flexShrink:0,
                  overflow:'hidden' }}>
                  {avatar ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
                </div>
                <span className="adm-desk-only"
                  style={{ fontSize:15, fontWeight:700, color:'var(--ink)',
                    whiteSpace:'nowrap' }}>
                  {name}
                </span>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                    style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:180,
                      background:'var(--bg-card)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-2)',
                      border:'1px solid var(--border)', overflow:'hidden', zIndex:400 }}>
                    <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--bg-surface)' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:0 }}>{name}</p>
                      <p style={{ fontSize:12, color:'var(--text-faint)', margin:0 }}>{roleLabel}</p>
                    </div>
                    <button onClick={logout}
                      style={{ width:'100%', minHeight:44, padding:'10px 14px', border:'none', background:'transparent',
                        cursor:'pointer', color:'var(--danger-text)', fontSize:12, fontWeight:600,
                        textAlign:'left', fontFamily:'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--danger-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                        <LogOut size={14} strokeWidth={2}/> Sign Out
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          <div className="adm-content">
            {pendingSync > 0 && (
              <AlertBanner tone="warning" title={`${pendingSync} change${pendingSync > 1 ? 's' : ''} waiting to sync`}>
                They send automatically once you're back online.
              </AlertBanner>
            )}
            <PageErrorBoundary resetKey={location.pathname}>
              <div key={location.pathname} className="adm-page vfrb-page"><Suspense fallback={<AppPageSkeleton/>}><Outlet/></Suspense></div>
            </PageErrorBoundary>
          </div>
        </main>

        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={closeMore}
                style={{ position:'fixed', inset:0, background:'color-mix(in srgb,var(--color-rail-deep) 40%,transparent)',
                  zIndex:280, backdropFilter:'blur(2px)' }}/>
              <motion.div
                className="adm-more-drawer"
                initial={{ y:80, opacity:0 }}
                animate={{ y:0, opacity:1 }}
                exit={{ y:80, opacity:0 }}
                transition={{ type:'spring', stiffness:340, damping:30 }}>

                {NAV_GROUPS.map(g => {
                  const inBar = mobNav.map(i => i.to);
                  const items = [
                    ...visibleStaffNav.filter(i => i.group === g && !inBar.includes(i.to)),
                    ...(g === 'Admin' ? extraNav : []),
                  ];
                  if (!items.length) return null;
                  return (
                    <div key={g} role="group" aria-label={g}>
                      <p className="adm-drawer-sec">{g}</p>
                      <div className="adm-drawer-grid">
                        {items.map(item => <DrawerTile key={item.to} item={item}/>)}
                      </div>
                    </div>
                  );
                })}

                <button className="adm-drawer-signout" onClick={logout}>Sign Out</button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <nav className="adm-bnav" aria-label="Mobile navigation">
          {mobNav.map(item => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={`adm-bnav-btn${active ? ' mob-active' : ''}`}>
                <span className="adm-bnav-icon"
                  style={{ filter: active ? 'none' : 'grayscale(.4) opacity(.65)' }}>
                  <item.icon size={22} strokeWidth={2}/>
                </span>
                <span className="adm-bnav-label">{item.label}</span>
              </NavLink>
            );
          })}

          <button className="adm-bnav-btn" ref={moreBtnRef}
            onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen}
            style={{ border:'none', cursor:'pointer', background:'transparent',
              fontFamily:'inherit' }}>
            <span className="adm-bnav-icon"
              style={{ color: moreOpen ? T : undefined,
                filter: moreOpen ? 'none' : 'grayscale(.4) opacity(.65)' }}>
              <MoreHorizontal size={22} strokeWidth={2} aria-hidden="true"/>
            </span>
            <span className="adm-bnav-label"
              style={{ color: moreOpen ? T : undefined }}>
              More
            </span>
          </button>
        </nav>
      </div>
    </>
  );
}