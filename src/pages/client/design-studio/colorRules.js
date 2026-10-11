// Colour rules: a design has one base colour on every zone, unless the real garment has its own trim (a photo base with a trim zone).
import { assetFor } from './garmentAssets';

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

// Changing garment: a collar that only showed the previous garment's real trim follows the body again; a garment with a real trim gets it while the collar follows the body.
export const colorsForGarment = (colors, prevTrim, nextTrim) => {
  let collar = colors.collar;
  if (prevTrim && same(collar, prevTrim)) collar = colors.body;
  if (nextTrim && same(collar, colors.body)) collar = nextTrim;
  return collar === colors.collar ? colors : { ...colors, collar };
};
