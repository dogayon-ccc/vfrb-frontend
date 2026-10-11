// First run: real VFRB photos from the gallery manifest, centred on the stage, each with its honest status, plus "Upload my design".
import { useRef } from 'react';
import { Upload, Images, X } from 'lucide-react';
import { ENTRIES, TIER_LABEL } from './designGallery';

// Only photos that open in the editor; inspiration-only photos stay in the full gallery.
const PICKS = ENTRIES.filter(d => d.editable2D);

export default function FirstRunGallery({ onPick, onUpload, onBrowseAll, pendingArt, onCancelArt }) {
  const file = useRef(null);
  return (
    <section className="ds-first" aria-labelledby="ds-first-h">
      <header className="ds-first-head">
        <h2 id="ds-first-h">{pendingArt ? 'Now choose the garment for your design' : 'Start from a VFRB garment'}</h2>
        <p>{pendingArt ? <>Your file <strong>{pendingArt.name}</strong> goes on the garment you pick.</> : 'Uniforms we have made. Each card says what it can do here.'}</p>
        {pendingArt && <button type="button" className="ds-first-link" onClick={onCancelArt}><X size={15} aria-hidden="true" />Cancel upload</button>}
      </header>
      <ul className="ds-first-grid">
        {!pendingArt && (
          <li>
            <button type="button" className="ds-first-card ds-first-up" onClick={() => file.current?.click()}>
              <span className="ds-first-img"><Upload size={28} strokeWidth={1.8} aria-hidden="true" /></span>
              <strong>Upload my design</strong>
              <span className="ds-first-tier">PNG, JPG, WEBP or SVG, up to 5 MB</span>
            </button>
            <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }} />
          </li>
        )}
        {PICKS.map((d, i) => {
          const tier = TIER_LABEL[d.tier];
          return (
            <li key={d.id} style={{ '--i': Math.min(i, 8) }}>
              <button type="button" className="ds-first-card" onClick={() => onPick(d)} title={tier.note} aria-label={`${d.label}, ${tier.label}`}>
                <span className="ds-first-img"><img src={d.thumb} alt="" loading="lazy" decoding="async" /></span>
                <strong>{d.label}</strong>
                <span className="ds-first-tier" data-tone={tier.tone}>{tier.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="ds-first-link" onClick={onBrowseAll}><Images size={16} aria-hidden="true" />Browse all photos, including inspiration only</button>
    </section>
  );
}
