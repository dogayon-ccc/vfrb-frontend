// src/pages/customer/DesignStudio3D.jsx
// BUG 3 FIX — replaced all BoxGeometry with CylinderGeometry per master prompt spec
// FF-1 FIX — removed Environment preset="studio" (fetches CDN HDR → crashes WebGL offline)
//             replaced with hemisphereLight + pointLight (no network calls)
//
// Master prompt geometry spec (locked):
//   Body:    CylinderGeometry(0.35, 0.40, 1.1, 16)  — tapered shirt
//   Sleeves: CylinderGeometry(0.12, 0.14, 0.5, 12)  rotated at shoulders
//   Collar:  TorusGeometry(0.18, 0.04, 8, 16)        at neck
//   Pocket:  PlaneGeometry(0.12, 0.10)               offset on body
//   Cuffs:   CylinderGeometry(0.13, 0.13, 0.04, 12)  at sleeve ends
//   Hem:     CylinderGeometry(0.40, 0.40, 0.04, 16)  at bottom
//   Pants:   two CylinderGeometry legs + TorusGeometry waistband
//
// Lazy-loaded from DesignStudio.jsx:
//   const Scene3D = lazy(() => import('./DesignStudio3D'))

import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Float, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { SCANNED_GARMENTS } from './design-studio/garmentMeshManifest';
import { DEFAULT_GARMENT_COLOR } from './design-studio/regionTexture';
import ScannedGarmentMesh from './design-studio/ScannedGarmentMesh';
import GarmentMeshErrorBoundary from './design-studio/GarmentMeshErrorBoundary';

// Touch devices render at most 1.5x; retina laptops keep 2x.
const DPR = window.matchMedia('(pointer: coarse)').matches ? [1, 1.5] : [1, 2];

// FIX (3D never showed logo/pattern/text): added optional texture param —
// same pattern already proven in components/GarmentPreview3D.jsx. When a
// texture is supplied, color is forced to white so MeshStandardMaterial
// doesn't tint it (it multiplies map × color by default).
function mat(color, roughness = 0.72, metalness = 0.03, texture = null) {
  return new THREE.MeshStandardMaterial({
    color: texture ? '#ffffff' : color,
    map: texture ?? null,
    roughness, metalness,
  });
}

// Loads a data URL (snapshot of the live 2D Fabric canvas) as a Three.js
// texture. Data URLs need no CORS handling. Cancels cleanly if the URL
// changes or the component unmounts before loading finishes.
function useOverlayTexture(dataUrl) {
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    if (!dataUrl) { setTexture(null); return; }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      dataUrl,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.encoding = THREE.sRGBEncoding;
        // CylinderGeometry's UV seam faces the camera; shift half a turn so the design centre lands on the front.
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.offset.x = 0.5;
        setTexture(tex);
      },
      undefined,
      () => { if (!cancelled) setTexture(null); } // silently fall back to flat color
    );
    return () => { cancelled = true; };
  }, [dataUrl]);
  return texture;
}

