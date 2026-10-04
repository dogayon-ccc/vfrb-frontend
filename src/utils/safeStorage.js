const memory = () => {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => m.clear(),
  };
};

const usable = (name) => {
  try { const s = window[name]; s.setItem('__probe', '1'); s.removeItem('__probe'); return true; } catch { return false; }
};

export const storageBlocked = !usable('localStorage') || !usable('sessionStorage');

if (storageBlocked) {
  for (const name of ['localStorage', 'sessionStorage']) {
    if (!usable(name)) Object.defineProperty(window, name, { value: memory(), configurable: true });
  }
  window.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.dataset.storageBar = '';
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;padding:10px 16px;background:#7c2d12;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center';
    bar.textContent = 'Your browser is blocking site storage. You can keep working, but you will be signed out when you reload or close this tab.';
    document.body.appendChild(bar);
  });
}
