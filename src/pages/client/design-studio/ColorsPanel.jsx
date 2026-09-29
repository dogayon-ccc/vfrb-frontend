import { useState } from 'react';
import { motion } from 'framer-motion';
import InlineColorPicker from '../../../components/InlineColorPicker';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel, ZONE_LABEL, PH_SWATCHES, zonesFor } from './dsShared';

// Black check on light swatches, white on dark, so the selected tick is always visible.
function isLight(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170;
}

export default function ColorsPanel({ cfg, setCfg, activeZone, setActiveZone }) {
  const setColor = (zone, c) => setCfg(p => ({ ...p, colors:{ ...p.colors, [zone]:c } }));
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ overflowY:'auto', flex:1, padding:'8px 10px 16px' }}>
      {!cfg.garment && (
        <p className="ds-note" style={{ marginBottom:8 }}>Pick a garment in the Garment tab to color its collar, sleeves and pocket.</p>
      )}
      {cfg.garment && (
        <div className="ds-zone-now">
          <span className="ds-zone-dot" style={{ background: cfg.colors[activeZone] ?? '#028090' }}/>
          <span>Editing <b>{ZONE_LABEL[activeZone] ?? activeZone}</b></span>
          <code>{(cfg.colors[activeZone] ?? '').toUpperCase()}</code>
        </div>
      )}
      <p style={secLabel}>Color Zone</p>
      <div style={{ display:'flex', gap:4, marginBottom:12, flexWrap:'wrap' }}>
        {zonesFor(cfg.garment, cfg.sleeve).map(z => (
          <button key={z} type="button" className="ds-touch" onClick={() => setActiveZone(z)}
            style={{
              display:'flex', alignItems:'center', gap:5, padding:'5px 9px',
              borderRadius:8, border:`1px solid ${activeZone===z?T2:'rgba(15,23,42,.08)'}`,
              background: activeZone===z ? 'rgba(2,195,154,.1)' : 'rgba(15,23,42,.03)',
              cursor:'pointer',
            }}>
            <div style={{ width:12,height:12,borderRadius:3, background:cfg.colors[z]??'#028090',
              border:'1px solid rgba(15,23,42,.2)' }}/>
            <span style={{ fontSize:10, color: activeZone===z ? T2 : 'rgba(15,23,42,.5)',
              fontWeight: activeZone===z ? 700 : 400 }}>
              {ZONE_LABEL[z]}
            </span>
          </button>
        ))}
      </div>

      {activeZone === 'tipping' && cfg.colors.tipping === null ? (
        <button onClick={() => setColor('tipping', '#FFFFFF')}
          style={{
            width:'100%', padding:'10px 12px', borderRadius:9, cursor:'pointer',
            border:'1px dashed rgba(2,195,154,.5)', background:'rgba(2,195,154,.06)',
            color:'#028090', fontSize:11, fontWeight:700,
          }}>
          + Enable Tipping (contrast collar trim)
        </button>
      ) : (
        <>
          <p style={secLabel}>Philippine Colors</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(34px,1fr))', gap:6, marginBottom:12 }}>
            {PH_SWATCHES.map(sw => {
              const on = (cfg.colors[activeZone]??'').toLowerCase()===sw.hex.toLowerCase();
              const light = isLight(sw.hex);
              return (
                <motion.button key={sw.hex} type="button" className="ds-touch" title={sw.name} aria-label={sw.name} aria-pressed={on}
                  whileHover={{ scale:1.1 }} whileTap={{ scale:0.94 }} transition={{ duration:.12 }}
                  onClick={() => setColor(activeZone, sw.hex)}
                  style={{
                    position:'relative', height:34, minWidth:0, borderRadius:8, cursor:'pointer', border:'none', background: sw.hex,
                    boxShadow: on ? `0 0 0 2px #fff, 0 0 0 4px ${T}` : 'inset 0 0 0 1px rgba(15,23,42,.14)',
                    transition:'box-shadow .14s',
                  }}>
                  {on && (
                    <motion.span initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:520, damping:26 }}
                      style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <NavIcon name="success" size={15} color={light ? '#0f172a' : '#fff'}/>
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <p style={secLabel}>Custom Color</p>
          <div style={{ position:'relative' }}>
            <button onClick={() => setPickerOpen(p => !p)}
              style={{
                display:'flex', alignItems:'center', gap:9, width:'100%',
                padding:'8px 11px', borderRadius:9, cursor:'pointer',
                border:`1px solid ${pickerOpen ? T2 : 'rgba(15,23,42,.14)'}`,
                background: pickerOpen ? 'rgba(2,195,154,.08)' : 'rgba(15,23,42,.05)',
              }}>
              <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, background:cfg.colors[activeZone]??'#028090',
                border:'1px solid rgba(15,23,42,.22)' }}/>
              <span style={{ fontSize:11, color:'rgba(15,23,42,.6)', fontFamily:'monospace' }}>
                {cfg.colors[activeZone]??'#028090'}
              </span>
              <span style={{ marginLeft:'auto', fontSize:9, color:'rgba(15,23,42,.3)' }}>
                {pickerOpen ? '▲' : '▼'}
              </span>
            </button>

            {pickerOpen && (
              <InlineColorPicker
                value={cfg.colors[activeZone]??'#028090'}
                onChange={hex => setColor(activeZone, hex)}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          {activeZone === 'tipping' && (
            <button onClick={() => setColor('tipping', null)}
              style={{ marginTop:10, background:'none', border:'none', cursor:'pointer',
                fontSize:10, color:'rgba(15,23,42,.35)', textDecoration:'underline' }}>
              Turn off tipping
            </button>
          )}
        </>
      )}
    </div>
  );
}