// ── SHIRT / POLO MESH (BUG 3 FIX — CylinderGeometry) ─────────────────────────
function ShirtMesh({ colors, sleeveType, collarType, referenceTexture }) {
  const groupRef = useRef();

  const body   = colors?.body   ?? DEFAULT_GARMENT_COLOR;
  const collar = colors?.collar ?? '#02C39A';
  const sleeve = colors?.sleeve ?? colors?.body ?? DEFAULT_GARMENT_COLOR;
  const pocket = colors?.pocket ?? colors?.collar ?? '#016070';

  const matBody   = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
  const matCollar = useMemo(() => mat(collar),  [collar]);
  const matSleeve = useMemo(() => mat(sleeve),  [sleeve]);
  const matPocket = useMemo(() => mat(pocket, 0.6), [pocket]);

  const isLong      = /long/i.test(sleeveType ?? '');
  // 3/4-length sleeve — the 2D canvas (DesignStudio.jsx SLEEVE_VARIANTS)
  // already treats "3/4" as its own distinct length between Short and
  // Long. The 3D mesh never had a matching tier: any sleeveType that
  // wasn't "long" fell into the same 0.46 bucket as "Short", so Short
  // and 3/4 rendered identically (confirmed via screenshot — both showed
  // the same stubby sleeve while only Long looked different).
  const isThreeQuarter = /3\/4|three.?quarter/i.test(sleeveType ?? '');
  const isSleeveless= /sleeve.*less|none/i.test(sleeveType ?? '');
  const isVneck     = /v.*neck|scrub/i.test(collarType ?? '');
  const isMandarin  = /mandarin/i.test(collarType ?? '');

  // Three real length tiers now, matching the 2D proportions: Short is
  // the base cylinder, 3/4 sits partway between Short and Long, Long is
  // the longest. Radii taper slightly as sleeves get longer, same as
  // before. Raglan intentionally has no separate tier here — the 2D
  // SLEEVE_VARIANTS entry for 'Raglan' explicitly keeps the same shape
  // ("different material color zone in 3D" per its own comment), so it
  // correctly falls through to the Short-length default.
  const sleeveLen  = isLong ? 0.85 : isThreeQuarter ? 0.65 : 0.46;
  const sleeveTopR = isLong ? 0.11 : isThreeQuarter ? 0.12 : 0.13;
  const sleeveBotR = isLong ? 0.09 : isThreeQuarter ? 0.105 : 0.12;

  // Idle float handled by parent Float component — no useFrame needed
  return (
    <group ref={groupRef}>
      {/* ── Body: tapered cylinder (wider at hip, narrower at chest) ── */}
      <mesh position={[0, 0, 0]} material={matBody}>
        <cylinderGeometry args={[0.35, 0.40, 1.1, 16]}/>
      </mesh>

      {/* ── Hem ring at bottom ── */}
      <mesh position={[0, -0.55, 0]} material={matCollar}>
        <cylinderGeometry args={[0.40, 0.40, 0.04, 16]}/>
      </mesh>

      {/* ── Left sleeve ── */}
      {!isSleeveless && (
        <group position={[-0.44, 0.38, 0]} rotation={[0, 0, 0.52]}>
          <mesh material={matSleeve}>
            <cylinderGeometry args={[sleeveTopR, sleeveBotR, sleeveLen, 12]}/>
          </mesh>
          {/* Cuff */}
          <mesh position={[0, -sleeveLen * 0.52, 0]} material={matCollar}>
            <cylinderGeometry args={[sleeveBotR + 0.01, sleeveBotR + 0.01, 0.04, 12]}/>
          </mesh>
        </group>
      )}

      {/* ── Right sleeve ── */}
      {!isSleeveless && (
        <group position={[0.44, 0.38, 0]} rotation={[0, 0, -0.52]}>
          <mesh material={matSleeve}>
            <cylinderGeometry args={[sleeveTopR, sleeveBotR, sleeveLen, 12]}/>
          </mesh>
          {/* Cuff */}
          <mesh position={[0, -sleeveLen * 0.52, 0]} material={matCollar}>
            <cylinderGeometry args={[sleeveBotR + 0.01, sleeveBotR + 0.01, 0.04, 12]}/>
          </mesh>
        </group>
      )}

      {/* ── Collar ── */}
      {isVneck ? (
        // V-neck / scrub: open V notch — two small cylinders angled
        <>
          <mesh position={[-0.06, 0.62, 0.1]} rotation={[0, 0, 0.45]} material={matCollar}>
            <cylinderGeometry args={[0.025, 0.02, 0.22, 8]}/>
          </mesh>
          <mesh position={[0.06, 0.62, 0.1]} rotation={[0, 0, -0.45]} material={matCollar}>
            <cylinderGeometry args={[0.025, 0.02, 0.22, 8]}/>
          </mesh>
        </>
      ) : isMandarin ? (
        // Mandarin: short upright cylinder band
        <mesh position={[0, 0.63, 0]} material={matCollar}>
          <cylinderGeometry args={[0.16, 0.17, 0.14, 14]}/>
        </mesh>
      ) : (
        // Polo collar: torus ring
        <mesh position={[0, 0.60, 0]} rotation={[Math.PI / 2, 0, 0]} material={matCollar}>
          <torusGeometry args={[0.18, 0.04, 8, 16]}/>
        </mesh>
      )}

      {/* ── Pocket: PlaneGeometry offset on body ── */}
      <mesh position={[-0.19, 0.14, 0.38]} material={matPocket}>
        <planeGeometry args={[0.12, 0.10]}/>
      </mesh>

      {/* ── Shoulders: small sphere caps at sleeve joins — only needed to
          round the join where a sleeve cylinder meets the body. With no
          sleeve present (sleeveless), these floated as disconnected blobs —
          gate with !isSleeveless, same condition already used above. ── */}
      {!isSleeveless && (
        <>
          <mesh position={[-0.38, 0.52, 0]} material={matSleeve}>
            <sphereGeometry args={[0.14, 8, 8, 0, Math.PI]}/>
          </mesh>
          <mesh position={[0.38, 0.52, 0]} material={matSleeve}>
            <sphereGeometry args={[0.14, 8, 8, 0, Math.PI]}/>
          </mesh>
        </>
      )}
    </group>
  );
}

