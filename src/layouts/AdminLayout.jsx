import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { enqueue, flushQueue, queueSize } from '../utils/offlineQueue';
import { signOut } from '../utils/session';
import PageErrorBoundary from '../components/PageErrorBoundary';
import IconBox from '../components/ui/IconBox';
import '../styles/admin.css';
import logo from '../assets/company-logo.jpg';
import { JOB_FUNCTION_AREAS } from '../utils/jobAccess';
import {
  LayoutDashboard, ClipboardList, Package, MessageSquare, ShoppingCart,
  Truck, Layers, Factory, FileText, ShieldCheck, ScanLine, AlertTriangle,
  Wallet, BarChart3, Receipt, Building2, Users, MessageCircle, Settings,
  LogOut, Bell, Trophy, Contact,
} from 'lucide-react';

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';
const MG = 'var(--purple)';

const STAFF_NAV = [
  { to:'/admin',              icon:LayoutDashboard, label:'Dashboard',    end:true, area:null        },
  { to:'/admin/orders',       icon:ClipboardList,   label:'Orders',                area:null        },
  { to:'/admin/customers',    icon:Contact,         label:'Clients',               area:null        },
  { to:'/admin/inventory',    icon:Package,         label:'Inventory',             area:'inventory' },
  { to:'/admin/messages',     icon:MessageSquare,   label:'Messages',              area:null        },
  { to:'/admin/procurement',  icon:ShoppingCart,    label:'Procurement',           area:'inventory' },
  { to:'/admin/delivery',     icon:Truck,           label:'Delivery',              area:null        },
  { to:'/admin/materials',    icon:Layers,          label:'Materials',             area:'inventory' },
  { to:'/admin/production',   icon:Factory,         label:'Production',            area:'production'},
  { to:'/admin/output-log',   icon:FileText,        label:'Output Log',            area:'production'},
  { to:'/admin/qc',           icon:ShieldCheck,     label:'QC Checklist',          area:'production'},
  { to:'/admin/physical-count',icon:ScanLine,       label:'Physical Count',        area:'inventory' },
  { to:'/admin/production-incidents',icon:AlertTriangle,label:'Incidents',         area:'production'},
  { to:'/admin/transactions', icon:Wallet,          label:'Sales & Pay',           area:null        },
];

