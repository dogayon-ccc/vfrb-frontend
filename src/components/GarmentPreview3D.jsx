// src/components/GarmentPreview3D.jsx
// NEW FEATURE — Embeddable 3D garment preview widget
//
// Used in:
//   - OrderDetail.jsx (shows the ordered garment in 3D on the Overview tab)
//   - AdminOrderController (admin order detail side panel)
//   - OrderWizard.jsx step 3 confirmation
//
// Props:
//   cfg         — studio_config object from order (colors, garmentType, sleeveType, collarType)
//   height      — canvas height in px (default 320)
//   autoRotate  — bool (default true)
//   showLabel   — bool — show garment name + color chips below canvas (default true)
//   compact     — bool — smaller padding, no label (for sidebar use)
//
// Reads from studio_config correctly:
//   cfg.colors.body / collar / sleeve / pocket   (correct keys from DesignStudio orderThis())
//   cfg.garmentType OR cfg.garment               (DesignStudio uses garment, DB stores garmentType)
//   cfg.sleeveType  OR cfg.sleeve
//   cfg.collarType  OR cfg.collar
//   cfg.previewPng                               (fallback: show PNG if 3D fails)
//
// On mobile (≤767px): shows PNG preview if available, else SVG illustration
// On desktop: full Three.js scene with Float + OrbitControls
//
// Install: already available — uses @react-three/fiber + @react-three/drei + three r150
// Import:  import GarmentPreview3D from '../../components/GarmentPreview3D'
// Usage:   <GarmentPreview3D cfg={order.studio_config} height={300}/>

