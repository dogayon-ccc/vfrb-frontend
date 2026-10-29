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
import NavBadge from '../components/ui/NavBadge';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import AlertBanner from '../components/ui/AlertBanner';
import ThreadPull from '../components/ui/ThreadPull';
import useDialogFocus from '../hooks/useDialogFocus';
import { prefetchPath } from '../utils/adminResources';
import { readAdminUser, canOpen, roleLabel as roleLabelFor, isStation } from '../utils/jobAccess';
import AccessDenied from '../components/AccessDenied';

// Start loading a page's data the moment the pointer, keyboard or finger shows intent on its link.
const intent = (to) => ({ onPointerEnter: () => prefetchPath(to), onFocus: () => prefetchPath(to), onTouchStart: () => prefetchPath(to) });
import '../styles/admin.css';
import logo from '../assets/company-logo.jpg';
import { LogOut, Bell, MoreHorizontal, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { navFor, searchNav } from './adminNav';

const RAIL_KEY = 'vfrb_admin_rail';
// Stored choice wins; otherwise tablets start icon-only so content keeps its width.
const initialCollapsed = () => {
  try { const v = localStorage.getItem(RAIL_KEY); if (v) return v === 'collapsed'; } catch { /* storage blocked */ }
  return typeof window !== 'undefined' && window.innerWidth < 1100;
};
const isTypingTarget = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const NOTIF_LABELS = { order: 'New order', message: 'New message', payment: 'Payment', stock: 'Stock alert', delivery: 'Delivery', feedback: 'Feedback', rfq: 'Purchase request' };
const notifTitle = (n) => n.title || NOTIF_LABELS[n.type] || (n.type ? String(n.type).replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Notification');

const T  = 'var(--teal)';
const T2 = 'var(--teal-2)';
const MG = 'var(--purple)';

function DrawerTile({ item, badge = 0 }) {
  return (
    <NavLink to={item.to} {...intent(item.to)} className={({ isActive }) => `adm-drawer-tile${isActive ? ' active' : ''}`} aria-label={badge ? `${item.label}, ${badge} new` : undefined}>
      <IconBox icon={item.icon} size={18} width={40} style={{ height:40, borderRadius:'var(--radius)', background:'var(--teal-50)', color:'var(--teal)' }}>
        <NavBadge n={badge} corner/>
      </IconBox>
      <span>{item.label}</span>
    </NavLink>
  );
}

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
          {notifTitle(n)}
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
  const [role,      setRole]      = useState(() => readAdminUser().role || 'manager');
  const [name,      setName]      = useState('');
  const [avatar,    setAvatar]    = useState(null);
  // Desktop rail: always visible, full or icon-only.
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [tip, setTip] = useState(null);
  const [moreOpen,  setMoreOpen]  = useState(false);
  const [jumpQ,     setJumpQ]     = useState('');
  const [jumpOpen,  setJumpOpen]  = useState(false);
  const [jumpIdx,   setJumpIdx]   = useState(0);
  const jumpRef = useRef(null);
  const [userId] = useState(() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').user_id; } catch { return null; } });
  useAppearance(userId);

  const owner     = role === 'owner'; // read-only: only the pages OwnerReadOnly lets it GET
  const station   = isStation({ role });
  const isManager  = !owner && !station;
  const me         = { ...readAdminUser(), role };
  const roleLabel  = roleLabelFor(me);
  const allowed    = (i) => canOpen(i.to, me);
  const nav        = navFor(allowed);
  // Owner has no /admin/messages access, so no badge poll.
  const msgUnread  = useUnreadMessages('/api/admin/messages/unread-count', !owner);
  const badgeFor   = (to) => (to === '/admin/messages' ? msgUnread : 0);

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
    if (owner) return; // the API refuses notifications to the owner
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
    setRole(u.role || 'manager');
    setName(u.name || 'Administrator');
    setAvatar(u.avatar || null);
  }, [location.pathname]);

  // A new profile photo from Settings shows in the header at once.
  useEffect(() => {
    const onUser = (e) => setAvatar(e.detail?.avatar || null);
    window.addEventListener(USER_CHANGE_EVENT, onUser);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUser);
  }, []);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // The rail scrolls to the active page on load and on navigation; only the rail moves, never the page.
  const navRef = useRef(null);
  useEffect(() => {
    const nav = navRef.current, link = nav?.querySelector('.adm-link.active');
    if (!link) return;
    const top = link.offsetTop - nav.offsetTop, bottom = top + link.offsetHeight;
    if (top < nav.scrollTop || bottom > nav.scrollTop + nav.clientHeight) nav.scrollTop = Math.max(0, top - (nav.clientHeight - link.offsetHeight) / 2);
  }, [location.pathname, collapsed]);

  const moreBtnRef = useRef(null);
  const moreRef = useRef(null);
  // Explicit return: Safari does not focus a tapped button, so the hook's saved element can be <body>.
  const closeMore = () => { setMoreOpen(false); moreBtnRef.current?.focus(); };
  useDialogFocus(moreRef, { active: moreOpen, onClose: closeMore, initial: '.adm-drawer-tile.active' });

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

  const toggleRail = () => setCollapsed(c => {
    try { localStorage.setItem(RAIL_KEY, c ? 'expanded' : 'collapsed'); } catch { /* storage blocked */ }
    return !c;
  });
  useEffect(() => { if (!collapsed) setTip(null); }, [collapsed]);
  // Tooltip lives outside the rail so its scroll box cannot clip it.
  const showTip = (label) => (e) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const tipProps = (label) => ({ onPointerEnter: showTip(label), onFocus: showTip(label), onPointerLeave: () => setTip(null), onBlur: () => setTip(null) });

  // "/" focuses the command bar unless the user is already typing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (!jumpRef.current || jumpRef.current.offsetParent === null) return;
      e.preventDefault();
      jumpRef.current.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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
  const titleNav  = [...nav.items].sort((a, b) => b.to.length - a.to.length);
  const jumpHits  = searchNav(nav.items, jumpQ);
  const jumpGo    = (to) => { setJumpQ(''); setJumpOpen(false); setJumpIdx(0); jumpRef.current?.blur(); navigate(to); };
  const roleChip  = owner || station ? roleLabel : 'Administrator';
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
          --adm-rail: 252px;
          --rail-line: color-mix(in srgb,var(--color-on-rail) 9%,transparent);
          --rail-glow: color-mix(in srgb,var(--teal-2) 55%,transparent);
        }
        .adm-shell.rail-min { --adm-rail: 76px; }

        .adm-sb {
          position: sticky; top: 0; align-self: flex-start;
          height: 100vh; height: 100dvh;
          width: var(--adm-rail); flex-shrink: 0;
          z-index: 300;
          background: linear-gradient(180deg, var(--color-rail) 0%, var(--color-rail-deep) 100%);
          border-right: 1px solid var(--rail-line);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: width .22s cubic-bezier(.2,.8,.2,1);
        }
        .adm-top-logo { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; border: 1.5px solid var(--border); flex-shrink: 0; }

        .adm-sb-head {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          height: var(--topbar-h);
          padding: 0 18px;
          border-bottom: 1px solid var(--rail-line);
        }
        .adm-sb-logo { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0;
          border: 1.5px solid color-mix(in srgb,var(--color-on-rail) 18%,transparent); }
        .adm-sb-brand { min-width: 0; flex: 1; }
        .adm-sb-brand b, .adm-sb-brand small { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-sb-brand b { font-size: 14px; font-weight: 800; letter-spacing: .01em; color: var(--color-on-rail); }
        .adm-sb-brand small { font-size: 12px; font-weight: 600; color: var(--teal-2); margin-top: 2px; }
        .rail-min .adm-sb-brand, .rail-min .adm-link-label, .rail-min .adm-sb-user-txt, .rail-min .adm-rail-toggle-label {
          position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
        }

        .adm-tip {
          position: fixed; z-index: 500; transform: translateY(-50%); pointer-events: none;
          padding: 6px 10px; border-radius: 8px; white-space: nowrap;
          background: var(--color-rail-deep); color: var(--color-on-rail); font: 700 13px var(--font-sans);
          box-shadow: 0 6px 18px rgb(7 34 38 / .3); border: 1px solid var(--rail-line);
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
          border-radius: 10px;
          text-decoration: none;
          font-size: 14.5px;
          font-weight: 650;
          color: color-mix(in srgb,var(--color-on-rail) 74%,transparent);
          white-space: nowrap;
          transition: background .15s, color .15s, box-shadow .15s;
          position: relative;
          margin: 2px 0;
        }
        .adm-link-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; }
        .adm-nav-group {
          margin: 18px 12px 6px;
          font-size: 11.5px;
          font-weight: 800;
          color: color-mix(in srgb,var(--color-on-rail) 48%,transparent);
          white-space: nowrap;
        }
        .rail-min .adm-nav-group { font-size: 0; height: 1px; margin: 12px 14px 8px; background: var(--rail-line); }
        @media (pointer: coarse) { .adm-link { min-height: 44px; } .adm-bell { width: 44px !important; height: 44px !important; } .adm-profile-btn { min-height: 44px !important; } }
        .adm-link:hover {
          background: color-mix(in srgb,var(--color-on-rail) 7%,transparent);
          color: var(--color-on-rail);
        }
        .adm-link.active {
          background: linear-gradient(90deg, color-mix(in srgb,var(--teal-2) 22%,transparent), color-mix(in srgb,var(--teal-2) 6%,transparent));
          box-shadow: inset 0 0 0 1px color-mix(in srgb,var(--teal-2) 30%,transparent), 0 8px 22px -12px var(--rail-glow);
          color: var(--color-on-rail);
          font-weight: 800;
        }
        .adm-link.active::before {
          content: '';
          position: absolute;
          left:0; top:22%; bottom:22%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--teal-2);
          box-shadow: 0 0 10px 1px var(--rail-glow);
        }
        .adm-link.active .nav-ico-wrap { color: var(--teal-2); filter: drop-shadow(0 0 6px var(--rail-glow)); }
        .rail-min .adm-link { justify-content: center; padding: 0; gap: 0; }

        .adm-rail-toggle {
          display: flex; align-items: center; gap: 12px; width: calc(100% - 24px); min-height: 44px; margin: 0 12px 6px; padding: 0 12px;
          border: 0; border-radius: 10px; background: transparent; cursor: pointer;
          color: color-mix(in srgb,var(--color-on-rail) 64%,transparent); font: 650 14px var(--font-sans); white-space: nowrap;
        }
        .adm-rail-toggle:hover { background: color-mix(in srgb,var(--color-on-rail) 7%,transparent); color: var(--color-on-rail); }
        .adm-rail-toggle:focus-visible { outline: 2px solid var(--teal-2); outline-offset: 2px; }
        .rail-min .adm-rail-toggle { justify-content: center; padding: 0; gap: 0; }

        .adm-nav-scroll::-webkit-scrollbar { width: 6px; }
        .adm-nav-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        .adm-nav-scroll::-webkit-scrollbar-track { background: transparent; }
        .adm-nav-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb,var(--color-on-rail) 22%,transparent); border-radius: 6px; }
        .adm-nav-scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb,var(--color-on-rail) 38%,transparent); }
        @supports not selector(::-webkit-scrollbar) { .adm-nav-scroll { scrollbar-width: thin; scrollbar-color: color-mix(in srgb,var(--color-on-rail) 30%,transparent) transparent; } }

        .adm-link:focus-visible { outline: 2px solid var(--teal-2); outline-offset: 2px; }

        .adm-sb-user {
          display: flex; align-items: center; gap: 12px; margin: 0 12px 12px; padding: 10px;
          border-radius: 12px; background: transparent;
        }
        .adm-sb-user-txt { min-width: 0; }
        .rail-min .adm-sb-user { justify-content: center; padding: 8px 0; }
        .adm-sb-user-av {
          width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; overflow: hidden;
          display: grid; place-items: center; font-size: 14px; font-weight: 800; color: #fff;
        }
        .adm-sb-user b { display: block; font-size: 15px; font-weight: 800; color: var(--color-on-rail); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-sb-user small { display: block; font-size: 13px; color: color-mix(in srgb,var(--color-on-rail) 70%,transparent); overflow-wrap: anywhere; }
        .adm-jump { position: relative; width: min(360px, 30vw); flex-shrink: 0; }
        .adm-jump > svg { position: absolute; left: 14px; top: 15px; color: var(--text-subtle); pointer-events: none; }
        .adm-jump kbd {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;
          min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 6px;
          border: 1px solid var(--border-strong); background: var(--bg); color: var(--text-subtle);
          font: 700 13px ui-monospace, monospace; transition: opacity .12s;
        }
        .adm-jump input:focus ~ kbd, .adm-jump input:not(:placeholder-shown) ~ kbd { opacity: 0; }
        .adm-jump-list button.on { background: var(--teal-50); color: var(--teal-dark); }
        .adm-role-chip {
          display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 12px; flex-shrink: 0;
          border-radius: var(--radius-pill); font: 800 12.5px var(--font-sans); letter-spacing: .02em; white-space: nowrap;
          background: var(--color-manager-tint); color: var(--color-manager-ink);
          border: 1px solid color-mix(in srgb,var(--color-manager) 25%,transparent);
        }
        .adm-role-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .adm-role-chip.owner { background: var(--color-neutral-tint); color: var(--color-neutral-ink); border-color: var(--color-neutral-line); }
        .adm-jump input {
          width: 100%; height: 48px; padding: 0 44px 0 42px; border-radius: 14px;
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
        .adm-jump-list small { margin-left: auto; font: 600 12px var(--font-sans); color: var(--text-subtle); }
        @keyframes jumpIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } }
        .adm-crumb { min-width: 0; }
        .adm-crumb-t { margin: 0; font-size: 13px; font-weight: 700; color: var(--text-subtle); }
        .adm-crumb-t b { color: var(--teal-dark); font-weight: 800; }
        .adm-crumb-d { margin: 0; font-size: 15px; color: var(--text-muted); }

        .adm-sec {
          font-size: 12px;
          font-weight: 800;
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
          max-width: 88px;
          border-radius: 14px;
          transition: transform .12s;
          position: relative;
        }
        .adm-bnav-btn:active { transform: scale(.9); }
        .adm-bnav-icon  { font-size: 23px; line-height:1; transition: transform .15s; }
        .adm-bnav-label { font-size: 12px; font-weight: 700; color: var(--text-faint); letter-spacing:-.01em; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .adm-bnav-btn.mob-active {
          background: var(--teal-50);
        }
        .adm-bnav-btn.mob-active .adm-bnav-icon  { transform: scale(1.14); }
        .adm-bnav-btn.mob-active .adm-bnav-label { color: ${T}; }

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
          color: var(--ink); font-size: 14px; font-weight: 800; line-height: 1.25; text-align: center;
          border: 1px solid var(--border); background: var(--bg-card); min-height: 88px;
          font-family: var(--font-sans); overflow-wrap: anywhere; transition: border-color .15s, background .15s;
        }
        .adm-drawer-tile:hover { border-color: var(--border-strong); }
        .adm-drawer-tile:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
        .adm-drawer-tile.active { border-color: ${T}; background: var(--teal-50); }
        @media (prefers-reduced-motion: reduce) { .adm-drawer-tile { transition: none; } }
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
        @media (min-width: 768px) and (max-width: 1099px) { .adm-profile-name, .adm-crumb-d { display: none; } }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border-hover); border-radius: 2px; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: .01ms !important; }
        }
      `}</style>

      <div className={`adm-shell${collapsed ? ' rail-min' : ''}`}>
        <a href="#adm-main" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('adm-main')?.focus(); }}>Skip to content</a>

        <aside id="adm-sidebar" className="adm-sb" aria-label="Main menu">

          <div className="adm-sb-head">
            <img src={logo} alt="VFRB" className="adm-sb-logo"/>
            <div className="adm-sb-brand">
              <b>VFRB Enterprise</b>
              <small>Custom Uniforms</small>
            </div>
          </div>

          <nav ref={navRef} className="adm-nav-scroll" aria-label="Admin pages" style={{ flex:1, overflowY:'auto', overflowX:'hidden',
            padding:'8px 12px 16px' }} onScroll={() => setTip(null)}>

            {nav.groups.map(({ name: g, items }, gi) => (
                <div key={g} role="group" aria-label={g}>
                  <p className="adm-nav-group" aria-hidden="true" style={gi === 0 ? { marginTop:4 } : undefined}>{g}</p>
                  {items.map(item => {
                    const badge = badgeFor(item.to);
                    return (
                      <NavLink key={item.to} to={item.to} end={item.end} {...intent(item.to)} {...tipProps(item.label)}
                        aria-label={badge ? `${item.label}, ${badge} new` : undefined}
                        className={({ isActive }) => `adm-link${isActive || (item.to === '/admin' && location.pathname === '/admin/dashboard') ? ' active' : ''}`}>
                        <span className="nav-ico-wrap">
                          <IconBox icon={item.icon} size={18} width={20}/>
                          {collapsed && <NavBadge n={badge} corner/>}
                        </span>
                        <span className="adm-link-label">{item.label}</span>
                        {!collapsed && <NavBadge n={badge}/>}
                      </NavLink>
                    );
                  })}
                </div>
            ))}

          </nav>

          <button type="button" className="adm-rail-toggle" onClick={toggleRail} {...tipProps('Expand menu')}
            aria-expanded={!collapsed} aria-controls="adm-sidebar" aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}>
            {collapsed ? <PanelLeftOpen size={20} strokeWidth={2} aria-hidden="true"/> : <PanelLeftClose size={20} strokeWidth={2} aria-hidden="true"/>}
            <span className="adm-rail-toggle-label" aria-hidden="true">Collapse</span>
          </button>

          <div className="adm-sb-user" {...tipProps(`${name} · ${roleLabel}`)}>
            <div className="adm-sb-user-av" style={{ background: isManager ? 'var(--purple)' : 'var(--teal)' }}>
              {avatar ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
            </div>
            <div className="adm-sb-user-txt">
              <b>{name}</b>
              <small>{roleLabel}</small>
            </div>
          </div>

        </aside>
        {collapsed && tip && <div className="adm-tip adm-desk-only" role="presentation" style={{ top: tip.top, left: tip.left }}>{tip.label}</div>}

        <main id="adm-main" tabIndex={-1} className="adm-main">

          <div className="adm-topbar">

            <img src={logo} alt="VFRB" className="adm-top-logo adm-mob-only"/>
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
              <p className="adm-crumb-t">{owner ? 'Owner' : 'Administrator'} / <b>{pageTitle}</b></p>
              <p className="adm-crumb-d">
                {new Date().toLocaleDateString('en-PH',{
                  weekday:'long', month:'long', day:'numeric', year:'numeric' })}
              </p>
            </div>
            <div style={{ flex:1 }}/>

            <div className="adm-jump adm-desk-only">
              <Search size={18} strokeWidth={2} aria-hidden="true"/>
              <input ref={jumpRef} type="search" value={jumpQ} placeholder="Jump to a page…" aria-label="Jump to a page (press / to focus)"
                role="combobox" aria-expanded={jumpOpen && jumpHits.length > 0} aria-controls="adm-jump-list" aria-autocomplete="list"
                aria-activedescendant={jumpOpen && jumpHits[jumpIdx] ? `adm-jump-${jumpIdx}` : undefined}
                onChange={e => { setJumpQ(e.target.value); setJumpOpen(true); setJumpIdx(0); }}
                onFocus={() => setJumpOpen(true)} onBlur={() => setTimeout(() => setJumpOpen(false), 120)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown' && jumpHits.length) { e.preventDefault(); setJumpIdx(i => (i + 1) % jumpHits.length); }
                  if (e.key === 'ArrowUp' && jumpHits.length) { e.preventDefault(); setJumpIdx(i => (i - 1 + jumpHits.length) % jumpHits.length); }
                  if (e.key === 'Enter' && jumpHits[jumpIdx]) jumpGo(jumpHits[jumpIdx].to);
                  if (e.key === 'Escape') { setJumpQ(''); setJumpOpen(false); e.currentTarget.blur(); }
                }}/>
              <kbd aria-hidden="true">/</kbd>
              {jumpOpen && jumpHits.length > 0 && (
                <ul className="adm-jump-list" id="adm-jump-list" role="listbox" aria-label="Pages">
                  {jumpHits.map((i, n) => (
                    <li key={i.to} id={`adm-jump-${n}`} role="option" aria-selected={n === jumpIdx}>
                      <button type="button" tabIndex={-1} className={n === jumpIdx ? 'on' : undefined}
                        onMouseEnter={() => setJumpIdx(n)} onMouseDown={e => { e.preventDefault(); jumpGo(i.to); }}>
                        <i.icon size={18} strokeWidth={1.9} aria-hidden="true"/>{i.label}<small>{i.group}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <span className={`adm-role-chip adm-desk-only${owner ? ' owner' : ''}`}>{roleChip}</span>
            {owner && <span className="adm-role-chip owner adm-mob-only" aria-label="Owner, view only">Owner</span>}
            {station && <span className="adm-role-chip adm-mob-only" aria-label={roleLabel}>{roleLabel.split(' · ')[1]}</span>}

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
                      {unread > 9 ? '9+' : unread}
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
                                color:'var(--text-faint)',
                                background:'var(--bg-surface)' }}>Today</div>
                              {notifToday.map(n => (
                                <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead}/>
                              ))}
                            </>
                          )}
                          {notifEarlier.length > 0 && (
                            <>
                              <div style={{ padding:'8px 16px 4px', fontSize:12, fontWeight:800,
                                color:'var(--text-faint)',
                                background:'var(--bg-surface)',
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
                <span className="adm-desk-only adm-profile-name"
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
              <div key={location.pathname} className="adm-page vfrb-page thread-page"><Suspense fallback={<AppPageSkeleton/>}>{!canOpen(location.pathname, me) ? <AccessDenied what="This page"/> : <Outlet/>}</Suspense><ThreadPull/></div>
            </PageErrorBoundary>
          </div>
        </main>

        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1, transition:{ duration:.2, ease:'easeOut' } }}
                exit={{ opacity:0, pointerEvents:'none', transition:{ duration:.15, ease:'easeIn' } }}
                onClick={closeMore}
                style={{ position:'fixed', inset:0, background:'color-mix(in srgb,var(--color-rail-deep) 40%,transparent)',
                  zIndex:280, backdropFilter:'blur(2px)' }}/>
              <motion.div
                className="adm-more-drawer" ref={moreRef} id="adm-more" role="dialog" aria-modal="true" aria-label="More pages"
                initial={{ y:80, opacity:0 }}
                animate={{ y:0, opacity:1, transition:{ duration:.24, ease:[.22, 1, .36, 1] } }}
                exit={{ y:80, opacity:0, pointerEvents:'none', transition:{ duration:.16, ease:'easeIn' } }}>

                {nav.groups.map(({ name: g, items: all }) => {
                  const items = all.filter(i => !i.short);
                  if (!items.length) return null;
                  return (
                    <div key={g} role="group" aria-label={g}>
                      <p className="adm-drawer-sec">{g}</p>
                      <div className="adm-drawer-grid">
                        {items.map(item => <DrawerTile key={item.to} item={item} badge={badgeFor(item.to)}/>)}
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
          {nav.bar.map(item => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.end} {...intent(item.to)}
                className={`adm-bnav-btn${active ? ' mob-active' : ''}`}>
                <span className="adm-bnav-icon"
                  style={{ filter: active ? 'none' : 'grayscale(.4) opacity(.65)' }}>
                  <item.icon size={22} strokeWidth={2}/>
                </span>
                <span className="adm-bnav-label">{item.short}</span>
              </NavLink>
            );
          })}

          <button className="adm-bnav-btn" ref={moreBtnRef}
            onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-controls="adm-more" aria-haspopup="dialog"
            style={{ border:'none', cursor:'pointer', background:'transparent',
              fontFamily:'inherit' }}>
            <span className="adm-bnav-icon"
              style={{ color: moreOpen ? T : undefined,
                filter: moreOpen ? 'none' : 'grayscale(.4) opacity(.65)' }}>
              <span className="nav-ico-wrap"><MoreHorizontal size={22} strokeWidth={2} aria-hidden="true"/><NavBadge n={msgUnread} corner/></span>
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