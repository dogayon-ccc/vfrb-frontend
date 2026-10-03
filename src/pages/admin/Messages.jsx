import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import { PageHeader, StatusPill, SearchBox, SkeletonRows, ErrorBlock } from '../../components/admin/AdminUI';

const timeOf = (m) => m.sent_at ?? m.created_at;
const ago = (d) => {
  if (!d) return '';
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};
const dayLabel = (d) => {
  if (!d) return '';
  const diff = Math.floor((new Date(new Date().toDateString()) - new Date(new Date(d).toDateString())) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' });
};
const initials = (n) => (n ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function AdminMessages() {
  const nav = useNavigate();
  const [threads, setThreads] = useState([]);
  const [selId, setSelId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [msgs, setMsgs] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [msgErr, setMsgErr] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const msgEnd = useRef(null);
  const meId = JSON.parse(localStorage.getItem('vfrb_user') || '{}')?.user_id;

  const loadThreads = useCallback(async () => {
    try {
      const r = await axios.get('/api/admin/messages');
      const data = r.data?.threads ?? r.data?.data ?? r.data ?? [];
      setThreads(data); setLoadErr(false);
      setSelId((cur) => cur ?? (window.matchMedia('(min-width:768px)').matches && data.length ? (data[0].order_id ?? data[0].id) : null));
    } catch { setLoadErr(true); } finally { setLoading(false); }
  }, []);

  const loadMsgs = useCallback(async () => {
    if (!selId) return;
    try {
      const r = await axios.get(`/api/admin/messages/${selId}`);
      setMsgs(r.data?.messages ?? r.data ?? []); setMsgErr(false);
    } catch { setMsgErr(true); }
  }, [selId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    setMsgs([]); loadMsgs();
    const iv = setInterval(loadMsgs, 60000);
    return () => clearInterval(iv);
  }, [loadMsgs]);
  useEffect(() => { msgEnd.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const send = async () => {
    const body = newMsg.trim();
    if (!body || !selId || sending) return;
    const optId = `opt_${Date.now()}`;
    setMsgs((p) => [...p, { _optimistic: true, message_id: optId, sender_id: meId, body, sent_at: new Date().toISOString() }]);
    setNewMsg(''); setSending(true); setSendErr(false);
    try {
      await axios.post('/api/admin/messages', { order_id: selId, body });
      await loadMsgs(); loadThreads();
    } catch {
      setMsgs((p) => p.filter((m) => m.message_id !== optId));
      setNewMsg(body); setSendErr(true);
    } finally { setSending(false); }
  };

  const unreadTotal = threads.reduce((s, t) => s + (Number(t.unread_count) || 0), 0);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return threads.filter((t) => (!unreadOnly || Number(t.unread_count) > 0)
      && (!q || String(t.order_id).includes(q) || t.customer_name?.toLowerCase().includes(q)
        || t.organization_name?.toLowerCase().includes(q) || t.last_body?.toLowerCase().includes(q)));
  }, [threads, search, unreadOnly]);
  const sel = threads.find((t) => (t.order_id ?? t.id) === selId);

  const pick = (tid) => { setSelId(tid); setMobileView('thread'); setThreads((p) => p.map((t) => ((t.order_id ?? t.id) === tid ? { ...t, unread_count: 0 } : t))); };

  const feed = useMemo(() => {
    const out = []; let last = null;
    msgs.forEach((m, i) => {
      const t = timeOf(m); const k = t ? new Date(t).toDateString() : 'x';
      if (k !== last) { out.push({ sep: true, key: `s${k}${i}`, lbl: dayLabel(t) }); last = k; }
      out.push({ key: m.message_id ?? i, m, me: m.sender_id === meId });
    });
    return out;
  }, [msgs, meId]);

  return (
    <>
      <PageHeader title="Messages" sub={loading ? 'Loading conversations…' : `${threads.length} conversation${threads.length !== 1 ? 's' : ''}${unreadTotal ? ` · ${unreadTotal} unread` : ''}`} />
      {loadErr && <div style={{ marginBottom: 12 }}><ErrorBlock msg="Could not load conversations." onRetry={loadThreads} /></div>}

      <div className="msg-wrap">
        <aside className={`msg-list${mobileView !== 'list' ? ' off' : ''}`} aria-label="Conversations">
          <div className="msg-list-head">
            <SearchBox value={search} onChange={setSearch} placeholder="Search order, client, message…" label="Search conversations" />
            <div className="msg-chips">
              <button aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
              <button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread{unreadTotal ? ` (${unreadTotal})` : ''}</button>
            </div>
          </div>
          <div className="msg-scroll">
            {loading ? <SkeletonRows rows={5} h={62} />
              : filtered.length === 0 ? (
                <div className="adm-empty"><NavIcon name="chat" size={28} color="currentColor" />
                  <div style={{ marginTop: 8, fontWeight: 700 }}>{search || unreadOnly ? 'No conversations match' : 'No conversations yet'}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{!search && !unreadOnly && 'Conversations appear once a client messages about an order.'}</div>
                  {(search || unreadOnly) && <button className="adm-link-btn" onClick={() => { setSearch(''); setUnreadOnly(false); }}>Clear filters</button>}
                </div>
              ) : filtered.map((t) => {
                const tid = t.order_id ?? t.id; const un = Number(t.unread_count) || 0;
                return (
                  <button key={tid} className={`msg-th${tid === selId ? ' on' : ''}`} aria-current={tid === selId} onClick={() => pick(tid)}>
                    <span className="msg-av">{initials(t.customer_name)}</span>
                    <span className="msg-th-body">
                      <span className="msg-th-top"><b>{t.customer_name ?? '—'}</b><i>{ago(t.last_message_at)}</i></span>
                      <span className="msg-th-sub">Order #{tid}{t.garment_type ? ` · ${t.garment_type}` : ''}</span>
                      <span className={`msg-th-last${un ? ' unread' : ''}`}>{t.last_body ?? ''}</span>
                    </span>
                    {un > 0 && <span className="msg-badge" aria-label={`${un} unread`}>{un}</span>}
                  </button>
                );
              })}
          </div>
        </aside>

        <section className={`msg-chat${mobileView !== 'thread' ? ' off' : ''}`} aria-label="Conversation">
          <header className="msg-chat-head">
            <button className="msg-back adm-btn" onClick={() => setMobileView('list')} aria-label="Back to conversations"><NavIcon name="back" size={16} color="currentColor" /></button>
            {sel ? (
              <>
                <span className="msg-av">{initials(sel.customer_name)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel.customer_name}{sel.organization_name ? ` · ${sel.organization_name}` : ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Order #{selId}{sel.garment_type ? ` · ${sel.garment_type}` : ''}</div>
                </div>
                {sel.status && <StatusPill status={sel.status} />}
                <button className="adm-btn" onClick={() => nav(`/admin/orders/${selId}`)}>View order</button>
              </>
            ) : <span style={{ fontWeight: 700, color: 'var(--text-subtle)' }}>Select a conversation</span>}
          </header>

          <div className="msg-feed" aria-live="polite">
            {!selId ? (
              <div className="adm-empty" style={{ margin: 'auto' }}><NavIcon name="chat" size={34} color="currentColor" /><div style={{ marginTop: 8 }}>Choose a conversation from the list</div></div>
            ) : msgErr && msgs.length === 0 ? (
              <div style={{ margin: 'auto' }}><ErrorBlock msg="Could not load this conversation." onRetry={loadMsgs} /></div>
            ) : msgs.length === 0 ? (
              <div className="adm-empty" style={{ margin: 'auto' }}><NavIcon name="chat" size={34} color="currentColor" /><div style={{ marginTop: 8 }}>No messages yet — say hello below.</div></div>
            ) : feed.map((it) => it.sep ? (
              <div key={it.key} className="msg-sep"><span>{it.lbl}</span></div>
            ) : (
              <div key={it.key} className={`msg-row ${it.me ? 'me' : ''}${it.m._optimistic ? ' opt' : ''}`}>
                <div className="msg-bub">
                  {!it.me && it.m.sender_name && <div className="msg-name">{it.m.sender_name}</div>}
                  <p>{it.m.body}</p>
                  <time>{timeOf(it.m) ? new Date(timeOf(it.m)).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : ''}</time>
                </div>
              </div>
            ))}
            <div ref={msgEnd} />
          </div>

          {sendErr && <div className="msg-senderr" role="alert"><NavIcon name="warning" size={14} color="currentColor" /> Message not sent — your text was restored. Try again.</div>}
          <div className="msg-compose">
            <textarea rows={1} value={newMsg} disabled={!selId} aria-label="Reply to customer"
              onChange={(e) => { setNewMsg(e.target.value); setSendErr(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={selId ? 'Reply to customer… (Enter to send, Shift+Enter for new line)' : 'Select a conversation'} />
            <button className="adm-btn primary" onClick={send} disabled={sending || !newMsg.trim() || !selId} aria-label="Send message">
              <NavIcon name={sending ? 'loading' : 'send'} size={15} color="currentColor" /><span className="adm-hide-m">Send</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
