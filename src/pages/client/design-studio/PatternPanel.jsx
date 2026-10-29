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
import { T2, secLabel, ZONE_LABEL, PATTERNS, pattern3D, ONLY_2D_TAG } from './dsShared';
import { assetFor } from './garmentAssets';
import { wovenParams, wovenTileUrl, tileSize, SCALE_RANGE } from './wovenPatterns';

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
        fontSize:13, color:'var(--cx-ink-2)' }}>
        <span>{label}</span>
        <span style={{ color:'var(--cx-thread-ink)', fontWeight:700 }}>{value}px</span>
      </span>
      <input type="range" min={range.min} max={range.max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:'100%', accentColor:T2, cursor:'pointer' }}/>
    </label>
  );
}

// Woven patterns: colour 1 is the zone's own colour (the same value the Colours tab edits), colour 2, scale and rotation are
// saved in cfg.patternParams[zone].
function WovenControls({ cfg, setCfg, zone, patDef }) {
  const c1 = cfg.colors?.[zone] ?? cfg.colors?.body ?? '#1b2a4a';
  const p = wovenParams(patDef.id, cfg.patternParams?.[zone], c1);
  const setP = (k, v) => setCfg(s => ({ ...s, patternParams: { ...(s.patternParams ?? {}), [zone]: { ...wovenParams(patDef.id, s.patternParams?.[zone], c1), [k]: v } } }));
  const row = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, fontSize:13, color:'var(--cx-ink-2)', minHeight:44 };
  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
      style={{ padding:'11px 12px', borderRadius:10, background:'rgba(2,195,154,.06)', border:'1px solid rgba(2,195,154,.18)', display:'flex', flexDirection:'column', gap:6, overflow:'hidden' }}>
      <p style={{ fontSize:13, fontWeight:700, color:'var(--cx-thread-ink)', margin:0 }}>Adjust {patDef.label}</p>
      <label style={row}><span>Colour 1 (zone colour)</span>
        <input type="color" value={c1} onChange={e => setCfg(s => ({ ...s, colors: { ...s.colors, [zone]: e.target.value } }))} style={{ width:44, height:32 }}/></label>
      <label style={row}><span>Colour 2</span>
        <input type="color" value={p.c2} onChange={e => setP('c2', e.target.value)} style={{ width:44, height:32 }}/></label>
      <label style={{ ...row, flexDirection:'column', alignItems:'stretch', gap:2 }}>
        <span style={{ display:'flex', justifyContent:'space-between' }}><span>Scale</span><b>{p.scale}x</b></span>
        <input type="range" min={SCALE_RANGE.min} max={SCALE_RANGE.max} step={0.25} value={p.scale} onChange={e => setP('scale', Number(e.target.value))} style={{ accentColor:T2 }}/></label>
      <label style={{ ...row, flexDirection:'column', alignItems:'stretch', gap:2 }}>
        <span style={{ display:'flex', justifyContent:'space-between' }}><span>Rotation</span><b>{p.rotation}°</b></span>
        <input type="range" min={0} max={165} step={15} value={p.rotation} onChange={e => setP('rotation', Number(e.target.value))} style={{ accentColor:T2 }}/></label>
      <button type="button" onClick={() => setCfg(s => { const pp = { ...(s.patternParams ?? {}) }; delete pp[zone]; return { ...s, patternParams: pp }; })}
        style={{ alignSelf:'flex-start', minHeight:32, padding:'3px 9px', borderRadius:7, border:'1px solid rgba(15,23,42,.15)', background:'transparent', color:'var(--cx-ink-2)', fontSize:13, cursor:'pointer' }}>
        Reset to default
      </button>
      <p style={{ fontSize:13, color:'var(--cx-ink-2)', margin:0 }}>Shown in 2D, previews, PNG and PDF. The 3D model shows this zone in its solid colour.</p>
    </motion.div>
  );
}

