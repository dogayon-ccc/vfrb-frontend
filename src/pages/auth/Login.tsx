// Light mobile-first theme (Design Studio only stays dark). Logic unchanged from prior version.
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ViewLink as Link } from '../../components/ViewLink';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { startSession } from '../../utils/session';
import { isStaffRole } from '../../utils/authRoute';
import { peekStudioCategory } from '../../utils/studioIntent';
import AuthShell, { Field, PasswordField, FormError, SubmitBtn } from '../../components/AuthShell';
import { CONTACT } from '../../components/site/config';
import RequestAccess from './RequestAccess';

const CONTACT_LINK = { display: 'inline', padding: '12px 0', fontWeight: 700, color: 'var(--teal-dark)' }; // inline padding: a 44px tap area that does not stretch the sentence's lines

const VERIFY_DELAY_MS = 1800;
const GOOGLE_ON = import.meta.env.VITE_GOOGLE_LOGIN !== 'false';

const throttledText = (headers) => {
  const secs = Number(headers?.['retry-after']);
  return secs > 0 ? `Too many tries. Wait ${secs} seconds and try again.` : 'Too many tries. Wait a minute and try again.';
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetSuccess = location.state?.resetSuccess === true;

  const [form, setForm] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState({});
  const [ask, setAsk] = useState(location.hash === '#request-access');
  const [notice, setNotice] = useState('');
  const verifyTimer = useRef();
  const askRef = useRef(null);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); setError(''); };

  useEffect(() => { if (location.hash === '#request-access') askRef.current?.scrollIntoView({ block: 'start' }); }, [location.hash]);

  useEffect(() => {
    const googleError = searchParams.get('google_error');
    if (!googleError) return;
    setError(googleError);
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('google_error'); return n; }, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => () => clearTimeout(verifyTimer.current), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = { login: form.login.trim() ? '' : 'Enter your username or email.', password: form.password.trim() ? '' : 'Enter your password.' };
    setErrs(next);
    if (next.login || next.password) return;
    setLoading(true); setError('');
    try {
      const { data } = await axios.post('/api/login', form);
      if (!isStaffRole(data.user) && !data.user.email_verified_at) {
        // Session starts with the redirect so GuestOnly cannot bounce the page before the note shows.
        setNotice('Your email is not verified yet. Taking you to the verification page…');
        verifyTimer.current = setTimeout(() => { startSession(data.token, data.user); navigate('/verify-email'); }, VERIFY_DELAY_MS);
        return;
      }
      startSession(data.token, data.user);
      navigate(isStaffRole(data.user) ? '/admin/dashboard' : peekStudioCategory() ? '/design-studio' : '/dashboard'); // a landing tile resumes in the Studio
    } catch (err) {
      const st = err.response?.status;
      setError(
        !err.response ? 'Cannot reach the server. Check your connection and that the backend is running.'
        : st === 429 ? throttledText(err.response.headers)
        : st === 404 ? 'Server endpoint not found (404). The backend is not reachable at this address.'
        : st >= 500 ? 'The server had a problem. Please try again.'
        : err.response.data?.message ?? 'Invalid username/email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google/redirect`;
  };

  return (
    <AuthShell variant="split" maxWidth={440} title="Sign in" subtitle="Sign in to track your orders and manage your account.">
      <AnimatePresence>
        {resetSuccess && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16, overflow: 'hidden',
              background: 'rgba(22,101,52,.08)', border: '1px solid rgba(22,101,52,.2)', color: 'var(--success)', fontSize: 13 }}>
            Password reset successfully. Please sign in.
          </motion.div>
        )}
      </AnimatePresence>

      {notice && (
        <p role="status" style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 16, background: 'var(--teal-50)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.5 }}>
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field id="login-email" label="Username or email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required
          value={form.login} onChange={e => set('login', e.target.value)} placeholder="username or you@company.com" error={errs.login}/>
        <PasswordField id="login-password" label="Password" autoComplete="current-password" required value={form.password}
          onChange={e => set('password', e.target.value)} placeholder="Enter your password" error={errs.password}
          aside={<Link to="/forgot-password" className="au-aside">Forgot password?</Link>}/>
        <FormError msg={error}/>
        <SubmitBtn loading={loading} disabled={!!notice} busy="Signing in…">Sign in</SubmitBtn>
      </form>

      {GOOGLE_ON && <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      <button type="button" onClick={handleGoogle} style={{ width: '100%', minHeight: 54, padding: 13, borderRadius: 14, border: '1.5px solid var(--border-strong)',
        background: 'var(--bg-card)', color: 'var(--ink)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>
      </>}

      <div style={{ textAlign: 'center', fontSize: 15, color: 'var(--text-muted)', marginTop: 28 }}>
        No account?{' '}
        <button type="button" onClick={() => setAsk(v => !v)} aria-expanded={ask} aria-controls="request-access"
          style={{ ...CONTACT_LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44, border: 'none', background: 'none', padding: 0, fontSize: 15, cursor: 'pointer' }}>Request access</button>
      </div>
      <div id="request-access" ref={askRef} style={{ scrollMarginTop: 16 }}>
        <AnimatePresence initial={false}>
          {ask && <motion.div key="ra" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }} style={{ overflow: 'hidden', margin: '0 -6px' }}><div style={{ padding: '12px 6px 6px' }}><RequestAccess/></div></motion.div>}
        </AnimatePresence>
      </div>

      <p style={{ textAlign: 'center', fontSize: 15, color: 'var(--text-muted)', marginTop: 20 }}>
        Or{' '}
        <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" style={CONTACT_LINK}>Message us on Facebook</a>
        {' '}or call <a href={CONTACT.phoneHref} style={{ ...CONTACT_LINK, whiteSpace: 'nowrap' }}>{CONTACT.phone}</a> and we will set one up for you.
      </p>
      <nav aria-label="Legal" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 20, marginTop: 12, fontSize: 14 }}>
        <Link to="/privacy" style={{ ...CONTACT_LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Privacy Policy</Link>
        <Link to="/terms" style={{ ...CONTACT_LINK, display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>Terms of Service</Link>
      </nav>
    </AuthShell>
  );
}
