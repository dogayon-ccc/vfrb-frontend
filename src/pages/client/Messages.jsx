// Per-order threads (real order_messages data) styled as a conversation list, like Figma's Chat screen — no fabricated departments.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import EmptyState from '../../components/EmptyState';

const T = 'var(--teal)', T2 = '#02C39A';
const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
const title = (o) => o?.design?.design_name ?? o?.garment_type ?? 'Custom Order';

const dayKey = (d) => d ? new Date(d).toLocaleDateString('en-PH') : 'unknown';
const dayLabel = (d) => {
  if (!d) return null;
  const diff = Math.floor((new Date() - new Date(d)) / 86_400_000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday'
    : new Date(d).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};
const timeOf = (m) => (m.created_at || m.sent_at)
  ? new Date(m.created_at ?? m.sent_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '';

function Avatar({ size = 28, mb = 0 }) {
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, marginBottom: mb,
      background: `linear-gradient(135deg,${T},${T2})`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * .4, fontWeight: 800, color: '#fff' }}>V</div>
  );
}

function ThreadRow({ order, active, onClick }) {
  const last = order._lastMsg;
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
      padding: '12px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: FONT,
      background: active ? 'rgba(2,128,144,.06)' : '#fff',
    }}>
      <Avatar size={44}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Order #{order.order_id} — {title(order)}
          </p>
          {last && <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{timeOf(last)}</span>}
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {last?.body ?? `Status: ${order.status}`}
        </p>
      </div>
    </button>
  );
}

function Bubble({ msg, isMe, showTime, isOptimistic }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: .97 }} animate={{ opacity: isOptimistic ? .72 : 1, y: 0, scale: 1 }}
      transition={{ duration: .18 }} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
      {!isMe && <Avatar size={28} mb={showTime ? 20 : 0}/>}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
        <div style={{
          padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMe ? `linear-gradient(135deg,${T},${T2})` : '#fff',
          borderLeft: !isMe ? `3px solid ${T}` : 'none', border: !isMe ? '1px solid #e2e8f0' : 'none',
          boxShadow: isMe ? '0 2px 8px rgba(2,128,144,.25)' : '0 1px 3px rgba(0,0,0,.06)',
        }}>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, fontFamily: FONT, color: isMe ? '#fff' : '#0f172a', wordBreak: 'break-word' }}>
            {msg.body ?? msg.message}
          </p>
        </div>
        {showTime && timeOf(msg) && (
          <p style={{ fontSize: 9, margin: 0, fontFamily: FONT, color: '#94a3b8', paddingLeft: isMe ? 0 : 2 }}>
            {timeOf(msg)}{isOptimistic ? ' · Sending…' : ''}
          </p>
        )}
      </div>
    </motion.div>
  );
}

const DaySep = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
    <div style={{ flex: 1, height: 1, background: '#f1f5f9' }}/>
    <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: FONT, whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: '#f1f5f9' }}/>
  </div>
);

const Loading = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <p style={{ color: '#94a3b8', fontSize: 13, fontFamily: FONT }}>Loading…</p>
  </div>
);

const NoMessagesYet = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, opacity: .5 }}>
    <p style={{ fontSize: 30, margin: 0 }}>💬</p>
    <p style={{ color: '#64748b', fontSize: 13, fontFamily: FONT }}>No messages yet. Start the conversation!</p>
  </div>
);

