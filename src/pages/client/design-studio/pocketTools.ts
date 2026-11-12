// Add-pocket presets: each pocket is a real, editable canvas layer (a Fabric group of a filled panel and its stitch lines), placed,
// resized, mirrored, duplicated and recoloured like any other layer, saved in the face's overlays. Pure geometry here (logic-checked);
// the Fabric group is built by makePocket() in overlayTools.js. Pockets are 2D only: no 3D model has pocket geometry or decals for them.

export const POCKET_KINDS = [
  { id: 'patch', label: 'Patch' },
  { id: 'flap', label: 'Flap' },
  { id: 'welt', label: 'Welt / zip' },
  { id: 'cargo', label: 'Cargo' },
  { id: 'kangaroo', label: 'Kangaroo' },
];
const LABEL = Object.fromEntries(POCKET_KINDS.map(k => [k.id, k.label]));
export const pocketLabel = kind => `${LABEL[kind] ?? 'Patch'} pocket`;
export const isPocketKind = kind => !!LABEL[kind];

const n = v => Math.round(v * 10) / 10;
const rr = (x, y, w, h, r) => `M ${n(x + r)} ${n(y)} L ${n(x + w - r)} ${n(y)} Q ${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)} L ${n(x + w)} ${n(y + h - r)} ` +
  `Q ${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} L ${n(x + r)} ${n(y + h)} Q ${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)} L ${n(x)} ${n(y + r)} Q ${n(x)} ${n(y)} ${n(x + r)} ${n(y)} Z`;
const line = (x0, y0, x1, y1) => `M ${n(x0)} ${n(y0)} L ${n(x1)} ${n(y1)}`;

// Panels (filled, in the pocket colour), stitches (dashed topstitching) and lines (solid edges: flap edge, welt lips, zip) in local units,
// origin top-left. Sizes are template units (a 320-wide top), about a real pocket's size on a size-M garment.
export function pocketGeometry(kind) {
  switch (kind) {
    case 'flap': {
      const w = 46, h = 54;
      return { w, h, panels: [rr(0, 6, w, h - 6, 3), rr(-1, 0, w + 2, 16, 2)], stitches: [rr(3, 9, w - 6, h - 12, 2), line(3, 12, w - 3, 12)],
        lines: [line(0, 16, w, 16), `M ${n(w / 2 - 1.6)} 11 a 1.6 1.6 0 1 0 3.2 0 a 1.6 1.6 0 1 0 -3.2 0`] };
    }
    case 'welt': {
      const w = 54, h = 12;
      return { w, h, panels: [rr(0, 0, w, h, 2)], stitches: [rr(2, 2, w - 4, h - 4, 1)], lines: [line(4, h / 2, w - 4, h / 2), line(w - 8, h / 2 - 3, w - 8, h / 2 + 3)] };
    }
    case 'cargo': {
      const w = 58, h = 68;
      return { w, h, panels: [rr(0, 8, w, h - 8, 3), rr(-1, 0, w + 2, 18, 2)], stitches: [rr(3, 11, w - 6, h - 14, 2), line(3, 14, w - 3, 14)],
        lines: [line(0, 18, w, 18), line(w / 2 - 8, 18, w / 2 - 8, h - 2), line(w / 2 + 8, 18, w / 2 + 8, h - 2)] };
    }
    case 'kangaroo': {
      const w = 130, h = 70;
      const body = `M 22 0 L ${w - 22} 0 Q ${w - 6} 26 ${w} ${h} L 0 ${h} Q 6 26 22 0 Z`;
      return { w, h, panels: [body], stitches: [`M 26 4 L ${w - 26} 4 M 4 ${h - 4} L ${w - 4} ${h - 4}`, `M 24 4 Q 9 28 4 ${h - 4} M ${w - 24} 4 Q ${w - 9} 28 ${w - 4} ${h - 4}`], lines: [] };
    }
    default: {
      const w = 44, h = 50;
      return { w, h, panels: [rr(0, 0, w, h, 3)], stitches: [rr(3, 3, w - 6, h - 6, 2), line(3, 8, w - 3, 8)], lines: [] };
    }
  }
}

// Where a new pocket lands, in template units: left chest on a top, the right hip on a bottom, the lower front for a kangaroo.
export function pocketSpot(kind, paths, role) {
  const w = paths?.w ?? 320, h = paths?.h ?? 380;
  if (kind === 'kangaroo') return { x: w / 2, y: h * 0.72 };
  if (role === 'bottom') return { x: w * 0.68, y: h * 0.3 };
  return { x: w * 0.36, y: h * (kind === 'welt' ? 0.33 : 0.38) };
}

// The same pocket on the other side of the garment's centre line (x in canvas units): mirrored position and flip.
export const mirroredX = (x, centreX) => 2 * centreX - x;

// Stitch colour that reads on the pocket colour: dark thread on light cloth, light thread on dark cloth.
export function stitchFor(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return 'rgba(0,0,0,.45)';
  const v = parseInt(m[1], 16), lum = 0.2126 * (v >> 16) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255);
  return lum < 110 ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.45)';
}

// One line per pocket for the spec sheet and the admin order view: "Front: Flap pocket #1b2a4a".
export function describePockets(faces) {
  const out = [];
  for (const [face, list] of Object.entries(faces ?? {})) {
    for (const o of Array.isArray(list) ? list : []) {
      if (!o || !isPocketKind(o.__pocket)) continue;
      const fill = o.__pocketColor;
      out.push(`${face[0].toUpperCase()}${face.slice(1)}: ${pocketLabel(o.__pocket)}${typeof fill === 'string' && /^#[0-9a-f]{6}$/i.test(fill) ? ` ${fill.toUpperCase()}` : ''}`);
    }
  }
  return out;
}
