// The sketch line: the ink for seams, zone edges and stitching on every vector garment (Studio canvas, GarmentSilhouette,
// GarmentThumb). Mirrors the --ds-sketch-line tokens in DesignStudioStyles.jsx; Fabric and SVG fills cannot read CSS variables.
// Dark ink on light fills, light ink on dark fills, so collar, placket, pocket, hem, cuff and drawstring lines still show when
// every zone is the same colour.
export const SKETCH_LINE = 'rgba(15,23,42,.55)';
export const SKETCH_LINE_ON_DARK = 'rgba(255,255,255,.62)';

// Relative luminance of a #rgb / #rrggbb colour; anything else (patterns, gradients, unset) counts as light.
export function luma(hex) {
  const m = typeof hex === 'string' && hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 1;
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const sketchInk = fill => (luma(fill) < 0.18 ? SKETCH_LINE_ON_DARK : SKETCH_LINE);
