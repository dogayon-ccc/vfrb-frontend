// src/components/FeedbackWidget.jsx
// FIX (Sony Mark, Sept 10 2026): hex→var(--...) + emoji→NavIcon migration.
// This component mounts on every customer page (per its own original
// comment below) — was the highest-exposure remaining hardcoded-hex file
// in the customer lane, checked against the same theme.css tokens used
// everywhere else. Logic (submit, category state, axios call) untouched.
//
// NEW — Aug 27 2026. Floating feedback button for the customer portal.
// Mounted once in CustomerLayout.jsx, visible on every customer page.
// Submits to the same POST /api/customer/feedback built earlier —
// only the UI was missing.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from './ui/icons';

const T = 'var(--teal)';

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
      {/* Stack: mobile bottom:130 (above Studio's 58); desktop bottom:24 (Studio FAB hidden on desktop already).
          Was stacked above AIDesignChat's floating FAB (130/24) — that widget moved into Design Studio's
          right sidebar (Sept 18 2026) and no longer floats globally, so this closes the gap it left behind. */}
      <style>{`
        .fbw-fab{ position:fixed; bottom:130px; right:16px; z-index:300; }
        @media (min-width:768px){ .fbw-fab{ bottom:24px; right:24px; } }
      `}</style>
      <button
        className="fbw-fab"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        style={{
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: T, color: '#fff', fontSize: 22, cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(2,128,144,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <NavIcon name="chat" size={22} color="#fff"/>
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
              style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 22, width: 'min(400px,100%)' }}
            >
              {done ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom: 8 }}><NavIcon name="success" size={32} color="var(--success)"/></div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Thanks — we got it.</p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Send Feedback</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', margin: '0 0 14px' }}>
                    Something not working, or an idea for VFRB's system?
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[['bug', 'bug', 'Bug'], ['suggestion', 'suggestion', 'Idea'], ['other', 'chat', 'Other']].map(([v, ic, l]) => (
                      <button key={v} onClick={() => setCategory(v)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: category === v ? `1.5px solid ${T}` : '1px solid var(--border)',
                        background: category === v ? 'var(--teal-50)' : 'var(--bg-card)',
                        color: category === v ? T : 'var(--text-subtle)', cursor: 'pointer',
                      }}><NavIcon name={ic} size={12} style={{verticalAlign:'-2px',marginRight:4}}/>{l}</button>
                    ))}
                  </div>

                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)}
                    rows={4} placeholder="Tell us what happened or what you'd like to see…"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: '1px solid var(--border)', fontSize: 13, resize: 'vertical',
                      boxSizing: 'border-box', marginBottom: 8, fontFamily: 'inherit',
                    }}
                  />
                  {err && <p style={{ fontSize: 12, color: 'var(--danger)', margin: '0 0 8px' }}>{err}</p>}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setOpen(false)} style={{
                      background: 'var(--bg-surface)', color: 'var(--text-muted)', border: 'none', borderRadius: 8,
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
