// Mirrors backend User::JOB_FUNCTION_AREAS / JobFunctionMiddleware (jobfn:inventory, jobfn:production).
// UI mirror only — the server is the enforcement point; this keeps a restricted account
// from landing on pages whose API calls it would be refused.
export const JOB_FUNCTION_AREAS = {
  general:    ['inventory', 'production'],
  inventory:  ['inventory'],
  production: ['production'],
  sales:      [],
};

export function readAdminUser() {
  try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; }
}

// Owner: read-only admin. Mirrors backend OwnerReadOnly::AREAS (GET only; every write is refused with 403).
// Keys are the first path segment after /admin/; 'invoice' is the page that reads the orders API.
export const OWNER_PAGES = ['dashboard', 'orders', 'reports', 'transactions', 'invoice', 'inventory', 'materials', 'activity-log'];
export const isOwner = (user = readAdminUser()) => user?.role === 'owner';
export const ownerCanOpen = (path) => OWNER_PAGES.includes(String(path).replace(/^\/admin\/?/, '').split(/[/?#]/)[0] || 'dashboard');

export function canAccessArea(user, area) {
  if (!area) return true;
  if (user?.role === 'manager') return true;
  if (isOwner(user)) return area === 'inventory';
  return (JOB_FUNCTION_AREAS[user?.job_function ?? 'general'] ?? JOB_FUNCTION_AREAS.general).includes(area);
}
