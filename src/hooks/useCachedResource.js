// Stale-while-revalidate fetch hook. Shows cached data the instant a page
// mounts (never an empty screen while an unexpired cache exists), then
// always revalidates in the background and swaps in fresh data when it
// lands. One shared implementation for every "GET + cache" call in the
// admin app, instead of a bespoke loader per page.
import { useState, useCallback, useEffect } from 'react';
import { cacheGet, cacheSet, cacheClear, cacheAge } from '../utils/cache';

export function useCachedResource(key, fetcher, ttl, { transform = (x) => x, onError } = {}) {
  const cached = cacheGet(key);
  const [data,    setData]    = useState(cached ?? null);
  const [loading, setLoading] = useState(cached === null);
  const [age,     setAge]     = useState(cacheAge(key));

  const load = useCallback(async (force = false) => {
    if (force) cacheClear(key);
    if (!cacheGet(key)) setLoading(true); // only show a spinner when there's nothing to show yet
    try {
      const res = transform(await fetcher());
      setData(res);
      cacheSet(key, res, ttl);
      setAge(0);
    } catch (e) {
      onError?.(e);
    } finally {
      setLoading(false);
    }
  }, [key, ttl]); // eslint-disable-line react-hooks/exhaustive-deps — fetcher is re-created per render by callers but never closes over changing state, so it's intentionally excluded to keep `load`'s identity (and any effect depending on it, e.g. an auto-refresh interval) stable

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [data, loading, load, age];
}
