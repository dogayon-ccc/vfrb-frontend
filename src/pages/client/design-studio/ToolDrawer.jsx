import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MoreHorizontal, Eye, Copy } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import LayersPanel from './LayersPanel';
import AssetsPanel from './AssetsPanel';
import PatternPanel from './PatternPanel';
import DrawPanel from './DrawPanel';
import TypePanel from './TypePanel';
import ColorsPanel from './ColorsPanel';
import DetailsPanel from './DetailsPanel';
import TextPanel from './TextPanel';
import { SelectionInspector, isEditableSelection } from './RightInfoPanel';
import AIDesignChat from '../AIDesignChat';
import { TOOLS, TABS, tabOf, zonesFor, ZONE_LABEL, placementsFor } from './dsShared';
import { assetFor } from './garmentAssets';


const SHORT = { color: 'Colour', logotext: 'Logo' };
// Phones and tablets: five bottom-nav items; Details, Ask AI, View and Save a copy sit under More.
const NAV = ['type', 'color', 'logotext', 'layers'];
const NAV_LABEL = { type: 'Garment', color: 'Colours', logotext: 'Logo', layers: 'Layers' };

// The design at a glance: garment, the colour of each zone it has, and how many items are placed. No prices.
function SpecSummary({ cfg, layers = [], status = null }) {
  const zones = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => (z !== 'tipping' || cfg.colors?.tipping) && (z !== 'pocket' || cfg.details?.patchPocket?.show !== false));
  return (
    <footer className="ds-spec" aria-label="Design summary">
      <dl>
        <div><dt>Garment</dt><dd>{cfg.garment}{cfg.sleeve ? `, ${cfg.sleeve.toLowerCase()} sleeve` : ''}</dd></div>
        <div><dt>Colours</dt><dd className="ds-spec-sw">{zones.map(z => (
          <span key={z} title={`${ZONE_LABEL[z] ?? z}: ${cfg.colors?.[z] ?? cfg.colors?.body}`}><i style={{ background: cfg.colors?.[z] ?? cfg.colors?.body }} aria-hidden="true"/>{ZONE_LABEL[z] ?? z}</span>
        ))}</dd></div>
        <div><dt>Placed</dt><dd>{layers.length ? `${layers.length} item${layers.length === 1 ? '' : 's'}` : 'Nothing yet'}</dd></div>
      </dl>
      {/* Phones: the autosave chip, since the top bar only has room for its dot */}
      {status && <span className="ds-spec-save" data-tone={status.tone} aria-hidden="true">{status.short}</span>}
    </footer>
  );
}

