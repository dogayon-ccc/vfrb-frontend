// src/utils/cache.js
// TASK F — Client-side session cache utility
// Backed by sessionStorage — auto-clears when browser tab closes.
// Never throws — all errors caught silently so the app works even
// if sessionStorage is unavailable (private browsing quota limits).
//
// USAGE:
//   import { cacheGet, cacheSet, cacheClear, TTL } from '../utils/cache';
//
//   const cached = cacheGet('dashboard_stats');
//   if (cached) { setData(cached); return; }
//   const { data } = await axios.get('/api/admin/dashboard');
//   cacheSet('dashboard_stats', data, TTL.DASHBOARD);
//   setData(data);
//
// CACHE KEY RULES (master prompt):
//   dashboard_stats     → 2 min  (TTL.DASHBOARD)
//   materials_list      → 5 min  (TTL.MATERIALS)
//   orders_list         → 30 sec (TTL.ORDERS)
//   notifications       → 1 min  (TTL.NOTIFICATIONS)
//   ai_recommendation   → 10 min (TTL.AI_RECOMMENDATION)
//   studio_config       → manual clear only (no TTL — use cacheClear)
//
// CACHE INVALIDATION ON MUTATIONS (master prompt):
//   Order created/updated → cacheClear('dashboard_stats', 'orders_list')
//   Material changed      → cacheClear('materials_list')
//   Notification read     → cacheClear('notifications')

const PREFIX = "vfrb_c_"; // namespace all keys

/**
 * Retrieve a cached value.
 * Returns null when: key absent, TTL expired, or JSON parse fails.
 *
 * @param {string} key
 * @returns {*} cached data or null
 */
export const cacheGet = (key) => {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
      sessionStorage.removeItem(PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

/**
 * Store a value with a TTL.
 * Silently ignores quota errors — app continues to work without cache.
 *
 * @param {string} key
 * @param {*}      data  any JSON-serialisable value
 * @param {number} ttlMs time-to-live in milliseconds
 */
export const cacheSet = (key, data, ttlMs) => {
  try {
    sessionStorage.setItem(
      PREFIX + key,
      JSON.stringify({ data, ts: Date.now(), ttl: ttlMs }),
    );
  } catch {
    // Quota exceeded or serialisation error — fail silently
  }
};

/**
 * Remove one or more cache keys immediately.
 * Call this after any mutation that changes cached data.
 *
 * @param {...string} keys
 *
 * Example:
 *   cacheClear('dashboard_stats', 'orders_list');
 */
export const cacheClear = (...keys) => {
  keys.forEach((k) => {
    try {
      sessionStorage.removeItem(PREFIX + k);
    } catch {}
  });
};

/**
 * Remove ALL vfrb cache entries (call on logout).
 */
export const cacheClearAll = () => {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
};

/**
 * Return the age of a cached entry in milliseconds.
 * Returns Infinity when the key is absent or expired.
 * Useful for showing "last updated X seconds ago".
 *
 * @param {string} key
 * @returns {number}
 */
export const cacheAge = (key) => {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return Infinity;
    const { ts, ttl } = JSON.parse(raw);
    const age = Date.now() - ts;
    return age > ttl ? Infinity : age;
  } catch {
    return Infinity;
  }
};

// ── TTL constants — import these to avoid magic numbers ──────────────────────
export const TTL = {
  DASHBOARD: 120_000, //  2 min  (master prompt: dashboard_stats)
  MATERIALS: 300_000, //  5 min  (master prompt: materials_list)
  ORDERS: 30_000, // 30 sec  (master prompt: orders_list)
  NOTIFICATIONS: 60_000, //  1 min  (master prompt: notifications)
  AI_RECOMMENDATION: 600_000, // 10 min  (master prompt: ai_recommendation)
  SUPPLIERS: 300_000, //  5 min
  USERS: 300_000, //  5 min
  REPORTS: 300_000, //  5 min
};
