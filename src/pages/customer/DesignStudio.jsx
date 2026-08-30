// src/pages/customer/DesignStudio.jsx
// TASK C-1 — Design Studio v2 full rewrite
// Spec: PUBG/Barbie/Nike By You game-app feel
// BUG 2 FIXED: canvasEl ref object passed to hook (not .current)
// BUG: Google Fonts CDN removed (offline environment)
// New in v2: Pattern tab, sleeve selector, 18 PH swatches,
//            zone hover glow, garment card grid, logo placement presets,
//            font selector, Pollinations.ai texture, Save Design

import {
  useState, useEffect, useLayoutEffect, useRef, useCallback,
  useMemo, Component, Suspense, lazy
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import InlineColorPicker from '../../components/InlineColorPicker';
import { removeLogoBackground } from '../../lib/bgRemove';
import { NavIcon } from '../../components/ui/icons';

const T = '#028090', T2 = '#02C39A', DARK = '#060d1a', DARK2 = '#0a1628';
// UI font for labels, buttons, tooltips — offline-safe system stack
const FONT = `ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif`;

// ─────────────────────────────────────────────────────────────
// LAZY 3D — only downloads Three.js when user clicks "3D"
// ─────────────────────────────────────────────────────────────
const Scene3D = lazy(() => import('./DesignStudio3D'));

// ─────────────────────────────────────────────────────────────
// THREE.JS ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────
class ThreeEB extends Component {
  constructor(p) { super(p); this.state = { err: false, key: 0 }; }
  static getDerivedStateFromError() { return { err: true }; }
  retry = () => this.setState(s => ({ err: false, key: s.key + 1 }));
  render() {
    if (this.state.err) return (
      <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',background:DARK,gap:12 }}>
        <span style={{ fontSize:32 }}>⚠️</span>
        <p style={{ color:'rgba(255,255,255,.5)',fontSize:12,textAlign:'center',
          padding:'0 24px',lineHeight:1.6 }}>
          WebGL unavailable or context lost.<br/>Try refreshing or use 2D mode.
        </p>
        <button onClick={this.retry}
          style={{ padding:'8px 20px',borderRadius:9,border:'none',background:T2,
            color:'#000',fontSize:12,fontWeight:700,cursor:'pointer' }}>
          Retry 3D
        </button>
      </div>
    );
    return <div key={this.state.key} style={{ width:'100%',height:'100%' }}>
      {this.props.children}
    </div>;
  }
}

// ─────────────────────────────────────────────────────────────
// GARMENT DATA — SVG paths per garment + sleeve variant
// Each garment has base paths; sleeve variant modifies sleeveL/R
// ─────────────────────────────────────────────────────────────
const SLEEVE_VARIANTS = {
  // short sleeve = default; others modify the sleeve path length/angle
  'Sleeveless': (base) => ({ ...base, sleeveL: null, sleeveR: null }),
  'Short':      (base) => base,
  '3/4':        (base) => ({
    ...base,
    sleeveL: base.sleeveL?.replace(/L (\d+),(\d+) Z/, (_, x, y) => `L ${parseInt(x)-18},${parseInt(y)+28} Z`) ?? base.sleeveL,
    sleeveR: base.sleeveR?.replace(/L (\d+),(\d+) Z/, (_, x, y) => `L ${parseInt(x)+18},${parseInt(y)+28} Z`) ?? base.sleeveR,
  }),
  'Long':       (base) => ({
    ...base,
    sleeveL: base.sleeveL ? base.sleeveL.replace('L 50,105 L 35,75', 'L 20,130 L 5,95') : base.sleeveL,
    sleeveR: base.sleeveR ? base.sleeveR.replace('L 270,105 L 285,75', 'L 300,130 L 315,95') : base.sleeveR,
  }),
  'Raglan':     (base) => base, // same shape, different material color zone in 3D
};

const BASE_PATHS = {
  'Polo Shirt': {
    w:320, h:380,
    body:    'M 82,62 L 132,30 L 160,56 L 188,30 L 238,62 L 228,94 L 228,332 L 92,332 L 92,94 Z',
    collar:  'M 132,30 Q 146,48 160,56 Q 174,48 188,30 L 178,50 L 160,62 L 142,50 Z',
    sleeveL: 'M 82,62 L 92,94 L 50,108 L 36,76 Z',
    sleeveR: 'M 238,62 L 228,94 L 270,108 L 284,76 Z',
    pocket:  'M 104,122 L 138,122 L 138,160 L 104,160 Z',
  },
  'School Polo': {
    w:320, h:380,
    body:    'M 80,64 L 130,32 L 160,58 L 190,32 L 240,64 L 230,96 L 230,334 L 90,334 L 90,96 Z',
    collar:  'M 130,32 Q 145,50 160,58 Q 175,50 190,32 L 180,52 L 160,64 L 140,52 Z',
    sleeveL: 'M 80,64 L 90,96 L 48,110 L 34,78 Z',
    sleeveR: 'M 240,64 L 230,96 L 272,110 L 286,78 Z',
    pocket:  'M 102,120 L 136,120 L 136,158 L 102,158 Z',
  },
  'Round Neck': {
    w:320, h:380,
    body:    'M 80,60 L 130,30 L 160,44 L 190,30 L 240,60 L 230,90 L 230,330 L 90,330 L 90,90 Z',
    collar:  'M 138,40 Q 160,56 182,40 Q 174,28 160,26 Q 146,28 138,40 Z',
    sleeveL: 'M 80,60 L 90,90 L 48,106 L 34,74 Z',
    sleeveR: 'M 240,60 L 230,90 L 272,106 L 286,74 Z',
    pocket:  'M 102,116 L 134,116 L 134,154 L 102,154 Z',
  },
  'V-Neck Shirt': {
    w:320, h:380,
    body:    'M 78,60 L 128,28 L 160,82 L 192,28 L 242,60 L 232,90 L 232,334 L 88,334 L 88,90 Z',
    collar:  'M 128,28 L 160,82 L 192,28 L 182,50 L 160,80 L 138,50 Z',
    sleeveL: 'M 78,60 L 88,90 L 46,106 L 32,74 Z',
    sleeveR: 'M 242,60 L 232,90 L 274,106 L 288,74 Z',
    pocket:  null,
  },
  'Mandarin Collar': {
    w:320, h:380,
    body:    'M 80,60 L 132,28 L 160,38 L 188,28 L 240,60 L 230,90 L 230,332 L 90,332 L 90,90 Z',
    collar:  'M 145,38 L 175,38 L 179,60 L 160,66 L 141,60 Z',
    sleeveL: 'M 80,60 L 90,90 L 47,106 L 33,74 Z',
    sleeveR: 'M 240,60 L 230,90 L 273,106 L 287,74 Z',
    pocket:  null,
  },
  'Scrub Top': {
    w:320, h:390,
    body:    'M 78,60 L 130,26 L 160,64 L 190,26 L 242,60 L 232,90 L 232,340 L 88,340 L 88,90 Z',
    collar:  'M 138,38 L 182,38 L 186,60 L 160,68 L 134,60 Z',
    sleeveL: 'M 78,60 L 88,90 L 46,106 L 32,74 Z',
    sleeveR: 'M 242,60 L 232,90 L 274,106 L 288,74 Z',
    pocket:  'M 100,118 L 144,118 L 144,170 L 100,170 Z',
  },
  'Lab Coat': {
    w:340, h:440,
    body:    'M 70,60 L 130,24 L 170,24 L 170,380 L 85,380 L 70,340 Z M 170,24 L 210,24 L 270,60 L 255,340 L 170,380 Z',
    collar:  'M 130,24 L 160,28 L 160,60 L 148,56 Z M 170,24 L 200,24 L 192,56 L 180,60 L 180,28 Z',
    sleeveL: 'M 70,60 L 85,90 L 30,110 L 15,78 Z',
    sleeveR: 'M 270,60 L 255,90 L 310,110 L 325,78 Z',
    pocket:  'M 96,180 L 146,180 L 146,240 L 96,240 Z',
  },
  'Jersey': {
    w:310, h:370,
    body:    'M 84,58 L 130,26 L 160,50 L 190,26 L 236,58 L 228,88 L 228,326 L 92,326 L 92,88 Z',
    collar:  'M 140,38 Q 160,54 180,38 Q 172,26 160,24 Q 148,26 140,38 Z',
    sleeveL: 'M 84,58 L 92,88 L 50,104 L 36,72 Z',
    sleeveR: 'M 236,58 L 228,88 L 270,104 L 284,72 Z',
    pocket:  null,
  },
  'Button-Down': {
    w:320, h:390,
    body:    'M 78,58 L 130,26 L 160,36 L 190,26 L 242,58 L 232,90 L 232,336 L 88,336 L 88,90 Z',
    collar:  'M 130,26 L 150,36 L 160,34 L 170,36 L 190,26 L 180,50 L 160,60 L 140,50 Z',
    sleeveL: 'M 78,58 L 88,90 L 44,106 L 30,72 Z',
    sleeveR: 'M 242,58 L 232,90 L 276,106 L 290,72 Z',
    pocket:  'M 100,118 L 136,118 L 136,158 L 100,158 Z',
  },
  'Pants': {
    w:250, h:420,
    body:    'M 48,30 L 202,30 L 210,42 L 210,210 L 174,210 L 125,385 L 105,385 L 56,210 L 40,210 L 40,42 Z',
    collar:  'M 48,30 L 202,30 L 206,54 L 125,62 L 44,54 Z',
    sleeveL: null, sleeveR: null, pocket: null,
  },
  'Shorts': {
    w:250, h:300,
    body:    'M 48,30 L 202,30 L 208,42 L 208,148 L 170,148 L 125,248 L 105,248 L 60,148 L 42,148 L 42,42 Z',
    collar:  'M 48,30 L 202,30 L 204,54 L 125,62 L 46,54 Z',
    sleeveL: null, sleeveR: null, pocket: null,
  },
  'Track Pants': {
    w:250, h:440,
    body:    'M 44,26 L 206,26 L 216,40 L 216,220 L 178,220 L 128,400 L 108,400 L 58,220 L 34,220 L 34,40 Z',
    collar:  'M 44,26 L 206,26 L 212,52 L 125,60 L 38,52 Z',
    sleeveL: null, sleeveR: null, pocket: 'M 40,180 L 75,180 L 75,230 L 40,230 Z',
  },
  'Skirt': {
    w:260, h:360,
    body:    'M 70,30 L 190,30 L 230,50 L 250,340 L 10,340 L 30,50 Z',
    collar:  'M 70,30 L 190,30 L 196,56 L 125,62 L 54,56 Z',
    sleeveL: null, sleeveR: null, pocket: null,
  },
};

// Get paths with sleeve variant applied
function getGarmentPaths(garment, sleeve = 'Short') {
  const base = BASE_PATHS[garment] ?? BASE_PATHS['Polo Shirt'];
  const variant = SLEEVE_VARIANTS[sleeve];
  return variant ? variant(base) : base;
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES — full VFRB garment list from interview
// ─────────────────────────────────────────────────────────────
const CATS = [
  {
    id: 'Medical / Scrubs', icon: '🏥',
    garments: ['Scrub Top','V-Neck Shirt','Lab Coat','Pants','Shorts'],
  },
  {
    id: 'School Uniform', icon: '🏫',
    garments: ['School Polo','Round Neck','Polo Shirt','Pants','Shorts','Skirt'],
  },
  {
    id: 'Corporate', icon: '💼',
    garments: ['Polo Shirt','Mandarin Collar','Button-Down','V-Neck Shirt','Pants'],
  },
  {
    id: 'PE / Sports', icon: '⚽',
    garments: ['Jersey','Round Neck','Shorts','Track Pants'],
  },
];

// Sleeve options per garment (not all garments have sleeves)
const SLEEVE_OPTS = {
  'Polo Shirt':      ['Sleeveless','Short','3/4','Long'],
  'School Polo':     ['Short','3/4','Long'],
  'Round Neck':      ['Sleeveless','Short','3/4','Long'],
  'V-Neck Shirt':    ['Sleeveless','Short','3/4','Long'],
  'Mandarin Collar': ['Short','3/4','Long'],
  'Scrub Top':       ['Short','3/4'],
  'Lab Coat':        ['Long'],
  'Jersey':          ['Sleeveless','Short','Long','Raglan'],
  'Button-Down':     ['Short','Long'],
  'Pants':           [],
  'Shorts':          [],
  'Track Pants':     [],
  'Skirt':           [],
};

// ─────────────────────────────────────────────────────────────
// PHILIPPINE INSTITUTIONAL COLOR SWATCHES (18)
// ─────────────────────────────────────────────────────────────
const PH_SWATCHES = [
  { hex: '#1B2A4A', name: 'Navy'         },
  { hex: '#2952A3', name: 'Royal Blue'   },
  { hex: '#87CEEB', name: 'Sky Blue'     },
  { hex: '#006A4E', name: 'Bottle Green' },
  { hex: '#800000', name: 'Maroon'       },
  { hex: '#808080', name: 'Gray'         },
  { hex: '#000000', name: 'Black'        },
  { hex: '#FFFFFF', name: 'White'        },
  { hex: '#CC0000', name: 'Red'          },
  { hex: '#FFD700', name: 'Yellow'       },
  { hex: '#FF6600', name: 'Orange'       },
  { hex: '#6B21A8', name: 'Purple'       },
  { hex: '#028090', name: 'Teal'         },
  { hex: '#AED6F1', name: 'Light Blue'   },
  { hex: '#F5F0E8', name: 'Beige'        },
  { hex: '#8B4513', name: 'Brown'        },
  { hex: '#FFB6C1', name: 'Pink'         },
  { hex: '#808000', name: 'Olive'        },
];

const ZONE_KEYS  = ['body','collar','sleeve','pocket'];
const ZONE_LABEL = { body:'Body', collar:'Collar', sleeve:'Sleeve', pocket:'Pocket/Trim' };

// ─────────────────────────────────────────────────────────────
// PATTERN DEFINITIONS (applied as Fabric SVG pattern)
// ─────────────────────────────────────────────────────────────
const PATTERNS = [
  { id:'solid',      label:'Solid',       icon:'⬛', svg: null },
  { id:'hstripes',   label:'H-Stripes',   icon:'〰️',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><rect y="0" width="20" height="5" fill="${c}" opacity="0.35"/><rect y="10" width="20" height="5" fill="${c}" opacity="0.35"/></svg>` },
  { id:'vstripes',   label:'V-Stripes',   icon:'|||',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><rect x="0" width="5" height="20" fill="${c}" opacity="0.35"/><rect x="10" width="5" height="20" fill="${c}" opacity="0.35"/></svg>` },
  { id:'diagonal',   label:'Diagonal',    icon:'////',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><line x1="0" y1="20" x2="20" y2="0" stroke="${c}" stroke-width="4" opacity="0.35"/><line x1="-10" y1="20" x2="10" y2="0" stroke="${c}" stroke-width="4" opacity="0.35"/><line x1="10" y1="20" x2="30" y2="0" stroke="${c}" stroke-width="4" opacity="0.35"/></svg>` },
  { id:'checker',    label:'Checker',     icon:'⊞',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><rect x="0" y="0" width="10" height="10" fill="${c}" opacity="0.3"/><rect x="10" y="10" width="10" height="10" fill="${c}" opacity="0.3"/></svg>` },
  { id:'polka',      label:'Polka Dots',  icon:'⚬',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="transparent"/><circle cx="5" cy="5" r="3" fill="${c}" opacity="0.4"/><circle cx="15" cy="15" r="3" fill="${c}" opacity="0.4"/></svg>` },
  { id:'geometric',  label:'Geometric',   icon:'◈',
    svg: (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><polygon points="12,2 22,20 2,20" fill="none" stroke="${c}" stroke-width="1.5" opacity="0.35"/></svg>` },
  { id:'gradient',   label:'Gradient',    icon:'▓', svg: null }, // handled specially
];

// 5 font families for text tool
const FONTS = [
  { id:'bold',     label:'Bold Block',  css:'Arial Black, sans-serif' },
  { id:'clean',    label:'Clean',       css:'ui-sans-serif, system-ui, sans-serif' },
  { id:'serif',    label:'Serif',       css:'Georgia, serif' },
  { id:'mono',     label:'Military',    css:'Courier New, monospace' },
  { id:'script',   label:'Script',      css:'cursive' },
];

// Logo placement presets (% of canvas width/height)
const LOGO_PRESETS = [
  { id:'left_chest',   label:'Left Chest',    x: 0.31, y: 0.35 },
  { id:'center_chest', label:'Center',        x: 0.42, y: 0.38 },
  { id:'back_center',  label:'Back Center',   x: 0.42, y: 0.28 },
  { id:'left_arm',     label:'Left Arm',      x: 0.14, y: 0.28 },
  { id:'right_arm',    label:'Right Arm',     x: 0.70, y: 0.28 },
];

// ─────────────────────────────────────────────────────────────
// FABRIC.JS CANVAS HOOK — BUG 2 FIX
// BEFORE: useGarmentCanvas(canvasEl.current, ...) → null at render
// AFTER:  useGarmentCanvas(canvasEl, ...)         → ref object
//         reads .current INSIDE useEffect after mount
// ─────────────────────────────────────────────────────────────
function useGarmentCanvas(canvasRef, garment, sleeve, colors, patterns, onSelect, onZoneClick) {
  const fc      = useRef(null);
  const hoverEl = useRef(null); // animated hover outline rect
  // ── FIX: fabricReady flag — set after Canvas is constructed ───────────────
  // The garment redraw effect checks this before proceeding.
  // Without it: redraw fires while fabric import is still pending → fc.current
  // is null → garment never draws on first load (blank canvas bug).
  const fabricReady = useRef(false);

  // FIX (Aug 8 2026): tracks an in-flight async dispose() so the setup
  // effect can wait for it before creating a new canvas on the same DOM
  // node. Root cause of the "removeChild: node is not a child of this
  // node" crash — StrictMode is enabled (confirmed in main.jsx), which
  // double-invokes this effect on every mount (mount → cleanup → mount
  // again). Fabric v6's dispose() is async, and the cleanup below never
  // awaited it — so the *first* mount's teardown (still removing/
  // restructuring the DOM nodes Fabric wraps around <canvas>) could still
  // be running at the exact moment the *second* mount's `new fabric.Canvas`
  // started manipulating that same node. Two overlapping async DOM
  // mutations on one node is exactly what produces a DOM tree React's own
  // bookkeeping no longer matches, which is what "removeChild" crashes on
  // later. This isn't specific to resizing — StrictMode's double-invoke
  // happens on every mount, so the exact same race could fire on first
  // load too; it's a timing race, not a resize-specific bug.
  const disposePending = useRef(null); // Promise | null

  // ── UNDO / REDO history stack ───────────────────────────────
  // Stores serialized canvas overlay states (non-garment objects only).
  // Max 40 snapshots to stay memory-safe.
  const historyStack = useRef([]);   // array of JSON snapshots
  const historyIdx   = useRef(-1);   // pointer into stack
  const historyLock  = useRef(false); // prevent push during undo/redo restore
  // FIX (undo/redo buttons "do nothing"): historyIdx/historyStack are refs —
  // mutating .current never triggers a re-render, so canUndo/canRedo below
  // (which read those refs directly) kept showing stale values, and a
  // stale `disabled={true}` on a native <button> blocks onClick from firing
  // at all. This tick's value is never read anywhere — bumping it after
  // every push/undo/redo just forces the re-render that was missing, so
  // canUndo/canRedo re-evaluate against the refs' current values.
  const [, setHistoryTick] = useState(0);

  // ── LAYERS PANEL: same "tick forces re-render, refs hold truth" pattern
  // as historyTick above. The layer list itself is computed fresh from
  // fc.current.getObjects() on every render (see `layers` below) — this
  // tick's only job is to force that recomputation after a mutation that
  // doesn't otherwise touch React state (add/delete/reorder/rename/toggle,
  // undo/redo, face switch load).
  const [, setLayersTick] = useState(0);
  const bumpLayers = useCallback(() => setLayersTick(t => t + 1), []);

  // ── INIT: mount once ──────────────────────────────────────
  // FIX (BUG-007): useLayoutEffect, not useEffect — see note above the
  // hook body's cleanup function for why this is what actually closes
  // the "removeChild: not a child of this node" race, not just the
  // StrictMode disposePending guard (which is still needed separately
  // and is left untouched below).
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import('fabric').then(async (mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      // FIX: if a previous mount's dispose() is still in flight (StrictMode
      // double-invoke), wait for it to fully finish tearing down the old
      // canvas's DOM structure BEFORE constructing a new one on the same
      // node — this is what actually closes the race, not just re-ordering.
      if (disposePending.current) {
        try { await disposePending.current; } catch {}
      }
      // Effect was cleaned up (StrictMode double-invoke, or real unmount)
      // before this import resolved — do NOT create a canvas for a mount
      // that's already gone, or it collides with the next mount's canvas
      // on the same DOM node ("canvas already initialized" error).
      if (cancelled || !canvasRef.current) return;
      const paths = getGarmentPaths(garment, sleeve);

      fc.current = new fabric.Canvas(canvasRef.current, {
        width:  paths.w,
        height: paths.h,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
        selection: true,
      });

      // ── FIX: draw initial garment immediately after Canvas is ready ──────
      // If we wait for the second useEffect, it fires BEFORE fabric loads
      // (because it has no async import) and finds fc.current === null.
      // Drawing here guarantees the garment appears on first render.
      fabricReady.current = true;
      const drawInitialGarment = () => {
        const c = fc.current;
        if (!c) return;
        const initPaths = getGarmentPaths(garment, sleeve);
        const draw = (d, fill, zoneKey, idx) => {
          if (!d) return;
          const p = new fabric.Path(d, {
            fill, stroke:'rgba(0,0,0,.14)', strokeWidth:1.5,
            selectable:false, evented:true,
            __garmentBase:true, __zoneKey:zoneKey,
          });
          c.insertAt(idx, p);
        };
        draw(initPaths.body,    colors.body,                         'body',    0);
        draw(initPaths.collar,  colors.collar,                       'collar',  1);
        draw(initPaths.sleeveL, colors.sleeve ?? colors.body,        'sleeve',  2);
        draw(initPaths.sleeveR, colors.sleeve ?? colors.body,        'sleeve',  3);
        draw(initPaths.pocket,  colors.pocket  ?? colors.collar,     'pocket',  4);
        c.setWidth(initPaths.w);
        c.setHeight(initPaths.h);
        c.renderAll();
      };
      drawInitialGarment();

      // Extra renderAll after 200ms — ensures garment is visible even if
      // the container was zero-sized during the initial draw (e.g. onboarding modal)
      setTimeout(() => {
        if (fc.current) {
          fc.current.setWidth(fc.current.getWidth() || 620);
          fc.current.setHeight(fc.current.getHeight() || 680);
          fc.current.renderAll();
        }
      }, 250);

      // Mouse move → zone hover glow
      fc.current.on('mouse:move', (opt) => {
        const ptr = fc.current.getPointer(opt.e);
        const hit = fc.current.getObjects()
          .filter(o => o.__garmentBase && o.__zoneKey)
          .find(o => o.containsPoint(ptr));

        if (hoverEl.current) {
          fc.current.remove(hoverEl.current);
          hoverEl.current = null;
        }
        if (hit) {
          const bounds = hit.getBoundingRect();
          const rect = new fabric.Rect({
            left:   bounds.left - 2,
            top:    bounds.top  - 2,
            width:  bounds.width  + 4,
            height: bounds.height + 4,
            fill:   'transparent',
            stroke: T2,
            strokeWidth:     2,
            strokeDashArray: [6, 4],
            selectable: false,
            evented:    false,
            __hoverGlow: true,
          });
          hoverEl.current = rect;
          fc.current.add(rect);
          fc.current.renderAll();
        }
      });

      fc.current.on('mouse:out', () => {
        if (hoverEl.current) {
          fc.current.remove(hoverEl.current);
          hoverEl.current = null;
          fc.current.renderAll();
        }
      });

      // Click on garment zone → notify parent (opens color picker)
      // FIX: only treat this as a zone click if Fabric's own hit-testing
      // (opt.target) says nothing else was actually targeted — a logo/text
      // object sitting on top of a zone, or a transform control (resize
      // handle) on the currently-active object, must NOT also fire this.
      // The old code did its own independent point-in-polygon test against
      // zone shapes regardless of what was really clicked, so grabbing a
      // logo's resize handle (which geometrically sits over the body zone)
      // ALSO fired onZoneClick → setActiveZone + setTool('color') on every
      // single mousedown, switching the whole left panel out from under
      // an in-progress drag/resize gesture.
      fc.current.on('mouse:down', (opt) => {
        if (opt.target && !opt.target.__zoneKey) return;
        const ptr = fc.current.getPointer(opt.e);
        const hit = fc.current.getObjects()
          .filter(o => o.__garmentBase && o.__zoneKey)
          .find(o => o.containsPoint(ptr));
        if (hit?.__zoneKey) onZoneClick(hit.__zoneKey);
      });

      fc.current.on('selection:created', e => onSelect(e.selected?.[0] ?? null));
      fc.current.on('selection:updated', e => onSelect(e.selected?.[0] ?? null));
      fc.current.on('selection:cleared',  () => onSelect(null));
    }).catch(err => console.error('[DesignStudio] fabric load error:', err));

    return () => {
      cancelled = true;
      // Fabric v6: dispose() is async — must handle Promise to avoid
      // "canvas already initialized" error in React StrictMode
      //
      // FIX (BUG-007): this cleanup now runs inside useLayoutEffect, so it
      // fires synchronously during React's commit/mutation phase — before
      // React attempts its own removeChild on this subtree, not after (as
      // it would with plain useEffect's passive-effect timing). dispose()'s
      // synchronous portion (cleanupDOM, confirmed in fabric's own source)
      // restores the original single-<canvas> structure Fabric replaced at
      // construction time, so by the time React does its own removal the
      // DOM tree matches what React's fiber bookkeeping expects again.
      // The disposePending/StrictMode-double-invoke guard below is
      // unchanged — still required, still correct.
      if (fc.current) {
        const canvas = fc.current;
        fc.current = null;
        fabricReady.current = false;
        try {
          const result = canvas.dispose();
          if (result && typeof result.then === 'function') {
            // FIX: store this promise so the next mount's setup (StrictMode
            // double-invoke fires this almost immediately) can await it
            // before touching the same DOM node again.
            disposePending.current = result
              .catch(() => {}) // swallow async dispose errors
              .finally(() => { disposePending.current = null; });
          } else {
            disposePending.current = null;
          }
        } catch {
          disposePending.current = null;
        }
      } else {
        fabricReady.current = false;
      }
    };
  }, []); // ← empty deps: init once on mount

  // ── REDRAW when garment / sleeve / colors / patterns change ──
  useEffect(() => {
    const canvas = fc.current;
    // FIX: if fabric hasn't initialized yet, skip — the init effect draws
    // the first frame itself (drawInitialGarment above). Subsequent changes
    // (color picker, garment selector) run normally because fabricReady is true.
    if (!canvas || !fabricReady.current) return;

    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const paths = getGarmentPaths(garment, sleeve);

      // Remove old garment base layers, keep logos/text
      canvas.getObjects()
        .filter(o => o.__garmentBase || o.__hoverGlow)
        .forEach(o => canvas.remove(o));

      const makeZone = (d, fill, zoneKey, idx) => {
        if (!d) return;
        const patDef = PATTERNS.find(p => p.id === (patterns?.[zoneKey] ?? 'solid'));

        // Build pattern overlay if not solid
        // FIX: Fabric v6's Image.fromURL(url, options) is Promise-based —
        // there is no callback parameter. The old callback-style call here
        // silently did nothing (the function got destructured away as part
        // of an {crossOrigin, signal} options object, never invoked), which
        // is why pattern selection highlighted in the UI but never actually
        // applied to the canvas. Same fix as addLogo below.
        let fabricFill = fill;
        if (patDef?.svg) {
          const svgStr  = patDef.svg(fill);
          const blob    = new Blob([svgStr], { type:'image/svg+xml' });
          const url     = URL.createObjectURL(blob);
          fabric.Image.fromURL(url).then((img) => {
            if (!canvas) return;
            const pat = new fabric.Pattern({ source: img.getElement(), repeat:'repeat' });
            const obj = canvas.getObjects().find(o => o.__zoneKey === zoneKey);
            if (obj) { obj.set('fill', pat); canvas.renderAll(); }
            URL.revokeObjectURL(url);
          }).catch(() => { URL.revokeObjectURL(url); });
        }

        const p = new fabric.Path(d, {
          fill:            fabricFill,
          stroke:          'rgba(0,0,0,.14)',
          strokeWidth:     1.5,
          selectable:      false,
          evented:         true,
          __garmentBase:   true,
          __zoneKey:       zoneKey,
        });
        canvas.insertAt(idx, p);
      };

      makeZone(paths.body,    colors.body,                      'body',    0);
      makeZone(paths.collar,  colors.collar,                    'collar',  1);
      makeZone(paths.sleeveL, colors.sleeve ?? colors.body,     'sleeve',  2);
      makeZone(paths.sleeveR, colors.sleeve ?? colors.body,     'sleeve',  3);
      makeZone(paths.pocket,  colors.pocket ?? colors.collar,   'pocket',  4);

      canvas.setWidth(paths.w);
      canvas.setHeight(paths.h);
      canvas.renderAll();
    }).catch(() => {});
  }, [garment, sleeve, colors, patterns]);

  // ── History helpers — MUST be declared before addLogo/addText/deleteSelected
  //    which use pushHistory in their deps. Declaring after caused TDZ crash. ─
  const pushHistory = useCallback(() => {
    if (historyLock.current) return;
    const canvas = fc.current;
    if (!canvas) return;
    const snapshot = canvas.getObjects()
      .filter(o => !o.__garmentBase && !o.__hoverGlow)
      .filter(o => typeof o.toObject === 'function')  // guard: skip non-Fabric objects
      .map(o => o.toObject(['__logo','__text','__layerId','__layerName']));
    // Trim forward history when branching
    historyStack.current = historyStack.current.slice(0, historyIdx.current + 1);
    historyStack.current.push(snapshot);
    if (historyStack.current.length > 40) historyStack.current.shift();
    historyIdx.current = historyStack.current.length - 1;
    setHistoryTick(t => t + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current -= 1;
    setHistoryTick(t => t + 1);
    const snapshot = historyStack.current[historyIdx.current];
    historyLock.current = true;
    const canvas = fc.current;
    if (!canvas) { historyLock.current = false; return; }
    canvas.getObjects().filter(o => !o.__garmentBase && !o.__hoverGlow).forEach(o => canvas.remove(o));
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (!snapshot || snapshot.length === 0) { canvas.renderAll(); historyLock.current = false; bumpLayers(); return; }
      // Fabric v6: enlivenObjects returns Promise (no callback)
      Promise.resolve(fabric.util.enlivenObjects(snapshot))
        .then(enlivened => {
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          canvas.renderAll();
          historyLock.current = false;
          bumpLayers();
        })
        .catch(() => { historyLock.current = false; });
    }).catch(() => { historyLock.current = false; });
  }, [bumpLayers]);

  const redo = useCallback(() => {
    if (historyIdx.current >= historyStack.current.length - 1) return;
    historyIdx.current += 1;
    setHistoryTick(t => t + 1);
    const snapshot = historyStack.current[historyIdx.current];
    historyLock.current = true;
    const canvas = fc.current;
    if (!canvas) { historyLock.current = false; return; }
    canvas.getObjects().filter(o => !o.__garmentBase && !o.__hoverGlow).forEach(o => canvas.remove(o));
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      if (!snapshot || snapshot.length === 0) { canvas.renderAll(); historyLock.current = false; bumpLayers(); return; }
      // Fabric v6: enlivenObjects returns Promise (no callback)
      Promise.resolve(fabric.util.enlivenObjects(snapshot))
        .then(enlivened => {
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          canvas.renderAll();
          historyLock.current = false;
          bumpLayers();
        })
        .catch(() => { historyLock.current = false; });
    }).catch(() => { historyLock.current = false; });
  }, [bumpLayers]);

  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < historyStack.current.length - 1;

  // ── ACTIONS exposed to parent ──────────────────────────────

  const addLogo = useCallback((dataUrl, presetId = 'left_chest') => {
    const canvas = fc.current;
    if (!canvas) return;
    const paths  = getGarmentPaths(garment, sleeve);
    const preset = LOGO_PRESETS.find(p => p.id === presetId) ?? LOGO_PRESETS[0];
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      // FIX: Fabric v6's Image.fromURL(url, options) is Promise-based, no
      // callback param — the old call here never fired (function silently
      // discarded, exactly the same break as the pattern overlay above),
      // so a logo never actually got added to the canvas. Also corrects
      // { crossOrigin:'anonymous' } — it was landing in the 3rd (image
      // constructor options) argument instead of the 2nd (load options)
      // argument, so CORS mode was never actually being set either.
      fabric.Image.fromURL(dataUrl, { crossOrigin: 'anonymous' }).then((img) => {
        img.scaleToWidth(72);
        img.set({
          left: paths.w * preset.x, top: paths.h * preset.y, __logo: true,
          __layerId:   crypto.randomUUID(),
          __layerName: 'Logo',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        pushHistory();
        bumpLayers();
      }).catch(() => {});
    }).catch(() => {});
  }, [garment, sleeve, pushHistory, bumpLayers]);

  const addText = useCallback((text, color, fontCss, sizePx) => {
    const canvas = fc.current;
    if (!canvas) return;
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      const t = new fabric.IText(text, {
        left:       82,
        top:        165,
        fontSize:   sizePx ?? 18,
        fontFamily: fontCss ?? 'Arial Black, sans-serif',
        fill:       color,
        fontWeight: 'bold',
        __text:     true,
        __layerId:   crypto.randomUUID(),
        // Default layer name = the text itself (truncated) so the layers
        // panel is identifiable at a glance without an extra rename step;
        // still renameable via the panel like any other layer.
        __layerName: text.length > 20 ? text.slice(0, 20) + '…' : text,
      });
      canvas.add(t);
      canvas.setActiveObject(t);
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }).catch(() => {});
  }, [pushHistory, bumpLayers]);

  const deleteSelected = useCallback(() => {
    const canvas = fc.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj && !obj.__garmentBase && !obj.__hoverGlow) {
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.renderAll();
      pushHistory();
      bumpLayers();
    }
  }, [pushHistory, bumpLayers]);

  const exportOverlays = useCallback(() =>
    fc.current?.getObjects()
      .filter(o => !o.__garmentBase && !o.__hoverGlow)
      .filter(o => typeof o.toObject === 'function')  // guard: skip non-Fabric objects
      .map(o => o.toObject(['__logo','__text','__layerId','__layerName'])) ?? []
  , []);

  const exportPNG = useCallback(() =>
    fc.current?.toDataURL({ format:'png', multiplier:2 }) ?? null
  , []);

  // TASK O: serialize/deserialize non-garment overlay objects (logos, text)
  // Used by switchFace() to save/restore per-face canvas state
  const getCanvasJSON = useCallback(() => {
    const canvas = fc.current;
    if (!canvas) return [];
    return canvas.getObjects()
      .filter(o => !o.__garmentBase && !o.__hoverGlow)
      .filter(o => typeof o.toObject === 'function')  // guard: v6 safety
      .map(o => o.toObject(['__logo', '__text', '__layerId', '__layerName']));
  }, []);

  const loadCanvasJSON = useCallback((objects) => {
    const canvas = fc.current;
    if (!canvas || !Array.isArray(objects) || objects.length === 0) return;
    import('fabric').then((mod) => { const fabric = mod.fabric ?? mod.default ?? mod;
      // Remove existing overlay objects (keep garment base)
      canvas.getObjects()
        .filter(o => !o.__garmentBase && !o.__hoverGlow)
        .forEach(o => canvas.remove(o));
      // Restore saved objects
      // Fabric v6: enlivenObjects returns Promise (no callback) — the old
      // callback-style call below never fired in real v6, so loadCanvasJSON
      // silently restored nothing (broke save/load + front↔back switching).
      Promise.resolve(fabric.util.enlivenObjects(objects))
        .then(enlivened => {
          (enlivened ?? []).forEach(obj => canvas.add(obj));
          canvas.renderAll();
          bumpLayers();
        })
        .catch(() => {});
    }).catch(() => {});
  }, [bumpLayers]);

  // Task U fix: dismissOnboarding() (in the main component) needs to force a
  // canvas resize+redraw after the tutorial overlay closes — it can cover the
  // canvas causing zero-dimension sizing. fc is private to this hook; the
  // main component previously reached for `fc.current` directly, which
  // doesn't exist outside this function ("fc is not defined" — fc was never
  // in scope there). This exposes the same resize+redraw logic as a proper
  // callable action instead, consistent with every other canvas operation
  // already returned below (addLogo, exportPNG, etc.).
  const resizeCanvas = useCallback((wrapEl) => {
    const canvas = fc.current;
    if (!wrapEl || !canvas) return;
    const parent = wrapEl.closest('.ds-cv');
    if (parent) {
      const { width, height } = parent.getBoundingClientRect();
      if (width > 0 && height > 0) {
        canvas.setWidth(width);
        canvas.setHeight(height);
      }
    }
    canvas.renderAll();
  }, []);

  // ── LAYERS PANEL ACTIONS ─────────────────────────────────────
  // Layer list is read fresh from the live canvas on every render (see
  // `layers` below) — no separate metadata store to drift out of sync.
  // Legacy overlay objects saved before this feature existed won't have
  // __layerId yet; it's lazily assigned the first time they're listed,
  // then persists from then on (including through the next save/undo,
  // since __layerId is now part of the toObject() prop list above).
  const findLayer = useCallback((id) =>
    fc.current?.getObjects().find(o => o.__layerId === id) ?? null
  , []);

  const layers = (fc.current?.getObjects() ?? [])
    .filter(o => !o.__garmentBase && !o.__hoverGlow)
    .filter(o => typeof o.toObject === 'function')
    .map(o => {
      if (!o.__layerId) o.__layerId = crypto.randomUUID(); // lazy-assign for legacy objects
      return {
        id:      o.__layerId,
        type:    o.__logo ? 'logo' : 'text',
        name:    o.__layerName || (o.__logo ? 'Logo' : 'Text'),
        visible: o.visible !== false,
      };
    })
    .reverse(); // canvas array is back→front; panel shows front-most first

  const selectLayer = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
  }, [findLayer]);

  const toggleLayerVisibility = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    obj.set('visible', !(obj.visible !== false));
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  const renameLayer = useCallback((id, name) => {
    const obj = findLayer(id);
    if (!obj) return;
    obj.__layerName = name;
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  const deleteLayer = useCallback((id) => {
    const canvas = fc.current;
    const obj = findLayer(id);
    if (!canvas || !obj) return;
    if (canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.remove(obj);
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  // orderedIds: front-to-back (panel top-to-bottom). Garment-base zone
  // paths always occupy the lowest indices on the real canvas stack (they're
  // reinserted at indices 0..N on every color/pattern redraw — see the
  // garment redraw effect above) and are never part of this list, so we
  // offset every overlay's target index by however many base objects
  // currently exist rather than assuming a fixed count (some garments have
  // no pocket/sleeve path and so fewer base objects than others).
  const reorderLayers = useCallback((orderedIds) => {
    const canvas = fc.current;
    if (!canvas) return;
    const baseCount = canvas.getObjects().filter(o => o.__garmentBase).length;
    [...orderedIds].reverse().forEach((id, i) => {
      const obj = findLayer(id);
      if (obj) canvas.moveObjectTo(obj, baseCount + i);
    });
    canvas.renderAll();
    pushHistory();
    bumpLayers();
  }, [findLayer, pushHistory, bumpLayers]);

  return {
    addLogo, addText, deleteSelected, exportOverlays, exportPNG, getCanvasJSON, loadCanvasJSON,
    pushHistory, undo, redo, canUndo, canRedo, resizeCanvas,
    layers, selectLayer, toggleLayerVisibility, renameLayer, deleteLayer, reorderLayers,
  };
}

// ─────────────────────────────────────────────────────────────
// PANEL: TYPE SELECTOR (game character class picker)
// ─────────────────────────────────────────────────────────────
function TypePanel({ cfg, setCfg }) {
  const catData = CATS.find(c => c.id === cfg.category) ?? CATS[0];
  const sleeves = SLEEVE_OPTS[cfg.garment] ?? [];

  return (
    <div style={{ overflowY:'auto', flex:1, padding:'8px 8px 16px' }}>

      {/* Category tabs */}
      <p style={secLabel}>Category</p>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        {CATS.map(c => (
          <button key={c.id}
            onClick={() => setCfg(p => ({ ...p, category:c.id, garment:c.garments[0], sleeve:'Short' }))}
            style={{
              padding:'5px 10px', borderRadius:20, border:'none', cursor:'pointer',
              fontSize:10, fontWeight:700,
              background: cfg.category===c.id ? T : 'rgba(255,255,255,.06)',
              color:      cfg.category===c.id ? '#fff' : 'rgba(255,255,255,.45)',
              transition: 'all .13s',
            }}>
            {c.icon} {c.id.split('/')[0].trim()}
          </button>
        ))}
      </div>

      {/* Garment grid — game card style */}
      <p style={secLabel}>Garment</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
        {catData.garments.map(g => {
          const paths = BASE_PATHS[g] ?? BASE_PATHS['Polo Shirt'];
          const sel   = cfg.garment === g;
          return (
            <motion.button key={g}
              onClick={() => setCfg(p => ({
                ...p, garment:g,
                sleeve: (SLEEVE_OPTS[g]?.[0] ?? p.sleeve),
              }))}
              whileHover={{ scale: 1.03 }}
              whileTap={{   scale: 0.97 }}
              style={{
                padding:'8px 5px 6px', borderRadius:10, border:'none', cursor:'pointer',
                background: sel ? 'rgba(2,195,154,.14)' : 'rgba(255,255,255,.04)',
                outline:    sel ? `2px solid ${T2}` : '1px solid rgba(255,255,255,.07)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                position:'relative', overflow:'hidden',
              }}>
              {/* Mini SVG thumbnail */}
              <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width="44" height="52"
                style={{ display:'block', flexShrink:0 }}>
                {paths.body    && <path d={paths.body}    fill={cfg.colors.body   ?? '#1e3a5f'} stroke="#fff" strokeWidth="3"/>}
                {paths.collar  && <path d={paths.collar}  fill={cfg.colors.collar ?? '#c8a96e'} stroke="#fff" strokeWidth="2"/>}
                {paths.sleeveL && <path d={paths.sleeveL} fill={cfg.colors.sleeve ?? cfg.colors.body ?? '#1e3a5f'} stroke="#fff" strokeWidth="2"/>}
                {paths.sleeveR && <path d={paths.sleeveR} fill={cfg.colors.sleeve ?? cfg.colors.body ?? '#1e3a5f'} stroke="#fff" strokeWidth="2"/>}
                {paths.pocket  && <path d={paths.pocket}  fill={cfg.colors.pocket ?? cfg.colors.collar ?? '#c8a96e'} stroke="#fff" strokeWidth="1"/>}
              </svg>
              <span style={{ fontSize:9, fontWeight: sel?700:400,
                color: sel ? T2 : 'rgba(255,255,255,.5)', textAlign:'center' }}>
                {g}
              </span>
              {sel && (
                <span style={{ position:'absolute', top:5, right:5,
                  fontSize:9, background:T2, color:'#000', borderRadius:99,
                  padding:'1px 5px', fontWeight:800 }}>✓</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Sleeve selector — horizontal pill scroll */}
      {sleeves.length > 0 && (
        <>
          <p style={secLabel}>Sleeve</p>
          <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:4,
            scrollbarWidth:'none' }}>
            {sleeves.map(s => (
              <button key={s} onClick={() => setCfg(p => ({ ...p, sleeve:s }))}
                style={{
                  flexShrink:0, padding:'5px 12px', borderRadius:20, border:'none',
                  cursor:'pointer', fontSize:10, fontWeight:cfg.sleeve===s?700:400,
                  background: cfg.sleeve===s ? T : 'rgba(255,255,255,.06)',
                  color:      cfg.sleeve===s ? '#fff' : 'rgba(255,255,255,.4)',
                  whiteSpace:'nowrap', transition:'all .12s',
                }}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL: COLORS
// ─────────────────────────────────────────────────────────────
function ColorsPanel({ cfg, setCfg, activeZone, setActiveZone }) {
  const setColor = (zone, c) => setCfg(p => ({ ...p, colors:{ ...p.colors, [zone]:c } }));
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ overflowY:'auto', flex:1, padding:'8px 10px 16px' }}>
      {/* Zone selector */}
      <p style={secLabel}>Color Zone</p>
      <div style={{ display:'flex', gap:4, marginBottom:12, flexWrap:'wrap' }}>
        {ZONE_KEYS.map(z => (
          <button key={z} onClick={() => setActiveZone(z)}
            style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 9px',
              borderRadius:8, border:`1px solid ${activeZone===z?T2:'rgba(255,255,255,.08)'}`,
              background: activeZone===z ? 'rgba(2,195,154,.1)' : 'rgba(255,255,255,.03)',
              cursor:'pointer',
            }}>
            <div style={{ width:12,height:12,borderRadius:3,
              background:cfg.colors[z]??'#028090',
              border:'1px solid rgba(255,255,255,.2)' }}/>
            <span style={{ fontSize:10,
              color: activeZone===z ? T2 : 'rgba(255,255,255,.5)',
              fontWeight: activeZone===z ? 700 : 400 }}>
              {ZONE_LABEL[z]}
            </span>
          </button>
        ))}
      </div>

      {/* 18 PH swatches */}
      <p style={secLabel}>Philippine Colors</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:5, marginBottom:12 }}>
        {PH_SWATCHES.map(sw => (
          <motion.button key={sw.hex} title={sw.name}
            whileHover={{ scale:1.15 }} whileTap={{ scale:0.95 }}
            onClick={() => setColor(activeZone, sw.hex)}
            style={{
              height:28, borderRadius:6, cursor:'pointer', border:'none',
              background: sw.hex,
              outline: (cfg.colors[activeZone]??'').toLowerCase()===sw.hex.toLowerCase()
                ? '3px solid rgba(255,255,255,.9)' : '2px solid rgba(255,255,255,.08)',
            }}/>
        ))}
      </div>

      {/* Custom color — inline HSL picker replaces browser input[type=color] */}
      <p style={secLabel}>Custom Color</p>
      <div style={{ position:'relative' }}>
        <button
          onClick={() => setPickerOpen(p => !p)}
          style={{
            display:'flex', alignItems:'center', gap:9, width:'100%',
            padding:'8px 11px', borderRadius:9, cursor:'pointer',
            border:`1px solid ${pickerOpen ? T2 : 'rgba(255,255,255,.14)'}`,
            background: pickerOpen ? 'rgba(2,195,154,.08)' : 'rgba(255,255,255,.05)',
          }}>
          <div style={{
            width:22, height:22, borderRadius:6, flexShrink:0,
            background:cfg.colors[activeZone]??'#028090',
            border:'1px solid rgba(255,255,255,.22)',
          }}/>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.6)', fontFamily:'monospace' }}>
            {cfg.colors[activeZone]??'#028090'}
          </span>
          <span style={{ marginLeft:'auto', fontSize:9, color:'rgba(255,255,255,.3)' }}>
            {pickerOpen ? '▲' : '▼'}
          </span>
        </button>

        {/* Inline picker — mounts below the button */}
        {pickerOpen && (
          <InlineColorPicker
            value={cfg.colors[activeZone]??'#028090'}
            onChange={hex => setColor(activeZone, hex)}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
// PANEL: LOGO UPLOAD
// ─────────────────────────────────────────────────────────────
function LogoPanel({ onAdd }) {
  const fileRef   = useRef(null);
  const [drag,    setDrag]    = useState(false);
  const [preview, setPreview] = useState(null);
  const [preset,  setPreset]  = useState('left_chest');
  // Task 2 (logo auto-transparency): background removal runs client-side
  // and the RMBG-1.4 model is ~176MB on first use in a browser (cached
  // after) — this can take a few seconds to tens of seconds, so the
  // customer needs to see *something* is happening, not a frozen panel.
  const [removingBg, setRemovingBg] = useState(false);

  const handle = async file => {
    if (!file) return;
    const ok = ['image/png','image/svg+xml','image/jpeg','image/webp'];
    if (!ok.includes(file.type)) { alert('PNG, SVG, JPG only'); return; }
    if (file.size > 5*1024*1024) { alert('Max 5 MB'); return; }

    // SVGs are already vector/transparent by nature — running raster
    // background removal on one would just rasterize it for no benefit,
    // so skip straight to the original path for that type only.
    let toAdd = file;
    if (file.type !== 'image/svg+xml') {
      setRemovingBg(true);
      try {
        toAdd = await removeLogoBackground(file);
      } finally {
        setRemovingBg(false);
      }
    }

    const r = new FileReader();
    r.onload = e => { setPreview(e.target.result); onAdd(e.target.result, preset); };
    r.readAsDataURL(toAdd);
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10,
      flex:1, overflowY:'auto' }}>
      <p style={secLabel}>Placement Preset</p>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
        {LOGO_PRESETS.map(p => (
          <button key={p.id} onClick={() => setPreset(p.id)}
            style={{
              padding:'4px 9px', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:9, fontWeight: preset===p.id ? 700 : 400,
              background: preset===p.id ? T : 'rgba(255,255,255,.06)',
              color:      preset===p.id ? '#fff' : 'rgba(255,255,255,.4)',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      <div
        onDragOver={e=>{e.preventDefault();if(!removingBg)setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);if(!removingBg)handle(e.dataTransfer.files?.[0]);}}
        onClick={()=>{if(!removingBg)fileRef.current?.click();}}
        style={{
          padding:'22px 12px', borderRadius:12, textAlign:'center',
          cursor: removingBg ? 'wait' : 'pointer',
          border:`2px dashed ${drag?T2:'rgba(2,195,154,.3)'}`,
          background: drag ? 'rgba(2,195,154,.07)' : 'rgba(255,255,255,.02)',
          transition:'all .15s', opacity: removingBg ? 0.6 : 1,
        }}>
        {removingBg ? (
          <>
            <p style={{ fontSize:24, margin:'0 0 6px' }}>✨</p>
            <p style={{ fontSize:11, fontWeight:700, color:T2, margin:'0 0 3px' }}>
              Removing background…
            </p>
            <p style={{ fontSize:9, color:'rgba(255,255,255,.25)', margin:0 }}>
              First logo on this device may take longer
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize:24, margin:'0 0 6px' }}>📁</p>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)', margin:'0 0 3px' }}>
              Drop logo or click to browse
            </p>
            <p style={{ fontSize:9, color:'rgba(255,255,255,.25)', margin:0 }}>
              PNG · SVG · JPG · WEBP · max 5 MB
            </p>
            <p style={{ fontSize:9, color:'rgba(2,195,154,.4)', margin:'4px 0 0' }}>
              📷 Mobile: tap to use camera · background removed automatically
            </p>
          </>
        )}
        {/* capture=environment: opens rear camera on mobile for logo capture */}
        <input ref={fileRef} type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          capture="environment"
          disabled={removingBg}
          style={{ display:'none' }}
          onChange={e=>handle(e.target.files?.[0])}/>
      </div>

      {preview && (
        <div style={{ padding:'10px', borderRadius:10, textAlign:'center',
          background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
          <p style={{ fontSize:9,color:'rgba(255,255,255,.3)',margin:'0 0 6px',
            textTransform:'uppercase',letterSpacing:'.07em' }}>Preview</p>
          <img src={preview} alt="logo"
            style={{ maxWidth:88,maxHeight:68,objectFit:'contain',borderRadius:6,
              border:'1px solid rgba(255,255,255,.1)' }}/>
          <p style={{ fontSize:9,color:'rgba(255,255,255,.25)',margin:'7px 0 0' }}>
            Drag on canvas · Corner handles resize
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL: TEXT
// ─────────────────────────────────────────────────────────────
function TextPanel({ onAdd }) {
  const [val,   setVal]   = useState('');
  const [clr,   setClr]   = useState('#ffffff');
  const [font,  setFont]  = useState(FONTS[0].id);
  const [size,  setSize]  = useState(18);

  const fontCss = FONTS.find(f=>f.id===font)?.css ?? FONTS[0].css;

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10,
      flex:1, overflowY:'auto' }}>

      <p style={secLabel}>Text / Name / Number</p>
      <input value={val} onChange={e=>setVal(e.target.value)}
        placeholder="e.g. VFRB Enterprise" maxLength={32}
        style={inputStyle}/>

      <p style={secLabel}>Font Style</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
        {FONTS.map(f => (
          <button key={f.id} onClick={() => setFont(f.id)}
            style={{
              padding:'6px 4px', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:10, fontFamily: f.css,
              background: font===f.id ? 'rgba(2,195,154,.14)' : 'rgba(255,255,255,.04)',
              color:      font===f.id ? T2 : 'rgba(255,255,255,.5)',
              outline:    font===f.id ? `1px solid ${T2}` : '1px solid rgba(255,255,255,.07)',
              fontWeight: font===f.id ? 700 : 400,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <p style={secLabel}>Color</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4 }}>
        {['#ffffff','#000000',T,T2,'#fbbf24','#dc2626',
          '#3b82f6','#7c3aed','#16a34a','#f97316','#c8a96e','#94a3b8'].map(c=>(
          <button key={c} onClick={()=>setClr(c)}
            style={{
              height:24,borderRadius:5,cursor:'pointer',border:'none',background:c,
              outline:clr===c?'2px solid rgba(255,255,255,.85)':'1px solid rgba(255,255,255,.1)',
            }}/>
        ))}
      </div>

      <p style={secLabel}>Size: {size}px</p>
      <input type="range" min="10" max="72" value={size}
        onChange={e=>setSize(Number(e.target.value))}
        style={{ width:'100%', accentColor:T2 }}/>

      <button onClick={()=>{ if(val.trim()) onAdd(val.trim(), clr, fontCss, size); }}
        disabled={!val.trim()}
        style={{
          padding:'9px', borderRadius:9, border:'none',
          background: val.trim() ? `linear-gradient(135deg,${T},${T2})` : 'rgba(255,255,255,.08)',
          color:'#fff', fontSize:12, fontWeight:700, cursor: val.trim()?'pointer':'not-allowed',
        }}>
        ✏️ Add to Canvas
      </button>

      {val && (
        <div style={{ padding:'10px', borderRadius:9,
          background:'rgba(0,0,0,.3)', textAlign:'center' }}>
          <p style={{ color:clr, fontSize:size>32?22:size, fontFamily:fontCss,
            fontWeight:800, letterSpacing:2, textTransform:'uppercase', margin:0,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {val}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL: AI PROMPT
// ─────────────────────────────────────────────────────────────
function AIPanel({ onApply, onTexture }) {
  const [prompt, setPrompt] = useState('');
  const [busy,   setBusy]   = useState(false);
  const [msg,    setMsg]    = useState('');
  const [err,    setErr]    = useState('');
  const [texUrl, setTexUrl] = useState('');

  const EXAMPLES = [
    'Navy blue school polo, white collar, left chest pocket',
    'Green medical scrubs, V-neck, minimalist',
    'Red and black sports jersey, sleeveless, bold font',
    'Teal corporate polo, mandarin collar, clean',
  ];

  const getCached = p => { try { return JSON.parse(sessionStorage.getItem(`ai_d_${btoa(unescape(encodeURIComponent(p.slice(0,60))))}`)); } catch { return null; } };
  const setCache  = (p,v) => { try { sessionStorage.setItem(`ai_d_${btoa(unescape(encodeURIComponent(p.slice(0,60))))}`, JSON.stringify(v)); } catch {} };

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setErr(''); setMsg('');
    const cached = getCached(prompt.trim());
    if (cached) { onApply(cached); setMsg('✓ Applied (cached)'); setBusy(false); return; }
    try {
      const { data } = await axios.post('/api/ai/describe-design', { description:prompt });
      if (!data?.config) { setErr('No config returned. Try rephrasing.'); return; }
      setCache(prompt.trim(), data.config);
      onApply(data.config);
      setMsg(data.interpretation ?? '✓ Design applied!');
    } catch(e) {
      setErr(e.response?.data?.error ?? 'AI unavailable. Check GEMINI_API_KEY in .env');
    } finally { setBusy(false); }
  };

  // Pollinations.ai: free, no API key — generates texture inspiration image
  const getTexture = () => {
    if (!prompt.trim()) return;
    // Pollinations.ai is an external CDN — only attempt if online
    if (!navigator.onLine) { setErr('Texture requires internet connection.'); return; }
    const encoded = encodeURIComponent(`${prompt} fabric texture seamless pattern`);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=256&height=256&nologo=true`;
    setTexUrl(url);
    onTexture?.(url);
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10,
      flex:1, overflowY:'auto' }}>

      <div style={{ padding:'10px 12px', borderRadius:10,
        background:'rgba(2,195,154,.07)', border:'1px solid rgba(2,195,154,.2)' }}>
        <p style={{ fontSize:11,fontWeight:700,color:T2,margin:'0 0 3px' }}>
          🤖 AI Design Generator
        </p>
        <p style={{ fontSize:10,color:'rgba(255,255,255,.4)',margin:0,lineHeight:1.5 }}>
          Describe your uniform — Gemini fills all zones. Results cached per session.
        </p>
      </div>

      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={3}
        placeholder="e.g. Navy blue school polo, white collar, left chest pocket"
        onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();generate();} }}
        style={{ ...inputStyle, resize:'none', lineHeight:1.6 }}/>

      <div style={{ display:'flex', gap:6 }}>
        <button onClick={generate} disabled={busy||!prompt.trim()}
          style={{
            flex:1, padding:'8px', borderRadius:9, border:'none',
            cursor: busy||!prompt.trim() ? 'not-allowed' : 'pointer',
            background: busy ? 'rgba(255,255,255,.08)' : `linear-gradient(135deg,${T},${T2})`,
            color:'#fff', fontSize:11, fontWeight:700,
          }}>
          {busy ? '⏳ Thinking…' : '✨ Generate'}
        </button>
        <button onClick={getTexture} disabled={!prompt.trim()} title="Get texture from Pollinations.ai"
          style={{
            padding:'8px 10px', borderRadius:9, border:`1px solid rgba(2,195,154,.25)`,
            cursor: !prompt.trim() ? 'not-allowed' : 'pointer',
            background:'rgba(2,195,154,.07)', color:T2, fontSize:11, fontWeight:700,
          }}>
          🖼 Texture
        </button>
      </div>

      {err && <p style={{ fontSize:10,color:'#fca5a5',margin:0 }}>⚠ {err}</p>}
      {msg && (
        <div style={{ padding:'8px 10px',borderRadius:9,
          background:'rgba(34,197,94,.07)',border:'1px solid rgba(34,197,94,.2)' }}>
          <p style={{ fontSize:10,color:'#86efac',margin:0 }}>{msg}</p>
        </div>
      )}

      {texUrl && (
        <div style={{ borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,.1)' }}>
          <p style={{ fontSize:9,color:'rgba(255,255,255,.3)',margin:'0 0 4px',
            padding:'6px 8px 0', textTransform:'uppercase',letterSpacing:'.07em' }}>
            Texture Inspiration (Pollinations.ai)
          </p>
          <img src={texUrl} alt="texture" style={{ width:'100%',display:'block' }}
            onError={()=>setTexUrl('')}/>
        </div>
      )}

      <p style={secLabel}>Quick Examples</p>
      {EXAMPLES.map((ex,i) => (
        <button key={i} onClick={()=>setPrompt(ex)}
          style={{ padding:'7px 9px',borderRadius:8,
            border:'1px solid rgba(255,255,255,.07)',
            background:'rgba(255,255,255,.03)',color:'rgba(255,255,255,.4)',
            fontSize:10,cursor:'pointer',textAlign:'left',lineHeight:1.4 }}>
          {ex}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL: PATTERN LIBRARY
// ─────────────────────────────────────────────────────────────
function PatternPanel({ cfg, setCfg, activeZone }) {
  const zonePattern = cfg.patterns?.[activeZone] ?? 'solid';
  const setPattern  = (id) => setCfg(p => ({
    ...p, patterns: { ...(p.patterns??{}), [activeZone]:id }
  }));

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10,
      flex:1, overflowY:'auto' }}>

      <div style={{ padding:'9px 11px',borderRadius:9,
        background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)' }}>
        <p style={{ fontSize:11,fontWeight:700,color:'#fff',margin:'0 0 2px' }}>
          Pattern Overlay
        </p>
        <p style={{ fontSize:10,color:'rgba(255,255,255,.35)',margin:0 }}>
          Applied on top of zone color. Select zone in Colors tab.
        </p>
      </div>

      <p style={secLabel}>Active Zone: <span style={{ color:T2 }}>{ZONE_LABEL[activeZone]}</span></p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
        {PATTERNS.map(pat => {
          const sel = zonePattern === pat.id;
          return (
            <motion.button key={pat.id}
              onClick={() => setPattern(pat.id)}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              style={{
                padding:'10px 4px 7px', borderRadius:10, border:'none', cursor:'pointer',
                background: sel ? 'rgba(2,195,154,.14)' : 'rgba(255,255,255,.04)',
                outline:    sel ? `2px solid ${T2}` : '1px solid rgba(255,255,255,.07)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              }}>
              <span style={{ fontSize:18 }}>{pat.icon}</span>
              <span style={{ fontSize:9, color: sel?T2:'rgba(255,255,255,.45)',
                fontWeight:sel?700:400, textAlign:'center' }}>
                {pat.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL: LAYERS — lists overlay objects (logos/text) on the current
// face, front-most first. Reorder via native HTML5 drag-and-drop —
// matches this file's existing LogoPanel dropzone pattern, no drag
// library dependency added.
// ─────────────────────────────────────────────────────────────
function LayersPanel({ layers, selectedId, onSelect, onToggleVisibility, onRename, onDelete, onReorder }) {
  const [dragId, setDragId]       = useState(null);
  const [overId, setOverId]       = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal]     = useState('');

  const commitRename = () => {
    if (editingId && editVal.trim()) onRename(editingId, editVal.trim());
    setEditingId(null);
  };

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids  = layers.map(l => l.id);
    const from = ids.indexOf(dragId);
    const to   = ids.indexOf(targetId);
    if (from === -1 || to === -1) { setDragId(null); setOverId(null); return; }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    onReorder(next);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:6,
      flex:1, overflowY:'auto' }}>
      <p style={secLabel}>Layers on this side · {layers.length}</p>

      {layers.length === 0 ? (
        <div style={{ padding:'26px 10px', textAlign:'center' }}>
          <p style={{ fontSize:22, margin:'0 0 6px', opacity:.35 }}>🗂️</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,.35)', margin:0 }}>
            Add a logo or text to see it here
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {layers.map(layer => {
            const isSel  = layer.id === selectedId;
            const isOver = overId === layer.id && dragId && dragId !== layer.id;
            return (
              <div key={layer.id}
                draggable
                onDragStart={() => setDragId(layer.id)}
                onDragOver={e => { e.preventDefault(); if (overId !== layer.id) setOverId(layer.id); }}
                onDragLeave={() => setOverId(o => o === layer.id ? null : o)}
                onDrop={e => { e.preventDefault(); handleDrop(layer.id); }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onClick={() => onSelect(layer.id)}
                style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'7px 8px', borderRadius:8, cursor:'grab',
                  background: isSel ? 'rgba(2,195,154,.14)' : 'rgba(255,255,255,.03)',
                  border: isSel ? `1px solid ${T2}` : '1px solid rgba(255,255,255,.06)',
                  outline: isOver ? `2px solid ${T2}` : 'none',
                  opacity: dragId === layer.id ? .4 : 1,
                  transition:'background .12s, opacity .12s',
                }}>
                <span style={{ fontSize:9, color:'rgba(255,255,255,.22)' }}>⠿</span>
                <span style={{ fontSize:13 }}>{layer.type === 'logo' ? '🖼️' : '✏️'}</span>

                {editingId === layer.id ? (
                  <input autoFocus value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingId(null);
                      e.stopPropagation();
                    }}
                    onClick={e => e.stopPropagation()}
                    maxLength={24}
                    style={{ flex:1, fontSize:11, background:'transparent', border:'none',
                      borderBottom:`1px solid ${T2}`, color:'#fff', outline:'none', minWidth:0 }}/>
                ) : (
                  <span
                    onDoubleClick={e => { e.stopPropagation(); setEditingId(layer.id); setEditVal(layer.name); }}
                    title={`${layer.name} — double-click to rename`}
                    style={{ flex:1, fontSize:11, color: isSel ? '#fff' : 'rgba(255,255,255,.7)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
                    {layer.name}
                  </span>
                )}

                <button onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2,
                    fontSize:12, opacity: layer.visible ? .6 : .28, lineHeight:1 }}>
                  {layer.visible ? '👁️' : '🚫'}
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(layer.id); }}
                  title="Delete layer"
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2,
                    fontSize:12, opacity:.45, lineHeight:1 }}>
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize:9, color:'rgba(255,255,255,.2)', textAlign:'center', margin:'8px 0 0' }}>
        Top = front · Drag to reorder · Double-click to rename
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────────────────────
const secLabel = {
  fontSize:9, fontWeight:700, textTransform:'uppercase',
  letterSpacing:'.09em', color:'rgba(255,255,255,.28)',
  margin:'10px 0 5px 1px',
};
const inputStyle = {
  width:'100%', padding:'9px 11px', borderRadius:9, fontSize:12,
  background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.14)',
  color:'#fff', outline:'none', boxSizing:'border-box',
  fontFamily:FONT,
};

// ─────────────────────────────────────────────────────────────
// TOOLS CONFIG
// ─────────────────────────────────────────────────────────────
// FIX (visual redesign, Aug 30 2026): icons are now lucide-react names
// resolved via NavIcon (src/components/ui/icons.jsx), matching the
// Figma reference's clean line-icon language instead of emoji — same
// fix direction as the design-system audit's src/components/ui/
// primitives (item 13), now extended to Design Studio's tool strip.
const TOOLS = [
  { id:'type',    icon:'garmentType', label:'Type'    },
  { id:'color',   icon:'colorZone',   label:'Colors'  },
  { id:'logo',    icon:'logo',        label:'Logo'    },
  { id:'text',    icon:'text',        label:'Text'    },
  { id:'ai',      icon:'ai',          label:'AI'      },
  { id:'pattern', icon:'pattern',     label:'Pattern' },
  { id:'layers',  icon:'layersPanel', label:'Layers'  },
];

// ─────────────────────────────────────────────────────────────
// INSPIRATION TEMPLATES — 6 starter designs from VFRB's most
// common garment types. Colors from Philippine institutional palette.
// ─────────────────────────────────────────────────────────────
const INSPO_TEMPLATES = [
  {
    id:'school-navy',   label:'School Navy',   category:'School Uniform',
    garment:'School Polo', sleeve:'Short',
    colors:{ body:'#1B2A4A', collar:'#FFFFFF', sleeve:'#1B2A4A', pocket:'#FFFFFF' },
  },
  {
    id:'school-white',  label:'School White',  category:'School Uniform',
    garment:'School Polo', sleeve:'Short',
    colors:{ body:'#FFFFFF', collar:'#1B2A4A', sleeve:'#FFFFFF', pocket:'#1B2A4A' },
  },
  {
    id:'scrub-ceil',    label:'Ceil Blue Scrub', category:'Medical',
    garment:'Scrub Top', sleeve:'Short',
    colors:{ body:'#AED6F1', collar:'#FFFFFF', sleeve:'#AED6F1', pocket:'#2980B9' },
  },
  {
    id:'scrub-green',   label:'Surgical Green', category:'Medical',
    garment:'Scrub Top', sleeve:'Short',
    colors:{ body:'#006A4E', collar:'#FFFFFF', sleeve:'#006A4E', pocket:'#004D38' },
  },
  {
    id:'corp-polo',     label:'Corporate Polo', category:'Corporate',
    garment:'Polo Shirt', sleeve:'Short',
    colors:{ body:'#2952A3', collar:'#FFFFFF', sleeve:'#2952A3', pocket:'#1A3A6B' },
  },
  {
    id:'pe-jersey',     label:'PE Jersey',      category:'PE / Sports',
    garment:'Jersey', sleeve:'Short',
    colors:{ body:'#E63946', collar:'#FFFFFF', sleeve:'#FFFFFF', pocket:'#E63946' },
  },
];

// ─────────────────────────────────────────────────────────────
// INIT CONFIG — restore from sessionStorage
// ─────────────────────────────────────────────────────────────
const INIT_CFG = () => {
  try {
    const s = sessionStorage.getItem('studio_config');
    if (s) return JSON.parse(s);
  } catch {}
  return {
    category: 'School Uniform',
    garment:  'School Polo',
    sleeve:   'Short',
    colors:   { body:'#1e3a5f', collar:'#c8a96e', sleeve:'#1e3a5f', pocket:'#c8a96e' },
    patterns: { body:'solid', collar:'solid', sleeve:'solid', pocket:'solid' },
  };
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function DesignStudio() {
  const nav      = useNavigate();
  // BUG 2 FIX: canvasEl is the ref OBJECT — hook reads .current inside useEffect
  const canvasEl     = useRef(null);
  // Responsive canvas: measure the .ds-cv container so the canvas fills it
  const canvasWrapRef = useRef(null);

  const [cfg,        setCfg]        = useState(INIT_CFG);
  const [tool,       setTool]       = useState('type');
  const [viewMode,   setViewMode]   = useState('2d');
  // FIX (BUG-007): once the 3D view has been requested once, keep it mounted
  // permanently and toggle CSS visibility instead of JSX-unmounting it —
  // Three.js/Scene3D still only loads on the FIRST "3D" click (this flag),
  // it just never gets torn down again afterward.
  const [has3DLoaded, setHas3DLoaded] = useState(false);
  const [face,       setFace]       = useState('front');   // front / back
  const faceJSON = useRef({ front: [], back: [] }); // TASK O: per-face canvas state

  const [selObj,     setSelObj]     = useState(null);
  const [activeZone, setActiveZone] = useState('body');
  const [aiPulse,    setAiPulse]    = useState(false);     // teal pulse overlay on AI gen
  const [saved,      setSaved]      = useState(false);
  const [showInspo,  setShowInspo]  = useState(false); // inspiration gallery overlay
  const [draftSaved, setDraftSaved] = useState(false); // "Draft saved to cloud" feedback
  const [draftRestored, setDraftRestored] = useState(false); // banner on restore
  const autoSaveTimer = useRef(null);

  // ── Task U: first-visit onboarding overlay ────────────────────────────────
  // localStorage key 'studio_visited' — set once on dismiss, never shown again.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep,    setOnboardStep]    = useState(0);   // 0-3 (4 steps total)

  // ── Task U: show onboarding on first visit ───────────────────────────────
  // Runs once on mount. Deferred 600ms so the canvas and garment SVG have time
  // to render first — the tooltip arrows point at real UI elements.
  useEffect(() => {
    try {
      if (!localStorage.getItem('studio_visited')) {
        const t = setTimeout(() => setShowOnboarding(true), 600);
        return () => clearTimeout(t);
      }
    } catch { /* localStorage blocked (private mode) — skip silently */ }
  }, []);

  // dismissOnboarding/nextOnboardStep moved below useGarmentCanvas — dismissOnboarding
  // depends on resizeCanvas, which doesn't exist until the hook is destructured.
  // Referencing it here in a useCallback deps array (evaluated immediately,
  // unlike the callback body) would throw "Cannot access 'resizeCanvas' before
  // initialization" — the same TDZ failure this file already fixed once for
  // undo/redo below.

  // ── Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo ──────────
  // ── Responsive canvas scaling — fills .ds-cv container ───────────────────
  // Uses ResizeObserver to scale the canvas wrapper whenever the container
  // changes size (window resize, sidebar collapse). The SVG paths keep their
  // natural coordinates; we just CSS-scale the canvas wrapper element.
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const parent = wrap.closest('.ds-cv');
    if (!parent) return;
    const scale = () => {
      const available = parent.offsetWidth - 32; // 16px padding each side
      const svgW = BASE_PATHS[cfg.garment]?.w ?? 320;
      const ratio = Math.min(1.4, Math.max(0.5, available / svgW)); // clamp 50%–140%
      wrap.style.transform = `scale(${ratio})`;
      wrap.style.transformOrigin = 'center top';
    };
    scale();
    const ro = new ResizeObserver(scale);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [cfg.garment]);

  // BUG 2 FIX: pass canvasEl (ref object), not canvasEl.current (null at render)
  const { addLogo, addText, deleteSelected, exportOverlays, exportPNG, getCanvasJSON, loadCanvasJSON,
          pushHistory, undo, redo, canUndo, canRedo, resizeCanvas,
          layers, selectLayer, toggleLayerVisibility, renameLayer, deleteLayer, reorderLayers } =
    useGarmentCanvas(
      canvasEl,
      cfg.garment,
      cfg.sleeve,
      cfg.colors,
      cfg.patterns,
      setSelObj,
      (zone) => { setActiveZone(zone); setTool('color'); }  // zone click → open color tab
    );

  // MUST be after useGarmentCanvas destructuring — resizeCanvas is declared there.
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setOnboardStep(0);
    try { localStorage.setItem('studio_visited', '1'); } catch {}
    // Force canvas resize + redraw after tutorial overlay is removed.
    // The tutorial covers the canvas container which can cause zero-dimension
    // sizing. A short delay lets React re-paint before we measure + redraw.
    // FIX: fc is private to useGarmentCanvas — this used to reach for
    // `fc.current` directly here, which threw "fc is not defined" since fc
    // was never in scope in this component at all. Now calls the hook's
    // properly exposed resizeCanvas() action instead.
    setTimeout(() => resizeCanvas(canvasWrapRef.current), 120);
  }, [resizeCanvas]);

  const nextOnboardStep = useCallback(() => {
    setOnboardStep(s => {
      if (s >= 3) { dismissOnboarding(); return 0; }
      return s + 1;
    });
  }, [dismissOnboarding]);

  // ── Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y redo ────────────────────────
  // MUST be after useGarmentCanvas destructuring — undo/redo are declared there.
  // Moving it before caused "Cannot access 'undo' before initialization" (TDZ crash).
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // TASK O: save current face canvas JSON, then switch face + restore the other
  // Defined AFTER useGarmentCanvas so getCanvasJSON/loadCanvasJSON are in scope (no TDZ)
  const switchFace = useCallback((newFace) => {
    if (newFace === face) return;
    faceJSON.current[face] = getCanvasJSON() ?? [];
    setFace(newFace);
    setTimeout(() => {
      loadCanvasJSON(faceJSON.current[newFace] ?? []);
    }, 80);
  }, [face, getCanvasJSON, loadCanvasJSON]);

  // Apply Gemini AI response
  const applyAI = useCallback((aiCfg) => {
    setAiPulse(true);
    setTimeout(() => setAiPulse(false), 1200);
    setCfg(p => ({
      ...p,
      category: aiCfg.category ?? p.category,
      garment:  aiCfg.garmentType ?? p.garment,
      sleeve:   aiCfg.sleeveType  ?? p.sleeve,
      colors: {
        body:    aiCfg.colors?.body   ?? p.colors.body,
        collar:  aiCfg.colors?.collar ?? aiCfg.colors?.accent ?? p.colors.collar,
        sleeve:  aiCfg.colors?.sleeve ?? aiCfg.colors?.body   ?? p.colors.sleeve,
        pocket:  aiCfg.colors?.pocket ?? aiCfg.colors?.accent ?? p.colors.pocket,
      },
    }));
  }, []);

  // ── Draft restore on mount ────────────────────────────────────────────────
  // Only restores if sessionStorage is empty (not mid-OrderWizard flow).
  useEffect(() => {
    const hasSession = !!sessionStorage.getItem('studio_config');
    if (hasSession) return;
    axios.get('/api/customer/drafts/latest')
      .then(r => {
        const draft = r.data?.draft;
        if (!draft?.studio_config) return;
        const sc = draft.studio_config;
        setCfg(p => ({
          ...p,
          category: sc.category ?? p.category,
          garment:  sc.garment  ?? sc.garmentType ?? p.garment,
          sleeve:   sc.sleeve   ?? sc.sleeveType  ?? p.sleeve,
          colors:   sc.colors   ?? p.colors,
          patterns: sc.patterns ?? p.patterns,
        }));
        if (Array.isArray(sc.overlays) && sc.overlays.length > 0) {
          setTimeout(() => loadCanvasJSON(sc.overlays), 350);
        }
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 4000);
      })
      .catch(() => {});
  // loadCanvasJSON is stable (useCallback), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-save debounce — fires 30s after last cfg change ─────────────────
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const snap = {
        ...cfg,
        garmentType: cfg.garment,
        sleeveType:  cfg.sleeve,
        overlays:    exportOverlays(),
      };
      axios.post('/api/customer/drafts', {
        studio_config: snap,
        label: `${cfg.garment} — ${cfg.category}`,
      }).catch(() => {}); // silently ignore network errors
    }, 30_000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [cfg, exportOverlays]);

  // ── Manual save: sessionStorage + DB ─────────────────────────────────────
  const saveDesign = useCallback(async () => {
    const snap = {
      ...cfg,
      garmentType:   cfg.garment,
      collarType:    null,
      sleeveType:    cfg.sleeve,
      pocketType:    'left_chest',
      overlays:      exportOverlays(),
    };
    // Always write sessionStorage first (instant, works offline)
    sessionStorage.setItem('studio_config', JSON.stringify(snap));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Best-effort DB save
    try {
      await axios.post('/api/customer/drafts', {
        studio_config:   snap,
        preview_dataurl: exportPNG(),
        label:           `${cfg.garment} — ${cfg.category}`,
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch { /* offline — sessionStorage copy is enough */ }
  }, [cfg, exportOverlays, exportPNG]);

  // Order This → pass design to OrderWizard
  const orderThis = useCallback(() => {
    // TASK O: save current face before exporting both
    faceJSON.current[face] = getCanvasJSON() ?? [];
    const snap = {
      ...cfg,
      garmentType: cfg.garment,
      collarType:  null,
      sleeveType:  cfg.sleeve,
      pocketType:  'left_chest',
      overlays:    exportOverlays(),      // current face overlays
      frontOverlays: faceJSON.current.front,
      backOverlays:  faceJSON.current.back,
      previewPng:  exportPNG(),
    };
    sessionStorage.setItem('studio_config',   JSON.stringify(snap));
    sessionStorage.setItem('studio_preview',  snap.previewPng ?? '');
    sessionStorage.setItem('studio_color',    cfg.colors.body);
    sessionStorage.setItem('studio_garment',  cfg.garment);
    sessionStorage.setItem('studio_category', cfg.category);
    // Clear DB draft — design is now an order, draft is no longer needed
    axios.delete('/api/customer/drafts/latest').catch(() => {});
    nav('/customer/order/create');
  }, [cfg, exportOverlays, exportPNG, nav]);

  const catData   = useMemo(() => CATS.find(c=>c.id===cfg.category) ?? CATS[0], [cfg.category]);
  // useWindowWidth hook — updates on resize so mobile layout is always correct
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const handler = () => setWinW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isMobile = winW <= 767;

  return (
    <>
      <style>{`
        /* NO CDN font imports — offline environment. System font fallback. */
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes dspin{to{transform:rotate(360deg)}}
        @keyframes aiPulse{0%,100%{opacity:0}50%{opacity:1}}
        @keyframes toolGlow{0%,100%{box-shadow:0 0 0 0 rgba(2,195,154,0)}
          50%{box-shadow:0 0 0 5px rgba(2,195,154,.22)}}
        body{background:${DARK};overflow:hidden;}
        .ds{
          width:100vw;height:100dvh;display:flex;flex-direction:column;
          background:${DARK};color:#fff;overflow:hidden;
          font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
        }
        /* TOP BAR */
        .ds-bar{
          height:52px;flex-shrink:0;display:flex;align-items:center;
          padding:0 14px;gap:10px;
          background:rgba(6,13,26,.97);
          border-bottom:1px solid rgba(255,255,255,.07);
          z-index:20;
        }
        /* BODY ROW */
        .ds-body{flex:1;display:flex;overflow:hidden;min-height:0;}
        /* TOOL STRIP — left icon bar. FIX (visual redesign, Aug 30 2026):
           tokens realigned to the Figma reference — transparent strip
           (inherits .ds body background, no dark overlay tint) and a
           translucent-teal + teal-border active state instead of a
           solid teal fill, so the active tab reads as "selected" rather
           than "filled button". Functional logic (setTool, tool state)
           is unchanged — CSS/token-only. */
        .ds-strip{
          width:48px;flex-shrink:0;background:transparent;
          border-right:1px solid rgba(255,255,255,.04);
          display:flex;flex-direction:column;align-items:center;
          padding:12px 0;gap:2px;
        }
        .ds-tool-btn{
          width:40px;height:46px;border-radius:10px;
          border:1px solid transparent;cursor:pointer;
          background:rgba(255,255,255,.04);display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:2px;
          transition:background .14s,border-color .14s;position:relative;
        }
        .ds-tool-btn.active{
          background:rgba(2,195,154,.15);
          border-color:rgba(2,195,154,.4);
          animation:toolGlow 2s ease-in-out;
        }
        .ds-tool-btn:hover:not(.active){background:rgba(255,255,255,.08);}
        /* SLIDE PANEL — FIX (visual redesign): solid navy fill (DARK2,
           the same token already used elsewhere in this file) with a
           teal-tinted border, matching the Figma drawer exactly, instead
           of a translucent white overlay on the page background. */
        .ds-panel{
          width:224px;flex-shrink:0;
          background:${DARK2};
          border-right:1px solid rgba(2,195,154,.12);
          display:flex;flex-direction:column;overflow:hidden;
        }
        /* CANVAS AREA */
        .ds-cv{
          flex:1;display:flex;align-items:center;justify-content:center;
          position:relative;overflow:hidden;
          background:${DARK2};
          /* subtle grid */
          background-image:
            linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size:28px 28px;
        }
        /* RIGHT INFO */
        .ds-info{
          width:156px;flex-shrink:0;background:rgba(0,0,0,.2);
          border-left:1px solid rgba(255,255,255,.06);
          padding:12px 10px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;
        }
        /* BOTTOM HINT BAR */
        .ds-hints{
          height:28px;flex-shrink:0;display:flex;align-items:center;
          gap:12px;justify-content:center;
          background:rgba(0,0,0,.38);border-top:1px solid rgba(255,255,255,.05);
          overflow:hidden;
        }
        /* AI PULSE OVERLAY */
        .ai-pulse{
          position:absolute;inset:0;pointer-events:none;z-index:50;
          background:rgba(2,195,154,.08);
          border:2px solid rgba(2,195,154,.4);
          border-radius:12px;
          animation:aiPulse .6s ease-in-out 2;
        }
        @media(max-width:767px){
          /* Strip: moves to bottom, horizontal */
          .ds-strip{
            position:fixed;bottom:0;left:0;right:0;
            width:100%!important;height:52px;
            flex-direction:row;justify-content:space-around;
            padding:0 8px;gap:0;
            background:rgba(6,13,26,.97);
            border-top:1px solid rgba(255,255,255,.08);
            border-right:none;
            z-index:50;
          }
          .ds-tool-btn{
            width:52px;height:48px;border-radius:8px;flex-direction:column;
          }
          /* Panel: slides up from bottom as sheet */
          .ds-panel{
            position:fixed;bottom:52px;left:0;right:0;
            width:100%!important;
            max-height:58vh;
            background:rgba(8,16,30,.98);
            border-top:1px solid rgba(255,255,255,.1);
            border-right:none;
            border-radius:16px 16px 0 0;
            z-index:49;
          }
          /* Canvas: full width, push down from topbar */
          .ds-cv{padding-bottom:52px;}
          .ds-info{display:none!important;}
          .ds-hints{display:none!important;}
          /* Bar: tighter on mobile */
          .ds-bar{padding:0 10px;gap:6px;}
          .ds-bar .ds-bar-date{display:none;}
        }
        /* Scrollbar */
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
      `}</style>

      <div className="ds" style={{ position:'relative' }}>

        {/* ── TOP BAR ── */}
        <div className="ds-bar">
          <button onClick={()=>nav('/customer')}
            style={{ padding:'5px 11px',borderRadius:8,cursor:'pointer',
              border:'1px solid rgba(255,255,255,.12)',background:'transparent',
              color:'rgba(255,255,255,.6)',fontSize:12,flexShrink:0 }}>
            ← Back
          </button>

          {/* FIX (visual redesign, Aug 30 2026): pulsing teal status dot
              replaces the 🎨 emoji, matching the Figma reference header. */}
          <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
            <motion.div
              animate={{ opacity:[1,.4,1] }}
              transition={{ duration:1.6, repeat:Infinity, ease:'easeInOut' }}
              style={{ width:6,height:6,borderRadius:'50%',background:T2 }}/>
            <span style={{ fontSize:14,fontWeight:800 }}>Design Studio</span>
          </div>

          {/* Category badge — color matches body zone */}
          <motion.span
            animate={{ background:`rgba(${hexToRgb(cfg.colors.body??T)},.18)` }}
            transition={{ duration:.4 }}
            style={{ fontSize:10,padding:'2px 10px',borderRadius:99,
              color:T2,fontWeight:700,border:`1px solid rgba(2,195,154,.22)`,
              flexShrink:0 }}>
            {catData.icon} {cfg.category}
          </motion.span>

          <div style={{ flex:1 }}/>

          {/* Undo / Redo */}
          <div style={{ display:'flex', gap:3, flexShrink:0 }}>
            <motion.button
              whileTap={{ scale:.9 }}
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              style={{
                width:32, height:32, borderRadius:8, border:'none', cursor: canUndo ? 'pointer' : 'default',
                background:'rgba(255,255,255,.06)', color: canUndo ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.2)',
                fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
              }}>↺</motion.button>
            <motion.button
              whileTap={{ scale:.9 }}
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              style={{
                width:32, height:32, borderRadius:8, border:'none', cursor: canRedo ? 'pointer' : 'default',
                background:'rgba(255,255,255,.06)', color: canRedo ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.2)',
                fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
              }}>↻</motion.button>
          </div>

          {/* 2D / 3D toggle */}
          <div style={{ display:'flex',borderRadius:9,overflow:'hidden',
            border:'1px solid rgba(255,255,255,.12)',flexShrink:0 }}>
            {['2d','3d'].map(m=>(
              <button key={m} onClick={()=>{
                  if(m==='3d'&&isMobile){ alert('3D is available on desktop only'); return; }
                  if(m==='3d') setHas3DLoaded(true);
                  setViewMode(m);
                }}
                style={{ padding:'6px 13px',border:'none',fontSize:11,fontWeight:700,
                  cursor:'pointer',
                  background:viewMode===m?T:'transparent',
                  color:viewMode===m?'#fff':'rgba(255,255,255,.4)',
                  transition:'background .14s' }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Delete selected object */}
          {selObj && (
            <motion.button initial={{ opacity:0,scale:.8 }} animate={{ opacity:1,scale:1 }}
              onClick={deleteSelected}
              style={{ padding:'5px 11px',borderRadius:8,border:'1px solid rgba(239,68,68,.3)',
                background:'rgba(239,68,68,.1)',color:'#fca5a5',fontSize:11,
                fontWeight:600,cursor:'pointer',flexShrink:0 }}>
              🗑 Delete
            </motion.button>
          )}

          {/* Inspiration Gallery */}
          <button
            onClick={() => setShowInspo(p => !p)}
            title="Design Inspirations"
            style={{
              padding:'6px 12px', borderRadius:8, cursor:'pointer',
              border:`1px solid ${showInspo ? T2 : 'rgba(255,255,255,.12)'}`,
              background: showInspo ? 'rgba(2,195,154,.12)' : 'transparent',
              color: showInspo ? T2 : 'rgba(255,255,255,.5)',
              fontSize:11, fontWeight:700, flexShrink:0, transition:'all .2s',
            }}>
            ✨ Inspo
          </button>

          {/* Save Design */}
          <button onClick={saveDesign}
            style={{ padding:'6px 12px',borderRadius:8,cursor:'pointer',
              border:`1px solid ${saved?T2:'rgba(255,255,255,.12)'}`,
              background: saved?'rgba(2,195,154,.12)':'transparent',
              color: saved?T2:'rgba(255,255,255,.5)',fontSize:11,fontWeight:700,
              flexShrink:0,transition:'all .2s' }}>
            {draftSaved ? '☁ Saved' : saved ? '✓ Local' : '💾 Save'}
          </button>

          {/* Order This */}
          <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
            onClick={orderThis}
            style={{ padding:'8px 18px',borderRadius:9,border:'none',
              background:`linear-gradient(135deg,${T},${T2})`,
              color:'#000',fontSize:13,fontWeight:800,cursor:'pointer',
              boxShadow:`0 4px 16px rgba(2,195,154,.3)`,flexShrink:0 }}>
            Order This →
          </motion.button>
        </div>

        {/* ── DRAFT RESTORED BANNER ── */}
        <AnimatePresence>
          {draftRestored && (
            <motion.div
              initial={{ opacity:0, y:-8 }}
              animate={{ opacity:1, y:0, transition:{ duration:.25 } }}
              exit={{   opacity:0, y:-8, transition:{ duration:.2  } }}
              style={{
                position:'absolute', top:58, left:'50%', transform:'translateX(-50%)',
                zIndex:90, padding:'7px 18px', borderRadius:99,
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'#000', fontSize:11, fontWeight:700,
                boxShadow:'0 4px 16px rgba(2,195,154,.35)',
                whiteSpace:'nowrap', pointerEvents:'none',
              }}>
              ☁ Design restored from your last session
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BODY ── */}
        <div className="ds-body">

          {/* Tool strip */}
          <div className="ds-strip">
            {TOOLS.map(t => (
              <button key={t.id}
                className={`ds-tool-btn${tool===t.id?' active':''}`}
                onClick={() => setTool(t.id)} title={t.label}>
                <NavIcon name={t.icon} size={18} strokeWidth={2}
                  color={tool===t.id ? T2 : 'rgba(255,255,255,.45)'}/>
                <span style={{ fontSize:7,
                  color: tool===t.id ? T2 : 'rgba(255,255,255,.28)',
                  fontWeight:700 }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Side panel with AnimatePresence slide */}
          <div className="ds-panel">
            <AnimatePresence mode="wait">
              <motion.div key={tool}
                initial={{ opacity:0, x:-10 }}
                animate={{ opacity:1, x:0, transition:{ duration:.18, ease:'easeOut' } }}
                exit={{   opacity:0, x:10, transition:{ duration:.12 } }}
                style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>

                {tool==='type'    && <TypePanel    cfg={cfg} setCfg={setCfg}/>}
                {tool==='color'   && <ColorsPanel  cfg={cfg} setCfg={setCfg}
                                       activeZone={activeZone} setActiveZone={setActiveZone}/>}
                {tool==='logo'    && <LogoPanel    onAdd={addLogo}/>}
                {tool==='text'    && <TextPanel    onAdd={addText}/>}
                {tool==='ai'      && <AIPanel      onApply={applyAI}
                                       onTexture={()=>{}}/>}
                {tool==='pattern' && <PatternPanel cfg={cfg} setCfg={setCfg}
                                       activeZone={activeZone}/>}
                {tool==='layers'  && <LayersPanel  layers={layers} selectedId={selObj?.__layerId}
                                       onSelect={selectLayer} onToggleVisibility={toggleLayerVisibility}
                                       onRename={renameLayer} onDelete={deleteLayer} onReorder={reorderLayers}/>}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── CANVAS AREA ── */}
          <div className="ds-cv"
            style={{
              background: [
                `radial-gradient(ellipse at 50% 42%, ${cfg.colors.body}18, transparent 62%)`,
                DARK2,
              ].join(','),
            }}
            onDragOver={e=>e.preventDefault()}
            onDrop={async e=>{
              e.preventDefault();
              const f=e.dataTransfer.files?.[0];
              if(!f) return;
              // Same auto-transparency pass as LogoPanel's own upload —
              // this is the canvas' own drag-drop entry point, a second,
              // separate path into addLogo() that would otherwise skip it
              // (and, pre-existing/out of scope for this task: it also
              // skips LogoPanel's type/size validation entirely — flagging
              // that as a separate gap, not fixed here).
              const toAdd = f.type === 'image/svg+xml' ? f : await removeLogoBackground(f);
              const r=new FileReader(); r.onload=ev=>addLogo(ev.target.result,'left_chest'); r.readAsDataURL(toAdd);
            }}>

            {/* 2D pane — mounted for the component's whole lifetime now, never
                torn down by the toggle. Only CSS visibility/pointer-events
                change with viewMode. See BUG-007 note at useGarmentCanvas. */}
            <div style={{
                position:'absolute', inset:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                visibility: viewMode==='2d' ? 'visible' : 'hidden',
                pointerEvents: viewMode==='2d' ? 'auto' : 'none',
                zIndex: viewMode==='2d' ? 1 : 0,
              }}>
              <div ref={canvasWrapRef} style={{ position:'relative',
                boxShadow:'0 12px 48px rgba(0,0,0,.65)',
                borderRadius:14,overflow:'hidden' }}>

                {/* BUG 2 FIX: canvasEl ref attached to <canvas> — hook reads .current post-mount */}
                <canvas ref={canvasEl} style={{ display:'block',borderRadius:14 }}/>

                {/* AI generating pulse overlay */}
                {aiPulse && <div className="ai-pulse"/>}

                {/* Front / Back toggle */}
                <div style={{ position:'absolute',bottom:10,left:'50%',
                  transform:'translateX(-50%)',display:'flex',gap:3,
                  background:'rgba(0,0,0,.65)',borderRadius:9,padding:'3px' }}>
                  {['front','back'].map(v=>(
                    <button key={v} onClick={()=>switchFace(v)}
                      style={{ padding:'4px 13px',borderRadius:7,border:'none',cursor:'pointer',
                        background:face===v?T:'transparent',
                        color:face===v?'#fff':'rgba(255,255,255,.4)',
                        fontSize:10,fontWeight:700,textTransform:'capitalize' }}>
                      {v}
                    </button>
                  ))}
                </div>

                {/* Selected object toolbar */}
                <AnimatePresence>
                  {selObj && (
                    <motion.div initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }}
                      exit={{ opacity:0 }}
                      style={{ position:'absolute',bottom:44,left:'50%',
                        transform:'translateX(-50%)',
                        background:'rgba(0,0,0,.82)',backdropFilter:'blur(8px)',
                        borderRadius:10,padding:'6px 14px',
                        display:'flex',alignItems:'center',gap:10,
                        border:'1px solid rgba(255,255,255,.1)',
                        whiteSpace:'nowrap',zIndex:10 }}>
                      <span style={{ fontSize:11,color:'rgba(255,255,255,.55)' }}>
                        {selObj.__logo?'🖼 Logo':'✏️ Text'} — drag to move
                      </span>
                      <button onClick={deleteSelected}
                        style={{ padding:'3px 9px',borderRadius:6,border:'none',
                          background:'rgba(239,68,68,.2)',color:'#fca5a5',
                          fontSize:10,fontWeight:700,cursor:'pointer' }}>
                        Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 3D pane — only mounted after the first "3D" click (Three.js
                still doesn't download on initial Design Studio load), but
                once loaded it stays mounted and is hidden via CSS on 2D,
                same as the pane above, instead of being unmounted again. */}
            {has3DLoaded && (
              <div style={{
                  position:'absolute', inset:0,
                  visibility: viewMode==='3d' ? 'visible' : 'hidden',
                  pointerEvents: viewMode==='3d' ? 'auto' : 'none',
                  zIndex: viewMode==='3d' ? 1 : 0,
                }}>
                <ThreeEB>
                  <Suspense fallback={
                    <div style={{ width:'100%',height:'100%',display:'flex',
                      flexDirection:'column',alignItems:'center',
                      justifyContent:'center',gap:10 }}>
                      <div style={{ width:32,height:32,
                        border:`3px solid rgba(2,195,154,.25)`,
                        borderTopColor:T2,borderRadius:'50%',
                        animation:'dspin .7s linear infinite' }}/>
                      <p style={{ color:'rgba(255,255,255,.35)',fontSize:12 }}>
                        Loading 3D engine…
                      </p>
                    </div>
                  }>
                    <Scene3D cfg={cfg}/>
                  </Suspense>
                </ThreeEB>
                <div style={{ position:'absolute',bottom:18,left:'50%',
                  transform:'translateX(-50%)',padding:'4px 16px',borderRadius:99,
                  background:'rgba(0,0,0,.58)',border:'1px solid rgba(255,255,255,.1)',
                  color:'rgba(255,255,255,.35)',fontSize:10,pointerEvents:'none',
                  whiteSpace:'nowrap' }}>
                  🖱 Drag to rotate · Scroll to zoom
                </div>
              </div>
            )}

            {/* Color zone chips — top-right corner preview */}
            <div style={{ position:'absolute',top:14,right:14,zIndex:2,
              display:'flex',gap:5,flexDirection:'column' }}>
              {ZONE_KEYS.map(z=>(
                <div key={z} title={`${ZONE_LABEL[z]}: ${cfg.colors[z]}`}
                  style={{ display:'flex',alignItems:'center',gap:5 }}>
                  <div style={{ width:14,height:14,borderRadius:'50%',
                    background:cfg.colors[z]??T,
                    border:'2px solid rgba(255,255,255,.18)',
                    boxShadow:'0 2px 5px rgba(0,0,0,.4)' }}/>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT INFO PANEL ── */}
          <div className="ds-info">
            <p style={{ fontSize:9,fontWeight:700,textTransform:'uppercase',
              letterSpacing:'.09em',color:'rgba(255,255,255,.22)',margin:0 }}>
              Design Summary
            </p>
            {ZONE_KEYS.map(z=>(
              <div key={z} style={{ display:'flex',alignItems:'center',gap:7 }}>
                <div style={{ width:22,height:22,borderRadius:6,flexShrink:0,
                  background:cfg.colors[z]??T,
                  border:'1px solid rgba(255,255,255,.12)' }}/>
                <div>
                  <p style={{ fontSize:9,color:'rgba(255,255,255,.28)',margin:0 }}>
                    {ZONE_LABEL[z]}
                  </p>
                  <p style={{ fontSize:8,color:'rgba(255,255,255,.45)',fontWeight:600,
                    margin:0,fontFamily:'monospace' }}>
                    {cfg.colors[z]??'—'}
                  </p>
                </div>
              </div>
            ))}
            <div style={{ height:1,background:'rgba(255,255,255,.06)',margin:'2px 0' }}/>
            <p style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,.7)',margin:0 }}>
              {cfg.garment}
            </p>
            <p style={{ fontSize:9,color:'rgba(255,255,255,.3)',margin:0 }}>
              {cfg.sleeve} sleeve · {cfg.category}
            </p>
            <div style={{ height:1,background:'rgba(255,255,255,.06)',margin:'2px 0' }}/>
            <p style={{ fontSize:9,color:'rgba(255,255,255,.18)',lineHeight:1.9,margin:0 }}>
              👕 Type — pick garment<br/>
              🎨 Colors — zone painter<br/>
              🖼️ Logo — upload + place<br/>
              ✏️ Text — name/number<br/>
              🤖 AI — describe design<br/>
              📐 Pattern — overlay
            </p>
            <button onClick={saveDesign}
              style={{ padding:'8px',borderRadius:9,border:`1px solid rgba(2,195,154,.25)`,
                background:'rgba(2,195,154,.07)',color:T2,fontSize:10,fontWeight:700,
                cursor:'pointer',marginTop:4 }}>
              {saved ? '✓ Saved!' : '💾 Save Design'}
            </button>
            <button onClick={orderThis}
              style={{ padding:'10px',borderRadius:10,border:'none',
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'#000',fontSize:11,fontWeight:800,cursor:'pointer',
                marginTop:2 }}>
              Order This →
            </button>
          </div>
        </div>

        {/* ── BOTTOM HINTS BAR ── */}
        <div className="ds-hints">
          {[
            ['👕','Type'],['🎨','Colors'],['🖼️','Logo'],
            ['✏️','Text'],['🤖','AI'],['📐','Pattern'],['→','Order'],
          ].map(([ic,l],i)=>(
            <p key={i} style={{ fontSize:9,color:'rgba(255,255,255,.18)',margin:0,
              display:'flex',alignItems:'center',gap:3,whiteSpace:'nowrap' }}>
              <span style={{
                padding:'1px 5px',borderRadius:4,
                background: TOOLS.findIndex(t=>t.icon===ic||t.label===l)===TOOLS.findIndex(t=>t.id===tool)
                  ? T : 'transparent',
              }}>{ic}</span>
              {l}
            </p>
          ))}
        </div>

        {/* ── TASK U: FIRST-VISIT ONBOARDING OVERLAY ── */}
        {/* Full-screen dark scrim with a single spotlight card per step.    */}
        {/* 4 steps: Garment Zones → Color Picker → AI Tab → Order This.    */}
        {/* Backdrop blocks interaction; user must advance or skip.          */}
        <AnimatePresence>
          {showOnboarding && (() => {
            const STEPS = [
              {
                emoji: '👕',
                title: 'Pick Your Garment',
                body:  'Start by choosing a garment type in the left panel. Pick from School Polo, Scrub Top, Jersey, and more — each has its own shape on the canvas.',
                hint:  'Look left → Type tab is already open.',
                arrow: 'left',
              },
              {
                emoji: '🎨',
                title: 'Paint the Color Zones',
                body:  'Click any zone on the garment (body, collar, sleeve, pocket) — it will highlight. Then pick a Philippine institutional color or dial in a custom shade with the HSL color picker.',
                hint:  'Try clicking directly on the garment canvas.',
                arrow: 'left',
              },
              {
                emoji: '🤖',
                title: 'Describe Your Design with AI',
                body:  'Open the 🤖 AI tab on the left, type a description like "navy blue school polo, white collar, left chest logo", and Gemini will fill the canvas automatically.',
                hint:  'Works best with specific colors and placement details.',
                arrow: 'left',
              },
              {
                emoji: '🛒',
                title: 'Place Your Order',
                body:  'When your design is ready, click "Order This →" in the top-right. Your design will be saved and carried into the order form — sizes, quantities, and payment terms next.',
                hint:  'You can also save a draft anytime with the 💾 button.',
                arrow: 'top-right',
              },
            ];
            const step = STEPS[onboardStep];
            return (
              <motion.div
                key={`ob-${onboardStep}`}
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                exit={{   opacity:0 }}
                transition={{ duration:.22 }}
                style={{
                  position:'absolute', inset:0, zIndex:200,
                  background:'rgba(2,8,20,.78)',
                  backdropFilter:'blur(3px)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:20,
                }}
                // Clicking the scrim skips to next step (power users)
                onClick={nextOnboardStep}
              >
                <motion.div
                  key={`card-${onboardStep}`}
                  initial={{ opacity:0, scale:.93, y:12 }}
                  animate={{ opacity:1, scale:1, y:0 }}
                  exit={{   opacity:0, scale:.96, y:-6 }}
                  transition={{ duration:.25, ease:'easeOut' }}
                  onClick={e => e.stopPropagation()} // card click doesn't advance scrim
                  style={{
                    width: 'min(400px, calc(100vw - 40px))',
                    background:'rgba(8,18,34,.98)',
                    border:`1px solid rgba(2,195,154,.3)`,
                    borderRadius:20,
                    padding:'28px 28px 22px',
                    boxShadow:`0 0 0 1px rgba(2,195,154,.1),
                               0 32px 80px rgba(0,0,0,.8),
                               0 0 60px rgba(2,128,144,.12)`,
                    position:'relative',
                  }}>

                  {/* Step dots */}
                  <div style={{ display:'flex', gap:5, marginBottom:20 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{
                        width: i === onboardStep ? 18 : 6,
                        height:6, borderRadius:3,
                        background: i === onboardStep
                          ? '#02C39A'
                          : 'rgba(255,255,255,.15)',
                        transition:'all .25s ease',
                      }}/>
                    ))}
                  </div>

                  {/* Emoji */}
                  <div style={{
                    width:56, height:56, borderRadius:16,
                    background:`rgba(2,195,154,.12)`,
                    border:`1px solid rgba(2,195,154,.22)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:28, marginBottom:16,
                  }}>
                    {step.emoji}
                  </div>

                  {/* Title */}
                  <p style={{ fontSize:18, fontWeight:800, color:'#fff', margin:'0 0 10px',
                    lineHeight:1.2 }}>
                    {step.title}
                  </p>

                  {/* Body */}
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.6)', margin:'0 0 14px',
                    lineHeight:1.65 }}>
                    {step.body}
                  </p>

                  {/* Hint pill */}
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    padding:'5px 11px', borderRadius:8,
                    background:'rgba(2,195,154,.08)',
                    border:'1px solid rgba(2,195,154,.16)',
                    marginBottom:22,
                  }}>
                    <span style={{ fontSize:10 }}>💡</span>
                    <span style={{ fontSize:10, color:'rgba(2,195,154,.8)', fontWeight:600 }}>
                      {step.hint}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <motion.button
                      whileTap={{ scale:.95 }}
                      onClick={nextOnboardStep}
                      style={{
                        flex:1, padding:'11px 0', borderRadius:11, border:'none',
                        background:`linear-gradient(135deg,${T},${T2})`,
                        color:'#000', fontSize:13, fontWeight:800, cursor:'pointer',
                      }}>
                      {onboardStep < 3 ? `Next  →` : `Start Designing 🎨`}
                    </motion.button>
                    {onboardStep < 3 && (
                      <button
                        onClick={dismissOnboarding}
                        style={{
                          padding:'11px 14px', borderRadius:11, border:'none',
                          background:'rgba(255,255,255,.06)',
                          color:'rgba(255,255,255,.35)', fontSize:12, cursor:'pointer',
                        }}>
                        Skip
                      </button>
                    )}
                  </div>

                  {/* Step counter */}
                  <p style={{ fontSize:9, color:'rgba(255,255,255,.2)', textAlign:'center',
                    margin:'10px 0 0', letterSpacing:'.04em' }}>
                    {onboardStep + 1} of 4
                  </p>
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* ── INSPIRATION GALLERY OVERLAY ── */}
        <AnimatePresence>
          {showInspo && (
            <motion.div
              initial={{ opacity:0, y:-10 }}
              animate={{ opacity:1, y:0, transition:{ duration:.2, ease:'easeOut' } }}
              exit={{   opacity:0, y:-10, transition:{ duration:.15 } }}
              style={{
                position:'absolute', top:60, left:'50%', transform:'translateX(-50%)',
                zIndex:100, width:'min(700px, calc(100vw - 32px))',
                background:'rgba(8,18,34,.97)', backdropFilter:'blur(16px)',
                border:'1px solid rgba(255,255,255,.1)', borderRadius:18,
                padding:20, boxShadow:'0 24px 60px rgba(0,0,0,.7)',
              }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:'#fff', margin:0 }}>✨ Design Inspirations</p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,.35)', margin:'2px 0 0' }}>
                    Click any template to load it onto the canvas
                  </p>
                </div>
                <button onClick={() => setShowInspo(false)}
                  style={{ width:28, height:28, borderRadius:8, border:'none',
                    background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)',
                    fontSize:14, cursor:'pointer' }}>✕</button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
                {INSPO_TEMPLATES.map(t => {
                  const paths = BASE_PATHS[t.garment] ?? BASE_PATHS['Polo Shirt'];
                  return (
                    <motion.button key={t.id}
                      whileHover={{ scale:1.04, boxShadow:`0 8px 28px rgba(2,195,154,.18)` }}
                      whileTap={{ scale:.97 }}
                      onClick={() => {
                        setCfg(p => ({
                          ...p,
                          category: t.category,
                          garment:  t.garment,
                          sleeve:   t.sleeve,
                          colors:   { ...p.colors, ...t.colors },
                          patterns: { ...p.patterns, ...(t.patterns ?? {}) },
                        }));
                        setShowInspo(false);
                      }}
                      style={{
                        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                        padding:'14px 10px 10px', borderRadius:12, border:'1px solid rgba(255,255,255,.08)',
                        background:'rgba(255,255,255,.04)', cursor:'pointer',
                      }}>
                      {/* Mini SVG preview */}
                      <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width="54" height="66" style={{ display:'block' }}>
                        {paths.body    && <path d={paths.body}    fill={t.colors.body   ?? '#1e3a5f'} stroke="rgba(255,255,255,.15)" strokeWidth="3"/>}
                        {paths.collar  && <path d={paths.collar}  fill={t.colors.collar ?? '#c8a96e'} stroke="rgba(255,255,255,.1)"  strokeWidth="2"/>}
                        {paths.sleeveL && <path d={paths.sleeveL} fill={t.colors.sleeve ?? t.colors.body ?? '#1e3a5f'} stroke="rgba(255,255,255,.1)" strokeWidth="2"/>}
                        {paths.sleeveR && <path d={paths.sleeveR} fill={t.colors.sleeve ?? t.colors.body ?? '#1e3a5f'} stroke="rgba(255,255,255,.1)" strokeWidth="2"/>}
                        {paths.pocket  && <path d={paths.pocket}  fill={t.colors.pocket ?? t.colors.collar ?? '#c8a96e'} stroke="rgba(255,255,255,.08)" strokeWidth="1"/>}
                      </svg>
                      <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.7)', margin:0, textAlign:'center' }}>
                        {t.label}
                      </p>
                      <p style={{ fontSize:9, color:'rgba(255,255,255,.28)', margin:0 }}>
                        {t.category}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}

// ── Helper: hex to rgb for animated category badge ────────────────────────────
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '2,128,144';
}