import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Replace, Trash2 } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import { SwatchGrid, colourName } from './SwatchGrid';
import { withBody } from './colorRules';
import { familyFor, resolveFit } from './garmentCatalog';
import { sleeves3DFor } from './garmentCapabilities';
import { ZONE_LABEL, zonesFor } from './dsShared';
import { assetFor, photoZoneNote } from './garmentAssets';
import { isCustom } from './customGarment';
import { CustomControls, CustomNote } from './BuildYourOwn';
import TraceControls from './TraceControls';

// Properties of the chosen garment. Choosing or changing the garment happens in the one GarmentPicker (canvas or modal).
export default function TypePanel({ cfg, setCfg, setActiveZone, onOpenTool, onChangeGarment, trace = null, setTrace = null }) {
  const reduce  = useReducedMotion();
  const [openZone, setOpenZone] = useState(null);
  const family  = familyFor(cfg.garment);
  const sleeves = family?.styles ?? [];
  const photo   = cfg.garment ? assetFor(cfg.garment, cfg.sleeve, 'front', cfg.fit) : null;
  // A sketch (opened from scratch) only offers fits that keep it a sketch; a photo design only the fits that keep a photo. Photos stay
  // in the reference workflow, so a Fit click can never swap a scratch sketch for a photograph.
  const fits    = (family?.fits ?? []).filter(f => !!assetFor(cfg.garment, cfg.sleeve, 'front', f) === !!photo);
  const hasFit  = fits.length > 1 && (family.status3D !== 'none' || !!photo);
  const custom  = isCustom(cfg.garment);
  // A sleeve change keeps a sketch a sketch: where that sleeve's current fit is a photo base, the sketch's own vector fit is used instead.
  const pickSleeve = sv => setCfg(p => {
    const toPhoto = !photo && !!assetFor(p.garment, sv, 'front', p.fit);
    return { ...p, sleeve: sv, ...(toPhoto ? { fit: family.fits.find(f => !assetFor(p.garment, sv, 'front', f)) ?? p.fit } : {}) };
  });
  const zones   = cfg.garment ? zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => z !== 'body' && (z !== 'tipping' || cfg.colors.tipping)) : [];
  const body    = (cfg.colors.body ?? '').toLowerCase();

  const toggleZone = (z) => { setOpenZone(o => (o === z ? null : z)); setActiveZone(z); };
  const setZoneColor = (z, hex) => setCfg(p => ({ ...p, colors: { ...p.colors, [z]: hex } }));

  return (
    <div className="ds-tp">
      {cfg.garment && (
        <div className="ds-tp-change">
          <button type="button" className="ds-btn" onClick={onChangeGarment}><Replace size={15} aria-hidden="true"/>Change garment</button>
          <button type="button" className="ds-tp-clear" onClick={() => setCfg(p => ({ ...p, garment: null }))}><Trash2 size={14} aria-hidden="true"/>Remove</button>
        </div>
      )}

      {cfg.garment && (
        <>
          {hasFit && (
            <section>
              <p className="ds-h3">Fit</p>
              <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Garment fit">
                {fits.map(id => [id, id[0].toUpperCase() + id.slice(1)]).map(([id, label]) => (
                  <button key={id} type="button" role="radio" aria-checked={resolveFit(family.id, cfg.fit) === id}
                    onClick={() => setCfg(p => ({ ...p, fit: id }))}>{label}</button>
                ))}
              </div>
            </section>
          )}

          {trace && setTrace && <TraceControls trace={trace} setTrace={setTrace}/>}

          {custom && (
            <section>
              <p className="ds-h3">Shape</p>
              <CustomControls garment={cfg.garment} spec={cfg.custom} sleeve={cfg.sleeve}
                onSpec={next => setCfg(p => ({ ...p, custom: next }))} onSleeve={sv => setCfg(p => ({ ...p, sleeve: sv }))}/>
              <CustomNote/>
            </section>
          )}

          {!custom && (sleeves.length === 1 || (sleeves.length > 1 && !zones.includes('sleeve'))) && (
            <section>
              <p className="ds-h3">Sleeve</p>
              {sleeves.length === 1
                ? <p className="ds-note" style={{ marginTop: 0 }}>Comes in {sleeves[0].toLowerCase()} sleeve only.</p>
                : (
                  <div className="ds-chips">
                    {sleeves.map(s => {
                      const only2D = family.status3D !== 'none' && !sleeves3DFor(family.id, cfg.fit).includes(s);
                      return (
                        <button key={s} type="button" className="ds-chip" aria-pressed={cfg.sleeve === s}
                          title={only2D ? `${s} sleeve is 2D only — the 3D model has ${sleeves3DFor(family.id, cfg.fit).join(' / ').toLowerCase()} sleeves` : undefined}
                          onClick={() => pickSleeve(s)}>
                          {s}{only2D && <span className="ds-chip-note"> · 2D</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
            </section>
          )}

          <section>
            <p className="ds-h3">Base colour: <span className="ds-h3-val">{colourName(cfg.colors.body)}</span></p>
            <SwatchGrid label="Base" current={body} onPick={hex => setCfg(p => ({ ...p, colors: withBody(p.colors, hex) }))}/>
          </section>

          <div className="ds-acc" role="group" aria-label="Refine the design">
            {zones.map(z => {
              const open = openZone === z;
              const cur = (cfg.colors[z] ?? '').toLowerCase();
              // On a photo base the collar zone is the whole trim (collar band, cuffs, pocket welts); the dot shows the photo's own trim until a colour is picked.
              const label = photo?.trim && z === 'collar' ? 'Trim' : ZONE_LABEL[z];
              const dot = photo?.trim && z === 'collar' && cur === photo.trimUnset ? '#3c3c3c' : (cfg.colors[z] ?? 'var(--bg-surface)');
              return (
                <div key={z} className="ds-acc-item" data-open={open}>
                  <button type="button" className="ds-acc-head" aria-expanded={open} onClick={() => toggleZone(z)}>
                    <span className="ds-zone-dot" style={{ background: dot }}/>
                    <span>{label}</span>
                    <NavIcon name="chevronRight" size={13}/>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div className="ds-acc-body" initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.18 }}>
                        {z === 'sleeve' && sleeves.length > 1 && !custom && (
                          <div className="ds-chips" style={{ padding: '4px 14px 10px' }}>
                            {sleeves.map(sv => {
                              const only2D = family.status3D !== 'none' && !sleeves3DFor(family.id, cfg.fit).includes(sv);
                              return (
                                <button key={sv} type="button" className="ds-chip" aria-pressed={cfg.sleeve === sv}
                                  title={only2D ? `${sv} sleeve is 2D only` : undefined}
                                  onClick={() => pickSleeve(sv)}>
                                  {sv}{only2D && <span className="ds-chip-note"> · 2D</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="ds-acc-sw"><SwatchGrid label={label} current={cur} onPick={hex => setZoneColor(z, hex)}/></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {photo
              ? <p className="ds-note" style={{ margin: '4px 2px 8px' }}>{photoZoneNote(photo)}</p>
              : (
                <div className="ds-acc-item">
                  <button type="button" className="ds-acc-head" onClick={() => onOpenTool('pattern')}>
                    <NavIcon name="pattern" size={15}/>
                    <span>Pattern</span>
                    <NavIcon name="chevronRight" size={13}/>
                  </button>
                </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}
