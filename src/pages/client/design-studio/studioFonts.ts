// Studio text fonts: open-licence (OFL 1.1) faces self-hosted in public/fonts (licences: public/fonts/licenses,
// docs/engineering/FONT-LICENSES.md). Nothing loads at start-up: a face is fetched the first time the Text panel shows it,
// a text uses it or a saved design containing it opens. Every device then renders the same face, so the admin and the PDF
// see what the customer designed. Older designs keep their saved system-font stacks untouched (LEGACY in dsShared FONTS).

const EMOJI = `,'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji'`;

// file: public/fonts/<file>-<weight>.woff2. weights: the files that exist; any other weight snaps to the nearest one.
export const WEB_FONTS = [
  { id: 'inter',      label: 'Inter',            family: 'Inter',            file: 'inter',            cat: 'Sans',      weights: [400, 700, 900], fallback: 'sans-serif' },
  { id: 'montserrat', label: 'Montserrat',       family: 'Montserrat',       file: 'montserrat',       cat: 'Sans',      weights: [400, 700, 800], fallback: 'sans-serif' },
  { id: 'oswald',     label: 'Oswald',           family: 'Oswald',           file: 'oswald',           cat: 'Condensed', weights: [400, 700],      fallback: 'sans-serif' },
  { id: 'bebas',      label: 'Bebas Neue',       family: 'Bebas Neue',       file: 'bebas-neue',       cat: 'Display',   weights: [400],           fallback: 'sans-serif' },
  { id: 'anton',      label: 'Anton',            family: 'Anton',            file: 'anton',            cat: 'Display',   weights: [400],           fallback: 'sans-serif' },
  { id: 'graduate',   label: 'Graduate',         family: 'Graduate',         file: 'graduate',         cat: 'Varsity',   weights: [400],           fallback: 'serif' },
  { id: 'playfair',   label: 'Playfair Display', family: 'Playfair Display', file: 'playfair-display', cat: 'Serif',     weights: [400, 700],      fallback: 'serif' },
  { id: 'lora',       label: 'Lora',             family: 'Lora',             file: 'lora',             cat: 'Serif',     weights: [400, 700],      fallback: 'serif' },
  { id: 'pacifico',   label: 'Pacifico',         family: 'Pacifico',         file: 'pacifico',         cat: 'Script',    weights: [400],           fallback: 'cursive' },
  { id: 'dancing',    label: 'Dancing Script',   family: 'Dancing Script',   file: 'dancing-script',   cat: 'Script',    weights: [400, 700],      fallback: 'cursive' },
  { id: 'greatvibes', label: 'Great Vibes',      family: 'Great Vibes',      file: 'great-vibes',      cat: 'Script',    weights: [400],           fallback: 'cursive' },
  { id: 'jetbrains',  label: 'JetBrains Mono',   family: 'JetBrains Mono',   file: 'jetbrains-mono',   cat: 'Mono',      weights: [400, 700],      fallback: 'monospace' },
].map(f => ({ ...f, css: `'${f.family}', ${f.fallback}${EMOJI}` }));

const BY_FAMILY = new Map(WEB_FONTS.map(f => [f.family.toLowerCase(), f]));

// First family named in a CSS font stack ("'Bebas Neue', sans-serif, ..." -> "Bebas Neue").
export const primaryFamily = css => (css ?? '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
export const webFontFor = css => BY_FAMILY.get(primaryFamily(css).toLowerCase()) ?? null;

export const numericWeight = w => (w === 'bold' ? 700 : w === 'normal' || w == null ? 400 : Number(w) || 400);
export const nearestWeight = (font, w) => font.weights.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), font.weights[0]);
// Weight a new text starts with: bold where the face has it (uniform lettering), otherwise its only cut.
export const defaultWeight = font => (font.weights.includes(700) ? 700 : font.weights[0]);

const base = () => (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/');
export const fontUrl = (font, w) => `${base()}fonts/${font.file}-${w}.woff2`;

const loading = new Map();
// Loads one cut once. A single-cut face is registered for the whole 100-900 range so the browser never fakes a bold.
export function loadFont(css, weight = 400) {
  const font = webFontFor(css);
  if (!font || typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve(false);
  const w = nearestWeight(font, numericWeight(weight)), key = `${font.id}-${w}`;
  if (!loading.has(key)) {
    const face = new FontFace(font.family, `url(${fontUrl(font, w)}) format('woff2')`,
      { weight: font.weights.length === 1 ? '100 900' : String(w), style: 'normal', display: 'swap' });
    loading.set(key, face.load().then(f => { document.fonts.add(f); return true; }).catch(() => { loading.delete(key); return false; }));
  }
  return loading.get(key);
}

// Every regular cut, for the picker's previews (only when the Text panel opens).
export const loadFontPreviews = () => Promise.all(WEB_FONTS.map(f => loadFont(f.css, f.weights[0])));

// Fonts used by these Fabric text objects (live or plain JSON).
export const ensureFonts = objs => Promise.all((objs ?? []).filter(o => typeof o?.text === 'string').map(o => loadFont(o.fontFamily, o.fontWeight)));
