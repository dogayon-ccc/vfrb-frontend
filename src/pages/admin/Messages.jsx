// src/pages/admin/AdminMessages.jsx
//
// RESHAPED (Sept 6 2026): hex → theme.css tokens (using the --bg vs
// --bg-surface distinction correctly this time — see Invoice.jsx's
// header note for why that matters), emoji → NavIcon. --bg (#f8fafc)
// used for thread-list/chat header backgrounds, --bg-surface (#f1f5f9)
// used for the incoming-message bubble and skeleton shimmer, matching
// exactly which hex each spot used in the real original.
//
// Two real, unstyled gaps closed, not just recolored — these weren't
// token issues, the original genuinely had bare unstyled elements
// where a chat UI needs real ones:
//   - The date separator (<div>{item.lbl}</div>) had ZERO styling at
//     all — no centering, no background, just raw text inline in the
//     message flex column. Now a proper centered pill, the standard
//     chat-app date-divider pattern.
//   - Both empty states ("Select a conversation" / "No messages yet")
//     were bare <p> tags with no icon, color, or centering. Now match
//     the empty-state pattern already established on every other
//     reshaped page (icon + centered text).
// Send button's plain "→" replaced with a real Send (paper airplane)
// icon, verified against the real installed lucide-react first.
//
// Logic (60s polling, optimistic send + rollback, day-grouping,
// meId/isMe detection) completely untouched.

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../components/ui';

