// src/pages/admin/Landing.jsx
// ─────────────────────────────────────────────────────────────────────────────
// VFRB Enterprise — Admin Portal Landing Page
//
// COMPANY: VFRB Enterprise, est. 2000
// OFFICE:  31 San Guillermo St., Bayanan, Muntinlupa City
// PLANT:   Sto. Tomas, Batangas
// CLIENTS: Schools, hospitals, government offices, private business sector
// MODEL:   Subcontract (OTG Scrubs) + Direct production orders
//
// SECTIONS:
//   1. Navbar   — sticky, scroll-aware, mobile hamburger
//   2. Hero     — full-viewport, animated background grid
//   3. About    — VFRB company background (no problem statement)
//   4. Modules  — 6 ERP modules this system provides
//   5. Stats    — 24 years, client types, production models
//   6. Process  — How the ERP cycle works (3 steps)
//   7. Footer   — full address, quick links, copyright
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';

// ─── Scroll reveal hook (reusable, clean) ────────────────────────────────────
function useReveal(threshold = 0.13) {
  const ref     = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el  = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis];
}

// ─── Smooth scroll helper ────────────────────────────────────────────────────
const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

// ─────────────────────────────────────────────────────────────────────────────
// 1. NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
function Navbar({ onLogin }) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = () => { if (window.innerWidth > 768) setMenuOpen(false); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const NAV_LINKS = [
    ['About',   'about'],
    ['System',  'modules'],
    ['Process', 'process'],
    ['Contact', 'footer'],
  ];

  return (
    <nav style={{
      position:       'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      transition:     'background .35s, border .35s, box-shadow .35s',
      background:     scrolled ? 'rgba(6,9,20,0.96)'  : 'transparent',
      backdropFilter: scrolled ? 'blur(22px)'          : 'none',
      borderBottom:   scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
      boxShadow:      scrolled ? '0 4px 32px rgba(0,0,0,0.4)'       : 'none',
      fontFamily:     "var(--font)",
    }}>
      <div style={{
        maxWidth:       1280, margin:      '0 auto',
        padding:        '0 28px', height:  72,
        display:        'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <button onClick={() => scrollTo('hero')}
          style={{ display: 'flex', alignItems: 'center', gap: 12,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, #4338ca, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color:'#fff', fontSize:14, fontWeight:800, margin:0, letterSpacing:'.01em' }}>
              VFRB Enterprise
            </p>
            <p style={{ color:'rgba(255,255,255,0.38)', fontSize:10, margin:0 }}>
              Admin Portal · Since 2000
            </p>
          </div>
        </button>

        {/* Desktop links */}
        <div className="al-nav-desktop" style={{ display:'flex', alignItems:'center', gap:4 }}>
          {NAV_LINKS.map(([label, id]) => (
            <button key={label} onClick={() => scrollTo(id)}
              style={{
                padding:     '8px 16px', borderRadius: 9,
                background:  'transparent', border: 'none', cursor: 'pointer',
                color:       'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
                fontFamily:  "var(--font)", transition: 'color .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
              {label}
            </button>
          ))}
          <button onClick={onLogin}
            style={{
              marginLeft:   14, padding:     '10px 22px', borderRadius:   11,
              background:   'linear-gradient(135deg, #4338ca, #818cf8)',
              border:       'none', cursor:    'pointer', color:    '#fff',
              fontSize:     13,    fontWeight: 700, fontFamily: "var(--font)",
              boxShadow:    '0 4px 16px rgba(99,102,241,0.35)', transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)'; }}>
            Login to Portal →
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(o => !o)}
          className="al-nav-mobile"
          aria-label="Toggle menu"
          style={{ background:'none', border:'none', cursor:'pointer', padding:8,
            display:'none', flexDirection:'column', gap:5 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display:'block', width:24, height:2, borderRadius:2,
              background: '#fff', transition: 'all .3s ease',
              transform: menuOpen
                ? (i===0 ? 'rotate(45deg) translate(5px,5px)' : i===2 ? 'rotate(-45deg) translate(5px,-5px)' : 'scale(0)')
                : 'none',
              opacity: menuOpen && i===1 ? 0 : 1,
            }}/>
          ))}
        </button>
      </div>

      {/* Mobile drawer */}
      <div style={{
        background: 'rgba(6,9,20,0.99)', overflow: 'hidden',
        maxHeight: menuOpen ? '400px' : '0',
        transition: 'max-height .35s ease',
        borderTop: menuOpen ? '1px solid rgba(255,255,255,0.07)' : 'none',
      }}>
        <div style={{ padding: '8px 24px 24px' }}>
          {NAV_LINKS.map(([label, id]) => (
            <button key={label} onClick={() => { scrollTo(id); setMenuOpen(false); }}
              style={{
                display:'block', width:'100%', padding:'14px 0',
                border:'none', background:'transparent',
                color:'rgba(255,255,255,0.75)', fontSize:15, fontWeight:500,
                fontFamily:'var(--font)', cursor:'pointer', textAlign:'left',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
              }}>
              {label}
            </button>
          ))}
          <button onClick={onLogin}
            style={{
              marginTop:14, width:'100%', padding:'14px',
              borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#4338ca,#818cf8)',
              color:'#fff', fontSize:14, fontWeight:700,
              fontFamily:'var(--font)',
            }}>
            Login to Admin Portal →
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HERO
// ─────────────────────────────────────────────────────────────────────────────
function Hero({ onLogin }) {
  return (
    <section id="hero" style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #06091a 0%, #0d1235 50%, #06091a 100%)',
    }}>
      {/* Animated grid background */}
      <div style={{
        position:'absolute', inset:0, zIndex:0,
        backgroundImage: `
          linear-gradient(rgba(129,140,248,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(129,140,248,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '72px 72px',
        animation: 'gridDrift 20s linear infinite',
      }}/>

      {/* Glowing orbs */}
      <div style={{
        position:'absolute', top:'20%', left:'10%', width:400, height:400,
        borderRadius:'50%', background:'rgba(79,70,229,0.12)',
        filter:'blur(80px)', animation:'float1 8s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:'20%', right:'8%', width:350, height:350,
        borderRadius:'50%', background:'rgba(2,195,154,0.08)',
        filter:'blur(70px)', animation:'float2 10s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', top:'55%', left:'55%', width:200, height:200,
        borderRadius:'50%', background:'rgba(129,140,248,0.1)',
        filter:'blur(60px)', animation:'float3 7s ease-in-out infinite',
      }}/>

      {/* Hero content */}
      <div style={{
        position:'relative', zIndex:1, textAlign:'center',
        padding:'140px 24px 80px', maxWidth:820, margin:'0 auto',
        fontFamily:'var(--font)',
      }}>
        {/* Pill badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28,
          padding:'8px 18px', borderRadius:100,
          background:'rgba(129,140,248,0.1)', border:'1px solid rgba(129,140,248,0.3)' }}>
          <span style={{ width:7, height:7, borderRadius:'50%',
            background:'#818cf8', boxShadow:'0 0 8px #818cf8', display:'block' }}/>
          <span style={{ color:'#a5b4fc', fontSize:12, fontWeight:600, letterSpacing:'.06em' }}>
            AI-Enabled ERP System · Est. 2000
          </span>
        </div>

        <h1 style={{
          color:'#fff', fontSize:'clamp(36px,6vw,72px)', fontWeight:800,
          lineHeight:1.1, margin:'0 0 10px', letterSpacing:'-.02em',
          animation:'fadeSlideUp .9s ease both',
        }}>
          VFRB Enterprise
        </h1>
        <h2 style={{
          color:'#818cf8', fontSize:'clamp(18px,3.5vw,38px)', fontWeight:700,
          lineHeight:1.2, margin:'0 0 28px', letterSpacing:'-.01em',
          animation:'fadeSlideUp .9s .15s ease both',
        }}>
          Operations Management System
        </h2>

        <p style={{
          color:'rgba(255,255,255,0.55)', fontSize:'clamp(14px,1.8vw,18px)',
          lineHeight:1.8, maxWidth:600, margin:'0 auto 44px',
          animation:'fadeSlideUp .9s .3s ease both',
        }}>
          Managing garment production orders, raw material inventory,
          supplier procurement, and delivery tracking — all in one place.
          Built for the way VFRB actually works.
        </p>

        <div style={{
          display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap',
          animation:'fadeSlideUp .9s .45s ease both',
        }}>
          <button onClick={onLogin}
            style={{
              padding:'14px 32px', borderRadius:12, border:'none', cursor:'pointer',
              background:'linear-gradient(135deg,#4338ca,#818cf8)', color:'#fff',
              fontSize:15, fontWeight:700, fontFamily:'var(--font)',
              boxShadow:'0 6px 24px rgba(99,102,241,0.4)', transition:'all .25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(99,102,241,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 24px rgba(99,102,241,0.4)'; }}>
            Access Admin Portal →
          </button>
          <button onClick={() => scrollTo('about')}
            style={{
              padding:'14px 32px', borderRadius:12, cursor:'pointer',
              background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.8)',
              fontSize:15, fontWeight:600, fontFamily:'var(--font)',
              border:'1px solid rgba(255,255,255,0.15)', transition:'all .25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; }}>
            Learn About VFRB ↓
          </button>
        </div>

        {/* Scroll indicator */}
        <div style={{ marginTop:72, display:'flex', justifyContent:'center',
          animation:'fadeSlideUp .9s .7s ease both' }}>
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            color:'rgba(255,255,255,0.2)', fontSize:11, fontWeight:500, letterSpacing:'.1em',
            textTransform:'uppercase',
          }}>
            <span>Scroll</span>
            <div style={{ width:1, height:40, background:'rgba(255,255,255,0.15)',
              animation:'scrollLine 2s ease infinite' }}/>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ABOUT VFRB
// ─────────────────────────────────────────────────────────────────────────────
function AboutSection() {
  const [ref, vis] = useReveal();
  return (
    <section id="about" ref={ref} style={{
      padding:'100px 24px', background:'#07091c',
      fontFamily:'var(--font)',
    }}>
      <div style={{
        maxWidth:1100, margin:'0 auto',
        opacity: vis?1:0, transform: vis?'none':'translateY(40px)',
        transition:'opacity .8s ease, transform .8s ease',
      }}>
        {/* Label */}
        <p style={{ color:'#818cf8', fontSize:11, fontWeight:700, letterSpacing:'.12em',
          textTransform:'uppercase', marginBottom:14 }}>
          About VFRB Enterprise
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'start' }}
          className="al-about-grid">

          {/* Left — story */}
          <div>
            <h2 style={{ color:'#fff', fontSize:'clamp(24px,3.5vw,40px)', fontWeight:800,
              lineHeight:1.2, margin:'0 0 28px', letterSpacing:'-.02em' }}>
              Two decades of garment manufacturing, now fully digital.
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                `Founded in the year 2000, VFRB Enterprise grew from the owner's more than ten years of experience in the garments industry and initial capital saved from working abroad. What began as a small sewing operation has grown into a company trusted by institutions across the Philippines.`,
                `Today, VFRB Enterprise serves schools, hospitals, government offices, and the private business sector — producing uniforms for both local and international markets from its main office in Bayanan, Muntinlupa City and its production facility in Sto. Tomas, Batangas.`,
                `The company operates through two production models: subcontracted partnerships — such as with OTG Scrubs, who supply their own materials and designs while VFRB handles sewing, pressing, and packing — and direct orders, where VFRB manages the entire production cycle from pattern-making and cutting to final delivery.`,
              ].map((t, i) => (
                <p key={i} style={{
                  color:'rgba(255,255,255,0.58)', fontSize:15, lineHeight:1.85, margin:0,
                  opacity: vis?1:0, transform: vis?'none':'translateY(20px)',
                  transition:`opacity .7s ${.1+i*.15}s ease, transform .7s ${.1+i*.15}s ease`,
                }}>
                  {t}
                </p>
              ))}
            </div>
          </div>

          {/* Right — info cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { label:'Main Office', value:'31 San Guillermo St., Bayanan, Muntinlupa City', icon:'🏢' },
              { label:'Production Facility', value:'Sto. Tomas, Batangas', icon:'🏭' },
              { label:'Year Established', value:'2000 — over two decades of operation', icon:'📅' },
              { label:'Production Models', value:'Direct Orders + Subcontract (OTG Scrubs)', icon:'⚙️' },
              { label:'Market Served', value:'Schools · Hospitals · Government · Private Sector', icon:'🏛️' },
            ].map((item, i) => (
              <div key={item.label}
                style={{
                  padding:'16px 20px', borderRadius:14,
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.07)',
                  display:'flex', gap:14, alignItems:'flex-start',
                  opacity: vis?1:0, transform: vis?'none':'translateX(30px)',
                  transition:`opacity .7s ${.2+i*.1}s ease, transform .7s ${.2+i*.1}s ease`,
                  cursor:'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(129,140,248,0.3)'; e.currentTarget.style.background='rgba(129,140,248,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{item.icon}</span>
                <div>
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:600,
                    textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 4px' }}>
                    {item.label}
                  </p>
                  <p style={{ color:'#fff', fontSize:13, fontWeight:500, margin:0, lineHeight:1.5 }}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SYSTEM MODULES
// ─────────────────────────────────────────────────────────────────────────────
const MODULES = [
  { icon:'📋', title:'Sales Order Management',    color:'#818cf8', desc:'Full order pipeline — Pending → Confirmed → Cutting → Sewing → QC → Completed. AI computes material requirements per order automatically.', sap:'SAP SD VA01/VA05' },
  { icon:'🤖', title:'AI Material Recommendation', color:'#02C39A', desc:'Deterministic BOM engine: Standard sizing reads formulas directly. Custom sizing applies TESDA NC II parametric computation (chest ÷ 96cm baseline).', sap:'SAP CS12 BOM' },
  { icon:'🏭', title:'Inventory Management',        color:'#60a5fa', desc:'Real-time stock tracking per material. Low-stock alerts. Full audit trail of every stock-in and stock-out movement.', sap:'SAP MM MIGO' },
  { icon:'🏢', title:'Supplier & Procurement',      color:'#fbbf24', desc:'Complete RFQ → Quote → Purchase Order cycle. Goods Receipt auto-updates inventory. Supplier portal for direct communication.', sap:'SAP MM ME41/ME21N' },
  { icon:'🚚', title:'Delivery Tracking',           color:'#a78bfa', desc:'Three delivery methods: Customer Pickup, VFRB Van Delivery, and Courier (J&T, LBC, Lalamove). Estimated vs actual delivery dates.', sap:'SAP SD VL01N' },
  { icon:'📊', title:'Prescriptive Analytics',      color:'#fb923c', desc:'Beyond descriptive reports — the system tells management exactly what to buy, from whom, and when, based on order demand vs stock levels.', sap:'SAP BI Analytics' },
];

function ModulesSection() {
  const [ref, vis] = useReveal();
  return (
    <section id="modules" ref={ref} style={{
      padding:'100px 24px', background:'#060919',
      fontFamily:'var(--font)',
    }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{
          textAlign:'center', marginBottom:60,
          opacity:vis?1:0, transform:vis?'none':'translateY(30px)',
          transition:'opacity .8s ease, transform .8s ease',
        }}>
          <p style={{ color:'#818cf8', fontSize:11, fontWeight:700, letterSpacing:'.12em',
            textTransform:'uppercase', marginBottom:12 }}>
            System Capabilities
          </p>
          <h2 style={{ color:'#fff', fontSize:'clamp(24px,3.5vw,42px)', fontWeight:800,
            lineHeight:1.2, margin:'0 auto 16px', maxWidth:560, letterSpacing:'-.02em' }}>
            An ERP system built for how VFRB works
          </h2>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:15, maxWidth:500,
            margin:'0 auto', lineHeight:1.7 }}>
            Six integrated modules covering the full operations lifecycle —
            from customer order to final delivery.
          </p>
        </div>

        <div style={{
          display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18,
        }} className="al-modules-grid">
          {MODULES.map((m, i) => (
            <div key={m.title}
              style={{
                padding:'24px 22px', borderRadius:18,
                background:'rgba(255,255,255,0.03)',
                border:'1px solid rgba(255,255,255,0.07)',
                transition:'all .25s ease', cursor:'default',
                opacity:vis?1:0, transform:vis?'none':'translateY(24px)',
                transitionDelay:`${i*.08}s`,
                transitionProperty:'opacity, transform, border-color, background',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = m.color + '44';
                e.currentTarget.style.background  = m.color + '08';
                e.currentTarget.style.transform   = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.background  = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.transform   = vis ? 'none' : 'translateY(24px)';
              }}>
              {/* Icon */}
              <div style={{
                width:48, height:48, borderRadius:13, marginBottom:16,
                background:`${m.color}18`, border:`1px solid ${m.color}30`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              }}>{m.icon}</div>

              {/* SAP label */}
              <p style={{ color:m.color, fontSize:9, fontWeight:700, letterSpacing:'.1em',
                textTransform:'uppercase', marginBottom:7 }}>
                {m.sap}
              </p>

              <h3 style={{ color:'#fff', fontSize:15, fontWeight:700,
                margin:'0 0 10px', lineHeight:1.3 }}>
                {m.title}
              </h3>
              <p style={{ color:'rgba(255,255,255,0.48)', fontSize:13,
                lineHeight:1.75, margin:0 }}>
                {m.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STATS BAR
// ─────────────────────────────────────────────────────────────────────────────
function StatsSection() {
  const [ref, vis] = useReveal();
  const STATS = [
    { value:'24+',  label:'Years in Operation',            icon:'🏆' },
    { value:'4',    label:'Institutional Client Sectors',  icon:'🏛️' },
    { value:'2',    label:'Production Models',             icon:'⚙️' },
    { value:'6',    label:'Core System Modules',           icon:'📦' },
    { value:'5',    label:'Active Supplier Partners',      icon:'🤝' },
    { value:'100%', label:'Philippine-Made Garments',      icon:'🇵🇭' },
  ];
  return (
    <section ref={ref} style={{
      padding:'72px 24px',
      background:'linear-gradient(135deg,#0d1235,#070a1c)',
      borderTop:'1px solid rgba(255,255,255,0.06)',
      borderBottom:'1px solid rgba(255,255,255,0.06)',
      fontFamily:'var(--font)',
    }}>
      <div style={{
        maxWidth:1100, margin:'0 auto',
        display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:24,
      }} className="al-stats-grid">
        {STATS.map((s, i) => (
          <div key={s.label}
            style={{
              textAlign:'center',
              opacity:vis?1:0, transform:vis?'none':'translateY(20px)',
              transition:`opacity .7s ${i*.07}s ease, transform .7s ${i*.07}s ease`,
            }}>
            <p style={{ fontSize:24, margin:'0 0 8px' }}>{s.icon}</p>
            <p style={{ color:'#818cf8', fontSize:'clamp(22px,3vw,36px)', fontWeight:800,
              margin:'0 0 6px', lineHeight:1 }}>
              {s.value}
            </p>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:0, lineHeight:1.4 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. HOW IT WORKS (Process)
// ─────────────────────────────────────────────────────────────────────────────
function ProcessSection() {
  const [ref, vis] = useReveal();
  const STEPS = [
    {
      n:'01', icon:'📋', color:'#818cf8',
      title:'Customer Places Order',
      desc:'A school, hospital, or business places a uniform order through the customer portal. The AI BOM engine instantly computes all raw material requirements — no manual estimation needed.',
    },
    {
      n:'02', icon:'🏭', color:'#02C39A',
      title:'Production Advances Through Pipeline',
      desc:'Admin manages the order through six stages: Confirmed → Cutting → Sewing → QC → Completed. Inventory deducts automatically as materials are consumed in production.',
    },
    {
      n:'03', icon:'🤝', color:'#fbbf24',
      title:'Materials Procured from Suppliers',
      desc:'When stock runs low, admin creates an RFQ. Suppliers respond with quotes through their own portal. Admin converts the best quote to a Purchase Order. Goods Receipt updates stock automatically.',
    },
    {
      n:'04', icon:'🚚', color:'#a78bfa',
      title:'Order Delivered to Client',
      desc:'Completed orders are released via customer pickup, VFRB van delivery, or courier (J&T, LBC, Lalamove). Delivery dates are tracked from estimated to actual — supporting VFRB\'s negotiable deadline policy.',
    },
  ];
  return (
    <section id="process" ref={ref} style={{
      padding:'100px 24px', background:'#07091c',
      fontFamily:'var(--font)',
    }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{
          textAlign:'center', marginBottom:64,
          opacity:vis?1:0, transform:vis?'none':'translateY(30px)',
          transition:'opacity .8s ease, transform .8s ease',
        }}>
          <p style={{ color:'#818cf8', fontSize:11, fontWeight:700, letterSpacing:'.12em',
            textTransform:'uppercase', marginBottom:12 }}>
            How the System Works
          </p>
          <h2 style={{ color:'#fff', fontSize:'clamp(24px,3.5vw,42px)', fontWeight:800,
            lineHeight:1.2, margin:'0 auto', maxWidth:500, letterSpacing:'-.02em' }}>
            From order to delivery, fully tracked
          </h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}
          className="al-process-grid">
          {STEPS.map((step, i) => (
            <div key={step.n}
              style={{
                padding:'28px 26px', borderRadius:20,
                background:'rgba(255,255,255,0.025)',
                border:`1px solid ${step.color}22`,
                opacity:vis?1:0, transform:vis?'none':'translateY(24px)',
                transition:`opacity .75s ${i*.12}s ease, transform .75s ${i*.12}s ease`,
                cursor:'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`${step.color}08`; e.currentTarget.style.borderColor=`${step.color}40`; e.currentTarget.style.transform='translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor=`${step.color}22`; e.currentTarget.style.transform='none'; }}>
              <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{
                  width:52, height:52, borderRadius:14, flexShrink:0,
                  background:`${step.color}14`, border:`1px solid ${step.color}30`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                }}>
                  {step.icon}
                </div>
                <div>
                  <p style={{ color:step.color, fontSize:9, fontWeight:700,
                    letterSpacing:'.1em', textTransform:'uppercase', margin:'0 0 6px' }}>
                    Step {step.n}
                  </p>
                  <h3 style={{ color:'#fff', fontSize:16, fontWeight:700,
                    margin:'0 0 10px', lineHeight:1.3 }}>
                    {step.title}
                  </h3>
                  <p style={{ color:'rgba(255,255,255,0.48)', fontSize:13.5,
                    lineHeight:1.8, margin:0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ onLogin }) {
  const year = new Date().getFullYear();
  return (
    <footer id="footer" style={{
      background:'#04060f', borderTop:'1px solid rgba(255,255,255,0.07)',
      fontFamily:'var(--font)',
    }}>
      {/* Main footer */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'60px 24px 44px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:48 }}
          className="al-footer-grid">

          {/* Brand column */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
              <div style={{
                width:36, height:36, borderRadius:10,
                background:'linear-gradient(135deg,#4338ca,#818cf8)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p style={{ color:'#fff', fontSize:14, fontWeight:700, margin:0 }}>
                  VFRB Enterprise
                </p>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, margin:0 }}>
                  Garment Manufacturing Since 2000
                </p>
              </div>
            </div>
            <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, lineHeight:1.75,
              margin:'0 0 18px', maxWidth:300 }}>
              Producing quality uniforms for schools, hospitals, government offices,
              and the private sector — for over two decades.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                ['📍', '31 San Guillermo St., Bayanan, Muntinlupa City'],
                ['🏭', 'Production: Sto. Tomas, Batangas'],
                ['📧', 'vfrb.enterprise@gmail.com'],
              ].map(([ic, txt]) => (
                <p key={txt} style={{ color:'rgba(255,255,255,0.4)', fontSize:12,
                  margin:0, display:'flex', gap:8, alignItems:'flex-start', lineHeight:1.5 }}>
                  <span style={{ flexShrink:0 }}>{ic}</span>{txt}
                </p>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 16px' }}>
              Quick Links
            </p>
            {[['About VFRB','about'],['System Modules','modules'],['How It Works','process'],['Contact','footer']].map(([l,id]) => (
              <button key={l} onClick={() => scrollTo(id)}
                style={{ display:'block', padding:'6px 0', background:'none', border:'none',
                  color:'rgba(255,255,255,0.38)', fontSize:13, cursor:'pointer',
                  fontFamily:'var(--font)', textAlign:'left', transition:'color .2s' }}
                onMouseEnter={e => e.currentTarget.style.color='#fff'}
                onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.38)'}>
                {l}
              </button>
            ))}
          </div>

          {/* Access */}
          <div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.08em', margin:'0 0 16px' }}>
              System Access
            </p>
            <p style={{ color:'rgba(255,255,255,0.38)', fontSize:12, lineHeight:1.65,
              margin:'0 0 18px' }}>
              This portal is restricted to authorized VFRB staff and management only.
            </p>
            <button onClick={onLogin}
              style={{
                width:'100%', padding:'12px', borderRadius:11, border:'none', cursor:'pointer',
                background:'linear-gradient(135deg,#4338ca,#818cf8)', color:'#fff',
                fontSize:13, fontWeight:700, fontFamily:'var(--font)',
                boxShadow:'0 4px 16px rgba(99,102,241,0.3)', transition:'all .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform='none'}>
              Login to Admin Portal →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)',
        padding:'18px 24px', textAlign:'center' }}>
        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:12, margin:0 }}>
          © {year} VFRB Enterprise · All rights reserved ·
          AI-Enabled Sales and Inventory Management System ·
          City College of Calamba BSIT Capstone 2026
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLanding() {
  const navigate = useNavigate();
  const onLogin  = () => navigate('/admin/login');

  return (
    <>
      <style>{`
        /* FONT FIX (Aug 25): was @import from fonts.googleapis.com — a live
           violation of the project's "fonts local only, zero CDN" rule
           (already fixed once in the customer-facing Landing.jsx). Every
           'DM Sans' reference below now falls through to var(--font), the
           same system-font stack theme.css/main.css already define. */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #06091a; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes gridDrift {
          from { background-position: 0 0; }
          to   { background-position: 72px 72px; }
        }
        @keyframes float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(40px,-30px) scale(1.08); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-35px,25px) scale(1.05); }
        }
        @keyframes float3 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(20px,-20px); }
        }
        @keyframes scrollLine {
          0%   { transform: scaleY(0); transform-origin: top; }
          50%  { transform: scaleY(1); transform-origin: top; }
          51%  { transform: scaleY(1); transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; }
        }

        /* Responsive */
        .al-nav-mobile { display: none !important; }
        .al-nav-desktop { display: flex !important; }

        @media (max-width: 768px) {
          .al-nav-mobile  { display: flex !important; }
          .al-nav-desktop { display: none !important; }
          .al-about-grid   { grid-template-columns: 1fr !important; gap: 40px !important; }
          .al-modules-grid { grid-template-columns: 1fr !important; }
          .al-stats-grid   { grid-template-columns: repeat(2,1fr) !important; }
          .al-process-grid { grid-template-columns: 1fr !important; }
          .al-footer-grid  { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .al-modules-grid { grid-template-columns: repeat(2,1fr) !important; }
          .al-stats-grid   { grid-template-columns: repeat(3,1fr) !important; }
          .al-footer-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <Navbar  onLogin={onLogin} />
      <Hero    onLogin={onLogin} />
      <AboutSection />
      <ModulesSection />
      <StatsSection />
      <ProcessSection />
      <Footer  onLogin={onLogin} />
    </>
  );
}