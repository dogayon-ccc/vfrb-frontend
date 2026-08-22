// src/components/Footer.jsx
// VFRB Enterprise — Site-wide footer
//
// Used on: Landing, Guide, FAQ, Our Team (public/dark-theme pages).
// Not used inside AdminLayout/CustomerLayout — those are operational app
// shells with their own sidebar/bottom-nav; a marketing-style footer would
// just add clutter there. Scope for this task is public-facing pages only.
//
// "Explore" links (About/Features/How/Designs) are Landing-page section
// anchors. If the footer is rendered on a page other than "/", clicking one
// navigates home first, then scrolls once the page has mounted.
//
// Team credit line uses ONLY the four real, verified capstone team members —
// no invented names or roles. Source: login page footer + manuscript title page.

import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/company-logo.jpg';

const iconStyle = {
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff', textDecoration: 'none', fontWeight: 700, transition: 'all .2s',
};

const footerHead = {
  fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.28)', marginBottom: 16,
};

const footerLinkBase = {
  display: 'block', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
  fontSize: 14, cursor: 'pointer', textAlign: 'left', padding: '6px 0',
  fontFamily: 'var(--font)', transition: 'all .2s', textDecoration: 'none',
};

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
];

function hoverProps() {
  return {
    onMouseEnter: (e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateX(4px)'; },
    onMouseLeave: (e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'translateX(0)'; },
  };
}

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id) => {
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for Landing to mount before scrolling to the section.
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.25))',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 40px 32px' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
          gap: 40,
          marginBottom: 40,
        }}
        className="vfrb-footer-grid">

          {/* ── COMPANY INFO ── */}
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}
              onClick={() => { navigate('/'); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 250); }}
            >
              <img src={logo} alt="VFRB" style={{
                width: 38, height: 38, borderRadius: 10, objectFit: 'cover',
                border: '1px solid rgba(2,195,154,0.4)',
              }}/>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, fontFamily: "Georgia,'Times New Roman',serif" }}>
                  VFRB Enterprise
                </p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>
                  Tailor Centre Manila
                </p>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.8 }}>
              Muntinlupa City, Philippines 1772<br/>
              Production: Sto. Tomas, Batangas<br/>
              0921 791 6259
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
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

          {/* ── RESOURCES (Guide / FAQ / Our Team) ── */}
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
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <iframe
                title="VFRB Location"
                src="https://www.google.com/maps?q=31+San+Guillermo+St+Bayanan+Muntinlupa+City+Philippines+1770&output=embed"
                width="100%" height="140" style={{ border: 0, borderRadius: 12 }} loading="lazy"
              />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 8 }}>
              Muntinlupa City, Philippines
            </p>
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginBottom: 4 }}>
            © {new Date().getFullYear()} VFRB Enterprise · AI-Enabled Sales and Inventory Management System
          </p>
          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
            Capstone project by Araos, Espeja, Llanto, Ogayon · CCC BSIT 2026
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .vfrb-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .vfrb-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
