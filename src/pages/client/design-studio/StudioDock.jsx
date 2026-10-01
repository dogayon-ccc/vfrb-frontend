import { NavIcon } from '../../../components/ui/icons';
import GarmentSilhouette from './GarmentSilhouette';
import { zonesFor } from './dsShared';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';

export default function StudioDock({ cfg, saved, saving, saveErr, draftSaved, saveDesign, orderThis, ordering, onOpenTool, layerCount = 0, face = 'front' }) {
  const zones = zonesFor(cfg.garment, cfg.sleeve).filter(z => z !== 'tipping' || cfg.colors.tipping);
  const st = STATUS_3D_LABEL[familyFor(cfg.garment)?.status3D];
  const details = [zones.includes('sleeve') && cfg.sleeve && `${cfg.sleeve} sleeve`, cfg.category].filter(Boolean).join(' · ');
  const state = saving ? 'Saving…' : saveErr ? 'Not saved — retry' : draftSaved ? 'Saved to your account' : saved ? 'Saved on this device' : null;

  return (
    <footer className="ds-dock" aria-label="Save and order">
      {cfg.garment ? (
        <div className="ds-dock-head">
          <span className="ds-dock-thumb">
            <GarmentSilhouette garment={cfg.garment} sleeve={cfg.sleeve} colors={cfg.colors} width={34} height={42}/>
          </span>
          <div className="ds-dock-title">
            <strong>{cfg.name?.trim() || cfg.garment}</strong>
            <span>{[details, `${layerCount} ${layerCount === 1 ? 'layer' : 'layers'} · ${face}`].filter(Boolean).join(' · ')}</span>
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
      <p className="ds-dock-state" role="status" aria-live="polite" data-tone={saveErr ? 'err' : state ? 'ok' : undefined}>{state ?? '\u00a0'}</p>
      <div className="ds-dock-actions">
        <button type="button" className="ds-act" onClick={saveDesign} disabled={!cfg.garment || saving} aria-busy={!!saving}>
          {saving ? <span className="ds-spin"/> : <NavIcon name={saved || draftSaved ? 'success' : 'save'} size={16}/>} {saving ? 'Saving' : 'Save'}
        </button>
        <button type="button" className="ds-act ds-act--primary" onClick={orderThis}
          disabled={!cfg.garment || ordering} aria-busy={!!ordering}
          title={cfg.garment ? undefined : 'Pick a garment first'}>
          {ordering
            ? <><span className="ds-spin" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }}/> Preparing…</>
            : <>Order this design <NavIcon name="chevronRight" size={14}/></>}
        </button>
      </div>
    </footer>
  );
}
