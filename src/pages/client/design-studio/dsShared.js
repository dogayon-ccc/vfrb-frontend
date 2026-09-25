// src/pages/client/design-studio/dsShared.js
// Shared constants for Design Studio's panel components.
//
// EXTRACTED (Task E prep, Aug 31 2026): DesignStudio.jsx had grown past
// 2,700 lines — four real features (canvas, layers panel, logo/AI panel,
// pattern system) living in one file, flagged as real, warranted cleanup
// back on Aug 30. Pulling panels out one at a time, starting with the
// self-contained LayersPanel. These constants are the single source of
// truth for both DesignStudio.jsx and every extracted panel — duplicating
// T2's hex value in two files would be a real, easy-to-miss divergence
// risk the next time the brand color changes.
import { getGarmentPaths, BASE_PATHS } from './garmentPaths';
import { deserializeDesign } from './designSerialization';
// Pure-data capability lookup only — NOT garmentMeshManifest.js. That file also calls
// useGLTF.preload (a @react-three/drei / Three.js side effect) at import time; dsShared.js is
// statically imported by ~20 files including OrderWizard.jsx, none of which touch 3D, and the
// Studio's own 3D view is intentionally React.lazy()-loaded as its own chunk (CanvasViewport.jsx)
// so those pages don't pay for Three.js. Importing garmentMeshManifest.js here would pull GLTF
// loading into every one of those bundles and defeat that split.
import { get3DCapabilities } from './garmentCapabilities';

export const T     = '#028090';
export const T2    = '#02C39A';
export const DARK  = '#F8FAFC';
export const DARK2 = '#EEF2F7';

export const secLabel = {
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.09em', color: 'rgba(15,23,42,.4)',
  margin: '10px 0 5px 1px',
};

// MOVED here from DesignStudio.jsx (Sept 8 2026), alongside actually wiring
// the already-extracted PatternPanel.jsx into DesignStudio.jsx for the
// first time — the inline PatternPanel DesignStudio.jsx had been using
// instead was the pre-stripe-customization version, and this file didn't
// export PATTERNS/ZONE_LABEL at all yet, so PatternPanel.jsx couldn't
// actually be imported without this. `parametric`/`defaultParams` are new
// fields on hstripes/vstripes/diagonal specifically for that feature —
// every other pattern is unaffected structurally, just relocated.
export const ZONE_LABEL = { body:'Body', collar:'Collar', sleeve:'Sleeve', pocket:'Pocket/Trim', tipping:'Tipping' };

export const PATTERNS = [
  { id:'solid',      label:'Solid',       icon:'patternSolid', svg: null },
  { id:'hstripes',   label:'H-Stripes',   icon:'patternStripes', parametric: true,
    defaultParams: { width: 5, spacing: 5 },
    svg: (c, w = 5, s = 5) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><rect y="0" width="20" height="${w}" fill="${c}" opacity="0.35"/><rect y="${w + s}" width="20" height="${w}" fill="${c}" opacity="0.35"/></svg>` },
  { id:'vstripes',   label:'V-Stripes',   icon:'patternVStripes', parametric: true,
    defaultParams: { width: 5, spacing: 5 },
    svg: (c, w = 5, s = 5) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><rect x="0" width="${w}" height="20" fill="${c}" opacity="0.35"/><rect x="${w + s}" width="${w}" height="20" fill="${c}" opacity="0.35"/></svg>` },
  { id:'diagonal',   label:'Diagonal',    icon:'patternDiagonal', parametric: true,
    defaultParams: { width: 4, spacing: 6 },
    svg: (c, w = 4, s = 6) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><line x1="0" y1="20" x2="20" y2="0" stroke="${c}" stroke-width="${w}" opacity="0.35"/><line x1="${-10-s}" y1="20" x2="${10-s}" y2="0" stroke="${c}" stroke-width="${w}" opacity="0.35"/><line x1="${10+s}" y1="20" x2="${30+s}" y2="0" stroke="${c}" stroke-width="${w}" opacity="0.35"/></svg>` },
  { id:'checker',    label:'Checker',     icon:'patternChecker',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><rect x="0" y="0" width="10" height="10" fill="${c}" opacity="0.3"/><rect x="10" y="10" width="10" height="10" fill="${c}" opacity="0.3"/></svg>` },
  { id:'polka',      label:'Polka Dots',  icon:'patternPolka',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><circle cx="5" cy="5" r="3" fill="${c}" opacity="0.4"/><circle cx="15" cy="15" r="3" fill="${c}" opacity="0.4"/></svg>` },
  { id:'geometric',  label:'Geometric',   icon:'patternGeometric',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><polygon points="12,2 22,20 2,20" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.35"/></svg>` },
  { id:'gradient',   label:'Gradient',    icon:'patternGradient', svg: null }, // handled specially
];

