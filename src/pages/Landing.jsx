// src/pages/Landing.jsx
// VFRB Enterprise — Customer-facing landing page
// MOBILE FIX: hamburger menu z-index, overflow, CTA visibility, touch targets
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import logo from '../assets/company-logo.jpg';
import Footer from '../components/Footer';

const T = {
  teal:   '#028090',
  accent: '#02C39A',
  dark:   '#06101a',
  card:   'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
};

function GarmentHologram() {
  return (
    <div style={{ position:'relative', width:'100%', maxWidth:360, margin:'0 auto' }}>
      <motion.div animate={{ opacity:[0.2,0.45,0.2], scale:[1,1.06,1] }}
        transition={{ duration:5, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', inset:-32, borderRadius:'50%',
          background:'radial-gradient(ellipse,rgba(2,195,154,0.2),transparent 70%)',
          filter:'blur(24px)', pointerEvents:'none' }}/>
      <svg viewBox="0 0 340 420" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ width:'100%', filter:'drop-shadow(0 0 20px rgba(2,195,154,0.22))' }}>
        <defs>
          <pattern id="g" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0L0 0 0 20" fill="none" stroke="rgba(2,195,154,0.07)" strokeWidth="0.5"/>
          </pattern>
          <linearGradient id="fab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(2,128,144,0.28)"/>
            <stop offset="100%" stopColor="rgba(2,195,154,0.07)"/>
          </linearGradient>
          <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)"/>
            <stop offset="100%" stopColor="rgba(2,195,154,0.04)"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="340" height="420" fill="url(#g)" rx="4"/>
        <motion.path d="M100 80L60 110L40 200L40 340L300 340L300 200L280 110L240 80Z"
          fill="url(#fab)" stroke="rgba(2,195,154,0.55)" strokeWidth="1.5"
          initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:2, ease:'easeOut' }}/>
        <path d="M100 80L60 110L40 200L40 340L300 340L300 200L280 110L240 80Z" fill="url(#sh)"/>
        <motion.path d="M100 80L170 150L240 80" fill="none"
          stroke="rgba(2,195,154,0.9)" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength:0 }} animate={{ pathLength:1 }}
          transition={{ duration:1.2, delay:0.5 }} filter="url(#glow)"/>
        <motion.path d="M60 110L18 185L18 230L52 230L62 175L72 155"
          fill="rgba(2,128,144,0.14)" stroke="rgba(2,195,154,0.5)" strokeWidth="1.5"
          initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:1.2, delay:1 }}/>
        <motion.path d="M280 110L322 185L322 230L288 230L278 175L268 155"
          fill="rgba(2,128,144,0.14)" stroke="rgba(2,195,154,0.5)" strokeWidth="1.5"
          initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
          transition={{ duration:1.2, delay:1.1 }}/>
        <motion.line x1="18" y1="226" x2="52" y2="226" stroke="rgba(2,195,154,0.8)" strokeWidth="2"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:1.8 }}/>
        <motion.line x1="288" y1="226" x2="322" y2="226" stroke="rgba(2,195,154,0.8)" strokeWidth="2"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ delay:1.9 }}/>
        <motion.rect x="85" y="165" width="60" height="44" rx="4"
          fill="rgba(2,128,144,0.1)" stroke="rgba(2,195,154,0.65)" strokeWidth="1.5"
          initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
          transition={{ delay:1.8, duration:0.5 }}/>
        <motion.circle cx="195" cy="185" r="18" fill="rgba(2,195,154,0.07)"
          stroke="rgba(2,195,154,0.55)" strokeWidth="1.5" strokeDasharray="3 2"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.1 }}/>
        <motion.text x="195" y="190" textAnchor="middle"
          fill="rgba(2,195,154,0.65)" fontSize="8" fontFamily="monospace" fontWeight="bold"
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.3 }}>LOGO</motion.text>
        <motion.line x1="40" y1="335" x2="300" y2="335"
          stroke="rgba(2,195,154,0.55)" strokeWidth="2"
          initial={{ scaleX:0 }} animate={{ scaleX:1 }}
          transition={{ delay:1.3, duration:0.8 }} style={{ transformOrigin:'170px 335px' }}/>
        <motion.rect x="38" y="0" width="264" height="2" rx="1"
          fill="rgba(2,195,154,0.35)"
          animate={{ y:[80,338,80] }} transition={{ duration:4, repeat:Infinity, ease:'linear', delay:2.5 }}
          style={{ filter:'blur(1px)' }}/>
        {['M15,40 L15,15 L40,15','M300,15 L325,15 L325,40','M15,380 L15,405 L40,405','M300,405 L325,405 L325,380'].map((d,i)=>(
          <motion.path key={i} d={d} fill="none" stroke="rgba(2,195,154,0.5)" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength:0 }} animate={{ pathLength:1 }} transition={{ duration:0.5, delay:0.1+i*0.1 }}/>
        ))}
        <motion.g initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.4 }}>
          <line x1="40" y1="358" x2="300" y2="358" stroke="rgba(255,200,0,0.35)" strokeWidth="1" strokeDasharray="3 3"/>
          <line x1="40" y1="354" x2="40" y2="362" stroke="rgba(255,200,0,0.45)" strokeWidth="1.5"/>
          <line x1="300" y1="354" x2="300" y2="362" stroke="rgba(255,200,0,0.45)" strokeWidth="1.5"/>
          <text x="170" y="372" textAnchor="middle" fill="rgba(255,200,0,0.45)" fontSize="8" fontFamily="monospace">96 cm — VFRB Proprietary M baseline</text>
        </motion.g>
        <motion.g initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2.8 }}>
          <rect x="108" y="390" width="124" height="18" rx="9" fill="rgba(2,128,144,0.28)" stroke="rgba(2,195,154,0.4)" strokeWidth="1"/>
          <text x="170" y="402" textAnchor="middle" fill="rgba(2,195,154,0.9)" fontSize="7.5" fontFamily="monospace" letterSpacing="1">AI RECOMMENDATION</text>
        </motion.g>
      </svg>
    </div>
  );
}

