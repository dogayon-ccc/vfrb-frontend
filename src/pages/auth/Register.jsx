// POST /api/register — verified fields: name, email, password, password_confirmation, contact_number, organization_name, client_type.
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import AuthShell, { authInput } from '../../components/AuthShell';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';

const CLIENT_TYPES = [
  { id: 'individual', label: 'Individual', icon: 'profile' },
  { id: 'school', label: 'School', icon: 'school' },
  { id: 'medical', label: 'Medical / Hospital', icon: 'medical' },
  { id: 'corporate', label: 'Corporate / Business', icon: 'corporate' },
];

const pwStrength = (p) => {
  if (!p) return 0;
  return [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
};
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', 'var(--danger)', '#f97316', '#eab308', 'var(--success)'];

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', password_confirmation: '',
    contact_number: '', organization_name: '', client_type: 'individual',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const strength = pwStrength(form.password);
  const firstError = (field) => errors?.[field]?.[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!agreed) { setErrors({ agreed: ['Please agree to the Terms of Service and Privacy Policy to continue.'] }); return; }
    if (form.password !== form.password_confirmation) { setErrors({ password_confirmation: ['Passwords do not match.'] }); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/register', form);
      localStorage.setItem('vfrb_token', data.token);
      localStorage.setItem('vfrb_user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      navigate(data.user?.email_verified_at || isLocalhost ? '/dashboard' : '/verify-email');
    } catch (err) {
      setErrors(err.response?.data?.errors ?? { general: [err.response?.data?.message ?? 'Registration failed. Please try again.'] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" maxWidth={420}
      subtitle={<>Already have one? <Link to="/login" style={{ color: T, fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link></>}>

      <AnimatePresence>
        {firstError('general') && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 18, overflow: 'hidden',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: 13 }}>
            {firstError('general')}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="reg-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Full Name / Institution Contact</label>
          <input id="reg-name" required value={form.name} onChange={e => set('name', e.target.value)}
            onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
            placeholder="Juan Dela Cruz" style={authInput(focused, 'name', firstError('name'))}/>
          {firstError('name') && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>{firstError('name')}</p>}
        </div>

        <div>
          <label htmlFor="reg-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Email Address</label>
          <input id="reg-email" type="email" required value={form.email} onChange={e => set('email', e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            placeholder="you@email.com" style={authInput(focused, 'email', firstError('email'))}/>
          {firstError('email') && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>{firstError('email')}</p>}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Account Type</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CLIENT_TYPES.map(ct => {
              const active = form.client_type === ct.id;
              return (
                <button key={ct.id} type="button" onClick={() => set('client_type', ct.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 11,
                    textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(2,128,144,.08)' : 'var(--bg-card)',
                    border: `1.5px solid ${active ? T : 'var(--border)'}`, color: active ? T : 'var(--ink)',
                    fontSize: 12.5, fontWeight: active ? 600 : 500 }}>
                  <NavIcon name={ct.icon} size={16} color={active ? T : 'var(--text-subtle)'}/>
                  {ct.label}
                </button>
              );
            })}
          </div>
        </div>

        {form.client_type !== 'individual' && (
          <div>
            <label htmlFor="reg-org" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Organization Name</label>
            <input id="reg-org" value={form.organization_name} onChange={e => set('organization_name', e.target.value)}
              onFocus={() => setFocused('organization_name')} onBlur={() => setFocused('')}
              placeholder="e.g. Holy Redeemer School of Calamba" style={authInput(focused, 'organization_name')}/>
          </div>
        )}

        <div>
          <label htmlFor="reg-contact" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Contact Number</label>
          <input id="reg-contact" value={form.contact_number} onChange={e => set('contact_number', e.target.value)}
            onFocus={() => setFocused('contact_number')} onBlur={() => setFocused('')}
            placeholder="09XXXXXXXXX" style={authInput(focused, 'contact_number')}/>
        </div>

        <div>
          <label htmlFor="reg-password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input id="reg-password" type={showPw ? 'text' : 'password'} required value={form.password}
              onChange={e => set('password', e.target.value)}
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              placeholder="At least 8 characters" style={{ ...authInput(focused, 'password'), paddingRight: 48 }}/>
            <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: 1, top: '50%', transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 13, color: focused === 'password' ? T : 'var(--text-faint)' }}>
              <NavIcon name={showPw ? 'hide' : 'show'} size={17}/>
            </button>
          </div>
          {form.password && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, alignItems: 'center' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= strength ? STRENGTH_COLOR[strength] : 'var(--border)' }}/>
              ))}
              <span style={{ fontSize: 10, color: STRENGTH_COLOR[strength] || 'var(--text-faint)', marginLeft: 6, minWidth: 40 }}>
                {STRENGTH_LABEL[strength]}
              </span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="reg-password-confirm" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Confirm Password</label>
          <input id="reg-password-confirm" type={showPw ? 'text' : 'password'} required value={form.password_confirmation}
            onChange={e => set('password_confirmation', e.target.value)}
            onFocus={() => setFocused('password_confirmation')} onBlur={() => setFocused('')}
            placeholder="Re-enter password" style={authInput(focused, 'password_confirmation', firstError('password_confirmation'))}/>
          {firstError('password_confirmation') && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 5 }}>{firstError('password_confirmation')}</p>}
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={agreed}
            onChange={e => { setAgreed(e.target.checked); setErrors(x => ({ ...x, agreed: undefined })); }}
            style={{ marginTop: 3, width: 16, height: 16, accentColor: T, cursor: 'pointer', flexShrink: 0 }}/>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            I agree to VFRB Enterprise's{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: T, fontWeight: 600 }}>Terms of Service</a>{' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: T, fontWeight: 600 }}>Privacy Policy</a>.
          </span>
        </label>
        {firstError('agreed') && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: -8 }}>{firstError('agreed')}</p>}

        <motion.button whileHover={{ scale: (loading || !agreed) ? 1 : 1.01 }} whileTap={{ scale: .98 }}
          type="submit" disabled={loading || !agreed}
          style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', marginTop: 4,
            background: (loading || !agreed) ? 'rgba(2,128,144,.4)' : `linear-gradient(135deg, ${T}, var(--teal-dark))`,
            color: 'var(--text-on-accent)', fontSize: 15, fontWeight: 600, cursor: (loading || !agreed) ? 'not-allowed' : 'pointer',
            boxShadow: (loading || !agreed) ? 'none' : '0 4px 20px rgba(2,128,144,.3)' }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </motion.button>
      </form>
    </AuthShell>
  );
}
