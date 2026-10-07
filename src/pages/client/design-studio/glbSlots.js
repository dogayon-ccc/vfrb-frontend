// Optional GLB slots. A slot reserves WHERE a garment-only GLB would live for a photo/asset id; it never means a model exists.
// state: 'none' (no file, nothing renders) -> 'candidate' (file present, not yet validated, never shown to customers) -> 'approx' -> 'verified'.
// 'verified' needs a `verification: { method, date }` record (see GLB intake rules). Promote a slot only after the file is added AND passes validation.
const slot = (id, target = null, glb = null) => ({ id, file: `/models/garments/${id}.glb`, state: glb?.state ?? 'none', verification: null, target, source: glb?.source ?? null, reason: glb?.reason ?? null });

export const GLB_SLOTS = Object.fromEntries([
  // photo-backed editable bases
  slot('scrub-top-women-short', { garment: 'Scrub Top', sleeve: 'Short', fit: 'female' }, { state: 'approx', source: 'meshy/scrub-set-women-vneck.glb, top component' }),
  slot('scrub-top-men-short', { garment: 'Scrub Top', sleeve: 'Short', fit: 'male' }, { state: 'approx', source: 'meshy/scrub-set-men-vneck.glb, top component' }),
  slot('mandarin-tunic-housekeeping', { garment: 'Mandarin Collar', sleeve: 'Short', fit: null }),
  slot('mandarin-blouse-bir-long', { garment: 'Mandarin Collar', sleeve: 'Long', fit: null }),
  slot('round-neck-fuchsia-short', { garment: 'Round Neck', sleeve: 'Short', fit: null }),
  // reference-only worn photos: a slot exists so an externally generated GLB can be attached later, but there is no editable 2D target yet
  ...['bir-blouse-trousers-blue', 'pantsuit-notch-short-gray', 'polo-barong-brown', 'jack-shirt-two-tone', 'blazer-double-breasted-gray', 'dress-butter-belted',
    'dress-bir-green-yellow-collar', 'dress-sheath-denim-blue', 'blazer-pinstripe-navy', 'blazer-blouse-blue-short', 'blouse-roundneck-fuchsia',
    'blouse-roundneck-mustard', 'polo-red-claremont', 'shirt-two-tone-gpc', 'peplum-set-navy'].map(id => slot(`photo:${id}`)),
].map(s => [s.id, s]));

export const glbSlotFor = id => GLB_SLOTS[id] ?? GLB_SLOTS[`photo:${id}`] ?? null;
// A slot renders only in these states; 'none', 'candidate' and 'disabled' never reach the viewer.
export const slotLive = slot => slot?.state === 'approx' || slot?.state === 'verified';