// Used by both LogoPanel (preset picker UI) and DesignStudio.jsx's
// useGarmentCanvas hook (addLogo action) — genuinely shared, not
// LogoPanel-only, confirmed by checking both call sites before moving.
export const LOGO_PRESETS = [
  { id:'left_chest',   label:'Left Chest',    x: 0.31, y: 0.35 },
  { id:'center_chest', label:'Center',        x: 0.42, y: 0.38 },
  { id:'back_center',  label:'Back Center',   x: 0.42, y: 0.28 },
  { id:'left_arm',     label:'Left Arm',      x: 0.14, y: 0.28 },
  { id:'right_arm',    label:'Right Arm',     x: 0.70, y: 0.28 },
];

// Garment categories, from the VFRB interview's garment list.
export const CATS = [
  { id: 'Medical / Scrubs', icon: 'medical',   garments: ['Scrub Top','V-Neck Shirt','Lab Coat','Lab Coverall','Pants','Shorts'] },
  { id: 'School Uniform',   icon: 'school',    garments: ['School Polo','Round Neck','Polo Shirt','Pants','Shorts','Skirt'] },
  { id: 'Corporate',        icon: 'corporate', garments: ['Polo Shirt','T-Shirt','Mandarin Collar','Button-Down','V-Neck Shirt','Pants'] },
  { id: 'PE / Sports',      icon: 'sports',    garments: ['Round Neck','T-Shirt','Shorts','Track Pants'] },
];

export const SLEEVE_OPTS = {
  'Polo Shirt':      ['Sleeveless','Short','3/4','Long'],
  'School Polo':     ['Short','3/4','Long'],
  'Round Neck':      ['Sleeveless','Short','3/4','Long'],
  'V-Neck Shirt':    ['Sleeveless','Short','3/4','Long'],
  'Mandarin Collar': ['Short','3/4','Long'],
  'Scrub Top':       ['Short','3/4'],
  'Lab Coat':        ['Long'],
  'Button-Down':     ['Short','Long'],
  'T-Shirt':         ['Short'],
  'Lab Coverall':    ['Long'],
  'Pants': [], 'Shorts': [], 'Track Pants': [], 'Skirt': [],
};

// Garments with a real scanned 3D mesh that ships more than one fit — TypePanel shows the Fit
// toggle only for these. Driven by the 3D capability contract (garmentMeshManifest.js) instead
// of a second hand-maintained list: that's what left the female Polo model unreachable after it
// was wired into SCANNED_GARMENTS — this array was never updated to match, so cfg.fit was never
// set for a Polo Shirt / School Polo and the Studio always requested the male GLB.
export const FIT_GARMENTS = Object.keys(BASE_PATHS).filter(name => (get3DCapabilities(name).fit?.length ?? 0) > 1);

export const PH_SWATCHES = [
  { hex: '#1B2A4A', name: 'Navy'         }, { hex: '#2952A3', name: 'Royal Blue'   },
  { hex: '#87CEEB', name: 'Sky Blue'     }, { hex: '#006A4E', name: 'Bottle Green' },
  { hex: '#800000', name: 'Maroon'       }, { hex: '#808080', name: 'Gray'         },
  { hex: '#000000', name: 'Black'        }, { hex: '#FFFFFF', name: 'White'        },
  { hex: '#CC0000', name: 'Red'          }, { hex: '#FFD700', name: 'Yellow'       },
  { hex: '#FF6600', name: 'Orange'       }, { hex: '#6B21A8', name: 'Purple'       },
  { hex: '#028090', name: 'Teal'         }, { hex: '#AED6F1', name: 'Light Blue'   },
  { hex: '#F5F0E8', name: 'Beige'        }, { hex: '#8B4513', name: 'Brown'        },
  { hex: '#FFB6C1', name: 'Pink'         }, { hex: '#808000', name: 'Olive'        },
];

export const ZONE_KEYS = ['body','collar','sleeve','pocket','tipping'];