export default function PatternPanel({ cfg, setCfg, activeZone }) {
  const photoBase = assetFor(cfg.garment, cfg.sleeve, 'front', cfg.fit);
  const zonePattern = photoBase ? 'solid' : (cfg.patterns?.[activeZone] ?? 'solid');
  const patDef       = PATTERNS.find(p => p.id === zonePattern);
  // Switching to another pattern drops the zone's old params: stripe width/spacing and woven scale/colour 2 do not carry over.
  const setPattern  = (id) => { if (photoBase || id === zonePattern) return; setCfg(p => {
    const patternParams = { ...(p.patternParams ?? {}) }; delete patternParams[activeZone];
    return { ...p, patterns: { ...(p.patterns??{}), [activeZone]:id }, patternParams };
  }); };

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
        <p style={{ fontSize:13,fontWeight:700,color:'#1a2332',margin:'0 0 2px' }}>
          Pattern Overlay
        </p>
        <p style={{ fontSize:13,color:'var(--cx-ink-2)',margin:0 }}>
          Applied on top of zone color. Select zone in Colors tab.
        </p>
      </div>

      {photoBase && <p role="status" style={{ fontSize:13, color:'rgba(15,23,42,.68)', margin:0 }}>
        Patterns are unavailable on this photo base. Choose a vector garment to add a pattern.
      </p>}

      <p style={secLabel}>Active Zone: <span style={{ color:'var(--cx-thread-ink)' }}>{ZONE_LABEL[activeZone]}</span></p>

      <div role="group" aria-label={`Pattern for ${ZONE_LABEL[activeZone]}`} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
        {PATTERNS.map(pat => {
          const sel = zonePattern === pat.id;
          return (
            <motion.button key={pat.id} type="button" aria-pressed={sel}
              onClick={() => setPattern(pat.id)}
              disabled={!!photoBase}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              style={{
                padding:'10px 4px 7px', borderRadius:10, border:'none', cursor:photoBase?'not-allowed':'pointer',
                opacity:photoBase ? 0.5 : 1,
                background: sel ? 'rgba(2,195,154,.14)' : 'rgba(15,23,42,.04)',
                outline:    sel ? `2px solid ${T2}` : '1px solid rgba(15,23,42,.07)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              }}>
              {pat.woven
                ? <span aria-hidden="true" style={{ width:30, height:22, borderRadius:5, border:'1px solid rgba(15,23,42,.15)',
                    backgroundSize: (z => `${z.w}px ${z.h}px`)(tileSize(pat.id, 0.75)),
                    backgroundImage: (u => u ? `url(${u})` : undefined)(wovenTileUrl(pat.id, cfg.colors?.[activeZone] ?? cfg.colors?.body ?? '#1b2a4a',
                      wovenParams(pat.id, cfg.patternParams?.[activeZone], cfg.colors?.[activeZone] ?? cfg.colors?.body).c2, 0.75)) }}/>
                : <NavIcon name={pat.icon} size={18} color={sel ? 'var(--cx-thread-ink)' : 'var(--cx-ink-2)'}/>}
              <span style={{ fontSize:13, color: sel?'var(--cx-thread-ink)':'var(--cx-ink-2)',
                fontWeight:sel?700:400, textAlign:'center' }}>
                {pat.label}
              </span>
              {!photoBase && pat.id !== 'solid' && pattern3D(cfg.garment, cfg.sleeve, cfg.fit, activeZone, pat.id) === false && <span title="Shown in 2D only: the 3D model does not paint this pattern here" style={ONLY_2D_TAG}>2D only</span>}
            </motion.button>
          );
        })}
      </div>

      {!photoBase && patDef?.woven && <WovenControls cfg={cfg} setCfg={setCfg} zone={activeZone} patDef={patDef}/>}

      {!photoBase && patDef?.parametric && (
        <motion.div
          initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
          style={{ padding:'11px 12px', borderRadius:10, marginTop:2,
            background:'rgba(2,195,154,.06)', border:`1px solid rgba(2,195,154,.18)`,
            display:'flex', flexDirection:'column', gap:10, overflow:'hidden' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--cx-thread-ink)', margin:0,
            display:'flex', alignItems:'center', gap:5 }}>
            <NavIcon name={patDef.icon} size={12}/> Adjust {patDef.label}
          </p>
          <ParamSlider label="Stripe width" value={params.width} range={WIDTH_RANGE}
            onChange={v => setParam('width', v)}/>
          <ParamSlider label="Spacing" value={params.spacing} range={SPACING_RANGE}
            onChange={v => setParam('spacing', v)}/>
          <button onClick={() => setCfg(p => ({
              ...p,
              patternParams: { ...(p.patternParams??{}), [activeZone]: patDef.defaultParams },
            }))}
            style={{ alignSelf:'flex-start', padding:'3px 9px', borderRadius:7,
              border:'1px solid rgba(15,23,42,.15)', background:'transparent',
              color:'var(--cx-ink-2)', fontSize:13, cursor:'pointer' }}>
            Reset to default
          </button>
        </motion.div>
      )}
    </div>
  );
}
