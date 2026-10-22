// Admin portal access. UI mirror only; the server is the enforcement point.
export function readAdminUser() {
  try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; }
}

// Owner: read-only admin. Mirrors backend OwnerReadOnly::AREAS (GET only; every write is refused with 403).
// Keys are the first path segment after /admin/; 'invoice' is the page that reads the orders API.
export const OWNER_PAGES = ['dashboard', 'orders', 'reports', 'transactions', 'invoice', 'inventory', 'materials', 'activity-log', 'audit-logs'];
export const isOwner = (user = readAdminUser()) => user?.role === 'owner';
export const ownerCanOpen = (path) => OWNER_PAGES.includes(String(path).replace(/^\/admin\/?/, '').split(/[/?#]/)[0] || 'dashboard');
// Only the Administrator (Manager) writes; the Owner reads.
export const isAdmin = (user = readAdminUser()) => user?.role === 'manager';

export function canAccessArea(user, area) {
  if (!area || isAdmin(user)) return true;
  return isOwner(user) && area === 'inventory';
}
