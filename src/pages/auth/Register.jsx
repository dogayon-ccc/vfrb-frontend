// POST /api/register — verified fields: name, username, email, password, password_confirmation, contact_number, organization_name, business_registration_number (optional), client_type.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewLink as Link } from '../../components/ViewLink';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { startSession } from '../../utils/session';
import AuthShell, { authInput, fieldA11y, FieldError } from '../../components/AuthShell';
import { NavIcon } from '../../components/ui/icons';

const T = 'var(--teal)';

const CLIENT_TYPES = [
  { id: 'corporate', label: 'Private company', icon: 'corporate' },
  { id: 'school', label: 'School / University', icon: 'school' },
  { id: 'government', label: 'Government agency / LGU', icon: 'manager' },
  { id: 'medical', label: 'Hospital / Medical center', icon: 'medical' },
  { id: 'organization', label: 'Organization / Association', icon: 'users' },
];

const pwStrength = (p) => {
  if (!p) return 0;
  return [p.length >= 8, /[A-Z]/.test(p) && /[a-z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
};
const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLOR = ['', 'var(--danger)', '#f97316', '#eab308', 'var(--success)'];

export default function CustomerRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '', password_confirmation: '',
    contact_number: '', organization_name: '', business_registration_number: '', client_type: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focused, setFocused] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const strength = pwStrength(form.password);
  const firstError = (field) => errors?.[field]?.[0];
  const SHOWN = ['name', 'username', 'email', 'client_type', 'organization_name', 'business_registration_number', 'contact_number', 'password', 'password_confirmation', 'agreed', 'general'];
  const stray = Object.keys(errors).find(k => !SHOWN.includes(k) && errors[k]);
  const general = firstError('general') ?? (stray ? firstError(stray) : undefined);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!/^[A-Za-z0-9._]{3,30}$/.test(form.username.trim())) { setErrors({ username: ['Use 3-30 letters, numbers, dots or underscores.'] }); return; }
    if (!form.client_type) { setErrors({ client_type: ['Select your organization type.'] }); return; }
    if (!form.organization_name.trim()) { setErrors({ organization_name: ['Enter your organization name.'] }); return; }
    if (!agreed) { setErrors({ agreed: ['Please agree to the Terms of Service and Privacy Policy to continue.'] }); return; }
    if (pwStrength(form.password) < 4) { setErrors({ password: ['Use at least 8 characters with an uppercase letter, a number and a symbol.'] }); return; }
    if (form.password !== form.password_confirmation) { setErrors({ password_confirmation: ['Passwords do not match.'] }); return; }
    setLoading(true);
    try {
      const { data } = await axios.post('/api/register', form);
      startSession(data.token, data.user);
      navigate(data.user?.email_verified_at ? '/dashboard' : '/verify-email');
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
        {general && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            role="alert" style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 18, overflow: 'hidden',
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: 13 }}>
            {general}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="reg-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Full Name / Institution Contact</label>
          <input id="reg-name" {...fieldA11y('reg-name', firstError('name'))} autoComplete="name" required value={form.name} onChange={e => set('name', e.target.value)}
            onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
            placeholder="Juan Dela Cruz" style={authInput(focused, 'name', firstError('name'))}/>
          <FieldError id="reg-name" msg={firstError('name')}/>
        </div>

        <div>
          <label htmlFor="reg-username" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Username</label>
          <input id="reg-username" {...fieldA11y('reg-username', firstError('username'))} autoComplete="username" autoCapitalize="none" spellCheck={false} required
            maxLength={30} value={form.username} onChange={e => set('username', e.target.value)}
            onFocus={() => setFocused('username')} onBlur={() => setFocused('')}
            placeholder="e.g. juan.delacruz" style={authInput(focused, 'username', firstError('username'))}/>
          <FieldError id="reg-username" msg={firstError('username')}/>
        </div>

        <div>
          <label htmlFor="reg-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Email Address</label>
          <input id="reg-email" {...fieldA11y('reg-email', firstError('email'))} type="email" autoComplete="email" required value={form.email} onChange={e => set('email', e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            placeholder="you@email.com" style={authInput(focused, 'email', firstError('email'))}/>
          <FieldError id="reg-email" msg={firstError('email')}/>
        </div>

        <div>
          <span id="reg-type-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Organization Type</span>
          <div role="group" aria-labelledby="reg-type-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CLIENT_TYPES.map((ct, i) => {
              const active = form.client_type === ct.id;
              return (
                <button key={ct.id} type="button" onClick={() => set('client_type', ct.id)} aria-pressed={active}
                  style={{ gridColumn: i === CLIENT_TYPES.length - 1 ? '1 / -1' : undefined, minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', borderRadius: 11,
                    textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(2,128,144,.08)' : 'var(--bg-card)',
                    border: `1.5px solid ${active ? T : 'var(--border)'}`, color: active ? 'var(--teal-dark)' : 'var(--ink)',
                    fontSize: 12.5, fontWeight: active ? 600 : 500 }}>
                  <NavIcon name={ct.icon} size={16} color={active ? T : 'var(--text-subtle)'}/>
                  {ct.label}
                </button>
              );
            })}
          </div>
          <FieldError id="reg-type" msg={firstError('client_type')}/>
          <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: '8px 0 0' }}>VFRB takes bulk uniform orders from organizations only.</p>
        </div>

        <div>
          <label htmlFor="reg-org" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Organization Name</label>
          <input id="reg-org" {...fieldA11y('reg-org', firstError('organization_name'))} autoComplete="organization" required value={form.organization_name} onChange={e => set('organization_name', e.target.value)}
            onFocus={() => setFocused('organization_name')} onBlur={() => setFocused('')}
            placeholder="e.g. Holy Redeemer School of Calamba" style={authInput(focused, 'organization_name', firstError('organization_name'))}/>
          <FieldError id="reg-org" msg={firstError('organization_name')}/>
        </div>

        <div>
          <label htmlFor="reg-brn" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>TIN / Business registration no. <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional)</span></label>
          <input id="reg-brn" {...fieldA11y('reg-brn', firstError('business_registration_number'))} autoComplete="off" maxLength={30} value={form.business_registration_number} onChange={e => set('business_registration_number', e.target.value)}
            onFocus={() => setFocused('business_registration_number')} onBlur={() => setFocused('')}
            placeholder="Letters, numbers, spaces, hyphens" style={authInput(focused, 'business_registration_number', firstError('business_registration_number'))}/>
          <FieldError id="reg-brn" msg={firstError('business_registration_number')}/>
        </div>

        <div>
          <label htmlFor="reg-contact" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Contact Number</label>
          <input id="reg-contact" {...fieldA11y('reg-contact', firstError('contact_number'))} type="tel" inputMode="tel" autoComplete="tel" value={form.contact_number} onChange={e => set('contact_number', e.target.value)}
            onFocus={() => setFocused('contact_number')} onBlur={() => setFocused('')}
            placeholder="09XXXXXXXXX" style={authInput(focused, 'contact_number', firstError('contact_number'))}/>
          <FieldError id="reg-contact" msg={firstError('contact_number')}/>
        </div>

        <div>
          <label htmlFor="reg-password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input id="reg-password" {...fieldA11y('reg-password', firstError('password'))} type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={form.password}
              onChange={e => set('password', e.target.value)}
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              placeholder="8+ chars, Aa, number, symbol" style={{ ...authInput(focused, 'password'), paddingRight: 48 }}/>
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
          <FieldError id="reg-password" msg={firstError('password')}/>
        </div>

        <div>
          <label htmlFor="reg-password-confirm" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Confirm Password</label>
          <input id="reg-password-confirm" {...fieldA11y('reg-password-confirm', firstError('password_confirmation'))} type={showPw ? 'text' : 'password'} autoComplete="new-password" required value={form.password_confirmation}
            onChange={e => set('password_confirmation', e.target.value)}
            onFocus={() => setFocused('password_confirmation')} onBlur={() => setFocused('')}
            placeholder="Re-enter password" style={authInput(focused, 'password_confirmation', firstError('password_confirmation'))}/>
          <FieldError id="reg-password-confirm" msg={firstError('password_confirmation')}/>
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
        {firstError('agreed') && <p role="alert" style={{ color: 'var(--danger)', fontSize: 12, marginTop: -8 }}>{firstError('agreed')}</p>}

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
