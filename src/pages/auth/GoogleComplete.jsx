// Catches token+user handoff after Google OAuth redirect, stores it, forwards to /customer.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startSession } from '../../utils/session';
import { homeFor } from '../../utils/authRoute';
import { NavIcon } from '../../components/ui/icons';
import AuthShell from '../../components/AuthShell';


export default function GoogleComplete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');
    // Scrub the token/user payload out of the URL immediately — whether this
    // succeeds or fails below, it must not linger in the address bar or
    // browser history (history entries, autocomplete, screenshots, and any
    // future Referer-sending resource on this page would all leak it).
    window.history.replaceState(null, '', window.location.pathname);
    if (!token || !userJson) { setError('Missing sign-in information. Please try signing in again.'); return; }
    try {
      const user = JSON.parse(userJson);
      // Minimal shape check — this payload arrives via a URL parameter, so
      // nothing guarantees it came from our own redirect. Reject anything
      // that doesn't look like a real account before it becomes session state.
      const validRoles = ['customer', 'staff', 'manager'];
      if (!user || typeof user !== 'object' || !user.user_id || !validRoles.includes(user.role)) {
        setError('Could not complete sign-in. Please try again.');
        return;
      }
      startSession(token, user);
      window.location.href = homeFor(user);
    } catch {
      setError('Could not complete sign-in. Please try again.');
    }
  }, [searchParams]);

  return (
    <AuthShell title={error ? 'Sign-in failed' : 'Signing you in'} subtitle={error ? null : 'Just a moment.'}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        {error ? (
          <>
            <NavIcon name="warning" size={34} color="var(--danger)"/>
            <p style={{ color: 'var(--ink)', fontSize: 14, margin: 0 }} role="alert">{error}</p>
            <button onClick={() => navigate('/login')} className="cx-btn cx-btn-p" style={{ minHeight: 46 }}>Back to Login</button>
          </>
        ) : (
          <>
            <div className="au-spin"/>
            <style>{`.au-spin{width:34px;height:34px;border:3px solid var(--teal);border-top-color:transparent;border-radius:50%;animation:au-s .7s linear infinite}@keyframes au-s{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.au-spin{animation-duration:2s}}`}</style>
          </>
        )}
      </div>
    </AuthShell>
  );
}
