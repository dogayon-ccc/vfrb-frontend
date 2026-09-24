// src/components/landing/CategoriesSection.jsx — split out of Landing.jsx.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import { T, CATS } from '../../pages/landing/tokens';

export default function CategoriesSection({ go }) {
  return (
    <section id="categories" className="cat-pad"
      style={{ padding:'32px 20px', borderTop:`1px solid ${T.border}`,
        borderBottom:`1px solid ${T.border}`,
        background:'#EEF2F7' }}>
      <div style={{ maxWidth:1280, margin:'0 auto' }}>
        <Reveal>
          <p style={{ color:T.ink3, fontSize:11, fontWeight:600,
            letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:18 }}>
            What We Build
          </p>
          <div className="cat-strip"
            style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {CATS.map((c,i) => (
              <motion.button key={c.label} className="cat-btn"
                initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ delay:i*.07 }}
                whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
                onClick={() => go('/register')}
                style={{ display:'flex', alignItems:'center', gap:9,
                  padding:'9px 12px', borderRadius:12, cursor:'pointer',
                  background:'#fff',
                  border:`1px solid ${T.border}`,
                  color:T.ink2, fontSize:12, fontWeight:500,
                  fontFamily:'var(--font)', minHeight:44 }}
                onMouseEnter={e => { e.currentTarget.style.background=c.color+'14'; e.currentTarget.style.borderColor=c.color+'55'; e.currentTarget.style.color=T.ink; }}
                onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.ink2; }}>
                <span style={{ fontSize:18 }}>{c.icon}</span>
                <span>{c.label}</span>
                {c.sub && <span style={{ color:T.ink3, fontSize:11 }}>{c.sub}</span>}
              </motion.button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
