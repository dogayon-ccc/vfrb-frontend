// src/pages/customer/design-studio/LogoPanel.jsx
// Extracted from DesignStudio.jsx (Task E cleanup, Aug 31 2026) — second
// slice of the file-size breakdown, same pattern as LayersPanel.jsx.
import { useRef, useState } from 'react';
import { removeLogoBackground } from '../../../lib/bgRemove';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel, placementsFor } from './dsShared';

export default function LogoPanel({ cfg, onAdd }) {
  const fileRef   = useRef(null);
  const [drag,    setDrag]    = useState(false);
  const [preview, setPreview] = useState(null);
  const [preset,  setPreset]  = useState('left_chest');
  const presets = placementsFor(cfg.garment, cfg.sleeve);
  const placement = presets.some(p => p.id === preset) ? preset : presets[0].id;
  // Task 2 (logo auto-transparency): background removal runs client-side
  // and the RMBG-1.4 model is ~176MB on first use in a browser (cached
  // after) — this can take a few seconds to tens of seconds, so the
  // customer needs to see *something* is happening, not a frozen panel.
  const [removingBg, setRemovingBg] = useState(false);

  const handle = async file => {
    if (!file) return;
    const ok = ['image/png','image/svg+xml','image/jpeg','image/webp'];
    if (!ok.includes(file.type)) { alert('PNG, SVG, JPG only'); return; }
    if (file.size > 5*1024*1024) { alert('Max 5 MB'); return; }

    // SVGs are already vector/transparent by nature — running raster
    // background removal on one would just rasterize it for no benefit,
    // so skip straight to the original path for that type only.
    let toAdd = file;
    if (file.type !== 'image/svg+xml') {
      setRemovingBg(true);
      try {
        toAdd = await removeLogoBackground(file);
      } finally {
        setRemovingBg(false);
      }
    }

    const r = new FileReader();
    r.onload = e => { setPreview(e.target.result); onAdd(e.target.result, placement); };
    r.readAsDataURL(toAdd);
  };

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10,
      flex:1, overflowY:'auto' }}>
      <p style={secLabel}>Placement Preset</p>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
        {presets.map(p => (
          <button key={p.id} type="button" className="ds-touch" onClick={() => setPreset(p.id)}
            style={{
              padding:'4px 9px', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:9, fontWeight: placement===p.id ? 700 : 400,
              background: placement===p.id ? T : 'rgba(15,23,42,.06)',
              color:      placement===p.id ? '#fff' : 'rgba(15,23,42,.4)',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      <div
        onDragOver={e=>{e.preventDefault();if(!removingBg)setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);if(!removingBg)handle(e.dataTransfer.files?.[0]);}}
        onClick={()=>{if(!removingBg)fileRef.current?.click();}}
        style={{
          padding:'22px 12px', borderRadius:12, textAlign:'center',
          cursor: removingBg ? 'wait' : 'pointer',
          border:`2px dashed ${drag?T2:'rgba(2,195,154,.3)'}`,
          background: drag ? 'rgba(2,195,154,.07)' : 'rgba(15,23,42,.02)',
          transition:'all .15s', opacity: removingBg ? 0.6 : 1,
        }}>
        {removingBg ? (
          <>
            <NavIcon name="ai" size={24} color={T2} style={{ marginBottom:6 }}/>
            <p style={{ fontSize:11, fontWeight:700, color:T2, margin:'0 0 3px' }}>
              Removing background…
            </p>
            <p style={{ fontSize:9, color:'rgba(15,23,42,.25)', margin:0 }}>
              First logo on this device may take longer
            </p>
          </>
        ) : (
          <>
            <NavIcon name="dropzone" size={24} color="rgba(15,23,42,.5)" style={{ marginBottom:6 }}/>
            <p style={{ fontSize:11, fontWeight:700, color:'rgba(15,23,42,.6)', margin:'0 0 3px' }}>
              Drop logo or click to browse
            </p>
            <p style={{ fontSize:9, color:'rgba(15,23,42,.25)', margin:0 }}>
              PNG · SVG · JPG · WEBP · max 5 MB
            </p>
            <p style={{ fontSize:9, color:'rgba(2,195,154,.4)', margin:'4px 0 0',
              display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
              <NavIcon name="camera" size={11} color="rgba(2,195,154,.6)"/>
              Mobile: tap to use camera · background removed automatically
            </p>
          </>
        )}
        {/* capture=environment: opens rear camera on mobile for logo capture */}
        <input ref={fileRef} type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          capture="environment"
          disabled={removingBg}
          style={{ display:'none' }}
          onChange={e=>handle(e.target.files?.[0])}/>
      </div>

      {preview && (
        <div style={{ padding:'10px', borderRadius:10, textAlign:'center',
          background:'rgba(15,23,42,.04)', border:'1px solid rgba(15,23,42,.08)' }}>
          <p style={{ fontSize:9,color:'rgba(15,23,42,.3)',margin:'0 0 6px',
            textTransform:'uppercase',letterSpacing:'.07em' }}>Preview</p>
          <img src={preview} alt="logo"
            style={{ maxWidth:88,maxHeight:68,objectFit:'contain',borderRadius:6,
              border:'1px solid rgba(15,23,42,.1)' }}/>
          <p style={{ fontSize:9,color:'rgba(15,23,42,.25)',margin:'7px 0 0' }}>
            Drag on canvas · Corner handles resize
          </p>
        </div>
      )}
    </div>
  );
}
