// src/components/landing/CapabilitiesSection.jsx — printing / embroidery / sublimation / made-to-order, plus Print Authority.
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import Photo from './Photo';
import { T } from '../../pages/landing/tokens';
import { P } from '../../pages/landing/photos';

const CAPS = [
  { photo: P.printing, pos: '35% center', title: 'Silk screen printing', desc: 'Screen-printed logos and lettering on shirts and uniforms.' },
  { photo: P.embroidery, pos: 'center', title: 'Computerized embroidery', desc: 'Company logos and patches stitched on multi-head embroidery machines.' },
  { photo: P.sublimationPolo, pos: 'center', title: 'Full sublimation', desc: 'Customized full-sublimation polos and jerseys.' },
  { photo: P.uniforms, pos: '25% center', title: 'Made-to-order uniforms', desc: 'Company uniforms cut and sewn to order, with prints or embroidered emblems.' },
];

export default function CapabilitiesSection() {
  return (
    <section id="capabilities" className="section-pad" style={{ padding: '72px 20px' }}>
      <style>{`
        .cap-grid{display:grid;grid-template-columns:1fr;gap:16px;}
        .pa-card{display:grid;grid-template-columns:1fr;gap:24px;align-items:center;}
        @media(min-width:641px){.cap-grid{grid-template-columns:1fr 1fr;}}
        @media(min-width:1025px){.cap-grid{grid-template-columns:repeat(4,1fr);} .pa-card{grid-template-columns:240px 1fr;gap:40px;}}
        .cap-card{transition:transform .35s,box-shadow .35s;}
        .cap-card:hover{transform:translateY(-6px);box-shadow:0 22px 50px rgba(2,35,50,0.14);}
      `}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 40, maxWidth: 640 }}>
          <p style={{ color: T.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            What We Do
          </p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 700, color: T.ink, lineHeight: 1.15, margin: '0 0 14px' }}>
            Tailoring, printing, and embroidery under one roof.
          </h2>
          <p style={{ color: T.ink2, fontSize: 15, lineHeight: 1.75, margin: 0 }}>
            Custom tailoring, garment manufacturing, and finishing for polo shirts, campaign shirts, caps, jackets, and patches.
          </p>
        </Reveal>

        <div className="cap-grid">
          {CAPS.map((c, i) => (
            <div key={c.title} className="cap-card" style={{ background: '#fff', borderRadius: 22, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <Photo photo={c.photo} pos={c.pos} ratio="4/3" radius={0} delay={i * 0.1} shade />
              <div style={{ padding: '18px 20px 22px' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: T.ink }}>{c.title}</h3>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: T.ink2 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Reveal delay={0.1} style={{ marginTop: 28 }}>
          <div className="pa-card" style={{ padding: 24, borderRadius: 24, background: '#EEF2F7', border: `1px solid ${T.border}` }}>
            <Photo photo={P.printAuthority} ratio="592/707" radius={16} style={{ maxWidth: 260, width: '100%', margin: '0 auto' }} />
            <div>
              <p style={{ color: T.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Print Authority by VFRB Enterprise
              </p>
              <h3 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px,2.6vw,32px)', margin: '0 0 12px', color: T.ink, lineHeight: 1.2 }}>
                Customized prints for events, promotions, and teams.
              </h3>
              <p style={{ color: T.ink2, fontSize: 14.5, lineHeight: 1.75, margin: '0 0 16px' }}>
                Full sublimation, silk screen printing, and computerized embroidery, with made-to-order uniforms and bulk orders accepted.
                Muntinlupa and Batangas branches.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <motion.a whileHover={{ y: -2 }} whileTap={{ scale: .97 }} href="mailto:print.vfrb@gmail.com"
                  style={{ padding: '11px 18px', borderRadius: 10, background: '#fff', border: `1px solid ${T.border}`, color: T.ink2,
                    fontSize: 13.5, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
                  ✉ print.vfrb@gmail.com
                </motion.a>
                <motion.a whileHover={{ y: -2 }} whileTap={{ scale: .97 }} href="tel:09490855568"
                  style={{ padding: '11px 18px', borderRadius: 10, background: '#fff', border: `1px solid ${T.border}`, color: T.ink2,
                    fontSize: 13.5, fontWeight: 600, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
                  📞 0949 085 5568
                </motion.a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
