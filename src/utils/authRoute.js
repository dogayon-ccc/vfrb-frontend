export const STAFF_ROLES = ['manager', 'staff'];

const parseUser = () => {
  try { return JSON.parse(localStorage.getItem('vfrb_user') || '{}'); } catch { return {}; }
};

export const readAuth = () => ({ token: localStorage.getItem('vfrb_token'), user: parseUser() });

export const isStaffRole = (user) => STAFF_ROLES.includes(user?.role);

export const isSignedIn = ({ token, user }) =>
  !!token && (isStaffRole(user) || user?.role === 'customer');

export const homeFor = (user) => (isStaffRole(user) ? '/admin/dashboard' : '/dashboard');
