// src/pages/client/DesignStudio.jsx
// TASK C-1 — Design Studio v2 full rewrite
// Spec: PUBG/Barbie/Nike By You game-app feel
// BUG 2 FIXED: canvasEl ref object passed to hook (not .current)
// BUG: Google Fonts CDN removed (offline environment)
// New in v2: Pattern tab, sleeve selector, 18 PH swatches,
//            zone hover glow, garment card grid, logo placement presets,
//            font selector, Pollinations.ai texture, Save Design

import { stashStudioConfig } from '../../utils/studioHandoff';
import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import DesignStudioStyles from './design-studio/DesignStudioStyles';
import { useGarmentCanvas, compositeFrontBack } from './design-studio/useGarmentCanvas';
import { hasBackView, templateIdFor } from './design-studio/garmentAssets';
import { EXPORT_FACE_HEIGHT, designPng, designPdf, downloadBlobOrUrl } from './design-studio/designExport';
import { ENTRIES as GALLERY } from './design-studio/designGallery';
import CanvasViewport from './design-studio/CanvasViewport';
import TopBar from './design-studio/TopBar';
import ToolDrawer from './design-studio/ToolDrawer';
import { isEditableSelection } from './design-studio/RightInfoPanel';
import { useLogoUpload } from './design-studio/useLogoUpload';
import OnboardingOverlay from './design-studio/OnboardingOverlay';
import InspoGallery from './design-studio/InspoGallery';
import ShowcaseGallery from './design-studio/ShowcaseGallery';
import { T, T2, CATS, INIT_CFG, FONTS, zonesFor } from './design-studio/dsShared';
import { deserializeDesign, serializeDesign } from './design-studio/designSerialization';
import { familyFor, pieceOf } from './design-studio/garmentCatalog';
import { SET_ROLES, ROLE_LABEL, DEFAULT_PIECE, otherRole, normalizeSet, withSet } from './design-studio/uniformSet';

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
  // Uniform set (top + bottom). The active piece lives in cfg + canvas; the other piece is a serialized snapshot.
  const [uset, setUset] = useState(() => {
    try { return normalizeSet(JSON.parse(sessionStorage.getItem('studio_config') || 'null')?.uniformSet); } catch { return null; }
  });

  const [selObj,     setSelObj]     = useState(null);
  const [activeZone, setActiveZone] = useState('body');

  // Mirrors the phone/tablet breakpoint in DesignStudioStyles.jsx (native matchMedia, no new dependency).
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const [aiPulse,    setAiPulse]    = useState(false);     // teal pulse overlay on AI gen
  const [saved,      setSaved]      = useState(false);
  const [showInspo,  setShowInspo]  = useState(false); // inspiration gallery overlay
  const [showShowcase, setShowShowcase] = useState(false); // cross-client showcase overlay
  // Inspo and Showcase are anchored at the same spot; with both open they stacked on top of
  // each other and clipped (seen in screenshots). Opening one now closes the other.
  const toggleInspo = useCallback((v) => {
    setShowInspo(prev => { const next = typeof v === 'function' ? v(prev) : v; if (next) setShowShowcase(false); return next; });
  }, []);
  const toggleShowcase = useCallback((v) => {
    setShowShowcase(prev => { const next = typeof v === 'function' ? v(prev) : v; if (next) setShowInspo(false); return next; });
  }, []);
  useEffect(() => {
    if (!showInspo && !showShowcase) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setShowInspo(false); setShowShowcase(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showInspo, showShowcase]);
  const [draftSaved, setDraftSaved] = useState(false); // "Draft saved to cloud" feedback
  const [draftRestored, setDraftRestored] = useState(false); // banner on restore
  // Transient success toast driven by the REAL save flags (local write first, then cloud draft).
  const [toast, setToast] = useState(null);
  const [toastErr, setToastErr] = useState(false);
  const flashError = useCallback((msg) => {
    setToastErr(true); setToast(msg);
    setTimeout(() => { setToast(null); setToastErr(false); }, 4000);
  }, []);
  const savedPrev = useRef({ saved: false, draftSaved: false });
  useEffect(() => {
    const prev = savedPrev.current;
    let msg = null;
    if (draftSaved && !prev.draftSaved) msg = 'Design saved to your account';
    else if (saved && !prev.saved) msg = 'Design saved on this device';
    savedPrev.current = { saved, draftSaved };
    if (!msg) return undefined;
    setToast(msg);
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [saved, draftSaved]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [ordering, setOrdering] = useState(false); // optimistic "Order This" in-flight state
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
  const { addLogo, addText, addShape, updateSelected, deleteSelected, duplicateSelected, alignSelected, nudgeSelected, exportOverlays, exportPNG, exportFace, getCanvasJSON, loadCanvasJSON,
          pushHistory, undo, redo, canUndo, canRedo, resizeCanvas, initFailed,
          layers, selectLayer, toggleLayerVisibility, toggleLayerLock, toggleSelectedLock, setLayerOpacity, renameLayer, deleteLayer, reorderLayers,
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
      // zone click → open Colors tab. setSheetOpen was missing here — on desktop the left
      // panel is always visible so the tab switch alone was enough to look like it worked,
      // but on tablet/mobile that panel is a bottom sheet gated by sheetOpen, so tapping a
      // garment zone silently did nothing visible until the customer separately opened it.
      (zone) => { setActiveZone(zone); setTool('color'); setSheetOpen(true); },
      cfg.fit
    );

  // Picking a placed item swaps the inspector to its controls at every width. On phones the
  // sheet only opens when nothing else is open, and closes again once the item is deselected.
  const priorTool = useRef('type');
  const sheetOpenedBySel = useRef(false);
  useEffect(() => {
    if (isEditableSelection(selObj)) {
      if (tool === 'selected' || tool === 'draw' || (isNarrow && sheetOpen)) return;
      priorTool.current = tool;
      setTool('selected');
      if (isNarrow) { sheetOpenedBySel.current = true; setSheetOpen(true); }
    } else if (tool === 'selected') {
      setTool(priorTool.current);
      if (sheetOpenedBySel.current) { sheetOpenedBySel.current = false; setSheetOpen(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selObj, isNarrow]);

  useEffect(() => {
    if (viewMode === '3d' && familyFor(cfg.garment)?.status3D === 'none') setViewMode('2d');
  }, [cfg.garment, viewMode]);
  // Picking a garment whose 3D is only approximate always lands on the reliable 2D view; the customer can opt into 3D.
  const keep3DRef = useRef(false); // set by the gallery's "Open with 3D preview" so the 2D landing rule below skips that one load
  useEffect(() => {
    const keep = keep3DRef.current; keep3DRef.current = false;
    if (!keep && familyFor(cfg.garment)?.status3D === 'partial') setViewMode('2d');
  }, [cfg.garment]);
  useEffect(() => { keep3DRef.current = false; }, [viewMode]);

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
  // Delete/Backspace, Ctrl+D and arrow nudges act on the canvas selection only: never while typing in a field or editing text on the canvas.
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      const t = e.target;
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? '')) return;
      if (!selObj || selObj.__garmentBase || selObj.isEditing) return;
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) { e.preventDefault(); nudgeSelected(...d); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selObj, duplicateSelected, deleteSelected, nudgeSelected]);

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
    // Photo-based garments have no rear photo: the export is front-only instead of a duplicated or invented back.
    const backUrl  = hasBackView(cfg.garment, cfg.sleeve, cfg.fit) ? await capture('back') : null;
    if (activeFace !== originalFace) await capture(originalFace);

    return compositeFrontBack(frontUrl, backUrl);
  }, [face, getCanvasJSON, loadCanvasJSON, exportPNG, cfg.garment, cfg.sleeve, cfg.fit]);

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

  // ── Restore canvas overlays when sessionStorage already has a config ─────
  // BUG FIX (this session): INIT_CFG (dsShared.js) restores cfg fields
  // (garment/colors/fit/sleeve/patterns) from sessionStorage's studio_config
  // via deserializeDesign — but that's only a useState lazy initializer, it
  // never touches the canvas. The DB-draft path (restoreDraft, above) DOES
  // reload frontOverlays/backOverlays onto the canvas, but pendingDraft is
  // explicitly skipped whenever sessionStorage already has a config (the
  // `if (sessionStorage.getItem('studio_config')) return;` guard right
  // above), so that path never ran for a sessionStorage-based restore.
  // Concrete repro this was verified against: MyDesigns' "Continue editing"
  // (line ~125 in MyDesigns.jsx), "Order again", "Order this design", and
  // OrderWizard's "Edit design" button (a full page reload to
  // /design-studio, OrderWizard.jsx lines ~185/261) all leave studio_config
  // sitting in sessionStorage — garment/colors came back correctly, but
  // every logo, text box, or drawing the customer had placed silently
  // vanished, even though the data was right there in sessionStorage the
  // whole time. Same 350ms delay as restoreDraft — the canvas needs a beat
  // to finish its own useLayoutEffect init (see useGarmentCanvas.js) before
  // loadCanvasJSON has anything to load onto.
  useEffect(() => {
    let raw = null;
    try { raw = sessionStorage.getItem('studio_config'); } catch { /* private mode */ }
    if (!raw) return;
    const { frontOverlays, backOverlays } = deserializeDesign(raw);
    faceJSON.current = { front: frontOverlays, back: backOverlays };
    const toLoad = faceJSON.current[face] ?? [];
    if (toLoad.length > 0) setTimeout(() => loadCanvasJSON(toLoad), 350);
    // Mount-once: this restores whatever sessionStorage held at the moment
    // Design Studio opened, not a live sync — re-running on `face` or
    // `loadCanvasJSON` identity changes would re-fire this on every face
    // switch and stomp whatever the customer is actively drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setUset(normalizeSet(pendingDraft.studio_config?.uniformSet));
    faceJSON.current = { front: frontOverlays, back: backOverlays };
    const toLoad = faceJSON.current[face] ?? [];
    if (toLoad.length > 0) setTimeout(() => loadCanvasJSON(toLoad), 350);
    setPendingDraft(null);
    setDraftRestored(true);
    setTimeout(() => setDraftRestored(false), 4000);
  }, [pendingDraft, loadCanvasJSON, face]);

  const dismissDraft = useCallback(() => setPendingDraft(null), []);

  // Flush the live canvas for whichever face is on-screen right now into
  // faceJSON.current, then hand both faces to the one canonical serializer.
  // REGRESSION FIX: autosave, saveDesign and orderThis each used to build
  // their own inline studio_config object. Autosave and saveDesign only ever
  // called exportOverlays() (the CURRENTLY VISIBLE face) into a single
  // `overlays` field — draw on the back, then autosave fires (or the user
  // clicks Save) while still viewing the back, and the front face's content
  // was silently dropped from the save. orderThis was the only one of the
  // three that captured both faces, and even it duplicated the snapshot
  // shape designSerialization.js already exists to own (and had its own
  // fixed-later pocketType bug that the other two didn't get). One call site
  // now; every field this session's canonical DesignState is responsible for
  // goes through it, and no save can lose the face you're not looking at.
  const pieceSnapshot = useCallback((previewPng) => {
    faceJSON.current[face] = getCanvasJSON() ?? [];
    return serializeDesign(cfg, {
      overlays:      faceJSON.current.front,
      frontOverlays: faceJSON.current.front,
      backOverlays:  faceJSON.current.back,
    }, previewPng);
  }, [cfg, face, getCanvasJSON]);
  const snapshotDesign = useCallback((previewPng) => withSet(pieceSnapshot(previewPng), uset), [pieceSnapshot, uset]);

  // Put a piece (serialized snapshot, or a fresh default garment for that role) on the canvas, front view.
  const loadPiece = useCallback((snap, role) => {
    const { cfg: c, frontOverlays, backOverlays } = deserializeDesign(snap ?? { garment: DEFAULT_PIECE[role], category: cfg.category });
    setCfg(p => ({ ...p, ...c, inspirationId: c.inspirationId ?? null }));
    faceJSON.current = { front: frontOverlays, back: backOverlays };
    if (face !== 'front') setFace('front');
    setTimeout(() => loadCanvasJSON(faceJSON.current.front ?? []), 350);
  }, [cfg.category, face, loadCanvasJSON]);

  const startSet = useCallback(() => {
    const role = pieceOf(cfg.garment);
    if (!role || uset) return;
    const other = otherRole(role);
    setUset({ id: crypto.randomUUID(), active: other, pieces: { [role]: pieceSnapshot(), [other]: null } });
    loadPiece(null, other);
  }, [cfg.garment, uset, pieceSnapshot, loadPiece]);

  const switchPiece = useCallback((role) => {
    if (!uset || role === uset.active) return;
    const target = uset.pieces[role];
    setUset({ ...uset, active: role, pieces: { ...uset.pieces, [uset.active]: pieceOf(cfg.garment) === uset.active ? pieceSnapshot() : uset.pieces[uset.active] } });
    loadPiece(target, role);
  }, [uset, cfg.garment, pieceSnapshot, loadPiece]);

  // Keeps the piece on screen as a single design; the other piece is discarded.
  const leaveSet = useCallback(() => setUset(null), []);

  const pieceBar = !cfg.garment ? null : uset ? (
    <div className="ds-set-bar" role="group" aria-label="Uniform set pieces">
      {SET_ROLES.map(r => (
        <button key={r} type="button" aria-pressed={uset.active === r} onClick={() => switchPiece(r)}>
          <span>{ROLE_LABEL[r]}</span><strong>{r === uset.active ? cfg.garment : uset.pieces[r]?.garment ?? 'Choose'}</strong>
        </button>
      ))}
      <button type="button" className="ds-set-leave" aria-label="Leave uniform set" title="Keep only this piece" onClick={leaveSet}>×</button>
    </div>
  ) : pieceOf(cfg.garment) ? (
    <button type="button" className="ds-set-add" onClick={startSet}>
      + {otherRole(pieceOf(cfg.garment)) === 'bottom' ? 'Add a bottom' : 'Add a top'} to make a uniform set
    </button>
  ) : null;

  // ── Auto-save debounce — fires 30s after last cfg change ─────────────────
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    if (!cfg.garment) return; // nothing to persist yet
    autoSaveTimer.current = setTimeout(() => {
      axios.post('/api/customer/drafts', {
        studio_config: snapshotDesign(),
        label: `${cfg.garment} — ${cfg.category}`,
      }).catch(() => {}); // silently ignore network errors
    }, 30_000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [cfg, snapshotDesign]);

  // ── Manual save: sessionStorage + DB ─────────────────────────────────────
  const saveDesign = useCallback(async () => {
    if (!cfg.garment || saving) return;
    setSaving(true); setSaveErr(false);
    const snap = snapshotDesign();
    let local = false;
    try {
      sessionStorage.setItem('studio_config', JSON.stringify(snap));
      local = true;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* quota: large logos; the cloud draft below still runs */ }
    try {
      await axios.post('/api/customer/drafts', {
        studio_config:   snap,
        preview_dataurl: exportPNG(),
        label:           `${cfg.garment} — ${cfg.category}`,
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch {
      if (!local) { setSaveErr(true); flashError('Could not save your design. Check your connection and try again.'); }
    } finally { setSaving(false); }
  }, [cfg, saving, snapshotDesign, exportPNG, flashError]);

  // Order This → pass design to OrderWizard
  // Export files: each face is rendered at EXPORT_FACE_HEIGHT after it has fully drawn (exportFace), then the
  // live canvas returns to the face the customer was on. Photo bases have no back, so they export front only.
  const [exporting, setExporting] = useState(null);
  const captureExportFaces = useCallback(async () => {
    const originalFace = face;
    let activeFace = originalFace;
    faceJSON.current[activeFace] = getCanvasJSON() ?? [];
    const capture = async (target) => {
      if (target !== activeFace) {
        faceJSON.current[activeFace] = getCanvasJSON() ?? [];
        setFace(target);
        await new Promise(r => setTimeout(r, 150));
        const want = faceJSON.current[target] ?? [];
        loadCanvasJSON(want);
        for (let i = 0; i < 40 && (getCanvasJSON() ?? []).length !== want.length; i++) await new Promise(r => setTimeout(r, 50));
        activeFace = target;
      }
      return exportFace(target, EXPORT_FACE_HEIGHT);
    };
    const faces = [{ label: 'Front', url: await capture('front') }];
    if (hasBackView(cfg.garment, cfg.sleeve, cfg.fit)) faces.push({ label: 'Back', url: await capture('back') });
    if (activeFace !== originalFace) {
      faceJSON.current[activeFace] = getCanvasJSON() ?? [];
      setFace(originalFace);
      await new Promise(r => setTimeout(r, 150));
      loadCanvasJSON(faceJSON.current[originalFace] ?? []);
    }
    return faces.every(f => f.url) ? faces : null;
  }, [face, getCanvasJSON, loadCanvasJSON, exportFace, cfg.garment, cfg.sleeve, cfg.fit]);

  const exportName = ext => `vfrb-${(cfg.name?.trim() || cfg.garment || 'design').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toLocaleDateString('en-CA')}.${ext}`; // local YYYY-MM-DD

  const downloadImage = useCallback(async () => {
    if (!cfg.garment || exporting) return;
    setExporting('png');
    try {
      const faces = await captureExportFaces();
      if (!faces) throw new Error('render');
      downloadBlobOrUrl(await designPng(faces), exportName('png'));
    } catch { flashError('Could not export the image. Please try again.'); }
    finally { setExporting(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureExportFaces, cfg, exporting, flashError]);

  const downloadPdf = useCallback(async () => {
    if (!cfg.garment || exporting) return;
    setExporting('pdf');
    try {
      const faces = await captureExportFaces();
      if (!faces) throw new Error('render');
      // Same zone list the dock shows: tipping only when the customer actually coloured it.
      const zones = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => z !== 'tipping' || cfg.colors.tipping);
      const photo = GALLERY.find(d => d.id === cfg.inspirationId);
      const counts = { front: (faceJSON.current.front ?? []).length, back: (faceJSON.current.back ?? []).length };
      const rows = [
        ['Garment', [cfg.garment, cfg.sleeve && `${cfg.sleeve} sleeve`, cfg.fit && cfg.fit !== 'unisex' ? cfg.fit : null].filter(Boolean).join(', ')],
        ['Category', cfg.category],
        ['Colours', zones.map(z => `${z}: ${cfg.colors[z] ?? '-'}`).join('  ')],
        ['Patterns', Object.entries(cfg.patterns ?? {}).filter(([, p]) => p && p !== 'solid').map(([z, p]) => `${z}: ${p}`).join('  ') || 'Solid'],
        ['Placed items', `Front ${counts.front}${faces.length > 1 ? `, back ${counts.back}` : ''}`],
        ['Views', faces.map(f => f.label).join(', ') + (faces.length === 1 ? ' (no back view for this garment)' : '')],
        ['Template', templateIdFor(cfg.garment, cfg.sleeve, cfg.fit) ?? 'Vector template'],
        ...(photo ? [['Inspired by', photo.name]] : []),
      ];
      const pdf = await designPdf(faces, { name: cfg.name?.trim(), garment: cfg.garment, date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }), rows });
      downloadBlobOrUrl(pdf, exportName('pdf'));
    } catch { flashError('Could not export the PDF. Please try again.'); }
    finally { setExporting(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureExportFaces, cfg, exporting, flashError]);

  const orderThis = useCallback(async () => {
    if (!cfg.garment || ordering) return;
    setOrdering(true); // instant feedback — see the state declaration above
    try {
      // exportFrontBack() captures both faces' PNGs and, as a side effect, leaves
      // faceJSON.current populated for both (then restores the live canvas to the
      // face the customer was on) — snapshotDesign's flush of the *current* face
      // below is then a no-op for whichever face was just captured, and picks up
      // the other one exactly as exportFrontBack left it.
      const previewPng = await exportFrontBack();
      const snap = snapshotDesign(previewPng);
      if (!stashStudioConfig(snap).ok) throw new Error('storage');
      // Clear DB draft — design is now an order, draft is no longer needed
      axios.delete('/api/customer/drafts/latest').catch(() => {});
      nav('/order/create');
    } catch {
      // Export failed (e.g. canvas mid-init) — un-stick the button so the
      // customer can retry instead of it staying disabled forever.
      setOrdering(false);
      flashError('Could not prepare your design for ordering. Try removing very large logos, then retry.');
    }
  }, [cfg, ordering, snapshotDesign, exportFrontBack, nav, flashError]);

  const clearGarment = useCallback(() => setCfg(p => ({ ...p, garment: null })), []);

  // Optimistic UI for "Order This": exportFrontBack() below can take ~0.5-1s
  // (per-face canvas swap + capture, see its own comments), during which the
  // button previously gave zero feedback — a customer's second click while it
  // was still working would fire a second export+nav. `ordering` flips true
  // on the same tick as the click, before any await, so the button reflects
  // "in progress" immediately rather than waiting on the async work to resolve.

  const catData   = useMemo(() => CATS.find(c=>c.id===cfg.category) ?? CATS[0], [cfg.category]);
  const zone = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).includes(activeZone) ? activeZone : 'body';

  return (
    <>
      <DesignStudioStyles/>

      <div className="ds" data-sheet={sheetOpen ? 'open' : 'closed'} style={{ position:'relative' }}>

        {/* ── TOP BAR ── */}
        <TopBar nav={nav} cfg={cfg} setCfg={setCfg} catData={catData} undo={undo} redo={redo}
          canUndo={canUndo} canRedo={canRedo}
          viewMode={viewMode} setViewMode={setViewMode} setHas3DLoaded={setHas3DLoaded}
          selObj={selObj} deleteSelected={deleteSelected}
          showInspo={showInspo} setShowInspo={toggleInspo}
          showShowcase={showShowcase} setShowShowcase={toggleShowcase}
          saved={saved} draftSaved={draftSaved} saveDesign={saveDesign}
          orderThis={orderThis} ordering={ordering}/>

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
          <AnimatePresence>
            {toast && (
              <motion.div key="toast" className="ds-toast" role="status"
                initial={{ opacity:0, y:12, scale:.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:8 }}
                transition={{ duration:.2 }}>
                <NavIcon name={toastErr ? 'warning' : 'success'} size={16}/> {toast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── TOOL STRIP + PANEL DRAWER ── */}
          <ToolDrawer tool={tool} setTool={setTool} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen}
            summary={{ cfg, face, saved, saving, saveErr, draftSaved, saveDesign, orderThis, ordering, onOpenTool: (id) => { setTool(id); setSheetOpen(true); }, downloadImage, downloadPdf, exporting, clearGarment }} cfg={cfg} setCfg={setCfg}
            activeZone={zone} setActiveZone={setActiveZone}
            addText={addText} addShape={addShape} updateSelected={updateSelected}
            assetsTab={assetsTab} setAssetsTab={setAssetsTab} logoUpload={logoUpload}
            setShowInspo={toggleInspo} setShowShowcase={toggleShowcase}
            brushSize={brushSize} brushColor={brushColor}
            changeBrushSize={changeBrushSize} changeBrushColor={changeBrushColor}
            applyAI={applyAI} layers={layers} selObj={selObj} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} alignSelected={alignSelected}
            selectLayer={selectLayer} toggleLayerVisibility={toggleLayerVisibility}
            toggleLayerLock={toggleLayerLock} toggleSelectedLock={toggleSelectedLock} setLayerOpacity={setLayerOpacity}
            pushHistory={pushHistory} viewMode={viewMode} setViewMode={setViewMode} setHas3DLoaded={setHas3DLoaded}
            renameLayer={renameLayer} deleteLayer={deleteLayer} reorderLayers={reorderLayers} pieceRole={uset?.active ?? null}/>

          {/* ── CANVAS AREA ── */}
          <CanvasViewport cfg={cfg} setCfg={setCfg} canvasWrapRef={canvasWrapRef} canvasEl={canvasEl} initFailed={initFailed}
            aiPulse={aiPulse} face={face} switchFace={switchFace}
            selObj={selObj} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected}
            viewMode={viewMode} has3DLoaded={has3DLoaded} onLogoFile={onLogoFile}
            zoom={zoom} setZoom={setZoom} snapshot={snapshot} overlays={overlays}
            onChooseGarment={() => { setTool('type'); setSheetOpen(true); }} pickerOpen={tool === 'type' && (!isNarrow || sheetOpen)} setViewMode={setViewMode}
            pieceBar={pieceBar}/>
        </div>

        {/* ── FIRST-VISIT ONBOARDING OVERLAY ── */}
        <OnboardingOverlay showOnboarding={showOnboarding} onboardStep={onboardStep}
          nextOnboardStep={nextOnboardStep} dismissOnboarding={dismissOnboarding}/>

        {/* Click-away scrim behind whichever gallery is open (z-index sits under the galleries' 100). */}
        {(showInspo || showShowcase) && (
          <div aria-hidden="true" onClick={() => { setShowInspo(false); setShowShowcase(false); }}
            style={{ position:'absolute', inset:0, zIndex:90, background:'rgba(15,23,42,.18)' }}/>
        )}

        {/* ── INSPIRATION GALLERY OVERLAY ── */}
        <InspoGallery showInspo={showInspo} setShowInspo={toggleInspo} setCfg={setCfg}
          loadCanvasJSON={loadCanvasJSON} onOpen3D={() => { keep3DRef.current = true; setHas3DLoaded(true); setViewMode('3d'); }}/>

        {/* ── SHOWCASE GALLERY OVERLAY ── */}
        <ShowcaseGallery showShowcase={showShowcase} setShowShowcase={toggleShowcase} setCfg={setCfg}
          loadCanvasJSON={loadCanvasJSON}/>

      </div>
    </>
  );
}