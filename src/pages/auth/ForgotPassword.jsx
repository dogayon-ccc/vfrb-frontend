// Sends reset link via Mailtrap. Logic unchanged from prior version.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import AuthShell, { authInput } from '../../components/AuthShell';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post('/api/password/forgot', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset Password" subtitle="">
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 28,
        boxShadow: '0 4px 20px rgba(0,0,0,.04)' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(2,128,144,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NavIcon name="notifications" size={26} color={T}/>
              </div>
            </div>
            <h2 style={{ color: T, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Check your email!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              A password reset link has been sent to <strong style={{ color: 'var(--ink)', wordBreak: 'break-word' }}>{email}</strong>. Check your inbox in Mailtrap.
            </p>
            <p style={{ color: 'var(--text-faint)', fontSize: 12, marginBottom: 20 }}>The link expires in 60 minutes.</p>
            <button onClick={() => navigate('/login')} style={{ padding: '12px 24px', borderRadius: 11, border: 'none',
              background: `linear-gradient(135deg, ${T}, var(--teal-dark))`, color: 'var(--text-on-accent)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Enter your registered email address and we'll send you a password reset link.
            </p>
            {error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Address</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                placeholder="your@email.com" required style={authInput(focused, 'email', error)}/>
            </label>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: .98 }}
              style={{ width: '100%', height: 48, borderRadius: 12, border: 'none',
                background: loading ? 'rgba(2,128,144,.5)' : `linear-gradient(135deg, ${T}, var(--teal-dark))`,
                color: 'var(--text-on-accent)', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(2,128,144,.3)', marginBottom: 12 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </motion.button>
            <button type="button" onClick={() => navigate('/login')} style={{ width: '100%', padding: 12, borderRadius: 11,
              background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: 13,
              cursor: 'pointer', fontWeight: 500 }}>
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
