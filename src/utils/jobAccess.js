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

export function canAccessArea(user, area) {
  if (!area) return true;
  if (user?.role === 'manager') return true;
  return (JOB_FUNCTION_AREAS[user?.job_function ?? 'general'] ?? JOB_FUNCTION_AREAS.general).includes(area);
}
