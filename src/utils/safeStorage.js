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
    const msg = document.createElement('span');
    msg.textContent = 'Your browser is blocking site storage. You can keep working, but you will be signed out when you reload or close this tab.';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.setAttribute('aria-label', 'Dismiss storage warning');
    close.style.cssText = 'margin-left:12px;min-height:32px;padding:0 12px;border:1px solid #fff;border-radius:6px;background:transparent;color:#fff;font:inherit;cursor:pointer';
    const hide = () => bar.remove();
    close.addEventListener('click', hide);
    bar.append(msg, close);
    document.body.appendChild(bar);
    setTimeout(hide, 12000);
  });
}
