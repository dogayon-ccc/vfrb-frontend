// Vector textile library: original repeats defined once as geometry (rects, circles, polygons, strokes in 0..1 tile units, three colour
// roles) and rendered two ways from that same data: a canvas tile for the Fabric zone fill (2D, PNG export) and SVG text (previews).
// Every shape is drawn at 3x3 wrap offsets, so a tile is seamless by construction. Colour roles: bg (the zone colour unless overridden),
// a (colour 1), b (colour 2). Nothing here is a verified textile of any community: the Philippine-inspired set is original VFRB artwork.
// Params live in cfg.patternParams[zone] next to cfg.patterns[zone] = id; they are clamped on use so an old or hand-edited record cannot break rendering.

export type Role = 'a' | 'b' | 'bg';
type Pt = [number, number];
export type Shape =
  | { t: 'r'; x: number; y: number; w: number; h: number; c: Role; o?: number }
  | { t: 'c'; x: number; y: number; r: number; c: Role; o?: number }
  | { t: 'p'; pts: Pt[]; c: Role; o?: number }
  | { t: 'l'; pts: Pt[]; w: number; c: Role; o?: number; closed?: boolean };
export interface Textile { id: string; label: string; cat: string; note: string; w: number; h: number; shapes: Shape[] }

export const TEXTILE_CATEGORIES = ['Stripes & checks', 'Plaids', 'Herringbone', 'Houndstooth-inspired', 'Woven bands', 'Diamonds & steps', 'Zigzag & chevron', 'Dots & grids', 'Botanical', 'Abstract ornamental', 'Philippine-inspired'] as const;

