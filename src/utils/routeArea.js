// Which part of the app a path belongs to: picks the loading skeleton and
// decides when the full-screen loader runs (only when the area changes).
const AUTH_PATHS   = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/auth/'];
const CLIENT_PATHS = ['/dashboard', '/my-designs', '/orders', '/order/', '/ai-materials', '/messages', '/settings', '/billing', '/help', '/profile'];

const hit = (pathname, list) => list.some(p => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));

export function areaOf(pathname) {
  if (hit(pathname, AUTH_PATHS)) return 'auth';
  if (pathname.startsWith('/design-studio')) return 'studio';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (hit(pathname, CLIENT_PATHS)) return 'app';
  return 'site';
}