// Zones a garment really has, read from its 2D sketch so 2D, summary and 3D agree.
export function zonesFor(garment, sleeve) {
  const p = getGarmentPaths(garment, sleeve);
  // T-Shirt's scanned GLB has no separate collar node — hide the swatch so it can't be picked and silently do nothing in 3D.
  // NOTE (Account 3, verified against the current GLB): this is now stale. The wired t-shirt
  // model's neck rib IS a real, colorable UV-island region (get3DCapabilities('T-Shirt').zones
  // includes 'collar', browser-verified). Left exactly as-is rather than flipped on here: this
  // file's own history records that OrderWizard's `needsCollar` used to drift out of sync with
  // this flag for T-Shirt specifically, and re-enabling it changes order-validation behavior
  // outside the 3D lane. Account 1: safe to remove `&& garment !== 'T-Shirt'` below once
  // OrderWizard's T-Shirt collar handling is confirmed.
  const hasCollar = !!p.collar && garment !== 'T-Shirt';
  // Polo Shirt / School Polo's GLB has real body/sleeve/collar zones but no pocket geometry
  // (GLB-CAPABILITY-MATRIX.md) — same class of mismatch as the line above: the 2D sketch has a
  // pocket, changing its color did nothing in 3D. Driven by the capability data instead of a
  // hardcoded garment name so it stays correct for any future garment in the same situation.
  const cap = get3DCapabilities(garment);
  const hasPocket = !!p.pocket && (!cap.supported || (cap.zones ?? []).includes('pocket'));
  const has = { body: true, collar: hasCollar, sleeve: !!(p.sleeveL || p.sleeveR), pocket: hasPocket, tipping: !!p.collar };
  return ZONE_KEYS.filter(z => has[z]);
}

export const placementsFor = (garment, sleeve) =>
  zonesFor(garment, sleeve).includes('sleeve') ? LOGO_PRESETS : LOGO_PRESETS.filter(p => !p.id.endsWith('_arm'));

// Single source of truth for collar/sleeve, so OrderWizard can't hand-maintain
// a second table that silently drifts (see the T-Shirt bug: OrderWizard kept
// its own needsCollar=true for a garment whose Studio zones have no collar).
// Pocket/waist stay OUT of this: they're order-level spec fields (e.g. cargo
// pocket on Pants) that don't correspond to a Studio-colorable zone, so a
// garment can legitimately need a pocket type with no `pocket` zone to color.
export function garmentRequirements(garment, sleeve) {
  const zones = zonesFor(garment, sleeve);
  return { needsCollar: zones.includes('collar'), needsSleeve: zones.includes('sleeve') };
}

// System emoji fonts appended as fallback — no CDN, relies on the OS's own
// installed emoji font (Segoe UI Emoji / Apple Color Emoji / Noto Color Emoji).
const EMOJI_FALLBACK = `,'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji'`;
// Expanded to real, widely pre-installed system font stacks — still zero
// CDN calls (the "no CDN" coding standard for this offline project), just
// a wider set of what the OS already ships instead of the original 5.
// A stack that isn't installed silently falls through to its own generic
// keyword (serif/sans-serif/monospace/cursive/fantasy), so nothing renders
// blank even on a machine missing a given face.
export const FONTS = [
  { id:'bold',       label:'Bold Block',    css:`Arial Black, 'Arial Bold', sans-serif${EMOJI_FALLBACK}` },
  { id:'clean',      label:'Clean',         css:`ui-sans-serif, system-ui, sans-serif${EMOJI_FALLBACK}` },
  { id:'helvetica',  label:'Helvetica',     css:`Helvetica, Arial, sans-serif${EMOJI_FALLBACK}` },
  { id:'verdana',    label:'Verdana',       css:`Verdana, Geneva, sans-serif${EMOJI_FALLBACK}` },
  { id:'trebuchet',  label:'Trebuchet',     css:`'Trebuchet MS', sans-serif${EMOJI_FALLBACK}` },
  { id:'tahoma',     label:'Tahoma',        css:`Tahoma, Geneva, sans-serif${EMOJI_FALLBACK}` },
  { id:'futura',     label:'Futura',        css:`Futura, 'Century Gothic', sans-serif${EMOJI_FALLBACK}` },
  { id:'serif',      label:'Serif',         css:`Georgia, serif${EMOJI_FALLBACK}` },
  { id:'times',      label:'Times',         css:`'Times New Roman', Times, serif${EMOJI_FALLBACK}` },
  { id:'garamond',   label:'Garamond',      css:`Garamond, 'Palatino Linotype', serif${EMOJI_FALLBACK}` },
  { id:'palatino',   label:'Palatino',      css:`Palatino, 'Palatino Linotype', serif${EMOJI_FALLBACK}` },
  { id:'cambria',    label:'Cambria',       css:`Cambria, Georgia, serif${EMOJI_FALLBACK}` },
  { id:'mono',       label:'Military',      css:`'Courier New', Courier, monospace${EMOJI_FALLBACK}` },
  { id:'consolas',   label:'Console',       css:`Consolas, 'Lucida Console', monospace${EMOJI_FALLBACK}` },
  { id:'impact',     label:'Impact',        css:`Impact, Haettenschweiler, sans-serif${EMOJI_FALLBACK}` },
  { id:'script',     label:'Script',        css:`cursive${EMOJI_FALLBACK}` },
  { id:'brush',      label:'Brush',         css:`'Brush Script MT', cursive${EMOJI_FALLBACK}` },
  { id:'comic',      label:'Comic',         css:`'Comic Sans MS', 'Comic Sans', cursive${EMOJI_FALLBACK}` },
  { id:'papyrus',    label:'Papyrus',       css:`Papyrus, fantasy${EMOJI_FALLBACK}` },
  { id:'copperplate',label:'Copperplate',   css:`Copperplate, 'Copperplate Gothic Light', serif${EMOJI_FALLBACK}` },
];