import {
  useRef, useMemo, useState, useEffect,
  Component, Suspense, lazy,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const T    = '#028090';
const T2   = '#02C39A';
const FONT = `ui-sans-serif,system-ui,-apple-system,sans-serif`;

// ── Lazy-load the heavy 3D scene ─────────────────────────────────────────────
const Scene3D = lazy(() =>
  Promise.all([
    import('@react-three/fiber'),
    import('@react-three/drei'),
    import('three'),
  ]).then(([{ Canvas, useFrame }, drei, THREE]) => {
    // ── Material helper ───────────────────────────────────────────────────────
    // NEW (Aug 10 2026): optional texture param. When a reference photo is
    // provided (order has no Design Studio config, just an uploaded image),
    // the body gets that photo mapped onto it instead of a flat color —
    // color is forced to white so MeshStandardMaterial doesn't tint the
    // texture (it multiplies map × color by default).
    function mat(color, roughness = 0.72, metalness = 0.03, texture = null) {
      return new THREE.MeshStandardMaterial({
        color: texture ? '#ffffff' : color,
        map: texture ?? null,
        roughness, metalness,
      });
    }

    // ── Loads an image URL as a Three.js texture — cancels cleanly if the
    // component unmounts or the URL changes before loading finishes.
    function useReferenceTexture(url) {
      const [texture, setTexture] = useState(null);
      useEffect(() => {
        if (!url) { setTexture(null); return; }
        let cancelled = false;
        const loader = new THREE.TextureLoader();
        loader.load(
          url,
          (tex) => {
            if (cancelled) { tex.dispose(); return; }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            setTexture(tex);
          },
          undefined,
          () => { if (!cancelled) setTexture(null); } // silently fall back to flat color on load error
        );
        return () => { cancelled = true; };
      }, [url]);
      return texture;
    }

    // ── Shirt mesh (master prompt geometry — CylinderGeometry) ───────────────
    function ShirtMesh({ colors, sleeveType, collarType, referenceTexture }) {
      const body    = colors?.body   ?? T;
      const collar  = colors?.collar ?? T2;
      const sleeve  = colors?.sleeve ?? colors?.body ?? T;
      const pocket  = colors?.pocket ?? colors?.collar ?? '#016070';

      const matBody   = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
      const matCollar = useMemo(() => mat(collar),  [collar]);
      const matSleeve = useMemo(() => mat(sleeve),  [sleeve]);
      const matPocket = useMemo(() => mat(pocket, 0.6), [pocket]);

      const isLong       = /long/i.test(sleeveType ?? '');
      // Same 3/4-tier fix as DesignStudio3D.jsx's ShirtMesh (these two
      // components are near-duplicates — GarmentPreview3D is used in
      // OrderDetail / AdminOrder / OrderWizard step-3 confirmation,
      // DesignStudio3D is the live Studio 3D toggle. Both had the
      // identical Short-and-3/4-look-the-same bug.
      const isThreeQuarter = /3\/4|three.?quarter/i.test(sleeveType ?? '');
      const isSleeveless = /sleeve.*less|none/i.test(sleeveType ?? '');
      const isVneck      = /v.*neck|scrub/i.test(collarType ?? '');
      const isMandarin   = /mandarin/i.test(collarType ?? '');
      const sleeveLen    = isLong ? 0.85 : isThreeQuarter ? 0.65 : 0.46;
      const sleeveTopR   = isLong ? 0.11 : isThreeQuarter ? 0.12 : 0.13;
      const sleeveBotR   = isLong ? 0.09 : isThreeQuarter ? 0.105 : 0.12;

      return (
        <group>
          {/* Body */}
          <mesh position={[0,0,0]} material={matBody}>
            <cylinderGeometry args={[0.35,0.40,1.1,16]}/>
          </mesh>
          {/* Hem */}
          <mesh position={[0,-0.55,0]} material={matCollar}>
            <cylinderGeometry args={[0.40,0.40,0.04,16]}/>
          </mesh>
          {/* Left sleeve */}
          {!isSleeveless && (
            <group position={[-0.44,0.38,0]} rotation={[0,0,0.52]}>
              <mesh material={matSleeve}>
                <cylinderGeometry args={[sleeveTopR,sleeveBotR,sleeveLen,12]}/>
              </mesh>
              <mesh position={[0,-sleeveLen*0.52,0]} material={matCollar}>
                <cylinderGeometry args={[sleeveBotR+0.01,sleeveBotR+0.01,0.04,12]}/>
              </mesh>
            </group>
          )}
          {/* Right sleeve */}
          {!isSleeveless && (
            <group position={[0.44,0.38,0]} rotation={[0,0,-0.52]}>
              <mesh material={matSleeve}>
                <cylinderGeometry args={[sleeveTopR,sleeveBotR,sleeveLen,12]}/>
              </mesh>
              <mesh position={[0,-sleeveLen*0.52,0]} material={matCollar}>
                <cylinderGeometry args={[sleeveBotR+0.01,sleeveBotR+0.01,0.04,12]}/>
              </mesh>
            </group>
          )}
          {/* Collar */}
          {isVneck ? (
            <>
              <mesh position={[-0.06,0.62,0.1]} rotation={[0,0,0.45]} material={matCollar}>
                <cylinderGeometry args={[0.025,0.02,0.22,8]}/>
              </mesh>
              <mesh position={[0.06,0.62,0.1]} rotation={[0,0,-0.45]} material={matCollar}>
                <cylinderGeometry args={[0.025,0.02,0.22,8]}/>
              </mesh>
            </>
          ) : isMandarin ? (
            <mesh position={[0,0.63,0]} material={matCollar}>
              <cylinderGeometry args={[0.16,0.17,0.14,14]}/>
            </mesh>
          ) : (
            <mesh position={[0,0.60,0]} rotation={[Math.PI/2,0,0]} material={matCollar}>
              <torusGeometry args={[0.18,0.04,8,16]}/>
            </mesh>
          )}
          {/* Pocket */}
          <mesh position={[-0.19,0.14,0.38]} material={matPocket}>
            <planeGeometry args={[0.12,0.10]}/>
          </mesh>
          {/* Shoulder caps — only needed to round the join where a sleeve
              cylinder meets the body. With no sleeve present (sleeveless),
              these floated as disconnected blobs — gate with !isSleeveless,
              same condition already used for the sleeve meshes above. */}
          {!isSleeveless && (
            <>
              <mesh position={[-0.38,0.52,0]} material={matSleeve}>
                <sphereGeometry args={[0.14,8,8,0,Math.PI]}/>
              </mesh>
              <mesh position={[0.38,0.52,0]} material={matSleeve}>
                <sphereGeometry args={[0.14,8,8,0,Math.PI]}/>
              </mesh>
            </>
          )}
        </group>
      );
    }

    // ── Pants mesh ────────────────────────────────────────────────────────────
    function PantsMesh({ colors, referenceTexture }) {
      const body  = colors?.body   ?? T;
      const band  = colors?.collar ?? T2;
      const matBody = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
      const matBand = useMemo(() => mat(band,0.6),[band]);
      return (
        <group position={[0,-0.1,0]}>
          <mesh position={[0,0.84,0]} rotation={[Math.PI/2,0,0]} material={matBand}>
            <torusGeometry args={[0.36,0.055,8,24]}/>
          </mesh>
          <mesh position={[0,0.52,0]} material={matBody}>
            <cylinderGeometry args={[0.36,0.34,0.40,14]}/>
          </mesh>
          <mesh position={[-0.20,-0.38,0]} material={matBody}>
            <cylinderGeometry args={[0.17,0.14,1.18,12]}/>
          </mesh>
          <mesh position={[-0.20,-1.00,0]} material={matBand}>
            <cylinderGeometry args={[0.145,0.145,0.045,12]}/>
          </mesh>
          <mesh position={[0.20,-0.38,0]} material={matBody}>
            <cylinderGeometry args={[0.17,0.14,1.18,12]}/>
          </mesh>
          <mesh position={[0.20,-1.00,0]} material={matBand}>
            <cylinderGeometry args={[0.145,0.145,0.045,12]}/>
          </mesh>
        </group>
      );
    }

    // ── Shorts mesh ───────────────────────────────────────────────────────────
    function ShortsMesh({ colors, referenceTexture }) {
      const body  = colors?.body   ?? T;
      const band  = colors?.collar ?? T2;
      const matBody = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
      const matBand = useMemo(() => mat(band,0.6),[band]);
      return (
        <group position={[0,0.2,0]}>
          <mesh position={[0,0.64,0]} rotation={[Math.PI/2,0,0]} material={matBand}>
            <torusGeometry args={[0.36,0.055,8,24]}/>
          </mesh>
          <mesh position={[0,0.36,0]} material={matBody}>
            <cylinderGeometry args={[0.36,0.34,0.35,14]}/>
          </mesh>
          <mesh position={[-0.20,-0.04,0]} material={matBody}>
            <cylinderGeometry args={[0.17,0.16,0.45,12]}/>
          </mesh>
          <mesh position={[0.20,-0.04,0]} material={matBody}>
            <cylinderGeometry args={[0.17,0.16,0.45,12]}/>
          </mesh>
          <mesh position={[-0.20,-0.28,0]} material={matBand}>
            <cylinderGeometry args={[0.165,0.165,0.04,12]}/>
          </mesh>
          <mesh position={[0.20,-0.28,0]} material={matBand}>
            <cylinderGeometry args={[0.165,0.165,0.04,12]}/>
          </mesh>
        </group>
      );
    }

    // ── Skirt mesh ────────────────────────────────────────────────────────────
    // Single flared cone (no leg split) — wider at hem than at waist, matching
    // the trapezoid silhouette used by the 2D GarmentSVG/Fabric.js skirt asset.
    function SkirtMesh({ colors, referenceTexture }) {
      const body  = colors?.body   ?? T;
      const band  = colors?.collar ?? T2;
      const matBody = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
      const matBand = useMemo(() => mat(band,0.6),[band]);
      return (
        <group position={[0,0.1,0]}>
          {/* Waistband */}
          <mesh position={[0,0.64,0]} rotation={[Math.PI/2,0,0]} material={matBand}>
            <torusGeometry args={[0.36,0.055,8,24]}/>
          </mesh>
          {/* Flared body — narrow at waist, wide at hem */}
          <mesh position={[0,0.1,0]} material={matBody}>
            <cylinderGeometry args={[0.38,0.62,1.05,20]}/>
          </mesh>
          {/* Hem ring */}
          <mesh position={[0,-0.42,0]} material={matBand}>
            <cylinderGeometry args={[0.62,0.62,0.03,20]}/>
          </mesh>
        </group>
      );
    }

    // ── Garment selector ──────────────────────────────────────────────────────
    function GarmentMesh({ cfg, referenceTexture }) {
      const gt     = (cfg.garmentType ?? cfg.garment ?? '').toLowerCase();
      const colors = cfg.colors ?? {};
      const sleeve = cfg.sleeveType ?? cfg.sleeve ?? 'short';
      const collar = cfg.collarType ?? cfg.collar ?? 'polo';
      const isSkirt  = /skirt/i.test(gt);
      const isPants  = /pant|scrub.?p|trouser/i.test(gt);
      const isShorts = /short/i.test(gt);
      if (isSkirt)  return <SkirtMesh colors={colors} referenceTexture={referenceTexture}/>;
      if (isPants)  return <PantsMesh colors={colors} referenceTexture={referenceTexture}/>;
      if (isShorts) return <ShortsMesh colors={colors} referenceTexture={referenceTexture}/>;
      return <ShirtMesh colors={colors} sleeveType={sleeve} collarType={collar} referenceTexture={referenceTexture}/>;
    }

    // ── Scene with lighting + controls ────────────────────────────────────────
    function Scene({ cfg, autoRotate, referenceImageUrl }) {
      const referenceTexture = useReferenceTexture(referenceImageUrl);
      return (
        <Canvas
          camera={{ position:[0,0.15,3.8], fov:40 }}
          gl={{ antialias:true, alpha:true, powerPreference:'high-performance' }}
          style={{ width:'100%', height:'100%', background:'transparent' }}>
          <ambientLight intensity={0.55}/>
          <directionalLight position={[3,5,4]}   intensity={1.4} castShadow/>
          <directionalLight position={[-3,2,2]}  intensity={0.4}/>
          <directionalLight position={[0,-2,3]}  intensity={0.25}/>
          <pointLight position={[-2,1,3]}  intensity={0.7} color="#02C39A"/>
          <pointLight position={[2,-1,2]}  intensity={0.4} color="#028090"/>
          {/* <drei.Environment preset="studio" background={false}/> */}
          <drei.Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.22}>
            <GarmentMesh cfg={cfg} referenceTexture={referenceTexture}/>
          </drei.Float>
          <drei.ContactShadows
            position={[0,-1.55,0]} opacity={0.32}
            scale={5} blur={2.5} far={2.2}/>
          <drei.OrbitControls
            enablePan={false} enableDamping dampingFactor={0.08}
            autoRotate={autoRotate} autoRotateSpeed={1.6}
            minPolarAngle={Math.PI/5} maxPolarAngle={Math.PI*0.75}
            minDistance={2.2} maxDistance={6.5}/>
        </Canvas>
      );
    }

    // Return as a renderable component
    return { default: Scene };
  })
);

