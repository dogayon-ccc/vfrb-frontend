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
