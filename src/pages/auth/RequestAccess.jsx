// Public "request access" form on the Login page. Creates no account; an Administrator follows up.
import { useState } from 'react';
import axios from 'axios';
import { authInput, fieldA11y, FieldError } from '../../components/AuthShell';

const EMPTY = { name: '', organization: '', email: '', mobile: '', website: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LABEL = { display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 };
// Off-screen instead of display:none so simple bots still fill it in.
export const HONEYPOT_STYLE = { position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' };

// Only these five fields go out, never a token or cookie.
export const accessRequestConfig = ({ name, organization, email, mobile, website }) => ({
  method: 'post', url: '/api/request-access', withCredentials: false,
  data: { name: name.trim(), organization: organization.trim(), email: email.trim(), mobile: mobile.trim(), website },
});

const failText = (err) => {
  const st = err.response?.status;
  if (!err.response) return 'Cannot reach the server. Check your connection and try again.';
  if (st === 429) return 'Too many requests. Please wait a minute and try again.';
  if (st === 422) return Object.values(err.response.data?.errors ?? {})[0]?.[0] ?? 'Please check the details and try again.';
  return 'Something went wrong. Please try again.';
};

export default function RequestAccess() {
  const [form, setForm] = useState(EMPTY);
  const [focused, setFocused] = useState('');
  const [errs, setErrs] = useState({});
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const next = { name: form.name.trim() ? '' : 'Enter your name.', email: EMAIL.test(form.email.trim()) ? '' : 'Enter a valid email address.' };
    setErrs(next);
    if (next.name || next.email) return;
    setStatus('loading'); setError('');
    try {
      // Fresh instance: skips the app interceptor that attaches a saved Bearer token.
      await axios.create().request(accessRequestConfig(form));
      setStatus('sent');
    } catch (err) { setError(failText(err)); setStatus('idle'); }
  };

  if (status === 'sent') {
    return <p role="status" style={{ borderRadius: 12, padding: '14px 16px', background: 'var(--teal-50)', color: 'var(--ink)', fontSize: 15, lineHeight: 1.5 }}>
      Thank you. A VFRB administrator will contact you about your account.</p>;
  }

  const field = (k, label, props = {}) => (
    <div>
      <label htmlFor={`ra-${k}`} style={LABEL}>{label}</label>
      <input id={`ra-${k}`} value={form[k]} onChange={e => set(k, e.target.value)} onFocus={() => setFocused(k)} onBlur={() => setFocused('')}
        style={authInput(focused, k, errs[k])} {...fieldA11y(`ra-${k}`, errs[k])} {...props}/>
      <FieldError id={`ra-${k}`} msg={errs[k]}/>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
      {field('name', 'Full name', { autoComplete: 'name', required: true })}
      {field('organization', 'Organization (optional)', { autoComplete: 'organization' })}
      {field('email', 'Email', { type: 'email', autoComplete: 'email', autoCapitalize: 'none', spellCheck: false, required: true })}
      {field('mobile', 'Mobile (optional)', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' })}
      <div style={HONEYPOT_STYLE} aria-hidden="true">
        <label htmlFor="ra-website">Website</label>
        <input id="ra-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => set('website', e.target.value)}/>
      </div>
      {error && <p role="alert" style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger)' }}>{error}</p>}
      <button type="submit" disabled={status === 'loading'} style={{ width: '100%', minHeight: 52, borderRadius: 14, border: '1.5px solid var(--teal)',
        background: 'var(--bg-card)', color: 'var(--teal-dark)', fontSize: 16, fontWeight: 800, cursor: status === 'loading' ? 'not-allowed' : 'pointer' }}>
        {status === 'loading' ? 'Sending…' : 'Send request'}
      </button>
    </form>
  );
}
