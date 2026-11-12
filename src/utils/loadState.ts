// A settled request that failed for a reason other than "not there" (404) or "not yours" (403): network loss, timeout or a 5xx.
// Pages show a retryable error for these instead of an empty or "not found" state, and never cache the failure.
export const fetchFailed = (settled) =>
  settled?.status === 'rejected' && ![403, 404].includes(settled.reason?.response?.status);