// ── Error boundary for WebGL failures ────────────────────────────────────────
class WebGLBoundary extends Component {
  constructor(p) { super(p); this.state = { err:false }; }
  static getDerivedStateFromError() { return { err:true }; }
  render() {
    if (this.state.err) return this.props.fallback ?? null;
    return this.props.children;
  }
}

// ── SVG garment illustration (fallback for mobile / no WebGL) ────────────────
function GarmentSVG({ cfg, size = 120 }) {
  const gt      = (cfg?.garmentType ?? cfg?.garment ?? '').toLowerCase();
  const colors  = cfg?.colors ?? {};
  const body    = colors.body   ?? T;
  const collar  = colors.collar ?? T2;
  const sleeve  = colors.sleeve ?? body;
  const pocket  = colors.pocket ?? collar;
  const isPants = /pant|scrub.?p/i.test(gt);
  const isShorts= /short/i.test(gt);

  if (isPants || isShorts) {
    const legH = isShorts ? 60 : 120;
    return (
      <svg width={size} height={size} viewBox="0 0 120 160" fill="none">
        {/* Waistband */}
        <rect x="18" y="10" width="84" height="16" rx="4" fill={collar}/>
        {/* Hip */}
        <rect x="18" y="26" width="84" height="30" rx="4" fill={body}/>
        {/* Left leg */}
        <rect x="18" y="56" width="37" height={legH} rx="4" fill={body}/>
        {/* Right leg */}
        <rect x="65" y="56" width="37" height={legH} rx="4" fill={body}/>
        {/* Cuffs */}
        {!isShorts && <>
          <rect x="18" y={56+legH-8} width="37" height="8" rx="3" fill={collar}/>
          <rect x="65" y={56+legH-8} width="37" height="8" rx="3" fill={collar}/>
        </>}
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 160 180" fill="none">
      {/* Body */}
      <path d="M38 50 L28 28 L60 18 L80 38 L100 18 L132 28 L122 50 L122 158 L38 158 Z"
        fill={body} stroke="rgba(0,0,0,.08)" strokeWidth="1.5"/>
      {/* Collar */}
      <path d="M60 18 Q72 36 80 38 Q88 36 100 18 L92 32 L80 42 L68 32 Z"
        fill={collar} stroke="rgba(0,0,0,.08)" strokeWidth="1"/>
      {/* Left sleeve */}
      <path d="M38 50 L28 28 L8 46 L18 68 Z" fill={sleeve}/>
      {/* Right sleeve */}
      <path d="M122 50 L132 28 L152 46 L142 68 Z" fill={sleeve}/>
      {/* Pocket */}
      <rect x="48" y="72" width="24" height="20" rx="3" fill={pocket} opacity=".8"/>
      {/* Hem */}
      <rect x="38" y="150" width="84" height="8" rx="3" fill={collar} opacity=".6"/>
    </svg>
  );
}

// ── Loader spinner ────────────────────────────────────────────────────────────
function Loader3D() {
  return (
    <div style={{ width:'100%', height:'100%', display:'flex',
      flexDirection:'column', alignItems:'center', justifyContent:'center',
      background:'transparent', gap:10 }}>
      <motion.div
        animate={{ rotate:360 }}
        transition={{ duration:.9, repeat:Infinity, ease:'linear' }}
        style={{ width:28, height:28, borderRadius:'50%',
          border:`3px solid rgba(2,195,154,.2)`,
          borderTopColor:T2 }}/>
      <p style={{ fontSize:10, color:'rgba(255,255,255,.3)', fontFamily:FONT }}>
        Loading 3D…
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GarmentPreview3D({
  cfg,
  height     = 320,
  autoRotate = true,
  showLabel  = true,
  compact    = false,
  // NEW (Aug 10 2026): for orders placed by uploading a reference photo
  // instead of using Design Studio (no studio_config at all) — the photo
  // gets mapped onto the 3D body mesh instead of a flat color, so staff
  // and the customer see something closer to "their" actual design rather
  // than a generic colored shape. Purely a texture on existing procedural
  // geometry — not real photo-to-3D reconstruction, which is a much bigger,
  // separate problem this doesn't attempt to solve.
  referenceImageUrl = null,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [view3D,   setView3D]   = useState(true);
  const [failed,   setFailed]   = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 767);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // FIX: used to bail out entirely with no cfg at all — meant an order
  // placed via reference-photo-only (no Design Studio, so no studio_config)
  // rendered nothing here whatsoever. Now falls back to a minimal synthetic
  // cfg built from whatever plain order fields are available, as long as
  // there's at least a garment type or a reference photo to show.
  if (!cfg && !referenceImageUrl) return null;

  // Safely parse studio_config if it comes in as a JSON string
  const safeCfg = (typeof cfg === 'string' ? (() => {
    try { return JSON.parse(cfg); } catch { return {}; }
  })() : cfg) ?? {};

  const colors     = safeCfg.colors ?? {};
  const bodyColor  = colors.body ?? T;
  const previewPng = safeCfg.previewPng ?? null;
  const garmentName = safeCfg.garmentType ?? safeCfg.garment ?? 'Garment';
  const colorZones  = Object.entries(colors).filter(([,v]) => v);

  // Mobile: show PNG if available, else SVG illustration
  if (isMobile) {
    return (
      <div style={{ width:'100%', fontFamily:FONT }}>
        <div style={{ width:'100%', height:Math.min(height, 220),
          borderRadius:14, overflow:'hidden', background:'#f8fafc',
          border:'1px solid #e2e8f0', display:'flex',
          alignItems:'center', justifyContent:'center' }}>
          {previewPng ? (
            <img src={previewPng} alt="Design preview"
              style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
          ) : (
            <GarmentSVG cfg={safeCfg} size={Math.min(height, 220) * 0.7}/>
          )}
        </div>
        {showLabel && !compact && <ColorChips zones={colorZones} name={garmentName}/>}
      </div>
    );
  }

  return (
    <div style={{ width:'100%', fontFamily:FONT }}>
      {/* 3D / 2D toggle */}
      {!compact && (
        <div style={{ display:'flex', justifyContent:'flex-end',
          marginBottom:8, gap:4 }}>
          {[
            { k:true,  l:'3D' },
            { k:false, l:'Preview' },
          ].map(m => (
            <motion.button key={String(m.k)} whileTap={{ scale:.95 }}
              onClick={() => setView3D(m.k)}
              style={{ padding:'4px 12px', borderRadius:8, border:'none',
                fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:FONT,
                background: view3D===m.k ? T : '#f1f5f9',
                color: view3D===m.k ? '#fff' : '#64748b',
                transition:'all .15s' }}>
              {m.l}
            </motion.button>
          ))}
        </div>
      )}

      {/* Canvas container */}
      <div style={{ width:'100%', height, borderRadius:14, overflow:'hidden',
        background:'linear-gradient(145deg,#060d1a 0%,#0a1628 50%,#050c18 100%)',
        position:'relative' }}>

        <AnimatePresence mode="wait">
          {view3D && !failed ? (
            <motion.div key="3d"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ width:'100%', height:'100%', position:'absolute', inset:0 }}>
              <WebGLBoundary fallback={
                <div style={{ width:'100%', height:'100%',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <GarmentSVG cfg={safeCfg} size={height * 0.55}/>
                </div>
              }>
                <Suspense fallback={<Loader3D/>}>
                  <Scene3D cfg={safeCfg} autoRotate={autoRotate} referenceImageUrl={referenceImageUrl}/>
                </Suspense>
              </WebGLBoundary>
            </motion.div>
          ) : (
            <motion.div key="2d"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ width:'100%', height:'100%', position:'absolute', inset:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              {previewPng ? (
                <img src={previewPng} alt="Design preview"
                  style={{ maxWidth:'85%', maxHeight:'90%', objectFit:'contain',
                    borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,.4)' }}/>
              ) : (
                <GarmentSVG cfg={safeCfg} size={height * 0.55}/>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Corner hint */}
        {view3D && !failed && (
          <div style={{ position:'absolute', bottom:10, left:'50%',
            transform:'translateX(-50%)', padding:'4px 12px', borderRadius:99,
            background:'rgba(0,0,0,.5)', backdropFilter:'blur(6px)',
            fontSize:9, color:'rgba(255,255,255,.4)', fontFamily:FONT,
            pointerEvents:'none', whiteSpace:'nowrap' }}>
            🖱 Drag to rotate · Scroll to zoom
          </div>
        )}

        {/* Color zone chips — top right corner */}
        <div style={{ position:'absolute', top:10, right:10,
          display:'flex', flexDirection:'column', gap:4 }}>
          {colorZones.slice(0,4).map(([zone, hex]) => (
            <div key={zone} title={`${zone}: ${hex}`}
              style={{ width:16, height:16, borderRadius:'50%', background:hex,
                border:'2px solid rgba(255,255,255,.25)',
                boxShadow:'0 2px 6px rgba(0,0,0,.4)' }}/>
          ))}
        </div>
      </div>

      {/* Label below canvas */}
      {showLabel && !compact && (
        <ColorChips zones={colorZones} name={garmentName}/>
      )}
    </div>
  );
}

// ── Color chips label ─────────────────────────────────────────────────────────
function ColorChips({ zones, name }) {
  const ZONE_LABEL = { body:'Body', collar:'Collar', sleeve:'Sleeve', pocket:'Pocket' };
  return (
    <div style={{ marginTop:10, display:'flex', alignItems:'center',
      gap:10, flexWrap:'wrap' }}>
      <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', fontFamily:FONT }}>
        {name}
      </span>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {zones.map(([zone, hex]) => (
          <div key={zone} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:hex,
              border:'1.5px solid rgba(0,0,0,.08)', flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#64748b', fontFamily:FONT }}>
              {ZONE_LABEL[zone] ?? zone}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}