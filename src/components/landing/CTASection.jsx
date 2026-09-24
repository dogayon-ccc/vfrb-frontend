// src/components/landing/CTASection.jsx — split out of Landing.jsx.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import { T } from '../../pages/landing/tokens';

export default function CTASection({ go }) {
  return (
    <section className="section-pad" style={{ padding:'64px 20px' }}>
      <div style={{ maxWidth:1280, margin:'0 auto' }}>
        <Reveal>
          <div className="cta-inner"
            style={{ borderRadius:24, padding:'48px 20px', position:'relative',
              overflow:'hidden',
              background:`linear-gradient(135deg,#023d47,${T.teal})`,
              border:'1px solid rgba(2,195,154,0.2)', textAlign:'center' }}>
            <div style={{ position:'absolute', inset:0,
              background:'radial-gradient(circle at 70% 30%,rgba(2,195,154,0.15),transparent 60%)',
              pointerEvents:'none' }}/>
            <div style={{ position:'relative', zIndex:1 }}>
              <h2 style={{ fontFamily:"var(--font)",
                fontSize:'clamp(26px,3vw,40px)', fontWeight:700, color:'#fff',
                marginBottom:14, lineHeight:1.2 }}>
                Ready to design your next uniform?
              </h2>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:15, marginBottom:32,
                maxWidth:400, margin:'0 auto 32px' }}>
                Free to register. No credit card. No need to pay for creating.
                Submit your design request in minutes.
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <motion.button whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:.97 }}
                  onClick={() => go('/register')}
                  style={{ background:T.accent, border:'none', color:'#06101a',
                    fontWeight:700, fontSize:15, padding:'14px 32px', borderRadius:12,
                    cursor:'pointer', boxShadow:'0 8px 32px rgba(2,195,154,0.45)',
                    fontFamily:'var(--font)', minHeight:48 }}>
                  Create Free Account →
                </motion.button>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                  onClick={() => go('/login')}
                  style={{ background:'rgba(255,255,255,0.1)',
                    border:'1px solid rgba(255,255,255,0.2)',
                    color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:15,
                    padding:'14px 32px', borderRadius:12, cursor:'pointer',
                    fontFamily:'var(--font)', minHeight:48 }}>
                  Log In
                </motion.button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
