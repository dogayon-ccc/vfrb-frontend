// Sends reset link via Mailtrap. Logic unchanged from prior version.
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { readAuth, isSignedIn, homeFor } from '../../utils/authRoute';
import { motion } from 'framer-motion';
import axios from 'axios';
import AuthShell, { authInput } from '../../components/AuthShell';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = readAuth();
  const signedIn = isSignedIn(auth);
  const backTo = signedIn ? (location.state?.from ?? homeFor(auth.user)) : '/login';
  const backLabel = !signedIn ? 'Back to Login' : location.state?.from ? 'Back to Settings' : 'Back to Dashboard';
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
      setError(!err.response ? 'Cannot reach the server. Check your connection and try again.' : err.response.data?.message ?? 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset Password" subtitle={sent ? null : "Enter your registered email address and we'll send you a password reset link."}>
      <div style={{ padding: '4px 0 0' }}>
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
              A password reset link has been sent to <strong style={{ color: 'var(--ink)', wordBreak: 'break-word' }}>{email}</strong>. Check your inbox (and spam folder).
            </p>
            <p style={{ color: 'var(--text-faint)', fontSize: 12, marginBottom: 20 }}>The link expires in 60 minutes.</p>
            <button onClick={() => navigate(backTo, { replace: true })} style={{ padding: '12px 24px', borderRadius: 11, border: 'none',
              background: `linear-gradient(135deg, ${T}, var(--teal-dark))`, color: 'var(--text-on-accent)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {backLabel}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <div id="fp-error" role="alert" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Address</span>
              <input type="email" autoComplete="email" inputMode="email" aria-invalid={!!error} aria-describedby={error ? 'fp-error' : undefined} value={email} onChange={e => setEmail(e.target.value)}
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
            <button type="button" onClick={() => navigate(backTo, { replace: true })} style={{ width: '100%', minHeight: 48, padding: 12, borderRadius: 12,
              background: 'none', border: '1.5px solid var(--border)', color: 'var(--text-muted)', fontSize: 14,
              cursor: 'pointer', fontWeight: 500 }}>
              ← {backLabel}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
