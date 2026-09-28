// src/components/landing/SamplesSection.jsx — product samples, packaging and bags (real photos).
import Reveal from './Reveal';
import Photo from './Photo';
import { T } from '../../pages/landing/tokens';
import { P } from '../../pages/landing/photos';

const TILES = [
  { photo: P.uniforms, caption: 'Embroidered emblems on shirts and blazers', className: 'sm-wide', pos: '30% center' },
  { photo: P.tees, caption: 'Screen-printed tees', className: 'sm-tall', pos: 'center' },
  { photo: P.sublimationTee, caption: 'Sublimated sports shirt', className: 'sm-tall', pos: 'center' },
  { photo: P.packed, caption: 'Packed and labeled for delivery', className: 'sm-one', pos: 'center' },
  { photo: P.ecobag, caption: 'Branded reusable bags', className: 'sm-one', pos: 'center' },
];

export default function SamplesSection() {
  return (
    <section id="gallery" className="section-pad" style={{ padding: '72px 20px', background: '#EEF2F7',
      borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
      <style>{`
        .sm-grid{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:230px;gap:12px;}
        .sm-wide{grid-column:span 2;}
        @media(min-width:1025px){
          .sm-grid{grid-template-columns:repeat(4,1fr);grid-auto-rows:250px;gap:16px;}
          .sm-tall{grid-row:span 2;}
        }
      `}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 36, maxWidth: 640 }}>
          <p style={{ color: T.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            Gallery
          </p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 700, color: T.ink, lineHeight: 1.15, margin: 0 }}>
            Finished pieces, ready for delivery.
          </h2>
        </Reveal>
        <div className="sm-grid">
          {TILES.map((t, i) => (
            <Photo key={t.caption} photo={t.photo} caption={t.caption} pos={t.pos} radius={18}
              delay={i * 0.07} className={t.className} style={{ height: '100%' }} />
          ))}
        </div>
      </div>
    </section>
  );
}
