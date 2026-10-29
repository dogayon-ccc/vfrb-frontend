// Community showcase: finished designs other clients chose to share and a VFRB manager approved (GET /api/customer/designs/showcase).
// The server publishes only garment, colours, patterns and details. Opening one goes through deserializeDesign + applyGarment like
// any saved design, and never touches the customer's own logos and text.
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Sparkles, X, CircleAlert } from 'lucide-react';
import GarmentSilhouette from './GarmentSilhouette';
import { deserializeDesign } from './designSerialization';
import { applyGarment, FAMILY_BY_NAME } from './garmentCatalog';
import { garmentLabel } from '../../../utils/designName';

// The other client's look on this customer's design: shape and colours only; name, overlays and set stay the customer's own.
export function openShowcase(p, config) {
  const d = deserializeDesign(config ?? {}).cfg;
  if (!FAMILY_BY_NAME[d.garment]) return p; // only a garment VFRB really offers; anything else leaves the design as it is
  const g = applyGarment(p, d.garment, { sleeve: d.sleeve, fit: d.fit });
  return { ...g, colors: d.colors, patterns: d.patterns, patternParams: d.patternParams, details: d.details, inspirationId: null };
}

export default function ShowcaseGallery({ showShowcase, setShowShowcase, setCfg }) {
  const [designs, setDesigns] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!showShowcase) return;
    setFailed(false);
    axios.get('/api/customer/designs/showcase')
      .then(res => setDesigns(Array.isArray(res.data) ? res.data : []))
      .catch(() => { setDesigns([]); setFailed(true); });
  }, [showShowcase]);

  const load = (d) => { setCfg(p => openShowcase(p, d.config)); setShowShowcase(false); };

  return (
    <AnimatePresence>
      {showShowcase && (
        <motion.div className="ds-show" role="dialog" aria-labelledby="ds-show-h"
          initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0, transition:{ duration:.2, ease:'easeOut' } }}
          exit={{ opacity:0, y:-10, transition:{ duration:.15 } }} style={{ x:'-50%' }}>
          <div className="ds-show-head">
            <div>
              <p id="ds-show-h" className="ds-show-title"><Sparkles size={14} aria-hidden="true" /> Showcase</p>
              <p className="ds-show-sub">Designs other customers chose to share, approved by VFRB. Opening one changes the garment, colours and patterns; your own logos and text stay.</p>
            </div>
            <button type="button" className="ds-show-x" aria-label="Close showcase" onClick={() => setShowShowcase(false)}><X size={16} aria-hidden="true" /></button>
          </div>

          {failed ? (
            <p className="ds-show-empty" role="alert"><CircleAlert size={14} aria-hidden="true" /> The showcase could not be loaded. Close it and try again.</p>
          ) : designs === null ? (
            <p className="ds-show-empty">Loading…</p>
          ) : designs.length === 0 ? (
            <p className="ds-show-empty">Nothing in the showcase yet.</p>
          ) : (
            <div className="ds-show-grid">
              {designs.map(d => (
                <button key={d.id} type="button" className="ds-show-tile" onClick={() => load(d)} aria-label={`Open ${d.label}, ${d.garment}`}>
                  <GarmentSilhouette garment={d.config?.garment} sleeve={d.config?.sleeve ?? 'Short'} fit={d.config?.fit} custom={d.config?.custom} colors={d.config?.colors ?? {}}
                    patterns={d.config?.patterns} patternParams={d.config?.patternParams} details={d.config?.details} width={64} height={78}/>
                  <span className="ds-show-label">{d.label}</span>
                  <span className="ds-show-g">{garmentLabel(d.garment)}</span>
                </button>
              ))}
            </div>
          )}
          <style>{`
            .ds-show{position:absolute;top:60px;left:50%;z-index:var(--cx-z-modal);width:min(700px,calc(100vw - 32px));max-height:calc(100vh - 120px);overflow-y:auto;
              background:var(--cx-card);border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);padding:20px;box-shadow:var(--cx-elev-2)}
            .ds-show-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
            .ds-show-title{display:flex;align-items:center;gap:6px;margin:0;font-size:13px;font-weight:800;color:var(--cx-ink)}
            .ds-show-sub{margin:2px 0 0;font-size:11px;line-height:1.5;color:var(--cx-ink-2)}
            .ds-show-x{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border:0;border-radius:var(--cx-r-md);background:var(--cx-hover);color:var(--cx-ink-2);cursor:pointer}
            .ds-show-empty{display:flex;align-items:center;justify-content:center;gap:6px;margin:0;padding:20px 0;font-size:12px;color:var(--cx-ink-2)}
            .ds-show-empty[role=alert]{color:var(--danger-text)}
            .ds-show-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
            .ds-show-tile{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px 10px;border-radius:var(--cx-r-md);border:1px solid var(--cx-line);
              background:var(--cx-paper);cursor:pointer;font:inherit;color:inherit}
            .ds-show-tile:hover{border-color:var(--cx-thread)}
            .ds-show-x:focus-visible,.ds-show-tile:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px}
            .ds-show-label{font-size:12px;font-weight:700;color:var(--cx-ink);text-align:center;overflow-wrap:anywhere}
            .ds-show-g{font-size:11px;color:var(--cx-ink-2)}
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
