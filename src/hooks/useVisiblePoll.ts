import { useEffect, useRef } from 'react';

// Runs fn now and every `ms` while the tab is visible; never overlaps calls; backs off after failures.
export function useVisiblePoll(fn, ms, deps = []) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let stopped = false, busy = false, fails = 0, timer = null;
    const schedule = () => {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(run, ms * Math.min(2 ** fails, 8));
    };
    const run = async () => {
      if (stopped || busy) return;
      if (document.hidden) { schedule(); return; }
      busy = true;
      try { await ref.current(); fails = 0; } catch { fails += 1; }
      busy = false;
      schedule();
    };
    const onVisible = () => { if (!document.hidden && !busy) { clearTimeout(timer); run(); } };
    document.addEventListener('visibilitychange', onVisible);
    run();
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
