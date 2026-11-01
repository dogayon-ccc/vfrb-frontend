// Sends reset link via Mailtrap. Logic unchanged from prior version.
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewLink as Link, useViewNavigate } from '../../components/ViewLink';
import { readAuth, isSignedIn, homeFor } from '../../utils/authRoute';
import axios from 'axios';
import AuthShell, { AuthDone, Field, FormError, SubmitBtn } from '../../components/AuthShell';

export default function ForgotPassword() {
  const navigate = useViewNavigate();
  const location = useLocation();
  const auth = readAuth();
  const signedIn = isSignedIn(auth);
  const backTo = signedIn ? (location.state?.from ?? homeFor(auth.user)) : '/login';
  const backLabel = !signedIn ? 'Back to sign in' : location.state?.from ? 'Back to Settings' : 'Back to Dashboard';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFieldErr('Enter the email address on your account.'); return; }
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
    <AuthShell variant="split" maxWidth={440} title="Reset password" subtitle={sent ? null : "Enter your registered email address and we'll send you a password reset link."}>
      <div style={{ padding: '4px 0 0' }}>
        {sent ? (
          <AuthDone icon="notifications" title="Check your email" action={backLabel} onAction={() => navigate(backTo, { replace: true })}>
            A reset link was sent to <strong style={{ color: 'var(--ink)', wordBreak: 'break-word' }}>{email}</strong>. Check your inbox and spam folder. The link expires in 60 minutes.
          </AuthDone>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field id="fp-email" label="Email address" type="email" autoComplete="email" inputMode="email" required value={email}
              onChange={e => { setEmail(e.target.value); setFieldErr(''); setError(''); }} placeholder="email@example.com" error={fieldErr}/>
            <FormError msg={error}/>
            <SubmitBtn loading={loading} busy="Sending…">Send reset link</SubmitBtn>
            <button type="button" className="au-back-btn" onClick={() => navigate(backTo, { replace: true })}>{backLabel}</button>
            {!signedIn && <p className="au-help">No account yet? <Link to="/login#request-access" className="au-aside">Request access</Link></p>}
          </form>
        )}
      </div>
    </AuthShell>
  );
}