const r2 = (n: number) => Math.round(n * 1e4) / 1e4;
const R = (x: number, y: number, w: number, h: number, c: Role, o?: number): Shape => ({ t: 'r', x, y, w, h, c, o });
const C = (x: number, y: number, r: number, c: Role, o?: number): Shape => ({ t: 'c', x, y, r, c, o });
const P = (pts: Pt[], c: Role, o?: number): Shape => ({ t: 'p', pts, c, o });
const L = (pts: Pt[], w: number, c: Role, o?: number, closed = false): Shape => ({ t: 'l', pts, w, c, o, closed });
// A rotated ellipse as a polygon (leaf, petal): centre, half-length, half-width, degrees.
const oval = (cx: number, cy: number, a: number, b: number, deg: number, c: Role, o?: number, n = 14): Shape => {
  const t = (deg * Math.PI) / 180, cs = Math.cos(t), sn = Math.sin(t);
  return P(Array.from({ length: n }, (_, i) => { const u = (i / n) * Math.PI * 2, x = a * Math.cos(u), y = b * Math.sin(u); return [r2(cx + x * cs - y * sn), r2(cy + x * sn + y * cs)] as Pt; }), c, o);
};
const ring = (cx: number, cy: number, r: number, w: number, c: Role, o?: number): Shape => L(Array.from({ length: 24 }, (_, i) => { const u = (i / 24) * Math.PI * 2; return [r2(cx + r * Math.cos(u)), r2(cy + r * Math.sin(u))] as Pt; }), w, c, o, true);
const wave = (y: number, amp: number, n: number, w: number, c: Role, o?: number): Shape => L(Array.from({ length: n * 8 + 1 }, (_, i) => [r2(i / (n * 8)), r2(y + amp * Math.sin((i / 8) * Math.PI * 2))] as Pt), w, c, o);
const star = (cx: number, cy: number, ro: number, ri: number, k: number, c: Role, o?: number): Shape => P(Array.from({ length: k * 2 }, (_, i) => { const u = (i / (k * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? ri : ro; return [r2(cx + r * Math.cos(u)), r2(cy + r * Math.sin(u))] as Pt; }), c, o);
// Stepped diamond from stacked rows (a woven-mat look): n steps either side of the centre.
const stepped = (cx: number, cy: number, n: number, cell: number, c: Role, o?: number): Shape[] =>
  Array.from({ length: n * 2 + 1 }, (_, i) => { const k = n - Math.abs(i - n), half = (k + 0.5) * cell; return R(r2(cx - half), r2(cy + (i - n) * cell - cell / 2), r2(half * 2), cell, c, o); });
const sun = (cx: number, cy: number, rIn: number, rOut: number, k: number, c: Role): Shape[] => [C(cx, cy, rIn, c),
  ...Array.from({ length: k }, (_, i) => { const u = (i / k) * Math.PI * 2, d = Math.PI / k / 2; return P([[r2(cx + rIn * 1.25 * Math.cos(u - d)), r2(cy + rIn * 1.25 * Math.sin(u - d))], [r2(cx + rOut * Math.cos(u)), r2(cy + rOut * Math.sin(u))], [r2(cx + rIn * 1.25 * Math.cos(u + d)), r2(cy + rIn * 1.25 * Math.sin(u + d))]], c); })];
const tooth = (cells: number): Shape[] => Array.from({ length: cells * cells }, (_, k) => { const i = k % cells, j = Math.floor(k / cells), s = 1 / cells, x = i * s, y = j * s;
  return (i + j) % 2 === 0 ? R(x, y, s, s, 'a') : P([[x, y], [x + s, y], [x + s, y + s]], 'b'); });

const T = (id: string, label: string, cat: string, note: string, w: number, h: number, shapes: Shape[]): Textile => ({ id, label, cat, note, w, h, shapes });
const S = 'Stripes & checks', PL = 'Plaids', HB = 'Herringbone', HT = 'Houndstooth-inspired', WB = 'Woven bands', DS = 'Diamonds & steps', ZC = 'Zigzag & chevron', DG = 'Dots & grids', BO = 'Botanical', AO = 'Abstract ornamental', PH = 'Philippine-inspired';
const PHN = 'Original VFRB design inspired by woven-mat and island motifs; not an authentic community textile.';

export const TEXTILES: Textile[] = [
  T('t-awning', 'Awning stripe', S, 'Even bands in two colours', 24, 8, [R(0, 0, 0.5, 1, 'a')]),
  T('t-pencil', 'Pencil stripe', S, 'Thin single line', 18, 8, [R(0.44, 0, 0.12, 1, 'a')]),
  T('t-twin', 'Twin stripe', S, 'Wide band with a thin partner', 28, 8, [R(0.08, 0, 0.22, 1, 'a'), R(0.46, 0, 0.07, 1, 'b')]),
  T('t-ticking', 'Ticking', S, 'Narrow bars with a fine rule', 20, 8, [R(0, 0, 0.2, 1, 'a'), R(0.5, 0, 0.05, 1, 'b')]),
  T('t-hoops', 'Hoops', S, 'Horizontal bands', 8, 30, [R(0, 0, 1, 0.5, 'a')]),
  T('t-candy', 'Candy diagonal', S, 'Slanted bands', 22, 22, [P([[-0.5, 1.5], [1.5, -0.5], [1.5, -1], [-0.5, 1]], 'a')]),
  T('t-gingham', 'Gingham print', S, 'Overlapped bands make three tones', 26, 26, [R(0, 0, 0.5, 1, 'a', 0.55), R(0, 0, 1, 0.5, 'a', 0.55)]),
  T('t-buffalo', 'Buffalo check', S, 'Large two-colour overlap', 40, 40, [R(0, 0, 0.5, 1, 'a', 0.7), R(0, 0, 1, 0.5, 'b', 0.7)]),
  T('t-windowpane', 'Windowpane', S, 'Fine rules in wide boxes', 44, 44, [R(0.46, 0, 0.08, 1, 'a'), R(0, 0.46, 1, 0.08, 'a')]),
  T('t-checker', 'Checkerboard', S, 'Alternating squares', 24, 24, [R(0, 0, 0.5, 0.5, 'a'), R(0.5, 0.5, 0.5, 0.5, 'a')]),
  T('t-microcheck', 'Micro check', S, 'Small squares', 10, 10, [R(0, 0, 0.5, 0.5, 'a'), R(0.5, 0.5, 0.5, 0.5, 'a')]),

  T('t-madras', 'Madras plaid', PL, 'Bands of different widths', 52, 52, [R(0.08, 0, 0.22, 1, 'a', 0.7), R(0.5, 0, 0.08, 1, 'b', 0.85), R(0, 0.08, 1, 0.22, 'a', 0.7), R(0, 0.5, 1, 0.08, 'b', 0.85)]),
  T('t-lumber', 'Lumberjack', PL, 'Heavy block check with fine rules', 56, 56, [R(0, 0, 0.5, 1, 'a', 0.85), R(0, 0, 1, 0.5, 'a', 0.85), R(0.24, 0, 0.03, 1, 'b'), R(0, 0.24, 1, 0.03, 'b'), R(0.74, 0, 0.03, 1, 'b'), R(0, 0.74, 1, 0.03, 'b')]),
  T('t-tattersall', 'Tattersall', PL, 'Thin grid in two colours', 36, 36, [R(0.2, 0, 0.04, 1, 'a'), R(0.7, 0, 0.04, 1, 'b'), R(0, 0.2, 1, 0.04, 'a'), R(0, 0.7, 1, 0.04, 'b')]),
  T('t-triple', 'Triple plaid', PL, 'Three bands each way', 60, 60, [R(0.05, 0, 0.1, 1, 'a', 0.8), R(0.3, 0, 0.2, 1, 'b', 0.55), R(0.7, 0, 0.1, 1, 'a', 0.8), R(0, 0.05, 1, 0.1, 'a', 0.8), R(0, 0.3, 1, 0.2, 'b', 0.55), R(0, 0.7, 1, 0.1, 'a', 0.8)]),

  T('t-herring', 'Printed herringbone', HB, 'Reversing slanted bars', 20, 20, [P([[0, 0.5], [0.5, 0], [0.5, 0.25], [0, 0.75]], 'a'), P([[0, 1], [0.5, 0.5], [0.5, 0.75], [0, 1.25]], 'a'), P([[0.5, 0], [1, 0.5], [1, 0.75], [0.5, 0.25]], 'b'), P([[0.5, 0.5], [1, 1], [1, 1.25], [0.5, 0.75]], 'b')]),
  T('t-herring-fine', 'Fine herringbone', HB, 'Narrow bars with gaps', 14, 14, [P([[0, 0.5], [0.5, 0], [0.5, 0.18], [0, 0.68]], 'a'), P([[0, 1], [0.5, 0.5], [0.5, 0.68], [0, 1.18]], 'a'), P([[0.5, 0], [1, 0.5], [1, 0.68], [0.5, 0.18]], 'a'), P([[0.5, 0.5], [1, 1], [1, 1.18], [0.5, 0.68]], 'a')]),
  T('t-spine', 'Spine chevron', HB, 'Bars meeting on a centre line', 24, 12, [P([[0, 0.5], [0.5, 0], [0.5, 0.4], [0, 0.9]], 'a'), P([[0.5, 0], [1, 0.5], [1, 0.9], [0.5, 0.4]], 'b')]),

  T('t-hound', 'Houndstooth blocks', HT, 'Checker with pointed teeth', 32, 32, tooth(4)),
  T('t-hound-lg', 'Broken check', HT, 'Larger teeth, two cells', 40, 40, tooth(2)),
  T('t-pied', 'Pied de poule', HT, 'Fine tooth in six cells', 36, 36, tooth(6)),

  T('t-band-diamond', 'Diamond band', WB, 'Rules above and below a diamond run', 24, 16, [R(0, 0.06, 1, 0.08, 'a'), R(0, 0.86, 1, 0.08, 'a'), P([[0.5, 0.22], [0.75, 0.5], [0.5, 0.78], [0.25, 0.5]], 'b'), P([[0.5, 0.36], [0.62, 0.5], [0.5, 0.64], [0.38, 0.5]], 'a')]),
  T('t-band-ladder', 'Ladder band', WB, 'Two rails with rungs', 16, 14, [R(0, 0.1, 1, 0.12, 'a'), R(0, 0.78, 1, 0.12, 'a'), R(0.42, 0.22, 0.16, 0.56, 'b')]),
  T('t-band-beads', 'Bead band', WB, 'A row of round beads', 14, 14, [C(0.5, 0.5, 0.3, 'a'), C(0.5, 0.5, 0.12, 'b')]),
  T('t-band-teeth', 'Tooth band', WB, 'Alternating triangles', 20, 14, [R(0, 0.9, 1, 0.1, 'a'), P([[0, 0.9], [0.25, 0.2], [0.5, 0.9]], 'a'), P([[0.5, 0.1], [0.75, 0.8], [1, 0.1]], 'b')]),
  T('t-band-key', 'Key meander', WB, 'Stepped key run', 24, 18, [L([[0, 0.85], [0, 0.15], [0.5, 0.15], [0.5, 0.65], [0.25, 0.65], [0.25, 0.4]], 0.1, 'a'), L([[0.5, 0.85], [0.5, 0.85], [1, 0.85]], 0.1, 'b')]),

  T('t-argyle', 'Argyle', DS, 'Diamonds with crossing lines', 36, 36, [P([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], 'a'), P([[0.5, 0.2], [0.8, 0.5], [0.5, 0.8], [0.2, 0.5]], 'b', 0.8), L([[0, 0], [1, 1]], 0.03, 'b', 0.8), L([[0, 1], [1, 0]], 0.03, 'b', 0.8)]),
  T('t-stepdiamond', 'Stepped diamond', DS, 'Diamond built from square steps', 32, 32, [...stepped(0.5, 0.5, 3, 0.1, 'a'), ...stepped(0.5, 0.5, 1, 0.1, 'b')]),
  T('t-stairs', 'Stair step', DS, 'Rising and falling steps', 28, 16, [P([[0, 1], [0, 0.75], [0.25, 0.75], [0.25, 0.5], [0.5, 0.5], [0.5, 0.25], [0.75, 0.25], [0.75, 0], [1, 0], [1, 1]], 'a', 0.9)]),
  T('t-lozenge', 'Lozenge', DS, 'Plain diamond lattice', 22, 22, [P([[0.5, 0.1], [0.9, 0.5], [0.5, 0.9], [0.1, 0.5]], 'a')]),
  T('t-trellis', 'Trellis', DS, 'Crossing diagonals', 22, 22, [L([[0, 0], [1, 1]], 0.05, 'a'), L([[0, 1], [1, 0]], 0.05, 'a')]),

  T('t-zigzag', 'Zigzag', ZC, 'Sharp line', 24, 12, [L([[0, 0.75], [0.25, 0.25], [0.5, 0.75], [0.75, 0.25], [1, 0.75]], 0.12, 'a')]),
  T('t-chevron', 'Chevron', ZC, 'Filled V bands', 24, 14, [P([[0, 0.5], [0.5, 0], [1, 0.5], [1, 0.8], [0.5, 0.3], [0, 0.8]], 'a')]),
  T('t-wave', 'Wave', ZC, 'Smooth line', 30, 12, [wave(0.5, 0.28, 1, 0.12, 'a')]),
  T('t-tide', 'Double wave', ZC, 'Two offset waves', 30, 16, [wave(0.3, 0.16, 1, 0.1, 'a'), wave(0.72, 0.16, 1, 0.1, 'b')]),
  T('t-saw', 'Sawtooth', ZC, 'Row of points', 20, 12, [P([[0, 1], [0.5, 0.1], [1, 1]], 'a')]),

  T('t-dots', 'Polka dots', DG, 'Half-drop dots', 24, 24, [C(0.25, 0.25, 0.14, 'a'), C(0.75, 0.75, 0.14, 'a')]),
  T('t-micro', 'Micro dots', DG, 'Fine dots', 9, 9, [C(0.5, 0.5, 0.2, 'a')]),
  T('t-dotgrid', 'Dot grid', DG, 'Square dot lattice', 14, 14, [C(0.5, 0.5, 0.1, 'a')]),
  T('t-grid', 'Fine grid', DG, 'Thin rules both ways', 18, 18, [R(0, 0, 0.06, 1, 'a'), R(0, 0, 1, 0.06, 'a')]),
  T('t-hatch', 'Crosshatch', DG, 'Dense crossing lines', 10, 10, [L([[0, 0], [1, 1]], 0.07, 'a'), L([[0, 1], [1, 0]], 0.07, 'a')]),
  T('t-plus', 'Plus signs', DG, 'Small crosses', 18, 18, [R(0.4, 0.2, 0.2, 0.6, 'a'), R(0.2, 0.4, 0.6, 0.2, 'a')]),
  T('t-triangles', 'Triangle field', DG, 'Alternating triangles', 22, 22, [P([[0.1, 0.9], [0.5, 0.1], [0.9, 0.9]], 'a'), P([[0.1, 0.1], [0.9, 0.1], [0.5, 0.9]], 'b', 0.55)]),
  T('t-rings', 'Ring dots', DG, 'Open circles', 20, 20, [ring(0.5, 0.5, 0.28, 0.07, 'a')]),

  T('t-leaf', 'Leaf scatter', BO, 'Loose leaves at three angles', 44, 44, [oval(0.25, 0.25, 0.16, 0.07, -35, 'a'), oval(0.75, 0.5, 0.16, 0.07, 40, 'b'), oval(0.3, 0.78, 0.15, 0.065, 15, 'a'), oval(0.85, 0.12, 0.1, 0.045, -60, 'b')]),
  T('t-fern', 'Fern', BO, 'Stem with paired leaflets', 40, 48, [L([[0.5, 0], [0.5, 1]], 0.03, 'a'), ...[0.1, 0.3, 0.5, 0.7, 0.9].flatMap(y => [oval(0.36, y, 0.14, 0.04, -30, 'a'), oval(0.64, y, 0.14, 0.04, 30, 'a')])]),
  T('t-daisy', 'Daisy field', BO, 'Eight-petal flowers', 44, 44, [...[0, 1, 2, 3, 4, 5, 6, 7].map(i => oval(r2(0.5 + 0.13 * Math.cos((i * Math.PI) / 4)), r2(0.5 + 0.13 * Math.sin((i * Math.PI) / 4)), 0.1, 0.045, i * 45, 'a')), C(0.5, 0.5, 0.07, 'b')]),
  T('t-vine', 'Vine', BO, 'Wavy stem with leaves and berries', 44, 32, [wave(0.5, 0.18, 1, 0.04, 'a'), oval(0.25, 0.22, 0.1, 0.04, -50, 'a'), oval(0.75, 0.78, 0.1, 0.04, 50, 'a'), C(0.5, 0.5, 0.05, 'b')]),
  T('t-sprig', 'Sprig dots', BO, 'Small sprigs on a half-drop', 30, 30, [L([[0.25, 0.4], [0.25, 0.1]], 0.03, 'a'), oval(0.2, 0.22, 0.07, 0.03, -40, 'a'), oval(0.3, 0.2, 0.07, 0.03, 40, 'a'), C(0.75, 0.75, 0.06, 'b')]),
  T('t-clover', 'Clover', BO, 'Three-lobe leaf', 28, 28, [C(0.5, 0.34, 0.12, 'a'), C(0.38, 0.54, 0.12, 'a'), C(0.62, 0.54, 0.12, 'a'), L([[0.5, 0.55], [0.5, 0.85]], 0.05, 'a')]),

  T('t-quatrefoil', 'Quatrefoil', AO, 'Four-lobe lattice', 34, 34, [C(0.5, 0.32, 0.17, 'a'), C(0.5, 0.68, 0.17, 'a'), C(0.32, 0.5, 0.17, 'a'), C(0.68, 0.5, 0.17, 'a'), C(0.5, 0.5, 0.09, 'bg')]),
  T('t-scales', 'Fish scale', AO, 'Overlapping arcs', 24, 16, [ring(0, 0.5, 0.5, 0.06, 'a'), ring(1, 0.5, 0.5, 0.06, 'a'), ring(0.5, 1, 0.5, 0.06, 'a'), ring(0.5, 0, 0.5, 0.06, 'a')]),
  T('t-rosette', 'Rosette', AO, 'Ring with six petals', 40, 40, [ring(0.5, 0.5, 0.4, 0.04, 'a'), ...[0, 1, 2, 3, 4, 5].map(i => oval(r2(0.5 + 0.2 * Math.cos((i * Math.PI) / 3)), r2(0.5 + 0.2 * Math.sin((i * Math.PI) / 3)), 0.14, 0.05, i * 60, 'b')), C(0.5, 0.5, 0.05, 'a')]),
  T('t-ripple', 'Ripple', AO, 'Concentric rings', 36, 36, [ring(0.5, 0.5, 0.42, 0.04, 'a'), ring(0.5, 0.5, 0.3, 0.04, 'b'), ring(0.5, 0.5, 0.18, 0.04, 'a'), C(0.5, 0.5, 0.06, 'b')]),
  T('t-confetti', 'Confetti', AO, 'Scattered small bars', 40, 40, [P([[0.1, 0.15], [0.2, 0.1], [0.22, 0.14], [0.12, 0.19]], 'a'), P([[0.6, 0.25], [0.7, 0.3], [0.67, 0.34], [0.57, 0.29]], 'b'), P([[0.3, 0.6], [0.4, 0.62], [0.39, 0.67], [0.29, 0.65]], 'b'), P([[0.8, 0.75], [0.9, 0.7], [0.92, 0.74], [0.82, 0.79]], 'a'), C(0.45, 0.9, 0.03, 'a'), C(0.9, 0.35, 0.03, 'b')]),
  T('t-starlattice', 'Star lattice', AO, 'Four-point stars', 30, 30, [star(0.5, 0.5, 0.38, 0.12, 4, 'a'), star(0, 0, 0.2, 0.07, 4, 'b')]),

  T('t-banig', 'Banig diamonds', PH, PHN, 36, 36, [...stepped(0.5, 0.5, 4, 0.09, 'a'), ...stepped(0.5, 0.5, 2, 0.09, 'bg'), ...stepped(0.5, 0.5, 0, 0.09, 'b'), ...stepped(0, 0, 1, 0.09, 'b')]),
  T('t-sampaguita', 'Sampaguita sprigs', PH, PHN, 38, 38, [...[0, 1, 2, 3, 4].map(i => oval(r2(0.3 + 0.06 * Math.cos((i * 2 * Math.PI) / 5 - 1.57)), r2(0.3 + 0.06 * Math.sin((i * 2 * Math.PI) / 5 - 1.57)), 0.07, 0.03, i * 72 - 90, 'a')), C(0.3, 0.3, 0.02, 'b'), oval(0.2, 0.5, 0.08, 0.03, 50, 'b'), oval(0.4, 0.5, 0.08, 0.03, -50, 'b'), ...[0, 1, 2, 3, 4].map(i => oval(r2(0.78 + 0.05 * Math.cos((i * 2 * Math.PI) / 5)), r2(0.78 + 0.05 * Math.sin((i * 2 * Math.PI) / 5)), 0.06, 0.025, i * 72, 'a')), C(0.78, 0.78, 0.018, 'b')]),
  T('t-sunburst', 'Sunburst', PH, PHN, 40, 40, [...sun(0.5, 0.5, 0.1, 0.34, 16, 'a'), C(0.5, 0.5, 0.05, 'b'), ...sun(0, 0, 0.04, 0.14, 12, 'b')]),
  T('t-alon', 'Alon waves', PH, PHN, 32, 24, [wave(0.2, 0.1, 1, 0.07, 'a'), wave(0.5, 0.1, 1, 0.07, 'b'), wave(0.8, 0.1, 1, 0.07, 'a')]),
  T('t-palay', 'Palay stalks', PH, PHN, 30, 36, [L([[0.5, 0], [0.5, 1]], 0.03, 'a'), ...[0.15, 0.4, 0.65, 0.9].flatMap(y => [oval(0.4, y, 0.09, 0.035, -55, 'b'), oval(0.6, y - 0.08, 0.09, 0.035, 55, 'b')])]),
  T('t-tikog', 'Tikog stripes', PH, PHN, 30, 10, [R(0, 0, 0.3, 1, 'a'), R(0.38, 0, 0.1, 1, 'b'), R(0.56, 0, 0.18, 1, 'a', 0.6), R(0.82, 0, 0.06, 1, 'b')]),
];

const BY_ID = new Map(TEXTILES.map(t => [t.id, t]));
export const isTextile = (id: unknown): id is string => typeof id === 'string' && BY_ID.has(id);
export const textileById = (id: string) => BY_ID.get(id);
export const matchesTextile = (t: Textile, q: string) => { const s = q.trim().toLowerCase(); return !s || s.split(/\s+/).every(w => `${t.label} ${t.cat} ${t.note}`.toLowerCase().includes(w)); };

// ---- params ---------------------------------------------------------------------------------------------------------------------
export const TEXTILE_RANGE = { scale: { min: 0.5, max: 4 }, opacity: { min: 0.1, max: 1 } };
export interface TextileParams { scale: number; rotation: number; a: string; b: string; bg: string; opacity: number; ox: number; oy: number; rx: boolean; ry: boolean }
const HEX = /^#[0-9a-f]{6}$/i;
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const luma = (h: string) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const col = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);

// The zone colour stays the base cloth (bg). Colour 1 contrasts with it; colour 2 sits halfway, so a fresh pattern is tonal and legible.
export function textileParams(params: any, zoneColour: string): TextileParams {
  const p = params && typeof params === 'object' ? params : {}, bg = col(p.bg, HEX.test(zoneColour ?? '') ? zoneColour.toLowerCase() : '#1b2a4a');
  const a = col(p.a, luma(bg) > 0.5 ? mix(bg, '#101828', 0.78) : mix(bg, '#ffffff', 0.82));
  return { scale: num(p.scale, TEXTILE_RANGE.scale.min, TEXTILE_RANGE.scale.max, 1), rotation: ((Math.round(num(p.rotation, -1e4, 1e4, 0)) % 360) + 360) % 360,
    a, b: col(p.b, mix(bg, a, 0.5)), bg, opacity: num(p.opacity, TEXTILE_RANGE.opacity.min, TEXTILE_RANGE.opacity.max, 1),
    ox: num(p.ox, 0, 1, 0), oy: num(p.oy, 0, 1, 0), rx: p.rx !== false, ry: p.ry !== false };
}

const ROLE = (p: TextileParams, c: Role) => (c === 'a' ? p.a : c === 'b' ? p.b : p.bg);
const OFF = [-1, 0, 1];

// ---- canvas tile ------------------------------------------------------------------------------------------------------------------
export const RES = 2; // tile pixels per sketch pixel, so the repeat stays crisp when the stage is zoomed
const cache = new Map<string, HTMLCanvasElement>();
export const tilePx = (t: Textile, scale: number) => ({ w: Math.max(8, Math.round(t.w * scale * RES)), h: Math.max(8, Math.round(t.h * scale * RES)) });
export const tileSketchSize = (t: Textile, scale: number) => { const s = tilePx(t, scale); return { w: s.w / RES, h: s.h / RES }; };

function draw(g: CanvasRenderingContext2D, t: Textile, p: TextileParams, W: number, H: number) {
  g.fillStyle = p.bg; g.fillRect(0, 0, W, H);
  for (const s of t.shapes) {
    const col = ROLE(p, s.c); g.globalAlpha = (s.o ?? 1) * p.opacity;
    for (const dx of OFF) for (const dy of OFF) {
      const X = (u: number) => (u + dx) * W, Y = (v: number) => (v + dy) * H;
      g.beginPath();
      if (s.t === 'r') g.rect(X(s.x), Y(s.y), s.w * W, s.h * H);
      else if (s.t === 'c') g.arc(X(s.x), Y(s.y), s.r * W, 0, Math.PI * 2);
      else s.pts.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v))));
      if (s.t === 'p' || (s.t === 'l' && s.closed)) g.closePath();
      if (s.t === 'l') { g.lineWidth = Math.max(1, s.w * W); g.lineJoin = 'round'; g.lineCap = 'butt'; g.strokeStyle = col; g.stroke(); } else { g.fillStyle = col; g.fill(); }
    }
  }
  g.globalAlpha = 1;
}