function Reveal({ children, delay=0, style={}, className='' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once:true, margin:'-60px' });
  return (
    <motion.div ref={ref} style={style} className={className}
      initial={{ opacity:0, y:28 }} animate={inView ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.7, delay, ease:[0.22,1,0.36,1] }}>
      {children}
    </motion.div>
  );
}

const NAV  = [{ label:'About',    id:'about' },{ label:'Features', id:'features' },{ label:'How It Works', id:'how' },{ label:'Designs', id:'categories' }];
const CATS = [
  { icon:'🩺', label:'Medical / Scrubs', count:'7 designs', color:'#028090' },
  { icon:'🏫', label:'School Uniform',   count:'3 designs', color:'#3b82f6' },
  { icon:'💼', label:'Corporate Polo',   count:'4 designs', color:'#6366f1' },
  { icon:'⚽', label:'PE / Sports',      count:'2 designs', color:'#f97316' },
  { icon:'🥼', label:'Lab Coat',         count:'2 designs', color:'#64748b' },
];
const FEATS = [
  { icon:'🎨', title:'Visual Design Studio',    desc:'Configure collar, sleeve, color, pockets, and logo — front and back view — before submitting.', hl:false },
  { icon:'🤖', title:'AI Material Recommendation', desc:'Gemini AI recommends raw material categories for your order. VFRB production staff confirm exact quantities.', hl:true },
  { icon:'📧', title:'Direct Order Flow',       desc:"Your design and specifications go directly to VFRB's production team. No cart needed.", hl:false },
  { icon:'📏', title:'Standard & Custom Sizing',desc:'PH BPS XS–3XL standard sizes, or submit custom measurements for VFRB staff to review.', hl:false },
  { icon:'📄', title:'Design Summary Receipt',  desc:'Full design brief with AI material recommendations — sent to VFRB staff for review.', hl:false },
  { icon:'🔒', title:'RA 10173 Compliant',      desc:'Philippine Data Privacy Act. No payment info collected. Your data is used only for your order.', hl:false },
];
const STEPS = [
  { n:'01', title:'Browse & Select',    desc:'Explore 21 standard uniforms across Medical, School, Corporate, PE, and Lab categories.' },
  { n:'02', title:'Configure Details',  desc:'Set collar, sleeve, color, pockets, and logo for your custom garment order.' },
  { n:'03', title:'AI Recommends Materials', desc:'Gemini AI reviews your specifications and recommends the types of raw materials needed for your order.' },
  { n:'04', title:'Submit to VFRB',     desc:'Review your design brief and AI recommendation, submit. VFRB Enterprise responds within 24 hours.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0,500], [0,-50]);

  useEffect(() => {
    const u = scrollY.on('change', v => setScrolled(v > 50));
    return u;
  }, [scrollY]);

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
    <div style={{ fontFamily:'var(--font)', background:T.dark, color:'#fff',
      minHeight:'100vh', overflowX:'hidden' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{margin:0;background:${T.dark};}
        ::placeholder{color:rgba(255,255,255,0.2);}

        /* Nav link hover underline */
        .nl{position:relative;}
        .nl::after{content:'';position:absolute;bottom:-2px;left:0;width:0;height:1.5px;background:${T.accent};transition:width .25s;}
        .nl:hover{color:#fff!important;}
        .nl:hover::after{width:100%;}

        .cat-btn{transition:all .2s;}
        .cat-btn:hover{transform:translateY(-2px);}
        .feat-card{transition:all .3s;}
        .feat-card:hover{transform:translateY(-4px);}
        .step-card{transition:all .3s;}
        .step-card:hover{background:rgba(2,128,144,0.08)!important;border-color:rgba(2,128,144,0.3)!important;transform:translateY(-5px);}

        /* ── RESPONSIVE ─────────────────────────────── */

        /* Desktop (>1024px) */
        .desk-nav   { display:flex; }
        .desk-ctas  { display:flex; }
        .hamburger  { display:none!important; }
        .mob-cta    { display:none!important; }

        /* Tablet / Mobile (≤1024px) */
        @media(max-width:1024px){
          .desk-nav   { display:none!important; }
          .desk-ctas  { display:none!important; }
          .hamburger  { display:flex!important; }
          .hero-grid  { grid-template-columns:1fr!important; }
          .hologram-right{ order:-1; margin-bottom:24px; }
          .hologram-right svg{ max-width:240px!important; }
          .about-grid { grid-template-columns:1fr!important; gap:40px!important; }
          .steps-grid { grid-template-columns:1fr 1fr!important; }
          .feat-grid  { grid-template-columns:1fr 1fr!important; }
          .footer-grid{ grid-template-columns:1fr 1fr!important; gap:32px!important; }
          .section-pad{ padding:64px 20px!important; }
          .hero-pad   { padding:56px 20px 64px!important; }
          .cat-pad    { padding:32px 20px!important; }
          .nav-inner  { padding:0 16px!important; }
          .footer-inner{ padding:40px 20px 28px!important; }
          .cta-inner  { padding:48px 20px!important; }
        }

        /* Mobile (≤640px) */
        @media(max-width:640px){
          .steps-grid { grid-template-columns:1fr!important; }
          .feat-grid  { grid-template-columns:1fr!important; }
          .footer-grid{ grid-template-columns:1fr!important; gap:20px!important; }
          .hero-stats { gap:16px!important; flex-wrap:wrap!important; }
          .hero-btns  { flex-direction:column!important; }
          .hero-btns button{ width:100%!important; max-width:100%!important; }
          .cat-strip  { gap:8px!important; }
          .cat-btn    { padding:9px 12px!important; font-size:12px!important; }
          .hologram-right svg{ max-width:200px!important; }
          .hero-title { font-size:clamp(34px,9vw,50px)!important; }
          .hero-desc  { font-size:14px!important; }
          .hero-stat-num{ font-size:22px!important; }
        }

        @keyframes float-slow{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse-glow{0%,100%{opacity:.15}50%{opacity:.35}}

        /* Focus ring for keyboard nav */
        button:focus-visible, a:focus-visible {
          outline: 2px solid ${T.accent};
          outline-offset: 2px;
          border-radius: 6px;
        }
      `}</style>

      {/* ── NAVBAR ──────────────────────────────────── */}
      <motion.nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        background: scrolled ? 'rgba(6,16,26,0.97)' : 'rgba(6,16,26,0.0)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition:'background .3s, backdrop-filter .3s, border .3s',
      }}>
        <div className="nav-inner" style={{ maxWidth:'100%', padding:'0 40px',
          height:64, display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:12 }}>

          {/* Logo */}
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}
            style={{ display:'flex', alignItems:'center', gap:10, background:'none',
              border:'none', cursor:'pointer', padding:4, borderRadius:10, flexShrink:0,
              minHeight:44 }}>
            <img src={logo} alt="VFRB Enterprise"
              style={{ width:38, height:38, borderRadius:10, objectFit:'cover',
                border:'2px solid rgba(2,195,154,0.35)', flexShrink:0 }}/>
            <div style={{ textAlign:'left' }}>
              <p style={{ color:'#fff', fontWeight:700, fontSize:13, lineHeight:1,
                fontFamily:"Georgia,'Times New Roman',serif", whiteSpace:'nowrap' }}>
                VFRB Enterprise
              </p>
              <p style={{ color:'rgba(255,255,255,0.32)', fontSize:10, marginTop:2,
                whiteSpace:'nowrap' }}>
                Tailor Centre Manila
              </p>
            </div>
          </motion.button>

          {/* Desktop nav links */}
          <div className="desk-nav" style={{ alignItems:'center', gap:32 }}>
            {NAV.map(n => (
              <button key={n.label} className="nl"
                onClick={() => scrollTo(n.id)}
                style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)',
                  fontSize:14, cursor:'pointer', padding:'6px 0',
                  fontFamily:'var(--font)', transition:'color .2s' }}>
                {n.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="desk-ctas" style={{ alignItems:'center', gap:8, flexShrink:0 }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={() => go('/login')}
              style={{ background:'none', border:'1px solid rgba(255,255,255,0.14)',
                color:'rgba(255,255,255,0.6)', fontSize:13, cursor:'pointer',
                padding:'9px 18px', borderRadius:9, fontFamily:'var(--font)',
                minHeight:40, whiteSpace:'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.14)'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
              Log In
            </motion.button>
            <motion.button whileHover={{ scale:1.03, y:-1 }} whileTap={{ scale:.97 }}
              onClick={() => go('/register')}
              style={{ background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                border:'none', color:'#fff', fontSize:13, fontWeight:600,
                padding:'9px 20px', borderRadius:9, cursor:'pointer',
                boxShadow:'0 4px 18px rgba(2,195,154,0.3)',
                fontFamily:'var(--font)', minHeight:40, whiteSpace:'nowrap' }}>
              Get Started →
            </motion.button>
          </div>

          {/* Hamburger — mobile/tablet only */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            style={{ background:'rgba(255,255,255,0.07)',
              border:'1px solid rgba(255,255,255,0.12)',
              color:'#fff', cursor:'pointer',
              padding:10, borderRadius:10,
              minWidth:44, minHeight:44,
              alignItems:'center', justifyContent:'center',
              flexDirection:'column', gap:5, flexShrink:0 }}>
            <motion.span
              animate={menuOpen ? { rotate:45, y:6.5 } : { rotate:0, y:0 }}
              style={{ display:'block', width:20, height:1.5, background:'currentColor',
                borderRadius:1, transformOrigin:'center', transition:'background .2s' }}/>
            <motion.span
              animate={menuOpen ? { opacity:0, scaleX:0 } : { opacity:1, scaleX:1 }}
              style={{ display:'block', width:20, height:1.5, background:'currentColor',
                borderRadius:1, transformOrigin:'center' }}/>
            <motion.span
              animate={menuOpen ? { rotate:-45, y:-6.5 } : { rotate:0, y:0 }}
              style={{ display:'block', width:20, height:1.5, background:'currentColor',
                borderRadius:1, transformOrigin:'center' }}/>
          </button>
        </div>

        {/* ── Mobile dropdown menu ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-nav"
              role="menu"
              initial={{ opacity:0, height:0 }}
              animate={{ opacity:1, height:'auto' }}
              exit={{ opacity:0, height:0 }}
              transition={{ duration:0.22, ease:[0.22,1,0.36,1] }}
              style={{
                background:'rgba(6,16,26,0.99)',
                borderTop:'1px solid rgba(255,255,255,0.07)',
                overflow:'hidden',
                backdropFilter:'blur(20px)',
                WebkitBackdropFilter:'blur(20px)',
              }}>
              <div style={{ padding:'8px 16px 20px' }}>
                {NAV.map(n => (
                  <button key={n.label} role="menuitem"
                    onClick={() => scrollTo(n.id)}
                    style={{ display:'flex', alignItems:'center', width:'100%',
                      textAlign:'left', background:'none', border:'none',
                      color:'rgba(255,255,255,0.7)', fontSize:16, fontWeight:500,
                      padding:'14px 4px', cursor:'pointer',
                      fontFamily:'var(--font)',
                      borderBottom:'1px solid rgba(255,255,255,0.05)',
                      minHeight:48 }}
                    onTouchStart={e => e.currentTarget.style.color='#fff'}
                    onTouchEnd={e => e.currentTarget.style.color='rgba(255,255,255,0.7)'}
                    onMouseEnter={e => e.currentTarget.style.color='#fff'}
                    onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.7)'}>
                    {n.label}
                  </button>
                ))}
                {/* CTA buttons in mobile menu */}
                <div style={{ display:'flex', gap:10, marginTop:18 }}>
                  <button onClick={() => go('/login')}
                    style={{ flex:1, padding:'14px', borderRadius:10,
                      border:'1px solid rgba(255,255,255,0.15)',
                      background:'rgba(255,255,255,0.04)',
                      color:'rgba(255,255,255,0.8)', fontSize:15, fontWeight:600,
                      cursor:'pointer', fontFamily:'var(--font)', minHeight:48 }}>
                    Log In
                  </button>
                  <button onClick={() => go('/register')}
                    style={{ flex:2, padding:'14px', borderRadius:10, border:'none',
                      background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                      color:'#fff', fontSize:15, fontWeight:700,
                      cursor:'pointer', fontFamily:'var(--font)',
                      minHeight:48,
                      boxShadow:'0 4px 20px rgba(2,195,154,0.3)' }}>
                    Get Started →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Backdrop for mobile menu — closes on tap */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setMenuOpen(false)}
            style={{ position:'fixed', inset:0, zIndex:199,
              background:'rgba(0,0,0,0.5)', backdropFilter:'blur(2px)' }}/>
        )}
      </AnimatePresence>

      {/* ── HERO ──────────────────────────────────── */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center',
        position:'relative', overflow:'hidden', paddingTop:64 }}>
        {/* BG */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <motion.div animate={{ opacity:[0.1,0.22,0.1], scale:[1,1.1,1] }}
            transition={{ duration:10, repeat:Infinity }}
            style={{ position:'absolute', top:'8%', right:'4%',
              width:560, height:560, borderRadius:'50%',
              background:`radial-gradient(circle,${T.teal},transparent 70%)`,
              filter:'blur(80px)' }}/>
          <motion.div animate={{ opacity:[0.07,0.14,0.07], scale:[1.1,1,1.1] }}
            transition={{ duration:13, repeat:Infinity, delay:4 }}
            style={{ position:'absolute', bottom:'12%', left:'6%',
              width:480, height:480, borderRadius:'50%',
              background:`radial-gradient(circle,${T.accent},transparent 70%)`,
              filter:'blur(100px)' }}/>
          <div style={{ position:'absolute', inset:0,
            backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
            backgroundSize:'64px 64px' }}/>
        </div>

        <motion.div style={{ y:heroY, width:'100%', position:'relative', zIndex:1 }}>
          <div className="hero-pad" style={{ padding:'72px 40px' }}>
            <div className="hero-grid" style={{ display:'grid',
              gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center',
              maxWidth:1280, margin:'0 auto' }}>

              {/* Left text */}
              <motion.div initial="hidden" animate="show"
                variants={{ hidden:{}, show:{ transition:{ staggerChildren:.1 } } }}>
                <motion.div variants={{ hidden:{ opacity:0, y:16 }, show:{ opacity:1, y:0 } }}
                  transition={{ duration:.6 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:8,
                    fontSize:11, fontWeight:600, letterSpacing:'0.1em',
                    textTransform:'uppercase', padding:'6px 14px', borderRadius:100,
                    marginBottom:24, background:'rgba(2,195,154,0.1)',
                    border:'1px solid rgba(2,195,154,0.25)', color:T.accent }}>
                    <span style={{ width:6, height:6, borderRadius:'50%',
                      background:T.accent, animation:'pulse-glow 2s infinite' }}/>
                    Muntinlupa City · Est. 2000 · Philippines
                  </span>
                </motion.div>

                <motion.h1 className="hero-title"
                  variants={{ hidden:{ opacity:0, y:24 }, show:{ opacity:1, y:0 } }}
                  transition={{ duration:.8 }}
                  style={{ fontFamily:"Georgia,'Times New Roman',serif",
                    fontSize:'clamp(38px,5vw,68px)', fontWeight:700,
                    lineHeight:1.08, marginBottom:22, letterSpacing:'-0.01em' }}>
                  Tailor-made{' '}
                  <em style={{ fontStyle:'italic', fontWeight:600 }}>uniforms</em>{' '}
                  <span style={{ background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                    WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                    built for you.
                  </span>
                </motion.h1>

                <motion.p className="hero-desc"
                  variants={{ hidden:{ opacity:0, y:16 }, show:{ opacity:1, y:0 } }}
                  transition={{ duration:.7 }}
                  style={{ color:'rgba(255,255,255,0.5)', fontSize:16, lineHeight:1.75,
                    marginBottom:32, maxWidth:480 }}>
                  VFRB Enterprise produces scrub suits, school uniforms, and corporate
                  wear for hospitals, schools, and institutions across the Philippines.
                  Browse our catalog, configure every detail, and receive an AI-computed
                  Bill of Materials before production begins.
                </motion.p>

                <motion.div className="hero-btns"
                  variants={{ hidden:{ opacity:0, y:12 }, show:{ opacity:1, y:0 } }}
                  transition={{ duration:.6 }}
                  style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:40 }}>
                  <motion.button whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:.97 }}
                    onClick={() => go('/register')}
                    style={{ background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                      border:'none', color:'#fff', fontWeight:700, fontSize:15,
                      padding:'14px 28px', borderRadius:12, cursor:'pointer',
                      boxShadow:'0 8px 32px rgba(2,195,154,0.35)',
                      fontFamily:'var(--font)', minHeight:48 }}>
                    Register Account →
                  </motion.button>
                  <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                    onClick={() => scrollTo('categories')}
                    style={{ background:'rgba(255,255,255,0.05)',
                      border:'1px solid rgba(255,255,255,0.14)',
                      color:'rgba(255,255,255,0.75)', fontWeight:600, fontSize:15,
                      padding:'14px 28px', borderRadius:12, cursor:'pointer',
                      fontFamily:'var(--font)', minHeight:48 }}>
                    Browse Designs
                  </motion.button>
                </motion.div>

                <motion.div className="hero-stats"
                  variants={{ hidden:{ opacity:0 }, show:{ opacity:1 } }}
                  transition={{ duration:.6 }}
                  style={{ display:'flex', gap:28, paddingTop:24,
                    borderTop:'1px solid rgba(255,255,255,0.07)', flexWrap:'wrap' }}>
                  {[['21+','Designs'],['100%','Custom Orders'],['24 yrs','In Operation'],['₱0','Free Registration']].map(([v,l]) => (
                    <div key={l}>
                      <div className="hero-stat-num"
                        style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:26,
                          fontWeight:700, color:T.accent, lineHeight:1 }}>{v}</div>
                      <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginTop:4 }}>{l}</div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right hologram */}
              <motion.div className="hologram-right"
                initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:.5, duration:1, ease:[0.22,1,0.36,1] }}
                style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  animation:'float-slow 6s ease-in-out infinite' }}>
                <GarmentHologram/>
                <p style={{ textAlign:'center', marginTop:10, fontSize:10,
                  color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em',
                  textTransform:'uppercase', fontFamily:'monospace' }}>
                  VFRB Enterprise · AI-Assisted Material Recommendation
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CATEGORIES ───────────────────────────── */}
      <section id="categories" className="cat-pad"
        style={{ padding:'40px 40px', borderTop:'1px solid rgba(255,255,255,0.05)',
          borderBottom:'1px solid rgba(255,255,255,0.05)',
          background:'rgba(255,255,255,0.012)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <Reveal>
            <p style={{ color:'rgba(255,255,255,0.28)', fontSize:11, fontWeight:600,
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:18 }}>
              5 Uniform Categories
            </p>
            <div className="cat-strip"
              style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {CATS.map((c,i) => (
                <motion.button key={c.label} className="cat-btn"
                  initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }}
                  viewport={{ once:true }} transition={{ delay:i*.07 }}
                  whileHover={{ scale:1.03 }} whileTap={{ scale:.97 }}
                  onClick={() => go('/register')}
                  style={{ display:'flex', alignItems:'center', gap:9,
                    padding:'11px 18px', borderRadius:12, cursor:'pointer',
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.07)',
                    color:'rgba(255,255,255,0.65)', fontSize:14, fontWeight:500,
                    fontFamily:'var(--font)', minHeight:44 }}
                  onMouseEnter={e => { e.currentTarget.style.background=c.color+'18'; e.currentTarget.style.borderColor=c.color+'55'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.65)'; }}>
                  <span style={{ fontSize:18 }}>{c.icon}</span>
                  <span>{c.label}</span>
                  <span style={{ color:'rgba(255,255,255,0.28)', fontSize:11 }}>{c.count}</span>
                </motion.button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────── */}
      <section id="about" className="section-pad" style={{ padding:'96px 40px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div className="about-grid"
            style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'center' }}>
            <Reveal delay={0.1}>
              <div style={{ position:'relative' }}>
                <div style={{ position:'absolute', top:-16, left:-16, right:32, bottom:32,
                  border:'1px solid rgba(2,195,154,0.12)', borderRadius:20,
                  pointerEvents:'none' }}/>
                <div style={{ borderRadius:20,
                  background:'linear-gradient(145deg,rgba(2,61,71,0.5),rgba(6,16,26,0.8))',
                  border:'1px solid rgba(2,195,154,0.18)', padding:32 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                    gap:10, marginBottom:18 }}>
                    {[['🩺','Medical Scrubs','V-neck, mandarin collar','#028090'],
                      ['🏫','School Uniform','Polo blouse, slacks','#3b82f6'],
                      ['💼','Corporate Polo','Embroidered logo','#6366f1'],
                      ['🥼',"Doctor's Coat",'CVC 65/35 poly-cotton','#64748b']
                    ].map(([ic,lb,sub]) => (
                      <div key={lb} style={{ padding:14, borderRadius:11,
                        background:'rgba(255,255,255,0.04)',
                        border:'1px solid rgba(255,255,255,0.07)', textAlign:'center' }}>
                        <div style={{ fontSize:26, marginBottom:7 }}>{ic}</div>
                        <div style={{ color:'#fff', fontSize:12, fontWeight:600, marginBottom:2 }}>{lb}</div>
                        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderRadius:11, padding:14,
                    background:'rgba(2,128,144,0.1)',
                    border:'1px solid rgba(2,195,154,0.18)' }}>
                    <div style={{ color:T.accent, fontSize:10, fontWeight:600,
                      letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:9 }}>
                      Core Materials Used
                    </div>
                    {['Airstretch · Ultraflex · Flexitone',
                      'CVC 65/35 Poly-Cotton · TC Poplin',
                      'Polyester Thread · Elastic Band · Logo Patch'
                    ].map(m => (
                      <div key={m} style={{ color:'rgba(255,255,255,0.45)', fontSize:12,
                        padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p style={{ color:T.accent, fontSize:11, fontWeight:600,
                letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:18 }}>
                About VFRB Enterprise
              </p>
              <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif",
                fontSize:'clamp(28px,3.5vw,46px)', fontWeight:700, lineHeight:1.15,
                marginBottom:22, color:'#fff' }}>
                25 years of quality{' '}
                <em style={{ fontStyle:'italic', color:'rgba(255,255,255,0.4)' }}>
                  garment manufacturing.
                </em>
              </h2>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, lineHeight:1.8,
                marginBottom:18 }}>
                VFRB Enterprise — known as{' '}
                <strong style={{ color:'rgba(255,255,255,0.75)' }}>
                  Tailor Centre VFRB Manila
                </strong>{' '}
                — has been operating from Bayanan, Muntinlupa City since 2000. We specialize
                in medical scrub suits, school uniforms, corporate wear, and lab coats.
              </p>
              {[['📍','#31 San Guillermo St., Bayanan, Muntinlupa City 1772'],
                ['📞','0921 791 6259'],
                ['✉️','vfrb.enterprise@gmail.com'],
                ['🏭','Production: Sto. Tomas, Batangas']
              ].map(([ic,tx]) => (
                <div key={tx} style={{ display:'flex', gap:11, alignItems:'flex-start',
                  marginBottom:9 }}>
                  <span style={{ fontSize:14, marginTop:1, flexShrink:0 }}>{ic}</span>
                  <span style={{ color:'rgba(255,255,255,0.45)', fontSize:14 }}>{tx}</span>
                </div>
              ))}
              <motion.button whileHover={{ scale:1.02, y:-1 }} whileTap={{ scale:.97 }}
                onClick={() => go('/register')}
                style={{ marginTop:26,
                  background:`linear-gradient(135deg,${T.teal},${T.accent})`,
                  border:'none', color:'#fff', fontWeight:600, fontSize:14,
                  padding:'13px 28px', borderRadius:11, cursor:'pointer',
                  fontFamily:'var(--font)',
                  boxShadow:'0 4px 20px rgba(2,195,154,0.25)', minHeight:48 }}>
                Place Your Order →
              </motion.button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section id="how" className="section-pad"
        style={{ padding:'96px 40px', background:'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:56 }}>
            <p style={{ color:T.accent, fontSize:11, fontWeight:600,
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
              The Process
            </p>
            <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif",
              fontSize:'clamp(26px,3.5vw,44px)', fontWeight:700, color:'#fff',
              marginBottom:14, lineHeight:1.15 }}>
              From design idea to VFRB's inbox.
            </h2>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15, maxWidth:460,
              margin:'0 auto' }}>
              No checkout. No payment form. Design, compute materials, review —
              then VFRB gets your complete brief by email.
            </p>
          </Reveal>
          <div className="steps-grid"
            style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
            {STEPS.map((s,i) => (
              <motion.div key={s.n} className="step-card"
                initial={{ opacity:0, y:32 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ delay:i*.12, duration:.6 }}
                style={{ padding:26, borderRadius:16,
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:42,
                  fontWeight:700, marginBottom:18,
                  background:'linear-gradient(135deg,rgba(2,128,144,0.5),rgba(2,195,154,0.5))',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  {s.n}
                </div>
                <h3 style={{ color:'#fff', fontWeight:600, fontSize:15, marginBottom:9 }}>{s.title}</h3>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, lineHeight:1.65, margin:0 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section id="features" className="section-pad" style={{ padding:'96px 40px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:56 }}>
            <p style={{ color:T.accent, fontSize:11, fontWeight:600,
              letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
              Why VFRB System
            </p>
            <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif",
              fontSize:'clamp(26px,3.5vw,44px)', fontWeight:700, color:'#fff',
              marginBottom:14 }}>
              Purpose-built for real uniform orders.
            </h2>
          </Reveal>
          <div className="feat-grid"
            style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {FEATS.map((f,i) => (
              <motion.div key={f.title} className="feat-card"
                initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ delay:i*.09, duration:.6 }}
                style={{ padding:26, borderRadius:16,
                  background: f.hl ? 'linear-gradient(135deg,rgba(2,128,144,0.15),rgba(2,195,154,0.08))' : 'rgba(255,255,255,0.03)',
                  border: f.hl ? '1px solid rgba(2,195,154,0.28)' : '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:24, marginBottom:14 }}>{f.icon}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                  <h3 style={{ color:'#fff', fontWeight:600, fontSize:14, margin:0 }}>{f.title}</h3>
                  {f.hl && (
                    <span style={{ fontSize:9, padding:'2px 8px', borderRadius:100,
                      fontWeight:700, background:'rgba(2,195,154,0.15)', color:T.accent,
                      whiteSpace:'nowrap' }}>Core Feature</span>
                  )}
                </div>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, lineHeight:1.65, margin:0 }}>
                  {f.desc}
                </p>
                {f.hl && (
                  <div style={{ display:'flex', gap:5, marginTop:12, flexWrap:'wrap' }}>
                    {['Rule-Based','Parametric','440+ Formulas','No ML'].map(t => (
                      <span key={t} style={{ fontSize:10, padding:'3px 9px', borderRadius:100,
                        background:'rgba(2,195,154,0.1)', border:'1px solid rgba(2,195,154,0.2)',
                        color:T.accent }}>{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="section-pad" style={{ padding:'96px 40px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <Reveal>
            <div className="cta-inner"
              style={{ borderRadius:24, padding:'64px 48px', position:'relative',
                overflow:'hidden',
                background:`linear-gradient(135deg,#023d47,${T.teal})`,
                border:'1px solid rgba(2,195,154,0.2)', textAlign:'center' }}>
              <div style={{ position:'absolute', inset:0,
                background:'radial-gradient(circle at 70% 30%,rgba(2,195,154,0.15),transparent 60%)',
                pointerEvents:'none' }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif",
                  fontSize:'clamp(26px,3vw,40px)', fontWeight:700, color:'#fff',
                  marginBottom:14, lineHeight:1.2 }}>
                  Ready to design your next uniform?
                </h2>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:15, marginBottom:32,
                  maxWidth:400, margin:'0 auto 32px' }}>
                  Free to register. No credit card. No need to pay for creating.
                  Submit your design request in minutes.
                </p>
                <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <motion.button whileHover={{ scale:1.04, y:-2 }} whileTap={{ scale:.97 }}
                    onClick={() => go('/register')}
                    style={{ background:T.accent, border:'none', color:'#06101a',
                      fontWeight:700, fontSize:15, padding:'14px 32px', borderRadius:12,
                      cursor:'pointer', boxShadow:'0 8px 32px rgba(2,195,154,0.45)',
                      fontFamily:'var(--font)', minHeight:48 }}>
                    Create Free Account →
                  </motion.button>
                  <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
                    onClick={() => go('/login')}
                    style={{ background:'rgba(255,255,255,0.1)',
                      border:'1px solid rgba(255,255,255,0.2)',
                      color:'rgba(255,255,255,0.8)', fontWeight:600, fontSize:15,
                      padding:'14px 32px', borderRadius:12, cursor:'pointer',
                      fontFamily:'var(--font)', minHeight:48 }}>
                    Log In
                  </motion.button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────── */}
      <Footer/>
    </div>
  );
}