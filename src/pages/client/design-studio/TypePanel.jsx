import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { BASE_PATHS } from './garmentPaths';
import { CATALOG, familyFor, neighborFamily, STATUS_3D_LABEL } from './garmentCatalog';

// Garment picker — laid out after the wireframes' "Garment" panel: category
// cards on top, a visual garment grid, then collapsible Sleeve / Fit groups.
// Every option comes from the real CATALOG (garmentCatalog.js); nothing here
// invents a garment, style or fit. Styling lives in DesignStudioStyles.jsx
// (.ds-tp-*) so hover/press/selected transitions are CSS-driven and honour
// prefers-reduced-motion in one place.

function GarmentThumb({ paths, colors, size = 56 }) {
  return (
    <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width={size} height={Math.round(size * 1.18)} aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.body    && <path d={paths.body}    fill={colors.body   ?? '#1e3a5f'} stroke="rgba(15,23,42,.18)" strokeWidth="1.5"/>}
      {paths.collar  && <path d={paths.collar}  fill={colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
      {paths.sleeveL && <path d={paths.sleeveL} fill={colors.sleeve ?? colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
      {paths.sleeveR && <path d={paths.sleeveR} fill={colors.sleeve ?? colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
      {paths.pocket  && <path d={paths.pocket}  fill={colors.pocket ?? colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.12)" strokeWidth="0.5"/>}
    </svg>
  );
}

function Group({ title, value, open, onToggle, children }) {
  const reduce = useReducedMotion();
  return (
    <section className="ds-tp-group">
      <button type="button" className="ds-tp-group-head" aria-expanded={open} onClick={onToggle}>
        <span>{title}</span>
        <span className="ds-tp-group-val">{value}</span>
        <NavIcon name="chevronDown" size={14}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: reduce ? 'none' : 'transform .18s' }}/>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" style={{ overflow: 'hidden' }}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}>
            <div className="ds-tp-group-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function TypePanel({ cfg, setCfg }) {
  const reduce  = useReducedMotion();
  const catData = CATALOG.find(c => c.id === cfg.category) ?? CATALOG[0];
  const family  = familyFor(cfg.garment);
  const sleeves = family?.styles ?? [];
  const hasFit  = (family?.fits.length ?? 0) > 1;
  const [openSleeve, setOpenSleeve] = useState(true);
  const [openFit, setOpenFit]       = useState(true);

  const goNeighbor = (dir) => {
    const next = neighborFamily(cfg.category, cfg.garment, dir);
    if (!next) return;
    setCfg(p => ({ ...p, garment: next.id, sleeve: next.defaultStyle, fit: next.fits.length > 1 ? (p.fit ?? 'male') : undefined }));
  };

  return (
    <div className="ds-tp">
      <p className="ds-h3">Category</p>
      <div className="ds-tp-cats" role="tablist" aria-label="Uniform category">
        {CATALOG.map(c => {
          const on = cfg.category === c.id;
          return (
            <button key={c.id} type="button" role="tab" aria-selected={on} className="ds-tp-cat"
              onClick={() => setCfg(p => ({ ...p, category: c.id, garment: c.families[0].id, sleeve: c.families[0].defaultStyle }))}>
              <NavIcon name={c.icon} size={18}/>
              <span>{c.id.split('/')[0].trim()}</span>
            </button>
          );
        })}
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

      {/* Keyed on category so switching category cross-fades the grid. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={catData.id} className="ds-tp-grid"
          initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={{ duration: reduce ? 0 : 0.16 }}>
          {catData.families.map(fam => {
            const g = fam.id;
            const paths = BASE_PATHS[g] ?? BASE_PATHS['Polo Shirt'];
            const sel = cfg.garment === g;
            const st = STATUS_3D_LABEL[fam.status3D];
            return (
              <button key={g} type="button" className="ds-tp-card" aria-pressed={sel}
                title={sel ? `${g} — click to remove` : `${g}${st ? ` — ${st.label}` : ''}`}
                onClick={() => setCfg(p => (sel
                  ? { ...p, garment: null }
                  : { ...p, garment: g, sleeve: fam.defaultStyle, fit: fam.fits.length > 1 ? (p.fit ?? 'male') : undefined }))}>
                <AnimatePresence>
                  {sel && (
                    <motion.span className="ds-tp-check" aria-hidden="true"
                      initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
                      <NavIcon name="success" size={12} color="#fff"/>
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="ds-tp-thumb"><GarmentThumb paths={paths} colors={cfg.colors}/></span>
                <span className="ds-tp-name">{g}</span>
                {st && <span className="ds-tp-chip" data-tone={st.tone}>{st.label}</span>}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {!cfg.garment && (
        <p className="ds-note" style={{ marginTop: 0 }}>Tap a garment to place it on the canvas.</p>
      )}

      {sleeves.length > 0 && (
        <Group title="Sleeve" value={cfg.sleeve} open={openSleeve} onToggle={() => setOpenSleeve(o => !o)}>
          <div className="ds-chips">
            {sleeves.map(s => (
              <button key={s} type="button" className="ds-chip" aria-pressed={cfg.sleeve === s}
                title={family?.status3D !== 'none' && !family?.sleeves3D?.includes(s) ? `${s} sleeve is 2D only — the 3D model has ${family?.sleeves3D?.join(' / ').toLowerCase()} sleeves` : undefined}
                onClick={() => setCfg(p => ({ ...p, sleeve: s }))}>
                {s}{family?.status3D !== 'none' && !family?.sleeves3D?.includes(s) && <span className="ds-chip-note"> · 2D</span>}
              </button>
            ))}
          </div>
        </Group>
      )}

      {hasFit && (
        <Group title="Fit" value={(cfg.fit ?? 'male') === 'female' ? 'Female' : 'Male'} open={openFit} onToggle={() => setOpenFit(o => !o)}>
          <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Garment fit">
            {[['male', 'Male'], ['female', 'Female']].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={(cfg.fit ?? 'male') === id}
                onClick={() => setCfg(p => ({ ...p, fit: id }))}>{label}</button>
            ))}
          </div>
          <p className="ds-note">Switches the 3D model between the male and female cut.</p>
        </Group>
      )}
    </div>
  );
}
