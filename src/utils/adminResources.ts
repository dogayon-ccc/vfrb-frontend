// One definition per main admin list: the page loads it and the nav prefetches it on hover, focus or touch.
import axios from 'axios';
import { cacheGet, cacheSet, TTL } from './cache';

const list = (r) => r.data?.data ?? r.data ?? [];

const RESOURCES = {
  dashboard: { key: 'dashboard_stats', ttl: TTL.DASHBOARD, fetch: () => axios.get('/api/admin/dashboard').then((r) => r.data) },
  orders: {
    key: 'admin_orders_list', ttl: TTL.ORDERS,
    // Backend paginates (default 20, max 100). Ask for the max so counts aren't silently capped at 20.
    fetch: () => axios.get('/api/admin/orders', { params: { per_page: 100 } }).then((r) => ({ list: list(r), total: r.data?.total ?? list(r).length })),
  },
  users: { key: 'admin_users', ttl: TTL.USERS, fetch: () => axios.get('/api/admin/users').then(list) },
};
const ROUTES = { '/admin': 'dashboard', '/admin/dashboard': 'dashboard', '/admin/orders': 'orders', '/admin/users': 'users' };

const inflight = new Map();

// Fetches once even when a prefetch and the page ask at the same time; the result lands in the shared cache.
export function fetchResource(name) {
  const r = RESOURCES[name];
  if (!inflight.has(r.key)) {
    inflight.set(r.key, r.fetch()
      .then((data) => { cacheSet(r.key, data, r.ttl); return data; })
      .finally(() => inflight.delete(r.key)));
  }
  return inflight.get(r.key);
}

export const resourceKey = (name) => RESOURCES[name].key;

// Intent prefetch for a nav link's path; a no-op when the data is already cached or the path has no resource.
export function prefetchPath(path) {
  const name = ROUTES[path];
  if (!name || cacheGet(RESOURCES[name].key) || navigator.connection?.saveData) return;
  fetchResource(name).catch(() => {});
}
