// src/pages/admin/Login.jsx
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../../assets/company-logo.jpg';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = location.state?.resetSuccess === true;

  const [form,    setForm]    = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [focused, setFocused] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await axios.post('/api/admin/login', form);
      sessionStorage.setItem('vfrb_token', data.token);
      sessionStorage.setItem('vfrb_user', JSON.stringify(data.user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  const inp = (name) => ({
    width:'100%', padding:'12px 16px', borderRadius:11, fontSize:14, color:'#fff',
    background:'rgba(255,255,255,0.05)', outline:'none', boxSizing:'border-box',
    border:`1.5px solid ${focused === name ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
    boxShadow: focused === name ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    transition:'all .2s', fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif",
  });

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::placeholder{color:rgba(255,255,255,0.2);}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        body{background:#080c16;margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;}
        .alog-wrap{min-height:100vh;display:flex;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;}
        .alog-left{width:46%;flex-shrink:0;display:flex;flex-direction:column;justify-content:space-between;padding:52px;background:linear-gradient(145deg,#080c16 0%,#0f1230 45%,#1e1b4b 85%,#312e81 110%);position:relative;overflow:hidden;}
        .alog-right{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 48px;background:#0d1130;overflow-y:auto;}
        @media(max-width:860px){.alog-left{display:none!important;}.alog-right{padding:32px 24px;background:#080c16;}}
        @media(max-width:480px){.alog-right{padding:24px 16px;}}
      `}</style>

      <div className="alog-wrap">

        {/* Left visual */}
        <motion.div className="alog-left" initial={{ opacity:0, x:-24 }} animate={{ opacity:1, x:0 }} transition={{ duration:.7 }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize:'64px 64px', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', top:'-15%', right:'-20%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.14),transparent 70%)', pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:1 }}>
            <img src={logo} alt="VFRB" style={{ width:40, height:40, borderRadius:10, objectFit:'cover', border:'2px solid rgba(129,140,248,0.4)' }}/>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:14 }}>VFRB Enterprise</p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, marginTop:2 }}>Page</p>
            </div>
          </div>

          <motion.div initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3, duration:.8 }} style={{ position:'relative', zIndex:1 }}>
            <h1 style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:'clamp(30px,3vw,44px)', fontWeight:700, color:'#fff', lineHeight:1.1, marginBottom:18 }}>
              VFRB Enterprise<br/>
              <span style={{ background:'linear-gradient(135deg,#a5b4fc,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Sales &amp; Inventory Management System.</span>
            </h1>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, lineHeight:1.72, marginBottom:28, maxWidth:300 }}>
              AI-enabled sales &amp; inventory management for VFRB Enterprise staff.
            </p>
          </motion.div>

          <p style={{ color:'rgba(255,255,255,0.18)', fontSize:11, position:'relative', zIndex:1 }}>Ogayon · Araos · Espeja · Llanto · CCC BSIT 2026</p>
        </motion.div>

        {/* Right form */}
        <motion.div className="alog-right" initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <div style={{ width:'100%', maxWidth:400 }}>

            <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:.2 }} style={{ marginBottom:28 }}>
              <h2 style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:28, fontWeight:700, color:'#fff', marginBottom:8 }}>Admin Sign In</h2>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>
                Customer?{' '}
                <Link to="/login" style={{ color:'#818cf8', textDecoration:'none', fontWeight:600 }}>Customer Portal →</Link>
              </p>
            </motion.div>

            {/* Reset success banner */}
            <AnimatePresence>
              {resetSuccess && (
                <motion.div initial={{ opacity:0, y:-8, height:0 }} animate={{ opacity:1, y:0, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{ borderRadius:11, padding:'12px 16px', marginBottom:18, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', color:'#86efac', fontSize:13 }}>
                  ✅ Password reset successfully. Please sign in with your new password.
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity:0, y:-8, height:0 }} animate={{ opacity:1, y:0, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{ borderRadius:11, padding:'12px 16px', marginBottom:18, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}>
                  ⚠ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Email Address</label>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                  placeholder="staff@vfrb.test" style={inp('email')}/>
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)' }}>Password</label>
                  <Link to="/forgot-password"
                    style={{ fontSize:12, color:'rgba(129,140,248,0.7)', textDecoration:'none', fontWeight:500, transition:'color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#818cf8'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(129,140,248,0.7)'}>
                    Forgot password?
                  </Link>
                </div>
                <div style={{ position:'relative' }}>
                  <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={e => set('password', e.target.value)}
                    onFocus={() => setFocused('pw')} onBlur={() => setFocused('')}
                    placeholder="••••••••" style={{ ...inp('pw'), paddingRight:52 }}/>
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:12, cursor:'pointer', fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }} whileTap={{ scale:.98 }}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', color:'#fff', fontWeight:700, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: loading ? .7 : 1, transition:'all .2s', fontFamily:"ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif" }}>
                {loading ? (
                  <><svg style={{ animation:'spin .8s linear infinite', width:16, height:16 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Signing in…</>
                ) : 'Sign In to Admin Portal →'}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
}
