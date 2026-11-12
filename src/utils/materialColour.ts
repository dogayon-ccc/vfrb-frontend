// Colour words in a catalog material name -> swatch hex, mirroring the backend's MaterialCatalogMatcher families. null = neutral tile.
const FAMILIES = [
  ['custom colou?r|matching colou?r|any colou?r|assorted', null],
  ['off[ -]white|champagne|pearl|bone|eggshell|cream|ivory|white', '#f2efe8'],
  ['midnight blue|dark blue|navy blue|navy|indigo', '#1f2a44'],
  ['teal|turquoise|aqua|cyan|jade', '#1d7874'],
  ['forest green|hunter green|army green|olive|mint|lime|emerald|green', '#2f6b3a'],
  ['old rose|magenta|fuchsia|pink|rose', '#d4799a'],
  ['ultra violet|plum|mauve|lilac|violet|purple|lavender', '#6b4a8f'],
  ['orange|coral|peach|salmon|rust|tangerine', '#d0702c'],
  ['gold|lemon|mustard|yellow', '#d9b23a'],
  ['maroon|burgundy|wine', '#6b1f2a'],
  ['crimson|scarlet|cherry|red', '#b5302f'],
  ['chocolate|coffee|mocha|taupe|sand|oatmeal|camel|khaki|brown|beige|tan', '#8a6a4a'],
  ['graphite|slate|heather|gray|grey|ash|silver', '#8b8f94'],
  ['jet|onyx|charcoal|black', '#262626'],
  ['light blue|sky blue|royal blue|baby blue|powder blue|cobalt|denim|blue', '#2f5fa7'],
].map(([words, hex]) => [new RegExp(`\\b(${words})\\b`, 'i'), hex]);

export function materialColour(name) {
  const hit = FAMILIES.find(([re]) => re.test(name ?? ''));
  return hit ? hit[1] : null;
}
