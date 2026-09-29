import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { BASE_PATHS } from './garmentPaths';
import GarmentThumb from './GarmentThumb';
import { selectFamily } from './selectGarment';
import { CATALOG, familyFor, neighborFamily, STATUS_3D_LABEL } from './garmentCatalog';
import { PH_SWATCHES, ZONE_LABEL, zonesFor } from './dsShared';

// Options come from the canonical CATALOG only; nothing here invents a garment, style or fit.
export default function TypePanel({ cfg, setCfg, setActiveZone, onOpenTool }) {
  const reduce  = useReducedMotion();
  const catData = CATALOG.find(c => c.id === cfg.category) ?? CATALOG[0];
  const family  = familyFor(cfg.garment);
  const sleeves = family?.styles ?? [];
  const hasFit  = (family?.fits.length ?? 0) > 1;
  const zones   = cfg.garment ? zonesFor(cfg.garment, cfg.sleeve).filter(z => z !== 'body' && (z !== 'tipping' || cfg.colors.tipping)) : [];
  const body    = (cfg.colors.body ?? '').toLowerCase();

  const goNeighbor = (dir) => {
    const next = neighborFamily(cfg.category, cfg.garment, dir);
    if (next) selectFamily(setCfg, next);
  };
  const refine = (zone) => { if (zone) setActiveZone(zone); onOpenTool(zone ? 'color' : 'pattern'); };

  return (
    <div className="ds-tp">
      <div className="ds-tp-catbar" role="tablist" aria-label="Uniform category">
        {CATALOG.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={cfg.category === c.id} className="ds-tp-catchip"
            onClick={() => setCfg(p => ({ ...p, category: c.id, garment: c.families[0].id, sleeve: c.families[0].defaultStyle }))}>
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

          {sleeves.length > 0 && (
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

          <nav className="ds-jump" aria-label="Refine the design">
            {zones.map(z => (
              <button key={z} type="button" onClick={() => refine(z)}>
                <span className="ds-zone-dot" style={{ background: cfg.colors[z] ?? 'var(--bg-surface)' }}/>
                <span>{ZONE_LABEL[z]} color</span>
                <NavIcon name="chevronRight" size={13}/>
              </button>
            ))}
            <button type="button" onClick={() => refine(null)}>
              <NavIcon name="pattern" size={15}/>
              <span>Pattern</span>
              <NavIcon name="chevronRight" size={13}/>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
