import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import LayersPanel from './LayersPanel';
import AssetsPanel from './AssetsPanel';
import PatternPanel from './PatternPanel';
import DrawPanel from './DrawPanel';
import TypePanel from './TypePanel';
import ColorsPanel from './ColorsPanel';
import TextPanel from './TextPanel';
import AIPanel from './AIPanel';
import StudioDock from './StudioDock';
import { SelectionInspector, isEditableSelection } from './RightInfoPanel';
import AIDesignChat from '../AIDesignChat';
import { TOOLS } from './dsShared';
import { assetFor } from './garmentAssets';

const noop = () => {};

// Panel/sheet: tool content, then the one Layers section, then the sticky dock. Phone sheet snaps to peek (dock only), half or full.
export default function ToolDrawer({ tool, setTool, sheetOpen, setSheetOpen, sheetFull, setSheetFull, summary, ...p }) {
  const [more, setMore] = useState(false);
  const hasSelection = isEditableSelection(p.selObj);
  // The Selection tile exists only while something is selected.
  const tools = TOOLS.filter(t => t.id !== 'selected' || hasSelection);
  const active = TOOLS.find(t => t.id === tool);
  const noGarment = !p.cfg.garment;
  const title = more ? 'More tools' : noGarment ? 'Design tools' : active.label;
  const underRef = useRef(null);

  const PANELS = {
    type:    () => <TypePanel cfg={p.cfg} setCfg={p.setCfg} setActiveZone={p.setActiveZone} onOpenTool={summary.onOpenTool} onChangeGarment={p.onChangeGarment}/>,
    color:   () => <ColorsPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone} setActiveZone={p.setActiveZone}/>,
    assets:  () => <AssetsPanel tab={p.assetsTab} setTab={p.setAssetsTab} cfg={p.cfg} logo={p.logoUpload}
                     shapes={{ selObj:p.selObj, onAdd:p.addShape, onUpdate:p.updateSelected }}
                     onInspo={() => p.setShowInspo(true)} onShowcase={() => p.setShowShowcase(true)}/>,
    text:    () => <TextPanel onAdd={p.addText} bodyColor={p.cfg?.colors?.body}/>,
    draw:    () => <DrawPanel size={p.brushSize} color={p.brushColor} onSizeChange={p.changeBrushSize} onColorChange={p.changeBrushColor} erasing={p.erasing} setErasing={p.setErasing}/>,
    ai:      () => <div className="ds-sum"><AIPanel onApply={p.applyAI} onTexture={noop}/><AIDesignChat docked/></div>,
    pattern: () => (assetFor(p.cfg.garment, p.cfg.sleeve, 'front', p.cfg.fit)
      ? <p className="ds-note" style={{ padding:'20px 4px', textAlign:'center' }}>Patterns are not available on a real-photo garment base. Switch the sleeve or garment to use them.</p>
      : <PatternPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone}/>),
    selected: () => (
      <div className="ds-sum">
        {hasSelection
          ? <SelectionInspector selObj={p.selObj} updateSelected={p.updateSelected} deleteSelected={p.deleteSelected} duplicateSelected={p.duplicateSelected} alignSelected={p.alignSelected}
              toggleSelectedLock={p.toggleSelectedLock} pushHistory={p.pushHistory}/>
          : <p className="ds-sum-sub" style={{ padding:'24px 4px', textAlign:'center' }}>Tap a placed logo, text or shape on the canvas to edit it.</p>}
      </div>
    ),
  };
  const layersPanel = (
    <LayersPanel layers={p.layers} selectedId={p.selObj?.__layerId} garment={p.cfg.garment} onSelect={p.selectLayer}
      onToggleVisibility={p.toggleLayerVisibility} onToggleLock={p.toggleLayerLock} onOpacity={p.setLayerOpacity}
      onRename={p.renameLayer} onDelete={p.deleteLayer} onReorder={p.reorderLayers}/>
  );
  const underneath = !noGarment && !more;

  const reduce = useReducedMotion();
  // Phone sheet grabber: tap toggles peek/half; swipe up grows one snap, swipe down shrinks one. Dragging moves the sheet via a ref (no render per move).
  const panelRef = useRef(null);
  const drag = useRef(null);
  const toPeek = () => { setSheetOpen(false); setSheetFull(false); setMore(false); };
  const onGrabDown = (e) => {
    drag.current = { y: e.clientY, dy: 0 };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* pointer already released */ }
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onGrabMove = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    drag.current.dy = dy;
    if (panelRef.current && dy > 0 && sheetOpen) panelRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onGrabUp = () => {
    const d = drag.current; drag.current = null;
    if (panelRef.current) { panelRef.current.style.transition = ''; panelRef.current.style.transform = ''; }
    if (!d) return;
    if (d.dy < -40) { if (sheetOpen) setSheetFull(true); else setSheetOpen(true); }
    else if (d.dy > 60) { if (sheetFull) setSheetFull(false); else toPeek(); }
    else if (Math.abs(d.dy) < 6) { if (sheetOpen) toPeek(); else setSheetOpen(true); }
  };
  // Layers live in one place: the tile brings that section into view instead of opening a second copy.
  const focusLayers = () => {
    setMore(false); setSheetOpen(true);
    setTimeout(() => { underRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); underRef.current?.focus({ preventScroll: true }); }, 60);
  };
  const pick = id => {
    if (noGarment) return;
    if (id === 'layers') return focusLayers();
    if (id === tool && sheetOpen && !more) return toPeek();
    setTool(id); setMore(false); setSheetOpen(true);
  };
  const toggleMore = () => (sheetOpen && more ? toPeek() : (setMore(true), setSheetOpen(true)));

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') { setSheetOpen(false); setSheetFull(false); setMore(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, setSheetOpen, setSheetFull]);

  return (
    <>
      <div className="ds-strip" role="toolbar" aria-label="Design tools">
        {tools.map(t => (
          <button key={t.id} type="button" className="ds-tool-btn" title={noGarment ? 'Choose a garment first' : t.label}
            data-group={t.primary || t.id === 'selected' ? 'primary' : 'more'}
            data-tool={t.id} aria-disabled={noGarment || undefined}
            aria-pressed={tool === t.id && sheetOpen && !more && !noGarment} onClick={() => pick(t.id)}>
            {tool === t.id && sheetOpen && !more && !noGarment && (
              <motion.span layoutId="ds-rail-pill" className="ds-rail-pill" aria-hidden="true"
                transition={reduce ? { duration: 0 } : { duration: .2, ease: [.22, 1, .36, 1] }}/>
            )}
            <NavIcon name={t.icon} size={18}/>
            <span>{t.label}</span>
          </button>
        ))}
        <button type="button" className="ds-tool-btn ds-more-btn" aria-expanded={sheetOpen && more} aria-disabled={noGarment || undefined}
          title={noGarment ? 'Choose a garment first' : undefined} onClick={() => !noGarment && toggleMore()}>
          <NavIcon name="chevronUp" size={18}/>
          <span>More</span>
        </button>
      </div>

      <section className="ds-panel" ref={panelRef} aria-label={title}>
        <div className="ds-grab" role="button" tabIndex={0} aria-label={sheetOpen ? 'Shrink the panel' : 'Open the panel'}
          onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (sheetOpen) toPeek(); else setSheetOpen(true); } }}>
          <span/>
        </div>
        <header className="ds-sheet-head">
          <span className="ds-sheet-icon" aria-hidden="true"><NavIcon name={more ? 'chevronUp' : active.icon} size={16}/></span>
          <div className="ds-sheet-title">
            <h2>{title}</h2>
            {!more && !noGarment && active.hint && <p>{active.hint}</p>}
          </div>
          <button type="button" className="ds-sheet-close" aria-label="Shrink the panel" onClick={toPeek}>
            <NavIcon name="chevronDown" size={20}/>
          </button>
        </header>
        {/* One scroll area above the sticky dock: tool content, then Layers */}
        <div className="ds-panel-scroll">
        {noGarment ? (
          <p className="ds-panel-prompt">Choose a garment on the canvas to start designing.</p>
        ) : more ? (
          <div className="ds-more-grid">
            {tools.filter(t => !t.primary && t.id !== 'selected').map(t => (
              <button key={t.id} type="button" className="ds-more-item" onClick={() => pick(t.id)}>
                <NavIcon name={t.icon} size={20}/>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tool}
              initial={reduce ? false : { opacity:0 }}
              animate={{ opacity:1, transition:{ duration: reduce ? 0 : .2, ease:[.22, 1, .36, 1] } }}
              exit={{ opacity:0, transition:{ duration: reduce ? 0 : .12 } }}
              className="ds-panel-body">
              {PANELS[tool]()}
            </motion.div>
          </AnimatePresence>
        )}
        {underneath && (
          <section className="ds-under" ref={underRef} tabIndex={-1} aria-label="Layers">
            {layersPanel}
          </section>
        )}
        </div>
        <StudioDock {...summary} onNeedRoom={() => setSheetOpen(true)}/>
      </section>
    </>
  );
}
