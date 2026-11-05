import { Replace, Trash2 } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import { resolveFit } from './garmentCatalog';
import { assetFor, photoZoneNote } from './garmentAssets';
import { isCustom, isParametric } from './customGarment';
import { CustomControls, CustomNote } from './BuildYourOwn';
import TraceControls from './TraceControls';
import { PartButtons, PartStyles, partsFor } from './PartControls';

// Whole uniform: the real design at a glance, a button per part it has, then its layers. Choosing the garment happens in GarmentPicker.
export default function TypePanel({ cfg, setCfg, onPickPart, onOpenTool, onChangeGarment, onRemove, trace = null, setTrace = null, layers = null }) {
  if (!cfg.garment) return null;
  const photo  = assetFor(cfg.garment, cfg.sleeve, 'front', cfg.fit);
  const custom = isParametric(cfg.garment); // a spec-driven shape: build-your-own or a rebuilt family
  const parts  = partsFor(cfg);
  const fit    = resolveFit(cfg.garment, cfg.fit);
  const facts  = [['Category', cfg.category], ['Garment', cfg.garment], ['Fit', fit && fit[0].toUpperCase() + fit.slice(1)], ['Style', cfg.sleeve && `${cfg.sleeve} sleeve`]]
    .filter(([, v]) => v);

  return (
    <div className="ds-tp">
      <header className="ds-wu-head">
        <h3>Whole uniform</h3>
        <div className="ds-tp-change">
          <button type="button" className="ds-btn" onClick={onChangeGarment}><Replace size={15} aria-hidden="true"/>Change garment</button>
          <button type="button" className="ds-tp-clear" onClick={onRemove}><Trash2 size={14} aria-hidden="true"/>Remove</button>
        </div>
      </header>
      <dl className="ds-wu-sum">
        {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>

      <section>
        <PartButtons cfg={cfg} onPick={onPickPart}/>
        {photo && <p className="ds-note">{photoZoneNote(photo)}</p>}
      </section>

      {/* Style options with no colourable part to live under (e.g. a photo base without a sleeve zone) */}
      {!parts.includes('body') && <PartStyles cfg={cfg} setCfg={setCfg} zone="body"/>}
      {!parts.includes('sleeve') && <PartStyles cfg={cfg} setCfg={setCfg} zone="sleeve"/>}

      {trace && setTrace && <TraceControls trace={trace} setTrace={setTrace}/>}

      {custom && (
        <section>
          <p className="ds-h3">Shape</p>
          <CustomControls garment={cfg.garment} spec={cfg.custom} sleeve={cfg.sleeve}
            onSpec={next => setCfg(p => ({ ...p, custom: next }))} onSleeve={sv => setCfg(p => ({ ...p, sleeve: sv }))}/>
          {isCustom(cfg.garment) && <CustomNote/>}
        </section>
      )}

      {!photo && (
        <button type="button" className="ds-part ds-part--link" onClick={() => onOpenTool('pattern')}>
          <NavIcon name="pattern" size={15}/><span className="ds-part-name">Pattern</span><NavIcon name="chevronRight" size={13}/>
        </button>
      )}

      {layers && (
        <section>
          <p className="ds-h3">Layers</p>
          {layers}
        </section>
      )}
    </div>
  );
}
