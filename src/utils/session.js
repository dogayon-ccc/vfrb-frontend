import axios from 'axios';
import { sessionWipeAll } from './cache';
import { clearQueue } from './offlineQueue';

const TOKEN = 'vfrb_token';
const USER  = 'vfrb_user';
const SERVER_ERROR = 'Something went wrong on our side. Please try again.';
const AUTH_CALLS = ['/api/login', '/api/register', '/api/logout', '/api/forgot-password', '/api/reset-password', '/api/password/forgot', '/api/password/reset'];
const LOGGED_OUT_PAGES = ['/login', '/register', '/forgot-password', '/reset-password', '/admin/login'];

// The token, cached user, tab-scoped drafts/caches and the offline queue all belong to one account.
export function clearSession() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
  delete axios.defaults.headers.common.Authorization;
  sessionWipeAll();
  clearQueue();
}

// The token is passed explicitly because clearSession removes it before the request is dispatched.
export function signOut() {
  const tok = localStorage.getItem(TOKEN);
  axios.post('/api/logout', {}, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} }).catch(() => {});
  clearSession();
}

// Wipes leftovers from a session that ended without a clean logout (expired token, closed tab mid-draft).
export function startSession(token, user) {
  sessionWipeAll();
  clearQueue();
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(USER, JSON.stringify(user));
}

export function installResponseGuards() {
  axios.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error.response?.status;
      // Debug-mode Laravel 5xx bodies carry exception text, SQL and file paths.
      if (status >= 500) error.response.data = { message: SERVER_ERROR };
      const isAuthCall = AUTH_CALLS.some((p) => (error.config?.url || '').includes(p));
      if (status === 401 && localStorage.getItem(TOKEN) && !isAuthCall) {
        clearSession();
        if (!LOGGED_OUT_PAGES.includes(window.location.pathname)) window.location.replace('/login');
      }
      return Promise.reject(error);
    },
  );
}

// The request interceptor reads the token on every call, so another tab signing out or in as someone else
// would otherwise change whose credentials this tab's already-rendered pages use.
export function watchCrossTabSession() {
  window.addEventListener('storage', (e) => {
    if (e.key === TOKEN && e.oldValue && e.oldValue !== e.newValue) window.location.reload();
  });
}