// Full-width real Unicode emoji — no image assets, no GIF decoding, renders
// via the OS's own installed color-emoji font (see EMOJI_FALLBACK above),
// so this works fully offline with zero added bundle weight. Animated
// "emoticon GIFs" are a genuinely different feature (a sticker library +
// a way to actually animate GIF frames on a Fabric canvas, which Fabric
// does not do natively) — this project has no such asset source or
// GIF-frame-decoding library, so that part is intentionally NOT built
// here rather than faked with a static image relabeled as a GIF.
export const EMOJIS = [
  '😀','😁','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😋',
  '😎','🤩','🥳','🤗','🤔','🫡','😐','😴','😭','😡','🥺','😱',
  '👍','👎','👏','🙌','🙏','💪','✌️','🤝','👋','☝️','👉','🤟',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💯','✨',
  '⭐','🌟','🔥','⚡','🎉','🎊','🏆','🥇','🎓','🎖️','🏅','🚀',
  '✅','❌','❗','❓','💡','📌','📎','🔒','⚠️','♻️','🆕','🔰',
  '📚','✏️','🖊️','🖋️','📝','📋','📐','📏','✂️','🧵','🪡','🧶',
  '🏥','⚕️','🩺','💊','🩹','🧑‍⚕️','👩‍⚕️','👨‍⚕️','🚑','🧪','🔬','🦺',
  '🏫','🏢','🏛️','🏭','🏬','🏦','🏨','⛪','🕌','🕍','🛕','🇵🇭',
  '⚽','🏀','🏐','🏈','⚾','🎽','🥋','🏓','🎾','🏸','🚩','🎯',
  '👕','👖','🧥','🦺','🧢','👔','👗','👘','🥼','👚','🩳','🧦',
  '🐯','🦅','🦁','🐉','🦈','🐺','🦂','🐲','🌊','🌞','🌙','🌈',
];

// Real, Fabric-native shapes for the Shapes tool. Each entry is drawn by
// addShape() in useGarmentCanvas.js with the exact Fabric constructor
// listed — no placeholder buttons for shapes that don't actually draw
// anything (the master checklist explicitly calls this out: "inspect
// whether Line can safely be added — if yes, implement it with the same
// real Fabric object architecture; if no, do not put a dead Line button
// into the UI"). All four additions below (Triangle, Ellipse, Line, Star)
// use only standard Fabric.js classes already in this project's Fabric 6.x
// dependency — no new package needed.
// Maps Fabric's own `.type` string (set automatically by each shape class)
// to the label shown in layers/selection UI. Keyed off the real object,
// not a remembered "which button did they click" flag, so it can't drift
// from what's actually on the canvas. 'polygon' only ever means Star here
// (the only polygon-based shape addShape() creates) — if a second
// polygon-built shape is ever added, this map needs a second signal
// (e.g. a __starShape tag) to disambiguate.
export const SHAPE_TYPE_LABEL = {
  rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle',
  ellipse: 'Ellipse', line: 'Line', polygon: 'Star',
};

