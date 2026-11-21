// Fabric look picker: which cloth surface the 2D preview, PNG and PDF are lit with. A preview of the weave, not a fabric order.
import { useMemo } from 'react';
import { FABRIC_LOOKS, lookSwatchUrl, normalizeLook } from './fabricLooks';
import './textilePanel.css';

export default function FabricLookPanel({ cfg, setCfg }: any) {
  const cur = normalizeLook(cfg.fabricLook);
  const swatches = useMemo(() => Object.fromEntries(FABRIC_LOOKS.map(l => [l.id, lookSwatchUrl(l.id)])), []);
  const look = FABRIC_LOOKS.find(l => l.id === cur)!;
  return (
    <section className="ds-fab" aria-label="Fabric look">
      <h3 className="ds-fab-h">Fabric look</h3>
      <div className="ds-fab-grid" role="radiogroup" aria-label="Fabric look">
        {FABRIC_LOOKS.map(l => (
          <button key={l.id} type="button" role="radio" aria-checked={cur === l.id} className="ds-fab-opt" title={l.hint}
            onClick={() => setCfg((s: any) => ({ ...s, fabricLook: l.id }))}>
            <span className="ds-fab-sw" style={swatches[l.id] ? { backgroundImage: `url(${swatches[l.id]})` } : undefined} aria-hidden="true"/>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
      <p className="ds-fab-note">{look.hint}. Shown in 2D, PNG and PDF previews. VFRB confirms the real fabric and weight before production.</p>
    </section>
  );
}
