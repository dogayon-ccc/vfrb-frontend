// src/components/landing/HowSection.jsx — split out of Landing.jsx.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import { T, STEPS } from '../../pages/landing/tokens';

export default function HowSection() {
  return (
    <section id="how" className="section-pad"
      style={{ padding:'64px 20px', background:'#EEF2F7' }}>
      <div style={{ maxWidth:1280, margin:'0 auto' }}>
        <Reveal style={{ textAlign:'center', marginBottom:56 }}>
          <p style={{ color:T.accent, fontSize:11, fontWeight:600,
            letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
            The Process
          </p>
          <h2 style={{ fontFamily:"var(--font)",
            fontSize:'clamp(26px,3.5vw,44px)', fontWeight:700, color:T.ink,
            marginBottom:14, lineHeight:1.15 }}>
            From design idea to VFRB's inbox.
          </h2>
          <p style={{ color:T.ink2, fontSize:15, maxWidth:460,
            margin:'0 auto' }}>
            No checkout. No payment form. Design, compute materials, review —
            then VFRB gets your complete brief by email.
          </p>
        </Reveal>
        <div className="steps-grid"
          style={{ display:'grid', gridTemplateColumns:'1fr', gap:18 }}>
          {STEPS.map((s,i) => (
            <motion.div key={s.n} className="step-card"
              initial={{ opacity:0, y:32 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }} transition={{ delay:i*.12, duration:.6 }}
              style={{ padding:26, borderRadius:16,
                background:'#fff',
                border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"var(--font)", fontSize:42,
                fontWeight:700, marginBottom:18,
                background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                {s.n}
              </div>
              <h3 style={{ color:T.ink, fontWeight:600, fontSize:15, marginBottom:9 }}>{s.title}</h3>
              <p style={{ color:T.ink2, fontSize:13, lineHeight:1.65, margin:0 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
