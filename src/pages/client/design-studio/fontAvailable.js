// Which FONTS entries actually render in their own face on this device.
// A face is installed when its width differs from the generic fallback on a probe string.
const PROBE = 'mmmmmmmmmmlliWWQ0123';
const GENERICS = ['serif', 'sans-serif', 'monospace'];
const SKIP = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace']);

export const primaryFamilies = (css) => css.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter((s) => s && !SKIP.has(s.toLowerCase()) && !/emoji/i.test(s));

export function isInstalled(family, ctx) {
  return GENERICS.some((g) => {
    ctx.font = `32px ${g}`;
    const base = ctx.measureText(PROBE).width;
    ctx.font = `32px "${family}", ${g}`;
    return ctx.measureText(PROBE).width !== base;
  });
}

// Entries with no named family (generic keywords only) are always kept, so the list is never empty.
export function availableFonts(fonts) {
  let ctx = null;
  try { ctx = document.createElement('canvas').getContext('2d'); } catch { /* no canvas: keep everything */ }
  if (!ctx) return fonts;
  return fonts.filter((f) => {
    const fam = primaryFamilies(f.css);
    return fam.length === 0 || fam.some((n) => isInstalled(n, ctx));
  });
}
