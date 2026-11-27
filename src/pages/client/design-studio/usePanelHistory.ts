// Wires the pure history to the two live panel canvases. The host's top-bar undo and redo drive it through the workspace handle.
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { startHistory, pushStep, moveHistory, settleStep, canUndo, canRedo, type HistoryState } from './panelHistory';
import type { PanelArt } from './studioAssets';

export interface PanelSnapshot { art: PanelArt; colors: Record<string, string>; details: Record<string, { show: boolean }> }
interface Wiring {
  ready: MutableRefObject<boolean>; tick: unknown[]; read: () => PanelSnapshot; apply: (s: PanelSnapshot) => Promise<void>;
  onChange?: (can: { undo: boolean; redo: boolean }) => void;
}

export function usePanelHistory({ ready, tick, read, apply, onChange }: Wiring) {
  const h = useRef<HistoryState | null>(null);
  const busy = useRef(false);
  const [can, setCan] = useState({ undo: false, redo: false });
  const readRef = useRef(read); readRef.current = read;
  const publish = useCallback(() => {
    const next = { undo: !!h.current && canUndo(h.current), redo: !!h.current && canRedo(h.current) };
    setCan(c => (c.undo === next.undo && c.redo === next.redo ? c : next));
  }, []);
  const record = useCallback(() => {
    if (!ready.current || busy.current) return;
    const now = JSON.stringify(readRef.current());
    h.current = h.current ? pushStep(h.current, now) : startHistory(now);
    publish();
  }, [ready, publish]);
  // A short pause groups a slider drag or a burst of typing into one step.
  useEffect(() => { const t = window.setTimeout(record, 350); return () => window.clearTimeout(t); }, tick); // eslint-disable-line react-hooks/exhaustive-deps
  const step = useCallback(async (by: -1 | 1) => {
    if (busy.current) return;
    record(); // a change still waiting for its pause is a step of its own
    const next = h.current && moveHistory(h.current, by);
    if (!next) return;
    busy.current = true; h.current = next;
    const target: PanelSnapshot = JSON.parse(next.stack[next.at]);
    try { await apply(target); h.current = settleStep(h.current, JSON.stringify({ ...target, art: readRef.current().art })); }
    finally { busy.current = false; publish(); }
  }, [apply, record, publish]);
  const reset = useCallback(() => { h.current = null; publish(); }, [publish]);
  useEffect(() => { onChange?.(can); }, [can.undo, can.redo]); // eslint-disable-line react-hooks/exhaustive-deps
  return { can, record, reset, undo: useCallback(() => void step(-1), [step]), redo: useCallback(() => void step(1), [step]) };
}
