import { motion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel, CATS, SLEEVE_OPTS, FIT_GARMENTS } from './dsShared';
import { BASE_PATHS } from './garmentPaths';

export default function TypePanel({ cfg, setCfg }) {
  const catData = CATS.find(c => c.id === cfg.category) ?? CATS[0];
  const sleeves = SLEEVE_OPTS[cfg.garment] ?? [];

  return (
    <div style={{ overflowY:'auto', flex:1, padding:'8px 8px 16px' }}>
      <p style={secLabel}>Category</p>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        {CATS.map(c => (
          <button key={c.id}
            onClick={() => setCfg(p => ({ ...p, category:c.id, garment:c.garments[0], sleeve:'Short' }))}
            style={{
              padding:'5px 10px', borderRadius:20, border:'none', cursor:'pointer',
              fontSize:10, fontWeight:700,
              background: cfg.category===c.id ? T : 'rgba(15,23,42,.06)',
              color:      cfg.category===c.id ? '#fff' : 'rgba(15,23,42,.45)',
              transition: 'all .13s',
            }}>
            <NavIcon name={c.icon} size={12} color={cfg.category===c.id ? '#fff' : 'rgba(15,23,42,.45)'}
              style={{ marginRight:4, verticalAlign:'-2px' }}/>
            {c.id.split('/')[0].trim()}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <p style={{ ...secLabel, marginBottom:0 }}>Garment</p>
        {/* Bug fix: before this, a garment could be selected but never
            removed — clicking another card swapped it, but there was no
            path back to the blank-canvas state EMPTY_PATHS/INIT_CFG
            already support. Click the selected card again, or this button,
            to clear it. */}
        {cfg.garment && (
          <button type="button" onClick={() => setCfg(p => ({ ...p, garment:null }))}
            style={{ fontSize:9, fontWeight:700, color:'rgba(15,23,42,.4)',
              background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
              display:'flex', alignItems:'center', gap:3 }}>
            <NavIcon name="delete" size={11} color="rgba(15,23,42,.4)"/> Remove
          </button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
        {catData.garments.map(g => {
          const paths = BASE_PATHS[g] ?? BASE_PATHS['Polo Shirt'];
          const sel   = cfg.garment === g;
          return (
            <motion.button key={g}
              // Toggle: clicking the already-selected garment clears it
              // (back to the blank canvas), same as the Remove button above.
              onClick={() => setCfg(p => (sel
                ? { ...p, garment:null }
                : { ...p, garment:g, sleeve: (SLEEVE_OPTS[g]?.[0] ?? p.sleeve) }))}
              title={sel ? `${g} — click to remove` : g}
              whileHover={{ scale: 1.03 }}
              whileTap={{   scale: 0.97 }}
              style={{
                padding:'8px 5px 6px', borderRadius:10, border:'none', cursor:'pointer',
                background: sel ? 'rgba(2,195,154,.14)' : 'rgba(15,23,42,.04)',
                outline:    sel ? `2px solid ${T2}` : '1px solid rgba(15,23,42,.07)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                position:'relative', overflow:'hidden',
              }}>
              <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width="44" height="52" style={{ display:'block', flexShrink:0 }}>
                {paths.body    && <path d={paths.body}    fill={cfg.colors.body   ?? '#1e3a5f'} stroke="rgba(15,23,42,.18)" strokeWidth="1.5"/>}
                {paths.collar  && <path d={paths.collar}  fill={cfg.colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
                {paths.sleeveL && <path d={paths.sleeveL} fill={cfg.colors.sleeve ?? cfg.colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
                {paths.sleeveR && <path d={paths.sleeveR} fill={cfg.colors.sleeve ?? cfg.colors.body ?? '#1e3a5f'} stroke="rgba(15,23,42,.15)" strokeWidth="1"/>}
                {paths.pocket  && <path d={paths.pocket}  fill={cfg.colors.pocket ?? cfg.colors.collar ?? '#c8a96e'} stroke="rgba(15,23,42,.12)" strokeWidth="0.5"/>}
              </svg>
              <span style={{ fontSize:9, fontWeight: sel?700:400, color: sel ? T2 : 'rgba(15,23,42,.5)', textAlign:'center' }}>
                {g}
              </span>
              {sel && (
                <span style={{ position:'absolute', top:5, right:5, fontSize:9, background:T2, color:'#000',
                  borderRadius:99, padding:'1px 5px', fontWeight:800 }}>✓</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {sleeves.length > 0 && (
        <>
          <p style={secLabel}>Sleeve</p>
          <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
            {sleeves.map(s => (
              <button key={s} onClick={() => setCfg(p => ({ ...p, sleeve:s }))}
                style={{
                  flexShrink:0, padding:'5px 12px', borderRadius:20, border:'none',
                  cursor:'pointer', fontSize:10, fontWeight:cfg.sleeve===s?700:400,
                  background: cfg.sleeve===s ? T : 'rgba(15,23,42,.06)',
                  color:      cfg.sleeve===s ? '#fff' : 'rgba(15,23,42,.4)',
                  whiteSpace:'nowrap', transition:'all .12s',
                }}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {FIT_GARMENTS.includes(cfg.garment) && (
        <>
          <p style={{ ...secLabel, marginTop:12 }}>Fit</p>
          <div className="ds-seg ds-seg--sm" role="radiogroup" aria-label="Garment fit" style={{ margin:0 }}>
            {[['male', 'Male'], ['female', 'Female']].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={(cfg.fit ?? 'male') === id}
                onClick={() => setCfg(p => ({ ...p, fit:id }))}>{label}</button>
            ))}
          </div>
          <p className="ds-note">Switches the 3D model between the male and female cut.</p>
        </>
      )}
    </div>
  );
}