// One repeat as a canvas (cached); null where there is no DOM (SSR, logic checks).
export function textileTile(id: string, params: any, zoneColour: string): HTMLCanvasElement | null {
  const t = BY_ID.get(id);
  if (!t || typeof document === 'undefined') return null;
  const p = textileParams(params, zoneColour), { w, h } = tilePx(t, p.scale), key = `${id}|${w}|${p.a}|${p.b}|${p.bg}|${p.opacity}`;
  const hit = cache.get(key); if (hit) return hit;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (!g) return null;
  draw(g, t, p, w, h);
  if (cache.size > 64) cache.clear();
  cache.set(key, c);
  return c;
}

// Pattern-space transform: rotation about the origin plus the X/Y offset (a fraction of one repeat), tile drawn at RES.
export function textileMatrix(id: string, p: TextileParams): number[] {
  const t = BY_ID.get(id)!, r = (p.rotation * Math.PI) / 180, k = 1 / RES, cos = Math.cos(r) * k, sin = Math.sin(r) * k, sz = tileSketchSize(t, p.scale);
  return [cos, sin, -sin, cos, p.ox * sz.w, p.oy * sz.h];
}
export const textileRepeat = (p: TextileParams): 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat' => (p.rx && p.ry ? 'repeat' : p.rx ? 'repeat-x' : p.ry ? 'repeat-y' : 'no-repeat');

