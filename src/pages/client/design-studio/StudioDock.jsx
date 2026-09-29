import { NavIcon } from '../../../components/ui/icons';
import GarmentSilhouette from './GarmentSilhouette';
import { zonesFor } from './dsShared';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';

export default function StudioDock({ cfg, saved, saveDesign, orderThis, ordering, onOpenTool, layerCount = 0, face = 'front' }) {
  const zones = zonesFor(cfg.garment, cfg.sleeve).filter(z => z !== 'tipping' || cfg.colors.tipping);
  const st = STATUS_3D_LABEL[familyFor(cfg.garment)?.status3D];
  const details = [zones.includes('sleeve') && cfg.sleeve && `${cfg.sleeve} sleeve`, cfg.category].filter(Boolean).join(' · ');
  const facts = [
    [!!cfg.garment, cfg.garment ? 'Garment' : 'No garment'],
    [zones.length > 0, `${zones.length} color ${zones.length === 1 ? 'zone' : 'zones'}`],
    [layerCount > 0, `${layerCount} ${layerCount === 1 ? 'layer' : 'layers'} · ${face}`],
  ];

  return (
    <footer className="ds-dock" aria-label="Design summary and order">
      {cfg.garment ? (
        <div className="ds-dock-head">
          <span className="ds-dock-thumb">
            <GarmentSilhouette garment={cfg.garment} sleeve={cfg.sleeve} colors={cfg.colors} width={34} height={42}/>
          </span>
          <div className="ds-dock-title">
            <strong>{cfg.name?.trim() || cfg.garment}</strong>
            <span>{cfg.name?.trim() ? `${cfg.garment} · ${details}` : details}</span>
          </div>
          {st && <span className="ds-tp-chip" data-tone={st.tone}>{st.label}</span>}
        </div>
      ) : (
        <div className="ds-dock-empty">
          <NavIcon name="garmentType" size={18}/>
          <span>No garment yet</span>
          <button type="button" className="ds-btn" onClick={() => onOpenTool('type')}>Choose one</button>
        </div>
      )}

      {cfg.garment && (
        <div className="ds-dock-more">
          <ul className="ds-dock-facts">
            {facts.map(([ok, label]) => (
              <li key={label} data-ok={ok ? 'true' : 'false'}>
                <NavIcon name={ok ? 'success' : 'pending'} size={12}/> {label}
              </li>
            ))}
          </ul>
          <div className="ds-dock-mat">
            <NavIcon name="materials" size={16}/>
            <p><strong>Raw materials</strong>After you order, AI suggests fabric, thread and trim types for this design.</p>
          </div>
        </div>
      )}

      <div className="ds-dock-actions">
        <button type="button" className="ds-act" onClick={saveDesign} disabled={!cfg.garment}>
          <NavIcon name={saved ? 'success' : 'save'} size={16}/> {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" className="ds-act ds-act--primary" onClick={orderThis}
          disabled={!cfg.garment || ordering} aria-busy={!!ordering}>
          {ordering
            ? <><span className="ds-spin" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }}/> Preparing…</>
            : <>Order this design <NavIcon name="chevronRight" size={14}/></>}
        </button>
      </div>
    </footer>
  );
}
