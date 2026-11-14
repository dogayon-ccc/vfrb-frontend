import { useLayoutEffect, useRef, useState } from 'react';
import { ZONE_LABEL, zonesFor } from './dsShared';
import { getGarmentPaths } from './garmentPaths';
import { assetFor } from './garmentAssets';
import { familyFor, resolveFit } from './garmentCatalog';
import { sleeves3DFor } from './garmentCapabilities';
import { isParametric } from './customGarment';
import { colourName } from './SwatchGrid';

// Parts the customer can colour on this garment; a hidden patch pocket is not offered.
export const partsFor = cfg => (cfg.garment ? zonesFor(cfg.garment, cfg.sleeve, cfg.fit) : [])
  .filter(z => z !== 'pocket' || cfg.details?.patchPocket?.show !== false);

const photoOf = cfg => (cfg.garment ? assetFor(cfg.garment, cfg.sleeve, 'front', cfg.fit) : null);

// On a photo base with a trim mask the collar zone recolours the whole trim (band, cuffs, welts), so it is called Trim.
export const partLabel = (cfg, z) => (photoOf(cfg)?.trim && z === 'collar' ? 'Trim' : ZONE_LABEL[z] ?? z);

function partDot(cfg, z) {
  const photo = photoOf(cfg), cur = cfg.colors?.[z];
  if (photo?.trim && z === 'collar' && (cur ?? '').toLowerCase() === photo.trimUnset) return '#3c3c3c';
  return cur ?? 'var(--cx-paper-2)';
}

// Real style options: fits that keep a sketch a sketch (or a photo a photo), and the family's own sleeve styles.
export function styleOptions(cfg) {
  const family = familyFor(cfg.garment), photo = photoOf(cfg);
  const fits = (family?.fits ?? []).filter(f => !!assetFor(cfg.garment, cfg.sleeve, 'front', f) === !!photo);
  return {
    family,
    fits: fits.length > 1 && (family.status3D !== 'none' || !!photo) ? fits : [],
    sleeves: isParametric(cfg.garment) ? [] : family?.styles ?? [],
  };
}

// A sleeve change keeps a sketch a sketch: where that sleeve's current fit is a photo base, the sketch's own vector fit is used.
const withSleeve = (p, sv, family, photo) => {
  const toPhoto = !photo && !!assetFor(p.garment, sv, 'front', p.fit);
  return { ...p, sleeve: sv, ...(toPhoto ? { fit: family.fits.find(f => !assetFor(p.garment, sv, 'front', f)) ?? p.fit } : {}) };
};

const PIECE_PATH = { body: 'body', collar: 'collar', sleeve: 'sleeveL', pocket: 'pocket' };

// One cut piece cropped to its own shape; the box comes from the rendered path, so any path command works.
function PieceThumb({ d, fill }: any) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    try { const b = ref.current.getBBox(); if (b.width) setBox(`${b.x} ${b.y} ${b.width} ${b.height}`); } catch { setBox(null); }
  }, [d]);
  return <svg className="ds-piece" viewBox={box ?? undefined} aria-hidden="true"><path ref={ref} d={d} style={{ fill }}/></svg>;
}

export function PartButtons({ cfg, active = null, onPick }: any) {
  const paths = cfg.garment && !photoOf(cfg) ? getGarmentPaths(cfg.garment, cfg.sleeve) : null;
  return (
    <>
    <h3 className="ds-pieces-h">Cut pieces</h3>
    <p className="ds-pieces-sub">Colours for each piece</p>
    <div className="ds-parts" role="group" aria-label="Cut pieces">
      {partsFor(cfg).map(z => {
        const off = z === 'tipping' && !cfg.colors?.tipping, d = paths?.[PIECE_PATH[z]];
        return (
          <button key={z} type="button" className="ds-part" aria-pressed={active ? active === z : undefined} onClick={() => onPick(z)}>
            {d ? <PieceThumb d={d} fill={partDot(cfg, z)}/>
              : <span className="ds-zone-sw" data-off={off || undefined} style={off ? undefined : { background: partDot(cfg, z) }} aria-hidden="true"/>}
            <span className="ds-part-name">{partLabel(cfg, z)}</span>
            <span className="ds-part-val">{off ? 'Off' : colourName(cfg.colors?.[z])}</span>
          </button>
        );
      })}
    </div>
    </>
  );
}

// Fit for the body, sleeve styles for the sleeve; nothing for a part with no real style data.
export function PartStyles({ cfg, setCfg, zone }: any) {
  const { family, fits, sleeves } = styleOptions(cfg);
  if (zone === 'body' && fits.length) {
    return (
      <section className="ds-part-sec">
        <p className="ds-h3">Pattern fit <small className="ds-note">sizing only, not a different 3D model</small></p>
        <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Pattern fit">
          {fits.map(id => (
            <button key={id} type="button" role="radio" aria-checked={resolveFit(family.id, cfg.fit) === id}
              onClick={() => setCfg(p => ({ ...p, fit: id }))}>{id[0].toUpperCase() + id.slice(1)}</button>
          ))}
        </div>
      </section>
    );
  }
  if (zone !== 'sleeve' || !sleeves.length) return null;
  const in3D = family.status3D !== 'none' ? sleeves3DFor(family.id, cfg.fit) : null;
  return (
    <section className="ds-part-sec">
      <p className="ds-h3">Sleeve style</p>
      {sleeves.length === 1
        ? <p className="ds-note" style={{ marginTop: 0 }}>Comes in {sleeves[0].toLowerCase()} sleeve only.</p>
        : (
          <div className="ds-chips" role="group" aria-label="Sleeve style">
            {sleeves.map(sv => {
              const only2D = !!in3D && !in3D.includes(sv);
              return (
                <button key={sv} type="button" className="ds-chip" aria-pressed={cfg.sleeve === sv}
                  title={only2D ? `${sv} sleeve is 2D only — the 3D model has ${in3D.join(' / ').toLowerCase()} sleeves` : undefined}
                  onClick={() => setCfg(p => withSleeve(p, sv, family, photoOf(cfg)))}>
                  {sv}{only2D && <span className="ds-chip-note"> · 2D</span>}
                </button>
              );
            })}
          </div>
        )}
    </section>
  );
}
