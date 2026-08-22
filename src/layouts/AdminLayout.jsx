// src/layouts/AdminLayout.jsx
// FIXED: mobile topbar shows logo + portal label (teal/purple gradient by role)
// FIXED: logout accessible via More drawer only (removed redundant topbar Out button)
// FIXED: all admin nav items reachable on mobile via scrollable More drawer
// NO dark mode — vibrant light with teal + purple color accents
import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/company-logo.jpg';

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';
const MG = 'var(--purple)'; // manager purple

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
  // Settings: staff view-only, manager can edit — gated INSIDE
  // Settings.jsx itself, so this belongs in the shared nav, not
  // MANAGER_EXTRA. (Fixed here Aug 23 2026 — this UI/UX branch had
  // regressed back to the pre-fix placement; same root cause as the
  // App.jsx RequireManager bug fixed earlier this session.)
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
  const [collapsed, setCollapsed] = useState(() => {
    // MOBILE AUDIT FIX (Aug 22): previously always defaulted to false
    // (full 226px sidebar) with no viewport awareness at all, so a first-
    // time tablet visitor (768-1023px, no saved preference yet) got the
    // full desktop sidebar instead of the documented icons-only default.
    // Only applies when nothing has been saved yet — an explicit manual
    // toggle (by the user, at any width) always wins after that.
    try {
      const stored = localStorage.getItem('vfrb_adm_sb');
      if (stored !== null) return JSON.parse(stored);
    } catch { /* fall through to width-based default */ }
    if (typeof window !== 'undefined' &&
        window.innerWidth >= 768 && window.innerWidth <= 1023) {
      return true;
    }
    return false;
  });
  const [moreOpen,  setMoreOpen]  = useState(false);
  // Dynamic company logo (Aug 23 2026) — pulls the uploaded Settings logo
  // instead of the static bundled asset. Falls back to the bundled `logo`
  // import if nothing has been uploaded yet, or if this fetch fails —
  // never shows a broken image while waiting/erroring.
  const [companyLogo, setCompanyLogo] = useState(logo);
  useEffect(() => {
    axios.get('/api/admin/settings/company')
      .then(r => { if (r.data?.logo_url) setCompanyLogo(r.data.logo_url); })
      .catch(() => {}); // keep the bundled fallback on any failure
  }, []);

  const SW         = collapsed ? 68 : 226;
  const isManager  = role === 'manager';
  const navItems   = isManager ? [...STAFF_NAV, ...MANAGER_EXTRA] : STAFF_NAV;

  // Notification bell
  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notifLoad, setNotifLoad] = useState(false);
  const bellRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

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
  // Aug 23 correction: previously a full vibrant gradient background on
  // both the sidebar header and topbar. Dave called this out directly —
  // that's not what "Cruip look" means; Cruip's actual header is white
  // with a thin border, and role color should read as a small accent,
  // not the whole surface. Role distinction now lives in: the portal
  // label text color, the small "Manager"/"Staff" badge, and the avatar
  // ring — not a background fill.
  const roleColor = isManager ? 'var(--purple)' : T;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; font-family: ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif; }

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

        /* ── Shell ── */
        .adm-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg, var(--bg));
          position: relative;
        }
        /* Ambient glow in top-right corner — subtle brand presence */
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

        /* ── Sidebar ── */
        /* CRUIP-INSPIRED RESKIN (Aug 23, corrected same day): floating
           rounded card sidebar matching Mosaic Lite's visual language
           (rounded-2xl, shadow-xs, light surfaces) — done in VFRB's
           existing inline-style/scoped-CSS system, no Tailwind utility
           classes introduced. First pass kept a vibrant gradient header/
           topbar "because it looked better" — that wasn't actually the
           Cruip look and wasn't what was asked for, so it's been replaced
           with genuine light surfaces below; role color (teal/purple) now
           shows up as text/badge/ring accents, not a background fill. */
        .adm-sb {
          position: fixed;
          top:8px; left:8px; bottom:8px;
          z-index: 200;
          background: linear-gradient(180deg, #ffffff 0%, #f9fbfd 100%);
          border: 1px solid rgba(226,232,240,.7);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 24px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
          overflow: hidden;
          transition: width .22s cubic-bezier(.4,0,.2,1);
        }

        /* Sidebar header — light, Cruip-style. Role color lives in the
           portal-label text (see roleColor in JS), not the background. */
        .adm-sb-head {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 62px;
          position: relative;
          overflow: hidden;
          background: #fff;
          border-bottom: 1px solid var(--border);
        }

        /* ── Main area ── */
        .adm-main {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: transparent;
          position: relative;
          z-index: 1;
        }

        /* ── Topbar — genuine Cruip look: white, thin border-bottom, subtle
           shadow. Aug 23 correction — this was previously a vibrant
           gradient with a comment that literally contradicted "Cruip-
           style" in the same breath. Role color now reads through the
           portal label, the Manager badge, and the avatar ring only. ── */
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

        /* ── Content ── */
        .adm-content {
          flex: 1;
          width: 100%;
          min-width: 0;
          padding: 24px 24px 88px;
        }
        /* On very wide screens, cap content width for readability */
        @media (min-width: 1600px) {
          .adm-content {
            padding: 28px 32px 88px;
          }
        }

        /* ── Sidebar nav link ── */
        .adm-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          transition: background .13s, color .13s, transform .1s;
          position: relative;
          margin: 1px 0;
        }
        .adm-link:hover {
          background: linear-gradient(135deg, rgba(2,128,144,.07), rgba(2,195,154,.05));
          color: ${T};
          transform: translateX(2px);
        }
        .adm-link.active {
          background: linear-gradient(135deg, rgba(2,128,144,.14), rgba(2,195,154,.09));
          color: ${T};
          font-weight: 700;
          box-shadow: inset 0 0 0 1px rgba(2,128,144,.12);
        }
        .adm-link.active.mgr {
          background: linear-gradient(135deg, rgba(124,58,237,.10), rgba(139,92,246,.07));
          color: ${MG};
        }
        .adm-link.active::before {
          content: '';
          position: absolute;
          left:0; top:18%; bottom:18%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, ${T}, ${T2});
        }
        .adm-link.active.mgr::before {
          background: linear-gradient(180deg, var(--purple), #a78bfa);
        }

        /* Section labels — Cruip-style uppercase group headers */
        .adm-sec {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: var(--text-faint);
          padding: 14px 12px 6px;
          margin: 0;
        }

        /* ── Mobile bottom taskbar ── */
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

        /* ── More drawer ── */
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
        .adm-drawer-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 12px;
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
          font-family: ui-sans-serif,system-ui,-apple-system,sans-serif;
        }
        .adm-drawer-item:hover, .adm-drawer-item:active {
          background: rgba(2,128,144,.06);
        }
        .adm-drawer-item.active { color: ${T}; background: rgba(2,128,144,.08); }
        .adm-drawer-item.mgr-item { color: ${MG}; }
        .adm-drawer-item.mgr-item:hover { background: rgba(124,58,237,.06); }

        /* ── Responsive ── */
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
        /* Tablet: slightly tighter sidebar */
        @media (min-width: 768px) and (max-width: 1023px) {
          .adm-content { padding: 18px 18px 28px; }
        }
        /* iPad Pro: comfortable padding */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .adm-content { padding: 20px 20px 40px; }
        }
        /* 4K / ultra-wide: more breathing room + centered content */
        @media (min-width: 2560px) {
          .adm-content {
            padding: 36px 40px 100px;
            max-width: 1800px;
            margin-left: auto;
            margin-right: auto;
          }
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: .01ms !important; }
        }
      `}</style>

      <div className="adm-shell">

        {/* ─── DESKTOP SIDEBAR ────────────────────────────────────────────── */}
        <aside className="adm-sb" style={{ width:SW }}>

          {/* Light header — logo + brand text, role color as a small accent only.
              Clickable (Aug 23 2026): returns to Dashboard from any admin page. */}
          <div className="adm-sb-head"
            onClick={() => navigate('/admin/dashboard')}
            style={{ padding: collapsed ? '14px 10px' : '14px 16px', cursor:'pointer' }}>
            <img src={companyLogo} alt="VFRB"
              style={{ width:34, height:34, borderRadius:9, objectFit:'cover',
                border:'2px solid var(--border)', flexShrink:0, position:'relative', zIndex:1 }}/>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                <p style={{ fontSize:11, fontWeight:800, color:'var(--ink)',
                  letterSpacing:'.05em', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>
                  VFRB ENTERPRISE
                </p>
                <p style={{ fontSize:9, color:roleColor, fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'.07em', margin:'2px 0 0' }}>
                  {isManager ? '● Manager Portal' : '● Staff Portal'}
                </p>
              </div>
            )}
          </div>

          {/* Nav scroll area */}
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden',
            padding: collapsed ? '8px 4px' : '8px 10px',
            scrollbarWidth:'thin', scrollbarColor:'var(--border) transparent' }}>

            {!collapsed && <p className="adm-sec">Operational</p>}
            {STAFF_NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `adm-link${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
                style={collapsed ? { justifyContent:'center', padding:'10px 0' } : {}}>
                <span style={{ fontSize:16, flexShrink:0, width:20, textAlign:'center' }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}

            {isManager && (
              <>
                {!collapsed && (
                  <>
                    <div style={{ height:1, background:'var(--bg-surface)', margin:'8px 0' }}/>
                    <p className="adm-sec" style={{ color:'#a78bfa' }}>Manager</p>
                  </>
                )}
                {MANAGER_EXTRA.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `adm-link${isActive ? ' active mgr' : ''}`}
                    title={collapsed ? item.label : undefined}
                    style={collapsed ? { justifyContent:'center', padding:'10px 0' } : {}}>
                    <span style={{ fontSize:16, flexShrink:0, width:20, textAlign:'center' }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </>
            )}

            {!isManager && !collapsed && (
              <div style={{ margin:'10px 0 0', padding:'10px 12px', borderRadius:10,
                background:'var(--bg)', border:'1px dashed var(--border)' }}>
                <p style={{ fontSize:10, color:'var(--text-faint)', fontWeight:600, lineHeight:1.4, margin:0 }}>
                  🔒 Reports, Invoice, Suppliers & Users — Manager only
                </p>
              </div>
            )}
          </div>

          {/* Collapse toggle — Cruip-style minimal circular chip */}
          <button onClick={toggle}
            style={{ margin: collapsed ? '6px auto' : '6px 6px 6px auto',
              padding: collapsed ? '9px' : '7px 12px', borderRadius: 99,
              border:'1px solid var(--border)', background:'var(--bg)',
              cursor:'pointer', color:'var(--text-subtle)', fontSize:11, fontWeight:600,
              display:'flex', alignItems:'center', justifyContent:'center',
              gap:5, fontFamily:'inherit', flexShrink:0, transition:'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--teal-50)'}
            onMouseLeave={e => e.currentTarget.style.background='var(--bg)'}>
            {collapsed ? '▶' : '◀ Collapse'}
          </button>

          {/* Identity now lives only in the topbar profile dropdown — removed here to avoid duplication */}
        </aside>

        {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
        <main className="adm-main"
          style={{ marginLeft: SW + 16, transition:'margin-left .22s cubic-bezier(.4,0,.2,1)' }}>
          {/* +16 accounts for the sidebar's new 8px floating inset (left:8px)
              plus an 8px breathing gap before content — sidebar itself still
              occupies exactly SW px of width, unchanged. */}

          {/* ── TOPBAR — light, Cruip-style: white bg, thin border, dark text ── */}
          <div className="adm-topbar">

            {/* Mobile: logo + portal label — click to go back to Dashboard */}
            <img src={companyLogo} alt="VFRB" className="adm-mob-only" onClick={() => navigate('/admin/dashboard')}
              style={{ width:30, height:30, borderRadius:8, objectFit:'cover', cursor:'pointer',
                border:'1.5px solid var(--border)', flexShrink:0 }}/>
            <div className="adm-mob-only" onClick={() => navigate('/admin/dashboard')} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
              <p style={{ fontSize:11, fontWeight:800, color:'var(--ink)',
                letterSpacing:'.04em', margin:0, lineHeight:1.2,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                VFRB Enterprise
              </p>
              <p style={{ fontSize:9, color:roleColor, fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.07em', margin:0 }}>
                {isManager ? 'Manager Portal' : 'Staff Portal'}
              </p>
            </div>

            {/* Desktop: date */}
            <span className="adm-desk-only" style={{ color:'var(--text-faint)', fontSize:12, flexShrink:0 }}>
              {new Date().toLocaleDateString('en-PH',{
                weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </span>
            <div style={{ flex:1 }}/>

            {/* Notification bell */}
            <div ref={bellRef} style={{ position:'relative' }}>
              <motion.button
                whileHover={{ scale:1.07 }}
                whileTap={{ scale:.93 }}
                onClick={openBell}
                style={{
                  width:36, height:36, borderRadius:10, border:'none',
                  background: bellOpen ? 'var(--teal-50, rgba(2,128,144,.10))' : 'var(--bg)',
                  cursor:'pointer', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:17, position:'relative',
                  transition:'background .15s',
                  animation: unread > 0 ? 'bellShake .5s ease' : 'none',
                }}>
                🔔
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

              {/* Notification dropdown */}
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
                          <p style={{ fontSize:32, margin:'0 0 8px', opacity:.3 }}>🔔</p>
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

            {/* Manager badge — desktop */}
            {isManager && (
              <span className="adm-desk-only"
                style={{ fontSize:10, padding:'4px 10px', borderRadius:99,
                  fontWeight:700, background:'rgba(124,58,237,.08)',
                  color:'var(--purple)', border:'1px solid rgba(124,58,237,.2)' }}>
                👑 Manager
              </span>
            )}

            {/* Profile — click for Sign Out (Cruip-style dropdown) */}
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
                      <p style={{ fontSize:10, color:'var(--text-faint)', textTransform:'capitalize', margin:0 }}>{role}</p>
                    </div>
                    <button onClick={logout}
                      style={{ width:'100%', padding:'10px 14px', border:'none', background:'transparent',
                        cursor:'pointer', color:'var(--danger)', fontSize:12, fontWeight:600,
                        textAlign:'left', fontFamily:'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--danger-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      ← Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Page content */}
          <div className="adm-content">
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
                style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.32)',
                  zIndex:280, backdropFilter:'blur(2px)' }}/>
              <motion.div
                className="adm-more-drawer"
                initial={{ y:80, opacity:0 }}
                animate={{ y:0, opacity:1 }}
                exit={{ y:80, opacity:0 }}
                transition={{ type:'spring', stiffness:340, damping:30 }}>

                <p style={{ fontSize:11, fontWeight:800, color:'var(--text-faint)',
                  textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 6px 4px' }}>
                  All Pages
                </p>

                {/* Staff nav items not in bottom bar */}
                {STAFF_NAV.filter(i =>
                  !['/admin','/admin/orders','/admin/inventory',
                    '/admin/messages','/admin/production'].includes(i.to)
                ).map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) =>
                      `adm-drawer-item${isActive ? ' active' : ''}`}>
                    <span style={{ fontSize:20, width:28, textAlign:'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                {/* Manager section */}
                {isManager && (
                  <>
                    <div style={{ height:1, background:'var(--bg-surface)', margin:'8px 0' }}/>
                    <p style={{ fontSize:11, fontWeight:800, color:'#a78bfa',
                      textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 6px 4px' }}>
                      Manager
                    </p>
                    {MANAGER_EXTRA.map(item => (
                      <NavLink key={item.to} to={item.to}
                        className={({ isActive }) =>
                          `adm-drawer-item mgr-item${isActive ? ' active' : ''}`}>
                        <span style={{ fontSize:20, width:28, textAlign:'center' }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </>
                )}

                <div style={{ height:1, background:'var(--bg-surface)', margin:'8px 0' }}/>
                <button className="adm-drawer-item" onClick={logout}
                  style={{ color:'var(--danger)' }}>
                  <span style={{ fontSize:20, width:28, textAlign:'center' }}>←</span>
                  <span>Sign Out</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── MOBILE BOTTOM TASKBAR ──────────────────────────────────────── */}
        <nav className="adm-bnav" aria-label="Mobile navigation">
          {MOB_NAV.map(item => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={`adm-bnav-btn${active ? ' mob-active' : ''}`}>
                <span className="adm-bnav-icon"
                  style={{ filter: active ? 'none' : 'grayscale(.4) opacity(.65)' }}>
                  {item.icon}
                </span>
                <span className="adm-bnav-label">{item.label}</span>
              </NavLink>
            );
          })}

          {/* More button */}
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