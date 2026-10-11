export const HANDOFF_KEYS = ['studio_config', 'studio_preview', 'studio_from_draft'];

export function stashStudioConfig(snap, { fromDraft = false } = {}) {
  const write = (cfg) => {
    sessionStorage.setItem('studio_config', JSON.stringify(cfg));
    if (fromDraft) sessionStorage.setItem('studio_from_draft', '1');
  };
  try { write(snap); return { ok: true, previewKept: !!snap.previewPng }; } catch { /* quota */ }
  try { const { previewPng, ...rest } = snap; write(rest); return { ok: true, previewKept: false }; } catch { return { ok: false, previewKept: false }; }
}

export const clearStudioHandoff = () => HANDOFF_KEYS.forEach(k => { try { sessionStorage.removeItem(k); } catch { /* storage blocked */ } });

// Identity of a design for "is the account draft the design that was just ordered?".
// Survives the Laravel JSON round trip: key order, null-valued keys, {} vs [] and float formatting are normalised,
// and preview images are ignored (they are a rendering of the design, not the design).
const canon = v => {
  if (Array.isArray(v)) v = Object.fromEntries(v.map((x, i) => [i, x]));
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] != null && k !== 'previewPng').sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return typeof v === 'number' ? String(+v.toPrecision(12)) : JSON.stringify(v ?? null);
};
export function draftFingerprint(snap) {
  if (!snap || typeof snap !== 'object') return null;
  const s = canon(snap);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57; // cyrb53
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ':' + s.length;
}
