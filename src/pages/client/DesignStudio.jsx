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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import axios from 'axios';
import { NavIcon } from '../../components/ui/icons';
import { ConfirmDialog } from '../../components/ui';
import { readStudioLock, setStudioLock } from '../../utils/studioLock';
import { duplicateDesign, reorderDesign, lockFor } from '../../utils/designActions';
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
import InspoGallery from './design-studio/InspoGallery';
import ShowcaseGallery from './design-studio/ShowcaseGallery';
import { T2, INIT_CFG, FONTS, PATTERNS, zonesFor, REF_PHOTO_TOOLS } from './design-studio/dsShared';
import { templateFacts, checkEdit, applyStateEdits } from './design-studio/designEdits';
import { describePatterns } from './design-studio/wovenPatterns';
import { deserializeDesign, serializeDesign, draftLabel } from './design-studio/designSerialization';
import { saveStatus } from './design-studio/saveStatus';
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
import { describeCustom, isCustom, isParametric, CUSTOM_TOP } from './design-studio/customGarment';
import { readTrace, writeTrace, normalizeTrace } from './design-studio/traceGuide';
import { DEFAULT_PIECE, otherRole, normalizeSet, withSet, mirrorStyle, mirrorOverlay, orderQueue } from './design-studio/uniformSet';
import PiecesRail, { PieceActions } from './design-studio/PiecesRail';

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
  // Saved-design lock (utils/studioLock.js): `final` = on a confirmed order, read-only until duplicated; `colorOnly` = a copy,
  // colours only; `warn` = the first edit asks for confirmation. `designId` = saves go to that design row.
  const [lock, setLock] = useState(readStudioLock);
  const [warnAsk, setWarnAsk] = useState(false);
  const locked = !!lock?.final;
  const colorOnly = !!lock?.colorOnly;
  const lockRef = useRef(lock);
  lockRef.current = lock;

  const [selObj,     setSelObj]     = useState(null);
  const [activeZone, setActiveZone] = useState('body');
  const [detailFocus, setDetailFocus] = useState(null); // the detail last tapped on the canvas, highlighted in the Details panel

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
  const reduceMotion = useReducedMotion();
  const [toastErr, setToastErr] = useState(false);
  // Every toast clears after 3 s; a newer toast restarts the timer.
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => { setToast(null); setToastErr(false); }, 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const flashError = useCallback((msg) => {
    setToastErr(true); setToast(msg);
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
    return undefined;
  }, [saved, draftSaved]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [ordering, setOrdering] = useState(false); // optimistic "Order This" in-flight state
  const autoSaveTimer = useRef(null);

  // First run: the empty canvas's picker (reference / scratch / upload) is the whole flow; there is no separate tour.

  // ── Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo ──────────
  // Canvas scaling (fit-to-pane × zoom) is owned solely by CanvasViewport — a second
  // writer on the same wrapper's style.transform made the zoom buttons fight it.

  // A build-your-own garment's shape (cfg.custom) is registered before anything reads its paths this render.
  setCustomSpec(cfg.garment, cfg.custom);
  const customKey = cfg.custom ? JSON.stringify(cfg.custom) : '';

  // BUG 2 FIX: pass canvasEl (ref object), not canvasEl.current (null at render)
  const { onAdded, addLogo, addText, addShape, addPocket, setPocketColor, mirrorSelected, updateSelected, arrangeLayer, deleteSelected, duplicateSelected, alignSelected, arrangeSelected, nudgeSelected, exportOverlays, exportPNG, exportFace, getCanvasJSON, loadCanvasJSON,
          pushHistory, markHistory, settleHistory, undo, redo, canUndo, canRedo, editTick, initFailed,
          layers, selectLayer, toggleLayerVisibility, toggleLayerLock, toggleSelectedLock, setLayerOpacity, renameLayer, deleteLayer, reorderLayers,
          setDrawMode, setBrushStyle, setSnapOptions, garmentRect, clearSelection, setOverlaysFrozen, presetPos, textItems, editText, showZoneOutline } =
    useGarmentCanvas(
      canvasEl,
      cfg.garment,
      cfg.sleeve,
      face,
      cfg.colors,
      cfg.patterns,
      cfg.patternParams,
      setSelObj,
      // A tapped zone opens Colours on it; a tapped pocket, button or closure detail ('detail:<part>') opens Details on that part.
      (zone) => { if (zone.startsWith('detail:')) { setDetailFocus(zone.slice(7)); setTool('details'); } else { setActiveZone(zone); setTool('color'); } },
      cfg.fit,
      cfg.details,
      customKey,
      // Undo/redo of a colour, pattern or detail step puts that look back on the same garment.
      (look) => setCfg(p => ({ ...p, colors: look.colors, patterns: look.patterns, patternParams: look.patternParams, details: look.details }))
    );

  const zone = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).includes(activeZone) ? activeZone : 'body';
  // While Colours is open the zone being coloured is outlined on the garment; redrawn after a base redraw (which clears it).
  const outlined = tool === 'color' ? zone : null;
  useEffect(() => {
    const t = setTimeout(() => showZoneOutline(outlined), 450);
    return () => clearTimeout(t);
  }, [outlined, showZoneOutline, cfg.garment, cfg.sleeve, cfg.fit, cfg.colors, cfg.details, customKey, face]);

  // Picking a placed item swaps the panel to its inspector at every width; deselecting returns to the previous tool.
  const priorTool = useRef('type');
  useEffect(() => {
    if (isEditableSelection(selObj)) {
      if (tool === 'selected' || tool === 'draw') return;
      priorTool.current = tool;
      setTool('selected');
    } else if (tool === 'selected') setTool(priorTool.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selObj]);

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
  const [trace, setTraceState] = useState(() => (REF_PHOTO_TOOLS ? readTrace() : null));
  const setTrace = useCallback((v) => setTraceState(prev => { const next = normalizeTrace(typeof v === 'function' ? v(prev) : v); writeTrace(next); return next; }), []);
  // "Create a 2D garment from reference": the confirmed sketch opens as a build-your-own garment (colours and overlays are kept).
  const openSketch = useCallback((d) => setCfg(p => applyGarment(p, d.garment, { ...(d.sleeve ? { sleeve: d.sleeve } : {}), custom: d.custom })), []);
  const logoUpload = useLogoUpload(addLogo, REF_PHOTO_TOOLS ? { onTrace: setTrace, onSketch: openSketch } : {});
  // A file dropped on the canvas goes through the same pipeline as the panel, and
  // the panel opens so the customer can see progress, errors and the result.
  const onLogoFile = useCallback((file) => {
    if (lockRef.current?.colorOnly) return; // a colour-only copy takes no new logos, including dropped files
    setTool('assets'); setAssetsTab('logo');
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

  // ── Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y redo ────────────────────────
  // MUST be after useGarmentCanvas destructuring — undo/redo are declared there.
  // Moving it before caused "Cannot access 'undo' before initialization" (TDZ crash).
  // Delete/Backspace, Ctrl+D and arrow nudges act on the canvas selection only: never while typing in a field or editing text on the canvas.
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (lockRef.current?.final) return;
      const t = e.target;
      // A text field (or Fabric's hidden textarea while editing canvas text) keeps its own Ctrl+Z; checkboxes and sliders do not.
      const typing = t?.isContentEditable || t?.tagName === 'TEXTAREA' || (t?.tagName === 'INPUT' && /^(text|search|email|number|tel|url|password)$/.test(t.type));
      if (typing) return;
      const field = t?.tagName === 'INPUT' || t?.tagName === 'SELECT';
      if (lockRef.current?.warn && mod && /^[zy]$/i.test(e.key)) { e.preventDefault(); setWarnAsk(true); return; }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (field || !selObj || selObj.__garmentBase || selObj.isEditing) return;
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
      loadCanvasJSON(faceJSON.current[newFace] ?? [], { side: { from: face, to: newFace } });
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
    setAiPreview({ cfg, canvas: getCanvasJSON(), result, mark: markHistory() });
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
  }, [aiPreview, cfg, textItems, getCanvasJSON, markHistory, addText, editText, presetPos]);
  const undoAI = useCallback(() => {
    if (!aiPreview) return;
    setCfg(aiPreview.cfg);
    loadCanvasJSON(aiPreview.canvas, { keepHistory: true });
    settleHistory(aiPreview.mark, false); // Cancel leaves no undo step behind
    setAiPreview(null);
  }, [aiPreview, loadCanvasJSON, settleHistory]);
  const keepAI = useCallback(() => { settleHistory(aiPreview?.mark, true); setAiPreview(null); }, [aiPreview, settleHistory]);
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
    accountCopy.current = true;
    setToast('Design restored from your last session');
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
    return { cfg: deserializeDesign(snap).cfg, role: otherRole(uset.active) };
  }, [uset, cfg.garment]);

  // Phones and tablets: More > View opens the stage's View menu.
  const [viewOpen, setViewOpen] = useState(false);

  const pieceProps = { cfg, uset, onSwitch: switchPiece, onStart: startSet, applyBoth, onApplyBoth: setApplyBoth,
    canSet: !!setCompanion, setView: viewMode !== '3d', showSet: showSet && viewMode !== '3d', onShowSet: setShowSet };

  // ── Account draft write — the one payload for manual Save, autosave and Order ──
  // POST /drafts replaces every column of the single row, so a request without preview_dataurl
  // erases the stored thumbnail: each write sends a preview of the design it saves.
  const lastSavedFp = useRef(null);
  const persistDraft = useCallback(async (snap) => {
    const { previewPng, ...studio_config } = snap; // eslint-disable-line no-unused-vars
    const own = lockRef.current?.designId;
    if (own && !lockRef.current.final) { // an opened saved design or copy saves to its own row; the account draft is left alone
      await axios.put(`/api/customer/designs/${own}`, { custom_builder_config: studio_config, design_name: studio_config.name?.trim()?.slice(0, 100) || undefined });
      lastSavedFp.current = draftFingerprint(studio_config);
      return;
    }
    await axios.post('/api/customer/drafts', {
      studio_config,
      preview_dataurl: await fitDraftPreview(exportPNG()),
      label:           draftLabel(cfg),
    });
    lastSavedFp.current = draftFingerprint(studio_config);
  }, [cfg, exportPNG]);

  // ── Auto-save debounce — fires 30s after the last design or overlay change ──
  // Skipped when the account already holds exactly this design (e.g. right after a manual Save). autoState feeds the save status.
  const [autoState, setAutoState] = useState(null);
  const baseFp = useRef(null); // the design as it opened, so merely opening one never reads "Unsaved"
  const accountCopy = useRef(false); // the design on the canvas came from the account (restored draft or saved design), so unchanged reads "Saved"
  const saveFns = useRef(null);
  saveFns.current = { snapshotDesign, persistDraft };
  useEffect(() => {
    clearTimeout(autoSaveTimer.current);
    if (!cfg.garment || locked) { baseFp.current = null; setAutoState(null); return undefined; } // a final design is never written back
    const dirtyCheck = setTimeout(() => {
      const fp = draftFingerprint(saveFns.current.snapshotDesign());
      if (baseFp.current === null && lastSavedFp.current === null) baseFp.current = fp;
      setAutoState(s => (s === 'saving' ? s : fp === (lastSavedFp.current ?? baseFp.current) ? (lastSavedFp.current || accountCopy.current || lockRef.current?.designId ? 'saved' : null) : 'dirty'));
    }, 400);
    autoSaveTimer.current = setTimeout(async () => {
      const { snapshotDesign: snapNow, persistDraft: persist } = saveFns.current;
      const snap = snapNow();
      if (draftFingerprint(snap) === (lastSavedFp.current ?? baseFp.current)) return;
      // A reload restores the browser copy before the account draft, so an existing copy must not stay older than the autosave.
      let local = false;
      try { if (sessionStorage.getItem('studio_config')) { sessionStorage.setItem('studio_config', JSON.stringify(snap)); setStudioLock(lockRef.current); local = true; } } catch { /* quota: the account draft still saves */ }
      setAutoState('saving');
      try { await persist(snap); setSaveErr(false); setAutoState('saved'); }
      catch { setSaveErr(local ? 'local' : 'none'); setAutoState('dirty'); } // shown as a retry state, never silently dropped
    }, 30_000);
    return () => { clearTimeout(dirtyCheck); clearTimeout(autoSaveTimer.current); };
  }, [cfg, locked, editTick]);
  const status = cfg.garment ? saveStatus({ saving, saveErr, auto: autoState, draftSaved, saved }) : null;

  // ── Manual save: sessionStorage + DB ─────────────────────────────────────
  const saveDesign = useCallback(async () => {
    if (!cfg.garment || saving || locked) return;
    setSaving(true); setSaveErr(false);
    const snap = snapshotDesign();
    let local = false;
    try {
      sessionStorage.setItem('studio_config', JSON.stringify(snap));
      setStudioLock(lockRef.current); // the lock is tied to the stored config, so it follows the save
      local = true;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* quota: large logos; the cloud draft below still runs */ }
    try {
      await persistDraft(snap);
      setAutoState('saved');
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch {
      // The account copy is what My Designs and other devices read; a browser-only copy must not look like a full save.
      setSaveErr(local ? 'local' : 'none'); // 'local': the browser copy exists, only the account save failed
      flashError(local ? 'Saved in this browser only: your account could not store the design. Try Save again.' : 'Could not save your design. Check your connection and try again.');
    } finally { setSaving(false); }
  }, [cfg, saving, locked, snapshotDesign, persistDraft, flashError]);

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
        ...(isParametric(cfg.garment) ? [[isCustom(cfg.garment) ? 'Custom sketch' : 'Measurements', describeCustom(cfg.garment, cfg.custom).join('  ')]] : []),
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
    if (!cfg.garment || ordering || locked) return;
    // VFRB accepts full sets only (one top + one bottom); the Garment panel holds "Add a matching …".
    if (!orderQueue(snapshotDesign())) {
      const role = pieceOf(cfg.garment);
      setTool('type');
      flashError(role ? `VFRB takes full sets only: add the matching ${otherRole(role)} first.` : 'VFRB takes full sets only: choose a top or a bottom to start a set.');
      return;
    }
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
  }, [cfg, ordering, locked, snapshotDesign, exportFrontBack, persistDraft, nav, flashError]);


  // "Duplicate to edit": the account gets a copy (POST /copy) and the Studio switches to it, colours only; the ordered design stays as it is.
  const [copying, setCopying] = useState(false);
  const duplicateToEdit = useCallback(async () => {
    const id = lockRef.current?.designId;
    if (!id || copying) { if (!id) flashError('Open this design from My Designs to duplicate it.'); return; }
    setCopying(true);
    try {
      const copy = await duplicateDesign({ id, config: snapshotDesign(), label: cfg.name });
      const next = lockFor(copy);
      try { sessionStorage.setItem('studio_config', JSON.stringify(copy.config)); } catch { /* quota: the copy is on the account */ }
      setLock(next); setStudioLock(next);
      setCfg(p => ({ ...p, name: copy.config?.name ?? p.name }));
      lastSavedFp.current = draftFingerprint(copy.config);
      setToast('Copy saved to My Designs. You can change its colours.');
    } catch { flashError('Could not make a copy. Check your connection and try again.'); }
    finally { setCopying(false); }
  }, [copying, cfg.name, snapshotDesign, flashError]);
  const reorderThis = useCallback(() => {
    if (!reorderDesign({ config: snapshotDesign() }, nav)) flashError('Could not start the order in this browser. Try again.');
  }, [snapshotDesign, nav, flashError]);
  useEffect(() => { setOverlaysFrozen(colorOnly); }, [colorOnly, setOverlaysFrozen]);
  const confirmEdit = useCallback(() => {
    const keep = lockRef.current?.designId ? { designId: lockRef.current.designId } : null;
    setLock(keep); setStudioLock(keep); setWarnAsk(false);
  }, []);
  // Saved from an order, not final: the first press, click or tap inside the editor asks before anything changes. View-only controls ([data-view-only]) pass.
  const gateEdit = lock?.warn ? (e) => { if (e.target.closest?.('[data-view-only]')) return; e.preventDefault(); e.stopPropagation(); if (e.type !== 'keydown' || e.key === 'Enter' || e.key === ' ') setWarnAsk(true); } : undefined;

  // Optimistic UI for "Order This": exportFrontBack() below can take ~0.5-1s
  // (per-face canvas swap + capture, see its own comments), during which the
  // button previously gave zero feedback — a customer's second click while it
  // was still working would fire a second export+nav. `ordering` flips true
  // on the same tick as the click, before any await, so the button reflects
  // "in progress" immediately rather than waiting on the async work to resolve.


  return (
    <>
      <DesignStudioStyles/>

      <div className="ds" data-locked={locked || undefined} data-first={!cfg.garment || undefined} style={{ position:'relative' }}>

        {/* ── TOP BAR ── */}
        <TopBar nav={nav} cfg={cfg} setCfg={locked ? () => {} : setCfg} undo={lock?.warn ? () => setWarnAsk(true) : undo} redo={lock?.warn ? () => setWarnAsk(true) : redo}
          canUndo={canUndo && !locked} canRedo={canRedo && !locked} status={locked ? null : status}
          viewMode={viewMode} setViewMode={setViewMode} setHas3DLoaded={setHas3DLoaded}
          showShowcase={showShowcase} setShowShowcase={toggleShowcase} showcaseCount={locked || colorOnly ? 0 : showcaseCount}
          saveDesign={saveDesign} saving={saving} saved={saved} draftSaved={draftSaved} orderThis={orderThis} ordering={ordering}
          downloadImage={downloadImage} downloadPdf={downloadPdf} exporting={exporting}
          lock={locked ? lock : null} onReorder={reorderThis} onDuplicate={duplicateToEdit} copying={copying}/>

        {/* ── DRAFT OFFER ── in the page flow under the bar, so it can never cover menus or stage controls */}
        {pendingDraft && !cfg.garment && layers.length === 0 && (
          <DraftStrip draft={pendingDraft} hasWork={!!cfg.name?.trim() || layers.length > 0} onRestore={restoreDraft} onDismiss={dismissDraft}/>
        )}

        {/* ── COLOUR-ONLY COPY ── */}
        {colorOnly && (
          <div role="status" style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', background:'var(--amber-50, #fffbeb)', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--ink)' }}>
            <NavIcon name="warning" size={15}/>
            <span><strong>Colour changes only on this copy.</strong> Garment, text, logos, shapes, drawing and AI are off. Saves go to the copy in My Designs.</span>
          </div>
        )}

        {/* ── BODY ── */}
        <div className="ds-body" inert={locked ? '' : undefined} aria-disabled={locked || undefined}
          onPointerDownCapture={gateEdit} onMouseDownCapture={gateEdit} onClickCapture={gateEdit} onKeyDownCapture={gateEdit}>
          <AnimatePresence>
            {toast && (
              <motion.div key="toast" className="ds-toast" role="status"
                initial={reduceMotion ? false : { opacity:0, y:12, scale:.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={reduceMotion ? { opacity:0 } : { opacity:0, y:8 }}
                transition={{ duration: reduceMotion ? 0 : .2 }}>
                <NavIcon name={toastErr ? 'warning' : 'success'} size={16}/> {toast}
              </motion.div>
            )}
          </AnimatePresence>

          <PiecesRail {...pieceProps} other={setCompanion} readOnly={colorOnly}/>

          {/* ── TOOL STRIP + PANEL DRAWER ── */}
          <ToolDrawer onlyTools={colorOnly ? ['color'] : null} tool={tool} setTool={setTool} onOpenTool={setTool} cfg={cfg} setCfg={setCfg}
            activeZone={zone} setActiveZone={setActiveZone} detailFocus={detailFocus}
            addText={addText} addShape={addShape} addPocket={addPocket} setPocketColor={setPocketColor} mirrorSelected={mirrorSelected} updateSelected={updateSelected} arrangeLayer={arrangeLayer}
            assetsTab={assetsTab} setAssetsTab={setAssetsTab} logoUpload={logoUpload}
            setShowInspo={openInspo} setShowShowcase={toggleShowcase} onChangeGarment={changeGarment}
            brushSize={brushSize} brushColor={brushColor} erasing={erasing} setErasing={setErasing} garmentRect={garmentRect}
            changeBrushSize={changeBrushSize} changeBrushColor={changeBrushColor}
            ai={{ preview: previewAI, undo: undoAI, keep: keepAI, previewing: !!aiPreview, editedSince: aiEditedSince, view3D: viewAI3D, has3D: has3DFor(cfg) }} textItems={textItems} layers={layers} selObj={selObj} alignSelected={alignSelected}
            selectLayer={selectLayer} toggleLayerVisibility={toggleLayerVisibility}
            toggleLayerLock={toggleLayerLock} toggleSelectedLock={toggleSelectedLock} setLayerOpacity={setLayerOpacity}
            pushHistory={pushHistory} presetPos={presetPos}
            renameLayer={renameLayer} deleteLayer={deleteLayer} reorderLayers={reorderLayers} pieceRole={uset?.active ?? null} trace={trace} setTrace={setTrace} status={locked ? null : status}
            garmentExtra={<PieceActions {...pieceProps} other={setCompanion} readOnly={colorOnly} inSheet/>}
            more={{ onView: () => setViewOpen(true), onCopy: duplicateToEdit, canCopy: !!lock?.designId, copying }}/>

          {/* ── CANVAS AREA ── */}
          <CanvasViewport cfg={cfg} setCfg={setCfg} canvasWrapRef={canvasWrapRef} canvasEl={canvasEl} initFailed={initFailed}
            aiPulse={aiPulse} face={face} switchFace={switchFace}
            selObj={selObj} deleteSelected={deleteSelected} duplicateSelected={duplicateSelected} alignSelected={alignSelected} arrangeSelected={arrangeSelected} garmentRect={garmentRect}
            viewMode={viewMode} has3DLoaded={has3DLoaded} onLogoFile={onLogoFile} onPickZone={setActiveZone}
            zoom={zoom} setZoom={setZoom} snapshot={snapshot} overlays={overlays}
            blank={<GarmentPicker inline cfg={cfg} pieceRole={uset?.active ?? (pendingArt && artScope ? (artScope === 'bottom' ? 'bottom' : 'top') : null)} onPickPhoto={pickPhoto}
              onPick3D={(d, f) => { keep3DRef.current = true; pickPhoto(d, f); setHas3DLoaded(true); setViewMode('3d'); }}
              onPickFamily={(fam, category, pick) => selectFamily(setCfg, fam, category, pick)}
              onUpload={startUpload} pendingArt={pendingArt} onCancelArt={() => setPendingArt(null)} onSketchArt={REF_PHOTO_TOOLS ? sketchPending : null}
              artScope={artScope} onArtScope={uset ? null : setArtScope}/>} setViewMode={setViewMode}
            viewOpen={viewOpen} setViewOpen={setViewOpen} setCompanion={setCompanion} showSet={showSet} setSnapOptions={setSnapOptions} trace={trace} clearSelection={clearSelection}/>
        </div>

        {/* Click-away scrim behind whichever gallery is open (z-index sits under the galleries' 100). */}
        {(showInspo || showShowcase) && (
          <div aria-hidden="true" onClick={() => { setShowInspo(false); setShowShowcase(false); }}
            style={{ position:'absolute', inset:0, zIndex:'var(--cx-z-modal)', background:'var(--cx-scrim)' }}/>
        )}

        {/* ── GARMENT PICKER MODAL (Inspo / Change garment) ── */}
        <InspoGallery showInspo={showInspo} setShowInspo={toggleInspo} setCfg={setCfg} onPickPhoto={pickPhoto} onPairFamily={pairWith} tab={pickerTab} cfg={cfg} pieceRole={uset?.active ?? null}
          loadCanvasJSON={loadCanvasJSON} onOpen3D={() => { keep3DRef.current = true; setHas3DLoaded(true); setViewMode('3d'); }}
          onLoadArchived={d => setLock(lockFor(d))}/>

        <ConfirmDialog open={warnAsk} title="Edit this saved design?"
          body="Changes replace your saved design when it saves. Continue to edit it?"
          confirmLabel="Edit design" onCancel={() => setWarnAsk(false)} onConfirm={confirmEdit}/>

        {/* ── SHOWCASE GALLERY OVERLAY ── */}
        <ShowcaseGallery showShowcase={showShowcase} setShowShowcase={toggleShowcase} setCfg={setCfg}/>

      </div>
    </>
  );
}