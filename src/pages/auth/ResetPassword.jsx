// Token comes from the email link's query params. Logic unchanged from prior version.
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import AuthShell, { authInput } from '../../components/AuthShell';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ token: '', email: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  useEffect(() => {
    setForm(f => ({ ...f, token: params.get('token') ?? '', email: params.get('email') ?? '' }));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.token || !form.email) { setError('This reset link is incomplete. Request a new one from the sign-in page.'); return; }
    if (form.password !== form.password_confirmation) { setError("Passwords don't match."); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post('/api/password/reset', form);
      setDone(true);
    } catch (err) {
      setError(!err.response ? 'Cannot reach the server. Check your connection and try again.' : err.response.data?.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Set New Password" subtitle={done ? null : "Choose a new password for your account."}>
      <div>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(2,195,154,.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NavIcon name="success" size={28} color="var(--teal-2)"/>
              </div>
            </div>
            <h2 style={{ color: T, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Password Updated!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Your password has been reset. Please log in with your new password.
            </p>
            <button onClick={() => navigate('/login')} style={{ padding: '12px 24px', borderRadius: 11, border: 'none',
              background: `linear-gradient(135deg, ${T}, var(--teal-dark))`, color: 'var(--text-on-accent)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <div id="rp-error" role="alert" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}
            {[['Email', 'email', 'email', 'your@email.com', 'username'],
              ['New Password', 'password', 'password', 'Min. 8 characters', 'new-password'],
              ['Confirm Password', 'password_confirmation', 'password', 'Repeat new password', 'new-password']].map(([label, key, type, ph, ac]) => (
              <label key={key} style={{ display: 'block', marginBottom: 14 }}>
                <span style={{ color: 'var(--ink)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</span>
                <input type={type} autoComplete={ac} aria-invalid={!!error} aria-describedby={error ? 'rp-error' : undefined} value={form[key]} placeholder={ph} onChange={e => set(key, e.target.value)}
                  onFocus={() => setFocused(key)} onBlur={() => setFocused('')} required style={authInput(focused, key, error)}/>
              </label>
            ))}
            <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: .98 }}
              style={{ width: '100%', height: 48, borderRadius: 12, border: 'none',
                background: loading ? 'rgba(2,128,144,.5)' : `linear-gradient(135deg, ${T}, var(--teal-dark))`,
                color: 'var(--text-on-accent)', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(2,128,144,.3)' }}>
              {loading ? 'Updating…' : 'Update Password'}
            </motion.button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
