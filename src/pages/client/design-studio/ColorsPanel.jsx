import { useState } from 'react';
import { motion } from 'framer-motion';
import InlineColorPicker from '../../../components/InlineColorPicker';
import { T2, secLabel, ZONE_LABEL, PH_SWATCHES, zonesFor } from './dsShared';

export default function ColorsPanel({ cfg, setCfg, activeZone, setActiveZone }) {
  const setColor = (zone, c) => setCfg(p => ({ ...p, colors:{ ...p.colors, [zone]:c } }));
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{ overflowY:'auto', flex:1, padding:'8px 10px 16px' }}>
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
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:5, marginBottom:12 }}>
            {PH_SWATCHES.map(sw => (
              <motion.button key={sw.hex} type="button" className="ds-touch" title={sw.name} aria-label={sw.name}
                whileHover={{ scale:1.15 }} whileTap={{ scale:0.95 }}
                onClick={() => setColor(activeZone, sw.hex)}
                style={{
                  height:28, borderRadius:6, cursor:'pointer', border:'none', background: sw.hex,
                  outline: (cfg.colors[activeZone]??'').toLowerCase()===sw.hex.toLowerCase()
                    ? '3px solid rgba(15,23,42,.9)' : '2px solid rgba(15,23,42,.08)',
                }}/>
            ))}
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
