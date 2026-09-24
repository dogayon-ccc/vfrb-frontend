// Catches token+user handoff after Google OAuth redirect, stores it, forwards to /customer.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NavIcon } from '../../components/ui/icons';

const FONT = "ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif";

export default function GoogleComplete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');
    if (!token || !userJson) { setError('Missing sign-in information. Please try signing in again.'); return; }
    try {
      const user = JSON.parse(userJson);
      localStorage.setItem('vfrb_token', token);
      localStorage.setItem('vfrb_user', JSON.stringify(user));
      window.location.href = '/dashboard';
    } catch {
      setError('Could not complete sign-in. Please try again.');
    }
  }, [searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, background: 'var(--bg)', padding: 24, textAlign: 'center', fontFamily: FONT }}>
      {error ? (
        <>
          <NavIcon name="warning" size={34} color="var(--danger)"/>
          <p style={{ color: 'var(--ink)', fontSize: 14, margin: 0, maxWidth: 360 }}>{error}</p>
          <button onClick={() => navigate('/login')} style={{ padding: '10px 22px', borderRadius: 10, border: 'none',
            background: 'var(--teal)', color: 'var(--text-on-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
            Back to Login
          </button>
        </>
      ) : (
        <>
          <div style={{ width: 32, height: 32, border: '3px solid var(--teal)', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
          <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0 }}>Signing you in…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </div>
  );
}
