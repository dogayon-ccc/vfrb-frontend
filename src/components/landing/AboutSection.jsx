// src/components/landing/AboutSection.jsx — company story with real family/team photography.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import Photo from './Photo';
import { T } from '../../pages/landing/tokens';
import { P } from '../../pages/landing/photos';

const CONTACT = [['📍', '#31 San Guillermo St., Bayanan, Muntinlupa City 1772'],
  ['📞', '0921 791 6259'], ['✉️', 'vfrb.enterprise@gmail.com'], ['🏭', 'Production: Sto. Tomas, Batangas']];

export default function AboutSection({ go }) {
  return (
    <section id="about" className="section-pad" style={{ padding: '64px 20px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40, alignItems: 'center' }}>
          <div style={{ position: 'relative', paddingBottom: 56 }}>
            <Photo photo={P.familyCourt} ratio="16/10" radius={24} caption="The VFRB family and team"
              style={{ boxShadow: '0 24px 60px rgba(2,35,50,0.16)' }} />
            <div style={{ position: 'absolute', right: -6, bottom: 0, width: '46%' }}>
              <Photo photo={P.familyDinner} ratio="4/3" radius={18} delay={0.3}
                style={{ border: '4px solid #fff', boxShadow: '0 16px 36px rgba(2,35,50,0.2)' }} />
            </div>
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
              style={{ position: 'absolute', left: 14, top: 14, background: '#fff', borderRadius: 14, padding: '12px 16px',
                border: `1px solid ${T.border}`, boxShadow: '0 10px 30px rgba(2,35,50,0.12)', maxWidth: '46%' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.teal, lineHeight: 1 }}>26 yrs</div>
              <div style={{ fontSize: 11, color: T.ink3, marginTop: 4 }}>of garment manufacturing</div>
            </motion.div>
          </div>

          <Reveal delay={0.15}>
            <p style={{ color: T.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 18 }}>About VFRB Enterprise</p>
            <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(28px,3.5vw,46px)', fontWeight: 700,
              lineHeight: 1.15, marginBottom: 22, color: T.ink }}>
              A family-owned garment company,{' '}
              <em style={{ fontStyle: 'italic', color: T.ink3 }}>specialized in company uniforms.</em>
            </h2>
            <p style={{ color: T.ink2, fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
              VFRB Enterprise, also known as <strong style={{ color: T.ink }}>Tailor Centre VFRB Manila</strong>, is a
              medium-scale, family-owned garment industry operating from Bayanan, Muntinlupa City since 2000,
              specialized in corporate and company uniforms.
            </p>
            <blockquote style={{ margin: '0 0 22px', padding: '4px 0 4px 16px', borderLeft: `3px solid ${T.accent}`,
              color: T.ink2, fontSize: 14.5, lineHeight: 1.75, fontStyle: 'italic' }}>
              Our company caters all kinds of tailoring service and garments needs from local to international
              market ensuring high quality products and services.
            </blockquote>
            {CONTACT.map(([ic, tx]) => (
              <div key={tx} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 9 }}>
                <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{ic}</span>
                <span style={{ color: T.ink2, fontSize: 14 }}>{tx}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
