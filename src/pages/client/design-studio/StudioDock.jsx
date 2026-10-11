// Sticky save/order dock: Save and "Order this design" always in reach; PNG/PDF live behind a secondary Export toggle.
import { useState } from 'react';
import { Save, Check, ChevronRight, MoreHorizontal, Image as ImageIcon, FileText } from 'lucide-react';
import { familyFor, STATUS_3D_LABEL } from './garmentCatalog';
import { NO_FAMILY_3D } from './garmentCapabilities';

export default function StudioDock({ cfg, saved, saving, saveErr, draftSaved, saveDesign, orderThis, ordering, downloadImage, downloadPdf, exporting, onNeedRoom }) {
  const [exportOpen, setExportOpen] = useState(false);
  const st = NO_FAMILY_3D.has(cfg.inspirationId) ? null : STATUS_3D_LABEL[familyFor(cfg.garment)?.status3D];
  // Account vs browser-only saves are never shown the same way: a failed account save that kept a browser copy says so.
  const state = saving ? 'Saving…' : saveErr ? (saveErr === 'local' ? 'On this device only — account save failed, retry' : 'Not saved — retry') : draftSaved ? 'Saved to your account' : saved ? 'Saved on this device' : null;
  const toggleExport = () => { setExportOpen(o => !o); onNeedRoom?.(); };

  return (
    <footer className="ds-dock" aria-label="Save and order">
      {/* Category and 3D status live here only; the garment name is the canvas chip, the design name the top bar */}
      {cfg.garment && <p className="ds-dock-sub">{[cfg.category, st?.label].filter(Boolean).join(' · ')}</p>}
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
