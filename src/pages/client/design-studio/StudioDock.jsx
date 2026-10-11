// Sticky save/order dock: Save and "Order this design" always in reach; PNG/PDF live behind a secondary Export toggle.
import { useState } from 'react';
import { Save, Check, ChevronRight, MoreHorizontal, Image as ImageIcon, FileText } from 'lucide-react';
import { NavIcon } from '../../../components/ui/icons';
import GarmentSilhouette from './GarmentSilhouette';
import { zonesFor } from './dsShared';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';
import { NO_FAMILY_3D } from './garmentCapabilities';

export default function StudioDock({ cfg, saved, saving, saveErr, draftSaved, saveDesign, orderThis, ordering, onOpenTool, downloadImage, downloadPdf, exporting, onNeedRoom, layerCount = 0, face = 'front' }) {
  const [exportOpen, setExportOpen] = useState(false);
  const zones = zonesFor(cfg.garment, cfg.sleeve, cfg.fit).filter(z => z !== 'tipping' || cfg.colors.tipping);
  const st = NO_FAMILY_3D.has(cfg.inspirationId) ? null : STATUS_3D_LABEL[familyFor(cfg.garment)?.status3D];
  const details = [zones.includes('sleeve') && cfg.sleeve && `${cfg.sleeve} sleeve`, cfg.category].filter(Boolean).join(' · ');
  // Account vs browser-only saves are never shown the same way: a failed account save that kept a browser copy says so.
  const state = saving ? 'Saving…' : saveErr ? (saveErr === 'local' ? 'On this device only — account save failed, retry' : 'Not saved — retry') : draftSaved ? 'Saved to your account' : saved ? 'Saved on this device' : null;
  const toggleExport = () => { setExportOpen(o => !o); onNeedRoom?.(); };

  return (
    <footer className="ds-dock" aria-label="Save and order">
      {cfg.garment ? (
        <div className="ds-dock-head">
          <span className="ds-dock-thumb">
            <GarmentSilhouette garment={cfg.garment} sleeve={cfg.sleeve} fit={cfg.fit} colors={cfg.colors} width={34} height={42}/>
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
      <p className="ds-dock-state" role="status" aria-live="polite" data-tone={saveErr ? 'err' : state ? 'ok' : undefined}>{state ?? ' '}</p>
      <div className="ds-dock-actions">
        <button type="button" className="ds-act" onClick={saveDesign} disabled={!cfg.garment || saving} aria-busy={!!saving}>
          {saving ? <span className="ds-spin"/> : saved || draftSaved ? <Check size={16} aria-hidden="true"/> : <Save size={16} aria-hidden="true"/>} {saving ? 'Saving' : 'Save'}
        </button>
        <button type="button" className="ds-act ds-act--primary" onClick={orderThis}
          disabled={!cfg.garment || ordering} aria-busy={!!ordering}
          title={cfg.garment ? undefined : 'Pick a garment first'}>
          {ordering
            ? <><span className="ds-spin ds-spin--on-thread"/> Preparing…</>
            : <>Order this design <ChevronRight size={16} aria-hidden="true"/></>}
        </button>
        {downloadImage && (
          <button type="button" className="ds-act ds-act--icon" onClick={toggleExport} disabled={!cfg.garment}
            aria-expanded={exportOpen} aria-controls="ds-export" aria-label="Export: PNG or PDF" title="Export PNG or PDF">
            <MoreHorizontal size={18} aria-hidden="true"/>
          </button>
        )}
      </div>
      {downloadImage && exportOpen && cfg.garment && (
        <div className="ds-dock-export" id="ds-export" role="group" aria-label="Export design">
          <button type="button" className="ds-act" onClick={downloadImage} disabled={!!exporting} aria-busy={exporting === 'png'} title="Transparent PNG of every view">
            {exporting === 'png' ? <span className="ds-spin"/> : <ImageIcon size={15} aria-hidden="true"/>} PNG image
          </button>
          <button type="button" className="ds-act" onClick={downloadPdf} disabled={!!exporting} aria-busy={exporting === 'pdf'} title="A4 spec sheet with views, colours and details">
            {exporting === 'pdf' ? <span className="ds-spin"/> : <FileText size={15} aria-hidden="true"/>} PDF spec sheet
          </button>
        </div>
      )}
    </footer>
  );
}
