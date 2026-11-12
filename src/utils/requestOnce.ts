// One shared GET per URL for a short window: a page can start a request early and the component that needs it
// later reuses the same promise instead of firing a second round trip (each costs ~2 s on the hosted API).
import axios from 'axios';

const inflight = new Map();

export function getOnce(url, ttl = 10_000) {
  const hit = inflight.get(url);
  if (hit && Date.now() - hit.t < ttl) return hit.p;
  const p = axios.get(url).catch((e) => { inflight.delete(url); throw e; });
  inflight.set(url, { p, t: Date.now() });
  return p;
}

export const forgetOnce = (url) => { inflight.delete(url); };
