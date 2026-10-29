// Admin portal access. UI mirror only; the server is the enforcement point.
export function readAdminUser() {
  try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; }
}

const pageKey = (path) => String(path).replace(/^\/admin\/?/, '').split(/[/?#]/)[0] || 'dashboard';

// Owner: read-only admin. Mirrors backend OwnerReadOnly::AREAS (GET only; every write is refused with 403).
// Keys are the first path segment after /admin/; 'invoice' is the page that reads the orders API.
export const OWNER_PAGES = ['dashboard', 'orders', 'reports', 'transactions', 'invoice', 'inventory', 'materials', 'activity-log', 'audit-logs'];
export const isOwner = (user = readAdminUser()) => user?.role === 'owner';
export const ownerCanOpen = (path) => OWNER_PAGES.includes(pageKey(path));
// Only the Administrator (Manager) writes; the Owner reads.
export const isAdmin = (user = readAdminUser()) => user?.role === 'manager';

// Administrator (Station): DB role "staff" bound to one production stage. Mirrors the backend staff allow-list.
export const STAGES = ['pattern', 'segregation', 'cutting', 'sewing', 'qc', 'pressing', 'packing'];
export const STAGE_LABEL = { pattern: 'Pattern', segregation: 'Segregation', cutting: 'Cutting', sewing: 'Sewing', qc: 'QC', pressing: 'Pressing', packing: 'Packing' };
export const STATION_PAGES = ['dashboard', 'orders', 'production', 'output-log', 'qc', 'inventory', 'messages', 'settings'];
// Station sees only the Password section of Settings.
export const STATION_SETTINGS = ['password'];
export const isStation = (user = readAdminUser()) => user?.role === 'staff';
export const stationStage = (user = readAdminUser()) => (isStation(user) ? user.assigned_stage ?? null : null);
const stationCanOpen = (path, user) => { const k = pageKey(path); return STATION_PAGES.includes(k) && (k !== 'qc' || user.assigned_stage === 'qc'); };

// One check for every admin page: sidebar, page jump, dashboard links and the outlet gate.
export function canOpen(path, user = readAdminUser()) {
  if (isOwner(user)) return ownerCanOpen(path);
  if (isStation(user)) return stationCanOpen(path, user);
  return true;
}

export function roleLabel(user = readAdminUser()) {
  if (isOwner(user)) return 'Owner · view only';
  if (isStation(user)) return `Administrator (Station) · ${STAGE_LABEL[user.assigned_stage] ?? 'No stage'}`;
  return 'Administrator (Manager)';
}

export function canAccessArea(user, area) {
  if (!area || isAdmin(user)) return true;
  if (isStation(user)) return area === 'production' || area === 'inventory';
  return isOwner(user) && area === 'inventory';
}
