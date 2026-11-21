// Photoshop-style tool rail: one letter per tool. Pure, so logic-checks can pin the key map and the active tool.
export const RAIL_TOOLS = [
  { id: 'move',   key: 'V', label: 'Move',         hint: 'Select and move design items' },
  { id: 'hand',   key: 'H', label: 'Hand',         hint: 'Pan the zoomed design (or hold Space and drag)' },
  { id: 'sample', key: 'I', label: 'Eyedropper',   hint: 'Tap a garment part to take its colour as the active colour', colour: true },
  { id: 'fill',   key: 'G', label: 'Paint bucket', hint: 'Fill a garment part with the active colour', colour: true },
  { id: 'brush',  key: 'B', label: 'Brush',        hint: 'Draw freehand in the active colour' },
  { id: 'eraser', key: 'E', label: 'Eraser',       hint: 'Erase your own drawings and uploaded art' },
  { id: 'pen',    key: 'P', label: 'Pen',          hint: 'Click for corners, drag for curves; click the first point to fill a shape; Enter, Esc or double-click to finish' },
  { id: 'line',   key: 'L', label: 'Line',         hint: 'Drag a straight line; hold Shift for 45° steps' },
  { id: 'text',   key: 'T', label: 'Text',         hint: 'Add names, slogans or numbers' },
  { id: 'shape',  key: 'U', label: 'Shape',        hint: 'Drag to draw a shape in the active colour; pick the kind in its options' },
];
// WCAG 2.1.4: single-key shortcuts can be turned off (speech input presses letters); on by default, remembered in this browser.
const KEYS_PREF = 'ds_letter_keys';
let letterKeys = true;
try { letterKeys = localStorage.getItem(KEYS_PREF) !== '0'; } catch { /* no storage: stays on for this page */ }
export const letterKeysOn = () => letterKeys;
export function setLetterKeys(on) {
  letterKeys = on;
  try { localStorage.setItem(KEYS_PREF, on ? '1' : '0'); } catch { /* still applies for this page */ }
}

const BY_KEY = Object.fromEntries(RAIL_TOOLS.map(t => [t.key, t.id]));

// Every Studio shortcut, grouped for the shortcut card and the "?" dialog: the tool letters above plus the keys the Studio,
// the stage and the rail already handle. Nothing here is a promise the code does not keep (logic-checks pins it).
export const SHORTCUTS = [
  { group: 'Tools', keys: RAIL_TOOLS.map(t => [t.key, t.label]) },
  { group: 'Edit', keys: [['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'], ['Ctrl+D', 'Duplicate'], ['Del', 'Delete'], ['Arrows', 'Nudge (Shift: 5 steps)'],
    ['Ctrl+] / [', 'Forward / backward'], ['Ctrl+Shift+L', 'Lock'], ['Ctrl+Shift+H', 'Hide'], ['Esc', 'Back to Move']] },
  { group: 'View', keys: [['Shift+G', 'Grid'], ['R', 'Rulers'], ['Z / Alt+Z', 'Zoom in / out'], ['Ctrl+0', 'Fit'], ['Space+drag', 'Pan'], ['?', 'This list']] },
  { group: 'Touch', keys: [['Pinch', 'Zoom'], ['Two-finger drag', 'Pan'], ['Double-tap', 'Fit / zoom in'], ['Two-finger tap', 'Undo']] },
];
// "?" (Shift+/ on most layouts) opens the shortcut list; never while typing or with Ctrl, Cmd or Alt.
export const helpKey = e => letterKeys && e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat;

// Stroke widths shared by the Draw panel and the rail (Brush, Pen, Line); presets, not a slider, for thumbs.
export const STROKE_SIZES = [2, 5, 10];
export const STROKE_TOOLS = ['brush', 'pen', 'line'];

// Rail tools that work through canvas taps instead of selecting items.
// The Shape tool's kinds: modes of one rail tool (picked in its options), each drawn by drag.
export const SHAPE_KINDS = [['rect', 'Rectangle'], ['ellipse', 'Ellipse'], ['triangle', 'Triangle'], ['star', 'Star'], ['polygon', 'Polygon'], ['arrow', 'Arrow']] as const;
export const BOX_TOOLS = SHAPE_KINDS.map(k => k[0]) as string[];
export const railOf = (mode: string) => (BOX_TOOLS.includes(mode) ? 'shape' : mode); // the rail button a mode belongs to
export const PICK_TOOLS = ['sample', 'fill', 'pen', 'line', ...BOX_TOOLS];
// Freehand presets: each remembers its own size, opacity and smoothing. Highlighter has flat ends and a translucent stroke.
export const BRUSH_KINDS = {
  brush:       { label: 'Brush',       layer: 'Drawing',     size: 5,  max: 40, opacity: 1,   smooth: 0.5,  cap: 'round'  },
  pencil:      { label: 'Pencil',      layer: 'Pencil',      size: 2,  max: 8,  opacity: 1,   smooth: 0.25, cap: 'round'  },
  marker:      { label: 'Marker',      layer: 'Marker',      size: 12, max: 40, opacity: 1,   smooth: 0.6,  cap: 'round'  },
  highlighter: { label: 'Highlighter', layer: 'Highlighter', size: 20, max: 60, opacity: 0.4, smooth: 0.6,  cap: 'square' },
};
export const brushKind = k => (k in BRUSH_KINDS ? k : 'brush');

// View toggles on the stage: Shift+G grid (G alone stays the paint bucket), R rulers. Ctrl, Cmd, Alt and held keys are left alone.
export function viewKey(e) {
  if (!letterKeys || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;
  const k = e.key?.length === 1 ? e.key.toUpperCase() : null;
  if (k === 'G' && e.shiftKey) return 'grid';
  if (k === 'R' && !e.shiftKey) return 'rulers';
  return null;
}

// A bare letter (no Ctrl, Cmd or Alt) picks its tool; Z zooms in and Alt+Z out; Escape returns to Move. View keys never pick a tool.
export function railKey(e) {
  if (e.ctrlKey || e.metaKey || e.repeat || viewKey(e)) return null;
  const k = e.key?.length === 1 ? e.key.toUpperCase() : e.key;
  if (!letterKeys && k !== 'Escape' && !e.altKey) return null;
  if (k === 'Z') return e.altKey ? 'zoom-out' : 'zoom-in';
  if (e.altKey) return null;
  if (k === 'Escape') return 'move';
  return BY_KEY[k] ?? null;
}

// The tool the rail shows as active, from the Studio's own state (no second copy of it).
export function activeRail({ hand, pick, tool, erasing }: any) {
  if (hand) return 'hand';
  if (pick) return pick;
  if (tool === 'draw') return erasing ? 'eraser' : 'brush';
  return 'move';
}
