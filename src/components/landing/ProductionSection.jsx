// src/components/landing/ProductionSection.jsx — dark production-floor gallery (real photos).
import Reveal from './Reveal';
import Photo from './Photo';
import { P } from '../../pages/landing/photos';

const TILES = [
  { photo: P.sewing4, caption: 'The sewing line', className: 'pf-a', pos: 'center' },
  { photo: P.workers, caption: 'The VFRB production team', className: 'pf-b', pos: 'center 30%' },
  { photo: P.sewing1, caption: 'Working together', className: 'pf-c', pos: 'center' },
  { photo: P.sewing3, caption: 'Machine stations', className: 'pf-d', pos: 'center' },
];

export default function ProductionSection() {
  return (
    <section id="production" className="section-pad"
      style={{ padding: '72px 20px', background: 'linear-gradient(180deg,#06121b,#0a2530)', position: 'relative' }}>
      <style>{`
        .pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .pf-a{grid-column:span 2;aspect-ratio:16/10;}
        .pf-b{grid-column:span 2;aspect-ratio:16/9;}
        .pf-c,.pf-d{aspect-ratio:4/3;}
        @media(min-width:1025px){
          .pf-grid{grid-template-columns:repeat(4,1fr);grid-auto-rows:210px;gap:16px;}
          .pf-a{grid-column:span 2;grid-row:span 2;aspect-ratio:auto;}
          .pf-b{grid-column:span 2;grid-row:span 1;aspect-ratio:auto;}
          .pf-c,.pf-d{grid-column:span 1;grid-row:span 1;aspect-ratio:auto;}
        }
      `}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <Reveal style={{ marginBottom: 36, maxWidth: 640 }}>
          <p style={{ color: '#02C39A', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 14 }}>Inside VFRB</p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 700,
            color: '#fff', lineHeight: 1.15, margin: '0 0 14px' }}>
            Where every uniform is made.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
            Real people, real machines, and a production floor built around tailoring and garment manufacturing.
          </p>
        </Reveal>
        <div className="pf-grid">
          {TILES.map((t, i) => (
            <Photo key={t.caption} photo={t.photo} caption={t.caption} pos={t.pos} radius={18}
              delay={i * 0.08} className={t.className} style={{ minHeight: 0 }} />
          ))}
        </div>
      </div>
    </section>
  );
}
