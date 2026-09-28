// src/components/landing/FamilyTeaser.jsx — owner portraits linking to the Our Team page.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import Photo from './Photo';
import { T } from '../../pages/landing/tokens';
import { P } from '../../pages/landing/photos';

const PEOPLE = [
  { photo: P.fe, name: 'Fe Tiama Boitizon', role: 'Owner · VFRB Enterprise' },
  { photo: P.roxanne, name: 'Roxanne Boitizon Baddiri', role: 'Daughter of Ma\u2019am Fe' },
];

export default function FamilyTeaser({ go }) {
  return (
    <section className="section-pad" style={{ padding: '72px 20px' }}>
      <style>{`.ft-grid{display:grid;grid-template-columns:1fr;gap:32px;align-items:center;}
        @media(min-width:900px){.ft-grid{grid-template-columns:1.05fr 1fr;gap:64px;}}`}</style>
      <div className="ft-grid" style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {PEOPLE.map((p, i) => (
            <div key={p.name} style={{ marginTop: i ? 28 : 0 }}>
              <Photo photo={p.photo} ratio="4/5" radius={22} delay={i * 0.15} pos="center 25%"
                style={{ boxShadow: '0 20px 50px rgba(2,35,50,0.16)' }} />
              <p style={{ margin: '12px 0 0', fontSize: 14, fontWeight: 700, color: T.ink }}>{p.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: T.ink3 }}>{p.role}</p>
            </div>
          ))}
        </div>
        <Reveal delay={0.1}>
          <p style={{ color: T.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            The family behind VFRB
          </p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px,3.2vw,40px)', fontWeight: 700, color: T.ink, lineHeight: 1.15, margin: '0 0 16px' }}>
            Family-run, from the first stitch to the last delivery.
          </h2>
          <p style={{ color: T.ink2, fontSize: 15, lineHeight: 1.8, margin: '0 0 24px' }}>
            VFRB Enterprise is a sole proprietorship led by Fe Tiama Boitizon. Meet the family and the team behind the company.
          </p>
          <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: .97 }} onClick={() => go('/our-team')}
            style={{ background: `linear-gradient(135deg,${T.teal},${T.accent})`, border: 'none', color: '#fff', fontWeight: 700,
              fontSize: 15, padding: '14px 28px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 48,
              boxShadow: '0 8px 28px rgba(2,195,154,0.3)' }}>
            Meet Our Team →
          </motion.button>
        </Reveal>
      </div>
    </section>
  );
}
