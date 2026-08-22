// src/pages/Team.jsx
// VFRB Enterprise — Our Team
//
// INTENTIONALLY name-only. No bios, photos, roles, or fun facts are
// included because none of that has been provided for these real people.
// A fabricated bio would be dishonest; a plain name list is correct.
// Names + adviser sourced verbatim from the capstone manuscript title page.
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';
import Footer from '../components/Footer';

const T = { teal: '#028090', accent: '#02C39A', dark: '#06101a' };

const TEAM = [
  'Araos, Alvin II B.',
  'Espeja, Riemar D.',
  'Llanto, John Christian C.',
  'Ogayon, Dave Laurence S.',
];

function Header() {
  const navigate = useNavigate();
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(6,16,26,0.97)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        maxWidth: 1000, margin: '0 auto', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
          <img src={logo} alt="VFRB" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', border: '2px solid rgba(2,195,154,0.35)' }}/>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: "Georgia,'Times New Roman',serif" }}>VFRB Enterprise</span>
        </button>
        <button onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, padding: '8px 16px',
            borderRadius: 9, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

export default function Team() {
  return (
    <div style={{ fontFamily: 'var(--font)', background: T.dark, color: '#fff', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;background:${T.dark};}
      `}</style>

      <Header/>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px 40px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p style={{ color: T.accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Our Team
          </p>
          <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginBottom: 14, lineHeight: 1.15 }}>
            The people behind this system
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            VFRB Enterprise's AI-Enabled Sales and Inventory Management System with Raw Materials
            Recommendation is a capstone project by BSIT students at City College of Calamba (CCC BSIT 2026).
          </p>
        </motion.div>

        <div style={{
          marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: 16, textAlign: 'left',
        }}>
          {TEAM.map((name, i) => (
            <motion.div key={name}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              style={{
                padding: '22px 20px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(2,195,154,0.25), rgba(2,128,144,0.25))',
                border: '1px solid rgba(2,195,154,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: T.accent, fontWeight: 700, fontSize: 14,
              }}>
                {name.charAt(0)}
              </div>
              <p style={{ fontSize: 14.5, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{name}</p>
            </motion.div>
          ))}
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ marginTop: 40, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
          Research Adviser: Dr. Rowan N. Elomina
        </motion.p>
      </div>

      <Footer/>
    </div>
  );
}
