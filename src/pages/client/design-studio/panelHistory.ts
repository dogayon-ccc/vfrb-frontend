// One undo timeline for a panel garment: artwork, part colours and details change in the order the customer made them. Pure data.
export interface HistoryState { stack: string[]; at: number }
export const HISTORY_MAX_STEPS = 40;
export const HISTORY_MAX_CHARS = 24_000_000;

export const startHistory = (first: string): HistoryState => ({ stack: [first], at: 0 });

// A new step drops the redo branch; the oldest steps go first when either cap is hit. An unchanged snapshot is not a step.
export function pushStep(h: HistoryState, next: string): HistoryState {
  if (h.stack[h.at] === next) return h;
  const stack = [...h.stack.slice(0, h.at + 1), next];
  let chars = stack.reduce((n, s) => n + s.length, 0);
  while (stack.length > 2 && (stack.length > HISTORY_MAX_STEPS || chars > HISTORY_MAX_CHARS)) chars -= stack.shift()!.length;
  return { stack, at: stack.length - 1 };
}

export const canUndo = (h: HistoryState) => h.at > 0;
export const canRedo = (h: HistoryState) => h.at < h.stack.length - 1;
export const moveHistory = (h: HistoryState, by: -1 | 1): HistoryState | null =>
  (by < 0 ? canUndo(h) : canRedo(h)) ? { stack: h.stack, at: h.at + by } : null;

// The restored canvas may serialise a little differently, so it replaces the current step; otherwise it would count as an edit and drop redo.
export const settleStep = (h: HistoryState, actual: string): HistoryState => ({ at: h.at, stack: h.stack.map((s, i) => (i === h.at ? actual : s)) });