// Fabric fill for a zone, or null when no tile can be drawn.
export function textileFill(fabric: any, id: string, zoneColour: string, params: any) {
  const p = textileParams(params, zoneColour), tile = textileTile(id, params, zoneColour);
  return tile ? new fabric.Pattern({ source: tile, repeat: textileRepeat(p), patternTransform: textileMatrix(id, p) }) : null;
}

const urls = new Map<string, string>();
export function textileTileUrl(id: string, params: any, zoneColour: string): string | null {
  const tile = textileTile(id, params, zoneColour); if (!tile) return null;
  const p = textileParams(params, zoneColour), key = `${id}|${p.scale}|${p.a}|${p.b}|${p.bg}|${p.opacity}`;
  if (!urls.has(key)) { if (urls.size > 96) urls.clear(); urls.set(key, tile.toDataURL()); }
  return urls.get(key)!;
}

// ---- SVG --------------------------------------------------------------------------------------------------------------------------
// The same geometry as SVG text (one repeat, in sketch pixels at the given scale): previews and any vector use. No DOM needed.
export function textileSvg(id: string, params: any, zoneColour: string): string {
  const t = BY_ID.get(id); if (!t) return '';
  const p = textileParams(params, zoneColour), W = t.w * p.scale, H = t.h * p.scale, out: string[] = [];
  const f = (n: number) => Math.round(n * 100) / 100;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${f(W)}" height="${f(H)}" viewBox="0 0 ${f(W)} ${f(H)}"><rect width="${f(W)}" height="${f(H)}" fill="${p.bg}"/>`);
  for (const s of t.shapes) for (const dx of OFF) for (const dy of OFF) {
    const X = (u: number) => f((u + dx) * W), Y = (v: number) => f((v + dy) * H), op = f((s.o ?? 1) * p.opacity), c = ROLE(p, s.c);
    if (s.t === 'r') out.push(`<rect x="${X(s.x)}" y="${Y(s.y)}" width="${f(s.w * W)}" height="${f(s.h * H)}" fill="${c}" fill-opacity="${op}"/>`);
    else if (s.t === 'c') out.push(`<circle cx="${X(s.x)}" cy="${Y(s.y)}" r="${f(s.r * W)}" fill="${c}" fill-opacity="${op}"/>`);
    else { const pts = s.pts.map(([u, v]) => `${X(u)},${Y(v)}`).join(' ');
      out.push(s.t === 'p' ? `<polygon points="${pts}" fill="${c}" fill-opacity="${op}"/>` : `<${s.closed ? 'polygon' : 'polyline'} points="${pts}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${f(Math.max(1, s.w * W))}" stroke-linejoin="round"/>`); }
  }
  out.push('</svg>');
  return out.join('');
}

// "Body: Fish scale (colour 1 #FFFFFF, colour 2 #8899AA, scale 1.5x, 45°, opacity 80%)" for the PDF spec and the admin order view.
export function describeTextile(zoneName: string, id: string, params: any, zoneColour: string): string {
  const t = BY_ID.get(id), p = textileParams(params, zoneColour);
  return `${zoneName}: ${t?.label ?? id} (colour 1 ${p.a.toUpperCase()}, colour 2 ${p.b.toUpperCase()}, scale ${p.scale}x${p.rotation ? `, ${p.rotation}°` : ''}${p.opacity < 1 ? `, opacity ${Math.round(p.opacity * 100)}%` : ''}${p.rx && p.ry ? '' : `, repeat ${p.rx ? 'across' : p.ry ? 'down' : 'none'}`})`;
}
