// Colour rules: a design has one base colour on every zone, unless the real garment has its own trim (a photo base with a trim zone).
import { assetFor } from './garmentAssets';
import { luma } from './sketchLine';

export const FOLLOWS_BODY = ['collar', 'sleeve', 'pocket'];
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();

// The real garment's own trim colour (kept until the customer picks one), or null when the garment has no real trim.
export const realTrimFor = (garment, sleeve, fit) => {
  const a = garment ? assetFor(garment, sleeve, 'front', fit) : null;
  return a?.trim ? a.trimUnset ?? null : null;
};

// A new design: every zone takes the base colour; the collar takes the real trim when there is one.
export const startColors = (body, trim = null) => ({ body, collar: trim ?? body, sleeve: body, pocket: body, tipping: null });

// A new base colour also moves every zone that was following it; a zone the customer coloured on purpose stays.
export const withBody = (colors, hex) => ({
  ...colors, body: hex,
  ...Object.fromEntries(FOLLOWS_BODY.filter(z => same(colors[z], colors.body)).map(z => [z, hex])),
});

// One zone painted by the Colours panel or the paint bucket: the base colour carries the zones still following it, any other zone changes alone.
export const paintZone = (colors, zone, hex) => (zone === 'body' ? withBody(colors, hex) : { ...colors, [zone]: hex });

// Changing garment: a collar that only showed the previous garment's real trim follows the body again; a garment with a real trim gets it while the collar follows the body.
export const colorsForGarment = (colors, prevTrim, nextTrim) => {
  let collar = colors.collar;
  if (prevTrim && same(collar, prevTrim)) collar = colors.body;
  if (nextTrim && same(collar, colors.body)) collar = nextTrim;
  return collar === colors.collar ? colors : { ...colors, collar };
};

// WCAG contrast ratio of two hex colours (1 to 21), from sketchLine's relative luminance.
export const contrastRatio = (a, b) => { const [x, y] = [luma(a), luma(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// How a part reads against the body: 3:1 is the WCAG line for shapes that must be told apart.
export const contrastLabel = r => (r >= 3 ? 'Stands out' : r >= 1.6 ? 'Soft contrast' : 'Blends in');
// The text ink that reads best on a colour (names and numbers printed on it), with its ratio.
// The garment must stand out (WCAG 1.4.11): the table is whichever ground contrasts more with the body colour.
export const darkStageFor = body => (/^#[0-9a-f]{6}$/i.test(body ?? '') ? contrastRatio(body, '#1B2A4A') >= contrastRatio(body, '#F4F5F2') : true);
export const bestInk = hex => { const w = contrastRatio(hex, '#ffffff'), k = contrastRatio(hex, '#000000'); return w >= k ? { ink: '#ffffff', name: 'White', r: w } : { ink: '#000000', name: 'Black', r: k }; };
// Distinct solid colours already on the design, body first, lower-cased.
export const designPalette = colors => [...new Set(['body', 'collar', 'sleeve', 'pocket', 'tipping'].map(z => colors?.[z]).filter(c => /^#[0-9a-f]{6}$/i.test(c ?? '')).map(c => c.toLowerCase()))];
// Recent custom colours: newest first, no repeats, at most `max`.
export const pushRecent = (list, hex, max = 8) => (/^#[0-9a-f]{6}$/i.test(hex ?? '') ? [hex.toLowerCase(), ...(list ?? []).filter(c => c !== hex.toLowerCase())].slice(0, max) : list ?? []);
