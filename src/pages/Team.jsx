// src/pages/Team.jsx — VFRB Enterprise's own family/business page. Group 60 (researchers) lives in Group60.jsx.
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MarketingNav from '../components/MarketingNav';
import Footer from '../components/Footer';
import Reveal from '../components/landing/Reveal';
import Photo from '../components/landing/Photo';
import { T } from './landing/tokens';
import { P } from './landing/photos';

const OWNERS = [
  { photo: P.fe, name: 'Fe Tiama Boitizon', role: 'Owner', line: 'VFRB Enterprise · Sole proprietorship' },
  { photo: P.roxanne, name: 'Roxanne Boitizon Baddiri', role: 'Daughter of Ma\u2019am Fe', line: 'VFRB Enterprise family' },
];
const MAKE = ['Custom tailoring', 'Garment manufacturing', 'Computerized embroidery', 'Company uniforms',
  'Polo shirts', 'Campaign shirts', 'Caps', 'Jackets', 'Patches'];
const SERVE = ['Local offices', 'Corporate clients', 'Schools', 'Institutional organizations'];
const label = { color: T.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 };
const chip = { fontSize: 13, padding: '7px 14px', borderRadius: 100, color: T.teal,
  background: 'rgba(2,195,154,0.08)', border: '1px solid rgba(2,195,154,0.25)' };

export default function Team() {
  const navigate = useNavigate();
  return (
    <div style={{ fontFamily: 'var(--font)', background: T.bg, color: T.ink, minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;} body{margin:0;background:${T.bg};}
        .tm-owners{display:grid;grid-template-columns:1fr;gap:20px;}
        .tm-two{display:grid;grid-template-columns:1fr;gap:32px;align-items:start;}
        .tm-gal{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .tm-gal .wide{grid-column:span 2;}
        @media(min-width:641px){.tm-owners{grid-template-columns:1fr 1fr;}}
        @media(min-width:900px){.tm-two{grid-template-columns:1fr 1fr;gap:64px;} .tm-gal{grid-template-columns:repeat(3,1fr);gap:16px;} .tm-gal .wide{grid-column:span 2;}}
        @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important;}}
      `}</style>

      <MarketingNav />

      <header style={{ position: 'relative', minHeight: 'clamp(360px,52vw,520px)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Photo photo={P.familyCourt} instant radius={0} ratio="auto" hover={false} pos="center 40%" style={{ height: '100%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,16,26,0.88),rgba(6,16,26,0.25) 60%,rgba(6,16,26,0.35))' }} />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          style={{ position: 'relative', maxWidth: 1080, width: '100%', margin: '0 auto', padding: '0 20px 48px' }}>
          <p style={{ ...label, marginBottom: 12 }}>Our Team</p>
          <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(30px,5vw,56px)', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '0 0 14px', maxWidth: 720 }}>
            The family behind VFRB Enterprise.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.7, maxWidth: 620, margin: 0 }}>
            A medium-scale, family-owned garment industry, specialized in corporate and company uniforms.
          </p>
        </motion.div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 20px 24px' }}>
        <Reveal style={{ marginBottom: 32 }}>
          <p style={label}>Ownership</p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, margin: 0, color: T.ink }}>Meet the family.</h2>
        </Reveal>
        <div className="tm-owners">
          {OWNERS.map((o, i) => (
            <motion.div key={o.name} whileHover={{ y: -6 }} transition={{ duration: 0.3 }}
              style={{ background: '#fff', border: `1px solid ${T.border}`, borderRadius: 24, overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(2,35,50,0.08)' }}>
              <Photo photo={o.photo} ratio="1/1" radius={0} pos="center 25%" delay={i * 0.15} />
              <div style={{ padding: '20px 22px 24px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: T.ink }}>{o.name}</h3>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.teal }}>{o.role}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: T.ink3 }}>{o.line}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Reveal style={{ margin: '72px 0 0' }}>
          <blockquote style={{ margin: 0, padding: '8px 0 8px 20px', borderLeft: `3px solid ${T.accent}`,
            fontFamily: 'var(--font)', fontSize: 'clamp(18px,2.2vw,24px)', lineHeight: 1.6, color: T.ink2, fontStyle: 'italic' }}>
            Our company caters all kinds of tailoring service and garments needs from local to international
            market ensuring high quality products and services.
          </blockquote>
        </Reveal>

        <div className="tm-two" style={{ marginTop: 72 }}>
          <Reveal>
            <p style={label}>What we make</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{MAKE.map(m => <span key={m} style={chip}>{m}</span>)}</div>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={label}>Who we serve</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>{SERVE.map(m => <span key={m} style={chip}>{m}</span>)}</div>
            <p style={label}>Find us</p>
            <p style={{ margin: 0, color: T.ink2, fontSize: 14.5, lineHeight: 1.8 }}>
              31 San Guillermo St., Brgy. Bayanan,<br />Muntinlupa City, Philippines
            </p>
          </Reveal>
        </div>

        <Reveal style={{ margin: '72px 0 24px' }}>
          <p style={label}>The team</p>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, margin: 0, color: T.ink }}>
            Family, staff, and the production floor.
          </h2>
        </Reveal>
        <div className="tm-gal">
          <Photo photo={P.familyDinner} ratio="16/10" radius={20} className="wide" caption="The VFRB family and team" />
          <Photo photo={P.workers} ratio="4/3" radius={20} pos="center 30%" delay={0.1} caption="Production team" />
          <Photo photo={P.sewing4} ratio="4/3" radius={20} delay={0.1} caption="Sewing line" />
          <Photo photo={P.sewing2} ratio="4/3" radius={20} delay={0.15} caption="At work" />
          <Photo photo={P.sewing3} ratio="4/3" radius={20} delay={0.2} caption="Machine stations" />
        </div>

        <Reveal style={{ margin: '72px 0 0' }}>
          <div style={{ borderRadius: 24, padding: '40px 24px', textAlign: 'center', background: 'linear-gradient(135deg,#023d47,#028090)' }}>
            <h2 style={{ fontFamily: 'var(--font)', color: '#fff', fontSize: 'clamp(22px,3vw,34px)', margin: '0 0 12px' }}>Ready to design your next uniform?</h2>
            <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: .97 }} onClick={() => navigate('/register')}
              style={{ background: T.accent, border: 'none', color: '#06101a', fontWeight: 700, fontSize: 15, padding: '14px 32px',
                borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', minHeight: 48 }}>
              Create Free Account →
            </motion.button>
          </div>
        </Reveal>
      </main>

      <Footer light />
    </div>
  );
}
