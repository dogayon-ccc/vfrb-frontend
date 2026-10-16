// src/pages/client/DesignStudio.jsx
// TASK C-1 — Design Studio v2 full rewrite
// Spec: PUBG/Barbie/Nike By You game-app feel
// BUG 2 FIXED: canvasEl ref object passed to hook (not .current)
// BUG: Google Fonts CDN removed (offline environment)
// New in v2: Pattern tab, sleeve selector, 18 PH swatches,
//            zone hover glow, garment card grid, logo placement presets,
//            font selector, Pollinations.ai texture, Save Design

import { stashStudioConfig, draftFingerprint } from '../../utils/studioHandoff';
import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import DesignStudioStyles from './design-studio/DesignStudioStyles';
import { useGarmentCanvas, compositeFrontBack } from './design-studio/useGarmentCanvas';
import { hasBackView, templateIdFor, assetFor } from './design-studio/garmentAssets';
import { getGarmentPaths, setCustomSpec } from './design-studio/garmentPaths';
import { EXPORT_FACE_HEIGHT, designPng, designPdf, downloadBlobOrUrl, fitDraftPreview } from './design-studio/designExport';
import { ENTRIES as GALLERY } from './design-studio/designGallery';
import CanvasViewport from './design-studio/CanvasViewport';
import TopBar from './design-studio/TopBar';
import ToolDrawer from './design-studio/ToolDrawer';
import { isEditableSelection } from './design-studio/RightInfoPanel';
import { useLogoUpload } from './design-studio/useLogoUpload';
import OnboardingOverlay from './design-studio/OnboardingOverlay';
import InspoGallery from './design-studio/InspoGallery';
import ShowcaseGallery from './design-studio/ShowcaseGallery';
import { T2, INIT_CFG, FONTS, PATTERNS, zonesFor } from './design-studio/dsShared';
import { templateFacts, checkEdit, applyStateEdits } from './design-studio/designEdits';
import { describePatterns } from './design-studio/wovenPatterns';
import { deserializeDesign, serializeDesign, draftLabel } from './design-studio/designSerialization';
import { applyGarment, pieceOf } from './design-studio/garmentCatalog';
import { openTarget } from './design-studio/designGallery';
import { withPhotoColour } from './design-studio/photoColours';
import { landingViewFor } from './design-studio/studioView';
import DraftStrip from './design-studio/DraftStrip';
import GarmentPicker from './design-studio/GarmentPicker';
import { selectFamily } from './design-studio/selectGarment';
import { has3DFor } from './design-studio/garmentCapabilities';
import { describeDetails } from './design-studio/garmentDetails';
import { describePockets } from './design-studio/pocketTools';
import { describeCustom, isCustom, CUSTOM_TOP } from './design-studio/customGarment';
import { readTrace, writeTrace, normalizeTrace } from './design-studio/traceGuide';
import { DEFAULT_PIECE, otherRole, normalizeSet, withSet, mirrorStyle, mirrorOverlay } from './design-studio/uniformSet';
import PieceSelector from './design-studio/PieceSelector';

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
  const [sheetFull,  setSheetFull]  = useState(false); // phone sheet: peek (closed) / half (open) / full
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
  const [detailFocus, setDetailFocus] = useState(null); // the detail last tapped on the canvas, highlighted in the Details panel

  // Mirrors the phone/tablet (bottom sheet) breakpoint in DesignStudioStyles.jsx (native matchMedia, no new dependency).
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const [aiPulse,    setAiPulse]    = useState(false);     // teal pulse overlay on AI gen
  const [saved,      setSaved]      = useState(false);
  const [showInspo,  setShowInspo]  = useState(false); // inspiration gallery overlay
  const [showShowcase, setShowShowcase] = useState(false); // cross-client showcase overlay
  const [showcaseCount, setShowcaseCount] = useState(0);
  useEffect(() => { axios.get('/api/customer/designs/showcase').then(r => setShowcaseCount(Array.isArray(r.data) ? r.data.length : 0)).catch(() => setShowcaseCount(0)); }, []);
  // Inspo and Showcase are anchored at the same spot; with both open they stacked on top of
  // each other and clipped (seen in screenshots). Opening one now closes the other.
  const toggleInspo = useCallback((v) => {
    setShowInspo(prev => { const next = typeof v === 'function' ? v(prev) : v; if (next) setShowShowcase(false); return next; });
  }, []);
  // One picker, two doors: the Inspo button opens it on Inspiration, "Change garment" on Templates.
  const [pickerTab, setPickerTab] = useState('inspiration');
  const openInspo = useCallback((v) => { setPickerTab('inspiration'); toggleInspo(v); }, [toggleInspo]);
  const changeGarment = useCallback(() => { setPickerTab('templates'); toggleInspo(true); }, [toggleInspo]);
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
    // No toast for the browser copy alone: it is written before the account save, and a failed account save shows its own browser-only message.
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

  // A build-your-own garment's shape (cfg.custom) is registered before anything reads its paths this render.
  setCustomSpec(cfg.garment, cfg.custom);
  const customKey = cfg.custom ? JSON.stringify(cfg.custom) : '';

  // BUG 2 FIX: pass canvasEl (ref object), not canvasEl.current (null at render)
  const { onAdded, addLogo, addText, addShape, addPocket, setPocketColor, mirrorSelected, updateSelected, arrangeLayer, deleteSelected, duplicateSelected, alignSelected, arrangeSelected, nudgeSelected, exportOverlays, exportPNG, exportFace, getCanvasJSON, loadCanvasJSON,
          pushHistory, undo, redo, canUndo, canRedo, resizeCanvas, initFailed,
          layers, selectLayer, toggleLayerVisibility, toggleLayerLock, toggleSelectedLock, setLayerOpacity, renameLayer, deleteLayer, reorderLayers,
          setDrawMode, setBrushStyle, setSnapOptions, garmentRect, clearSelection, presetPos, textItems, editText } =
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
      // A tapped pocket, button or closure detail ('detail:<part>') opens the Details panel on that part instead.
      (zone) => { if (zone.startsWith('detail:')) { setDetailFocus(zone.slice(7)); setTool('details'); } else { setActiveZone(zone); setTool('color'); } setSheetOpen(true); },
      cfg.fit,
      cfg.details,
      customKey
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
    if (viewMode === '3d' && !has3DFor(cfg)) setViewMode('2d');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- has3DFor reads exactly these fields
  }, [cfg.garment, cfg.sleeve, cfg.fit, cfg.inspirationId, viewMode]);
  // A garment lands in 2D unless its 3D is verified (studioView.js); the customer can opt into 3D.
  const keep3DRef = useRef(false); // set by the gallery's "Open with 3D preview" so this landing rule skips that one load
  useEffect(() => {
    const keep = keep3DRef.current; keep3DRef.current = false;
    if (!keep) setViewMode(v => landingViewFor(cfg, v));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- landing runs once per garment change
  }, [cfg.garment]);
  useEffect(() => { keep3DRef.current = false; }, [viewMode]);

  // Tracing guide (traceGuide.js): a DOM underlay for this tab only, never in the design, exports or the order.
  const [trace, setTraceState] = useState(readTrace);
  const setTrace = useCallback((v) => setTraceState(prev => { const next = normalizeTrace(typeof v === 'function' ? v(prev) : v); writeTrace(next); return next; }), []);
  // "Create a 2D garment from reference": the confirmed sketch opens as a build-your-own garment (colours and overlays are kept).
  const openSketch = useCallback((d) => setCfg(p => applyGarment(p, d.garment, { ...(d.sleeve ? { sleeve: d.sleeve } : {}), custom: d.custom })), []);
  const logoUpload = useLogoUpload(addLogo, { onTrace: setTrace, onSketch: openSketch });
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
  const [erasing, setErasing] = useState(false); // Draw tool: pen or eraser (the eraser cuts the customer's strokes and art only)

  // Enter/exit drawing mode as the user switches tabs — only 'draw' should
  // ever leave isDrawingMode:true on the canvas; every other tab needs
  // normal selection back (this is what makes clicking a garment zone,
  // dragging a logo, etc. keep working once the user leaves the Draw tab).
  useEffect(() => {
    setDrawMode(tool === 'draw', brushSize, brushColor, erasing);
    // Only re-run on tab change — brushSize/brushColor changes while
    // already drawing are pushed live via setBrushStyle below instead of
    // re-toggling isDrawingMode (which would interrupt an in-progress
    // decision, and unnecessarily re-runs discardActiveObject()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, erasing]);

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
      // Ctrl+] / Ctrl+[ forward / backward, with Shift to the front / back; Ctrl+Shift+L lock; Ctrl+Shift+H hide.
      const z = { BracketRight: e.shiftKey ? 'front' : 'forward', BracketLeft: e.shiftKey ? 'back' : 'backward' }[e.code];
      if (mod && z) { e.preventDefault(); arrangeLayer(z); return; }
      if (mod && e.shiftKey && e.code === 'KeyL') { e.preventDefault(); toggleSelectedLock(); return; }
      if (mod && e.shiftKey && e.code === 'KeyH' && selObj.__layerId) { e.preventDefault(); toggleLayerVisibility(selObj.__layerId); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) { e.preventDefault(); nudgeSelected(...d); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, selObj, duplicateSelected, deleteSelected, nudgeSelected, arrangeLayer, toggleSelectedLock, toggleLayerVisibility]);

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

  // AI design edits (B5). Every operation is re-checked against the template it lands on (the current one, or the template a
  // from-scratch brief maps to). Preview applies them to the one DesignState, so the 2D canvas and the 3D view show the same thing;
  // Undo restores the exact design and overlays from before; Keep makes the edit part of the design. One preview at a time.
  const [aiPreview, setAiPreview] = useState(null); // { cfg, canvas, result } while an AI edit is previewed
  const previewAI = useCallback(({ start = null, ops = [] }) => {
    if (aiPreview) return { applied: 0, skipped: [{ why: 'keep or undo the current preview first' }] };
    const base = start ?? cfg;
    const facts = templateFacts(base), ids = start ? [] : textItems().map(t => t.id);
    const ok = [], skipped = [];
    ops.forEach(op => { const why = checkEdit(op, facts, ids); (why ? skipped : ok).push(why ? { op, why } : op); });
    if (!ok.length && !start) return { applied: 0, skipped };
    const result = applyStateEdits(base, ok);
    setAiPreview({ cfg, canvas: getCanvasJSON(), result });
    setCfg(result);
    const font = FONTS.find(f => f.id === 'inter').css;
    const ink = parseInt((result.colors?.body ?? '#000000').slice(1), 16) > 0x7fffff ? '#111827' : '#FFFFFF'; // readable on the body colour
    const texts = () => ok.forEach(op => {
      if (op.op === 'add_text') addText(op.text, ink, font, 22, presetPos(op.placement, result.garment, result.sleeve));
      if (op.op === 'edit_text') editText(op.target, { text: op.text });
      if (op.op === 'move_text') editText(op.target, { presetId: op.placement });
    });
    if (start) setTimeout(texts, 250); else texts(); // a new template draws its base first
    setAiPulse(true); setTimeout(() => setAiPulse(false), 1200);
    return { applied: ok.length, skipped };
  }, [aiPreview, cfg, textItems, getCanvasJSON, addText, editText, presetPos]);
  const undoAI = useCallback(() => {
    if (!aiPreview) return;
    setCfg(aiPreview.cfg);
    loadCanvasJSON(aiPreview.canvas, { keepHistory: true });
    setTimeout(pushHistory, 300); // the restore is itself one undoable step
    setAiPreview(null);
  }, [aiPreview, loadCanvasJSON, pushHistory]);
  const keepAI = useCallback(() => setAiPreview(null), []);
  // Changes made by hand during a preview are lost on Undo; the panel says so.
  const aiEditedSince = !!aiPreview && cfg !== aiPreview.result;
  const viewAI3D = useCallback(() => { if (has3DFor(cfg)) { setHas3DLoaded(true); setViewMode('3d'); } }, [cfg]);

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
    setToast('Design restored from your last session');
    setTimeout(() => setToast(null), 3000);
  }, [pendingDraft, loadCanvasJSON, face]);

  const dismissDraft = useCallback(() => setPendingDraft(null), []);
  // The offer is only for a fresh, empty canvas: picking a garment or placing anything retires it.
  useEffect(() => { if (cfg.garment || layers.length) setPendingDraft(null); }, [cfg.garment, layers.length]);

  // First run: open a gallery photo exactly like the Inspo gallery does (same target rules), then show the garment's properties.
  // "Use as template": the photo's garment and fit in the photo's colour; a reference set also opens its bottom as the other set piece.
  const pickPhoto = useCallback((d, filters) => {
    const t = openTarget(d, filters);
    if (!t) return;
    setCfg(p => { const c = applyGarment(p, t.garment, { ...t, inspirationId: d.id }); return { ...c, colors: withPhotoColour(c.colors, d.id, 0) }; });
    if (d.pieces?.bottom && !uset && pieceOf(t.garment) === 'top') {
      const b = applyGarment(cfg, d.pieces.bottom, { category: t.category, inspirationId: d.id });
      const bottom = serializeDesign({ ...b, colors: withPhotoColour(b.colors, d.id, 1) }, { overlays: [], frontOverlays: [], backOverlays: [] });
      setUset({ id: crypto.randomUUID(), active: 'top', pieces: { top: null, bottom } });
    }
  }, [uset, cfg]);
  const prevGarment = useRef(cfg.garment);
  useEffect(() => {
    if (!prevGarment.current && cfg.garment && tool === 'type') setTool('color');
    prevGarment.current = cfg.garment;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.garment]);
  // "Upload my design": the file waits until a garment is chosen, then goes through the normal upload as artwork.
  const [pendingArt, setPendingArt] = useState(null);
  const [artScope, setArtScope] = useState(null); // what the uploaded photo shows: 'top' | 'bottom' | 'set' | null (not said)
  const startUpload = useCallback((file) => { logoUpload.setKind('artwork'); setArtScope(null); setPendingArt(file); }, [logoUpload]);
  // From the picker: make a sketch from the waiting photo. A custom top opens at once so the upload can run; the review starts on "Create a 2D garment".
  const sketchPending = useCallback(() => { logoUpload.preferUseAs('sketch'); setArtScope(null); openSketch({ garment: CUSTOM_TOP, sleeve: 'Short', custom: null }); }, [logoUpload, openSketch]);
  // A full-set photo: the picked piece becomes one half of a new set and the missing piece starts on its default garment.
  const artSetRef = useRef(null);
  artSetRef.current = () => {
    const role = pieceOf(cfg.garment);
    if (artScope !== 'set' || uset || !role) return;
    const other = otherRole(role);
    const o = applyGarment(cfg, DEFAULT_PIECE[other], { category: cfg.category });
    setUset({ id: crypto.randomUUID(), active: role, pieces: { [role]: null, [other]: serializeDesign(o, { overlays: [], frontOverlays: [], backOverlays: [] }) } });
  };
  // The file is cleared only when the timer fires: clearing it first re-ran this effect, whose cleanup cancelled the upload.
  const onLogoFileRef = useRef(onLogoFile);
  onLogoFileRef.current = onLogoFile;
  useEffect(() => {
    if (!cfg.garment || !pendingArt) return undefined;
    const t = setTimeout(() => { artSetRef.current(); setPendingArt(null); onLogoFileRef.current(pendingArt); }, 450); // after the garment base has drawn
    return () => clearTimeout(t);
  }, [cfg.garment, pendingArt]);

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
    // Already on the front: swap the overlays at once (the base redraw keeps them), so the previous piece's
    // text and logos never sit on the new garment. A face change still waits for the front to draw.
    const load = () => loadCanvasJSON(faceJSON.current.front ?? []);
    if (face !== 'front') { setFace('front'); setTimeout(load, 350); } else load();
  }, [cfg.category, face, loadCanvasJSON]);

  const startSet = useCallback(() => {
    const role = pieceOf(cfg.garment);
    if (!role || uset) return;
    const other = otherRole(role);
    setUset({ id: crypto.randomUUID(), active: other, pieces: { [role]: pieceSnapshot(), [other]: null } });
    loadPiece(null, other);
  }, [cfg.garment, uset, pieceSnapshot, loadPiece]);

  // "Pair with your top/bottom" (picker): the garment on the canvas becomes one piece of a new set and the picked family the other, in the
  // same colours. Nothing already designed is lost; the new piece opens on the canvas.
  const pairWith = useCallback((fam, category, pick = {}) => {
    const role = pieceOf(cfg.garment), other = role && otherRole(role);
    if (!role || uset || pieceOf(fam.id) !== other) return;
    const piece = applyGarment({ ...cfg, inspirationId: null, details: {} }, fam.id, { ...(category ? { category } : {}), ...pick });
    setUset({ id: crypto.randomUUID(), active: other, pieces: { [role]: pieceSnapshot(), [other]: null } });
    loadPiece(serializeDesign(piece, { overlays: [], frontOverlays: [], backOverlays: [] }), other);
  }, [cfg, uset, pieceSnapshot, loadPiece]);

  const switchPiece = useCallback((role) => {
    if (!uset || role === uset.active) return;
    const target = uset.pieces[role];
    setUset({ ...uset, active: role, pieces: { ...uset.pieces, [uset.active]: pieceOf(cfg.garment) === uset.active ? pieceSnapshot() : uset.pieces[uset.active] } });
    loadPiece(target, role);
  }, [uset, cfg.garment, pieceSnapshot, loadPiece]);

  // Keeps the piece on screen as a single design; the other piece is discarded.
  const leaveSet = useCallback(() => { setUset(null); setApplyBoth(false); }, []);

  // "Apply to: Both": colour and pattern edits, and each logo or text added, also go onto the other piece's saved snapshot.
  // The first change after a piece switch is that piece loading, not an edit, so it only arms the mirror.
  const [applyBoth, setApplyBoth] = useState(false);
  const mirrorKey = useRef(null);
  useEffect(() => {
    const key = `${uset?.id}|${uset?.active}|${cfg.garment}`;
    if (mirrorKey.current !== key) { mirrorKey.current = key; return; }
    if (!applyBoth || !uset) return;
    const other = otherRole(uset.active), snap = uset.pieces[other];
    if (!snap?.garment) return;
    const zones = zonesFor(snap.garment, snap.sleeve ?? null, snap.fit ?? null);
    setUset(u => (u ? { ...u, pieces: { ...u.pieces, [other]: mirrorStyle(snap, cfg, zones, !assetFor(snap.garment, snap.sleeve, 'front', snap.fit)) } } : u));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mirrors only the colour and pattern edits themselves
  }, [cfg.colors, cfg.patterns, cfg.patternParams]);
  onAdded.current = (obj, src) => {
    if (!applyBoth || !uset) return;
    const other = otherRole(uset.active), snap = uset.pieces[other];
    if (!snap?.garment) return;
    setUset(u => (u ? { ...u, pieces: { ...u.pieces, [other]: mirrorOverlay(u.pieces[other], obj, src, getGarmentPaths(snap.garment, snap.sleeve ?? 'Short', face), face) } } : u));
  };

  // Uniform set preview: the other piece. 2D always draws both on one scale; 3D only while both pieces have their own model for
  // their sleeve and fit (each renders its own GLB with its own colours; no fused set model and no substitute).
  const [showSet, setShowSet] = useState(false);
  const setCompanion = useMemo(() => {
    if (!uset || pieceOf(cfg.garment) !== uset.active) return null;
    const snap = uset.pieces[otherRole(uset.active)];
    if (!snap?.garment) return null;
    const { cfg: other, frontOverlays, backOverlays } = deserializeDesign(snap);
    // The other piece's own logos, text and drawings ride along so the 3D set shows them on that piece (where its model takes decals).
    return { cfg: other, overlays: { front: frontOverlays, back: backOverlays }, role: otherRole(uset.active), can3D: has3DFor(cfg) && has3DFor(other) };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- has3DFor reads exactly these fields
  }, [uset, cfg.garment, cfg.sleeve, cfg.fit, cfg.inspirationId]);

  const pieceBar = cfg.garment && (
    <PieceSelector cfg={cfg} uset={uset} onSwitch={switchPiece} onStart={startSet} onLeave={leaveSet} applyBoth={applyBoth} onApplyBoth={setApplyBoth}
      canSet={!!setCompanion} showSet={showSet}
      onShowSet={v => { if (v && viewMode === '3d' && setCompanion?.can3D) setHas3DLoaded(true); setShowSet(v); }}/>
  );

  // ── Account draft write — the one payload for manual Save, autosave and Order ──
  // POST /drafts replaces every column of the single row, so a request without preview_dataurl
  // erases the stored thumbnail: each write sends a preview of the design it saves.
  const lastSavedFp = useRef(null);
  const persistDraft = useCallback(async (snap) => {
    const { previewPng, ...studio_config } = snap; // eslint-disable-line no-unused-vars
    await axios.post('/api/customer/drafts', {
      studio_config,
      preview_dataurl: await fitDraftPreview(exportPNG()),
      label:           draftLabel(cfg),
    });
    lastSavedFp.current = draftFingerprint(studio_config);
  }, [cfg, exportPNG]);

  // ── Auto-save debounce — fires 30s after last cfg change ─────────────────
  // Skipped when the account already holds exactly this design (e.g. right after a manual Save).
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    if (!cfg.garment) return; // nothing to persist yet
    autoSaveTimer.current = setTimeout(() => {
      const snap = snapshotDesign();
      if (draftFingerprint(snap) === lastSavedFp.current) return;
      // A reload restores the browser copy before the account draft, so an existing copy must not stay older than the autosave.
      try { if (sessionStorage.getItem('studio_config')) sessionStorage.setItem('studio_config', JSON.stringify(snap)); } catch { /* quota: the account draft still saves */ }
      persistDraft(snap).catch(() => {}); // silently ignore network errors
    }, 30_000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [cfg, snapshotDesign, persistDraft]);

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
      await persistDraft(snap);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch {
      // The account copy is what My Designs and other devices read; a browser-only copy must not look like a full save.
      setSaveErr(local ? 'local' : 'none'); // 'local': the browser copy exists, only the account save failed
      flashError(local ? 'Saved in this browser only: your account could not store the design. Try Save again.' : 'Could not save your design. Check your connection and try again.');
    } finally { setSaving(false); }
  }, [cfg, saving, snapshotDesign, persistDraft, flashError]);

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
        loadCanvasJSON(want, { keepHistory: true });
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
      loadCanvasJSON(faceJSON.current[originalFace] ?? [], { keepHistory: true });
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
      const zones = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => (z !== 'tipping' || cfg.colors.tipping) && (z !== 'pocket' || cfg.details?.patchPocket?.show !== false));
      const photo = GALLERY.find(d => d.id === cfg.inspirationId);
      const counts = { front: (faceJSON.current.front ?? []).length, back: (faceJSON.current.back ?? []).length };
      const rows = [
        ['Garment', [cfg.garment, cfg.sleeve && `${cfg.sleeve} sleeve`, cfg.fit && cfg.fit !== 'unisex' ? cfg.fit : null].filter(Boolean).join(', ')],
        ['Category', cfg.category],
        ['Colours', zones.map(z => `${z}: ${cfg.colors[z] ?? '-'}`).join('  ')],
        ['Patterns', describePatterns(cfg.patterns, cfg.patternParams, cfg.colors, id => PATTERNS.find(p => p.id === id)?.label ?? id).join('  ') || 'Solid'],
        ...(isCustom(cfg.garment) ? [['Custom sketch', describeCustom(cfg.garment, cfg.custom).join('  ')]] : []),
        ['Details', describeDetails(cfg.details).join('  ') || 'As the template'],
        ...(describePockets(faceJSON.current).length ? [['Added pockets (2D)', describePockets(faceJSON.current).join('  ')]] : []),
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
      // Keep the account draft until the order is actually placed: store exactly this design, so leaving or
      // failing in the Wizard still finds it in My Designs. OrderWizard retires it after a successful submit.
      await persistDraft(snap).catch(() => {}); // the browser handoff above already carries the design
      nav('/order/create');
    } catch {
      // Export failed (e.g. canvas mid-init) — un-stick the button so the
      // customer can retry instead of it staying disabled forever.
      setOrdering(false);
      flashError('Could not prepare your design for ordering. Try removing very large logos, then retry.');
    }
  }, [cfg, ordering, snapshotDesign, exportFrontBack, persistDraft, nav, flashError]);

  const clearGarment = useCallback(() => setCfg(p => ({ ...p, garment: null })), []);

  // Optimistic UI for "Order This": exportFrontBack() below can take ~0.5-1s
  // (per-face canvas swap + capture, see its own comments), during which the
  // button previously gave zero feedback — a customer's second click while it
  // was still working would fire a second export+nav. `ordering` flips true
  // on the same tick as the click, before any await, so the button reflects
  // "in progress" immediately rather than waiting on the async work to resolve.

  const zone = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).includes(activeZone) ? activeZone : 'body';

  return (
    <>
      <DesignStudioStyles/>

      <div className="ds" data-sheet={sheetOpen ? 'open' : 'closed'} data-snap={sheetOpen ? (sheetFull ? 'full' : 'half') : cfg.garment ? 'peek' : 'none'} data-first={!cfg.garment || undefined} style={{ position:'relative' }}>

        {/* ── TOP BAR ── */}
        <TopBar nav={nav} cfg={cfg} setCfg={setCfg} undo={undo} redo={redo}
          canUndo={canUndo} canRedo={canRedo}
          viewMode={viewMode} setViewMode={setViewMode} setHas3DLoaded={setHas3DLoaded}
          showShowcase={showShowcase} setShowShowcase={toggleShowcase} showcaseCount={showcaseCount}/>

        {/* ── DRAFT OFFER ── in the page flow under the bar, so it can never cover menus or stage controls */}
        {pendingDraft && !cfg.garment && layers.length === 0 && (
          <DraftStrip draft={pendingDraft} hasWork={!!cfg.name?.trim() || layers.length > 0} onRestore={restoreDraft} onDismiss={dismissDraft}/>
        )}

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
          <ToolDrawer tool={tool} setTool={setTool} sheetOpen={sheetOpen} setSheetOpen={setSheetOpen} sheetFull={sheetFull} setSheetFull={setSheetFull}
            summary={{ cfg, face, saved, saving, saveErr, draftSaved, saveDesign, orderThis, ordering, onOpenTool: (id) => { setTool(id); setSheetOpen(true); }, downloadImage, downloadPdf, exporting, clearGarment }} cfg={cfg} setCfg={setCfg}
            activeZone={zone} setActiveZone={setActiveZone} detailFocus={detailFocus}
            addText={addText} addShape={addShape} addPocket={addPocket} setPocketColor={setPocketColor} mirrorSelected={mirrorSelected} updateSelected={updateSelected} arrangeLayer={arrangeLayer}
            assetsTab={assetsTab} setAssetsTab={setAssetsTab} logoUpload={logoUpload}
            setShowInspo={openInspo} setShowShowcase={toggleShowcase} onChangeGarment={changeGarment}
            brushSize={brushSize} brushColor={brushColor} erasing={erasing} setErasing={setErasing} garmentRect={garmentRect}
            changeBrushSize={changeBrushSize} changeBrushColor={changeBrushColor}
            ai={{ preview: previewAI, undo: undoAI, keep: keepAI, previewing: !!aiPreview, editedSince: aiEditedSince, view3D: viewAI3D, has3D: has3DFor(cfg) }} textItems={textItems} layers={layers} selObj={selObj} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} alignSelected={alignSelected}
            selectLayer={selectLayer} toggleLayerVisibility={toggleLayerVisibility}
            toggleLayerLock={toggleLayerLock} toggleSelectedLock={toggleSelectedLock} setLayerOpacity={setLayerOpacity}
            pushHistory={pushHistory}
            renameLayer={renameLayer} deleteLayer={deleteLayer} reorderLayers={reorderLayers} pieceRole={uset?.active ?? null} trace={trace} setTrace={setTrace}/>

          {/* ── CANVAS AREA ── */}
          <CanvasViewport cfg={cfg} setCfg={setCfg} canvasWrapRef={canvasWrapRef} canvasEl={canvasEl} initFailed={initFailed}
            aiPulse={aiPulse} face={face} switchFace={switchFace}
            selObj={selObj} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} alignSelected={alignSelected} arrangeSelected={arrangeSelected} garmentRect={garmentRect}
            viewMode={viewMode} has3DLoaded={has3DLoaded} onLogoFile={onLogoFile}
            zoom={zoom} setZoom={setZoom} snapshot={snapshot} overlays={overlays}
            blank={<GarmentPicker inline cfg={cfg} pieceRole={uset?.active ?? (pendingArt && artScope ? (artScope === 'bottom' ? 'bottom' : 'top') : null)} onPickPhoto={pickPhoto}
              onPick3D={(d, f) => { keep3DRef.current = true; pickPhoto(d, f); setHas3DLoaded(true); setViewMode('3d'); }}
              onPickFamily={(fam, category, pick) => selectFamily(setCfg, fam, category, pick)}
              onUpload={startUpload} pendingArt={pendingArt} onCancelArt={() => setPendingArt(null)} onSketchArt={sketchPending}
              artScope={artScope} onArtScope={uset ? null : setArtScope}/>} setViewMode={setViewMode}
            pieceBar={pieceBar} setCompanion={setCompanion} showSet={showSet} setSnapOptions={setSnapOptions} trace={trace} clearSelection={clearSelection}/>
        </div>

        {/* ── FIRST-VISIT ONBOARDING OVERLAY ── */}
        <OnboardingOverlay showOnboarding={showOnboarding} onboardStep={onboardStep}
          nextOnboardStep={nextOnboardStep} dismissOnboarding={dismissOnboarding}/>

        {/* Click-away scrim behind whichever gallery is open (z-index sits under the galleries' 100). */}
        {(showInspo || showShowcase) && (
          <div aria-hidden="true" onClick={() => { setShowInspo(false); setShowShowcase(false); }}
            style={{ position:'absolute', inset:0, zIndex:'var(--cx-z-modal)', background:'var(--cx-scrim)' }}/>
        )}

        {/* ── GARMENT PICKER MODAL (Inspo / Change garment) ── */}
        <InspoGallery showInspo={showInspo} setShowInspo={toggleInspo} setCfg={setCfg} onPickPhoto={pickPhoto} onPairFamily={pairWith} tab={pickerTab} cfg={cfg} pieceRole={uset?.active ?? null}
          loadCanvasJSON={loadCanvasJSON} onOpen3D={() => { keep3DRef.current = true; setHas3DLoaded(true); setViewMode('3d'); }}/>

        {/* ── SHOWCASE GALLERY OVERLAY ── */}
        <ShowcaseGallery showShowcase={showShowcase} setShowShowcase={toggleShowcase} setCfg={setCfg}/>

      </div>
    </>
  );
}