export default function AdminMessages() {
  const [threads, setThreads] = useState([]);
  const [selId, setSelId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const msgEnd = useRef(null);

  const meId = JSON.parse(localStorage.getItem('vfrb_user') || '{}')?.user_id;

  const loadThreads = useCallback(async () => {
    try {
      const r = await axios.get('/api/admin/messages');
      const data = r.data?.threads ?? r.data?.data ?? r.data ?? [];

      setThreads(data);

      if (data.length > 0 && !selId) {
        setSelId(data[0].order_id ?? data[0].id);
      }
    } catch (e) {
      console.error('Failed to load threads:', e);
    } finally {
      setLoading(false);
    }
  }, [selId]);

  const loadMsgs = useCallback(async () => {
    if (!selId) return;

    try {
      const r = await axios.get(`/api/admin/messages/${selId}`);
      setMsgs(r.data?.messages ?? r.data ?? []);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  }, [selId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    loadMsgs();
    const iv = setInterval(loadMsgs, 60000);
    return () => clearInterval(iv);
  }, [loadMsgs]);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async () => {
    if (!newMsg.trim() || !selId || sending) return;

    const optimistic = {
      _optimistic: true,
      message_id: `opt_${Date.now()}`,
      sender_id: meId,
      user_id: meId,
      role: 'staff',
      body: newMsg.trim(),
      created_at: new Date().toISOString(),
    };

    setMsgs((prev) => [...prev, optimistic]);

    const sent = newMsg.trim();
    setNewMsg('');
    setSending(true);

    try {
      await axios.post('/api/admin/messages', {
        order_id: selId,
        body: sent,
      });

      await loadMsgs();
    } catch {
      setMsgs((prev) =>
        prev.filter((m) => m.message_id !== optimistic.message_id)
      );
      setNewMsg(sent);
    } finally {
      setSending(false);
    }
  };

  const selThread = threads.find((t) => (t.order_id ?? t.id) === selId);

  return (
    <>
      <style>{`
        @keyframes msg-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes msg-spin { to { transform: rotate(360deg); } }

        .adm-msg-wrap {
          display: flex;
          gap: 16px;
          height: calc(100vh - 120px);
          font-family: var(--font);
          color: var(--ink);
        }

        .adm-msg-threads {
          width: 280px;
          flex-shrink: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xs);
        }

        .adm-msg-chat {
          flex: 1;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-xs);
        }

        @media (max-width: 767px) {
          .adm-msg-wrap {
            flex-direction: column;
            height: auto;
            gap: 10px;
          }

          .adm-msg-threads {
            width: 100%;
            max-height: 220px;
          }

          .adm-msg-chat {
            min-height: 360px;
          }
        }
      `}</style>

      <div className="adm-msg-wrap">
        {/* THREADS */}
        <div className="adm-msg-threads">
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              Messages
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '2px 0 0' }}>
              Customer conversations
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16 }}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 48,
                      borderRadius: 'var(--r-md)',
                      marginBottom: 8,
                      background:
                        'linear-gradient(90deg,var(--bg-surface) 25%,var(--border) 50%,var(--bg-surface) 75%)',
                      backgroundSize: '400px',
                      animation: 'msg-shimmer 1.4s infinite',
                    }}
                  />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                <NavIcon name="chat" size={28} color="var(--text-faint)" style={{ marginBottom: 8 }} />
                <p style={{ color: 'var(--text-faint)', fontSize: 12, margin: 0 }}>
                  No messages yet
                </p>
              </div>
            ) : (
              threads.map((t) => {
                const tid = t.order_id ?? t.id;
                const active = tid === selId;

                return (
                  <button
                    key={tid}
                    onClick={() => setSelId(tid)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: '1px solid var(--bg-surface)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: active ? 'var(--teal-50)' : 'transparent',
                      fontFamily: 'var(--font)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: active ? 'var(--teal)' : 'var(--ink)',
                        margin: 0,
                      }}
                    >
                      Order #{tid} —{' '}
                      {t.customer_name ?? t.user?.name ?? '—'}
                    </p>

                    {t.last_message && (
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-faint)',
                          margin: '3px 0 0',
                        }}
                      >
                        {t.last_message}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CHAT */}
        <div className="adm-msg-chat">
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              {selThread
                ? `Order #${selId} — ${
                    selThread.customer_name ?? selThread.user?.name ?? '—'
                  }`
                : 'Select a conversation'}
            </p>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {!selId ? (
              <div style={{ margin: 'auto', textAlign: 'center' }}>
                <NavIcon name="chat" size={32} color="var(--text-faint)" style={{ marginBottom: 8 }} />
                <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0 }}>Select a conversation</p>
              </div>
            ) : msgs.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center' }}>
                <NavIcon name="chat" size={32} color="var(--text-faint)" style={{ marginBottom: 8 }} />
                <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0 }}>No messages yet</p>
              </div>
            ) : (
              (() => {
                const items = [];
                let lastDay = null;

                msgs.forEach((m, i) => {
                  const d = m.created_at ? new Date(m.created_at) : null;
                  const key = d ? d.toLocaleDateString('en-PH') : 'unknown';

                  if (key !== lastDay) {
                    const diff = d
                      ? Math.floor((Date.now() - d.getTime()) / 86400000)
                      : -1;

                    const lbl =
                      diff === 0
                        ? 'Today'
                        : diff === 1
                        ? 'Yesterday'
                        : d
                        ? d.toLocaleDateString('en-PH', {
                            month: 'long',
                            day: 'numeric',
                          })
                        : '';

                    items.push({
                      type: 'sep',
                      key: `sep_${key}_${i}`,
                      lbl,
                    });

                    lastDay = key;
                  }

                  const isMe =
                    m.user_id === meId ||
                    m.sender_id === meId ||
                    m.role === 'staff' ||
                    m.role === 'manager';

                  items.push({
                    type: 'msg',
                    key: m.message_id ?? `msg_${i}`,
                    m,
                    isMe,
                    isOpt: !!m._optimistic,
                  });
                });

                return (
                  <AnimatePresence initial={false}>
                    {items.map((item) =>
                      item.type === 'sep' ? (
                        <div key={item.key} style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)',
                            background: 'var(--bg-surface)', padding: '3px 12px',
                            borderRadius: 'var(--r-full)', textTransform: 'uppercase',
                            letterSpacing: '.05em', fontFamily: 'var(--font)',
                          }}>{item.lbl}</span>
                        </div>
                      ) : (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{
                            opacity: item.isOpt ? 0.72 : 1,
                            y: 0,
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: item.isMe
                              ? 'flex-end'
                              : 'flex-start',
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '70%',
                              padding: '10px 14px',
                              borderRadius: 'var(--r-lg)',
                              background: item.isMe
                                ? 'linear-gradient(135deg,var(--teal),var(--teal-2))'
                                : 'var(--bg-surface)',
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                margin: 0,
                                fontFamily: 'var(--font)',
                                color: item.isMe ? '#fff' : 'var(--ink)',
                              }}
                            >
                              {item.m.body}
                            </p>
                          </div>
                        </motion.div>
                      )
                    )}
                  </AnimatePresence>
                );
              })()
            )}

            <div ref={msgEnd} />
          </div>

          {/* INPUT */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 10,
            }}
          >
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={
                selId ? 'Reply to customer…' : 'Select a conversation'
              }
              disabled={!selId}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--ink)',
                fontFamily: 'var(--font)',
                fontSize: 13,
                outline: 'none',
              }}
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={send}
              disabled={sending || !newMsg.trim() || !selId}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background:
                  sending || !newMsg.trim() || !selId
                    ? 'var(--border)'
                    : 'linear-gradient(135deg,var(--teal),var(--teal-2))',
                color: '#fff',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font)',
                cursor: sending || !newMsg.trim() || !selId ? 'not-allowed' : 'pointer',
              }}
            >
              <NavIcon name={sending ? 'loading' : 'send'} size={14} color="#fff" style={sending ? { animation: 'msg-spin .8s linear infinite' } : undefined} />
              {!sending && 'Send'}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
