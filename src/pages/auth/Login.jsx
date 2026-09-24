// Light mobile-first theme (Design Studio only stays dark). Logic unchanged from prior version.
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AuthShell, { authInput } from '../../components/AuthShell';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetSuccess = location.state?.resetSuccess === true;

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const googleError = searchParams.get('google_error');
    if (!googleError) return;
    setError(googleError);
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('google_error'); return n; }, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await axios.post('/api/login', form);
      localStorage.setItem('vfrb_token', data.token);
      localStorage.setItem('vfrb_user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      if (data.user.role === 'manager' || data.user.role === 'staff') {
        navigate('/admin/dashboard');
        return;
      }
      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      navigate(data.user.email_verified_at || isLocalhost ? '/dashboard' : '/verify-email');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google/redirect`;
  };

  return (
    <AuthShell title="Sign In" subtitle="Sign in to track your orders and manage your account.">
      <AnimatePresence>
        {resetSuccess && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16, overflow: 'hidden',
              background: 'rgba(22,101,52,.08)', border: '1px solid rgba(22,101,52,.2)', color: 'var(--success)', fontSize: 13 }}>
            Password reset successfully. Please sign in.
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="login-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Email address</label>
          <input id="login-email" type="email" value={form.email}
            onChange={e => { set('email', e.target.value); if (error) setError(''); }}
            onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            placeholder="you@hospital.gov.ph" style={authInput(focused, 'email', error)}/>
        </div>

        <div>
          <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, display: 'block' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input id="login-password" type={showPw ? 'text' : 'password'} value={form.password}
              onChange={e => { set('password', e.target.value); if (error) setError(''); }}
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              placeholder="••••••••" style={{ ...authInput(focused, 'password', error), paddingRight: 48 }}/>
            <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 1, top: '50%', transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 13, color: focused === 'password' ? T : 'var(--text-faint)' }}>
              <NavIcon name={showPw ? 'hide' : 'show'} size={18}/>
            </button>
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <NavIcon name="warning" size={14} color="var(--danger)"/>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--danger)' }}>{error}</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Link to="/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: T, textDecoration: 'none' }}>Forgot password?</Link>
          </div>
        </div>

        <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: .98 }}
          style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 15,
            color: 'var(--text-on-accent)', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            background: loading ? 'rgba(2,128,144,.5)' : `linear-gradient(135deg, ${T}, var(--teal-dark))`,
            boxShadow: loading ? 'none' : '0 4px 20px rgba(2,128,144,.3)' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </motion.button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      <button onClick={handleGoogle} style={{ width: '100%', padding: 13, borderRadius: 12, border: '1.5px solid var(--border)',
        background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 28 }}>
        No account? <Link to="/register" style={{ color: T, fontWeight: 600, textDecoration: 'none' }}>Register here →</Link>
      </p>
    </AuthShell>
  );
}
