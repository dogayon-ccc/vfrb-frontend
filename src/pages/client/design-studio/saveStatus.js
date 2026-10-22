// One save status for the top bar chip and the dock line, from the manual-save flags and the autosave state.
// An account save and a browser-only copy never read the same: only the account counts as "Saved".
// auto: null (nothing to save yet) | 'dirty' | 'saving' | 'saved'; saveErr: false | 'local' (browser copy kept) | 'none'.
export function saveStatus({ saving = false, saveErr = false, auto = null, draftSaved = false, saved = false }) {
  if (saving || auto === 'saving') return { tone: 'busy', short: 'Saving…', long: 'Saving…' };
  if (saveErr === 'local') return { tone: 'err', short: 'This device only', long: 'On this device only — account save failed, retry' };
  if (saveErr) return { tone: 'err', short: 'Not saved', long: 'Not saved — retry' };
  if (auto === 'dirty') return { tone: 'idle', short: 'Unsaved', long: 'Unsaved changes — autosaves shortly' };
  if (draftSaved || auto === 'saved') return { tone: 'ok', short: 'Saved', long: 'All changes saved to your account' };
  if (saved) return { tone: 'ok', short: 'This device', long: 'Saved on this device' };
  return null;
}
