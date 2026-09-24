// src/components/landing/Nav.jsx — fixed header + mobile dropdown, split out of Landing.jsx.
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/company-logo.jpg';
import { T, NAV } from '../../pages/landing/tokens';

export default function Nav({ scrolled, menuOpen, setMenuOpen, go, scrollTo }) {
  return (
    <>
      <motion.nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        background: scrolled ? 'rgba(248,250,252,0.94)' : 'rgba(248,250,252,0.0)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${T.border}` : 'none',
        transition:'background .3s, backdrop-filter .3s, border .3s',
      }}>
        <div className="nav-inner" style={{ maxWidth:'100%', padding:'0 16px',
          height:64, display:'flex', alignItems:'center', justifyContent:'space-between',
          gap:12 }}>

          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
            onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}
            style={{ display:'flex', alignItems:'center', gap:10, background:'none',
              border:'none', cursor:'pointer', padding:4, borderRadius:10, flexShrink:0,
              minHeight:44 }}>
            <img src={logo} alt="VFRB Enterprise"
              style={{ width:38, height:38, borderRadius:10, objectFit:'cover',
                border:'2px solid rgba(2,195,154,0.35)', flexShrink:0 }}/>
            <div style={{ textAlign:'left' }}>
              <p style={{ color:T.ink, fontWeight:700, fontSize:13, lineHeight:1,
                fontFamily:"var(--font)", whiteSpace:'nowrap' }}>
                VFRB Enterprise
              </p>
              <p style={{ color:T.ink3, fontSize:10, marginTop:2,
                whiteSpace:'nowrap' }}>
                Tailor Centre Manila
              </p>
            </div>
          </motion.button>

          <div className="desk-nav" style={{ alignItems:'center', gap:32 }}>
            {NAV.map(n => (
              <button key={n.label} className="nl"
                onClick={() => scrollTo(n.id)}
                style={{ background:'none', border:'none', color:T.ink2,
                  fontSize:14, cursor:'pointer', padding:'6px 0',
                  fontFamily:'var(--font)', transition:'color .2s' }}>
                {n.label}
              </button>
            ))}
          </div>

          <div className="desk-ctas" style={{ alignItems:'center', gap:8, flexShrink:0 }}>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
              onClick={() => go('/login')}
              style={{ background:'none', border:`1px solid ${T.border}`,
                color:T.ink2, fontSize:13, cursor:'pointer',
                padding:'9px 18px', borderRadius:9, fontFamily:'var(--font)',
                minHeight:40, whiteSpace:'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.teal; e.currentTarget.style.color=T.teal; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.color=T.ink2; }}>
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

          <button
            className="hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            style={{ background:'rgba(2,35,50,0.05)',
              border:`1px solid ${T.border}`,
              color:T.ink, cursor:'pointer',
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
                background:'rgba(248,250,252,0.98)',
                borderTop:`1px solid ${T.border}`,
                overflow:'hidden',
                backdropFilter:'blur(20px)',
                WebkitBackdropFilter:'blur(20px)',
                boxShadow:'0 12px 32px rgba(15,23,42,0.08)',
              }}>
              <div style={{ padding:'8px 16px 20px' }}>
                {NAV.map(n => (
                  <button key={n.label} role="menuitem"
                    onClick={() => scrollTo(n.id)}
                    style={{ display:'flex', alignItems:'center', width:'100%',
                      textAlign:'left', background:'none', border:'none',
                      color:T.ink2, fontSize:16, fontWeight:500,
                      padding:'14px 4px', cursor:'pointer',
                      fontFamily:'var(--font)',
                      borderBottom:`1px solid ${T.border}`,
                      minHeight:48 }}
                    onTouchStart={e => e.currentTarget.style.color=T.teal}
                    onTouchEnd={e => e.currentTarget.style.color=T.ink2}
                    onMouseEnter={e => e.currentTarget.style.color=T.teal}
                    onMouseLeave={e => e.currentTarget.style.color=T.ink2}>
                    {n.label}
                  </button>
                ))}
                <div style={{ display:'flex', gap:10, marginTop:18 }}>
                  <button onClick={() => go('/login')}
                    style={{ flex:1, padding:'14px', borderRadius:10,
                      border:`1px solid ${T.border}`,
                      background:'#fff',
                      color:T.ink2, fontSize:15, fontWeight:600,
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

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setMenuOpen(false)}
            style={{ position:'fixed', inset:0, zIndex:199,
              background:'rgba(0,0,0,0.5)', backdropFilter:'blur(2px)' }}/>
        )}
      </AnimatePresence>
    </>
  );
}
