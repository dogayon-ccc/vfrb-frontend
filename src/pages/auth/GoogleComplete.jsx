// src/pages/auth/GoogleComplete.jsx
// Route: /auth/google/complete
//
// Real Google Sign-In (Aug 23 2026) — this is the landing page the backend
// redirects to after AuthController::googleCallback() finishes. A full-page
// browser redirect can't set an Authorization header, so the token and
// user object are handed off via query string instead — same pattern
// VerifyEmail.jsx already uses for its own redirect-driven flow. This page
// exists only to catch that handoff, store it, and move on; it renders
// for well under a second in the normal case.
//
// Also handles the customer-only rejection path: if the backend redirected
// here instead to /login or /admin/login with ?google_error=..., this page
// is never reached at all — that's handled directly by Login.jsx reading
// its own ?google_error param. This file only deals with the success case.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif`;

export default function GoogleComplete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (!token || !userJson) {
      setError('Missing sign-in information. Please try signing in again.');
      return;
    }

    try {
      const user = JSON.parse(userJson);
      sessionStorage.setItem('vfrb_token', token);
      sessionStorage.setItem('vfrb_user', JSON.stringify(user));
      // Full navigation (not React Router push) so axios interceptors and
      // any already-mounted layout state pick up the fresh token cleanly —
      // same reasoning as the login page's own post-auth redirect.
      window.location.href = '/customer';
    } catch {
      setError('Could not complete sign-in. Please try again.');
    }
  }, [searchParams]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: '#060d1a', padding: 24, textAlign: 'center', fontFamily: FONT,
    }}>
      {error ? (
        <>
          <p style={{ fontSize: 34, margin: 0, opacity: .5 }}>⚠️</p>
          <p style={{ color: '#fff', fontSize: 14, margin: 0, maxWidth: 360 }}>{error}</p>
          <button onClick={() => navigate('/login')} style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: '#028090', color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: FONT,
          }}>
            Back to Login
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 32, height: 32, border: '3px solid #028090',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin .7s linear infinite',
          }}/>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Signing you in…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </>
      )}
    </div>
  );
}
