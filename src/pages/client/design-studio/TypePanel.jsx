import { motion } from 'framer-motion';
import { NavIcon } from '../../../components/ui/icons';
import { T, T2, secLabel } from './dsShared';
import { BASE_PATHS } from './garmentPaths';
import { CATALOG, familyFor, neighborFamily, STATUS_3D_LABEL } from './garmentCatalog';

const BADGE_COLOR = { ok: '#0f766e', warn: '#b45309', muted: 'rgba(15,23,42,.4)' };
const BADGE_BG    = { ok: '#f0fdfa', warn: '#fffbeb', muted: 'rgba(15,23,42,.05)' };

function StatusBadge({ status }) {
  const s = STATUS_3D_LABEL[status];
  if (!s) return null;
  return (
    <span style={{
      position: 'absolute', top: 4, left: 4, fontSize: 7.5, fontWeight: 800,
      padding: '2px 5px', borderRadius: 6, color: BADGE_COLOR[s.tone], background: BADGE_BG[s.tone],
      letterSpacing: '.02em',
    }}>
      {s.label}
    </span>
  );
}

export default function TypePanel({ cfg, setCfg }) {
  const catData = CATALOG.find(c => c.id === cfg.category) ?? CATALOG[0];
  const family  = familyFor(cfg.garment);
  const sleeves = family?.styles ?? [];

  const goNeighbor = (dir) => {
    const next = neighborFamily(cfg.category, cfg.garment, dir);
    if (!next) return;
    setCfg(p => ({ ...p, garment: next.id, sleeve: next.styles[0] ?? p.sleeve, fit: next.fits.length > 1 ? (p.fit ?? 'male') : undefined }));
  };

  return (
    <div style={{ overflowY:'auto', flex:1, padding:'8px 8px 16px' }}>
      <p style={secLabel}>Category</p>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        {CATALOG.map(c => (
          <button key={c.id}
            onClick={() => setCfg(p => ({ ...p, category:c.id, garment:c.families[0].id, sleeve:c.families[0].styles[0] ?? 'Short' }))}
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
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Previous/Next: browse the current category's garments without leaving the grid. */}
          {cfg.garment && catData.families.length > 1 && (
            <div style={{ display:'flex', gap:2 }}>
              <button type="button" title="Previous garment" onClick={() => goNeighbor(-1)}
                style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center',
                  border:'none', borderRadius:6, background:'rgba(15,23,42,.06)', cursor:'pointer' }}>
                <NavIcon name="chevronLeft" size={11} color="rgba(15,23,42,.5)"/>
              </button>
              <button type="button" title="Next garment" onClick={() => goNeighbor(1)}
                style={{ width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center',
                  border:'none', borderRadius:6, background:'rgba(15,23,42,.06)', cursor:'pointer' }}>
                <NavIcon name="chevronRight" size={11} color="rgba(15,23,42,.5)"/>
              </button>
            </div>
          )}
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
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
        {catData.families.map(fam => {
          const g = fam.id;
          const paths = BASE_PATHS[g] ?? BASE_PATHS['Polo Shirt'];
          const sel   = cfg.garment === g;
          return (
            <motion.button key={g}
              // Toggle: clicking the already-selected garment clears it
              // (back to the blank canvas), same as the Remove button above.
              onClick={() => setCfg(p => (sel
                ? { ...p, garment:null }
                : { ...p, garment:g, sleeve: (fam.styles[0] ?? p.sleeve), fit: fam.fits.length > 1 ? (p.fit ?? 'male') : undefined }))}
              title={sel ? `${g} — click to remove` : `${g} — ${STATUS_3D_LABEL[fam.status3D]?.label}`}
              whileHover={{ scale: 1.03 }}
              whileTap={{   scale: 0.97 }}
              style={{
                padding:'8px 5px 6px', borderRadius:10, border:'none', cursor:'pointer',
                background: sel ? 'rgba(2,195,154,.14)' : 'rgba(15,23,42,.04)',
                outline:    sel ? `2px solid ${T2}` : '1px solid rgba(15,23,42,.07)',
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                position:'relative', overflow:'hidden',
              }}>
              <StatusBadge status={fam.status3D}/>
              <svg viewBox={`0 0 ${paths.w} ${paths.h}`} width="44" height="52" style={{ display:'block', flexShrink:0, marginTop:6 }}>
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

      {(family?.fits.length ?? 0) > 1 && (
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
