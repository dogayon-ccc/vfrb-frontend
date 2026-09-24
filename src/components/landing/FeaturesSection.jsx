// src/components/landing/FeaturesSection.jsx — split out of Landing.jsx.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import { T, FEATS } from '../../pages/landing/tokens';

export default function FeaturesSection() {
  return (
    <section id="features" className="section-pad" style={{ padding:'64px 20px' }}>
      <div style={{ maxWidth:1280, margin:'0 auto' }}>
        <Reveal style={{ textAlign:'center', marginBottom:56 }}>
          <p style={{ color:T.accent, fontSize:11, fontWeight:600,
            letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
            Why VFRB System
          </p>
          <h2 style={{ fontFamily:"var(--font)",
            fontSize:'clamp(26px,3.5vw,44px)', fontWeight:700, color:T.ink,
            marginBottom:14 }}>
            Purpose-built for real uniform orders.
          </h2>
        </Reveal>
        <div className="feat-grid"
          style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }}>
          {FEATS.map((f,i) => (
            <motion.div key={f.title} className="feat-card"
              initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }} transition={{ delay:i*.09, duration:.6 }}
              style={{ padding:26, borderRadius:16,
                background: f.hl ? 'linear-gradient(135deg,rgba(2,128,144,0.1),rgba(2,195,154,0.06))' : '#fff',
                border: f.hl ? '1px solid rgba(2,195,154,0.35)' : `1px solid ${T.border}` }}>
              <div style={{ fontSize:24, marginBottom:14 }}>{f.icon}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                <h3 style={{ color:T.ink, fontWeight:600, fontSize:14, margin:0 }}>{f.title}</h3>
                {f.hl && (
                  <span style={{ fontSize:9, padding:'2px 8px', borderRadius:100,
                    fontWeight:700, background:'rgba(2,195,154,0.15)', color:T.teal,
                    whiteSpace:'nowrap' }}>Core Feature</span>
                )}
              </div>
              <p style={{ color:T.ink2, fontSize:13, lineHeight:1.65, margin:0 }}>
                {f.desc}
              </p>
              {f.hl && (
                <div style={{ display:'flex', gap:5, marginTop:12, flexWrap:'wrap' }}>
                  {['Gemini AI', 'Material Types Only', 'No Pricing Shown', 'Staff-Reviewed'].map(t => (
                    <span key={t} style={{ fontSize:10, padding:'3px 9px', borderRadius:100,
                      background:'rgba(2,195,154,0.1)', border:'1px solid rgba(2,195,154,0.3)',
                      color:T.teal }}>{t}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
