import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import LayersPanel from './LayersPanel';
import AssetsPanel from './AssetsPanel';
import PatternPanel from './PatternPanel';
import DrawPanel from './DrawPanel';
import TypePanel from './TypePanel';
import ColorsPanel from './ColorsPanel';
import TextPanel from './TextPanel';
import AIPanel from './AIPanel';
import { SummaryContent } from './RightInfoPanel';
import { TOOLS } from './dsShared';

const noop = () => {};

export default function ToolDrawer({ tool, setTool, sheetOpen, setSheetOpen, summary, ...p }) {
  const [more, setMore] = useState(false);
  const active = TOOLS.find(t => t.id === tool);
  const title = more ? 'More tools' : active.label;

  const PANELS = {
    type:    () => <TypePanel cfg={p.cfg} setCfg={p.setCfg}/>,
    color:   () => <ColorsPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone} setActiveZone={p.setActiveZone}/>,
    assets:  () => <AssetsPanel tab={p.assetsTab} setTab={p.setAssetsTab} cfg={p.cfg} logo={p.logoUpload}
                     shapes={{ selObj:p.selObj, onAdd:p.addShape, onUpdate:p.updateSelected }}
                     onInspo={() => p.setShowInspo(true)} onShowcase={() => p.setShowShowcase(true)}/>,
    text:    () => <TextPanel onAdd={p.addText}/>,
    draw:    () => <DrawPanel size={p.brushSize} color={p.brushColor} onSizeChange={p.changeBrushSize} onColorChange={p.changeBrushColor}/>,
    ai:      () => <AIPanel onApply={p.applyAI} onTexture={noop}/>,
    pattern: () => <PatternPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone}/>,
    layers:  () => <LayersPanel layers={p.layers} selectedId={p.selObj?.__layerId} onSelect={p.selectLayer}
                     onToggleVisibility={p.toggleLayerVisibility} onRename={p.renameLayer} onDelete={p.deleteLayer} onReorder={p.reorderLayers}/>,
    summary: () => <div className="ds-sum"><SummaryContent {...summary}/></div>,
  };

  const close = () => { setSheetOpen(false); setMore(false); };
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
            data-group={t.primary ? 'primary' : 'more'} data-narrow-only={t.id === 'summary' || undefined}
            aria-pressed={tool === t.id && sheetOpen && !more} onClick={() => pick(t.id)}>
            <NavIcon name={t.icon} size={18}/>
            <span>{t.label}</span>
          </button>
        ))}
        <button type="button" className="ds-tool-btn ds-more-btn" aria-expanded={sheetOpen && more} onClick={toggleMore}>
          <NavIcon name="chevronUp" size={18}/>
          <span>More</span>
        </button>
      </div>

      <section className="ds-panel" aria-label={title}>
        <header className="ds-sheet-head">
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
      </section>
    </>
  );
}
