// src/pages/Landing.jsx — VFRB Enterprise marketing landing page.
// Sections split into src/components/landing/*; shared color/content tokens in src/pages/landing/tokens.js.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScroll, useTransform, MotionConfig } from 'framer-motion';
import Footer from '../components/Footer';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import AboutSection from '../components/landing/AboutSection';
import ProductionSection from '../components/landing/ProductionSection';
import CapabilitiesSection from '../components/landing/CapabilitiesSection';
import SamplesSection from '../components/landing/SamplesSection';
import FamilyTeaser from '../components/landing/FamilyTeaser';
import HowSection from '../components/landing/HowSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import CTASection from '../components/landing/CTASection';
import { T, NAV } from './landing/tokens';

const SECTION_IDS = ['about', ...NAV.map(n => n.id).filter(id => id !== 'about'), 'production'];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0,500], [0,-50]);

  useEffect(() => {
    const u = scrollY.on('change', v => setScrolled(v > 50));
    return u;
  }, [scrollY]);

  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) setActive(NAV.some(n => n.id === e.target.id) ? e.target.id : null);
    }), { rootMargin:'-45% 0px -50% 0px' });
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  // Close menu when scrolled
  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
  }, [scrolled]);

  // Close menu on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const go = p => { navigate(p); setMenuOpen(false); };
  const scrollTo = id => {
    // Close menu AFTER scroll starts — prevents layout shift interrupting scroll
    setMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 60); // 60ms delay lets menu close animation complete first
  };

  return (
    <MotionConfig reducedMotion="user">
    <div style={{ fontFamily:'var(--font)', background:T.bg, color:T.ink,
      minHeight:'100vh', overflowX:'hidden' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{margin:0;background:${T.bg};}
        ::placeholder{color:${T.ink3};}

        /* Nav link hover underline */
        .nl{position:relative;}
        .nl::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1.5px;background:${T.accent};transition:width .25s;}
                .nl:hover::after{width:100%;}

        .cat-btn{transition:all .2s;}
        .cat-btn:hover{transform:translateY(-2px);}
        .feat-card{transition:all .3s;}
        .feat-card:hover{transform:translateY(-4px);}
        .step-card{transition:all .3s;}
        .step-card:hover{background:rgba(2,128,144,0.08)!important;border-color:rgba(2,128,144,0.3)!important;transform:translateY(-5px);}

        /* ── RESPONSIVE (mobile-first) ─────────────── */
        .desk-nav, .desk-ctas { display:none; }
        .hamburger { display:flex; }

        .hero-visual { order:-1; margin-bottom:8px; }
        .hero-collage { position:relative; width:100%; max-width:560px; margin:0 auto; aspect-ratio:1/0.9; }

        .hero-btns { flex-direction:column; }
        .hero-btns button { width:100%!important; max-width:100%!important; }

        @media(min-width:641px){
          .hero-grid  { grid-template-columns:1fr 1fr!important; }
          .steps-grid { grid-template-columns:1fr 1fr!important; }
          .feat-grid  { grid-template-columns:1fr 1fr!important; }
          .hero-stats { gap:28px!important; }
          .cat-strip  { gap:10px!important; }
          .cat-btn    { padding:11px 18px!important; font-size:14px!important; }
          .hero-title { font-size:clamp(38px,5vw,68px)!important; }
          .hero-desc  { font-size:16px!important; }
          .hero-stat-num{ font-size:26px!important; }
        }

        @media(min-width:1025px){
          .desk-nav, .desk-ctas { display:flex; }
          .hamburger  { display:none; }
          .hero-grid  { grid-template-columns:1fr 1fr!important; }
          .hero-visual{ order:0; margin-bottom:0; }
          .hero-collage{ aspect-ratio:1/1.05; margin:0 0 0 auto; }
          .about-grid { grid-template-columns:1fr 1fr!important; gap:72px!important; }
          .steps-grid { grid-template-columns:repeat(4,1fr)!important; }
          .feat-grid  { grid-template-columns:repeat(3,1fr)!important; }
          .section-pad{ padding:96px 40px!important; }
          .hero-pad   { padding:72px 40px!important; }
          .cat-pad    { padding:40px 40px!important; }
          .nav-inner  { padding:0 40px!important; }
          .cta-inner  { padding:64px 48px!important; }
          .hero-btns  { flex-direction:row; }
          .hero-btns button{ width:auto!important; max-width:none!important; }
        }

        @keyframes pulse-glow{0%,100%{opacity:.15}50%{opacity:.35}}
        @media (prefers-reduced-motion: reduce){
          html{scroll-behavior:auto;}
          *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;}
        }

        /* Focus ring for keyboard nav */
        button:focus-visible, a:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
          border-radius: 6px;
        }
      `}</style>

      <Nav scrolled={scrolled} menuOpen={menuOpen} setMenuOpen={setMenuOpen} go={go} scrollTo={scrollTo} active={active}/>
      <Hero heroY={heroY} go={go} scrollTo={scrollTo}/>
      <AboutSection go={go}/>
      <ProductionSection/>
      <CapabilitiesSection/>
      <SamplesSection/>
      <HowSection/>
      <FeaturesSection/>
      <FamilyTeaser go={go}/>
      <CTASection go={go}/>
      <Footer light/>
    </div>
    </MotionConfig>
  );
}
