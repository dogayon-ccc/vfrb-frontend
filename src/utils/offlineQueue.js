// Generic offline-mutation queue, backed by localStorage (survives reload,
// unlike the sessionStorage-backed cache.js). Queue a write while offline,
// flush it when 'online' fires. Reusable by any page — not Dashboard-only.
const KEY = 'vfrb_offline_queue';

const read  = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const write = (q) => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {} };

export const queueSize = () => read().length;

// entry: { method, url, data? } — must be plain/serialisable, not a closure.
export const enqueue = (entry) => write([...read(), { ...entry, id: crypto.randomUUID(), ts: Date.now() }]);

// Replays every queued entry via the given axios instance. Entries that
// still fail (still offline, or a real server error) stay queued for the
// next flush; entries that succeed are dropped. Returns how many synced.
export async function flushQueue(axios) {
  const pending = read();
  if (!pending.length) return 0;
  const remaining = [];
  let synced = 0;
  for (const item of pending) {
    try { await axios({ method: item.method, url: item.url, data: item.data }); synced++; }
    catch { remaining.push(item); }
  }
  write(remaining);
  return synced;
}
