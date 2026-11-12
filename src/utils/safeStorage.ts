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
}
