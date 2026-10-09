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
import { SummaryContent, SelectionInspector, isEditableSelection } from './RightInfoPanel';
import { TOOLS } from './dsShared';
import { assetFor } from './garmentAssets';

const noop = () => {};

export default function ToolDrawer({ tool, setTool, sheetOpen, setSheetOpen, summary, ...p }) {
  const [more, setMore] = useState(false);
  const active = TOOLS.find(t => t.id === tool);
  const title = more ? 'More tools' : tool === 'selected' ? 'Selected item' : active.label;
  const hasSelection = isEditableSelection(p.selObj);

  const PANELS = {
    type:    () => <TypePanel cfg={p.cfg} setCfg={p.setCfg} setActiveZone={p.setActiveZone} onOpenTool={summary.onOpenTool}
                     viewMode={p.viewMode} setViewMode={p.setViewMode} setHas3DLoaded={p.setHas3DLoaded}/>,
    color:   () => <ColorsPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone} setActiveZone={p.setActiveZone}/>,
    assets:  () => <AssetsPanel tab={p.assetsTab} setTab={p.setAssetsTab} cfg={p.cfg} logo={p.logoUpload}
                     shapes={{ selObj:p.selObj, onAdd:p.addShape, onUpdate:p.updateSelected }}
                     onInspo={() => p.setShowInspo(true)} onShowcase={() => p.setShowShowcase(true)}/>,
    text:    () => <TextPanel onAdd={p.addText} bodyColor={p.cfg?.colors?.body}/>,
    draw:    () => <DrawPanel size={p.brushSize} color={p.brushColor} onSizeChange={p.changeBrushSize} onColorChange={p.changeBrushColor}/>,
    ai:      () => <AIPanel onApply={p.applyAI} onTexture={noop}/>,
    pattern: () => (assetFor(p.cfg.garment, p.cfg.sleeve, 'front', p.cfg.fit)
      ? <p className="ds-note" style={{ padding:'20px 4px', textAlign:'center' }}>Patterns are not available on a real-photo garment base. Switch the sleeve or garment to use them.</p>
      : <PatternPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone}/>),
    layers:  () => <LayersPanel layers={p.layers} selectedId={p.selObj?.__layerId} garment={p.cfg.garment} onSelect={p.selectLayer}
                     onToggleVisibility={p.toggleLayerVisibility} onToggleLock={p.toggleLayerLock} onOpacity={p.setLayerOpacity}
                     onRename={p.renameLayer} onDelete={p.deleteLayer} onReorder={p.reorderLayers}/>,
    summary:  () => <div className="ds-sum"><SummaryContent {...summary}/></div>,
    // Tablet/mobile-only reach for the same SelectionInspector desktop always shows in
    // RightInfoPanel — see the 'selected' entry in dsShared.js TOOLS for why this exists.
    selected: () => (
      <div className="ds-sum">
        {hasSelection
          ? <SelectionInspector selObj={p.selObj} updateSelected={p.updateSelected} deleteSelected={p.deleteSelected} duplicateSelected={p.duplicateSelected} alignSelected={p.alignSelected}
              toggleSelectedLock={p.toggleSelectedLock} pushHistory={p.pushHistory}/>
          : <p className="ds-sum-sub" style={{ padding:'24px 4px', textAlign:'center' }}>
              Tap a placed logo, text or shape on the canvas to edit it.
            </p>}
      </div>
    ),
  };

  const reduce = useReducedMotion();
  // Mobile bottom sheet: grabber supports tap (expand/collapse), swipe up (expand) and
  // swipe down (dismiss). The drag moves the panel imperatively via a ref so a swipe
  // never triggers a React render per pointer move.
  const panelRef = useRef(null);
  const drag = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const close = () => { setSheetOpen(false); setMore(false); setExpanded(false); };
  const onGrabDown = (e) => {
    drag.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onGrabMove = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    drag.current.dy = dy;
    if (panelRef.current && dy > 0) panelRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onGrabUp = () => {
    const d = drag.current; drag.current = null;
    if (panelRef.current) { panelRef.current.style.transition = ''; panelRef.current.style.transform = ''; }
    if (!d) return;
    if (d.dy > 80) close();
    else if (d.dy < -40) setExpanded(true);
    else if (Math.abs(d.dy) < 6) setExpanded(x => !x);
  };
  const pick = id => {
    if (id === tool && sheetOpen && !more) return close();
    setTool(id); setMore(false); setSheetOpen(true);
  };
  const toggleMore = () => (sheetOpen && more ? close() : (setMore(true), setSheetOpen(true)));

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') { setSheetOpen(false); setMore(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, setSheetOpen]);

  return (
    <>
      <div className="ds-strip" role="toolbar" aria-label="Design tools">
        {TOOLS.map(t => (
          <button key={t.id} type="button" className="ds-tool-btn" title={t.label}
            data-group={t.primary ? 'primary' : 'more'}
            data-tool={t.id} data-narrow-only={(t.id === 'summary' || t.id === 'selected') || undefined}
            aria-pressed={tool === t.id && sheetOpen && !more} onClick={() => pick(t.id)}>
            {tool === t.id && sheetOpen && !more && (
              <motion.span layoutId="ds-rail-pill" className="ds-rail-pill" aria-hidden="true"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }}/>
            )}
            <NavIcon name={t.icon} size={18}/>
            <span>{t.label}</span>
          </button>
        ))}
        <button type="button" className="ds-tool-btn ds-more-btn" aria-expanded={sheetOpen && more} onClick={toggleMore}>
          <NavIcon name="chevronUp" size={18}/>
          <span>More</span>
        </button>
      </div>

      <section className="ds-panel" ref={panelRef} data-expanded={expanded ? 'true' : 'false'} aria-label={title}>
        <div className="ds-grab" role="separator" aria-label="Drag to resize or close the panel"
          onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
          <span/>
        </div>
        <header className="ds-sheet-head">
          <span className="ds-sheet-icon" aria-hidden="true"><NavIcon name={more ? 'chevronUp' : active.icon} size={16}/></span>
          <div className="ds-sheet-title">
            <h2>{title}</h2>
            {!more && active.hint && <p>{active.hint}</p>}
          </div>
          <button type="button" className="ds-sheet-close" aria-label="Close panel" onClick={close}>
            <NavIcon name="chevronDown" size={20}/>
          </button>
        </header>
        {more ? (
          <div className="ds-more-grid">
            {TOOLS.filter(t => !t.primary).map(t => (
              <button key={t.id} type="button" className="ds-more-item" onClick={() => pick(t.id)}>
                <NavIcon name={t.icon} size={20}/>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={tool}
              initial={{ opacity:0, x:-10 }}
              animate={{ opacity:1, x:0, transition:{ duration:.18, ease:'easeOut' } }}
              exit={{ opacity:0, x:10, transition:{ duration:.12 } }}
              className="ds-panel-body">
              {PANELS[tool]()}
            </motion.div>
          </AnimatePresence>
        )}
        <StudioDock {...summary} layerCount={p.layers.length}/>
      </section>
    </>
  );
}
