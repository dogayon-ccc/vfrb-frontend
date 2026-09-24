// src/pages/client/design-studio/useDragPlace.js
// Press → lift → drag → drop → settle, for every panel item that can be
// placed on the canvas (garment, logo, text, shape, emoji). Uses native
// Pointer Events (one API for mouse/touch/pen — no separate touch
// handlers to keep in sync) rather than the HTML5 drag-and-drop API,
// because HTML5 DnD's drag image is OS-rendered and can't carry the
// lift/scale/shadow feedback or a spring "settle" animation on drop —
// both explicitly asked for. The source element never actually moves;
// a floating ghost (rendered by <DragGhost/>, driven by the `ghost`
// state this hook returns) follows the pointer instead, so a panel
// item inside a scrollable mobile sheet/tablet drawer never gets
// yanked out of its list mid-drag.
import { useCallback, useRef, useState } from 'react';
import { hitTestDropZone, isOverDropZone } from './dragPlace';

const DRAG_THRESHOLD = 6; // px — below this, a press is a tap/click, not a drag

export function useDragPlace(onDrop, garmentSize) {
  const [ghost, setGhost] = useState(null); // { x, y, label, preview, over, settling }
  const payload   = useRef(null);
  const pointerId = useRef(null);
  const origin    = useRef({ x: 0, y: 0 });
  const dragging  = useRef(false);

  const move = useCallback((e) => {
    if (e.pointerId !== pointerId.current) return;
    if (!dragging.current) {
      const dx = e.clientX - origin.current.x, dy = e.clientY - origin.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragging.current = true;
    }
    const over = isOverDropZone(e.clientX, e.clientY);
    setGhost(g => (g ? { ...g, x: e.clientX, y: e.clientY, over } : g));
  }, []);

  const end = useCallback((e) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);

    const w = garmentSize?.w, h = garmentSize?.h;
    const hit = dragging.current ? hitTestDropZone(e.clientX, e.clientY, w, h) : null;

    if (hit && payload.current) {
      // Settle animation: ghost eases from the release point to the exact
      // drop point, then the caller's onDrop fires and the ghost clears —
      // the real Fabric object appears once it "lands", not before.
      setGhost(g => (g ? { ...g, settling: true } : g));
      setTimeout(() => {
        onDrop(payload.current, hit);
        setGhost(null);
        payload.current = null;
      }, 140);
    } else {
      setGhost(null);
      payload.current = null;
    }
    dragging.current = false;
    pointerId.current = null;
  }, [move, onDrop, garmentSize]);

  // Attach to onPointerDown of any draggable panel item.
  const startDrag = useCallback((e, itemPayload, label, preview) => {
    if (e.button != null && e.button !== 0) return; // left button / touch only
    pointerId.current = e.pointerId;
    origin.current = { x: e.clientX, y: e.clientY };
    dragging.current = false;
    payload.current = itemPayload;
    setGhost({ x: e.clientX, y: e.clientY, label, preview, over: false, settling: false });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }, [move, end]);

  // Keyboard-accessible equivalent: Enter/Space on a focused draggable
  // item places it without requiring a pointer drag at all. Distinct
  // from a mouse click on the same element — see dragProps() below.
  const placeByKeyboard = useCallback((itemPayload) => {
    const w = garmentSize?.w ?? 0, h = garmentSize?.h ?? 0;
    onDrop(itemPayload, { x: w / 2, y: h / 2 });
  }, [onDrop, garmentSize]);

  // Spreadable props for a draggable panel item. A plain mouse click
  // (event.detail >= 1) intentionally does nothing — placement only
  // happens by completing a drag onto the canvas, per the "nothing
  // added by clicking" requirement. A keyboard activation synthesizes
  // a click with event.detail === 0, so Enter/Space still works —
  // required for keyboard-only users to reach the canvas at all.
  const dragProps = useCallback((itemPayload, label, preview) => ({
    onPointerDown: (e) => startDrag(e, itemPayload, label, preview),
    onClick: (e) => { if (e.detail === 0) placeByKeyboard(itemPayload); },
    style: { touchAction: 'none', cursor: 'grab' },
  }), [startDrag, placeByKeyboard]);

  return { ghost, startDrag, dragProps };
}
