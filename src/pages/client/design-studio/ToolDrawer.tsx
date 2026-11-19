import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MoreHorizontal, Eye, Copy, X, Compass, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import './studioDark.css';
import LayersPanel from './LayersPanel';
import AssetsPanel from './AssetsPanel';
import PatternPanel from './PatternPanel';
import TypePanel from './TypePanel';
import ColorsPanel from './ColorsPanel';
import DetailsPanel from './DetailsPanel';
import TextPanel from './TextPanel';
import { SelectionInspector, isEditableSelection } from './RightInfoPanel';
import AIDesignChat from '../AIDesignChat';
import { TOOLS, TABS, tabOf, zonesFor, ZONE_LABEL, placementsFor, RIGHT_TOOLS, isFlyoutTool } from './dsShared';
import { assetFor } from './garmentAssets';
import ScenePanel from './ScenePanel';
import StudioFlyout from './StudioFlyout';
import useMedia from '../../../hooks/useMedia';


// Phones and tablets: the four tabs plus More (View, Save a copy).
const NAV = ['type', 'add', 'layers', 'ai'];
const NAV_LABEL = { type: 'Garment', add: 'Add', layers: 'Layers', ai: 'AI Design' };
// Phone/tablet sheet heights: peek (its bar only), half, full. The bar's button steps through them; a drag moves one or two steps.
export const SNAPS = ['peek', 'half', 'full'];
export const snapStep = (snap, dy) => (Math.abs(dy) < 24 ? snap
  : SNAPS[Math.max(0, Math.min(SNAPS.length - 1, SNAPS.indexOf(snap) + (dy < 0 ? 1 : -1) * (Math.abs(dy) > 160 ? 2 : 1)))]);
// The Add tab's one row: each item is a tool, or a view of the asset panel. Starters live in the garment picker, not here.
const ADD_ITEMS = [
  { id: 'logo',     label: 'Logo',     icon: 'logo',   tool: 'assets', sub: 'logo' },
  { id: 'text',     label: 'Text',     icon: 'text',   tool: 'text',   sub: null },
  { id: 'shapes',   label: 'Shapes',   icon: 'shapes', tool: 'assets', sub: 'shapes' },
];
const SNAP_NEXT = { peek: ['half', 'Raise the panel'], half: ['full', 'Raise the panel to full height'], full: ['peek', 'Lower the panel'] };

// Raw-material suggestions are made per order, so the Studio only says where they appear. No prices.
function MaterialNote() {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('ds_material_note') === '0'; } catch { return false; } });
  if (hidden) return null;
  const hide = () => { setHidden(true); try { localStorage.setItem('ds_material_note', '0'); } catch { /* storage blocked */ } };
  return (
    <aside className="ds-matnote" aria-label="Fabric suggestions">
      <NavIcon name="materials" size={16}/>
      <p><strong>Fabric suggestions</strong>After you order, VFRB suggests the fabric and trims for this design. You can accept them or choose your own.</p>
      <button type="button" className="ds-matnote-x" aria-label="Hide fabric suggestions note" onClick={hide}><X size={16} aria-hidden="true"/></button>
    </aside>
  );
}

