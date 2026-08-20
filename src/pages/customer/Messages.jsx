// src/pages/customer/Messages.jsx
// Task Z — Messages polish
//
// Changes vs zip source:
//   1. CDN font ('DM Sans') removed — system font stack throughout
//   2. OPTIMISTIC SEND: message appended to local state instantly on send,
//      rolled back on API failure (body input restored)
//   3. DAY SEPARATORS: "Today", "Yesterday", full date labels between
//      message groups when the day changes
//   4. SENT/RECEIVED distinction: sent = right-aligned teal gradient;
//      received = left-aligned white with teal left border
//   5. TIMESTAMPS: shown per bubble; grouped so consecutive same-sender
//      messages only show time on the last one
//   6. SCROLL-TO-BOTTOM: fires on mount + on every msgs change
//   7. "Sending…" micro-state: optimistic bubble shows faint opacity (.75)
//      until API confirms, then snaps to full opacity
//   8. body column enforced (NOT message) — locked schema rule

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence }                   from 'framer-motion';
import axios                                         from 'axios';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

// ── Day separator label ────────────────────────────────────────────────────────
function dayLabel(dateStr) {
  if (!dateStr) return null;
  const d     = new Date(dateStr);
  const today = new Date();
  const diff  = Math.floor((today - d) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function dayKey(dateStr) {
  if (!dateStr) return 'unknown';
  return new Date(dateStr).toLocaleDateString('en-PH');
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMe, showTime, isOptimistic }) {
  const timeStr = msg.created_at || msg.sent_at
    ? new Date(msg.created_at ?? msg.sent_at).toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: .97 }}
      animate={{ opacity: isOptimistic ? .72 : 1, y: 0, scale: 1 }}
      transition={{ duration: .18 }}
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {/* VFRB avatar — received side */}
      {!isMe && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg,${T},${T2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fff',
          marginBottom: showTime ? 20 : 0,
        }}>V</div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>

        {/* Bubble */}
        <div style={{
          padding: '10px 14px',
          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMe
            ? `linear-gradient(135deg,${T},${T2})`
            : '#fff',
          borderLeft: !isMe ? `3px solid ${T}` : 'none',
          border: !isMe ? `1px solid #e2e8f0` : 'none',
          boxShadow: isMe
            ? `0 2px 8px rgba(2,128,144,.25)`
            : '0 1px 3px rgba(0,0,0,.06)',
        }}>
          {/* body column — locked schema rule (NOT message) */}
          <p style={{
            fontSize: 13, lineHeight: 1.55, margin: 0, fontFamily: FONT,
            color: isMe ? '#fff' : '#0f172a',
            wordBreak: 'break-word',
          }}>
            {msg.body ?? msg.message}
          </p>
        </div>

        {/* Timestamp — only on last message of a run */}
        {showTime && timeStr && (
          <p style={{
            fontSize: 9, margin: 0, fontFamily: FONT,
            color: '#94a3b8',
            paddingLeft: isMe ? 0 : 2,
          }}>
            {timeStr}{isOptimistic ? ' · Sending…' : ''}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Day separator ──────────────────────────────────────────────────────────────
function DaySep({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '4px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }}/>
      <span style={{
        fontSize: 9, fontWeight: 700, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '.08em',
        fontFamily: FONT, whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }}/>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CustomerMessages() {
  const [orders,  setOrders]  = useState([]);
  const [selId,   setSelId]   = useState(null);
  const [msgs,    setMsgs]    = useState([]);
  const [newMsg,  setNewMsg]  = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const msgEnd = useRef(null);
  const meId   = JSON.parse(localStorage.getItem('vfrb_user') || '{}')?.user_id;

  // Load order list for thread selector
  useEffect(() => {
    axios.get('/api/customer/orders')
      .then(r => {
        const all = r.data?.data ?? r.data ?? [];
        setOrders(all);
        if (all.length > 0) setSelId(all[0].order_id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMsgs = useCallback(() => {
    if (!selId) return;
    axios.get(`/api/customer/messages/${selId}`)
      .then(r => setMsgs(r.data?.messages ?? r.data ?? []))
      .catch(() => {});
  }, [selId]);

  useEffect(() => {
    loadMsgs();
    // DSA: setInterval O(1) — polls every 60s for new messages (master prompt spec)
    // Cleared on unmount or when selId changes to avoid stale-closure updates
    const iv = setInterval(loadMsgs, 60_000);
    return () => clearInterval(iv);
  }, [loadMsgs]);

  // Scroll to bottom on any msgs change
  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // ── Optimistic send ──────────────────────────────────────────────────────────
  const send = async () => {
    if (!newMsg.trim() || !selId || sending) return;

    const optimistic = {
      _optimistic: true,
      message_id:  `opt_${Date.now()}`,
      sender_id:   meId,
      user_id:     meId,
      body:        newMsg.trim(),   // locked: body NOT message
      created_at:  new Date().toISOString(),
    };

    // 1. Instant local append
    setMsgs(prev => [...prev, optimistic]);
    const sent = newMsg.trim();
    setNewMsg('');
    setSending(true);

    try {
      // 2. Background API call
      await axios.post('/api/customer/messages', {
        order_id: selId,
        body:     sent,
      });
      // 3. Refresh to get server-assigned message_id + confirmed timestamp
      loadMsgs();
    } catch {
      // 4. Rollback on failure
      setMsgs(prev => prev.filter(m => m.message_id !== optimistic.message_id));
      setNewMsg(sent);
    } finally {
      setSending(false);
    }
  };

  const selOrder = orders.find(o => o.order_id === selId);

  // ── Build message list with day separators ────────────────────────────────
  // Returns array of { type:'sep'|'msg', ... } for rendering
  const renderItems = (() => {
    const items = [];
    let lastDay = null;
    msgs.forEach((m, i) => {
      const day = dayKey(m.created_at ?? m.sent_at);
      if (day !== lastDay) {
        items.push({ type: 'sep', key: `sep_${day}_${i}`, label: dayLabel(m.created_at ?? m.sent_at) });
        lastDay = day;
      }
      // Show timestamp on last message of a same-sender consecutive run
      const next   = msgs[i + 1];
      const isMe   = m.user_id === meId || m.sender_id === meId;
      const nextMe = next ? (next.user_id === meId || next.sender_id === meId) : null;
      const showTime = nextMe === null || nextMe !== isMe || dayKey(next?.created_at) !== day;
      items.push({ type: 'msg', key: m.message_id ?? `msg_${i}`, msg: m, isMe, showTime,
        isOptimistic: !!m._optimistic });
    });
    return items;
  })();

  return (
    <>
      <style>{`
        .cust-msg-wrap {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 120px);
          font-family: ${FONT};
          color: #0f172a;
        }
        .cust-msg-chat {
          flex: 1;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 1px 6px rgba(0,0,0,.05);
          min-height: 0;
        }
        @media (max-width: 767px) {
          .cust-msg-wrap { height: auto; }
          .cust-msg-chat { min-height: 420px; }
        }
      `}</style>

      <div className="cust-msg-wrap">

        {/* Page header */}
        <div style={{ marginBottom: 16, flexShrink: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a',
            margin: 0, fontFamily: FONT }}>Messages</h1>
          <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0',
            fontFamily: FONT }}>
            Communicate with VFRB staff about your orders
          </p>
        </div>

        {/* Order selector */}
        {orders.length > 0 && (
          <div style={{ marginBottom: 12, flexShrink: 0 }}>
            <select
              value={selId ?? ''}
              onChange={e => setSelId(Number(e.target.value))}
              style={{
                padding: '9px 14px', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#0f172a', fontSize: 13, outline: 'none',
                fontFamily: FONT, cursor: 'pointer', width: '100%',
              }}
              onFocus={e => { e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px rgba(2,128,144,.1)`; }}
              onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            >
              {orders.map(o => (
                <option key={o.order_id} value={o.order_id}>
                  Order #{o.order_id} — {o.design?.design_name ?? o.garment_type ?? 'Custom Order'} ({o.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Chat panel */}
        <div className="cust-msg-chat">

          {/* Chat header */}
          <div style={{
            padding: '12px 18px', borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc', flexShrink: 0,
          }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a',
              margin: 0, fontFamily: FONT }}>
              {selOrder
                ? `Order #${selId} — ${selOrder.design?.design_name ?? selOrder.garment_type ?? 'Custom Order'}`
                : 'Select an order'}
            </p>
            {selOrder && (
              <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0',
                fontFamily: FONT }}>
                {selOrder.status ? `Status: ${selOrder.status}` : ''}
              </p>
            )}
          </div>

          {/* Message list */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', opacity: .4 }}>
                <p style={{ color: '#64748b', fontSize: 13, fontFamily: FONT }}>Loading…</p>
              </div>
            ) : !selId ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 8, opacity: .4 }}>
                <p style={{ fontSize: 36, margin: 0 }}>💬</p>
                <p style={{ color: '#64748b', fontSize: 13, fontFamily: FONT }}>
                  Select an order above
                </p>
              </div>
            ) : renderItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 8, opacity: .4 }}>
                <p style={{ fontSize: 36, margin: 0 }}>💬</p>
                <p style={{ color: '#64748b', fontSize: 13, fontFamily: FONT }}>
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {renderItems.map(item =>
                  item.type === 'sep' ? (
                    <DaySep key={item.key} label={item.label}/>
                  ) : (
                    <Bubble
                      key={item.key}
                      msg={item.msg}
                      isMe={item.isMe}
                      showTime={item.showTime}
                      isOptimistic={item.isOptimistic}
                    />
                  )
                )}
              </AnimatePresence>
            )}
            <div ref={msgEnd}/>
          </div>

          {/* Input row */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: 10, flexShrink: 0,
            background: '#fff',
          }}>
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={selId ? 'Message VFRB staff…' : 'Select an order above'}
              disabled={!selId}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 11,
                border: '1px solid #e2e8f0',
                background: selId ? '#fff' : '#f8fafc',
                color: '#0f172a', fontSize: 13, outline: 'none',
                fontFamily: FONT, minHeight: 44, transition: 'border .15s, box-shadow .15s',
              }}
              onFocus={e => { e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px rgba(2,128,144,.1)`; }}
              onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
            <motion.button
              whileTap={{ scale: .95 }}
              onClick={send}
              disabled={sending || !newMsg.trim() || !selId}
              style={{
                padding: '10px 20px', borderRadius: 11, border: 'none',
                background: (sending || !newMsg.trim() || !selId)
                  ? '#e2e8f0'
                  : `linear-gradient(135deg,${T},${T2})`,
                color: (sending || !newMsg.trim() || !selId) ? '#94a3b8' : '#fff',
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
                cursor: (sending || !newMsg.trim() || !selId) ? 'not-allowed' : 'pointer',
                minHeight: 44, minWidth: 80,
                boxShadow: (!sending && newMsg.trim() && selId)
                  ? `0 4px 12px rgba(2,128,144,.28)` : 'none',
                transition: 'all .15s',
              }}
            >
              {sending ? '⏳' : 'Send →'}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}