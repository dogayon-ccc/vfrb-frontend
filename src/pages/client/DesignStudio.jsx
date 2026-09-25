// src/pages/client/DesignStudio.jsx
// TASK C-1 — Design Studio v2 full rewrite
// Spec: PUBG/Barbie/Nike By You game-app feel
// BUG 2 FIXED: canvasEl ref object passed to hook (not .current)
// BUG: Google Fonts CDN removed (offline environment)
// New in v2: Pattern tab, sleeve selector, 18 PH swatches,
//            zone hover glow, garment card grid, logo placement presets,
//            font selector, Pollinations.ai texture, Save Design

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import DesignStudioStyles from './design-studio/DesignStudioStyles';
import { useGarmentCanvas, compositeFrontBack } from './design-studio/useGarmentCanvas';
import CanvasViewport from './design-studio/CanvasViewport';
import TopBar from './design-studio/TopBar';
import ToolDrawer from './design-studio/ToolDrawer';
import RightInfoPanel from './design-studio/RightInfoPanel';
import { useLogoUpload } from './design-studio/useLogoUpload';
import OnboardingOverlay from './design-studio/OnboardingOverlay';
import InspoGallery from './design-studio/InspoGallery';
import ShowcaseGallery from './design-studio/ShowcaseGallery';
import { T, T2, CATS, INIT_CFG, FONTS, zonesFor } from './design-studio/dsShared';
import { deserializeDesign } from './design-studio/designSerialization';

// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function DesignStudio() {
  const nav      = useNavigate();
  // BUG 2 FIX: canvasEl is the ref OBJECT — hook reads .current inside useEffect
  const canvasEl     = useRef(null);
  // Responsive canvas: measure the .ds-cv container so the canvas fills it
  const canvasWrapRef = useRef(null);

  const [cfg,        setCfg]        = useState(INIT_CFG);
  const [zoom,       setZoom]       = useState(1);
  const [tool,       setTool]       = useState('type');
  const [assetsTab,  setAssetsTab]  = useState('logo');
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [viewMode,   setViewMode]   = useState('2d');
  const [snapshot,   setSnapshot]   = useState(null);
  const [overlays,   setOverlays]   = useState(null);
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
  const [showShowcase, setShowShowcase] = useState(false); // cross-client showcase overlay
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
  // Canvas scaling (fit-to-pane × zoom) is owned solely by CanvasViewport — a second
  // writer on the same wrapper's style.transform made the zoom buttons fight it.

  // BUG 2 FIX: pass canvasEl (ref object), not canvasEl.current (null at render)
  const { addLogo, addText, addShape, updateSelected, deleteSelected, duplicateSelected, exportOverlays, exportPNG, getCanvasJSON, loadCanvasJSON,
          pushHistory, undo, redo, canUndo, canRedo, resizeCanvas, initFailed,
          layers, selectLayer, toggleLayerVisibility, renameLayer, deleteLayer, reorderLayers,
          setDrawMode, setBrushStyle } =
    useGarmentCanvas(
      canvasEl,
      cfg.garment,
      cfg.sleeve,
      face,
      cfg.colors,
      cfg.patterns,
      cfg.patternParams,
      setSelObj,
      (zone) => { setActiveZone(zone); setTool('color'); }  // zone click → open color tab
    );

  const logoUpload = useLogoUpload(addLogo);
  // A file dropped on the canvas goes through the same pipeline as the panel, and
  // the panel opens so the customer can see progress, errors and the result.
  const onLogoFile = useCallback((file) => {
    setTool('assets'); setAssetsTab('logo'); setSheetOpen(true);
    logoUpload.upload(file);
  }, [logoUpload]);

  // Snapshot the live 2D canvas as a texture for the 3D view — was declared
  // in DesignStudio3D.jsx but never actually wired to a real data source,
  // so 3D never showed logo/text/pattern, only the flat body color. Refresh
  // on every switch to 3D so it's never stale from an earlier edit.
  useEffect(() => {
    if (viewMode !== '3d') return;
    faceJSON.current[face] = getCanvasJSON() ?? [];
    setSnapshot(exportPNG(cfg.colors.body));
    setOverlays({ front: faceJSON.current.front, back: faceJSON.current.back });
  }, [viewMode, exportPNG, getCanvasJSON, face, cfg.colors.body]);

  // ── FREEFORM DRAWING state (Sept 9 2026) ─────────────────────
  const [brushSize,  setBrushSize]  = useState(5);
  const [brushColor, setBrushColorState] = useState(T2);

  // Enter/exit drawing mode as the user switches tabs — only 'draw' should
  // ever leave isDrawingMode:true on the canvas; every other tab needs
  // normal selection back (this is what makes clicking a garment zone,
  // dragging a logo, etc. keep working once the user leaves the Draw tab).
  useEffect(() => {
    setDrawMode(tool === 'draw', brushSize, brushColor);
    // Only re-run on tab change — brushSize/brushColor changes while
    // already drawing are pushed live via setBrushStyle below instead of
    // re-toggling isDrawingMode (which would interrupt an in-progress
    // decision, and unnecessarily re-runs discardActiveObject()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const changeBrushSize = (size) => { setBrushSize(size); setBrushStyle(size, undefined); };
  const changeBrushColor = (color) => { setBrushColorState(color); setBrushStyle(undefined, color); };

  // Must stay after the useGarmentCanvas() destructuring above (resizeCanvas TDZ).
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setOnboardStep(0);
    try { localStorage.setItem('studio_visited', '1'); } catch {}
    setTimeout(() => resizeCanvas(), 120);
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

  // Skips the reload when we're already on the target face — calling
  // loadCanvasJSON() on a face whose content is already live and correct
  // kicks off a redundant async enlivenObjects() that can resolve late and
  // re-add objects onto whatever face we've since moved to. Real bug, caught
  // via screenshot: an emoji added on front leaked onto the back export.
  const exportFrontBack = useCallback(async () => {
    const originalFace = face;
    let activeFace = originalFace;
    faceJSON.current[activeFace] = getCanvasJSON() ?? [];

    const capture = async (target) => {
      if (target !== activeFace) {
        faceJSON.current[activeFace] = getCanvasJSON() ?? [];
        setFace(target);
        await new Promise(r => setTimeout(r, 150));
        loadCanvasJSON(faceJSON.current[target] ?? []);
        await new Promise(r => setTimeout(r, 250));
        activeFace = target;
      }
      return exportPNG();
    };

    const frontUrl = await capture('front');
    const backUrl  = await capture('back');
    if (activeFace !== originalFace) await capture(originalFace);

    return compositeFrontBack(frontUrl, backUrl);
  }, [face, getCanvasJSON, loadCanvasJSON, exportPNG]);

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
    // Schema gap fix: "bold font", names, numbers described in a prompt
    // were silently dropped — the Gemini schema had no field to carry
    // them, so nothing on the frontend could ever apply them. Backend now
    // returns textContent/textBold; place it the same way TextPanel does.
    if (aiCfg.textContent) {
      const fontCss = FONTS.find(f => f.id === (aiCfg.textBold ? 'bold' : 'clean')).css;
      const textColor = aiCfg.colors?.accent ?? '#FFFFFF';
      setTimeout(() => addText(aiCfg.textContent, textColor, fontCss, 22), 250);
    }
  }, [addText]);

  // ── Draft restore on mount ────────────────────────────────────────────────
  // REGRESSION FIX: this used to apply the saved draft's garment straight into
  // live cfg the moment the DB responded — a blank studio (garment:null, the
  // intended "new design" state) would silently pop back to whatever the user
  // was last working on, with only a 4s toast as explanation. It's now an
  // explicit, dismissible offer: the draft is held in `pendingDraft` and the
  // blank canvas stays blank until the user chooses "Restore".
  // Still skipped if sessionStorage already has a config (mid-OrderWizard /
  // came from My Designs "Continue editing" or "Order again", which already
  // set the config the caller wants — an unrelated older DB draft must not
  // override that on the very next mount).
  const [pendingDraft, setPendingDraft] = useState(null);
  useEffect(() => {
    if (sessionStorage.getItem('studio_config')) return;
    axios.get('/api/customer/drafts/latest')
      .then(r => {
        const draft = r.data?.draft;
        if (draft?.studio_config?.garment) setPendingDraft(draft);
      })
      .catch(() => {});
  }, []);

  // 3D-contract fix: this used to hand-pick name/category/garment/sleeve/colors/patterns
  // and drop `fit` and `patternParams` entirely, so restoring a draft silently reverted a
  // saved female fit back to male and lost custom stripe width/spacing in the 3D preview
  // (same class of bug INIT_CFG below now avoids by delegating to deserializeDesign).
  // Also now restores front AND back overlays instead of only whichever face was live at
  // save time (deserializeDesign falls back frontOverlays -> overlays for older drafts).
  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    const { cfg: restored, frontOverlays, backOverlays } = deserializeDesign(pendingDraft.studio_config);
    setCfg(p => ({ ...p, ...restored }));
    faceJSON.current = { front: frontOverlays, back: backOverlays };
    const toLoad = faceJSON.current[face] ?? [];
    if (toLoad.length > 0) setTimeout(() => loadCanvasJSON(toLoad), 350);
    setPendingDraft(null);
    setDraftRestored(true);
    setTimeout(() => setDraftRestored(false), 4000);
  }, [pendingDraft, loadCanvasJSON, face]);

  const dismissDraft = useCallback(() => setPendingDraft(null), []);

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
    if (!cfg.garment) return;
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
  const downloadImage = useCallback(async () => {
    if (!cfg.garment) return;
    const dataUrl = await exportFrontBack();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `vfrb-design-${cfg.garment.replace(/\s+/g,'-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [exportFrontBack, cfg.garment]);

  const orderThis = useCallback(async () => {
    if (!cfg.garment) return;
    // exportFrontBack() leaves faceJSON.current and the live canvas back on the original face.
    const previewPng = await exportFrontBack();
    const snap = {
      ...cfg,
      garmentType: cfg.garment,
      collarType:  null,
      sleeveType:  cfg.sleeve,
      pocketType:  null, // Design Studio has no pocket-type UI yet — was hardcoded to 'left_chest' (a logo-placement id, copy-paste bug), sending null instead of wrong data
      overlays:    exportOverlays(),      // current face overlays
      frontOverlays: faceJSON.current.front,
      backOverlays:  faceJSON.current.back,
      previewPng,
    };
    sessionStorage.setItem('studio_config',   JSON.stringify(snap));
    sessionStorage.setItem('studio_preview',  snap.previewPng ?? '');
    sessionStorage.setItem('studio_color',    cfg.colors.body);
    sessionStorage.setItem('studio_garment',  cfg.garment);
    sessionStorage.setItem('studio_category', cfg.category);
    // Clear DB draft — design is now an order, draft is no longer needed
    axios.delete('/api/customer/drafts/latest').catch(() => {});
    nav('/order/create');
  }, [cfg, exportOverlays, exportFrontBack, nav]);

  const clearGarment = useCallback(() => setCfg(p => ({ ...p, garment: null })), []);

  const catData   = useMemo(() => CATS.find(c=>c.id===cfg.category) ?? CATS[0], [cfg.category]);
  const zone = zonesFor(cfg.garment, cfg.sleeve).includes(activeZone) ? activeZone : 'body';

  return (
    <>
      <DesignStudioStyles/>

      <div className="ds" data-sheet={sheetOpen ? 'open' : 'closed'} style={{ position:'relative' }}>

        {/* ── TOP BAR ── */}
        <TopBar nav={nav} cfg={cfg} setCfg={setCfg} catData={catData} undo={undo} redo={redo}
          canUndo={canUndo} canRedo={canRedo}
          viewMode={viewMode} setViewMode={setViewMode} setHas3DLoaded={setHas3DLoaded}
          selObj={selObj} deleteSelected={deleteSelected}
          showInspo={showInspo} setShowInspo={setShowInspo}
          showShowcase={showShowcase} setShowShowcase={setShowShowcase}
          saved={saved} draftSaved={draftSaved} saveDesign={saveDesign} orderThis={orderThis}/>

        {/* ── PENDING DRAFT OFFER ── an unfinished design exists; ask before applying it */}
        <AnimatePresence>
          {pendingDraft && (
            // FIX: a plain wrapper carries left:50%/translateX(-50%) for horizontal centering.
            // Framer Motion writes its own `transform` from the `y` animation prop straight onto
            // the animated element's style, silently overwriting any translateX we set there —
            // so the animated motion.div must not be the one doing the centering.
            <div style={{ position:'absolute', top:58, left:'50%', transform:'translateX(-50%)',
              zIndex:90, width:'max-content', maxWidth:'calc(100vw - 24px)' }}>
            <motion.div
              initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              style={{
                padding:'10px 12px', borderRadius:14,
                background:'#fff', border:`1px solid ${T}55`,
                boxShadow:'0 8px 24px rgba(15,23,42,.14)',
                display:'flex', flexWrap:'wrap', alignItems:'center', gap:'6px 10px',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                <NavIcon name="cloudSaved" size={14} style={{ color:T, flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:600, color:'#1a2332', lineHeight:1.4 }}>
                  You have an unfinished design{pendingDraft.studio_config?.garment ? ` (${pendingDraft.studio_config.garment})` : ''}.
                </span>
              </div>
              <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
                <button type="button" onClick={restoreDraft}
                  style={{ fontSize:12, fontWeight:700, color:'#fff', background:T,
                    border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', whiteSpace:'nowrap' }}>
                  Restore
                </button>
                <button type="button" onClick={dismissDraft}
                  style={{ fontSize:12, fontWeight:600, color:'#64748b', background:'transparent',
                    border:'none', cursor:'pointer', padding:'6px 4px', whiteSpace:'nowrap' }}>
                  Start blank
                </button>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── DRAFT RESTORED BANNER ── */}
        <AnimatePresence>
          {draftRestored && (
            // Same centering fix as the pending-draft offer above: transform must live on a
            // non-animated wrapper, not on the motion.div that also animates `y`.
            <div style={{ position:'absolute', top:58, left:'50%', transform:'translateX(-50%)',
              zIndex:90, width:'max-content', maxWidth:'calc(100vw - 24px)' }}>
            <motion.div
              initial={{ opacity:0, y:-8 }}
              animate={{ opacity:1, y:0, transition:{ duration:.25 } }}
              exit={{   opacity:0, y:-8, transition:{ duration:.2  } }}
              style={{
                padding:'7px 18px', borderRadius:99,
                background:`linear-gradient(135deg,${T},${T2})`,
                color:'#000', fontSize:11, fontWeight:700,
                boxShadow:'0 4px 16px rgba(2,195,154,.35)',
                whiteSpace:'nowrap', pointerEvents:'none',
                display:'flex', alignItems:'center', gap:6,
              }}>
              <NavIcon name="cloudSaved" size={13}/> Design restored from your last session
            </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── BODY ── */}
        <div className="ds-body">

          {/* ── TOOL STRIP + PANEL DRAWER ── */}
          <ToolDrawer tool={tool} setTool={setTool} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen}
            summary={{ cfg, saved, saveDesign, orderThis, downloadImage, clearGarment }} cfg={cfg} setCfg={setCfg}
            activeZone={zone} setActiveZone={setActiveZone}
            addText={addText} addShape={addShape} updateSelected={updateSelected}
            assetsTab={assetsTab} setAssetsTab={setAssetsTab} logoUpload={logoUpload}
            setShowInspo={setShowInspo} setShowShowcase={setShowShowcase}
            brushSize={brushSize} brushColor={brushColor}
            changeBrushSize={changeBrushSize} changeBrushColor={changeBrushColor}
            applyAI={applyAI} layers={layers} selObj={selObj}
            selectLayer={selectLayer} toggleLayerVisibility={toggleLayerVisibility}
            renameLayer={renameLayer} deleteLayer={deleteLayer} reorderLayers={reorderLayers}/>

          {/* ── CANVAS AREA ── */}
          <CanvasViewport cfg={cfg} canvasWrapRef={canvasWrapRef} canvasEl={canvasEl} initFailed={initFailed}
            aiPulse={aiPulse} face={face} switchFace={switchFace}
            selObj={selObj} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected}
            viewMode={viewMode} has3DLoaded={has3DLoaded} onLogoFile={onLogoFile}
            zoom={zoom} setZoom={setZoom} snapshot={snapshot} overlays={overlays}/>
          {/* ── RIGHT INFO PANEL ── */}
          <RightInfoPanel cfg={cfg} saved={saved} saveDesign={saveDesign} orderThis={orderThis} downloadImage={downloadImage} clearGarment={clearGarment}
            selObj={selObj} updateSelected={updateSelected} deleteSelected={deleteSelected}/>
        </div>

        {/* ── FIRST-VISIT ONBOARDING OVERLAY ── */}
        <OnboardingOverlay showOnboarding={showOnboarding} onboardStep={onboardStep}
          nextOnboardStep={nextOnboardStep} dismissOnboarding={dismissOnboarding}/>

        {/* ── INSPIRATION GALLERY OVERLAY ── */}
        <InspoGallery showInspo={showInspo} setShowInspo={setShowInspo} setCfg={setCfg}
          loadCanvasJSON={loadCanvasJSON}/>

        {/* ── SHOWCASE GALLERY OVERLAY ── */}
        <ShowcaseGallery showShowcase={showShowcase} setShowShowcase={setShowShowcase} setCfg={setCfg}
          loadCanvasJSON={loadCanvasJSON}/>

      </div>
    </>
  );
}