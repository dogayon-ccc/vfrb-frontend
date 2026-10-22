// Undo/redo history of the customer's overlays and the garment's colours and patterns, one per garment side. Pure functions over { stack, idx } so logic-checks can test them;
// useGarmentCanvas holds the live copy in refs. Switching sides parks one side's history and resumes the other's, so neither is lost.

export const HISTORY_LIMIT = 40;

// A Studio entry: the overlays (o) and the garment's look: colours, patterns, pattern settings and detail colours, keyed (k) to the garment.
export const entry = (o = [], look = null) => ({ o, look });
export const emptyHistory = (base = entry()) => ({ stack: [base], idx: 0 });
export const lookOf = ({ garment, sleeve, fit, customKey = '', colors, patterns, patternParams, details }) =>
  ({ k: [garment, sleeve, fit, customKey].join('|'), colors: colors ?? {}, patterns: patterns ?? {}, patternParams: patternParams ?? {}, details: details ?? {} });
export const sameLook = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Brings the current entry up to the live look. A colour or pattern change on the same garment becomes its own undo step (a slider
// drag is debounced into one); a different garment only re-keys the entry, so undo never paints one garment's colours onto another.
export function syncLook(h, look, limit = HISTORY_LIMIT) {
  const cur = h.stack[h.idx];
  if (!cur || sameLook(cur.look, look)) return h;
  if (cur.look?.k !== look.k) { const stack = [...h.stack]; stack[h.idx] = entry(cur.o, look); return { stack, idx: h.idx }; }
  return pushStep(h, entry(cur.o, look), limit);
}

// The look an undo/redo should paint, or null when it is unchanged or belongs to a different garment.
export const lookToApply = (target, live) => (target?.look && target.look.k === live?.k && !sameLook(target.look, live) ? target.look : null);

// A new step drops anything that was undone, and the oldest steps past the limit.
export function pushStep(h, snapshot, limit = HISTORY_LIMIT) {
  const stack = [...h.stack.slice(0, h.idx + 1), snapshot];
  while (stack.length > limit) stack.shift();
  return { stack, idx: stack.length - 1 };
}

// dir -1 undoes, +1 redoes; null when there is nothing to step to.
export function stepHistory(h, dir) {
  const idx = h.idx + dir;
  if (idx < 0 || idx >= h.stack.length) return null;
  return { history: { stack: h.stack, idx }, snapshot: h.stack[idx] };
}

export const canStep = (h, dir) => h.idx + dir >= 0 && h.idx + dir < h.stack.length;

// Leave side `from` (parking its history) for side `to`: its parked history if it has one, else a fresh baseline of what loaded.
export function switchSide(parked, from, current, to, loaded) {
  const next = { ...parked, [from]: current };
  const resumed = next[to] ?? emptyHistory(loaded);
  delete next[to];
  return { parked: next, history: resumed };
}
