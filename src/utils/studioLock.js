// How the Studio opens a saved design: { final: true, orderId } (attached to an order, read-only) or { warn: true }
// (saved, not ordered: confirm before the first edit). The lock is tied to the exact studio_config it was set for,
// so any other way into the Studio (new design, Order Wizard, a template) is never locked by a stale entry.
const KEY = 'studio_lock';

const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return `${s.length}:${h}`; };

export function setStudioLock(lock) {
  try {
    const raw = sessionStorage.getItem('studio_config');
    if (lock && raw) sessionStorage.setItem(KEY, JSON.stringify({ ...lock, of: hash(raw) }));
    else sessionStorage.removeItem(KEY);
  } catch { /* private mode: the design opens unlocked */ }
}

export function readStudioLock() {
  try {
    const lock = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    const raw = sessionStorage.getItem('studio_config');
    return lock && raw && lock.of === hash(raw) ? lock : null;
  } catch { return null; }
}
