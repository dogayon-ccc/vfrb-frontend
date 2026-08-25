// src/components/MarketingNav.jsx
// Shared navbar for FAQ / Guide / Our Team — matches Landing's real layout
// (logo+name left, About/Features/How It Works/Designs, Log In + Get
// Started right). Fonts intentionally use the already-fixed local-safe
// stack (Georgia serif / var(--font)), NOT Landing's 'Cormorant Garamond'/
// 'DM Sans', since those are pulled from a Google Fonts CDN @import that
// was already flagged and fixed elsewhere (FF-1/FF-2) — reintroducing them
// here would undo that fix.
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';

const T = { teal: '#028090', accent: '#02C39A' };
const NAV = [
  { label: 'About', id: 'about' },
  { label: 'Features', id: 'features' },
  { label: 'How It Works', id: 'how' },
  { label: 'Designs', id: 'categories' },
];

export default function MarketingNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollTo = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(6,16,26,0.97)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      }}>
        <button onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          <img src={logo} alt="VFRB" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(2,195,154,0.35)' }}/>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1, fontFamily: "Georgia,'Times New Roman',serif", whiteSpace: 'nowrap' }}>VFRB Enterprise</p>
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, marginTop: 2, whiteSpace: 'nowrap' }}>Tailor Centre Manila</p>
          </div>
        </button>

        <div className="mnav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {NAV.map(n => (
            <button key={n.label} onClick={() => scrollTo(n.id)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14,
                cursor: 'pointer', padding: '6px 0', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
              {n.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => navigate('/login')}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.6)',
              fontSize: 13, cursor: 'pointer', padding: '9px 18px', borderRadius: 9, fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
            Log In
          </button>
          <button onClick={() => navigate('/register')}
            style={{ background: `linear-gradient(135deg,${T.teal},${T.accent})`, border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 9, cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(2,195,154,0.3)', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
            Get Started →
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .mnav-links { display: none !important; } }
      `}</style>
    </div>
  );
}
