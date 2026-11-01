// Token comes from the email link's query params. Logic unchanged from prior version.
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViewNavigate } from '../../components/ViewLink';
import axios from 'axios';
import AuthShell, { AuthDone, Field, PasswordField, FormError, SubmitBtn } from '../../components/AuthShell';

export default function ResetPassword() {
  const navigate = useViewNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ token: '', email: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState({});

  useEffect(() => {
    setForm(f => ({ ...f, token: params.get('token') ?? '', email: params.get('email') ?? '' }));
  }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.token || !form.email) { setError('This reset link is incomplete. Request a new one from the sign-in page.'); return; }
    const next = { password: form.password.length < 8 ? 'Use at least 8 characters.' : '',
      password_confirmation: form.password_confirmation !== form.password ? 'This does not match the new password.' : '' };
    setErrs(next);
    if (next.password || next.password_confirmation) return;
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
    <AuthShell variant="split" maxWidth={440} title="Set a new password" subtitle={done ? null : "Choose a new password for your account."}>
      <div>
        {done ? (
          <AuthDone icon="success" title="Password updated" action="Go to sign in" onAction={() => navigate('/login')}>
            Sign in with your new password.
          </AuthDone>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field id="rp-email" label="Email" type="email" autoComplete="username" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com"/>
            <PasswordField id="rp-password" label="New password" autoComplete="new-password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="At least 8 characters" error={errs.password}/>
            <PasswordField id="rp-confirm" label="Confirm new password" autoComplete="new-password" value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} placeholder="Repeat the new password" error={errs.password_confirmation}/>
            <FormError msg={error}/>
            <SubmitBtn loading={loading} busy="Updating…">Update password</SubmitBtn>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
