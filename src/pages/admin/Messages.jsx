// src/pages/admin/AdminMessages.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const T = '#028090';
const T2 = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

export default function AdminMessages() {
  const [threads, setThreads] = useState([]);
  const [selId, setSelId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const msgEnd = useRef(null);

  const meId = JSON.parse(sessionStorage.getItem('vfrb_user') || '{}')?.user_id;

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
        @keyframes sk {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }

        .adm-msg-wrap {
          display: flex;
          gap: 16px;
          height: calc(100vh - 120px);
          font-family: ${FONT};
          color: #0f172a;
        }

        .adm-msg-threads {
          width: 280px;
          flex-shrink: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
        }

        .adm-msg-chat {
          flex: 1;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
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
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
              Messages
            </h2>
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
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
                      borderRadius: 10,
                      marginBottom: 8,
                      background:
                        'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                      backgroundSize: '400px',
                      animation: 'sk 1.4s infinite',
                    }}
                  />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, opacity: 0.3 }}>💬</p>
                <p style={{ color: '#94a3b8', fontSize: 12 }}>
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
                      borderBottom: '1px solid #f1f5f9',
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: active ? '#f0fdfa' : 'transparent',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: active ? T : '#0f172a',
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
                          color: '#94a3b8',
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
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>
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
              <p>Select a conversation</p>
            ) : msgs.length === 0 ? (
              <p>No messages yet</p>
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
                        <div key={item.key}>{item.lbl}</div>
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
                              borderRadius: 14,
                              background: item.isMe
                                ? `linear-gradient(135deg,${T},${T2})`
                                : '#f1f5f9',
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                margin: 0,
                                color: item.isMe ? '#fff' : '#0f172a',
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
              borderTop: '1px solid #e2e8f0',
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
                borderRadius: 10,
                border: '1px solid #e2e8f0',
              }}
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={send}
              disabled={sending || !newMsg.trim() || !selId}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background:
                  sending || !newMsg.trim() || !selId
                    ? '#e2e8f0'
                    : `linear-gradient(135deg,${T},${T2})`,
                color: '#fff',
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