// src/pages/client/design-studio/PatternPanel.jsx
// Extracted from DesignStudio.jsx (Task E cleanup, Aug 31 2026) — third
// slice of the file-size breakdown, same pattern as LayersPanel.jsx and
// LogoPanel.jsx.
//
// STRIPE CUSTOMIZATION (Sept 2026): H-Stripes/V-Stripes/Diagonal now show
// live width/spacing sliders below the swatch grid when selected — real
// interactive stripe adjustment, not just a fixed preset. Reads/writes
// cfg.patternParams[activeZone], separate from cfg.patterns[activeZone]
// (which just holds the pattern's id) — see dsShared.js's PATTERNS
// comment for why these are two parallel fields instead of one.
import { motion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T2, secLabel, ZONE_LABEL, PATTERNS } from './dsShared';

// Universal slider ranges across all 3 parametric pattern types. Not
// per-type-tuned (diagonal's useful range genuinely differs a bit from
// stripes') — deliberately kept simple for this first pass rather than
// adding a range config per pattern type for a 3-item feature.
const WIDTH_RANGE   = { min: 1,  max: 15 };
const SPACING_RANGE = { min: 2,  max: 30 };

function ParamSlider({ label, value, range, onChange }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <span style={{ display:'flex', justifyContent:'space-between',
        fontSize:10, color:'rgba(15,23,42,.5)' }}>
        <span>{label}</span>
        <span style={{ color:T2, fontWeight:700 }}>{value}px</span>
      </span>
      <input type="range" min={range.min} max={range.max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:T2, cursor:'pointer' }}/>
    </label>
  );
}

export default function PatternPanel({ cfg, setCfg, activeZone }) {
  const zonePattern = cfg.patterns?.[activeZone] ?? 'solid';
  const patDef       = PATTERNS.find(p => p.id === zonePattern);
  const setPattern  = (id) => setCfg(p => ({
    ...p, patterns: { ...(p.patterns??{}), [activeZone]:id }
  }));

  // Current width/spacing for this zone — falls back to the selected
  // pattern's own defaults if the customer hasn't dragged a slider yet,
  // so the sliders always show a real, meaningful value, never blank.
  const params = cfg.patternParams?.[activeZone] ?? patDef?.defaultParams ?? { width:5, spacing:5 };

  const setParam = (key, val) => setCfg(p => ({
    ...p,
    patternParams: {
      ...(p.patternParams ?? {}),
      [activeZone]: { ...params, [key]: val },
    },
  }));

  return (
    <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10,
      flex:1, overflowY:'auto' }}>

      <div style={{ padding:'9px 11px',borderRadius:9,
        background:'rgba(15,23,42,.04)',border:'1px solid rgba(15,23,42,.08)' }}>
        <p style={{ fontSize:11,fontWeight:700,color:'#1a2332',margin:'0 0 2px' }}>
          Pattern Overlay
        </p>
        <p style={{ fontSize:10,color:'rgba(15,23,42,.35)',margin:0 }}>
          Applied on top of zone color. Select zone in Colors tab.
        </p>
      </div>

      <p style={secLabel}>Active Zone: <span style={{ color:T2 }}>{ZONE_LABEL[activeZone]}</span></p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
        {PATTERNS.map(pat => {
          const sel = zonePattern === pat.id;
          return (
            <motion.button key={pat.id}
              onClick={() => setPattern(pat.id)}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              style={{
                padding:'10px 4px 7px', borderRadius:10, border:'none', cursor:'pointer',
                background: sel ? 'rgba(2,195,154,.14)' : 'rgba(15,23,42,.04)',
                outline:    sel ? `2px solid ${T2}` : '1px solid rgba(15,23,42,.07)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              }}>
              <NavIcon name={pat.icon} size={18} color={sel ? T2 : 'rgba(15,23,42,.6)'}/>
              <span style={{ fontSize:9, color: sel?T2:'rgba(15,23,42,.45)',
                fontWeight:sel?700:400, textAlign:'center' }}>
                {pat.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {patDef?.parametric && (
        <motion.div
          initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
          style={{ padding:'11px 12px', borderRadius:10, marginTop:2,
            background:'rgba(2,195,154,.06)', border:`1px solid rgba(2,195,154,.18)`,
            display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>
          <p style={{ fontSize:10, fontWeight:700, color:T2, margin:0,
            display:'flex', alignItems:'center', gap:5 }}>
            <NavIcon name={patDef.icon} size={12}/> Adjust {patDef.label}
          </p>
          <ParamSlider label="Stripe Width" value={params.width} range={WIDTH_RANGE}
            onChange={v => setParam('width', v)}/>
          <ParamSlider label="Spacing" value={params.spacing} range={SPACING_RANGE}
            onChange={v => setParam('spacing', v)}/>
          <button onClick={() => setCfg(p => ({
              ...p,
              patternParams: { ...(p.patternParams??{}), [activeZone]: patDef.defaultParams },
            }))}
            style={{ alignSelf:'flex-start', padding:'3px 9px', borderRadius:7,
              border:'1px solid rgba(15,23,42,.15)', background:'transparent',
              color:'rgba(15,23,42,.4)', fontSize:9, cursor:'pointer' }}>
            Reset to default
          </button>
        </motion.div>
      )}
    </div>
  );
}