export const SHAPES = [
  { id:'rect',     label:'Rectangle', kind:'rect'     },
  { id:'circle',   label:'Circle',    kind:'circle'   },
  { id:'triangle', label:'Triangle',  kind:'triangle' },
  { id:'ellipse',  label:'Ellipse',   kind:'ellipse'  },
  { id:'line',     label:'Line',      kind:'line'     },
  { id:'star',     label:'Star',      kind:'star'     },
];


export const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

export const inputStyle = {
  width:'100%', padding:'9px 11px', borderRadius:9, fontSize:12,
  background:'#fff', border:'1px solid #e2e8f0',
  color:'#1a2332', outline:'none', boxSizing:'border-box', fontFamily: FONT,
};

export const TOOLS = [
  { id:'type',    icon:'garmentType', label:'Type',    primary:true, hint:'Choose a garment and sleeve' },
  { id:'color',   icon:'colorZone',   label:'Colors',  primary:true, hint:'Color each part of the garment' },
  { id:'assets',  icon:'logo',        label:'Assets',  primary:true, hint:'Logos, shapes and starter templates' },
  { id:'text',    icon:'text',        label:'Text',    primary:true, hint:'Add names, slogans or numbers' },
  { id:'draw',    icon:'draw',        label:'Draw',    hint:'Sketch freehand on the garment' },
  { id:'ai',      icon:'ai',          label:'AI',      hint:'Describe a design in words' },
  { id:'pattern', icon:'pattern',     label:'Pattern', hint:'Stripes, checks and more' },
  { id:'layers',  icon:'layersPanel', label:'Layers',  hint:'Reorder, hide or rename items' },
  { id:'summary', icon:'info',        label:'Summary' },
];

// 6 starter designs from VFRB's common garment types (PH institutional palette).
export const INSPO_TEMPLATES = [
  { id:'school-navy',  label:'School Navy',    category:'School Uniform', garment:'School Polo', sleeve:'Short',
    colors:{ body:'#1B2A4A', collar:'#FFFFFF', sleeve:'#1B2A4A', pocket:'#FFFFFF' } },
  { id:'school-white', label:'School White',   category:'School Uniform', garment:'School Polo', sleeve:'Short',
    colors:{ body:'#FFFFFF', collar:'#1B2A4A', sleeve:'#FFFFFF', pocket:'#1B2A4A' } },
  { id:'scrub-ceil',   label:'Ceil Blue Scrub', category:'Medical',       garment:'Scrub Top',   sleeve:'Short',
    colors:{ body:'#AED6F1', collar:'#FFFFFF', sleeve:'#AED6F1', pocket:'#2980B9' } },
  { id:'scrub-green',  label:'Surgical Green', category:'Medical',        garment:'Scrub Top',   sleeve:'Short',
    colors:{ body:'#006A4E', collar:'#FFFFFF', sleeve:'#006A4E', pocket:'#004D38' } },
  { id:'corp-polo',    label:'Corporate Polo', category:'Corporate',      garment:'Polo Shirt',  sleeve:'Short',
    colors:{ body:'#2952A3', collar:'#FFFFFF', sleeve:'#2952A3', pocket:'#1A3A6B' } },
];

// Blank-canvas start: garment is null until the customer actually drags one
// onto the canvas (see dragPlace.js / useDragPlace.js). A restored draft or
// mid-session sessionStorage copy always wins over this — this only applies
// to a genuinely fresh visit. `category` still defaults so the Type panel
// opens on a sensible garment grid instead of an empty one; it has no
// effect on the canvas by itself.
//
// Delegates to the single deserializeDesign() contract (designSerialization.js)
// instead of its own JSON.parse/try-catch — same defaulting/legacy-alias
// handling every other studio_config reader now shares, so a missing,
// partial or malformed sessionStorage value degrades to DEFAULT_CFG here
// exactly the same way it does everywhere else, instead of a second,
// slightly-different fallback living in this file.
export const INIT_CFG = () => {
  let raw = null;
  try { raw = sessionStorage.getItem('studio_config'); } catch {}
  return deserializeDesign(raw).cfg;
};

export function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '2,128,144';
}