// Panel: one row of six labelled tabs (Garment, Colour, Details, Logo, Layers, Ask AI), the active tab's tool, then a spec summary
// (desktop). Save and order live in TopBar.
// A tab holding several tools (Colours: colour/pattern; Logo & text: logo/text/draw) switches them with a labelled segment.
// Phones and tablets: a bottom nav (Garment, Colours, Logo, Layers, More) under a sheet of at most 40% of the screen that folds to
// a handle; the spec summary is one line there. `garmentExtra` (piece actions) shows in the Garment sheet there; `more` = { onView, onCopy, canCopy, copying }.
// `onlyTools`: the tools a restricted design may use (a colour-only copy passes ['color']); everything else is hidden.
export default function ToolDrawer({ tool: pickedTool, setTool, onOpenTool, onlyTools = null, garmentExtra = null, more = null, ...p }) {
  const hasSelection = isEditableSelection(p.selObj);
  const allowed = id => !onlyTools || onlyTools.includes(id);
  const tool = onlyTools && !onlyTools.includes(pickedTool) ? onlyTools[0] : pickedTool;
  const tabs = TABS.filter(t => t.tools.some(allowed));
  const tab = tabOf(tool); // null while the Selection inspector is open
  const subs = tab ? tab.tools.filter(allowed) : [];
  const active = TOOLS.find(t => t.id === tool);
  const noGarment = !p.cfg.garment;
  const title = noGarment ? 'Design tools' : tab?.label ?? active.label;

  const PANELS = {
    type:    () => <TypePanel cfg={p.cfg} setCfg={p.setCfg} setActiveZone={p.setActiveZone} onOpenTool={onOpenTool} onChangeGarment={p.onChangeGarment} trace={p.trace} setTrace={p.setTrace}/>,
    color:   () => <ColorsPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone} setActiveZone={p.setActiveZone}/>,
    details: () => <DetailsPanel cfg={p.cfg} setCfg={p.setCfg} focus={p.detailFocus} onColourPocket={() => { p.setActiveZone('pocket'); setTool('color'); }} onAddPocket={p.addPocket}/>,
    assets:  () => <AssetsPanel tab={p.assetsTab} setTab={p.setAssetsTab} cfg={p.cfg} logo={p.logoUpload}
                     shapes={{ selObj:p.selObj, onAdd:p.addShape, onUpdate:p.updateSelected }}
                     onInspo={() => p.setShowInspo(true)} onShowcase={() => p.setShowShowcase(true)}/>,
    text:    () => <TextPanel onAdd={p.addText} bodyColor={p.cfg?.colors?.body}/>,
    draw:    () => <DrawPanel size={p.brushSize} color={p.brushColor} onSizeChange={p.changeBrushSize} onColorChange={p.changeBrushColor} erasing={p.erasing} setErasing={p.setErasing}/>,
    ai:      () => <div className="ds-sum"><AIDesignChat cfg={p.cfg} textItems={p.textItems} ai={p.ai}/></div>,
    layers:  () => (
      <LayersPanel layers={p.layers} selectedId={p.selObj?.__layerId} garment={p.cfg.garment} onSelect={p.selectLayer}
        onToggleVisibility={p.toggleLayerVisibility} onToggleLock={p.toggleLayerLock} onOpacity={p.setLayerOpacity}
        onRename={p.renameLayer} onDelete={p.deleteLayer} onReorder={p.reorderLayers} onAdd={() => setTool('assets')}/>
    ),
    pattern: () => (assetFor(p.cfg.garment, p.cfg.sleeve, 'front', p.cfg.fit)
      ? <p className="ds-note" style={{ padding:'20px 4px', textAlign:'center' }}>Patterns need a drawn garment, not a photo base.</p>
      : <PatternPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone}/>),
    selected: () => (
      <div className="ds-sum">
        {hasSelection
          ? <SelectionInspector selObj={p.selObj} updateSelected={p.updateSelected} alignSelected={p.alignSelected}
              toggleSelectedLock={p.toggleSelectedLock} pushHistory={p.pushHistory} garmentRect={p.garmentRect} arrangeLayer={p.arrangeLayer}
              setPocketColor={p.setPocketColor} mirrorSelected={p.mirrorSelected}
              zones={placementsFor(p.cfg.garment, p.cfg.sleeve, p.cfg.fit)} presetPos={p.presetPos}/>
          : <p className="ds-sum-sub" style={{ padding:'24px 4px', textAlign:'center' }}>Tap a placed logo, text or shape on the canvas to edit it.</p>}
      </div>
    ),
  };
  const reduce = useReducedMotion();
  // Desktop: the right panel folds to a thin rail so the canvas gets the width; remembered per browser.
  const [collapsed, setCollapsedState] = useState(() => { try { return localStorage.getItem('ds_panel_collapsed') === '1'; } catch { return false; } });
  const setCollapsed = v => { setCollapsedState(v); try { localStorage.setItem('ds_panel_collapsed', v ? '1' : '0'); } catch { /* storage blocked */ } };
  // A tab opens on its first tool (Draw never reopens by itself: it takes over the canvas).
  const [folded, setFolded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); setFolded(false); }, [pickedTool, p.activeZone]); // a zone or tool picked on the canvas opens its panel
  const pick = t => { if (collapsed) setCollapsed(false); setFolded(false); setMoreOpen(false); setTool(t.tools.find(allowed)); };
  const inMore = !NAV.includes(tab?.id);
  const navTabs = tabs.filter(t => NAV.includes(t.id));
  const moreTabs = tabs.filter(t => !NAV.includes(t.id));
  const moreList = (
    <ul className="ds-more" aria-label="More">
      {moreTabs.map(t => (
        <li key={t.id}><button type="button" onClick={() => pick(t)}><NavIcon name={t.icon} size={18}/>{t.label}</button></li>
      ))}
      {more?.onView && <li><button type="button" onClick={() => { setMoreOpen(false); more.onView(); }}><Eye size={18} aria-hidden="true"/>View<small>Guides, stage, sketch</small></button></li>}
      {more?.onCopy && (
        <li><button type="button" onClick={more.onCopy} disabled={!more.canCopy || more.copying} aria-busy={more.copying || undefined}>
          <Copy size={18} aria-hidden="true"/>{more.copying ? 'Saving a copy…' : 'Save a copy'}{!more.canCopy && <small>Open a saved design from My Designs first</small>}
        </button></li>
      )}
    </ul>
  );

  return (
    <>
      <section className="ds-panel" aria-label={title} data-collapsed={collapsed || undefined}>
        {collapsed && (
          <button type="button" className="ds-panel-toggle" aria-expanded="false" aria-label="Show the panel" title="Show the panel" onClick={() => setCollapsed(false)}>
            <NavIcon name="chevronLeft" size={18}/>
          </button>
        )}
        {/* One row of six labelled tabs, icon above text. */}
        {!noGarment && (
          <nav className="ds-tabs" aria-label="Design sections">
            {tabs.map(t => (
              <button key={t.id} type="button" aria-current={t.id === tab?.id ? 'true' : undefined} onClick={() => pick(t)}>
                <NavIcon name={t.icon} size={18}/><span>{SHORT[t.id] ?? t.label}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="ds-sheet" data-folded={folded || undefined}>
        {!noGarment && (
          <button type="button" className="ds-sheet-handle" aria-expanded={!folded} onClick={() => setFolded(f => !f)}>
            <span aria-hidden="true"/>{folded ? `Show ${moreOpen ? 'More' : title}` : 'Hide panel'}
          </button>
        )}
        <header className="ds-sheet-head">
          <span className="ds-sheet-icon" aria-hidden="true"><NavIcon name={tab?.icon ?? active.icon} size={16}/></span>
          <div className="ds-sheet-title">
            <h2>{moreOpen ? 'More' : title}</h2>
            {!noGarment && !moreOpen && active.hint && <p>{active.hint}</p>}
          </div>
          <button type="button" className="ds-panel-toggle" aria-expanded="true" aria-label="Hide the panel" title="Hide the panel" onClick={() => setCollapsed(true)}>
            <NavIcon name="chevronRight" size={18}/>
          </button>
        </header>
        <div className="ds-panel-scroll">
        {noGarment ? (
          <p className="ds-panel-prompt">Choose a garment on the canvas to start designing.</p>
        ) : moreOpen ? moreList : (
          <>
            {tool === 'type' && garmentExtra && <div className="ds-phone-only">{garmentExtra}</div>}
            {subs.length > 1 && (
              <div className="ds-seg ds-subtabs" role="tablist" aria-label={`${tab.label} sections`}>
                {subs.map(id => {
                  const t = TOOLS.find(x => x.id === id);
                  return <button key={id} type="button" role="tab" aria-selected={id === tool} onClick={() => setTool(id)}><NavIcon name={t.icon} size={14}/>{t.label}</button>;
                })}
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div key={tool}
                initial={reduce ? false : { opacity:0 }}
                animate={{ opacity:1, transition:{ duration: reduce ? 0 : .18, ease:[.22, 1, .36, 1] } }}
                exit={{ opacity:0, transition:{ duration: reduce ? 0 : .12 } }}
                className="ds-panel-body" role={subs.length > 1 ? 'tabpanel' : undefined}>
                {PANELS[tool]()}
              </motion.div>
            </AnimatePresence>
          </>
        )}
        </div>
        {!noGarment && <SpecSummary cfg={p.cfg} layers={p.layers} status={p.status}/>}
        </div>
        {!noGarment && (
          <nav className="ds-bnav" aria-label="Design sections">
            {navTabs.map(t => (
              <button key={t.id} type="button" aria-current={!moreOpen && t.id === tab?.id ? 'true' : undefined} onClick={() => pick(t)}>
                <NavIcon name={t.icon} size={20}/><span>{NAV_LABEL[t.id]}</span>
              </button>
            ))}
            <button type="button" aria-current={moreOpen || (inMore && !!tab) ? 'true' : undefined} aria-expanded={moreOpen}
              onClick={() => { setFolded(false); setMoreOpen(o => !o); }}>
              <MoreHorizontal size={20} aria-hidden="true"/><span>More</span>
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
