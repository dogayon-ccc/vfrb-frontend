// Garment colour of each gallery photo, measured 2026-10-12: median of the garment's central pixels in public/gallery/<id>.webp
// (white background excluded; sets: [top, bottom], split like REF_SPLIT). "Use as template" starts the design in these colours.
export const PHOTO_COLOURS = {
  'bir-blouse-trousers-blue': ['#2960C8', '#584A4F'], 'blazer-blouse-blue': ['#0FABEC'], 'blazer-blouse-blue-short': ['#222929'],
  'blazer-collarless-tan': ['#C8A177'], 'blazer-double-breasted-gray': ['#545659', '#1B1816'], 'blazer-open-front-black': ['#454847'],
  'blazer-pinstripe-navy': ['#323C5C', '#1A1918'], 'blazer-pinstripe-royal': ['#1738AA'], 'blazer-tweed-herringbone': ['#827F7B'],
  'blazer-white-notch': ['#BDB7AC'], 'blouse-asymmetric-blue': ['#90ABCC'], 'blouse-mandarin-yellow': ['#F1B642'],
  'blouse-roundneck-fuchsia': ['#E62C69', '#1A1A18'], 'blouse-roundneck-mustard': ['#D3C051', '#733B1F'],
  'blouse-scarf-cream': ['#DBD1C3'], 'blouse-tunic-roundneck-blue': ['#D7D1C7'], 'corporate-skirt': ['#1C1E1F'],
  'dress-bir-green-yellow-collar': ['#474739'], 'dress-butter-belted': ['#D7CAB9'], 'dress-sheath-denim-blue': ['#2B5A90'],
  'dress-shift-geometric': ['#3F443C'], 'dress-tunic-maternity-navy': ['#2B2F40'], 'jack-shirt-two-tone': ['#5D8FDB'], 'pants': ['#282828'],
  'pantsuit-notch-short-gray': ['#827E8B', '#625C64'], 'peplum-set-navy': ['#203260', '#1B2A51'], 'polo-barong-brown': ['#665456', '#1B181C'],
  'polo-red-claremont': ['#AD0C2C'], 'school-skirt': ['#1E1E1E'], 'scrub-set-housekeeping': ['#636672', '#323234'],
  'scrub-set-men-vneck': ['#26262A', '#26262A'], 'scrub-set-women-vneck': ['#798CB6', '#798BB7'], 'set-pinstripe-pants': ['#373B49', '#32374B'],
  'set-pinstripe-skirt': ['#383B47', '#2F3446'], 'set-vest-blouse': ['#413735'], 'shirt-mandarin-polkadot': ['#877A6C'],
  'shirt-two-tone-gpc': ['#ABC6EF', '#373841'], 'shirt-utility-beige-long': ['#A59D94'], 'shorts': ['#686C75'],
};

// Body and sleeves take the photo colour; collar/pocket/trim keep their own rules (a photo base keeps its real trim until one is picked).
export const withPhotoColour = (colors, id, part = 0) => {
  const hex = PHOTO_COLOURS[id]?.[part];
  return hex ? { ...colors, body: hex, sleeve: hex } : colors;
};
