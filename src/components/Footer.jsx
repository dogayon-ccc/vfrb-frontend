// src/components/Footer.jsx
// Used on: Landing (light), Guide/FAQ/Our Team/Privacy/Terms (dark, default).
// Not used inside AdminLayout/CustomerLayout — those have their own nav shells.
// "Explore" links are Landing-page section anchors; from another page they
// navigate home first, then scroll once Landing has mounted.

import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';

const EXPLORE = [
  { label: 'About',        id: 'about' },
  { label: 'Features',     id: 'features' },
  { label: 'How It Works', id: 'how' },
  { label: 'Designs',      id: 'categories' },
];

const RESOURCES = [
  { label: 'Guide',     to: '/guide' },
  { label: 'FAQ',       to: '/faq' },
  { label: 'Our Team',  to: '/our-team' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
];

export default function Footer({ light = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const c = light
    ? { border:'#E2E8F0', bg:'linear-gradient(to top,#EEF2F7,#F8FAFC)', head:'#94a3b8',
        strong:'#1A2332', body:'#4A5568', faint:'#64748b', faintest:'#94a3b8',
        iconBg:'#fff', iconBorder:'#E2E8F0', hover:'#028090' }
    : { border:'rgba(255,255,255,0.06)', bg:'linear-gradient(to top,rgba(0,0,0,0.6),rgba(0,0,0,0.25))',
        head:'rgba(255,255,255,0.28)', strong:'#fff', body:'rgba(255,255,255,0.35)',
        faint:'rgba(255,255,255,0.2)', faintest:'rgba(255,255,255,0.15)',
        iconBg:'rgba(255,255,255,0.05)', iconBorder:'rgba(255,255,255,0.12)', hover:'#fff' };

  const iconStyle = { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:10, background:c.iconBg, border:`1px solid ${c.iconBorder}`,
    color: light ? c.strong : '#fff', textDecoration:'none', fontWeight:700, transition:'all .2s' };
  const footerHead = { fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase',
    color:c.head, marginBottom:16 };
  const footerLinkBase = { display:'block', background:'none', border:'none', color:c.body,
    fontSize:14, cursor:'pointer', textAlign:'left', padding:'6px 0',
    fontFamily:'var(--font)', transition:'all .2s', textDecoration:'none' };
  const hoverProps = () => ({
    onMouseEnter: (e) => { e.currentTarget.style.color = c.hover; e.currentTarget.style.transform = 'translateX(4px)'; },
    onMouseLeave: (e) => { e.currentTarget.style.color = c.body; e.currentTarget.style.transform = 'translateX(0)'; },
  });

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' }), 250);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  };

  return (
    <footer style={{ borderTop:`1px solid ${c.border}`, background:c.bg }}>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'56px 40px 32px' }}>

        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1.5fr', gap:40, marginBottom:40 }}
          className="vfrb-footer-grid">

          {/* ── COMPANY INFO ── */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, cursor:'pointer' }}
              onClick={() => { navigate('/'); setTimeout(() => window.scrollTo({ top:0, behavior:'smooth' }), 250); }}>
              <img src={logo} alt="VFRB" style={{ width:38, height:38, borderRadius:10, objectFit:'cover',
                border:'1px solid rgba(2,195,154,0.4)' }}/>
              <div>
                <p style={{ color:c.strong, fontWeight:700, fontSize:14, margin:0, fontFamily:"Georgia,'Times New Roman',serif" }}>
                  VFRB Enterprise
                </p>
                <p style={{ color:c.faintest, fontSize:11, margin:0 }}>Tailor Centre Manila</p>
              </div>
            </div>

            <p style={{ color:c.body, fontSize:13, lineHeight:1.8 }}>
              Muntinlupa City, Philippines 1772<br/>
              Production: Sto. Tomas, Batangas<br/>
              0921 791 6259
            </p>

            <div style={{ display:'flex', gap:12, marginTop:16 }}>
              <a href="https://www.facebook.com/tailorcentrevfrbmanila" target="_blank" rel="noopener noreferrer" style={iconStyle}>f</a>
              <a href="mailto:vfrb.enterprise@gmail.com" style={iconStyle}>✉</a>
            </div>
          </div>

          {/* ── EXPLORE (Landing sections) ── */}
          <div>
            <p style={footerHead}>Explore</p>
            {EXPLORE.map(link => (
              <button key={link.id} onClick={() => scrollToSection(link.id)}
                style={footerLinkBase} {...hoverProps()}>
                {link.label}
              </button>
            ))}
          </div>

          {/* ── RESOURCES ── */}
          <div>
            <p style={footerHead}>Resources</p>
            {RESOURCES.map(link => (
              <Link key={link.to} to={link.to} style={footerLinkBase} {...hoverProps()}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── LOCATION ── */}
          <div>
            <p style={footerHead}>Location</p>
            <div style={{ borderRadius:14, overflow:'hidden', border:`1px solid ${c.iconBorder}` }}>
              <iframe title="VFRB Location"
                src="https://www.google.com/maps?q=31+San+Guillermo+St+Bayanan+Muntinlupa+City+Philippines+1770&output=embed"
                width="100%" height="140" style={{ border:0, borderRadius:12 }} loading="lazy"/>
            </div>
            <p style={{ color:c.body, fontSize:12, marginTop:8 }}>Muntinlupa City, Philippines</p>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:20, textAlign:'center' }}>
          <p style={{ color:c.faint, fontSize:12, marginBottom:4 }}>
            © {new Date().getFullYear()} VFRB Enterprise · AI-Enabled Sales and Inventory Management System
          </p>
          <p style={{ color:c.faintest, fontSize:11 }}>
            Capstone project by Araos, Espeja, Llanto, Ogayon · CCC BSIT 2026
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) { .vfrb-footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 560px) { .vfrb-footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