// ── PANTS / SCRUB PANTS MESH ─────────────────────────────────────────────────
function PantsMesh({ colors, referenceTexture }) {
  const body   = colors?.body   ?? DEFAULT_GARMENT_COLOR;
  const collar = colors?.collar ?? colors?.body ?? '#02C39A';

  const matBody = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
  const matBand = useMemo(() => mat(collar, 0.6), [collar]);

  return (
    <group position={[0, -0.1, 0]}>
      {/* ── Waistband: torus at top ── */}
      <mesh position={[0, 0.84, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBand}>
        <torusGeometry args={[0.36, 0.055, 8, 24]}/>
      </mesh>

      {/* ── Hip section (single wider cylinder before legs split) ── */}
      <mesh position={[0, 0.52, 0]} material={matBody}>
        <cylinderGeometry args={[0.36, 0.34, 0.40, 14]}/>
      </mesh>

      {/* ── Left leg ── */}
      <mesh position={[-0.20, -0.38, 0]} material={matBody}>
        <cylinderGeometry args={[0.17, 0.14, 1.18, 12]}/>
      </mesh>
      {/* Left cuff */}
      <mesh position={[-0.20, -1.00, 0]} material={matBand}>
        <cylinderGeometry args={[0.145, 0.145, 0.045, 12]}/>
      </mesh>

      {/* ── Right leg ── */}
      <mesh position={[0.20, -0.38, 0]} material={matBody}>
        <cylinderGeometry args={[0.17, 0.14, 1.18, 12]}/>
      </mesh>
      {/* Right cuff */}
      <mesh position={[0.20, -1.00, 0]} material={matBand}>
        <cylinderGeometry args={[0.145, 0.145, 0.045, 12]}/>
      </mesh>
    </group>
  );
}

// ── SHORTS MESH ───────────────────────────────────────────────────────────────
function ShortsMesh({ colors, referenceTexture }) {
  const body   = colors?.body   ?? DEFAULT_GARMENT_COLOR;
  const collar = colors?.collar ?? '#02C39A';

  const matBody = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
  const matBand = useMemo(() => mat(collar, 0.6), [collar]);

  return (
    <group position={[0, 0.2, 0]}>
      <mesh position={[0, 0.64, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBand}>
        <torusGeometry args={[0.36, 0.055, 8, 24]}/>
      </mesh>
      <mesh position={[0, 0.36, 0]} material={matBody}>
        <cylinderGeometry args={[0.36, 0.34, 0.35, 14]}/>
      </mesh>
      {/* Short legs — only 0.45 long */}
      <mesh position={[-0.20, -0.04, 0]} material={matBody}>
        <cylinderGeometry args={[0.17, 0.16, 0.45, 12]}/>
      </mesh>
      <mesh position={[0.20, -0.04, 0]} material={matBody}>
        <cylinderGeometry args={[0.17, 0.16, 0.45, 12]}/>
      </mesh>
      {/* Hem at each leg bottom */}
      <mesh position={[-0.20, -0.28, 0]} material={matBand}>
        <cylinderGeometry args={[0.165, 0.165, 0.04, 12]}/>
      </mesh>
      <mesh position={[0.20, -0.28, 0]} material={matBand}>
        <cylinderGeometry args={[0.165, 0.165, 0.04, 12]}/>
      </mesh>
    </group>
  );
}

// ── SKIRT MESH ────────────────────────────────────────────────────────────────
// Single flared cone (no leg split) — wider at hem than at waist, matching
// the trapezoid silhouette used by the 2D GarmentSVG/Fabric.js skirt asset.
function SkirtMesh({ colors, referenceTexture }) {
  const body  = colors?.body   ?? DEFAULT_GARMENT_COLOR;
  const band  = colors?.collar ?? '#02C39A';

  const matBody = useMemo(() => mat(body, 0.72, 0.03, referenceTexture), [body, referenceTexture]);
  const matBand = useMemo(() => mat(band, 0.6),        [band]);

  return (
    <group position={[0, 0.1, 0]}>
      {/* ── Waistband: torus at top ── */}
      <mesh position={[0, 0.64, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBand}>
        <torusGeometry args={[0.36, 0.055, 8, 24]}/>
      </mesh>
      {/* ── Flared body — narrow at waist, wide at hem ── */}
      <mesh position={[0, 0.1, 0]} material={matBody}>
        <cylinderGeometry args={[0.38, 0.62, 1.05, 20]}/>
      </mesh>
      {/* ── Hem ring ── */}
      <mesh position={[0, -0.42, 0]} material={matBand}>
        <cylinderGeometry args={[0.62, 0.62, 0.03, 20]}/>
      </mesh>
    </group>
  );
}

// ── Garment selector — picks the right mesh ───────────────────────────────────
function GarmentMesh({ cfg, referenceTexture, overlays }) {
  const gt = (cfg.garmentType ?? cfg.garment ?? '').toLowerCase();
  if (!gt) return null; // nothing chosen yet: render no garment instead of a generic shirt
  const colors = cfg.colors ?? {};
  const sleeve = cfg.sleeveType ?? cfg.sleeve ?? 'short';
  // No dedicated collar-style field exists on cfg — "collar" there is only
  // ever a color-zone key (colors.collar). Confirmed by reading dsShared.js:
  // every real garment already names its own collar style ("V-Neck Shirt",
  // "Mandarin Collar", "Scrub Top"), so read style from the garment name
  // instead of a field that was never populated. Was silently always
  // falling back to 'polo' — every garment showed the same torus collar
  // in 3D no matter what was actually selected.
  const collar = cfg.collarType ?? cfg.collar ?? gt;

  const isSkirt    = /skirt/i.test(gt);
  const isPants    = /pant|scrub.?p|trouser/i.test(gt);
  const isShorts   = /short/i.test(gt);
  const scanned    = SCANNED_GARMENTS.find(g => g.match.test(gt));

  const shirt = <ShirtMesh colors={colors} sleeveType={sleeve} collarType={collar} referenceTexture={referenceTexture}/>;
  if (scanned) {
    const fit = cfg.fit ?? cfg.gender;
    return (
      <GarmentMeshErrorBoundary key={`${gt}-${fit}`} fallback={shirt}>
        <ScannedGarmentMesh manifest={scanned} colors={colors} patterns={cfg.patterns} patternParams={cfg.patternParams} fit={fit} garment={cfg.garment} sleeve={cfg.sleeve} overlays={overlays}/>
      </GarmentMeshErrorBoundary>
    );
  }
  if (isSkirt)  return <SkirtMesh colors={colors} referenceTexture={referenceTexture}/>;
  if (isPants)  return <PantsMesh colors={colors} referenceTexture={referenceTexture}/>;
  if (isShorts) return <ShortsMesh colors={colors} referenceTexture={referenceTexture}/>;

  return shirt;
}

// The Studio keeps this Canvas mounted (visibility:hidden) while the 2D view is active; stop rendering frames then.
function PauseWhenHidden() {
  const { gl, setFrameloop, invalidate } = useThree();
  useEffect(() => {
    let last;
    const tick = () => {
      const hidden = getComputedStyle(gl.domElement).visibility === 'hidden' || document.hidden;
      if (hidden === last) return;
      last = hidden;
      setFrameloop(hidden ? 'never' : 'always');
      if (!hidden) invalidate();
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [gl, setFrameloop, invalidate]);
  return null;
}

// ── Full scene ─────────────────────────────────────────────────────────────────
export default function DesignStudio3D({ cfg = {}, overlayDataUrl = null, overlays = null }) {
  // FIX (3D never showed logo/pattern/text): loads the live 2D canvas
  // snapshot (refreshed by DesignStudio.jsx each time "3D" is clicked) as
  // a texture for the body mesh. Falls back to flat color if there's no
  // snapshot yet or it fails to load — same safe fallback as
  // GarmentPreview3D's reference-image texture.
  const referenceTexture = useOverlayTexture(overlayDataUrl);

  return (
    <Canvas
      dpr={DPR}
      camera={{ position:[0, 0.15, 3.8], fov:40 }}
      gl={{ antialias:true, alpha:true, powerPreference:'high-performance', toneMapping:THREE.ACESFilmicToneMapping, toneMappingExposure:0.85 }}
      style={{ width:'100%', height:'100%', background:'transparent' }}>

      <PauseWhenHidden/>

      {/* Offline studio: soft-box reflections instead of a fetched HDR */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.3} position={[0, 3, 4]} scale={[6, 3, 1]}/>
        <Lightformer form="rect" intensity={0.7} position={[-4, 1, 2]} scale={[2, 5, 1]}/>
        <Lightformer form="rect" intensity={0.9} position={[4, 1, -2]} scale={[2, 5, 1]}/>
        <Lightformer form="rect" intensity={1.3} position={[0, 3, -4]} scale={[6, 3, 1]}/>
        <Lightformer form="rect" intensity={0.35} position={[0, -2, 3]} scale={[6, 1.5, 1]}/>
      </Environment>
      <ambientLight intensity={0.12}/>
      <directionalLight position={[2.5, 4, 4]} intensity={0.9}/>
      <directionalLight position={[-2.5, 3, -4]} intensity={0.7}/>

      {/* BUG FIX (3D doesn't render): ScannedGarmentMesh calls useGLTF(), which
          suspends on first load. react-three-fiber's <Canvas> renders its own
          reconciler tree — the <Suspense> in CanvasViewport.jsx wraps only the
          React.lazy() import of this module from OUTSIDE the Canvas, so it
          never catches a suspend thrown from INSIDE the Canvas tree. With no
          Suspense boundary in here, GarmentMeshErrorBoundary (a plain error
          boundary, not a Suspense) had nothing to hand the pending promise to,
          so any scanned garment (T-Shirt, Lab Coverall) whose GLB hadn't
          already resolved from the manifest's useGLTF.preload() would blank
          the whole 3D pane instead of showing a fallback. fallback={null} is
          correct here (not a spinner) because CanvasViewport already shows its
          own "Loading 3D engine…" state for the lazy import; this only covers
          the brief GLB-parse window after that. */}
      <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.22}>
        <Suspense fallback={null}>
          <GarmentMesh cfg={cfg} referenceTexture={referenceTexture} overlays={overlays}/>
        </Suspense>
      </Float>

      {/* ── Ground shadow ── */}
      <ContactShadows
        position={[0, -1.55, 0]}
        opacity={0.32} scale={5}
        blur={2.5} far={2.2}
      />

      {/* ── Camera controls ── */}
      <OrbitControls
        enablePan={false}
        enableDamping dampingFactor={0.08}
        autoRotate autoRotateSpeed={1.6}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI * 0.75}
        minDistance={2.2} maxDistance={6.5}
      />
    </Canvas>
  );
}