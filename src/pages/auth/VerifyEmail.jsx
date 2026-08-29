// src/pages/auth/VerifyEmail.jsx
// Route: /verify-email
//
// CHANGES FROM ORIGINAL:
//   Now reads the ?status= query parameter set by the Laravel backend redirect.
//   After the user clicks the email link, Laravel verifies it and redirects
//   here with ?status=verified, ?status=already_verified, or ?status=invalid.
//
//   Status values:
//     (none)             → default "waiting" state — user hasn't clicked yet
//     ?status=verified   → show success + go to dashboard button
//     ?status=already_verified → show "already done" state
//     ?status=invalid    → show error + option to resend
//
//   All original functionality is preserved (resend, manual check, back to login).

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';

const TEAL = '#02C39A';

export default function VerifyEmail() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  // Read the status set by the Laravel redirect after the user clicks the link
  const verifyStatus = searchParams.get('status'); // 'verified' | 'already_verified' | 'invalid' | null

  const user    = JSON.parse(sessionStorage.getItem('vfrb_user') || '{}');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  // If the backend redirected here with ?status=verified, auto-check the user
  // record so we can update localStorage and redirect properly.
  useEffect(() => {
    if (verifyStatus === 'verified' || verifyStatus === 'already_verified') {
      // Re-fetch the user to get the fresh email_verified_at timestamp
      // and update what's stored in localStorage.
      axios.get('/api/user')
        .then(({ data }) => {
          if (data.email_verified_at) {
            sessionStorage.setItem('vfrb_user', JSON.stringify(data));
          }
        })
        .catch(() => {
          // Silently ignore — the user will manually click "Go to Dashboard"
        });
    }
  }, [verifyStatus]);

  const resend = async () => {
    setSending(true); setError(''); setSent(false);
    try {
      await axios.post('/api/email/resend');
      setSent(true);
    } catch {
      setError('Could not resend. Please try again.');
    } finally { setSending(false); }
  };

  const goToDashboard = async () => {
    try {
      const { data } = await axios.get('/api/user');
      if (data.email_verified_at) {
        sessionStorage.setItem('vfrb_user', JSON.stringify(data));
        navigate('/customer');
      } else {
        setError('Email not verified yet. Please check your inbox and click the link.');
      }
    } catch {
      setError('Session error. Please log in again.');
      navigate('/login');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('vfrb_token');
    sessionStorage.removeItem('vfrb_user');
    navigate('/login');
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const globalStyles = `
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:#06101a;margin:0;}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  `;

  const pageWrapper = {
    minHeight: '100vh', background: '#06101a',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
    color: '#fff', padding: '24px 20px',
  };

  const card = {
    width: '100%', maxWidth: 440,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20, padding: '44px 40px', textAlign: 'center',
  };

  // ── STATUS: verified ───────────────────────────────────────────────────────
  if (verifyStatus === 'verified') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={pageWrapper}>
          <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 260, borderRadius: '50%', background: `radial-gradient(ellipse,rgba(2,195,154,0.09),transparent 70%)`, pointerEvents: 'none', filter: 'blur(40px)' }}/>

          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
            <img src={logo} alt="VFRB" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: `2px solid rgba(2,195,154,0.3)` }}/>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>VFRB Enterprise</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .5 }} style={card}>
            {/* Success icon */}
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <span style={{ fontSize: 30 }}>✅</span>
            </div>
            <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
              Email Verified!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
              Your VFRB Enterprise account is now active. You can start placing orders and tracking production.
            </p>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={goToDashboard}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${TEAL},#028090)`, color: '#000', fontWeight: 700, fontSize: 14, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", boxShadow: `0 4px 20px rgba(2,195,154,0.25)` }}>
              Go to Dashboard →
            </motion.button>
          </motion.div>

          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 28 }}>
            RA 10173 · City College of Calamba · BSIT 2026
          </p>
        </div>
      </>
    );
  }

  // ── STATUS: already_verified ───────────────────────────────────────────────
  if (verifyStatus === 'already_verified') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={pageWrapper}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 20 }}>✅</span>
            <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
              Already Verified
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              Your email address has already been verified. You can sign in normally.
            </p>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={goToDashboard}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${TEAL},#028090)`, color: '#000', fontWeight: 700, fontSize: 14, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
              Go to Dashboard →
            </motion.button>
          </motion.div>
        </div>
      </>
    );
  }

  // ── STATUS: invalid ────────────────────────────────────────────────────────
  if (verifyStatus === 'invalid') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={pageWrapper}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 20 }}>⚠️</span>
            <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
              Invalid Link
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
              This verification link has expired or is invalid. Request a new one below.
            </p>
            {sent && (
              <div style={{ borderRadius: 10, padding: '11px 16px', marginBottom: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', fontSize: 13 }}>
                ✅ New verification email sent!
              </div>
            )}
            {error && (
              <div style={{ borderRadius: 10, padding: '11px 16px', marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={resend} disabled={sending}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${TEAL},#028090)`, color: '#000', fontWeight: 700, fontSize: 14, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", marginBottom: 10 }}>
              {sending ? 'Sending…' : '↺ Resend Verification Email'}
            </motion.button>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
              ← Back to login
            </button>
          </motion.div>
        </div>
      </>
    );
  }

  // ── DEFAULT: waiting state (original behavior) ─────────────────────────────
  return (
    <>
      <style>{globalStyles}</style>

      <div style={pageWrapper}>

        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, borderRadius: '50%', background: `radial-gradient(ellipse,rgba(2,195,154,0.06),transparent 70%)`, pointerEvents: 'none', filter: 'blur(40px)' }}/>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <img src={logo} alt="VFRB" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: `2px solid rgba(2,195,154,0.3)` }}/>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>VFRB Enterprise</span>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }} style={{ ...card, position: 'relative' }}>

          {/* Floating envelope */}
          <div style={{ marginBottom: 28, position: 'relative', display: 'inline-block' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid rgba(2,195,154,0.35)`, animation: 'pulse-ring 2s ease-out infinite', transform: 'scale(1.5)' }}/>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `rgba(2,195,154,0.1)`, border: `2px solid rgba(2,195,154,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 3s ease-in-out infinite', margin: '0 auto', position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: 30 }}>✉️</span>
            </div>
          </div>

          <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
            Verify your email
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.72, marginBottom: 8 }}>
            We sent a verification link to:
          </p>
          <p style={{ color: TEAL, fontSize: 15, fontWeight: 600, marginBottom: 28, wordBreak: 'break-all' }}>
            {user.email ?? 'your email address'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
            Click the link in your email to activate your account. Check your spam folder if you don't see it within a few minutes.
          </p>

          {/* Status messages */}
          <AnimatePresence>
            {sent && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ borderRadius: 10, padding: '11px 16px', marginBottom: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac', fontSize: 13 }}>
                ✅ Verification email sent! Check your inbox.
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ borderRadius: 10, padding: '11px 16px', marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13 }}>
                ⚠ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Already verified check */}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={goToDashboard}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${TEAL},#028090)`, color: '#000', fontWeight: 700, fontSize: 14, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", boxShadow: `0 4px 20px rgba(2,195,154,0.25)` }}>
              I've verified my email →
            </motion.button>

            {/* Resend */}
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={resend} disabled={sending}
              style={{ width: '100%', padding: '12px', borderRadius: 12, cursor: sending ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending ? .6 : 1 }}>
              {sending ? (
                <><svg style={{ animation: 'spin .8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Sending…</>
              ) : '↺ Resend verification email'}
            </motion.button>

            {/* Back to login */}
            <button onClick={logout}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif", marginTop: 4 }}>
              ← Back to login
            </button>
          </div>
        </motion.div>

        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 32, textAlign: 'center' }}>
          RA 10173 · City College of Calamba · BSIT 2026
        </p>
      </div>
    </>
  );
}
