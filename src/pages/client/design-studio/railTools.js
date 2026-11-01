// Photoshop-style tool rail: one letter per tool. Pure, so logic-checks can pin the key map and the active tool.
export const RAIL_TOOLS = [
  { id: 'move',   key: 'V', label: 'Move',         hint: 'Select and move design items' },
  { id: 'hand',   key: 'H', label: 'Hand',         hint: 'Pan the zoomed design (or hold Space and drag)' },
  { id: 'sample', key: 'I', label: 'Eyedropper',   hint: 'Pick a colour from the design', colour: true },
  { id: 'fill',   key: 'G', label: 'Paint bucket', hint: 'Fill a garment part with the active colour', colour: true },
  { id: 'brush',  key: 'B', label: 'Brush',        hint: 'Draw freehand in the active colour' },
  { id: 'eraser', key: 'E', label: 'Eraser',       hint: 'Erase your own drawings and uploaded art' },
  { id: 'pen',    key: 'P', label: 'Pen',          hint: 'Click for corners, drag for curves; click the first point to fill a shape; Enter, Esc or double-click to finish' },
  { id: 'line',   key: 'L', label: 'Line',         hint: 'Drag a straight line; hold Shift for 45° steps' },
  { id: 'text',   key: 'T', label: 'Text',         hint: 'Add names, slogans or numbers' },
  { id: 'shape',  key: 'U', label: 'Shapes',       hint: 'Add a shape' },
  { id: 'rect',   key: 'M', label: 'Rectangle',    hint: 'Drag to draw a rectangle in the active colour; hold Shift for a square' },
  { id: 'ellipse', key: 'O', label: 'Ellipse',     hint: 'Drag to draw an ellipse in the active colour; hold Shift for a circle' },
];
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
export const helpKey = e => e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat;

// Stroke widths shared by the Draw panel and the rail (Brush, Pen, Line); presets, not a slider, for thumbs.
export const STROKE_SIZES = [2, 5, 10];
export const STROKE_TOOLS = ['brush', 'pen', 'line'];

// Rail tools that work through canvas taps instead of selecting items.
export const PICK_TOOLS = ['sample', 'fill', 'pen', 'line', 'rect', 'ellipse'];
// Rail tools that drag out a box: the shape kinds overlayTools.makeShape builds.
export const BOX_TOOLS = ['rect', 'ellipse'];

// View toggles on the stage: Shift+G grid (G alone stays the paint bucket), R rulers. Ctrl, Cmd, Alt and held keys are left alone.
export function viewKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;
  const k = e.key?.length === 1 ? e.key.toUpperCase() : null;
  if (k === 'G' && e.shiftKey) return 'grid';
  if (k === 'R' && !e.shiftKey) return 'rulers';
  return null;
}

// A bare letter (no Ctrl, Cmd or Alt) picks its tool; Z zooms in and Alt+Z out; Escape returns to Move. View keys never pick a tool.
export function railKey(e) {
  if (e.ctrlKey || e.metaKey || e.repeat || viewKey(e)) return null;
  const k = e.key?.length === 1 ? e.key.toUpperCase() : e.key;
  if (k === 'Z') return e.altKey ? 'zoom-out' : 'zoom-in';
  if (e.altKey) return null;
  if (k === 'Escape') return 'move';
  return BY_KEY[k] ?? null;
}

// The tool the rail shows as active, from the Studio's own state (no second copy of it).
export function activeRail({ hand, pick, tool, erasing }) {
  if (hand) return 'hand';
  if (pick) return pick;
  if (tool === 'draw') return erasing ? 'eraser' : 'brush';
  return 'move';
}
