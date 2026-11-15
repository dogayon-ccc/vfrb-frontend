// A save counts only when the server returns a JSON object with no errors and the saved row's id and updated_at.
export function confirmedSave(data, idKey) {
  return !!data && typeof data === 'object' && !Array.isArray(data) && !data.errors && !data.error
    && data[idKey] != null && !!data.updated_at;
}

// Plain-language cause of a failed account save, so the retry state says what to do.
export function saveErrorReason(e: any): string {
  const st = e?.response?.status, msg = e?.response?.data?.message;
  if (!e?.response) return e?.message === 'save not confirmed' ? 'The server did not confirm the save' : 'Cannot reach the server. Check your connection';
  if (st === 401 || st === 419) return 'Your session expired. Sign in again';
  if (st === 403) return 'This account cannot save designs';
  if (st === 413 || st === 422) return typeof msg === 'string' ? `The server rejected the design: ${msg}` : 'The server rejected the design';
  if (st >= 500) return 'The server had a problem. Try again shortly';
  return typeof msg === 'string' ? msg : `Save failed (${st})`;
}

// One save status for the top bar (always shown once a garment is on the canvas), from the manual-save flags and the autosave state.
// An account save and a browser-only copy never read the same: only the account counts as "Saved".
// auto: null (nothing to save yet) | 'dirty' | 'saving' | 'saved'; saveErr: false | 'local' (browser copy kept) | 'none'.
export function saveStatus({ saving = false, saveErr = false, auto = null, draftSaved = false, saved = false }: any) {
  if (saving || auto === 'saving') return { tone: 'busy', short: 'Saving…', long: 'Saving…' };
  if (saveErr === 'local') return { tone: 'err', short: 'Saved on this device', long: 'Saved on this device. Account save failed, retry' };
  if (saveErr) return { tone: 'err', short: 'Not saved', long: 'Not saved. Retry' };
  if (auto === 'dirty') return { tone: 'idle', short: 'Unsaved', long: 'Unsaved changes, autosaves shortly' };
  if (draftSaved || auto === 'saved') return { tone: 'ok', short: 'Saved', long: 'All changes saved to your account' };
  if (saved) return { tone: 'ok', short: 'Saved on this device', long: 'Saved on this device' };
  return { tone: 'idle', short: 'Unsaved', long: 'Not saved to your account yet' };
}
