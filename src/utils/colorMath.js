// Small hex colour helpers for the appearance settings (no dependency). WCAG 2.x relative luminance and contrast.
const rgb = (hex) => { const h = String(hex).replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const toHex = (c) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };

// Moves hex toward target by p (0..1).
export const mix = (hex, target, p) => { const a = rgb(hex), b = rgb(target); return toHex(a.map((v, i) => v + (b[i] - v) * p)); };

export const luminance = (hex) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

export const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Lightest tint of hex that still carries white text at 4.5:1 (a dark-mode fill); hex itself if it already fails.
export function liftForWhiteText(hex) {
  let p = 0;
  while (p < 1 && contrast(mix(hex, '#ffffff', p + 0.01), '#ffffff') >= 4.5) p += 0.01;
  return mix(hex, '#ffffff', p);
}

// First tint of hex that reads at 4.5:1 as text on a dark surface.
export function liftForSurface(hex, surface) {
  let p = 0;
  while (p < 1 && contrast(mix(hex, '#ffffff', p), surface) < 4.5) p += 0.01;
  return mix(hex, '#ffffff', Math.min(p, 1));
}
