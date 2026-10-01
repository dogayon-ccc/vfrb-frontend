import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { BASE_PATHS } from './garmentPaths';
import GarmentThumb from './GarmentThumb';
import { selectFamily } from './selectGarment';
import { CATALOG, familyFor, neighborFamily, applyGarment, STATUS_3D_LABEL } from './garmentCatalog';
import { PH_SWATCHES, ZONE_LABEL, zonesFor } from './dsShared';
import { assetFor } from './garmentAssets';

// Options come from the canonical CATALOG only; nothing here invents a garment, style or fit.
export default function TypePanel({ cfg, setCfg, setActiveZone, onOpenTool, viewMode, setViewMode, setHas3DLoaded }) {
  const reduce  = useReducedMotion();
  const [openZone, setOpenZone] = useState(null);
  const [picking, setPicking] = useState(!cfg.garment);
  const [prevGarment, setPrevGarment] = useState(cfg.garment);
  if (prevGarment !== cfg.garment) { setPrevGarment(cfg.garment); setPicking(!cfg.garment); }
  const catData = CATALOG.find(c => c.id === cfg.category) ?? CATALOG[0];
  const family  = familyFor(cfg.garment);
  const sleeves = family?.styles ?? [];
  const hasFit  = (family?.fits.length ?? 0) > 1;
  const zones   = cfg.garment ? zonesFor(cfg.garment, cfg.sleeve).filter(z => z !== 'body' && (z !== 'tipping' || cfg.colors.tipping)) : [];
  const body    = (cfg.colors.body ?? '').toLowerCase();
  const photo   = cfg.garment ? assetFor(cfg.garment, cfg.sleeve) : null;

  const goNeighbor = (dir) => {
    const next = neighborFamily(cfg.category, cfg.garment, dir);
    if (next) selectFamily(setCfg, next);
  };
  const toggleZone = (z) => { setOpenZone(o => (o === z ? null : z)); setActiveZone(z); };
  const setZoneColor = (z, hex) => setCfg(p => ({ ...p, colors: { ...p.colors, [z]: hex } }));

  return (
    <div className="ds-tp">
      {cfg.garment && !picking && (
        <div className="ds-tp-current">
          <span className="ds-tp-thumb ds-tp-thumb--sm"><GarmentThumb paths={BASE_PATHS[cfg.garment] ?? BASE_PATHS['Polo Shirt']} colors={cfg.colors} size={40}/></span>
          <div className="ds-tp-current-txt">
            <strong>{cfg.garment}</strong>
            <span>{catData.id}{STATUS_3D_LABEL[family?.status3D] ? ` · ${STATUS_3D_LABEL[family.status3D].label}` : ''}</span>
          </div>
          <button type="button" className="ds-btn" onClick={() => setPicking(true)}>Change</button>
        </div>
      )}

      {(picking || !cfg.garment) && (
      <>
      <div className="ds-tp-catbar" role="tablist" aria-label="Uniform category">
        {CATALOG.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={cfg.category === c.id} className="ds-tp-catchip"
            onClick={() => setCfg(p => applyGarment(p, c.families[0].id, { category: c.id }))}>
            <NavIcon name={c.icon} size={15}/>
            <span>{c.id.split('/')[0].trim()}</span>
          </button>
        ))}
      </div>

      <div className="ds-tp-row">
        <p className="ds-h3" style={{ margin: 0 }}>Garment · {catData.families.length}</p>
        <div className="ds-tp-row-actions">
          {cfg.garment && catData.families.length > 1 && (<>
            <button type="button" className="ds-tp-mini" title="Previous garment" aria-label="Previous garment" onClick={() => goNeighbor(-1)}>
              <NavIcon name="chevronLeft" size={12}/></button>
            <button type="button" className="ds-tp-mini" title="Next garment" aria-label="Next garment" onClick={() => goNeighbor(1)}>
              <NavIcon name="chevronRight" size={12}/></button>
          </>)}
          {cfg.garment && (
            <button type="button" className="ds-tp-clear" onClick={() => setCfg(p => ({ ...p, garment: null }))}>
              <NavIcon name="delete" size={12}/> Clear
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={catData.id} className="ds-tp-grid"
          initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }} transition={{ duration: reduce ? 0 : 0.12 }}>
          {catData.families.map((fam, i) => {
            const g = fam.id;
            const sel = cfg.garment === g;
            const st = STATUS_3D_LABEL[fam.status3D];
            return (
              <button key={g} type="button" className="ds-tp-card" aria-pressed={sel} style={{ '--i': i }}
                title={sel ? `${g} — click to remove` : `${g}${st ? ` — ${st.label}` : ''}`}
                onClick={() => (sel ? setCfg(p => ({ ...p, garment: null })) : selectFamily(setCfg, fam))}>
                <AnimatePresence>
                  {sel && (
                    <motion.span className="ds-tp-check" aria-hidden="true"
                      initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
                      <NavIcon name="success" size={12} color="#fff"/>
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="ds-tp-thumb"><GarmentThumb paths={BASE_PATHS[g] ?? BASE_PATHS['Polo Shirt']} colors={cfg.colors} size={44}/></span>
                <span className="ds-tp-name">{g}</span>
                {st && <span className="ds-tp-chip" data-tone={st.tone}>{st.label}</span>}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      </>
      )}

      {!cfg.garment && <p className="ds-note" style={{ marginTop: 0 }}>Tap a garment to place it on the canvas.</p>}

      {cfg.garment && (
        <>
          {hasFit && (
            <section>
              <p className="ds-h3">Fit</p>
              <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Garment fit">
                {[['male', 'Male'], ['female', 'Female']].map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={(cfg.fit ?? 'male') === id}
                    onClick={() => setCfg(p => ({ ...p, fit: id }))}>{label}</button>
                ))}
              </div>
            </section>
          )}

          {(sleeves.length === 1 || (sleeves.length > 1 && !zones.includes('sleeve'))) && (
            <section>
              <p className="ds-h3">Sleeve</p>
              {sleeves.length === 1
                ? <p className="ds-note" style={{ marginTop: 0 }}>{cfg.garment} comes in {sleeves[0].toLowerCase()} sleeve only.</p>
                : (
                  <div className="ds-chips">
                    {sleeves.map(s => {
                      const only2D = family.status3D !== 'none' && !family.sleeves3D.includes(s);
                      return (
                        <button key={s} type="button" className="ds-chip" aria-pressed={cfg.sleeve === s}
                          title={only2D ? `${s} sleeve is 2D only — the 3D model has ${family.sleeves3D.join(' / ').toLowerCase()} sleeves` : undefined}
                          onClick={() => setCfg(p => ({ ...p, sleeve: s }))}>
                          {s}{only2D && <span className="ds-chip-note"> · 2D</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
            </section>
          )}

          <section>
            <p className="ds-h3">Base color</p>
            <div className="ds-tp-swatches" role="group" aria-label="Base color">
              {PH_SWATCHES.map(s => (
                <button key={s.hex} type="button" className="ds-tp-sw" title={s.name} aria-label={s.name}
                  aria-pressed={body === s.hex.toLowerCase()} style={{ background: s.hex }}
                  onClick={() => setCfg(p => ({ ...p, colors: { ...p.colors, body: s.hex } }))}/>
              ))}
            </div>
          </section>

          <div className="ds-acc" role="group" aria-label="Refine the design">
            {zones.map(z => {
              const open = openZone === z;
              const cur = (cfg.colors[z] ?? '').toLowerCase();
              return (
                <div key={z} className="ds-acc-item" data-open={open}>
                  <button type="button" className="ds-acc-head" aria-expanded={open} onClick={() => toggleZone(z)}>
                    <span className="ds-zone-dot" style={{ background: cfg.colors[z] ?? 'var(--bg-surface)' }}/>
                    <span>{ZONE_LABEL[z]}</span>
                    <NavIcon name="chevronRight" size={13}/>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div className="ds-acc-body" initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.18 }}>
                        {z === 'sleeve' && sleeves.length > 1 && (
                          <div className="ds-chips" style={{ padding: '4px 14px 10px' }}>
                            {sleeves.map(sv => {
                              const only2D = family.status3D !== 'none' && !family.sleeves3D.includes(sv);
                              return (
                                <button key={sv} type="button" className="ds-chip" aria-pressed={cfg.sleeve === sv}
                                  title={only2D ? `${sv} sleeve is 2D only` : undefined}
                                  onClick={() => setCfg(p => ({ ...p, sleeve: sv }))}>
                                  {sv}{only2D && <span className="ds-chip-note"> · 2D</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="ds-tp-swatches" role="group" aria-label={`${ZONE_LABEL[z]} color`}>
                          {PH_SWATCHES.map(sw => (
                            <button key={sw.hex} type="button" className="ds-tp-sw" title={sw.name} aria-label={sw.name}
                              aria-pressed={cur === sw.hex.toLowerCase()} style={{ background: sw.hex }}
                              onClick={() => setZoneColor(z, sw.hex)}/>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {photo
              ? <p className="ds-note" style={{ margin: '4px 2px 8px' }}>Real garment photo: colour applies to the whole garment. Collar, pocket and patterns are not editable on this base.</p>
              : (
                <div className="ds-acc-item">
                  <button type="button" className="ds-acc-head" onClick={() => onOpenTool('pattern')}>
                    <NavIcon name="pattern" size={15}/>
                    <span>Pattern</span>
                    <NavIcon name="chevronRight" size={13}/>
                  </button>
                </div>
              )}
            <div className="ds-acc-item" data-open={openZone === 'preview'}>
              <button type="button" className="ds-acc-head" aria-expanded={openZone === 'preview'} onClick={() => setOpenZone(o => (o === 'preview' ? null : 'preview'))}>
                <NavIcon name="show" size={15}/>
                <span>Preview</span>
                <NavIcon name="chevronRight" size={13}/>
              </button>
              {openZone === 'preview' && (
                <div className="ds-acc-body ds-tp-prev">
                  <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Preview mode">
                    <button type="button" role="radio" aria-checked={viewMode !== '3d'} onClick={() => setViewMode?.('2d')}>2D</button>
                    <button type="button" role="radio" aria-checked={viewMode === '3d'} disabled={family?.status3D === 'none'}
                      onClick={() => { setHas3DLoaded?.(true); setViewMode?.('3d'); }}>3D</button>
                  </div>
                  <p className="ds-note" style={{ margin: 0 }}>
                    {family?.status3D === 'none'
                      ? `${cfg.garment} has no verified 3D model yet — the 2D design is the exact preview.`
                      : family?.status3D === 'partial'
                        ? '3D is a quick approximation. Use 2D for exact colors and placement.'
                        : '3D is a quick spatial view. Use 2D for exact colors and placement.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
