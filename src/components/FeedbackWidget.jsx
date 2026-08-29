// src/components/FeedbackWidget.jsx
// NEW — Aug 27 2026. Floating feedback button for the customer portal.
// Mounted once in CustomerLayout.jsx, visible on every customer page.
// Submits to the same POST /api/customer/feedback built earlier —
// only the UI was missing.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const T = '#028090';

export default function FeedbackWidget() {
  const [open, setOpen]   = useState(false);
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);
  const [err, setErr]     = useState('');

  const submit = async () => {
    if (!message.trim()) { setErr('Please write something first.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post('/api/customer/feedback', { category, message: message.trim() });
      setDone(true);
      setMessage('');
      setTimeout(() => { setOpen(false); setDone(false); }, 1800);
    } catch {
      setErr('Could not send feedback. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          position: 'fixed', bottom: 150, right: 16, zIndex: 300,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: T, color: '#fff', fontSize: 22, cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(2,128,144,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        💬
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
              backdropFilter: 'blur(4px)', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: .95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, padding: 22, width: 'min(400px,100%)' }}
            >
              {done ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Thanks — we got it.</p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Send Feedback</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                    Something not working, or an idea for VFRB's system?
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[['bug', '🐛 Bug'], ['suggestion', '💡 Idea'], ['other', '💬 Other']].map(([v, l]) => (
                      <button key={v} onClick={() => setCategory(v)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: category === v ? `1.5px solid ${T}` : '1px solid #e2e8f0',
                        background: category === v ? `${T}12` : '#fff',
                        color: category === v ? T : '#64748b', cursor: 'pointer',
                      }}>{l}</button>
                    ))}
                  </div>

                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)}
                    rows={4} placeholder="Tell us what happened or what you'd like to see…"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical',
                      boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit',
                    }}
                  />
                  {err && <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>{err}</p>}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setOpen(false)} style={{
                      background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8,
                      padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 40,
                    }}>Cancel</button>
                    <button onClick={submit} disabled={busy} style={{
                      background: T, color: '#fff', border: 'none', borderRadius: 8,
                      padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? .6 : 1, minHeight: 40,
                    }}>{busy ? 'Sending…' : 'Send'}</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
