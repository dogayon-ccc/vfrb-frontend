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
];
const BY_KEY = Object.fromEntries(RAIL_TOOLS.map(t => [t.key, t.id]));

// Stroke widths shared by the Draw panel and the rail (Brush, Pen, Line); presets, not a slider, for thumbs.
export const STROKE_SIZES = [2, 5, 10];
export const STROKE_TOOLS = ['brush', 'pen', 'line'];

// Rail tools that work through canvas taps instead of selecting items.
export const PICK_TOOLS = ['sample', 'fill', 'pen', 'line'];

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
