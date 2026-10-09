import axios from 'axios';
import { sessionWipeAll } from './cache';
import { clearQueue } from './offlineQueue';

const TOKEN = 'vfrb_token';
const USER  = 'vfrb_user';
const SERVER_ERROR = 'Something went wrong on our side. Please try again.';
const LEAK = /SQLSTATE|No query results for model|App\\|Illuminate\\|vendor[\\/]|\.php\b|Stack trace|Undefined (variable|array key|index)|Call to (undefined|a member)/i;
const STATUS_TEXT = { 403: 'You do not have permission to do that.', 404: 'We could not find what you were looking for.', 419: 'Your session expired. Please reload and try again.' };
const AUTH_CALLS = ['/api/login', '/api/register', '/api/logout', '/api/forgot-password', '/api/reset-password', '/api/password/forgot', '/api/password/reset'];
const LOGGED_OUT_PAGES = ['/login', '/register', '/forgot-password', '/reset-password', '/admin/login'];

// The service worker's NetworkFirst API cache is keyed by URL only, so it must not outlive the account that filled it.
export const API_CACHE_NAME = 'vfrb-api-cache';
function clearApiCache() {
  try { if ('caches' in window) caches.delete(API_CACHE_NAME).catch(() => {}); } catch {}
}

// The token, cached user, tab-scoped drafts/caches and the offline queue all belong to one account.
export function clearSession() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
  delete axios.defaults.headers.common.Authorization;
  sessionWipeAll();
  clearQueue();
  clearApiCache();
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
  clearApiCache();
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(USER, JSON.stringify(user));
}

const inflight = new Map();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Identical in-flight GETs share one request, so pages that fetch the same list together do not trip the rate limit.
function installGetDedupe() {
  const base = axios.getAdapter(axios.defaults.adapter);
  axios.defaults.adapter = (config) => {
    if ((config.method || 'get') !== 'get' || config.responseType === 'blob') return base(config);
    const key = `${localStorage.getItem(TOKEN)}|${axios.getUri(config)}`;
    if (!inflight.has(key)) {
      const p = base(config).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return inflight.get(key).then((r) => ({ ...r, config }));
  };
}

export function installResponseGuards() {
  installGetDedupe();
  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const status = error.response?.status;
      const cfg = error.config;
      if (status === 429 && cfg && (cfg.method || 'get') === 'get' && (cfg.__retry429 || 0) < 2) {
        cfg.__retry429 = (cfg.__retry429 || 0) + 1;
        const ra = Number(error.response.headers?.['retry-after']);
        await wait(Math.min(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 800 * cfg.__retry429, 4000));
        return axios(cfg);
      }
      // Debug-mode Laravel 5xx bodies carry exception text, SQL and file paths.
      if (status >= 500 && status !== 503) error.response.data = { message: SERVER_ERROR };
      else if (status >= 400 && LEAK.test(String(error.response?.data?.message ?? ''))) {
        error.response.data = { ...error.response.data, message: STATUS_TEXT[status] ?? SERVER_ERROR };
      }
      const isAuthCall = AUTH_CALLS.some((p) => (error.config?.url || '').includes(p));
      // Unverified client hit a client-only endpoint: send them to confirm their email.
      if (status === 403 && error.response?.data?.code === 'email_unverified' && window.location.pathname !== '/verify-email') {
        window.location.replace('/verify-email');
      }
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
