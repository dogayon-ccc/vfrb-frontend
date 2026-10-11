// "Try colours" on the photo's 3D reference: a colour PREVIEW only. It is never saved, never in studio_config and never sent with an
// order; VFRB produces from the customer's 2D design. Single garments take one body colour; a full set takes a Top and a Bottom colour
// split at an approximate waist (the top's hem), measured per model and kept below.

export const PREVIEW_CAPTION = "Colour preview of the photo's 3D reference. VFRB produces from your 2D design.";

// Where each full-set reference splits into Top and Bottom (node-local coordinates; every file has an identity transform).
// y: the top's hem as a fraction of the model height from the bottom, measured as the largest step up in horizontal slice area between
//    35% and 75% of the height (the top flaring over the bottom garment). Two were corrected from renders, where that step was the
//    sleeves or the bust: shirt-two-tone-gpc 0.765 -> 0.585, peplum-set-navy 0.725 -> 0.56.
// x: flat-lay scrub sets lie side by side (top left, trousers right); the split is the empty gap between them (no vertices there).
export const REF_SPLIT = {
  'scrub-set-women-vneck': { axis: 'x', at: 0.632 }, 'scrub-set-men-vneck': { axis: 'x', at: 0.672 }, 'scrub-set-housekeeping': { axis: 'x', at: 0.642 },
  'set-pinstripe-pants': { axis: 'y', at: 0.635 }, 'set-pinstripe-skirt': { axis: 'y', at: 0.485 }, 'bir-blouse-trousers-blue': { axis: 'y', at: 0.555 },
  'pantsuit-notch-short-gray': { axis: 'y', at: 0.565 }, 'polo-barong-brown': { axis: 'y', at: 0.515 }, 'blazer-double-breasted-gray': { axis: 'y', at: 0.525 },
  'blazer-pinstripe-navy': { axis: 'y', at: 0.635 }, 'blouse-roundneck-fuchsia': { axis: 'y', at: 0.585 }, 'blouse-roundneck-mustard': { axis: 'y', at: 0.605 },
  'shirt-two-tone-gpc': { axis: 'y', at: 0.585 }, 'peplum-set-navy': { axis: 'y', at: 0.56 },
};

// Zone of a vertex for the calibrated zone-mask shader: 'body' carries the Top (or the single garment), 'pocket' the Bottom.
// `box` is the mesh's bounding box ({ min, max } with x/y).
export function refZoneOf(split, box) {
  if (!split) return () => 'body';
  if (split.axis === 'x') { const cut = box.min.x + (box.max.x - box.min.x) * split.at; return (x) => (x < cut ? 'body' : 'pocket'); }
  const cut = box.min.y + (box.max.y - box.min.y) * split.at;
  return (x, y) => (y >= cut ? 'body' : 'pocket');
}
export const previewColors = ({ top, bottom }) => ({ body: top, sleeve: top, collar: top, pocket: bottom ?? top, tipping: null });