export default function CustomerMessages() {
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [ordersError, setOrdersError] = useState(false);
  const [selId, setSelId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // list | thread — mobile-only nav, matches Figma's separate screens
  const msgEnd = useRef(null);
  const meId = JSON.parse(localStorage.getItem('vfrb_user') || '{}')?.user_id;

  const loadOrders = useCallback(() => {
    setLoading(true);
    axios.get('/api/customer/orders').then(r => { setOrders(r.data?.data ?? r.data ?? []); setOrdersError(false); })
      .catch(() => setOrdersError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const loadMsgs = useCallback(() => {
    if (!selId) return;
    axios.get(`/api/customer/messages/${selId}`).then(r => setMsgs(r.data?.messages ?? r.data ?? [])).catch(() => {});
  }, [selId]);

  useEffect(() => { loadMsgs(); const iv = setInterval(loadMsgs, 60_000); return () => clearInterval(iv); }, [loadMsgs]);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const openThread = (id) => { setSelId(id); setMobileView('thread'); };

  const send = async () => {
    if (!newMsg.trim() || !selId || sending) return;
    const optimistic = { _optimistic: true, message_id: `opt_${Date.now()}`, sender_id: meId, user_id: meId, body: newMsg.trim(), created_at: new Date().toISOString() };
    setMsgs(p => [...p, optimistic]);
    const body = newMsg.trim();
    setNewMsg(''); setSending(true); setSendError(false);
    try {
      await axios.post('/api/customer/messages', { order_id: selId, body });
      loadMsgs();
    } catch {
      setMsgs(p => p.filter(m => m.message_id !== optimistic.message_id));
      setNewMsg(body);
      setSendError(true);
      setTimeout(() => setSendError(false), 4000);
    } finally { setSending(false); }
  };

  const selOrder = orders.find(o => o.order_id === selId);

  const renderItems = (() => {
    const items = []; let lastDay = null;
    msgs.forEach((m, i) => {
      const day = dayKey(m.created_at ?? m.sent_at);
      if (day !== lastDay) { items.push({ type: 'sep', key: `sep_${day}_${i}`, label: dayLabel(m.created_at ?? m.sent_at) }); lastDay = day; }
      const next = msgs[i + 1];
      const isMe = m.user_id === meId || m.sender_id === meId;
      const nextMe = next ? (next.user_id === meId || next.sender_id === meId) : null;
      items.push({ type: 'msg', key: m.message_id ?? `msg_${i}`, msg: m, isMe,
        showTime: nextMe === null || nextMe !== isMe || dayKey(next?.created_at) !== day, isOptimistic: !!m._optimistic });
    });
    return items;
  })();

  return (
    <>
      <style>{`
        .cust-msg-wrap { display: flex; flex-direction: column; gap: 16px; min-height: 420px; font-family: ${FONT}; color: #0f172a; }
        .cust-msg-list, .cust-msg-chat { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.05); }
        .cust-msg-list { width: 100%; overflow-y: auto; padding: 8px; }
        .cust-msg-chat { display: flex; flex-direction: column; min-height: 420px; }
        .cust-msg-list.hide-mobile, .cust-msg-chat.hide-mobile { display: none; }
        .cust-msg-back { display: flex; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
          clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (prefers-reduced-motion: reduce) {
          .cust-msg-chat *, .cust-msg-list * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
        @media (min-width: 768px) {
          .cust-msg-wrap { flex-direction: row; height: calc(100vh - 120px); min-height: 0; }
          .cust-msg-list { width: 320px; flex-shrink: 0; }
          .cust-msg-chat { flex: 1; min-height: 0; }
          .cust-msg-list.hide-mobile { display: block; }
          .cust-msg-chat.hide-mobile { display: flex; }
          .cust-msg-back { display: none; }
        }
      `}</style>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 14px', fontFamily: FONT }}>Messages</h1>

      <div className="cust-msg-wrap">
        <div className={`cust-msg-list ${mobileView !== 'list' ? 'hide-mobile' : ''}`}>
          {orders.map(o => <ThreadRow key={o.order_id} order={o} active={o.order_id === selId} onClick={() => openThread(o.order_id)}/>)}
          {!loading && ordersError && (
            <EmptyState illustration="error" compact
              headline="Couldn't load your orders"
              sub="Check your connection and try again."
              cta={{ label: 'Retry', onClick: loadOrders }}/>
          )}
          {!loading && !ordersError && orders.length === 0 && (
            <EmptyState illustration="message-locked" compact
              headline="No orders yet"
              sub="You'll be able to message VFRB staff once you place your first order."
              cta={{ label: '🎨 Place Your First Order →', onClick: () => nav('/order/create') }}/>
          )}
        </div>

        <div className={`cust-msg-chat ${mobileView !== 'thread' ? 'hide-mobile' : ''}`}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMobileView('list')} className="cust-msg-back" aria-label="Back to conversation list" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>←</button>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: FONT }}>
                {selOrder ? `Order #${selId} — ${title(selOrder)}` : 'Select a conversation'}
              </p>
              {selOrder && <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0', fontFamily: FONT }}>Status: {selOrder.status}</p>}
            </div>
          </div>

          <div role="log" aria-live="polite" aria-label="Message thread" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading ? <Loading/> : !selId ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '16px 0' }}>
                {ordersError
                  ? <EmptyState illustration="error" headline="Couldn't load your orders"
                      sub="Check your connection and try again." maxWidth={320}
                      cta={{ label: 'Retry', onClick: loadOrders }}/>
                : orders.length === 0
                  // No CTA here — the list pane already has one; a second identical button
                  // right next to it is the exact redundancy pattern flagged on Dashboard.
                  ? <EmptyState illustration="select-thread" headline="Nothing to show yet"
                      sub="Place your first order to start a conversation with VFRB staff." maxWidth={320}/>
                  : <EmptyState illustration="select-thread" headline="Select a conversation"
                      sub="Choose an order from the list to see your messages with VFRB staff." maxWidth={320}/>}
              </div>
            ) : renderItems.length === 0 ? <NoMessagesYet/> : (
              <AnimatePresence initial={false}>
                {renderItems.map(item => item.type === 'sep'
                  ? <DaySep key={item.key} label={item.label}/>
                  : <Bubble key={item.key} msg={item.msg} isMe={item.isMe} showTime={item.showTime} isOptimistic={item.isOptimistic}/>)}
              </AnimatePresence>
            )}
            <div ref={msgEnd}/>
          </div>

          <AnimatePresence>
            {sendError && (
              <motion.p role="status" aria-live="polite"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ margin: 0, padding: '6px 16px', fontSize: 11, color: '#dc2626', background: '#fef2f2',
                  borderTop: '1px solid #fecaca', fontFamily: FONT, flexShrink: 0 }}>
                Message didn't send — check your connection. Your draft is back in the box.
              </motion.p>
            )}
          </AnimatePresence>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, flexShrink: 0, background: '#fff' }}>
            <label htmlFor="msg-input" className="sr-only">Message</label>
            <input id="msg-input" value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={selId ? 'Message VFRB staff…' : 'Select a conversation'} disabled={!selId}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 11, border: '1px solid #e2e8f0', background: selId ? '#fff' : '#f8fafc',
                color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: FONT, minHeight: 44 }}/>
            <motion.button whileTap={{ scale: .95 }} onClick={send} disabled={sending || !newMsg.trim() || !selId}
              style={{ padding: '10px 20px', borderRadius: 11, border: 'none', minHeight: 44, minWidth: 80, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                cursor: (sending || !newMsg.trim() || !selId) ? 'not-allowed' : 'pointer',
                background: (sending || !newMsg.trim() || !selId) ? '#e2e8f0' : `linear-gradient(135deg,${T},${T2})`,
                color: (sending || !newMsg.trim() || !selId) ? '#94a3b8' : '#fff' }}>
              {sending ? '⏳' : 'Send →'}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