// The design at a glance: garment, the colour of each zone it has, and how many items are placed. No prices.
function SpecSummary({ cfg, layers = [], status = null }: any) {
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

// Desktop (>=1024px): the right panel has two tabs only (Layers, AI Design); Garment, Add, Text, Scene and the Selection inspector open in
// StudioFlyout beside the left tool rail (`flyOpen`/`setFlyOpen`/`drawing` come from DesignStudio). Below 1024px and in colour-only designs
// this is still one panel/bottom sheet with every tab.
// Panel: labelled tabs (Garment, Add, Layers, AI Design), the active tab's tool, then a spec summary (desktop); a canvas
// selection swaps in the Selection inspector. Save and order live in TopBar.
// A tab holding several tools (Garment: type/colours/pattern/details; Add: logo/text/draw) switches them with a labelled segment.
// Phones and tablets: a bottom nav (Garment, Add, Layers, AI Design, More) under a sheet of at most 40% of the screen that folds to
// a handle; the spec summary is one line there. `garmentExtra` (piece actions) shows in the Garment sheet there; `more` = { onView, onCopy, canCopy, copying }.
// `onlyTools`: the tools a restricted design may use (a colour-only copy passes ['color']); everything else is hidden.
export default function ToolDrawer({ tool: pickedTool, setTool, onOpenTool, onlyTools = null, garmentExtra = null, more = null, flyOpen = false, setFlyOpen = null, drawing = false, optsOpen = false, endOpts = null, ...p }: any) {
  const hasSelection = isEditableSelection(p.selObj);
  const allowed = id => !onlyTools || onlyTools.includes(id);
  const split = useMedia('(min-width:1024px)') && !onlyTools && !!setFlyOpen;
  // Split mode: the right panel keeps its own section (Layers or AI Design); asking for either from anywhere (dock, Add layer...) switches it.
  const [rightTab, setRightTab] = useState('layers');
  useEffect(() => { if (split && RIGHT_TOOLS.includes(pickedTool)) setRightTab(pickedTool); }, [split, pickedTool]);
  const shown = split ? rightTab : pickedTool;
  const tool = onlyTools && !onlyTools.includes(shown) ? onlyTools[0] : shown;
  const tabs = TABS.filter(t => t.tools.some(allowed) && (!split || t.tools.every(x => RIGHT_TOOLS.includes(x))));
  const tab = tabOf(tool); // null while the Selection inspector is open (sheet mode)
  const subs = tab ? tab.tools.filter(allowed) : [];
  const active = TOOLS.find(t => t.id === tool);
  const noGarment = !p.cfg.garment;
  const isSel = (i: any, t = tool) => (i.sub ? t === 'assets' && p.assetsTab === i.sub : t === i.tool);
  const title = noGarment ? 'Design tools' : tab?.label ?? active.label;

  const layersList = () => (
    <LayersPanel layers={p.layers} selectedId={p.selObj?.__layerId} garment={p.cfg.garment} onSelect={p.selectLayer}
      onToggleVisibility={p.toggleLayerVisibility} onToggleLock={p.toggleLayerLock} onOpacity={p.setLayerOpacity}
      onRename={p.renameLayer} onDelete={p.deleteLayer} onReorder={p.reorderLayers} onAdd={() => setTool('assets')}/>
  );
  const partView = tool === 'color' && allowed('type'); // a part is open; Done returns to the whole uniform
  const flyTool = pickedTool;
  const flyPart = flyTool === 'color' && allowed('type');
  const flyShown = split && !!flyOpen && !drawing && isFlyoutTool(flyTool) && !!p.cfg.garment;

  const PANELS = {
    type:    () => <TypePanel cfg={p.cfg} setCfg={p.setCfg} onPickPart={z => { p.setActiveZone(z); setTool('color'); }} onOpenTool={onOpenTool}
                     onChangeGarment={p.onChangeGarment} onRemove={p.onRemoveGarment} trace={p.trace} setTrace={p.setTrace} layers={layersList()}/>,
    color:   () => <ColorsPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone} setActiveZone={p.setActiveZone}
                     onDone={(split ? flyPart : partView) ? () => setTool('type') : null}/>,
    details: () => <DetailsPanel cfg={p.cfg} setCfg={p.setCfg} focus={p.detailFocus} onColourPocket={() => { p.setActiveZone('pocket'); setTool('color'); }} onAddPocket={p.addPocket}/>,
    assets:  () => <AssetsPanel tab={p.assetsTab} cfg={p.cfg} logo={p.logoUpload}
                     shapes={{ selObj:p.selObj, onAdd:p.addShape, onUpdate:p.updateSelected }}
                     onInspo={() => p.setShowInspo(true)} onShowcase={() => p.setShowShowcase(true)}/>,
    text:    () => <TextPanel onAdd={p.addText} bodyColor={p.cfg?.colors?.body}/>,
    draw:    () => <div className="ds-sum"><p className="ds-note">Brush and eraser options are in the panel on the canvas. Pick another tool from the tool bar, or finish here.</p><button type="button" className="ds-btn" onClick={() => endOpts?.()}>Done drawing</button></div>,
    ai:      () => <div className="ds-sum"><AIDesignChat cfg={p.cfg} textItems={p.textItems} ai={p.ai}/></div>,
    layers:  () => layersList(),
    scene:   () => <ScenePanel/>,
    pattern: () => (assetFor(p.cfg.garment, p.cfg.sleeve, 'front', p.cfg.fit)
      ? <p className="ds-note" style={{ padding:'20px 4px', textAlign:'center' }}>Patterns need a drawn garment, not a photo base.</p>
      : <PatternPanel cfg={p.cfg} setCfg={p.setCfg} activeZone={p.activeZone}/>),
    selected: () => (
      <div className="ds-sum">
        {hasSelection
          ? <SelectionInspector selObj={p.selObj} updateSelected={p.updateSelected} alignSelected={p.alignSelected}
              toggleSelectedLock={p.toggleSelectedLock} pushHistory={p.pushHistory} garmentRect={p.garmentRect} arrangeLayer={p.arrangeLayer}
              setPocketColor={p.setPocketColor} mirrorSelected={p.mirrorSelected}
              zones={placementsFor(p.cfg.garment, p.cfg.sleeve, p.cfg.fit)} presetPos={p.presetPos} nudgeSelected={p.nudgeSelected}/>
          : <p className="ds-sum-sub" style={{ padding:'24px 4px', textAlign:'center' }}>Tap a placed logo, text or shape on the canvas to edit it.</p>}
      </div>
    ),
  };
  // A tool's panel body: the segment for tabs that own several tools, then the tool's panel. Used by the right panel / sheet and by the left flyout.
  const bodyFor = (t: string) => {
    const tb = tabOf(t), sb = tb ? tb.tools.filter(allowed) : [], pv = t === 'color' && allowed('type');
    return (
      <>
            {tb?.id === 'type' && !pv && <MaterialNote/>}
            {sb.length > 1 && !pv && (
              <div className="ds-seg ds-subtabs" role="tablist" aria-label={`${tb.label} sections`} data-n={tb.id === 'add' ? ADD_ITEMS.length : undefined}>
                {(tb.id === 'add' ? ADD_ITEMS.filter(i => allowed(i.tool)) : sb.map(id => ({ id, ...TOOLS.find(x => x.id === id), tool: id, sub: null }))).map((i: any) => (
                  <button key={i.id} type="button" role="tab" aria-selected={isSel(i, t)} aria-controls={i.sub ? 'ds-add-panel' : undefined}
                    onClick={() => { if (i.sub) p.setAssetsTab(i.sub); setTool(i.tool); }}>
                    <NavIcon name={i.icon} size={16}/><span>{i.label}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Enter-only fade: with an exit wait, two quick panel switches (an upload opening Selection) could leave the body empty. */}
            <motion.div key={pv ? `color:${p.activeZone}` : t}
              initial={reduce ? false : { opacity:0 }}
              animate={{ opacity:1, transition:{ duration: reduce ? 0 : .18, ease:[.22, 1, .36, 1] } }}
              className="ds-panel-body" role={sb.length > 1 ? 'tabpanel' : undefined}>
              {PANELS[t]()}
            </motion.div>
      </>
    );
  };
  const reduce = useReducedMotion();
  // Desktop: the right panel folds to a thin rail so the canvas gets the width; remembered per browser.
  const [collapsed, setCollapsedState] = useState(() => { try { return localStorage.getItem('ds_panel_collapsed') === '1'; } catch { return false; } });
  const setCollapsed = v => { setCollapsedState(v); try { localStorage.setItem('ds_panel_collapsed', v ? '1' : '0'); } catch { /* storage blocked */ } };
  // A tab opens on its first tool (Draw never reopens by itself: it takes over the canvas).
  const [snap, setSnap] = useState('peek');
  // Phones: a drawing tool's options float over the stage, so the sheet stays on its bar while they are open. Raising the sheet,
  // by its button, a drag or a tab, ends the drawing tool first; so only one of the two is ever showing.
  const narrow = useMedia('(max-width:767px)'), phoneOpts = optsOpen && narrow, shownSnap = phoneOpts ? 'peek' : snap;
  const raise = () => { if (phoneOpts) return; setSnap(s => (s === 'peek' ? 'half' : s)); };
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tool, partView, moreOpen]);
  const moreBtn = useRef(null);
  // The More list unmounts as a dialog opens, so the More tab takes focus first and becomes the dialog's opener.
  const fromMore = fn => () => { moreBtn.current?.focus({ preventScroll: true }); setMoreOpen(false); fn(); };
  // A tap on the garment that picks a part or a placed item raises the sheet to half; a change the Studio makes by itself does not.
  const tapAt = useRef(-1e9);
  useEffect(() => {
    const down = e => { if (e.target.closest?.('.ds-pane')) tapAt.current = performance.now(); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, []);
  useEffect(() => { setMoreOpen(false); if (performance.now() - tapAt.current < 1500) raise(); }, [pickedTool, p.activeZone]);
  useEffect(() => { if (p.sheetPing) raise(); }, [p.sheetPing]);
  const pick = t => { if (phoneOpts) endOpts?.(); if (collapsed) setCollapsed(false); raise(); setMoreOpen(false); if (split) setRightTab(t.tools.find(allowed)); else setTool(t.tools.find(allowed)); };
  const drag = useRef(null);
  const dragDown = e => { if (e.target.closest('button')) return; drag.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); };
  const dragUp = e => { if (drag.current === null) return; const dy = e.clientY - drag.current; drag.current = null; if (phoneOpts) { if (dy < -24) { endOpts?.(); setSnap('half'); } return; } setSnap(s => snapStep(s, dy)); };
  const inMore = !NAV.includes(tab?.id);
  const navTabs = tabs.filter(t => NAV.includes(t.id));
  const moreTabs = tabs.filter(t => !NAV.includes(t.id));
  const moreList = (
    <ul className="ds-more" aria-label="More">
      {moreTabs.map(t => (
        <li key={t.id}><button type="button" onClick={() => pick(t)}><NavIcon name={t.icon} size={18}/>{t.label}</button></li>
      ))}
      {more?.onView && <li><button type="button" onClick={fromMore(more.onView)}><Eye size={18} aria-hidden="true"/>View<small>Guides, stage, sketch</small></button></li>}
      {more?.onTour && <li><button type="button" onClick={fromMore(more.onTour)}><Compass size={18} aria-hidden="true"/>Tour and gestures<small>How the Studio works, step by step</small></button></li>}
      {more?.onHowTo && <li><button type="button" onClick={fromMore(more.onHowTo)}><BookOpen size={18} aria-hidden="true"/>How-to guides<small>Colour, logos, text, layers, sets and ordering</small></button></li>}
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
        {/* One row of labelled tabs, icon above text. */}
        {!noGarment && (
          <nav className="ds-tabs" aria-label="Design sections">
            {tabs.map(t => (
              <button key={t.id} type="button" data-tab={t.id} aria-current={t.id === tab?.id ? 'true' : undefined} onClick={() => pick(t)}>
                <NavIcon name={t.icon} size={18}/><span>{t.label}{t.id === 'layers' && p.layers?.length ? <b className="ds-tabcount">{p.layers.length}</b> : null}</span>
              </button>
            ))}
          </nav>
        )}
        <div className="ds-sheet" data-snap={shownSnap}>
        {/* Phones and tablets: the sheet's bar (drag it, or use its button), with the panel name and the save state. */}
        {!noGarment && (
          <div className="ds-sheet-bar" onPointerDown={dragDown} onPointerUp={dragUp} onPointerCancel={() => { drag.current = null; }}>
            <span className="ds-sheet-grip" aria-hidden="true"/>
            <h2 className="ds-sheet-name">{moreOpen ? 'More' : title}</h2>
            {p.status && <span className="ds-sheet-status" data-tone={p.status.tone}>{p.status.short}</span>}
            <button type="button" className="ds-sheet-toggle" aria-expanded={shownSnap !== 'peek'} aria-label={SNAP_NEXT[shownSnap][1]} onClick={() => { if (phoneOpts) { endOpts?.(); setSnap('half'); } else setSnap(SNAP_NEXT[snap][0]); }}>
              {shownSnap === 'full' ? <ChevronDown size={20} aria-hidden="true"/> : <ChevronUp size={20} aria-hidden="true"/>}
            </button>
          </div>
        )}
        <header className="ds-sheet-head">
          <span className="ds-sheet-icon" aria-hidden="true"><NavIcon name={tab?.icon ?? active.icon} size={16}/></span>
          <div className="ds-sheet-title">
            <h2>{moreOpen ? 'More' : title}</h2>
            {!noGarment && !moreOpen && active.hint && <p>{active.hint}</p>}
          </div>
          <button type="button" className="ds-panel-toggle" aria-expanded="true" aria-label="Hide the panel" title="Hide the panel" onClick={() => setCollapsed(true)}>
            <NavIcon name="chevronRight" size={18}/><span className="ds-panel-toggle-t">Hide</span>
          </button>
        </header>
        <div className="ds-panel-scroll" ref={scrollRef}>
        {noGarment ? (
          <p className="ds-panel-prompt">Choose a garment on the canvas to start designing.</p>
        ) : moreOpen ? moreList : (
          <>
            {tool === 'type' && garmentExtra && <div className="ds-phone-only">{garmentExtra}</div>}
            {bodyFor(tool)}
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
            <button ref={moreBtn} type="button" aria-current={moreOpen || (inMore && !!tab) ? 'true' : undefined} aria-expanded={moreOpen}
              onClick={() => { raise(); setMoreOpen(o => !o); }}>
              <MoreHorizontal size={20} aria-hidden="true"/><span>More</span>
            </button>
          </nav>
        )}
      </section>
      {flyShown && (
        <StudioFlyout title={TOOLS.find(x => x.id === flyTool)?.label ?? 'Options'} icon={TOOLS.find(x => x.id === flyTool)?.icon ?? 'cursor'} hint={TOOLS.find(x => x.id === flyTool)?.hint}
          onClose={() => setFlyOpen(false)}>
          {bodyFor(flyTool)}
        </StudioFlyout>
      )}
    </>
  );
}
