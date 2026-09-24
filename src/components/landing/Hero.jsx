// src/components/landing/Hero.jsx — split out of Landing.jsx.
import { motion } from 'framer-motion';
import GarmentHologram from './GarmentHologram';
import { T } from '../../pages/landing/tokens';

export default function Hero({ heroY, go, scrollTo }) {
  return (
    <section style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      position:'relative', overflow:'hidden', paddingTop:64 }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        <motion.div animate={{ opacity:[0.1,0.22,0.1], scale:[1,1.1,1] }}
          transition={{ duration:10, repeat:Infinity }}
          style={{ position:'absolute', top:'8%', right:'4%',
            width:560, height:560, borderRadius:'50%',
            background:`radial-gradient(circle,${T.teal},transparent 70%)`,
            filter:'blur(80px)' }}/>
        <motion.div animate={{ opacity:[0.07,0.14,0.07], scale:[1.1,1,1.1] }}
          transition={{ duration:13, repeat:Infinity, delay:4 }}
          style={{ position:'absolute', bottom:'12%', left:'6%',
            width:480, height:480, borderRadius:'50%',
            background:`radial-gradient(circle,${T.accent},transparent 70%)`,
            filter:'blur(100px)' }}/>
        <div style={{ position:'absolute', inset:0,
          backgroundImage:'linear-gradient(rgba(2,128,144,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(2,128,144,0.045) 1px,transparent 1px)',
          backgroundSize:'64px 64px' }}/>
      </div>

      <motion.div style={{ y:heroY, width:'100%', position:'relative', zIndex:1 }}>
        <div className="hero-pad" style={{ padding:'56px 20px 64px' }}>
          <div className="hero-grid" style={{ display:'grid',
            gridTemplateColumns:'1fr', gap:56, alignItems:'center',
            maxWidth:1280, margin:'0 auto' }}>

            <motion.div initial="hidden" animate="show"
              variants={{ hidden:{}, show:{ transition:{ staggerChildren:.1 } } }}>
              <motion.div variants={{ hidden:{ opacity:0, y:16 }, show:{ opacity:1, y:0 } }}
                transition={{ duration:.6 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:8,
                  fontSize:11, fontWeight:600, letterSpacing:'0.1em',
                  textTransform:'uppercase', padding:'6px 14px', borderRadius:100,
                  marginBottom:24, background:'rgba(2,195,154,0.1)',
                  border:'1px solid rgba(2,195,154,0.25)', color:T.accent }}>
                  <span style={{ width:6, height:6, borderRadius:'50%',
                    background:T.accent, animation:'pulse-glow 2s infinite' }}/>
                  Muntinlupa City · Est. 2000 · Philippines
                </span>
              </motion.div>

              <motion.h1 className="hero-title"
                variants={{ hidden:{ opacity:0, y:24 }, show:{ opacity:1, y:0 } }}
                transition={{ duration:.8 }}
                style={{ fontFamily:"var(--font)",
                  fontSize:'clamp(34px,9vw,50px)', fontWeight:700,
                  lineHeight:1.08, marginBottom:22, letterSpacing:'-0.01em' }}>
                Tailor-made{' '}
                <em style={{ fontStyle:'italic', fontWeight:600 }}>uniforms</em>{' '}
                <span style={{ background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  built for you.
                </span>
              </motion.h1>

              <motion.p className="hero-desc"
                variants={{ hidden:{ opacity:0, y:16 }, show:{ opacity:1, y:0 } }}
                transition={{ duration:.7 }}
                style={{ color:T.ink2, fontSize:14, lineHeight:1.75,
                  marginBottom:32, maxWidth:480 }}>
                VFRB Enterprise produces scrub suits, school uniforms, and corporate
                wear for hospitals, schools, government agencies, and institutions
                across the Philippines. Configure your design in our Design Studio,
                and receive an AI-assisted material recommendation before production
                begins. Minimum order: 100 pieces.
              </motion.p>

              <motion.div className="hero-btns"
                variants={{ hidden:{ opacity:0, y:12 }, show:{ opacity:1, y:0 } }}
                transition={{ duration:.6 }}
                style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:40 }}>
                <motion.button whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:.97 }}
                  onClick={() => go('/register')}
                  style={{ background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                    border:'none', color:'#fff', fontWeight:700, fontSize:15,
                    padding:'14px 28px', borderRadius:12, cursor:'pointer',
                    boxShadow:'0 8px 32px rgba(2,195,154,0.35)',
                    fontFamily:'var(--font)', minHeight:48 }}>
                  Register Account →
                </motion.button>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                  onClick={() => scrollTo('categories')}
                  style={{ background:'#fff',
                    border:`1px solid ${T.border}`,
                    color:T.ink2, fontWeight:600, fontSize:15,
                    padding:'14px 28px', borderRadius:12, cursor:'pointer',
                    fontFamily:'var(--font)', minHeight:48 }}>
                  See What We Build
                </motion.button>
              </motion.div>

              <motion.div className="hero-stats"
                variants={{ hidden:{ opacity:0 }, show:{ opacity:1 } }}
                transition={{ duration:.6 }}
                style={{ display:'flex', gap:16, paddingTop:24,
                  borderTop:`1px solid ${T.border}`, flexWrap:'wrap' }}>
                {[['26 yrs','In Operation'],['100','Min. Order (pcs)'],['5','Garment Types'],['₱0','Free Registration']].map(([v,l]) => (
                  <div key={l}>
                    <div className="hero-stat-num"
                      style={{ fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", fontSize:22,
                        fontWeight:700, color:T.teal, lineHeight:1 }}>{v}</div>
                    <div style={{ color:T.ink3, fontSize:11, marginTop:4 }}>{l}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div className="hologram-right"
              initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }}
              transition={{ delay:.5, duration:1, ease:[0.22,1,0.36,1] }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center',
                animation:'float-slow 6s ease-in-out infinite' }}>
              <div style={{ borderRadius:24, padding:20,
                background:'linear-gradient(145deg,#0a2530,#06101a)',
                boxShadow:'0 20px 60px rgba(2,35,50,0.18)' }}>
                <GarmentHologram/>
                <p style={{ textAlign:'center', marginTop:10, fontSize:10,
                  color:'rgba(255,255,255,0.35)', letterSpacing:'0.1em',
                  textTransform:'uppercase', fontFamily:'monospace' }}>
                  VFRB Enterprise · AI-Assisted Material Recommendation
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
