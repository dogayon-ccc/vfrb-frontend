// Retheme (Sept 2026): was the one auth page still on var(--studio-bg) while its
// siblings moved to AuthShell's light theme. Kept as its own Shell (not AuthShell)
// since its 3 states need a custom icon badge + banners + multi-button footer that
// AuthShell's fixed title/subtitle header doesn't fit — same design tokens either way.
// Reads Laravel's ?status= redirect (verified/already_verified/invalid/none=waiting).
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';
import { NavIcon } from '../../components/ui/icons';

const TEAL = 'var(--teal)';
const FONT = 'var(--font)';
const globalStyles = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;} body{background:var(--bg);margin:0;}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .ve-card{padding:32px 24px;}
  @media(min-width:480px){.ve-card{padding:44px 40px;}}`;

function Shell({ children }) {
  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: 'var(--ink)', padding: '24px 20px' }}>
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
          <img src={logo} alt="VFRB" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', border: '2px solid rgba(2,195,154,.3)' }}/>
          <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 14 }}>VFRB Enterprise</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}
          className="ve-card"
          style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 20, textAlign: 'center', position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
          {children}
        </motion.div>
        <p style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 28 }}>RA 10173 · City College of Calamba · BSIT 2026</p>
      </div>
    </>
  );
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: `linear-gradient(135deg,var(--teal-2),${TEAL})`, color: '#fff', fontWeight: 700, fontSize: 14,
        fontFamily: FONT, boxShadow: 'var(--shadow-teal)', opacity: disabled ? .6 : 1 }}>
      {children}
    </motion.button>
  );
}

// Reuses the exact colors theme.css's own .alert-success/.alert-danger classes use —
// no new colors invented, per theme.css's own "add here first" rule.
const Banner = ({ ok, children }) => (
  <div style={{ borderRadius: 10, padding: '11px 16px', marginBottom: 16,
    background: ok ? 'var(--success-bg)' : 'var(--danger-bg)',
    border: `1px solid ${ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
    color: ok ? '#166534' : '#991b1b', fontSize: 13 }}>
    {children}
  </div>
);

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyStatus = searchParams.get('status'); // verified | already_verified | invalid | null
  const user = JSON.parse(localStorage.getItem('vfrb_user') || '{}');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (verifyStatus !== 'verified' && verifyStatus !== 'already_verified') return;
    axios.get('/api/user')
      .then(({ data }) => { if (data.email_verified_at) localStorage.setItem('vfrb_user', JSON.stringify(data)); })
      .catch(() => {});
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
      if (data.email_verified_at) { localStorage.setItem('vfrb_user', JSON.stringify(data)); navigate('/dashboard'); }
      else setError('Email not verified yet. Please check your inbox and click the link.');
    } catch {
      setError('Session error. Please log in again.');
      navigate('/login');
    }
  };

  const logout = () => { localStorage.removeItem('vfrb_token'); localStorage.removeItem('vfrb_user'); navigate('/login'); };

  if (verifyStatus === 'verified' || verifyStatus === 'already_verified') {
    const first = verifyStatus === 'verified';
    return (
      <Shell>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-bg)',
          border: '2px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <NavIcon name="success" size={30} color="var(--success)"/>
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
          {first ? 'Email Verified!' : 'Already Verified'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          {first
            ? 'Your VFRB Enterprise account is now active. You can start placing orders and tracking production.'
            : 'Your email address has already been verified. You can sign in normally.'}
        </p>
        <PrimaryBtn onClick={goToDashboard}>Go to Dashboard →</PrimaryBtn>
      </Shell>
    );
  }

  if (verifyStatus === 'invalid') {
    return (
      <Shell>
        <div style={{ marginBottom: 20, display:'flex', justifyContent:'center' }}><NavIcon name="warning" size={36} color="var(--danger)"/></div>
        <h1 style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Invalid Link</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          This verification link has expired or is invalid. Request a new one below.
        </p>
        {sent && <Banner ok><span style={{display:'inline-flex',verticalAlign:'-3px',marginRight:6}}><NavIcon name="success" size={14} color="#166534"/></span>New verification email sent!</Banner>}
        {error && <Banner><span style={{display:'inline-flex',verticalAlign:'-3px',marginRight:6}}><NavIcon name="warning" size={14} color="#991b1b"/></span>{error}</Banner>}
        <div style={{ marginBottom: 10 }}>
          <PrimaryBtn onClick={resend} disabled={sending}>{sending ? 'Sending…' : <><NavIcon name="redo" size={13} color="currentColor" style={{verticalAlign:'-2px',marginRight:5}}/>Resend Verification Email</>}</PrimaryBtn>
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', fontFamily: FONT, padding: '10px 4px' }}>
          ← Back to login
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ marginBottom: 28, position: 'relative', display: 'inline-block' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(2,195,154,.35)',
          animation: 'pulse-ring 2s ease-out infinite', transform: 'scale(1.5)' }}/>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(2,195,154,.12)', border: '2px solid rgba(2,195,154,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'float 3s ease-in-out infinite',
          margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <NavIcon name="notifications" size={30} color="var(--teal-2)"/>
        </div>
      </div>
      <h1 style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Verify your email</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.72, marginBottom: 8 }}>We sent a verification link to:</p>
      <p style={{ color: TEAL, fontSize: 15, fontWeight: 600, marginBottom: 28, wordBreak: 'break-all' }}>{user.email ?? 'your email address'}</p>
      <p style={{ color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
        Click the link in your email to activate your account. Check your spam folder if you don't see it within a few minutes.
      </p>
      <AnimatePresence>
        {sent && <Banner ok><span style={{display:'inline-flex',verticalAlign:'-3px',marginRight:6}}><NavIcon name="success" size={14} color="#166534"/></span>Verification email sent! Check your inbox.</Banner>}
        {error && <Banner><span style={{display:'inline-flex',verticalAlign:'-3px',marginRight:6}}><NavIcon name="warning" size={14} color="#991b1b"/></span>{error}</Banner>}
      </AnimatePresence>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryBtn onClick={goToDashboard}>I've verified my email →</PrimaryBtn>
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: .98 }} onClick={resend} disabled={sending}
          style={{ width: '100%', padding: 12, borderRadius: 12, cursor: sending ? 'not-allowed' : 'pointer',
            background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)',
            fontSize: 14, fontWeight: 500, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, opacity: sending ? .6 : 1 }}>
          {sending ? (
            <><svg style={{ animation: 'spin .8s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Sending…</>
          ) : '↺ Resend verification email'}
        </motion.button>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', fontFamily: FONT, marginTop: 4, padding: '10px 4px' }}>
          ← Back to login
        </button>
      </div>
    </Shell>
  );
}