function visibleForJobFunction(navArray, jobFunction) {
  const allowed = JOB_FUNCTION_AREAS[jobFunction] ?? JOB_FUNCTION_AREAS.general;
  return navArray.filter(item => item.area === null || allowed.includes(item.area));
}
const TILE_COLORS = ['#0284c7','#7c3aed','#059669','#d97706','#dc2626','#4338ca','#be185d','#0369a1'];
function DrawerTile({ item, i }) {
  return (
    <NavLink to={item.to} className={({ isActive }) => `adm-drawer-tile${isActive ? ' active' : ''}`}>
      <IconBox icon={item.icon} size={18} width={40} style={{ height:40, borderRadius:12, background:TILE_COLORS[i % TILE_COLORS.length], color:'#fff' }}/>
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
  { to:'/admin/settings',     icon:Settings,    label:'Settings'             },
];

// Staff reach Settings read-only (the page itself gates editing to managers).
const STAFF_SETTINGS = { to:'/admin/settings', icon:Settings, label:'Settings', area:null };

const MOB_NAV = [
  { to:'/admin',           icon:LayoutDashboard, label:'Home',     end:true, area:null        },
  { to:'/admin/orders',    icon:ClipboardList,   label:'Orders',            area:null        },
  { to:'/admin/inventory', icon:Package,         label:'Stock',              area:'inventory' },
  { to:'/admin/messages',  icon:MessageSquare,   label:'Chat',               area:null        },
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
        background: isRead ? '#fff' : 'rgba(2,195,154,.04)',
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
          fontSize:12, fontWeight: isRead ? 500 : 700, color:'var(--ink)',
          margin:'0 0 2px', lineHeight:1.4,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>
          {n.title ?? n.type ?? 'Notification'}
        </p>
        <p style={{
          fontSize:11, color:'var(--text-subtle)', margin:0, lineHeight:1.5,
          overflow:'hidden', display:'-webkit-box',
          WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        }}>
          {n.message ?? n.body ?? ''}
        </p>
        {timeStr && (
          <p style={{ fontSize:9, color:'var(--text-faint)', margin:'3px 0 0' }}>{timeStr}</p>
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

  const SW         = collapsed ? 68 : 226;
  const isManager  = role === 'manager';
  const roleLabel  = isManager ? 'Manager' : jobFn === 'general' ? 'Staff' : `${jobFn[0].toUpperCase()}${jobFn.slice(1)} staff`;
  const visibleStaffNav = isManager ? STAFF_NAV : [...visibleForJobFunction(STAFF_NAV, jobFn), STAFF_SETTINGS];
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

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

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

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow-x: hidden; font-family: ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif; }

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
          background: #f4f7fe;
          position: relative;
        }
        .adm-shell::before {
          content: '';
          position: fixed;
          top: -120px;
          right: -80px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(2,195,154,.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .adm-sb {
          position: fixed;
          top:0; left:0; bottom:0;
          z-index: 200;
          background: linear-gradient(180deg, #0b3a41 0%, #072226 100%);
          border-right: 1px solid rgba(0,0,0,.15);
          border-radius: 0;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 12px rgba(0,0,0,.15);
          overflow: hidden;
          transition: width .22s cubic-bezier(.4,0,.2,1);
        }

        .adm-sb-head {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 62px;
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,.03);
          border-bottom: 1px solid rgba(255,255,255,.08);
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
          height: 60px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding: 0 22px;
          gap: 10px;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(15,23,42,.04);
        }

        .adm-content {
          flex: 1;
          width: 100%;
          min-width: 0;
          padding: 24px 24px 88px;
        }
        @media (min-width: 1600px) {
          .adm-content {
            padding: 28px 32px 88px;
          }
        }

        .adm-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,.62);
          white-space: nowrap;
          overflow: hidden;
          transition: background .13s, color .13s, transform .1s;
          position: relative;
          margin: 1px 0;
        }
        .adm-link:hover {
          background: rgba(255,255,255,.06);
          color: #fff;
          transform: translateX(2px);
        }
        .adm-link.active {
          background: linear-gradient(135deg, rgba(2,195,154,.22), rgba(2,195,154,.10));
          color: #fff;
          font-weight: 700;
          box-shadow: inset 0 0 0 1px rgba(2,195,154,.25);
        }
        .adm-link.active.mgr {
          background: linear-gradient(135deg, rgba(167,139,250,.24), rgba(124,58,237,.12));
          color: #fff;
        }
        .adm-link.active::before {
          content: '';
          position: absolute;
          left:0; top:18%; bottom:18%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, ${T2}, #6ee7d1);
        }
        .adm-link.active.mgr::before {
          background: linear-gradient(180deg, #a78bfa, #c4b5fd);
        }

        .adm-sec {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: rgba(255,255,255,.35);
          padding: 14px 12px 6px;
          margin: 0;
        }

        .adm-bnav {
          display: none;
          position: fixed;
          bottom:0; left:0; right:0;
          z-index: 300;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(226,232,240,.8);
          box-shadow: 0 -4px 32px rgba(0,0,0,.10), 0 -1px 0 rgba(2,128,144,.06);
          justify-content: space-around;
          align-items: center;
          padding: 5px 0;
          padding-bottom: max(5px, env(safe-area-inset-bottom, 5px));
          height: 66px;
        }
        .adm-bnav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 5px 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-decoration: none;
          min-width: 54px;
          border-radius: 14px;
          transition: transform .12s;
          position: relative;
        }
        .adm-bnav-btn:active { transform: scale(.9); }
        .adm-bnav-icon  { font-size: 23px; line-height:1; transition: transform .15s; }
        .adm-bnav-label { font-size: 9px; font-weight: 600; color: var(--text-faint); letter-spacing:.02em; }
        .adm-bnav-btn.mob-active {
          background: linear-gradient(135deg, rgba(2,128,144,.08), rgba(2,195,154,.06));
        }
        .adm-bnav-btn.mob-active .adm-bnav-icon  { transform: scale(1.14); }
        .adm-bnav-btn.mob-active .adm-bnav-label { color: ${T}; font-weight:800; }

        .adm-more-drawer {
          position: fixed;
          bottom: 64px; left:0; right:0;
          z-index: 290;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--border);
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,.12);
          padding: 14px 16px 8px;
          max-height: 75vh;
          overflow-y: auto;
        }
        .adm-drawer-sec {
          font-size: 11; font-weight: 800; text-transform: uppercase;
          letter-spacing: .1em; color: var(--text-faint);
          margin: 14px 4px 8px;
        }
        .adm-drawer-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        }
        .adm-drawer-tile {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 10px 4px; border-radius: 12px; text-decoration: none;
          color: #1a2332; font-size: 10px; font-weight: 600; text-align: center;
          border: 1px solid var(--border); background: #fff;
          font-family: ui-sans-serif,system-ui,-apple-system,sans-serif;
        }
        .adm-drawer-tile.active { border-color: ${T}; background: rgba(2,128,144,.06); }
        .adm-drawer-signout {
          width: 100%; margin-top: 18px; padding: 12px;
          border-radius: 12px; border: 1px solid var(--danger, #dc2626);
          background: transparent; color: var(--danger, #dc2626);
          font-size: 14px; font-weight: 700; cursor: pointer;
          font-family: ui-sans-serif,system-ui,-apple-system,sans-serif;
        }
        .adm-drawer-signout:hover { background: rgba(220,38,38,.06); }

        @media (max-width: 767px) {
          .adm-sb       { display: none !important; }
          .adm-main     { margin-left: 0 !important; }
          .adm-bnav     { display: flex; }
          .adm-topbar   { padding: 0 16px; height: 56px; }
          .adm-content  { padding: 14px 14px 84px; }
          .adm-desk-only{ display: none !important; }
        }
        @media (min-width: 768px) {
          .adm-bnav         { display: none !important; }
          .adm-mob-only     { display: none !important; }
          .adm-more-drawer  { display: none !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .adm-content { padding: 18px 18px 28px; }
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          .adm-content { padding: 20px 20px 40px; }
        }
        @media (min-width: 2560px) {
          .adm-content {
            padding: 36px 40px 100px;
            max-width: 1800px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: .01ms !important; }
        }
      `}</style>

      <div className="adm-shell">

        <aside className="adm-sb" style={{ width:SW }}>

          <div className="adm-sb-head"
            style={{ padding: collapsed ? '14px 10px' : '14px 16px' }}>
            <img src={logo} alt="VFRB"
              style={{ width:34, height:34, borderRadius:9, objectFit:'cover',
                border:'2px solid rgba(255,255,255,.15)', flexShrink:0, position:'relative', zIndex:1 }}/>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                <p style={{ fontSize:11, fontWeight:800, color:'#fff',
                  letterSpacing:'.05em', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>
                  VFRB ENTERPRISE
                </p>
                <p style={{ fontSize:9.5, color:T2, fontWeight:600, letterSpacing:'.02em', margin:'2px 0 0',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  Custom Uniforms. Smarter Solutions.
                </p>
              </div>
            )}
          </div>

          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden',
            padding: collapsed ? '8px 4px' : '8px 10px',
            scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>

            {visibleStaffNav.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `adm-link${isActive ? ' active' : ''}`}
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

            {isManager && (
              <>
                <div style={{ height:1, background:'rgba(255,255,255,.08)', margin:'8px 6px' }}/>
                {MANAGER_EXTRA.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `adm-link${isActive ? ' active mgr' : ''}`}
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
              </>
            )}

          </div>

          <button onClick={toggle}
            style={{ margin: collapsed ? '6px auto' : '6px 6px 6px auto',
              padding: collapsed ? '9px' : '7px 12px', minHeight:44, minWidth:44, borderRadius: 99,
              border:'1px solid rgba(255,255,255,.12)', background:'rgba(255,255,255,.05)',
              cursor:'pointer', color:'rgba(255,255,255,.55)', fontSize:11, fontWeight:600,
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:5, fontFamily:'inherit', flexShrink:0, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.10)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.55)'; }}>
            {collapsed ? '▶' : '◀ Collapse'}
          </button>

        </aside>

        <main className="adm-main"
          style={{ marginLeft: SW, transition:'margin-left .22s cubic-bezier(.4,0,.2,1)' }}>

          <div className="adm-topbar">

            <img src={logo} alt="VFRB" className="adm-mob-only"
              style={{ width:30, height:30, borderRadius:8, objectFit:'cover',
                border:'1.5px solid var(--border)', flexShrink:0 }}/>
            <div className="adm-mob-only" style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:11, fontWeight:800, color:'var(--ink)',
                letterSpacing:'.04em', margin:0, lineHeight:1.2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                VFRB Enterprise
              </p>
              <p style={{ fontSize:9.5, color:'var(--text-subtle)', fontWeight:600, margin:0 }}>Custom Uniforms. Smarter Solutions.</p>
            </div>

            <span className="adm-desk-only" style={{ color:'var(--text-faint)', fontSize:12, flexShrink:0 }}>
              {new Date().toLocaleDateString('en-PH',{
                weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </span>
            <div style={{ flex:1 }}/>

            <div ref={bellRef} style={{ position:'relative' }}>
              <motion.button
                whileHover={{ scale:1.07 }}
                whileTap={{ scale:.93 }}
                onClick={openBell}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={bellOpen}
                style={{
                  width:36, height:36, borderRadius:10, border:'none',
                  background: bellOpen ? 'var(--teal-50, rgba(2,128,144,.10))' : 'var(--bg)',
                  cursor:'pointer', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:17, position:'relative',
                  transition:'background .15s',
                  animation: unread > 0 ? 'bellShake .5s ease' : 'none',
                }}>
                <Bell size={17} strokeWidth={2}/>
                <AnimatePresence>
                  {unread > 0 && (
                    <motion.span
                      initial={{ scale:0 }} animate={{ scale:[1,1.25,1] }} exit={{ scale:0 }}
                      transition={{ duration:.35, times:[0,.5,1] }}
                      style={{
                        position:'absolute', top:2, right:2,
                        minWidth:16, height:16, borderRadius:99,
                        background:'var(--danger)', color:'#fff',
                        fontSize:9, fontWeight:800,
                        display:'flex', alignItems:'center',
                        justifyContent:'center', padding:'0 3px',
                        border:'2px solid #fff',
                      }}>
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity:0, y:-8, scale:.97 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    exit={{ opacity:0, y:-6, scale:.97 }}
                    transition={{ duration:.18, ease:'easeOut' }}
                    style={{
                      position:'absolute', top:'calc(100% + 8px)', right:0,
                      width:340, maxHeight:480,
                      background:'#fff', border:'1px solid var(--border)',
                      borderRadius:16, overflow:'hidden',
                      boxShadow:'0 12px 40px rgba(0,0,0,.14)',
                      zIndex:500, display:'flex', flexDirection:'column',
                    }}>
                    <div style={{
                      padding:'13px 16px', borderBottom:'1px solid var(--border)',
                      display:'flex', justifyContent:'space-between',
                      alignItems:'center', background:'var(--bg)', flexShrink:0,
                    }}>
                      <div>
                        <p style={{ fontSize:13, fontWeight:800, color:'var(--ink)', margin:0 }}>
                          Notifications
                        </p>
                        {unread > 0 && (
                          <p style={{ fontSize:10, color:'var(--text-subtle)', margin:'1px 0 0' }}>
                            {unread} unread
                          </p>
                        )}
                      </div>
                      {unread > 0 && (
                        <button onClick={markAllRead}
                          style={{ fontSize:10, fontWeight:700, color:T,
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
                              <div style={{ padding:'8px 16px 4px', fontSize:9, fontWeight:800,
                                color:'var(--text-faint)', textTransform:'uppercase',
                                letterSpacing:'.08em', background:'#fafafa' }}>Today</div>
                              {notifToday.map(n => (
                                <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead}/>
                              ))}
                            </>
                          )}
                          {notifEarlier.length > 0 && (
                            <>
                              <div style={{ padding:'8px 16px 4px', fontSize:9, fontWeight:800,
                                color:'var(--text-faint)', textTransform:'uppercase',
                                letterSpacing:'.08em', background:'#fafafa',
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
            </div>

            <div ref={profileRef} style={{ position:'relative' }}>
              <button onClick={() => setProfileOpen(o => !o)}
                style={{ display:'flex', alignItems:'center', gap:8, border:'none',
                  background: profileOpen ? 'var(--bg)' : 'transparent',
                  borderRadius:99, padding:'4px 8px 4px 4px', cursor:'pointer',
                  transition:'background .13s' }}>
                <div style={{ width:32, height:32, borderRadius:'50%',
                  background: isManager ? 'var(--purple)' : T,
                  border:'2px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontSize:12, fontWeight:800, flexShrink:0,
                  overflow:'hidden' }}>
                  {avatar ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
                </div>
                <span className="adm-desk-only"
                  style={{ fontSize:13, fontWeight:600, color:'var(--ink)',
                    whiteSpace:'nowrap' }}>
                  {name}
                </span>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                    style={{ position:'absolute', top:'calc(100% + 8px)', right:0, width:180,
                      background:'#fff', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,.16)',
                      border:'1px solid var(--border)', overflow:'hidden', zIndex:400 }}>
                    <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--bg-surface)' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:0 }}>{name}</p>
                      <p style={{ fontSize:10, color:'var(--text-faint)', margin:0 }}>{roleLabel}</p>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', marginBottom: 14, borderRadius: 10, border: '1px solid #fed7aa', background: '#fff7ed' }}>
                <span style={{ fontSize: 12 }}>↻</span>
                <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>{pendingSync} change{pendingSync > 1 ? 's' : ''} waiting to sync — will send automatically once you're back online.</span>
              </div>
            )}
            <PageErrorBoundary resetKey={location.pathname}>
              <div key={location.pathname} className="adm-page"><Outlet/></div>
            </PageErrorBoundary>
          </div>
        </main>

        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setMoreOpen(false)}
                style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.32)',
                  zIndex:280, backdropFilter:'blur(2px)' }}/>
              <motion.div
                className="adm-more-drawer"
                initial={{ y:80, opacity:0 }}
                animate={{ y:0, opacity:1 }}
                exit={{ y:80, opacity:0 }}
                transition={{ type:'spring', stiffness:340, damping:30 }}>

                <div className="adm-drawer-grid">
                  {visibleStaffNav.filter(i =>
                    !['/admin','/admin/orders','/admin/inventory',
                      '/admin/messages','/admin/production'].includes(i.to)
                  ).map((item, i) => <DrawerTile key={item.to} item={item} i={i}/>)}
                </div>

                {isManager && (
                  <>
                    <div className="adm-drawer-grid" style={{ marginTop:10 }}>
                      {MANAGER_EXTRA.map((item, i) => <DrawerTile key={item.to} item={item} i={i}/>)}
                    </div>
                  </>
                )}

                <button className="adm-drawer-signout" onClick={logout}>Sign Out</button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <nav className="adm-bnav" aria-label="Mobile navigation">
          {(isManager ? MOB_NAV : visibleForJobFunction(MOB_NAV, jobFn)).map(item => {
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

          <button className="adm-bnav-btn"
            onClick={() => setMoreOpen(o => !o)}
            style={{ border:'none', cursor:'pointer', background:'transparent',
              fontFamily:'inherit' }}>
            <span className="adm-bnav-icon"
              style={{ color: moreOpen ? T : undefined,
                filter: moreOpen ? 'none' : 'grayscale(.4) opacity(.65)' }}>
              ⋯
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