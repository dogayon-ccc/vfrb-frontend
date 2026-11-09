import { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import axios from 'axios';
import { enqueue, flushQueue, queueSize } from '../utils/offlineQueue';
import { signOut, USER_CHANGE_EVENT } from '../utils/session';
import PageErrorBoundary from '../components/PageErrorBoundary';
import { useAppearance } from '../hooks/useAppearance';
import PageLoader from '../components/ui/PageLoader';
import IconBox from '../components/ui/IconBox';
import NavBadge from '../components/ui/NavBadge';
import { MESSAGES_READ_EVENT } from '../hooks/useUnreadMessages';
import AlertBanner from '../components/ui/AlertBanner';
import ThreadPull from '../components/ui/ThreadPull';
import useDialogFocus from '../hooks/useDialogFocus';
import usePageTitle from '../hooks/usePageTitle';
import { prefetchPath } from '../utils/adminResources';
import { readAdminUser, canOpen, roleLabel as roleLabelFor, isStation } from '../utils/jobAccess';
import AccessDenied from '../components/AccessDenied';
import '../styles/admin.css';
import logo from '../assets/company-logo.jpg';
import { LogOut, Bell, Search, PanelLeftClose, PanelLeftOpen, Menu, X, Plus, ChevronRight } from 'lucide-react';
import { NAV, QUICK_ADD, navFor, navMatch, searchNav } from './adminNav';
import { useLivePoll } from '../components/admin/AdminUI';

// Hover, focus or touch on a link starts loading that page's chunk and data.
const intent = (to) => ({ onPointerEnter: () => prefetchPath(to), onFocus: () => prefetchPath(to), onTouchStart: () => prefetchPath(to) });

const RAIL_KEY = 'vfrb_admin_rail';
const MOBILE = '(max-width: 767px)';
// Stored choice wins; otherwise tablets start icon-only so content keeps its width.
const initialCollapsed = () => {
  try { const v = localStorage.getItem(RAIL_KEY); if (v) return v === 'collapsed'; } catch { /* storage blocked */ }
  return typeof window !== 'undefined' && window.innerWidth < 1100;
};
const isTypingTarget = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const NOTIF_LABELS = { order: 'New order', message: 'New message', payment: 'Payment', stock: 'Stock alert', delivery: 'Delivery', feedback: 'Feedback', rfq: 'Purchase request' };
const notifTitle = (n) => n.title || NOTIF_LABELS[n.type] || (n.type ? String(n.type).replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Notification');

function useMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE).matches);
  useEffect(() => {
    const m = window.matchMedia(MOBILE), on = () => setMobile(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return mobile;
}

// Closes a popover on an outside press or Escape.
function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
}

// Command list of the pages this user may open; "/" focuses the visible one.
function NavSearch({ id, items, onGo }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  const hits = q.trim() ? searchNav(items, q) : items;
  const go = (to) => { setQ(''); setOpen(false); setIdx(0); ref.current?.blur(); onGo(to); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (!ref.current || ref.current.offsetParent === null) return;
      e.preventDefault();
      ref.current.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const show = open && hits.length > 0;
  return (
    <div className="adm-jump">
      <Search size={18} strokeWidth={2} aria-hidden="true"/>
      <input ref={ref} type="search" value={q} placeholder="Search pages…" aria-label="Search pages (press / to focus)"
        role="combobox" aria-expanded={show} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={show && hits[idx] ? `${id}-${idx}` : undefined}
        onChange={e => { setQ(e.target.value); setOpen(true); setIdx(0); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setOpen(true); setIdx(i => (i + 1) % hits.length); }
          if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setIdx(i => (i - 1 + hits.length) % hits.length); }
          if (e.key === 'Enter' && show && hits[idx]) go(hits[idx].to);
          if (e.key === 'Escape') { e.stopPropagation(); setQ(''); setOpen(false); e.currentTarget.blur(); }
        }}/>
      <kbd aria-hidden="true">/</kbd>
      {show && (
        <ul className="adm-jump-list" id={`${id}-list`} role="listbox" aria-label="Pages">
          {hits.map((i, n) => (
            <li key={i.to} id={`${id}-${n}`} role="option" aria-selected={n === idx}>
              <button type="button" tabIndex={-1} className={n === idx ? 'on' : undefined}
                onMouseEnter={() => setIdx(n)} onMouseDown={e => { e.preventDefault(); go(i.to); }}>
                <i.icon size={18} strokeWidth={1.9} aria-hidden="true"/>{i.label}<small>{i.group}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotifRow({ n, onRead, onGo, earlier }) {
  const id      = n.notif_id ?? n.id;
  const isRead  = !!n.is_read;
  const sent    = n.date_sent ?? n.created_at;
  const timeStr = sent
    ? new Date(sent).toLocaleString('en-PH', earlier ? { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' } : { hour:'2-digit', minute:'2-digit' })
    : '';
  const read = () => { if (!isRead) onRead(id); };
  const body = (
    <>
      <span className="adm-notif-dot" aria-hidden="true"/>
      <div style={{ flex:1, minWidth:0 }}>
        <p className="adm-notif-t">{notifTitle(n)}</p>
        <p className="adm-notif-m">{n.message ?? n.body ?? ''}</p>
        {timeStr && <p className="adm-notif-time">{timeStr}</p>}
      </div>
    </>
  );

  return n.order_id
    ? <Link to={`/admin/orders/${n.order_id}`} className={`adm-notif-row${isRead ? '' : ' unread'}`} onClick={() => { read(); onGo(); }}>{body}</Link>
    : <div className={`adm-notif-row${isRead ? '' : ' unread'}`} onClick={read}>{body}</div>;
}

export default function AdminLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const path       = location.pathname;
  const mobile     = useMobile();
  const [role,      setRole]      = useState(() => readAdminUser().role || 'manager');
  const [name,      setName]      = useState('');
  const [avatar,    setAvatar]    = useState(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawer,    setDrawer]    = useState(false);
  const [spin,      setSpin]      = useState(false);
  const [tip,       setTip]       = useState(null);
  const [userId] = useState(() => { try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}').user_id; } catch { return null; } });
  useAppearance(userId);

  const owner      = role === 'owner'; // read-only: only the pages OwnerReadOnly lets it GET
  const station    = isStation({ role });
  const isManager  = !owner && !station;
  const mini       = collapsed && !mobile;
  const me         = { ...readAdminUser(), role };
  const roleLabel  = roleLabelFor(me);
  const allowed    = (i) => canOpen(i.to, me);
  const nav        = navFor(allowed);
  const quick      = owner ? [] : QUICK_ADD.filter(a => (isManager || a.station) && allowed(a));
  const roleChip   = owner ? 'Owner · read-only' : station ? `Station: ${roleLabel.split(' · ')[1] ?? 'unassigned'}` : 'Manager';
  // Nav badges ride the shared 30 s live poll; Owner has no messages access, so only stock is polled there.
  const canMsgs    = !owner && canOpen('/admin/messages', me);
  const canStock   = canOpen('/admin/inventory', me);
  const [msgUnread, setMsgUnread] = useState(0);
  const [lowStock,  setLowStock]  = useState(0);
  const fetchBadges = () => Promise.all([
    canMsgs && axios.get('/api/admin/messages/unread-count').then(r => { setMsgUnread(Number(r.data?.unread_count) || 0); return true; }).catch(() => false),
    canStock && axios.get('/api/admin/inventory', { params: { low_stock: 1, per_page: 1 } }).then(r => { setLowStock(Number(r.data?.total) || 0); return true; }).catch(() => false),
  ]);
  const badgeFor   = (to) => (to === '/admin/messages' ? msgUnread : to === '/admin/inventory' ? lowStock : 0);
  const badgeNote  = (to, n) => (to === '/admin/inventory' ? `${n} low on stock` : `${n} new`);

  const [notifs,    setNotifs]    = useState([]);
  const [unread,    setUnread]    = useState(0);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notifLoad, setNotifLoad] = useState(false);
  const bellRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef(null);
  const [pendingSync, setPendingSync] = useState(queueSize());

  useDismiss(bellRef, bellOpen, () => setBellOpen(false));
  useDismiss(profileRef, profileOpen, () => setProfileOpen(false));
  useDismiss(quickRef, quickOpen, () => setQuickOpen(false));

  const fetchCount = () =>
    axios.get('/api/admin/notifications/unread-count')
      .then(r => { setUnread(r.data?.unread_count ?? 0); return true; }).catch(() => false);

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
  }, []);
  useLivePoll(fetchCount, null, owner ? 0 : 30_000);
  const badgesRef = useRef(fetchBadges);
  badgesRef.current = fetchBadges;
  useEffect(() => {
    const on = () => badgesRef.current();
    on();
    window.addEventListener(MESSAGES_READ_EVENT, on);
    return () => window.removeEventListener(MESSAGES_READ_EVENT, on);
  }, []);
  useLivePoll(fetchBadges, null, canMsgs || canStock ? 30_000 : 0);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
    setRole(u.role || 'manager');
    setName(u.name || 'Administrator');
    setAvatar(u.avatar || null);
  }, [path]);

  // A new profile photo from Settings shows in the header at once.
  useEffect(() => {
    const onUser = (e) => setAvatar(e.detail?.avatar || null);
    window.addEventListener(USER_CHANGE_EVENT, onUser);
    return () => window.removeEventListener(USER_CHANGE_EVENT, onUser);
  }, []);

  useEffect(() => { setDrawer(false); setQuickOpen(false); }, [path]);
  useEffect(() => { if (!mobile) setDrawer(false); }, [mobile]);

  // The sidebar scrolls to the active page on load and on navigation; only the sidebar moves, never the page.
  const navRef = useRef(null);
  useEffect(() => {
    const box = navRef.current, link = box?.querySelector('[aria-current="page"]');
    if (!link) return;
    const top = link.offsetTop - box.offsetTop, bottom = top + link.offsetHeight;
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - (box.clientHeight - link.offsetHeight) / 2);
  }, [path, collapsed]);

  const sbRef = useRef(null);
  const menuBtnRef = useRef(null);
  // Explicit return: Safari does not focus a tapped button, so the hook's saved element can be <body>.
  const closeDrawer = () => { setDrawer(false); menuBtnRef.current?.focus(); };
  useDialogFocus(sbRef, { active: drawer, onClose: closeDrawer, initial: '[aria-current="page"]' });

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
  useEffect(() => { if (!mini) setTip(null); }, [mini]);
  // Tooltip lives outside the sidebar so its scroll box cannot clip it.
  const showTip = (label) => (e) => {
    if (!mini) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const tipProps = (label) => ({ onPointerEnter: showTip(label), onFocus: showTip(label), onPointerLeave: () => setTip(null), onBlur: () => setTip(null) });

  const logout = () => { signOut(); navigate('/login', { replace: true }); };
  const goHome = () => { setSpin(true); navigate('/admin'); };

  const todayKey      = new Date().toLocaleDateString('en-PH');
  const sentToday     = (n) => { const d = n.date_sent ?? n.created_at; return !!d && new Date(d).toLocaleDateString('en-PH') === todayKey; };
  const notifToday    = notifs.filter(sentToday);
  const notifEarlier  = notifs.filter(n => !sentToday(n));

  const initials = name ? name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : 'A';

  // Breadcrumb: Admin / group / page, plus "#id" or "Details" for a record under that page.
  const current = navMatch(path, NAV);
  const rest    = current ? path.slice(current.to === '/admin' ? path.length : current.to.length).split('/').filter(Boolean) : [];
  const crumbs  = [
    { label: 'Admin', to: '/admin' },
    ...(current ? [{ label: current.group }, { label: current.label, to: current.to, page: true }] : [{ label: 'Page' }]),
    ...(rest.length ? [{ label: /^\d+$/.test(rest[0]) ? `#${rest[0]}` : 'Details', page: true }] : []),
  ];
  // Tab title from the matched nav item; unknown paths leave it to AdminNotFound.
  usePageTitle(current ? (rest.length ? `${crumbs[crumbs.length - 1].label} · ${current.label}` : current.label) : null);

  const avatarEl = (cls) => (
    <span className={cls} style={{ background: isManager ? 'var(--purple)' : 'var(--teal)' }}>
      {avatar ? <img src={avatar} alt=""/> : initials}
    </span>
  );

  return (
    <MotionConfig reducedMotion="user">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow-x: hidden; font-family: var(--font-sans); }
        @keyframes sk { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes admSpin { to { transform: rotate(360deg); } }

        .adm-shell {
          --adm-navy: #1B2A4A; --adm-navy-deep: #131f38; --adm-kraft: #C9A27A; --adm-thread: #C4313B;
          --adm-mat: #DDE3DE; --adm-chalk: #F4F5F2; --adm-page: var(--adm-chalk);
          --adm-on: #fff; --adm-on-2: rgb(255 255 255 / .74); --adm-line: rgb(255 255 255 / .1); --adm-hover: rgb(255 255 255 / .08);
          --adm-rail: 252px;
          display: flex; min-height: 100vh; background: var(--adm-page); position: relative;
        }
        html[data-theme=dark] .adm-shell { --adm-page: var(--bg); --adm-mat: var(--border); }
        .adm-shell.rail-min { --adm-rail: 76px; }
        .adm-sb :focus-visible, .adm-bar :focus-visible { outline: 2px solid var(--adm-kraft); outline-offset: 2px; }
        .adm-shell :is(.adm-pop, .adm-jump-list, .adm-notif-panel) :focus-visible { outline: 2px solid var(--teal); outline-offset: 2px; }

        .adm-sb {
          position: sticky; top: 0; align-self: flex-start; z-index: 300;
          height: 100vh; height: 100dvh; width: var(--adm-rail); flex-shrink: 0;
          background: var(--adm-navy); border-right: 1px solid var(--adm-line);
          display: flex; flex-direction: column; overflow: hidden;
          transition: width .2s ease-out;
        }
        .adm-sb-head { flex-shrink: 0; display: flex; align-items: center; gap: 12px; height: var(--topbar-h); padding: 0 16px; border-bottom: 1px solid var(--adm-line); }
        .adm-sb-mark { flex-shrink: 0; width: 44px; height: 44px; display: grid; place-items: center; border: 0; border-radius: 12px; background: none; cursor: pointer; }
        .adm-sb-logo { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; border: 1.5px solid rgb(255 255 255 / .18); }
        .adm-sb-mark.spin .adm-sb-logo { animation: admSpin .7s ease-in-out; }
        .adm-sb-brand { min-width: 0; flex: 1; }
        .adm-sb-brand b, .adm-sb-brand small { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-sb-brand b { font: 400 18px/1.15 var(--font-display); color: var(--adm-on); }
        .adm-sb-brand small { font-size: 12px; font-weight: 600; color: var(--adm-kraft); margin-top: 2px; }

        .adm-nav-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px 12px 16px; }
        .adm-nav-scroll::-webkit-scrollbar { width: 6px; }
        .adm-nav-scroll::-webkit-scrollbar-thumb { background: rgb(255 255 255 / .22); border-radius: 6px; }
        .adm-nav-group { margin: 18px 12px 6px; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgb(255 255 255 / .5); white-space: nowrap; }
        .adm-nav-group.first { margin-top: 4px; }
        .adm-link {
          display: flex; align-items: center; gap: 12px; padding: 0 12px; min-height: 44px; margin: 2px 0;
          border-radius: 10px; text-decoration: none; position: relative; white-space: nowrap;
          font-size: 14.5px; font-weight: 600; color: var(--adm-on-2);
          transition: background .15s, color .15s;
        }
        .adm-link:hover { background: var(--adm-hover); color: var(--adm-on); }
        .adm-link[aria-current="page"] { background: rgb(255 255 255 / .1); color: var(--adm-on); font-weight: 700; }
        .adm-link[aria-current="page"]::before { content: ''; position: absolute; left: 0; top: 22%; bottom: 22%; width: 3px; border-radius: 0 3px 3px 0; background: var(--adm-kraft); }
        .adm-link[aria-current="page"] .nav-ico-wrap { color: var(--adm-kraft); }
        .adm-link-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; }

        .adm-rail-toggle {
          display: flex; align-items: center; gap: 12px; width: calc(100% - 24px); min-height: 44px; margin: 0 12px 6px; padding: 0 12px;
          border: 0; border-radius: 10px; background: transparent; cursor: pointer; white-space: nowrap;
          color: var(--adm-on-2); font: 600 14px var(--font-sans);
        }
        .adm-rail-toggle:hover { background: var(--adm-hover); color: var(--adm-on); }

        .adm-sb-user { display: flex; align-items: center; gap: 12px; margin: 0 12px 12px; padding: 10px; border-top: 1px solid var(--adm-line); }
        .adm-sb-user-txt { min-width: 0; }
        .adm-av { width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #fff; }
        .adm-av img { width: 100%; height: 100%; object-fit: cover; }
        .adm-sb-user b { display: block; font-size: 15px; font-weight: 700; color: var(--adm-on); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .adm-sb-user small { display: block; font-size: 13px; color: var(--adm-on-2); overflow-wrap: anywhere; }
        .adm-sb-search { padding: 12px 12px 0; }
        .adm-sb-search .adm-jump { width: 100%; }
        .adm-sb-search .adm-jump-list { position: static; margin-top: 8px; max-height: 45vh; }

        @media (min-width: 768px) {
          .rail-min .adm-sb-brand, .rail-min .adm-link-label, .rail-min .adm-sb-user-txt, .rail-min .adm-rail-toggle-label {
            position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
          }
          .rail-min .adm-sb-head { padding: 0 16px; }
          .rail-min .adm-nav-group { font-size: 0; height: 1px; margin: 12px 14px 8px; background: var(--adm-line); }
          .rail-min .adm-link, .rail-min .adm-rail-toggle { justify-content: center; padding: 0; gap: 0; }
          .rail-min .adm-sb-user { justify-content: center; padding: 10px 0; }
        }

        .adm-tip {
          position: fixed; z-index: 500; transform: translateY(-50%); pointer-events: none; white-space: nowrap;
          padding: 6px 10px; border-radius: 8px; background: var(--adm-navy-deep); color: var(--adm-on);
          font: 600 13px var(--font-sans); box-shadow: 0 6px 18px rgb(0 0 0 / .3); border: 1px solid var(--adm-line);
        }

        .adm-main { flex: 1; min-width: 0; min-height: 100vh; display: flex; flex-direction: column; }
        .adm-bar {
          height: var(--topbar-h); flex-shrink: 0; position: sticky; top: 0; z-index: 100;
          display: flex; align-items: center; gap: 10px; padding: 0 var(--shell-pad);
          background: var(--adm-navy); color: var(--adm-on); border-bottom: 1px solid var(--adm-line);
        }
        .adm-content { flex: 1; width: 100%; min-width: 0; padding: var(--shell-pad) var(--shell-pad) 48px; }

        .adm-crumbs { flex: 1 1 auto; min-width: 0; }
        .adm-crumbs ol { display: flex; align-items: center; gap: 6px; list-style: none; min-width: 0; overflow: hidden; }
        .adm-crumbs li { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; color: var(--adm-on-2); white-space: nowrap; }
        .adm-crumbs li > svg { flex-shrink: 0; opacity: .6; }
        .adm-crumbs li:last-child { flex-shrink: 0; }
        .adm-crumbs li:not(:last-child) > :is(a, span) { overflow: hidden; text-overflow: ellipsis; }
        .adm-crumbs a { display: inline-block; min-width: 44px; line-height: 44px; color: var(--adm-on-2); text-decoration: none; border-radius: 4px; }
        .adm-crumbs a:hover { color: var(--adm-on); text-decoration: underline; }
        .adm-crumbs [aria-current="page"] { font: 400 19px/1.2 var(--font-display); color: var(--adm-on); }

        .adm-jump { position: relative; flex: 0 4 340px; min-width: 150px; }
        .adm-jump > svg { position: absolute; left: 13px; top: 13px; color: var(--adm-on-2); pointer-events: none; }
        .adm-jump input {
          width: 100%; height: 44px; padding: 0 40px 0 40px; border-radius: 12px;
          border: 1px solid rgb(255 255 255 / .18); background: rgb(255 255 255 / .08);
          color: var(--adm-on); font: 500 15px var(--font-sans); outline: none; transition: border-color .15s, background .15s;
        }
        .adm-jump input::placeholder { color: var(--adm-on-2); }
        .adm-jump input:focus { border-color: var(--adm-kraft); background: rgb(255 255 255 / .12); }
        .adm-jump kbd {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none;
          min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 6px;
          border: 1px solid rgb(255 255 255 / .25); color: var(--adm-on-2); font: 600 13px ui-monospace, monospace;
        }
        .adm-jump input:focus ~ kbd, .adm-jump input:not(:placeholder-shown) ~ kbd { opacity: 0; }
        .adm-jump-list, .adm-pop {
          position: absolute; top: calc(100% + 8px); z-index: 450; list-style: none; padding: 6px;
          background: var(--bg-card); border: 1px solid var(--adm-mat); border-radius: 14px; box-shadow: var(--shadow-2);
          max-height: min(70vh, 520px); overflow-y: auto; animation: admPop .14s ease-out backwards;
        }
        .adm-jump-list { left: 0; right: 0; }
        .adm-pop { right: 0; width: 280px; }
        .adm-jump-list button, .adm-pop :is(a, button) {
          display: flex; align-items: center; gap: 12px; width: 100%; min-height: 44px; padding: 0 12px;
          border: 0; border-radius: 10px; background: none; color: var(--ink); font: 600 15px var(--font-sans);
          text-align: left; text-decoration: none; cursor: pointer;
        }
        .adm-jump-list button.on, .adm-jump-list button:hover, .adm-pop a:hover { background: var(--teal-50); color: var(--teal-dark); }
        .adm-jump-list small, .adm-pop small { margin-left: auto; font: 600 12px var(--font-sans); color: var(--text-subtle); }
        @keyframes admPop { from { opacity: 0; transform: translateY(-6px); } }

        .adm-icon-btn, .adm-quick-btn, .adm-profile-btn {
          min-width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          border-radius: 12px; border: 1px solid rgb(255 255 255 / .18); background: transparent; color: var(--adm-on);
          cursor: pointer; position: relative; flex-shrink: 0; white-space: nowrap; font: 600 14px var(--font-sans); transition: background .15s;
        }
        .adm-icon-btn:hover, .adm-profile-btn:hover, .adm-icon-btn[aria-expanded="true"], .adm-profile-btn[aria-expanded="true"] { background: var(--adm-hover); }
        .adm-quick-btn { padding: 0 14px; border-color: transparent; background: var(--teal); color: var(--on-teal, #fff); }
        .adm-quick-btn:hover, .adm-quick-btn[aria-expanded="true"] { background: var(--teal-dark); }
        .adm-profile-btn { padding: 0 12px 0 3px; border-radius: 99px; }
        .adm-profile-btn .adm-av { width: 36px; height: 36px; font-size: 12px; }
        .adm-profile-name { font-size: 14px; white-space: nowrap; }
        .adm-bell-n {
          position: absolute; top: -6px; right: -6px; min-width: 22px; height: 22px; padding: 0 4px; border-radius: 99px;
          display: grid; place-items: center; background: var(--adm-thread); color: #fff; font-size: 12px; font-weight: 700; border: 2px solid var(--adm-navy);
        }
        .adm-role-chip {
          display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 12px; flex-shrink: 0; white-space: nowrap;
          border-radius: var(--radius-pill); border: 1px solid color-mix(in srgb, var(--adm-kraft) 55%, transparent);
          color: var(--adm-on); font: 600 12.5px var(--font-sans);
        }
        .adm-role-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--adm-kraft); }
        .adm-sb-user .adm-role-chip { margin-top: 6px; }

        .adm-notif-panel {
          position: absolute; top: calc(100% + 8px); right: 0; width: 380px; max-height: 520px; z-index: 500;
          display: flex; flex-direction: column; overflow: hidden; color: var(--ink);
          background: var(--bg-card); border: 1px solid var(--adm-mat); border-radius: var(--radius); box-shadow: var(--shadow-2);
        }
        .adm-notif-head { padding: 12px 16px; border-bottom: 1px solid var(--adm-mat); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .adm-notif-head b { font: 400 18px var(--font-display); }
        .adm-notif-head small { display: block; font-size: 12px; color: var(--text-subtle); }
        .adm-notif-head button { min-height: 44px; padding: 0 10px; border: 0; border-radius: 8px; background: none; color: var(--teal-dark); font: 700 13px var(--font-sans); cursor: pointer; }
        .adm-notif-sec { padding: 8px 16px 4px; font-size: 12px; font-weight: 700; color: var(--text-faint); background: var(--bg-surface); }
        .adm-notif-row { display: flex; gap: 10px; align-items: flex-start; padding: 10px 16px; border-bottom: 1px solid var(--bg-surface); background: var(--bg-card); }
        .adm-notif-row.unread { background: var(--teal-50); cursor: pointer; }
        a.adm-notif-row { color: inherit; text-decoration: none; }
        a.adm-notif-row:focus-visible { outline: 2px solid var(--teal); outline-offset: -2px; }
        .adm-notif-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; border: 1px solid var(--border); }
        .unread .adm-notif-dot { background: var(--teal); border-color: var(--teal); }
        .adm-notif-t { font-size: 14px; font-weight: 500; color: var(--ink); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .unread .adm-notif-t { font-weight: 700; }
        .adm-notif-m { font-size: 13.5px; color: var(--text-subtle); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .adm-notif-time { font-size: 13px; color: var(--text-faint); margin-top: 3px; }
        .adm-notif-sk { height: 52px; border-radius: 10px; background: linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%); background-size: 400px; animation: sk 1.4s infinite; }
        .adm-pop-user { padding: 10px 12px; border-bottom: 1px solid var(--adm-mat); margin-bottom: 4px; }
        .adm-pop-user p { font-size: 13px; color: var(--text-subtle); }
        .adm-pop-user p:first-child { font-weight: 700; color: var(--ink); }
        .adm-pop .adm-signout { color: var(--adm-thread); }
        .adm-pop .adm-signout:hover { background: color-mix(in srgb, var(--adm-thread) 10%, transparent); color: var(--adm-thread); }
        .adm-scrim { display: none; }

        @media (max-width: 1279px) { .adm-crumbs li:not(.pg) { display: none; } .adm-crumbs li:not(.pg) + li.pg > svg { display: none; } .adm-crumbs li:last-child { flex-shrink: 1; } .adm-crumbs [aria-current="page"] { overflow: hidden; text-overflow: ellipsis; } }
        @media (max-width: 1099px) { .adm-profile-name, .adm-quick-label { display: none; } .adm-quick-btn { padding: 0; } }
        @media (min-width: 768px) { .adm-mob-only { display: none !important; } }
        @media (max-width: 767px) {
          .adm-desk-only { display: none !important; }
          .adm-sb {
            position: fixed; left: 0; top: 0; z-index: 900; width: min(300px, 86vw);
            transform: translateX(-100%); visibility: hidden; transition: transform .2s ease-out, visibility 0s .2s;
            box-shadow: 0 0 40px rgb(0 0 0 / .35);
          }
          .drawer-open .adm-sb { transform: none; visibility: visible; transition: transform .2s ease-out; }
          .drawer-open .adm-scrim { display: block; position: fixed; inset: 0; z-index: 890; border: 0; background: rgb(19 31 56 / .5); }
          .adm-bar { height: 56px; padding: 0 var(--content-pad-mob); gap: 8px; }
          html:has(.adm-shell.drawer-open) { overflow: hidden; }
          .adm-crumbs [aria-current="page"] { font-size: 18px; }
          .adm-content { padding: var(--content-pad-mob) var(--content-pad-mob) 32px; }
          .adm-notif-panel { position: fixed; top: 64px; left: 8px; right: 8px; width: auto; max-height: calc(100dvh - 80px); }
          .adm-pop { position: fixed; top: 64px; left: 8px; right: 8px; width: auto; }
          .adm-profile-btn { padding: 0 3px; }
        }
        @media (max-width: 479px) { .adm-bar > .adm-role-chip { display: none; } }

        @media (prefers-reduced-motion: reduce) {
          .adm-shell *, .adm-shell *::before, .adm-shell *::after { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className={`adm-shell${mini ? ' rail-min' : ''}${drawer ? ' drawer-open' : ''}`}>
        <a href="#adm-main" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('adm-main')?.focus(); }}>Skip to content</a>
        <button type="button" className="adm-scrim" tabIndex={-1} aria-hidden="true" onClick={closeDrawer}/>

        <aside id="adm-sidebar" ref={sbRef} className="adm-sb" aria-label="Main menu"
          {...(mobile ? { role: 'dialog', 'aria-modal': drawer || undefined } : {})}>
          <div className="adm-sb-head">
            <button type="button" className={`adm-sb-mark${spin ? ' spin' : ''}`} onClick={goHome} onAnimationEnd={() => setSpin(false)}
              aria-label="VFRB Enterprise, go to dashboard" {...tipProps('Dashboard')}>
              <img src={logo} alt="" className="adm-sb-logo"/>
            </button>
            <div className="adm-sb-brand">
              <b>VFRB Enterprise</b>
              <small>Custom Uniforms</small>
            </div>
            <button type="button" className="adm-icon-btn adm-mob-only" onClick={closeDrawer} aria-label="Close menu"><X size={20} aria-hidden="true"/></button>
          </div>

          <div className="adm-sb-search adm-mob-only"><NavSearch id="adm-sb-search" items={nav.items} onGo={navigate}/></div>

          <nav ref={navRef} className="adm-nav-scroll" aria-label="Admin pages" onScroll={() => setTip(null)}>
            {nav.groups.map(({ name: g, items }, gi) => (
              <div key={g} role="group" aria-label={g}>
                <p className={`adm-nav-group${gi === 0 ? ' first' : ''}`} aria-hidden="true">{g}</p>
                {items.map(item => {
                  const badge = badgeFor(item.to);
                  return (
                    <Link key={item.to} to={item.to} {...intent(item.to)} {...tipProps(item.label)} className="adm-link"
                      aria-current={current?.to === item.to ? 'page' : undefined}
                      aria-label={badge ? `${item.label}, ${badgeNote(item.to, badge)}` : undefined}>
                      <span className="nav-ico-wrap">
                        <IconBox icon={item.icon} size={18} width={20}/>
                        {mini && <NavBadge n={badge} corner/>}
                      </span>
                      <span className="adm-link-label">{item.label}</span>
                      {!mini && <NavBadge n={badge}/>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <button type="button" className="adm-rail-toggle adm-desk-only" onClick={toggleRail} {...tipProps('Expand menu')}
            aria-expanded={!collapsed} aria-controls="adm-sidebar" aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}>
            {collapsed ? <PanelLeftOpen size={20} strokeWidth={2} aria-hidden="true"/> : <PanelLeftClose size={20} strokeWidth={2} aria-hidden="true"/>}
            <span className="adm-rail-toggle-label" aria-hidden="true">Collapse</span>
          </button>

          <div className="adm-sb-user" {...tipProps(`${name} · ${roleLabel}`)}>
            {avatarEl('adm-av')}
            <div className="adm-sb-user-txt">
              <b>{name}</b>
              <small>{roleLabel}</small>
              <span className="adm-role-chip adm-mob-only">{roleChip}</span>
            </div>
          </div>
        </aside>
        {mini && tip && <div className="adm-tip" role="presentation" style={{ top: tip.top, left: tip.left }}>{tip.label}</div>}

        <main id="adm-main" tabIndex={-1} className="adm-main">
          <header className="adm-bar">
            <button type="button" ref={menuBtnRef} className="adm-icon-btn adm-mob-only" onClick={() => setDrawer(true)}
              aria-label="Open menu" aria-expanded={drawer} aria-controls="adm-sidebar"><Menu size={22} aria-hidden="true"/></button>

            <nav className="adm-crumbs" aria-label="Breadcrumb">
              <ol>
                {crumbs.map((c, n) => {
                  const last = n === crumbs.length - 1;
                  return (
                    <li key={n} className={c.page ? 'pg' : undefined}>
                      {n > 0 && <ChevronRight size={14} aria-hidden="true"/>}
                      {last ? <span aria-current="page">{c.label}</span> : c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="adm-desk-only" style={{ display:'contents' }}><NavSearch id="adm-bar-search" items={nav.items} onGo={navigate}/></div>

            {quick.length > 0 && (
              <div ref={quickRef} style={{ position:'relative' }}>
                <button type="button" className="adm-quick-btn" onClick={() => setQuickOpen(o => !o)}
                  aria-haspopup="true" aria-expanded={quickOpen} aria-controls="adm-quick" aria-label="Quick add">
                  <Plus size={20} aria-hidden="true"/><span className="adm-quick-label">Quick add</span>
                </button>
                {quickOpen && (
                  <ul id="adm-quick" className="adm-pop" aria-label="Quick add">
                    {quick.map(a => (
                      <li key={a.label}>
                        <Link to={a.to} {...intent(a.to)} onClick={() => setQuickOpen(false)}>
                          <a.icon size={18} strokeWidth={1.9} aria-hidden="true"/>{a.label}<small>{a.page}</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <span className="adm-role-chip">{roleChip}</span>

            {!owner && <div ref={bellRef} style={{ position:'relative' }}>
              <button type="button" className="adm-icon-btn" onClick={openBell} aria-expanded={bellOpen}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
                <Bell size={21} strokeWidth={1.9} aria-hidden="true"/>
                {unread > 0 && <span className="adm-bell-n" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div className="adm-notif-panel" role="region" aria-label="Notifications"
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:.18, ease:'easeOut' }}>
                    <div className="adm-notif-head">
                      <div><b>Notifications</b>{unread > 0 && <small>{unread} unread</small>}</div>
                      {unread > 0 && <button type="button" onClick={markAllRead}>Mark all read</button>}
                    </div>
                    <div style={{ flex:1, overflowY:'auto' }}>
                      {notifLoad ? (
                        <div style={{ padding:14, display:'grid', gap:8 }}>{[1,2,3].map(i => <div key={i} className="adm-notif-sk"/>)}</div>
                      ) : notifs.length === 0 ? (
                        <div style={{ padding:'36px 20px', textAlign:'center', color:'var(--text-faint)' }}>
                          <Bell size={32} strokeWidth={1.5} style={{ opacity:.3, marginBottom:8 }} aria-hidden="true"/>
                          <p style={{ fontSize:13 }}>No notifications</p>
                        </div>
                      ) : (
                        <>
                          {notifToday.length > 0 && <div className="adm-notif-sec">Today</div>}
                          {notifToday.map(n => <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead} onGo={() => setBellOpen(false)}/>)}
                          {notifEarlier.length > 0 && <div className="adm-notif-sec">Earlier</div>}
                          {notifEarlier.map(n => <NotifRow key={n.notif_id ?? n.id} n={n} onRead={markRead} onGo={() => setBellOpen(false)} earlier/>)}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>}

            <div ref={profileRef} style={{ position:'relative' }}>
              <button type="button" className="adm-profile-btn" onClick={() => setProfileOpen(o => !o)}
                aria-haspopup="true" aria-expanded={profileOpen} aria-label={`Account: ${name}`}>
                {avatarEl('adm-av')}
                <span className="adm-profile-name adm-desk-only">{name}</span>
              </button>
              {profileOpen && (
                <div className="adm-pop">
                  <div className="adm-pop-user"><p>{name}</p><p>{roleLabel}</p></div>
                  <button type="button" onClick={logout} className="adm-signout">
                    <LogOut size={16} strokeWidth={2} aria-hidden="true"/> Sign out
                  </button>
                </div>
              )}
            </div>
          </header>

          <div className="adm-content">
            {pendingSync > 0 && (
              <AlertBanner tone="warning" title={`${pendingSync} change${pendingSync > 1 ? 's' : ''} waiting to sync`}>
                They send automatically once you're back online.
              </AlertBanner>
            )}
            <PageErrorBoundary resetKey={path}>
              <div key={path} className="adm-page vfrb-page thread-page"><Suspense fallback={<PageLoader/>}>{!canOpen(path, me) ? <AccessDenied what="This page"/> : <Outlet/>}</Suspense><ThreadPull/></div>
            </PageErrorBoundary>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
