// src/components/landing/AboutSection.jsx — split out of Landing.jsx.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import { T } from '../../pages/landing/tokens';

export default function AboutSection({ go }) {
  return (
    <section id="about" className="section-pad" style={{ padding:'64px 20px' }}>
      <div style={{ maxWidth:1280, margin:'0 auto' }}>
        <div className="about-grid"
          style={{ display:'grid', gridTemplateColumns:'1fr', gap:40, alignItems:'center' }}>
          <Reveal delay={0.1}>
            <div style={{ position:'relative' }}>
              <div style={{ position:'absolute', top:-16, left:-16, right:32, bottom:32,
                border:'1px solid rgba(2,195,154,0.12)', borderRadius:20,
                pointerEvents:'none' }}/>
              <div style={{ borderRadius:20,
                background:'linear-gradient(145deg,rgba(2,61,71,0.5),rgba(6,16,26,0.8))',
                border:'1px solid rgba(2,195,154,0.18)', padding:32 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                  gap:10, marginBottom:18 }}>
                  {[['🩺','Medical Scrubs','V-neck, mandarin collar','#028090'],
                    ['🏫','School Uniform','Polo blouse, slacks','#3b82f6'],
                    ['💼','Corporate Polo','Embroidered logo','#6366f1'],
                    ['👖','Pants','Corporate & institutional','#64748b']
                  ].map(([ic,lb,sub]) => (
                    <div key={lb} style={{ padding:14, borderRadius:11,
                      background:'rgba(255,255,255,0.04)',
                      border:'1px solid rgba(255,255,255,0.07)', textAlign:'center' }}>
                      <div style={{ fontSize:26, marginBottom:7 }}>{ic}</div>
                      <div style={{ color:'#fff', fontSize:12, fontWeight:600, marginBottom:2 }}>{lb}</div>
                      <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderRadius:11, padding:14,
                  background:'rgba(2,128,144,0.1)',
                  border:'1px solid rgba(2,195,154,0.18)' }}>
                  <div style={{ color:T.accent, fontSize:10, fontWeight:600,
                    letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:9 }}>
                    Core Materials Used
                  </div>
                  {['Airstretch · Ultraflex · Flexitone',
                    'CVC 65/35 Poly-Cotton · TC Poplin',
                    'Polyester Thread · Elastic Band · Logo Patch'
                  ].map(m => (
                    <div key={m} style={{ color:'rgba(255,255,255,0.45)', fontSize:12,
                      padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <p style={{ color:T.accent, fontSize:11, fontWeight:600,
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:18 }}>
              About VFRB Enterprise
            </p>
            <h2 style={{ fontFamily:"var(--font)",
              fontSize:'clamp(28px,3.5vw,46px)', fontWeight:700, lineHeight:1.15,
              marginBottom:22, color:T.ink }}>
              26 years of quality{' '}
              <em style={{ fontStyle:'italic', color:T.ink3 }}>
                garment manufacturing.
              </em>
            </h2>
            <p style={{ color:T.ink2, fontSize:15, lineHeight:1.8,
              marginBottom:18 }}>
              VFRB Enterprise — known as{' '}
              <strong style={{ color:T.ink }}>
                Tailor Centre VFRB Manila
              </strong>{' '}
              — has been operating from Bayanan, Muntinlupa City since 2000. We specialize
              in medical scrub suits, school uniforms, and corporate wear.
            </p>
            {[['📍','#31 San Guillermo St., Bayanan, Muntinlupa City 1772'],
              ['📞','0921 791 6259'],
              ['✉️','vfrb.enterprise@gmail.com'],
              ['🏭','Production: Sto. Tomas, Batangas']
            ].map(([ic,tx]) => (
              <div key={tx} style={{ display:'flex', gap:11, alignItems:'flex-start',
                marginBottom:9 }}>
                <span style={{ fontSize:14, marginTop:1, flexShrink:0 }}>{ic}</span>
                <span style={{ color:T.ink2, fontSize:14 }}>{tx}</span>
              </div>
            ))}
            <motion.button whileHover={{ scale:1.02, y:-1 }} whileTap={{ scale:.97 }}
              onClick={() => go('/register')}
              style={{ marginTop:26,
                background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                border:'none', color:'#fff', fontWeight:600, fontSize:14,
                padding:'13px 28px', borderRadius:11, cursor:'pointer',
                fontFamily:'var(--font)',
                boxShadow:'0 4px 20px rgba(2,195,154,0.25)', minHeight:48 }}>
              Place Your Order →
            </motion.button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
